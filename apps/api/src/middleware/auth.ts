import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt.js';
import { UserRole } from '@afyaToken/types';

// Extend Express Request to carry decoded JWT payload
declare global {
    namespace Express {
        interface Request {
            user?: { userId: string; role: UserRole; shaId?: string; jti: string };
        }
    }
}

/**
 * authenticate — verifies JWT RS256 Bearer token
 *
 * Security rationale:
 * - Strips "Bearer " prefix and calls jose.jwtVerify with RS256 public key
 * - Expired tokens rejected automatically by jose
 * - Returns 401 (not 403) to avoid confirming resource existence (OWASP A01)
 */
export async function authenticate(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } });
            return;
        }

        const token = authHeader.slice(7);
        const payload = await verifyAccessToken(token);

        req.user = {
            userId: payload.sub,
            role: payload.role,
            shaId: payload.shaId,
            jti: payload.jti,
        };
        next();
    } catch {
        res.status(401).json({ success: false, error: { code: 'TOKEN_INVALID', message: 'Token invalid or expired' } });
    }
}

/**
 * authorize — RBAC role guard factory
 *
 * Security rationale: Roles checked AFTER authentication so the user identity
 * is confirmed before any resource check — prevents IDOR attacks.
 *
 * @param roles Allowed roles for the route
 */
export function authorize(...roles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
            return;
        }
        if (!roles.includes(req.user.role)) {
            // Return 403 — they are authenticated but not authorized
            res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
            return;
        }
        next();
    };
}

