import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useAuthStore } from '../../store/auth';
import { client } from '../../api/client';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface CoverageData {
  coverageActive: boolean;
  coverageStatus: string;
  tokenBalance: number;
  tier: string;
  score: number;
  streakDays: number;
}

interface AfyaScoreData {
  score: number;
  tier: string;
  tierLabel: string;
  tierColor: string;
  streakDays: number;
  longestStreak: number;
  totalContributions: number;
  challengesCompleted: number;
  perks: string[];
  nextTier: {
    tier: string;
    label: string;
    pointsNeeded: number;
  } | null;
}

const TIER_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  BRONZE:   { bg: '#3D2B1E', text: '#CD7F32', border: '#8B5E3C', glow: 'rgba(205,127,50,0.15)' },
  SILVER:   { bg: '#2A2D35', text: '#C0C0C0', border: '#808080', glow: 'rgba(192,192,192,0.15)' },
  GOLD:     { bg: '#3D3520', text: '#FFD700', border: '#DAA520', glow: 'rgba(255,215,0,0.15)' },
  PLATINUM: { bg: '#0D2818', text: '#00C165', border: '#00A555', glow: 'rgba(0,193,101,0.15)' },
};

export default function HomeScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation<any>();
  const [coverage, setCoverage] = useState<CoverageData | null>(null);
  const [afyaScore, setAfyaScore] = useState<AfyaScoreData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [coverageRes, scoreRes] = await Promise.all([
        client.get('/wallet/coverage-status'),
        client.get('/afyascore'),
      ]);
      setCoverage(coverageRes.data.data);
      setAfyaScore(scoreRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const tier = afyaScore?.tier || coverage?.tier || 'BRONZE';
  const tierStyle = TIER_COLORS[tier] || TIER_COLORS.BRONZE;
  const score = afyaScore?.score || coverage?.score || 0;
  const streakDays = afyaScore?.streakDays || coverage?.streakDays || 0;
  const coverageActive = coverage?.coverageActive ?? false;

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView 
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} tintColor="#00C165" />}
      >
        
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-slate-400 text-sm font-medium">Habari, {user?.name || 'Citizen'} 👋</Text>
            <Text className="text-white text-2xl font-bold tracking-tight">Afya Yako</Text>
          </View>
          <View className="relative">
            <View className="w-10 h-10 rounded-full bg-teal-800 items-center justify-center">
              <Feather name="bell" size={18} color="white" />
            </View>
            <View className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900" />
          </View>
        </View>

        {/* Coverage Status Card */}
        <View
          className="rounded-3xl p-6 mb-6 overflow-hidden relative"
          style={{ backgroundColor: tierStyle.bg, borderWidth: 1, borderColor: tierStyle.border }}
        >
          {/* Coverage Badge */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <View
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: coverageActive ? '#00C165' : '#E74C3C' }}
              />
              <Text className="text-xs font-bold tracking-wider" style={{ color: coverageActive ? '#00C165' : '#E74C3C' }}>
                {coverageActive ? 'SHIF COVERAGE ACTIVE' : 'COVERAGE LAPSED'}
              </Text>
            </View>
            <View className="px-3 py-1 rounded-full" style={{ backgroundColor: tierStyle.glow, borderWidth: 1, borderColor: tierStyle.border }}>
              <Text className="text-xs font-bold" style={{ color: tierStyle.text }}>
                {afyaScore?.tierLabel || 'Bronze'} Tier
              </Text>
            </View>
          </View>

          {/* AfyaScore Display */}
          <Text className="text-white/60 text-xs font-bold tracking-wider mb-1">YOUR AFYA SCORE</Text>
          <View className="flex-row items-end gap-2 mb-1">
            <Text className="text-white text-5xl font-extrabold">{score}</Text>
            <Text className="text-white/40 text-lg font-bold mb-1">/ 1000</Text>
          </View>

          {/* Score Progress Bar */}
          <View className="h-2 rounded-full bg-white/10 mb-4">
            <View
              className="h-2 rounded-full"
              style={{ width: `${(score / 1000) * 100}%`, backgroundColor: tierStyle.text }}
            />
          </View>

          {/* Next Tier Info */}
          {afyaScore?.nextTier && (
            <Text className="text-white/50 text-xs mb-4">
              {afyaScore.nextTier.pointsNeeded} points to {afyaScore.nextTier.label} tier
            </Text>
          )}

          {/* Streak + Token Balance */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1 bg-white/10 rounded-xl py-3 px-4 border border-white/10">
              <Text className="text-white/60 text-xs font-bold mb-1">🔥 STREAK</Text>
              <Text className="text-amber-400 text-lg font-extrabold">{streakDays} Days</Text>
            </View>
            <View className="flex-1 bg-white/10 rounded-xl py-3 px-4 border border-white/10">
              <Text className="text-white/60 text-xs font-bold mb-1">💎 TOKENS</Text>
              <Text className="font-extrabold text-lg" style={{ color: tierStyle.text }}>
                {coverage?.tokenBalance?.toLocaleString() || '0'} AFYA
              </Text>
            </View>
          </View>

          <View className="flex-row gap-3">
            <TouchableOpacity 
              className="flex-1 bg-white/10 rounded-xl py-3 items-center border border-white/20"
              onPress={() => navigation.navigate('Contribute' as never)}
            >
              <Text className="text-white font-bold tracking-wide">+ Contribute</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-transparent rounded-xl py-3 items-center border border-white/20"
              onPress={() => navigation.navigate('Coverage' as never)}
            >
              <Text className="text-white/80 font-bold tracking-wide">My Coverage</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Stats */}
        <View className="flex-row flex-wrap justify-between mb-4">
          <View className="w-[48%] bg-white/5 border border-white/10 rounded-2xl p-4 mb-3">
            <Text className="text-slate-500 text-xs font-bold mb-1">Cover Level</Text>
            <Text className="text-teal-400 text-sm font-semibold">
              {tier === 'GOLD' || tier === 'PLATINUM' ? 'Full + Dental' : 'Primary + Emerg.'}
            </Text>
          </View>
          <View className="w-[48%] bg-white/5 border border-white/10 rounded-2xl p-4 mb-3">
            <Text className="text-slate-500 text-xs font-bold mb-1">Best Streak</Text>
            <Text className="text-amber-400 text-sm font-semibold">{afyaScore?.longestStreak || 0} Days 🏆</Text>
          </View>
          <View className="w-[48%] bg-white/5 border border-white/10 rounded-2xl p-4 mb-3">
            <Text className="text-slate-500 text-xs font-bold mb-1">Total Contributed</Text>
            <Text className="text-amber-500 text-sm font-semibold">
              KES {afyaScore?.totalContributions?.toLocaleString() || '0'}
            </Text>
          </View>
          <View className="w-[48%] bg-white/5 border border-white/10 rounded-2xl p-4 mb-3">
            <Text className="text-slate-500 text-xs font-bold mb-1">SHA Status</Text>
            <Text className="text-teal-400 text-sm font-semibold">
              {coverageActive ? 'Active ✓' : 'Contribute to activate'}
            </Text>
          </View>
        </View>

        {/* Auto-Deduct Widget Banner */}
        <TouchableOpacity 
          className="bg-gradient-to-r from-teal-900 to-slate-800 border border-teal-500/30 rounded-2xl p-5 mb-4 shadow-lg shadow-teal-900/20"
          onPress={() => navigation.navigate('AutoDeduct' as never)}
        >
          <View className="flex-row items-center gap-4">
            <View className="w-12 h-12 bg-teal-500/20 rounded-2xl items-center justify-center border border-teal-500/40">
              <Feather name="zap" size={24} color="#34D399" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-base font-bold mb-1">M-PESA Auto-Deduct</Text>
              <Text className="text-teal-100/70 text-xs leading-relaxed">
                Automatically add to your SHIF cover when you pay for goods & services.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#34D399" />
          </View>
        </TouchableOpacity>

        {/* Tier Perks Preview */}
        {afyaScore?.perks && (
          <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
            <Text className="text-xs font-bold tracking-wider mb-3" style={{ color: tierStyle.text }}>
              {afyaScore.tierLabel?.toUpperCase()} TIER BENEFITS
            </Text>
            {afyaScore.perks.slice(0, 3).map((perk, idx) => (
              <View key={idx} className="flex-row items-center gap-2 mb-2">
                <Text style={{ color: tierStyle.text }}>✓</Text>
                <Text className="text-slate-300 text-sm">{perk}</Text>
              </View>
            ))}
          </View>
        )}

        {/* USSD Banner */}
        <View className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex-row items-center gap-3 mb-6">
          <View className="w-10 h-10 bg-amber-500/20 rounded-xl items-center justify-center">
            <Feather name="phone-call" size={18} color="#fbbf24" />
          </View>
          <View>
            <Text className="text-amber-400 text-sm font-bold">No internet? No problem.</Text>
            <Text className="text-slate-400 text-xs mt-1">Dial *384# for USSD access</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
