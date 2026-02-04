/**
 * Database Query Optimization Utilities
 * Production-grade database helpers for scalability
 */

import { PrismaClient } from '@prisma/client';

// ============================================
// SINGLETON PRISMA CLIENT
// ============================================

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === 'development'
            ? ['query', 'error', 'warn']
            : ['error'],
    });

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

// ============================================
// PAGINATION HELPERS
// ============================================

export interface PaginationParams {
    page?: number;
    limit?: number;
    cursor?: string;
}

export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrevious: boolean;
        nextCursor?: string;
    };
}

/**
 * Create pagination metadata from query result
 */
export function createPagination<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
): PaginatedResult<T> {
    const totalPages = Math.ceil(total / limit);
    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrevious: page > 1,
        },
    };
}

/**
 * Create cursor-based pagination metadata
 */
export function createCursorPagination<T extends { id: string }>(
    data: T[],
    limit: number,
    hasMore: boolean
): PaginatedResult<T> {
    const lastItem = data[data.length - 1];
    return {
        data,
        pagination: {
            page: 1,
            limit,
            total: -1, // Unknown with cursor pagination
            totalPages: -1,
            hasNext: hasMore,
            hasPrevious: false,
            nextCursor: hasMore && lastItem ? lastItem.id : undefined,
        },
    };
}

/**
 * Parse pagination params from request
 */
export function parsePaginationParams(query: {
    page?: string;
    limit?: string;
    cursor?: string;
}): PaginationParams {
    return {
        page: Math.max(1, parseInt(query.page || '1', 10)),
        limit: Math.min(100, Math.max(1, parseInt(query.limit || '20', 10))),
        cursor: query.cursor,
    };
}

// ============================================
// QUERY BUILDERS
// ============================================

/**
 * Build standard ordering options
 */
export function buildOrderBy(
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
    defaultSort = 'createdAt',
    defaultOrder: 'asc' | 'desc' = 'desc'
): Record<string, 'asc' | 'desc'> {
    return {
        [sortBy || defaultSort]: sortOrder || defaultOrder,
    };
}

/**
 * Build search filter for multiple fields
 */
export function buildSearchFilter(
    search?: string,
    fields: string[] = ['name', 'title']
): object | undefined {
    if (!search || search.trim().length === 0) return undefined;

    const searchTerm = search.trim().toLowerCase();
    return {
        OR: fields.map((field) => ({
            [field]: {
                contains: searchTerm,
                mode: 'insensitive',
            },
        })),
    };
}

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Process items in batches to avoid memory issues
 */
export async function processBatch<T, R>(
    items: T[],
    batchSize: number,
    processor: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await processor(batch);
        results.push(...batchResults);
    }

    return results;
}

/**
 * Execute operations in parallel with concurrency limit
 */
export async function parallelLimit<T, R>(
    items: T[],
    limit: number,
    processor: (item: T) => Promise<R>
): Promise<R[]> {
    const results: R[] = [];
    const executing: Promise<void>[] = [];

    for (const item of items) {
        const promise = processor(item).then((result) => {
            results.push(result);
        });

        executing.push(promise);

        if (executing.length >= limit) {
            await Promise.race(executing);
            // Remove resolved promises
            executing.splice(
                0,
                executing.findIndex((p) => p === promise) + 1
            );
        }
    }

    await Promise.all(executing);
    return results;
}

// ============================================
// CACHE HELPERS
// ============================================

// Simple in-memory cache with TTL
const cache = new Map<string, { data: unknown; expiresAt: number }>();

/**
 * Get cached value or compute it
 */
export async function cacheGet<T>(
    key: string,
    ttlSeconds: number,
    compute: () => Promise<T>
): Promise<T> {
    const cached = cache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
        return cached.data as T;
    }

    const data = await compute();
    cache.set(key, {
        data,
        expiresAt: Date.now() + ttlSeconds * 1000,
    });

    return data;
}

/**
 * Invalidate cache entries
 */
export function cacheInvalidate(pattern?: string): void {
    if (!pattern) {
        cache.clear();
        return;
    }

    for (const key of cache.keys()) {
        if (key.includes(pattern)) {
            cache.delete(key);
        }
    }
}

// ============================================
// TRANSACTION HELPERS
// ============================================

/**
 * Execute multiple operations in a transaction
 */
export async function transaction<T>(
    operations: ((tx: PrismaClient) => Promise<T>)[]
): Promise<T[]> {
    return prisma.$transaction(
        operations.map((op) => op(prisma)),
        {
            maxWait: 5000, // 5s max wait for transaction slot
            timeout: 10000, // 10s max transaction duration
        }
    );
}

// ============================================
// EXPORTS
// ============================================

export default {
    prisma,
    createPagination,
    createCursorPagination,
    parsePaginationParams,
    buildOrderBy,
    buildSearchFilter,
    processBatch,
    parallelLimit,
    cacheGet,
    cacheInvalidate,
    transaction,
};
