/**
 * Rate Limiting Middleware
 * Production-grade rate limiting for API protection
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

interface RateLimitOptions {
    windowMs?: number;        // Time window in milliseconds
    maxRequests?: number;     // Maximum requests per window
    keyGenerator?: (req: Request) => string;
    skipFailedRequests?: boolean;
    message?: string;
}

// In-memory store (use Redis in production for distributed systems)
const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
        if (now > entry.resetTime) {
            store.delete(key);
        }
    }
}, 60000); // Clean every minute

/**
 * Default key generator using IP address
 */
function defaultKeyGenerator(req: Request): string {
    return (
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.ip ||
        'unknown'
    );
}

/**
 * Create rate limiter middleware
 */
export function rateLimit(options: RateLimitOptions = {}) {
    const {
        windowMs = 60000,        // 1 minute default
        maxRequests = 100,       // 100 requests per window
        keyGenerator = defaultKeyGenerator,
        skipFailedRequests = false,
        message = 'Too many requests, please try again later.',
    } = options;

    return (req: Request, res: Response, next: NextFunction) => {
        const key = keyGenerator(req);
        const now = Date.now();

        let entry = store.get(key);

        // Reset if window expired
        if (!entry || now > entry.resetTime) {
            entry = { count: 1, resetTime: now + windowMs };
            store.set(key, entry);
        } else {
            entry.count++;
        }

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count));
        res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

        // Check if limit exceeded
        if (entry.count > maxRequests) {
            res.status(429).json({
                error: message,
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: Math.ceil((entry.resetTime - now) / 1000),
            });
            return;
        }

        // Skip incrementing on failed requests if configured
        if (skipFailedRequests) {
            const originalEnd = res.end.bind(res);
            res.end = function (chunk?: unknown, encoding?: unknown) {
                if (res.statusCode >= 400 && entry) {
                    entry.count--;
                }
                return originalEnd(chunk, encoding);
            } as typeof res.end;
        }

        next();
    };
}

/**
 * Preset rate limiters for different use cases
 */
export const rateLimiters = {
    // Standard API rate limit
    api: rateLimit({
        windowMs: 60000,
        maxRequests: 100,
    }),

    // Strict limit for auth endpoints
    auth: rateLimit({
        windowMs: 900000, // 15 minutes
        maxRequests: 10,
        message: 'Too many login attempts. Please try again in 15 minutes.',
    }),

    // Upload rate limit
    upload: rateLimit({
        windowMs: 3600000, // 1 hour
        maxRequests: 50,
        message: 'Upload limit reached. Please try again later.',
    }),

    // Search rate limit
    search: rateLimit({
        windowMs: 60000,
        maxRequests: 30,
    }),

    // WebSocket connection limit
    websocket: rateLimit({
        windowMs: 60000,
        maxRequests: 5,
        message: 'Too many connection attempts.',
    }),
};

export default rateLimit;
