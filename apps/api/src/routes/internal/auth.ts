import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { signAccessToken } from '../../lib/jwt';
import { authenticateInternal, authorizeInternal } from '../../middleware/internalAuth';

export const internalAuthRouter = Router();

const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

// SUPER_ADMIN only
const CreateStaffSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    fullName: z.string().min(2),
    role: z.enum(['SUPER_ADMIN', 'DIRECTOR', 'FINANCE', 'OFFICE_ADMIN', 'TECH', 'HR']),
});

internalAuthRouter.post('/login', async (req, res, next) => {
    try {
        const { email, password } = LoginSchema.parse(req.body);
        const staff = await prisma.internalStaff.findUnique({ where: { email } });

        if (!staff || !staff.isActive) {
            return res.status(401).json({ error: 'Invalid credentials or inactive account' });
        }

        const valid = await bcrypt.compare(password, staff.passwordHash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        await prisma.internalStaff.update({
            where: { id: staff.id },
            data: { lastLoginAt: new Date() }
        });

        const token = await signAccessToken({ 
            userId: staff.id, 
            role: staff.role as any, 
        });

        res.json({ success: true, data: { token, staff: { id: staff.id, email: staff.email, fullName: staff.fullName, role: staff.role } } });
    } catch (err) { next(err); }
});

// Middleware for internal auth below this point
internalAuthRouter.use(authenticateInternal);

internalAuthRouter.post('/staff', authorizeInternal(['SUPER_ADMIN']), async (req, res, next) => {
    try {
        const data = CreateStaffSchema.parse(req.body);
        const passwordHash = await bcrypt.hash(data.password, 12);

        const staff = await prisma.internalStaff.create({
            data: {
                email: data.email,
                fullName: data.fullName,
                passwordHash,
                role: data.role as any,
            }
        });

        res.status(201).json({ success: true, data: { id: staff.id, email: staff.email, role: staff.role } });
    } catch (err) { next(err); }
});

internalAuthRouter.get('/staff', authorizeInternal(['SUPER_ADMIN', 'DIRECTOR']), async (req, res, next) => {
    try {
        const staff = await prisma.internalStaff.findMany({
            select: { id: true, email: true, fullName: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: staff });
    } catch (err) { next(err); }
});
