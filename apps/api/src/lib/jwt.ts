import { SignJWT, jwtVerify, importPKCS8, importSPKI, KeyLike } from 'jose';
import { v4 as uuidv4 } from 'uuid';
import { UserRole, JWTAccessPayload, JWTRefreshPayload } from '@afyaToken/types';

// ── RS256 Keys (loaded from AWS Secrets Manager IN PRODUCTION) ────────────────
// Security rationale: RS256 (asymmetric) means the public key can be shared
// with downstream services for token verification without exposing the signing key.
// HS256 (symmetric) would require sharing the secret — far more dangerous.

let _privateKey: KeyLike | null = null;
let _publicKey: KeyLike | null = null;

async function getPrivateKey(): Promise<KeyLike> {
    if (_privateKey) return _privateKey;
    const pem = process.env.JWT_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!pem) throw new Error('JWT_PRIVATE_KEY not configured');
    _privateKey = await importPKCS8(pem, 'RS256');
    return _privateKey;
}

async function getPublicKey(): Promise<KeyLike> {
    if (_publicKey) return _publicKey;
    const pem = process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n');
    if (!pem) throw new Error('JWT_PUBLIC_KEY not configured');
    _publicKey = await importSPKI(pem, 'RS256');
    return _publicKey;
}

// ── ACCESS TOKEN (15-minute lifespan) ─────────────────────────────────────────
export async function signAccessToken(payload: {
    userId: string;
    role: UserRole;
    shaId?: string;
}): Promise<string> {
    const privateKey = await getPrivateKey();
    return new SignJWT({
        sub: payload.userId,
        role: payload.role,
        shaId: payload.shaId,
        jti: uuidv4(),
    })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setExpirationTime('15m')          // 15-minute access token as specified
        .setIssuer('afyaToken-api')
        .setAudience('afyaToken-platform')
        .sign(privateKey);
}

// ── REFRESH TOKEN (7-day lifespan, rotating) ──────────────────────────────────
export async function signRefreshToken(payload: {
    userId: string;
    family: string;
}): Promise<{ token: string; jti: string }> {
    const privateKey = await getPrivateKey();
    const jti = uuidv4();
    const token = await new SignJWT({
        sub: payload.userId,
        family: payload.family,
        jti,
    })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .setIssuer('afyaToken-api')
        .setAudience('afyaToken-refresh')
        .sign(privateKey);

    return { token, jti };
}

// ── VERIFY ACCESS TOKEN ───────────────────────────────────────────────────────
export async function verifyAccessToken(token: string): Promise<JWTAccessPayload> {
    const publicKey = await getPublicKey();
    const { payload } = await jwtVerify(token, publicKey, {
        issuer: 'afyaToken-api',
        audience: 'afyaToken-platform',
        algorithms: ['RS256'],
    });
    return payload as unknown as JWTAccessPayload;
}

// ── VERIFY REFRESH TOKEN ─────────────────────────────────────────────────────
export async function verifyRefreshToken(token: string): Promise<JWTRefreshPayload> {
    const publicKey = await getPublicKey();
    const { payload } = await jwtVerify(token, publicKey, {
        issuer: 'afyaToken-api',
        audience: 'afyaToken-refresh',
        algorithms: ['RS256'],
    });
    return payload as unknown as JWTRefreshPayload;
}

