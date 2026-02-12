/**
 * EVASION DETECTION SERVICE
 * Detects ban-evading re-signups by correlating device fingerprints, email domains,
 * IP subnets, and signup timing against known banned accounts.
 *
 * When a match is found, the new account is silently shadow-banned rather than
 * rejected — this wastes the attacker's time without teaching them to evade.
 */

import { PrismaClient } from '@prisma/client';
import { cache } from './cache/RedisCache.js';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

// Known disposable email domains (auto-flagged on signup)
const DISPOSABLE_EMAIL_DOMAINS = new Set([
    'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
    'yopmail.com', 'tempail.com', 'fakeinbox.com', 'sharklasers.com',
    'guerrillamailblock.com', 'grr.la', 'dispostable.com', 'trashmail.com',
    'temp-mail.org', 'emailondeck.com', 'getnada.com', 'mohmal.com',
    'maildrop.cc', 'harakirimail.com', 'tempinbox.com', 'burnermail.io',
    'mailnesia.com', 'tempmailaddress.com', 'crazymailing.com',
    '10minutemail.com', 'minutemail.com', 'tempmailo.com',
]);

export interface EvasionCheckResult {
    evasionDetected: boolean;
    confidence: 'low' | 'medium' | 'high';
    signals: string[];
    shouldShadowBan: boolean;
}

/**
 * Run all evasion correlation checks on a new signup.
 * Returns whether the account should be shadow-banned.
 */
export async function checkForEvasion(params: {
    fingerprint: string;
    email: string;
    ip: string;
}): Promise<EvasionCheckResult> {
    const signals: string[] = [];

    // 1. Check fingerprint against banned fingerprints
    const fpMatch = await checkBannedFingerprint(params.fingerprint);
    if (fpMatch) {
        signals.push(`Device fingerprint matches banned user (${fpMatch.bannedUserId || 'unknown'})`);
    }

    // 2. Check email domain against banned domains
    const emailDomain = params.email.split('@')[1]?.toLowerCase();
    const domainMatch = await checkBannedEmailDomain(emailDomain);
    if (domainMatch) {
        signals.push(`Email domain "${emailDomain}" is flagged (${domainMatch.hitCount} banned accounts)`);
    }

    // 3. Check for disposable email
    if (emailDomain && DISPOSABLE_EMAIL_DOMAINS.has(emailDomain)) {
        signals.push(`Disposable email domain: ${emailDomain}`);
    }

    // 4. Check IP subnet against recent bans
    const subnetMatch = await checkIPSubnet(params.ip);
    if (subnetMatch) {
        signals.push(`IP subnet matches recently banned account (${subnetMatch})`);
    }

    // 5. Check signup timing correlation (new account within 30 min of a ban from similar IP)
    const timingMatch = await checkTimingCorrelation(params.ip);
    if (timingMatch) {
        signals.push('Account created shortly after a ban from similar IP range');
    }

    // Determine confidence and action
    const signalCount = signals.length;
    let confidence: 'low' | 'medium' | 'high' = 'low';
    let shouldShadowBan = false;

    if (signalCount >= 3) {
        confidence = 'high';
        shouldShadowBan = true;
    } else if (signalCount === 2) {
        confidence = 'medium';
        shouldShadowBan = true;
    } else if (signalCount === 1) {
        confidence = 'low';
        // Single signal: flag but don't shadow-ban (could be false positive)
        shouldShadowBan = false;
    }

    if (signals.length > 0) {
        logger.warn(`[Evasion] Signals detected for ${params.email}: ${signals.join('; ')} (confidence: ${confidence})`);
    }

    return {
        evasionDetected: signals.length > 0,
        confidence,
        signals,
        shouldShadowBan,
    };
}

/**
 * Check if a device fingerprint matches a banned fingerprint
 */
async function checkBannedFingerprint(fingerprint: string): Promise<{ bannedUserId: string | null } | null> {
    try {
        const match = await prisma.bannedFingerprint.findUnique({
            where: { fingerprint },
        });
        return match ? { bannedUserId: match.bannedUserId } : null;
    } catch {
        return null;
    }
}

/**
 * Check if an email domain is in the banned domains list
 */
async function checkBannedEmailDomain(domain: string): Promise<{ hitCount: number } | null> {
    if (!domain) return null;
    try {
        const match = await prisma.bannedEmailDomain.findUnique({
            where: { domain },
        });
        return match ? { hitCount: match.hitCount } : null;
    } catch {
        return null;
    }
}

/**
 * Check if the IP's /24 subnet matches any recently banned user's IP
 */
async function checkIPSubnet(ip: string): Promise<string | null> {
    try {
        // Extract /24 subnet (first 3 octets)
        const parts = ip.split('.');
        if (parts.length !== 4) return null;
        const subnet = `${parts[0]}.${parts[1]}.${parts[2]}`;

        // Check Redis for recent bans from this subnet
        const key = `evasion:subnet:${subnet}`;
        const recentBan = await cache.get<string>(key);
        return recentBan || null;
    } catch {
        return null;
    }
}

/**
 * Check if there was a recent ban from a similar IP range (timing correlation)
 */
async function checkTimingCorrelation(ip: string): Promise<boolean> {
    try {
        const parts = ip.split('.');
        if (parts.length !== 4) return false;
        const subnet = `${parts[0]}.${parts[1]}.${parts[2]}`;

        const key = `evasion:recent_ban:${subnet}`;
        const recentBan = await cache.get<string>(key);
        return !!recentBan;
    } catch {
        return false;
    }
}

// ============================================
// BAN RECORDING — call these when banning a user
// ============================================

/**
 * Record a user's fingerprint and email domain when they are banned.
 * This populates the evasion detection database for future signups.
 */
export async function recordBan(userId: string, ip: string): Promise<void> {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, deviceFingerprint: true },
        });

        if (!user) return;

        // 1. Store banned fingerprint
        if (user.deviceFingerprint) {
            await prisma.bannedFingerprint.upsert({
                where: { fingerprint: user.deviceFingerprint },
                create: {
                    fingerprint: user.deviceFingerprint,
                    bannedUserId: userId,
                    reason: 'Account banned',
                },
                update: {
                    bannedUserId: userId,
                },
            }).catch(() => {});
        }

        // 2. Track email domain
        const emailDomain = user.email.split('@')[1]?.toLowerCase();
        if (emailDomain) {
            await prisma.bannedEmailDomain.upsert({
                where: { domain: emailDomain },
                create: {
                    domain: emailDomain,
                    reason: 'Used by banned account',
                    hitCount: 1,
                    autoBlocked: false,
                },
                update: {
                    hitCount: { increment: 1 },
                },
            }).catch(() => {});

            // Auto-block domain if 5+ banned accounts used it
            const domainRecord = await prisma.bannedEmailDomain.findUnique({
                where: { domain: emailDomain },
            });
            if (domainRecord && domainRecord.hitCount >= 5 && !domainRecord.autoBlocked) {
                await prisma.bannedEmailDomain.update({
                    where: { domain: emailDomain },
                    data: { autoBlocked: true, reason: 'Auto-blocked: 5+ banned accounts' },
                }).catch(() => {});
                logger.warn(`[Evasion] Auto-blocked email domain: ${emailDomain} (${domainRecord.hitCount} banned accounts)`);
            }
        }

        // 3. Record IP subnet for timing correlation (expires in 30 minutes)
        const parts = ip.split('.');
        if (parts.length === 4) {
            const subnet = `${parts[0]}.${parts[1]}.${parts[2]}`;
            await cache.set(`evasion:subnet:${subnet}`, userId, 30 * 24 * 3600); // 30 days
            await cache.set(`evasion:recent_ban:${subnet}`, userId, 1800); // 30 minutes for timing
        }

        logger.info(`[Evasion] Recorded ban signals for user ${userId}`);
    } catch (error) {
        logger.error('[Evasion] Failed to record ban:', error);
    }
}

export default {
    checkForEvasion,
    recordBan,
};
