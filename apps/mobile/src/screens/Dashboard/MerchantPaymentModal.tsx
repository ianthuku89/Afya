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
  const [step, setStep] = useState<'preview' | 'processing' | 'completed'>('preview');
  const [statusMessage, setStatusMessage] = useState('');

  const isQualifying = merchantAmount > 100;
  const shifAmount = 30;
  const totalAmount = isQualifying ? merchantAmount + shifAmount : merchantAmount;

  const handlePayWithCombinedPrompt = async () => {
    setLoading(true);
    setStep('processing');
    
    if (isQualifying) {
      setStatusMessage(`Sending single M-PESA prompt for combined total: KES ${totalAmount} (${merchantAmount} + 30 SHIF)...`);
    } else {
      setStatusMessage(`Sending M-PESA prompt: KES ${merchantAmount} to ${merchantName}...`);
    }

    try {
      // ── SINGLE COMBINED STK Push ───────────────────────────────────────────
      // Send one prompt for the combined total (merchant + SHIF if qualifying)
      const combinedDescription = isQualifying 
        ? `Payment to ${merchantName} + KES 30 SHIF contribution`
        : `Payment to ${merchantName}`;
        
      const paymentRes = await client.post('/payment/stkpush', {
        amount: totalAmount,
        currency: 'KES',
        description: combinedDescription,
      });

      const txRef = paymentRes.data?.data?.checkoutRequestId || `COMBINED-${Date.now()}`;

      // If this is a qualifying transaction, also log the auto-deduction
      if (isQualifying) {
        try {
          await client.post('/auto-deduct/transaction-sync', {
            txAmount: merchantAmount,
            txRef: txRef,
          });
          setStatusMessage(`Single M-PESA prompt sent! Enter your PIN once to pay KES ${totalAmount} (includes KES 30 SHIF contribution).`);
        } catch (syncErr) {
          console.warn('Auto-deduct sync warning:', syncErr);
          // Payment still processed even if sync fails
          setStatusMessage(`M-PESA prompt sent! Enter your PIN for KES ${totalAmount}. SHIF deduction will be processed separately.`);
        }
      } else {
        setStatusMessage(`M-PESA prompt sent! Enter your PIN for KES ${merchantAmount}.`);
      }

      setTimeout(() => {
        setStep('completed');
        setLoading(false);
        onSuccess?.({ merchantAmount, shifDeducted: isQualifying });
      }, 4000);

    } catch (e: any) {
      setLoading(false);
      setStep('preview');
      Alert.alert('Payment Failed', e.response?.data?.error || e.message || 'Could not initiate M-PESA payment.');
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
              {/* Single Combined Prompt Callout */}
              {isQualifying ? (
                <View className="bg-teal-950/60 border border-teal-500/30 rounded-2xl p-4 mb-4">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Feather name="shield" size={16} color="#34D399" />
                    <Text className="text-teal-400 font-bold text-sm">Smart SHIF Auto-Deduct Active</Text>
                  </View>
                  <Text className="text-slate-300 text-xs leading-relaxed">
                    Transactions over KES 100 include your daily fixed KES 30 SHIF contribution.
                    You will receive <Text className="text-white font-bold">one single M-PESA prompt</Text> for the combined total.
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

                {/* Single Combined Payment Items */}
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

                {/* SHIF Contribution (if qualifying) - included in single prompt */}
                {isQualifying && (
                  <View className="flex-row justify-between items-center py-2 border-b border-white/10">
                    <View className="flex-row items-center gap-2">
                      <View className="w-6 h-6 rounded-full bg-teal-800 items-center justify-center">
                        <Text className="text-teal-300 text-xs font-bold">+</Text>
                      </View>
                      <View>
                        <Text className="text-teal-300 font-medium text-sm">SHIF Healthcare Cover</Text>
                        <Text className="text-slate-500 text-xs">Paybill: 200222 (SHA)</Text>
                      </View>
                    </View>
                    <Text className="text-teal-300 font-bold text-base">KES {shifAmount}</Text>
                  </View>
                )}

                {/* TOTAL */}
                <View className="flex-row justify-between items-center pt-3">
                  <Text className="text-white font-bold">TOTAL TO PAY</Text>
                  <Text className="text-white font-bold text-xl">KES {totalAmount}</Text>
                </View>
              </View>

              {/* Single Pay Button for combined prompt */}
              <TouchableOpacity
                className="bg-teal-500 rounded-2xl py-4 items-center"
                onPress={handlePayWithCombinedPrompt}
                disabled={loading}
              >
                <Text className="text-white font-bold text-base">Pay with M-PESA (Single Prompt)</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'processing' && (
            <View className="py-8 items-center">
              <ActivityIndicator size="large" color="#34D399" />
              <Text className="text-white text-sm mt-4 text-center">{statusMessage}</Text>
            </View>
          )}

          {step === 'completed' && (
            <View className="py-8 items-center">
              <View className="w-16 h-16 bg-teal-500/20 rounded-full items-center justify-center mb-4">
                <Feather name="check" size={32} color="#34D399" />
              </View>
              <Text className="text-white font-bold text-lg mb-2">Payment Processed!</Text>
              <Text className="text-slate-400 text-sm text-center mb-6">{statusMessage}</Text>
              <TouchableOpacity
                className="bg-teal-500 rounded-2xl py-4 px-8"
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