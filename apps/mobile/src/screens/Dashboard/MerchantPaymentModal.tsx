import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { startMerchantPush, waitForPayment, errorMessage } from '../../api/mpesa';

interface MerchantPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  merchantName?: string;
  merchantPaybill?: string;
  merchantAccount?: string;
  merchantAmount: number;
  nationalId?: string;
  onSuccess?: (details: { merchantAmount: number; shifDeducted: boolean }) => void;
}

export default function MerchantPaymentModal({
  visible,
  onClose,
  merchantName = 'Naivas Supermarket',
  merchantPaybill = '888222',
  merchantAccount,
  merchantAmount,
  nationalId = '12345678',
  onSuccess,
}: MerchantPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'preview' | 'processing' | 'completed'>('preview');
  const [statusMessage, setStatusMessage] = useState('');

  const isQualifying = merchantAmount > 100;
  const shifAmount = 30;
  const totalAmount = isQualifying ? merchantAmount + shifAmount : merchantAmount;

  const finish = (shifDeducted: boolean) => {
    setStep('completed');
    setLoading(false);
    onSuccess?.({ merchantAmount, shifDeducted });
  };

  const fail = (message: string) => {
    setLoading(false);
    setStep('preview');
    Alert.alert('Payment Failed', message);
  };

  // ONE M-PESA prompt for the full total. The server splits it after the
  // callback confirms: merchant portion -> merchant paybill, KES 30 -> SHIF.
  const pay = async (includeShif: boolean) => {
    setLoading(true);
    setStep('processing');
    const shif = includeShif && isQualifying ? shifAmount : 0;
    setStatusMessage(`Prompt sent! Enter your M-PESA PIN for KES ${merchantAmount + shif}.`);

    try {
      const id = await startMerchantPush({
        merchantAmount,
        merchantPaybill,
        merchantName,
        merchantAccount,
        includeShif,
      });
      const r = await waitForPayment(id);
      if (r.status !== 'SUCCESS') return fail(r.message || 'Payment was not completed.');

      setStatusMessage(shif ? 'Payment confirmed. SHIF contribution included.' : 'Payment confirmed.');
      finish(shif > 0);
    } catch (e: any) {
      fail(errorMessage(e, 'Could not initiate M-PESA payment.'));
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
              {/* SHIF Callout */}
              {isQualifying ? (
                <View className="bg-teal-950/60 border border-teal-500/30 rounded-2xl p-4 mb-4">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Feather name="shield" size={16} color="#34D399" />
                    <Text className="text-teal-400 font-bold text-sm">Smart SHIF Auto-Deduct Active</Text>
                  </View>
                  <Text className="text-slate-300 text-xs leading-relaxed">
                    Transactions over KES 100 include your daily fixed KES 30 SHIF contribution.
                    You'll get <Text className="text-white font-bold">one M-PESA prompt</Text> for the total.
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

                {/* Merchant */}
                <View className="flex-row justify-between items-center py-2 border-b border-white/10">
                  <View className="flex-row items-center gap-2">
                    <View className="w-6 h-6 rounded-full bg-slate-700 items-center justify-center">
                      <Feather name="shopping-bag" size={12} color="#CBD5E1" />
                    </View>
                    <View>
                      <Text className="text-white font-medium text-sm">{merchantName}</Text>
                      <Text className="text-slate-500 text-xs">Paybill: {merchantPaybill}</Text>
                    </View>
                  </View>
                  <Text className="text-white font-bold text-base">KES {merchantAmount}</Text>
                </View>

                {/* SHIF (if qualifying) */}
                {isQualifying && (
                  <View className="flex-row justify-between items-center py-2 border-b border-white/10">
                    <View className="flex-row items-center gap-2">
                      <View className="w-6 h-6 rounded-full bg-teal-800 items-center justify-center">
                        <Feather name="heart" size={12} color="#5EEAD4" />
                      </View>
                      <View>
                        <Text className="text-teal-300 font-medium text-sm">SHIF Healthcare Cover</Text>
                        <Text className="text-slate-500 text-xs">Paybill: 200222 · A/C: {nationalId}</Text>
                      </View>
                    </View>
                    <Text className="text-teal-400 font-bold text-base">+ KES {shifAmount}</Text>
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
                onPress={() => pay(true)}
                disabled={loading}
              >
                <Feather name="check-circle" size={18} color="white" />
                <Text className="text-white font-bold text-base">Pay KES {totalAmount}</Text>
              </TouchableOpacity>

              {isQualifying && (
                <TouchableOpacity
                  className="bg-transparent border border-slate-700 rounded-2xl py-3 items-center"
                  onPress={() => pay(false)}
                  disabled={loading}
                >
                  <Text className="text-slate-400 text-xs font-semibold">
                    Pay merchant only KES {merchantAmount} (skip SHIF KES {shifAmount})
                  </Text>
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