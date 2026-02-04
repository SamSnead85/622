"use strict";

/**
 * TWO-FACTOR AUTHENTICATION SERVICE
 * TOTP-based 2FA with backup codes
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import * as OTPAuth from 'otpauth';

const prisma = new PrismaClient();

// TOTP configuration
const TOTP_CONFIG = {
    issuer: '0G Platform',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
};

/**
 * Generate a new TOTP secret
 */
function generateSecret(): string {
    return crypto.randomBytes(20).toString('base64url');
}

/**
 * Create TOTP instance
 */
function createTOTP(secret: string, email: string): OTPAuth.TOTP {
    return new OTPAuth.TOTP({
        issuer: TOTP_CONFIG.issuer,
        label: email,
        algorithm: TOTP_CONFIG.algorithm,
        digits: TOTP_CONFIG.digits,
        period: TOTP_CONFIG.period,
        secret: OTPAuth.Secret.fromBase32(secret),
    });
}

/**
 * Verify a TOTP code
 */
function verifyCode(secret: string, code: string, email: string): boolean {
    const totp = createTOTP(secret, email);
    const delta = totp.validate({ token: code, window: 1 });
    return delta !== null;
}

// ============================================
// ENCRYPTION HELPERS
// ============================================

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

function encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'utf-8');
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(encryptedText: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'utf-8');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

function hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
}

// ============================================
// 2FA SETUP
// ============================================

export interface TOTPSetupResult {
    secret: string;      // For QR code generation
    otpauthUrl: string;  // For authenticator apps
    qrCodeDataUrl?: string;
}

/**
 * Generate a new TOTP secret for a user
 */
export async function generateTOTPSecret(userId: string): Promise<TOTPSetupResult> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, twoFactorEnabled: true },
    });

    if (!user) {
        throw new Error('User not found');
    }

    if (user.twoFactorEnabled) {
        throw new Error('2FA is already enabled. Disable it first to set up again.');
    }

    // Generate secret
    const secret = generateSecret();

    // Create otpauth URL for QR code
    const totp = createTOTP(secret, user.email);
    const otpauthUrl = totp.toString();

    // Store encrypted secret (not yet verified)
    await prisma.user.update({
        where: { id: userId },
        data: {
            twoFactorSecret: encrypt(secret),
            twoFactorEnabled: false, // Only enabled after verification
        },
    });

    return {
        secret,
        otpauthUrl,
    };
}

/**
 * Verify TOTP code and enable 2FA
 */
export async function verifyAndEnable2FA(userId: string, code: string): Promise<{ success: boolean; backupCodes?: string[] }> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user || !user.twoFactorSecret) {
        throw new Error('2FA setup not started. Generate a secret first.');
    }

    if (user.twoFactorEnabled) {
        throw new Error('2FA is already enabled.');
    }

    const secret = decrypt(user.twoFactorSecret);
    const isValid = verifyCode(secret, code, '');

    if (!isValid) {
        return { success: false };
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes();
    const hashedBackupCodes = backupCodes.map(hashBackupCode);

    // Enable 2FA
    await prisma.user.update({
        where: { id: userId },
        data: {
            twoFactorEnabled: true,
            twoFactorVerifiedAt: new Date(),
            twoFactorBackupCodes: hashedBackupCodes,
        },
    });

    return { success: true, backupCodes };
}

/**
 * Generate 10 backup codes
 */
function generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
        // Format: XXXX-XXXX (8 alphanumeric characters)
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }
    return codes;
}

// ============================================
// 2FA VERIFICATION
// ============================================

/**
 * Verify a TOTP code for login
 */
export async function verifyTOTPCode(userId: string, code: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        throw new Error('2FA is not enabled for this user');
    }

    const secret = decrypt(user.twoFactorSecret);
    return verifyCode(secret, code, user.email);
}

/**
 * Use a backup code (one-time use)
 */
export async function useBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { twoFactorBackupCodes: true, twoFactorEnabled: true },
    });

    if (!user || !user.twoFactorEnabled) {
        throw new Error('2FA is not enabled for this user');
    }

    const normalizedCode = code.toUpperCase().replace(/\s/g, '');
    const hashedCode = hashBackupCode(normalizedCode);

    const codeIndex = user.twoFactorBackupCodes.indexOf(hashedCode);

    if (codeIndex === -1) {
        return false;
    }

    // Remove used code
    const updatedCodes = [...user.twoFactorBackupCodes];
    updatedCodes.splice(codeIndex, 1);

    await prisma.user.update({
        where: { id: userId },
        data: { twoFactorBackupCodes: updatedCodes },
    });

    return true;
}

// ============================================
// 2FA CHALLENGE (LOGIN FLOW)
// ============================================

/**
 * Create a temporary challenge token for 2FA login
 */
export async function createTwoFactorChallenge(userId: string): Promise<string> {
    // Clean up old challenges
    await prisma.twoFactorChallenge.deleteMany({
        where: {
            userId,
            expiresAt: { lt: new Date() },
        },
    });

    // Create new challenge (5 minute expiry)
    const challenge = await prisma.twoFactorChallenge.create({
        data: {
            userId,
            token: crypto.randomBytes(32).toString('hex'),
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
    });

    return challenge.token;
}

/**
 * Verify challenge token and get user ID
 */
export async function verifyTwoFactorChallenge(token: string): Promise<string | null> {
    const challenge = await prisma.twoFactorChallenge.findUnique({
        where: { token },
    });

    if (!challenge || challenge.expiresAt < new Date()) {
        return null;
    }

    // Delete used challenge
    await prisma.twoFactorChallenge.delete({
        where: { id: challenge.id },
    });

    return challenge.userId;
}

// ============================================
// 2FA MANAGEMENT
// ============================================

/**
 * Disable 2FA for a user
 */
export async function disable2FA(userId: string, code: string): Promise<boolean> {
    // Verify with current code first
    const isValid = await verifyTOTPCode(userId, code);

    if (!isValid) {
        return false;
    }

    await prisma.user.update({
        where: { id: userId },
        data: {
            twoFactorEnabled: false,
            twoFactorSecret: null,
            twoFactorBackupCodes: [],
            twoFactorVerifiedAt: null,
        },
    });

    return true;
}

/**
 * Regenerate backup codes
 */
export async function regenerateBackupCodes(userId: string, code: string): Promise<string[] | null> {
    // Verify with current code first
    const isValid = await verifyTOTPCode(userId, code);

    if (!isValid) {
        return null;
    }

    const backupCodes = generateBackupCodes();
    const hashedBackupCodes = backupCodes.map(hashBackupCode);

    await prisma.user.update({
        where: { id: userId },
        data: { twoFactorBackupCodes: hashedBackupCodes },
    });

    return backupCodes;
}

/**
 * Check if user has 2FA enabled
 */
export async function is2FAEnabled(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { twoFactorEnabled: true },
    });

    return user?.twoFactorEnabled ?? false;
}

/**
 * Get remaining backup codes count
 */
export async function getBackupCodesCount(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { twoFactorBackupCodes: true },
    });

    return user?.twoFactorBackupCodes?.length ?? 0;
}
