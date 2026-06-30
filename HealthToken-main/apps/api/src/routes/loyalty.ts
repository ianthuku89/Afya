import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../lib/logger';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// Simulated Daraja STK Push trigger (since we don't have Daraja live in dev)
async function triggerSTKPush(phoneNumber: string, amount: number, reference: string) {
    logger.info(`[Auto-Deduct] Mock STK Push to ${phoneNumber} for KES ${amount} (Ref: ${reference})`);
    // In production, this imports paymentController.initiateStkPush()
    return { success: true, checkoutRequestID: 'ws_CO_' + crypto.randomBytes(4).toString('hex') };
}

// ─── OPT-IN FOR AUTO-DEDUCT ──────────────────────────────────────────────────
router.post('/auto-deduct/opt-in', async (req, res) => {
    try {
        const userId = req.user?.id; // from authMiddleware
        const { optIn } = req.body;

        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
        
        if (optIn === false) {
            return res.status(400).json({ success: false, message: 'Opt-out is not permitted. SHIF deductions are compulsory.' });
        }

        // Update Wallet
        const wallet = await prisma.wallet.update({
            where: { userId },
            data: { autoDeductOptIn: true }
        });

        // Log KDPA Consent
        await prisma.consentRecord.create({
            data: {
                userId,
                consentType: 'loyalty_auto_contribute',
                granted: true,
                revokedAt: null,
                ipAddress: req.ip || '0.0.0.0',
            }
        });

        res.json({
            success: true,
            data: {
                autoDeductOptIn: wallet.autoDeductOptIn,
                message: 'Successfully opted in to Auto-Deductions. SHIF contributions are now standard.'
            }
        });

    } catch (e: any) {
        logger.error(`Error in /auto-deduct/opt-in: ${e.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── TRANSACTION SYNC (Simulated M-PESA webhook) ─────────────────────────────
// Receives standard M-PESA user non-health transactions, bundles SHIF contribution, and triggers STK push.
router.post('/auto-deduct/transaction-sync', async (req, res) => {
    try {
        // In production, this would be an authenticated webhook from Daraja or an Android SMS parser
        const { userId, txAmount, txRef, mpesaBalance } = req.body;

        if (!userId || !txAmount || !txRef || mpesaBalance === undefined) {
            return res.status(400).json({ success: false, message: 'Missing required parameters' });
        }

        const wallet = await prisma.wallet.findUnique({ where: { userId }, include: { user: true } });
        if (!wallet) {
            return res.status(404).json({ success: false, message: 'Wallet not found.' });
        }

        const DAILY_CEILING = 50;
        const SHIF_DEDUCTION = 10;
        const currentPending = Number(wallet.pendingDeductionKES);
        const effectiveTarget = DAILY_CEILING + currentPending;

        // Calculate today's total contributions
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const todayLogs = await prisma.autoDeductionLog.findMany({
            where: {
                userId,
                status: 'PROCESSED',
                createdAt: { gte: startOfDay }
            }
        });
        
        const todayTotal = todayLogs.reduce((sum, log) => sum + Number(log.deductedAmount), 0);

        if (todayTotal >= effectiveTarget) {
            return res.status(200).json({ success: true, message: 'Daily auto-deduction limit reached (KES 50). Original transaction allowed.' });
        }

        const amt = Number(txAmount);
        const bal = Number(mpesaBalance);

        // Check if balance is sufficient for bundled transaction
        if (bal >= amt + SHIF_DEDUCTION) {
            // Bundle transaction
            await prisma.autoDeductionLog.create({
                data: {
                    userId,
                    originalTxId: txRef,
                    originalAmount: amt,
                    deductedAmount: SHIF_DEDUCTION,
                    status: 'PROCESSED',
                    processedAt: new Date()
                }
            });

            // Trigger STK Push (simulated M-PESA bundled PIN prompt)
            const phone = wallet.user?.phoneNumber || '254700000000';
            await triggerSTKPush(phone, SHIF_DEDUCTION, `SHIF_BUNDLE_${txRef}`);

            return res.json({
                success: true,
                data: {
                    originalAmount: amt,
                    deductionAmount: SHIF_DEDUCTION,
                    message: `Transaction successful. KES ${SHIF_DEDUCTION} SHIF contribution bundled.`
                }
            });
        } else {
            // Insufficient balance for SHIF
            const newPending = currentPending + SHIF_DEDUCTION;
            
            await prisma.wallet.update({
                where: { userId },
                data: { pendingDeductionKES: { increment: SHIF_DEDUCTION } }
            });

            logger.info(`[SMS] Dear user, your SHIF contribution of KES ${SHIF_DEDUCTION} was carried forward due to insufficient balance.`);

            if (newPending >= 50) {
                logger.warn(`[SMS/APP WARNING] Warning: You have missed ${newPending / 10} SHIF contributions (KES ${newPending}). Please top up to maintain your coverage.`);
            }

            return res.json({
                success: true,
                data: {
                    originalAmount: amt,
                    deductionAmount: 0,
                    carriedForward: SHIF_DEDUCTION,
                    message: 'Original transaction allowed. SHIF contribution carried forward due to insufficient balance.'
                }
            });
        }

    } catch (e: any) {
        logger.error(`Error in /auto-deduct/transaction-sync: ${e.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── PROCESS EOD BATCH (Scheduled Cron Job endpoint) ──────────────────────────
// Simulates the 7 PM script calculating daily deficits and carrying them forward.
router.post('/auto-deduct/process-eod-batch', async (req, res) => {
    try {
        const allWallets = await prisma.wallet.findMany({
            include: { user: true }
        });

        let processedCount = 0;
        let totalCarriedForward = 0;

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        for (const wallet of allWallets) {
            const DAILY_CEILING = 50;
            const currentPending = Number(wallet.pendingDeductionKES);
            const effectiveTarget = DAILY_CEILING + currentPending;

            const todayLogs = await prisma.autoDeductionLog.findMany({
                where: {
                    userId: wallet.userId,
                    status: 'PROCESSED',
                    createdAt: { gte: startOfDay }
                }
            });
            
            const todayTotal = todayLogs.reduce((sum, log) => sum + Number(log.deductedAmount), 0);
            const deficit = effectiveTarget - todayTotal;

            if (deficit > 0 && deficit > currentPending) {
                const additionalDeficit = deficit - currentPending;
                
                await prisma.wallet.update({
                    where: { id: wallet.id },
                    data: { pendingDeductionKES: deficit }
                });

                logger.info(`[SMS] Dear ${wallet.user.fullName}, your daily SHIF contribution has a balance of KES ${deficit} which has been carried forward.`);
                
                if (deficit >= 50) {
                    logger.warn(`[SMS/APP WARNING] Warning: You have missed SHIF contributions totaling KES ${deficit}. Please top up to maintain your coverage.`);
                }
                
                totalCarriedForward += additionalDeficit;
                processedCount++;
            } else if (deficit <= 0 && currentPending > 0) {
                // They paid off their entire deficit today
                await prisma.wallet.update({
                    where: { id: wallet.id },
                    data: { pendingDeductionKES: 0 }
                });
            }
        }

        res.json({
            success: true,
            data: {
                usersProcessed: processedCount,
                totalCarriedForwardKES: totalCarriedForward,
                message: 'EOD deficit calculations completed.'
            }
        });

    } catch (e: any) {
        logger.error(`Error in /auto-deduct/process-eod-batch: ${e.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

export const loyaltyRouter = router;
