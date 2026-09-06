import { createApp } from './app';
import { logger } from './lib/logger';

const PORT = Number(process.env.PORT) || 3001;

async function main() {
    const app = createApp();

    app.listen(PORT, () => {
        logger.info(`AfyaToken API server running on port ${PORT}`);
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

main().catch((err) => {
    logger.error('Failed to start server:', err);
    process.exit(1);
});
