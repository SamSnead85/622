/**
 * Caching Middleware
 * Redis-compatible in-memory cache for API responses
 */

import { Request, Response, NextFunction } from 'express';

// ============================================
// CACHE STORE
// ============================================

interface CacheEntry {
    data: unknown;
    expiresAt: number;
    etag: string;
}

const cache = new Map<string, CacheEntry>();

// Cleanup expired entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
        if (now > entry.expiresAt) {
            cache.delete(key);
        }
    }
}, 300000);

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate cache key from request
 */
function generateCacheKey(req: Request): string {
    const userId = (req as Request & { userId?: string }).userId || 'anonymous';
    return `${req.method}:${req.originalUrl}:${userId}`;
}

/**
 * Generate ETag from data
 */
function generateETag(data: unknown): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `"${hash.toString(16)}"`;
}

// ============================================
// CACHE MIDDLEWARE
// ============================================

interface CacheOptions {
    ttl?: number;           // Time to live in seconds
    private?: boolean;      // Per-user cache
    staleWhileRevalidate?: number;
    keyGenerator?: (req: Request) => string;
}

/**
 * Cache GET responses
 */
export function cacheMiddleware(options: CacheOptions = {}) {
    const {
        ttl = 60,
        private: isPrivate = false,
        staleWhileRevalidate = 0,
        keyGenerator = generateCacheKey,
    } = options;

    return (req: Request, res: Response, next: NextFunction) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        const key = keyGenerator(req);
        const cached = cache.get(key);
        const now = Date.now();

        // Check for ETag match
        if (cached && req.headers['if-none-match'] === cached.etag) {
            return res.status(304).end();
        }

        // Return cached response if valid
        if (cached && now < cached.expiresAt) {
            res.setHeader('X-Cache', 'HIT');
            res.setHeader('ETag', cached.etag);
            res.setHeader('Cache-Control', `${isPrivate ? 'private' : 'public'}, max-age=${ttl}`);
            return res.json(cached.data);
        }

        // Return stale while revalidating
        if (cached && staleWhileRevalidate > 0 &&
            now < cached.expiresAt + (staleWhileRevalidate * 1000)) {
            res.setHeader('X-Cache', 'STALE');
            res.setHeader('ETag', cached.etag);
            res.json(cached.data);
            // Continue to revalidate in background
        }

        // Override res.json to cache the response
        const originalJson = res.json.bind(res);
        res.json = (data: unknown) => {
            // Only cache successful responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const etag = generateETag(data);
                cache.set(key, {
                    data,
                    expiresAt: now + (ttl * 1000),
                    etag,
                });
                res.setHeader('X-Cache', 'MISS');
                res.setHeader('ETag', etag);
                res.setHeader('Cache-Control', `${isPrivate ? 'private' : 'public'}, max-age=${ttl}`);
            }
            return originalJson(data);
        };

        next();
    };
}

// ============================================
// CACHE INVALIDATION
// ============================================

/**
 * Invalidate cache entries matching a pattern
 */
export function invalidateCache(pattern: string): number {
    let count = 0;
    for (const key of cache.keys()) {
        if (key.includes(pattern)) {
            cache.delete(key);
            count++;
        }
    }
    return count;
}

/**
 * Clear all cache
 */
export function clearCache(): void {
    cache.clear();
}

/**
 * Get cache stats
 */
export function getCacheStats(): { size: number; keys: string[] } {
    return {
        size: cache.size,
        keys: Array.from(cache.keys()),
    };
}

// ============================================
// PRESET CACHE CONFIGURATIONS
// ============================================

export const cachePresets = {
    // Public static data - long TTL
    static: cacheMiddleware({ ttl: 3600, private: false }),

    // User-specific data - short TTL
    user: cacheMiddleware({ ttl: 60, private: true }),

    // Feed data - very short TTL with stale-while-revalidate
    feed: cacheMiddleware({ ttl: 10, private: true, staleWhileRevalidate: 30 }),

    // Search results - medium TTL
    search: cacheMiddleware({ ttl: 300, private: false }),

    // Profiles - medium TTL
    profile: cacheMiddleware({ ttl: 120, private: false }),
};

// ============================================
// EXPORTS
// ============================================

export default {
    cacheMiddleware,
    invalidateCache,
    clearCache,
    getCacheStats,
    cachePresets,
};
