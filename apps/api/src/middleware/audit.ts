import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuditAction } from '@afyaToken/types';

/**
 * auditMiddleware — DHA: logs every data-access event
 *
 * DHA Compliance: Kenya Data Protection Act 2019 requires immutable audit log
 * of every access event including: userId, resourceId, action, timestamp, IP.
 * Retained 7 years — enforced at PostgreSQL role level (INSERT-only table).
 *
 * Security rationale: Audit log written to DB, NOT just log file, because:
 * - Log files can be purged; DB rows are harder to erase without leaving traces
 * - Downstream SIEM can consume DB change events
 */
export function auditMiddleware(req: Request, _res: Response, next: NextFunction): void {
    // Attach a lightweight audit helper to the request object
    (req as any).audit = async (action: AuditAction, resourceId: string, success: boolean, errorCode?: string) => {
        if (!req.user) return; // Only log authenticated actions
        try {
            await prisma.auditLog.create({
                data: {
                    userId: req.user.userId,
                    resourceId,
                    action: action as any,
                    ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown',
                    userAgent: req.headers['user-agent'],
                    requestId: req.headers['x-request-id'] as string,
                    success,
                    errorCode: errorCode || null,
                },
            });
        } catch {
            // Audit failure must not break the request — but should alert
            console.error('[AUDIT] Failed to write audit log for user', req.user.userId);
        }
    };
    next();
}

