/**
 * TRUST SERVICE
 * Progressive trust system — new accounts have limited capabilities that unlock over time.
 * This is the primary defense against the "UpScrolled scenario" where bots flood the platform.
 *
 * Trust Levels:
 *   0 = New       — Can browse, follow (10 max), like. Cannot post, message, or comment.
 *   1 = Verified  — Email verified. Can post (held for review), comment, message followers. Follow limit 50.
 *   2 = Established — 7+ days, 3+ approved posts, 0 strikes. Posts go live immediately. Follow limit 500.
 *   3 = Trusted   — 30+ days, 10+ approved posts. Full capabilities. Reports carry more weight.
 */

import { prisma } from '../db/client.js';
import { logger } from '../utils/logger.js';
import { allocateInvites } from './trustChainService.js';

// ============================================
// TRUST LEVEL CAPABILITIES
// ============================================

export interface TrustCapabilities {
    canPost: boolean;
    canComment: boolean;
    canMessage: boolean;
    canGoLive: boolean;
    canCreateCommunity: boolean;
    postsRequireReview: boolean;
    maxFollows: number;
    maxPostsPerDay: number;
    maxMessagesPerDay: number;
    reportWeight: number; // How much weight this user's reports carry (1-3)
}

const TRUST_CAPABILITIES: Record<number, TrustCapabilities> = {
    0: {
        canPost: false,
        canComment: false,
        canMessage: false,
        canGoLive: false,
        canCreateCommunity: false,
        postsRequireReview: true,
        maxFollows: 10,
        maxPostsPerDay: 0,
        maxMessagesPerDay: 0,
        reportWeight: 0,
    },
    1: {
        canPost: true,
        canComment: true,
        canMessage: true,
        canGoLive: false,
        canCreateCommunity: false,
        postsRequireReview: true, // First 5 posts held for review
        maxFollows: 50,
        maxPostsPerDay: 5,
        maxMessagesPerDay: 20,
        reportWeight: 1,
    },
    2: {
        canPost: true,
        canComment: true,
        canMessage: true,
        canGoLive: true,
        canCreateCommunity: true,
        postsRequireReview: false,
        maxFollows: 500,
        maxPostsPerDay: 50,
        maxMessagesPerDay: 200,
        reportWeight: 2,
    },
    3: {
        canPost: true,
        canComment: true,
        canMessage: true,
        canGoLive: true,
        canCreateCommunity: true,
        postsRequireReview: false,
        maxFollows: 10000,
        maxPostsPerDay: 100,
        maxMessagesPerDay: 1000,
        reportWeight: 3,
    },
};

/**
 * Get capabilities for a given trust level
 */
export function getTrustCapabilities(trustLevel: number): TrustCapabilities {
    return TRUST_CAPABILITIES[Math.min(Math.max(trustLevel, 0), 3)] || TRUST_CAPABILITIES[0];
}

/**
 * Check if a user can perform a specific action based on their trust level
 */
export async function checkTrustAction(
    userId: string,
    action: 'post' | 'comment' | 'message' | 'follow' | 'go_live' | 'create_community'
): Promise<{ allowed: boolean; reason?: string; trustLevel: number }> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { trustLevel: true, emailVerified: true, isBanned: true, isShadowBanned: true },
    });

    if (!user) {
        return { allowed: false, reason: 'User not found', trustLevel: 0 };
    }

    if (user.isBanned) {
        return { allowed: false, reason: 'Account suspended', trustLevel: user.trustLevel };
    }

    const caps = getTrustCapabilities(user.trustLevel);

    switch (action) {
        case 'post':
            if (!caps.canPost) {
                return {
                    allowed: false,
                    reason: 'New accounts need to verify their email before posting. This helps keep our community safe.',
                    trustLevel: user.trustLevel,
                };
            }
            break;
        case 'comment':
            if (!caps.canComment) {
                return {
                    allowed: false,
                    reason: 'Please verify your email to comment.',
                    trustLevel: user.trustLevel,
                };
            }
            break;
        case 'message':
            if (!caps.canMessage) {
                return {
                    allowed: false,
                    reason: 'Please verify your email to send messages.',
                    trustLevel: user.trustLevel,
                };
            }
            break;
        case 'follow':
            // Check follow count against limit
            const followCount = await prisma.follow.count({ where: { followerId: userId } });
            if (followCount >= caps.maxFollows) {
                return {
                    allowed: false,
                    reason: `You can follow up to ${caps.maxFollows} people at your current trust level. Keep using the platform to unlock more.`,
                    trustLevel: user.trustLevel,
                };
            }
            break;
        case 'go_live':
            if (!caps.canGoLive) {
                return {
                    allowed: false,
                    reason: 'Live streaming is available after your account is established (7+ days with good standing).',
                    trustLevel: user.trustLevel,
                };
            }
            break;
        case 'create_community':
            if (!caps.canCreateCommunity) {
                return {
                    allowed: false,
                    reason: 'Community creation is available after your account is established.',
                    trustLevel: user.trustLevel,
                };
            }
            break;
    }

    return { allowed: true, trustLevel: user.trustLevel };
}

/**
 * Evaluate if a user qualifies for promotion to the next trust level.
 * Call this periodically or after significant actions (post approved, time passes, etc.)
 */
export async function evaluatePromotion(userId: string): Promise<{
    promoted: boolean;
    oldLevel: number;
    newLevel: number;
}> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            trustLevel: true,
            emailVerified: true,
            createdAt: true,
            strikeCount: true,
            isBanned: true,
            isShadowBanned: true,
        },
    });

    if (!user || user.isBanned || user.isShadowBanned) {
        return { promoted: false, oldLevel: user?.trustLevel ?? 0, newLevel: user?.trustLevel ?? 0 };
    }

    const oldLevel = user.trustLevel;
    let newLevel = oldLevel;

    const accountAgeDays = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);

    // Count approved (visible) posts
    const approvedPostCount = await prisma.post.count({
        where: { userId, visible: true, deletedAt: null },
    });

    // Level 0 -> 1: Email verified
    if (oldLevel === 0 && user.emailVerified) {
        newLevel = 1;
    }

    // Level 1 -> 2: 7+ days, 3+ approved posts, 0 strikes
    if (oldLevel === 1 && accountAgeDays >= 7 && approvedPostCount >= 3 && user.strikeCount === 0) {
        newLevel = 2;
    }

    // Level 2 -> 3: 30+ days, 10+ approved posts, 0 strikes
    if (oldLevel === 2 && accountAgeDays >= 30 && approvedPostCount >= 10 && user.strikeCount === 0) {
        newLevel = 3;
    }

    if (newLevel > oldLevel) {
        await prisma.user.update({
            where: { id: userId },
            data: { trustLevel: newLevel },
        });

        logger.info(`[Trust] User ${userId} promoted from level ${oldLevel} to ${newLevel}`);

        // ── Vouched Entry: Unlock/upgrade invite allocation on promotion ──
        try {
            await allocateInvites(userId, newLevel);
        } catch (err) {
            logger.warn('[Trust] Invite allocation update failed (non-blocking):', err);
        }

        // Send notification about trust level upgrade
        const levelNames = ['New', 'Verified', 'Established', 'Trusted'];
        const inviteMessage = newLevel === 1
            ? ' You can now vouch for others to join 0G.'
            : newLevel >= 2
                ? ' Your weekly vouch allocation has increased.'
                : '';
        await prisma.notification.create({
            data: {
                userId,
                type: 'SYSTEM',
                message: `Your account has been upgraded to "${levelNames[newLevel]}" status! You now have access to more features.${inviteMessage}`,
            },
        }).catch(() => { /* intentionally swallowed: trust upgrade notification is best-effort */ });

        return { promoted: true, oldLevel, newLevel };
    }

    return { promoted: false, oldLevel, newLevel: oldLevel };
}

/**
 * Demote a user's trust level (on violation)
 */
export async function demoteTrust(userId: string, reason: string): Promise<void> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { trustLevel: true },
    });

    if (!user || user.trustLevel <= 0) return;

    const newLevel = Math.max(0, user.trustLevel - 1);

    await prisma.user.update({
        where: { id: userId },
        data: { trustLevel: newLevel },
    });

    logger.warn(`[Trust] User ${userId} demoted from level ${user.trustLevel} to ${newLevel}: ${reason}`);
}

export default {
    getTrustCapabilities,
    checkTrustAction,
    evaluatePromotion,
    demoteTrust,
};
