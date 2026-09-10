import { logger } from '../lib/logger.js';

const DHA_API_URL = process.env.DHA_API_URL;
const DHA_API_KEY = process.env.DHA_API_KEY;
const SHA_SHIF_PAYBILL = process.env.SHA_SHIF_PAYBILL || '200222';

export async function creditShifAccount(
    nationalId: string | null | undefined,
    amountKES: number,
    shaAccountRef?: string
) {
    const accountRef = shaAccountRef || `${SHA_SHIF_PAYBILL}/${nationalId || 'UNKNOWN'}`;

    if (!nationalId) {
        logger.warn(`[SHIF] No nationalId provided; routed as ${accountRef}`);
    }

    if (!DHA_API_URL || !DHA_API_KEY) {
        logger.info(`[SHIF MOCK] Crediting KES ${amountKES} to SHIF Paybill ${SHA_SHIF_PAYBILL}, Account Reference: ${nationalId || 'UNKNOWN'} (DHA mock mode)`);
        return { success: true, mock: true, accountRef, amountKES };
    }

    try {
        const res = await fetch(`${DHA_API_URL}/shif/credit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DHA_API_KEY}`
            },
            body: JSON.stringify({ nationalId, amountKES, paybill: SHA_SHIF_PAYBILL, accountRef })
        });

        if (!res.ok) {
            const txt = await res.text();
            logger.error(`[SHIF] DHA API error: ${res.status} ${txt}`);
            return { success: false, reason: 'DHA_ERROR', status: res.status, body: txt };
        }

        const data = await res.json();
        logger.info(`[SHIF] Credited KES ${amountKES} to Paybill ${SHA_SHIF_PAYBILL} (NID: ${nationalId})`);
        return { success: true, data };
    } catch (e: any) {
        logger.error(`[SHIF] Exception: ${e.message}`);
        return { success: false, reason: 'EXCEPTION', error: e.message };
    }
}

