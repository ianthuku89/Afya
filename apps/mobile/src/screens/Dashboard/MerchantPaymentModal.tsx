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

const SHIF_AMOUNT = 30;
const SHIF_THRESHOLD = 100;
const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 20; // ~60 seconds

type PollResult = 'SUCCESS' | 'FAILED' | 'TIMEOUT';

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
  const [shifEligible, setShifEligible] = useState(false);
  const [eligibilityLoaded, setEligibilityLoaded] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => stopPolling, []);

  // Preview only. The server re-checks opt-in + daily cap and decides the real SHIF amount.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setEligibilityLoaded(false);
    (async () => {
      try {
        const res = await client.get('/loyalty/auto-deduct/status');
        const { autoDeductOptIn, isDeductedToday } = res.data.data;
        if (!cancelled) setShifEligible(Boolean(autoDeductOptIn) && !isDeductedToday);
      } catch {
        if (!cancelled) setShifEligible(false);
      } finally {
        if (!cancelled) setEligibilityLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const isQualifying = shifEligible && merchantAmount > SHIF_THRESHOLD;
  const totalAmount = isQualifying ? merchantAmount + SHIF_AMOUNT : merchantAmount;

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
    if (loading || !eligibilityLoaded) return;
    setLoading(true);
    setStep('processing');
    setStatusMessage(`Sending M-PESA prompt for KES ${totalAmount}...`);

    try {
      // Correct endpoint: the merchant route, NOT /payment/stkpush (that one is the
      // direct-contribution route and would treat the whole total as a wallet top-up).
      const res = await client.post('/payment/merchant/stk-push', {
        merchantAmount,
        merchantPaybill,
        merchantAccount,
        merchantName,
        includeShif: isQualifying,
      });

      const data = res.data?.data;
      const checkoutRequestId = data?.checkoutRequestId;
      if (!checkoutRequestId) throw new Error('M-PESA did not return a checkout reference.');

      // Trust the server's numbers for what the customer is actually charged
      const serverTotal: number = data.total ?? totalAmount;
      const serverShif: number = data.shifAmount ?? (isQualifying ? SHIF_AMOUNT : 0);

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
        Alert.alert(
          result === 'FAILED' ? 'Payment failed' : 'No confirmation yet',
          result === 'FAILED'
            ? 'The payment was cancelled or declined. You have not been charged.'
            : 'We did not receive a confirmation. Check your M-PESA messages before trying again.'
        );
      }
    } catch (e: any) {
      setStep('preview');
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
              {isQualifying ? (
                <View className="bg-teal-950/60 border border-teal-500/30 rounded-2xl p-4 mb-4">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Feather name="shield" size={16} color="#34D399" />
                    <Text className="text-teal-400 font-bold text-sm">Smart SHIF Auto-Deduct Active</Text>
                  </View>
                  <Text className="text-slate-300 text-xs leading-relaxed">
                    Your first payment over KES {SHIF_THRESHOLD} each day includes a KES {SHIF_AMOUNT} SHIF
                    contribution. The M-PESA prompt will show the combined total of{' '}
                    <Text className="text-white font-bold">KES {totalAmount}</Text>.
                  </Text>
                </View>
              ) : (
                <View className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 mb-4">
                  <Text className="text-slate-300 text-xs">
                    {merchantAmount <= SHIF_THRESHOLD
                      ? `Payments of KES ${SHIF_THRESHOLD} or below don't include a SHIF contribution.`
                      : 'No SHIF contribution will be added (Auto-Deduct is off, or today’s contribution is already done).'}
                  </Text>
                </View>
              )}

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
                    <Text className="text-teal-300 font-bold text-base">KES {SHIF_AMOUNT}</Text>
                  </View>
                )}

                <View className="flex-row justify-between items-center pt-3 mt-1 border-t border-white/10">
                  <Text className="text-white font-bold">TOTAL TO PAY</Text>
                  <Text className="text-white font-bold text-xl">KES {totalAmount}</Text>
                </View>
              </View>

              <TouchableOpacity
                className={`rounded-2xl py-4 items-center ${eligibilityLoaded ? 'bg-teal-500' : 'bg-slate-700'}`}
                onPress={handlePay}
                disabled={loading || !eligibilityLoaded}
              >
                <Text className="text-white font-bold text-base">
                  {eligibilityLoaded ? `Pay KES ${totalAmount} with M-PESA` : 'Checking...'}
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