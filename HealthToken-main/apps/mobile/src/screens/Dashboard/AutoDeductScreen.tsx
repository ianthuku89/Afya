import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, Switch, Alert, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { client } from '../../api/client';

export default function AutoDeductScreen() {
    const navigation = useNavigation<any>();
    const [optIn, setOptIn] = useState(false);
    const [loading, setLoading] = useState(false);

    // Using local mock state for UI demonstration, in prod fetch from '/loyalty/status'
    const [stats] = useState({
        pendingDeduction: 40,
        monthlyContributed: 850,
        pointsEarned: 132,
        recentLogs: [
            { id: 1, tx: 'Kenya Power', originalAmt: 1540, deducted: 100, date: 'Today, 2:30 PM' },
            { id: 2, tx: 'Safaricom Airtime', originalAmt: 200, deducted: 20, date: 'Today, 8:15 AM' },
        ]
    });

    const handleOptInToggle = async (val: boolean) => {
        if (val) {
            Alert.alert(
                "KDPA Data Consent",
                "By opting in, you authorize AfyaToken to securely analyze your M-PESA statement data to calculate bracketed SHIF contributions. Only transaction amounts are analyzed. Data is encrypted and NEVER shared with 3rd parties. See our Privacy Policy for more info.",
                [
                    { text: "Cancel", style: "cancel", onPress: () => setOptIn(false) },
                    { text: "I Agree", onPress: async () => submitOptIn(true) }
                ]
            );
        } else {
            submitOptIn(false);
        }
    };

    const submitOptIn = async (val: boolean) => {
        setLoading(true);
        try {
            await client.post('/loyalty/auto-deduct/opt-in', { optIn: val });
            setOptIn(val);
        } catch (e: any) {
            Alert.alert("Error", "Could not update your preferences. Please try again.");
            setOptIn(!val); // Revert
        } finally {
            setLoading(false);
        }
    };

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
                        <Text className="text-slate-400 text-xs">M-PESA Bridge</Text>
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

            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
                {/* Hero Banner */}
                <View className="bg-gradient-to-br from-teal-900 to-slate-800 rounded-3xl p-6 mb-6 border border-teal-500/30 shadow-lg">
                    <View className="w-12 h-12 bg-teal-500/20 rounded-2xl items-center justify-center mb-4 border border-teal-500/40">
                        <Feather name="zap" size={24} color="#34D399" />
                    </View>
                    <Text className="text-white text-2xl font-bold mb-2">Build Your Cover Seamlessly</Text>
                    <Text className="text-slate-300 text-sm leading-relaxed mb-6">
                        We automatically map small micro-contributions to your regular M-PESA spending. 
                        No manual effort required—your SHIF wallet grows silently in the background!
                    </Text>

                    <View className="flex-row justify-between bg-black/20 p-4 rounded-xl">
                        <View>
                            <Text className="text-slate-400 text-xs font-mono font-bold mb-1">PENDING BATCH</Text>
                            <View className="flex-row items-baseline gap-2 pb-1">
                                <Text className="text-amber-400 text-xl font-extrabold">KES {optIn ? stats.pendingDeduction : 0}</Text>
                                <Text className="text-white/40 text-xs font-bold">/ 300 MAX</Text>
                            </View>
                            <Text className="text-slate-500 text-[10px]">Will be prompted at 7:00 PM</Text>
                        </View>
                        <View>
                            <Text className="text-slate-400 text-xs font-mono font-bold mb-1">THIS MONTH</Text>
                            <Text className="text-teal-400 text-xl font-extrabold pb-1">KES {optIn ? stats.monthlyContributed : 0}</Text>
                            <Text className="text-slate-500 text-[10px] text-right">+{optIn ? stats.pointsEarned : 0} AfyaScore</Text>
                        </View>
                    </View>
                </View>

                {/* Information Bracket Table */}
                <Text className="text-white font-bold text-lg mb-4">How it works</Text>
                <View className="bg-white/5 border border-white/10 rounded-2xl p-1 mb-6">
                    <View className="flex-row justify-between px-4 py-3 bg-white/5 rounded-t-xl border-b border-white/10">
                        <Text className="text-slate-400 text-xs font-bold w-1/2">When you spend...</Text>
                        <Text className="text-slate-400 text-xs font-bold text-right w-1/2">We'll save...</Text>
                    </View>
                    {[
                        { spend: 'KES 10 - KES 100', save: 'KES 10' },
                        { spend: 'KES 101 - KES 500', save: 'KES 20' },
                        { spend: 'KES 501 - KES 1000', save: 'KES 50' },
                        { spend: 'Above KES 1000', save: 'KES 100' },
                    ].map((row, idx) => (
                        <View key={idx} className={`flex-row justify-between px-4 py-3 ${idx !== 3 ? 'border-b border-white/10' : ''}`}>
                            <Text className="text-slate-300 w-1/2 font-medium">{row.spend}</Text>
                            <Text className="text-teal-400 font-bold text-right w-1/2">{row.save}</Text>
                        </View>
                    ))}
                </View>

                {/* Daily Limit Info */}
                <View className="bg-teal-900/10 border border-teal-500/20 rounded-2xl p-4 mb-4 flex-row items-start gap-3">
                    <Feather name="shield" size={20} color="#34D399" style={{ marginTop: 2 }} />
                    <View className="flex-1">
                        <Text className="text-teal-400 font-bold mb-1">Daily Cap: KES 300</Text>
                        <Text className="text-slate-400 text-xs leading-relaxed">
                            To ensure SHIF contributions always remain affordable, your auto-deductions will automatically pause once you hit the KES 300 daily limit, no matter how much you spend.
                        </Text>
                    </View>
                </View>

                {/* EOD Batch info */}
                <View className="bg-amber-900/10 border border-amber-500/20 rounded-2xl p-4 mb-8 flex-row items-start gap-3">
                    <Feather name="moon" size={20} color="#FBBF24" style={{ marginTop: 2 }} />
                    <View className="flex-1">
                        <Text className="text-amber-400 font-bold mb-1">Nightly Approvals</Text>
                        <Text className="text-slate-400 text-xs leading-relaxed">
                            To avoid spamming you with PIN requests throughout the day, we batch all micro-deductions. You'll receive a single STK push prompt at exactly 7:00 PM for the aggregated amount.
                        </Text>
                    </View>
                </View>

                {/* Recent Auto-Deductions */}
                {optIn && (
                    <View>
                        <Text className="text-white font-bold text-lg mb-4">Today's Batch</Text>
                        {stats.recentLogs.map((log) => (
                            <View key={log.id} className="bg-white/5 border border-white/10 p-4 rounded-xl mb-3 flex-row justify-between items-center">
                                <View>
                                    <Text className="text-white font-medium mb-1">{log.tx}</Text>
                                    <Text className="text-slate-500 text-xs">{log.date} · Paid KES {log.originalAmt}</Text>
                                </View>
                                <View className="bg-teal-500/20 px-3 py-1.5 rounded-lg border border-teal-500/30">
                                    <Text className="text-teal-400 font-bold text-xs">+ KES {log.deducted}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
