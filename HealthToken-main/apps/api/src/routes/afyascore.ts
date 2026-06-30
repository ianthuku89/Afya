import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@afyaToken/types';
import { logger } from '../lib/logger';

export const afyaScoreRouter = Router();

afyaScoreRouter.use(authenticate);

// ── TIER THRESHOLDS ──────────────────────────────────────────────────────────
const TIER_THRESHOLDS = {
    BRONZE:   { min: 0,   max: 299,  label: 'Bronze',   color: '#CD7F32' },
    SILVER:   { min: 300, max: 599,  label: 'Silver',   color: '#C0C0C0' },
    GOLD:     { min: 600, max: 849,  label: 'Gold',     color: '#FFD700' },
    PLATINUM: { min: 850, max: 1000, label: 'Platinum', color: '#00C165' },
};

const TIER_PERKS: Record<string, string[]> = {
    BRONZE:   ['Basic SHIF outpatient coverage', 'Emergency services'],
    SILVER:   ['Priority queuing at facilities', 'Extended outpatient cover', 'Lab test coverage'],
    GOLD:     ['Dental & optical cover unlocked', 'Chronic disease management', 'Specialist referrals'],
    PLATINUM: ['Family cover extension (up to 5 dependants)', 'Premium facility access', 'Maternity premium package', 'Mental health services'],
};

// ── SCORE CALCULATION LOGIC ──────────────────────────────────────────────────
function calculateAfyaScore(streakDays: number, totalContributions: number, challengesCompleted: number): { score: number; tier: string } {
    // Weighted formula:
    // - Streak consistency: 40% weight (max 400 points for 365+ day streak)
    // - Contribution volume: 40% weight (max 400 points for KES 50,000+ cumulative)
    // - Challenges: 20% weight (max 200 points for 10+ challenges)

    const streakScore = Math.min(400, Math.floor((streakDays / 365) * 400));
    const contributionScore = Math.min(400, Math.floor((totalContributions / 50000) * 400));
    const challengeScore = Math.min(200, challengesCompleted * 20);

    const score = Math.min(1000, streakScore + contributionScore + challengeScore);

    let tier = 'BRONZE';
    if (score >= 850) tier = 'PLATINUM';
    else if (score >= 600) tier = 'GOLD';
    else if (score >= 300) tier = 'SILVER';

    return { score, tier };
}

// ── GET /api/v1/afyascore ────────────────────────────────────────────────────
// Returns the authenticated user's AfyaScore, tier, streak, and perks
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

        const tierInfo = TIER_THRESHOLDS[afyaScore.tier as keyof typeof TIER_THRESHOLDS] || TIER_THRESHOLDS.BRONZE;
        const currentPerks = TIER_PERKS[afyaScore.tier] || TIER_PERKS.BRONZE;

        // Calculate next tier info
        const tierOrder = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
        const currentIdx = tierOrder.indexOf(afyaScore.tier);
        const nextTier = currentIdx < 3 ? tierOrder[currentIdx + 1] : null;
        const nextTierThreshold = nextTier ? TIER_THRESHOLDS[nextTier as keyof typeof TIER_THRESHOLDS] : null;
        const pointsToNextTier = nextTierThreshold ? nextTierThreshold.min - afyaScore.score : 0;

        res.json({
            success: true,
            data: {
                score: afyaScore.score,
                tier: afyaScore.tier,
                tierLabel: tierInfo.label,
                tierColor: tierInfo.color,
                streakDays: afyaScore.streakDays,
                longestStreak: afyaScore.longestStreak,
                lastContributionAt: afyaScore.lastContributionAt,
                totalContributions: Number(afyaScore.totalContributions),
                totalTokensEarned: Number(afyaScore.totalTokensEarned),
                challengesCompleted: afyaScore.challengesCompleted,
                weeklyTarget: Number(afyaScore.weeklyTarget),
                perks: currentPerks,
                nextTier: nextTier ? {
                    tier: nextTier,
                    label: nextTierThreshold!.label,
                    color: nextTierThreshold!.color,
                    pointsNeeded: pointsToNextTier,
                    perks: TIER_PERKS[nextTier] || [],
                } : null,
            },
        });
    } catch (err) {
        next(err);
    }
});

// ── GET /api/v1/afyascore/leaderboard ────────────────────────────────────────
// Anonymized top contributors (privacy: shows county + tier, NOT names)
afyaScoreRouter.get('/leaderboard', async (req, res, next) => {
    try {
        const topScores = await prisma.afyaScore.findMany({
            orderBy: { score: 'desc' },
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
            score: s.score,
            tier: s.tier,
            streakDays: s.streakDays,
            county: s.user.countyCode || 'Unknown',
            // Anonymized — no PII exposed
        }));

        res.json({ success: true, data: leaderboard });
    } catch (err) {
        next(err);
    }
});

// ── GET /api/v1/afyascore/challenges ─────────────────────────────────────────
// Active challenges for the current period
afyaScoreRouter.get('/challenges', async (req, res, next) => {
    try {
        const userId = req.user!.userId;
        const afyaScore = await prisma.afyaScore.findUnique({ where: { userId } });

        const now = new Date();
        const monthName = now.toLocaleString('en-KE', { month: 'long' });

        // Dynamic challenges based on user's current tier
        const challenges = [
            {
                id: 'streak-7',
                title: '7-Day Streak',
                description: 'Contribute for 7 consecutive days',
                reward: '25 bonus AfyaTokens + 50 score points',
                progress: Math.min(afyaScore?.streakDays || 0, 7),
                target: 7,
                completed: (afyaScore?.streakDays || 0) >= 7,
                icon: '🔥',
            },
            {
                id: 'streak-30',
                title: '30-Day Champion',
                description: 'Contribute for 30 consecutive days',
                reward: '100 bonus AfyaTokens + 150 score points',
                progress: Math.min(afyaScore?.streakDays || 0, 30),
                target: 30,
                completed: (afyaScore?.streakDays || 0) >= 30,
                icon: '🏆',
            },
            {
                id: `monthly-${now.getMonth()}`,
                title: `${monthName} Contributor`,
                description: `Contribute at least 20 days in ${monthName}`,
                reward: '75 bonus AfyaTokens + tier upgrade boost',
                progress: Math.min(afyaScore?.streakDays || 0, 20),
                target: 20,
                completed: false, // Would need monthly tracking
                icon: '📅',
            },
            {
                id: 'first-gold',
                title: 'Reach Gold Tier',
                description: 'Accumulate 600+ AfyaScore points',
                reward: 'Dental & Optical cover unlocked',
                progress: Math.min(afyaScore?.score || 0, 600),
                target: 600,
                completed: (afyaScore?.score || 0) >= 600,
                icon: '⭐',
            },
        ];

        res.json({ success: true, data: challenges });
    } catch (err) {
        next(err);
    }
});

// ── GET /api/v1/afyascore/stats (Admin) ──────────────────────────────────────
// AfyaScore distribution analytics for admin dashboard
afyaScoreRouter.get('/stats', authorize(UserRole.SUPER_ADMIN, UserRole.SHA_ADMIN), async (req, res, next) => {
    try {
        const [totalUsers, tierCounts, avgScore, avgStreak] = await Promise.all([
            prisma.afyaScore.count(),
            prisma.afyaScore.groupBy({
                by: ['tier'],
                _count: { tier: true },
            }),
            prisma.afyaScore.aggregate({
                _avg: { score: true },
            }),
            prisma.afyaScore.aggregate({
                _avg: { streakDays: true },
            }),
        ]);

        const distribution: Record<string, number> = { BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 };
        tierCounts.forEach(t => { distribution[t.tier] = t._count.tier; });

        res.json({
            success: true,
            data: {
                totalUsers,
                averageScore: Math.round(avgScore._avg.score || 0),
                averageStreak: Math.round(avgStreak._avg.streakDays || 0),
                tierDistribution: distribution,
            },
        });
    } catch (err) {
        next(err);
    }
});

export { calculateAfyaScore };
