import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { client } from '../../api/client';

interface Visit {
  id: string;
  facilityName: string;
  facilityCode: string;
  county: string;
  coverageActive: boolean;
  tier: string;
  date: string;
}

const TIER_COLORS: Record<string, string> = {
  BRONZE: '#CD7F32',
  SILVER: '#C0C0C0',
  GOLD: '#FFD700',
  PLATINUM: '#00C165',
};

export default function VisitHistoryScreen() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVisits = async () => {
    setLoading(true);
    try {
      const res = await client.get('/coverage/history');
      setVisits(res.data.data || []);
    } catch (e) {
      console.error('Failed to load visit history:', e);
      setVisits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVisits(); }, []);

  const renderItem = ({ item }: { item: Visit }) => {
    const tierColor = TIER_COLORS[item.tier] || TIER_COLORS.BRONZE;
    return (
      <View className="bg-white/5 border border-white/10 p-4 rounded-2xl mb-4 mx-6">
        <View className="flex-row justify-between mb-2">
          <View className="flex-1 pr-4">
            <Text className="font-bold text-white text-base">{item.facilityName}</Text>
            <Text className="text-slate-500 text-xs mt-1">{item.county} · MFL: {item.facilityCode}</Text>
          </View>
          <View className={`px-2 py-1 rounded-md self-start ${item.coverageActive ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
            <Text className={`text-xs font-bold ${item.coverageActive ? 'text-emerald-400' : 'text-red-400'}`}>
              {item.coverageActive ? 'Covered ✓' : 'Not Covered'}
            </Text>
          </View>
        </View>
        <View className="flex-row justify-between items-center">
          <Text className="text-slate-500 text-xs font-mono">
            {new Date(item.date).toLocaleDateString('en-KE', { dateStyle: 'medium' })}
          </Text>
          <View className="flex-row items-center gap-x-2">
            <View className="px-2 py-1 rounded-md" style={{ backgroundColor: tierColor + '1A' }}>
              <Text className="text-xs font-bold" style={{ color: tierColor }}>
                {item.tier.charAt(0) + item.tier.slice(1).toLowerCase()} Tier
              </Text>
            </View>
          </View>
        </View>
        {/* Privacy: No payment amounts shown — only coverage verification status */}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <View className="px-6 pt-6 pb-4">
        <Text className="text-white text-3xl font-bold tracking-tight">Visit History</Text>
        <Text className="text-slate-400 mt-1">Your facility visits with coverage verification</Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#00C165" />
        </View>
      ) : (
        <FlatList
          data={visits}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchVisits} tintColor="#00C165" />}
          ListEmptyComponent={
            <View className="py-20 items-center">
              <Text className="text-slate-500 text-base">No facility visits recorded yet.</Text>
              <Text className="text-slate-600 text-xs mt-2">Present your QR code at any SHA-accredited facility</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
