"use strict";

/**
 * FIELD ENCRYPTION SERVICE
 * AES-256-GCM encryption for sensitive data at rest
 */

import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

// ============================================
// CONFIGURATION
// ============================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

// Get encryption key from environment — NEVER fall back to random bytes
function getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;

    if (!key) {
        // In production: hard fail. Data encrypted with a random key is permanently lost on restart.
        if (process.env.NODE_ENV === 'production') {
            throw new AppError(
                'FATAL: ENCRYPTION_KEY is not set. Cannot start in production without a stable encryption key. ' +
                'Generate one with: openssl rand -hex 32',
                500
            );
        }
        // In development: use a deterministic dev-only key so data survives restarts
        logger.warn('⚠️  ENCRYPTION_KEY not set — using deterministic dev key. NOT SAFE FOR PRODUCTION.');
        return crypto.scryptSync('zerog-dev-key-not-for-production', 'og-dev-salt', 32);
    }

    // If key is hex-encoded (64 hex chars = 32 bytes), decode it directly
    if (/^[0-9a-fA-F]{64}$/.test(key)) {
        return Buffer.from(key, 'hex');
    }

    // Otherwise, derive a 32-byte key from the passphrase using scrypt
    // Use a fixed application-specific salt (not random, so derivation is deterministic)
    return crypto.scryptSync(key, 'og-encryption-key-derivation', 32);
}

const ENCRYPTION_KEY = getEncryptionKey();

// ============================================
// ENCRYPTION
// ============================================

/**
 * Encrypt a plaintext string
 * Returns format: iv:authTag:ciphertext (all hex encoded)
 */
export function encryptField(plaintext: string): string {
    if (!plaintext) return '';

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an encrypted string
 */
export function decryptField(encryptedText: string): string {
    if (!encryptedText) return '';

    try {
        const [ivHex, authTagHex, encrypted] = encryptedText.split(':');

        if (!ivHex || !authTagHex || !encrypted) {
            throw new AppError('Invalid encrypted format', 400);
        }

        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');

        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        logger.error('Decryption failed:', error);
        throw new AppError('Failed to decrypt field', 500);
    }
}

// ============================================
// SEARCHABLE ENCRYPTION
// ============================================

/**
 * Generate a deterministic hash for searchable encryption
 * Use this for fields that need to be searched (e.g., email lookups)
 */
export function hashForSearch(value: string): string {
    if (!value) return '';

    // Use HMAC with a secret to prevent rainbow table attacks
    return crypto
        .createHmac('sha256', ENCRYPTION_KEY)
        .update(value.toLowerCase().trim())
        .digest('hex');
}

/**
 * Encrypt a field with a searchable hash
 * Returns { encrypted: string, searchHash: string }
 */
export function encryptWithSearch(plaintext: string): { encrypted: string; searchHash: string } {
    return {
        encrypted: encryptField(plaintext),
        searchHash: hashForSearch(plaintext),
    };
}

// ============================================
// HASHING (One-way, for passwords & backup codes)
// ============================================

/**
 * Hash a value one-way (cannot be reversed)
 * Use for passwords, backup codes, etc.
 */
export function hashValue(value: string): string {
    return crypto
        .createHash('sha256')
        .update(value)
        .digest('hex');
}

/**
 * Verify a value against a hash
 */
export function verifyHash(value: string, hash: string): boolean {
    const valueHash = hashValue(value);
    return timingSafeCompare(valueHash, hash);
}

/**
 * Timing-safe string comparison
 */
function timingSafeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }

    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// ============================================
// DATA MASKING
// ============================================

/**
 * Mask an email address for display
 * john.doe@example.com -> j***e@e***.com
 */
export function maskEmail(email: string): string {
    if (!email) return '';

    const [localPart, domain] = email.split('@');
    if (!domain) return '***@***.***';

    const [domainName, tld] = domain.split('.');
    if (!tld) return `${maskString(localPart)}@***.***`;

    return `${maskString(localPart)}@${maskString(domainName)}.${tld}`;
}

/**
 * Mask a phone number for display
 * +1234567890 -> +1***890
 */
export function maskPhone(phone: string): string {
    if (!phone) return '';
    if (phone.length < 6) return '***';

    return phone.slice(0, 2) + '***' + phone.slice(-3);
}

/**
 * Mask any string (show first and last char, mask middle)
 */
function maskString(str: string): string {
    if (str.length <= 2) return '***';
    return str[0] + '*'.repeat(Math.min(str.length - 2, 3)) + str[str.length - 1];
}

// ============================================
// KEY ROTATION (Future)
// ============================================

/**
 * Re-encrypt data with a new key
 * Call this during key rotation
 */
export function reencryptField(encryptedText: string, newKey: Buffer): string {
    const decrypted = decryptField(encryptedText);

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, newKey, iv);

    let encrypted = cipher.update(decrypted, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}
