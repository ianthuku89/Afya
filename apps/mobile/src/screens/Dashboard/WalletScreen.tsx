import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, SafeAreaView, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl, StyleSheet,
} from 'react-native';
import { useAuthStore } from '../../store/auth';
import { client } from '../../api/client';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts, radii, shadows, tabularNums, tierColors } from '../../theme';

interface CoverageQR {
  qrString: string;
  expiresIn: number;
  patientName: string;
  coverageActive: boolean;
  tier: string;
  tierLabel: string;
  streakDays: number;
}

interface CoverageStatus {
  coverageActive: boolean;
  coverageStatus: string;
  tier: string;
  streakDays: number;
  tokenBalance: number;
  matchEarned: number;
  coverTypes: string[];
  coveredServices: string[];
  daysUntilLapse: number;
  recentVisits: Array<{
    facilityName: string;
    facilityCode: string;
    coverageVerified: boolean;
    tier: string;
    date: string;
  }>;
}

const TIER_FACILITIES: Record<string, string> = {
  BRONZE: 'Level 1 & 2 Facilities',
  SILVER: 'Level 2 & 3 Facilities',
  GOLD: 'Level 2 & 3 Facilities',
  PLATINUM: 'Level 4 & 5 Hospitals',
};

export default function CoverageScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation<any>();
  const [qrData, setQrData] = useState<CoverageQR | null>(null);
  const [coverageData, setCoverageData] = useState<CoverageStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrExpiry, setQrExpiry] = useState(0);
  const [activeTab, setActiveTab] = useState<'qr' | 'details'>('qr');

  const fetchData = useCallback(async () => {
    try {
      const [qrRes, statusRes] = await Promise.all([
        client.get('/coverage/qr'),
        client.get('/coverage/status'),
      ]);
      setQrData(qrRes.data.data);
      setCoverageData(statusRes.data.data);
      setQrExpiry(qrRes.data.data.expiresIn);
    } catch (e) {
      console.error('Failed to fetch coverage data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // QR expiry countdown
  useEffect(() => {
    if (qrExpiry <= 0) return;
    const timer = setInterval(() => {
      setQrExpiry(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [qrExpiry]);

  const tier = qrData?.tier || coverageData?.tier || 'BRONZE';
  const tierDot = tierColors[tier] || tierColors.BRONZE;
  const facilities = TIER_FACILITIES[tier] || TIER_FACILITIES.BRONZE;
  const streakDays = qrData?.streakDays ?? coverageData?.streakDays ?? 0;
  const isActive = qrData?.coverageActive ?? coverageData?.coverageActive ?? false;
  const statusColor = isActive ? colors.accent : colors.danger;
  const expiryColor = qrExpiry > 60 ? colors.accent : colors.danger;

  if (loading) {
    return (
      <SafeAreaView style={[s.screen, s.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[s.small, { marginTop: 16 }]}>Loading coverage...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchData}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerText}>
            <Text style={s.greeting} numberOfLines={1}>Hello, {user?.email || 'Citizen'}</Text>
            <Text style={s.title}>My Coverage</Text>
          </View>
          <TouchableOpacity
            style={s.tierPill}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            onPress={() => navigation.navigate('TierBenefits' as never)}
            accessibilityRole="button"
            accessibilityLabel={`${qrData?.tierLabel || 'Bronze'} tier, view tier benefits`}
          >
            <View style={[s.dot, { backgroundColor: tierDot }]} />
            <Text style={s.tierPillText}>{qrData?.tierLabel || 'Bronze'} Tier</Text>
            <Feather name="chevron-right" size={14} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* Tab Switcher */}
        <View style={s.tabs}>
          {([
            { key: 'qr', label: 'QR Coverage Proof' },
            { key: 'details', label: 'Coverage Details' },
          ] as const).map((t) => {
            const on = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[s.tab, on && s.tabActive]}
                onPress={() => setActiveTab(t.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
              >
                <Text style={[s.tabText, on && s.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeTab === 'qr' ? (
          <>
            {/* QR Code Card */}
            <View style={[s.card, { alignItems: 'center' }]}>
              {/* Coverage Status */}
              <View style={[s.statusRow, { marginBottom: 20 }]}>
                <View style={[s.dot, { backgroundColor: statusColor }]} />
                <Text style={[s.statusText, { color: statusColor }]}>
                  {isActive ? 'SHIF Coverage Active' : 'Coverage Lapsed'}
                </Text>
              </View>

              {/* QR Code Area */}
              <View style={s.qrBox}>
                <Feather name="maximize" size={64} color={colors.text} />
                <Text style={[s.small, tabularNums, { marginTop: 8, textAlign: 'center' }]}>
                  {qrData?.qrString?.substring(0, 20) || 'QR'}...
                </Text>
              </View>

              <Text style={s.patient}>{qrData?.patientName || user?.name || 'SHA Member'}</Text>
              <View style={[s.statusRow, { marginTop: 6 }]}>
                <View style={[s.dot, { backgroundColor: tierDot }]} />
                <Text style={s.facilities}>{facilities}</Text>
              </View>
              <View style={[s.statusRow, { marginTop: 8, marginBottom: 16 }]}>
                <Feather name="zap" size={14} color={colors.accent} />
                <Text style={[s.streakText, tabularNums]}>{streakDays}-Day Contribution Streak</Text>
              </View>

              {/* QR Expiry */}
              <View style={[s.statusRow, { marginBottom: 20 }]}>
                <Feather name="clock" size={14} color={expiryColor} />
                <Text style={[s.expiryText, tabularNums, { color: expiryColor }]}>
                  {qrExpiry > 0
                    ? `Expires in ${Math.floor(qrExpiry / 60)}:${String(qrExpiry % 60).padStart(2, '0')}`
                    : 'QR expired — refresh to generate new one'
                  }
                </Text>
              </View>

              {/* Refresh QR button */}
              <TouchableOpacity
                style={[s.primaryButton, { alignSelf: 'stretch' }]}
                onPress={fetchData}
                accessibilityRole="button"
              >
                <Feather name="refresh-cw" size={16} color={colors.accentInk} />
                <Text style={s.primaryText}>Generate New QR</Text>
              </TouchableOpacity>
            </View>

            {/* Usage Instructions */}
            <View style={s.card}>
              <View style={s.cardTitleRow}>
                <View style={s.iconBox}>
                  <Feather name="smartphone" size={20} color={colors.accent} />
                </View>
                <Text style={[s.sectionTitle, s.flex]}>How to use at hospital</Text>
              </View>
              <Text style={[s.body, { color: colors.muted }]}>
                Present this QR code at any SHA-accredited facility. The facility scans it to verify your active SHIF membership and preventive tier package. Curative care is 100% free under the UHC Walk-In Walk-Out policy.
              </Text>
            </View>
          </>
        ) : (
          <>
            {/* Coverage Details Tab */}
            <View style={s.card}>
              <Text style={[s.eyebrow, { marginBottom: 6 }]}>SHIF MEMBERSHIP DETAILS</Text>

              <View style={s.listRow}>
                <Text style={s.listLabel}>Status</Text>
                <View style={s.statusRow}>
                  <View style={[s.dot, { backgroundColor: statusColor }]} />
                  <Text style={[s.listValue, { color: statusColor }]}>{isActive ? 'Active' : 'Lapsed'}</Text>
                </View>
              </View>
              <View style={[s.listRow, s.rowDivider]}>
                <Text style={s.listLabel}>Preventive Tier</Text>
                <View style={s.statusRow}>
                  <View style={[s.dot, { backgroundColor: tierDot }]} />
                  <Text style={s.listValue}>{qrData?.tierLabel || 'Bronze'}</Text>
                </View>
              </View>
              <View style={[s.listRow, s.rowDivider]}>
                <Text style={s.listLabel}>Facility Level</Text>
                <Text style={s.listValue}>{facilities}</Text>
              </View>
              <View style={[s.listRow, s.rowDivider]}>
                <Text style={s.listLabel}>Contribution Streak</Text>
                <Text style={[s.listValue, tabularNums]}>{streakDays} days</Text>
              </View>
              <View style={[s.listRow, s.rowDivider]}>
                <Text style={s.listLabel}>SHA Paybill</Text>
                <Text style={[s.listValue, tabularNums]}>200222</Text>
              </View>
              <View style={[s.listRow, s.rowDivider]}>
                <Text style={s.listLabel}>Auto-Deduct Rate</Text>
                <Text style={[s.listValue, tabularNums, s.listValueWrap]}>KES 30 / day (on tx above KES 100)</Text>
              </View>
            </View>

            {/* Covered Services */}
            <View style={s.card}>
              <View style={s.sectionHeader}>
                <Text style={[s.eyebrow, s.flex]}>TIER-UNLOCKED SERVICES</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('TierBenefits' as never)}
                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                  style={s.inlineLink}
                  accessibilityRole="link"
                >
                  <Text style={s.linkText}>View Packages</Text>
                  <Feather name="arrow-right" size={14} color={colors.accent} />
                </TouchableOpacity>
              </View>
              {coverageData?.coveredServices?.map((service, idx) => (
                <View key={idx} style={[s.serviceRow, idx > 0 && s.rowDivider]}>
                  <Feather name="check" size={14} color={colors.accent} style={{ marginRight: 10 }} />
                  <Text style={[s.body, s.flex]}>{service}</Text>
                </View>
              )) || (
                <Text style={[s.body, { color: colors.muted }]}>Contribute daily to unlock preventive packages</Text>
              )}
            </View>

            {/* Recent Facility Visits */}
            {coverageData?.recentVisits && coverageData.recentVisits.length > 0 && (
              <View style={s.card}>
                <Text style={[s.eyebrow, { marginBottom: 6 }]}>RECENT FACILITY VISITS</Text>
                {coverageData.recentVisits.map((visit, idx) => (
                  <View key={idx} style={[s.visitRow, idx > 0 && s.rowDivider]}>
                    <View style={[s.flex, { marginRight: 12 }]}>
                      <Text style={s.visitName}>{visit.facilityName}</Text>
                      <Text style={[s.small, tabularNums, { marginTop: 2 }]}>
                        {new Date(visit.date).toLocaleDateString('en-KE', { dateStyle: 'medium' })}
                      </Text>
                    </View>
                    <View style={s.statusRow}>
                      <View style={[s.dot, { backgroundColor: visit.coverageVerified ? colors.accent : colors.danger }]} />
                      <Text style={[s.visitStatus, { color: visit.coverageVerified ? colors.accent : colors.danger }]}>
                        {visit.coverageVerified ? 'Verified' : 'Not verified'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.ground },
  centered: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, paddingBottom: 60, gap: 16 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerText: { flex: 1, marginRight: 12 },
  greeting: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted, marginBottom: 2 },
  title: { fontFamily: fonts.bold, fontSize: 28, letterSpacing: -0.5, color: colors.text },
  tierPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12,
    borderRadius: radii.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface,
  },
  tierPillText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },

  // Tabs
  tabs: {
    flexDirection: 'row', gap: 4, padding: 4, borderRadius: radii.button,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface,
  },
  tab: {
    flex: 1, minHeight: 44, borderRadius: radii.icon, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 8, borderWidth: 1, borderColor: 'transparent',
  },
  tabActive: { backgroundColor: colors.accent + '14', borderColor: colors.accent + '33' },
  tabText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted, textAlign: 'center' },
  tabTextActive: { fontFamily: fonts.bold, color: colors.accent },

  // Cards
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
    borderRadius: radii.card, padding: 22, ...shadows.card,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },

  // Typography
  sectionTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  eyebrow: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 0.6, color: colors.text },
  body: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, color: colors.text },
  small: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, lineHeight: 18 },

  // Icon box
  iconBox: {
    width: 44, height: 44, borderRadius: radii.icon, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },

  // QR card
  qrBox: {
    width: 192, height: 192, borderRadius: radii.card, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  patient: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, textAlign: 'center' },
  facilities: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  streakText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  expiryText: { fontFamily: fonts.medium, fontSize: 13, flexShrink: 1 },

  // Status
  dot: { width: 7, height: 7, borderRadius: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusText: { fontFamily: fonts.bold, fontSize: 14 },

  // Buttons and links
  primaryButton: {
    height: 52, borderRadius: radii.button, backgroundColor: colors.accent, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  primaryText: { fontFamily: fonts.bold, fontSize: 15, color: colors.accentInk },
  inlineLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkText: { fontFamily: fonts.bold, fontSize: 13, color: colors.accent },

  // List rows
  listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  listLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  listValue: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  listValueWrap: { flexShrink: 1, marginLeft: 16, textAlign: 'right' },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 },
  serviceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  visitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  visitName: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  visitStatus: { fontFamily: fonts.semibold, fontSize: 13 },
});