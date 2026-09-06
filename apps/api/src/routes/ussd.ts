import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../lib/logger';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// Simulated Daraja STK Push trigger (reuse from loyalty logic in production)
async function triggerSTKPush(phoneNumber: string, amount: number, reference: string) {
    logger.info(`[USSD] STK Push to ${phoneNumber} for KES ${amount} (Ref: ${reference})`);
    return { success: true };
}

router.post('/', async (req, res) => {
    // Expected Africa's Talking payload structure
    const { sessionId, serviceCode, phoneNumber, text } = req.body;

    let response = '';
    
    // Normalize phone number to match DB (assuming 254... format)
    // AT usually sends +254xxxxxxxxx
    const formattedPhone = phoneNumber?.replace('+', '') || '254700000000';

    // Find the user connected to this phone number
        const user = await prisma.user.findFirst({
            where: { phoneNumber: formattedPhone },
        include: {
            wallet: true,
            afyaScore: true
        }
    });

    if (!user) {
        response = `END Welcome to AfyaToken SHIF.\nWe could not find an account linked to this number. Please register via the mobile app first.`;
        res.set('Content-Type', 'text/plain');
        return res.send(response);
    }

    const textArray = text ? text.split('*') : [];
    const level = textArray.length;

    try {
        if (text === '') {
            // Main Menu
                response = `CON Welcome to AfyaToken SHIF, ${user.fullName || 'Member'}.\n`;
            response += `1. Check Coverage & AfyaScore\n`;
            response += `2. Auto-Deduct Settings\n`;
            response += `3. Boost Coverage`;
        } 
        else if (textArray[0] === '1') {
            // Check Coverage
            const status = user.wallet?.coverageStatus || 'INACTIVE';
            const score = user.afyaScore?.score || 0;
            const tier = user.afyaScore?.tier || 'BRONZE';
            
            response = `END Your Coverage Status:\n`;
            response += `Status: ${status}\n`;
            response += `AfyaScore: ${score}\n`;
            response += `Tier: ${tier}`;
        }
        else if (textArray[0] === '2') {
            // Auto-Deduct Settings
            if (level === 1) {
                const optInStatus = user.wallet?.autoDeductOptIn ? 'ENABLED' : 'DISABLED';
                response = `CON M-PESA Auto-Deduct is ${optInStatus}.\n`;
                response += `1. Opt-in\n`;
                response += `2. View Max Daily Ceiling`;
            } else if (level === 2 && textArray[1] === '1') {
                // Opt-in (KDPA warning)
                response = `CON By proceeding, you allow AfyaToken to analyze transactions for SHIF micro-deductions.\n1. Confirm Opt-in`;
            } else if (level === 3 && textArray[1] === '1' && textArray[2] === '1') {
                // Confirm Opt-in
                await prisma.wallet.update({
                    where: { userId: user.id },
                    data: { autoDeductOptIn: true }
                });
                // Log Consent
                await prisma.consentRecord.create({
                    data: {
                        userId: user.id,
                        consentType: 'loyalty_auto_contribute',
                        granted: true,
                        ipAddress: 'USSD_GATEWAY'
                    }
                });
                response = `END You have successfully opted into M-PESA Auto-Deductions.`;
            } else if (level === 2 && textArray[1] === '2') {
                response = `END Your M-PESA Auto-Deduct daily ceiling is set to KES 50.\nTo protect users, this limit is system-controlled and cannot be manually modified.`;
            } else if (level === 2 && textArray[1] === '3') {
                // View Max Daily Ceiling (Admin controlled)
                response = `END Your M-PESA Auto-Deduct daily ceiling is set to KES 50.\nTo protect users, this limit is system-controlled and cannot be manually modified.`;
            } else {
                response = `END Invalid Choice. Please try again.`;
            }
        }
        else if (textArray[0] === '3') {
            // Boost Coverage
            if (level === 1) {
                response = `CON Enter amount to contribute to your SHIF cover via M-PESA (Min 50):`;
            } else if (level === 2) {
                const amount = Number(textArray[1]);
                if (isNaN(amount) || amount < 50) {
                    response = `END Invalid amount. Minimum contribution is KES 50.`;
                } else {
                    // Trigger STK Push
                    // In a highly production system, we'd log a pending tx here before returning.
                    await triggerSTKPush(formattedPhone, amount, `USSD_${user.id.substring(0,6)}`);
                    response = `END Thank you. Please check your phone for an M-PESA PIN prompt to finalize your KES ${amount} contribution.`;
                }
            } else {
                response = `END Invalid Choice. Please try again.`;
            }
        }
        else {
            response = `END Invalid Choice. Please try again.`;
        }

        res.set('Content-Type', 'text/plain');
        res.send(response);

    } catch (e: any) {
        logger.error(`[USSD] Error processing session ${sessionId}: ${e.message}`);
        response = `END We are experiencing technical difficulties. Please try again later.`;
        res.set('Content-Type', 'text/plain');
        res.send(response);
    }
});

export const ussdRouter = router;
