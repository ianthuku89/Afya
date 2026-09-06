import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { logger } from '../lib/logger';

export const facilitiesRouter = Router();

// ── GET /api/v1/facilities ────────────────────────────────────────────────────
// Public endpoint — returns all accredited facilities with optional search/filter
facilitiesRouter.get('/', async (req, res, next) => {
    try {
        const { search, county, level, page = '1', limit = '50' } = req.query;

        const where: any = { isAccredited: true };

        if (search && typeof search === 'string') {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { mflCode: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (county && typeof county === 'string') {
            where.county = { equals: county, mode: 'insensitive' };
        }
        if (level && typeof level === 'string') {
            where.level = level;
        }

        const pageNum = Math.max(1, parseInt(page as string, 10));
        const take = Math.min(100, Math.max(1, parseInt(limit as string, 10)));

        const [facilities, total] = await Promise.all([
            prisma.facility.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    mflCode: true,
                    level: true,
                    county: true,
                    latitude: true,
                    longitude: true,
                    fhirEnabled: true,
                    isAccredited: true,
                },
                orderBy: { name: 'asc' },
                skip: (pageNum - 1) * take,
                take,
            }),
            prisma.facility.count({ where }),
        ]);

        res.json({
            success: true,
            facilities,
            pagination: { page: pageNum, limit: take, total, pages: Math.ceil(total / take) }
        });
    } catch (err) {
        next(err);
    }
});

// ── GET /api/v1/facilities/:id ────────────────────────────────────────────────
facilitiesRouter.get('/:id', async (req, res, next) => {
    try {
        const facility = await prisma.facility.findUnique({
            where: { id: req.params.id },
        });

        if (!facility) {
            return res.status(404).json({ success: false, error: 'Facility not found' });
        }

        res.json({ success: true, data: facility });
    } catch (err) {
        next(err);
    }
});
