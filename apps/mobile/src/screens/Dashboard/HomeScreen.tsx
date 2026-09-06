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
  streakDays: number;
}

interface AfyaScoreData {
  tier: string;
  tierLabel: string;
  tierColor: string;
  tierFacilities: string;
  streakDays: number;
  longestStreak: number;
  totalContributions: number;
  perks: string[];
  nextTier: {
    tier: string;
    label: string;
    facilities: string;
    streakRequired: number;
    streakNeeded: number;
    perks: string[];
  } | null;
}

const TIER_STYLES: Record<string, { bg: string; text: string; border: string; glow: string; facilities: string }> = {
  BRONZE:   { bg: '#3D2B1E', text: '#CD7F32', border: '#8B5E3C', glow: 'rgba(205,127,50,0.15)', facilities: 'Level 1 & 2 Facilities' },
  SILVER:   { bg: '#2A2D35', text: '#C0C0C0', border: '#808080', glow: 'rgba(192,192,192,0.15)', facilities: 'Level 2 & 3 Facilities' },
  GOLD:     { bg: '#3D3520', text: '#FFD700', border: '#DAA520', glow: 'rgba(255,215,0,0.15)', facilities: 'Level 2 & 3 Facilities' },
  PLATINUM: { bg: '#0D2818', text: '#00C165', border: '#00A555', glow: 'rgba(0,193,101,0.15)', facilities: 'Level 4 & 5 Hospitals' },
};

export default function HomeScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation<any>();
  const [coverage, setCoverage] = useState<CoverageData | null>(null);
  const [afyaData, setAfyaData] = useState<AfyaScoreData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [coverageRes, scoreRes] = await Promise.all([
        client.get('/wallet/coverage-status'),
        client.get('/afyascore'),
      ]);
      setCoverage(coverageRes.data.data);
      setAfyaData(scoreRes.data.data);
    } catch (e) {
      console.error('Failed to fetch home screen data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const tier = afyaData?.tier || coverage?.tier || 'BRONZE';
  const tierStyle = TIER_STYLES[tier] || TIER_STYLES.BRONZE;
  const streakDays = afyaData?.streakDays ?? coverage?.streakDays ?? 0;
  const coverageActive = coverage?.coverageActive ?? false;

  // Streak progress calculation (0 to 180 days for full Platinum)
  const streakTarget = afyaData?.nextTier?.streakRequired || (streakDays < 30 ? 30 : streakDays < 90 ? 90 : 180);
  const streakProgressPercent = Math.min(100, Math.round((streakDays / streakTarget) * 100));

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView 
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
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

        {/* Coverage & Tier Streak Card */}
        <TouchableOpacity
          className="rounded-3xl p-6 mb-6 overflow-hidden relative"
          style={{ backgroundColor: tierStyle.bg, borderWidth: 1, borderColor: tierStyle.border }}
          onPress={() => navigation.navigate('TierBenefits' as never)}
          activeOpacity={0.9}
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
            <View className="px-3 py-1 rounded-full flex-row items-center gap-1" style={{ backgroundColor: tierStyle.glow, borderWidth: 1, borderColor: tierStyle.border }}>
              <Text className="text-xs font-bold" style={{ color: tierStyle.text }}>
                {afyaData?.tierLabel || 'Bronze'} Tier
              </Text>
              <Feather name="chevron-right" size={12} color={tierStyle.text} />
            </View>
          </View>

          {/* Facility Access Level */}
          <Text className="text-slate-300 text-xs font-mono font-bold tracking-wider mb-1">FACILITY ACCESS</Text>
          <Text className="text-white text-2xl font-extrabold mb-3">
            {tierStyle.facilities}
          </Text>

          {/* Streak Display & Progress */}
          <View className="bg-black/30 p-4 rounded-2xl mb-4 border border-white/10">
            <View className="flex-row justify-between items-baseline mb-2">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-amber-400 text-lg">🔥</Text>
                <Text className="text-white text-xl font-extrabold">{streakDays} Day Streak</Text>
              </View>
              <Text className="text-slate-400 text-xs font-medium">
                {afyaData?.nextTier ? `${afyaData.nextTier.streakNeeded}d to ${afyaData.nextTier.label}` : 'Max Tier Unlocked'}
              </Text>
            </View>

            {/* Streak Progress Bar */}
            <View className="h-2 rounded-full bg-white/10 overflow-hidden mb-2">
              <View
                className="h-full rounded-full"
                style={{ width: `${streakProgressPercent}%`, backgroundColor: tierStyle.text }}
              />
            </View>

            <View className="flex-row justify-between">
              <Text className="text-slate-500 text-[10px]">Silver: 30d</Text>
              <Text className="text-slate-400 text-[10px]">Gold: 90d</Text>
              <Text className="text-emerald-400 text-[10px]">Platinum: 180d</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3">
            <TouchableOpacity 
              className="flex-1 bg-teal-500 rounded-xl py-3 items-center"
              onPress={() => navigation.navigate('Contribute' as never)}
            >
              <Text className="text-white font-bold tracking-wide">+ Contribute KES 30</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-white/10 rounded-xl py-3 items-center border border-white/20"
              onPress={() => navigation.navigate('TierBenefits' as never)}
            >
              <Text className="text-white/90 font-bold tracking-wide">View Packages</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* Quick Stats Grid */}
        <View className="flex-row flex-wrap justify-between mb-4">
          <View className="w-[48%] bg-white/5 border border-white/10 rounded-2xl p-4 mb-3">
            <Text className="text-slate-500 text-xs font-bold mb-1">Preventive Tier</Text>
            <Text className="text-teal-400 text-sm font-semibold">
              {afyaData?.tierLabel || 'Bronze'} Package
            </Text>
          </View>
          <View className="w-[48%] bg-white/5 border border-white/10 rounded-2xl p-4 mb-3">
            <Text className="text-slate-500 text-xs font-bold mb-1">All-Time Best</Text>
            <Text className="text-amber-400 text-sm font-semibold">{afyaData?.longestStreak || streakDays} Days 🏆</Text>
          </View>
          <View className="w-[48%] bg-white/5 border border-white/10 rounded-2xl p-4 mb-3">
            <Text className="text-slate-500 text-xs font-bold mb-1">Total Contributed</Text>
            <Text className="text-amber-500 text-sm font-semibold">
              KES {afyaData?.totalContributions?.toLocaleString() || '0'}
            </Text>
          </View>
          <View className="w-[48%] bg-white/5 border border-white/10 rounded-2xl p-4 mb-3">
            <Text className="text-slate-500 text-xs font-bold mb-1">SHA Paybill</Text>
            <Text className="text-teal-400 text-sm font-semibold">
              200222 (Direct)
            </Text>
          </View>
        </View>

        {/* Auto-Deduct Banner */}
        <TouchableOpacity 
          className="bg-gradient-to-r from-teal-950 to-slate-800 border border-teal-500/30 rounded-2xl p-5 mb-4 shadow-lg shadow-teal-900/20"
          onPress={() => navigation.navigate('AutoDeduct' as never)}
        >
          <View className="flex-row items-center gap-4">
            <View className="w-12 h-12 bg-teal-500/20 rounded-2xl items-center justify-center border border-teal-500/40">
              <Feather name="zap" size={24} color="#34D399" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-base font-bold mb-1">M-PESA Auto-Deduct</Text>
              <Text className="text-teal-100/70 text-xs leading-relaxed">
                Fixed KES 30/day SHIF contribution on your first merchant transaction above KES 100.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#34D399" />
          </View>
        </TouchableOpacity>

        {/* Tier Benefits Preview */}
        {afyaData?.perks && (
          <TouchableOpacity 
            className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4"
            onPress={() => navigation.navigate('TierBenefits' as never)}
            activeOpacity={0.8}
          >
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-xs font-bold tracking-wider" style={{ color: tierStyle.text }}>
                {afyaData.tierLabel?.toUpperCase()} PREVENTIVE BENEFITS
              </Text>
              <Text className="text-teal-400 text-xs font-bold">See All →</Text>
            </View>
            {afyaData.perks.slice(0, 3).map((perk, idx) => (
              <View key={idx} className="flex-row items-center gap-2 mb-2">
                <Text style={{ color: tierStyle.text }}>✓</Text>
                <Text className="text-slate-300 text-sm">{perk}</Text>
              </View>
            ))}
          </TouchableOpacity>
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
