import { Redis } from 'ioredis';
import { logger } from '../../utils/logger.js';

/**
 * Redis Cache Service
 * Provides high-performance caching layer for frequently accessed data.
 * Gracefully degrades to no-cache if Redis is unavailable.
 */
export class CacheService {
    private redis: Redis | null = null;
    private isEnabled: boolean = false;

    constructor() {
        if (process.env.REDIS_URL) {
            try {
                this.redis = new Redis(process.env.REDIS_URL, {
                    retryStrategy: (times) => {
                        if (times > 3) {
                            logger.error('Redis connection failed after 3 retries');
                            return null;
                        }
                        return Math.min(times * 50, 2000);
                    },
                    maxRetriesPerRequest: 3,
                });

                this.redis.on('connect', () => {
                    logger.info('✅ Redis cache connected');
                    this.isEnabled = true;
                });

                this.redis.on('error', (err) => {
                    logger.error('Redis error:', err);
                    this.isEnabled = false;
                });
            } catch (error) {
                logger.error('Failed to initialize Redis:', error);
                this.redis = null;
            }
        } else {
            logger.warn('⚠️ REDIS_URL not set. Running without cache.');
        }
    }

    /**
     * Get cached value by key
     */
    async get<T>(key: string): Promise<T | null> {
        if (!this.redis || !this.isEnabled) return null;

        try {
            const data = await this.redis.get(key);
            if (!data) return null;

            return JSON.parse(data) as T;
        } catch (error) {
            logger.error(`Cache get error for key ${key}:`, error);
            return null;
        }
    }

    /**
     * Set cache value with TTL (time-to-live)
     */
    async set(key: string, value: any, ttlSeconds: number = 60): Promise<void> {
        if (!this.redis || !this.isEnabled) return;

        try {
            await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
        } catch (error) {
            logger.error(`Cache set error for key ${key}:`, error);
        }
    }

    /**
     * Delete specific key
     */
    async delete(key: string): Promise<void> {
        if (!this.redis || !this.isEnabled) return;

        try {
            await this.redis.del(key);
        } catch (error) {
            logger.error(`Cache delete error for key ${key}:`, error);
        }
    }

    /**
     * Invalidate all keys matching pattern (e.g., "feed:user123:*")
     * Uses SCAN instead of KEYS to avoid blocking Redis at scale
     */
    async invalidate(pattern: string): Promise<void> {
        if (!this.redis || !this.isEnabled) return;

        try {
            let cursor = '0';
            let totalDeleted = 0;

            do {
                const [nextCursor, keys] = await this.redis.scan(
                    cursor,
                    'MATCH', pattern,
                    'COUNT', 100
                );
                cursor = nextCursor;

                if (keys.length > 0) {
                    await this.redis.del(...keys);
                    totalDeleted += keys.length;
                }
            } while (cursor !== '0');

            if (totalDeleted > 0) {
                logger.info(`Invalidated ${totalDeleted} cache keys matching ${pattern}`);
            }
        } catch (error) {
            logger.error(`Cache invalidate error for pattern ${pattern}:`, error);
        }
    }

    /**
     * Increment counter (useful for rate limiting)
     */
    async increment(key: string, ttlSeconds?: number): Promise<number> {
        if (!this.redis || !this.isEnabled) return 0;

        try {
            const value = await this.redis.incr(key);
            if (ttlSeconds && value === 1) {
                await this.redis.expire(key, ttlSeconds);
            }
            return value;
        } catch (error) {
            logger.error(`Cache increment error for key ${key}:`, error);
            return 0;
        }
    }

    /**
     * Health check
     */
    async healthCheck(): Promise<boolean> {
        if (!this.redis) return false;

        try {
            await this.redis.ping();
            return true;
        } catch {
            return false;
        }
    }
}

export const cache = new CacheService();
