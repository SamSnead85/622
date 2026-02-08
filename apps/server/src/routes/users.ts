import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ── Privacy helper: mask user identity if they use a public profile ──
function maskUserForDiscovery(u: any) {
    if (u.usePublicProfile) {
        return {
            id: u.id,
            username: u.publicUsername || u.username,
            displayName: u.publicDisplayName || u.displayName,
            bio: u.publicBio || u.bio,
            avatarUrl: u.publicAvatarUrl || u.avatarUrl,
            isVerified: u.isVerified,
        };
    }
    // Strip privacy fields
    const { usePublicProfile, publicDisplayName, publicUsername, publicAvatarUrl, publicBio, communityOptIn, ...clean } = u;
    return clean;
}

// GET /api/v1/users - List all users (only community-opted-in users are discoverable)
router.get('/', optionalAuth, async (req: AuthRequest, res, next) => {
    try {
        const { cursor, limit = '20', search } = req.query;

        const users = await prisma.user.findMany({
            where: {
                isGroupOnly: false,
                communityOptIn: true, // Privacy-first: only show users who joined the community
                ...(search ? {
                    OR: [
                        { username: { contains: search as string, mode: 'insensitive' } },
                        { displayName: { contains: search as string, mode: 'insensitive' } },
                        // Also search by public username/name
                        { publicUsername: { contains: search as string, mode: 'insensitive' } },
                        { publicDisplayName: { contains: search as string, mode: 'insensitive' } },
                    ]
                } : {}),
            },
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
                usePublicProfile: true,
                publicDisplayName: true,
                publicUsername: true,
                publicAvatarUrl: true,
                publicBio: true,
                communityOptIn: true,
                _count: {
                    select: { followers: true },
                },
            },
        });

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
                ...maskUserForDiscovery(u),
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
// Privacy-first: only users who opted into the community are searchable
router.get('/search', optionalAuth, async (req: AuthRequest, res, next) => {
    try {
        const { q, limit = '20' } = req.query;

        const privacySelect = {
            id: true,
            username: true,
            displayName: true,
            bio: true,
            avatarUrl: true,
            isVerified: true,
            usePublicProfile: true,
            publicDisplayName: true,
            publicUsername: true,
            publicAvatarUrl: true,
            publicBio: true,
            communityOptIn: true,
            _count: {
                select: { followers: true },
            },
        };

        // If no search query, return discoverable users
        if (!q || typeof q !== 'string' || q.trim() === '') {
            const users = await prisma.user.findMany({
                where: { isGroupOnly: false, communityOptIn: true },
                take: parseInt(limit as string),
                orderBy: { createdAt: 'desc' },
                select: privacySelect,
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

            return res.json({
                users: users.map((u) => ({
                    ...maskUserForDiscovery(u),
                    followersCount: u._count.followers,
                    isFollowing: followingIds.has(u.id),
                })),
            });
        }

        const searchTerm = q.toLowerCase();

        const users = await prisma.user.findMany({
            where: {
                isGroupOnly: false,
                communityOptIn: true, // Privacy-first: only searchable if opted in
                OR: [
                    { username: { contains: searchTerm, mode: 'insensitive' } },
                    { displayName: { contains: searchTerm, mode: 'insensitive' } },
                    { publicUsername: { contains: searchTerm, mode: 'insensitive' } },
                    { publicDisplayName: { contains: searchTerm, mode: 'insensitive' } },
                ],
            },
            take: parseInt(limit as string),
            select: privacySelect,
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

        res.json({
            users: users.map((u) => ({
                ...maskUserForDiscovery(u),
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

        // Try to find by real username or public username
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { username: username.toLowerCase() },
                    { publicUsername: username.toLowerCase() },
                ],
            },
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
                communityOptIn: true,
                usePublicProfile: true,
                publicDisplayName: true,
                publicUsername: true,
                publicAvatarUrl: true,
                publicBio: true,
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

        const isOwnProfile = req.userId === user.id;

        // Privacy wall: if user hasn't opted into community and this isn't their own profile,
        // they are invisible — return 404 as if they don't exist
        if (!user.communityOptIn && !isOwnProfile) {
            // Check if the viewer is in the same community as this user
            // (community/group members CAN see each other)
            const sharedCommunity = req.userId ? await prisma.communityMember.findFirst({
                where: {
                    userId: req.userId,
                    community: {
                        members: { some: { userId: user.id } },
                    },
                },
            }) : null;

            // Also allow if the viewer follows this user
            const isFollower = req.userId ? await prisma.follow.findUnique({
                where: {
                    followerId_followingId: {
                        followerId: req.userId,
                        followingId: user.id,
                    },
                },
            }) : null;

            if (!sharedCommunity && !isFollower) {
                throw new AppError('User not found', 404);
            }
        }

        // Check if current user follows this user
        let isFollowing = false;
        if (req.userId && !isOwnProfile) {
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

        // Apply public profile masking when viewed from community context
        // (if user uses public profile and viewer is not the user themselves and not a group member)
        const shouldMask = user.usePublicProfile && !isOwnProfile;

        const profileData = shouldMask ? {
            id: user.id,
            username: user.publicUsername || user.username,
            displayName: user.publicDisplayName || user.displayName,
            bio: user.publicBio || user.bio,
            avatarUrl: user.publicAvatarUrl || user.avatarUrl,
            coverUrl: user.coverUrl,
            isVerified: user.isVerified,
            isPrivate: user.isPrivate,
            createdAt: user.createdAt,
        } : {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            displayNameSecondary: user.displayNameSecondary,
            secondaryLanguage: user.secondaryLanguage,
            bio: user.bio,
            website: user.website,
            avatarUrl: user.avatarUrl,
            coverUrl: user.coverUrl,
            isVerified: user.isVerified,
            isPrivate: user.isPrivate,
            createdAt: user.createdAt,
        };

        res.json({
            ...profileData,
            followersCount: user._count.followers,
            followingCount: user._count.following,
            postsCount: user._count.posts,
            isFollowing,
            isOwnProfile,
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

// ── Privacy-First: Community Opt-In & Public Profile Management ──

// POST /api/v1/users/community-opt-in - Join (or leave) the larger community
router.post('/community-opt-in', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const schema = z.object({
            optIn: z.boolean(),
            // When opting in, optionally set up a public profile in the same request
            usePublicProfile: z.boolean().optional(),
            publicDisplayName: z.string().min(1).max(50).optional(),
            publicUsername: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/).optional(),
            publicAvatarUrl: z.string().url().optional(),
            publicBio: z.string().max(300).optional(),
        });
        const data = schema.parse(req.body);

        // If setting a public username, verify it's available
        if (data.publicUsername) {
            const existing = await prisma.user.findFirst({
                where: {
                    OR: [
                        { username: data.publicUsername },
                        { publicUsername: data.publicUsername },
                    ],
                    NOT: { id: req.userId },
                },
            });
            if (existing) {
                throw new AppError('Public username is already taken', 409);
            }
        }

        const user = await prisma.user.update({
            where: { id: req.userId },
            data: {
                communityOptIn: data.optIn,
                activeFeedView: data.optIn ? 'community' : 'private', // Switch view on opt-in
                ...(data.usePublicProfile !== undefined && { usePublicProfile: data.usePublicProfile }),
                ...(data.publicDisplayName !== undefined && { publicDisplayName: data.publicDisplayName }),
                ...(data.publicUsername !== undefined && { publicUsername: data.publicUsername }),
                ...(data.publicAvatarUrl !== undefined && { publicAvatarUrl: data.publicAvatarUrl }),
                ...(data.publicBio !== undefined && { publicBio: data.publicBio }),
                // If opting out, clear public profile preference but keep the data
                ...(!data.optIn && { activeFeedView: 'private' }),
            },
            select: {
                id: true,
                communityOptIn: true,
                activeFeedView: true,
                usePublicProfile: true,
                publicDisplayName: true,
                publicUsername: true,
                publicAvatarUrl: true,
                publicBio: true,
            },
        });

        res.json(user);
    } catch (error) {
        next(error);
    }
});

// PUT /api/v1/users/public-profile - Update public persona
router.put('/public-profile', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const schema = z.object({
            usePublicProfile: z.boolean().optional(),
            publicDisplayName: z.string().min(1).max(50).optional(),
            publicUsername: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/).optional(),
            publicAvatarUrl: z.string().url().optional(),
            publicBio: z.string().max(300).optional(),
        });
        const data = schema.parse(req.body);

        // Verify public username availability
        if (data.publicUsername) {
            const existing = await prisma.user.findFirst({
                where: {
                    OR: [
                        { username: data.publicUsername },
                        { publicUsername: data.publicUsername },
                    ],
                    NOT: { id: req.userId },
                },
            });
            if (existing) {
                throw new AppError('Public username is already taken', 409);
            }
        }

        const user = await prisma.user.update({
            where: { id: req.userId },
            data,
            select: {
                id: true,
                usePublicProfile: true,
                publicDisplayName: true,
                publicUsername: true,
                publicAvatarUrl: true,
                publicBio: true,
            },
        });

        res.json(user);
    } catch (error) {
        next(error);
    }
});

// PUT /api/v1/users/feed-view - Switch between private and community feed
router.put('/feed-view', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const schema = z.object({
            view: z.enum(['private', 'community']),
        });
        const { view } = schema.parse(req.body);

        // Can only switch to community if opted in
        if (view === 'community') {
            const user = await prisma.user.findUnique({
                where: { id: req.userId },
                select: { communityOptIn: true },
            });
            if (!user?.communityOptIn) {
                throw new AppError('Join the community first to access the community feed', 403);
            }
        }

        await prisma.user.update({
            where: { id: req.userId },
            data: { activeFeedView: view },
        });

        res.json({ activeFeedView: view });
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
            orderBy: [{ sortOrder: 'desc' }, { createdAt: 'desc' }],
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

        // Fetch user stats for profile display
        const userCounts = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                _count: {
                    select: {
                        posts: true,
                        followers: true,
                        following: true,
                    },
                },
            },
        });

        res.json({
            posts: results.map((post) => ({
                ...post,
                likesCount: post._count.likes,
                commentsCount: post._count.comments,
                sharesCount: post._count.shares,
                isLiked: likedPostIds.includes(post.id),
                isSaved: savedPostIds.includes(post.id),
            })),
            postsCount: userCounts?._count.posts || 0,
            followersCount: userCounts?._count.followers || 0,
            followingCount: userCounts?._count.following || 0,
            nextCursor: hasMore ? results[results.length - 1].id : null,
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/users/:id/wave - Send a wave/greeting or live stream invite
router.post('/:id/wave', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { id } = req.params;
        const senderId = req.userId!;

        const waveSchema = z.object({
            message: z.string().max(200).optional().default('waved at you! 👋'),
            targetId: z.string().optional(),
            targetType: z.string().optional(),
        });
        const { message, targetId, targetType } = waveSchema.parse(req.body);

        if (id === senderId) {
            throw new AppError('Cannot wave at yourself', 400);
        }

        const [targetUser, sender] = await Promise.all([
            prisma.user.findUnique({ where: { id }, select: { id: true, username: true } }),
            prisma.user.findUnique({
                where: { id: senderId },
                select: { id: true, username: true, displayName: true, avatarUrl: true },
            }),
        ]);

        if (!targetUser) {
            throw new AppError('User not found', 404);
        }

        // Create notification with optional targetId (e.g. streamId for live invites)
        const notification = await prisma.notification.create({
            data: {
                userId: id,
                actorId: senderId,
                type: 'WAVE' as any,
                message: message,
                ...(targetId && { targetId }),
            },
        });

        // Emit real-time socket event so the user sees it instantly
        try {
            const { io } = await import('../index.js');
            if (io) {
                io.to(`user:${id}`).emit('notification:new', {
                    id: notification.id,
                    type: 'WAVE',
                    message: message,
                    read: false,
                    actorId: senderId,
                    actor: sender,
                    targetId: targetId || null,
                    targetType: targetType || null, // Not in DB but sent via socket for real-time UI
                    createdAt: notification.createdAt,
                });
            }
        } catch (socketErr) {
            // Non-critical: notification is already in DB
            console.error('Socket emit failed:', socketErr);
        }

        res.json({ success: true, message: 'Wave sent!' });
    } catch (error) {
        next(error);
    }
});

export { router as usersRouter };
