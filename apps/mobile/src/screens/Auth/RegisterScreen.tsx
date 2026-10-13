import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { client } from '../../api/client';
import { useNavigation } from '@react-navigation/native';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<any>();

  const handleRegister = async () => {
    if (!email || !password || !name) return;
    setLoading(true);
    try {
      await client.post('/auth/register', {
        email: email.trim(),
        password,
        fullName: name.trim(),
        role: 'PATIENT',
      });
      Alert.alert("Success", "Registration complete! You can now log in.");
      navigation.navigate('Login');
    } catch (e: any) {
      const err = e.response?.data?.error;
      let msg = e.message;
      if (err?.details && Array.isArray(err.details)) {
        msg = err.details.map((d: any) => d.message).join('\n');
      } else if (typeof err === 'string') {
        msg = err;
      } else if (err?.message) {
        msg = err.message;
      }
      Alert.alert("Registration Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900 justify-center">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 32, justifyContent: 'center', flexGrow: 1 }}>
        <View className="mb-10">
          <Text className="text-4xl text-white font-bold tracking-tight">Join AfyaToken</Text>
          <Text className="text-slate-400 text-lg mt-2">Create your citizen health wallet</Text>
        </View>

        <View className="space-y-4 mb-6">
          <View>
            <Text className="text-slate-300 font-medium mb-1 ml-1">Full Name</Text>
            <TextInput
              className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border border-slate-700"
              placeholderTextColor="#9ca3af"
              placeholder="John Doe"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View>
            <Text className="text-slate-300 font-medium mb-1 ml-1">Email</Text>
            <TextInput
              className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border border-slate-700"
              placeholderTextColor="#9ca3af"
              placeholder="john@example.com"
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
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <Text className="text-slate-500 text-xs mt-1 ml-1">
              12+ characters with an uppercase letter, a number and a special character
            </Text>
          </View>
        </View>

        <TouchableOpacity
          className="bg-teal-500 rounded-xl py-4 items-center mb-6 shadow-sm"
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Create Account</Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center items-center pb-8">
          <Text className="text-slate-400">Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text className="text-teal-400 font-bold">Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}