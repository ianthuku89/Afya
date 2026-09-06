import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt';

// Extend Express Request
declare global {
    namespace Express {
        interface Request {
            internalUser?: { userId: string; role: string; isInternal: boolean; jti: string };
        }
    }
}

export async function authenticateInternal(
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

        // Determine internal status by role value — internal tokens carry InternalRole strings
        const internalRoles = ['SUPER_ADMIN','DIRECTOR','FINANCE','OFFICE_ADMIN','TECH','HR'];
        const isInternal = internalRoles.includes((payload as any).role as string);
        if (!isInternal) {
            res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not an internal staff token' } });
            return;
        }

        req.internalUser = {
            userId: payload.sub,
            role: (payload as any).role,
            isInternal: true,
            jti: payload.jti,
        };
        next();
    } catch {
        res.status(401).json({ success: false, error: { code: 'TOKEN_INVALID', message: 'Token invalid or expired' } });
    }
}

export function authorizeInternal(roles: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.internalUser) {
            res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
            return;
        }
        if (!roles.includes(req.internalUser.role)) {
            res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
            return;
        }
        next();
    };
}
