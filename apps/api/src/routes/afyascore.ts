import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { UserRole } from '@afyaToken/types';
import { logger } from '../lib/logger.js';

export const afyaScoreRouter = Router();

afyaScoreRouter.use(authenticate);

// ── STREAK-DAY TIER THRESHOLDS (per AfyaToken infographic) ───────────────────
// Tiers unlock exclusively based on consecutive contribution day streak.
// Score points have been removed; streak is the single source of truth for tier.
export const TIER_STREAK_THRESHOLDS = {
    BRONZE:   { minStreak: 0,   label: 'Bronze',   color: '#CD7F32', facilities: 'Level 1 & 2 Facilities' },
    SILVER:   { minStreak: 30,  label: 'Silver',   color: '#C0C0C0', facilities: 'Level 2 & 3 Facilities' },
    GOLD:     { minStreak: 90,  label: 'Gold',     color: '#FFD700', facilities: 'Level 2 & 3 Facilities' },
    PLATINUM: { minStreak: 180, label: 'Platinum', color: '#00C165', facilities: 'Level 4 & 5 Hospitals' },
} as const;

// ── TIER PERKS — aligned with AfyaToken infographic (SHA-partnered) ───────────
export const TIER_PERKS: Record<string, string[]> = {
    BRONZE: [
        'Basic SHIF outpatient coverage',
        'Emergency services at any SHA-accredited facility',
    ],
    SILVER: [
        'Monthly BP & blood sugar check',
        'Annual HIV & TB screening',
        'Nutrition counselling (1×/quarter)',
        'Family planning consultations',
        'Eye vision screening (1×/year)',
        'Maternal health check-ups',
    ],
    GOLD: [
        // All Silver benefits, plus:
        'Monthly BP & blood sugar check',
        'Annual HIV & TB screening',
        'Nutrition counselling (1×/quarter)',
        'Family planning consultations',
        'Eye vision screening (1×/year)',
        'Maternal health check-ups',
        'Cancer screening: cervical, breast & prostate',
        'Dental cleaning & oral health check',
        'Mental health screening (1×/6 months)',
        'Diabetes & kidney function panel',
        'Child immunisation schedule tracking',
    ],
    PLATINUM: [
        // All Gold benefits, plus:
        'Monthly BP & blood sugar check',
        'Annual HIV & TB screening',
        'Nutrition counselling (1×/quarter)',
        'Family planning consultations',
        'Eye vision screening (1×/year)',
        'Maternal health check-ups',
        'Cancer screening: cervical, breast & prostate',
        'Dental cleaning & oral health check',
        'Mental health screening (1×/6 months)',
        'Diabetes & kidney function panel',
        'Child immunisation schedule tracking',
        'Specialist consultations (1×/quarter)',
        'Comprehensive annual blood panel',
        'Diagnostic imaging when clinically indicated',
        'Full family cover (spouse + 2 children)',
        'Priority booking at Level 4 & 5 hospitals',
    ],
};

// ── TIER DETERMINATION — purely streak-based ─────────────────────────────────
export function getTierFromStreak(streakDays: number): string {
    if (streakDays >= 180) return 'PLATINUM';
    if (streakDays >= 90)  return 'GOLD';
    if (streakDays >= 30)  return 'SILVER';
    return 'BRONZE';
}

// ── GET /api/v1/afyascore ────────────────────────────────────────────────────
// Returns the authenticated user's tier, streak, contribution total, and perks.
// Score points have been removed; tier is derived solely from streakDays.
afyaScoreRouter.get('/', async (req, res, next) => {
    try {
        const userId = req.user!.userId;

        let afyaScore = await prisma.afyaScore.findUnique({
            where: { userId },
        });

        // Auto-create if doesn't exist
        if (!afyaScore) {
            afyaScore = await prisma.afyaScore.create({
                data: { userId },
            });
        }

        const tier = getTierFromStreak(afyaScore.streakDays);
        const tierInfo = TIER_STREAK_THRESHOLDS[tier as keyof typeof TIER_STREAK_THRESHOLDS];
        const currentPerks = TIER_PERKS[tier] || TIER_PERKS.BRONZE;

        // Next tier progress
        const tierOrder = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'] as const;
        const currentIdx = tierOrder.indexOf(tier as any);
        const nextTierKey = currentIdx < 3 ? tierOrder[currentIdx + 1] : null;
        const nextTierInfo = nextTierKey
            ? TIER_STREAK_THRESHOLDS[nextTierKey]
            : null;
        const streakNeeded = nextTierInfo
            ? Math.max(0, nextTierInfo.minStreak - afyaScore.streakDays)
            : 0;

        res.json({
            success: true,
            data: {
                tier,
                tierLabel: tierInfo.label,
                tierColor: tierInfo.color,
                tierFacilities: tierInfo.facilities,
                streakDays: afyaScore.streakDays,
                longestStreak: afyaScore.longestStreak,
                lastContributionAt: afyaScore.lastContributionAt,
                totalContributions: Number(afyaScore.totalContributions),
                challengesCompleted: afyaScore.challengesCompleted,
                weeklyTarget: Number(afyaScore.weeklyTarget),
                perks: currentPerks,
                nextTier: nextTierKey ? {
                    tier: nextTierKey,
                    label: nextTierInfo!.label,
                    color: nextTierInfo!.color,
                    facilities: nextTierInfo!.facilities,
                    streakRequired: nextTierInfo!.minStreak,
                    streakNeeded,
                    perks: TIER_PERKS[nextTierKey] || [],
                } : null,
            },
        });
    } catch (err) {
        next(err);
    }
});

// ── GET /api/v1/afyascore/leaderboard ────────────────────────────────────────
// Anonymized top contributors ordered by streak length (privacy: county + tier only).
afyaScoreRouter.get('/leaderboard', async (req, res, next) => {
    try {
        const topScores = await prisma.afyaScore.findMany({
            orderBy: { streakDays: 'desc' },
            take: 20,
            include: {
                user: {
                    select: {
                        countyCode: true,
                        // NOT selecting: fullName, email, nationalId (privacy)
                    },
                },
            },
        });

        const leaderboard = topScores.map((s, idx) => ({
            rank: idx + 1,
            tier: getTierFromStreak(s.streakDays),
            streakDays: s.streakDays,
            longestStreak: s.longestStreak,
            county: s.user.countyCode || 'Unknown',
            // Anonymized — no PII exposed
        }));

        res.json({ success: true, data: leaderboard });
    } catch (err) {
        next(err);
    }
});

// ── GET /api/v1/afyascore/challenges ─────────────────────────────────────────
afyaScoreRouter.get('/challenges', async (req, res, next) => {
    try {
        const userId = req.user!.userId;
        const afyaScore = await prisma.afyaScore.findUnique({ where: { userId } });
        const currentStreak = afyaScore?.streakDays || 0;

        const now = new Date();
        const monthName = now.toLocaleString('en-KE', { month: 'long' });

        const challenges = [
            {
                id: 'streak-30',
                title: '30-Day Streak — Silver',
                description: 'Contribute for 30 consecutive days to unlock Silver tier',
                reward: 'Silver tier: Level 2 & 3 facility access + preventive screenings',
                progress: Math.min(currentStreak, 30),
                target: 30,
                completed: currentStreak >= 30,
                icon: '🥈',
            },
            {
                id: 'streak-90',
                title: '90-Day Streak — Gold',
                description: 'Contribute for 90 consecutive days to unlock Gold tier',
                reward: 'Gold tier: Dental, cancer screening & mental health',
                progress: Math.min(currentStreak, 90),
                target: 90,
                completed: currentStreak >= 90,
                icon: '🥇',
            },
            {
                id: 'streak-180',
                title: '180-Day Streak — Platinum',
                description: 'Contribute for 180 consecutive days to unlock Platinum tier',
                reward: 'Platinum: Full family cover + Level 4 & 5 hospitals',
                progress: Math.min(currentStreak, 180),
                target: 180,
                completed: currentStreak >= 180,
                icon: '💎',
            },
            {
                id: `monthly-${now.getMonth()}`,
                title: `${monthName} Contributor`,
                description: `Contribute at least 20 days in ${monthName}`,
                reward: '75 bonus AfyaTokens + streak protection',
                progress: Math.min(currentStreak, 20),
                target: 20,
                completed: false,
                icon: '📅',
            },
        ];

        res.json({ success: true, data: challenges });
    } catch (err) {
        next(err);
    }
});

// ── GET /api/v1/afyascore/tiers ───────────────────────────────────────────────
// Returns the full tier structure for the mobile tier benefits screen.
afyaScoreRouter.get('/tiers', async (_req, res, next) => {
    try {
        const tiers = (['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'] as const).map((key) => ({
            tier: key,
            ...TIER_STREAK_THRESHOLDS[key],
            perks: TIER_PERKS[key],
        }));
        res.json({ success: true, data: tiers });
    } catch (err) {
        next(err);
    }
});

// ── GET /api/v1/afyascore/stats (Admin) ──────────────────────────────────────
afyaScoreRouter.get('/stats', authorize(UserRole.SUPER_ADMIN, UserRole.SHA_ADMIN), async (req, res, next) => {
    try {
        const [totalUsers, avgStreak, avgContributions] = await Promise.all([
            prisma.afyaScore.count(),
            prisma.afyaScore.aggregate({ _avg: { streakDays: true } }),
            prisma.afyaScore.aggregate({ _avg: { totalContributions: true } }),
        ]);

        // Tier distribution computed from streak thresholds
        const allScores = await prisma.afyaScore.findMany({ select: { streakDays: true } });
        const distribution = { BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 };
        allScores.forEach(s => {
            const t = getTierFromStreak(s.streakDays) as keyof typeof distribution;
            distribution[t] += 1;
        });

        res.json({
            success: true,
            data: {
                totalUsers,
                averageStreak: Math.round(avgStreak._avg.streakDays || 0),
                averageContributionsKES: Math.round(Number(avgContributions._avg.totalContributions) || 0),
                tierDistribution: distribution,
            },
        });
    } catch (err) {
        next(err);
    }
});

