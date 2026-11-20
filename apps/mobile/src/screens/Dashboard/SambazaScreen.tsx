import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, SafeAreaView, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { client } from '../../api/client';

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

  // ── Shared pieces ──────────────────────────────────────────────────────────
  const Header = (
    <View className="flex-row items-center mb-6">
      <TouchableOpacity onPress={() => (step === 'enter' || step === 'done' ? navigation.goBack() : reset())} className="w-10 h-10 rounded-full bg-white/10 items-center justify-center mr-3">
        <Feather name="arrow-left" size={18} color="white" />
      </TouchableOpacity>
      <View>
        <Text className="text-white text-2xl font-bold tracking-tight">Sambaza</Text>
        <Text className="text-slate-400 text-sm">Pay SHIF for someone you care about</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          {Header}

          {/* ───────── ENTER ───────── */}
          {step === 'enter' && (
            <>
              <View className="bg-white/5 border border-white/10 rounded-3xl p-5 mb-5">
                <Text className="text-slate-300 text-sm font-medium mb-2">Their phone number</Text>
                <View className="flex-row items-center bg-black/30 border border-white/10 rounded-2xl px-4">
                  <Text className="text-slate-400 text-base mr-2">🇰🇪</Text>
                  <TextInput
                    value={phone}
                    onChangeText={(t) => { setPhone(t); setError(null); }}
                    placeholder="0712 345 678"
                    placeholderTextColor="#64748b"
                    keyboardType="phone-pad"
                    maxLength={16}
                    className="flex-1 text-white text-lg py-4"
                  />
                </View>
                {error && <Text className="text-red-400 text-xs mt-2">{error}</Text>}

                <TouchableOpacity
                  disabled={busy || phone.replace(/\D/g, '').length < 9}
                  onPress={() => doLookup({ phoneNumber: phone })}
                  className={`rounded-xl py-3 items-center mt-4 ${busy || phone.replace(/\D/g, '').length < 9 ? 'bg-teal-500/40' : 'bg-teal-500'}`}
                >
                  {busy ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold tracking-wide">Continue</Text>}
                </TouchableOpacity>

                {limits && (
                  <Text className="text-slate-500 text-xs mt-3">
                    KES {limits.amountKES} per person per day · KES {limits.remainingKES} left to Sambaza today
                  </Text>
                )}
              </View>

              {/* Saved people */}
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-white text-base font-bold">Saved people</Text>
                <View className="flex-row gap-2">
                  {(['ALL', 'FAMILY', 'FRIEND'] as const).map((f) => (
                    <TouchableOpacity key={f} onPress={() => setFilter(f)}
                      className={`px-3 py-1 rounded-full border ${filter === f ? 'bg-teal-500/20 border-teal-500' : 'border-white/15'}`}>
                      <Text className={`text-xs font-bold ${filter === f ? 'text-teal-400' : 'text-slate-400'}`}>
                        {f === 'ALL' ? 'All' : f === 'FAMILY' ? 'Family' : 'Friends'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {visible.length === 0 ? (
                <View className="bg-white/5 border border-dashed border-white/15 rounded-2xl p-5 items-center">
                  <Feather name="users" size={22} color="#64748b" />
                  <Text className="text-slate-300 text-sm font-semibold mt-2">No one saved yet</Text>
                  <Text className="text-slate-500 text-xs mt-1 text-center">After you Sambaza for someone, you can save them as Family or Friend here.</Text>
                </View>
              ) : (
                visible.map((b) => (
                  <TouchableOpacity key={b.id} disabled={busy} onPress={() => doLookup({ beneficiaryId: b.id })}
                    onLongPress={() => confirmDelete(b)}
                    className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-3 flex-row items-center">
                    <View className={`w-11 h-11 rounded-full items-center justify-center mr-3 ${b.relation === 'FAMILY' ? 'bg-teal-500/20' : 'bg-amber-500/20'}`}>
                      <Text className="text-white font-bold">{b.nickname.slice(0, 1).toUpperCase()}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-white font-semibold">{b.nickname}</Text>
                      <Text className="text-slate-500 text-xs">{b.relation === 'FAMILY' ? 'Family' : 'Friend'} · {b.phone ?? b.name}</Text>
                    </View>
                    {b.paidToday ? (
                      <View className="flex-row items-center gap-1">
                        <Feather name="check-circle" size={14} color="#00C165" />
                        <Text className="text-emerald-400 text-xs font-semibold">Paid today</Text>
                      </View>
                    ) : (
                      <Feather name="chevron-right" size={18} color="#64748b" />
                    )}
                  </TouchableOpacity>
                ))
              )}
              {visible.length > 0 && <Text className="text-slate-600 text-[11px] text-center mt-1">Hold a person to remove them</Text>}
            </>
          )}

          {/* ───────── CONFIRM ───────── */}
          {step === 'confirm' && lookup && (
            <View className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <Text className="text-slate-400 text-xs font-medium mb-1">You are paying for</Text>
              <Text className="text-white text-2xl font-extrabold">{lookup.saved?.nickname ?? lookup.recipientName}</Text>
              <Text className="text-slate-400 text-sm mb-5">
                {lookup.saved ? `${lookup.recipientName} · ` : ''}{lookup.recipientPhone}
              </Text>

              <View className="bg-black/30 rounded-2xl p-4 mb-4 border border-white/10">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-slate-400 text-sm">Amount</Text>
                  <Text className="text-white font-bold">KES {limits?.amountKES ?? 30}</Text>
                </View>
                <Text className="text-slate-500 text-xs">Counts as today's SHIF contribution for them. Your own streak is not affected.</Text>
              </View>

              {!lookup.eligible && <Text className="text-amber-400 text-xs mb-3">{lookup.blockMessage}</Text>}
              {!canPay && <Text className="text-amber-400 text-xs mb-3">You have reached today's Sambaza limit.</Text>}
              {error && <Text className="text-red-400 text-xs mb-3">{error}</Text>}

              <TouchableOpacity
                disabled={busy || !lookup.eligible || !canPay}
                onPress={doPay}
                className={`rounded-xl py-3 items-center ${busy || !lookup.eligible || !canPay ? 'bg-teal-500/40' : 'bg-teal-500'}`}
              >
                {busy ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold tracking-wide">Pay KES {limits?.amountKES ?? 30} with M-PESA</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={reset} className="py-3 items-center"><Text className="text-slate-400 font-semibold">Change person</Text></TouchableOpacity>
            </View>
          )}

          {/* ───────── PAYING ───────── */}
          {step === 'paying' && (
            <View className="bg-white/5 border border-white/10 rounded-3xl p-8 items-center">
              <ActivityIndicator size="large" color="#00C165" />
              <Text className="text-white text-lg font-bold mt-4">Check your phone</Text>
              <Text className="text-slate-400 text-sm text-center mt-1">Enter your M-PESA PIN on the prompt. This screen updates when payment goes through.</Text>
            </View>
          )}

          {/* ───────── FAILED ───────── */}
          {step === 'failed' && (
            <View className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6 items-center">
              <Feather name="alert-circle" size={28} color="#f87171" />
              <Text className="text-white text-lg font-bold mt-3">Payment not completed</Text>
              <Text className="text-slate-300 text-sm text-center mt-1 mb-4">{error}</Text>
              <TouchableOpacity onPress={() => { setError(null); setStep('confirm'); }} className="bg-teal-500 rounded-xl py-3 px-6">
                <Text className="text-white font-bold">Try again</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ───────── DONE + SAVE ───────── */}
          {step === 'done' && lookup && (
            <>
              <View className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-6 items-center mb-5">
                <Feather name="check-circle" size={32} color="#00C165" />
                <Text className="text-white text-xl font-bold mt-3">Sambaza sent</Text>
                <Text className="text-slate-300 text-sm text-center mt-1">
                  KES {limits?.amountKES ?? 30} paid for {lookup.saved?.nickname ?? lookup.recipientName}.
                </Text>
              </View>

              {!lookup.saved && !saved && (
                <View className="bg-white/5 border border-white/10 rounded-3xl p-5 mb-5">
                  <Text className="text-white text-base font-bold mb-1">Save {lookup.recipientName}?</Text>
                  <Text className="text-slate-400 text-xs mb-4">Next time, pay for them in one tap.</Text>

                  <TextInput
                    value={nickname} onChangeText={setNickname} maxLength={40}
                    placeholder="Nickname, e.g. Mama" placeholderTextColor="#64748b"
                    className="text-white text-base bg-black/30 border border-white/10 rounded-2xl px-4 py-3 mb-3"
                  />
                  <View className="flex-row gap-3 mb-4">
                    {(['FAMILY', 'FRIEND'] as const).map((r) => (
                      <TouchableOpacity key={r} onPress={() => setRelation(r)}
                        className={`flex-1 rounded-xl py-3 items-center border ${relation === r ? 'bg-teal-500/20 border-teal-500' : 'border-white/15'}`}>
                        <Text className={`font-bold ${relation === r ? 'text-teal-400' : 'text-slate-400'}`}>{r === 'FAMILY' ? 'Family' : 'Friend'}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity disabled={busy || !nickname.trim()} onPress={doSave}
                    className={`rounded-xl py-3 items-center ${busy || !nickname.trim() ? 'bg-teal-500/40' : 'bg-teal-500'}`}>
                    {busy ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold tracking-wide">Save as {relation === 'FAMILY' ? 'Family' : 'Friend'}</Text>}
                  </TouchableOpacity>
                </View>
              )}

              {(lookup.saved || saved) && (
                <Text className="text-emerald-400 text-sm text-center mb-5">
                  {saved ? `Saved as ${nickname.trim()} · ${relation === 'FAMILY' ? 'Family' : 'Friend'}` : `${lookup.saved!.nickname} is already in your saved people`}
                </Text>
              )}

              <TouchableOpacity onPress={reset} className="bg-white/10 border border-white/20 rounded-xl py-3 items-center mb-3">
                <Text className="text-white/90 font-bold">Sambaza for someone else</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.goBack()} className="py-3 items-center">
                <Text className="text-slate-400 font-semibold">Back to home</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}