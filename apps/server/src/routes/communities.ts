import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { rateLimiters } from '../middleware/rateLimit.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Apply general rate limiting to all community endpoints
router.use(rateLimiters.general);

// GET /api/v1/communities
router.get('/', optionalAuth, async (req: AuthRequest, res, next) => {
    try {
        const { cursor, limit = '20', search, featured, category } = req.query;

        const where: any = {};
        if (search) {
            where.OR = [
                { name: { contains: search as string, mode: 'insensitive' } },
                { description: { contains: search as string, mode: 'insensitive' } },
            ];
        }
        if (featured === 'true') {
            where.isFeatured = true;
        }
        if (category && category !== 'all') {
            where.category = category as string;
        }

        const communities = await prisma.community.findMany({
            where: Object.keys(where).length > 0 ? where : undefined,
            take: parseInt(limit as string) + 1,
            ...(cursor && { cursor: { id: cursor as string }, skip: 1 }),
            orderBy: featured === 'true' ? { memberCount: 'desc' } : { memberCount: 'desc' },
            include: {
                _count: {
                    select: { members: true, posts: true },
                },
            },
        });

        const hasMore = communities.length > parseInt(limit as string);
        const results = hasMore ? communities.slice(0, -1) : communities;

        // Check membership status and roles
        let memberMap: Map<string, string> = new Map();
        let requestMap: Map<string, string> = new Map();
        if (req.userId) {
            const memberships = await prisma.communityMember.findMany({
                where: {
                    userId: req.userId,
                    communityId: { in: results.map((c) => c.id) },
                },
            });
            memberships.forEach((m) => memberMap.set(m.communityId, m.role));

            // Check pending join requests
            const requests = await prisma.communityJoinRequest.findMany({
                where: {
                    userId: req.userId,
                    communityId: { in: results.map((c) => c.id) },
                    status: 'pending',
                },
            }).catch(() => []);
            requests.forEach((r) => requestMap.set(r.communityId, r.status));
        }

        res.json({
            communities: results.map((c) => ({
                ...c,
                membersCount: c._count.members,
                postsCount: c._count.posts,
                isMember: memberMap.has(c.id),
                role: memberMap.get(c.id)?.toLowerCase() || null,
                requestStatus: requestMap.get(c.id) || null,
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
        const take = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const skip = parseInt(req.query.offset as string) || 0;

        const memberships = await prisma.communityMember.findMany({
            where: { userId: req.userId },
            take,
            skip,
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

        let membership: any = null;
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
        logger.error('[Communities] Error fetching community:', error);
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

        // If approval is required, create a join request instead of direct membership
        if (community.approvalRequired) {
            // Check for existing pending request
            const existingRequest = await prisma.communityJoinRequest.findUnique({
                where: {
                    communityId_userId: {
                        communityId,
                        userId: req.userId!,
                    },
                },
            });

            if (existingRequest) {
                if (existingRequest.status === 'pending') {
                    return res.json({ status: 'pending', message: 'Your request is already pending.' });
                }
                if (existingRequest.status === 'rejected') {
                    // Allow re-request by updating existing record
                    await prisma.communityJoinRequest.update({
                        where: { id: existingRequest.id },
                        data: { status: 'pending', message: req.body.message || null, reviewedAt: null, reviewedBy: null },
                    });
                    return res.json({ status: 'pending', message: 'Your request has been resubmitted.' });
                }
            }

            await prisma.communityJoinRequest.create({
                data: {
                    communityId,
                    userId: req.userId!,
                    message: req.body.message || null,
                },
            });

            return res.json({ status: 'pending', message: 'Your request to join has been sent to the admin.' });
        }

        // Open community — join directly
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

        res.json({ joined: true, status: 'joined' });
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
        const take = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const skip = parseInt(req.query.offset as string) || 0;

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
            take,
            skip,
            include: {
                user: true,
            },
            orderBy: { joinedAt: 'desc' },
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

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || userIds.length > 100) {
            return res.status(400).json({ error: 'userIds must be an array of 1-100 user IDs' });
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

// ================================================================
// COMMUNITY GROUP CHAT
// ================================================================

// GET or CREATE the community's group conversation
router.get('/:communityId/chat', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;

        // Verify membership
        const membership = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId: req.userId!, communityId } },
        });
        if (!membership) throw new AppError('Must be a member to access chat', 403);

        // Find or create the community conversation
        let conversation = await prisma.conversation.findFirst({
            where: { communityId },
            include: {
                participants: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } },
            },
        });

        if (!conversation) {
            const community = await prisma.community.findUnique({ where: { id: communityId } });
            if (!community) throw new AppError('Community not found', 404);

            // Get all community members
            const members = await prisma.communityMember.findMany({
                where: { communityId },
                select: { userId: true },
            });

            conversation = await prisma.conversation.create({
                data: {
                    isGroup: true,
                    groupName: community.name,
                    groupAvatar: community.logoUrl || community.avatarUrl,
                    communityId,
                    participants: {
                        create: members.map(m => ({ userId: m.userId })),
                    },
                },
                include: {
                    participants: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } },
                },
            });
        }

        // Check if user is already a participant, add if not
        const isParticipant = conversation.participants.some(p => p.userId === req.userId);
        if (!isParticipant) {
            await prisma.conversationParticipant.create({
                data: { conversationId: conversation.id, userId: req.userId! },
            });
        }

        res.json({ conversationId: conversation.id, conversation });
    } catch (error) {
        next(error);
    }
});

// GET community chat messages
router.get('/:communityId/chat/messages', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;
        const { cursor, limit = '50' } = req.query;

        const membership = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId: req.userId!, communityId } },
        });
        if (!membership) throw new AppError('Must be a member', 403);

        const conversation = await prisma.conversation.findFirst({ where: { communityId } });
        if (!conversation) return res.json({ messages: [], nextCursor: null });

        const messages = await prisma.message.findMany({
            where: { conversationId: conversation.id },
            take: parseInt(limit as string) + 1,
            ...(cursor && { cursor: { id: cursor as string }, skip: 1 }),
            orderBy: { createdAt: 'desc' },
            include: {
                sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            },
        });

        const hasMore = messages.length > parseInt(limit as string);
        const results = hasMore ? messages.slice(0, -1) : messages;

        res.json({
            messages: results.reverse(),
            nextCursor: hasMore ? results[0].id : null,
        });
    } catch (error) {
        next(error);
    }
});

// POST a chat message to community
router.post('/:communityId/chat/messages', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;
        const { content, mediaUrl, mediaType } = req.body;

        if (!content && !mediaUrl) throw new AppError('Message content is required', 400);

        const membership = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId: req.userId!, communityId } },
        });
        if (!membership) throw new AppError('Must be a member', 403);
        if (membership.isMuted) throw new AppError('You are muted in this group', 403);
        if (membership.isBanned) throw new AppError('You are banned from this group', 403);

        let conversation = await prisma.conversation.findFirst({ where: { communityId } });
        if (!conversation) {
            const community = await prisma.community.findUnique({ where: { id: communityId } });
            const members = await prisma.communityMember.findMany({ where: { communityId }, select: { userId: true } });
            conversation = await prisma.conversation.create({
                data: {
                    isGroup: true,
                    groupName: community?.name,
                    communityId,
                    participants: { create: members.map(m => ({ userId: m.userId })) },
                },
            });
        }

        const message = await prisma.message.create({
            data: {
                conversationId: conversation.id,
                senderId: req.userId!,
                content: content || '',
                mediaUrl,
                mediaType,
            },
            include: {
                sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            },
        });

        // Update conversation timestamp
        await prisma.conversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() },
        });

        res.status(201).json(message);
    } catch (error) {
        next(error);
    }
});

// ================================================================
// CHECK-IN / STATUS
// ================================================================

// GET all statuses for a community
router.get('/:communityId/statuses', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;

        const membership = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId: req.userId!, communityId } },
        });
        if (!membership) throw new AppError('Must be a member', 403);

        const statuses = await prisma.memberStatus.findMany({
            where: {
                communityId,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } },
                ],
            },
        });

        // Get user data for statuses
        const userIds = statuses.map(s => s.userId);
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true, displayName: true, avatarUrl: true },
        });

        const userMap = new Map(users.map(u => [u.id, u]));

        res.json({
            statuses: statuses.map(s => ({
                ...s,
                user: userMap.get(s.userId),
            })),
        });
    } catch (error) {
        next(error);
    }
});

// POST / UPDATE status
router.post('/:communityId/status', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;
        const { emoji, text, duration } = req.body; // duration in hours

        const membership = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId: req.userId!, communityId } },
        });
        if (!membership) throw new AppError('Must be a member', 403);

        const expiresAt = duration ? new Date(Date.now() + duration * 3600000) : null;

        const status = await prisma.memberStatus.upsert({
            where: { userId_communityId: { userId: req.userId!, communityId } },
            update: { emoji: emoji || '👋', text, expiresAt, createdAt: new Date() },
            create: { userId: req.userId!, communityId, emoji: emoji || '👋', text, expiresAt },
        });

        res.json(status);
    } catch (error) {
        next(error);
    }
});

// DELETE status
router.delete('/:communityId/status', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;
        await prisma.memberStatus.deleteMany({ where: { userId: req.userId!, communityId } });
        res.json({ cleared: true });
    } catch (error) {
        next(error);
    }
});

// ================================================================
// GROUP POLLS
// ================================================================

// GET polls for a community
router.get('/:communityId/polls', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;
        const take = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const skip = parseInt(req.query.offset as string) || 0;

        const membership = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId: req.userId!, communityId } },
        });
        if (!membership) throw new AppError('Must be a member', 403);

        const polls = await prisma.poll.findMany({
            where: { communityId },
            take,
            skip,
            orderBy: { createdAt: 'desc' },
            include: {
                options: {
                    orderBy: { order: 'asc' },
                    include: { votes: true },
                },
                votes: { where: { userId: req.userId! } },
            },
        });

        // Get creator info
        const creatorIds = [...new Set(polls.map(p => p.creatorId))];
        const creators = await prisma.user.findMany({
            where: { id: { in: creatorIds } },
            select: { id: true, username: true, displayName: true, avatarUrl: true },
        });
        const creatorMap = new Map(creators.map(u => [u.id, u]));

        res.json({
            polls: polls.map(p => ({
                id: p.id,
                question: p.question,
                isAnonymous: p.isAnonymous,
                allowMultiple: p.allowMultiple,
                expiresAt: p.expiresAt,
                createdAt: p.createdAt,
                creator: creatorMap.get(p.creatorId),
                isExpired: p.expiresAt ? new Date(p.expiresAt) < new Date() : false,
                totalVotes: p.options.reduce((sum, o) => sum + o.votes.length, 0),
                myVotes: p.votes.map(v => v.optionId),
                options: p.options.map(o => ({
                    id: o.id,
                    text: o.text,
                    voteCount: o.votes.length,
                })),
            })),
        });
    } catch (error) {
        next(error);
    }
});

// POST create a poll
router.post('/:communityId/polls', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;

        const membership = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId: req.userId!, communityId } },
        });
        if (!membership) throw new AppError('Must be a member', 403);

        const pollSchema = z.object({
            question: z.string().min(1).max(500),
            options: z.array(z.string().min(1).max(200)).min(2).max(10),
            isAnonymous: z.boolean().optional(),
            allowMultiple: z.boolean().optional(),
            expiresInHours: z.number().min(1).max(720).optional(),
        });

        const data = pollSchema.parse(req.body);

        const poll = await prisma.poll.create({
            data: {
                communityId,
                creatorId: req.userId!,
                question: data.question,
                isAnonymous: data.isAnonymous || false,
                allowMultiple: data.allowMultiple || false,
                expiresAt: data.expiresInHours ? new Date(Date.now() + data.expiresInHours * 3600000) : null,
                options: {
                    create: data.options.map((text, i) => ({ text, order: i })),
                },
            },
            include: { options: true },
        });

        res.status(201).json(poll);
    } catch (error) {
        next(error);
    }
});

// POST vote on a poll
router.post('/:communityId/polls/:pollId/vote', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId, pollId } = req.params;
        const { optionIds } = req.body;

        if (!Array.isArray(optionIds) || optionIds.length === 0) {
            throw new AppError('optionIds array is required', 400);
        }

        const membership = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId: req.userId!, communityId } },
        });
        if (!membership) throw new AppError('Must be a member', 403);

        const poll = await prisma.poll.findFirst({
            where: { id: pollId, communityId },
        });
        if (!poll) throw new AppError('Poll not found', 404);
        if (poll.expiresAt && new Date(poll.expiresAt) < new Date()) {
            throw new AppError('Poll has expired', 400);
        }
        if (!poll.allowMultiple && optionIds.length > 1) {
            throw new AppError('This poll only allows one vote', 400);
        }

        // Remove previous votes
        await prisma.pollVote.deleteMany({ where: { pollId, userId: req.userId! } });

        // Cast new votes
        await prisma.$transaction(
            optionIds.map((optionId: string) =>
                prisma.pollVote.create({
                    data: { pollId, optionId, userId: req.userId! },
                })
            )
        );

        res.json({ voted: true });
    } catch (error) {
        next(error);
    }
});

// ================================================================
// SHARED PHOTO ALBUMS
// ================================================================

// GET albums for a community
router.get('/:communityId/albums', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;
        const take = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const skip = parseInt(req.query.offset as string) || 0;

        const membership = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId: req.userId!, communityId } },
        });
        if (!membership) throw new AppError('Must be a member', 403);

        const albums = await prisma.album.findMany({
            where: { communityId },
            take,
            skip,
            orderBy: { updatedAt: 'desc' },
            include: {
                photos: { take: 4, orderBy: { createdAt: 'desc' } },
                _count: { select: { photos: true } },
            },
        });

        res.json({
            albums: albums.map(a => ({
                id: a.id,
                title: a.title,
                description: a.description,
                coverUrl: a.coverUrl || a.photos[0]?.url,
                photoCount: a._count.photos,
                previewPhotos: a.photos.map(p => p.url),
                createdAt: a.createdAt,
                updatedAt: a.updatedAt,
            })),
        });
    } catch (error) {
        next(error);
    }
});

// POST create an album
router.post('/:communityId/albums', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;

        const membership = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId: req.userId!, communityId } },
        });
        if (!membership) throw new AppError('Must be a member', 403);

        const albumSchema = z.object({
            title: z.string().min(1).max(100),
            description: z.string().max(500).optional(),
        });

        const data = albumSchema.parse(req.body);

        const album = await prisma.album.create({
            data: {
                communityId,
                creatorId: req.userId!,
                title: data.title,
                description: data.description,
            },
        });

        res.status(201).json(album);
    } catch (error) {
        next(error);
    }
});

// GET album photos
router.get('/:communityId/albums/:albumId/photos', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId, albumId } = req.params;

        const membership = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId: req.userId!, communityId } },
        });
        if (!membership) throw new AppError('Must be a member', 403);

        const photos = await prisma.albumPhoto.findMany({
            where: { albumId },
            orderBy: { createdAt: 'desc' },
        });

        const userIds = [...new Set(photos.map(p => p.userId))];
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true, displayName: true, avatarUrl: true },
        });
        const userMap = new Map(users.map(u => [u.id, u]));

        res.json({
            photos: photos.map(p => ({
                ...p,
                user: userMap.get(p.userId),
            })),
        });
    } catch (error) {
        next(error);
    }
});

// POST add photo to album
router.post('/:communityId/albums/:albumId/photos', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId, albumId } = req.params;
        const { url, caption } = req.body;

        if (!url) throw new AppError('Photo URL is required', 400);

        const membership = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId: req.userId!, communityId } },
        });
        if (!membership) throw new AppError('Must be a member', 403);

        const album = await prisma.album.findFirst({ where: { id: albumId, communityId } });
        if (!album) throw new AppError('Album not found', 404);

        const photo = await prisma.albumPhoto.create({
            data: { albumId, userId: req.userId!, url, caption },
        });

        // Update album timestamp
        await prisma.album.update({ where: { id: albumId }, data: { updatedAt: new Date() } });

        res.status(201).json(photo);
    } catch (error) {
        next(error);
    }
});

// ================================================================
// WHATSAPP IMPORT
// ================================================================
router.post('/:communityId/import/whatsapp', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;
        const { messages } = req.body; // Array of { sender, content, timestamp }

        const membership = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId: req.userId!, communityId } },
        });
        if (!membership || membership.role !== 'ADMIN') {
            throw new AppError('Only admins can import chat history', 403);
        }

        if (!Array.isArray(messages) || messages.length === 0) {
            throw new AppError('Messages array is required', 400);
        }

        // Get or create community conversation
        let conversation = await prisma.conversation.findFirst({ where: { communityId } });
        if (!conversation) {
            const community = await prisma.community.findUnique({ where: { id: communityId } });
            conversation = await prisma.conversation.create({
                data: {
                    isGroup: true,
                    groupName: community?.name,
                    communityId,
                    participants: { create: [{ userId: req.userId! }] },
                },
            });
        }

        // Batch import messages (use the importer's user as sender for all)
        const imported = await prisma.$transaction(
            messages.slice(0, 500).map((msg: any) =>
                prisma.message.create({
                    data: {
                        conversationId: conversation!.id,
                        senderId: req.userId!,
                        content: `[${msg.sender || 'Unknown'}]: ${msg.content}`,
                        createdAt: msg.timestamp ? new Date(msg.timestamp) : new Date(),
                    },
                })
            )
        );

        res.json({ imported: imported.length, total: messages.length });
    } catch (error) {
        next(error);
    }
});

// ================================================================
// CALL LOG
// ================================================================
router.post('/:communityId/call/log', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;
        const { receiverId, callType, status, duration } = req.body;

        const log = await prisma.callLog.create({
            data: {
                callerId: req.userId!,
                receiverId,
                communityId,
                callType: callType || 'audio',
                status: status || 'initiated',
                duration,
                endedAt: status === 'ended' ? new Date() : undefined,
            },
        });

        res.status(201).json(log);
    } catch (error) {
        next(error);
    }
});

// ============================================
// COMMUNITY ADMIN ANALYTICS
// ============================================
router.get('/:communityId/analytics', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;
        const userId = req.user!.id;

        // Verify the user is an admin of this community
        const membership = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId, communityId } },
        });

        if (!membership || membership.role !== 'ADMIN') {
            res.status(403).json({ error: 'Only admins can view analytics.' });
            return;
        }

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Parallel data fetches for performance
        const [
            totalMembers,
            newMembersThisMonth,
            newMembersThisWeek,
            totalPosts,
            postsThisWeek,
            activeMembers,
            topPosts,
            topContributors,
            memberGrowth,
            bannedCount,
            mutedCount,
        ] = await Promise.all([
            prisma.communityMember.count({
                where: { communityId, isBanned: false },
            }),
            prisma.communityMember.count({
                where: { communityId, joinedAt: { gte: thirtyDaysAgo } },
            }),
            prisma.communityMember.count({
                where: { communityId, joinedAt: { gte: sevenDaysAgo } },
            }),
            prisma.post.count({
                where: { communityId },
            }),
            prisma.post.count({
                where: { communityId, createdAt: { gte: sevenDaysAgo } },
            }),
            prisma.post.findMany({
                where: { communityId, createdAt: { gte: sevenDaysAgo } },
                select: { userId: true },
                distinct: ['userId'],
            }),
            // Top posts by view count (the field available on Post model)
            prisma.post.findMany({
                where: { communityId },
                orderBy: { viewCount: 'desc' },
                take: 10,
                include: {
                    user: { select: { username: true, displayName: true, avatarUrl: true } },
                    _count: { select: { likes: true, comments: true, shares: true } },
                },
            }),
            // Top contributors (most posts)
            prisma.post.groupBy({
                by: ['userId'],
                where: { communityId, createdAt: { gte: thirtyDaysAgo } },
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 10,
            }),
            // Member growth by week (last 12 weeks)
            prisma.communityMember.findMany({
                where: {
                    communityId,
                    joinedAt: { gte: new Date(now.getTime() - 84 * 24 * 60 * 60 * 1000) },
                },
                select: { joinedAt: true },
                orderBy: { joinedAt: 'asc' },
            }),
            prisma.communityMember.count({
                where: { communityId, isBanned: true },
            }),
            prisma.communityMember.count({
                where: { communityId, isMuted: true },
            }),
        ]);

        // Resolve top contributor usernames
        const contributorIds = topContributors.map(c => c.userId);
        const contributorUsers = await prisma.user.findMany({
            where: { id: { in: contributorIds } },
            select: { id: true, username: true, displayName: true, avatarUrl: true },
        });

        // Bucket member growth by week
        const weekBuckets: Record<string, number> = {};
        for (const m of memberGrowth) {
            const weekStart = new Date(m.joinedAt);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            const key = weekStart.toISOString().split('T')[0];
            weekBuckets[key] = (weekBuckets[key] || 0) + 1;
        }

        res.json({
            overview: {
                totalMembers,
                newMembersThisMonth,
                newMembersThisWeek,
                totalPosts,
                postsThisWeek,
                activeMembersThisWeek: activeMembers.length,
                bannedMembers: bannedCount,
                mutedMembers: mutedCount,
                engagementRate: totalMembers > 0
                    ? Math.round((activeMembers.length / totalMembers) * 100)
                    : 0,
            },
            topPosts: topPosts.map(p => ({
                id: p.id,
                content: p.caption?.substring(0, 120) || '',
                likes: p._count.likes,
                comments: p._count.comments,
                shares: p._count.shares,
                createdAt: p.createdAt,
                author: p.user,
            })),
            topContributors: topContributors.map(c => {
                const user = contributorUsers.find(u => u.id === c.userId);
                return {
                    userId: c.userId,
                    username: user?.username,
                    displayName: user?.displayName,
                    avatarUrl: user?.avatarUrl,
                    postCount: c._count.id,
                };
            }),
            memberGrowth: Object.entries(weekBuckets).map(([week, count]) => ({ week, count })),
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// COMMUNITY MODERATION QUEUE
// ============================================
router.get('/:communityId/moderation', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;
        const userId = req.user!.id;

        // Verify admin/moderator role
        const membership = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId, communityId } },
        });

        if (!membership || !['ADMIN', 'MODERATOR'].includes(membership.role)) {
            res.status(403).json({ error: 'Moderator access required.' });
            return;
        }

        // Get community post IDs for report matching
        const communityPosts = await prisma.post.findMany({
            where: { communityId },
            select: { id: true },
        });
        const postIds = communityPosts.map(p => p.id);

        // Get reports targeting posts in this community
        const reports = await prisma.report.findMany({
            where: {
                status: 'PENDING',
                targetType: 'POST',
                targetId: { in: postIds },
            },
            include: {
                reporter: { select: { username: true, displayName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        // For each report, fetch the target post
        const reportPostIds = reports.map(r => r.targetId);
        const reportPosts = await prisma.post.findMany({
            where: { id: { in: reportPostIds } },
            include: {
                user: { select: { username: true, displayName: true, avatarUrl: true } },
            },
        });

        // Get flagged/banned members
        const flaggedMembers = await prisma.communityMember.findMany({
            where: {
                communityId,
                OR: [{ isBanned: true }, { isMuted: true }],
            },
            include: {
                user: { select: { username: true, displayName: true, avatarUrl: true } },
            },
        });

        res.json({
            reports: reports.map(r => {
                const post = reportPosts.find(p => p.id === r.targetId);
                return {
                    id: r.id,
                    reason: r.reason,
                    details: r.notes,
                    createdAt: r.createdAt,
                    reporter: r.reporter,
                    post: post ? {
                        id: post.id,
                        content: post.caption,
                        mediaUrl: post.mediaUrl,
                        createdAt: post.createdAt,
                        user: post.user,
                    } : null,
                };
            }),
            flaggedMembers: flaggedMembers.map(m => ({
                userId: m.userId,
                role: m.role,
                isBanned: m.isBanned,
                isMuted: m.isMuted,
                user: m.user,
            })),
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// CONTENT FILTERS MANAGEMENT
// ============================================

// GET /:communityId/filters — List all content filters
router.get('/:communityId/filters', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;
        const userId = req.user!.id;

        const membership = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId, communityId } },
        });
        if (!membership || !['ADMIN', 'MODERATOR'].includes(membership.role)) {
            res.status(403).json({ error: 'Moderator access required.' });
            return;
        }

        const filters = await prisma.contentFilter.findMany({
            where: { communityId },
            orderBy: { createdAt: 'desc' },
        });

        res.json({ filters });
    } catch (error) {
        next(error);
    }
});

// POST /:communityId/filters — Create a content filter
router.post('/:communityId/filters', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;
        const userId = req.user!.id;

        const membership = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId, communityId } },
        });
        if (!membership || membership.role !== 'ADMIN') {
            res.status(403).json({ error: 'Admin access required.' });
            return;
        }

        const { type, pattern, action } = req.body;

        if (!type || !pattern) {
            res.status(400).json({ error: 'Type and pattern are required.' });
            return;
        }

        const validTypes = ['keyword', 'link', 'spam', 'newuser'];
        const validActions = ['flag', 'block', 'mute_author'];

        if (!validTypes.includes(type)) {
            res.status(400).json({ error: `Invalid type. Use: ${validTypes.join(', ')}` });
            return;
        }

        const filter = await prisma.contentFilter.create({
            data: {
                communityId,
                type,
                pattern,
                action: validActions.includes(action) ? action : 'flag',
                createdById: userId,
            },
        });

        // Log moderation action
        await prisma.moderationLog.create({
            data: {
                communityId,
                moderatorId: userId,
                action: 'create_filter',
                targetType: 'content_filter',
                targetId: filter.id,
                reason: `Created ${type} filter: "${pattern}" → ${action || 'flag'}`,
            },
        });

        res.status(201).json({ filter });
    } catch (error) {
        next(error);
    }
});

// DELETE /:communityId/filters/:filterId — Delete a content filter
router.delete('/:communityId/filters/:filterId', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId, filterId } = req.params;
        const userId = req.user!.id;

        const membership = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId, communityId } },
        });
        if (!membership || membership.role !== 'ADMIN') {
            res.status(403).json({ error: 'Admin access required.' });
            return;
        }

        const filter = await prisma.contentFilter.findFirst({
            where: { id: filterId, communityId },
        });
        if (!filter) {
            res.status(404).json({ error: 'Filter not found.' });
            return;
        }

        await prisma.contentFilter.delete({ where: { id: filterId } });

        await prisma.moderationLog.create({
            data: {
                communityId,
                moderatorId: userId,
                action: 'delete_filter',
                targetType: 'content_filter',
                targetId: filterId,
                reason: `Deleted ${filter.type} filter: "${filter.pattern}"`,
            },
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// PATCH /:communityId/filters/:filterId — Toggle a content filter
router.patch('/:communityId/filters/:filterId', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId, filterId } = req.params;
        const userId = req.user!.id;

        const membership = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId, communityId } },
        });
        if (!membership || membership.role !== 'ADMIN') {
            res.status(403).json({ error: 'Admin access required.' });
            return;
        }

        const { isActive, action } = req.body;

        const updated = await prisma.contentFilter.update({
            where: { id: filterId },
            data: {
                ...(typeof isActive === 'boolean' && { isActive }),
                ...(action && { action }),
            },
        });

        res.json({ filter: updated });
    } catch (error) {
        next(error);
    }
});

// POST /:communityId/check-content — Check content against filters (used before posting)
router.post('/:communityId/check-content', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;
        const { text } = req.body;

        if (!text) {
            res.json({ allowed: true, matches: [] });
            return;
        }

        const filters = await prisma.contentFilter.findMany({
            where: { communityId, isActive: true },
        });

        const matches: Array<{ filterId: string; type: string; action: string; pattern: string }> = [];
        const lowerText = text.toLowerCase();

        for (const filter of filters) {
            let hit = false;

            switch (filter.type) {
                case 'keyword': {
                    // Check for keyword match (supports comma-separated keywords)
                    const keywords = filter.pattern.split(',').map(k => k.trim().toLowerCase());
                    hit = keywords.some(kw => lowerText.includes(kw));
                    break;
                }
                case 'link': {
                    // Check for any URLs
                    const urlRegex = /https?:\/\/[^\s]+|www\.[^\s]+/i;
                    if (filter.pattern === '*') {
                        hit = urlRegex.test(text);
                    } else {
                        // Block specific domains
                        const domains = filter.pattern.split(',').map(d => d.trim().toLowerCase());
                        hit = domains.some(d => lowerText.includes(d));
                    }
                    break;
                }
                case 'spam': {
                    // Check for spam patterns: excessive caps, repeated chars, too many exclamation marks
                    const capsRatio = (text.match(/[A-Z]/g) || []).length / Math.max(text.length, 1);
                    const repeatedChars = /(.)\1{4,}/g.test(text);
                    const excessivePunctuation = (text.match(/[!?]{3,}/g) || []).length > 0;
                    hit = capsRatio > 0.7 || repeatedChars || excessivePunctuation;
                    break;
                }
                case 'newuser': {
                    // Restrict new users (check if user joined within X days)
                    const days = parseInt(filter.pattern) || 7;
                    const membership = await prisma.communityMember.findUnique({
                        where: { userId_communityId: { userId: req.user!.id, communityId } },
                    });
                    if (membership) {
                        const joinedDaysAgo = (Date.now() - new Date(membership.joinedAt).getTime()) / (1000 * 60 * 60 * 24);
                        hit = joinedDaysAgo < days;
                    }
                    break;
                }
            }

            if (hit) {
                matches.push({
                    filterId: filter.id,
                    type: filter.type,
                    action: filter.action,
                    pattern: filter.pattern,
                });

                // Increment hit count
                await prisma.contentFilter.update({
                    where: { id: filter.id },
                    data: { hitCount: { increment: 1 } },
                });
            }
        }

        // Determine the strictest action
        const blocked = matches.some(m => m.action === 'block');
        const flagged = matches.some(m => m.action === 'flag');
        const muteAuthor = matches.some(m => m.action === 'mute_author');

        res.json({
            allowed: !blocked,
            flagged,
            muteAuthor,
            matches: matches.map(m => ({ type: m.type, action: m.action })),
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// Join Request Management
// ============================================

// GET /api/v1/communities/:communityId/requests — Admin gets pending join requests
router.get('/:communityId/requests', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;
        const { status = 'pending' } = req.query;

        // Verify admin/mod role
        const membership = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId: req.userId!, communityId } },
        });
        if (!membership || !['ADMIN', 'MODERATOR'].includes(membership.role)) {
            throw new AppError('Only admins and moderators can view join requests', 403);
        }

        const requests = await prisma.communityJoinRequest.findMany({
            where: { communityId, status: status as string },
            include: {
                user: { select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true, createdAt: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(requests);
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/communities/:communityId/requests/:requestId/approve
router.post('/:communityId/requests/:requestId/approve', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId, requestId } = req.params;

        // Verify admin/mod role
        const membership = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId: req.userId!, communityId } },
        });
        if (!membership || !['ADMIN', 'MODERATOR'].includes(membership.role)) {
            throw new AppError('Only admins and moderators can approve requests', 403);
        }

        const request = await prisma.communityJoinRequest.findUnique({ where: { id: requestId } });
        if (!request || request.communityId !== communityId) {
            throw new AppError('Request not found', 404);
        }
        if (request.status !== 'pending') {
            throw new AppError('Request has already been processed', 400);
        }

        // Approve: update request + create membership + increment count
        await prisma.$transaction([
            prisma.communityJoinRequest.update({
                where: { id: requestId },
                data: { status: 'approved', reviewedAt: new Date(), reviewedBy: req.userId },
            }),
            prisma.communityMember.create({
                data: { userId: request.userId, communityId, role: 'MEMBER' },
            }),
            prisma.community.update({
                where: { id: communityId },
                data: { memberCount: { increment: 1 } },
            }),
        ]);

        res.json({ success: true, message: 'Request approved.' });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/communities/:communityId/requests/:requestId/reject
router.post('/:communityId/requests/:requestId/reject', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId, requestId } = req.params;

        // Verify admin/mod role
        const membership = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId: req.userId!, communityId } },
        });
        if (!membership || !['ADMIN', 'MODERATOR'].includes(membership.role)) {
            throw new AppError('Only admins and moderators can reject requests', 403);
        }

        const request = await prisma.communityJoinRequest.findUnique({ where: { id: requestId } });
        if (!request || request.communityId !== communityId) {
            throw new AppError('Request not found', 404);
        }
        if (request.status !== 'pending') {
            throw new AppError('Request has already been processed', 400);
        }

        await prisma.communityJoinRequest.update({
            where: { id: requestId },
            data: { status: 'rejected', reviewedAt: new Date(), reviewedBy: req.userId },
        });

        res.json({ success: true, message: 'Request rejected.' });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/communities/:communityId/request-status — Check if current user has a pending request
router.get('/:communityId/request-status', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;
        const request = await prisma.communityJoinRequest.findUnique({
            where: { communityId_userId: { communityId, userId: req.userId! } },
        });
        res.json({ status: request?.status || null });
    } catch (error) {
        next(error);
    }
});

// ============================================
// Seed Communities (admin-only, one-time use)
// ============================================
router.post('/seed', authenticate, async (req: AuthRequest, res, next) => {
    try {
        // Only allow the requesting user to be the admin
        const userId = req.userId!;

        const seeds = [
            { name: "The Striver's Path", slug: 'the-strivers-path', description: 'We are a group of Muslims who are on the path to strive in learning the Arabic language to become the best versions of ourselves.', category: 'faith', isPublic: true, approvalRequired: false },
            { name: 'Muslim Entrepreneurs', slug: 'muslim-entrepreneurs', description: 'Business-minded Muslims building and scaling ventures together. Share wins, get advice, and grow.', category: 'business', isPublic: true, approvalRequired: true },
            { name: 'Halal Stock Investing', slug: 'halal-stock-investing', description: 'Discussion on halal stocks, live trading ideas, and shariah-compliant investment picks.', category: 'business', isPublic: true, approvalRequired: true },
            { name: 'Tampa AI Builders', slug: 'tampa-ai-builders', description: 'Tampa Bay area AI enthusiasts, builders, and innovators. Monthly meetups and hackathons.', category: 'tech', isPublic: true, approvalRequired: false },
            { name: 'Tampa Muslim AI Builders', slug: 'tampa-muslim-ai-builders', description: 'Muslim AI builders in Tampa — monthly meetups, lessons learned, new tech, and hackathons with cash prizes.', category: 'tech', isPublic: true, approvalRequired: true },
            { name: 'Abundant Muslimah Community', slug: 'abundant-muslimah-community', description: 'A year-long journey of growth, healing, and barakah. For the Muslim wife, mother, and homemaker seeking more than survival.', category: 'faith', isPublic: true, approvalRequired: false },
            { name: 'Islamic Designers', slug: 'islamic-designers', description: 'Muslim creatives in design, branding, and visual arts. Share your work, get feedback, and collaborate.', category: 'culture', isPublic: true, approvalRequired: false },
        ];

        const created: any[] = [];
        for (const seed of seeds) {
            // Skip if already exists
            const existing = await prisma.community.findUnique({ where: { slug: seed.slug } });
            if (existing) {
                created.push({ ...existing, skipped: true });
                continue;
            }

            const community = await prisma.community.create({
                data: {
                    ...seed,
                    creatorId: userId,
                    memberCount: 1,
                },
            });

            // Make the creator an admin member
            await prisma.communityMember.create({
                data: { userId, communityId: community.id, role: 'ADMIN' },
            });

            created.push(community);
        }

        res.json({ created: created.length, communities: created });
    } catch (error) {
        next(error);
    }
});

// ============================================
// GAMIFICATION: Leaderboard & Points
// ============================================

// Level thresholds
const LEVEL_THRESHOLDS = [0, 10, 50, 150, 500, 1000, 2500, 5000, 10000, 25000];

function calculateLevel(points: number): number {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (points >= LEVEL_THRESHOLDS[i]) return i + 1;
    }
    return 1;
}

// Helper: award points to a community member
async function awardPoints(communityId: string, userId: string, points: number, reason: string, sourceType?: string, sourceId?: string) {
    try {
        const member = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId, communityId } },
        });
        if (!member || member.isBanned) return;

        const newPoints = member.points + points;
        const newLevel = calculateLevel(newPoints);

        await prisma.$transaction([
            prisma.communityMember.update({
                where: { id: member.id },
                data: { points: newPoints, level: newLevel },
            }),
            prisma.pointTransaction.create({
                data: { communityId, userId, points, reason, sourceType, sourceId },
            }),
        ]);
    } catch (err) {
        logger.warn('awardPoints failed:', err);
    }
}

// GET /api/v1/communities/:communityId/leaderboard
router.get('/:communityId/leaderboard', optionalAuth, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;
        const period = (req.query.period as string) || 'all';
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

        if (period === 'all') {
            const members = await prisma.communityMember.findMany({
                where: { communityId, isBanned: false },
                orderBy: { points: 'desc' },
                take: limit,
                select: {
                    userId: true, points: true, level: true, role: true, joinedAt: true,
                    user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
                },
            });

            const community = await prisma.community.findUnique({
                where: { id: communityId },
                select: { levelNames: true },
            });

            res.json({ leaderboard: members, levelNames: community?.levelNames || [] });
        } else {
            const since = new Date();
            if (period === '7d') since.setDate(since.getDate() - 7);
            else if (period === '30d') since.setDate(since.getDate() - 30);

            const transactions = await prisma.pointTransaction.groupBy({
                by: ['userId'],
                where: { communityId, createdAt: { gte: since } },
                _sum: { points: true },
                orderBy: { _sum: { points: 'desc' } },
                take: limit,
            });

            const userIds = transactions.map(t => t.userId);
            const members = await prisma.communityMember.findMany({
                where: { communityId, userId: { in: userIds } },
                select: {
                    userId: true, points: true, level: true, role: true,
                    user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
                },
            });

            const memberMap = new Map(members.map(m => [m.userId, m]));
            const leaderboard = transactions.map((t, i) => ({
                ...memberMap.get(t.userId),
                periodPoints: t._sum.points || 0,
                rank: i + 1,
            }));

            const community = await prisma.community.findUnique({
                where: { id: communityId },
                select: { levelNames: true },
            });

            res.json({ leaderboard, levelNames: community?.levelNames || [] });
        }
    } catch (error) {
        next(error);
    }
});

// PUT /api/v1/communities/:communityId/gamification
router.put('/:communityId/gamification', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;
        const member = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId: req.userId!, communityId } },
        });
        if (!member || member.role !== 'ADMIN') throw new AppError('Admin access required', 403);

        const schema = z.object({
            levelNames: z.array(z.string()).min(1).max(10).optional(),
            pointsPerLike: z.number().min(0).max(100).optional(),
            pointsPerPost: z.number().min(0).max(100).optional(),
            pointsPerComment: z.number().min(0).max(100).optional(),
        });
        const data = schema.parse(req.body);

        const updated = await prisma.community.update({
            where: { id: communityId },
            data,
            select: { levelNames: true, pointsPerLike: true, pointsPerPost: true, pointsPerComment: true },
        });

        res.json(updated);
    } catch (error) {
        next(error);
    }
});

// ============================================
// CLASSROOM: Courses, Modules, Lessons
// ============================================

// GET /api/v1/communities/:communityId/courses
router.get('/:communityId/courses', optionalAuth, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;
        const userId = req.userId;

        const courses = await prisma.course.findMany({
            where: { communityId, isPublished: true },
            orderBy: { order: 'asc' },
            include: {
                modules: {
                    orderBy: { order: 'asc' },
                    include: {
                        lessons: {
                            orderBy: { order: 'asc' },
                            select: { id: true },
                        },
                    },
                },
            },
        });

        // Get user progress if authenticated
        let progressMap: Record<string, boolean> = {};
        if (userId) {
            const progress = await prisma.lessonProgress.findMany({
                where: { userId, completed: true, lesson: { module: { course: { communityId } } } },
                select: { lessonId: true },
            });
            progress.forEach(p => { progressMap[p.lessonId] = true; });
        }

        // Get user's level for lock checks
        let userLevel = 0;
        if (userId) {
            const member = await prisma.communityMember.findUnique({
                where: { userId_communityId: { userId, communityId } },
                select: { level: true },
            });
            userLevel = member?.level || 0;
        }

        const result = courses.map(course => {
            const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
            const completedLessons = course.modules.reduce(
                (sum, m) => sum + m.lessons.filter(l => progressMap[l.id]).length, 0
            );
            return {
                id: course.id,
                title: course.title,
                description: course.description,
                coverUrl: course.coverUrl,
                order: course.order,
                requiredLevel: course.requiredLevel,
                isLocked: course.requiredLevel > userLevel,
                totalLessons,
                completedLessons,
                progressPercent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
                moduleCount: course.modules.length,
            };
        });

        res.json({ courses: result });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/communities/:communityId/courses
router.post('/:communityId/courses', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;
        const member = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId: req.userId!, communityId } },
        });
        if (!member || !['ADMIN', 'MODERATOR'].includes(member.role)) {
            throw new AppError('Admin or moderator access required', 403);
        }

        const schema = z.object({
            title: z.string().min(1).max(200),
            description: z.string().max(2000).optional(),
            coverUrl: z.string().url().optional(),
            requiredLevel: z.number().min(0).max(10).optional(),
            isPublished: z.boolean().optional(),
        });
        const data = schema.parse(req.body);

        const maxOrder = await prisma.course.aggregate({
            where: { communityId },
            _max: { order: true },
        });

        const course = await prisma.course.create({
            data: { ...data, communityId, order: (maxOrder._max.order || 0) + 1 },
        });

        res.status(201).json(course);
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/communities/:communityId/courses/:courseId
router.get('/:communityId/courses/:courseId', optionalAuth, async (req: AuthRequest, res, next) => {
    try {
        const { courseId } = req.params;
        const userId = req.userId;

        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: {
                modules: {
                    orderBy: { order: 'asc' },
                    include: {
                        lessons: {
                            orderBy: { order: 'asc' },
                            select: { id: true, title: true, videoUrl: true, thumbnailUrl: true, duration: true, order: true },
                        },
                    },
                },
            },
        });

        if (!course) throw new AppError('Course not found', 404);

        let progressMap: Record<string, { completed: boolean; watchedSeconds: number }> = {};
        if (userId) {
            const lessonIds = course.modules.flatMap(m => m.lessons.map(l => l.id));
            const progress = await prisma.lessonProgress.findMany({
                where: { userId, lessonId: { in: lessonIds } },
                select: { lessonId: true, completed: true, watchedSeconds: true },
            });
            progress.forEach(p => { progressMap[p.lessonId] = { completed: p.completed, watchedSeconds: p.watchedSeconds }; });
        }

        const totalLessons = course.modules.reduce((s, m) => s + m.lessons.length, 0);
        const completedLessons = Object.values(progressMap).filter(p => p.completed).length;

        res.json({
            ...course,
            totalLessons,
            completedLessons,
            progressPercent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
            modules: course.modules.map(m => ({
                ...m,
                lessons: m.lessons.map(l => ({
                    ...l,
                    completed: progressMap[l.id]?.completed || false,
                    watchedSeconds: progressMap[l.id]?.watchedSeconds || 0,
                })),
            })),
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/v1/communities/:communityId/courses/:courseId
router.put('/:communityId/courses/:courseId', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId, courseId } = req.params;
        const member = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId: req.userId!, communityId } },
        });
        if (!member || !['ADMIN', 'MODERATOR'].includes(member.role)) {
            throw new AppError('Admin or moderator access required', 403);
        }

        const schema = z.object({
            title: z.string().min(1).max(200).optional(),
            description: z.string().max(2000).optional(),
            coverUrl: z.string().url().optional().nullable(),
            requiredLevel: z.number().min(0).max(10).optional(),
            isPublished: z.boolean().optional(),
            order: z.number().min(0).optional(),
        });
        const data = schema.parse(req.body);

        const course = await prisma.course.update({ where: { id: courseId }, data });
        res.json(course);
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/communities/:communityId/courses/:courseId/modules
router.post('/:communityId/courses/:courseId/modules', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId, courseId } = req.params;
        const member = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId: req.userId!, communityId } },
        });
        if (!member || !['ADMIN', 'MODERATOR'].includes(member.role)) {
            throw new AppError('Admin or moderator access required', 403);
        }

        const schema = z.object({
            title: z.string().min(1).max(200),
            description: z.string().max(1000).optional(),
        });
        const data = schema.parse(req.body);

        const maxOrder = await prisma.courseModule.aggregate({
            where: { courseId },
            _max: { order: true },
        });

        const mod = await prisma.courseModule.create({
            data: { ...data, courseId, order: (maxOrder._max.order || 0) + 1 },
        });

        res.status(201).json(mod);
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/communities/:communityId/courses/:courseId/modules/:moduleId/lessons
router.post('/:communityId/courses/:courseId/modules/:moduleId/lessons', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId, moduleId } = req.params;
        const member = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId: req.userId!, communityId } },
        });
        if (!member || !['ADMIN', 'MODERATOR'].includes(member.role)) {
            throw new AppError('Admin or moderator access required', 403);
        }

        const schema = z.object({
            title: z.string().min(1).max(200),
            content: z.string().max(50000).optional(),
            videoUrl: z.string().url().optional(),
            thumbnailUrl: z.string().url().optional(),
            duration: z.number().min(0).optional(),
            resources: z.any().optional(),
        });
        const data = schema.parse(req.body);

        const maxOrder = await prisma.courseLesson.aggregate({
            where: { moduleId },
            _max: { order: true },
        });

        const lesson = await prisma.courseLesson.create({
            data: { ...data, moduleId, order: (maxOrder._max.order || 0) + 1 },
        });

        res.status(201).json(lesson);
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/communities/:communityId/courses/:courseId/lessons/:lessonId
router.get('/:communityId/courses/:courseId/lessons/:lessonId', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { lessonId } = req.params;
        const lesson = await prisma.courseLesson.findUnique({
            where: { id: lessonId },
            include: { module: { select: { title: true, courseId: true } } },
        });
        if (!lesson) throw new AppError('Lesson not found', 404);

        let progress: any = null;
        if (req.userId) {
            progress = await prisma.lessonProgress.findUnique({
                where: { lessonId_userId: { lessonId, userId: req.userId } },
            });
        }

        res.json({ ...lesson, progress });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/communities/:communityId/courses/:courseId/lessons/:lessonId/progress
router.post('/:communityId/courses/:courseId/lessons/:lessonId/progress', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId, lessonId } = req.params;
        const userId = req.userId!;

        const schema = z.object({
            completed: z.boolean().optional(),
            watchedSeconds: z.number().min(0).optional(),
        });
        const data = schema.parse(req.body);

        const progress = await prisma.lessonProgress.upsert({
            where: { lessonId_userId: { lessonId, userId } },
            create: {
                lessonId, userId,
                completed: data.completed || false,
                watchedSeconds: data.watchedSeconds || 0,
                completedAt: data.completed ? new Date() : null,
            },
            update: {
                ...(data.completed !== undefined && { completed: data.completed }),
                ...(data.watchedSeconds !== undefined && { watchedSeconds: data.watchedSeconds }),
                ...(data.completed && { completedAt: new Date() }),
            },
        });

        // Award points for completing a lesson (only once — check if already awarded)
        if (data.completed) {
            const alreadyAwarded = await prisma.pointTransaction.findFirst({
                where: { communityId, userId, reason: 'course_complete', sourceId: lessonId },
            });
            if (!alreadyAwarded) {
                const community = await prisma.community.findUnique({
                    where: { id: communityId },
                    select: { pointsPerPost: true },
                });
                await awardPoints(communityId, userId, community?.pointsPerPost || 5, 'course_complete', 'lesson', lessonId);
            }
        }

        res.json(progress);
    } catch (error) {
        next(error);
    }
});

// ============================================
// CALENDAR: Events & RSVPs
// ============================================

// GET /api/v1/communities/:communityId/events
router.get('/:communityId/events', optionalAuth, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;
        const upcoming = req.query.upcoming !== 'false';
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        const offset = parseInt(req.query.offset as string) || 0;

        const where: any = { communityId };
        if (upcoming) {
            where.startAt = { gte: new Date() };
        }

        const events = await prisma.communityEvent.findMany({
            where,
            orderBy: { startAt: upcoming ? 'asc' : 'desc' },
            take: limit,
            skip: offset,
            include: {
                rsvps: { select: { userId: true, status: true } },
            },
        });

        const result = events.map(event => {
            const goingCount = event.rsvps.filter(r => r.status === 'going').length;
            const maybeCount = event.rsvps.filter(r => r.status === 'maybe').length;
            const myRsvp = req.userId ? event.rsvps.find(r => r.userId === req.userId)?.status : null;
            return {
                id: event.id,
                title: event.title,
                description: event.description,
                startAt: event.startAt,
                endAt: event.endAt,
                timezone: event.timezone,
                location: event.location,
                isVirtual: event.isVirtual,
                meetingUrl: event.meetingUrl,
                coverUrl: event.coverUrl,
                maxAttendees: event.maxAttendees,
                isRecurring: event.isRecurring,
                goingCount,
                maybeCount,
                myRsvp,
                createdAt: event.createdAt,
            };
        });

        res.json({ events: result });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/communities/:communityId/events
router.post('/:communityId/events', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId } = req.params;
        const member = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId: req.userId!, communityId } },
        });
        if (!member || !['ADMIN', 'MODERATOR'].includes(member.role)) {
            throw new AppError('Admin or moderator access required', 403);
        }

        const schema = z.object({
            title: z.string().min(1).max(200),
            description: z.string().max(5000).optional(),
            startAt: z.string().transform(s => new Date(s)),
            endAt: z.string().transform(s => new Date(s)).optional(),
            timezone: z.string().optional(),
            location: z.string().max(500).optional(),
            isVirtual: z.boolean().optional(),
            meetingUrl: z.string().url().optional(),
            coverUrl: z.string().url().optional(),
            maxAttendees: z.number().min(1).optional(),
            isRecurring: z.boolean().optional(),
            recurrenceRule: z.string().optional(),
        });
        const data = schema.parse(req.body);

        // Validate date range
        if (data.endAt && data.startAt >= data.endAt) {
            throw new AppError('End date must be after start date', 400);
        }

        const event = await prisma.communityEvent.create({
            data: { ...data, communityId, creatorId: req.userId! },
        });

        res.status(201).json(event);
    } catch (error) {
        next(error);
    }
});

// PUT /api/v1/communities/:communityId/events/:eventId
router.put('/:communityId/events/:eventId', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId, eventId } = req.params;
        const member = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId: req.userId!, communityId } },
        });
        if (!member || !['ADMIN', 'MODERATOR'].includes(member.role)) {
            throw new AppError('Admin or moderator access required', 403);
        }

        const schema = z.object({
            title: z.string().min(1).max(200).optional(),
            description: z.string().max(5000).optional(),
            startAt: z.string().transform(s => new Date(s)).optional(),
            endAt: z.string().transform(s => new Date(s)).optional().nullable(),
            timezone: z.string().optional(),
            location: z.string().max(500).optional().nullable(),
            isVirtual: z.boolean().optional(),
            meetingUrl: z.string().url().optional().nullable(),
            coverUrl: z.string().url().optional().nullable(),
            maxAttendees: z.number().min(1).optional().nullable(),
        });
        const data = schema.parse(req.body);

        const event = await prisma.communityEvent.update({ where: { id: eventId }, data });
        res.json(event);
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/communities/:communityId/events/:eventId
router.delete('/:communityId/events/:eventId', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId, eventId } = req.params;
        const member = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId: req.userId!, communityId } },
        });
        if (!member || !['ADMIN', 'MODERATOR'].includes(member.role)) {
            throw new AppError('Admin or moderator access required', 403);
        }

        await prisma.communityEvent.delete({ where: { id: eventId } });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/communities/:communityId/events/:eventId/rsvp
router.post('/:communityId/events/:eventId/rsvp', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { communityId, eventId } = req.params;
        const userId = req.userId!;

        const schema = z.object({
            status: z.enum(['going', 'maybe', 'not_going']),
        });
        const { status } = schema.parse(req.body);

        if (status === 'not_going') {
            await prisma.eventRSVP.deleteMany({ where: { eventId, userId } });
            res.json({ status: 'removed' });
            return;
        }

        const rsvp = await prisma.eventRSVP.upsert({
            where: { eventId_userId: { eventId, userId } },
            create: { eventId, userId, status },
            update: { status },
        });

        // Award points for attending (only once per event)
        if (status === 'going') {
            const alreadyAwarded = await prisma.pointTransaction.findFirst({
                where: { communityId, userId, reason: 'event_attend', sourceId: eventId },
            });
            if (!alreadyAwarded) {
                await awardPoints(communityId, userId, 2, 'event_attend', 'event', eventId);
            }
        }

        res.json(rsvp);
    } catch (error) {
        next(error);
    }
});

export { router as communitiesRouter };
