import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { logger } from '../lib/logger.js';

export const walletRouter = Router();

walletRouter.use(authenticate);

// ── GET /api/v1/wallet/balance ────────────────────────────────────────────────
// UHC: Returns coverage-proof token balance — these tokens prove active SHIF
// contribution, they are NOT spent at facilities.
walletRouter.get('/balance', async (req, res, next) => {
    try {
        const userId = req.user!.userId;
        const wallet = await prisma.wallet.findUnique({
            where: { userId },
            select: {
                balanceAfya: true,
                lockedAfya: true,
                earnedMatchAfya: true,
                blockchainAddress: true,
                coverageStatus: true,
                coverTypes: true,
            }
        });

        if (!wallet) {
            return res.status(404).json({ success: false, error: 'Wallet not found' });
        }

        res.json({
            success: true,
            balance: Number(wallet.balanceAfya),
            locked: Number(wallet.lockedAfya),
            matchEarned: Number(wallet.earnedMatchAfya),
            address: wallet.blockchainAddress,
            coverageStatus: wallet.coverageStatus,
            coverTypes: wallet.coverTypes,
        });
    } catch (err) {
        next(err);
    }
});

// ── GET /api/v1/wallet/history ────────────────────────────────────────────────
// Contribution history — shows how tokens were earned (NOT spent)
walletRouter.get('/history', async (req, res, next) => {
    try {
        const userId = req.user!.userId;
        const wallet = await prisma.wallet.findUnique({ where: { userId } });
        
        if (!wallet) return res.status(404).json({ success: false, error: 'Wallet not found' });

        const history = await prisma.transaction.findMany({
            where: { walletId: wallet.id },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        res.json({
            success: true,
            transactions: history.map(tx => ({
                id: tx.id,
                txHash: tx.txHash,
                amountAfya: Number(tx.amountAfya),
                status: tx.status,
                source: tx.source,
                createdAt: tx.createdAt,
            })),
        });
    } catch (err) {
        next(err);
    }
});

// ── GET /api/v1/wallet/coverage-status ────────────────────────────────────────
// Quick coverage status check (used by mobile app home screen)
walletRouter.get('/coverage-status', async (req, res, next) => {
    try {
        const userId = req.user!.userId;

        const [wallet, afyaScore] = await Promise.all([
            prisma.wallet.findUnique({
                where: { userId },
                select: { balanceAfya: true, coverageStatus: true, coverTypes: true },
            }),
            prisma.afyaScore.findUnique({
                where: { userId },
                select: { score: true, tier: true, streakDays: true },
            }),
        ]);

        if (!wallet) {
            return res.status(404).json({ success: false, error: 'Wallet not found' });
        }

        res.json({
            success: true,
            data: {
                coverageActive: wallet.coverageStatus === 'ACTIVE',
                coverageStatus: wallet.coverageStatus,
                tokenBalance: Number(wallet.balanceAfya),
                tier: afyaScore?.tier || 'BRONZE',
                score: afyaScore?.score || 0,
                streakDays: afyaScore?.streakDays || 0,
                coverTypes: wallet.coverTypes,
            },
        });
    } catch (err) {
        next(err);
    }
});

// NOTE: POST /api/v1/wallet/transfer has been REMOVED.
// Under the UHC coverage-proof model, patients cannot transfer AfyaTokens
// to facilities. Facility reimbursement flows from Treasury via CoverageVerifier.
// See: apps/api/src/routes/coverage.ts
