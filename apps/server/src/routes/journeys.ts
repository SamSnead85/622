import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Validation schemas
const createJourneySchema = z.object({
    videoUrl: z.string().url(),
    thumbnailUrl: z.string().url(),
    caption: z.string().max(2200),
    musicName: z.string().optional(),
    musicArtist: z.string().optional(),
});

// ============================================
// GET /api/v1/journeys
// List all journeys (public videos)
// ============================================
router.get('/', optionalAuth, async (req: AuthRequest, res, next) => {
    try {
        const { cursor, limit = '20' } = req.query;

        const journeys = await prisma.post.findMany({
            where: {
                type: 'VIDEO',
                mediaUrl: { not: null },
                isPublic: true,
            },
            take: parseInt(limit as string) + 1,
            cursor: cursor ? { id: cursor as string } : undefined,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                    },
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true,
                    },
                },
            },
        });

        const hasMore = journeys.length > parseInt(limit as string);
        const results = hasMore ? journeys.slice(0, -1) : journeys;

        res.json({
            journeys: results.map((j) => ({
                id: j.id,
                userId: j.userId,
                user: j.user,
                videoUrl: j.mediaUrl,
                thumbnailUrl: j.thumbnailUrl,
                caption: j.caption,
                likes: j._count.likes,
                comments: j._count.comments,
                createdAt: j.createdAt,
            })),
            nextCursor: hasMore ? results[results.length - 1]?.id : null,
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/v1/journeys/feed
// Get paginated journeys feed
// ============================================
router.get('/feed', optionalAuth, async (req: AuthRequest, res, next) => {
    try {
        const { cursor, limit = '20' } = req.query;

        const journeys = await prisma.post.findMany({
            where: {
                type: 'VIDEO', // Journeys are video posts
                mediaUrl: { not: null },
            },
            take: parseInt(limit as string) + 1,
            cursor: cursor ? { id: cursor as string } : undefined,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                    },
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true,
                        shares: true,
                    },
                },
            },
        });

        const hasMore = journeys.length > parseInt(limit as string);
        const results = hasMore ? journeys.slice(0, -1) : journeys;

        // Check if current user liked these journeys
        let likedIds = new Set<string>();
        if (req.userId) {
            const likes = await prisma.like.findMany({
                where: {
                    userId: req.userId,
                    postId: { in: results.map((j) => j.id) },
                },
            });
            likedIds = new Set(likes.map((l) => l.postId));
        }

        // Check following status
        let followingIds = new Set<string>();
        if (req.userId) {
            const follows = await prisma.follow.findMany({
                where: {
                    followerId: req.userId,
                    followingId: { in: results.map((j) => j.userId) },
                },
            });
            followingIds = new Set(follows.map((f) => f.followingId));
        }

        res.json({
            journeys: results.map((j) => ({
                id: j.id,
                userId: j.userId,
                user: {
                    ...j.user,
                    isFollowing: followingIds.has(j.userId),
                },
                videoUrl: j.mediaUrl,
                thumbnailUrl: j.thumbnailUrl || j.mediaUrl,
                caption: j.caption || '',
                musicName: null, // Could store in metadata
                musicArtist: null,
                likes: j._count.likes,
                comments: j._count.comments,
                shares: j._count.shares,
                isLiked: likedIds.has(j.id),
                createdAt: j.createdAt,
            })),
            nextCursor: hasMore ? results[results.length - 1].id : null,
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// POST /api/v1/journeys
// Create a new journey
// ============================================
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const input = createJourneySchema.parse(req.body);

        const journey = await prisma.post.create({
            data: {
                userId: req.userId!,
                caption: input.caption,
                type: 'VIDEO',
                mediaUrl: input.videoUrl,
                thumbnailUrl: input.thumbnailUrl,
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

        res.status(201).json({
            journey: {
                id: journey.id,
                userId: journey.userId,
                user: journey.user,
                videoUrl: journey.mediaUrl,
                thumbnailUrl: journey.thumbnailUrl || journey.mediaUrl,
                caption: journey.caption,
                likes: 0,
                comments: 0,
                shares: 0,
                isLiked: false,
                createdAt: journey.createdAt,
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        next(error);
    }
});

// ============================================
// POST /api/v1/journeys/:id/like
// Like/unlike a journey
// ============================================
router.post('/:id/like', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { id } = req.params;

        // Check if already liked
        const existingLike = await prisma.like.findUnique({
            where: {
                userId_postId: {
                    userId: req.userId!,
                    postId: id,
                },
            },
        });

        if (existingLike) {
            // Unlike
            await prisma.like.delete({
                where: { id: existingLike.id },
            });
            res.json({ liked: false });
        } else {
            // Like
            await prisma.like.create({
                data: {
                    userId: req.userId!,
                    postId: id,
                },
            });
            res.json({ liked: true });
        }
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/v1/journeys/:id
// Get a single journey
// ============================================
router.get('/:id', optionalAuth, async (req: AuthRequest, res, next) => {
    try {
        const { id } = req.params;

        const journey = await prisma.post.findUnique({
            where: { id, type: 'VIDEO' },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                    },
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true,
                        shares: true,
                    },
                },
            },
        });

        if (!journey) {
            throw new AppError('Journey not found', 404);
        }

        let isLiked = false;
        let isFollowing = false;

        if (req.userId) {
            const like = await prisma.like.findUnique({
                where: {
                    userId_postId: {
                        userId: req.userId,
                        postId: id,
                    },
                },
            });
            isLiked = !!like;

            const follow = await prisma.follow.findUnique({
                where: {
                    followerId_followingId: {
                        followerId: req.userId,
                        followingId: journey.userId,
                    },
                },
            });
            isFollowing = !!follow;
        }

        res.json({
            journey: {
                id: journey.id,
                userId: journey.userId,
                user: {
                    ...journey.user,
                    isFollowing,
                },
                videoUrl: journey.mediaUrl,
                thumbnailUrl: journey.thumbnailUrl || journey.mediaUrl,
                caption: journey.caption,
                likes: journey._count.likes,
                comments: journey._count.comments,
                shares: journey._count.shares,
                isLiked,
                createdAt: journey.createdAt,
            },
        });
    } catch (error) {
        next(error);
    }
});

export { router as journeysRouter };
