import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Modal,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { client } from '../../api/client';
import MerchantPaymentModal from './MerchantPaymentModal';

// Register this screen in your navigator as "PayMerchant".

const PAYBILL_RE = /^\d{5,7}$/;
const ACCOUNT_MAX = 13; // Daraja B2B AccountReference limit; keep in sync with the server schema

type QuoteReason = 'APPLIES' | 'BELOW_THRESHOLD' | 'NOT_OPTED_IN' | 'ALREADY_PAID_TODAY' | 'DECLINED';
type Quote = {
    merchantAmountKES: number;
    shifAmountKES: number;
    totalKES: number;
    reason: QuoteReason;
};

const NO_SHIF_REASON: Record<Exclude<QuoteReason, 'APPLIES'>, string> = {
    BELOW_THRESHOLD: 'Payments of KES 100 or below don’t include a SHIF contribution.',
    NOT_OPTED_IN: 'No SHIF contribution is added because Auto-Deduct is turned off.',
    ALREADY_PAID_TODAY: 'No SHIF contribution is added because today’s contribution is already done.',
    DECLINED: 'No SHIF contribution is added to this payment.',
};

export default function PayMerchantScreen() {
    const navigation = useNavigation<any>();
    const [paybill, setPaybill] = useState('');
    const [account, setAccount] = useState('');
    const [amount, setAmount] = useState('');
    const [name, setName] = useState('');
    const [showInfo, setShowInfo] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [quote, setQuote] = useState<Quote | null>(null);
    const [quoting, setQuoting] = useState(false);

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

    const merchantLabel = name.trim() || `Paybill ${paybill}`;

    // Ask the SERVER what will be charged, then show the explanation popup.
    const handleReview = async () => {
        if (!valid || quoting) return;
        setQuoting(true);
        try {
            const res = await client.post('/payment/merchant/quote', { merchantAmount: amt });
            setQuote(res.data.data as Quote);
            setShowInfo(true);
        } catch (e: any) {
            Alert.alert(
                'Couldn’t load payment details',
                e.response?.data?.error || 'Check your connection and try again. You have not been charged.'
            );
        } finally {
            setQuoting(false);
        }
    };

    // "Okay" closes the info popup and opens the M-PESA confirmation sheet.
    const handleInfoOkay = () => {
        setShowInfo(false);
        setShowModal(true);
    };

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

    const hasShif = (quote?.shifAmountKES ?? 0) > 0;

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
                        <Text className="text-slate-300 text-xs leading-relaxed flex-1">
                            Payments over KES 100 can include a KES 30 SHIF contribution. You’ll see exactly how
                            your money is split before you pay.
                        </Text>
                    </View>

                    <TouchableOpacity
                        className={`rounded-2xl py-4 items-center ${valid && !quoting ? 'bg-teal-500' : 'bg-slate-700'}`}
                        disabled={!valid || quoting}
                        onPress={handleReview}
                    >
                        {quoting ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white font-bold text-base">Review payment</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* ── Info popup: where the money goes ─────────────────────────────── */}
            <Modal
                visible={showInfo}
                transparent
                animationType="fade"
                onRequestClose={() => setShowInfo(false)}
            >
                <View className="flex-1 bg-black/80 items-center justify-center px-6">
                    <View className="w-full bg-slate-900 border border-slate-700 rounded-3xl p-6">
                        <View className="items-center mb-4">
                            <View className="w-14 h-14 rounded-full bg-teal-500/20 border border-teal-500/30 items-center justify-center mb-3">
                                <Feather name="info" size={26} color="#34D399" />
                            </View>
                            <Text className="text-white font-bold text-lg">How your payment is split</Text>
                        </View>

                        {quote && (
                            <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
                                <View
                                    className={`flex-row justify-between items-center py-2 ${
                                        hasShif ? 'border-b border-white/10' : ''
                                    }`}
                                >
                                    <View className="flex-1 pr-3">
                                        <Text className="text-white font-medium text-sm">{merchantLabel}</Text>
                                        <Text className="text-slate-500 text-xs">Goes to the merchant</Text>
                                    </View>
                                    <Text className="text-white font-bold text-base">
                                        KES {quote.merchantAmountKES}
                                    </Text>
                                </View>

                                {hasShif && (
                                    <View className="flex-row justify-between items-center py-2">
                                        <View className="flex-1 pr-3">
                                            <Text className="text-teal-300 font-medium text-sm">
                                                Your SHIF account
                                            </Text>
                                            <Text className="text-slate-500 text-xs">
                                                Daily healthcare contribution
                                            </Text>
                                        </View>
                                        <Text className="text-teal-300 font-bold text-base">
                                            KES {quote.shifAmountKES}
                                        </Text>
                                    </View>
                                )}

                                <View className="flex-row justify-between items-center pt-3 mt-1 border-t border-white/10">
                                    <Text className="text-white font-bold">You will pay</Text>
                                    <Text className="text-white font-bold text-xl">KES {quote.totalKES}</Text>
                                </View>
                            </View>
                        )}

                        <Text className="text-slate-300 text-xs leading-relaxed text-center mb-5">
                            {quote && hasShif
                                ? `KES ${quote.merchantAmountKES} will be sent to ${merchantLabel} and KES ${quote.shifAmountKES} will be added to your SHIF account. Your M-PESA prompt will show the combined total of KES ${quote.totalKES}.`
                                : quote && quote.reason !== 'APPLIES'
                                  ? `KES ${quote.merchantAmountKES} will be sent to ${merchantLabel}. ${NO_SHIF_REASON[quote.reason]}`
                                  : ''}
                        </Text>

                        <TouchableOpacity
                            className="bg-teal-500 rounded-2xl py-4 items-center mb-2"
                            onPress={handleInfoOkay}
                        >
                            <Text className="text-white font-bold text-base">Okay</Text>
                        </TouchableOpacity>
                        <TouchableOpacity className="py-3 items-center" onPress={() => setShowInfo(false)}>
                            <Text className="text-slate-400 text-sm">Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <MerchantPaymentModal
                visible={showModal}
                onClose={() => setShowModal(false)}
                merchantName={merchantLabel}
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