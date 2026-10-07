import { client } from './client';

export const paymentApi = {
  // Direct contribution. Backend minimum is KES 30, whole shillings only.
  // phone is optional (07.., 01.., +254.. and 254.. are all accepted).
  stkPush: (amount: number, phone?: string) =>
    client.post('/payment/stkpush', { amount, currency: 'KES', phone }),

  // SHIF KES 30 deduction. triggerTxRef = checkoutRequestId from the first push.
  // Uses its own route so no AfyaTokens are minted.
  shifStkPush: (triggerTxRef: string, phone?: string) =>
    client.post('/payment/shif-stkpush', { triggerTxRef, phone }),

  // Poll with the CheckoutRequestID returned by either push.
  // Response: { success, data: { status: 'PENDING' | 'CONFIRMED' | 'FAILED', ... } }
  status: (checkoutRequestId: string) =>
    client.get(`/payment/status/${checkoutRequestId}`),
};

// Poll every 3s for up to 60s; resolves with the final status.
export async function waitForPayment(
  checkoutRequestId: string,
  intervalMs = 3000,
  timeoutMs = 60000,
): Promise<'CONFIRMED' | 'FAILED' | 'TIMEOUT'> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const { data } = await paymentApi.status(checkoutRequestId);
      const status = data?.data?.status;
      if (status === 'CONFIRMED' || status === 'FAILED') return status;
    } catch {
      // transient network error: keep polling
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return 'TIMEOUT';
}