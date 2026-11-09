import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { client } from '../../api/client';

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
      <View className="flex-1 bg-black/80 justify-end">
        <View className="bg-slate-900 border-t border-slate-700 rounded-t-3xl p-6">
          <View className="flex-row justify-between items-center mb-5">
            <View className="flex-row items-center gap-2">
              <View className="w-9 h-9 rounded-full bg-teal-500/20 items-center justify-center border border-teal-500/30">
                <Feather name="shopping-bag" size={18} color="#34D399" />
              </View>
              <View>
                <Text className="text-white font-bold text-lg">Lipa na M-PESA</Text>
                <Text className="text-slate-400 text-xs">Confirm your payment</Text>
              </View>
            </View>
            {step === 'preview' && (
              <TouchableOpacity
                onPress={handleDone}
                className="w-8 h-8 rounded-full bg-white/10 items-center justify-center"
              >
                <Feather name="x" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {step === 'preview' && (
            <>
              {quoteError ? (
                <View className="bg-red-950/60 border border-red-500/30 rounded-2xl p-4 mb-4">
                  <Text className="text-red-300 text-sm font-bold mb-1">
                    Couldn’t load your payment details
                  </Text>
                  <Text className="text-slate-300 text-xs mb-3">
                    Check your connection and try again. You have not been charged.
                  </Text>
                  <TouchableOpacity
                    className="bg-white/10 rounded-xl py-2 items-center"
                    onPress={() => setQuoteNonce((n) => n + 1)}
                  >
                    <Text className="text-white font-bold text-sm">Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : isQualifying ? (
                <View className="bg-teal-950/60 border border-teal-500/30 rounded-2xl p-4 mb-4">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Feather name="shield" size={16} color="#34D399" />
                    <Text className="text-teal-400 font-bold text-sm">Smart SHIF Auto-Deduct Active</Text>
                  </View>
                  <Text className="text-slate-300 text-xs leading-relaxed">
                    KES {merchantAmount} goes to {merchantName} and KES {shifAmount} goes to your SHIF
                    healthcare cover. The M-PESA prompt will show the combined total of{' '}
                    <Text className="text-white font-bold">KES {totalAmount}</Text>.
                  </Text>
                </View>
              ) : quoteReady && quote && quote.reason !== 'APPLIES' ? (
                <View className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 mb-4">
                  <Text className="text-slate-300 text-xs">{NO_SHIF_MESSAGE[quote.reason]}</Text>
                </View>
              ) : null}

              <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-5">
                <Text className="text-slate-400 text-xs font-bold mb-3">PAYMENT BREAKDOWN</Text>

                <View
                  className={`flex-row justify-between items-center py-2 ${
                    isQualifying ? 'border-b border-white/10' : ''
                  }`}
                >
                  <View className="flex-1 pr-2">
                    <Text className="text-white font-medium text-sm">{merchantName}</Text>
                    <Text className="text-slate-500 text-xs">
                      Paybill {merchantPaybill} · Acc {merchantAccount}
                    </Text>
                  </View>
                  <Text className="text-white font-bold text-base">KES {merchantAmount}</Text>
                </View>

                {isQualifying && (
                  <View className="flex-row justify-between items-center py-2">
                    <View>
                      <Text className="text-teal-300 font-medium text-sm">SHIF Healthcare Cover</Text>
                      <Text className="text-slate-500 text-xs">Paybill 200222 (SHA)</Text>
                    </View>
                    <Text className="text-teal-300 font-bold text-base">KES {shifAmount}</Text>
                  </View>
                )}

                <View className="flex-row justify-between items-center pt-3 mt-1 border-t border-white/10">
                  <Text className="text-white font-bold">TOTAL TO PAY</Text>
                  {quoteReady ? (
                    <Text className="text-white font-bold text-xl">KES {totalAmount}</Text>
                  ) : (
                    <Text className="text-slate-500 font-bold text-xl">{quoteError ? '—' : '...'}</Text>
                  )}
                </View>
              </View>

              <TouchableOpacity
                className={`rounded-2xl py-4 items-center ${quoteReady ? 'bg-teal-500' : 'bg-slate-700'}`}
                onPress={handlePay}
                disabled={loading || !quoteReady}
              >
                <Text className="text-white font-bold text-base">
                  {quoteReady
                    ? `Pay KES ${totalAmount} with M-PESA`
                    : quoteError
                      ? 'Unavailable'
                      : 'Checking...'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'processing' && (
            <View className="py-8 items-center">
              <ActivityIndicator size="large" color="#34D399" />
              <Text className="text-white text-sm mt-4 text-center">{statusMessage}</Text>
              <Text className="text-slate-500 text-xs mt-2 text-center">
                Please don't close this screen until the payment is confirmed.
              </Text>
            </View>
          )}

          {step === 'completed' && (
            <View className="py-8 items-center">
              <View className="w-16 h-16 bg-teal-500/20 rounded-full items-center justify-center mb-4">
                <Feather name="check" size={32} color="#34D399" />
              </View>
              <Text className="text-white font-bold text-lg mb-2">Payment confirmed</Text>
              <Text className="text-slate-400 text-sm text-center mb-6">{statusMessage}</Text>
              <TouchableOpacity className="bg-teal-500 rounded-2xl py-4 px-8" onPress={handleDone}>
                <Text className="text-white font-bold">Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}