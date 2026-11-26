import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { client } from '../../api/client';
import { colors, fonts, radii, shadows, tabularNums, tierColors } from '../../theme';

interface TierData {
  tier: string;
  minStreak: number;
  label: string;
  facilities: string;
  perks: string[];
}

const TIERS: TierData[] = [
  {
    tier: 'SILVER',
    minStreak: 30,
    label: 'Silver',
    facilities: 'LEVEL 2 & 3 FACILITIES',
    perks: [
      'Monthly BP & blood sugar check',
      'Annual HIV & TB screening',
      'Nutrition counselling (1×/quarter)',
      'Family planning consultations',
      'Eye vision screening (1×/year)',
      'Maternal health check-ups',
    ],
  },
  {
    tier: 'GOLD',
    minStreak: 90,
    label: 'Gold',
    facilities: 'LEVEL 2 & 3 FACILITIES',
    perks: [
      'All Silver benefits, PLUS:',
      'Cancer screening: cervical, breast & prostate',
      'Dental cleaning & oral health check',
      'Mental health screening (1×/6 months)',
      'Diabetes & kidney function panel',
      'Child immunisation schedule tracking',
    ],
  },
  {
    tier: 'PLATINUM',
    minStreak: 180,
    label: 'Platinum',
    facilities: 'LEVEL 4 & 5 HOSPITALS',
    perks: [
      'All Gold benefits, PLUS:',
      'Specialist consultations (1×/quarter)',
      'Comprehensive annual blood panel',
      'Diagnostic imaging when clinically indicated',
      'Full family cover (spouse + 2 children)',
      'Priority booking at Level 4 & 5 hospitals',
    ],
  },
];

export default function TierBenefitsScreen() {
  const navigation = useNavigation<any>();
  const [streakDays, setStreakDays] = useState(0);
  const [currentTier, setCurrentTier] = useState('BRONZE');
  const [loading, setLoading] = useState(true);

  const fetchScoreData = async () => {
    try {
      const res = await client.get('/afyascore');
      setStreakDays(res.data.data.streakDays || 0);
      setCurrentTier(res.data.data.tier || 'BRONZE');
    } catch (e) {
      console.warn('Failed to load tier data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScoreData();
  }, []);

  return (
    <SafeAreaView style={s.screen}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.iconButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>Tiered Benefits</Text>
          <Text style={s.subtitle}>SHA-Partnered Preventive Packages</Text>
        </View>
        <View style={s.streakPill}>
          <Feather name="zap" size={14} color={colors.accent} />
          <Text style={[s.streakPillText, tabularNums]}>{streakDays}d Streak</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchScoreData}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* Banner */}
        <View style={s.card}>
          <View style={s.cardTitleRow}>
            <View style={s.iconBox}>
              <Feather name="award" size={20} color={colors.accent} />
            </View>
            <Text style={[s.sectionTitle, s.flex]}>Your Contribution Streak</Text>
          </View>
          <Text style={[s.body, { color: colors.muted, marginBottom: 18 }]}>
            Each day you contribute KES 30 adds to your streak. Streaks unlock Silver, Gold, and Platinum preventive packages.
            Missing a day pauses (does not reset) your streak.
          </Text>

          {/* Streak Progress Bar */}
          <View style={s.progressBlock}>
            <View style={s.progressTop}>
              <Text style={[s.small, tabularNums]}>Current: {streakDays} days</Text>
              <Text style={[s.progressNext, tabularNums]}>
                {streakDays < 30 ? `${30 - streakDays}d to Silver` : streakDays < 90 ? `${90 - streakDays}d to Gold` : streakDays < 180 ? `${180 - streakDays}d to Platinum` : 'Top Platinum Achieved!'}
              </Text>
            </View>
            <View style={s.track}>
              <View style={[s.fill, { width: `${Math.min(100, (streakDays / 180) * 100)}%` }]} />
            </View>
            <View style={s.milestones}>
              {[
                { tier: 'BRONZE', text: '0d (Bronze)' },
                { tier: 'SILVER', text: '30d (Silver)' },
                { tier: 'GOLD', text: '90d (Gold)' },
                { tier: 'PLATINUM', text: '180d (Platinum)' },
              ].map((m) => (
                <View key={m.tier} style={s.milestone}>
                  <View style={[s.dot, { backgroundColor: tierColors[m.tier] }]} />
                  <Text style={[s.small, tabularNums]}>{m.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Tier Cards */}
        <Text style={s.sectionTitle}>Preventive Packages</Text>

        {TIERS.map((t) => {
          const isUnlocked = streakDays >= t.minStreak;
          const isCurrent = currentTier === t.tier;

          return (
            <View key={t.tier} style={[s.card, isUnlocked && s.cardUnlocked]}>
              {/* Card Header */}
              <View style={s.tierHeader}>
                <View style={s.flex}>
                  <View style={s.tierNameRow}>
                    <View style={[s.dot, { backgroundColor: tierColors[t.tier] }]} />
                    <Text style={s.tierName}>{t.label}</Text>
                    {isUnlocked && (
                      <View style={s.badge}>
                        <Feather name="check" size={12} color={colors.accent} />
                        <Text style={s.badgeText}>UNLOCKED</Text>
                      </View>
                    )}
                    {isCurrent && (
                      <View style={s.badgeSolid}>
                        <Text style={s.badgeSolidText}>ACTIVE TIER</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.facilities}>{t.facilities}</Text>
                </View>

                <View style={s.streakChip}>
                  <Text style={[s.streakChipText, tabularNums]}>{t.minStreak}-Day Streak</Text>
                </View>
              </View>

              {/* Perks List */}
              <View style={s.perks}>
                {t.perks.map((perk, idx) => (
                  <View key={idx} style={s.perkRow}>
                    <Feather
                      name={isUnlocked ? 'check' : 'lock'}
                      size={14}
                      color={isUnlocked ? colors.accent : colors.muted}
                      style={s.perkIcon}
                    />
                    <Text style={[s.perkText, !isUnlocked && { color: colors.muted }]}>{perk}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        {/* Healthcare Access At Facility Info */}
        <View style={s.card}>
          <View style={s.cardTitleRow}>
            <View style={s.iconBox}>
              <Feather name="plus-circle" size={20} color={colors.accent} />
            </View>
            <Text style={[s.sectionTitle, s.flex]}>Curative Care — Always Free</Text>
          </View>
          <Text style={[s.body, { color: colors.muted, marginBottom: 16 }]}>
            Under the UHC Walk-In Walk-Out policy, curative treatment is provided at any SHA-accredited public facility regardless of tier.
            No cash payment is required at the point of care.
          </Text>
          <View style={s.listBlock}>
            {[
              'Valid for any active SHIF member',
              'AI claims auto-cleared in under 3 seconds',
              'Vaccines are free and not duplicated here',
            ].map((line, i) => (
              <View key={line} style={[s.listRow, i > 0 && s.rowDivider]}>
                <Feather name="check" size={14} color={colors.accent} style={{ marginRight: 10 }} />
                <Text style={[s.small, s.flex]}>{line}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.ground },
  content: { padding: 20, paddingBottom: 60, gap: 16 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 },
  headerText: { flex: 1, marginLeft: 12, marginRight: 8 },
  iconButton: {
    width: 44, height: 44, borderRadius: radii.button, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: fonts.bold, fontSize: 28, letterSpacing: -0.5, color: colors.text },
  subtitle: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginTop: 2 },
  streakPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12,
    borderRadius: radii.pill, borderWidth: 1, borderColor: colors.accent + '33', backgroundColor: colors.accent + '14',
  },
  streakPillText: { fontFamily: fonts.bold, fontSize: 13, color: colors.accent },

  // Cards
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
    borderRadius: radii.card, padding: 22, ...shadows.card,
  },
  cardUnlocked: { borderColor: colors.accent + '33' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },

  // Typography
  sectionTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  body: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, color: colors.text },
  small: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, lineHeight: 18 },

  // Icon box
  iconBox: {
    width: 44, height: 44, borderRadius: radii.icon, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },

  // Progress
  progressBlock: {
    borderWidth: 1, borderColor: colors.line, borderRadius: radii.button, backgroundColor: colors.ground, padding: 14,
  },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressNext: { fontFamily: fonts.bold, fontSize: 13, color: colors.accent },
  track: { height: 10, borderRadius: radii.pill, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.accent },
  milestones: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, rowGap: 8 },
  milestone: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 8 },

  // Status dot
  dot: { width: 7, height: 7, borderRadius: 4 },

  // Tier cards
  tierHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  tierNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  tierName: { fontFamily: fonts.bold, fontSize: 20, letterSpacing: -0.3, color: colors.text },
  facilities: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.4, color: colors.muted, marginTop: 6 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 24,
    borderRadius: radii.pill, borderWidth: 1, borderColor: colors.accent + '33', backgroundColor: colors.accent + '14',
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 12, color: colors.accent },
  badgeSolid: {
    paddingHorizontal: 8, height: 24, borderRadius: radii.pill, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeSolidText: { fontFamily: fonts.bold, fontSize: 12, color: colors.accentInk },
  streakChip: {
    paddingHorizontal: 10, height: 32, borderRadius: radii.icon, borderWidth: 1, borderColor: colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  streakChipText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.text },
  perks: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 14, gap: 10 },
  perkRow: { flexDirection: 'row', alignItems: 'flex-start' },
  perkIcon: { marginTop: 2, marginRight: 10 },
  perkText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, color: colors.text },

  // List rows
  listBlock: { borderWidth: 1, borderColor: colors.line, borderRadius: radii.button, paddingHorizontal: 14 },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.line },
});