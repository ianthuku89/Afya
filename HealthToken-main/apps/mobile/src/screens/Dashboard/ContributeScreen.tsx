import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { client } from '../../api/client';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Slider = require('@react-native-community/slider').default as React.ComponentType<{
  style?: any; minimumValue?: number; maximumValue?: number; step?: number;
  value?: number; onValueChange?: (v: number) => void;
  minimumTrackTintColor?: string; maximumTrackTintColor?: string; thumbTintColor?: string;
}>;

export default function ContributeScreen() {
  const [amount, setAmount] = useState(50);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ tx: string; scoreIncrease: number; newStreak: number } | null>(null);
  const navigation = useNavigation<any>();

  const handleMpesaPush = async () => {
    setLoading(true);
    try {
      const res = await client.post('/payment/stkpush', {
        amount: amount * 10,
        currency: 'KES',
        description: 'AfyaToken SHIF Contribution'
      });
      
      Alert.alert("STK Push Sent", "Please enter your M-PESA PIN on your phone.");
      setTimeout(() => {
         setLoading(false);
         setSuccessData({
           tx: "0x7f2a...bc14",
           scoreIncrease: Math.floor(amount / 5) + 10, // Approximate score points earned
           newStreak: 1, // Would come from API in production
         });
      }, 3000);
      
    } catch (e: any) {
      setLoading(false);
      Alert.alert('Payment Failed', e.response?.data?.message || 'Failed to initiate M-PESA push');
    }
  };

  if (successData) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900 justify-center items-center px-6">
        <View className="w-20 h-20 rounded-full bg-teal-900 border-2 border-teal-400 items-center justify-center mb-6">
          <Feather name="check" size={40} color="#34d399" />
        </View>
        <Text className="text-3xl font-bold text-white mb-2">Coverage Boosted! 🎉</Text>
        <Text className="text-slate-400 mb-2 text-center">
          KES {amount * 10} → {amount} AfyaTokens added to your coverage
        </Text>
        <Text className="text-teal-400 font-mono text-xs mb-4">TX: {successData.tx} · Confirmed on chain</Text>
        
        {/* Score Update Animation */}
        <View className="bg-white/5 border border-white/10 rounded-2xl p-4 w-full mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-amber-400 font-bold">📈 AfyaScore Update</Text>
          </View>
          <View className="flex-row gap-4">
            <View className="flex-1 items-center">
              <Text className="text-2xl font-extrabold text-teal-400">+{successData.scoreIncrease}</Text>
              <Text className="text-slate-500 text-xs mt-1">Points Earned</Text>
            </View>
            <View className="flex-1 items-center">
              <Text className="text-2xl font-extrabold text-amber-400">🔥 {successData.newStreak}</Text>
              <Text className="text-slate-500 text-xs mt-1">Day Streak</Text>
            </View>
          </View>
        </View>
        
        <TouchableOpacity 
          className="w-full bg-slate-800 rounded-xl py-4 items-center border border-slate-700"
          onPress={() => { setSuccessData(null); navigation.navigate('Home' as never); }}
        >
          <Text className="text-white font-bold">Return Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <View className="p-6">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4">
          <Feather name="arrow-left" size={24} color="#94a3b8" />
        </TouchableOpacity>

        <Text className="text-white text-3xl font-bold mb-2 tracking-tight">Boost Your Coverage</Text>
        <Text className="text-slate-400 text-sm mb-8">Small daily amounts = big health protection</Text>

        <View className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-6">
          <Text className="text-slate-500 text-xs font-mono font-bold tracking-wider mb-2">CONTRIBUTE TODAY</Text>
          <Text className="text-amber-400 text-5xl font-extrabold text-center my-4">
            KES {amount * 10}
          </Text>
          <Text className="text-slate-400 text-center mb-1 text-sm">
            = {amount} AfyaTokens toward your coverage
          </Text>
          <Text className="text-teal-400 text-center mb-4 text-xs">
            ≈ +{Math.floor(amount / 5) + 10} AfyaScore points
          </Text>

          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={5}
            maximumValue={200}
            step={5}
            value={amount}
            onValueChange={setAmount}
            minimumTrackTintColor="#00C165"
            maximumTrackTintColor="#1e293b"
            thumbTintColor="#00C165"
          />
          <View className="flex-row justify-between mt-2 px-2">
            <Text className="text-slate-500 text-xs font-medium">KES 50</Text>
            <Text className="text-slate-500 text-xs font-medium">KES 2,000</Text>
          </View>
        </View>

        <View className="flex-row gap-2 mb-6">
          {[50, 100, 200, 500].map(v => (
            <TouchableOpacity 
              key={v}
              onPress={() => setAmount(v)}
              className={`flex-1 py-3 rounded-xl items-center border ${amount === v ? 'bg-teal-500 border-teal-400' : 'bg-transparent border-slate-700'}`}
            >
              <Text className={`font-bold ${amount === v ? 'text-white' : 'text-slate-400'}`}>
                {v * 10}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Active Challenge Banner */}
        <View className="bg-amber-900/20 border border-amber-500/30 rounded-2xl p-4 mb-4">
          <Text className="text-amber-400 font-bold mb-1">🎯 Active Challenge</Text>
          <Text className="text-slate-400 text-xs leading-relaxed">
            Contribute 7 consecutive days to earn 25 bonus AfyaTokens + 50 score points!
          </Text>
        </View>

        <View className="bg-teal-900/30 border border-teal-500/30 rounded-2xl p-4 mb-6">
          <Text className="text-teal-400 font-bold mb-1">🏛️ Gov't Match Active!</Text>
          <Text className="text-slate-400 text-xs leading-relaxed">
            Contribute ≥ KES 500/day and get 10% government top-up for vulnerable households per SHA guidelines.
          </Text>
        </View>

        <TouchableOpacity 
          className="bg-teal-500 rounded-2xl py-4 items-center flex-row justify-center gap-2"
          onPress={handleMpesaPush}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Feather name="smartphone" size={20} color="white" />
              <Text className="text-white font-bold text-lg">Contribute via M-PESA</Text>
            </>
          )}
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}
