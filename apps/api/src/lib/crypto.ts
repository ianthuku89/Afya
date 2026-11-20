import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { createHmac } from 'crypto';


// ─── AES-256-GCM Encryption (OWASP A02, DHA health data at rest) ──────────────
// Security rationale: AES-256-GCM provides authenticated encryption —
// it detects tampering (via auth tag) in addition to providing confidentiality.
// IV is unique per encryption operation; key derived from AWS Secrets Manager value.

const ALGORITHM = 'aes-256-gcm';
const IV_LEN = 16; // 128-bit IV
const TAG_LEN = 16; // 128-bit auth tag

/**
 * Derive a 32-byte key from the secret (stored in AWS Secrets Manager).
 * scrypt is memory-hard, making brute-force attacks expensive.
 */
function deriveKey(): Buffer {
    // Fallback key for local development to prevent "Internal Server Error" on registration
    const secret = process.env.ENCRYPTION_KEY || 'afyatoken-dev-fallback-encryption-key-32-chars';
    const salt = process.env.ENCRYPTION_SALT || 'afyaToken-salt-v1';
    return scryptSync(secret, salt, 32) as Buffer;
}

/**
 * Encrypt a plaintext string with AES-256-GCM
 * @returns Base64 encoded string: IV_HEX:CIPHERTEXT_HEX:TAG_HEX
 */
export function encrypt(plaintext: string): string {
    const key = deriveKey();
    const iv = randomBytes(IV_LEN);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
}

/**
 * Decrypt an AES-256-GCM encrypted value
 * @param encryptedValue Format: IV_HEX:CIPHERTEXT_HEX:TAG_HEX
 */
export function decrypt(encryptedValue: string): string {
    const key = deriveKey();
    const parts = encryptedValue.split(':');
    if (parts.length !== 3) throw new Error('Invalid encrypted value format');

    const [ivHex, cipherHex, tagHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const ciphertext = Buffer.from(cipherHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
    ]).toString('utf8');
}

/** Safe equality check (constant-time) for token comparison */
export function safeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let mismatch = 0;
    for (let i = 0; i < a.length; i++) {
        mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return mismatch === 0;
}



/** 0712345678 | 712345678 | 254712345678 | +254712345678  ->  +254712345678 (null if invalid) */
export function normalizeKenyanPhone(input: string): string | null {
    const digits = input.replace(/[^\d]/g, '');
    let national: string;
    if (digits.startsWith('254') && digits.length === 12) national = digits.slice(3);
    else if (digits.startsWith('0') && digits.length === 10) national = digits.slice(1);
    else if (digits.length === 9) national = digits;
    else return null;
    if (!/^[71]\d{8}$/.test(national)) return null; // Safaricom/Airtel 07xx and 01xx ranges
    return `+254${national}`;
}

/** Deterministic, keyed hash so we can look users up without storing the plaintext phone. */
export function hashPhone(normalizedPhone: string): string {
    const key = process.env.PHONE_HASH_KEY;
    if (!key) throw new Error('PHONE_HASH_KEY is not set');
    return createHmac('sha256', key).update(normalizedPhone).digest('hex');
}

/** +254712345678 -> +254 7•• ••• 678 */
export function maskPhone(normalizedPhone: string): string {
    return `${normalizedPhone.slice(0, 4)} ${normalizedPhone[4]}•• ••• ${normalizedPhone.slice(-3)}`;
}

/** "Jane Wanjiku Kamau" -> "Jane K." */
export function maskName(fullName: string): string {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

