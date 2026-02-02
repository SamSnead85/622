import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Demo posts for testing
const DEMO_POSTS = [
    {
        id: 'demo-post-1',
        userId: 'demo-user-id',
        type: 'IMAGE',
        caption: 'Welcome to Six22! 🌙 The year 622 CE marks the beginning of the Islamic calendar - the Hijra. Join our community.',
        mediaUrl: 'https://images.unsplash.com/photo-1564769625688-88f6b02e6b5a?w=800',
        thumbnailUrl: 'https://images.unsplash.com/photo-1564769625688-88f6b02e6b5a?w=400',
        viewCount: 1280,
        isPublic: true,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        user: {
            id: 'demo-user-id',
            username: 'demo',
            displayName: 'Demo User',
            avatarUrl: null,
            isVerified: true,
        },
        likesCount: 128,
        commentsCount: 24,
        sharesCount: 12,
        isLiked: false,
        isSaved: false,
    },
    {
        id: 'demo-post-2',
        userId: 'creator-1',
        type: 'IMAGE',
        caption: 'The beauty of Islamic geometric patterns ✨ Each design tells a story of unity and infinity.',
        mediaUrl: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=800',
        thumbnailUrl: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=400',
        viewCount: 2450,
        isPublic: true,
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        user: {
            id: 'creator-1',
            username: 'artistry',
            displayName: 'Islamic Artistry',
            avatarUrl: null,
            isVerified: true,
        },
        likesCount: 342,
        commentsCount: 56,
        sharesCount: 78,
        isLiked: true,
        isSaved: false,
    },
    {
        id: 'demo-post-3',
        userId: 'creator-2',
        type: 'IMAGE',
        caption: 'Golden hour in the desert 🏜️ Finding peace in the vastness.',
        mediaUrl: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800',
        thumbnailUrl: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=400',
        viewCount: 892,
        isPublic: true,
        createdAt: new Date(Date.now() - 14400000).toISOString(),
        user: {
            id: 'creator-2',
            username: 'wanderer',
            displayName: 'Desert Wanderer',
            avatarUrl: null,
            isVerified: false,
        },
        likesCount: 89,
        commentsCount: 12,
        sharesCount: 5,
        isLiked: false,
        isSaved: true,
    },
];

// GET /api/v1/posts/feed
router.get('/feed', authenticate, async (req: AuthRequest, res, next) => {
    try {
        // Now always fetch real posts from database (demo posts used only as fallback)

        const { cursor, limit = '10', type = 'foryou' } = req.query;

        let whereClause: any = { isPublic: true };

        if (type === 'following') {
            // Get posts from users the current user follows
            let following;
            try {
                following = await prisma.follow.findMany({
                    where: { followerId: req.userId },
                    select: { followingId: true },
                });
            } catch (dbError) {
                console.error('Database error:', dbError);
                return res.json({ posts: DEMO_POSTS, nextCursor: null });
            }

            whereClause = {
                ...whereClause,
                userId: { in: following.map((f) => f.followingId) },
            };
        }

        let posts;
        try {
            posts = await prisma.post.findMany({
                where: whereClause,
                take: parseInt(limit as string) + 1,
                ...(cursor && { cursor: { id: cursor as string }, skip: 1 }),
                orderBy: [
                    { viewCount: 'desc' },
                    { createdAt: 'desc' },
                ],
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            displayName: true,
                            avatarUrl: true,
                            isVerified: true,
                        },
                    },
                    music: {
                        select: {
                            id: true,
                            title: true,
                            artist: true,
                            coverUrl: true,
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
        } catch (dbError) {
            console.error('Database error:', dbError);
            return res.json({ posts: DEMO_POSTS, nextCursor: null });
        }

        const hasMore = posts.length > parseInt(limit as string);
        const results = hasMore ? posts.slice(0, -1) : posts;

        // Check if current user liked/saved posts
        const [likes, saves] = await Promise.all([
            prisma.like.findMany({
                where: { userId: req.userId, postId: { in: results.map((p) => p.id) } },
            }),
            prisma.save.findMany({
                where: { userId: req.userId, postId: { in: results.map((p) => p.id) } },
            }),
        ]).catch(() => [[], []]);

        const likedPostIds = new Set(likes.map((l) => l.postId));
        const savedPostIds = new Set(saves.map((s) => s.postId));

        res.json({
            posts: results.map((post) => ({
                ...post,
                likesCount: post._count.likes,
                commentsCount: post._count.comments,
                sharesCount: post._count.shares,
                isLiked: likedPostIds.has(post.id),
                isSaved: savedPostIds.has(post.id),
            })),
            nextCursor: hasMore ? results[results.length - 1].id : null,
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/posts/:postId
router.get('/:postId', optionalAuth, async (req: AuthRequest, res, next) => {
    try {
        const { postId } = req.params;

        const post = await prisma.post.update({
            where: { id: postId },
            data: { viewCount: { increment: 1 } },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        isVerified: true,
                    },
                },
                music: true,
                _count: {
                    select: {
                        likes: true,
                        comments: true,
                        shares: true,
                    },
                },
            },
        });

        if (!post) {
            throw new AppError('Post not found', 404);
        }

        let isLiked = false;
        let isSaved = false;

        if (req.userId) {
            const [like, save] = await Promise.all([
                prisma.like.findUnique({
                    where: { userId_postId: { userId: req.userId, postId } },
                }),
                prisma.save.findUnique({
                    where: { userId_postId: { userId: req.userId, postId } },
                }),
            ]);

            isLiked = !!like;
            isSaved = !!save;
        }

        res.json({
            ...post,
            likesCount: post._count.likes,
            commentsCount: post._count.comments,
            sharesCount: post._count.shares,
            isLiked,
            isSaved,
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/posts
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const createSchema = z.object({
            type: z.enum(['IMAGE', 'VIDEO', 'TEXT', 'POLL']),
            caption: z.string().max(2200).optional(),
            mediaUrl: z.string().url().optional(),
            thumbnailUrl: z.string().url().optional(),
            duration: z.number().optional(),
            musicId: z.string().optional(),
            communityId: z.string().optional(),
            isPublic: z.boolean().optional(),
        });

        const data = createSchema.parse(req.body);

        // Extract hashtags from caption
        const hashtags = data.caption?.match(/#\w+/g) || [];

        const post = await prisma.post.create({
            data: {
                userId: req.userId!,
                ...data,
            },
            include: {
                user: {
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

        // Process hashtags
        for (const tag of hashtags) {
            const tagName = tag.slice(1).toLowerCase();

            const hashtag = await prisma.hashtag.upsert({
                where: { name: tagName },
                update: { usageCount: { increment: 1 } },
                create: { name: tagName, usageCount: 1 },
            });

            await prisma.postHashtag.create({
                data: { postId: post.id, hashtagId: hashtag.id },
            });
        }

        res.status(201).json(post);
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/posts/:postId
router.delete('/:postId', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { postId } = req.params;

        const post = await prisma.post.findUnique({
            where: { id: postId },
        });

        if (!post) {
            throw new AppError('Post not found', 404);
        }

        if (post.userId !== req.userId) {
            throw new AppError('Not authorized', 403);
        }

        await prisma.post.delete({
            where: { id: postId },
        });

        res.json({ deleted: true });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/posts/:postId/like
router.post('/:postId/like', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { postId } = req.params;

        const post = await prisma.post.findUnique({
            where: { id: postId },
        });

        if (!post) {
            throw new AppError('Post not found', 404);
        }

        await prisma.like.create({
            data: {
                userId: req.userId!,
                postId,
            },
        });

        // Create notification if not own post
        if (post.userId !== req.userId) {
            await prisma.notification.create({
                data: {
                    userId: post.userId,
                    type: 'LIKE',
                    actorId: req.userId,
                    targetId: postId,
                    message: 'liked your post',
                },
            });
        }

        res.json({ liked: true });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/posts/:postId/like
router.delete('/:postId/like', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { postId } = req.params;

        await prisma.like.delete({
            where: {
                userId_postId: {
                    userId: req.userId!,
                    postId,
                },
            },
        }).catch(() => { });

        res.json({ liked: false });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/posts/:postId/save
router.post('/:postId/save', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { postId } = req.params;

        await prisma.save.create({
            data: {
                userId: req.userId!,
                postId,
            },
        });

        res.json({ saved: true });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/posts/:postId/save
router.delete('/:postId/save', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { postId } = req.params;

        await prisma.save.delete({
            where: {
                userId_postId: {
                    userId: req.userId!,
                    postId,
                },
            },
        }).catch(() => { });

        res.json({ saved: false });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/posts/:postId/comments
router.get('/:postId/comments', optionalAuth, async (req: AuthRequest, res, next) => {
    try {
        const { postId } = req.params;
        const { cursor, limit = '20' } = req.query;

        const comments = await prisma.comment.findMany({
            where: { postId, parentId: null },
            take: parseInt(limit as string) + 1,
            ...(cursor && { cursor: { id: cursor as string }, skip: 1 }),
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        isVerified: true,
                    },
                },
                _count: {
                    select: { replies: true },
                },
            },
        });

        const hasMore = comments.length > parseInt(limit as string);
        const results = hasMore ? comments.slice(0, -1) : comments;

        res.json({
            comments: results.map((c) => ({
                ...c,
                repliesCount: c._count.replies,
            })),
            nextCursor: hasMore ? results[results.length - 1].id : null,
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/posts/:postId/comments
router.post('/:postId/comments', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { postId } = req.params;

        const commentSchema = z.object({
            content: z.string().min(1).max(500),
            parentId: z.string().optional(),
        });

        const { content, parentId } = commentSchema.parse(req.body);

        const post = await prisma.post.findUnique({
            where: { id: postId },
        });

        if (!post) {
            throw new AppError('Post not found', 404);
        }

        const comment = await prisma.comment.create({
            data: {
                postId,
                userId: req.userId!,
                content,
                parentId,
            },
            include: {
                user: {
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

        // Create notification
        if (post.userId !== req.userId) {
            await prisma.notification.create({
                data: {
                    userId: post.userId,
                    type: 'COMMENT',
                    actorId: req.userId,
                    targetId: postId,
                    message: 'commented on your post',
                },
            });
        }

        res.status(201).json(comment);
    } catch (error) {
        next(error);
    }
});

export { router as postsRouter };
