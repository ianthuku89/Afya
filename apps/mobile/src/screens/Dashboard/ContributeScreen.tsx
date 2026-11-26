import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { startStkPush, waitForPayment, errorMessage } from '../../api/mpesa';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import MerchantPaymentModal from './MerchantPaymentModal';
import { colors, fonts, radii, shadows, tabularNums, tierColors } from '../../theme';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Slider = require('@react-native-community/slider').default as React.ComponentType<{
  style?: any; minimumValue?: number; maximumValue?: number; step?: number;
  value?: number; onValueChange?: (v: number) => void;
  minimumTrackTintColor?: string; maximumTrackTintColor?: string; thumbTintColor?: string;
}>;

const ACCENT_SOFT = colors.accent + '14'; // accent at about 8% opacity
const QUICK_AMOUNTS = [30, 50, 100, 150, 300];

export default function ContributeScreen() {
  const [amount, setAmount] = useState(30);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [merchantModalVisible, setMerchantModalVisible] = useState(false);
  const [successData, setSuccessData] = useState<{ tx: string; newStreak: number; newTier: string } | null>(null);
  const navigation = useNavigation<any>();

  // Real Daraja flow. Success is only shown after the callback confirms payment.
  const handleMpesaPush = async () => {
    if (amount > 100) {
      setMerchantModalVisible(true);
      return;
    }

    setLoading(true);
    setStatusMessage('Sending M-PESA prompt...');
    try {
      // The server fills in the user's phone and National ID (account number) from their session
      const checkoutRequestId = await startStkPush({ amount, description: 'SHIF' });

      setStatusMessage(`Enter your M-PESA PIN for KES ${amount} on your phone...`);
      const result = await waitForPayment(checkoutRequestId);

      if (result.status === 'SUCCESS') {
        // Streak/tier are updated server-side in the callback and returned by the status endpoint
        setSuccessData({
          tx: result.receipt || checkoutRequestId,
          newStreak: result.streak ?? 1,
          newTier: result.tier ?? 'Bronze',
        });
      } else {
        Alert.alert('Payment not completed', result.message || 'Please try again.');
      }
    } catch (e: any) {
      Alert.alert('Payment Failed', errorMessage(e, 'Failed to initiate M-PESA push'));
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  const handleMerchantSuccess = (details: { merchantAmount: number; shifDeducted: boolean }) => {
    setMerchantModalVisible(false);
    setSuccessData({
      tx: `C2B-${Date.now()}`,
      newStreak: 1,
      newTier: 'Bronze',
    });
  };

  // ---------- Success view ----------
  if (successData) {
    const tierDot = tierColors[successData.newTier.toUpperCase()] ?? tierColors.BRONZE;
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.successWrap}>
          <View style={s.successRing}>
            <Feather name="check" size={36} color={colors.accent} />
          </View>
          <Text style={s.successTitle}>SHIF Cover Boosted</Text>
          <Text style={s.successBody}>
            KES {amount} routed to your Social Health Authority (SHA) account via Paybill 200222
          </Text>
          <Text style={s.txText}>TX: {successData.tx}</Text>

          <View style={[s.card, s.streakCard]}>
            <View style={s.rowBetween}>
              <View style={s.row}>
                <Feather name="trending-up" size={16} color={colors.accent} />
                <Text style={s.streakHeading}>Contribution Streak</Text>
              </View>
              <View style={s.row}>
                <View style={[s.dot, { backgroundColor: tierDot }]} />
                <Text style={s.tierText}>{successData.newTier} Tier</Text>
              </View>
            </View>
            <View style={s.streakPanel}>
              <Text style={s.streakNumber}>+{successData.newStreak}</Text>
              <View style={s.flex1}>
                <Text style={s.streakPanelTitle}>Day Streak Counted</Text>
                <Text style={s.small}>Contribute daily to unlock Silver, Gold & Platinum packages</Text>
              </View>
            </View>
          </View>

          <View style={s.successActions}>
            <TouchableOpacity
              style={s.primaryBtn}
              onPress={() => { setSuccessData(null); navigation.navigate('Home' as never); }}
              accessibilityRole="button"
            >
              <Text style={s.primaryBtnText}>Return Home</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.secondaryBtn}
              onPress={() => { setSuccessData(null); navigation.navigate('TierBenefits' as never); }}
              accessibilityRole="button"
            >
              <Text style={s.secondaryBtnText}>View Preventive Packages</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ---------- Main view ----------
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={s.header}>
          <Text style={s.title}>Daily SHIF Contribution</Text>
          <Text style={s.subtitle}>
            Fixed KES 30/day builds your streak and unlocks preventive health packages
          </Text>
        </View>

        {/* Amount card */}
        <View style={[s.card, s.amountCard]}>
          <Text style={s.eyebrow}>AMOUNT TO CONTRIBUTE</Text>
          <Text style={s.amountText}>KES {amount}</Text>
          <Text style={s.centerSmall}>
            Direct to SHA Paybill: <Text style={s.strong}>200222</Text>
          </Text>
          <Text style={s.amountNote}>
            {amount === 30
              ? 'Recommended daily contribution'
              : amount > 100
              ? 'Lipa na M-PESA C2B qualifying transaction'
              : 'SHIF micro-contribution'}
          </Text>

          <Slider
            style={s.slider}
            minimumValue={30}
            maximumValue={500}
            step={10}
            value={amount}
            onValueChange={setAmount}
            minimumTrackTintColor={colors.accent}
            maximumTrackTintColor={colors.line}
            thumbTintColor={colors.accent}
          />
          <View style={s.rowBetween}>
            <Text style={s.tiny}>KES 30 (Daily)</Text>
            <Text style={s.tiny}>KES 500</Text>
          </View>
        </View>

        {/* Quick amounts */}
        <View style={s.pillRow}>
          {QUICK_AMOUNTS.map((v) => {
            const selected = amount === v;
            return (
              <TouchableOpacity
                key={v}
                onPress={() => setAmount(v)}
                disabled={loading}
                style={[s.pill, selected && s.pillSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`KES ${v}`}
              >
                <Text style={[s.pillText, selected && s.pillTextSelected]}>{v}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Streak milestones */}
        <TouchableOpacity
          style={[s.card, s.milestoneCard]}
          onPress={() => navigation.navigate('TierBenefits' as never)}
          accessibilityRole="button"
        >
          <View style={s.rowBetween}>
            <View style={s.row}>
              <Feather name="target" size={16} color={colors.accent} />
              <Text style={s.cardTitle}>Streak Milestones</Text>
            </View>
            <View style={s.row}>
              <Text style={s.link}>View All Packages</Text>
              <Feather name="chevron-right" size={14} color={colors.accent} />
            </View>
          </View>
          <Text style={s.small}>
            30 Days = Silver · 90 Days = Gold · 180 Days = Platinum preventive health benefits.
          </Text>
        </TouchableOpacity>

        {/* C2B notice for > 100 */}
        {amount > 100 && (
          <View style={s.notice}>
            <View style={s.row}>
              <Feather name="info" size={16} color={colors.accent} />
              <Text style={s.noticeTitle}>C2B Merchant Mode (Over KES 100)</Text>
            </View>
            <Text style={s.small}>
              Pressing contribute will test the C2B Lipa na M-PESA prompt flow: Prompt 1 for KES {amount} (Merchant) +
              Prompt 2 for KES 30 (SHA Paybill 200222).
            </Text>
          </View>
        )}

        {/* Live status while waiting for the PIN */}
        {loading && !!statusMessage && <Text style={s.statusMessage}>{statusMessage}</Text>}

        <TouchableOpacity
          style={[s.primaryBtn, s.primaryBtnRow, loading && s.btnDisabled]}
          onPress={handleMpesaPush}
          disabled={loading}
          accessibilityRole="button"
        >
          {loading ? (
            <ActivityIndicator color={colors.accentInk} />
          ) : (
            <>
              <Feather name="smartphone" size={20} color={colors.accentInk} />
              <Text style={s.primaryBtnText}>
                {amount > 100 ? 'Test C2B Lipa na M-PESA' : `Contribute KES ${amount} via M-PESA`}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* C2B Merchant Payment Modal */}
      <MerchantPaymentModal
        visible={merchantModalVisible}
        onClose={() => setMerchantModalVisible(false)}
        merchantAmount={amount}
        merchantName="Test Merchant"
        merchantPaybill="174379"
        merchantAccount="TEST"
        onSuccess={handleMerchantSuccess}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ground },
  content: { padding: 20, paddingBottom: 48, gap: 16 },

  // Layout helpers
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flex1: { flex: 1, gap: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },

  // Header
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
  header: { gap: 6, paddingHorizontal: 4, paddingBottom: 4 },
  title: { fontFamily: fonts.bold, fontSize: 28, color: colors.text, letterSpacing: -0.5 },
  subtitle: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, color: colors.muted },

  // Cards
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.card,
    ...shadows.card,
  },
  amountCard: { padding: 22, alignItems: 'stretch' },
  milestoneCard: { padding: 20, gap: 8 },
  cardTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  link: { fontFamily: fonts.semibold, fontSize: 13, color: colors.accent },

  // Text
  eyebrow: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.9, color: colors.muted, textAlign: 'center' },
  small: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 19, color: colors.muted },
  centerSmall: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.muted, textAlign: 'center' },
  tiny: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted },
  strong: { fontFamily: fonts.bold, color: colors.text, ...tabularNums },

  // Amount
  amountText: {
    fontFamily: fonts.bold,
    fontSize: 48,
    lineHeight: 56,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -1.2,
    marginVertical: 8,
    ...tabularNums,
  },
  amountNote: {
    fontFamily: fonts.semibold,
    fontSize: 12.5,
    color: colors.accent,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  slider: { width: '100%', height: 40 },

  // Quick amount pills
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  pillText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text, ...tabularNums },
  pillTextSelected: { color: colors.accentInk },

  // C2B notice
  notice: {
    gap: 8,
    padding: 18,
    borderRadius: radii.card,
    backgroundColor: ACCENT_SOFT,
    borderWidth: 1,
    borderColor: colors.accent + '33',
  },
  noticeTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.accent },
  statusMessage: { fontFamily: fonts.medium, fontSize: 14, color: colors.accent, textAlign: 'center' },

  // Buttons
  primaryBtn: {
    height: 52,
    borderRadius: radii.button,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnRow: { flexDirection: 'row', gap: 10 },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { fontFamily: fonts.bold, fontSize: 16, color: colors.accentInk },
  secondaryBtn: {
    height: 48,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },

  // Success view
  successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, gap: 12 },
  successRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: ACCENT_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successTitle: { fontFamily: fonts.bold, fontSize: 28, color: colors.text, letterSpacing: -0.5, textAlign: 'center' },
  successBody: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, color: colors.muted, textAlign: 'center', paddingHorizontal: 12 },
  txText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.accent, marginBottom: 12, ...tabularNums },
  streakCard: { width: '100%', padding: 20, gap: 14, marginBottom: 12 },
  streakHeading: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  tierText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  streakPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.ground,
  },
  streakNumber: { fontFamily: fonts.bold, fontSize: 34, color: colors.accent, letterSpacing: -0.8, ...tabularNums },
  streakPanelTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  successActions: { width: '100%', gap: 10 },
});