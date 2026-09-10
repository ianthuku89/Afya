import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { ethers } from 'ethers';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { encrypt } from '../lib/crypto.js';

export const authRouter = Router();

// ── ZOD SCHEMAS ───────────────────────────────────────────────────────────────
const RegisterSchema = z.object({
    email: z.string().email().max(254),
    password: z.string().min(12).max(128)
        .regex(/[A-Z]/, 'Must contain uppercase')
        .regex(/[a-z]/, 'Must contain lowercase')
        .regex(/[0-9]/, 'Must contain number')
        .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
    fullName: z.string().min(2).max(100),
    nationalId: z.string().min(7).max(20).optional(),
    phoneNumber: z.string().regex(/^\+254[0-9]{9}$/).optional(),
    shaId: z.string().optional(),
    role: z.enum(['PATIENT', 'FACILITY', 'SHA_ADMIN', 'SUPER_ADMIN']).optional(),
}).strict();

const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1).max(128),
}).strict();

const RefreshSchema = z.object({
    refreshToken: z.string().min(1),
}).strict();

// ── POST /api/v1/auth/register ───────────────────────────────────────────────
authRouter.post('/register', validate(RegisterSchema), async (req, res, next) => {
    try {
        const { email, password, fullName, nationalId, phoneNumber, shaId, role } = req.body;

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({ success: false, error: { code: 'EMAIL_EXISTS', message: 'Email already registered' } });
        }

        // bcrypt cost factor 12 — ~350ms per hash, resists GPU brute-force (OWASP A07)
        const passwordHash = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                fullName,
                nationalId: nationalId ? encrypt(nationalId) : null,
                phoneNumber: phoneNumber ? encrypt(phoneNumber) : null,
                shaId,
                role: role || 'PATIENT',
                wallet: {
                    create: {
                        blockchainAddress: ethers.Wallet.createRandom().address,
                        balanceAfya: 0,
                        lockedAfya: 0,
                        earnedMatchAfya: 0,
                        autoDeductOptIn: true,
                    },
                },
                afyaScore: {
                    create: {
                        score: 0,
                        tier: 'BRONZE'
                    }
                }
            },
            select: { id: true, email: true, fullName: true, role: true, shaId: true, createdAt: true },
        });

        res.status(201).json({ success: true, data: user });
    } catch (err) { next(err); }
});

// ── POST /api/v1/auth/login ───────────────────────────────────────────────────
authRouter.post('/login', validate(LoginSchema), async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        // Constant-time check to prevent timing attacks (OWASP A07)
        const validPassword = user
            ? await bcrypt.compare(password, user.passwordHash)
            : await bcrypt.compare(password, '$2b$12$invalidhashtopreventtimingattack000000000000000000000000');

        if (!user || !validPassword || !user.isActive) {
            return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
        }

        const family = uuidv4();
        const [accessToken, { token: refreshToken, jti }] = await Promise.all([
            signAccessToken({ userId: user.id, role: user.role as any, shaId: user.shaId ?? undefined }),
            signRefreshToken({ userId: user.id, family }),
        ]);

        // Store refresh token in DB (enables server-side invalidation)
        await prisma.refreshToken.create({
            data: {
                jti,
                userId: user.id,
                family,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });

        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

        res.json({
            success: true,
            data: {
                accessToken,
                refreshToken,
                user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
            },
        });
    } catch (err) { next(err); }
});

// ── POST /api/v1/auth/refresh ─────────────────────────────────────────────────
// Security rationale: Refresh token rotation — each use invalidates old token
// and issues a new one. If old token is reused (theft detected), entire family revoked.
authRouter.post('/refresh', validate(RefreshSchema), async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        const payload = await verifyRefreshToken(refreshToken);

        const stored = await prisma.refreshToken.findUnique({ where: { jti: payload.jti } });
        if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
            // Token reuse detected — revoke entire family
            if (stored) {
                await prisma.refreshToken.updateMany({
                    where: { family: stored.family },
                    data: { revokedAt: new Date() },
                });
            }
            return res.status(401).json({ success: false, error: { code: 'REFRESH_INVALID', message: 'Refresh token invalid or reused' } });
        }

        const user = await prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user || !user.isActive) {
            return res.status(401).json({ success: false, error: { code: 'USER_INACTIVE', message: 'User account inactive' } });
        }

        // Rotate: revoke old, issue new
        const [, { token: newRefresh, jti: newJti }] = await Promise.all([
            prisma.refreshToken.update({ where: { jti: payload.jti }, data: { revokedAt: new Date() } }),
            signRefreshToken({ userId: user.id, family: stored.family }),
        ]);

        await prisma.refreshToken.create({
            data: {
                jti: newJti,
                userId: user.id,
                family: stored.family,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });

        const accessToken = await signAccessToken({ userId: user.id, role: user.role as any, shaId: user.shaId ?? undefined });

        res.json({ success: true, data: { accessToken, refreshToken: newRefresh } });
    } catch (err) { next(err); }
});

// ── POST /api/v1/auth/logout ──────────────────────────────────────────────────
authRouter.post('/logout', authenticate, async (req, res, next) => {
    try {
        // Revoke all tokens for this session family
        await prisma.refreshToken.updateMany({
            where: { userId: req.user!.userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        res.json({ success: true, data: { message: 'Logged out successfully' } });
    } catch (err) { next(err); }
});

