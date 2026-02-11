import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

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

// Add rotating file transports in production to prevent disk exhaustion
if (!isDev) {
    transports.push(
        new DailyRotateFile({
            filename: 'logs/error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxSize: '20m',
            maxFiles: '14d', // Keep error logs for 14 days
            zippedArchive: true,
        }),
        new DailyRotateFile({
            filename: 'logs/combined-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: '50m',
            maxFiles: '7d', // Keep combined logs for 7 days
            zippedArchive: true,
        })
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

