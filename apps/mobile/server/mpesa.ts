// server/mpesa.ts  (Express + TypeScript)  npm i axios express
import axios from 'axios';
import { Router, Request, Response } from 'express';

const {
  DARAJA_ENV,            // 'sandbox' | 'production'
  DARAJA_CONSUMER_KEY,
  DARAJA_CONSUMER_SECRET,
  DARAJA_SHORTCODE,      // sandbox: 174379
  DARAJA_PASSKEY,        // sandbox passkey from the Daraja portal
  DARAJA_CALLBACK_URL,   // public HTTPS, https://afya-cvq5.onrender.com/payment/callback
} = process.env;

const BASE =
  DARAJA_ENV === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';

// ---------- helpers ----------
let tokenCache: { token: string; exp: number } | null = null;

async function getToken(): Promise<string> {
  if (tokenCache && tokenCache.exp > Date.now() + 10_000) return tokenCache.token;
  const auth = Buffer.from(`${DARAJA_CONSUMER_KEY}:${DARAJA_CONSUMER_SECRET}`).toString('base64');
  const { data } = await axios.get(`${BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  tokenCache = { token: data.access_token, exp: Date.now() + Number(data.expires_in) * 1000 };
  return tokenCache.token;
}

// YYYYMMDDHHmmss in Nairobi time (UTC+3)
function timestamp(): string {
  const d = new Date(Date.now() + 3 * 3600 * 1000);
  return d.toISOString().replace(/[-:T]/g, '').slice(0, 14);
}

// 0712345678 | +254712345678 | 712345678 -> 254712345678
export function normalizePhone(p: string): string {
  const digits = p.replace(/\D/g, '');
  if (digits.startsWith('254')) return digits;
  if (digits.startsWith('0')) return '254' + digits.slice(1);
  return '254' + digits;
}

// ---------- payment store (REPLACE with your DB: Prisma/Mongo/etc.) ----------
type Payment = {
  checkoutRequestId: string;
  merchantRequestId: string;
  userId: string;
  amount: number;
  purpose: 'SHIF' | 'MERCHANT';
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  resultCode?: number;
  resultDesc?: string;
  receipt?: string;
  createdAt: number;
};
const payments = new Map<string, Payment>();

// ---------- routes ----------
const router = Router();

// 1) Initiate STK push  (protect with your auth middleware; assumes req.user)
router.post('/payment/stkpush', async (req: Request & { user?: any }, res: Response) => {
  try {
    const { amount, phone, accountReference, description, purpose = 'SHIF' } = req.body;
    const amt = Math.round(Number(amount));
    if (!amt || amt < 1 || amt > 150000) return res.status(400).json({ error: 'Invalid amount' });

    const msisdn = normalizePhone(phone || req.user?.phone || '');
    if (!/^254[17]\d{8}$/.test(msisdn)) return res.status(400).json({ error: 'Invalid phone number' });

    const ts = timestamp();
    const password = Buffer.from(`${DARAJA_SHORTCODE}${DARAJA_PASSKEY}${ts}`).toString('base64');
    const token = await getToken();

    const { data } = await axios.post(
      `${BASE}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: DARAJA_SHORTCODE,
        Password: password,
        Timestamp: ts,
        TransactionType: 'CustomerPayBillOnline', // use CustomerBuyGoodsOnline for a Till
        Amount: amt,
        PartyA: msisdn,
        PartyB: DARAJA_SHORTCODE,
        PhoneNumber: msisdn,
        CallBackURL: DARAJA_CALLBACK_URL,
        AccountReference: String(accountReference || req.user?.nationalId || 'AfyaToken').slice(0, 12),
        TransactionDesc: String(description || 'AfyaToken').slice(0, 13),
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (data.ResponseCode !== '0') {
      return res.status(502).json({ error: data.ResponseDescription || 'Daraja rejected the request' });
    }

    payments.set(data.CheckoutRequestID, {
      checkoutRequestId: data.CheckoutRequestID,
      merchantRequestId: data.MerchantRequestID,
      userId: req.user?.id ?? 'anon',
      amount: amt,
      purpose,
      status: 'PENDING',
      createdAt: Date.now(),
    });

    // same shape your app already reads: res.data.data.checkoutRequestId
    res.json({ data: { checkoutRequestId: data.CheckoutRequestID } });
  } catch (e: any) {
    console.error('STK error', e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data?.errorMessage || 'Failed to initiate M-PESA push' });
  }
});

// 2) Daraja callback (called by Safaricom, NOT by your app). Must be public HTTPS.
router.post('/payment/callback', (req: Request, res: Response) => {
  // Always ACK quickly, then process
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

  const cb = req.body?.Body?.stkCallback;
  // Visible in the Render logs so you can confirm Safaricom is reaching you
  console.log('M-PESA callback:', JSON.stringify(req.body));
  if (!cb) return;
  const p = payments.get(cb.CheckoutRequestID);
  if (!p || p.status !== 'PENDING') return; // unknown or already processed (idempotent)

  p.resultCode = cb.ResultCode;
  p.resultDesc = cb.ResultDesc;

  if (cb.ResultCode === 0) {
    const items: { Name: string; Value?: any }[] = cb.CallbackMetadata?.Item || [];
    const get = (n: string) => items.find((i) => i.Name === n)?.Value;
    if (Number(get('Amount')) !== p.amount) {
      p.status = 'FAILED';
      p.resultDesc = 'Amount mismatch';
      return;
    }
    p.status = 'SUCCESS';
    p.receipt = get('MpesaReceiptNumber');
    // TODO: on SHIF success -> increment streak / tier in your DB here
  } else {
    p.status = 'FAILED'; // 1032 cancelled, 2001 wrong PIN, 1037 timeout, 1 insufficient funds
  }
});

// 3) Status (polled by the app). Falls back to STK Query if callback is late.
router.get('/payment/status/:id', async (req: Request, res: Response) => {
  const p = payments.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });

  if (p.status === 'PENDING' && Date.now() - p.createdAt > 20_000) {
    try {
      const ts = timestamp();
      const password = Buffer.from(`${DARAJA_SHORTCODE}${DARAJA_PASSKEY}${ts}`).toString('base64');
      const token = await getToken();
      const { data } = await axios.post(
        `${BASE}/mpesa/stkpushquery/v1/query`,
        {
          BusinessShortCode: DARAJA_SHORTCODE,
          Password: password,
          Timestamp: ts,
          CheckoutRequestID: p.checkoutRequestId,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.ResultCode !== undefined) {
        const code = Number(data.ResultCode);
        // Only mark failure here; success needs the receipt from the callback
        if (code !== 0) {
          p.status = 'FAILED';
          p.resultCode = code;
          p.resultDesc = data.ResultDesc;
        }
      }
    } catch {
      /* query returns an error while the request is still being processed; ignore */
    }
  }

  res.json({
    status: p.status,
    receipt: p.receipt,
    resultCode: p.resultCode,
    message: p.resultDesc,
  });
});

export default router;

/*
.env
DARAJA_ENV=sandbox
DARAJA_CONSUMER_KEY=...
DARAJA_CONSUMER_SECRET=...
DARAJA_SHORTCODE=174379
DARAJA_PASSKEY=...
DARAJA_CALLBACK_URL=https://afya-cvq5.onrender.com/payment/callback

app.ts:  app.use(express.json()); app.use(mpesaRouter);
*/