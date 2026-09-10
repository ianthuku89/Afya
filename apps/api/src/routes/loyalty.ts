import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../lib/logger.js';
import { authenticate } from '../middleware/auth.js';
import { initiateSHIFDeduction, initiateDarajaStkPush } from '../controllers/payment.controller.js';

const router = Router();
const prisma = new PrismaClient();
const DAILY_SHIF_DEDUCTION = 30; // KES flat daily deduction
const MIN_QUALIFYING_MERCHANT_TX = 100; // KES merchant threshold (> 100)
const SHA_SHIF_PAYBILL = process.env.SHA_SHIF_PAYBILL || '200222';

router.use(authenticate);

// Helper to check if user already had a deduction today
async function getTodayDeductionStatus(userId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayLogs = await prisma.autoDeductionLog.findMany({
        where: {
            userId,
            createdAt: { gte: startOfDay },
            status: { in: ['PENDING', 'PROCESSED'] }
        },
        orderBy: { createdAt: 'desc' }
    });

    const alreadyDeducted = todayLogs.length > 0;
    const totalDeductedToday = todayLogs.reduce((sum, log) => sum + Number(log.deductedAmount), 0);

    return { alreadyDeducted, totalDeductedToday, todayLogs };
}

// ─── OPT-IN FOR AUTO-DEDUCT ──────────────────────────────────────────────────
router.post('/auto-deduct/opt-in', async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { optIn } = req.body;

        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        if (optIn === false) {
            return res.status(400).json({
                success: false,
                message: 'Opt-out is not permitted for SHIF Auto-Deduct at this time.'
            });
        }

        const wallet = await prisma.wallet.update({
            where: { userId },
            data: { autoDeductOptIn: true }
        });

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
                message: `Successfully opted in. A fixed daily deduction of KES ${DAILY_SHIF_DEDUCTION} will route to your SHIF account (Paybill ${SHA_SHIF_PAYBILL}) on your first merchant transaction > KES ${MIN_QUALIFYING_MERCHANT_TX} each day.`
            }
        });

    } catch (e: any) {
        logger.error(`Error in /auto-deduct/opt-in: ${e.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── AUTO-DEDUCT STATUS ─────────────────────────────────────────────────────
router.get('/auto-deduct/status', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const wallet = await prisma.wallet.findUnique({
            where: { userId },
            include: { user: { select: { nationalId: true } } },
        });

        if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found.' });

        const { alreadyDeducted, totalDeductedToday, todayLogs } = await getTodayDeductionStatus(userId);

        res.json({
            success: true,
            data: {
                autoDeductOptIn: wallet.autoDeductOptIn,
                pendingDeductionKES: Number(wallet.pendingDeductionKES),
                todayDeductedKES: totalDeductedToday,
                dailyLimitKES: DAILY_SHIF_DEDUCTION,
                isDeductedToday: alreadyDeducted,
                minQualifyingTxKES: MIN_QUALIFYING_MERCHANT_TX,
                shaPaybill: SHA_SHIF_PAYBILL,
                shaAccountNumber: wallet.user?.nationalId || 'National ID',
                recentLogs: todayLogs.slice(0, 5).map((log) => ({
                    id: log.id,
                    tx: log.originalTxId,
                    originalAmt: Number(log.originalAmount),
                    deducted: Number(log.deductedAmount),
                    date: log.createdAt.toISOString(),
                    status: log.status,
                })),
            }
        });
    } catch (e: any) {
        logger.error(`Error in /auto-deduct/status: ${e.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── REAL-TIME MERCHANT TRIGGER (C2B Transaction Hook) ───────────────────────
// Called in real-time when the customer makes a merchant payment > KES 100.
// Checks if today's KES 30 deduction has already been executed. If not, triggers STK #2 to Paybill 200222.
router.post('/auto-deduct/merchant-trigger', async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { txAmount, txRef, phone } = req.body;

        if (!userId || !txAmount || !txRef) {
            return res.status(400).json({ success: false, message: 'Missing required parameters: txAmount, txRef' });
        }

        const amt = Number(txAmount);
        if (amt <= MIN_QUALIFYING_MERCHANT_TX) {
            return res.status(200).json({
                success: true,
                triggered: false,
                reason: `Transaction amount KES ${amt} is not greater than the qualifying threshold (KES ${MIN_QUALIFYING_MERCHANT_TX}).`
            });
        }

        const wallet = await prisma.wallet.findUnique({
            where: { userId },
            include: { user: true }
        });

        if (!wallet) {
            return res.status(404).json({ success: false, message: 'Wallet not found.' });
        }

        if (!wallet.autoDeductOptIn) {
            return res.status(200).json({
                success: true,
                triggered: false,
                reason: 'User has not opted in to Auto-Deduct.'
            });
        }

        const { alreadyDeducted } = await getTodayDeductionStatus(userId);
        if (alreadyDeducted) {
            return res.status(200).json({
                success: true,
                triggered: false,
                alreadyDeductedToday: true,
                message: `Daily SHIF contribution (KES ${DAILY_SHIF_DEDUCTION}) has already been satisfied today.`
            });
        }

        // Record pending deduction log
        const nationalId = wallet.user?.nationalId;
        const shaAccountRef = `${SHA_SHIF_PAYBILL}/${nationalId || 'UNKNOWN'}`;

        const log = await prisma.autoDeductionLog.create({
            data: {
                userId,
                originalTxId: txRef,
                originalAmount: amt,
                deductedAmount: DAILY_SHIF_DEDUCTION,
                status: 'PENDING',
            }
        });

        // Trigger real-time STK push for KES 30 to Paybill 200222
        const stkResult = await initiateSHIFDeduction(
            userId,
            txRef,
            phone || wallet.user?.phoneNumber || undefined
        );

        if (!stkResult.success) {
            await prisma.autoDeductionLog.update({
                where: { id: log.id },
                data: { status: 'FAILED' }
            });

            return res.status(502).json({
                success: false,
                error: 'Failed to initiate SHIF deduction STK push',
                detail: stkResult.detail || stkResult.error
            });
        }

        return res.json({
            success: true,
            triggered: true,
            data: {
                logId: log.id,
                checkoutRequestId: stkResult.checkoutRequestId,
                deductedAmount: DAILY_SHIF_DEDUCTION,
                shaPaybill: SHA_SHIF_PAYBILL,
                shaAccountRef,
                message: `STK push sent for KES ${DAILY_SHIF_DEDUCTION} SHIF contribution to Paybill ${SHA_SHIF_PAYBILL}.`
            }
        });
    } catch (e: any) {
        logger.error(`Error in /auto-deduct/merchant-trigger: ${e.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── TRANSACTION SYNC (Fallback / Background sync) ───────────────────────────
router.post('/auto-deduct/transaction-sync', async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { txAmount, txRef } = req.body;

        if (!userId || !txAmount || !txRef) {
            return res.status(400).json({ success: false, message: 'Missing required parameters' });
        }

        const amt = Number(txAmount);
        if (amt <= MIN_QUALIFYING_MERCHANT_TX) {
            return res.status(200).json({
                success: true,
                deductionAmount: 0,
                message: `Transaction amount KES ${amt} is below the threshold of KES ${MIN_QUALIFYING_MERCHANT_TX}. No SHIF deduction queued.`
            });
        }

        const wallet = await prisma.wallet.findUnique({ where: { userId } });
        if (!wallet || !wallet.autoDeductOptIn) {
            return res.status(200).json({ success: true, deductionAmount: 0, message: 'Auto-deduct not enabled.' });
        }

        const { alreadyDeducted } = await getTodayDeductionStatus(userId);
        if (alreadyDeducted) {
            return res.status(200).json({
                success: true,
                deductionAmount: 0,
                message: 'Daily SHIF contribution already recorded today.'
            });
        }

        const log = await prisma.autoDeductionLog.create({
            data: {
                userId,
                originalTxId: txRef,
                originalAmount: amt,
                deductedAmount: DAILY_SHIF_DEDUCTION,
                status: 'PENDING',
            }
        });

        await prisma.wallet.update({
            where: { userId },
            data: { pendingDeductionKES: { increment: DAILY_SHIF_DEDUCTION } }
        });

        return res.json({
            success: true,
            data: {
                originalAmount: amt,
                deductionAmount: DAILY_SHIF_DEDUCTION,
                message: `Fixed SHIF contribution of KES ${DAILY_SHIF_DEDUCTION} recorded for Paybill ${SHA_SHIF_PAYBILL}.`,
                logId: log.id,
            }
        });
    } catch (e: any) {
        logger.error(`Error in /auto-deduct/transaction-sync: ${e.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── PROCESS EOD BATCH (Fallback for any unsettled pending deductions) ───────
router.post('/auto-deduct/process-eod-batch', async (req, res) => {
    try {
        const wallets = await prisma.wallet.findMany({
            where: {
                autoDeductOptIn: true,
                pendingDeductionKES: { gt: 0 }
            },
            include: { user: true }
        });

        let processedCount = 0;
        let successCount = 0;
        let failureCount = 0;

        for (const wallet of wallets) {
            const pendingAmount = Number(wallet.pendingDeductionKES);
            if (pendingAmount <= 0 || !wallet.user?.phoneNumber) continue;

            const result = await initiateSHIFDeduction(
                wallet.userId,
                `BATCH_${Date.now()}`,
                wallet.user.phoneNumber
            );

            if (!result.success) {
                failureCount += 1;
                logger.warn(`[Auto-Deduct Batch] SHIF STK failed for user=${wallet.userId}: ${result.detail || result.error}`);
                continue;
            }

            await prisma.autoDeductionLog.updateMany({
                where: {
                    userId: wallet.userId,
                    status: 'PENDING'
                },
                data: {
                    status: 'PROCESSED',
                    processedAt: new Date(),
                }
            });

            await prisma.wallet.update({
                where: { id: wallet.id },
                data: { pendingDeductionKES: 0 }
            });

            processedCount += 1;
            successCount += 1;
        }

        res.json({
            success: true,
            data: {
                processedCount,
                successCount,
                failureCount,
                message: 'Auto-deduct batch settlement completed.'
            }
        });
    } catch (e: any) {
        logger.error(`Error in /auto-deduct/process-eod-batch: ${e.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

export const loyaltyRouter = router;
