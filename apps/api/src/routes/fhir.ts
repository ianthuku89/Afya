import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { UserRole } from '@afyaToken/types';

// DHA: FHIR R4 endpoints required for DHA Enterprise Service Bus integration
// All responses conform to HL7 FHIR R4 resource structure

export const fhirRouter = Router();
fhirRouter.use(authenticate);

// ── GET /api/v1/fhir/r4/Patient/:id ───────────────────────────────────────────
// DHA: Patient resource — connects to DHA Client Registry
fhirRouter.get('/r4/Patient/:id',
    authorize(UserRole.SUPER_ADMIN, UserRole.SHA_ADMIN, UserRole.FACILITY),
    async (req, res, next) => {
        try {
            const user = await prisma.user.findUnique({
                where: { id: req.params.id },
                select: { id: true, fullName: true, shaId: true, countyCode: true, createdAt: true },
            });
            if (!user) return res.status(404).json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found' }] });

            // Map to FHIR R4 Patient resource
            const fhirPatient = {
                resourceType: 'Patient',
                id: user.id,
                meta: { lastUpdated: user.createdAt.toISOString(), versionId: '1' },
                identifier: [
                    { system: 'https://sha.go.ke/member-id', value: user.shaId ?? '' },
                ],
                name: [{ use: 'official', text: user.fullName }],
                address: [{ country: 'KE', state: user.countyCode ?? '' }],
            };
            res.setHeader('Content-Type', 'application/fhir+json');
            res.json(fhirPatient);
        } catch (err) { next(err); }
    }
);

// ── GET /api/v1/fhir/r4/Claim/:id ─────────────────────────────────────────────
// DHA: Claim resource for DHA reporting
fhirRouter.get('/r4/Claim/:id',
    authorize(UserRole.SUPER_ADMIN, UserRole.SHA_ADMIN),
    async (req, res, next) => {
        try {
            const claim = await prisma.claim.findUnique({
                where: { id: req.params.id },
                include: { patient: { select: { id: true } }, facility: { select: { id: true, mflCode: true } } },
            });
            if (!claim) return res.status(404).json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found' }] });

            const fhirClaim = {
                resourceType: 'Claim',
                id: claim.id,
                status: claim.status === 'REIMBURSED' ? 'active' : 'draft',
                type: { coding: [{ system: 'https://dha.go.ke/claim-type', code: claim.service }] },
                use: 'claim',
                patient: { reference: `Patient/${claim.patient.id}` },
                created: claim.createdAt.toISOString(),
                provider: { reference: `Organization/${claim.facility.id}` },
                priority: { coding: [{ code: 'normal' }] },
                total: { value: Number(claim.reimbursementKES), currency: 'KES' },
                // DHA: ICD-10 code for disease classification reporting
                diagnosis: [{ sequence: 1, diagnosisCodeableConcept: { coding: [{ system: 'http://hl7.org/fhir/sid/icd-10', code: claim.icd10Code }] } }],
            };
            res.setHeader('Content-Type', 'application/fhir+json');
            res.json(fhirClaim);
        } catch (err) { next(err); }
    }
);

// ── POST /api/v1/fhir/r4/$process-message ─────────────────────────────────────
// DHA: DHA Enterprise Service Bus integration endpoint
// Receives and processes FHIR MessageBundle from DHA ESB
fhirRouter.post('/r4/$process-message',
    authorize(UserRole.SUPER_ADMIN, UserRole.SHA_ADMIN),
    async (req, res, next) => {
        try {
            const bundle = req.body;
            if (bundle?.resourceType !== 'Bundle' || bundle?.type !== 'message') {
                return res.status(400).json({
                    resourceType: 'OperationOutcome',
                    issue: [{ severity: 'error', code: 'invalid', diagnostics: 'Expected FHIR MessageBundle' }],
                });
            }

            // DHA: Log every ESB message for compliance audit
            const messageId = bundle?.id ?? 'unknown';
            await prisma.auditLog.create({
                data: {
                    userId: req.user!.userId,
                    resourceId: messageId,
                    action: 'VIEW_CLAIM' as any,
                    ip: req.socket.remoteAddress ?? 'unknown',
                    requestId: req.headers['x-request-id'] as string,
                    success: true,
                },
            });

            res.setHeader('Content-Type', 'application/fhir+json');
            res.status(200).json({
                resourceType: 'Bundle',
                type: 'message',
                id: messageId,
                meta: { lastUpdated: new Date().toISOString() },
                entry: [{ resource: { resourceType: 'MessageHeader', response: { identifier: messageId, code: 'ok' } } }],
            });
        } catch (err) { next(err); }
    }
);

// ── GET /api/v1/fhir/r4/Organization/:id ──────────────────────────────────────
// DHA: Facility Organization resource — connects to DHA Facility Registry
fhirRouter.get('/r4/Organization/:id',
    authorize(UserRole.SUPER_ADMIN, UserRole.SHA_ADMIN, UserRole.FACILITY),
    async (req, res, next) => {
        try {
            const facility = await prisma.facility.findUnique({ where: { id: req.params.id } });
            if (!facility) return res.status(404).json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found' }] });

            const fhirOrg = {
                resourceType: 'Organization',
                id: facility.id,
                identifier: [{ system: 'https://ehealth.go.ke/mfl', value: facility.mflCode }],
                active: facility.isAccredited,
                name: facility.name,
                telecom: [{ system: 'phone', value: facility.contactPhone }],
                address: [{ country: 'KE', state: facility.county, district: facility.subCounty }],
                extension: [{
                    url: 'https://dha.go.ke/facility-level',
                    valueString: facility.level,
                }],
            };
            res.setHeader('Content-Type', 'application/fhir+json');
            res.json(fhirOrg);
        } catch (err) { next(err); }
    }
);

// ── GET /api/v1/fhir/r4/Coverage/:id ──────────────────────────────────────────
// DHA: Patient Coverage (Insurance) resource
fhirRouter.get('/r4/Coverage/:id',
    authorize(UserRole.SUPER_ADMIN, UserRole.SHA_ADMIN, UserRole.FACILITY, UserRole.PATIENT),
    async (req, res, next) => {
        try {
            const user = await prisma.user.findUnique({ where: { id: req.params.id } });
            if (!user) return res.status(404).json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found' }] });

            const fhirCoverage = {
                resourceType: 'Coverage',
                id: `cov-${user.id}`,
                status: 'active',
                type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'PUBLICPOL' }] },
                subscriber: { reference: `Patient/${user.id}` },
                beneficiary: { reference: `Patient/${user.id}` },
                payor: [{ reference: 'Organization/SHA', display: 'Social Health Authority' }]
            };
            res.setHeader('Content-Type', 'application/fhir+json');
            res.json(fhirCoverage);
        } catch (err) { next(err); }
    }
);

// ── GET /api/v1/fhir/r4/Practitioner/:id ──────────────────────────────────────
// DHA: Practitioner resource — connects to DHA Health Worker Registry
fhirRouter.get('/r4/Practitioner/:id',
    authorize(UserRole.SUPER_ADMIN, UserRole.SHA_ADMIN, UserRole.FACILITY),
    async (req, res, next) => {
        try {
            // Assuming we query User table for users with FACILITY role performing actions
            const practitioner = await prisma.user.findUnique({ where: { id: req.params.id, role: 'FACILITY' } });
            if (!practitioner) return res.status(404).json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found' }] });

            const fhirPractitioner = {
                resourceType: 'Practitioner',
                id: practitioner.id,
                identifier: [{ system: 'https://kmpdc.go.ke/license', value: practitioner.id.substring(0,8) }],
                active: true,
                name: [{ use: 'official', text: practitioner.fullName }]
            };
            res.setHeader('Content-Type', 'application/fhir+json');
            res.json(fhirPractitioner);
        } catch (err) { next(err); }
    }
);

