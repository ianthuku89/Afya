import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@afyaToken/types';
import { prisma } from '../lib/prisma';

export const fraudRouter = Router();

fraudRouter.use(authenticate);

// ── POST /api/v1/fraud/score ──────────────────────────────────────────────
// Proxy endpoint allowing the Admin Dashboard or authorized facilities to manually check fraud scores
fraudRouter.post('/score', authorize(UserRole.SUPER_ADMIN, UserRole.SHA_ADMIN), async (req, res, next) => {
    try {
        const { claim_amount, facility_id, patient_id, icd10_code } = req.body;

        if (!claim_amount || !facility_id || !patient_id || !icd10_code) {
             return res.status(400).json({ success: false, error: 'Missing required fraud assessment features' });
        }

        // Pass-through to the internal ML Service Fast API endpoint
        const fraudRes = await fetch(`${process.env.ML_SERVICE_URL || 'http://localhost:8000'}/api/v1/fraud/score`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.ML_SERVICE_KEY || 'default-ml-key'}`
            },
            body: JSON.stringify({ claim_amount, facility_id, patient_id, icd10_code }),
        });

        if (!fraudRes.ok) {
            throw new Error('ML Service failed to return a valid score');
        }

        const data = await fraudRes.json();
        
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
});

// ── GET /api/v1/fraud/anomalies ──────────────────────────────────────────────
// Fetch recent highly flagged claims for the Admin dashboard anomaly feed
fraudRouter.get('/anomalies', authorize(UserRole.SUPER_ADMIN, UserRole.SHA_ADMIN), async (req, res, next) => {
    try {
        const anomalies = await prisma.claim.findMany({
            where: {
                aiRecommendation: 'BLOCK',
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
                facility: { select: { name: true } },
                patient: { select: { shaId: true } }
            }
        });

        res.json({ success: true, data: anomalies });
    } catch (err) {
        next(err);
    }
});
