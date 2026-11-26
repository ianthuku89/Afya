import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { client } from '../../api/client';
import { colors, fonts, radii, shadows, tabularNums } from '../../theme';

const ACCENT_SOFT = colors.accent + '14'; // accent at about 8% opacity

export default function AutoDeductScreen() {
  const navigation = useNavigation<any>();
  const [optIn, setOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<any>(null);

  const fetchStatus = async () => {
    try {
      const res = await client.get('/loyalty/auto-deduct/status');
      setStatus(res.data.data);
      setOptIn(Boolean(res.data.data.autoDeductOptIn));
    } catch (error: any) {
      console.warn('Failed to fetch auto-deduct status', error?.response?.data || error?.message);
    }
  };

  // Refresh whenever the screen gains focus (e.g. after paying in the modal)
  useFocusEffect(
    useCallback(() => {
      fetchStatus();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStatus();
    setRefreshing(false);
  };

  const submitOptIn = async (val: boolean) => {
    setLoading(true);
    try {
      await client.post('/loyalty/auto-deduct/opt-in', { optIn: val });
      setOptIn(val);
      await fetchStatus();
    } catch (e: any) {
      Alert.alert('Error', 'Could not update your preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOptInToggle = (val: boolean) => {
    if (!val) {
      Alert.alert(
        'Turn off Auto-Deduct?',
        'We will stop adding the KES 30 SHIF contribution to your merchant payments. You can turn it back on anytime.',
        [
          { text: 'Keep On', style: 'cancel' },
          { text: 'Turn Off', style: 'destructive', onPress: () => submitOptIn(false) },
        ]
      );
      return;
    }

    Alert.alert(
      'KDPA Data & Payment Consent',
      'By consenting, you authorize HealthToken to analyze your Lipa na M-PESA merchant payments. Your first transaction over KES 100 each day triggers a fixed KES 30 SHIF contribution routed directly to Paybill 200222 (Account: National ID). Only amounts are used; data is encrypted per KDPA 2019.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'I Agree', onPress: () => submitOptIn(true) },
      ]
    );
  };

  const isDeductedToday = status?.isDeductedToday ?? false;
  const recentLogs = status?.recentLogs ?? [];
  const shaPaybill = status?.shaPaybill || '200222';
  const shaAccount = status?.shaAccountNumber || 'National ID';

  const steps: { title: string; body: React.ReactNode }[] = [
    {
      title: 'Spend Above KES 100 at Any Merchant',
      body: 'Buy groceries, fuel, or medicine using standard Lipa na M-PESA C2B.',
    },
    {
      title: 'Single Combined Prompt',
      body: (
        <>
          You receive <Text style={s.strong}>one single M-PESA prompt</Text> for the combined total (merchant amount + KES
          30 SHIF contribution). Enter your PIN once to complete both payments.
        </>
      ),
    },
    {
      title: 'Instant SHA Credit & Streak Growth',
      body: 'KES 30 is credited directly to your SHIF account, growing your streak toward Silver, Gold, or Platinum benefits.',
    },
  ];

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={s.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Feather name="arrow-left" size={20} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={s.headerTitle}>Smart Auto-Deduct</Text>
            <Text style={s.headerSub}>M-PESA C2B & SHIF Bridge</Text>
          </View>
        </View>
        <Switch
          value={optIn}
          onValueChange={handleOptInToggle}
          trackColor={{ false: colors.line, true: colors.accent }}
          ios_backgroundColor={colors.line}
          thumbColor="#FFFFFF"
          disabled={loading}
        />
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />
        }
      >
        {/* Hero */}
        <View style={[s.card, s.hero]}>
          <View style={s.iconBox}>
            <Feather name="zap" size={22} color={colors.accent} />
          </View>
          <View style={s.gapXs}>
            <Text style={s.heroTitle}>Fixed Daily SHIF Cover</Text>
            <Text style={s.body}>
              Whenever you pay a merchant via Lipa na M-PESA for any transaction above KES 100, a fixed daily deduction of
              KES 30 is automatically routed to your Social Health Authority (SHA) account.
            </Text>
          </View>

          {/* Status panel */}
          <View style={s.panel}>
            <View style={s.panelLeft}>
              <Text style={s.eyebrow}>TODAY'S SHIF STATUS</Text>
              <View style={s.row}>
                {isDeductedToday ? (
                  <Feather name="check-circle" size={16} color={colors.accent} />
                ) : (
                  <View style={s.pendingDot} />
                )}
                <Text style={s.statusText}>{isDeductedToday ? 'KES 30 Deducted' : 'Pending First Purchase'}</Text>
              </View>
              <Text style={s.small}>
                {isDeductedToday
                  ? 'Daily cover satisfied for today'
                  : optIn
                  ? 'Triggers on merchant tx > KES 100'
                  : 'Turn on Auto-Deduct to start'}
              </Text>
            </View>
            <View style={s.panelRight}>
              <Text style={s.eyebrow}>DAILY CAP</Text>
              <Text style={s.capValue}>KES 30</Text>
              <Text style={s.tiny}>1 deduction / day</Text>
            </View>
          </View>

          {/* SHA routing */}
          <View style={s.routing}>
            <View style={s.row}>
              <Feather name="shield" size={16} color={colors.accent} />
              <Text style={s.routingTitle}>Direct SHA Routing</Text>
            </View>
            <Text style={s.small}>
              Paybill: <Text style={s.mono}>{shaPaybill}</Text> · Account: <Text style={s.mono}>{shaAccount}</Text>
            </Text>
          </View>
        </View>

        {/* How it works */}
        <Text style={s.sectionTitle}>How Auto-Deduct Works</Text>
        <View style={[s.card, s.stepsCard]}>
          {steps.map((step, i) => (
            <View key={step.title} style={[s.step, i > 0 && s.stepBorder]}>
              <View style={s.stepNum}>
                <Text style={s.stepNumText}>{i + 1}</Text>
              </View>
              <View style={s.flex1}>
                <Text style={s.stepTitle}>{step.title}</Text>
                <Text style={s.small}>{step.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Once per day notice */}
        <View style={[s.card, s.notice]}>
          <Feather name="check-circle" size={20} color={colors.accent} style={s.noticeIcon} />
          <View style={s.flex1}>
            <Text style={s.noticeTitle}>Once Per Day Limit</Text>
            <Text style={s.small}>
              HealthToken never deducts more than KES 30 per calendar day, regardless of how many purchases you make.
            </Text>
          </View>
        </View>

        {/* Pay via Paybill */}
        <TouchableOpacity
          style={s.primaryCta}
          onPress={() => navigation.navigate('PayMerchant' as never)}
          accessibilityRole="button"
        >
          <View style={s.row}>
            <Feather name="send" size={20} color={colors.accentInk} />
            <View style={s.ctaText}>
              <Text style={s.primaryCtaTitle}>Pay via Paybill</Text>
              <Text style={s.primaryCtaSub}>Enter paybill, account and amount</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color={colors.accentInk} />
        </TouchableOpacity>

        {/* Tier benefits CTA */}
        <TouchableOpacity
          style={[s.card, s.secondaryCta]}
          onPress={() => navigation.navigate('TierBenefits' as never)}
          accessibilityRole="button"
        >
          <View style={s.row}>
            <Feather name="award" size={20} color={colors.accent} />
            <View style={s.ctaText}>
              <Text style={s.ctaTitle}>View Preventive Packages</Text>
              <Text style={s.small}>Silver (30d) · Gold (90d) · Platinum (180d)</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color={colors.muted} />
        </TouchableOpacity>

        {/* Recent auto-deductions */}
        {optIn && (
          <View style={s.gapSm}>
            <Text style={s.sectionTitle}>Recent Contributions</Text>
            {recentLogs.length > 0 ? (
              recentLogs.map((log: any) => (
                <View key={log.id} style={[s.card, s.logRow]}>
                  <View style={s.flex1}>
                    <Text style={s.logTitle}>{log.tx}</Text>
                    <Text style={s.tiny}>
                      {new Date(log.date).toLocaleString()} · Merchant: KES {log.originalAmt}
                    </Text>
                  </View>
                  <View style={s.badge}>
                    <Text style={s.badgeText}>+ KES {log.deducted} SHIF</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={s.small}>
                No contributions recorded yet. Your first purchase over KES 100 will appear here.
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ground },
  content: { padding: 20, paddingBottom: 48, gap: 16 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  backBtn: {
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
  headerTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.text, letterSpacing: -0.3 },
  headerSub: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginTop: 2 },

  // Cards
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.card,
    ...shadows.card,
  },
  hero: { padding: 22, gap: 18 },
  stepsCard: { paddingHorizontal: 22, paddingVertical: 4 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 20 },
  secondaryCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  logRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 16 },

  // Layout helpers
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex1: { flex: 1, gap: 4 },
  gapXs: { gap: 8 },
  gapSm: { gap: 12 },

  // Hero
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.icon,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontFamily: fonts.bold, fontSize: 23, color: colors.text, letterSpacing: -0.4 },
  body: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, color: colors.muted },
  small: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 19, color: colors.muted },
  tiny: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted },
  strong: { fontFamily: fonts.bold, color: colors.text },
  mono: { fontFamily: fonts.bold, color: colors.text, ...tabularNums },

  // Status panel
  panel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.ground,
  },
  panelLeft: { flex: 1, gap: 6 },
  panelRight: { alignItems: 'flex-end', justifyContent: 'center', gap: 2 },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 0.8, color: colors.muted },
  statusText: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  pendingDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.muted },
  capValue: { fontFamily: fonts.bold, fontSize: 20, color: colors.accent, ...tabularNums },

  // SHA routing
  routing: {
    gap: 6,
    padding: 16,
    borderRadius: 16,
    backgroundColor: ACCENT_SOFT,
    borderWidth: 1,
    borderColor: colors.accent + '33',
  },
  routingTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.accent },

  // Steps
  sectionTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, letterSpacing: -0.2, paddingHorizontal: 4 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 16 },
  stepBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: ACCENT_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontFamily: fonts.bold, fontSize: 14, color: colors.accent },
  stepTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },

  // Notice
  noticeIcon: { marginTop: 1 },
  noticeTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },

  // CTAs
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: radii.card,
    backgroundColor: colors.accent,
  },
  primaryCtaTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.accentInk },
  primaryCtaSub: { fontFamily: fonts.medium, fontSize: 12.5, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  ctaText: { gap: 2 },
  ctaTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },

  // Logs
  logTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: ACCENT_SOFT },
  badgeText: { fontFamily: fonts.bold, fontSize: 12, color: colors.accent, ...tabularNums },
});