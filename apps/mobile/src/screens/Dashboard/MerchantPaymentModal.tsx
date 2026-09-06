import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { client } from '../../api/client';

interface MerchantPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  merchantName?: string;
  merchantPaybill?: string;
  merchantAmount: number;
  nationalId?: string;
  onSuccess?: (details: { merchantAmount: number; shifDeducted: boolean }) => void;
}

export default function MerchantPaymentModal({
  visible,
  onClose,
  merchantName = 'Naivas Supermarket',
  merchantPaybill = '888222',
  merchantAmount,
  nationalId = '12345678',
  onSuccess,
}: MerchantPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'preview' | 'processing' | 'prompt2_ready' | 'completed'>('preview');
  const [statusMessage, setStatusMessage] = useState('');

  const isQualifying = merchantAmount > 100;
  const shifAmount = 30;
  const totalAmount = isQualifying ? merchantAmount + shifAmount : merchantAmount;

  const handlePayWithShifDeduct = async () => {
    setLoading(true);
    setStep('processing');
    setStatusMessage('Sending Prompt 1: KES ' + merchantAmount + ' to ' + merchantName + '...');

    try {
      // ── STEP 1: Push Merchant STK Push ───────────────────────────────────
      const merchantRes = await client.post('/payment/stkpush', {
        amount: merchantAmount,
        currency: 'KES',
        description: `Payment to ${merchantName}`,
      });

      const txRef = merchantRes.data?.data?.checkoutRequestId || `MERCH-${Date.now()}`;

      // Simulate STK #1 PIN entry confirmation
      setStatusMessage(`Prompt 1 sent! Enter M-PESA PIN for KES ${merchantAmount} on your phone.`);

      setTimeout(async () => {
        if (!isQualifying) {
          setStep('completed');
          setLoading(false);
          onSuccess?.({ merchantAmount, shifDeducted: false });
          return;
        }

        // ── STEP 2: Trigger Real-time STK Push #2 for KES 30 to Paybill 200222 ──
        setStatusMessage(`Prompt 1 confirmed! Sending Prompt 2: KES 30 to SHA (Paybill 200222)...`);

        try {
          const shifRes = await client.post('/auto-deduct/merchant-trigger', {
            txAmount: merchantAmount,
            txRef: txRef,
          });

          if (shifRes.data?.alreadyDeductedToday) {
            setStatusMessage('Merchant paid! Daily KES 30 SHIF deduction was already satisfied earlier today.');
            setStep('completed');
            setLoading(false);
            onSuccess?.({ merchantAmount, shifDeducted: false });
            return;
          }

          setStatusMessage(`Prompt 2 sent! Enter M-PESA PIN for KES 30 SHIF contribution (Paybill 200222, Account: ${nationalId}).`);

          setTimeout(() => {
            setStep('completed');
            setLoading(false);
            onSuccess?.({ merchantAmount, shifDeducted: true });
          }, 3500);

        } catch (shifErr: any) {
          console.warn('SHIF deduction trigger error:', shifErr?.response?.data || shifErr?.message);
          setStatusMessage('Merchant payment completed. Daily SHIF deduction will be retried automatically.');
          setStep('completed');
          setLoading(false);
          onSuccess?.({ merchantAmount, shifDeducted: false });
        }
      }, 3500);

    } catch (e: any) {
      setLoading(false);
      setStep('preview');
      Alert.alert('Payment Failed', e.response?.data?.error || e.message || 'Could not initiate M-PESA payment.');
    }
  };

  const handlePayMerchantOnly = async () => {
    setLoading(true);
    setStep('processing');
    setStatusMessage(`Sending Prompt: KES ${merchantAmount} to ${merchantName}...`);

    try {
      await client.post('/payment/stkpush', {
        amount: merchantAmount,
        currency: 'KES',
        description: `Payment to ${merchantName}`,
      });

      setTimeout(() => {
        setStep('completed');
        setLoading(false);
        onSuccess?.({ merchantAmount, shifDeducted: false });
      }, 3000);
    } catch (e: any) {
      setLoading(false);
      setStep('preview');
      Alert.alert('Payment Failed', e.response?.data?.error || e.message || 'Could not initiate payment.');
    }
  };

  const handleDone = () => {
    setStep('preview');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/80 justify-end">
        <View className="bg-slate-900 border-t border-slate-700 rounded-t-3xl p-6">
          
          {/* Header */}
          <View className="flex-row justify-between items-center mb-5">
            <View className="flex-row items-center gap-2">
              <View className="w-9 h-9 rounded-full bg-teal-500/20 items-center justify-center border border-teal-500/30">
                <Feather name="shopping-bag" size={18} color="#34D399" />
              </View>
              <View>
                <Text className="text-white font-bold text-lg">Lipa na M-PESA</Text>
                <Text className="text-slate-400 text-xs">C2B Smart Merchant Checkout</Text>
              </View>
            </View>
            {step === 'preview' && (
              <TouchableOpacity onPress={onClose} className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
                <Feather name="x" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {step === 'preview' && (
            <>
              {/* Dual Deduction Callout */}
              {isQualifying ? (
                <View className="bg-teal-950/60 border border-teal-500/30 rounded-2xl p-4 mb-4">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Feather name="shield" size={16} color="#34D399" />
                    <Text className="text-teal-400 font-bold text-sm">Smart SHIF Auto-Deduct Active</Text>
                  </View>
                  <Text className="text-slate-300 text-xs leading-relaxed">
                    Transactions over KES 100 trigger your daily fixed KES 30 SHIF contribution.
                    You will receive <Text className="text-white font-bold">2 sequential M-PESA prompts</Text> on your phone.
                  </Text>
                </View>
              ) : (
                <View className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 mb-4">
                  <Text className="text-slate-300 text-xs">
                    Transaction is KES 100 or below. No SHIF micro-deduction will be triggered.
                  </Text>
                </View>
              )}

              {/* Payment Breakdown Card */}
              <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-5">
                <Text className="text-slate-400 text-xs font-mono font-bold tracking-wider mb-3">PAYMENT BREAKDOWN</Text>

                {/* Prompt 1: Merchant */}
                <View className="flex-row justify-between items-center py-2 border-b border-white/10">
                  <View className="flex-row items-center gap-2">
                    <View className="w-6 h-6 rounded-full bg-slate-700 items-center justify-center">
                      <Text className="text-white text-xs font-bold">1</Text>
                    </View>
                    <View>
                      <Text className="text-white font-medium text-sm">{merchantName}</Text>
                      <Text className="text-slate-500 text-xs">Paybill: {merchantPaybill}</Text>
                    </View>
                  </View>
                  <Text className="text-white font-bold text-base">KES {merchantAmount}</Text>
                </View>

                {/* Prompt 2: SHA SHIF (if qualifying) */}
                {isQualifying && (
                  <View className="flex-row justify-between items-center py-2 border-b border-white/10">
                    <View className="flex-row items-center gap-2">
                      <View className="w-6 h-6 rounded-full bg-teal-800 items-center justify-center">
                        <Text className="text-teal-300 text-xs font-bold">2</Text>
                      </View>
                      <View>
                        <Text className="text-teal-300 font-medium text-sm">SHIF Healthcare Cover</Text>
                        <Text className="text-slate-500 text-xs">Paybill: 200222 · A/C: {nationalId}</Text>
                      </View>
                    </View>
                    <Text className="text-teal-400 font-bold text-base">+ KES 30</Text>
                  </View>
                )}

                {/* Total */}
                <View className="flex-row justify-between items-center pt-3">
                  <Text className="text-slate-400 font-bold">Total Debited</Text>
                  <Text className="text-amber-400 font-extrabold text-xl">KES {totalAmount}</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <TouchableOpacity
                className="bg-teal-500 rounded-2xl py-4 items-center mb-3 flex-row justify-center gap-2"
                onPress={handlePayWithShifDeduct}
                disabled={loading}
              >
                <Feather name="check-circle" size={18} color="white" />
                <Text className="text-white font-bold text-base">
                  {isQualifying ? 'Proceed (2 M-PESA Prompts)' : `Pay KES ${merchantAmount}`}
                </Text>
              </TouchableOpacity>

              {isQualifying && (
                <TouchableOpacity
                  className="bg-transparent border border-slate-700 rounded-2xl py-3 items-center"
                  onPress={handlePayMerchantOnly}
                  disabled={loading}
                >
                  <Text className="text-slate-400 text-xs font-semibold">Pay merchant only (skip SHIF KES 30)</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {step === 'processing' && (
            <View className="py-8 items-center">
              <ActivityIndicator size="large" color="#00C165" className="mb-4" />
              <Text className="text-white font-bold text-lg mb-2">Processing Lipa na M-PESA</Text>
              <Text className="text-teal-300 text-sm text-center px-4 leading-relaxed">{statusMessage}</Text>
            </View>
          )}

          {step === 'completed' && (
            <View className="py-6 items-center">
              <View className="w-16 h-16 rounded-full bg-teal-900/60 border border-teal-500 items-center justify-center mb-4">
                <Feather name="check" size={32} color="#34D399" />
              </View>
              <Text className="text-white font-bold text-xl mb-2">Transaction Complete!</Text>
              <Text className="text-slate-300 text-sm text-center mb-6 px-4">{statusMessage}</Text>

              <TouchableOpacity
                className="w-full bg-slate-800 rounded-xl py-4 items-center border border-slate-700"
                onPress={handleDone}
              >
                <Text className="text-white font-bold">Done</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
}
