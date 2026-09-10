import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { UserRole } from '@afyaToken/types';

export const adminRouter = Router();

adminRouter.use(authenticate);

// ── GET /api/v1/admin/dashboard ─────────────────────────────────────────────
adminRouter.get('/dashboard', authorize(UserRole.SUPER_ADMIN, UserRole.SHA_ADMIN), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const [
            activeWalletsCount,
            totalAfyaTokenCirculation,
            totalTransactions,
            fraudPreventedResult
        ] = await Promise.all([
            prisma.wallet.count({ where: { isActive: true } }),
            prisma.wallet.aggregate({ _sum: { balanceAfya: true } }),
            prisma.transaction.count({ where: { status: 'CONFIRMED' } }),
            prisma.claim.aggregate({
                where: { OR: [{ aiRecommendation: 'BLOCK' }, { status: 'FLAGGED' }, { status: 'REJECTED' }] },
                _sum: { reimbursementKES: true }
            })
        ]);

        res.json({
            success: true,
            data: {
                afyaTokenInCirculation: Number(totalAfyaTokenCirculation._sum.balanceAfya || 0),
                activeWallets: activeWalletsCount,
                smartContractExecutions: totalTransactions,
                fraudPreventedKES: Number(fraudPreventedResult._sum.reimbursementKES || 0),
                circulationTrend: [40, 55, 48, 70, 65, 80, 92, 88, 100],
                walletsTrend: [30, 35, 42, 51, 48, 60, 68, 75, 82],
                execTrend: [20, 30, 28, 40, 45, 52, 48, 60, 65],
                fraudTrend: [5, 12, 8, 15, 20, 14, 25, 30, 22],
                volumeChart: [120, 145, 138, 160, 155, 180, 210, 195, 220, 240, 235, 260]
            }
        });
    } catch (err) { next(err); }
});

// ── GET /api/v1/admin/activity ──────────────────────────────────────────────
adminRouter.get('/activity', authorize(UserRole.SUPER_ADMIN, UserRole.SHA_ADMIN), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const transactions = await prisma.transaction.findMany({
            take: 6,
            orderBy: { createdAt: 'desc' },
            include: { wallet: { include: { user: { select: { role: true, fullName: true } } } } }
        });

        const activity = transactions.map(tx => ({
            id: tx.id,
            hash: tx.txHash.substring(0, 14) + '...',
            from: tx.fromAddress === '0xTreasury' ? 'Treasury' : tx.fromAddress.substring(0, 8) + '...',
            to: tx.toAddress.substring(0, 8) + '...',
            amount: Number(tx.amountAfya).toString(),
            status: tx.status === 'CONFIRMED' ? 'Confirmed' : tx.status === 'PENDING' ? 'Pending' : 'Flagged',
            time: Math.floor((Date.now() - new Date(tx.createdAt).getTime()) / 1000) + 's ago'
        }));

        res.json({ success: true, data: activity });
    } catch (err) { next(err); }
});

// ── GET /api/v1/admin/claims ────────────────────────────────────────────────
adminRouter.get('/claims', authorize(UserRole.SUPER_ADMIN, UserRole.SHA_ADMIN), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const statusFilter = req.query.status as string | undefined;
        const where = statusFilter && statusFilter !== 'All' ? { status: statusFilter.toUpperCase() as any } : {};

        const [claims, counts] = await Promise.all([
            prisma.claim.findMany({
                where,
                take: 50,
                orderBy: { createdAt: 'desc' },
                include: {
                    patient: { select: { nationalId: true, shaId: true } },
                    facility: { select: { name: true } }
                }
            }),
            prisma.claim.groupBy({
                by: ['status'],
                _count: { id: true },
                _sum: { reimbursementKES: true }
            })
        ]);

        const summary = {
            pending: 0, approved: 0, flagged: 0, totalKES: 0
        };
        counts.forEach(c => {
            const key = c.status.toLowerCase() as keyof typeof summary;
            if (key in summary) summary[key] = (c._count as any)._all || 0;
            summary.totalKES += Number((c._sum as any).reimbursementKES || 0);
        });

        const rows = claims.map(c => ({
            id: c.claimNumber,
            patient: c.patient?.shaId ? `SHA ${c.patient.shaId.slice(-4)}` : `ID ***${c.patientId.slice(-4)}`,
            facility: c.facility?.name || 'Unknown',
            svc: c.service.replace('_', ' '),
            amt: `KES ${Number(c.reimbursementKES).toLocaleString()}`,
            ai: c.aiScore,
            status: c.status.charAt(0) + c.status.slice(1).toLowerCase()
        }));

        res.json({ success: true, data: { summary, rows } });
    } catch (err) { next(err); }
});

// ── PATCH /api/v1/admin/claims/:id/approve ──────────────────────────────────
adminRouter.patch('/claims/:id/approve', authorize(UserRole.SUPER_ADMIN, UserRole.SHA_ADMIN), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const claim = await prisma.claim.update({
            where: { claimNumber: req.params.id },
            data: { status: 'APPROVED', reviewerId: (req as any).userId }
        });
        res.json({ success: true, data: { id: claim.claimNumber, status: 'Approved' } });
    } catch (err) { next(err); }
});

// ── GET /api/v1/admin/facilities ────────────────────────────────────────────
adminRouter.get('/facilities', authorize(UserRole.SUPER_ADMIN, UserRole.SHA_ADMIN), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const facilities = await prisma.facility.findMany({
            where: { isAccredited: true },
            orderBy: { name: 'asc' },
            take: 30
        });

        const rows = facilities.map(f => ({
            id: f.id,
            name: f.name,
            level: f.level.replace('_', ' '),
            county: f.county,
            mflCode: f.mflCode,
            fhirEnabled: f.fhirEnabled,
            walletAddress: f.walletAddress
        }));

        res.json({ success: true, data: rows });
    } catch (err) { next(err); }
});

// ── GET /api/v1/admin/ai-stats ──────────────────────────────────────────────
adminRouter.get('/ai-stats', authorize(UserRole.SUPER_ADMIN), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const [totalClaims, flaggedClaims, autoApproved] = await Promise.all([
            prisma.claim.count(),
            prisma.claim.count({ where: { OR: [{ status: 'FLAGGED' }, { aiRecommendation: 'BLOCK' }] } }),
            prisma.claim.count({ where: { aiRecommendation: 'APPROVE' } })
        ]);

        const autoApprovalRate = totalClaims > 0 ? ((autoApproved / totalClaims) * 100).toFixed(1) : '0';

        // Fetch recent flagged claims for the anomaly feed
        const anomalies = await prisma.claim.findMany({
            where: { OR: [{ status: 'FLAGGED' }, { aiRecommendation: 'BLOCK' }, { aiRecommendation: 'REVIEW' }] },
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { facility: { select: { name: true } } }
        });

        const feed = anomalies.map(a => {
            const flags = a.aiFlags || [];
            const type = flags[0] || 'Anomaly';
            const risk = a.aiScore < 40 ? 'HIGH' : a.aiScore < 70 ? 'MED' : 'LOW';
            const action = a.aiRecommendation === 'BLOCK' ? 'Auto-Blocked'
                         : a.aiRecommendation === 'REVIEW' ? 'Under Review' : 'Approved';
            return {
                type, facility: a.facility?.name || 'Unknown',
                amount: `KES ${Number(a.reimbursementKES).toLocaleString()}`, risk, action
            };
        });

        res.json({
            success: true,
            data: {
                avgAccuracy: '98.7',
                anomaliesToday: flaggedClaims,
                autoApprovalRate,
                feed
            }
        });
    } catch (err) { next(err); }
});

// ── GET /api/v1/admin/blockchain ────────────────────────────────────────────
adminRouter.get('/blockchain', authorize(UserRole.SUPER_ADMIN), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const [txCount, latestTx] = await Promise.all([
            prisma.transaction.count({ where: { status: 'CONFIRMED' } }),
            prisma.transaction.findFirst({ orderBy: { createdAt: 'desc' }, select: { blockNumber: true } })
        ]);

        res.json({
            success: true,
            data: {
                blockHeight: latestTx?.blockNumber ? Number(latestTx.blockNumber) : 0,
                avgConfirmTime: '2.3s',
                activeContracts: txCount
            }
        });
    } catch (err) { next(err); }
});

