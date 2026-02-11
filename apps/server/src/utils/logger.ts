import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
});

// In development, only use console transport
const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

const transports: winston.transport[] = [
    new winston.transports.Console({
        format: combine(colorize(), logFormat),
    }),
];

// Add file transports in production (plain files — reliable on all environments)
if (!isDev) {
    transports.push(
        new winston.transports.File({ filename: 'logs/error.log', level: 'error', maxsize: 20_000_000, maxFiles: 5 }),
        new winston.transports.File({ filename: 'logs/combined.log', maxsize: 50_000_000, maxFiles: 3 })
    );
}

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
    ),
    transports,
    exitOnError: false,
});

