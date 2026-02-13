import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
    statusCode: number;
    isOperational: boolean;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    // Always log full details server-side
    logger.error({
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    // Guard: if headers already sent, delegate to Express default handler
    if (res.headersSent) {
        return;
    }

    const isProduction = process.env.NODE_ENV === 'production';

    // Zod validation errors
    if (err instanceof ZodError) {
        res.status(400).json({
            error: 'Validation failed',
            details: err.errors.map((e) => ({
                field: e.path.join('.'),
                message: e.message,
            })),
        });
        return;
    }

    // Custom app errors (operational — safe to expose message)
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            error: err.message,
        });
        return;
    }

    // Prisma errors
    if (err.name === 'PrismaClientKnownRequestError') {
        const prismaError = err as { code?: string; meta?: { target?: string[] } };

        if (prismaError.code === 'P2002') {
            res.status(409).json({
                error: 'A record with this value already exists',
            });
            return;
        }

        if (prismaError.code === 'P2025') {
            res.status(404).json({
                error: 'Record not found',
            });
            return;
        }
    }

    // Prisma connection / initialization errors → 503
    if (
        err.name === 'PrismaClientInitializationError' ||
        err.name === 'PrismaClientRustPanicError'
    ) {
        res.status(503).json({
            error: 'Service temporarily unavailable',
        });
        return;
    }

    // Multer errors
    if (err.name === 'MulterError') {
        res.status(400).json({
            error: `Upload error: ${err.message}`,
        });
        return;
    }

    // JSON syntax errors (malformed request body)
    if (err instanceof SyntaxError && 'body' in err) {
        res.status(400).json({
            error: 'Invalid JSON in request body',
        });
        return;
    }

    // Default error — NEVER leak internal message/stack in production
    res.status(500).json({
        error: 'Internal server error',
        ...(isProduction ? {} : { message: err.message }),
    });
};
