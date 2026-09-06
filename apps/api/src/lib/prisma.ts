import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// Singleton pattern — prevents connection pool exhaustion in dev with hot reloads
declare global {
    // eslint-disable-next-line no-var
    var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma ?? new PrismaClient({
    log: [
        { level: 'warn', emit: 'stdout' },
        { level: 'error', emit: 'stdout' },
    ],
});

if (process.env.NODE_ENV !== 'production') {
    global.__prisma = prisma;
}

