import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, Switch, Alert, ScrollView, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { client } from '../../api/client';

export default function AutoDeductScreen() {
    const navigation = useNavigation<any>();
    const [optIn, setOptIn] = useState(false);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [status, setStatus] = useState<any>(null);

    const fetchStatus = async () => {
        try {
            const res = await client.get('/loyalty/auto-deduct/status');
            setStatus(res.data.data);
            setOptIn(res.data.data.autoDeductOptIn);
        } catch (error: any) {
            console.warn('Failed to fetch auto-deduct status', error?.response?.data || error?.message);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchStatus();
        setRefreshing(false);
    };

    const handleOptInToggle = async (val: boolean) => {
        if (!val) {
            Alert.alert(
                'Auto-Deduct Locked',
                'Auto-Deduct consent is required for automated SHIF participation and cannot be turned off directly from the app. Contact support if you need assistance.',
                [{ text: 'OK', style: 'default' }]
            );
            return;
        }

        Alert.alert(
            'KDPA Data & Payment Consent',
            'By consenting, you authorize AfyaToken to analyze your Lipa na M-PESA merchant payments. Your first transaction over KES 100 each day triggers a fixed KES 30 SHIF contribution routed directly to Paybill 200222 (Account: National ID). Only amounts are used; data is encrypted per KDPA 2019.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'I Agree', onPress: async () => submitOptIn(true) }
            ]
        );
    };

    const submitOptIn = async (val: boolean) => {
        setLoading(true);
        try {
            await client.post('/loyalty/auto-deduct/opt-in', { optIn: val });
            setOptIn(val);
            await fetchStatus();
        } catch (e: any) {
            Alert.alert('Error', 'Could not update your preferences. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const isDeductedToday = status?.isDeductedToday ?? false;
    const todayDeducted = status?.todayDeductedKES ?? 0;
    const recentLogs = status?.recentLogs ?? [];
    const shaPaybill = status?.shaPaybill || '200222';
    const shaAccount = status?.shaAccountNumber || 'National ID';

    return (
        <SafeAreaView className="flex-1 bg-slate-900">
            {/* Header */}
            <View className="px-6 pt-6 pb-2 flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 bg-white/5 rounded-full items-center justify-center">
                        <Feather name="arrow-left" size={20} color="white" />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-white text-xl font-bold">Smart Auto-Deduct</Text>
                        <Text className="text-slate-400 text-xs">M-PESA C2B & SHIF Bridge</Text>
                    </View>
                </View>
                <Switch 
                    value={optIn} 
                    onValueChange={handleOptInToggle} 
                    trackColor={{ false: '#334155', true: '#00C165' }}
                    thumbColor={optIn ? '#fff' : '#94A3B8'}
                    disabled={loading}
                />
            </View>

            <ScrollView 
                contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00C165" />}
            >
                {/* Hero Banner */}
                <View className="bg-gradient-to-br from-teal-950 to-slate-900 rounded-3xl p-6 mb-6 border border-teal-500/30 shadow-lg">
                    <View className="w-12 h-12 bg-teal-500/20 rounded-2xl items-center justify-center mb-4 border border-teal-500/40">
                        <Feather name="zap" size={24} color="#34D399" />
                    </View>
                    <Text className="text-white text-2xl font-bold mb-2">Fixed Daily SHIF Cover</Text>
                    <Text className="text-slate-300 text-sm leading-relaxed mb-5">
                        Whenever you pay a merchant via Lipa na M-PESA for any transaction above KES 100, a fixed daily deduction of KES 30 is automatically routed to your Social Health Authority (SHA) account.
                    </Text>

                    {/* Status Pill */}
                    <View className="flex-row justify-between bg-black/30 p-4 rounded-2xl border border-white/10 mb-4">
                        <View>
                            <Text className="text-slate-400 text-[10px] font-mono font-bold mb-1">TODAY'S SHIF STATUS</Text>
                            <View className="flex-row items-center gap-2">
                                <View className={`w-2.5 h-2.5 rounded-full ${isDeductedToday ? 'bg-teal-400' : 'bg-amber-400'}`} />
                                <Text className="text-white font-extrabold text-base">
                                    {isDeductedToday ? 'KES 30 Deducted ✓' : 'Pending First Purchase'}
                                </Text>
                            </View>
                            <Text className="text-slate-400 text-xs mt-1">
                                {isDeductedToday ? 'Daily cover satisfied for today' : 'Triggers on merchant tx > KES 100'}
                            </Text>
                        </View>
                        <View className="items-end justify-center">
                            <Text className="text-slate-400 text-[10px] font-mono font-bold mb-1">DAILY CAP</Text>
                            <Text className="text-teal-400 text-xl font-extrabold">KES 30</Text>
                            <Text className="text-slate-500 text-[10px]">1 deduction / day</Text>
                        </View>
                    </View>

                    {/* SHA Routing Card */}
                    <View className="bg-teal-900/20 border border-teal-500/30 rounded-2xl p-4">
                        <View className="flex-row items-center gap-2 mb-1">
                            <Feather name="shield" size={16} color="#34D399" />
                            <Text className="text-teal-400 font-bold text-xs">Direct SHA Routing</Text>
                        </View>
                        <Text className="text-slate-300 text-xs leading-relaxed">
                            Paybill: <Text className="text-white font-mono font-bold">{shaPaybill}</Text> · Account: <Text className="text-white font-mono font-bold">{shaAccount}</Text>
                        </Text>
                    </View>
                </View>

                {/* How It Works Section */}
                <Text className="text-white font-bold text-lg mb-4">How Auto-Deduct Works</Text>
                
                <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
                    <View className="flex-row items-start gap-3 mb-4 pb-3 border-b border-white/10">
                        <View className="w-8 h-8 rounded-xl bg-teal-500/20 items-center justify-center">
                            <Text className="text-teal-400 font-bold text-sm">1</Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-white font-bold text-sm mb-1">Spend Above KES 100 at Any Merchant</Text>
                            <Text className="text-slate-400 text-xs leading-relaxed">
                                Buy groceries, fuel, or medicine using standard Lipa na M-PESA C2B.
                            </Text>
                        </View>
                    </View>

                    <View className="flex-row items-start gap-3 mb-4 pb-3 border-b border-white/10">
                        <View className="w-8 h-8 rounded-xl bg-teal-500/20 items-center justify-center">
                            <Text className="text-teal-400 font-bold text-sm">2</Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-white font-bold text-sm mb-1">Receive Sequential Prompts</Text>
                            <Text className="text-slate-400 text-xs leading-relaxed">
                                You receive prompt #1 for the merchant amount, followed by prompt #2 for the KES 30 SHIF contribution.
                            </Text>
                        </View>
                    </View>

                    <View className="flex-row items-start gap-3">
                        <View className="w-8 h-8 rounded-xl bg-teal-500/20 items-center justify-center">
                            <Text className="text-teal-400 font-bold text-sm">3</Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-white font-bold text-sm mb-1">Instant SHA Credit & Streak Growth</Text>
                            <Text className="text-slate-400 text-xs leading-relaxed">
                                KES 30 is credited directly to your SHIF account, growing your streak toward Silver, Gold, or Platinum benefits.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Single Daily Deduction Notice */}
                <View className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-6 flex-row items-start gap-3">
                    <Feather name="check-circle" size={20} color="#FBBF24" style={{ marginTop: 2 }} />
                    <View className="flex-1">
                        <Text className="text-amber-400 font-bold mb-1">Once Per Day Limit</Text>
                        <Text className="text-slate-400 text-xs leading-relaxed">
                            AfyaToken never deducts more than KES 30 per calendar day, regardless of how many purchases you make.
                        </Text>
                    </View>
                </View>

                {/* View Tier Benefits CTA */}
                <TouchableOpacity
                    className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 flex-row items-center justify-between"
                    onPress={() => navigation.navigate('TierBenefits' as never)}
                >
                    <View className="flex-row items-center gap-3">
                        <Feather name="award" size={20} color="#34D399" />
                        <View>
                            <Text className="text-white font-bold text-sm">View Preventive Packages</Text>
                            <Text className="text-slate-400 text-xs">Silver (30d) · Gold (90d) · Platinum (180d)</Text>
                        </View>
                    </View>
                    <Feather name="chevron-right" size={18} color="#94A3B8" />
                </TouchableOpacity>

                {/* Recent Auto-Deductions */}
                {optIn && (
                    <View>
                        <Text className="text-white font-bold text-lg mb-4">Today's Transactions</Text>
                        {recentLogs.length > 0 ? (
                            recentLogs.map((log: any) => (
                                <View key={log.id} className="bg-white/5 border border-white/10 p-4 rounded-xl mb-3 flex-row justify-between items-center">
                                    <View className="flex-1 pr-2">
                                        <Text className="text-white font-medium mb-1">{log.tx}</Text>
                                        <Text className="text-slate-500 text-xs">{new Date(log.date).toLocaleString()} · Merchant: KES {log.originalAmt}</Text>
                                    </View>
                                    <View className="bg-teal-500/20 px-3 py-1.5 rounded-lg border border-teal-500/30">
                                        <Text className="text-teal-400 font-bold text-xs">+ KES {log.deducted} SHIF</Text>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <Text className="text-slate-500 text-sm">No auto-deductions recorded yet today. Your first purchase over KES 100 will appear here.</Text>
                        )}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
