import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { cache } from '../services/cache/RedisCache.js';

const router = Router();

// GET /api/v1/posts - List all public posts (no auth required)
router.get('/', optionalAuth, async (req: AuthRequest, res, next) => {
    try {
        const { cursor, limit = '20' } = req.query;

        const posts = await prisma.post.findMany({
            where: { isPublic: true },
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
                    select: {
                        likes: true,
                        comments: true,
                    },
                },
            },
        });

        const hasMore = posts.length > parseInt(limit as string);
        const results = hasMore ? posts.slice(0, -1) : posts;

        res.json({
            posts: results.map((post) => ({
                ...post,
                likesCount: post._count.likes,
                commentsCount: post._count.comments,
            })),
            nextCursor: hasMore ? results[results.length - 1]?.id : null,
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/posts/feed
router.get('/feed', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { cursor, limit = '10', type = 'foryou' } = req.query;

        // Create cache key based on user, pagination, and type
        const cacheKey = `feed:${req.userId}:${type}:${cursor || 'initial'}:${limit}`;

        // Try cache first (only for initial page, no cursor)
        if (!cursor) {
            const cached = await cache.get(cacheKey);
            if (cached) {
                return res.json(cached);
            }
        }

        // Check if user is a "new user" (has no follows)
        const followCount = await prisma.follow.count({
            where: { followerId: req.userId },
        });
        const isNewUser = followCount === 0;

        console.log(`[Feed] User ${req.userId} follow count: ${followCount}, isNewUser: ${isNewUser}`);

        // Fetch real posts from database
        let whereClause: any = {
            isPublic: true, // Always show public posts
        };

        if (type === 'following') {
            // Get posts from users the current user follows
            let following;
            try {
                following = await prisma.follow.findMany({
                    where: { followerId: req.userId },
                    select: { followingId: true },
                });
            } catch (dbError) {
                console.error('Database error fetching following:', dbError);
                throw new AppError('Failed to load feed', 503);
            }

            if (following.length === 0) {
                // No follows yet - show all public posts instead of empty feed
                console.log('[Feed] User has no follows, showing all public posts for "following" tab');
                whereClause = { isPublic: true };
            } else {
                whereClause = {
                    isPublic: true,
                    userId: { in: following.map((f) => f.followingId) },
                };
            }
        }

        let posts;
        try {
            // For "For You" feed, fetch more posts to rank them intelligently
            const fetchLimit = type === 'foryou'
                ? parseInt(limit as string) * 3  // Fetch 3x to have pool for ranking
                : parseInt(limit as string) + 1;

            posts = await prisma.post.findMany({
                where: whereClause,
                take: fetchLimit,
                ...(cursor && { cursor: { id: cursor as string }, skip: 1 }),
                orderBy: [
                    { isPinned: 'desc' },
                    { createdAt: 'desc' }, // Get recent posts first, then rank by engagement
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

            console.log(`[Feed] Fetched ${posts.length} posts for user ${req.userId}`);
        } catch (dbError) {
            console.error('Database error fetching posts:', dbError);
            throw new AppError('Failed to load posts', 503);
        }

        // Smart ranking algorithm for "For You" feed
        if (type === 'foryou' && !cursor) {
            const now = Date.now();
            const oneDayMs = 24 * 60 * 60 * 1000;

            // Calculate engagement score for each post
            const rankedPosts = posts.map(post => {
                const engagementScore =
                    (post._count.likes * 3) +      // Likes worth 3 points
                    (post._count.comments * 5) +   // Comments worth 5 points (higher engagement)
                    (post._count.shares * 7);      // Shares worth 7 points (viral signal)

                // Recency boost: posts under 24h get 3x multiplier
                const postAge = now - new Date(post.createdAt).getTime();
                const recencyBoost = postAge < oneDayMs ? 3 : 1;

                // Pinned posts always show first
                const pinnedBoost = post.isPinned ? 10000 : 0;

                // NEW USER BOOST: If user is new, boost all posts slightly
                // This ensures they see a vibrant feed even with low engagement
                const newUserBoost = isNewUser ? 1.5 : 1;

                const finalScore = pinnedBoost + (engagementScore * recencyBoost * newUserBoost);

                return {
                    ...post,
                    _engagementScore: finalScore
                };
            });

            // Sort by engagement score
            rankedPosts.sort((a, b) => b._engagementScore - a._engagementScore);

            // Take only the requested limit
            posts = rankedPosts.slice(0, parseInt(limit as string) + 1);
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

        const response = {
            posts: results.map((post) => ({
                ...post,
                likesCount: post._count.likes,
                commentsCount: post._count.comments,
                sharesCount: post._count.shares,
                isLiked: likedPostIds.has(post.id),
                isSaved: savedPostIds.has(post.id),
                // Remove internal ranking score
                _engagementScore: undefined,
            })),
            nextCursor: hasMore ? results[results.length - 1].id : null,
        };

        console.log(`[Feed] Returning ${response.posts.length} posts to user ${req.userId}`);

        // Cache the initial page for 30 seconds
        if (!cursor) {
            await cache.set(cacheKey, response, 30);
        }

        res.json(response);
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/posts/:postId
router.get('/:postId', optionalAuth, async (req: AuthRequest, res, next) => {
    try {
        const { postId } = req.params;

        // First check if post exists
        const post = await prisma.post.findUnique({
            where: { id: postId },
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
                        rsvps: true,
                    },
                },
            },
        });

        if (!post) {
            throw new AppError('Post not found', 404);
        }

        // Increment view count in background (don't wait)
        prisma.post.update({
            where: { id: postId },
            data: { viewCount: { increment: 1 } },
        }).catch(() => { }); // Silently ignore if update fails

        let isLiked = false;
        let isSaved = false;
        let isRsvped = false;

        if (req.userId) {
            const [like, save, rsvp] = await Promise.all([
                prisma.like.findUnique({
                    where: { userId_postId: { userId: req.userId, postId } },
                }),
                prisma.save.findUnique({
                    where: { userId_postId: { userId: req.userId, postId } },
                }),
                prisma.postRSVP.findUnique({
                    where: { userId_postId: { userId: req.userId, postId } },
                }),
            ]);

            isLiked = !!like;
            isSaved = !!save;
            isRsvped = !!rsvp;
        }

        res.json({
            ...post,
            likesCount: post._count.likes,
            commentsCount: post._count.comments,
            sharesCount: post._count.shares,
            rsvpCount: post._count.rsvps,
            isLiked,
            isSaved,
            isRsvped,
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/posts
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const createSchema = z.object({
            type: z.enum(['IMAGE', 'VIDEO', 'TEXT', 'POLL', 'RALLY']),
            caption: z.string().max(2200).optional(),
            mediaUrl: z.string().url().optional(),
            thumbnailUrl: z.string().url().optional(),
            duration: z.number().optional(),
            musicId: z.string().optional(),
            communityId: z.string().optional(),
            isPublic: z.boolean().optional(),
            topicIds: z.array(z.string()).max(3).optional(), // Max 3 topics
        });

        const data = createSchema.parse(req.body);
        const { topicIds, ...postData } = data;

        // Extract hashtags from caption
        const hashtags = data.caption?.match(/#\w+/g) || [];

        const post = await prisma.post.create({
            data: {
                userId: req.userId!,
                ...postData,
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

        // Process topics
        if (topicIds && topicIds.length > 0) {
            await Promise.all(
                topicIds.map(async (topicId) => {
                    // Create PostTopic relation
                    await prisma.postTopic.create({
                        data: { postId: post.id, topicId },
                    });

                    // Increment topic postCount
                    await prisma.topic.update({
                        where: { id: topicId },
                        data: { postCount: { increment: 1 } },
                    });
                })
            );
        }

        // Invalidate feed cache for user and their followers
        await cache.invalidate(`feed:${req.userId}:*`);

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

        // Allow deletion if user owns the post OR is an admin/moderator
        const userRole = req.user?.role;
        const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN' || userRole === 'MODERATOR';

        if (post.userId !== req.userId && !isAdmin) {
            throw new AppError('Not authorized', 403);
        }

        await prisma.post.delete({
            where: { id: postId },
        });

        // Invalidate feed cache
        await cache.invalidate(`feed:${post.userId}:*`);

        res.json({ deleted: true, moderatorAction: isAdmin && post.userId !== req.userId });
    } catch (error) {
        next(error);
    }
});

// PUT /api/v1/posts/:postId - Edit post (owner only)
router.put('/:postId', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { postId } = req.params;

        const updateSchema = z.object({
            caption: z.string().max(2200).optional(),
        });

        const { caption } = updateSchema.parse(req.body);

        const post = await prisma.post.findUnique({
            where: { id: postId },
        });

        if (!post) {
            throw new AppError('Post not found', 404);
        }

        const userRole = req.user?.role;
        const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN' || userRole === 'MODERATOR';

        if (post.userId !== req.userId && !isAdmin) {
            throw new AppError('Not authorized to edit this post', 403);
        }

        const updatedPost = await prisma.post.update({
            where: { id: postId },
            data: { caption },
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

        res.json(updatedPost);
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/posts/:postId/rsvp - Mark "I'm In"
router.post('/:postId/rsvp', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { postId } = req.params;
        const statusSchema = z.object({
            status: z.enum(['IN', 'MAYBE', 'OUT']).optional().default('IN'),
        });

        const { status } = statusSchema.parse(req.body);

        const post = await prisma.post.findUnique({
            where: { id: postId },
        });

        if (!post) {
            throw new AppError('Post not found', 404);
        }

        const rsvp = await prisma.postRSVP.upsert({
            where: {
                userId_postId: {
                    userId: req.userId!,
                    postId,
                },
            },
            update: { status },
            create: {
                userId: req.userId!,
                postId,
                status,
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

        // Get updated RSVP count
        const rsvpCount = await prisma.postRSVP.count({
            where: { postId, status: 'IN' },
        });

        res.json({ rsvp, rsvpCount, isRsvped: true });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/posts/:postId/rsvp - Remove RSVP
router.delete('/:postId/rsvp', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { postId } = req.params;

        await prisma.postRSVP.delete({
            where: {
                userId_postId: {
                    userId: req.userId!,
                    postId,
                },
            },
        }).catch(() => { });

        const rsvpCount = await prisma.postRSVP.count({
            where: { postId, status: 'IN' },
        });

        res.json({ rsvpCount, isRsvped: false });
    } catch (error) {
        next(error);
    }
});

// PUT /api/v1/posts/:postId/comments/:commentId - Edit comment
router.put('/:postId/comments/:commentId', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { commentId } = req.params;

        const updateSchema = z.object({
            content: z.string().min(1).max(500),
        });

        const { content } = updateSchema.parse(req.body);

        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
        });

        if (!comment) {
            throw new AppError('Comment not found', 404);
        }

        const userRole = req.user?.role;
        const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN' || userRole === 'MODERATOR';

        if (comment.userId !== req.userId && !isAdmin) {
            throw new AppError('Not authorized to edit this comment', 403);
        }

        const updatedComment = await prisma.comment.update({
            where: { id: commentId },
            data: { content },
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

        res.json(updatedComment);
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/posts/:postId/comments/:commentId - Delete comment
router.delete('/:postId/comments/:commentId', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { postId, commentId } = req.params;

        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
        });

        if (!comment) {
            throw new AppError('Comment not found', 404);
        }

        // Get the post to check ownership
        const post = await prisma.post.findUnique({ where: { id: postId } });

        // Allow deletion if user owns the comment, owns the post, or is admin
        const userRole = req.user?.role;
        const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN' || userRole === 'MODERATOR';
        const isCommentOwner = comment.userId === req.userId;
        const isPostOwner = post?.userId === req.userId;

        if (!isCommentOwner && !isPostOwner && !isAdmin) {
            throw new AppError('Not authorized to delete this comment', 403);
        }

        await prisma.comment.delete({
            where: { id: commentId },
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
