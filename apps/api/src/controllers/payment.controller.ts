import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { z } from 'zod';
// ⚠️ ADJUST THIS IMPORT to match your crypto.ts export (nationalId/phoneNumber are
// stored AES-256-GCM encrypted, so they must be decrypted before use with Daraja).
import { decrypt } from '../lib/crypto.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { creditShifAccount } from '../services/shifService.js';
import { getTierFromStreak } from '../routes/afyascore.js';

type ContributionSource = 'MPESA' | 'AUTO_DEDUCT' | 'MERCHANT';

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
// SHA SHIF Paybill is the FINAL DESTINATION of the money, not the shortcode we
// charge the customer on. Daraja only lets you STK-push against a shortcode you
// own (the passkey belongs to it), so the customer pays OUR shortcode and the
// KES 30 is then forwarded/settled to the SHA paybill (see settleToShaPaybill).
// ⚠️ Confirm the correct SHA paybill number with SHA before going live.
const SHA_SHIF_PAYBILL = process.env.SHA_SHIF_PAYBILL || '200222';
const DAILY_SHIF_DEDUCTION = 30; // KES
const MIN_CONTRIBUTION_KES = 30;
const SHIF_THRESHOLD_KES = 100; // merchant payments above this trigger the SHIF deduction

const stkPushSchema = z.object({
    amount: z.number().int().min(MIN_CONTRIBUTION_KES).max(10000),
    currency: z.literal('KES'),
    // Accept 07.., 01.., +254.., 254.. — normalised below
    phone: z.string().optional(),
    description: z.string().max(60).optional(),
});

const merchantPaySchema = z.object({
    merchantAmount: z.number().int().min(1).max(150000),
    merchantPaybill: z.string().regex(/^\d{5,7}$/),
    merchantAccount: z.string().min(1).max(13),          
    merchantName: z.string().max(60).optional(),
    includeShif: z.boolean().optional(),                 
    phone: z.string().optional(),
});

// ── HELPERS ───────────────────────────────────────────────────────────────────
/** Daraja requires 2547XXXXXXXX / 2541XXXXXXXX. Returns null if unusable. */
export function normalizeMsisdn(raw?: string | null): string | null {
    if (!raw) return null;
    const d = raw.replace(/\D/g, '');
    if (/^254[17]\d{8}$/.test(d)) return d;
    if (/^0[17]\d{8}$/.test(d)) return `254${d.slice(1)}`;
    if (/^[17]\d{8}$/.test(d)) return `254${d}`;
    return null;
}

/** Decrypts an AES-256-GCM PII field; falls back to the raw value for legacy plaintext rows. */
function readPii(value?: string | null): string | null {
    if (!value) return null;
    try {
        return decrypt(value);
    } catch {
        return value;
    }
}

const darajaBaseUrl = () => process.env.DARAJA_BASE_URL || 'https://sandbox.safaricom.co.ke';

const REQUIRED_DARAJA_VARS = [
    'DARAJA_CONSUMER_KEY',
    'DARAJA_CONSUMER_SECRET',
    'DARAJA_PASSKEY',
    'DARAJA_SHORTCODE',
    'DARAJA_CALLBACK_SECRET',
    'API_BASE_URL',
] as const;

const missingDarajaVars = () => REQUIRED_DARAJA_VARS.filter((k) => !process.env[k]);
const darajaConfigured = () => missingDarajaVars().length === 0;

/** Simulation is for local dev only. In production a misconfigured server must FAIL, never fake a payment. */
function assertCanSimulate() {
    if (process.env.NODE_ENV === 'production') {
        logger.error(`[Daraja] Missing env vars in production: ${missingDarajaVars().join(', ')}`);
        throw new Error('M-PESA is not configured on this server');
    }
    logger.warn(`[Daraja] DEV ONLY: missing ${missingDarajaVars().join(', ')}; simulating payment`);
}

// EAT (UTC+3) timestamp, YYYYMMDDHHmmss
const darajaTimestamp = () =>
    new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);

const darajaPassword = (shortCode: string, timestamp: string) =>
    Buffer.from(`${shortCode}${process.env.DARAJA_PASSKEY}${timestamp}`).toString('base64');

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getDarajaToken(): Promise<string> {
    if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

    const consumerKey = process.env.DARAJA_CONSUMER_KEY;
    const consumerSecret = process.env.DARAJA_CONSUMER_SECRET;
    if (!consumerKey || !consumerSecret) {
        throw new Error('Daraja credentials not configured (DARAJA_CONSUMER_KEY, DARAJA_CONSUMER_SECRET)');
    }
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const res = await fetch(`${darajaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
        method: 'GET',
        headers: { Authorization: `Basic ${auth}` },
        signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Daraja OAuth failed: ${res.status} ${res.statusText}`);

    const data = (await res.json()) as { access_token: string; expires_in?: string };
    cachedToken = {
        value: data.access_token,
        expiresAt: Date.now() + (Number(data.expires_in || 3599) - 60) * 1000,
    };
    return cachedToken.value;
}

/**
 * POST to Daraja. Daraja (especially the sandbox) sometimes rejects a valid token with
 * a 404 / "Invalid Access Token", so on that response we drop the cached token and
 * retry once with a fresh one.
 */
async function darajaPost(path: string, body: object, retried = false): Promise<any> {
    const token = await getDarajaToken();
    const res = await fetch(`${darajaBaseUrl()}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
    });
    const data: any = await res.json().catch(() => ({}));

    const badToken =
        res.status === 401 ||
        data?.errorCode === '404.001.03' ||
        /invalid access token/i.test(data?.errorMessage || '');
    if (badToken) {
        cachedToken = null; // force a fresh token
        if (!retried) return darajaPost(path, body, true);
    }
    return data;
}

/** Single place that talks to Daraja's STK endpoint (always OUR shortcode). */
async function sendStkPush(args: {
    amount: number;
    phone: string;
    callbackUrl: string;
    accountRef: string; // max 12 chars
    description: string; // max 13 chars
}) {
    const shortCode = process.env.DARAJA_SHORTCODE as string;
    const timestamp = darajaTimestamp();
    return darajaPost('/mpesa/stkpush/v1/processrequest', {
        BusinessShortCode: shortCode,
        Password: darajaPassword(shortCode, timestamp),
        Timestamp: timestamp,
        // Use 'CustomerBuyGoodsOnline' if DARAJA_SHORTCODE is a Till (Buy Goods) number
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(args.amount), // Daraja wants whole shillings
        PartyA: args.phone,
        PartyB: shortCode,
        PhoneNumber: args.phone,
        CallBackURL: args.callbackUrl,
        AccountReference: args.accountRef.slice(0, 12),
        TransactionDesc: args.description.slice(0, 13),
    });
}

/** Ask Daraja what happened to a push. Used when the callback is late or lost. */
async function queryStkStatus(checkoutRequestId: string) {
    const shortCode = process.env.DARAJA_SHORTCODE as string;
    const timestamp = darajaTimestamp();
    return darajaPost('/mpesa/stkpushquery/v1/query', {
        BusinessShortCode: shortCode,
        Password: darajaPassword(shortCode, timestamp),
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
    });
}

/** Daraja does not sign callbacks, so the URL itself carries a secret only Safaricom knows. */
function validCallbackSecret(given?: string): boolean {
    const expected = process.env.DARAJA_CALLBACK_SECRET;
    if (!expected || !given) return false;
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const callbackBase = () => `${(process.env.API_BASE_URL || '').replace(/\/+$/, '')}/api/v1/payment`;
const callbackUrl = () => `${callbackBase()}/callback/${process.env.DARAJA_CALLBACK_SECRET}`;
const shifCallbackUrl = () => `${callbackBase()}/shif-callback/${process.env.DARAJA_CALLBACK_SECRET}`;

// ── PENDING TRANSACTION RECORD ────────────────────────────────────────────────
/**
 * txHash gets a local PENDING_ placeholder now and is replaced by a local ledger
 * reference (LEDGER_<id>) on success; there is no on-chain step. Daraja's
 * CheckoutRequestID lives in its own column so callbacks and status polling can
 * always find the row. amountKES is what we asked Daraja to charge and is what
 * the callback amount is verified against.
 */
async function createPendingDarajaTransaction(
    walletId: string,
    phoneNumber: string,
    shortCode: string,
    source: ContributionSource,
    amountKES: number,
    extra: Partial<Prisma.TransactionUncheckedCreateInput> = {},
) {
    return prisma.transaction.create({
        data: {
            walletId,
            amountAfya: 0,
            amountKES,
            txHash: `PENDING_${crypto.randomBytes(8).toString('hex')}`,
            status: 'PENDING',
            source,
            fromAddress: phoneNumber,
            toAddress: shortCode,
            ...extra,
        },
    });
}

async function markAutoDeductionBatchSettled(userId: string) {
    await prisma.$transaction([
        prisma.autoDeductionLog.updateMany({
            where: { userId, status: 'PENDING' },
            data: { status: 'PROCESSED', processedAt: new Date() },
        }),
        prisma.wallet.update({
            where: { userId },
            data: { pendingDeductionKES: 0 },
        }),
    ]);
}

/**
 * Hook for moving the collected KES onward to the SHA Paybill (Account = National ID).
 * creditShifAccount currently records/credits the SHIF side; if money must physically
 * move, call Daraja B2B (BusinessPayBill) here, or rely on your settlement agreement
 * with SHA.
 */
async function settleToShaPaybill(nationalId: string | null | undefined, amountKES: number) {
    const ref = `${SHA_SHIF_PAYBILL}/${nationalId || 'UNKNOWN'}`;
    await creditShifAccount(nationalId, amountKES, ref);
}

// ── MERCHANT DISBURSEMENT (B2B) ───────────────────────────────────────────────
/**
 * Forwards the merchant portion from OUR shortcode to the merchant's paybill.
 * Runs only after the customer's STK is CONFIRMED. The atomic PENDING -> SENT claim
 * guarantees a duplicate callback / retry can never pay the merchant twice.
 * Final outcome arrives on b2bResultHandler / b2bTimeoutHandler.
 */
async function disburseToMerchant(tx: {
    id: string;
    merchantPaybill: string | null;
    merchantAccount: string | null;
    merchantAmountKES: number | null;
}) {
    if (!tx.merchantPaybill || !tx.merchantAmountKES) return;

    const claim = await prisma.transaction.updateMany({
        where: { id: tx.id, settlementStatus: 'PENDING' },
        data: { settlementStatus: 'SENT' },
    });
    if (claim.count === 0) return;

    // Local dev without Daraja credentials: pretend the disbursement worked.
    if (!darajaConfigured()) {
        assertCanSimulate(); // throws in production
        await prisma.transaction.update({
            where: { id: tx.id },
            data: { settlementStatus: 'COMPLETED', settlementRef: 'SIMULATED' },
        });
        return;
    }

    if (!process.env.DARAJA_INITIATOR_NAME || !process.env.DARAJA_SECURITY_CREDENTIAL) {
        logger.error(`[B2B] DARAJA_INITIATOR_NAME / DARAJA_SECURITY_CREDENTIAL not set. tx=${tx.id} NOT disbursed`);
        await prisma.transaction.update({
            where: { id: tx.id },
            data: { settlementStatus: 'FAILED', settlementDesc: 'B2B not configured' },
        });
        return;
    }

    const base = callbackBase();
    const secret = process.env.DARAJA_CALLBACK_SECRET;
    try {
        const data = await darajaPost('/mpesa/b2b/v1/paymentrequest', {
            Initiator: process.env.DARAJA_INITIATOR_NAME,
            SecurityCredential: process.env.DARAJA_SECURITY_CREDENTIAL,
            CommandID: 'BusinessPayBill',
            SenderIdentifierType: '4',
            RecieverIdentifierType: '4', // Safaricom's spelling
            Amount: tx.merchantAmountKES,
            PartyA: process.env.DARAJA_SHORTCODE,
            PartyB: tx.merchantPaybill,
            AccountReference: (tx.merchantAccount || 'AFYA').slice(0, 13),
            Remarks: 'Merchant payment',
            QueueTimeOutURL: `${base}/b2b-timeout/${secret}/${tx.id}`,
            ResultURL: `${base}/b2b-result/${secret}/${tx.id}`,
        });

        if (String(data.ResponseCode) !== '0') {
            logger.error(`[B2B] request rejected tx=${tx.id}`, data);
            await prisma.transaction.update({
                where: { id: tx.id },
                data: {
                    settlementStatus: 'FAILED',
                    settlementDesc: data.ResponseDescription || data.errorMessage || 'B2B rejected',
                },
            });
            return;
        }
        await prisma.transaction.update({
            where: { id: tx.id },
            data: { settlementRef: data.ConversationID },
        });
    } catch (err) {
        // Network error: we can't know whether Daraja accepted it. Leave as SENT so we never
        // double-pay automatically; ops must check the Daraja portal before retrying.
        logger.error(`[B2B] request errored tx=${tx.id}. Status unknown, check Daraja before retrying`, err);
        await prisma.transaction.update({
            where: { id: tx.id },
            data: { settlementDesc: 'B2B request errored: verify in Daraja portal before retry' },
        });
    }
}

/**
 * Manual/ops retry for a FAILED disbursement. Only call this after confirming
 * (Daraja portal) that the merchant was NOT actually paid.
 */
export async function retryMerchantDisbursement(txId: string) {
    const reopened = await prisma.transaction.updateMany({
        where: { id: txId, source: 'MERCHANT', status: 'CONFIRMED', settlementStatus: 'FAILED' },
        data: { settlementStatus: 'PENDING', settlementDesc: null },
    });
    if (reopened.count === 0) return false;
    const tx = await prisma.transaction.findUnique({ where: { id: txId } });
    if (tx) await disburseToMerchant(tx);
    return true;
}

/**
 * Safety net (call from a cron every few minutes): confirmed merchant payments whose
 * disbursement never started, e.g. the server crashed right after confirmation.
 */
export async function disbursePendingMerchantSettlements() {
    const stuck = await prisma.transaction.findMany({
        where: {
            source: 'MERCHANT',
            status: 'CONFIRMED',
            settlementStatus: 'PENDING',
            createdAt: { lt: new Date(Date.now() - 2 * 60 * 1000) },
        },
        take: 50,
    });
    for (const tx of stuck) await disburseToMerchant(tx);
    return stuck.length;
}

// ── THE ONE PLACE A PAYMENT IS FINALISED ──────────────────────────────────────
type Outcome = { resultCode: number; resultDesc?: string; receipt?: string; paidAmount?: number };

/**
 * Called by the Daraja callbacks, by the status-poll fallback (STK Query) and by
 * the dev simulation. Whoever calls first wins an atomic PENDING -> PROCESSING
 * claim, so duplicate callbacks or a callback racing a poll can never double-credit.
 */
export async function finalizePayment(checkoutRequestId: string, outcome: Outcome) {
    // 4999 = "still under processing" (STK Query). Not final: leave PENDING and wait for the callback.
    if (Number(outcome.resultCode) === 4999) {
        logger.info(`[finalize] ${checkoutRequestId} still processing, leaving PENDING`);
        return 'still-processing' as const;
    }

    const tx = await prisma.transaction.findUnique({
        where: { checkoutRequestId },
        include: { wallet: { include: { user: true } } },
    });
    if (!tx?.wallet) {
        logger.warn(`[finalize] unknown CheckoutRequestID ${checkoutRequestId}`);
        return 'unknown' as const;
    }

    // Claim the row. A row wrongly failed earlier with 4999 may also be reclaimed by a real result.
    const claim = await prisma.transaction.updateMany({
        where: {
            id: tx.id,
            OR: [{ status: 'PENDING' }, { status: 'FAILED', resultCode: 4999 }],
        },
        data: { status: 'PROCESSING' },
    });
    if (claim.count === 0) return 'already-handled' as const;

    const userId = tx.wallet.userId;
    const isAutoDeduct = tx.source === 'AUTO_DEDUCT';
    const isMerchant = tx.source === 'MERCHANT';
    const isDirect = tx.source === 'MPESA';

    // ── Failed / cancelled / timed out ──
    if (outcome.resultCode !== 0) {
        await prisma.transaction.update({
            where: { id: tx.id },
            data: {
                status: 'FAILED',
                resultCode: outcome.resultCode,
                resultDesc: outcome.resultDesc,
                ...(isMerchant ? { settlementStatus: 'NOT_APPLICABLE' as const } : {}),
            },
        });
        if (isAutoDeduct) {
            await prisma.autoDeductionLog.updateMany({
                where: { userId, status: 'PENDING' },
                data: { status: 'FAILED', processedAt: new Date() },
            });
        }
        logger.warn(`[finalize] payment failed tx=${tx.id} code=${outcome.resultCode} ${outcome.resultDesc ?? ''}`);
        return 'failed' as const;
    }

    // ── Paid: make sure the money matches what we asked for ──
    const amountKES = tx.amountKES ?? 0;
    if (amountKES <= 0 || (outcome.paidAmount !== undefined && Number(outcome.paidAmount) !== amountKES)) {
        logger.error(`[finalize] AMOUNT MISMATCH tx=${tx.id} expected=${amountKES} paid=${outcome.paidAmount}`);
        await prisma.transaction.update({
            where: { id: tx.id },
            data: {
                status: 'FLAGGED',
                resultCode: outcome.resultCode,
                resultDesc: 'AMOUNT_MISMATCH_REVIEW',
                mpesaReceipt: outcome.receipt,
            },
        });
        return 'amount-mismatch' as const;
    }

    // Record the confirmed payment. No on-chain step: the DB is the ledger.
    // Only direct contributions credit lockedAfya; merchant/auto-deduct rows do not.
    const ledgerRef = `LEDGER_${tx.id}`;
    try {
        await prisma.$transaction([
            ...(isDirect
                ? [prisma.wallet.update({ where: { id: tx.wallet.id }, data: { lockedAfya: { increment: amountKES } } })]
                : []),
            prisma.transaction.update({
                where: { id: tx.id },
                data: {
                    status: 'CONFIRMED',
                    amountAfya: isDirect ? amountKES : 0,
                    txHash: ledgerRef,
                    mpesaReceipt: outcome.receipt,
                    resultCode: 0,
                    resultDesc: outcome.resultDesc,
                },
            }),
        ]);
    } catch (err) {
        // Safe to reopen: the wallet increment and CONFIRMED status are one atomic
        // DB transaction, so a retry can't double-credit.
        await prisma.transaction.update({ where: { id: tx.id }, data: { status: 'PENDING' } });
        throw err;
    }

    // Post-confirmation steps: a failure here must NOT undo the confirmed payment
    const nationalId = readPii(tx.wallet.user?.nationalId);
    try {
        if (isMerchant) {
            // Only the SHIF portion goes to SHA, never the full amount
            const shif = tx.shifAmountKES ?? 0;
            if (shif > 0) {
                await recordContributionAmount(userId, shif);
                await updateAfyaStreakOnContribution(userId);
                await settleToShaPaybill(nationalId, shif);
            }
        } else if (isAutoDeduct) {
            await markAutoDeductionBatchSettled(userId);
            await updateAfyaStreakOnContribution(userId);
            await settleToShaPaybill(nationalId, amountKES);
        } else {
            await recordContributionAmount(userId, amountKES); // counted once, only after payment
            await updateAfyaStreakOnContribution(userId);
            await settleToShaPaybill(nationalId, amountKES);
        }
    } catch (err) {
        logger.error(`[finalize] post-confirm steps failed for tx=${tx.id}, needs reconciliation`, err);
    }

    // Disbursement is its own step so a SHIF-side failure can't block paying the merchant
    if (isMerchant) {
        try {
            await disburseToMerchant(tx);
        } catch (err) {
            logger.error(`[finalize] merchant disbursement threw for tx=${tx.id}`, err);
        }
    }
    return 'confirmed' as const;
}

// ── STK PUSH #1: DIRECT CONTRIBUTION ──────────────────────────────────────────
export async function initiateDarajaStkPush(
    userId: string,
    amount: number,
    description?: string,
    phone?: string,
    source: ContributionSource = 'MPESA',
) {
    const simulate = !darajaConfigured();
    if (simulate) assertCanSimulate(); // throws in production

    const [user, wallet] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { phoneNumber: true } }),
        prisma.wallet.findUnique({ where: { userId }, select: { id: true } }),
    ]);
    if (!wallet) throw new Error('Wallet not found for user');

    const phoneNumber = normalizeMsisdn(phone) || normalizeMsisdn(readPii(user?.phoneNumber));
    if (!phoneNumber) throw new Error('A valid Safaricom phone number is required for M-PESA payment');

    const shortCode = process.env.DARAJA_SHORTCODE || '174379';
    const transaction = await createPendingDarajaTransaction(wallet.id, phoneNumber, shortCode, source, amount);

    if (simulate) {
        const checkoutRequestId = `ws_CO_${crypto.randomBytes(6).toString('hex')}`;
        await prisma.transaction.update({ where: { id: transaction.id }, data: { checkoutRequestId } });
        await finalizePayment(checkoutRequestId, { resultCode: 0, resultDesc: 'Simulated', receipt: 'SIMULATED' });
        return {
            success: true,
            merchantRequestId: 'MOCK_STK_PUSH',
            checkoutRequestId,
            customerMessage: `Simulated STK push approved for KES ${amount}`,
            transactionId: transaction.id,
        };
    }

    try {
        const stkData = await sendStkPush({
            amount,
            phone: phoneNumber,
            callbackUrl: callbackUrl(),
            accountRef: `AFYA${userId.replace(/-/g, '').slice(0, 8)}`, // 12 chars
            description: description || 'AfyaToken',
        });

        if (String(stkData.ResponseCode) !== '0') {
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: { status: 'FAILED', resultDesc: stkData.ResponseDescription || stkData.errorMessage },
            });
            return {
                success: false,
                error: 'M-PESA request failed',
                detail: stkData.ResponseDescription || stkData.errorMessage,
            };
        }

        // Store Daraja's real IDs so the callback / status poll can find this row
        await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
                checkoutRequestId: stkData.CheckoutRequestID,
                merchantRequestId: stkData.MerchantRequestID,
            },
        });

        return {
            success: true,
            merchantRequestId: stkData.MerchantRequestID as string,
            checkoutRequestId: stkData.CheckoutRequestID as string,
            customerMessage: stkData.CustomerMessage as string,
            transactionId: transaction.id,
        };
    } catch (err) {
        await prisma.transaction.update({ where: { id: transaction.id }, data: { status: 'FAILED' } });
        throw err;
    }
}

// ── STK PUSH #2: SHIF DAILY DEDUCTION ─────────────────────────────────────────
/**
 * Customer is charged KES 30 on OUR shortcode (the only one our passkey is valid
 * for). AccountReference carries the National ID so reconciliation and the
 * onward settlement to the SHA paybill can be matched to the customer.
 * Does not credit the wallet balance (lockedAfya).
 *
 * Still used by the Contribute screen to retry a SHIF payment on its own.
 * The merchant checkout no longer uses this: it bundles SHIF into one prompt.
 */
export async function initiateSHIFDeduction(userId: string, triggerTxRef: string, phone?: string) {
    const simulate = !darajaConfigured();
    if (simulate) assertCanSimulate(); // throws in production

    const [user, wallet] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { phoneNumber: true, nationalId: true } }),
        prisma.wallet.findUnique({ where: { userId }, select: { id: true } }),
    ]);
    if (!wallet) throw new Error('Wallet not found for user');

    const phoneNumber = normalizeMsisdn(phone) || normalizeMsisdn(readPii(user?.phoneNumber));
    if (!phoneNumber) throw new Error('A valid Safaricom phone number is required for SHIF STK push');

    const nationalId = readPii(user?.nationalId);
    if (!nationalId) logger.warn(`[SHIF Deduction] No nationalId for user=${userId}`);
    const accountRef = (nationalId || `SHIF${userId.replace(/-/g, '').slice(0, 8)}`).slice(0, 12);

    const shortCode = process.env.DARAJA_SHORTCODE || '174379';
    const transaction = await createPendingDarajaTransaction(
        wallet.id,
        phoneNumber,
        shortCode,
        'AUTO_DEDUCT',
        DAILY_SHIF_DEDUCTION,
    );

    if (simulate) {
        const checkoutRequestId = `SHIF_${crypto.randomBytes(6).toString('hex')}`;
        await prisma.transaction.update({ where: { id: transaction.id }, data: { checkoutRequestId } });
        await finalizePayment(checkoutRequestId, { resultCode: 0, resultDesc: 'Simulated', receipt: 'SIMULATED' });
        return { success: true, checkoutRequestId, transactionId: transaction.id };
    }

    try {
        const stkData = await sendStkPush({
            amount: DAILY_SHIF_DEDUCTION,
            phone: phoneNumber,
            callbackUrl: shifCallbackUrl(),
            accountRef,
            description: 'SHIF daily',
        });

        if (String(stkData.ResponseCode) !== '0') {
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: { status: 'FAILED', resultDesc: stkData.ResponseDescription || stkData.errorMessage },
            });
            return {
                success: false,
                error: 'SHIF STK push failed',
                detail: stkData.ResponseDescription || stkData.errorMessage,
            };
        }

        await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
                checkoutRequestId: stkData.CheckoutRequestID,
                merchantRequestId: stkData.MerchantRequestID,
            },
        });

        logger.info(`[SHIF Deduction] STK #2 sent: KES ${DAILY_SHIF_DEDUCTION}, account ${accountRef}, trigger=${triggerTxRef}`);

        return {
            success: true,
            checkoutRequestId: stkData.CheckoutRequestID as string,
            transactionId: transaction.id,
        };
    } catch (err) {
        await prisma.transaction.update({ where: { id: transaction.id }, data: { status: 'FAILED' } });
        throw err;
    }
}

// ── STK PUSH #3: SINGLE-PROMPT MERCHANT PAYMENT (merchant + SHIF) ─────────────
/**
 * ONE prompt for the full total on OUR shortcode. After the callback confirms it:
 *   • merchantAmount is forwarded to the merchant paybill via B2B
 *   • shifAmount (KES 30) is settled to the SHA paybill
 * The server computes the SHIF amount itself and never trusts the client.
 */
export const startOfEatDay = () =>
    new Date(eatDayNumber(new Date()) * 86_400_000 - 3 * 60 * 60 * 1000);

export async function userOptedIn(userId: string): Promise<boolean> {
    const w = await prisma.wallet.findUnique({ where: { userId }, select: { autoDeductOptIn: true } });
    return Boolean(w?.autoDeductOptIn);
}

export async function shifDoneOrInFlightToday(userId: string): Promise<boolean> {
    const n = await prisma.transaction.count({
        where: {
            wallet: { userId },
            createdAt: { gte: startOfEatDay() },
            status: { in: ['PENDING', 'PROCESSING', 'CONFIRMED'] },
            OR: [{ source: 'MERCHANT', shifAmountKES: { gt: 0 } }, { source: 'AUTO_DEDUCT' }],
        },
    });
    return n > 0;
}

export async function getShifSummary(userId: string) {
    const start = startOfEatDay();
    const rows = await prisma.transaction.findMany({
        where: {
            wallet: { userId },
            status: 'CONFIRMED',
            OR: [{ source: 'MERCHANT', shifAmountKES: { gt: 0 } }, { source: 'AUTO_DEDUCT' }],
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
    });
    const logs = rows.map((r) => ({
        id: r.id,
        tx: r.mpesaReceipt ?? r.merchantName ?? 'Merchant payment',
        originalAmt: r.merchantAmountKES ?? 0,
        deducted: r.source === 'MERCHANT' ? r.shifAmountKES ?? 0 : r.amountKES ?? 0,
        date: r.createdAt.toISOString(),
        status: 'PROCESSED',
        isToday: r.createdAt >= start,
    }));
    return {
        isDeductedToday: logs.some((l) => l.isToday),
        todayDeductedKES: logs.filter((l) => l.isToday).reduce((s, l) => s + l.deducted, 0),
        recentLogs: logs.slice(0, 5),
    };
}

export async function initiateMerchantPayment(userId: string, p: z.infer<typeof merchantPaySchema>) {
    const simulate = !darajaConfigured();
    if (simulate) assertCanSimulate(); // throws in production

    const [user, wallet] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { phoneNumber: true } }),
        prisma.wallet.findUnique({ where: { userId }, select: { id: true } }),
    ]);
    if (!wallet) throw new Error('Wallet not found for user');

    const phoneNumber = normalizeMsisdn(p.phone) || normalizeMsisdn(readPii(user?.phoneNumber));
    if (!phoneNumber) throw new Error('A valid Safaricom phone number is required');

    const eligible =
            p.includeShif !== false &&
            p.merchantAmount > SHIF_THRESHOLD_KES &&
            (await userOptedIn(userId)) &&
            !(await shifDoneOrInFlightToday(userId));
    const shifAmount = eligible ? DAILY_SHIF_DEDUCTION : 0;
    const total = p.merchantAmount + shifAmount;

    const shortCode = process.env.DARAJA_SHORTCODE || '174379';
    const tx = await createPendingDarajaTransaction(wallet.id, phoneNumber, shortCode, 'MERCHANT', total, {
        merchantPaybill: p.merchantPaybill,
        merchantAccount: p.merchantAccount,
        merchantName: p.merchantName,
        merchantAmountKES: p.merchantAmount,
        shifAmountKES: shifAmount,
        settlementStatus: 'PENDING',
    });

    if (simulate) {
        const checkoutRequestId = `ws_CO_${crypto.randomBytes(6).toString('hex')}`;
        await prisma.transaction.update({ where: { id: tx.id }, data: { checkoutRequestId } });
        await finalizePayment(checkoutRequestId, {
            resultCode: 0,
            resultDesc: 'Simulated',
            receipt: 'SIMULATED',
            paidAmount: total,
        });
        return { success: true, checkoutRequestId, transactionId: tx.id, total, shifAmount };
    }

    try {
        const stk = await sendStkPush({
            amount: total,
            phone: phoneNumber,
            callbackUrl: callbackUrl(),
            accountRef: `PAY${tx.id.replace(/-/g, '').slice(0, 9)}`, // 12 chars
            description: 'Lipa na MPESA',
        });

        if (String(stk.ResponseCode) !== '0') {
            await prisma.transaction.update({
                where: { id: tx.id },
                data: {
                    status: 'FAILED',
                    settlementStatus: 'NOT_APPLICABLE',
                    resultDesc: stk.ResponseDescription || stk.errorMessage,
                },
            });
            return {
                success: false,
                error: 'M-PESA request failed',
                detail: stk.ResponseDescription || stk.errorMessage,
            };
        }

        await prisma.transaction.update({
            where: { id: tx.id },
            data: { checkoutRequestId: stk.CheckoutRequestID, merchantRequestId: stk.MerchantRequestID },
        });
        return {
            success: true,
            checkoutRequestId: stk.CheckoutRequestID as string,
            transactionId: tx.id,
            total,
            shifAmount,
        };
    } catch (err) {
        await prisma.transaction.update({
            where: { id: tx.id },
            data: { status: 'FAILED', settlementStatus: 'NOT_APPLICABLE' },
        });
        throw err;
    }
}

// ── STREAK & TIER UPDATE ──────────────────────────────────────────────────────
// Day boundaries use East Africa Time (UTC+3), so a payment at 01:00 in Nairobi
// counts for that Nairobi day rather than the previous UTC day.
const eatDayNumber = (d: Date) => Math.floor((d.getTime() + 3 * 60 * 60 * 1000) / 86_400_000);

export async function updateAfyaStreakOnContribution(userId: string): Promise<void> {
    try {
        let afyaScore = await prisma.afyaScore.findUnique({ where: { userId } });
        if (!afyaScore) afyaScore = await prisma.afyaScore.create({ data: { userId } });

        const now = new Date();
        const lastContrib = afyaScore.lastContributionAt;
        let newStreak = afyaScore.streakDays;

        if (lastContrib) {
            const dayGap = eatDayNumber(now) - eatDayNumber(lastContrib);
            if (dayGap === 0) {
                // Already contributed today: streak unchanged (but never below 1)
                newStreak = Math.max(newStreak, 1);
            } else if (dayGap === 1) {
                newStreak += 1;
            } else {
                newStreak = 1;
            }
        } else {
            newStreak = 1;
        }

        const newTier = getTierFromStreak(newStreak);

        await prisma.afyaScore.update({
            where: { userId },
            data: {
                tier: newTier as any,
                streakDays: newStreak,
                longestStreak: Math.max(afyaScore.longestStreak, newStreak),
                lastContributionAt: now,
            },
        });

        await prisma.wallet.updateMany({ where: { userId }, data: { coverageStatus: 'ACTIVE' } });
        logger.info(`Streak updated: user=${userId} streak=${newStreak} tier=${newTier}`);
    } catch (err) {
        logger.error('Failed to update streak/tier:', err);
    }
}

export async function recordContributionAmount(userId: string, amountKES: number): Promise<void> {
    try {
        await prisma.afyaScore.upsert({
            where: { userId },
            update: { totalContributions: { increment: amountKES } },
            create: { userId, totalContributions: amountKES },
        });
    } catch (err) {
        logger.error('Failed to record contribution amount:', err);
    }
}

// ── DARAJA STK CALLBACK (shared by direct + SHIF + merchant routes) ───────────
const stkCallbackHandler = async (req: Request, res: Response) => {
    // Daraja expects exactly this acknowledgement shape, always with HTTP 200
    const ack = { ResultCode: 0, ResultDesc: 'Accepted' };

    if (!validCallbackSecret(req.params.secret)) {
        logger.warn('[Daraja callback] rejected: bad secret');
        return res.status(403).json({ success: false });
    }

    const cb = req.body?.Body?.stkCallback;
    if (!cb?.CheckoutRequestID) {
        return res.status(400).json({ success: false, error: 'Invalid callback payload' });
    }

    const items: any[] = cb.CallbackMetadata?.Item ?? [];
    const pick = (name: string) => items.find((i) => i.Name === name)?.Value;
    const paid = pick('Amount');

    try {
        const result = await finalizePayment(cb.CheckoutRequestID, {
            resultCode: Number(cb.ResultCode),
            resultDesc: cb.ResultDesc,
            receipt: pick('MpesaReceiptNumber') !== undefined ? String(pick('MpesaReceiptNumber')) : undefined,
            paidAmount: paid !== undefined ? Number(paid) : undefined,
        });
        logger.info(`[Daraja callback] ${cb.CheckoutRequestID} code=${cb.ResultCode} -> ${result}`);
    } catch (err) {
        // Still acknowledge; the app's next status poll retries via STK Query.
        logger.error('[Daraja callback] finalize error', err);
    }
    return res.status(200).json(ack);
};

// ── DARAJA B2B CALLBACKS (merchant disbursement result) ───────────────────────
const b2bAck = { ResultCode: 0, ResultDesc: 'Accepted' };

const b2bResultHandler = async (req: Request, res: Response) => {
    if (!validCallbackSecret(req.params.secret)) {
        logger.warn('[B2B result] rejected: bad secret');
        return res.status(403).json({ success: false });
    }
    const txId = req.params.txId;
    const result = req.body?.Result;
    if (!result) return res.status(400).json({ success: false, error: 'Invalid payload' });

    const ok = Number(result.ResultCode) === 0;
    try {
        // Only a row we actually SENT can be completed/failed by a result
        const upd = await prisma.transaction.updateMany({
            where: { id: txId, source: 'MERCHANT', settlementStatus: 'SENT' },
            data: {
                settlementStatus: ok ? 'COMPLETED' : 'FAILED',
                settlementDesc: result.ResultDesc,
                ...(result.ConversationID ? { settlementRef: String(result.ConversationID) } : {}),
            },
        });
        if (!ok) {
            // 🚨 Customer paid but merchant not: alert ops, then retryMerchantDisbursement / Daraja Reversal
            logger.error(
                `[B2B result] DISBURSEMENT FAILED tx=${txId} code=${result.ResultCode} ${result.ResultDesc}. NEEDS RETRY/REVERSAL`,
            );
        } else {
            logger.info(`[B2B result] merchant paid tx=${txId} (updated=${upd.count})`);
        }
    } catch (err) {
        logger.error('[B2B result] handler error', err);
    }
    return res.status(200).json(b2bAck);
};

const b2bTimeoutHandler = async (req: Request, res: Response) => {
    if (!validCallbackSecret(req.params.secret)) {
        logger.warn('[B2B timeout] rejected: bad secret');
        return res.status(403).json({ success: false });
    }
    const txId = req.params.txId;
    try {
        await prisma.transaction.updateMany({
            where: { id: txId, source: 'MERCHANT', settlementStatus: 'SENT' },
            data: { settlementStatus: 'FAILED', settlementDesc: 'B2B queue timeout' },
        });
        logger.error(`[B2B timeout] tx=${txId} timed out in Daraja queue. Verify in portal, then retry`);
    } catch (err) {
        logger.error('[B2B timeout] handler error', err);
    }
    return res.status(200).json(b2bAck);
};

// ── CONTROLLER ────────────────────────────────────────────────────────────────
export const paymentController = {
    initiateStkPush: async (req: Request, res: Response) => {
        try {
            const data = stkPushSchema.parse(req.body);
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

            if (data.phone && !normalizeMsisdn(data.phone)) {
                return res.status(400).json({ success: false, error: 'Invalid phone number' });
            }

            const result = await initiateDarajaStkPush(userId, data.amount, data.description, data.phone, 'MPESA');

            if (!result.success) {
                logger.error('Daraja STK Push failed:', (result as any).detail || result.error);
                return res.status(502).json({
                    success: false,
                    error: result.error || 'M-PESA request failed',
                    detail: (result as any).detail,
                });
            }

            // Contribution amount is recorded on confirmed payment only (not here)
            return res.status(200).json({
                success: true,
                message: 'STK Push sent to your phone',
                data: {
                    merchantRequestId: (result as any).merchantRequestId,
                    checkoutRequestId: result.checkoutRequestId,
                    customerMessage: (result as any).customerMessage,
                },
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ success: false, error: error.errors });
            }
            logger.error('STK Push Error:', error);
            return res.status(500).json({ success: false, error: 'Payment initialization failed' });
        }
    },

    initiateSHIFStkPush: async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

            const { triggerTxRef, phone } = req.body;
            if (!triggerTxRef) {
                return res.status(400).json({ success: false, error: 'triggerTxRef is required' });
            }
            if (phone && !normalizeMsisdn(phone)) {
                return res.status(400).json({ success: false, error: 'Invalid phone number' });
            }

            const result = await initiateSHIFDeduction(userId, triggerTxRef, phone);

            if (!result.success) {
                return res.status(502).json({
                    success: false,
                    error: (result as any).error || 'SHIF STK push failed',
                    detail: (result as any).detail,
                });
            }

            return res.status(200).json({
                success: true,
                message: 'SHIF STK Push sent: KES 30 toward your SHA account',
                data: {
                    checkoutRequestId: result.checkoutRequestId,
                    shaPaybill: SHA_SHIF_PAYBILL,
                    amount: DAILY_SHIF_DEDUCTION,
                },
            });
        } catch (error) {
            logger.error('SHIF STK Push Error:', error);
            return res.status(500).json({ success: false, error: 'SHIF payment initialization failed' });
        }
    },

    // Route: POST /payment/merchant/stk-push  (auth required)
    initiateMerchantStkPush: async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

            const data = merchantPaySchema.parse(req.body);
            if (data.phone && !normalizeMsisdn(data.phone)) {
                return res.status(400).json({ success: false, error: 'Invalid phone number' });
            }

            const result = await initiateMerchantPayment(userId, data);
            if (!result.success) {
                logger.error('Merchant STK Push failed:', (result as any).detail || result.error);
                return res.status(502).json({
                    success: false,
                    error: result.error || 'M-PESA request failed',
                    detail: (result as any).detail,
                });
            }
            return res.status(200).json({
                success: true,
                message: 'STK Push sent to your phone',
                data: {
                    checkoutRequestId: result.checkoutRequestId,
                    total: result.total,
                    shifAmount: result.shifAmount,
                },
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ success: false, error: error.errors });
            }
            logger.error('Merchant STK Push Error:', error);
            return res.status(500).json({ success: false, error: 'Payment initialization failed' });
        }
    },

    /**
     * App polls this with the CheckoutRequestID returned by any push.
     * If the Daraja callback is late or lost, it asks Daraja directly (STK Query).
     */
    getPaymentStatus: async (req: Request, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

            const id = req.params.checkoutRequestId;
            const where = { checkoutRequestId: id, wallet: { userId } };

            let tx = await prisma.transaction.findFirst({ where });
            if (!tx) return res.status(404).json({ success: false, error: 'Transaction not found' });

            if (tx.status === 'PENDING' && Date.now() - tx.createdAt.getTime() > 15_000 && darajaConfigured()) {
                try {
                    const q = await queryStkStatus(id);
                    // While the customer is still on the PIN prompt, Daraja returns an error with no ResultCode.
                    if (q?.ResultCode !== undefined && q.ResultCode !== '') {
                        await finalizePayment(id, { resultCode: Number(q.ResultCode), resultDesc: q.ResultDesc });
                        tx = (await prisma.transaction.findFirst({ where })) ?? tx;
                    }
                } catch (err) {
                    logger.warn('[status] STK query failed', err);
                }
            }

            // Translate DB status -> what the app expects
            const status =
                tx.status === 'CONFIRMED'
                    ? 'SUCCESS'
                    : tx.status === 'FAILED' || tx.status === 'FLAGGED'
                      ? 'FAILED'
                      : 'PENDING'; // PENDING + PROCESSING

            let streak: number | undefined;
            let tier: string | undefined;
            if (status === 'SUCCESS') {
                const score = await prisma.afyaScore.findUnique({ where: { userId } });
                streak = score?.streakDays;
                tier = score?.tier as string | undefined;
            }

            return res.status(200).json({
                success: true,
                data: {
                    status,
                    source: tx.source,
                    receipt: tx.mpesaReceipt,
                    resultCode: tx.resultCode,
                    settlement: tx.source === 'MERCHANT' ? tx.settlementStatus : undefined,
                    message:
                        tx.status === 'FLAGGED'
                            ? 'Your payment is under review. Please contact support with your M-PESA receipt.'
                            : tx.resultDesc,
                    streak,
                    tier,
                },
            });
        } catch (error) {
            logger.error('Payment status error:', error);
            return res.status(500).json({ success: false, error: 'Could not fetch payment status' });
        }
    },

    // Route: POST /payment/callback/:secret  (NO auth middleware)
    // Also used by merchant payments (same STK callback URL)
    darajaCallback: stkCallbackHandler,

    // Route: POST /payment/shif-callback/:secret  (NO auth middleware)
    darajaSHIFCallback: stkCallbackHandler,

    // Route: POST /payment/b2b-result/:secret/:txId  (NO auth middleware)
    b2bResultHandler,

    // Route: POST /payment/b2b-timeout/:secret/:txId  (NO auth middleware)
    b2bTimeoutHandler,
};