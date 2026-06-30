import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { useAuthStore } from '../../store/auth';
import { client } from '../../api/client';
import { Feather } from '@expo/vector-icons';

interface CoverageQR {
  qrString: string;
  expiresIn: number;
  patientName: string;
  coverageActive: boolean;
  tier: string;
  tierLabel: string;
  score: number;
  streakDays: number;
}

interface CoverageStatus {
  coverageActive: boolean;
  coverageStatus: string;
  tier: string;
  score: number;
  streakDays: number;
  tokenBalance: number;
  matchEarned: number;
  coverTypes: string[];
  coveredServices: string[];
  daysUntilLapse: number;
  recentVisits: Array<{
    facilityName: string;
    facilityCode: string;
    coverageVerified: boolean;
    tier: string;
    date: string;
  }>;
}

const TIER_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  BRONZE:   { bg: '#3D2B1E', text: '#CD7F32', accent: 'rgba(205,127,50,0.2)' },
  SILVER:   { bg: '#2A2D35', text: '#C0C0C0', accent: 'rgba(192,192,192,0.2)' },
  GOLD:     { bg: '#3D3520', text: '#FFD700', accent: 'rgba(255,215,0,0.2)' },
  PLATINUM: { bg: '#0D2818', text: '#00C165', accent: 'rgba(0,193,101,0.2)' },
};

export default function CoverageScreen() {
  const { user } = useAuthStore();
  const [qrData, setQrData] = useState<CoverageQR | null>(null);
  const [coverageData, setCoverageData] = useState<CoverageStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrExpiry, setQrExpiry] = useState(0);
  const [activeTab, setActiveTab] = useState<'qr' | 'details'>('qr');

  const fetchData = useCallback(async () => {
    try {
      const [qrRes, statusRes] = await Promise.all([
        client.get('/coverage/qr'),
        client.get('/coverage/status'),
      ]);
      setQrData(qrRes.data.data);
      setCoverageData(statusRes.data.data);
      setQrExpiry(qrRes.data.data.expiresIn);
    } catch (e) {
      console.error('Failed to fetch coverage data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // QR expiry countdown
  useEffect(() => {
    if (qrExpiry <= 0) return;
    const timer = setInterval(() => {
      setQrExpiry(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [qrExpiry]);

  const tier = qrData?.tier || coverageData?.tier || 'BRONZE';
  const tierStyle = TIER_COLORS[tier] || TIER_COLORS.BRONZE;
  const isActive = qrData?.coverageActive ?? coverageData?.coverageActive ?? false;

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#00C165" />
        <Text className="text-slate-500 mt-4 font-mono text-xs">Loading coverage...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} tintColor="#00C165" />}
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-slate-500 font-medium">Hello, {user?.email || 'Citizen'}</Text>
            <Text className="text-white text-2xl font-bold">My Coverage</Text>
          </View>
          <View
            className="px-3 py-1 rounded-full"
            style={{ backgroundColor: tierStyle.accent, borderWidth: 1, borderColor: tierStyle.text }}
          >
            <Text className="text-xs font-bold" style={{ color: tierStyle.text }}>
              {qrData?.tierLabel || 'Bronze'} Tier
            </Text>
          </View>
        </View>

        {/* Tab Switcher */}
        <View className="flex-row bg-white/5 border border-white/10 rounded-2xl p-1 mb-6">
          <TouchableOpacity
            className={`flex-1 py-3 rounded-xl items-center ${activeTab === 'qr' ? 'bg-teal-500' : ''}`}
            onPress={() => setActiveTab('qr')}
          >
            <Text className={`font-bold ${activeTab === 'qr' ? 'text-white' : 'text-slate-400'}`}>
              QR Coverage Proof
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-3 rounded-xl items-center ${activeTab === 'details' ? 'bg-teal-500' : ''}`}
            onPress={() => setActiveTab('details')}
          >
            <Text className={`font-bold ${activeTab === 'details' ? 'text-white' : 'text-slate-400'}`}>
              Coverage Details
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'qr' ? (
          <>
            {/* QR Code Card */}
            <View
              className="rounded-3xl p-6 mb-6 items-center"
              style={{ backgroundColor: tierStyle.bg, borderWidth: 1, borderColor: tierStyle.text + '40' }}
            >
              {/* Coverage Status */}
              <View className="flex-row items-center gap-2 mb-4">
                <View
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: isActive ? '#00C165' : '#E74C3C' }}
                />
                <Text className="font-bold" style={{ color: isActive ? '#00C165' : '#E74C3C' }}>
                  {isActive ? '✅ SHIF Coverage Active' : '❌ Coverage Lapsed'}
                </Text>
              </View>

              {/* QR Code Area */}
              <View className="w-48 h-48 bg-white rounded-2xl items-center justify-center mb-4">
                {/* In production, this renders an actual QR code from qrData.qrString */}
                <View className="items-center">
                  <Feather name="maximize" size={64} color="#0A0F1E" />
                  <Text className="text-xs text-slate-600 mt-2 font-mono text-center">
                    {qrData?.qrString?.substring(0, 20) || 'QR'}...
                  </Text>
                </View>
              </View>

              <Text className="text-white font-bold text-lg mb-1">{qrData?.patientName || user?.name}</Text>
              <Text className="text-xs font-mono mb-4" style={{ color: tierStyle.text }}>
                AfyaScore: {qrData?.score || 0} · {qrData?.tierLabel} Tier
              </Text>

              {/* QR Expiry */}
              <View className="flex-row items-center gap-2 mb-4">
                <Feather name="clock" size={14} color={qrExpiry > 60 ? '#00C165' : '#E74C3C'} />
                <Text className="text-xs" style={{ color: qrExpiry > 60 ? '#00C165' : '#E74C3C' }}>
                  {qrExpiry > 0
                    ? `Expires in ${Math.floor(qrExpiry / 60)}:${String(qrExpiry % 60).padStart(2, '0')}`
                    : 'QR expired — refresh to generate new one'
                  }
                </Text>
              </View>

              {/* Refresh QR button */}
              <TouchableOpacity
                className="bg-white/10 rounded-xl py-3 px-6 flex-row items-center gap-2 border border-white/20"
                onPress={fetchData}
              >
                <Feather name="refresh-cw" size={16} color="white" />
                <Text className="text-white font-bold">Generate New QR</Text>
              </TouchableOpacity>
            </View>

            {/* Usage Instructions */}
            <View className="bg-teal-900/20 border border-teal-500/20 rounded-2xl p-4 mb-6">
              <Text className="text-teal-400 font-bold mb-2">📱 How to use</Text>
              <Text className="text-slate-400 text-xs leading-relaxed">
                Present this QR code at any SHA-accredited facility. The facility scans it to verify your SHIF coverage status. No financial information is shared — only your coverage status and tier.
              </Text>
            </View>
          </>
        ) : (
          <>
            {/* Coverage Details Tab */}
            <View className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
              <Text className="text-teal-400 text-xs font-mono font-bold tracking-widest mb-4">COVERAGE DETAILS</Text>
              
              <View className="flex-row justify-between py-3 border-b border-white/10">
                <Text className="text-slate-400">Status</Text>
                <Text className="font-bold" style={{ color: isActive ? '#00C165' : '#E74C3C' }}>
                  {isActive ? 'Active' : 'Lapsed'}
                </Text>
              </View>
              <View className="flex-row justify-between py-3 border-b border-white/10">
                <Text className="text-slate-400">Tier</Text>
                <Text className="font-bold" style={{ color: tierStyle.text }}>{qrData?.tierLabel || 'Bronze'}</Text>
              </View>
              <View className="flex-row justify-between py-3 border-b border-white/10">
                <Text className="text-slate-400">AfyaScore</Text>
                <Text className="text-white font-bold">{coverageData?.score || 0} / 1000</Text>
              </View>
              <View className="flex-row justify-between py-3 border-b border-white/10">
                <Text className="text-slate-400">Streak</Text>
                <Text className="text-amber-400 font-bold">{coverageData?.streakDays || 0} days 🔥</Text>
              </View>
              <View className="flex-row justify-between py-3 border-b border-white/10">
                <Text className="text-slate-400">AfyaTokens</Text>
                <Text className="font-bold" style={{ color: tierStyle.text }}>
                  {coverageData?.tokenBalance?.toLocaleString() || 0} AFYA
                </Text>
              </View>
              <View className="flex-row justify-between py-3">
                <Text className="text-slate-400">Gov't Match Earned</Text>
                <Text className="text-teal-400 font-bold">{coverageData?.matchEarned || 0} AFYA</Text>
              </View>
            </View>

            {/* Covered Services */}
            <View className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
              <Text className="text-amber-400 text-xs font-mono font-bold tracking-widest mb-4">COVERED SERVICES</Text>
              {coverageData?.coveredServices?.map((service, idx) => (
                <View key={idx} className="flex-row items-center gap-2 mb-2">
                  <Text className="text-teal-400">✓</Text>
                  <Text className="text-slate-300 text-sm">{service}</Text>
                </View>
              )) || (
                <Text className="text-slate-500">Contribute to view covered services</Text>
              )}
            </View>

            {/* Recent Facility Visits */}
            {coverageData?.recentVisits && coverageData.recentVisits.length > 0 && (
              <View className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
                <Text className="text-slate-400 text-xs font-mono font-bold tracking-widest mb-4">RECENT VISITS</Text>
                {coverageData.recentVisits.map((visit, idx) => (
                  <View key={idx} className="flex-row justify-between py-3 border-b border-white/10">
                    <View>
                      <Text className="text-white font-bold text-sm">{visit.facilityName}</Text>
                      <Text className="text-slate-500 text-xs mt-1">
                        {new Date(visit.date).toLocaleDateString('en-KE', { dateStyle: 'medium' })}
                      </Text>
                    </View>
                    <View className={`px-2 py-1 rounded-md self-center ${visit.coverageVerified ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                      <Text className={`text-xs font-bold ${visit.coverageVerified ? 'text-emerald-400' : 'text-red-400'}`}>
                        {visit.coverageVerified ? 'Verified ✓' : 'Not verified'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
