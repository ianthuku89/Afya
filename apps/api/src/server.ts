import { createApp } from './app.js';
import { logger } from './lib/logger.js';
import { disbursePendingMerchantSettlements } from './controllers/payment.controller.js';

const PORT = Number(process.env.PORT) || 3001;

// Safety net: pays merchants for confirmed payments whose disbursement never started
// (e.g. the server crashed right after the customer's payment was confirmed).
// Safe with multiple instances: disburseToMerchant claims each row atomically.
const SWEEP_INTERVAL_MS = 3 * 60 * 1000;
let sweeping = false;

async function runSettlementSweep() {
    if (sweeping) return; // never overlap runs
    sweeping = true;
    try {
        const n = await disbursePendingMerchantSettlements();
        if (n > 0) logger.info(`[sweep] re-attempted ${n} stuck merchant settlement(s)`);
    } catch (err) {
        logger.error('[sweep] merchant settlement sweep failed', err);
    } finally {
        sweeping = false;
    }
}

async function main() {
    const app = createApp();

    const server = app.listen(PORT, () => {
        logger.info(`AfyaToken API server running on port ${PORT}`);
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    const timer = setInterval(runSettlementSweep, SWEEP_INTERVAL_MS);

    const shutdown = (signal: string) => {
        logger.info(`${signal} received, shutting down`);
        clearInterval(timer);
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(0), 10_000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
    logger.error('Failed to start server:', err);
    process.exit(1);
});