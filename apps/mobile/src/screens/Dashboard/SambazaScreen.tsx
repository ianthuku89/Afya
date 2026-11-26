import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, SafeAreaView, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert, StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { client } from '../../api/client';
import { colors, fonts, radii, shadows, tabularNums } from '../../theme';

type Relation = 'FAMILY' | 'FRIEND';
type Step = 'enter' | 'confirm' | 'paying' | 'done' | 'failed';

interface Beneficiary {
  id: string; nickname: string; relation: Relation; name: string; phone: string | null; paidToday: boolean;
}
interface Lookup {
  recipientName: string; recipientPhone: string | null; eligible: boolean; blockMessage: string | null;
  saved: { id: string; nickname: string; relation: Relation } | null;
}
interface Limits { amountKES: number; dailyCapKES: number; usedTodayKES: number; remainingKES: number }

// Recipient is either a typed number or a saved beneficiary
type Target = { phoneNumber: string } | { beneficiaryId: string };

const POLL_MS = 3000;
const POLL_MAX = 20; // 60s
const PLACEHOLDER = '#8A9099';

const errMsg = (e: any, fallback: string) => e?.response?.data?.error?.message || fallback;

export default function SambazaScreen() {
  const navigation = useNavigation<any>();

  const [step, setStep] = useState<Step>('enter');
  const [phone, setPhone] = useState('');
  const [filter, setFilter] = useState<'ALL' | Relation>('ALL');
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [limits, setLimits] = useState<Limits | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // save-as state
  const [nickname, setNickname] = useState('');
  const [relation, setRelation] = useState<Relation>('FAMILY');
  const [saved, setSaved] = useState(false);

  // styling-only: which input currently has focus
  const [focused, setFocused] = useState<'phone' | 'nickname' | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopPolling = () => { if (pollRef.current) clearInterval(pollRef.current); pollRef.current = null; };
  useEffect(() => stopPolling, []);

  const load = useCallback(async () => {
    try {
      const [b, l] = await Promise.all([client.get('/sambaza/beneficiaries'), client.get('/sambaza/limits')]);
      setBeneficiaries(b.data.data);
      setLimits(l.data.data);
    } catch (e) { console.error('Sambaza load failed:', e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const reset = () => {
    stopPolling();
    setStep('enter'); setPhone(''); setTarget(null); setLookup(null); setTxId(null);
    setError(null); setNickname(''); setRelation('FAMILY'); setSaved(false);
    load();
  };

  // Step 1 → 2: confirm who we're paying
  const doLookup = async (t: Target) => {
    setBusy(true); setError(null);
    try {
      const res = await client.post('/sambaza/lookup', t);
      setTarget(t); setLookup(res.data.data); setStep('confirm');
    } catch (e) { setError(errMsg(e, 'Could not find that number')); }
    finally { setBusy(false); }
  };

  // Step 2 → 3: start STK, then poll
  const doPay = async () => {
    if (!target) return;
    setBusy(true); setError(null);
    try {
      const res = await client.post('/sambaza/contribute', target);
      const id = res.data.data.transactionId as string;          // used to save the beneficiary
      const checkoutId = res.data.data.checkoutRequestId as string; // used for polling
      setTxId(id); setStep('paying');
      let tries = 0;
      stopPolling();
      pollRef.current = setInterval(async () => {
        tries += 1;
        try {
          const s = await client.get(`/payment/status/${checkoutId}`);
          const status = s.data.data.status as string;
          if (status === 'SUCCESS') { stopPolling(); setStep('done'); load(); }
          else if (status === 'FAILED') { stopPolling(); setError(s.data.data.message || 'Payment was not completed'); setStep('failed'); }
          else if (tries >= POLL_MAX) { stopPolling(); setError('We did not get a confirmation. Check M-PESA messages before retrying'); setStep('failed'); }
        } catch { /* transient network error: keep polling */ }
      }, POLL_MS);
    } catch (e) { setError(errMsg(e, 'Could not start payment')); }
    finally { setBusy(false); }
  };

  // Step 4: save as Family / Friend
  const doSave = async () => {
    if (!txId || !nickname.trim()) return;
    setBusy(true);
    try {
      await client.post('/sambaza/beneficiaries', { transactionId: txId, nickname: nickname.trim(), relation });
      setSaved(true);
    } catch (e) { Alert.alert('Could not save', errMsg(e, 'Try again')); }
    finally { setBusy(false); }
  };

  const confirmDelete = (b: Beneficiary) =>
    Alert.alert(`Remove ${b.nickname}?`, 'You can add them again after your next Sambaza.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await client.delete(`/sambaza/beneficiaries/${b.id}`); load(); } catch (e) { Alert.alert('Could not remove', errMsg(e, 'Try again')); }
      } },
    ]);

  const visible = beneficiaries.filter((b) => filter === 'ALL' || b.relation === filter);
  const canPay = (limits?.remainingKES ?? 1) >= (limits?.amountKES ?? 30);

  const phoneDisabled = busy || phone.replace(/\D/g, '').length < 9;
  const payDisabled = busy || !lookup?.eligible || !canPay;
  const saveDisabled = busy || !nickname.trim();

  // ── Shared pieces ──────────────────────────────────────────────────────────
  const Header = (
    <View style={s.header}>
      <TouchableOpacity
        onPress={() => (step === 'enter' || step === 'done' ? navigation.goBack() : reset())}
        style={s.iconButton}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Feather name="arrow-left" size={18} color={colors.text} />
      </TouchableOpacity>
      <View style={s.headerText}>
        <Text style={s.title}>Sambaza</Text>
        <Text style={s.subtitle}>Pay SHIF for someone you care about</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {Header}

          {/* ───────── ENTER ───────── */}
          {step === 'enter' && (
            <>
              <View style={s.card}>
                <Text style={s.label}>Their phone number</Text>
                <View style={[s.inputWrap, focused === 'phone' && s.inputFocused]}>
                  <Feather name="phone" size={18} color={colors.muted} style={s.inputIcon} />
                  <TextInput
                    value={phone}
                    onChangeText={(t) => { setPhone(t); setError(null); }}
                    onFocus={() => setFocused('phone')}
                    onBlur={() => setFocused(null)}
                    placeholder="0712 345 678"
                    placeholderTextColor={PLACEHOLDER}
                    keyboardType="phone-pad"
                    maxLength={16}
                    style={[s.input, tabularNums]}
                  />
                </View>
                {error && <Text style={[s.errorText, { marginTop: 8 }]}>{error}</Text>}

                <TouchableOpacity
                  disabled={phoneDisabled}
                  onPress={() => doLookup({ phoneNumber: phone })}
                  style={[s.primaryButton, { marginTop: 16 }, phoneDisabled && s.disabled]}
                  accessibilityRole="button"
                >
                  {busy ? <ActivityIndicator color={colors.accentInk} /> : <Text style={s.primaryText}>Continue</Text>}
                </TouchableOpacity>

                {limits && (
                  <Text style={[s.small, tabularNums, { marginTop: 12 }]}>
                    KES {limits.amountKES} per person per day · KES {limits.remainingKES} left to Sambaza today
                  </Text>
                )}
              </View>

              {/* Saved people */}
              <View style={s.card}>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>Saved people</Text>
                  <View style={s.chipRow}>
                    {(['ALL', 'FAMILY', 'FRIEND'] as const).map((f) => (
                      <TouchableOpacity
                        key={f}
                        onPress={() => setFilter(f)}
                        hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
                        style={[s.chip, filter === f && s.chipActive]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: filter === f }}
                      >
                        <Text style={[s.chipText, filter === f && s.chipTextActive]}>
                          {f === 'ALL' ? 'All' : f === 'FAMILY' ? 'Family' : 'Friends'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {visible.length === 0 ? (
                  <View style={s.empty}>
                    <View style={s.iconBox}>
                      <Feather name="users" size={20} color={colors.accent} />
                    </View>
                    <Text style={s.emptyTitle}>No one saved yet</Text>
                    <Text style={[s.small, { textAlign: 'center', marginTop: 4 }]}>
                      After you Sambaza for someone, you can save them as Family or Friend here.
                    </Text>
                  </View>
                ) : (
                  visible.map((b, i) => (
                    <TouchableOpacity
                      key={b.id}
                      disabled={busy}
                      onPress={() => doLookup({ beneficiaryId: b.id })}
                      onLongPress={() => confirmDelete(b)}
                      style={[s.personRow, i > 0 && s.rowDivider]}
                      accessibilityRole="button"
                      accessibilityLabel={`${b.nickname}, ${b.relation === 'FAMILY' ? 'Family' : 'Friend'}${b.paidToday ? ', paid today' : ''}`}
                    >
                      <View style={[s.iconBox, { marginRight: 12 }]}>
                        <Text style={s.initial}>{b.nickname.slice(0, 1).toUpperCase()}</Text>
                      </View>
                      <View style={s.flex}>
                        <Text style={s.personName}>{b.nickname}</Text>
                        <Text style={[s.small, tabularNums]}>
                          {b.relation === 'FAMILY' ? 'Family' : 'Friend'} · {b.phone ?? b.name}
                        </Text>
                      </View>
                      {b.paidToday ? (
                        <View style={s.statusRow}>
                          <View style={[s.dot, { backgroundColor: colors.accent }]} />
                          <Text style={s.paidText}>Paid today</Text>
                        </View>
                      ) : (
                        <Feather name="chevron-right" size={18} color={colors.muted} />
                      )}
                    </TouchableOpacity>
                  ))
                )}
                {visible.length > 0 && <Text style={[s.small, { textAlign: 'center', marginTop: 12 }]}>Hold a person to remove them</Text>}
              </View>
            </>
          )}

          {/* ───────── CONFIRM ───────── */}
          {step === 'confirm' && lookup && (
            <View style={s.card}>
              <Text style={s.label}>You are paying for</Text>
              <Text style={s.recipient}>{lookup.saved?.nickname ?? lookup.recipientName}</Text>
              <Text style={[s.body, { color: colors.muted, marginBottom: 20 }, tabularNums]}>
                {lookup.saved ? `${lookup.recipientName} · ` : ''}{lookup.recipientPhone}
              </Text>

              <View style={s.listBlock}>
                <View style={s.listRow}>
                  <Text style={s.listLabel}>Amount</Text>
                  <Text style={[s.listValue, tabularNums]}>KES {limits?.amountKES ?? 30}</Text>
                </View>
                <View style={[s.listRow, s.rowDivider, { alignItems: 'flex-start' }]}>
                  <Text style={s.small}>Counts as today's SHIF contribution for them. Your own streak is not affected.</Text>
                </View>
              </View>

              {!lookup.eligible && <Text style={[s.errorText, { marginBottom: 12 }]}>{lookup.blockMessage}</Text>}
              {!canPay && <Text style={[s.errorText, { marginBottom: 12 }]}>You have reached today's Sambaza limit.</Text>}
              {error && <Text style={[s.errorText, { marginBottom: 12 }]}>{error}</Text>}

              <TouchableOpacity
                disabled={payDisabled}
                onPress={doPay}
                style={[s.primaryButton, payDisabled && s.disabled]}
                accessibilityRole="button"
              >
                {busy ? <ActivityIndicator color={colors.accentInk} /> : <Text style={[s.primaryText, tabularNums]}>Pay KES {limits?.amountKES ?? 30} with M-PESA</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={reset} style={s.linkButton} accessibilityRole="button">
                <Text style={s.linkText}>Change person</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ───────── PAYING ───────── */}
          {step === 'paying' && (
            <View style={[s.card, { alignItems: 'center', paddingVertical: 32 }]}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={[s.sectionTitle, { marginTop: 16 }]}>Check your phone</Text>
              <Text style={[s.body, { color: colors.muted, textAlign: 'center', marginTop: 6 }]}>
                Enter your M-PESA PIN on the prompt. This screen updates when payment goes through.
              </Text>
            </View>
          )}

          {/* ───────── FAILED ───────── */}
          {step === 'failed' && (
            <View style={[s.card, { alignItems: 'center' }]}>
              <View style={[s.iconBox, { borderColor: colors.danger + '33', backgroundColor: colors.danger + '14' }]}>
                <Feather name="alert-circle" size={20} color={colors.danger} />
              </View>
              <Text style={[s.sectionTitle, { marginTop: 14 }]}>Payment not completed</Text>
              <Text style={[s.body, { color: colors.muted, textAlign: 'center', marginTop: 6, marginBottom: 20 }]}>{error}</Text>
              <TouchableOpacity
                onPress={() => { setError(null); setStep('confirm'); }}
                style={[s.primaryButton, { alignSelf: 'stretch' }]}
                accessibilityRole="button"
              >
                <Text style={s.primaryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ───────── DONE + SAVE ───────── */}
          {step === 'done' && lookup && (
            <>
              <View style={[s.card, s.successCard]}>
                <View style={[s.iconBox, { backgroundColor: colors.surface, borderColor: colors.accent + '33' }]}>
                  <Feather name="check-circle" size={22} color={colors.accent} />
                </View>
                <Text style={[s.sectionTitle, { marginTop: 14 }]}>Sambaza sent</Text>
                <Text style={[s.body, { color: colors.muted, textAlign: 'center', marginTop: 6 }, tabularNums]}>
                  KES {limits?.amountKES ?? 30} paid for {lookup.saved?.nickname ?? lookup.recipientName}.
                </Text>
              </View>

              {!lookup.saved && !saved && (
                <View style={s.card}>
                  <Text style={s.sectionTitle}>Save {lookup.recipientName}?</Text>
                  <Text style={[s.small, { marginTop: 4, marginBottom: 16 }]}>Next time, pay for them in one tap.</Text>

                  <Text style={[s.label, { marginBottom: 8 }]}>Nickname</Text>
                  <TextInput
                    value={nickname} onChangeText={setNickname} maxLength={40}
                    onFocus={() => setFocused('nickname')}
                    onBlur={() => setFocused(null)}
                    placeholder="Nickname, e.g. Mama" placeholderTextColor={PLACEHOLDER}
                    style={[s.inputStandalone, focused === 'nickname' && s.inputFocused]}
                  />
                  <View style={s.relationRow}>
                    {(['FAMILY', 'FRIEND'] as const).map((r) => (
                      <TouchableOpacity
                        key={r}
                        onPress={() => setRelation(r)}
                        style={[s.relationBtn, relation === r && s.chipActive]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: relation === r }}
                      >
                        <Text style={[s.relationText, relation === r && s.chipTextActive]}>{r === 'FAMILY' ? 'Family' : 'Friend'}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    disabled={saveDisabled}
                    onPress={doSave}
                    style={[s.primaryButton, saveDisabled && s.disabled]}
                    accessibilityRole="button"
                  >
                    {busy ? <ActivityIndicator color={colors.accentInk} /> : <Text style={s.primaryText}>Save as {relation === 'FAMILY' ? 'Family' : 'Friend'}</Text>}
                  </TouchableOpacity>
                </View>
              )}

              {(lookup.saved || saved) && (
                <View style={s.statusRowCentered}>
                  <View style={[s.dot, { backgroundColor: colors.accent }]} />
                  <Text style={s.paidText}>
                    {saved ? `Saved as ${nickname.trim()} · ${relation === 'FAMILY' ? 'Family' : 'Friend'}` : `${lookup.saved!.nickname} is already in your saved people`}
                  </Text>
                </View>
              )}

              <TouchableOpacity onPress={reset} style={s.secondaryButton} accessibilityRole="button">
                <Text style={s.secondaryText}>Sambaza for someone else</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.goBack()} style={s.linkButton} accessibilityRole="button">
                <Text style={s.linkText}>Back to home</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.ground },
  content: { padding: 20, paddingBottom: 60, gap: 16 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  headerText: { marginLeft: 12, flex: 1 },
  iconButton: {
    width: 44, height: 44, borderRadius: radii.button, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: fonts.bold, fontSize: 28, letterSpacing: -0.5, color: colors.text },
  subtitle: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted, marginTop: 2 },

  // Cards
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
    borderRadius: radii.card, padding: 22, ...shadows.card,
  },
  successCard: { alignItems: 'center', backgroundColor: colors.accent + '14', borderColor: colors.accent + '33' },

  // Typography
  sectionTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  body: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  small: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, lineHeight: 18 },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted, marginBottom: 8 },
  errorText: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
  recipient: { fontFamily: fonts.bold, fontSize: 24, letterSpacing: -0.3, color: colors.text, marginBottom: 2 },

  // Inputs
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', height: 52, borderRadius: radii.button, paddingHorizontal: 14,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.ground,
  },
  inputFocused: { borderColor: colors.accent, backgroundColor: colors.surface },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 52, fontFamily: fonts.medium, fontSize: 16, color: colors.text },
  inputStandalone: {
    height: 52, borderRadius: radii.button, paddingHorizontal: 14, marginBottom: 12,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.ground,
    fontFamily: fonts.medium, fontSize: 16, color: colors.text,
  },

  // Buttons
  primaryButton: {
    height: 52, borderRadius: radii.button, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16,
  },
  primaryText: { fontFamily: fonts.bold, fontSize: 15, color: colors.accentInk },
  secondaryButton: {
    height: 52, borderRadius: radii.button, backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16,
  },
  secondaryText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  disabled: { opacity: 0.45 },
  linkButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  linkText: { fontFamily: fonts.bold, fontSize: 14, color: colors.accent },

  // Icon box
  iconBox: {
    width: 44, height: 44, borderRadius: radii.icon, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  initial: { fontFamily: fonts.bold, fontSize: 16, color: colors.accent },

  // Saved people
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 12, height: 32, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.line,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent',
  },
  chipActive: { backgroundColor: colors.accent + '14', borderColor: colors.accent + '33' },
  chipText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  chipTextActive: { color: colors.accent },
  empty: { alignItems: 'center', paddingVertical: 12 },
  emptyTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text, marginTop: 12 },
  personRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, minHeight: 68 },
  personName: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.line },

  // Status
  dot: { width: 7, height: 7, borderRadius: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusRowCentered: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  paidText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.accent },

  // List rows
  listBlock: { borderWidth: 1, borderColor: colors.line, borderRadius: radii.button, paddingHorizontal: 16, marginBottom: 16 },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  listLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  listValue: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },

  // Relation picker
  relationRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  relationBtn: {
    flex: 1, height: 48, borderRadius: radii.button, borderWidth: 1, borderColor: colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  relationText: { fontFamily: fonts.bold, fontSize: 14, color: colors.muted },
});