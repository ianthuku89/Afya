import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// /api/v1/payment/stkpush  -> Initiates STK push to user's phone
router.post('/stkpush', authenticate, paymentController.initiateStkPush);

// /api/v1/payment/callback -> Asynchronous webhook from Safaricom Daraja
// No requireAuth here; Daraja server hits this endpoint directly. We validate payloads via IP/Auth headers.
router.post('/callback', paymentController.darajaCallback);

export const paymentRouter = router;
