import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { UserRole, AuditAction } from '@afyaToken/types';

export const claimsRouter = Router();
claimsRouter.use(authenticate);

// ── ZOD SCHEMAS ───────────────────────────────────────────────────────────────
const CreateClaimSchema = z.object({
    patientId: z.string().uuid(),
    facilityId: z.string().uuid(),
    service: z.enum(['OUTPATIENT', 'INPATIENT', 'SURGERY', 'EMERGENCY', 'MATERNAL', 'LAB_TESTS', 'PHARMACY', 'DENTAL', 'RADIOLOGY']),
    icd10Code: z.string().min(3).max(16).regex(/^[A-Z][0-9]{2}(\.[0-9A-Z]{0,4})?$/, 'Invalid ICD-10 format'),
    amountKES: z.number().positive().max(5_000_000),
}).strict();

const ReviewSchema = z.object({
    status: z.enum(['APPROVED', 'REJECTED']),
    reviewNotes: z.string().max(1000).optional(),
}).strict();

// ── GET /api/v1/claims ─────────────────────────────────────────────────────────
claimsRouter.get('/', authorize(UserRole.SUPER_ADMIN, UserRole.SHA_ADMIN, UserRole.FACILITY), async (req, res, next) => {
    try {
        const { page = '1', pageSize = '20', status } = req.query as Record<string, string>;
        const skip = (Number(page) - 1) * Number(pageSize);

        const where = status ? { status: status as any } : {};

        const [claims, total] = await Promise.all([
            prisma.claim.findMany({
                where,
                skip,
                take: Number(pageSize),
                orderBy: { createdAt: 'desc' },
                include: {
                    patient: { select: { fullName: true, shaId: true } },
                    facility: { select: { name: true, county: true } },
                },
            }),
            prisma.claim.count({ where }),
        ]);

        await (req as any).audit(AuditAction.VIEW_CLAIM, 'claims-list', true);
        res.json({ success: true, data: claims, meta: { page: Number(page), pageSize: Number(pageSize), total } });
    } catch (err) { next(err); }
});

// ── POST /api/v1/claims ────────────────────────────────────────────────────────
claimsRouter.post('/', authorize(UserRole.FACILITY, UserRole.SHA_ADMIN), validate(CreateClaimSchema), async (req, res, next) => {
    try {
        const { patientId, facilityId, service, icd10Code, amountKES } = req.body;

        // Call AI fraud service before creating claim
        let aiScore = 80; let aiFlags: string[] = []; let aiRecommendation = 'APPROVE';
        try {
            const fraudRes = await fetch(`${process.env.ML_SERVICE_URL}/api/v1/fraud/score`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.ML_SERVICE_KEY}` },
                body: JSON.stringify({ claim_amount: amountKES, facility_id: facilityId, patient_id: patientId, icd10_code: icd10Code }),
            });
            if (fraudRes.ok) {
                const fd = await fraudRes.json() as any;
                aiScore = Math.round(fd.score * 100);
                aiFlags = fd.flags;
                aiRecommendation = fd.recommendation;
            }
        } catch { /* Fraud service unavailable — flag for manual review */ aiRecommendation = 'REVIEW'; }

        const claimNumber = `CLM-${Date.now().toString().slice(-5)}`;
        // Tokens are 1:1 with KES (1 KES -> 1 AFYA)
        const amountAfyaToken = amountKES;

        const claim = await prisma.claim.create({
            data: {
                claimNumber,
                patientId,
                facilityId,
                service,
                icd10Code,
                reimbursementKES: amountKES,
                reimbursementAfya: amountAfyaToken,
                aiScore,
                aiFlags,
                aiRecommendation: aiRecommendation as any,
                status: aiRecommendation === 'BLOCK' ? 'FLAGGED' : 'PENDING',
            },
        });

        await (req as any).audit(AuditAction.CREATE_CLAIM, claim.id, true);
        res.status(201).json({ success: true, data: claim });
    } catch (err) { next(err); }
});

// ── PATCH /api/v1/claims/:id/review ───────────────────────────────────────────
claimsRouter.patch('/:id/review', authorize(UserRole.SUPER_ADMIN, UserRole.SHA_ADMIN), validate(ReviewSchema), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, reviewNotes } = req.body;

        const claim = await prisma.claim.update({
            where: { id },
            data: { status, reviewNotes, reviewerId: req.user!.userId },
        });

        // Seaboard Revenue Model: 1.75% fee on APPROVED or REIMBURSED claims
        if (status === 'APPROVED' || status === 'REIMBURSED') {
            const fee = Number(claim.reimbursementKES) * 0.0175;
            await prisma.revenueLedger.upsert({
                where: { claimId: id },
                update: { seaboardFeeKES: fee, claimAmountKES: claim.reimbursementKES },
                create: {
                    claimId: id,
                    claimAmountKES: claim.reimbursementKES,
                    seaboardFeeKES: fee,
                    status: 'UNBILLED'
                }
            });
        }

        const action = status === 'APPROVED' ? AuditAction.APPROVE_CLAIM : AuditAction.REJECT_CLAIM;
        await (req as any).audit(action, id, true);
        res.json({ success: true, data: claim });
    } catch (err) { next(err); }
});

