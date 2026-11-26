import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { client } from '../../api/client';
import MerchantPaymentModal from './MerchantPaymentModal';
import { colors, fonts, radii, shadows, tabularNums } from '../../theme';

// Register this screen in your navigator as "PayMerchant".

const PLACEHOLDER = '#8A9099';
const ACCENT_SOFT = colors.accent + '14'; // accent at about 8% opacity
const ACCENT_LINE = colors.accent + '33'; // accent at about 20% opacity

const PAYBILL_RE = /^\d{5,7}$/;
const ACCOUNT_MAX = 13; // Daraja B2B AccountReference limit; keep in sync with the server schema

type QuoteReason = 'APPLIES' | 'BELOW_THRESHOLD' | 'NOT_OPTED_IN' | 'ALREADY_PAID_TODAY' | 'DECLINED';
type Quote = {
  merchantAmountKES: number;
  shifAmountKES: number;
  totalKES: number;
  reason: QuoteReason;
};

const NO_SHIF_REASON: Record<Exclude<QuoteReason, 'APPLIES'>, string> = {
  BELOW_THRESHOLD: 'Payments of KES 100 or below don’t include a SHIF contribution.',
  NOT_OPTED_IN: 'No SHIF contribution is added because Auto-Deduct is turned off.',
  ALREADY_PAID_TODAY: 'No SHIF contribution is added because today’s contribution is already done.',
  DECLINED: 'No SHIF contribution is added to this payment.',
};

export default function PayMerchantScreen() {
  const navigation = useNavigation<any>();
  const [paybill, setPaybill] = useState('');
  const [account, setAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const amt = Number(amount);
  const errors = {
    paybill: paybill.length > 0 && !PAYBILL_RE.test(paybill) ? 'Paybill must be 5 to 7 digits' : '',
    account: account.length > ACCOUNT_MAX ? `Account can be at most ${ACCOUNT_MAX} characters` : '',
    amount:
      amount.length > 0 && (!Number.isInteger(amt) || amt < 1 || amt > 150000)
        ? 'Enter a whole amount between 1 and 150,000'
        : '',
  };
  const valid =
    PAYBILL_RE.test(paybill) &&
    account.trim().length > 0 &&
    account.length <= ACCOUNT_MAX &&
    Number.isInteger(amt) &&
    amt >= 1 &&
    amt <= 150000;

  const merchantLabel = name.trim() || `Paybill ${paybill}`;

  // Ask the SERVER what will be charged, then show the explanation popup.
  const handleReview = async () => {
    if (!valid || quoting) return;
    setQuoting(true);
    try {
      const res = await client.post('/payment/merchant/quote', { merchantAmount: amt });
      setQuote(res.data.data as Quote);
      setShowInfo(true);
    } catch (e: any) {
      Alert.alert(
        'Couldn’t load payment details',
        e.response?.data?.error || 'Check your connection and try again. You have not been charged.'
      );
    } finally {
      setQuoting(false);
    }
  };

  // "Okay" closes the info popup and opens the M-PESA confirmation sheet.
  const handleInfoOkay = () => {
    setShowInfo(false);
    setShowModal(true);
  };

  const field = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    opts: { placeholder: string; keyboard?: 'number-pad' | 'default'; error?: string; maxLength?: number }
  ) => (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(id)}
        onBlur={() => setFocused(null)}
        placeholder={opts.placeholder}
        placeholderTextColor={PLACEHOLDER}
        keyboardType={opts.keyboard ?? 'default'}
        maxLength={opts.maxLength}
        autoCapitalize="characters"
        selectionColor={colors.accent}
        style={[s.input, focused === id && s.inputFocused, !!opts.error && s.inputError]}
      />
      {!!opts.error && <Text style={s.errorText}>{opts.error}</Text>}
    </View>
  );

  const hasShif = (quote?.shifAmountKES ?? 0) > 0;
  const canReview = valid && !quoting;

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex}>
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={s.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Feather name="arrow-left" size={20} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={s.headerTitle}>Pay a Paybill</Text>
            <Text style={s.headerSub}>Lipa na M-PESA with SHIF Auto-Deduct</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View style={[s.card, s.formCard]}>
            {field('paybill', 'Paybill number', paybill, (v) => setPaybill(v.replace(/\D/g, '')), {
              placeholder: 'e.g. 888880',
              keyboard: 'number-pad',
              error: errors.paybill,
              maxLength: 7,
            })}
            {field('account', 'Account number', account, setAccount, {
              placeholder: 'e.g. 12345678',
              error: errors.account,
              maxLength: ACCOUNT_MAX + 5,
            })}
            {field('name', 'Business name (optional)', name, setName, {
              placeholder: 'e.g. Naivas',
              maxLength: 60,
            })}
            {field('amount', 'Amount (KES)', amount, (v) => setAmount(v.replace(/\D/g, '')), {
              placeholder: '0',
              keyboard: 'number-pad',
              error: errors.amount,
              maxLength: 6,
            })}
          </View>

          <View style={s.notice}>
            <Feather name="shield" size={18} color={colors.accent} style={s.noticeIcon} />
            <Text style={s.noticeText}>
              Payments over KES 100 can include a KES 30 SHIF contribution. You’ll see exactly how your money is split
              before you pay.
            </Text>
          </View>

          <TouchableOpacity
            style={[s.primaryBtn, !canReview && s.primaryBtnDisabled]}
            disabled={!canReview}
            onPress={handleReview}
            accessibilityRole="button"
          >
            {quoting ? (
              <ActivityIndicator color={colors.accentInk} />
            ) : (
              <Text style={[s.primaryBtnText, !canReview && s.primaryBtnTextDisabled]}>Review payment</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Info popup: where the money goes ─────────────────────────────── */}
      <Modal visible={showInfo} transparent animationType="fade" onRequestClose={() => setShowInfo(false)}>
        <View style={s.overlay}>
          <View style={s.popup}>
            <View style={s.popupHeader}>
              <View style={s.infoRing}>
                <Feather name="info" size={24} color={colors.accent} />
              </View>
              <Text style={s.popupTitle}>How your payment is split</Text>
            </View>

            {quote && (
              <View style={s.breakdown}>
                <View style={[s.lineRow, hasShif && s.lineRowBorder]}>
                  <View style={s.lineLeft}>
                    <Text style={s.lineTitle}>{merchantLabel}</Text>
                    <Text style={s.tiny}>Goes to the merchant</Text>
                  </View>
                  <Text style={s.lineAmount}>KES {quote.merchantAmountKES}</Text>
                </View>

                {hasShif && (
                  <View style={s.lineRow}>
                    <View style={s.lineLeft}>
                      <Text style={s.shifTitle}>Your SHIF account</Text>
                      <Text style={s.tiny}>Daily healthcare contribution</Text>
                    </View>
                    <Text style={s.shifAmount}>KES {quote.shifAmountKES}</Text>
                  </View>
                )}

                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>You will pay</Text>
                  <Text style={s.totalAmount}>KES {quote.totalKES}</Text>
                </View>
              </View>
            )}

            <Text style={s.popupBody}>
              {quote && hasShif
                ? `KES ${quote.merchantAmountKES} will be sent to ${merchantLabel} and KES ${quote.shifAmountKES} will be added to your SHIF account. Your M-PESA prompt will show the combined total of KES ${quote.totalKES}.`
                : quote && quote.reason !== 'APPLIES'
                  ? `KES ${quote.merchantAmountKES} will be sent to ${merchantLabel}. ${NO_SHIF_REASON[quote.reason]}`
                  : ''}
            </Text>

            <TouchableOpacity style={s.primaryBtn} onPress={handleInfoOkay} accessibilityRole="button">
              <Text style={s.primaryBtnText}>Okay</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowInfo(false)} accessibilityRole="button">
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <MerchantPaymentModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        merchantName={merchantLabel}
        merchantPaybill={paybill}
        merchantAccount={account.trim()}
        merchantAmount={amt}
        onSuccess={() => {
          setAmount('');
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ground },
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 48, gap: 16 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
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

  // Form
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.card,
    ...shadows.card,
  },
  formCard: { padding: 22, gap: 18 },
  field: { gap: 8 },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  input: {
    height: 52,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.ground,
    paddingHorizontal: 16,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
    ...tabularNums,
  },
  inputFocused: { borderColor: colors.accent, backgroundColor: colors.surface },
  inputError: { borderColor: colors.danger },
  errorText: { fontFamily: fonts.medium, fontSize: 12, color: colors.danger },

  // Notice
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: ACCENT_SOFT,
    borderWidth: 1,
    borderColor: ACCENT_LINE,
  },
  noticeIcon: { marginTop: 1 },
  noticeText: { flex: 1, fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 19, color: colors.muted },

  // Buttons
  primaryBtn: {
    height: 52,
    borderRadius: radii.button,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: { backgroundColor: colors.line },
  primaryBtnText: { fontFamily: fonts.bold, fontSize: 16, color: colors.accentInk },
  primaryBtnTextDisabled: { color: colors.muted },
  cancelBtn: { height: 44, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted },

  // Info popup
  overlay: { flex: 1, backgroundColor: 'rgba(20,24,31,0.5)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  popup: {
    width: '100%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 24,
    padding: 22,
    gap: 16,
  },
  popupHeader: { alignItems: 'center', gap: 12 },
  infoRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: ACCENT_LINE,
    backgroundColor: ACCENT_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, letterSpacing: -0.2, textAlign: 'center' },
  popupBody: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 19, color: colors.muted, textAlign: 'center' },

  // Breakdown
  breakdown: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.ground },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  lineRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  lineLeft: { flex: 1, paddingRight: 12, gap: 2 },
  lineTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  lineAmount: { fontFamily: fonts.bold, fontSize: 15, color: colors.text, ...tabularNums },
  shifTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.accent },
  shifAmount: { fontFamily: fonts.bold, fontSize: 15, color: colors.accent, ...tabularNums },
  tiny: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.muted },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  totalLabel: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  totalAmount: { fontFamily: fonts.bold, fontSize: 22, color: colors.text, letterSpacing: -0.4, ...tabularNums },
});