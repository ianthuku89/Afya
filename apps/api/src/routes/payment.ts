import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// ── AUTHENTICATED (mobile app) ────────────────────────────────────────────────

// POST /api/v1/payment/stkpush -> direct contribution STK push (mints AfyaTokens on success)
router.post('/stkpush', authenticate, paymentController.initiateStkPush);

// POST /api/v1/payment/shif-stkpush -> KES 30 SHIF daily deduction STK push (no minting)
router.post('/shif-stkpush', authenticate, paymentController.initiateSHIFStkPush);

// GET /api/v1/payment/status/:checkoutRequestId -> polled by the app.
// Falls back to Daraja STK Query if the callback is late or lost.
router.get('/status/:checkoutRequestId', authenticate, paymentController.getPaymentStatus);

// ── SAFARICOM WEBHOOKS (NO JWT: Safaricom cannot send one) ────────────────────
// The :secret path segment is the ONLY thing authenticating these calls.
// It must equal DARAJA_CALLBACK_SECRET; the controller checks it in constant time.
// The URLs given to Daraja are built in the controller (callbackUrl / shifCallbackUrl)
// as `${API_BASE_URL}/api/v1/payment/callback/${secret}`, so these paths must match.

// POST /api/v1/payment/callback/:secret -> direct contribution result
router.post('/callback/:secret', paymentController.darajaCallback);

// POST /api/v1/payment/shif-callback/:secret -> KES 30 SHIF result
router.post('/shif-callback/:secret', paymentController.darajaSHIFCallback);

export const paymentRouter = router;