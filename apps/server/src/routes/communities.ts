import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/communities
router.get('/', optionalAuth, async (req: AuthRequest, res, next) => {
    try {
        const { cursor, limit = '20', search } = req.query;

        const communities = await prisma.community.findMany({
            where: search ? {
                OR: [
                    { name: { contains: search as string, mode: 'insensitive' } },
                    { description: { contains: search as string, mode: 'insensitive' } },
                ],
            } : undefined,
            take: parseInt(limit as string) + 1,
            ...(cursor && { cursor: { id: cursor as string }, skip: 1 }),
            orderBy: { memberCount: 'desc' },
            include: {
                _count: {
                    select: { members: true, posts: true },
                },
            },
        });

        const hasMore = communities.length > parseInt(limit as string);
        const results = hasMore ? communities.slice(0, -1) : communities;

        // Check membership status
        let memberIds: Set<string> = new Set();
        if (req.userId) {
            const memberships = await prisma.communityMember.findMany({
                where: {
                    userId: req.userId,
                    communityId: { in: results.map((c) => c.id) },
                },
            });
            memberIds = new Set(memberships.map((m) => m.communityId));
        }

        res.json({
            communities: results.map((c) => ({
                ...c,
                membersCount: c._count.members,
                postsCount: c._count.posts,
                isMember: memberIds.has(c.id),
            })),
            nextCursor: hasMore ? results[results.length - 1].id : null,
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/communities/my
router.get('/my', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const memberships = await prisma.communityMember.findMany({
            where: { userId: req.userId },
            include: {
                community: {
                    include: {
                        _count: {
                            select: { members: true, posts: true },
                        },
                    },
                },
            },
            orderBy: { joinedAt: 'desc' },
        });

        res.json({
            communities: memberships.map((m) => ({
                ...m.community,
                membersCount: m.community._count.members,
                postsCount: m.community._count.posts,
                role: m.role,
                isMember: true,
            })),
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/communities/:idOrSlug
router.get('/:idOrSlug', optionalAuth, async (req: AuthRequest, res, next) => {
    try {
        const { idOrSlug } = req.params;
        console.log('[Communities] Fetching community by ID/slug:', idOrSlug);

        // Try to find by ID first, then by slug
        let community = await prisma.community.findUnique({
            where: { id: idOrSlug },
            include: {
                creator: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                    },
                },
                rules: {
                    orderBy: { order: 'asc' },
                },
                _count: {
                    select: { members: true, posts: true },
                },
            },
        });

        console.log('[Communities] Found by ID:', !!community);

        // If not found by ID, try by slug
        if (!community) {
            community = await prisma.community.findUnique({
                where: { slug: idOrSlug },
                include: {
                    creator: {
                        select: {
                            id: true,
                            username: true,
                            displayName: true,
                            avatarUrl: true,
                        },
                    },
                    rules: {
                        orderBy: { order: 'asc' },
                    },
                    _count: {
                        select: { members: true, posts: true },
                    },
                },
            });
            console.log('[Communities] Found by slug:', !!community);
        }

        if (!community) {
            console.log('[Communities] Community not found for:', idOrSlug);
            throw new AppError('Community not found', 404);
        }

        let membership = null;
        if (req.userId) {
            membership = await prisma.communityMember.findUnique({
                where: {
                    userId_communityId: {
                        userId: req.userId,
                        communityId: community.id,
                    },
                },
            });
        }

        res.json({
            ...community,
            membersCount: community._count.members,
            postsCount: community._count.posts,
            isMember: !!membership,
            role: membership?.role || null,
        });
    } catch (error) {
        console.error('[Communities] Error fetching community:', error);
        next(error);
    }
});

// POST /api/v1/communities
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const createSchema = z.object({
            name: z.string().min(3).max(50),
            description: z.string().max(500).optional(),
            category: z.string().max(50).optional(),
            avatarUrl: z.string().url().optional(),
            coverUrl: z.string().url().optional(),
            isPrivate: z.boolean().optional(),
            isPublic: z.boolean().optional(),
            approvalRequired: z.boolean().optional(),
        });

        const data = createSchema.parse(req.body);
        const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        // Check if slug exists
        const existing = await prisma.community.findUnique({
            where: { slug },
        });

        if (existing) {
            throw new AppError('A community with this name already exists', 409);
        }

        const community = await prisma.community.create({
            data: {
                ...data,
                slug,
                creatorId: req.userId!,
                memberCount: 1,
            },
        });

        // Add creator as admin
        await prisma.communityMember.create({
            data: {
                userId: req.userId!,
                communityId: community.id,
                role: 'ADMIN',
            },
        });

        res.status(201).json({
            ...community,
            membersCount: 1,
            postsCount: 0,
            isMember: true,
            role: 'ADMIN',
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/communities/:communityId/join
router.post('/:communityId/join', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;

        const community = await prisma.community.findUnique({
            where: { id: communityId },
        });

        if (!community) {
            throw new AppError('Community not found', 404);
        }

        const existingMembership = await prisma.communityMember.findUnique({
            where: {
                userId_communityId: {
                    userId: req.userId!,
                    communityId,
                },
            },
        });

        if (existingMembership) {
            throw new AppError('Already a member', 400);
        }

        await prisma.$transaction([
            prisma.communityMember.create({
                data: {
                    userId: req.userId!,
                    communityId,
                    role: 'MEMBER',
                },
            }),
            prisma.community.update({
                where: { id: communityId },
                data: { memberCount: { increment: 1 } },
            }),
        ]);

        res.json({ joined: true });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/communities/:communityId/leave
router.delete('/:communityId/leave', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;

        const membership = await prisma.communityMember.findUnique({
            where: {
                userId_communityId: {
                    userId: req.userId!,
                    communityId,
                },
            },
        });

        if (!membership) {
            throw new AppError('Not a member', 400);
        }

        if (membership.role === 'ADMIN') {
            // Check if there are other admins
            const otherAdmins = await prisma.communityMember.count({
                where: {
                    communityId,
                    role: 'ADMIN',
                    userId: { not: req.userId },
                },
            });

            if (otherAdmins === 0) {
                throw new AppError('Cannot leave as the only admin', 400);
            }
        }

        await prisma.$transaction([
            prisma.communityMember.delete({
                where: {
                    userId_communityId: {
                        userId: req.userId!,
                        communityId,
                    },
                },
            }),
            prisma.community.update({
                where: { id: communityId },
                data: { memberCount: { decrement: 1 } },
            }),
        ]);

        res.json({ left: true });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/communities/:communityId/posts
router.get('/:communityId/posts', optionalAuth, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;
        const { cursor, limit = '20' } = req.query;

        const posts = await prisma.post.findMany({
            where: { communityId },
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
                    select: { likes: true, comments: true, shares: true },
                },
            },
        });

        const hasMore = posts.length > parseInt(limit as string);
        const results = hasMore ? posts.slice(0, -1) : posts;

        res.json({
            posts: results.map((p) => ({
                ...p,
                likesCount: p._count.likes,
                commentsCount: p._count.comments,
                sharesCount: p._count.shares,
            })),
            nextCursor: hasMore ? results[results.length - 1].id : null,
        });
    } catch (error) {
        next(error);
    }
});

export { router as communitiesRouter };
