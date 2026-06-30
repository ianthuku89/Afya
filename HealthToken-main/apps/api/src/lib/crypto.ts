import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

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
