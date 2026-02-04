/**
 * Security Utilities
 * Production-grade security helpers for content sanitization and protection
 */

import crypto from 'crypto';

// ============================================
// INPUT SANITIZATION
// ============================================

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * Strip all HTML tags from string
 */
export function stripHtml(input: string): string {
    return input.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFilename(filename: string): string {
    return filename
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/\.{2,}/g, '.')
        .replace(/^\./, '_');
}

/**
 * Validate and sanitize URL
 */
export function sanitizeUrl(url: string): string | null {
    try {
        const parsed = new URL(url);
        // Only allow http/https protocols
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return null;
        }
        return parsed.toString();
    } catch {
        return null;
    }
}

// ============================================
// HASHING
// ============================================

/**
 * Hash a string with SHA-256
 */
export function hashString(input: string, salt?: string): string {
    const data = salt ? `${salt}:${input}` : input;
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate a random token
 */
export function generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a secure random password
 */
export function generateSecurePassword(length: number = 16): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    const bytes = crypto.randomBytes(length);
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars[bytes[i] % chars.length];
    }
    return password;
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
        errors.push('Password must be at least 8 characters');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain a lowercase letter');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain an uppercase letter');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain a number');
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Validate username format
 */
export function isValidUsername(username: string): boolean {
    return /^[a-zA-Z0-9_]{3,30}$/.test(username);
}

// ============================================
// CSRF PROTECTION
// ============================================

const csrfTokens = new Map<string, { token: string; expiresAt: number }>();

/**
 * Generate CSRF token for a session
 */
export function generateCsrfToken(sessionId: string): string {
    const token = generateToken(32);
    csrfTokens.set(sessionId, {
        token,
        expiresAt: Date.now() + 3600000, // 1 hour
    });
    return token;
}

/**
 * Validate CSRF token
 */
export function validateCsrfToken(sessionId: string, token: string): boolean {
    const stored = csrfTokens.get(sessionId);
    if (!stored || Date.now() > stored.expiresAt) {
        csrfTokens.delete(sessionId);
        return false;
    }
    return stored.token === token;
}

// ============================================
// REQUEST SIGNING
// ============================================

/**
 * Sign a request payload
 */
export function signPayload(payload: object, secret: string): string {
    const data = JSON.stringify(payload);
    const signature = crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('hex');
    return signature;
}

/**
 * Verify a signed request
 */
export function verifySignature(payload: object, signature: string, secret: string): boolean {
    const expectedSignature = signPayload(payload, secret);
    // Use timing-safe comparison to prevent timing attacks
    try {
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    } catch {
        return false;
    }
}

// ============================================
// IP UTILITIES
// ============================================

/**
 * Get client IP from request, handling proxies
 */
export function getClientIp(req: {
    headers: Record<string, string | string[] | undefined>;
    ip?: string;
    connection?: { remoteAddress?: string };
}): string {
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (typeof xForwardedFor === 'string') {
        return xForwardedFor.split(',')[0].trim();
    }
    if (Array.isArray(xForwardedFor)) {
        return xForwardedFor[0];
    }
    return req.ip || req.connection?.remoteAddress || 'unknown';
}

/**
 * Check if IP is in a blocklist
 */
export function isBlockedIp(ip: string, blocklist: Set<string>): boolean {
    return blocklist.has(ip);
}

// ============================================
// EXPORTS
// ============================================

export default {
    sanitizeHtml,
    stripHtml,
    sanitizeFilename,
    sanitizeUrl,
    hashString,
    generateToken,
    generateSecurePassword,
    isValidEmail,
    validatePassword,
    isValidUsername,
    generateCsrfToken,
    validateCsrfToken,
    signPayload,
    verifySignature,
    getClientIp,
    isBlockedIp,
};
