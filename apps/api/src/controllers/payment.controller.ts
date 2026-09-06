import crypto from 'crypto';
import { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { blockchainService } from '../services/blockchain.service';
import { creditShifAccount } from '../services/shifService';
import { getTierFromStreak } from '../routes/afyascore';
import { ContributionSource } from '@prisma/client';

// ── SHA SHIF COLLECTION PAYBILL ───────────────────────────────────────────────
// Official Safaricom Paybill for SHIF contributions.
// Account Reference = customer's National ID number.
const SHA_SHIF_PAYBILL = process.env.SHA_SHIF_PAYBILL || '200222';
const DAILY_SHIF_DEDUCTION = 30; // KES — fixed flat daily deduction

const stkPushSchema = z.object({
    amount: z.number().positive().min(50).max(10000),
    currency: z.literal('KES'),
    phone: z.string().regex(/^254[0-9]{9}$/).optional(),
    description: z.string().optional(),
});

// ── DARAJA OAUTH ───────────────────────────────────────────────────────────────
/**
 * Acquire a short-lived OAuth2 access token from Safaricom Daraja API.
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
        headers: { 'Authorization': `Basic ${auth}` },
    });

    if (!res.ok) throw new Error(`Daraja OAuth failed: ${res.status} ${res.statusText}`);
    const data = await res.json() as { access_token: string };
    return data.access_token;
}

// ── PENDING TRANSACTION RECORD ────────────────────────────────────────────────
async function createPendingDarajaTransaction(
    walletId: string,
    phoneNumber: string,
    checkoutRequestId: string,
    shortCode: string,
    source: ContributionSource,
) {
    return prisma.transaction.create({
        data: {
            walletId,
            amountAfya: 0,
            txHash: checkoutRequestId,
            status: 'PENDING',
            source,
            fromAddress: phoneNumber,
            toAddress: shortCode,
        },
    });
}

// ── AUTO-DEDUCT BATCH SETTLEMENT ──────────────────────────────────────────────
async function markAutoDeductionBatchSettled(userId: string) {
    await prisma.$transaction([
        prisma.autoDeductionLog.updateMany({
            where: { userId, status: 'PENDING' },
            data: { status: 'PROCESSED', processedAt: new Date() },
        }),
        prisma.wallet.update({
            where: { userId },
            data: { pendingDeductionKES: 0 },
        }),
    ]);
}

// ── SUCCESSFUL CONTRIBUTION HANDLER ──────────────────────────────────────────
/**
 * Called on Daraja callback success for MPESA direct contributions.
 * Mints AfyaTokens (coverage-proof receipts) and updates streak/tier.
 * NOTE: AUTO_DEDUCT source does NOT mint tokens — SHA routing is handled separately.
 */
async function handleSuccessfulDarajaContribution(transactionId: string, amountKES: number) {
    const pendingTx = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: { wallet: { include: { user: true } } },
    });

    if (!pendingTx?.wallet) {
        throw new Error('Pending STK transaction or wallet not found');
    }

    const tokenAmount = Math.floor(amountKES);

    // Token minting only for direct MPESA contributions — NOT for AUTO_DEDUCT SHIF routing
    let mintTxHash = `NO_MINT_AUTO_DEDUCT_${Date.now()}`;
    if (pendingTx.source !== 'AUTO_DEDUCT') {
        mintTxHash = await blockchainService.mintTokensToUser(
            pendingTx.wallet.blockchainAddress,
            tokenAmount,
        );

        await prisma.wallet.update({
            where: { id: pendingTx.wallet.id },
            data: { lockedAfya: { increment: tokenAmount } },
        });
    }

    await prisma.transaction.update({
        where: { id: transactionId },
        data: {
            status: 'CONFIRMED',
            amountAfya: pendingTx.source === 'AUTO_DEDUCT' ? 0 : tokenAmount,
            txHash: mintTxHash,
        },
    });

    if (pendingTx.source === 'AUTO_DEDUCT') {
        await markAutoDeductionBatchSettled(pendingTx.wallet.userId);
    }

    await updateAfyaStreakOnContribution(pendingTx.wallet.userId);
    await creditShifAccount(
        pendingTx.wallet.user?.nationalId,
        amountKES,
        `${SHA_SHIF_PAYBILL}/${pendingTx.wallet.user?.nationalId || 'UNKNOWN'}`,
    );
}

// ── STK PUSH INITIATOR ────────────────────────────────────────────────────────
/**
 * Initiate an STK Push through Daraja for direct contributions,
 * or simulate when Daraja is not configured.
 */
export async function initiateDarajaStkPush(
    userId: string,
    amount: number,
    description?: string,
    phone?: string,
    source: ContributionSource = 'MPESA',
) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { phoneNumber: true },
    });
    const wallet = await prisma.wallet.findUnique({
        where: { userId },
        select: { id: true, blockchainAddress: true },
    });

    if (!wallet) throw new Error('Wallet not found for user');

    const phoneNumber = phone || user?.phoneNumber;
    if (!phoneNumber) throw new Error('Phone number required for M-PESA payment');

    const shortCode = process.env.DARAJA_SHORTCODE || '174379';
    const callbackUrl = process.env.DARAJA_CALLBACK_URL || `${process.env.API_BASE_URL}/api/v1/payment/callback`;
    const checkoutRequestId = `ws_CO_${crypto.randomBytes(6).toString('hex')}`;

    const transaction = await createPendingDarajaTransaction(wallet.id, phoneNumber, checkoutRequestId, shortCode, source);

    const darajaConfigured =
        process.env.DARAJA_CONSUMER_KEY &&
        process.env.DARAJA_CONSUMER_SECRET &&
        process.env.DARAJA_PASSKEY &&
        process.env.DARAJA_SHORTCODE;

    if (!darajaConfigured) {
        logger.info('[Daraja] Credentials missing; simulating STK Push and immediate confirmation');
        await handleSuccessfulDarajaContribution(transaction.id, amount);
        return {
            success: true,
            merchantRequestId: 'MOCK_STK_PUSH',
            checkoutRequestId,
            customerMessage: `Simulated STK push approved for KES ${amount}`,
            transactionId: transaction.id,
        };
    }

    const accessToken = await getDarajaToken();
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
    const password = Buffer.from(`${shortCode}${process.env.DARAJA_PASSKEY}${timestamp}`).toString('base64');
    const baseUrl = process.env.DARAJA_BASE_URL || 'https://sandbox.safaricom.co.ke';

    const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
            BusinessShortCode: shortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: amount,
            PartyA: phoneNumber,
            PartyB: shortCode,
            PhoneNumber: phoneNumber,
            CallBackURL: callbackUrl,
            AccountReference: `AFYA-${userId.slice(0, 8)}`,
            TransactionDesc: description || 'AfyaToken SHIF Contribution',
        }),
    });

    const stkData = await stkRes.json() as any;
    if (stkData.ResponseCode !== '0' && stkData.ResponseCode !== 0) {
        await prisma.transaction.update({ where: { id: transaction.id }, data: { status: 'FAILED' } });
        return {
            success: false,
            error: 'M-PESA request failed',
            detail: stkData.ResponseDescription || stkData.errorMessage,
        };
    }

    return {
        success: true,
        merchantRequestId: stkData.MerchantRequestID,
        checkoutRequestId: stkData.CheckoutRequestID,
        customerMessage: stkData.CustomerMessage,
        transactionId: transaction.id,
    };
}

// ── SHIF DAILY DEDUCTION — Paybill 200222 ─────────────────────────────────────
/**
 * Initiates a real-time STK Push for the KES 30 SHIF daily deduction.
 * Target: Paybill 200222 (SHA SHIF collection), Account = customer's National ID.
 * This is the STK Push #2 in the dual-push architecture.
 * Does NOT mint AfyaTokens — this is a SHIF routing payment, not a contribution.
 */
export async function initiateSHIFDeduction(
    userId: string,
    triggerTxRef: string,
    phone?: string,
): Promise<{ success: boolean; checkoutRequestId?: string; transactionId?: string; error?: string; detail?: string }> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { phoneNumber: true, nationalId: true },
    });
    const wallet = await prisma.wallet.findUnique({
        where: { userId },
        select: { id: true, blockchainAddress: true },
    });

    if (!wallet) throw new Error('Wallet not found for user');

    const phoneNumber = phone || user?.phoneNumber;
    if (!phoneNumber) throw new Error('Phone number required for SHIF STK push');

    const nationalId = user?.nationalId;
    if (!nationalId) {
        logger.warn(`[SHIF Deduction] No nationalId for user=${userId}; cannot set SHA account reference`);
    }

    // Account Reference = National ID (SHA uses this to route to the customer's SHIF account)
    const shaAccountRef = nationalId || `USER_${userId.slice(0, 8)}`;
    const shaRoutingRef = `${SHA_SHIF_PAYBILL}/${shaAccountRef}`;

    const shifCallbackUrl =
        process.env.DARAJA_SHIF_CALLBACK_URL ||
        `${process.env.API_BASE_URL}/api/v1/payment/shif-callback`;

    const checkoutRequestId = `SHIF_${crypto.randomBytes(6).toString('hex')}`;

    // Create pending transaction record (no token minting for AUTO_DEDUCT)
    const transaction = await createPendingDarajaTransaction(
        wallet.id,
        phoneNumber,
        checkoutRequestId,
        SHA_SHIF_PAYBILL,
        'AUTO_DEDUCT',
    );

    const darajaConfigured =
        process.env.DARAJA_CONSUMER_KEY &&
        process.env.DARAJA_CONSUMER_SECRET &&
        process.env.DARAJA_PASSKEY;

    if (!darajaConfigured) {
        logger.info(`[SHIF Deduction] Simulating KES ${DAILY_SHIF_DEDUCTION} STK push to Paybill ${SHA_SHIF_PAYBILL}, Account ${shaAccountRef}`);

        // Simulate immediate success
        await prisma.transaction.update({
            where: { id: transaction.id },
            data: { status: 'CONFIRMED', amountAfya: 0 },
        });
        await creditShifAccount(nationalId, DAILY_SHIF_DEDUCTION, shaRoutingRef);

        return {
            success: true,
            checkoutRequestId,
            transactionId: transaction.id,
        };
    }

    const accessToken = await getDarajaToken();
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
    const password = Buffer.from(
        `${SHA_SHIF_PAYBILL}${process.env.DARAJA_PASSKEY}${timestamp}`
    ).toString('base64');
    const baseUrl = process.env.DARAJA_BASE_URL || 'https://sandbox.safaricom.co.ke';

    const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
            BusinessShortCode: SHA_SHIF_PAYBILL,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: DAILY_SHIF_DEDUCTION,
            PartyA: phoneNumber,
            PartyB: SHA_SHIF_PAYBILL,
            PhoneNumber: phoneNumber,
            CallBackURL: shifCallbackUrl,
            AccountReference: shaAccountRef,  // National ID → routes to customer's SHA account
            TransactionDesc: 'AfyaToken Daily SHIF Contribution',
        }),
    });

    const stkData = await stkRes.json() as any;
    if (stkData.ResponseCode !== '0' && stkData.ResponseCode !== 0) {
        await prisma.transaction.update({ where: { id: transaction.id }, data: { status: 'FAILED' } });
        return {
            success: false,
            error: 'SHIF STK push failed',
            detail: stkData.ResponseDescription || stkData.errorMessage,
        };
    }

    logger.info(`[SHIF Deduction] STK #2 sent: KES ${DAILY_SHIF_DEDUCTION} → Paybill ${SHA_SHIF_PAYBILL}, Account ${shaAccountRef}, trigger=${triggerTxRef}`);

    return {
        success: true,
        merchantRequestId: stkData.MerchantRequestID,
        checkoutRequestId: stkData.CheckoutRequestID,
        customerMessage: stkData.CustomerMessage,
        transactionId: transaction.id,
    } as any;
}

// ── STREAK & TIER UPDATE (no score) ──────────────────────────────────────────
/**
 * Updates contribution streak and derives tier from streak days.
 * Score points have been removed — tier is purely streak-based.
 */
export async function updateAfyaStreakOnContribution(userId: string): Promise<void> {
    try {
        let afyaScore = await prisma.afyaScore.findUnique({ where: { userId } });

        if (!afyaScore) {
            afyaScore = await prisma.afyaScore.create({ data: { userId } });
        }

        const now = new Date();
        const lastContrib = afyaScore.lastContributionAt;
        let newStreak = afyaScore.streakDays;

        if (lastContrib) {
            const diffMs = now.getTime() - lastContrib.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);
            if (diffHours <= 48) {
                const lastDay = lastContrib.toISOString().split('T')[0];
                const today = now.toISOString().split('T')[0];
                if (lastDay !== today) {
                    newStreak += 1; // New calendar day — increment streak
                }
                // Same-day contribution does not increment streak
            } else {
                newStreak = 1; // Streak broken (> 48h gap)
            }
        } else {
            newStreak = 1; // First-ever contribution
        }

        const newTier = getTierFromStreak(newStreak);

        await prisma.afyaScore.update({
            where: { userId },
            data: {
                // score field intentionally left unchanged (deprecated — no longer calculated)
                tier: newTier as any,
                streakDays: newStreak,
                longestStreak: Math.max(afyaScore.longestStreak, newStreak),
                lastContributionAt: now,
                totalContributions: { increment: 0 }, // amount tracked separately per call site
            },
        });

        await prisma.wallet.updateMany({
            where: { userId },
            data: { coverageStatus: 'ACTIVE' },
        });

        logger.info(`Streak updated: user=${userId} streak=${newStreak} tier=${newTier}`);
    } catch (err) {
        logger.error('Failed to update streak/tier:', err);
        // Non-blocking — don't fail the payment if streak update fails
    }
}

// ── CONTRIBUTION AMOUNT TRACKER ───────────────────────────────────────────────
export async function recordContributionAmount(userId: string, amountKES: number): Promise<void> {
    try {
        await prisma.afyaScore.update({
            where: { userId },
            data: { totalContributions: { increment: amountKES } },
        });
    } catch (err) {
        logger.error('Failed to record contribution amount:', err);
    }
}

// ── PAYMENT CONTROLLER EXPORTS ────────────────────────────────────────────────
export const paymentController = {

    initiateStkPush: async (req: Request, res: Response) => {
        try {
            const data = stkPushSchema.parse(req.body);
            const userId = req.user?.userId;

            if (!userId) {
                return res.status(401).json({ success: false, error: 'Unauthorized' });
            }

            const result = await initiateDarajaStkPush(
                userId,
                data.amount,
                data.description,
                data.phone,
                'MPESA',
            );

            if (!result.success) {
                logger.error('Daraja STK Push failed:', (result as any).detail || result.error);
                return res.status(502).json({
                    success: false,
                    error: result.error || 'M-PESA request failed',
                    detail: (result as any).detail,
                });
            }

            // Track contribution amount
            await recordContributionAmount(userId, data.amount);

            return res.status(200).json({
                success: true,
                message: 'STK Push sent to your phone',
                data: {
                    merchantRequestId: (result as any).merchantRequestId,
                    checkoutRequestId: result.checkoutRequestId,
                    customerMessage: (result as any).customerMessage,
                },
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ success: false, error: error.errors });
            }
            logger.error('STK Push Error:', error);
            return res.status(500).json({ success: false, error: 'Payment initialization failed' });
        }
    },

    // ── STK PUSH #2: SHIF DAILY DEDUCTION ────────────────────────────────────
    /**
     * Called by mobile after merchant STK #1 is confirmed.
     * Sends KES 30 to Paybill 200222 with National ID as account reference.
     */
    initiateSHIFStkPush: async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

            const { triggerTxRef, phone } = req.body;
            if (!triggerTxRef) {
                return res.status(400).json({ success: false, error: 'triggerTxRef is required' });
            }

            const result = await initiateSHIFDeduction(userId, triggerTxRef, phone);

            if (!result.success) {
                return res.status(502).json({
                    success: false,
                    error: result.error || 'SHIF STK push failed',
                    detail: result.detail,
                });
            }

            return res.status(200).json({
                success: true,
                message: 'SHIF STK Push sent — KES 30 to your SHA account',
                data: {
                    checkoutRequestId: result.checkoutRequestId,
                    shaPaybill: SHA_SHIF_PAYBILL,
                    amount: DAILY_SHIF_DEDUCTION,
                },
            });
        } catch (error) {
            logger.error('SHIF STK Push Error:', error);
            return res.status(500).json({ success: false, error: 'SHIF payment initialization failed' });
        }
    },

    // ── DARAJA CALLBACK (merchant / direct contributions) ────────────────────
    darajaCallback: async (req: Request, res: Response) => {
        try {
            const payload = req.body;
            const stkCallback = payload?.Body?.stkCallback;

            if (!stkCallback) {
                return res.status(400).json({ success: false, error: 'Invalid callback payload' });
            }

            const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } = stkCallback;
            logger.info(`Daraja Callback: ${CheckoutRequestID} - Code: ${ResultCode}`);

            const pendingTx = await prisma.transaction.findFirst({
                where: { txHash: CheckoutRequestID, status: 'PENDING' },
                include: { wallet: true },
            });

            if (!pendingTx) {
                logger.warn(`Daraja callback for unknown CheckoutRequestID: ${CheckoutRequestID}`);
                return res.status(200).json({ success: true, message: 'Acknowledged (no matching transaction)' });
            }

            if (ResultCode === 0) {
                const amountItem = CallbackMetadata?.Item?.find((item: any) => item.Name === 'Amount');
                const amountKES = Number(amountItem?.Value || 0);
                logger.info(`Payment Success: KES ${amountKES}`);
                await handleSuccessfulDarajaContribution(pendingTx.id, amountKES);
                if (pendingTx.source === 'MPESA') {
                    await recordContributionAmount(pendingTx.wallet!.userId, amountKES);
                    await updateAfyaStreakOnContribution(pendingTx.wallet!.userId);
                }
            } else {
                await prisma.transaction.update({
                    where: { id: pendingTx.id },
                    data: { status: 'FAILED' },
                });
                if (pendingTx.source === 'AUTO_DEDUCT' && pendingTx.wallet?.userId) {
                    await prisma.autoDeductionLog.updateMany({
                        where: { userId: pendingTx.wallet.userId, status: 'PENDING' },
                        data: { status: 'FAILED', processedAt: new Date() },
                    });
                }
                logger.warn(`Daraja Payment Failed: ${ResultDesc}`);
            }

            return res.status(200).json({ success: true, message: 'Callback processed' });
        } catch (error) {
            logger.error('Daraja Callback Error:', error);
            return res.status(200).json({ success: false, message: 'Processed with errors' });
        }
    },

    // ── SHIF DARAJA CALLBACK (Paybill 200222 — SHA SHIF deductions) ──────────
    /**
     * Handles Daraja callbacks specifically for SHIF deduction payments
     * routed to Paybill 200222. On success: credits SHIF account via DHA API.
     */
    darajaSHIFCallback: async (req: Request, res: Response) => {
        try {
            const payload = req.body;
            const stkCallback = payload?.Body?.stkCallback;

            if (!stkCallback) {
                return res.status(400).json({ success: false, error: 'Invalid SHIF callback payload' });
            }

            const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } = stkCallback;
            logger.info(`[SHIF Callback] ${CheckoutRequestID} - Code: ${ResultCode}`);

            const pendingTx = await prisma.transaction.findFirst({
                where: { txHash: CheckoutRequestID, status: 'PENDING', source: 'AUTO_DEDUCT' },
                include: { wallet: { include: { user: true } } },
            });

            if (!pendingTx) {
                logger.warn(`[SHIF Callback] No matching pending AUTO_DEDUCT tx: ${CheckoutRequestID}`);
                return res.status(200).json({ success: true, message: 'Acknowledged' });
            }

            if (ResultCode === 0) {
                const amountItem = CallbackMetadata?.Item?.find((item: any) => item.Name === 'Amount');
                const amountKES = Number(amountItem?.Value || DAILY_SHIF_DEDUCTION);
                const nationalId = pendingTx.wallet?.user?.nationalId;
                const shaRoutingRef = `${SHA_SHIF_PAYBILL}/${nationalId || 'UNKNOWN'}`;

                logger.info(`[SHIF Callback] KES ${amountKES} confirmed → routing to ${shaRoutingRef}`);

                await prisma.transaction.update({
                    where: { id: pendingTx.id },
                    data: { status: 'CONFIRMED', amountAfya: 0 },
                });

                // Route KES 30 to customer's SHA SHIF account
                await creditShifAccount(nationalId, amountKES, shaRoutingRef);

                // Mark auto-deduction log as processed
                await markAutoDeductionBatchSettled(pendingTx.wallet!.userId);

                // Update streak (SHIF contribution counts toward streak)
                await updateAfyaStreakOnContribution(pendingTx.wallet!.userId);

                logger.info(`[SHIF Callback] SHIF deduction settled for user=${pendingTx.wallet!.userId}`);
            } else {
                await prisma.transaction.update({
                    where: { id: pendingTx.id },
                    data: { status: 'FAILED' },
                });
                if (pendingTx.wallet?.userId) {
                    await prisma.autoDeductionLog.updateMany({
                        where: { userId: pendingTx.wallet.userId, status: 'PENDING' },
                        data: { status: 'FAILED', processedAt: new Date() },
                    });
                }
                logger.warn(`[SHIF Callback] SHIF payment failed: ${ResultDesc}`);
            }

            // Always 200 to Safaricom
            return res.status(200).json({ success: true, message: 'SHIF callback processed' });
        } catch (error) {
            logger.error('[SHIF Callback] Error:', error);
            return res.status(200).json({ success: false, message: 'Processed with errors' });
        }
    },
};
