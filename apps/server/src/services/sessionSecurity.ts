"use strict";

/**
 * SESSION SECURITY SERVICE
 * Device fingerprinting, location tracking, and anomaly detection
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { Request } from 'express';
import { logSecurityEvent, SecurityEvents } from './security.js';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

// ============================================
// SESSION FINGERPRINTING
// ============================================

export interface DeviceFingerprint {
    hash: string;
    userAgent: string;
    acceptLanguage: string;
    screenResolution?: string;
    timezone?: string;
}

/**
 * Generate a device fingerprint from request headers
 */
export function generateFingerprint(req: Request): DeviceFingerprint {
    const userAgent = req.headers['user-agent'] || 'unknown';
    const acceptLanguage = req.headers['accept-language'] || 'unknown';
    const screenResolution = req.headers['x-screen-resolution'] as string | undefined;
    const timezone = req.headers['x-timezone'] as string | undefined;

    // Create a hash of the fingerprint data
    const fingerprintData = [
        userAgent,
        acceptLanguage,
        screenResolution || '',
        timezone || '',
    ].join('|');

    const hash = crypto
        .createHash('sha256')
        .update(fingerprintData)
        .digest('hex')
        .substring(0, 32);

    return {
        hash,
        userAgent,
        acceptLanguage,
        screenResolution,
        timezone,
    };
}

/**
 * Check for fingerprint drift (significant change in device characteristics)
 */
export function detectFingerprintDrift(
    storedHash: string,
    currentFingerprint: DeviceFingerprint
): { drifted: boolean; severity: 'low' | 'medium' | 'high' } {
    // If hashes match exactly, no drift
    if (storedHash === currentFingerprint.hash) {
        return { drifted: false, severity: 'low' };
    }

    // Some drift is normal (browser updates, etc.)
    // Major drift (completely different device) is suspicious
    return { drifted: true, severity: 'medium' };
}

// ============================================
// LOCATION TRACKING
// ============================================

export interface LocationInfo {
    ip: string;
    country?: string;
    city?: string;
    isProxy?: boolean;
    isVPN?: boolean;
}

/**
 * Get location info from IP (uses existing geoblock service)
 */
export async function getLocationFromIP(ip: string): Promise<LocationInfo> {
    try {
        // Import geoblock service for IP lookup
        const { getGeoFromIP } = await import('./geoblock.js');
        const geo = await getGeoFromIP(ip);

        return {
            ip,
            country: geo?.countryCode || undefined,
            city: geo?.city || undefined,
        };
    } catch {
        return { ip };
    }
}

/**
 * Check if login location is suspicious
 */
export async function checkLoginLocation(
    userId: string,
    currentLocation: LocationInfo
): Promise<{ suspicious: boolean; reason?: string }> {
    // Get user's recent login locations
    const recentSessions = await prisma.session.findMany({
        where: {
            userId,
            createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
    });

    if (recentSessions.length === 0) {
        // First login - not suspicious
        return { suspicious: false };
    }

    // Get unique countries from recent sessions
    const recentIPs = recentSessions
        .map(s => s.ipAddress)
        .filter((ip): ip is string => ip !== null);

    // If this is a known IP, not suspicious
    if (recentIPs.includes(currentLocation.ip)) {
        return { suspicious: false };
    }

    // Check if coming from a completely new country
    // This is a simplified check - production would use proper geo lookup
    if (currentLocation.country) {
        // Log the new location event
        await logSecurityEvent({
            action: SecurityEvents.SUSPICIOUS_ACTIVITY,
            userId,
            ipAddress: currentLocation.ip,
            countryCode: currentLocation.country,
            details: {
                type: 'new_login_location',
                country: currentLocation.country,
                city: currentLocation.city,
            },
            severity: 'MEDIUM',
        });

        return {
            suspicious: true,
            reason: `Login from new location: ${currentLocation.city || currentLocation.country}`,
        };
    }

    return { suspicious: false };
}

// ============================================
// FAILED LOGIN TRACKING
// ============================================

// In-memory store for failed logins (use Redis in production)
const failedLoginAttempts = new Map<string, { count: number; lastAttempt: Date; lockedUntil?: Date }>();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes

/**
 * Record a failed login attempt
 */
export function recordFailedLogin(identifier: string): { locked: boolean; remainingAttempts: number; lockoutEnds?: Date } {
    const key = identifier.toLowerCase();
    const now = new Date();

    let record = failedLoginAttempts.get(key);

    if (!record) {
        record = { count: 0, lastAttempt: now };
    }

    // Reset if outside attempt window
    if (now.getTime() - record.lastAttempt.getTime() > ATTEMPT_WINDOW) {
        record = { count: 0, lastAttempt: now };
    }

    // Check if currently locked
    if (record.lockedUntil && record.lockedUntil > now) {
        return {
            locked: true,
            remainingAttempts: 0,
            lockoutEnds: record.lockedUntil,
        };
    }

    // Increment attempts
    record.count++;
    record.lastAttempt = now;

    // Check if should lock
    if (record.count >= MAX_FAILED_ATTEMPTS) {
        record.lockedUntil = new Date(now.getTime() + LOCKOUT_DURATION);
        failedLoginAttempts.set(key, record);

        return {
            locked: true,
            remainingAttempts: 0,
            lockoutEnds: record.lockedUntil,
        };
    }

    failedLoginAttempts.set(key, record);

    return {
        locked: false,
        remainingAttempts: MAX_FAILED_ATTEMPTS - record.count,
    };
}

/**
 * Check if an identifier is locked out
 */
export function isLockedOut(identifier: string): { locked: boolean; lockoutEnds?: Date } {
    const key = identifier.toLowerCase();
    const record = failedLoginAttempts.get(key);

    if (!record || !record.lockedUntil) {
        return { locked: false };
    }

    if (record.lockedUntil > new Date()) {
        return { locked: true, lockoutEnds: record.lockedUntil };
    }

    // Lockout expired - clear it
    record.lockedUntil = undefined;
    record.count = 0;
    failedLoginAttempts.set(key, record);

    return { locked: false };
}

/**
 * Clear failed login record on successful login
 */
export function clearFailedLogins(identifier: string): void {
    failedLoginAttempts.delete(identifier.toLowerCase());
}

// ============================================
// SESSION VALIDATION
// ============================================

/**
 * Validate session with fingerprint check
 */
export async function validateSessionSecurity(
    sessionId: string,
    req: Request
): Promise<{ valid: boolean; riskLevel: 'low' | 'medium' | 'high'; warning?: string }> {
    const session = await prisma.session.findUnique({
        where: { id: sessionId },
    });

    if (!session) {
        return { valid: false, riskLevel: 'high' };
    }

    // Basic validation passed
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let warning: string | undefined;

    // Check IP change
    const currentIP = req.ip || req.socket.remoteAddress;
    if (session.ipAddress && currentIP && session.ipAddress !== currentIP) {
        // IP changed - could be normal (mobile network) or suspicious
        riskLevel = 'medium';
        warning = 'IP address changed during session';

        // Log the event
        await logSecurityEvent({
            action: SecurityEvents.SUSPICIOUS_ACTIVITY,
            userId: session.userId,
            ipAddress: currentIP,
            details: {
                type: 'session_ip_change',
                oldIP: session.ipAddress,
                newIP: currentIP,
                sessionId,
            },
            severity: 'LOW',
        });
    }

    return { valid: true, riskLevel, warning };
}

// ============================================
// SECURITY NOTIFICATIONS
// ============================================

/**
 * Send security alert email to user
 */
export async function sendSecurityAlert(
    userId: string,
    event: string,
    details: Record<string, unknown>
): Promise<void> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, displayName: true },
    });

    if (!user) return;

    try {
        // Import email service - use sendPasswordResetEmail pattern since sendEmail may not exist
        const emailService = await import('./email.js');

        // Fallback to console log if sendSecurityAlertEmail doesn't exist
        if ('sendSecurityAlertEmail' in emailService) {
            await (emailService as { sendSecurityAlertEmail: (email: string, event: string, details: Record<string, unknown>) => Promise<void> })
                .sendSecurityAlertEmail(user.email, event, details);
        } else {
            logger.info(`Security alert for ${user.email}: ${event}`, details);
        }
    } catch (error) {
        logger.error('Failed to send security alert email:', error);
    }
}
