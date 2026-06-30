import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { client } from '../../api/client';
import { useAuthStore } from '../../store/auth';
import { useNavigation } from '@react-navigation/native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const navigation = useNavigation<any>();

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      // Assuming backend expects { email, password }
      const res = await client.post('/auth/login', { email, password });
      const { user, accessToken, refreshToken } = res.data;
      await login(user, accessToken, refreshToken);
    } catch (e: any) {
      Alert.alert("Login Failed", e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900 justify-center px-8">
      <View className="mb-10">
        <Text className="text-4xl text-white font-bold tracking-tight">Welcome Back</Text>
        <Text className="text-slate-400 text-lg mt-2">Sign in to your AfyaToken Wallet</Text>
      </View>

      <View className="space-y-4 mb-6">
        <View>
          <Text className="text-slate-300 font-medium mb-1 ml-1">Email</Text>
          <TextInput
            className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border border-slate-700"
            placeholderTextColor="#9ca3af"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View>
          <Text className="text-slate-300 font-medium mb-1 ml-1">Password</Text>
          <TextInput
            className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border border-slate-700"
            placeholderTextColor="#9ca3af"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
      </View>

      <TouchableOpacity 
        className="bg-teal-500 rounded-xl py-4 items-center mb-6 shadow-sm"
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-bold text-lg">Sign In</Text>
        )}
      </TouchableOpacity>

      <View className="flex-row justify-center items-center">
        <Text className="text-slate-400">Don't have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text className="text-teal-400 font-bold">Register</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
