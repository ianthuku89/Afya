import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@afyaToken/types';
import { logger } from '../lib/logger';
import crypto from 'crypto';

export const coverageRouter = Router();

coverageRouter.use(authenticate);

// ── QR CODE PAYLOAD STRUCTURE ────────────────────────────────────────────────
// The QR code contains a signed, time-limited coverage proof.
// Facility scans this → calls /verify to confirm on backend.
// Privacy: QR contains ONLY coverage status, tier, and verification token.
//          It does NOT contain: contribution history, balance, financial data.
interface CoverageQRPayload {
    patientShaId: string;        // SHA member ID (e.g., SHA-KE-2024-8821)
    coverageActive: boolean;
    tier: string;
    issuedAt: number;            // Unix timestamp
    expiresAt: number;           // Valid for 5 minutes
    verificationToken: string;   // HMAC signature for tamper detection
}

// Prisma payload types matching the `include`/`select` shapes used below,
// so the .map() callbacks don't fall back to implicit `any`.

function generateVerificationToken(data: string): string {
    const secret = process.env.COVERAGE_HMAC_SECRET || process.env.JWT_SECRET || 'afya-coverage-secret';
    return crypto.createHmac('sha256', secret).update(data).digest('hex').substring(0, 16);
}

// ── GET /api/v1/coverage/qr ──────────────────────────────────────────────────
// Generate a time-limited QR code payload for the patient to present at facility
// Privacy: Only coverage status and tier are exposed — NO financial data
coverageRouter.get('/qr', async (req, res, next) => {
    try {
        const userId = req.user!.userId;

        const [user, wallet, afyaScore] = await Promise.all([
            prisma.user.findUnique({ where: { id: userId }, select: { shaId: true, fullName: true } }),
            prisma.wallet.findUnique({ where: { userId }, select: { balanceAfya: true, lockedAfya: true, coverageStatus: true } }),
            prisma.afyaScore.findUnique({ where: { userId }, select: { tier: true, streakDays: true, score: true } }),
        ]);

        if (!user || !wallet) {
            return res.status(404).json({ success: false, error: 'User or wallet not found' });
        }

        // Consider locked tokens as part of coverage-proof balance
        const totalCoverageTokens = Number(wallet.balanceAfya) + Number((wallet as any).lockedAfya || 0);
        const isActive = wallet.coverageStatus === 'ACTIVE' && totalCoverageTokens >= 10;
        const tier = afyaScore?.tier || 'BRONZE';
        const now = Math.floor(Date.now() / 1000);
        const expiresAt = now + (5 * 60); // 5-minute validity

        const tokenData = `${user.shaId}:${isActive}:${tier}:${now}`;
        const verificationToken = generateVerificationToken(tokenData);

        const qrPayload: CoverageQRPayload = {
            patientShaId: user.shaId || 'PENDING',
            coverageActive: isActive,
            tier,
            issuedAt: now,
            expiresAt,
            verificationToken,
        };

        res.json({
            success: true,
            data: {
                qrPayload: JSON.stringify(qrPayload),
                qrString: Buffer.from(JSON.stringify(qrPayload)).toString('base64'),
                expiresIn: 300, // 5 minutes
                patientName: user.fullName, // Shown on patient's own screen only
                coverageActive: isActive,
                tier,
                tierLabel: tier.charAt(0) + tier.slice(1).toLowerCase(),
                score: afyaScore?.score || 0,
                streakDays: afyaScore?.streakDays || 0,
            },
        });
    } catch (err) {
        next(err);
    }
});

// ── POST /api/v1/coverage/verify ─────────────────────────────────────────────
// Facility scans patient QR → calls this to verify coverage on backend
// Privacy: Response contains ONLY coverage status and tier
//          Does NOT contain: balance, contribution amounts, financial history
coverageRouter.post('/verify', authorize(UserRole.FACILITY, UserRole.SHA_ADMIN, UserRole.SUPER_ADMIN), async (req, res, next) => {
    try {
        const { qrPayload } = req.body;

        if (!qrPayload) {
            return res.status(400).json({ success: false, error: 'QR payload required' });
        }

        let parsed: CoverageQRPayload;
        try {
            const decoded = typeof qrPayload === 'string' && qrPayload.startsWith('{')
                ? qrPayload
                : Buffer.from(qrPayload, 'base64').toString('utf-8');
            parsed = JSON.parse(decoded);
        } catch {
            return res.status(400).json({ success: false, error: 'Invalid QR code format' });
        }

        // Check expiry
        const now = Math.floor(Date.now() / 1000);
        if (now > parsed.expiresAt) {
            return res.status(400).json({ success: false, error: 'QR code expired. Patient must generate a new one.' });
        }

        // Verify HMAC signature (tamper detection)
        const tokenData = `${parsed.patientShaId}:${parsed.coverageActive}:${parsed.tier}:${parsed.issuedAt}`;
        const expectedToken = generateVerificationToken(tokenData);
        if (parsed.verificationToken !== expectedToken) {
            return res.status(400).json({ success: false, error: 'QR code verification failed — possible tampering' });
        }

        // Live verification against database (fresh data, not just QR claims)
        const patient = await prisma.user.findUnique({
            where: { shaId: parsed.patientShaId },
            select: {
                id: true,
                fullName: true,
                wallet: { select: { coverageStatus: true, balanceAfya: true, lockedAfya: true, coverTypes: true } },
                afyaScore: { select: { tier: true, streakDays: true } },
            },
        });

        if (!patient || !patient.wallet) {
            return res.status(404).json({ success: false, error: 'Patient not found in SHIF registry' });
        }

        const liveCoverageTokens = Number(patient.wallet.balanceAfya) + Number((patient.wallet as any).lockedAfya || 0);
        const liveCoverageActive = patient.wallet.coverageStatus === 'ACTIVE' && liveCoverageTokens >= 10;
        const liveTier = patient.afyaScore?.tier || 'BRONZE';

        // Determine tier-specific covered services
        const coveredServices = getCoveredServices(liveTier);

        // Record the verification event
        const facilityUser = await prisma.user.findUnique({
            where: { id: req.user!.userId },
            select: { Facility: { select: { id: true } } },
        });

        if (facilityUser?.Facility) {
            await prisma.coverageVerification.create({
                data: {
                    patientId: patient.id,
                    facilityId: facilityUser.Facility.id,
                    coverageTier: liveTier as any,
                    coverageActive: liveCoverageActive,
                    streakDaysAtVisit: patient.afyaScore?.streakDays || 0,
                    qrPayload: typeof qrPayload === 'string' ? qrPayload.substring(0, 500) : undefined,
                },
            });
        }

        // Privacy-preserving response — facility sees ONLY:
        // - Coverage active/inactive
        // - Tier
        // - Covered service types
        // - Patient name (for identity confirmation)
        // Facility does NOT see: balance, contribution history, financial details
        res.json({
            success: true,
            data: {
                coverageActive: liveCoverageActive,
                tier: liveTier,
                tierLabel: liveTier.charAt(0) + liveTier.slice(1).toLowerCase(),
                patientName: patient.fullName,
                coveredServices,
                coverTypes: patient.wallet.coverTypes,
                message: liveCoverageActive
                    ? `✅ Patient has active SHIF coverage (${liveTier} tier)`
                    : '❌ Patient coverage is NOT active. Please advise patient to contribute.',
            },
        });

        logger.info(`Coverage verified: patient=${parsed.patientShaId} active=${liveCoverageActive} tier=${liveTier}`);
    } catch (err) {
        next(err);
    }
});

// ── GET /api/v1/coverage/status ──────────────────────────────────────────────
// Patient's own coverage status view (full details for the patient themselves)
coverageRouter.get('/status', async (req, res, next) => {
    try {
        const userId = req.user!.userId;

        const [wallet, afyaScore, recentVerifications] = await Promise.all([
            prisma.wallet.findUnique({
                where: { userId },
                select: { balanceAfya: true, lockedAfya: true, coverageStatus: true, coverTypes: true, earnedMatchAfya: true },
            }),
            prisma.afyaScore.findUnique({
                where: { userId },
                select: { score: true, tier: true, streakDays: true, longestStreak: true, totalContributions: true },
            }),
            prisma.coverageVerification.findMany({
                where: { patientId: userId },
                orderBy: { verifiedAt: 'desc' },
                take: 10,
                include: {
                    facility: { select: { name: true, mflCode: true } },
                },
            }),
        ]);

        if (!wallet) {
            return res.status(404).json({ success: false, error: 'Wallet not found' });
        }

        const tier = afyaScore?.tier || 'BRONZE';
        const coveredServices = getCoveredServices(tier);

        // Calculate days until coverage lapses (based on streak)
        const daysUntilLapse = Math.max(0, 30 - (afyaScore?.streakDays || 0) > 0 ? 0 : 30);

        res.json({
            success: true,
            data: {
                coverageActive: wallet.coverageStatus === 'ACTIVE',
                coverageStatus: wallet.coverageStatus,
                tier,
                score: afyaScore?.score || 0,
                streakDays: afyaScore?.streakDays || 0,
                longestStreak: afyaScore?.longestStreak || 0,
                totalContributions: Number(afyaScore?.totalContributions || 0),
                tokenBalance: Number(wallet.balanceAfya),
                matchEarned: Number(wallet.earnedMatchAfya),
                coverTypes: wallet.coverTypes,
                coveredServices,
                daysUntilLapse,
                recentVisits: recentVerifications.map(v => ({
                    facilityName: v.facility.name,
                    facilityCode: v.facility.mflCode,
                    coverageVerified: v.coverageActive,
                    tier: v.coverageTier,
                    date: v.verifiedAt,
                })),
            },
        });
    } catch (err) {
        next(err);
    }
});

// ── GET /api/v1/coverage/history ─────────────────────────────────────────────
// Visit history — NO payment amounts shown (privacy-preserving)
coverageRouter.get('/history', async (req, res, next) => {
    try {
        const userId = req.user!.userId;

        const verifications = await prisma.coverageVerification.findMany({
            where: { patientId: userId },
            orderBy: { verifiedAt: 'desc' },
            take: 50,
            include: {
                facility: { select: { name: true, mflCode: true, county: true } },
            },
        });

        res.json({
            success: true,
            data: verifications.map(v => ({
                id: v.id,
                facilityName: v.facility.name,
                facilityCode: v.facility.mflCode,
                county: v.facility.county,
                coverageActive: v.coverageActive,
                tier: v.coverageTier,
                date: v.verifiedAt,
                // Deliberately omitted: amounts, financial data
            })),
        });
    } catch (err) {
        next(err);
    }
});

// ── HELPER: Determine covered services by tier ───────────────────────────────
function getCoveredServices(tier: string): string[] {
    const base = ['Outpatient consultation', 'Emergency services', 'Lab tests (basic)', 'Pharmacy (essential drugs)'];

    switch (tier) {
        case 'SILVER':
            return [...base, 'Priority queuing', 'Extended outpatient', 'Lab tests (full panel)', 'Inpatient (standard ward)'];
        case 'GOLD':
            return [...base, 'Priority queuing', 'Extended outpatient', 'Lab tests (full panel)', 'Inpatient (standard ward)',
                'Dental care', 'Optical care', 'Chronic disease management', 'Specialist referrals', 'Radiology'];
        case 'PLATINUM':
            return [...base, 'Priority queuing', 'Extended outpatient', 'Lab tests (full panel)', 'Inpatient (private ward)',
                'Dental care', 'Optical care', 'Chronic disease management', 'Specialist referrals', 'Radiology',
                'Maternity premium package', 'Mental health services', 'Family cover (up to 5 dependants)', 'Surgery (elective)'];
        default: // BRONZE
            return base;
    }
}