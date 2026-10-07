import { client } from './client';

export type PaymentResult = {
  status: 'SUCCESS' | 'FAILED' | 'TIMEOUT';
  receipt?: string;
  message?: string;
  streak?: number;
  tier?: string; // e.g. "Bronze"
};

/**
 * Your API returns errors in three shapes: a string, a Zod message list, or
 * { code, message }. This flattens all of them into text safe for Alert.alert.
 */
export function errorMessage(e: any, fallback = 'Something went wrong'): string {
  const err = e?.response?.data?.error;
  const detail = e?.response?.data?.detail;
  if (typeof err === 'string') return detail ? `${err}: ${detail}` : err;
  if (Array.isArray(err)) return err.map((x: any) => x?.message).filter(Boolean).join(', ') || fallback;
  if (err?.message) return err.message;
  return e?.response?.data?.message || e?.message || fallback;
}

/** Direct contribution / merchant amount -> POST /payment/stkpush */
export async function startStkPush(params: {
  amount: number;
  phone?: string; // optional: backend falls back to the user's saved phone
  description?: string;
}): Promise<string> {
  const res = await client.post('/payment/stkpush', {
    amount: params.amount,
    currency: 'KES', // required by the backend schema
    phone: params.phone,
    description: params.description,
  });
  const id = res.data?.data?.checkoutRequestId;
  if (!id) throw new Error('No checkoutRequestId returned');
  return id;
}

/** KES 30 SHIF prompt (no token minting) -> POST /payment/shif-stkpush */
export async function startShifPush(triggerTxRef: string, phone?: string): Promise<string> {
  const res = await client.post('/payment/shif-stkpush', { triggerTxRef, phone });
  const id = res.data?.data?.checkoutRequestId;
  if (!id) throw new Error('No checkoutRequestId returned');
  return id;
}

/**
 * Polls GET /payment/status/:id until the payment is settled, or we time out.
 * The backend answers { status: 'PENDING' | 'SUCCESS' | 'FAILED', receipt, resultCode, message, streak, tier }.
 * If the Daraja callback is late, the backend asks Daraja directly, so this keeps working
 * even when the callback cannot reach the server.
 */
export async function waitForPayment(
  checkoutRequestId: string,
  { intervalMs = 4000, timeoutMs = 90_000 } = {}
): Promise<PaymentResult> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, intervalMs));
    try {
      const res = await client.get(`/payment/status/${checkoutRequestId}`);
      const d = res.data?.data;
      if (d?.status === 'SUCCESS') {
        return {
          status: 'SUCCESS',
          receipt: d.receipt ?? undefined,
          streak: d.streak ?? undefined,
          tier: d.tier ? String(d.tier).charAt(0).toUpperCase() + String(d.tier).slice(1).toLowerCase() : undefined,
        };
      }
      if (d?.status === 'FAILED') {
        return { status: 'FAILED', message: friendly(d.resultCode, d.message) };
      }
      // 'PENDING' -> keep polling
    } catch {
      /* transient network error or Render waking up: keep polling */
    }
  }
  return {
    status: 'TIMEOUT',
    message: 'We did not get a confirmation. Check your M-PESA messages before retrying.',
  };
}

function friendly(code?: number | null, fallback?: string | null) {
  switch (code) {
    case 1032: return 'You cancelled the payment.';
    case 2001: return 'Wrong M-PESA PIN entered.';
    case 1: return 'Insufficient M-PESA balance.';
    case 1037: return 'The prompt timed out. Please try again.';
    default: return fallback || 'Payment failed.';
  }
}