import { MomentType } from '@prisma/client';
import { prisma } from '../db/client.js';

// 24 hours in milliseconds
const MOMENT_DURATION_MS = 24 * 60 * 60 * 1000;

export interface CreateMomentInput {
    userId: string;
    type: MomentType;
    mediaUrl: string;
    thumbnailUrl?: string;
    duration?: number; // For video moments
    caption?: string;
    musicId?: string;
}

export interface MomentWithUser {
    id: string;
    type: MomentType;
    mediaUrl: string;
    thumbnailUrl: string | null;
    duration: number | null;
    caption: string | null;
    viewCount: number;
    expiresAt: Date;
    createdAt: Date;
    user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
    };
    hasViewed: boolean;
}

export interface UserMoments {
    user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
    };
    moments: MomentWithUser[];
    hasUnviewed: boolean;
    latestMomentAt: Date;
}

export class MomentService {
    /**
     * Create a new moment (story)
     */
    async createMoment(input: CreateMomentInput) {
        const expiresAt = new Date(Date.now() + MOMENT_DURATION_MS);

        return prisma.moment.create({
            data: {
                userId: input.userId,
                type: input.type,
                mediaUrl: input.mediaUrl,
                thumbnailUrl: input.thumbnailUrl,
                duration: input.duration,
                caption: input.caption,
                musicId: input.musicId,
                expiresAt,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                    },
                },
            },
        });
    }

    /**
     * Get moments feed for a user (from people they follow)
     */
    async getMomentsFeed(userId: string): Promise<UserMoments[]> {
        const now = new Date();

        // Get users that the current user follows who have active moments
        const followingWithMoments = await prisma.user.findMany({
            where: {
                followers: {
                    some: {
                        followerId: userId,
                    },
                },
                moments: {
                    some: {
                        isActive: true,
                        expiresAt: { gt: now },
                    },
                },
            },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                moments: {
                    where: {
                        isActive: true,
                        expiresAt: { gt: now },
                    },
                    orderBy: { createdAt: 'asc' },
                    include: {
                        views: {
                            where: { userId },
                            select: { id: true },
                        },
                    },
                },
            },
        });

        // Also get current user's own moments
        const ownMoments = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                moments: {
                    where: {
                        isActive: true,
                        expiresAt: { gt: now },
                    },
                    orderBy: { createdAt: 'asc' },
                    include: {
                        views: {
                            where: { userId },
                            select: { id: true },
                        },
                    },
                },
            },
        });

        // Transform to UserMoments format
        const result: UserMoments[] = [];

        // Add own moments first (if any)
        if (ownMoments && ownMoments.moments.length > 0) {
            result.push({
                user: {
                    id: ownMoments.id,
                    username: ownMoments.username,
                    displayName: ownMoments.displayName,
                    avatarUrl: ownMoments.avatarUrl,
                },
                moments: ownMoments.moments.map((m) => ({
                    id: m.id,
                    type: m.type,
                    mediaUrl: m.mediaUrl,
                    thumbnailUrl: m.thumbnailUrl,
                    duration: m.duration,
                    caption: m.caption,
                    viewCount: m.viewCount,
                    expiresAt: m.expiresAt,
                    createdAt: m.createdAt,
                    user: {
                        id: ownMoments.id,
                        username: ownMoments.username,
                        displayName: ownMoments.displayName,
                        avatarUrl: ownMoments.avatarUrl,
                    },
                    hasViewed: m.views.length > 0,
                })),
                hasUnviewed: ownMoments.moments.some((m) => m.views.length === 0),
                latestMomentAt: ownMoments.moments[ownMoments.moments.length - 1].createdAt,
            });
        }

        // Add following users' moments (sorted by has unviewed first, then by latest moment)
        const followingMoments = followingWithMoments
            .map((user) => ({
                user: {
                    id: user.id,
                    username: user.username,
                    displayName: user.displayName,
                    avatarUrl: user.avatarUrl,
                },
                moments: user.moments.map((m) => ({
                    id: m.id,
                    type: m.type,
                    mediaUrl: m.mediaUrl,
                    thumbnailUrl: m.thumbnailUrl,
                    duration: m.duration,
                    caption: m.caption,
                    viewCount: m.viewCount,
                    expiresAt: m.expiresAt,
                    createdAt: m.createdAt,
                    user: {
                        id: user.id,
                        username: user.username,
                        displayName: user.displayName,
                        avatarUrl: user.avatarUrl,
                    },
                    hasViewed: m.views.length > 0,
                })),
                hasUnviewed: user.moments.some((m) => m.views.length === 0),
                latestMomentAt: user.moments[user.moments.length - 1].createdAt,
            }))
            .sort((a, b) => {
                // Unviewed first
                if (a.hasUnviewed !== b.hasUnviewed) {
                    return a.hasUnviewed ? -1 : 1;
                }
                // Then by latest moment
                return b.latestMomentAt.getTime() - a.latestMomentAt.getTime();
            });

        result.push(...followingMoments);

        return result;
    }

    /**
     * Mark a moment as viewed
     */
    async viewMoment(momentId: string, userId: string) {
        // Create view record (upsert to handle duplicates)
        await prisma.momentView.upsert({
            where: {
                momentId_userId: { momentId, userId },
            },
            create: { momentId, userId },
            update: { viewedAt: new Date() },
        });

        // Increment view count
        await prisma.moment.update({
            where: { id: momentId },
            data: { viewCount: { increment: 1 } },
        });
    }

    /**
     * Get viewers of a moment (for moment owner)
     */
    async getMomentViewers(momentId: string, ownerId: string) {
        const moment = await prisma.moment.findFirst({
            where: { id: momentId, userId: ownerId },
        });

        if (!moment) {
            throw new Error('Moment not found or not authorized');
        }

        return prisma.momentView.findMany({
            where: { momentId },
            orderBy: { viewedAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                    },
                },
            },
        });
    }

    /**
     * Delete a moment
     */
    async deleteMoment(momentId: string, userId: string) {
        const moment = await prisma.moment.findFirst({
            where: { id: momentId, userId },
        });

        if (!moment) {
            throw new Error('Moment not found or not authorized');
        }

        return prisma.moment.delete({
            where: { id: momentId },
        });
    }

    /**
     * Clean up expired moments (called by cron job)
     */
    async cleanupExpiredMoments() {
        const result = await prisma.moment.updateMany({
            where: {
                expiresAt: { lt: new Date() },
                isActive: true,
            },
            data: {
                isActive: false,
            },
        });

        return result.count;
    }

    /**
     * Get a single moment by ID
     */
    async getMoment(momentId: string, viewerId?: string) {
        const moment = await prisma.moment.findUnique({
            where: { id: momentId },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                    },
                },
                views: viewerId
                    ? {
                        where: { userId: viewerId },
                        select: { id: true },
                    }
                    : false,
            },
        });

        if (!moment || !moment.isActive || moment.expiresAt < new Date()) {
            return null;
        }

        return {
            ...moment,
            hasViewed: viewerId ? (moment.views as { id: string }[]).length > 0 : false,
        };
    }
}

export const momentService = new MomentService();
