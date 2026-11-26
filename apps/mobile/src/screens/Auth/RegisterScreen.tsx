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
import { useNavigation } from '@react-navigation/native';
import { colors, fonts, radii } from '../../theme';

const PLACEHOLDER = '#8A9099';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<'name' | 'email' | 'password' | null>(null);
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
      Alert.alert('Success', 'Registration complete! You can now log in.');
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
      Alert.alert('Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View style={s.header}>
            <Text style={s.title}>Join AfyaToken</Text>
            <Text style={s.subtitle}>Create your citizen health wallet</Text>
          </View>

          <View style={s.card}>
            <View style={s.field}>
              <Text style={s.label}>Full Name</Text>
              <TextInput
                style={[s.input, focused === 'name' && s.inputFocused]}
                placeholderTextColor={PLACEHOLDER}
                placeholder="John Doe"
                value={name}
                onChangeText={setName}
                onFocus={() => setFocused('name')}
                onBlur={() => setFocused(null)}
                autoCapitalize="words"
                autoComplete="name"
                selectionColor={colors.accent}
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>Email</Text>
              <TextInput
                style={[s.input, focused === 'email' && s.inputFocused]}
                placeholderTextColor={PLACEHOLDER}
                placeholder="john@example.com"
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
                placeholder="Create a password"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                autoComplete="new-password"
                secureTextEntry
                selectionColor={colors.accent}
              />
              <Text style={s.hint}>
                12+ characters with an uppercase letter, a number and a special character
              </Text>
            </View>

            <TouchableOpacity
              style={[s.primaryBtn, loading && s.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color={colors.accentInk} />
              ) : (
                <Text style={s.primaryBtnText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={s.footer}>
            <Text style={s.footerText}>Already have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              accessibilityRole="button"
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            >
              <Text style={s.link}>Sign In</Text>
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
  hint: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, color: colors.muted },

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