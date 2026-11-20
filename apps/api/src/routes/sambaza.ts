import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { hashPhone, normalizeKenyanPhone, maskPhone, maskName } from '../lib/crypto.js';
import {
    readPii,
    startOfEatDay,
    checkSambazaEligibility,
    initiateSambazaPayment,
    senderSambazaTotalToday,
    SAMBAZA_AMOUNT_KES,
    SAMBAZA_DAILY_CAP_KES,
} from '../controllers/payment.controller.js';

// NOTE: no /status route here. The app polls the existing GET /payment/status/:checkoutRequestId
// (it already has the STK Query fallback). See the getPaymentStatus patch.
export const sambazaRouter = Router();
sambazaRouter.use(authenticate);

// ── ZOD SCHEMAS ───────────────────────────────────────────────────────────────
const oneOfPhoneOrBeneficiary = (v: { phoneNumber?: string; beneficiaryId?: string }) => !!v.phoneNumber !== !!v.beneficiaryId;

const LookupSchema = z.object({
    phoneNumber: z.string().min(9).max(15).optional(),
    beneficiaryId: z.string().uuid().optional(),
}).strict().refine(oneOfPhoneOrBeneficiary, { message: 'Provide either phoneNumber or beneficiaryId' });

const ContributeSchema = z.object({
    phoneNumber: z.string().min(9).max(15).optional(),
    beneficiaryId: z.string().uuid().optional(),
    payerPhone: z.string().min(9).max(15).optional(), // M-PESA number to charge; defaults to the sender's own
}).strict().refine(oneOfPhoneOrBeneficiary, { message: 'Provide either phoneNumber or beneficiaryId' });

const SaveBeneficiarySchema = z.object({
    phoneNumber: z.string().min(9).max(15).optional(),
    transactionId: z.string().uuid().optional(), // save straight after a successful Sambaza
    nickname: z.string().min(1).max(40),
    relation: z.enum(['FAMILY', 'FRIEND']),
}).strict().refine((v) => !!v.phoneNumber !== !!v.transactionId, { message: 'Provide either phoneNumber or transactionId' });

const UpdateBeneficiarySchema = z.object({
    nickname: z.string().min(1).max(40).optional(),
    relation: z.enum(['FAMILY', 'FRIEND']).optional(),
}).strict();

// ── HELPERS ───────────────────────────────────────────────────────────────────
type Resolved = { recipientId: string } | { error: { status: number; code: string; message: string } };

async function resolveRecipient(senderId: string, input: { phoneNumber?: string; beneficiaryId?: string }): Promise<Resolved> {
    let recipientId: string | null = null;

    if (input.beneficiaryId) {
        const b = await prisma.beneficiary.findFirst({ where: { id: input.beneficiaryId, ownerId: senderId } });
        recipientId = b?.beneficiaryUserId ?? null;
    } else if (input.phoneNumber) {
        const normalized = normalizeKenyanPhone(input.phoneNumber);
        if (!normalized) return { error: { status: 400, code: 'INVALID_PHONE', message: 'Enter a valid Safaricom or Airtel number' } };
        const u = await prisma.user.findUnique({ where: { phoneHash: hashPhone(normalized) }, select: { id: true } });
        recipientId = u?.id ?? null;
    }

    if (!recipientId) return { error: { status: 404, code: 'RECIPIENT_NOT_FOUND', message: 'No Afya Token account uses that number' } };
    if (recipientId === senderId) return { error: { status: 400, code: 'SELF_SAMBAZA', message: 'Use Contribute to pay for yourself' } };
    return { recipientId };
}

function maskedPhoneOf(stored: string | null): string | null {
    const raw = readPii(stored);
    const n = raw ? normalizeKenyanPhone(raw) : null;
    return n ? maskPhone(n) : null;
}

const fail = (res: any, e: { status: number; code: string; message: string }) =>
    res.status(e.status).json({ success: false, error: { code: e.code, message: e.message } });

// ── GET /api/v1/sambaza/limits ────────────────────────────────────────────────
sambazaRouter.get('/limits', async (req, res, next) => {
    try {
        const used = await senderSambazaTotalToday(req.user!.userId);
        res.json({
            success: true,
            data: {
                amountKES: SAMBAZA_AMOUNT_KES,
                dailyCapKES: SAMBAZA_DAILY_CAP_KES,
                usedTodayKES: used,
                remainingKES: Math.max(0, SAMBAZA_DAILY_CAP_KES - used),
            },
        });
    } catch (err) { next(err); }
});

// ── POST /api/v1/sambaza/lookup ───────────────────────────────────────────────
// Confirms WHO the sender is about to pay and whether it can go ahead.
// Returns a masked name only (no tier, streak, balance or ID number).
sambazaRouter.post('/lookup', validate(LookupSchema), async (req, res, next) => {
    try {
        const senderId = req.user!.userId;
        const r = await resolveRecipient(senderId, req.body);
        if ('error' in r) return fail(res, r.error);

        const [recipient, eligibility, saved] = await Promise.all([
            prisma.user.findUnique({ where: { id: r.recipientId }, select: { fullName: true, phoneNumber: true } }),
            checkSambazaEligibility(senderId, r.recipientId),
            prisma.beneficiary.findUnique({
                where: { ownerId_beneficiaryUserId: { ownerId: senderId, beneficiaryUserId: r.recipientId } },
            }),
        ]);

        res.json({
            success: true,
            data: {
                recipientName: maskName(recipient!.fullName),
                recipientPhone: maskedPhoneOf(recipient!.phoneNumber),
                eligible: eligibility.ok,
                blockMessage: eligibility.ok ? null : eligibility.message,
                saved: saved ? { id: saved.id, nickname: saved.nickname, relation: saved.relation } : null,
            },
        });
    } catch (err) { next(err); }
});

// ── POST /api/v1/sambaza/contribute ───────────────────────────────────────────
// Sends the STK prompt to the SENDER's phone. The existing Daraja callback then credits the RECIPIENT.
// The app polls GET /payment/status/:checkoutRequestId with the id returned here.
sambazaRouter.post('/contribute', validate(ContributeSchema), async (req, res, next) => {
    try {
        const senderId = req.user!.userId;
        const r = await resolveRecipient(senderId, req.body);
        if ('error' in r) return fail(res, r.error);

        const result = await initiateSambazaPayment(senderId, r.recipientId, req.body.payerPhone);
        if (!result.ok) return fail(res, result);

        res.status(202).json({
            success: true,
            data: { transactionId: result.transactionId, checkoutRequestId: result.checkoutRequestId, amountKES: SAMBAZA_AMOUNT_KES },
        });
    } catch (err) { next(err); }
});

// ── GET /api/v1/sambaza/beneficiaries ─────────────────────────────────────────
sambazaRouter.get('/beneficiaries', async (req, res, next) => {
    try {
        const senderId = req.user!.userId;
        const [rows, paidToday] = await Promise.all([
            prisma.beneficiary.findMany({
                where: { ownerId: senderId },
                orderBy: [{ relation: 'asc' }, { nickname: 'asc' }],
                include: { beneficiary: { select: { fullName: true, phoneNumber: true } } },
            }),
            prisma.transaction.findMany({
                where: { senderUserId: senderId, source: 'SAMBAZA', status: 'CONFIRMED', createdAt: { gte: startOfEatDay() } },
                select: { recipientUserId: true },
            }),
        ]);
        const paidSet = new Set(paidToday.map((t) => t.recipientUserId));

        res.json({
            success: true,
            data: rows.map((b) => ({
                id: b.id,
                nickname: b.nickname,
                relation: b.relation,
                name: maskName(b.beneficiary.fullName),
                phone: maskedPhoneOf(b.beneficiary.phoneNumber),
                paidToday: paidSet.has(b.beneficiaryUserId),
            })),
        });
    } catch (err) { next(err); }
});

// ── POST /api/v1/sambaza/beneficiaries ────────────────────────────────────────
sambazaRouter.post('/beneficiaries', validate(SaveBeneficiarySchema), async (req, res, next) => {
    try {
        const senderId = req.user!.userId;
        const { phoneNumber, transactionId, nickname, relation } = req.body;

        let recipientId: string | null = null;
        if (transactionId) {
            const tx = await prisma.transaction.findFirst({
                where: { id: transactionId, senderUserId: senderId, source: 'SAMBAZA' },
                select: { recipientUserId: true },
            });
            recipientId = tx?.recipientUserId ?? null;
        } else {
            const r = await resolveRecipient(senderId, { phoneNumber });
            if ('error' in r) return fail(res, r.error);
            recipientId = r.recipientId;
        }
        if (!recipientId) return fail(res, { status: 404, code: 'RECIPIENT_NOT_FOUND', message: 'Recipient not found' });

        const key = { ownerId_beneficiaryUserId: { ownerId: senderId, beneficiaryUserId: recipientId } };
        const existing = await prisma.beneficiary.findUnique({ where: key });
        if (!existing && (await prisma.beneficiary.count({ where: { ownerId: senderId } })) >= 30) {
            return fail(res, { status: 409, code: 'BENEFICIARY_LIMIT', message: 'You can save up to 30 people' });
        }

        const saved = await prisma.beneficiary.upsert({
            where: key,
            create: { ownerId: senderId, beneficiaryUserId: recipientId, nickname, relation },
            update: { nickname, relation },
            select: { id: true, nickname: true, relation: true },
        });
        res.status(existing ? 200 : 201).json({ success: true, data: saved });
    } catch (err) { next(err); }
});

// ── PATCH /api/v1/sambaza/beneficiaries/:id ───────────────────────────────────
sambazaRouter.patch('/beneficiaries/:id', validate(UpdateBeneficiarySchema), async (req, res, next) => {
    try {
        const result = await prisma.beneficiary.updateMany({ where: { id: req.params.id, ownerId: req.user!.userId }, data: req.body });
        if (result.count === 0) return fail(res, { status: 404, code: 'NOT_FOUND', message: 'Beneficiary not found' });
        res.json({ success: true, data: { message: 'Updated' } });
    } catch (err) { next(err); }
});

// ── DELETE /api/v1/sambaza/beneficiaries/:id ──────────────────────────────────
sambazaRouter.delete('/beneficiaries/:id', async (req, res, next) => {
    try {
        const result = await prisma.beneficiary.deleteMany({ where: { id: req.params.id, ownerId: req.user!.userId } });
        if (result.count === 0) return fail(res, { status: 404, code: 'NOT_FOUND', message: 'Beneficiary not found' });
        res.json({ success: true, data: { message: 'Removed' } });
    } catch (err) { next(err); }
});