import { getTierFromStreak, TIER_STREAK_THRESHOLDS, TIER_PERKS } from '../routes/afyascore.js';

describe('Streak-Based Tier & Preventive Package Logic (AfyaToken Infographic)', () => {
    it('correctly maps streak days to tiers per infographic', () => {
        expect(getTierFromStreak(0)).toBe('BRONZE');
        expect(getTierFromStreak(10)).toBe('BRONZE');
        expect(getTierFromStreak(29)).toBe('BRONZE');

        // Silver threshold = 30 days
        expect(getTierFromStreak(30)).toBe('SILVER');
        expect(getTierFromStreak(60)).toBe('SILVER');
        expect(getTierFromStreak(89)).toBe('SILVER');

        // Gold threshold = 90 days
        expect(getTierFromStreak(90)).toBe('GOLD');
        expect(getTierFromStreak(120)).toBe('GOLD');
        expect(getTierFromStreak(179)).toBe('GOLD');

        // Platinum threshold = 180 days
        expect(getTierFromStreak(180)).toBe('PLATINUM');
        expect(getTierFromStreak(365)).toBe('PLATINUM');
    });

    it('contains exact infographic-aligned perks for Silver, Gold, Platinum', () => {
        expect(TIER_STREAK_THRESHOLDS.SILVER.minStreak).toBe(30);
        expect(TIER_STREAK_THRESHOLDS.SILVER.facilities).toBe('Level 2 & 3 Facilities');
        expect(TIER_PERKS.SILVER).toContain('Monthly BP & blood sugar check');
        expect(TIER_PERKS.SILVER).toContain('Annual HIV & TB screening');
        expect(TIER_PERKS.SILVER).toContain('Eye vision screening (1×/year)');

        expect(TIER_STREAK_THRESHOLDS.GOLD.minStreak).toBe(90);
        expect(TIER_STREAK_THRESHOLDS.GOLD.facilities).toBe('Level 2 & 3 Facilities');
        expect(TIER_PERKS.GOLD).toContain('Dental cleaning & oral health check');
        expect(TIER_PERKS.GOLD).toContain('Cancer screening: cervical, breast & prostate');
        expect(TIER_PERKS.GOLD).toContain('Mental health screening (1×/6 months)');

        expect(TIER_STREAK_THRESHOLDS.PLATINUM.minStreak).toBe(180);
        expect(TIER_STREAK_THRESHOLDS.PLATINUM.facilities).toBe('Level 4 & 5 Hospitals');
        expect(TIER_PERKS.PLATINUM).toContain('Specialist consultations (1×/quarter)');
        expect(TIER_PERKS.PLATINUM).toContain('Full family cover (spouse + 2 children)');
        expect(TIER_PERKS.PLATINUM).toContain('Priority booking at Level 4 & 5 hospitals');
    });
});

