/**
 * Performance Monitoring Utilities
 * Track and log performance metrics for optimization
 */

import { logger } from './logger.js';

// ============================================
// PERFORMANCE TIMER
// ============================================

export interface PerformanceMetric {
    name: string;
    duration: number;
    timestamp: number;
    metadata?: Record<string, unknown>;
}

const metrics: PerformanceMetric[] = [];
const MAX_METRICS = 1000;

/**
 * Create a performance timer
 */
export function createTimer(name: string) {
    const start = performance.now();

    return {
        end: (metadata?: Record<string, unknown>): number => {
            const duration = performance.now() - start;

            const metric: PerformanceMetric = {
                name,
                duration,
                timestamp: Date.now(),
                metadata,
            };

            metrics.push(metric);

            // Keep only recent metrics
            if (metrics.length > MAX_METRICS) {
                metrics.shift();
            }

            // Log slow operations in development
            if (process.env.NODE_ENV === 'development' && duration > 100) {
                logger.warn(`[Performance] Slow operation: ${name} took ${duration.toFixed(2)}ms`, metadata);
            }

            return duration;
        },
    };
}

/**
 * Measure async function execution time
 */
export async function measure<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
): Promise<{ result: T; duration: number }> {
    const timer = createTimer(name);
    const result = await fn();
    const duration = timer.end(metadata);
    return { result, duration };
}

/**
 * Get recent metrics
 */
export function getMetrics(filter?: { name?: string; since?: number }): PerformanceMetric[] {
    return metrics.filter((m) => {
        if (filter?.name && !m.name.includes(filter.name)) return false;
        if (filter?.since && m.timestamp < filter.since) return false;
        return true;
    });
}

/**
 * Get metrics summary
 */
export function getMetricsSummary(name?: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p95: number;
} {
    const filtered = name
        ? metrics.filter((m) => m.name.includes(name))
        : metrics;

    if (filtered.length === 0) {
        return { count: 0, avg: 0, min: 0, max: 0, p95: 0 };
    }

    const durations = filtered.map((m) => m.duration).sort((a, b) => a - b);
    const sum = durations.reduce((a, b) => a + b, 0);

    return {
        count: durations.length,
        avg: sum / durations.length,
        min: durations[0],
        max: durations[durations.length - 1],
        p95: durations[Math.floor(durations.length * 0.95)],
    };
}

// ============================================
// ERROR TRACKING
// ============================================

interface ErrorEntry {
    message: string;
    stack?: string;
    context?: Record<string, unknown>;
    timestamp: number;
    count: number;
}

const errors = new Map<string, ErrorEntry>();
const MAX_ERRORS = 100;

/**
 * Track an error
 */
export function trackError(
    error: Error,
    context?: Record<string, unknown>
): void {
    const key = `${error.name}:${error.message}`;

    const existing = errors.get(key);
    if (existing) {
        existing.count++;
        existing.timestamp = Date.now();
    } else {
        if (errors.size >= MAX_ERRORS) {
            // Remove oldest error
            const oldestKey = errors.keys().next().value;
            if (oldestKey) errors.delete(oldestKey);
        }

        errors.set(key, {
            message: error.message,
            stack: error.stack,
            context,
            timestamp: Date.now(),
            count: 1,
        });
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
        logger.error('[Error Tracked]', error.message, context);
    }
}

/**
 * Get tracked errors
 */
export function getErrors(): ErrorEntry[] {
    return Array.from(errors.values()).sort((a, b) => b.timestamp - a.timestamp);
}

// ============================================
// HEALTH CHECK
// ============================================

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    memory: {
        used: number;
        total: number;
        percentage: number;
    };
    metrics: {
        avgResponseTime: number;
        errorCount: number;
    };
}

const startTime = Date.now();

/**
 * Get server health status
 */
export function getHealthStatus(): HealthStatus {
    const memUsage = process.memoryUsage();
    const summary = getMetricsSummary();
    const errorCount = Array.from(errors.values()).reduce((sum, e) => sum + e.count, 0);

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (summary.avg > 500 || errorCount > 50) status = 'degraded';
    if (summary.avg > 2000 || errorCount > 200) status = 'unhealthy';

    return {
        status,
        uptime: Date.now() - startTime,
        memory: {
            used: memUsage.heapUsed,
            total: memUsage.heapTotal,
            percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
        },
        metrics: {
            avgResponseTime: summary.avg,
            errorCount,
        },
    };
}

// ============================================
// EXPRESS MIDDLEWARE
// ============================================

import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to track request performance
 */
export function performanceMiddleware(req: Request, res: Response, next: NextFunction) {
    const timer = createTimer(`${req.method} ${req.path}`);

    res.on('finish', () => {
        timer.end({
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
        });
    });

    next();
}

/**
 * Health check endpoint handler
 */
export function healthCheckHandler(req: Request, res: Response) {
    const health = getHealthStatus();
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json(health);
}

// ============================================
// EXPORTS
// ============================================

export default {
    createTimer,
    measure,
    getMetrics,
    getMetricsSummary,
    trackError,
    getErrors,
    getHealthStatus,
    performanceMiddleware,
    healthCheckHandler,
};
