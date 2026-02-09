"use strict";

/**
 * SECURITY SERVICE
 * Platform-wide security policies, IP blocking, rate limiting, and audit logging
 */

import { PrismaClient, ThreatLevel, SecurityPolicyType, Prisma } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { getGeoFromIP, isPlatformGeoBlocked } from './geoblock.js';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

// In-memory rate limit store (use Redis in production for multi-instance)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// ============================================
// SECURITY AUDIT LOGGING
// ============================================

export interface AuditLogEntry {
    action: string;
    userId?: string;
    ipAddress: string;
    countryCode?: string;
    userAgent?: string;
    details?: Record<string, unknown>;
    severity?: ThreatLevel;
}

export async function logSecurityEvent(entry: AuditLogEntry) {
    try {
        await prisma.securityAuditLog.create({
            data: {
                action: entry.action,
                userId: entry.userId,
                ipAddress: entry.ipAddress,
                countryCode: entry.countryCode,
                userAgent: entry.userAgent,
                details: (entry.details || {}) as Prisma.InputJsonValue,
                severity: entry.severity || 'LOW',
            },
        });
    } catch (error) {
        logger.error('Failed to log security event:', error);
    }
}

// Common security event types
export const SecurityEvents = {
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILED: 'LOGIN_FAILED',
    SIGNUP_SUCCESS: 'SIGNUP_SUCCESS',
    SIGNUP_FAILED: 'SIGNUP_FAILED',
    GEO_BLOCKED: 'GEO_BLOCKED',
    IP_BLOCKED: 'IP_BLOCKED',
    RATE_LIMITED: 'RATE_LIMITED',
    PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
    PASSWORD_CHANGED: 'PASSWORD_CHANGED',
    SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
    ADMIN_ACTION: 'ADMIN_ACTION',
    DATA_EXPORT: 'DATA_EXPORT',
} as const;

// ============================================
// IP BLOCKING
// ============================================

/**
 * Check if an IP is blocked
 */
export async function isIPBlocked(ip: string): Promise<{
    blocked: boolean;
    reason?: string;
    threatLevel?: ThreatLevel;
}> {
    const block = await prisma.blockedIP.findFirst({
        where: {
            ipAddress: ip,
            OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } },
            ],
        },
    });

    if (block) {
        return {
            blocked: true,
            reason: block.reason || 'IP address is blocked',
            threatLevel: block.threatLevel,
        };
    }

    // TODO: Implement CIDR range matching for IP blocks

    return { blocked: false };
}

/**
 * Block an IP address
 */
export async function blockIP(params: {
    ipAddress: string;
    reason?: string;
    threatLevel?: ThreatLevel;
    source?: string;
    createdById?: string;
    expiresAt?: Date;
}) {
    return prisma.blockedIP.upsert({
        where: { ipAddress: params.ipAddress },
        create: {
            ipAddress: params.ipAddress,
            reason: params.reason,
            threatLevel: params.threatLevel || 'MEDIUM',
            source: params.source || 'manual',
            createdById: params.createdById,
            expiresAt: params.expiresAt,
        },
        update: {
            reason: params.reason,
            threatLevel: params.threatLevel || 'MEDIUM',
            source: params.source,
            expiresAt: params.expiresAt,
        },
    });
}

/**
 * Unblock an IP address
 */
export async function unblockIP(ipAddress: string) {
    return prisma.blockedIP.delete({
        where: { ipAddress },
    });
}

/**
 * List all blocked IPs
 */
export async function listBlockedIPs() {
    return prisma.blockedIP.findMany({
        orderBy: { createdAt: 'desc' },
    });
}

// ============================================
// RATE LIMITING
// ============================================

interface RateLimitConfig {
    maxRequests: number;
    windowMs: number; // Time window in milliseconds
}

const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
    'auth': { maxRequests: 5, windowMs: 60000 }, // 5 per minute for auth
    'api': { maxRequests: 100, windowMs: 60000 }, // 100 per minute for general API
    'post': { maxRequests: 10, windowMs: 60000 }, // 10 posts per minute
};

/**
 * Check and apply rate limit
 */
export function checkRateLimit(
    identifier: string,
    category: string = 'api'
): { allowed: boolean; remaining: number; resetIn: number } {
    const config = DEFAULT_RATE_LIMITS[category] || DEFAULT_RATE_LIMITS.api;
    const key = `${category}:${identifier}`;
    const now = Date.now();

    const record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
        // Start new window
        rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
        return { allowed: true, remaining: config.maxRequests - 1, resetIn: config.windowMs };
    }

    if (record.count >= config.maxRequests) {
        return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
    }

    record.count++;
    rateLimitStore.set(key, record);

    return {
        allowed: true,
        remaining: config.maxRequests - record.count,
        resetIn: record.resetTime - now,
    };
}

// ============================================
// SECURITY POLICIES
// ============================================

/**
 * Get active security policies
 */
export async function getActivePolicies(type?: SecurityPolicyType) {
    return prisma.platformSecurityPolicy.findMany({
        where: {
            isActive: true,
            ...(type ? { type } : {}),
        },
    });
}

/**
 * Update a security policy
 */
export async function updateSecurityPolicy(
    id: string,
    updates: {
        isActive?: boolean;
        config?: Prisma.InputJsonValue;
    }
) {
    return prisma.platformSecurityPolicy.update({
        where: { id },
        data: updates,
    });
}

/**
 * Create default security policies
 */
export async function initializeSecurityPolicies(createdById: string) {
    const defaults = [
        {
            name: 'Rate Limiting',
            type: 'RATE_LIMITING' as SecurityPolicyType,
            description: 'Limit API requests per IP/user to prevent abuse',
            config: { authLimit: 5, apiLimit: 100, postLimit: 10 },
        },
        {
            name: 'Geo-Blocking',
            type: 'GEO_RESTRICTION' as SecurityPolicyType,
            description: 'Block access from high-risk countries',
            config: { blockedCountries: [] },
        },
        {
            name: 'Threat Detection',
            type: 'THREAT_DETECTION' as SecurityPolicyType,
            description: 'Detect and block suspicious activity patterns',
            config: { enabled: true, sensitivity: 'medium' },
        },
        {
            name: 'Auth Hardening',
            type: 'AUTH_HARDENING' as SecurityPolicyType,
            description: 'Enhanced authentication security measures',
            config: { maxLoginAttempts: 5, lockoutDuration: 900 },
        },
    ];

    for (const policy of defaults) {
        await prisma.platformSecurityPolicy.upsert({
            where: { name: policy.name },
            create: {
                ...policy,
                createdById,
                isActive: true,
            },
            update: {},
        });
    }
}

// ============================================
// EXPRESS MIDDLEWARE
// ============================================

/**
 * Get real IP from request (handles proxies)
 */
export function getClientIP(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || '0.0.0.0';
}

/**
 * Security middleware - checks IP blocks and geo-blocks
 */
export function securityMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
        const ip = getClientIP(req);
        const userAgent = req.headers['user-agent'] || '';
        const geo = getGeoFromIP(ip);

        // Check IP block
        const ipBlock = await isIPBlocked(ip);
        if (ipBlock.blocked) {
            await logSecurityEvent({
                action: SecurityEvents.IP_BLOCKED,
                ipAddress: ip,
                countryCode: geo.countryCode || undefined,
                userAgent,
                details: { reason: ipBlock.reason },
                severity: ipBlock.threatLevel || 'MEDIUM',
            });

            return res.status(403).json({
                error: 'Access denied',
                message: 'Your IP address has been blocked',
            });
        }

        // Check geo-block (platform level)
        const geoBlock = await isPlatformGeoBlocked(ip);
        if (geoBlock.blocked) {
            await logSecurityEvent({
                action: SecurityEvents.GEO_BLOCKED,
                ipAddress: ip,
                countryCode: geo.countryCode || undefined,
                userAgent,
                details: { reason: geoBlock.reason },
                severity: 'MEDIUM',
            });

            return res.status(403).json({
                error: 'Access denied',
                message: geoBlock.reason || 'Access from your region is restricted',
            });
        }

        // Attach geo info to request for downstream use
        (req as any).clientGeo = geo;
        (req as any).clientIP = ip;

        next();
    };
}

/**
 * Rate limiting middleware
 */
export function rateLimitMiddleware(category: string = 'api') {
    return (req: Request, res: Response, next: NextFunction) => {
        const ip = getClientIP(req);
        const result = checkRateLimit(ip, category);

        res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
        res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetIn / 1000).toString());

        if (!result.allowed) {
            const geo = getGeoFromIP(ip);

            logSecurityEvent({
                action: SecurityEvents.RATE_LIMITED,
                ipAddress: ip,
                countryCode: geo.countryCode || undefined,
                userAgent: req.headers['user-agent'] || '',
                details: { category },
                severity: 'LOW',
            });

            return res.status(429).json({
                error: 'Too many requests',
                message: `Rate limit exceeded. Try again in ${Math.ceil(result.resetIn / 1000)} seconds`,
                retryAfter: Math.ceil(result.resetIn / 1000),
            });
        }

        next();
    };
}

export default {
    logSecurityEvent,
    SecurityEvents,
    isIPBlocked,
    blockIP,
    unblockIP,
    listBlockedIPs,
    checkRateLimit,
    getActivePolicies,
    updateSecurityPolicy,
    initializeSecurityPolicies,
    getClientIP,
    securityMiddleware,
    rateLimitMiddleware,
};
