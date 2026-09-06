import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { logger } from '../lib/logger';

const router = Router();
const prisma = new PrismaClient();

// Issue a simple license key for a partner (DHA / SAFARICOM / OTHER)
router.post('/issue', async (req, res) => {
    try {
        const { partnerName, partnerType } = req.body;
        if (!partnerName || !partnerType) return res.status(400).json({ success: false, message: 'partnerName and partnerType required' });

        const key = 'LIC-' + crypto.randomBytes(8).toString('hex').toUpperCase();

        const license = await prisma.license.create({
            data: {
                partnerName,
                partnerType,
                licenseKey: key
            }
        });

        logger.info(`[LICENSING] Issued license ${license.licenseKey} to ${partnerName} (${partnerType})`);

        res.json({ success: true, data: { licenseKey: license.licenseKey } });
    } catch (e: any) {
        logger.error(`Error issuing license: ${e.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Validate license
router.post('/validate', async (req, res) => {
    try {
        const { licenseKey } = req.body;
        if (!licenseKey) return res.status(400).json({ success: false, message: 'licenseKey required' });

        const license = await prisma.license.findUnique({ where: { licenseKey } });
        if (!license || !license.active) return res.status(404).json({ success: false, message: 'License not found or inactive' });

        res.json({ success: true, data: { partnerName: license.partnerName, partnerType: license.partnerType } });
    } catch (e: any) {
        logger.error(`Error validating license: ${e.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

export const licensingRouter = router;
