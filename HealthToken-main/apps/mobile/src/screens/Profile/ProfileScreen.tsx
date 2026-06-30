import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth';
import { client } from '../../api/client';
import * as LocalAuthentication from 'expo-local-authentication';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricEnrolled, setIsBiometricEnrolled] = useState(false);
  const [lockingStatus, setLockingStatus] = useState<"IDLE" | "PENDING">("IDLE");
  const [afyaData, setAfyaData] = useState<{ score: number; tier: string; tierLabel: string; streakDays: number } | null>(null);

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsBiometricSupported(compatible);
      
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsBiometricEnrolled(enrolled);

      // Fetch AfyaScore
      try {
        const res = await client.get('/afyascore');
        setAfyaData(res.data.data);
      } catch (e) {
        console.error('Failed to load AfyaScore:', e);
      }
    })();
  }, []);

  const handleFHIRDownload = () => {
    // In production, this proxies to API `GET /fhir/r4/Patient/$export`
    Alert.alert("Data Portability", "Your FHIR R4 JSON bundle will be downloaded securely to your device.");
  };

  const handleBiometricToggle = async () => {
    if (!isBiometricSupported || !isBiometricEnrolled) {
      Alert.alert("Hardware Unavailable", "Your device does not support or have biometrics configured.");
      return;
    }
    
    setLockingStatus("PENDING");
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Verify identity to change security settings",
      fallbackLabel: "Use Passcode"
    });
    setLockingStatus("IDLE");

    if (result.success) {
      Alert.alert("Success", "App lock settings updated.");
    } else {
      Alert.alert("Authentication Failed", "We could not verify your identity.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        
        {/* Profile Header */}
        <View className="items-center mb-8 mt-4">
          <View className="w-24 h-24 rounded-full bg-teal-900 border-4 border-teal-800 items-center justify-center mb-4">
            <Feather name="user" size={36} color="white" />
          </View>
          <Text className="text-white text-2xl font-bold font-sans">{user?.name || 'Citizen'}</Text>
          <Text className="text-slate-400 text-sm mt-1">SHA Member · Nairobi County</Text>
          {afyaData && (
            <View className="flex-row items-center gap-2 mt-2">
              <View className="bg-teal-500/20 px-3 py-1 rounded-full">
                <Text className="text-teal-400 text-xs font-bold">{afyaData.tierLabel} Tier</Text>
              </View>
              <Text className="text-amber-400 text-xs font-bold">AfyaScore: {afyaData.score}</Text>
              <Text className="text-amber-400 text-xs">🔥 {afyaData.streakDays} days</Text>
            </View>
          )}
          <View className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 mt-4">
            <Text className="text-teal-400 font-mono text-sm font-bold tracking-widest">SHA-KE-2024-8821</Text>
          </View>
        </View>

        {/* Coverage Details */}
        <View className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
          <Text className="text-teal-400 text-xs font-mono font-bold tracking-widest mb-4">COVERAGE DETAILS</Text>
          
          {[
            { label: 'Plan', value: 'SHA Standard' },
            { label: 'Primary Healthcare Fund', value: 'Active' },
            { label: 'Emergency Fund', value: 'Active' },
            { label: 'SHIF Contributions', value: afyaData ? `${afyaData.score} score` : 'Loading...' },
            { label: 'Dependants Covered', value: '3' },
          ].map((item, idx) => (
            <View key={item.label} className={`flex-row justify-between py-3 ${idx !== 4 ? 'border-b border-white/10' : ''}`}>
              <Text className="text-slate-400 font-medium">{item.label}</Text>
              <Text className="text-white font-bold">{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Data & Privacy (DHA Compliant) */}
        <View className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8">
          <Text className="text-amber-400 text-xs font-mono font-bold tracking-widest mb-4">DATA & PRIVACY</Text>
          
          <TouchableOpacity onPress={handleFHIRDownload} className="flex-row items-center py-4 border-b border-white/10">
            <Feather name="download-cloud" size={18} color="#94a3b8" />
            <Text className="text-slate-200 font-medium ml-3 flex-1">Download My Records (FHIR)</Text>
            <Feather name="chevron-right" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleBiometricToggle} className="flex-row items-center py-4 border-b border-white/10">
            <Feather name="shield" size={18} color="#94a3b8" />
            <Text className="text-slate-200 font-medium ml-3 flex-1">Biometric App Lock</Text>
            {lockingStatus === "PENDING" ? (
               <ActivityIndicator size="small" color="#00C165" />
            ) : (
               <Text className={isBiometricEnrolled ? "text-teal-400 font-bold" : "text-slate-500 font-bold"}>
                 {isBiometricEnrolled ? 'Supported' : 'Unavailable'}
               </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center py-4 border-b border-white/10">
            <Feather name="lock" size={18} color="#94a3b8" />
            <Text className="text-slate-200 font-medium ml-3 flex-1">Data Consent Settings</Text>
            <Feather name="chevron-right" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center py-4">
            <Feather name="external-link" size={18} color="#94a3b8" />
            <Text className="text-slate-200 font-medium ml-3 flex-1">ODPC Complaint Portal</Text>
            <Feather name="chevron-right" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity 
          className="bg-red-500/10 border border-red-500/30 rounded-xl py-4 items-center mb-6"
          onPress={logout}
        >
          <Text className="text-red-400 font-bold">Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
