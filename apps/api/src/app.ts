import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

import { authRouter } from './routes/auth.js';
import { claimsRouter } from './routes/claims.js';
import { walletRouter } from './routes/wallet.js';
import { fhirRouter } from './routes/fhir.js';
import { facilitiesRouter } from './routes/facilities.js';
import { fraudRouter } from './routes/fraud.js';
import { adminRouter } from './routes/admin.js';
import { paymentRouter } from './routes/payment.js';
import { afyaScoreRouter } from './routes/afyascore.js';
import { coverageRouter } from './routes/coverage.js';
import { loyaltyRouter } from './routes/loyalty.js';
import { ussdRouter } from './routes/ussd.js';
import { licensingRouter } from './routes/licensing.js';
import { internalAuthRouter } from './routes/internal/auth.js';
import { internalFinanceRouter } from './routes/internal/finance.js';
import { auditMiddleware } from './middleware/audit.js';
import { logger } from './lib/logger.js';

export function createApp(): Application {
    const app = express();

    // ── TRUST PROXY ────────────────────────────────────────────────────────
    // Render (and most PaaS providers) sit behind a reverse proxy, so Express
    // needs this to correctly read X-Forwarded-For for rate limiting, IP
    // logging, and secure cookies. Without it, express-rate-limit throws
    // ERR_ERL_UNEXPECTED_X_FORWARDED_FOR on every request.
    app.set('trust proxy', 1);

    // ── SECURITY HEADERS (OWASP A05: Security Misconfiguration) ──────────────
    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", 'data:', 'https:'],
                    connectSrc: ["'self'"],
                    frameSrc: ["'none'"],
                    objectSrc: ["'none'"],
                },
            },
            hsts: {
                maxAge: 63_072_000, // 2 years in seconds
                includeSubDomains: true,
                preload: true,
            },
            frameguard: { action: 'deny' },
        })
    );

    // ── CORS (OWASP A01: Broken Access Control) ───────────────────────────────
    // Safaricom callbacks are server-to-server (no Origin header), so they pass the !origin check.
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
        .split(',')
        .map(o => o.trim());

    app.use(
        cors({
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error(`CORS: origin ${origin} not allowed`));
                }
            },
            credentials: true,
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
            exposedHeaders: ['X-Request-ID'],
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
            maxAge: 600,
        })
    );

    // ── RATE LIMITING (OWASP A04: Insecure Design) ───────────────────────────
    // CHANGED: Safaricom callbacks and the app's payment-status polling are excluded from the
    // general 100 req/min/IP limiter. Many phones share one carrier IP, and a 3s poll per user
    // would otherwise start returning 429s. Status polling gets its own, higher limiter below.
    const PAYMENT_EXEMPT_PREFIXES = ['/payment/callback', '/payment/shif-callback', '/payment/status'];

    const publicLimiter = rateLimit({
        windowMs: 60_000,       // 1 minute
        max: 100,               // 100 req/min per IP (public endpoints)
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => PAYMENT_EXEMPT_PREFIXES.some((p) => req.path.startsWith(p)),
        message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
    });

    // NEW: payment polling (every ~3s per active payment); keyed by the user's token, falling back to IP
    const paymentStatusLimiter = rateLimit({
        windowMs: 60_000,
        max: 120,
        keyGenerator: (req) => (req.headers.authorization as string) || req.ip || 'unknown',
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many status checks' } },
    });

    const facilityLimiter = rateLimit({
        windowMs: 60_000,
        max: 1000,         // 1000 req/min for facilities
        keyGenerator: (req) => req.headers['x-facility-id'] as string || req.ip || 'unknown',
        standardHeaders: true,
        legacyHeaders: false,
    });

    const authLimiter = rateLimit({
        windowMs: 900_000,      // 15 minutes
        max: 10,                // Max 10 login attempts per 15 min: brute-force protection
        message: { success: false, error: { code: 'AUTH_RATE_LIMIT', message: 'Too many login attempts' } },
    });

    app.use('/api/v1/auth', authLimiter);
    app.use('/api/v1/fhir', facilityLimiter);
    app.use('/api/v1/payment/status', paymentStatusLimiter);
    app.use('/api/v1', publicLimiter);

    // ── BODY PARSING ─────────────────────────────────────────────────────────
    // 10kb limit prevents large payload DoS attacks (Daraja callbacks are well under this)
    app.use(express.json({ limit: '10kb' }));
    app.use(express.urlencoded({ extended: false, limit: '10kb' }));
    app.use(compression());

    // ── REQUEST ID (tracing) ────────────────────────────────────────────────
    app.use((req: Request, res: Response, next: NextFunction) => {
        const requestId = (req.headers['x-request-id'] as string) || uuidv4();
        req.headers['x-request-id'] = requestId;
        res.setHeader('X-Request-ID', requestId);
        next();
    });

    // ── AUDIT MIDDLEWARE (DHA: every data access logged) ──────────────────────
    app.use(auditMiddleware);

    // ── ROUTES ───────────────────────────────────────────────────────────────
    app.use('/api/v1/auth', authRouter);
    app.use('/api/v1/claims', claimsRouter);
    app.use('/api/v1/wallet', walletRouter);
    app.use('/api/v1/fhir', fhirRouter);
    app.use('/api/v1/facilities', facilitiesRouter);
    app.use('/api/v1/fraud', fraudRouter);
    app.use('/api/v1/admin', adminRouter);
    app.use('/api/v1/payment', paymentRouter);
    app.use('/api/v1/afyascore', afyaScoreRouter);
    app.use('/api/v1/coverage', coverageRouter);
    app.use('/api/v1/loyalty', loyaltyRouter);

    // USSD must bypass standard JWT auth since telephony gateways fire requests externally
    app.use('/api/v1/ussd', ussdRouter);
    // Licensing API for partners (DHA / Safaricom)
    app.use('/api/v1/licensing', licensingRouter);

    // SEABOARD INTERNAL ROUTES
    app.use('/api/v1/internal/auth', internalAuthRouter);
    app.use('/api/v1/internal/finance', internalFinanceRouter);

    // ── HEALTH CHECK ─────────────────────────────────────────────────────────
    app.get('/health', (_req, res) => {
        res.json({ status: 'healthy', service: 'afyaToken-api', timestamp: new Date().toISOString() });
    });

    // ── 404 Handler ──────────────────────────────────────────────────────────
    app.use((_req: Request, res: Response) => {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
    });

    // ── Global Error Handler ─────────────────────────────────────────────────
    app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
        const requestId = req.headers['x-request-id'] as string;
        logger.error({
            message: err.message,
            stack: err.stack,
            name: err.name,
            requestId,
            path: req.path,
        });
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred' },
            meta: { requestId },
        });
    });

    return app;
}