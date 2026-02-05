import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/users - List all users
router.get('/', optionalAuth, async (req: AuthRequest, res, next) => {
    try {
        const { cursor, limit = '20', search } = req.query;

        console.log(`[Users List] Cursor: ${cursor}, Limit: ${limit}, Search: "${search}", UserId: ${req.userId}`);

        const users = await prisma.user.findMany({
            where: search ? {
                OR: [
                    { username: { contains: search as string, mode: 'insensitive' } },
                    { displayName: { contains: search as string, mode: 'insensitive' } },
                ]
            } : undefined,
            take: parseInt(limit as string) + 1,
            ...(cursor && { cursor: { id: cursor as string }, skip: 1 }),
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                username: true,
                displayName: true,
                bio: true,
                avatarUrl: true,
                isVerified: true,
                _count: {
                    select: { followers: true },
                },
            },
        });

        console.log(`[Users List] Found ${users.length} users`);

        const hasMore = users.length > parseInt(limit as string);
        const results = hasMore ? users.slice(0, -1) : users;

        let followingIds = new Set<string>();
        if (req.userId) {
            const follows = await prisma.follow.findMany({
                where: {
                    followerId: req.userId,
                    followingId: { in: results.map((u) => u.id) },
                },
                select: { followingId: true },
            });
            followingIds = new Set(follows.map((f) => f.followingId));
        }

        res.json({
            users: results.map((u) => ({
                ...u,
                followersCount: u._count.followers,
                isFollowing: followingIds.has(u.id),
            })),
            nextCursor: hasMore ? results[results.length - 1].id : null,
        });
    } catch (error) {
        console.error('[Users List] Error:', error);
        next(error);
    }
});

// GET /api/v1/users/search - Search users by name or username
router.get('/search', optionalAuth, async (req: AuthRequest, res, next) => {
    try {
        const { q, limit = '20' } = req.query;

        console.log(`[User Search] Query: "${q}", UserId: ${req.userId}`);

        // If no search query, return all users (for new user discovery)
        if (!q || typeof q !== 'string' || q.trim() === '') {
            console.log('[User Search] No query - returning all users');
            const users = await prisma.user.findMany({
                take: parseInt(limit as string),
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    username: true,
                    displayName: true,
                    bio: true,
                    avatarUrl: true,
                    isVerified: true,
                    _count: {
                        select: { followers: true },
                    },
                },
            });

            let followingIds = new Set<string>();
            if (req.userId && users.length > 0) {
                const follows = await prisma.follow.findMany({
                    where: {
                        followerId: req.userId,
                        followingId: { in: users.map((u) => u.id) },
                    },
                    select: { followingId: true },
                });
                followingIds = new Set(follows.map((f) => f.followingId));
            }

            console.log(`[User Search] Returning ${users.length} users`);

            return res.json({
                users: users.map((u) => ({
                    ...u,
                    followersCount: u._count.followers,
                    isFollowing: followingIds.has(u.id),
                })),
            });
        }

        const searchTerm = q.toLowerCase();
        console.log(`[User Search] Searching for: "${searchTerm}"`);

        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { username: { contains: searchTerm, mode: 'insensitive' } },
                    { displayName: { contains: searchTerm, mode: 'insensitive' } },
                ],
            },
            take: parseInt(limit as string),
            select: {
                id: true,
                username: true,
                displayName: true,
                bio: true,
                avatarUrl: true,
                isVerified: true,
                _count: {
                    select: { followers: true },
                },
            },
        });

        console.log(`[User Search] Found ${users.length} users matching "${searchTerm}"`);

        let followingIds = new Set<string>();
        if (req.userId && users.length > 0) {
            const follows = await prisma.follow.findMany({
                where: {
                    followerId: req.userId,
                    followingId: { in: users.map((u) => u.id) },
                },
                select: { followingId: true },
            });
            followingIds = new Set(follows.map((f) => f.followingId));
        }

        res.json({
            users: users.map((u) => ({
                ...u,
                followersCount: u._count.followers,
                isFollowing: followingIds.has(u.id),
            })),
        });
    } catch (error) {
        console.error('[User Search] Error:', error);
        next(error);
    }
});

// GET /api/v1/users/:username
router.get('/:username', optionalAuth, async (req: AuthRequest, res, next) => {
    try {
        const { username } = req.params;

        const user = await prisma.user.findUnique({
            where: { username: username.toLowerCase() },
            select: {
                id: true,
                username: true,
                displayName: true,
                displayNameSecondary: true,
                secondaryLanguage: true,
                bio: true,
                website: true,
                avatarUrl: true,
                coverUrl: true,
                isVerified: true,
                isPrivate: true,
                createdAt: true,
                _count: {
                    select: {
                        followers: true,
                        following: true,
                        posts: true,
                    },
                },
            },
        });

        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Check if current user follows this user
        let isFollowing = false;
        if (req.userId && req.userId !== user.id) {
            const follow = await prisma.follow.findUnique({
                where: {
                    followerId_followingId: {
                        followerId: req.userId,
                        followingId: user.id,
                    },
                },
            });
            isFollowing = !!follow;
        }

        res.json({
            ...user,
            followersCount: user._count.followers,
            followingCount: user._count.following,
            postsCount: user._count.posts,
            isFollowing,
            isOwnProfile: req.userId === user.id,
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/v1/users/profile
router.put('/profile', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const updateSchema = z.object({
            username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/).optional(),
            displayName: z.string().min(1).max(50).optional(),
            displayNameSecondary: z.string().max(100).nullable().optional(), // Secondary language name
            secondaryLanguage: z.string().max(5).nullable().optional(),      // Language code (ar, zh, hi, etc.)
            bio: z.string().max(300).optional(),
            website: z.string().url().optional().or(z.literal('')),
            avatarUrl: z.string().url().optional(),
            coverUrl: z.string().url().optional(),
            isPrivate: z.boolean().optional(),
        });

        const data = updateSchema.parse(req.body);

        const user = await prisma.user.update({
            where: { id: req.userId },
            data,
            select: {
                id: true,
                username: true,
                displayName: true,
                displayNameSecondary: true,
                secondaryLanguage: true,
                bio: true,
                website: true,
                avatarUrl: true,
                coverUrl: true,
                isPrivate: true,
            },
        });

        res.json(user);
    } catch (error) {
        next(error);
    }
});

// PUT /api/v1/users/:userId - Admin update user
router.put('/:userId', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { userId } = req.params;
        const userRole = req.user?.role;
        const isAdmin = userRole === 'SUPERADMIN' || userRole === 'ADMIN';

        // Allow update if Admin OR if updating self
        if (!isAdmin && userId !== req.userId) {
            throw new AppError('Not authorized', 403);
        }

        const updateSchema = z.object({
            displayName: z.string().min(1).max(50).optional(),
            displayNameSecondary: z.string().max(100).nullable().optional(),
            secondaryLanguage: z.string().max(5).nullable().optional(),
            bio: z.string().max(1000).optional(),
            website: z.string().optional().or(z.literal('')),
            avatarUrl: z.string().optional(),
            coverUrl: z.string().optional(),
            isVerified: z.boolean().optional(),
            role: z.enum(['USER', 'MODERATOR', 'ADMIN', 'SUPERADMIN']).optional(),
        });

        const data = updateSchema.parse(req.body);

        if (data.role === 'SUPERADMIN' && userRole !== 'SUPERADMIN') {
            throw new AppError('Only Superadmins can promote users to Superadmin', 403);
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data,
            select: {
                id: true,
                username: true,
                displayName: true,
                bio: true,
                avatarUrl: true,
                isVerified: true,
                role: true,
            },
        });

        res.json(user);
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/users/:userId/follow
router.post('/:userId/follow', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { userId } = req.params;

        if (userId === req.userId) {
            throw new AppError('Cannot follow yourself', 400);
        }

        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!targetUser) {
            throw new AppError('User not found', 404);
        }

        await prisma.follow.create({
            data: {
                followerId: req.userId!,
                followingId: userId,
            },
        });

        // Create notification
        await prisma.notification.create({
            data: {
                userId: userId,
                type: 'FOLLOW',
                actorId: req.userId,
                message: `started following you`,
            },
        });

        res.json({ following: true });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/users/:userId/follow
router.delete('/:userId/follow', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { userId } = req.params;

        await prisma.follow.delete({
            where: {
                followerId_followingId: {
                    followerId: req.userId!,
                    followingId: userId,
                },
            },
        }).catch(() => { });

        res.json({ following: false });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/users/:userId/followers
router.get('/:userId/followers', optionalAuth, async (req: AuthRequest, res, next) => {
    try {
        const { userId } = req.params;
        const { cursor, limit = '20' } = req.query;

        const followers = await prisma.follow.findMany({
            where: { followingId: userId },
            take: parseInt(limit as string) + 1,
            ...(cursor && { cursor: { id: cursor as string }, skip: 1 }),
            orderBy: { createdAt: 'desc' },
            include: {
                follower: {
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

        const hasMore = followers.length > parseInt(limit as string);
        const results = hasMore ? followers.slice(0, -1) : followers;

        res.json({
            followers: results.map((f) => f.follower),
            nextCursor: hasMore ? results[results.length - 1].id : null,
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/users/:userId/following
router.get('/:userId/following', optionalAuth, async (req: AuthRequest, res, next) => {
    try {
        const { userId } = req.params;
        const { cursor, limit = '20' } = req.query;

        const following = await prisma.follow.findMany({
            where: { followerId: userId },
            take: parseInt(limit as string) + 1,
            ...(cursor && { cursor: { id: cursor as string }, skip: 1 }),
            orderBy: { createdAt: 'desc' },
            include: {
                following: {
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

        const hasMore = following.length > parseInt(limit as string);
        const results = hasMore ? following.slice(0, -1) : following;

        res.json({
            following: results.map((f) => f.following),
            nextCursor: hasMore ? results[results.length - 1].id : null,
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/users/:userId/posts
router.get('/:userId/posts', optionalAuth, async (req: AuthRequest, res, next) => {
    try {
        const { userId } = req.params;
        const { cursor, limit = '20' } = req.query;

        // Show all posts if viewing own profile, otherwise only public
        const isOwnProfile = req.userId === userId;
        const whereClause = isOwnProfile
            ? { userId }
            : { userId, isPublic: true };

        const posts = await prisma.post.findMany({
            where: whereClause,
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
                        shares: true,
                    },
                },
            },
        });

        const hasMore = posts.length > parseInt(limit as string);
        const results = hasMore ? posts.slice(0, -1) : posts;

        // Check if current user liked/saved posts
        let likedPostIds: string[] = [];
        let savedPostIds: string[] = [];

        if (req.userId) {
            const [likes, saves] = await Promise.all([
                prisma.like.findMany({
                    where: { userId: req.userId, postId: { in: results.map((p) => p.id) } },
                }),
                prisma.save.findMany({
                    where: { userId: req.userId, postId: { in: results.map((p) => p.id) } },
                }),
            ]);

            likedPostIds = likes.map((l) => l.postId);
            savedPostIds = saves.map((s) => s.postId);
        }

        res.json({
            posts: results.map((post) => ({
                ...post,
                likesCount: post._count.likes,
                commentsCount: post._count.comments,
                sharesCount: post._count.shares,
                isLiked: likedPostIds.includes(post.id),
                isSaved: savedPostIds.includes(post.id),
            })),
            nextCursor: hasMore ? results[results.length - 1].id : null,
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/users/:id/wave - Send a wave/greeting
router.post('/:id/wave', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { id } = req.params;
        const senderId = req.userId!;
        const { message = 'waved at you! 👋' } = req.body;

        if (id === senderId) {
            throw new AppError('Cannot wave at yourself', 400);
        }

        const targetUser = await prisma.user.findUnique({
            where: { id }
        });

        if (!targetUser) {
            throw new AppError('User not found', 404);
        }

        // Create notification
        await prisma.notification.create({
            data: {
                userId: id,
                actorId: senderId,
                type: 'WAVE' as any,
                message: message,
            }
        });

        res.json({ success: true, message: 'Wave sent!' });
    } catch (error) {
        next(error);
    }
});

export { router as usersRouter };
