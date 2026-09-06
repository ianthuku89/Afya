import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * validate — Zod request body validation middleware factory
 *
 * Security rationale (OWASP A03: Injection):
 * - All inputs parsed through Zod before touching database layer
 * - Zod strips unknown keys by default when using .strict()
 * - Returns structured validation errors without leaking schema details
 * - Parameterized queries (Prisma) handle SQL-injection prevention
 */
export function validate(schema: ZodSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (err) {
            if (err instanceof ZodError) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Request validation failed',
                        details: err.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
                    },
                });
                return;
            }
            next(err);
        }
    };
}

/**
 * validateQuery — Zod query parameter validation middleware
 */
export function validateQuery(schema: ZodSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            req.query = schema.parse(req.query);
            next();
        } catch (err) {
            if (err instanceof ZodError) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'QUERY_VALIDATION_ERROR',
                        message: 'Query parameter validation failed',
                        details: err.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
                    },
                });
                return;
            }
            next(err);
        }
    };
}
