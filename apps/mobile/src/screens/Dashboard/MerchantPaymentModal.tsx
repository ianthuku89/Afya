import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { client } from '../../api/client';
import { colors, fonts, radii, tabularNums } from '../../theme';

const ACCENT_SOFT = colors.accent + '14'; // accent at about 8% opacity
const ACCENT_LINE = colors.accent + '33'; // accent at about 20% opacity
const DANGER_SOFT = colors.danger + '12';
const DANGER_LINE = colors.danger + '33';

interface MerchantPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  merchantName: string;
  merchantPaybill: string;
  merchantAccount: string;
  merchantAmount: number;
  onSuccess?: (details: { merchantAmount: number; shifDeducted: boolean }) => void;
}

type QuoteReason = 'APPLIES' | 'BELOW_THRESHOLD' | 'NOT_OPTED_IN' | 'ALREADY_PAID_TODAY' | 'DECLINED';
type Quote = {
  merchantAmountKES: number;
  shifAmountKES: number;
  totalKES: number;
  reason: QuoteReason;
};

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 20; // ~60 seconds

type PollResult = 'SUCCESS' | 'FAILED' | 'TIMEOUT';

const NO_SHIF_MESSAGE: Record<Exclude<QuoteReason, 'APPLIES'>, string> = {
  BELOW_THRESHOLD: 'Payments of KES 100 or below don’t include a SHIF contribution.',
  NOT_OPTED_IN: 'No SHIF contribution will be added because Auto-Deduct is turned off.',
  ALREADY_PAID_TODAY: 'No SHIF contribution will be added: today’s contribution is already done.',
  DECLINED: 'No SHIF contribution will be added.',
};

export default function MerchantPaymentModal({
  visible,
  onClose,
  merchantName,
  merchantPaybill,
  merchantAccount,
  merchantAmount,
  onSuccess,
}: MerchantPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'preview' | 'processing' | 'completed'>('preview');
  const [statusMessage, setStatusMessage] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState(false);
  const [quoteNonce, setQuoteNonce] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => stopPolling, []);

  // The SERVER decides what is charged. We only display its numbers.
  // If the quote fails we block payment rather than guess.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setQuote(null);
    setQuoteError(false);
    (async () => {
      try {
        const res = await client.post('/payment/merchant/quote', { merchantAmount });
        if (!cancelled) setQuote(res.data.data as Quote);
      } catch {
        if (!cancelled) setQuoteError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, merchantAmount, quoteNonce]);

  const quoteReady = quote !== null;
  const shifAmount = quote?.shifAmountKES ?? 0;
  const isQualifying = shifAmount > 0;
  const totalAmount = quote?.totalKES ?? merchantAmount;

  const waitForPayment = (checkoutRequestId: string) =>
    new Promise<PollResult>((resolve) => {
      let attempts = 0;
      stopPolling();
      pollRef.current = setInterval(async () => {
        attempts += 1;
        try {
          const r = await client.get(`/payment/status/${checkoutRequestId}`);
          const s = r.data?.data?.status;
          if (s === 'SUCCESS' || s === 'FAILED') {
            stopPolling();
            resolve(s);
            return;
          }
        } catch {
          // transient network error: keep polling
        }
        if (attempts >= POLL_MAX_ATTEMPTS) {
          stopPolling();
          resolve('TIMEOUT');
        }
      }, POLL_INTERVAL_MS);
    });

  const handlePay = async () => {
    if (loading || !quoteReady) return;
    setLoading(true);
    setStep('processing');
    setStatusMessage(`Sending M-PESA prompt for KES ${totalAmount}...`);

    try {
      // Merchant route (NOT /payment/stkpush, which is the direct-contribution route).
      // The server recomputes the SHIF amount itself, so nothing about SHIF is sent.
      const res = await client.post('/payment/merchant/stk-push', {
        merchantAmount,
        merchantPaybill,
        merchantAccount,
        merchantName,
      });

      const data = res.data?.data;
      const checkoutRequestId = data?.checkoutRequestId;
      if (!checkoutRequestId) throw new Error('M-PESA did not return a checkout reference.');

      // Trust the server's numbers for what the customer is actually charged
      const serverTotal: number = data.total ?? totalAmount;
      const serverShif: number = data.shifAmount ?? shifAmount;

      setStatusMessage(`Enter your M-PESA PIN on your phone to pay KES ${serverTotal}...`);
      const result = await waitForPayment(checkoutRequestId);

      if (result === 'SUCCESS') {
        setStatusMessage(
          serverShif > 0
            ? `KES ${merchantAmount} paid to ${merchantName}. Your KES ${serverShif} SHIF contribution was recorded.`
            : `KES ${merchantAmount} paid to ${merchantName}.`
        );
        setStep('completed');
        onSuccess?.({ merchantAmount, shifDeducted: serverShif > 0 });
      } else {
        setStep('preview');
        setQuoteNonce((n) => n + 1); // refresh: today's SHIF status may have changed
        Alert.alert(
          result === 'FAILED' ? 'Payment failed' : 'No confirmation yet',
          result === 'FAILED'
            ? 'The payment was cancelled or declined. You have not been charged.'
            : 'We did not receive a confirmation. Check your M-PESA messages before trying again.'
        );
      }
    } catch (e: any) {
      setStep('preview');
      setQuoteNonce((n) => n + 1);
      Alert.alert(
        'Payment failed',
        e.response?.data?.error || e.message || 'Could not start the M-PESA payment.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    stopPolling();
    setStep('preview');
    setStatusMessage('');
    setLoading(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (step !== 'processing') handleDone();
      }}
    >
      <View style={st.overlay}>
        <View style={st.sheet}>
          <View style={st.handle} />

          {/* Header */}
          <View style={st.header}>
            <View style={st.row}>
              <View style={st.iconBox}>
                <Feather name="shopping-bag" size={18} color={colors.accent} />
              </View>
              <View>
                <Text style={st.title}>Lipa na M-PESA</Text>
                <Text style={st.subtitle}>Confirm your payment</Text>
              </View>
            </View>
            {step === 'preview' && (
              <TouchableOpacity
                onPress={handleDone}
                style={st.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Feather name="x" size={18} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>

          {step === 'preview' && (
            <>
              {quoteError ? (
                <View style={st.errorBox}>
                  <Text style={st.errorTitle}>Couldn’t load your payment details</Text>
                  <Text style={st.small}>Check your connection and try again. You have not been charged.</Text>
                  <TouchableOpacity
                    style={st.retryBtn}
                    onPress={() => setQuoteNonce((n) => n + 1)}
                    accessibilityRole="button"
                  >
                    <Text style={st.retryText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : isQualifying ? (
                <View style={st.infoBox}>
                  <View style={st.row}>
                    <Feather name="shield" size={16} color={colors.accent} />
                    <Text style={st.infoTitle}>Smart SHIF Auto-Deduct Active</Text>
                  </View>
                  <Text style={st.small}>
                    KES {merchantAmount} goes to {merchantName} and KES {shifAmount} goes to your SHIF healthcare cover.
                    The M-PESA prompt will show the combined total of <Text style={st.strong}>KES {totalAmount}</Text>.
                  </Text>
                </View>
              ) : quoteReady && quote && quote.reason !== 'APPLIES' ? (
                <View style={st.neutralBox}>
                  <Text style={st.small}>{NO_SHIF_MESSAGE[quote.reason]}</Text>
                </View>
              ) : null}

              {/* Breakdown */}
              <View style={st.breakdown}>
                <Text style={st.eyebrow}>PAYMENT BREAKDOWN</Text>

                <View style={[st.lineRow, isQualifying && st.lineRowBorder]}>
                  <View style={st.flex1}>
                    <Text style={st.lineTitle}>{merchantName}</Text>
                    <Text style={st.tiny}>
                      Paybill {merchantPaybill} · Acc {merchantAccount}
                    </Text>
                  </View>
                  <Text style={st.lineAmount}>KES {merchantAmount}</Text>
                </View>

                {isQualifying && (
                  <View style={st.lineRow}>
                    <View style={st.flex1}>
                      <Text style={st.shifTitle}>SHIF Healthcare Cover</Text>
                      <Text style={st.tiny}>Paybill 200222 (SHA)</Text>
                    </View>
                    <Text style={st.shifAmount}>KES {shifAmount}</Text>
                  </View>
                )}

                <View style={st.totalRow}>
                  <Text style={st.totalLabel}>TOTAL TO PAY</Text>
                  {quoteReady ? (
                    <Text style={st.totalAmount}>KES {totalAmount}</Text>
                  ) : (
                    <Text style={st.totalPlaceholder}>{quoteError ? '—' : '...'}</Text>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={[st.payBtn, !quoteReady && st.payBtnDisabled]}
                onPress={handlePay}
                disabled={loading || !quoteReady}
                accessibilityRole="button"
              >
                <Text style={[st.payBtnText, !quoteReady && st.payBtnTextDisabled]}>
                  {quoteReady ? `Pay KES ${totalAmount} with M-PESA` : quoteError ? 'Unavailable' : 'Checking...'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'processing' && (
            <View style={st.centerBlock}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={st.processingText}>{statusMessage}</Text>
              <Text style={st.tinyCenter}>Please don't close this screen until the payment is confirmed.</Text>
            </View>
          )}

          {step === 'completed' && (
            <View style={st.centerBlock}>
              <View style={st.successRing}>
                <Feather name="check" size={30} color={colors.accent} />
              </View>
              <Text style={st.successTitle}>Payment confirmed</Text>
              <Text style={st.successBody}>{statusMessage}</Text>
              <TouchableOpacity style={st.doneBtn} onPress={handleDone} accessibilityRole="button">
                <Text style={st.payBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(20,24,31,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.line,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 32,
    gap: 16,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 4 },

  // Layout helpers
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex1: { flex: 1, paddingRight: 8, gap: 2 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radii.icon,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, letterSpacing: -0.2 },
  subtitle: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginTop: 1 },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Text
  small: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 19, color: colors.muted },
  tiny: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.muted },
  tinyCenter: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, textAlign: 'center' },
  strong: { fontFamily: fonts.bold, color: colors.text, ...tabularNums },

  // Notices
  infoBox: { gap: 8, padding: 16, borderRadius: 16, backgroundColor: ACCENT_SOFT, borderWidth: 1, borderColor: ACCENT_LINE },
  infoTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.accent },
  neutralBox: { padding: 16, borderRadius: 16, backgroundColor: colors.ground, borderWidth: 1, borderColor: colors.line },
  errorBox: { gap: 8, padding: 16, borderRadius: 16, backgroundColor: DANGER_SOFT, borderWidth: 1, borderColor: DANGER_LINE },
  errorTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.danger },
  retryBtn: {
    height: 44,
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },

  // Breakdown
  breakdown: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.ground,
  },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.9, color: colors.muted, marginBottom: 8 },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  lineRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  lineTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  lineAmount: { fontFamily: fonts.bold, fontSize: 15, color: colors.text, ...tabularNums },
  shifTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.accent },
  shifAmount: { fontFamily: fonts.bold, fontSize: 15, color: colors.accent, ...tabularNums },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  totalLabel: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 0.5, color: colors.text },
  totalAmount: { fontFamily: fonts.bold, fontSize: 22, color: colors.text, letterSpacing: -0.4, ...tabularNums },
  totalPlaceholder: { fontFamily: fonts.bold, fontSize: 22, color: colors.muted },

  // Buttons
  payBtn: { height: 52, borderRadius: radii.button, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  payBtnDisabled: { backgroundColor: colors.line },
  payBtnText: { fontFamily: fonts.bold, fontSize: 16, color: colors.accentInk },
  payBtnTextDisabled: { color: colors.muted },
  doneBtn: {
    height: 52,
    minWidth: 160,
    paddingHorizontal: 32,
    borderRadius: radii.button,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },

  // Processing and completed
  centerBlock: { alignItems: 'center', paddingVertical: 24, gap: 12 },
  processingText: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22, color: colors.text, textAlign: 'center', marginTop: 4 },
  successRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: ACCENT_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.text, letterSpacing: -0.3 },
  successBody: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, color: colors.muted, textAlign: 'center' },
});