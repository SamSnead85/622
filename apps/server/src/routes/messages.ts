import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { rateLimiters } from '../middleware/rateLimit.js';
import { safeParseInt } from '../utils/validation.js';

const router = Router();

// Apply general rate limiting to all message endpoints
router.use(rateLimiters.general);

// GET /api/v1/messages - Alias for /conversations
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const take = safeParseInt(req.query.limit, 30, 1, 100);
        const skip = safeParseInt(req.query.offset, 0, 0, 10000);

        const conversations = await prisma.conversationParticipant.findMany({
            where: { userId: req.userId },
            take,
            skip,
            include: {
                conversation: {
                    include: {
                        participants: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        username: true,
                                        displayName: true,
                                        avatarUrl: true,
                                        lastActiveAt: true,
                                    },
                                },
                            },
                        },
                        messages: {
                            take: 1,
                            orderBy: { createdAt: 'desc' },
                            include: {
                                sender: {
                                    select: {
                                        id: true,
                                        username: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: {
                conversation: {
                    updatedAt: 'desc',
                },
            },
        });

        const result = conversations.map((cp) => {
            const otherParticipants = cp.conversation.participants
                .filter((p) => p.userId !== req.userId)
                .map((p) => p.user);

            const lastMessage = cp.conversation.messages[0];

            return {
                id: cp.conversation.id,
                isGroup: cp.conversation.isGroup,
                groupName: cp.conversation.groupName,
                participants: otherParticipants,
                lastMessage: lastMessage ? {
                    id: lastMessage.id,
                    content: lastMessage.content,
                    senderId: lastMessage.senderId,
                    senderUsername: lastMessage.sender.username,
                    createdAt: lastMessage.createdAt,
                } : null,
                updatedAt: cp.conversation.updatedAt,
            };
        });

        res.json({ conversations: result });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/messages/conversations
router.get('/conversations', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const take = safeParseInt(req.query.limit, 50, 1, 100);
        const skip = safeParseInt(req.query.offset, 0, 0, 10000);

        const conversations = await prisma.conversationParticipant.findMany({
            where: { userId: req.userId },
            take,
            skip,
            include: {
                conversation: {
                    include: {
                        participants: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        username: true,
                                        displayName: true,
                                        avatarUrl: true,
                                        lastActiveAt: true,
                                    },
                                },
                            },
                        },
                        messages: {
                            take: 1,
                            orderBy: { createdAt: 'desc' },
                            include: {
                                sender: {
                                    select: {
                                        id: true,
                                        username: true,
                                    },
                                },
                            },
                        },
                        _count: {
                            select: {
                                messages: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                conversation: {
                    updatedAt: 'desc',
                },
            },
        });

        // Fetch accurate unread counts per conversation using each participant's lastReadAt
        // Optimized: fetch all messages in one query, then count in memory to avoid N+1
        const unreadCountsPerConversation = new Map<string, number>();
        if (conversations.length > 0) {
            const conversationIds = conversations.map(cp => cp.conversationId);
            const participantMap = new Map<string, Date>();
            conversations.forEach(cp => {
                participantMap.set(cp.conversationId, cp.lastReadAt);
            });

            // Fetch all unread messages for all conversations in one query
            const unreadMessages = await prisma.message.findMany({
                where: {
                    conversationId: { in: conversationIds },
                    senderId: { not: req.userId },
                },
                select: {
                    conversationId: true,
                    createdAt: true,
                },
            });

            // Count unread messages per conversation based on each participant's lastReadAt
            unreadMessages.forEach(msg => {
                const lastReadAt = participantMap.get(msg.conversationId);
                if (lastReadAt && msg.createdAt > lastReadAt) {
                    const currentCount = unreadCountsPerConversation.get(msg.conversationId) || 0;
                    unreadCountsPerConversation.set(msg.conversationId, currentCount + 1);
                }
            });
        }

        const result = conversations.map((cp) => {
            const otherParticipants = cp.conversation.participants
                .filter((p) => p.userId !== req.userId)
                .map((p) => p.user);

            const lastMessage = cp.conversation.messages[0];

            // Use accurate unread count from separate query
            const unreadCount = unreadCountsPerConversation.get(cp.conversationId) || 0;

            return {
                id: cp.conversation.id,
                isGroup: cp.conversation.isGroup,
                groupName: cp.conversation.groupName,
                groupAvatar: cp.conversation.groupAvatar,
                participants: otherParticipants,
                lastMessage: lastMessage ? {
                    id: lastMessage.id,
                    content: lastMessage.content,
                    senderId: lastMessage.senderId,
                    senderUsername: lastMessage.sender.username,
                    createdAt: lastMessage.createdAt,
                } : null,
                unreadCount,
                isMuted: cp.isMuted,
                updatedAt: cp.conversation.updatedAt,
            };
        });

        res.json({ conversations: result });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/messages/conversations/:conversationId
router.get('/conversations/:conversationId', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { conversationId } = req.params;
        const { cursor } = req.query;
        const messageLimit = safeParseInt(req.query.limit, 50, 1, 100);

        // Verify user is participant and get conversation details
        const conversationParticipant = await prisma.conversationParticipant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId: req.userId!,
                },
            },
            include: {
                conversation: {
                    include: {
                        participants: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        username: true,
                                        displayName: true,
                                        avatarUrl: true,
                                        lastActiveAt: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!conversationParticipant) {
            throw new AppError('Conversation not found', 404);
        }

        // Extract the other participant(s) for the client
        const otherParticipants = conversationParticipant.conversation.participants
            .filter((p) => p.userId !== req.userId)
            .map((p) => ({
                id: p.user.id,
                username: p.user.username,
                displayName: p.user.displayName,
                avatarUrl: p.user.avatarUrl,
                isOnline: p.user.lastActiveAt
                    ? Date.now() - new Date(p.user.lastActiveAt).getTime() < 5 * 60 * 1000
                    : false,
            }));

        const messages = await prisma.message.findMany({
            where: { conversationId },
            take: messageLimit + 1,
            ...(cursor && { cursor: { id: cursor as string }, skip: 1 }),
            orderBy: { createdAt: 'desc' },
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                    },
                },
            },
        });

        // Mark as read
        await prisma.conversationParticipant.update({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId: req.userId!,
                },
            },
            data: { lastReadAt: new Date() },
        });

        const hasMore = messages.length > messageLimit;
        const results = hasMore ? messages.slice(0, -1) : messages;

        // For DMs, return the single other participant; for groups, return the first
        const participant = otherParticipants[0] || null;

        res.json({
            messages: results.reverse(),
            nextCursor: hasMore ? results[0].id : null,
            participant,
            isGroup: conversationParticipant.conversation.isGroup,
            groupName: conversationParticipant.conversation.groupName,
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/messages/conversations
router.post('/conversations', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const createSchema = z.object({
            participantIds: z.array(z.string()).min(1),
            isGroup: z.boolean().optional(),
            groupName: z.string().optional(),
        });

        const { participantIds, isGroup, groupName } = createSchema.parse(req.body);

        if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0 || participantIds.length > 50) {
            return res.status(400).json({ error: 'participantIds must be an array of 1-50 user IDs' });
        }

        // For DMs, check if conversation already exists
        if (!isGroup && participantIds.length === 1) {
            const existingConversation = await prisma.conversation.findFirst({
                where: {
                    isGroup: false,
                    participants: {
                        every: {
                            userId: { in: [req.userId!, participantIds[0]] },
                        },
                    },
                },
                include: {
                    participants: {
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
                    },
                },
            });

            if (existingConversation) {
                res.json({ conversation: existingConversation });
                return;
            }
        }

        // Create new conversation
        const conversation = await prisma.conversation.create({
            data: {
                isGroup: isGroup || false,
                groupName,
                participants: {
                    create: [
                        { userId: req.userId! },
                        ...participantIds.map((id) => ({ userId: id })),
                    ],
                },
            },
            include: {
                participants: {
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
                },
            },
        });

        res.status(201).json({ conversation });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/messages/conversations/:conversationId/messages
router.post('/conversations/:conversationId/messages', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { conversationId } = req.params;

        const messageSchema = z.object({
            content: z.string().min(1).max(5000),
            mediaUrl: z.string().url().optional(),
            mediaType: z.enum(['IMAGE', 'VIDEO', 'AUDIO', 'FILE']).optional(),
        });

        const data = messageSchema.parse(req.body);

        // Verify user is participant
        const participant = await prisma.conversationParticipant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId: req.userId!,
                },
            },
        });

        if (!participant) {
            throw new AppError('Conversation not found', 404);
        }

        const message = await prisma.message.create({
            data: {
                conversationId,
                senderId: req.userId!,
                content: data.content,
                mediaUrl: data.mediaUrl,
                mediaType: data.mediaType,
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                    },
                },
            },
        });

        // Update conversation timestamp
        await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
        });

        // Create notification for other participants
        const otherParticipants = await prisma.conversationParticipant.findMany({
            where: {
                conversationId,
                userId: { not: req.userId },
                isMuted: false,
            },
        });

        await prisma.notification.createMany({
            data: otherParticipants.map((p) => ({
                userId: p.userId,
                type: 'MESSAGE' as const,
                actorId: req.userId,
                targetId: conversationId,
                message: 'sent you a message',
            })),
        });

        // Broadcast via socket for real-time delivery to other participants
        const io = req.app.get('io');
        if (io) {
            io.to(`conversation:${conversationId}`).emit('message:new', message);
        }

        res.status(201).json({ message });
    } catch (error) {
        next(error);
    }
});

// PUT /api/v1/messages/conversations/:conversationId/read
router.put('/conversations/:conversationId/read', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { conversationId } = req.params;

        await prisma.conversationParticipant.update({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId: req.userId!,
                },
            },
            data: { lastReadAt: new Date() },
        });

        res.json({ read: true });
    } catch (error) {
        next(error);
    }
});

// PUT /api/v1/messages/conversations/:conversationId/mute
router.put('/conversations/:conversationId/mute', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { conversationId } = req.params;
        const { muted } = z.object({ muted: z.boolean() }).parse(req.body);

        await prisma.conversationParticipant.update({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId: req.userId!,
                },
            },
            data: { isMuted: muted },
        });

        res.json({ muted });
    } catch (error) {
        next(error);
    }
});

export { router as messagesRouter };
