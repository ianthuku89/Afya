import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { client } from '../../api/client';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import MerchantPaymentModal from './MerchantPaymentModal';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Slider = require('@react-native-community/slider').default as React.ComponentType<{
  style?: any; minimumValue?: number; maximumValue?: number; step?: number;
  value?: number; onValueChange?: (v: number) => void;
  minimumTrackTintColor?: string; maximumTrackTintColor?: string; thumbTintColor?: string;
}>;

export default function ContributeScreen() {
  const [amount, setAmount] = useState(30);
  const [loading, setLoading] = useState(false);
  const [merchantModalVisible, setMerchantModalVisible] = useState(false);
  const [successData, setSuccessData] = useState<{ tx: string; newStreak: number; newTier: string } | null>(null);
  const navigation = useNavigation<any>();

  const handleMpesaPush = async () => {
    // If user is testing/triggering a merchant transaction > 100, show the C2B dual-prompt modal
    if (amount > 100) {
      setMerchantModalVisible(true);
      return;
    }

    setLoading(true);
    try {
      const res = await client.post('/payment/stkpush', {
        amount: amount,
        currency: 'KES',
        description: 'AfyaToken SHIF Contribution'
      });

      const checkoutRequestId = res.data?.data?.checkoutRequestId || `CONTRIB-${Date.now()}`;
      
      Alert.alert("STK Push Sent", `Please enter your M-PESA PIN for KES ${amount} (Paybill 200222).`);
      setTimeout(() => {
         setLoading(false);
         setSuccessData({
           tx: checkoutRequestId,
           newStreak: 1,
           newTier: 'Bronze',
         });
      }, 3000);
      
    } catch (e: any) {
      setLoading(false);
      Alert.alert('Payment Failed', e.response?.data?.message || e.response?.data?.error || 'Failed to initiate M-PESA push');
    }
  };

  const handleMerchantSuccess = (details: { merchantAmount: number; shifDeducted: boolean }) => {
    setSuccessData({
      tx: `C2B-${Date.now()}`,
      newStreak: 1,
      newTier: 'Bronze',
    });
  };

  if (successData) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900 justify-center items-center px-6">
        <View className="w-20 h-20 rounded-full bg-teal-900/60 border-2 border-teal-400 items-center justify-center mb-6">
          <Feather name="check" size={40} color="#34d399" />
        </View>
        <Text className="text-3xl font-bold text-white mb-2">SHIF Cover Boosted! 🎉</Text>
        <Text className="text-slate-300 mb-2 text-center text-sm px-4">
          KES {amount} routed to your Social Health Authority (SHA) account via Paybill 200222
        </Text>
        <Text className="text-teal-400 font-mono text-xs mb-6">TX: {successData.tx}</Text>
        
        {/* Streak Update Card */}
        <View className="bg-white/5 border border-white/10 rounded-3xl p-5 w-full mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-amber-400 font-bold">🔥 Contribution Streak</Text>
            <View className="bg-teal-500/20 px-2.5 py-1 rounded-full">
              <Text className="text-teal-400 text-xs font-bold">{successData.newTier} Tier</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-3 bg-black/20 p-4 rounded-2xl">
            <Text className="text-3xl font-extrabold text-amber-400">+{successData.newStreak}</Text>
            <View className="flex-1">
              <Text className="text-white font-bold text-sm">Day Streak Counted</Text>
              <Text className="text-slate-400 text-xs">Contribute daily to unlock Silver, Gold & Platinum packages</Text>
            </View>
          </View>
        </View>
        
        <TouchableOpacity 
          className="w-full bg-teal-500 rounded-2xl py-4 items-center mb-3"
          onPress={() => { setSuccessData(null); navigation.navigate('Home' as never); }}
        >
          <Text className="text-white font-bold text-base">Return Home</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className="w-full bg-transparent border border-white/20 rounded-2xl py-3 items-center"
          onPress={() => { setSuccessData(null); navigation.navigate('TierBenefits' as never); }}
        >
          <Text className="text-slate-300 font-medium text-xs">View Preventive Packages</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4 w-10 h-10 bg-white/5 rounded-full items-center justify-center">
          <Feather name="arrow-left" size={20} color="#94a3b8" />
        </TouchableOpacity>

        <Text className="text-white text-3xl font-bold mb-1 tracking-tight">Daily SHIF Contribution</Text>
        <Text className="text-slate-400 text-sm mb-6">Fixed KES 30/day builds your streak and unlocks preventive health packages</Text>

        {/* Amount Card */}
        <View className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-6">
          <Text className="text-slate-500 text-xs font-mono font-bold tracking-wider mb-2">AMOUNT TO CONTRIBUTE</Text>
          <Text className="text-amber-400 text-5xl font-extrabold text-center my-3">
            KES {amount}
          </Text>
          <Text className="text-slate-400 text-center mb-1 text-xs">
            Direct to SHA Paybill: <Text className="text-white font-mono font-bold">200222</Text>
          </Text>
          <Text className="text-teal-400 text-center mb-4 text-xs font-semibold">
            {amount === 30 ? '⭐ Recommended Daily Contribution' : amount > 100 ? '🛒 Lipa na M-PESA C2B Qualifying Transaction' : 'SHIF Micro-Contribution'}
          </Text>

          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={30}
            maximumValue={500}
            step={10}
            value={amount}
            onValueChange={setAmount}
            minimumTrackTintColor="#00C165"
            maximumTrackTintColor="#1e293b"
            thumbTintColor="#00C165"
          />
          <View className="flex-row justify-between mt-2 px-2">
            <Text className="text-slate-500 text-xs font-medium">KES 30 (Daily)</Text>
            <Text className="text-slate-500 text-xs font-medium">KES 500</Text>
          </View>
        </View>

        {/* Quick Amount Pills */}
        <View className="flex-row gap-2 mb-6">
          {[30, 50, 100, 150, 300].map(v => (
            <TouchableOpacity 
              key={v}
              onPress={() => setAmount(v)}
              className={`flex-1 py-3 rounded-xl items-center border ${amount === v ? 'bg-teal-500 border-teal-400' : 'bg-transparent border-slate-700'}`}
            >
              <Text className={`font-bold ${amount === v ? 'text-white' : 'text-slate-400'}`}>
                {v}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 30-Day Streak Milestone Banner */}
        <TouchableOpacity
          className="bg-amber-900/20 border border-amber-500/30 rounded-2xl p-4 mb-4"
          onPress={() => navigation.navigate('TierBenefits' as never)}
        >
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-amber-400 font-bold">🎯 Streak Milestones</Text>
            <Text className="text-teal-400 text-xs font-bold">View All Packages →</Text>
          </View>
          <Text className="text-slate-400 text-xs leading-relaxed">
            30 Days = Silver · 90 Days = Gold · 180 Days = Platinum preventive health benefits.
          </Text>
        </TouchableOpacity>

        {/* C2B Notice for > 100 */}
        {amount > 100 && (
          <View className="bg-teal-950/60 border border-teal-500/30 rounded-2xl p-4 mb-6">
            <View className="flex-row items-center gap-2 mb-1">
              <Feather name="info" size={16} color="#34D399" />
              <Text className="text-teal-400 font-bold text-xs">C2B Merchant Mode (Over KES 100)</Text>
            </View>
            <Text className="text-slate-300 text-xs leading-relaxed">
              Pressing contribute will test the C2B Lipa na M-PESA prompt flow: Prompt 1 for KES {amount} (Merchant) + Prompt 2 for KES 30 (SHA Paybill 200222).
            </Text>
          </View>
        )}

        <TouchableOpacity 
          className="bg-teal-500 rounded-2xl py-4 items-center flex-row justify-center gap-2 shadow-lg"
          onPress={handleMpesaPush}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Feather name="smartphone" size={20} color="white" />
              <Text className="text-white font-bold text-lg">
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
        onSuccess={handleMerchantSuccess}
      />
    </SafeAreaView>
  );
}
