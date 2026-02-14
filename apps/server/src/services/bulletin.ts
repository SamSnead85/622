"use strict";

/**
 * BULLETIN SERVICE
 * Community Command Center - Bulletin Board Operations
 */

import {
    BulletinType,
    BulletinCategory,
    Prisma
} from '@prisma/client';
import { prisma } from '../db/client.js';

// ============================================
// TYPES
// ============================================

export interface CreateBulletinParams {
    type: BulletinType;
    title: string;
    content: string;
    category: BulletinCategory;
    authorId: string;
    mediaUrl?: string;
    externalLink?: string;
    tags?: string[];
    location?: string;
    locationGeo?: string;
    eventDate?: Date;
    expiresAt?: Date;
}

export interface UpdateBulletinParams {
    title?: string;
    content?: string;
    category?: BulletinCategory;
    mediaUrl?: string;
    externalLink?: string;
    tags?: string[];
    location?: string;
    eventDate?: Date;
    isPinned?: boolean;
}

export interface BulletinFilters {
    type?: BulletinType;
    category?: BulletinCategory;
    authorId?: string;
    isPinned?: boolean;
    search?: string;
}

// ============================================
// CREATE BULLETIN
// ============================================

export async function createBulletin(params: CreateBulletinParams) {
    return prisma.bulletinPost.create({
        data: {
            type: params.type,
            title: params.title,
            content: params.content,
            category: params.category,
            authorId: params.authorId,
            mediaUrl: params.mediaUrl,
            externalLink: params.externalLink,
            tags: params.tags || [],
            location: params.location,
            locationGeo: params.locationGeo,
            eventDate: params.eventDate,
            expiresAt: params.expiresAt,
        },
        include: {
            author: {
                select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                    isVerified: true,
                },
            },
            _count: {
                select: { comments: true },
            },
        },
    });
}

// ============================================
// GET BULLETINS (with viral scoring)
// ============================================

export async function getBulletins(options: {
    filters?: BulletinFilters;
    sortBy?: 'recent' | 'trending' | 'hot';
    cursor?: string;
    limit?: number;
}) {
    const { filters, sortBy = 'hot', cursor, limit = 20 } = options;

    // Build where clause
    const where: Prisma.BulletinPostWhereInput = {
        ...(filters?.type && { type: filters.type }),
        ...(filters?.category && { category: filters.category }),
        ...(filters?.authorId && { authorId: filters.authorId }),
        ...(filters?.isPinned !== undefined && { isPinned: filters.isPinned }),
        ...(filters?.search && {
            OR: [
                { title: { contains: filters.search, mode: 'insensitive' as Prisma.QueryMode } },
                { content: { contains: filters.search, mode: 'insensitive' as Prisma.QueryMode } },
            ],
        }),
        // Exclude expired posts
        OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
        ],
    };

    // Build order by based on sort type
    let orderBy: Prisma.BulletinPostOrderByWithRelationInput[];

    switch (sortBy) {
        case 'trending':
            // Recent engagement velocity
            orderBy = [
                { isPinned: 'desc' },
                { upvotes: 'desc' },
                { createdAt: 'desc' },
            ];
            break;
        case 'recent':
            orderBy = [
                { isPinned: 'desc' },
                { createdAt: 'desc' },
            ];
            break;
        case 'hot':
        default:
            // Balance of engagement and recency
            orderBy = [
                { isPinned: 'desc' },
                { viewCount: 'desc' },
                { upvotes: 'desc' },
                { createdAt: 'desc' },
            ];
            break;
    }

    const bulletins = await prisma.bulletinPost.findMany({
        where,
        orderBy,
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        include: {
            author: {
                select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                    isVerified: true,
                },
            },
            _count: {
                select: { comments: true },
            },
        },
    });

    const hasMore = bulletins.length > limit;
    const results = hasMore ? bulletins.slice(0, -1) : bulletins;

    return {
        bulletins: results.map(b => ({
            ...b,
            commentsCount: b._count.comments,
            score: calculateViralScore(b),
        })),
        nextCursor: hasMore ? results[results.length - 1].id : null,
    };
}

// ============================================
// VIRAL SCORE ALGORITHM
// ============================================

function calculateViralScore(bulletin: any): number {
    const ageHours = (Date.now() - new Date(bulletin.createdAt).getTime()) / (1000 * 60 * 60);
    const gravity = 1.8; // Decay factor

    // Reddit-style hot ranking with engagement
    const engagement = (bulletin.upvotes - bulletin.downvotes) +
        (bulletin.viewCount * 0.01) +
        (bulletin._count?.comments * 2);

    // Time decay
    const score = engagement / Math.pow(ageHours + 2, gravity);

    // Bonus for events happening soon
    if (bulletin.eventDate) {
        const hoursUntilEvent = (new Date(bulletin.eventDate).getTime() - Date.now()) / (1000 * 60 * 60);
        if (hoursUntilEvent > 0 && hoursUntilEvent < 48) {
            return score * 1.5; // 50% boost for imminent events
        }
    }

    return score;
}

// ============================================
// GET SINGLE BULLETIN
// ============================================

export async function getBulletinById(id: string, incrementView: boolean = true) {
    // Increment view count
    if (incrementView) {
        await prisma.bulletinPost.update({
            where: { id },
            data: { viewCount: { increment: 1 } },
        });
    }

    return prisma.bulletinPost.findUnique({
        where: { id },
        include: {
            author: {
                select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                    isVerified: true,
                    bio: true,
                },
            },
            comments: {
                orderBy: { createdAt: 'desc' },
                take: 50,
            },
            _count: {
                select: { comments: true },
            },
        },
    });
}

// ============================================
// UPDATE BULLETIN
// ============================================

export async function updateBulletin(id: string, authorId: string, updates: UpdateBulletinParams) {
    // Verify ownership
    const bulletin = await prisma.bulletinPost.findFirst({
        where: { id, authorId },
    });

    if (!bulletin) {
        throw new Error('Bulletin not found or unauthorized');
    }

    return prisma.bulletinPost.update({
        where: { id },
        data: updates,
        include: {
            author: {
                select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                    isVerified: true,
                },
            },
        },
    });
}

// ============================================
// DELETE BULLETIN
// ============================================

export async function deleteBulletin(id: string, authorId: string, isAdmin: boolean = false) {
    // Verify ownership unless admin
    if (!isAdmin) {
        const bulletin = await prisma.bulletinPost.findFirst({
            where: { id, authorId },
        });

        if (!bulletin) {
            throw new Error('Bulletin not found or unauthorized');
        }
    }

    return prisma.bulletinPost.delete({
        where: { id },
    });
}

// ============================================
// VOTE ON BULLETIN
// ============================================

export async function voteBulletin(bulletinId: string, userId: string, isUpvote: boolean) {
    // Check for existing vote
    const existingVote = await prisma.bulletinVote.findUnique({
        where: { bulletinId_userId: { bulletinId, userId } },
    });

    if (existingVote) {
        if (existingVote.isUpvote === isUpvote) {
            // Remove vote (toggle off)
            await prisma.bulletinVote.delete({
                where: { id: existingVote.id },
            });

            // Update counts
            await prisma.bulletinPost.update({
                where: { id: bulletinId },
                data: isUpvote
                    ? { upvotes: { decrement: 1 } }
                    : { downvotes: { decrement: 1 } },
            });

            return { voted: false, isUpvote: null };
        } else {
            // Change vote direction
            await prisma.bulletinVote.update({
                where: { id: existingVote.id },
                data: { isUpvote },
            });

            // Update counts (swap)
            await prisma.bulletinPost.update({
                where: { id: bulletinId },
                data: isUpvote
                    ? { upvotes: { increment: 1 }, downvotes: { decrement: 1 } }
                    : { upvotes: { decrement: 1 }, downvotes: { increment: 1 } },
            });

            return { voted: true, isUpvote };
        }
    }

    // Create new vote
    await prisma.bulletinVote.create({
        data: { bulletinId, userId, isUpvote },
    });

    await prisma.bulletinPost.update({
        where: { id: bulletinId },
        data: isUpvote
            ? { upvotes: { increment: 1 } }
            : { downvotes: { increment: 1 } },
    });

    return { voted: true, isUpvote };
}

// ============================================
// ADD COMMENT
// ============================================

export async function addBulletinComment(bulletinId: string, authorId: string, content: string) {
    return prisma.bulletinComment.create({
        data: {
            bulletinId,
            authorId,
            content,
        },
    });
}

// ============================================
// PIN/UNPIN (Admin only)
// ============================================

export async function toggleBulletinPin(id: string, isPinned: boolean) {
    return prisma.bulletinPost.update({
        where: { id },
        data: { isPinned },
    });
}

// ============================================
// GET CATEGORIES WITH COUNTS
// ============================================

export async function getBulletinStats() {
    const [
        totalBulletins,
        byType,
        byCategory,
        pinnedCount,
    ] = await Promise.all([
        prisma.bulletinPost.count(),
        prisma.bulletinPost.groupBy({
            by: ['type'],
            _count: true,
        }),
        prisma.bulletinPost.groupBy({
            by: ['category'],
            _count: true,
        }),
        prisma.bulletinPost.count({ where: { isPinned: true } }),
    ]);

    return {
        total: totalBulletins,
        pinnedCount,
        byType: byType.reduce((acc, item) => {
            acc[item.type] = item._count;
            return acc;
        }, {} as Record<string, number>),
        byCategory: byCategory.reduce((acc, item) => {
            acc[item.category] = item._count;
            return acc;
        }, {} as Record<string, number>),
    };
}

export default {
    createBulletin,
    getBulletins,
    getBulletinById,
    updateBulletin,
    deleteBulletin,
    voteBulletin,
    addBulletinComment,
    toggleBulletinPin,
    getBulletinStats,
};
