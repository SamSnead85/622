/**
 * TRUST CHAIN SERVICE
 * Vouched Entry System — every user is traceable back to a founding creator
 * through a chain of vouches. This service manages:
 *   - Chain info queries (degree, founding creator)
 *   - Vouch generation with weekly limits
 *   - Reputation bonding (strike propagation to inviter)
 *   - Rally application processing
 *   - Access request management
 */

import { prisma } from '../db/client.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

// ============================================
// CONSTANTS
// ============================================

/** Base weekly vouch allocation by degree (unlocked at trust level 1) */
const BASE_ALLOCATION_BY_DEGREE: Record<number, number> = {
    0: 0,   // Founding creators use Rally pages, not direct vouches
    1: 3,   // Degree 1: 3 vouches/week
    2: 2,   // Degree 2: 2 vouches/week
    3: 2,   // Degree 3+: 2 vouches/week
};

/** Bonus invites granted on trust level promotion */
const TRUST_LEVEL_BONUS: Record<number, number> = {
    1: 0,   // Level 1 = base allocation unlocked (no bonus)
    2: 2,   // Level 2 = +2 bonus/week
    3: 3,   // Level 3 = +3 bonus/week
};

/** Vouch strike threshold for allocation reduction */
const VOUCH_STRIKE_THRESHOLD = 3;

/** How much to reduce allocation when threshold is hit (halved) */
const VOUCH_STRIKE_PENALTY_DIVISOR = 2;

// ============================================
// CHAIN INFO
// ============================================

/**
 * Get a user's trust chain info including founding creator details.
 */
export async function getChainInfo(userId: string) {
    const chain = await prisma.inviteChain.findUnique({
        where: { userId },
        include: {
            foundingCreator: {
                select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                    isVerified: true,
                },
            },
            invitedBy: {
                select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                },
            },
        },
    });

    if (!chain) return null;

    // Auto-reset weekly counter if needed
    await maybeResetWeeklyCounter(chain.id, chain.weekResetAt);

    // Re-fetch after potential reset
    const updated = await prisma.inviteChain.findUnique({ where: { userId } });

    return {
        degree: chain.degree,
        foundingCreator: chain.foundingCreator,
        invitedBy: chain.invitedBy,
        weeklyAllocation: updated?.weeklyAllocation ?? chain.weeklyAllocation,
        invitesUsedThisWeek: updated?.invitesUsedThisWeek ?? chain.invitesUsedThisWeek,
        invitesRemaining: Math.max(0, (updated?.weeklyAllocation ?? 0) - (updated?.invitesUsedThisWeek ?? 0)),
        totalInvitesSent: updated?.totalInvitesSent ?? chain.totalInvitesSent,
        isUnlocked: updated?.isUnlocked ?? chain.isUnlocked,
    };
}

/**
 * Compute the degree of separation between two users.
 * Both users trace back to their founding creator; if they share one,
 * the degree is the sum of their distances.
 */
export async function getDegreesFromUser(userAId: string, userBId: string): Promise<number | null> {
    const [chainA, chainB] = await Promise.all([
        prisma.inviteChain.findUnique({ where: { userId: userAId } }),
        prisma.inviteChain.findUnique({ where: { userId: userBId } }),
    ]);

    if (!chainA || !chainB) return null;

    // If they share the same founding creator, degree = sum of their degrees
    if (chainA.foundingCreatorId === chainB.foundingCreatorId) {
        return chainA.degree + chainB.degree;
    }

    // Different founding creators — no direct chain connection
    return null;
}

// ============================================
// VOUCH GENERATION (Regular Members)
// ============================================

/**
 * Generate a single-use vouch code for a specific recipient.
 * Checks weekly limits and creates an AccessCode record.
 */
export async function generateVouchCode(
    inviterId: string,
    recipientEmail: string,
    message?: string,
): Promise<{ code: string; inviteId: string } | { error: string }> {
    // Get inviter's chain
    const chain = await prisma.inviteChain.findUnique({ where: { userId: inviterId } });
    if (!chain) {
        return { error: 'You are not part of the trust chain. Contact support.' };
    }
    if (!chain.isUnlocked) {
        return { error: 'Verify your email to unlock vouching. New members must build trust first.' };
    }

    // Auto-reset weekly counter
    await maybeResetWeeklyCounter(chain.id, chain.weekResetAt);
    const freshChain = await prisma.inviteChain.findUnique({ where: { id: chain.id } });
    if (!freshChain) return { error: 'Chain record not found.' };

    const remaining = freshChain.weeklyAllocation - freshChain.invitesUsedThisWeek;
    if (remaining <= 0) {
        return { error: `You've used all your vouches this week. Your allocation resets every Monday.` };
    }

    // Check if this email was already invited by this user
    const existingInvite = await prisma.invite.findFirst({
        where: {
            senderId: inviterId,
            recipientEmail: recipientEmail.toLowerCase(),
            status: { in: ['SENT', 'OPENED'] },
        },
    });
    if (existingInvite) {
        return { error: 'You already sent a vouch to this email address.' };
    }

    // Check if email is already registered
    const existingUser = await prisma.user.findFirst({
        where: { email: recipientEmail.toLowerCase() },
    });
    if (existingUser) {
        return { error: 'This person already has an account on 0G.' };
    }

    // Generate unique single-use code
    const code = `V${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Create AccessCode record
    await prisma.accessCode.create({
        data: {
            code,
            type: 'vouch',
            maxUses: 1,
            useCount: 0,
            createdById: inviterId,
            isActive: true,
            expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        },
    });

    // Create Invite record for tracking
    const referralCode = crypto.randomBytes(6).toString('hex').toUpperCase();
    const invite = await prisma.invite.create({
        data: {
            senderId: inviterId,
            recipientEmail: recipientEmail.toLowerCase(),
            method: 'EMAIL',
            status: 'SENT',
            referralCode,
            message: message || null,
        },
    });

    // Increment usage counters
    await prisma.inviteChain.update({
        where: { id: freshChain.id },
        data: {
            invitesUsedThisWeek: { increment: 1 },
            totalInvitesSent: { increment: 1 },
        },
    });

    logger.info(`[TrustChain] Vouch code ${code} generated by user ${inviterId} for ${recipientEmail}`);

    return { code, inviteId: invite.id };
}

/**
 * Get remaining vouches for a user this week.
 */
export async function getRemainingVouches(userId: string): Promise<number> {
    const chain = await prisma.inviteChain.findUnique({ where: { userId } });
    if (!chain || !chain.isUnlocked) return 0;

    await maybeResetWeeklyCounter(chain.id, chain.weekResetAt);
    const fresh = await prisma.inviteChain.findUnique({ where: { id: chain.id } });
    if (!fresh) return 0;

    return Math.max(0, fresh.weeklyAllocation - fresh.invitesUsedThisWeek);
}

// ============================================
// REPUTATION BONDING
// ============================================

/**
 * When a user receives a community strike, propagate a vouch strike
 * to the person who invited them. If the inviter accumulates enough
 * vouch strikes, their invite allocation is halved.
 */
export async function propagateVouchStrike(struckUserId: string): Promise<void> {
    const chain = await prisma.inviteChain.findUnique({
        where: { userId: struckUserId },
        select: { invitedById: true },
    });

    if (!chain?.invitedById) {
        // Founding creator or no chain — no propagation
        return;
    }

    const inviterId = chain.invitedById;

    // Increment vouch strikes on the inviter
    const updatedInviter = await prisma.user.update({
        where: { id: inviterId },
        data: { vouchStrikes: { increment: 1 } },
        select: { vouchStrikes: true },
    });

    logger.warn(`[TrustChain] Vouch strike propagated to inviter ${inviterId} (now ${updatedInviter.vouchStrikes} vouch strikes)`);

    // If threshold reached, halve the inviter's weekly allocation
    if (updatedInviter.vouchStrikes >= VOUCH_STRIKE_THRESHOLD) {
        const inviterChain = await prisma.inviteChain.findUnique({ where: { userId: inviterId } });
        if (inviterChain && inviterChain.weeklyAllocation > 0) {
            const reducedAllocation = Math.max(1, Math.floor(inviterChain.weeklyAllocation / VOUCH_STRIKE_PENALTY_DIVISOR));
            await prisma.inviteChain.update({
                where: { id: inviterChain.id },
                data: { weeklyAllocation: reducedAllocation },
            });
            logger.warn(`[TrustChain] Inviter ${inviterId} allocation reduced to ${reducedAllocation} due to ${updatedInviter.vouchStrikes} vouch strikes`);

            // Notify the inviter
            await prisma.notification.create({
                data: {
                    userId: inviterId,
                    type: 'SYSTEM',
                    message: `Your weekly vouch allocation has been reduced because people you invited received community strikes. Please vouch responsibly.`,
                },
            }).catch(() => { /* best-effort */ });
        }
    }
}

// ============================================
// RALLY APPLICATION PROCESSING
// ============================================

/**
 * Process pending Rally applications up to the weekly allocation.
 * Auto-approves in FIFO order, generates codes, and marks as approved.
 */
export async function processRallyQueue(rallyId: string): Promise<{ approved: number; remaining: number }> {
    const rally = await prisma.rally.findUnique({ where: { id: rallyId } });
    if (!rally || !rally.isActive) {
        return { approved: 0, remaining: 0 };
    }

    // Auto-reset weekly counter
    await maybeResetRallyWeeklyCounter(rally.id, rally.weekResetAt);
    const freshRally = await prisma.rally.findUnique({ where: { id: rallyId } });
    if (!freshRally) return { approved: 0, remaining: 0 };

    const slotsAvailable = freshRally.weeklyAllocation - freshRally.approvedThisWeek;
    if (slotsAvailable <= 0) {
        return { approved: 0, remaining: 0 };
    }

    // Get pending applications in FIFO order
    const pending = await prisma.rallyApplication.findMany({
        where: { rallyId, status: 'pending' },
        orderBy: { createdAt: 'asc' },
        take: slotsAvailable,
    });

    let approvedCount = 0;

    for (const app of pending) {
        // Check if email is already registered
        const existingUser = await prisma.user.findFirst({
            where: { email: app.email.toLowerCase() },
        });
        if (existingUser) {
            await prisma.rallyApplication.update({
                where: { id: app.id },
                data: { status: 'rejected' },
            });
            continue;
        }

        // Generate unique single-use code
        const code = `R${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

        await prisma.accessCode.create({
            data: {
                code,
                type: 'rally',
                maxUses: 1,
                useCount: 0,
                createdById: rally.creatorId,
                isActive: true,
                expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
            },
        });

        await prisma.rallyApplication.update({
            where: { id: app.id },
            data: {
                status: 'approved',
                accessCode: code,
                approvedAt: new Date(),
            },
        });

        approvedCount++;
    }

    // Update rally counters
    if (approvedCount > 0) {
        await prisma.rally.update({
            where: { id: rallyId },
            data: {
                approvedThisWeek: { increment: approvedCount },
                totalApproved: { increment: approvedCount },
            },
        });
    }

    const remainingPending = await prisma.rallyApplication.count({
        where: { rallyId, status: 'pending' },
    });

    logger.info(`[TrustChain] Rally ${rally.slug}: approved ${approvedCount}, ${remainingPending} still pending`);

    return { approved: approvedCount, remaining: remainingPending };
}

// ============================================
// INVITE ALLOCATION
// ============================================

/**
 * Called on trust level promotion. Sets weeklyAllocation and isUnlocked
 * based on the user's degree and new trust level.
 */
export async function allocateInvites(userId: string, newTrustLevel: number): Promise<void> {
    const chain = await prisma.inviteChain.findUnique({ where: { userId } });
    if (!chain) return;

    // Founding creators (degree 0) don't use direct vouches — they use Rally pages
    if (chain.degree === 0) return;

    const baseDegree = Math.min(chain.degree, 3); // Cap at degree 3 for allocation lookup
    const baseAllocation = BASE_ALLOCATION_BY_DEGREE[baseDegree] ?? 2;

    // Sum bonuses from trust levels 2 and 3
    let bonus = 0;
    if (newTrustLevel >= 2) bonus += TRUST_LEVEL_BONUS[2] ?? 0;
    if (newTrustLevel >= 3) bonus += TRUST_LEVEL_BONUS[3] ?? 0;

    const totalAllocation = baseAllocation + bonus;

    // Apply vouch strike penalty if applicable
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { vouchStrikes: true } });
    const penaltyDivisor = (user?.vouchStrikes ?? 0) >= VOUCH_STRIKE_THRESHOLD ? VOUCH_STRIKE_PENALTY_DIVISOR : 1;
    const finalAllocation = Math.max(1, Math.floor(totalAllocation / penaltyDivisor));

    await prisma.inviteChain.update({
        where: { id: chain.id },
        data: {
            weeklyAllocation: finalAllocation,
            isUnlocked: newTrustLevel >= 1,
        },
    });

    logger.info(`[TrustChain] User ${userId} allocation set to ${finalAllocation}/week (degree ${chain.degree}, trust level ${newTrustLevel})`);
}

/**
 * Create an InviteChain record for a new user during signup.
 */
export async function createChainForNewUser(
    userId: string,
    inviterId: string | null,
    inviterChainDegree: number,
    foundingCreatorId: string,
): Promise<void> {
    const degree = inviterId ? inviterChainDegree + 1 : 0;
    const baseDegree = Math.min(degree, 3);
    const baseAllocation = BASE_ALLOCATION_BY_DEGREE[baseDegree] ?? 2;

    await prisma.inviteChain.create({
        data: {
            userId,
            invitedById: inviterId,
            foundingCreatorId,
            degree,
            weeklyAllocation: degree === 0 ? 0 : baseAllocation, // Founding creators use Rally
            isUnlocked: degree === 0, // Founding creators are unlocked immediately
        },
    });

    logger.info(`[TrustChain] Chain created for user ${userId}: degree ${degree}, founding creator ${foundingCreatorId}`);
}

// ============================================
// WEEKLY COUNTER RESET HELPERS
// ============================================

async function maybeResetWeeklyCounter(chainId: string, lastResetAt: Date): Promise<void> {
    const now = new Date();
    const daysSinceReset = (now.getTime() - lastResetAt.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceReset >= 7) {
        await prisma.inviteChain.update({
            where: { id: chainId },
            data: {
                invitesUsedThisWeek: 0,
                weekResetAt: now,
            },
        });
    }
}

async function maybeResetRallyWeeklyCounter(rallyId: string, lastResetAt: Date): Promise<void> {
    const now = new Date();
    const daysSinceReset = (now.getTime() - lastResetAt.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceReset >= 7) {
        await prisma.rally.update({
            where: { id: rallyId },
            data: {
                approvedThisWeek: 0,
                weekResetAt: now,
            },
        });
    }
}

export default {
    getChainInfo,
    getDegreesFromUser,
    generateVouchCode,
    getRemainingVouches,
    propagateVouchStrike,
    processRallyQueue,
    allocateInvites,
    createChainForNewUser,
};
