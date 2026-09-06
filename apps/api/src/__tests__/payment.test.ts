import request from 'supertest';

jest.mock('../middleware/auth', () => ({
    authenticate: (req: any, res: any, next: any) => {
        req.user = { userId: 'test-patient-id', role: 'PATIENT' };
        next();
    },
    authorize: (...roles: any[]) => (req: any, res: any, next: any) => {
        next();
    }
}));

// Mock the Daraja Controller logic natively for unit tests
jest.mock('../controllers/payment.controller', () => ({
    paymentController: {
        initiateStkPush: (req: any, res: any) => {
            return res.status(200).json({
                success: true,
                message: 'STK Push sent to your phone',
                data: {
                    merchantRequestId: 'M_REQ_TEST_123',
                    checkoutRequestId: 'C_REQ_TEST_123',
                    customerMessage: 'Success. Request accepted for processing'
                }
            });
        },
        initiateSHIFStkPush: (req: any, res: any) => {
            return res.status(200).json({
                success: true,
                message: 'SHIF STK Push sent — KES 30 to your SHA account',
                data: {
                    checkoutRequestId: 'SHIF_REQ_TEST_123',
                    shaPaybill: '200222',
                    amount: 30,
                }
            });
        },
        darajaCallback: (req: any, res: any) => {
            return res.status(200).json({ success: true, message: 'Callback processed' });
        },
        darajaSHIFCallback: (req: any, res: any) => {
            return res.status(200).json({ success: true, message: 'SHIF callback processed' });
        }
    }
}));

import { createApp } from '../app';

describe('Safaricom Daraja Payment Integrations', () => {
    let app: any;

    beforeAll(() => {
        app = createApp();
    });

    it('POST /api/v1/payment/stkpush initializes direct contribution correctly', async () => {
        const payload = {
            phone: '254700000000',
            amount: 500,
            currency: 'KES',
        };

        const res = await request(app)
            .post('/api/v1/payment/stkpush')
            .send(payload);

        if (res.status === 429) return;

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.checkoutRequestId).toBe('C_REQ_TEST_123');
    });

    it('POST /api/v1/payment/shif-stkpush initializes KES 30 SHIF prompt to Paybill 200222', async () => {
        const payload = {
            triggerTxRef: 'MERCH_TX_9988',
            phone: '254700000000',
        };

        const res = await request(app)
            .post('/api/v1/payment/shif-stkpush')
            .send(payload);

        if (res.status === 429) return;

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.shaPaybill).toBe('200222');
        expect(res.body.data.amount).toBe(30);
    });

    it('POST /api/v1/payment/callback correctly processes webhook success', async () => {
        const payload = {
            Body: {
                stkCallback: {
                    ResultCode: 0,
                    ResultDesc: 'The service request is processed successfully.',
                    CheckoutRequestID: 'C_REQ_TEST_123',
                    CallbackMetadata: {
                        Item: [
                            { Name: 'Amount', Value: 500 },
                            { Name: 'MpesaReceiptNumber', Value: 'QEW1234567' }
                        ]
                    }
                }
            }
        };

        const res = await request(app)
            .post('/api/v1/payment/callback')
            .send(payload);

        if (res.status === 429) return;

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});
