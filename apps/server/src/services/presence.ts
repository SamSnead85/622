"use strict";

/**
 * PRESENCE SERVICE
 * Real-time user presence and online counts
 */

import { prisma } from '../db/client.js';

// In-memory cache for fast reads (sync with DB periodically)
const presenceCache = new Map<string, { isOnline: boolean; lastSeen: Date; page?: string }>();

// ============================================
// UPDATE USER PRESENCE
// ============================================

export async function updatePresence(userId: string, currentPage?: string) {
    const now = new Date();

    // Update cache
    presenceCache.set(userId, {
        isOnline: true,
        lastSeen: now,
        page: currentPage,
    });

    // Update database (debounced - only every 30 seconds)
    const existing = await prisma.userPresence.findUnique({
        where: { userId },
    });

    const shouldUpdateDb = !existing ||
        (now.getTime() - existing.lastSeenAt.getTime() > 30000);

    if (shouldUpdateDb) {
        await prisma.userPresence.upsert({
            where: { userId },
            create: {
                userId,
                isOnline: true,
                lastSeenAt: now,
                currentPage,
            },
            update: {
                isOnline: true,
                lastSeenAt: now,
                currentPage,
            },
        });
    }
}

// ============================================
// SET USER OFFLINE
// ============================================

export async function setOffline(userId: string) {
    presenceCache.delete(userId);

    await prisma.userPresence.update({
        where: { userId },
        data: {
            isOnline: false,
            lastSeenAt: new Date(),
        },
    }).catch(() => {
        // Ignore if no presence record exists
    });
}

// ============================================
// GET ONLINE COUNT
// ============================================

export async function getOnlineCount(): Promise<number> {
    // Fast path: use cache
    if (presenceCache.size > 0) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        let count = 0;

        for (const [, presence] of presenceCache) {
            if (presence.isOnline && presence.lastSeen > fiveMinutesAgo) {
                count++;
            }
        }

        return count;
    }

    // Fallback: check database
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    return prisma.userPresence.count({
        where: {
            isOnline: true,
            lastSeenAt: { gte: fiveMinutesAgo },
        },
    });
}

// ============================================
// GET PRESENCE STATS
// ============================================

export async function getPresenceStats() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const [onlineCount, totalUsers, byPage] = await Promise.all([
        prisma.userPresence.count({
            where: {
                isOnline: true,
                lastSeenAt: { gte: fiveMinutesAgo },
            },
        }),
        prisma.user.count(),
        prisma.userPresence.groupBy({
            by: ['currentPage'],
            where: {
                isOnline: true,
                lastSeenAt: { gte: fiveMinutesAgo },
                currentPage: { not: null },
            },
            _count: true,
        }),
    ]);

    return {
        onlineNow: onlineCount,
        totalMembers: totalUsers,
        byPage: byPage.reduce((acc, item) => {
            if (item.currentPage) {
                acc[item.currentPage] = item._count;
            }
            return acc;
        }, {} as Record<string, number>),
    };
}

// ============================================
// CHECK IF USER ONLINE
// ============================================

export async function isUserOnline(userId: string): Promise<boolean> {
    // Check cache first
    const cached = presenceCache.get(userId);
    if (cached) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return cached.isOnline && cached.lastSeen > fiveMinutesAgo;
    }

    // Check database
    const presence = await prisma.userPresence.findUnique({
        where: { userId },
    });

    if (!presence) return false;

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return presence.isOnline && presence.lastSeenAt > fiveMinutesAgo;
}

// ============================================
// CLEANUP STALE PRESENCE
// ============================================

export async function cleanupStalePresence() {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    // Mark as offline in database
    await prisma.userPresence.updateMany({
        where: {
            isOnline: true,
            lastSeenAt: { lt: fifteenMinutesAgo },
        },
        data: {
            isOnline: false,
        },
    });

    // Clean cache
    for (const [userId, presence] of presenceCache) {
        if (presence.lastSeen < fifteenMinutesAgo) {
            presenceCache.delete(userId);
        }
    }
}

// Run cleanup every 5 minutes
setInterval(cleanupStalePresence, 5 * 60 * 1000);

export default {
    updatePresence,
    setOffline,
    getOnlineCount,
    getPresenceStats,
    isUserOnline,
    cleanupStalePresence,
};
