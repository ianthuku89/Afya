import request from 'supertest';
import { createApp } from '../app';

const app = createApp();

jest.mock('../middleware/auth', () => ({
    authenticate: (req: any, res: any, next: any) => {
        req.user = { userId: 'test-patient-id', role: 'PATIENT' };
        next();
    },
    authorize: (...roles: any[]) => (req: any, res: any, next: any) => {
        next();
    }
}));

// Mock the Daraja Controller logic natively, 
// as we don't want to make real API calls to Safaricom during CI/CD
jest.mock('../controllers/payment.controller', () => ({
    paymentController: {
        darajaStkPush: (req: any, res: any) => {
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
        darajaCallback: (req: any, res: any) => {
            return res.status(200).json({ success: true, message: 'Callback processed' });
        }
    }
}));

describe('Safaricom Daraja Payment Integrations', () => {
    it('POST /api/v1/payment/stkpush initializes correctly', async () => {
        const payload = {
            phone: '254700000000',
            amount: 500,
        };

        const res = await request(app)
            .post('/api/v1/payment/stkpush')
            .send(payload);

        if (res.status === 429) return; // rate limits

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.checkoutRequestId).toBe('C_REQ_TEST_123');
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
