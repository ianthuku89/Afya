import { createLogger, format, transports } from 'winston';

// Structured JSON logging — feeds into AWS CloudWatch / ELK stack
export const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json(),
    ),
    defaultMeta: { service: 'afyaToken-api' },
    transports: [
        new transports.Console({
            format: process.env.NODE_ENV === 'production'
                ? format.json()
                : format.combine(format.colorize(), format.simple()),
        }),
    ],
});

