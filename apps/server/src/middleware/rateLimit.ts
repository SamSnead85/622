import { Request, Response, NextFunction } from 'express';
import { cache } from '../services/cache/RedisCache.js';
import { AppError } from './errorHandler.js';

interface RateLimitOptions {
    windowMs: number; // Time window in milliseconds
    max: number; // Max requests per window
    message?: string;
    keyGenerator?: (req: Request) => string;
}

/**
 * Redis-based rate limiter middleware
 * Uses existing Redis cache for distributed rate limiting
 */
export const rateLimit = (options: RateLimitOptions) => {
    const {
        windowMs,
        max,
        message = 'Too many requests, please try again later',
        keyGenerator = (req) => req.ip || 'unknown'
    } = options;

    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const key = `ratelimit:${keyGenerator(req)}`;
            const ttlSeconds = Math.floor(windowMs / 1000);

            // Increment and get current count
            const current = await cache.increment(key, ttlSeconds);

            // Set rate limit headers
            res.setHeader('X-RateLimit-Limit', max.toString());
            res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current).toString());
            res.setHeader('X-RateLimit-Reset', new Date(Date.now() + windowMs).toISOString());

            if (current > max) {
                throw new AppError(message, 429);
            }

            next();
        } catch (error) {
            if (error instanceof AppError && error.statusCode === 429) {
                next(error);
            } else {
                // If Redis fails, allow request through (graceful degradation)
                next();
            }
        }
    };
};

/**
 * User-specific rate limiter (requires authentication)
 */
export const userRateLimit = (options: RateLimitOptions) => {
    return rateLimit({
        ...options,
        keyGenerator: (req: any) => {
            return req.userId || req.ip || 'unknown';
        }
    });
};

/**
 * Predefined rate limiters for common use cases
 */
export const rateLimiters = {
    // General API - 100 requests per 15 minutes per IP
    general: rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
    }),

    // Auth endpoints - 5 attempts per 15 minutes per IP
    auth: rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5,
        message: 'Too many authentication attempts, please try again later',
    }),

    // Post creation - 10 posts per minute per user
    createPost: userRateLimit({
        windowMs: 60 * 1000,
        max: 10,
        message: 'You are creating posts too quickly, please slow down',
    }),

    // Comments - 20 per minute per user
    createComment: userRateLimit({
        windowMs: 60 * 1000,
        max: 20,
        message: 'You are commenting too quickly, please slow down',
    }),

    // Messages - 30 per minute per user
    sendMessage: userRateLimit({
        windowMs: 60 * 1000,
        max: 30,
        message: 'You are sending messages too quickly',
    }),

    // Uploads - 5 per minute per user
    upload: userRateLimit({
        windowMs: 60 * 1000,
        max: 5,
        message: 'Too many uploads, please wait a moment',
    }),
};
