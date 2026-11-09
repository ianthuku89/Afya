import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller.js';
import { authenticate as authMiddleware } from '../middleware/auth.js';
const router = Router();

// ── AUTHENTICATED (mobile app) ────────────────────────────────────────────────

// POST /api/v1/payment/stkpush -> direct contribution STK push (mints AfyaTokens on success)
router.post('/stkpush', authMiddleware, paymentController.initiateStkPush);

// POST /api/v1/payment/shif-stkpush -> KES 30 SHIF daily deduction STK push (no minting)
router.post('/shif-stkpush', authMiddleware, paymentController.initiateSHIFStkPush);

// POST /api/v1/payment/merchant/quote -> what the customer will be charged (merchant + SHIF = total).
// Creates no transaction; the app displays these numbers before the push is sent.
router.post('/merchant/quote', authMiddleware, paymentController.quoteMerchantPayment);

// POST /api/v1/payment/merchant/stk-push -> single-prompt merchant payment (merchant + SHIF)
router.post('/merchant/stk-push', authMiddleware, paymentController.initiateMerchantStkPush);

// GET /api/v1/payment/status/:checkoutRequestId -> polled by the app.
// Falls back to Daraja STK Query if the callback is late or lost.
router.get('/status/:checkoutRequestId', authMiddleware, paymentController.getPaymentStatus);

// ── SAFARICOM WEBHOOKS (NO JWT: Safaricom cannot send one) ────────────────────
// The :secret path segment is the ONLY thing authenticating these calls.
// It must equal DARAJA_CALLBACK_SECRET; the controller checks it in constant time.
// The URLs given to Daraja are built in the controller (callbackUrl / shifCallbackUrl)
// as `${API_BASE_URL}/api/v1/payment/callback/${secret}`, so these paths must match.

// POST /api/v1/payment/callback/:secret -> direct contribution + merchant STK result
router.post('/callback/:secret', paymentController.darajaCallback);

// POST /api/v1/payment/shif-callback/:secret -> KES 30 SHIF result
router.post('/shif-callback/:secret', paymentController.darajaSHIFCallback);

// B2B disbursement results (merchant payout)
router.post('/b2b-result/:secret/:txId', paymentController.b2bResultHandler);   // NO auth
router.post('/b2b-timeout/:secret/:txId', paymentController.b2bTimeoutHandler); // NO auth

export const paymentRouter = router;