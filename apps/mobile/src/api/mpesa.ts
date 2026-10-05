// src/api/mpesa.ts
import { client } from './client';

export type PaymentResult = {
  status: 'SUCCESS' | 'FAILED' | 'TIMEOUT';
  receipt?: string;
  message?: string;
};

export async function startStkPush(params: {
  amount: number;
  phone?: string;            // optional if backend knows the user's phone
  accountReference?: string; // National ID for SHIF paybill
  description: string;
  purpose: 'SHIF' | 'MERCHANT';
}): Promise<string> {
  const res = await client.post('/payment/stkpush', params);
  const id = res.data?.data?.checkoutRequestId;
  if (!id) throw new Error('No checkoutRequestId returned');
  return id;
}

// Polls the backend until the callback result lands (or we time out)
export async function waitForPayment(
  checkoutRequestId: string,
  { intervalMs = 3000, timeoutMs = 90_000 } = {}
): Promise<PaymentResult> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, intervalMs));
    try {
      const { data } = await client.get(`/payment/status/${checkoutRequestId}`);
      if (data.status === 'SUCCESS') return { status: 'SUCCESS', receipt: data.receipt };
      if (data.status === 'FAILED') return { status: 'FAILED', message: friendly(data.resultCode, data.message) };
    } catch {
      /* transient network error: keep polling */
    }
  }
  return { status: 'TIMEOUT', message: 'We did not get a confirmation. Check your M-PESA messages before retrying.' };
}

function friendly(code?: number, fallback?: string) {
  switch (code) {
    case 1032: return 'You cancelled the payment.';
    case 2001: return 'Wrong M-PESA PIN entered.';
    case 1: return 'Insufficient M-PESA balance.';
    case 1037: return 'The prompt timed out. Please try again.';
    default: return fallback || 'Payment failed.';
  }
}

/* =====================================================================
   PATCH 1: ContributeScreen.tsx  -> replace handleMpesaPush
   (import { startStkPush, waitForPayment } from '../../api/mpesa';)
   ===================================================================== */
/*
const handleMpesaPush = async () => {
  if (amount > 100) { setMerchantModalVisible(true); return; }

  setLoading(true);
  try {
    const id = await startStkPush({
      amount,
      accountReference: user.nationalId,   // from your auth context
      description: 'SHIF',
      purpose: 'SHIF',
    });
    Alert.alert('STK Push Sent', `Enter your M-PESA PIN for KES ${amount}.`);

    const result = await waitForPayment(id);
    if (result.status === 'SUCCESS') {
      // Ideally the backend returns the real streak/tier; fetch it instead of hardcoding
      const { data } = await client.get('/streak');
      setSuccessData({ tx: result.receipt!, newStreak: data.streak, newTier: data.tier });
    } else {
      Alert.alert('Payment not completed', result.message);
    }
  } catch (e: any) {
    Alert.alert('Payment Failed', e.response?.data?.error || e.message);
  } finally {
    setLoading(false);
  }
};
*/

/* =====================================================================
   PATCH 2: MerchantPaymentModal.tsx -> replace the setTimeout flow
   Prompt 2 must only fire after prompt 1 is CONFIRMED by the callback.
   ===================================================================== */
/*
const handlePayWithShifDeduct = async () => {
  setLoading(true);
  setStep('processing');
  try {
    setStatusMessage(`Prompt 1: enter PIN for KES ${merchantAmount}...`);
    const id1 = await startStkPush({
      amount: merchantAmount, description: 'Merchant', purpose: 'MERCHANT',
    });
    const r1 = await waitForPayment(id1);
    if (r1.status !== 'SUCCESS') throw new Error(r1.message);

    if (!isQualifying) { finish(false); return; }

    setStatusMessage(`Prompt 2: enter PIN for KES 30 SHIF (A/C ${nationalId})...`);
    const id2 = await startStkPush({
      amount: 30, accountReference: nationalId, description: 'SHIF', purpose: 'SHIF',
    });
    const r2 = await waitForPayment(id2);
    setStatusMessage(r2.status === 'SUCCESS'
      ? 'Both payments confirmed.'
      : 'Merchant paid. SHIF contribution not completed; you can retry from the Contribute screen.');
    finish(r2.status === 'SUCCESS');
  } catch (e: any) {
    setLoading(false);
    setStep('preview');
    Alert.alert('Payment Failed', e.message);
  }
};

const finish = (shifDeducted: boolean) => {
  setStep('completed');
  setLoading(false);
  onSuccess?.({ merchantAmount, shifDeducted });
};
*/