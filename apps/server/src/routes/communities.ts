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
        }

        if (!community) {
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
            // Branding
            brandColor: z.string().max(20).optional(),
            tagline: z.string().max(120).optional(),
            logoUrl: z.string().url().optional(),
            websiteUrl: z.string().max(200).optional(),
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

        // Security Check: Ensure user has access if community is private
        const community = await prisma.community.findUnique({
            where: { id: communityId },
            select: { isPublic: true },
        });

        if (!community) {
            throw new AppError('Community not found', 404);
        }

        if (!community.isPublic) {
            if (!req.userId) {
                throw new AppError('Authentication required to view this private community', 401);
            }

            const membership = await prisma.communityMember.findUnique({
                where: {
                    userId_communityId: {
                        userId: req.userId,
                        communityId,
                    },
                },
            });

            if (!membership) {
                throw new AppError('You must be a member to view posts in this private community', 403);
            }
        }

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
                    select: { likes: true, comments: true, shares: true, rsvps: { where: { status: 'IN' } } },
                },
                likes: req.userId ? { where: { userId: req.userId } } : false,
                rsvps: req.userId ? { where: { userId: req.userId, status: 'IN' } } : false,
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
                rsvpCount: p._count.rsvps,
                isLiked: !!p.likes?.length,
                isRsvped: !!p.rsvps?.length,
            })),
            nextCursor: hasMore ? results[results.length - 1].id : null,
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// ADMIN: UPDATE COMMUNITY SETTINGS
// ============================================
router.put('/:communityId', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;

        // Verify admin
        const membership = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId: req.userId!, communityId } },
        });
        if (!membership || membership.role !== 'ADMIN') {
            throw new AppError('Only admins can update community settings', 403);
        }

        const updateSchema = z.object({
            name: z.string().min(3).max(50).optional(),
            description: z.string().max(500).optional(),
            avatarUrl: z.string().optional().nullable(),
            coverUrl: z.string().optional().nullable(),
            isPublic: z.boolean().optional(),
            brandColor: z.string().max(20).optional(),
            tagline: z.string().max(120).optional(),
            logoUrl: z.string().optional().nullable(),
            category: z.string().max(50).optional(),
            websiteUrl: z.string().max(200).optional().nullable(),
            approvalRequired: z.boolean().optional(),
            postingPermission: z.enum(['all', 'admins_mods', 'admins_only']).optional(),
            invitePermission: z.enum(['all', 'admins_mods', 'admins_only']).optional(),
            isAnnouncementOnly: z.boolean().optional(),
            welcomeMessage: z.string().max(500).optional().nullable(),
        });

        const data = updateSchema.parse(req.body);

        const community = await prisma.community.update({
            where: { id: communityId },
            data,
        });

        res.json(community);
    } catch (error) {
        next(error);
    }
});

// ============================================
// ADMIN: GET MEMBERS LIST
// ============================================
router.get('/:communityId/members', optionalAuth, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;
        const { search, role } = req.query;

        const community = await prisma.community.findUnique({ where: { id: communityId }, select: { isPublic: true } });
        if (!community) throw new AppError('Community not found', 404);

        // Private community: must be a member to see members
        if (!community.isPublic && req.userId) {
            const membership = await prisma.communityMember.findUnique({
                where: { userId_communityId: { userId: req.userId, communityId } },
            });
            if (!membership) throw new AppError('Access denied', 403);
        }

        const where: any = { communityId };
        if (role) where.role = (role as string).toUpperCase();

        const members = await prisma.communityMember.findMany({
            where,
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
            orderBy: [
                { role: 'asc' },  // ADMIN first, then MODERATOR, then MEMBER
                { joinedAt: 'asc' },
            ],
        });

        // Filter by search if provided
        let results = members;
        if (search) {
            const q = (search as string).toLowerCase();
            results = members.filter(m =>
                m.user.displayName?.toLowerCase().includes(q) ||
                m.user.username.toLowerCase().includes(q)
            );
        }

        res.json({
            members: results.map(m => ({
                id: m.id,
                userId: m.userId,
                role: m.role,
                isMuted: m.isMuted,
                isBanned: m.isBanned,
                joinedAt: m.joinedAt,
                user: m.user,
            })),
            total: results.length,
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// ADMIN: UPDATE MEMBER ROLE / MUTE / BAN
// ============================================
router.put('/:communityId/members/:userId', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId, userId } = req.params;

        // Verify caller is admin (or moderator for limited actions)
        const callerMembership = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId: req.userId!, communityId } },
        });
        if (!callerMembership || (callerMembership.role !== 'ADMIN' && callerMembership.role !== 'MODERATOR')) {
            throw new AppError('Only admins and moderators can manage members', 403);
        }

        const targetMembership = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId, communityId } },
        });
        if (!targetMembership) throw new AppError('Member not found', 404);

        // Moderators can only mute/unmute regular members
        if (callerMembership.role === 'MODERATOR') {
            if (targetMembership.role !== 'MEMBER') {
                throw new AppError('Moderators cannot manage other moderators or admins', 403);
            }
        }

        // Prevent demoting yourself from admin (last admin check)
        if (userId === req.userId && callerMembership.role === 'ADMIN') {
            const updateRole = req.body.role;
            if (updateRole && updateRole !== 'ADMIN') {
                const otherAdmins = await prisma.communityMember.count({
                    where: { communityId, role: 'ADMIN', userId: { not: req.userId } },
                });
                if (otherAdmins === 0) {
                    throw new AppError('Cannot demote yourself as the only admin', 400);
                }
            }
        }

        const updateSchema = z.object({
            role: z.enum(['MEMBER', 'MODERATOR', 'ADMIN']).optional(),
            isMuted: z.boolean().optional(),
            isBanned: z.boolean().optional(),
        });

        const data = updateSchema.parse(req.body);

        // Only admins can change roles
        if (data.role && callerMembership.role !== 'ADMIN') {
            throw new AppError('Only admins can change roles', 403);
        }

        const updated = await prisma.communityMember.update({
            where: { userId_communityId: { userId, communityId } },
            data,
            include: {
                user: {
                    select: { id: true, username: true, displayName: true, avatarUrl: true },
                },
            },
        });

        res.json({
            id: updated.id,
            userId: updated.userId,
            role: updated.role,
            isMuted: updated.isMuted,
            isBanned: updated.isBanned,
            user: updated.user,
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// ADMIN: REMOVE MEMBER
// ============================================
router.delete('/:communityId/members/:userId', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId, userId } = req.params;

        const callerMembership = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId: req.userId!, communityId } },
        });
        if (!callerMembership || (callerMembership.role !== 'ADMIN' && callerMembership.role !== 'MODERATOR')) {
            throw new AppError('Only admins and moderators can remove members', 403);
        }

        const targetMembership = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId, communityId } },
        });
        if (!targetMembership) throw new AppError('Member not found', 404);

        // Cannot remove admins (only admins can remove other admins, not mods)
        if (targetMembership.role === 'ADMIN' && callerMembership.role !== 'ADMIN') {
            throw new AppError('Only admins can remove other admins', 403);
        }
        // Cannot remove yourself (use leave instead)
        if (userId === req.userId) {
            throw new AppError('Use the leave endpoint to leave', 400);
        }

        await prisma.$transaction([
            prisma.communityMember.delete({
                where: { userId_communityId: { userId, communityId } },
            }),
            prisma.community.update({
                where: { id: communityId },
                data: { memberCount: { decrement: 1 } },
            }),
        ]);

        res.json({ removed: true });
    } catch (error) {
        next(error);
    }
});

// ============================================
// ADMIN: DELETE COMMUNITY
// ============================================
router.delete('/:communityId', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;

        const membership = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId: req.userId!, communityId } },
        });
        if (!membership || membership.role !== 'ADMIN') {
            throw new AppError('Only admins can delete communities', 403);
        }

        // Check if creator
        const community = await prisma.community.findUnique({ where: { id: communityId } });
        if (community?.creatorId !== req.userId) {
            throw new AppError('Only the creator can delete the community', 403);
        }

        await prisma.community.delete({ where: { id: communityId } });
        res.json({ deleted: true });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/communities/:communityId/invite
router.post('/:communityId/invite', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;
        const { userIds } = req.body;

        if (!Array.isArray(userIds) || userIds.length === 0) {
            throw new AppError('userIds array is required', 400);
        }

        const community = await prisma.community.findUnique({
            where: { id: communityId },
            include: { members: { where: { userId: req.userId } } },
        });

        if (!community) {
            throw new AppError('Community not found', 404);
        }

        if (community.members.length === 0) {
            throw new AppError('You must be a member to invite others', 403);
        }

        const sender = await prisma.user.findUnique({
            where: { id: req.userId },
        });

        // Create Notifications
        await prisma.$transaction(
            userIds.map((targetId: string) =>
                prisma.notification.create({
                    data: {
                        userId: targetId,
                        type: 'COMMUNITY_INVITE',
                        actorId: req.userId,
                        targetId: communityId,
                        message: `${sender?.displayName || 'Someone'} invited you to join ${community.name}`,
                    },
                })
            )
        );

        res.json({ success: true, count: userIds.length });
    } catch (error) {
        next(error);
    }
});

export { router as communitiesRouter };
