import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { client } from '../../api/client';
import { useAuthStore } from '../../store/auth';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts, radii } from '../../theme';

const PLACEHOLDER = '#8A9099';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  const login = useAuthStore((state) => state.login);
  const navigation = useNavigation<any>();

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      // Backend wraps responses as { success, data: {...} }, so the
      // actual payload is one level deeper than res.data.
      const res = await client.post('/auth/login', { email, password });
      const { user, accessToken, refreshToken } = res.data.data;
      await login(user, accessToken, refreshToken);
    } catch (e: any) {
      Alert.alert('Login Failed', e.response?.data?.error?.message || e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View style={s.header}>
            <Text style={s.title}>Welcome Back</Text>
            <Text style={s.subtitle}>Sign in to your AfyaToken Wallet</Text>
          </View>

          <View style={s.card}>
            <View style={s.field}>
              <Text style={s.label}>Email</Text>
              <TextInput
                style={[s.input, focused === 'email' && s.inputFocused]}
                placeholderTextColor={PLACEHOLDER}
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                selectionColor={colors.accent}
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>Password</Text>
              <TextInput
                style={[s.input, focused === 'password' && s.inputFocused]}
                placeholderTextColor={PLACEHOLDER}
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                autoComplete="password"
                secureTextEntry
                selectionColor={colors.accent}
              />
            </View>

            <TouchableOpacity
              style={[s.primaryBtn, loading && s.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color={colors.accentInk} />
              ) : (
                <Text style={s.primaryBtnText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={s.footer}>
            <Text style={s.footerText}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              accessibilityRole="button"
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            >
              <Text style={s.link}>Register</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ground },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32, gap: 24 },

  header: { paddingHorizontal: 4, gap: 6 },
  title: { fontFamily: fonts.bold, fontSize: 30, color: colors.text, letterSpacing: -0.6 },
  subtitle: { fontFamily: fonts.medium, fontSize: 15, color: colors.muted },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.card,
    padding: 22,
    gap: 18,
  },
  field: { gap: 8 },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  input: {
    height: 52,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.ground,
    paddingHorizontal: 16,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
  },
  inputFocused: { borderColor: colors.accent, backgroundColor: colors.surface },

  primaryBtn: {
    height: 52,
    borderRadius: radii.button,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.7 },
  primaryBtnText: { fontFamily: fonts.bold, fontSize: 16, color: colors.accentInk },

  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  link: { fontFamily: fonts.bold, fontSize: 14, color: colors.accent },
});