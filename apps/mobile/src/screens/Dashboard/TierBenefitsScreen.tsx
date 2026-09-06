import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { client } from '../../api/client';

interface TierData {
  tier: string;
  minStreak: number;
  label: string;
  color: string;
  facilities: string;
  perks: string[];
}

const TIERS: TierData[] = [
  {
    tier: 'SILVER',
    minStreak: 30,
    label: 'Silver',
    color: '#C0C0C0',
    facilities: 'LEVEL 2 & 3 FACILITIES',
    perks: [
      'Monthly BP & blood sugar check',
      'Annual HIV & TB screening',
      'Nutrition counselling (1×/quarter)',
      'Family planning consultations',
      'Eye vision screening (1×/year)',
      'Maternal health check-ups',
    ],
  },
  {
    tier: 'GOLD',
    minStreak: 90,
    label: 'Gold',
    color: '#FFD700',
    facilities: 'LEVEL 2 & 3 FACILITIES',
    perks: [
      'All Silver benefits, PLUS:',
      'Cancer screening: cervical, breast & prostate',
      'Dental cleaning & oral health check',
      'Mental health screening (1×/6 months)',
      'Diabetes & kidney function panel',
      'Child immunisation schedule tracking',
    ],
  },
  {
    tier: 'PLATINUM',
    minStreak: 180,
    label: 'Platinum',
    color: '#00C165',
    facilities: 'LEVEL 4 & 5 HOSPITALS',
    perks: [
      'All Gold benefits, PLUS:',
      'Specialist consultations (1×/quarter)',
      'Comprehensive annual blood panel',
      'Diagnostic imaging when clinically indicated',
      'Full family cover (spouse + 2 children)',
      'Priority booking at Level 4 & 5 hospitals',
    ],
  },
];

export default function TierBenefitsScreen() {
  const navigation = useNavigation<any>();
  const [streakDays, setStreakDays] = useState(0);
  const [currentTier, setCurrentTier] = useState('BRONZE');
  const [loading, setLoading] = useState(true);

  const fetchScoreData = async () => {
    try {
      const res = await client.get('/afyascore');
      setStreakDays(res.data.data.streakDays || 0);
      setCurrentTier(res.data.data.tier || 'BRONZE');
    } catch (e) {
      console.warn('Failed to load tier data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScoreData();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      {/* Header */}
      <View className="px-6 pt-6 pb-3 flex-row items-center justify-between border-b border-white/10">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 bg-white/5 rounded-full items-center justify-center">
            <Feather name="arrow-left" size={20} color="white" />
          </TouchableOpacity>
          <View>
            <Text className="text-white text-xl font-bold">Tiered Benefits</Text>
            <Text className="text-slate-400 text-xs">SHA-Partnered Preventive Packages</Text>
          </View>
        </View>
        <View className="bg-amber-500/20 px-3 py-1.5 rounded-full border border-amber-500/30 flex-row items-center gap-1.5">
          <Text className="text-amber-400 font-bold text-xs">🔥 {streakDays}d Streak</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchScoreData} tintColor="#00C165" />}
      >
        {/* Banner */}
        <View className="bg-gradient-to-br from-teal-950 to-slate-900 border border-teal-500/30 rounded-3xl p-5 mb-6">
          <View className="flex-row items-center gap-2 mb-2">
            <Feather name="award" size={20} color="#34D399" />
            <Text className="text-teal-400 font-bold text-base">Your Contribution Streak</Text>
          </View>
          <Text className="text-slate-300 text-xs leading-relaxed mb-4">
            Each day you contribute KES 30 adds to your streak. Streaks unlock Silver, Gold, and Platinum preventive packages.
            Missing a day pauses (does not reset) your streak.
          </Text>

          {/* Streak Progress Bar */}
          <View className="bg-black/30 p-3 rounded-2xl">
            <View className="flex-row justify-between mb-1.5">
              <Text className="text-slate-400 text-xs font-medium">Current: {streakDays} days</Text>
              <Text className="text-teal-400 text-xs font-bold">
                {streakDays < 30 ? `${30 - streakDays}d to Silver` : streakDays < 90 ? `${90 - streakDays}d to Gold` : streakDays < 180 ? `${180 - streakDays}d to Platinum` : 'Top Platinum Achieved! 🏆'}
              </Text>
            </View>
            <View className="h-2.5 rounded-full bg-white/10 overflow-hidden">
              <View
                className="h-full bg-teal-400 rounded-full"
                style={{ width: `${Math.min(100, (streakDays / 180) * 100)}%` }}
              />
            </View>
            <View className="flex-row justify-between mt-2">
              <Text className="text-slate-500 text-[10px]">0d (Bronze)</Text>
              <Text className="text-slate-400 text-[10px]">30d (Silver)</Text>
              <Text className="text-amber-400 text-[10px]">90d (Gold)</Text>
              <Text className="text-emerald-400 text-[10px]">180d (Platinum)</Text>
            </View>
          </View>
        </View>

        {/* Tier Cards matching Infographic */}
        <Text className="text-white font-bold text-lg mb-4">Preventive Packages</Text>

        {TIERS.map((t) => {
          const isUnlocked = streakDays >= t.minStreak;
          const isCurrent = currentTier === t.tier;

          return (
            <View
              key={t.tier}
              className={`rounded-3xl p-5 mb-5 border ${
                isUnlocked
                  ? 'bg-white/5 border-teal-500/40 shadow-lg'
                  : 'bg-white/[0.02] border-white/10 opacity-75'
              }`}
            >
              {/* Card Header */}
              <View className="flex-row justify-between items-start mb-3">
                <View>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-white text-xl font-extrabold">{t.label}</Text>
                    {isUnlocked && (
                      <View className="bg-teal-500/20 px-2 py-0.5 rounded-md border border-teal-500/30">
                        <Text className="text-teal-400 text-[10px] font-bold">UNLOCKED ✓</Text>
                      </View>
                    )}
                    {isCurrent && (
                      <View className="bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30">
                        <Text className="text-amber-400 text-[10px] font-bold">ACTIVE TIER</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-teal-400 text-xs font-mono font-bold mt-1">{t.facilities}</Text>
                </View>

                <View className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                  <Text className="text-amber-400 font-extrabold text-xs">{t.minStreak}-Day Streak</Text>
                </View>
              </View>

              {/* Perks List */}
              <View className="pt-2 border-t border-white/10">
                {t.perks.map((perk, idx) => (
                  <View key={idx} className="flex-row items-start gap-2 mb-2">
                    <Text className={isUnlocked ? 'text-teal-400' : 'text-slate-600'} style={{ marginTop: 1 }}>
                      {isUnlocked ? '▸' : '🔒'}
                    </Text>
                    <Text className={`text-xs flex-1 ${isUnlocked ? 'text-slate-200' : 'text-slate-500'}`}>
                      {perk}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        {/* Healthcare Access At Facility Info */}
        <View className="bg-teal-950/40 border border-teal-500/20 rounded-3xl p-5 mb-4">
          <View className="flex-row items-center gap-2 mb-2">
            <Feather name="plus-circle" size={18} color="#34D399" />
            <Text className="text-teal-400 font-bold text-sm">Curative Care — Always Free</Text>
          </View>
          <Text className="text-slate-300 text-xs leading-relaxed mb-3">
            Under the UHC Walk-In Walk-Out policy, curative treatment is provided at any SHA-accredited public facility regardless of tier.
            No cash payment is required at the point of care.
          </Text>
          <View className="bg-black/20 p-3 rounded-xl">
            <Text className="text-slate-400 text-[11px] leading-relaxed">
              ✓ Valid for any active SHIF member{'\n'}
              ✓ AI claims auto-cleared in under 3 seconds{'\n'}
              ✓ Vaccines are free and not duplicated here
            </Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
