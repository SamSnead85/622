"use strict";

/**
 * SIGNED URL SERVICE
 * Generate and validate signed URLs for media with expiration
 */

import crypto from 'crypto';

const SIGNING_SECRET = process.env.URL_SIGNING_SECRET;
if (!SIGNING_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('URL_SIGNING_SECRET environment variable is required in production');
}
const signingSecret = SIGNING_SECRET || 'dev-fallback-key-not-for-production';

// ============================================
// SIGNED URL GENERATION
// ============================================

export interface SignedUrlOptions {
    expiresIn?: number;  // Seconds until expiration (default: 1 hour)
    userId?: string;     // Optional: restrict to specific user
}

/**
 * Generate a signed URL for a media resource
 */
export function signMediaUrl(baseUrl: string, options: SignedUrlOptions = {}): string {
    const { expiresIn = 3600, userId } = options;

    // Calculate expiration timestamp
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

    // Build URL with query params
    const url = new URL(baseUrl);
    url.searchParams.set('expires', expiresAt.toString());

    if (userId) {
        url.searchParams.set('uid', userId);
    }

    // Generate signature
    const dataToSign = `${url.pathname}${url.search}`;
    const signature = generateSignature(dataToSign);

    url.searchParams.set('sig', signature);

    return url.toString();
}

/**
 * Validate a signed URL
 */
export function validateSignedUrl(url: string, currentUserId?: string): { valid: boolean; error?: string } {
    try {
        const parsedUrl = new URL(url);

        const expires = parsedUrl.searchParams.get('expires');
        const signature = parsedUrl.searchParams.get('sig');
        const userId = parsedUrl.searchParams.get('uid');

        if (!expires || !signature) {
            return { valid: false, error: 'Missing signature or expiration' };
        }

        // Check expiration
        const expiresAt = parseInt(expires, 10);
        if (Date.now() / 1000 > expiresAt) {
            return { valid: false, error: 'URL has expired' };
        }

        // Check user restriction
        if (userId && currentUserId && userId !== currentUserId) {
            return { valid: false, error: 'URL not authorized for this user' };
        }

        // Verify signature
        parsedUrl.searchParams.delete('sig');
        const dataToSign = `${parsedUrl.pathname}${parsedUrl.search}`;
        const expectedSignature = generateSignature(dataToSign);

        if (!timingSafeEqual(signature, expectedSignature)) {
            return { valid: false, error: 'Invalid signature' };
        }

        return { valid: true };
    } catch {
        return { valid: false, error: 'Invalid URL format' };
    }
}

/**
 * Generate HMAC-SHA256 signature
 */
function generateSignature(data: string): string {
    return crypto
        .createHmac('sha256', signingSecret)
        .update(data)
        .digest('base64url');
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }

    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    return crypto.timingSafeEqual(bufA, bufB);
}

// ============================================
// S3 SIGNED URLS (for direct uploads)
// ============================================

/**
 * Generate a pre-signed URL for S3 upload (if using AWS S3)
 * This is a placeholder - implement based on your cloud storage provider
 */
export async function generateUploadUrl(
    filename: string,
    contentType: string,
    userId: string
): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
    // For now, return a placeholder structure
    // In production, use AWS SDK or your cloud provider's SDK

    const key = `uploads/${userId}/${Date.now()}-${filename}`;
    const publicUrl = `${process.env.CDN_URL || 'https://cdn.example.com'}/${key}`;

    // Sign the public URL for access
    const signedPublicUrl = signMediaUrl(publicUrl, {
        expiresIn: 86400, // 24 hours for uploaded content
        userId,
    });

    return {
        uploadUrl: `${process.env.STORAGE_URL || 'https://storage.example.com'}/upload?key=${encodeURIComponent(key)}`,
        publicUrl: signedPublicUrl,
        key,
    };
}

// ============================================
// MIDDLEWARE
// ============================================

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';

/**
 * Middleware to validate signed media URLs
 */
export function validateSignedMediaUrl(req: AuthRequest, res: Response, next: NextFunction): void {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
        res.status(400).json({ error: 'Missing URL parameter' });
        return;
    }

    const result = validateSignedUrl(url, req.userId);

    if (!result.valid) {
        res.status(403).json({ error: result.error });
        return;
    }

    next();
}
