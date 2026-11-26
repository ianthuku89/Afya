import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/auth';
import { client } from '../../api/client';
import { colors, fonts, radii, shadows, tabularNums, tierColors, tierFacilities } from '../../theme';

interface CoverageData {
  coverageActive: boolean;
  coverageStatus: string;
  tokenBalance: number;
  tier: string;
  streakDays: number;
}

interface AfyaScoreData {
  tier: string;
  tierLabel: string;
  tierColor: string;
  tierFacilities: string;
  streakDays: number;
  longestStreak: number;
  totalContributions: number;
  perks: string[];
  nextTier: {
    tier: string;
    label: string;
    facilities: string;
    streakRequired: number;
    streakNeeded: number;
    perks: string[];
  } | null;
}

export default function HomeScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation<any>();
  const [coverage, setCoverage] = useState<CoverageData | null>(null);
  const [afyaData, setAfyaData] = useState<AfyaScoreData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [coverageRes, scoreRes] = await Promise.all([
        client.get('/wallet/coverage-status'),
        client.get('/afyascore'),
      ]);
      setCoverage(coverageRes.data.data);
      setAfyaData(scoreRes.data.data);
    } catch (e) {
      console.error('Failed to fetch home screen data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setLoading(true);
    fetchData();
  };

  const tier = afyaData?.tier || coverage?.tier || 'BRONZE';
  const tierDot = tierColors[tier] ?? tierColors.BRONZE;
  const facilities = tierFacilities[tier] ?? tierFacilities.BRONZE;
  const tierLabel = afyaData?.tierLabel || 'Bronze';
  const streakDays = afyaData?.streakDays ?? coverage?.streakDays ?? 0;
  const coverageActive = coverage?.coverageActive ?? false;

  // Progress toward the next tier (30 / 90 / 180 days)
  const streakTarget =
    afyaData?.nextTier?.streakRequired || (streakDays < 30 ? 30 : streakDays < 90 ? 90 : 180);
  const streakProgressPercent = Math.min(100, Math.round((streakDays / streakTarget) * 100));

  const stats: { label: string; value: string }[] = [
    { label: 'Preventive tier', value: `${tierLabel} package` },
    { label: 'All-time best', value: `${afyaData?.longestStreak || streakDays} days` },
    { label: 'Total contributed', value: `KES ${afyaData?.totalContributions?.toLocaleString() || '0'}` },
    { label: 'SHA paybill', value: '200222 (Direct)' },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Habari, {user?.name || 'Citizen'}</Text>
            <Text style={s.title}>Afya Yako</Text>
          </View>
          <TouchableOpacity style={s.bell} accessibilityRole="button" accessibilityLabel="Notifications">
            <Feather name="bell" size={20} color={colors.text} />
            <View style={s.bellDot} />
          </TouchableOpacity>
        </View>

        {/* Coverage and streak card */}
        <View style={[s.card, s.heroCard]}>
          <View style={s.rowBetween}>
            <View style={s.row}>
              <View style={[s.dot, { backgroundColor: coverageActive ? colors.accent : colors.danger }]} />
              <Text style={s.status}>{coverageActive ? 'SHIF coverage active' : 'Coverage lapsed'}</Text>
            </View>
            <TouchableOpacity
              style={s.row}
              onPress={() => navigation.navigate('TierBenefits' as never)}
              accessibilityRole="button"
              accessibilityLabel={`${tierLabel} tier, view benefits`}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            >
              <View style={[s.dot, { backgroundColor: tierDot }]} />
              <Text style={s.tierChip}>{tierLabel} tier</Text>
              <Feather name="chevron-right" size={14} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <View style={s.gapXs}>
            <Text style={s.label}>Facility access</Text>
            <Text style={s.facility}>{facilities}</Text>
          </View>

          <View style={s.divider} />

          <View style={s.gapSm}>
            <View style={s.rowBetweenBaseline}>
              <View style={s.rowBaseline}>
                <Text style={s.streakNumber}>{streakDays}</Text>
                <Text style={s.streakLabel}>day streak</Text>
              </View>
              <Text style={s.small}>
                {afyaData?.nextTier
                  ? `${afyaData.nextTier.streakNeeded} days to ${afyaData.nextTier.label}`
                  : 'Top tier unlocked'}
              </Text>
            </View>

            <View style={s.track}>
              <View style={[s.fill, { width: `${streakProgressPercent}%` }]} />
            </View>

            <View style={s.rowBetween}>
              <Text style={s.milestone}>Silver · 30</Text>
              <Text style={s.milestone}>Gold · 90</Text>
              <Text style={s.milestone}>Platinum · 180</Text>
            </View>
          </View>

          <View style={s.gapSmPlus}>
            <TouchableOpacity
              style={s.primaryBtn}
              onPress={() => navigation.navigate('Contribute' as never)}
              accessibilityRole="button"
            >
              <Text style={s.primaryBtnText}>Contribute KES 30</Text>
            </TouchableOpacity>
            <View style={s.btnRow}>
              <TouchableOpacity
                style={s.secondaryBtn}
                onPress={() => navigation.navigate('Sambaza' as never)}
                accessibilityRole="button"
              >
                <Text style={s.secondaryBtnText}>Sambaza</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.secondaryBtn}
                onPress={() => navigation.navigate('TierBenefits' as never)}
                accessibilityRole="button"
              >
                <Text style={s.secondaryBtnText}>View packages</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={[s.card, s.statsCard]}>
          {stats.map((row, i) => (
            <View key={row.label} style={[s.statRow, i > 0 && s.statRowBorder]}>
              <Text style={s.statLabel}>{row.label}</Text>
              <Text style={s.statValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* Auto-deduct */}
        <TouchableOpacity
          style={[s.card, s.autoCard]}
          onPress={() => navigation.navigate('AutoDeduct' as never)}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <View style={s.iconBox}>
            <Feather name="zap" size={20} color={colors.accent} />
          </View>
          <View style={s.flex1}>
            <Text style={s.autoTitle}>M-PESA Auto-Deduct</Text>
            <Text style={s.autoBody}>
              Fixed KES 30/day SHIF contribution on your first merchant transaction above KES 100.
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.muted} />
        </TouchableOpacity>

        {/* Tier benefits preview */}
        {afyaData?.perks && (
          <View style={[s.card, s.perksCard]}>
            <View style={s.rowBetween}>
              <View style={s.row}>
                <View style={[s.dot, { backgroundColor: tierDot }]} />
                <Text style={s.perksHeader}>{tierLabel} preventive benefits</Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('TierBenefits' as never)}
                accessibilityRole="button"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 0 }}
              >
                <Text style={s.link}>See all</Text>
              </TouchableOpacity>
            </View>
            {afyaData.perks.slice(0, 3).map((perk, idx) => (
              <View key={idx} style={s.perkRow}>
                <Feather name="check" size={16} color={colors.accent} />
                <Text style={s.perkText}>{perk}</Text>
              </View>
            ))}
          </View>
        )}

        {/* USSD */}
        <View style={[s.card, s.ussdCard]}>
          <View style={s.ussdIcon}>
            <Feather name="phone" size={16} color={colors.muted} />
          </View>
          <View>
            <Text style={s.ussdTitle}>No internet? No problem.</Text>
            <Text style={s.ussdBody}>Dial *384# for USSD access</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ground },
  content: { padding: 20, paddingBottom: 48, gap: 16 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 4, paddingBottom: 8 },
  greeting: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted, marginBottom: 4 },
  title: { fontFamily: fonts.bold, fontSize: 28, color: colors.text, letterSpacing: -0.5 },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  bellDot: { position: 'absolute', top: 10, right: 11, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },

  // Cards
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.card,
    ...shadows.card,
  },
  heroCard: { padding: 22, gap: 22 },
  statsCard: { paddingHorizontal: 22, paddingVertical: 4 },
  autoCard: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 20, paddingHorizontal: 22 },
  perksCard: { padding: 22, gap: 14 },
  ussdCard: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 22 },

  // Layout helpers
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowBetweenBaseline: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  rowBaseline: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  flex1: { flex: 1, gap: 4 },
  gapXs: { gap: 6 },
  gapSm: { gap: 14 },
  gapSmPlus: { gap: 10 },
  divider: { height: 1, backgroundColor: colors.line },
  dot: { width: 7, height: 7, borderRadius: 4 },

  // Hero card text
  status: { fontFamily: fonts.semibold, fontSize: 12, color: colors.text },
  tierChip: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  label: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  facility: { fontFamily: fonts.bold, fontSize: 23, color: colors.text, letterSpacing: -0.4 },
  streakNumber: { fontFamily: fonts.bold, fontSize: 42, lineHeight: 46, color: colors.text, letterSpacing: -1, ...tabularNums },
  streakLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  small: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.accent },
  milestone: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted },

  // Buttons
  primaryBtn: { height: 50, borderRadius: radii.button, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { fontFamily: fonts.bold, fontSize: 15, color: colors.accentInk },
  btnRow: { flexDirection: 'row', gap: 10 },
  secondaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },

  // Stats
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15 },
  statRowBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  statLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  statValue: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text, ...tabularNums },

  // Auto-deduct
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.icon,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  autoBody: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 19, color: colors.muted },

  // Benefits
  perksHeader: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted, letterSpacing: 0.4 },
  link: { fontFamily: fonts.semibold, fontSize: 13, color: colors.accent },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  perkText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.text },

  // USSD
  ussdIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ussdTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  ussdBody: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.muted, marginTop: 2 },
});