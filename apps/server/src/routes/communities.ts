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

        const membership = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId: req.userId!, communityId } },
        });
        if (!membership) throw new AppError('Must be a member', 403);

        const polls = await prisma.poll.findMany({
            where: { communityId },
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

        const membership = await prisma.communityMember.findUnique({
            where: { userId_communityId: { userId: req.userId!, communityId } },
        });
        if (!membership) throw new AppError('Must be a member', 403);

        const albums = await prisma.album.findMany({
            where: { communityId },
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

export { router as communitiesRouter };
