import fetch from 'node-fetch';
import { logger } from '../lib/logger';

const STANBIC_API_URL = process.env.STANBIC_API_URL;
const STANBIC_API_KEY = process.env.STANBIC_API_KEY;

export async function remitToCorporate(accountRef: string, amountKES: number) {
    if (!accountRef) {
        logger.warn('[BANK] No corporate account configured');
        return { success: false, reason: 'NO_ACCOUNT' };
    }

    if (!STANBIC_API_URL || !STANBIC_API_KEY) {
        logger.info(`[BANK MOCK] Routing KES ${amountKES} to corporate account ${accountRef} (Bank API not configured)`);
        return { success: true, mock: true };
    }

    try {
        const res = await fetch(`${STANBIC_API_URL}/payments/transfer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${STANBIC_API_KEY}`
            },
            body: JSON.stringify({ accountRef, amountKES })
        });

        if (!res.ok) {
            const txt = await res.text();
            logger.error(`[BANK] Stanbic API error: ${res.status} ${txt}`);
            return { success: false, reason: 'BANK_ERROR', status: res.status, body: txt };
        }

        const data = await res.json();
        logger.info(`[BANK] Routed KES ${amountKES} to corporate account ${accountRef}`);
        return { success: true, data };
    } catch (e: any) {
        logger.error(`[BANK] Exception: ${e.message}`);
        return { success: false, reason: 'EXCEPTION', error: e.message };
    }
}
