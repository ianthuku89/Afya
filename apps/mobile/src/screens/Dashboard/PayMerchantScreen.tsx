import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { client } from '../../api/client';
import MerchantPaymentModal from './MerchantPaymentModal';

// Register this screen in your navigator as "PayMerchant".

const PAYBILL_RE = /^\d{5,7}$/;
const ACCOUNT_MAX = 13; // Daraja B2B AccountReference limit; keep in sync with the server schema

export default function PayMerchantScreen() {
    const navigation = useNavigation<any>();
    const [paybill, setPaybill] = useState('');
    const [account, setAccount] = useState('');
    const [amount, setAmount] = useState('');
    const [name, setName] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [optIn, setOptIn] = useState(false);
    const [doneToday, setDoneToday] = useState(false);

    useFocusEffect(
        useCallback(() => {
            client
                .get('/loyalty/auto-deduct/status')
                .then((r) => {
                    setOptIn(Boolean(r.data.data.autoDeductOptIn));
                    setDoneToday(Boolean(r.data.data.isDeductedToday));
                })
                .catch(() => {});
        }, [])
    );

    const amt = Number(amount);
    const errors = {
        paybill: paybill.length > 0 && !PAYBILL_RE.test(paybill) ? 'Paybill must be 5 to 7 digits' : '',
        account: account.length > ACCOUNT_MAX ? `Account can be at most ${ACCOUNT_MAX} characters` : '',
        amount:
            amount.length > 0 && (!Number.isInteger(amt) || amt < 1 || amt > 150000)
                ? 'Enter a whole amount between 1 and 150,000'
                : '',
    };
    const valid =
        PAYBILL_RE.test(paybill) &&
        account.trim().length > 0 &&
        account.length <= ACCOUNT_MAX &&
        Number.isInteger(amt) &&
        amt >= 1 &&
        amt <= 150000;

    const shifNote = !optIn
        ? 'Auto-Deduct is off, so no SHIF contribution will be added.'
        : doneToday
        ? 'Today’s SHIF contribution is already done.'
        : amt > 100
        ? 'KES 30 SHIF will be added to this payment.'
        : 'Payments of KES 100 or below don’t include SHIF.';

    const field = (
        label: string,
        value: string,
        onChange: (v: string) => void,
        opts: { placeholder: string; keyboard?: 'number-pad' | 'default'; error?: string; maxLength?: number }
    ) => (
        <View className="mb-4">
            <Text className="text-slate-400 text-xs mb-2">{label}</Text>
            <TextInput
                value={value}
                onChangeText={onChange}
                placeholder={opts.placeholder}
                placeholderTextColor="#64748B"
                keyboardType={opts.keyboard ?? 'default'}
                maxLength={opts.maxLength}
                autoCapitalize="characters"
                className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-base"
            />
            {!!opts.error && <Text className="text-amber-400 text-xs mt-1">{opts.error}</Text>}
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-slate-900">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
                <View className="px-6 pt-6 pb-2 flex-row items-center gap-3">
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className="w-10 h-10 bg-white/5 rounded-full items-center justify-center"
                    >
                        <Feather name="arrow-left" size={20} color="white" />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-white text-xl font-bold">Pay a Paybill</Text>
                        <Text className="text-slate-400 text-xs">Lipa na M-PESA with SHIF Auto-Deduct</Text>
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {field('Paybill number', paybill, (v) => setPaybill(v.replace(/\D/g, '')), {
                        placeholder: 'e.g. 888880',
                        keyboard: 'number-pad',
                        error: errors.paybill,
                        maxLength: 7,
                    })}
                    {field('Account number', account, setAccount, {
                        placeholder: 'e.g. 12345678',
                        error: errors.account,
                        maxLength: ACCOUNT_MAX + 5,
                    })}
                    {field('Business name (optional)', name, setName, {
                        placeholder: 'e.g. Naivas',
                        maxLength: 60,
                    })}
                    {field('Amount (KES)', amount, (v) => setAmount(v.replace(/\D/g, '')), {
                        placeholder: '0',
                        keyboard: 'number-pad',
                        error: errors.amount,
                        maxLength: 6,
                    })}

                    <View className="bg-teal-900/20 border border-teal-500/30 rounded-2xl p-4 mb-6 flex-row items-start gap-3">
                        <Feather name="shield" size={18} color="#34D399" style={{ marginTop: 2 }} />
                        <Text className="text-slate-300 text-xs leading-relaxed flex-1">{shifNote}</Text>
                    </View>

                    <TouchableOpacity
                        className={`rounded-2xl py-4 items-center ${valid ? 'bg-teal-500' : 'bg-slate-700'}`}
                        disabled={!valid}
                        onPress={() => setShowModal(true)}
                    >
                        <Text className="text-white font-bold text-base">Review payment</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>

            <MerchantPaymentModal
                visible={showModal}
                onClose={() => setShowModal(false)}
                merchantName={name.trim() || `Paybill ${paybill}`}
                merchantPaybill={paybill}
                merchantAccount={account.trim()}
                merchantAmount={amt}
                onSuccess={() => {
                    setAmount('');
                }}
            />
        </SafeAreaView>
    );
}