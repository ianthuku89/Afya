import { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { blockchainService } from '../services/blockchain.service';
import { calculateAfyaScore } from '../routes/afyascore';

const stkPushSchema = z.object({
  amount: z.number().positive().min(50).max(10000),
  currency: z.literal('KES'),
  phone: z.string().regex(/^254[0-9]{9}$/).optional(),
  description: z.string().optional()
});

/**
 * Acquire a short-lived OAuth2 access token from Safaricom Daraja API.
 * Uses the consumer key + consumer secret from environment variables.
 */
async function getDarajaToken(): Promise<string> {
  const consumerKey = process.env.DARAJA_CONSUMER_KEY;
  const consumerSecret = process.env.DARAJA_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error('Daraja credentials not configured (DARAJA_CONSUMER_KEY, DARAJA_CONSUMER_SECRET)');
  }

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  const baseUrl = process.env.DARAJA_BASE_URL || 'https://sandbox.safaricom.co.ke';
  const res = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    method: 'GET',
    headers: { 'Authorization': `Basic ${auth}` }
  });

  if (!res.ok) throw new Error(`Daraja OAuth failed: ${res.status} ${res.statusText}`);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

/**
 * Update the user's AfyaScore after a successful contribution.
 * Recalculates streak, score, and tier.
 */
async function updateAfyaScoreOnContribution(userId: string, amountKES: number): Promise<void> {
  try {
    let afyaScore = await prisma.afyaScore.findUnique({ where: { userId } });

    if (!afyaScore) {
      afyaScore = await prisma.afyaScore.create({
        data: { userId },
      });
    }

    const now = new Date();
    const lastContrib = afyaScore.lastContributionAt;

    // Calculate streak: if last contribution was yesterday or today, continue streak
    let newStreak = afyaScore.streakDays;
    if (lastContrib) {
      const diffMs = now.getTime() - lastContrib.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours <= 48) {
        // Within 48 hours — continue or maintain streak
        const lastDay = lastContrib.toISOString().split('T')[0];
        const today = now.toISOString().split('T')[0];
        if (lastDay !== today) {
          newStreak += 1; // New day contribution
        }
        // Same day contribution doesn't increment streak
      } else {
        // More than 48 hours — streak broken, restart
        newStreak = 1;
      }
    } else {
      // First-ever contribution
      newStreak = 1;
    }

    const newTotal = Number(afyaScore.totalContributions) + amountKES;
    const { score, tier } = calculateAfyaScore(newStreak, newTotal, afyaScore.challengesCompleted);

    await prisma.afyaScore.update({
      where: { userId },
      data: {
        score,
        tier: tier as any,
        streakDays: newStreak,
        longestStreak: Math.max(afyaScore.longestStreak, newStreak),
        lastContributionAt: now,
        totalContributions: { increment: amountKES },
        totalTokensEarned: { increment: Math.floor(amountKES / 10) },
      },
    });

    // Update wallet coverage status based on contribution activity
    await prisma.wallet.updateMany({
      where: { userId },
      data: {
        coverageStatus: 'ACTIVE',
      },
    });

    logger.info(`AfyaScore updated: user=${userId} score=${score} tier=${tier} streak=${newStreak}`);
  } catch (err) {
    logger.error('Failed to update AfyaScore:', err);
    // Non-blocking — don't fail the payment if score update fails
  }
}

export const paymentController = {

  initiateStkPush: async (req: Request, res: Response) => {
    try {
      const data = stkPushSchema.parse(req.body);
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      // Lookup user's phone number or use provided
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { phoneNumber: true } });
      const phoneNumber = data.phone || user?.phoneNumber;
      if (!phoneNumber) {
        return res.status(400).json({ success: false, error: 'Phone number required for M-PESA payment' });
      }

      logger.info(`Initiating STK Push: user=${userId}, amount=KES ${data.amount}, phone=${phoneNumber}`);

      // Get Daraja OAuth token
      const accessToken = await getDarajaToken();

      // Build STK Push request
      const shortCode = process.env.DARAJA_SHORTCODE || '174379';
      const passkey = process.env.DARAJA_PASSKEY || '';
      const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
      const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');
      const callbackUrl = process.env.DARAJA_CALLBACK_URL || `${process.env.API_BASE_URL}/api/v1/payment/callback`;

      const baseUrl = process.env.DARAJA_BASE_URL || 'https://sandbox.safaricom.co.ke';
      const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          BusinessShortCode: shortCode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: data.amount,
          PartyA: phoneNumber,
          PartyB: shortCode,
          PhoneNumber: phoneNumber,
          CallBackURL: callbackUrl,
          AccountReference: `AFYA-${userId.slice(0, 8)}`,
          TransactionDesc: data.description || 'AfyaToken SHIF Contribution'
        })
      });

      const stkData = await stkRes.json() as any;

      if (stkData.ResponseCode !== '0' && stkData.ResponseCode !== 0) {
        logger.error('Daraja STK Push rejected:', stkData);
        return res.status(502).json({ success: false, error: 'M-PESA request failed', detail: stkData.ResponseDescription });
      }

      // Store checkout request in DB for callback reconciliation
      await prisma.transaction.create({
        data: {
          walletId: (await prisma.wallet.findUnique({ where: { userId } }))!.id,
          amountAfya: 0, // Will be set on callback
          txHash: stkData.CheckoutRequestID,
          status: 'PENDING',
          source: 'MPESA',
          fromAddress: phoneNumber,
          toAddress: shortCode
        }
      });

      return res.status(200).json({
        success: true,
        message: 'STK Push sent to your phone',
        data: {
          merchantRequestId: stkData.MerchantRequestID,
          checkoutRequestId: stkData.CheckoutRequestID,
          customerMessage: stkData.CustomerMessage
        }
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: error.errors });
      }
      logger.error('STK Push Error:', error);
      return res.status(500).json({ success: false, error: 'Payment initialization failed' });
    }
  },

  darajaCallback: async (req: Request, res: Response) => {
    try {
      const payload = req.body;
      const stkCallback = payload?.Body?.stkCallback;

      if (!stkCallback) {
        return res.status(400).json({ success: false, error: 'Invalid callback payload' });
      }

      const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } = stkCallback;
      logger.info(`Daraja Callback: ${CheckoutRequestID} - Code: ${ResultCode}`);

      // Find the pending transaction by CheckoutRequestID
      const pendingTx = await prisma.transaction.findFirst({
        where: { txHash: CheckoutRequestID, status: 'PENDING' },
        include: { wallet: true }
      });

      if (!pendingTx) {
        logger.warn(`Daraja callback for unknown CheckoutRequestID: ${CheckoutRequestID}`);
        return res.status(200).json({ success: true, message: 'Acknowledged (no matching transaction)' });
      }

      if (ResultCode === 0) {
        // Payment successful — extract amount
        const amountItem = CallbackMetadata?.Item?.find((item: any) => item.Name === 'Amount');
        const mpesaReceiptItem = CallbackMetadata?.Item?.find((item: any) => item.Name === 'MpesaReceiptNumber');
        const amountKES = amountItem?.Value || 0;

        logger.info(`Payment Success: KES ${amountKES} receipt=${mpesaReceiptItem?.Value}`);

        // Convert KES to AfyaTokens (10 KES = 1 AFYA)
        const tokenAmount = Math.floor(amountKES / 10);

        if (tokenAmount > 0 && pendingTx.wallet) {
          // Mint tokens on-chain
          const mintTxHash = await blockchainService.mintTokensToUser(
            pendingTx.wallet.blockchainAddress,
            tokenAmount
          );

          // Update DB: mark confirmed + credit wallet
          await prisma.$transaction([
            prisma.transaction.update({
              where: { id: pendingTx.id },
              data: {
                status: 'CONFIRMED',
                amountAfya: tokenAmount,
                txHash: mintTxHash
              }
            }),
            prisma.wallet.update({
              where: { id: pendingTx.wallet.id },
              data: { balanceAfya: { increment: tokenAmount } }
            })
          ]);

          // ── UPDATE AFYA SCORE ────────────────────────────────────────────────
          // This is the key gamification hook: every M-PESA contribution
          // automatically updates the user's AfyaScore, streak, and tier.
          await updateAfyaScoreOnContribution(pendingTx.wallet.userId, amountKES);

          logger.info(`Minted ${tokenAmount} AFYA to wallet ${pendingTx.wallet.blockchainAddress} tx=${mintTxHash}`);
        }
      } else {
        // Payment failed — mark transaction
        await prisma.transaction.update({
          where: { id: pendingTx.id },
          data: { status: 'FAILED' }
        });
        logger.warn(`Daraja Payment Failed: ${ResultDesc}`);
      }

      // Always 200 to Safaricom
      return res.status(200).json({ success: true, message: 'Callback processed' });

    } catch (error) {
      logger.error('Daraja Callback Error:', error);
      return res.status(200).json({ success: false, message: 'Processed with errors' });
    }
  }
};
