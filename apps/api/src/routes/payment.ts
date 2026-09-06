import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// /api/v1/payment/stkpush  -> Initiates direct contribution STK push
router.post('/stkpush', authenticate, paymentController.initiateStkPush);

// /api/v1/payment/shif-stkpush -> Initiates real-time STK Push #2 for KES 30 SHIF daily deduction (Paybill 200222)
router.post('/shif-stkpush', authenticate, paymentController.initiateSHIFStkPush);

// /api/v1/payment/callback -> Asynchronous webhook from Safaricom Daraja for direct contributions
router.post('/callback', paymentController.darajaCallback);

// /api/v1/payment/shif-callback -> Webhook from Safaricom Daraja for Paybill 200222 (SHA SHIF) payments
router.post('/shif-callback', paymentController.darajaSHIFCallback);

export const paymentRouter = router;
