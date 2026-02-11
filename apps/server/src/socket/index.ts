import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/client.js';
import { logger } from '../utils/logger.js';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { setupGameSocketHandlers } from './gameHandlers.js';

interface AuthenticatedSocket extends Socket {
    userId?: string;
    username?: string;
}

const connectedUsers = new Map<string, Set<string>>(); // userId -> Set<socketId>

// Active WebRTC calls: callId -> { from, to, offer, createdAt }
const activeCalls = new Map<string, { from: string; to: string; offer?: any; createdAt: number }>();

// Socket-level rate limiting
const socketRateLimits = new Map<string, { count: number; resetAt: number }>();
const SOCKET_RATE_LIMIT = 30; // Max events per window
const SOCKET_RATE_WINDOW = 10000; // 10 second window
const MAX_MESSAGE_SIZE = 5000; // 5KB max message content

function checkSocketRateLimit(userId: string): boolean {
    const now = Date.now();
    const entry = socketRateLimits.get(userId);

    if (!entry || now > entry.resetAt) {
        socketRateLimits.set(userId, { count: 1, resetAt: now + SOCKET_RATE_WINDOW });
        return true;
    }

    entry.count++;
    if (entry.count > SOCKET_RATE_LIMIT) {
        return false; // Rate limited
    }
    return true;
}

// ============================================
// Periodic Cleanup — prevent unbounded memory growth
// ============================================

function startMapCleanup(io: SocketServer) {
    // Clean stale socket entries every 2 minutes
    setInterval(() => {
        let cleaned = 0;
        for (const [userId, socketIds] of connectedUsers.entries()) {
            const validSockets = Array.from(socketIds).filter((id) => io.sockets.sockets.has(id));
            if (validSockets.length === 0) {
                connectedUsers.delete(userId);
                cleaned++;
            } else if (validSockets.length < socketIds.size) {
                connectedUsers.set(userId, new Set(validSockets));
            }
        }
        if (cleaned > 0) logger.info(`Socket cleanup: removed ${cleaned} stale user entries`);
    }, 2 * 60 * 1000);

    // Clean expired rate limit entries every 30 seconds
    setInterval(() => {
        const now = Date.now();
        let cleaned = 0;
        for (const [uid, entry] of socketRateLimits.entries()) {
            if (now > entry.resetAt) {
                socketRateLimits.delete(uid);
                cleaned++;
            }
        }
        // Emergency cleanup if map gets too large
        if (socketRateLimits.size > 50000) {
            socketRateLimits.clear();
            logger.warn('Socket rate limits map cleared (exceeded 50k entries)');
        }
    }, 30 * 1000);

    // Clean stale calls every 5 minutes (calls shouldn't last >2 hours)
    setInterval(() => {
        const now = Date.now();
        const TWO_HOURS = 2 * 60 * 60 * 1000;
        let cleaned = 0;
        for (const [callId, call] of activeCalls.entries()) {
            if (now - call.createdAt > TWO_HOURS) {
                activeCalls.delete(callId);
                cleaned++;
            }
        }
        // Emergency cleanup if map still exceeds safe size
        if (activeCalls.size > 10000) {
            activeCalls.clear();
            logger.warn('Active calls map cleared (exceeded 10k entries)');
        }
        if (cleaned > 0) {
            logger.info(`Call cleanup: removed ${cleaned} stale call(s)`);
        }
    }, 5 * 60 * 1000);
}

export const setupSocketHandlers = (io: SocketServer) => {
    // Redis Adapter Setup for Horizontal Scaling
    if (process.env.REDIS_URL) {
        logger.info('🔌 Connecting to Redis for Socket.IO Adapter...');
        const pubClient = new Redis(process.env.REDIS_URL);
        const subClient = pubClient.duplicate();

        io.adapter(createAdapter(pubClient, subClient));
        logger.info('✅ Redis Adapter configured for Socket.IO');
    } else {
        logger.warn('⚠️ No REDIS_URL found. Running Socket.IO in memory mode (not suitable for multiple instances)');
    }

    // Start periodic map cleanup to prevent memory leaks
    startMapCleanup(io);

    // Authentication middleware
    io.use(async (socket: AuthenticatedSocket, next) => {
        try {
            const token = socket.handshake.auth.token;

            if (!token) {
                return next(new Error('Authentication required'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
                userId: string;
                sessionId: string;
            };

            const session = await prisma.session.findUnique({
                where: { id: decoded.sessionId },
                include: { user: true },
            });

            if (!session || session.expiresAt < new Date()) {
                return next(new Error('Session expired'));
            }

            socket.userId = decoded.userId;
            socket.username = session.user.username;

            next();
        } catch (error) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket: AuthenticatedSocket) => {
        const userId = socket.userId!;

        logger.info(`User connected: ${socket.username} (${userId})`);

        // Track connected sockets
        if (!connectedUsers.has(userId)) {
            connectedUsers.set(userId, new Set());
        }
        connectedUsers.get(userId)!.add(socket.id);

        // Join user's personal room
        socket.join(`user:${userId}`);

        // Setup game handlers
        setupGameSocketHandlers(io, socket, userId, socket.username || 'Player');

        // Notify others that user is online
        socket.broadcast.emit('user:online', { userId });

        // Handle joining conversation rooms
        socket.on('conversation:join', async (conversationId: string) => {
            try {
                // Verify user is participant
                const participant = await prisma.conversationParticipant.findUnique({
                    where: {
                        conversationId_userId: {
                            conversationId,
                            userId,
                        },
                    },
                });

                if (participant) {
                    socket.join(`conversation:${conversationId}`);
                    logger.info(`User ${socket.username} joined conversation ${conversationId}`);
                }
            } catch (error) {
                logger.error('Error joining conversation:', error);
            }
        });

        // Handle leaving conversation rooms
        socket.on('conversation:leave', (conversationId: string) => {
            socket.leave(`conversation:${conversationId}`);
        });

        // Handle new messages (with rate limiting and size validation)
        socket.on('message:send', async (data: {
            conversationId: string;
            content: string;
            mediaUrl?: string;
            mediaType?: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';
        }) => {
            try {
                // Rate limit check
                if (!checkSocketRateLimit(userId)) {
                    socket.emit('error', { message: 'Too many messages. Please slow down.' });
                    return;
                }

                const { conversationId, content, mediaUrl, mediaType } = data;

                // Validate message size
                if (content && content.length > MAX_MESSAGE_SIZE) {
                    socket.emit('error', { message: 'Message too long. Max 5000 characters.' });
                    return;
                }

                // Verify user is participant
                const participant = await prisma.conversationParticipant.findUnique({
                    where: {
                        conversationId_userId: {
                            conversationId,
                            userId,
                        },
                    },
                });

                if (!participant) {
                    socket.emit('error', { message: 'Not a participant' });
                    return;
                }

                // Create message
                const message = await prisma.message.create({
                    data: {
                        conversationId,
                        senderId: userId,
                        content,
                        mediaUrl,
                        mediaType,
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

                // Broadcast to conversation room
                io.to(`conversation:${conversationId}`).emit('message:new', message);

                // Send push notification to offline participants
                const otherParticipants = await prisma.conversationParticipant.findMany({
                    where: {
                        conversationId,
                        userId: { not: userId },
                        isMuted: false,
                    },
                });

                for (const p of otherParticipants) {
                    if (!connectedUsers.has(p.userId)) {
                        // User is offline, queue push notification
                        await prisma.notification.create({
                            data: {
                                userId: p.userId,
                                type: 'MESSAGE',
                                actorId: userId,
                                targetId: conversationId,
                                message: content.substring(0, 50),
                            },
                        });
                    }
                }
            } catch (error) {
                logger.error('Error sending message:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // Handle typing indicators (rate limited)
        socket.on('typing:start', (conversationId: string) => {
            if (!checkSocketRateLimit(userId)) return;
            socket.to(`conversation:${conversationId}`).emit('typing:start', {
                userId,
                username: socket.username,
                conversationId,
            });
        });

        socket.on('typing:stop', (conversationId: string) => {
            socket.to(`conversation:${conversationId}`).emit('typing:stop', {
                userId,
                conversationId,
            });
        });

        // Handle read receipts
        socket.on('message:read', async (data: { conversationId: string; messageId: string }) => {
            try {
                await prisma.conversationParticipant.update({
                    where: {
                        conversationId_userId: {
                            conversationId: data.conversationId,
                            userId,
                        },
                    },
                    data: { lastReadAt: new Date() },
                });

                socket.to(`conversation:${data.conversationId}`).emit('message:read', {
                    userId,
                    conversationId: data.conversationId,
                    messageId: data.messageId,
                });
            } catch (error) {
                logger.error('Error marking message as read:', error);
            }
        });

        // Handle presence updates
        socket.on('presence:update', async (status: 'online' | 'away' | 'busy') => {
            try {
                await prisma.user.update({
                    where: { id: userId },
                    data: { lastActiveAt: new Date() },
                });
            } catch (error) {
                logger.error('Error updating presence:', error);
            }

            socket.broadcast.emit('presence:update', { userId, status });
        });

        // === WebRTC Call Signaling ===
        socket.on('call:initiate', async (data: { callId: string; userId: string; type: 'audio' | 'video'; offer: any }) => {
            const { callId, userId: targetUserId, type, offer } = data;
            activeCalls.set(callId, { from: userId, to: targetUserId, offer, createdAt: Date.now() });

            // Fetch caller info so the receiver can see who's calling
            let callerInfo: { id: string; username: string; displayName: string; avatarUrl?: string } = {
                id: userId, username: socket.username || 'Unknown', displayName: socket.username || 'Unknown',
            };
            try {
                const callerUser = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { id: true, username: true, displayName: true, avatarUrl: true },
                });
                if (callerUser) {
                    callerInfo = {
                        id: callerUser.id,
                        username: callerUser.username,
                        displayName: callerUser.displayName || callerUser.username,
                        avatarUrl: callerUser.avatarUrl || undefined,
                    };
                }
            } catch (e) {
                logger.error('Error fetching caller info:', e);
            }

            // Find target user's socket and send incoming call
            const targetSockets = connectedUsers.get(targetUserId);
            if (targetSockets) {
                targetSockets.forEach(socketId => {
                    io.to(socketId).emit('call:incoming', {
                        callId,
                        type,
                        from: callerInfo,
                        offer,
                    });
                });
            } else {
                // Target user is offline – notify caller
                socket.emit('call:unavailable', { callId, reason: 'User is offline' });
            }
        });

        socket.on('call:answer', async (data: { callId: string; answer: any }) => {
            const call = activeCalls.get(data.callId);
            if (call) {
                // Fetch answerer info so the caller can display it
                let participantInfo: { id: string; username: string; displayName: string; avatarUrl?: string } | null = null;
                try {
                    const answerer = await prisma.user.findUnique({
                        where: { id: call.to },
                        select: { id: true, username: true, displayName: true, avatarUrl: true },
                    });
                    if (answerer) {
                        participantInfo = {
                            id: answerer.id,
                            username: answerer.username,
                            displayName: answerer.displayName || answerer.username,
                            avatarUrl: answerer.avatarUrl || undefined,
                        };
                    }
                } catch (e) {
                    logger.error('Error fetching answerer info:', e);
                }

                const callerSockets = connectedUsers.get(call.from);
                if (callerSockets) {
                    callerSockets.forEach(socketId => {
                        io.to(socketId).emit('call:answered', {
                            answer: data.answer,
                            participant: participantInfo,
                        });
                    });
                }
            }
        });

        socket.on('call:get-offer', (data: { callId: string }, callback: (offer: any) => void) => {
            const call = activeCalls.get(data.callId);
            if (call?.offer && typeof callback === 'function') {
                callback(call.offer);
            }
        });

        socket.on('call:ice-candidate', (data: { userId: string; candidate: any }) => {
            const targetSockets = connectedUsers.get(data.userId);
            if (targetSockets) {
                targetSockets.forEach(socketId => {
                    io.to(socketId).emit('call:ice-candidate', { candidate: data.candidate });
                });
            }
        });

        socket.on('call:reject', (data: { callId: string }) => {
            const call = activeCalls.get(data.callId);
            if (call) {
                const callerSockets = connectedUsers.get(call.from);
                if (callerSockets) {
                    callerSockets.forEach(socketId => {
                        io.to(socketId).emit('call:rejected');
                    });
                }
                activeCalls.delete(data.callId);
            }
        });

        socket.on('call:end', (data: { callId: string }) => {
            const call = activeCalls.get(data.callId);
            if (call) {
                // Notify both parties
                [call.from, call.to].forEach(uid => {
                    if (uid !== userId) {
                        const sockets = connectedUsers.get(uid);
                        if (sockets) {
                            sockets.forEach(socketId => {
                                io.to(socketId).emit('call:ended');
                            });
                        }
                    }
                });
                activeCalls.delete(data.callId);
            }
        });

        socket.on('call:mute', (data: { callId: string; muted: boolean }) => {
            const call = activeCalls.get(data.callId);
            if (call) {
                const targetId = call.from === userId ? call.to : call.from;
                const targetSockets = connectedUsers.get(targetId);
                if (targetSockets) {
                    targetSockets.forEach(socketId => {
                        io.to(socketId).emit('call:mute', { muted: data.muted });
                    });
                }
            }
        });

        // === Live Stream Events ===

        // Join a stream room as a viewer
        socket.on('stream:join', async (streamId: string) => {
            try {
                if (!checkSocketRateLimit(userId)) return;

                socket.join(`stream:${streamId}`);

                // Increment viewer count
                const stream = await prisma.liveStream.update({
                    where: { id: streamId },
                    data: {
                        viewerCount: { increment: 1 },
                        totalViews: { increment: 1 },
                    },
                });

                // Update peak if needed
                if (stream.viewerCount > stream.peakViewerCount) {
                    await prisma.liveStream.update({
                        where: { id: streamId },
                        data: { peakViewerCount: stream.viewerCount },
                    });
                }

                // Broadcast updated viewer count
                io.to(`stream:${streamId}`).emit('stream:viewers', {
                    streamId,
                    viewerCount: stream.viewerCount,
                });

                // Persist join message
                await prisma.liveStreamChat.create({
                    data: {
                        streamId,
                        userId,
                        content: 'joined the stream',
                        type: 'JOIN',
                    },
                });

                // Notify room
                io.to(`stream:${streamId}`).emit('stream:user-joined', {
                    userId,
                    username: socket.username,
                });

                logger.info(`User ${socket.username} joined stream ${streamId}`);
            } catch (error) {
                logger.error('Error joining stream:', error);
            }
        });

        // Leave a stream room
        socket.on('stream:leave', async (streamId: string) => {
            try {
                socket.leave(`stream:${streamId}`);

                await prisma.liveStream.updateMany({
                    where: { id: streamId, viewerCount: { gt: 0 } },
                    data: { viewerCount: { decrement: 1 } },
                });

                const stream = await prisma.liveStream.findUnique({
                    where: { id: streamId },
                    select: { viewerCount: true },
                });

                io.to(`stream:${streamId}`).emit('stream:viewers', {
                    streamId,
                    viewerCount: stream?.viewerCount || 0,
                });

                logger.info(`User ${socket.username} left stream ${streamId}`);
            } catch (error) {
                logger.error('Error leaving stream:', error);
            }
        });

        // Send a chat message in a stream
        socket.on('stream:chat', async (data: { streamId: string; content: string }) => {
            try {
                if (!checkSocketRateLimit(userId)) {
                    socket.emit('error', { message: 'Too many messages. Slow down.' });
                    return;
                }

                const { streamId, content } = data;

                if (!content || content.length > 500) {
                    socket.emit('error', { message: 'Message must be 1-500 characters.' });
                    return;
                }

                const message = await prisma.liveStreamChat.create({
                    data: {
                        streamId,
                        userId,
                        content,
                        type: 'MESSAGE',
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

                io.to(`stream:${streamId}`).emit('stream:chat-message', message);
            } catch (error) {
                logger.error('Error sending stream chat:', error);
            }
        });

        // Send an ephemeral reaction (not persisted)
        socket.on('stream:reaction', (data: { streamId: string; emoji: string }) => {
            if (!checkSocketRateLimit(userId)) return;
            const { streamId, emoji } = data;

            // Validate emoji (basic check)
            if (!emoji || emoji.length > 4) return;

            io.to(`stream:${streamId}`).emit('stream:reaction', {
                userId,
                username: socket.username,
                emoji,
            });
        });

        // Send a gift in a stream (persisted)
        socket.on('stream:gift', async (data: { streamId: string; giftType: string; giftAmount: number; message?: string }) => {
            try {
                if (!checkSocketRateLimit(userId)) return;

                const { streamId, giftType, giftAmount, message } = data;

                // Validate gift
                const validGifts: Record<string, number> = {
                    'star': 0,
                    'fire': 100,
                    'diamond': 500,
                    'crown': 2500,
                };

                if (!validGifts.hasOwnProperty(giftType)) {
                    socket.emit('error', { message: 'Invalid gift type.' });
                    return;
                }

                const chatMessage = await prisma.liveStreamChat.create({
                    data: {
                        streamId,
                        userId,
                        content: message || `sent a ${giftType}`,
                        type: 'GIFT',
                        giftType,
                        giftAmount: giftAmount || validGifts[giftType],
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

                io.to(`stream:${streamId}`).emit('stream:gift-received', chatMessage);
            } catch (error) {
                logger.error('Error processing stream gift:', error);
            }
        });

        // Handle disconnect
        socket.on('disconnect', async () => {
            logger.info(`User disconnected: ${socket.username}`);

            // Clean up stream rooms -- decrement viewer counts for any streams this socket was in
            const rooms = Array.from(socket.rooms);
            for (const room of rooms) {
                if (room.startsWith('stream:')) {
                    const streamId = room.replace('stream:', '');
                    try {
                        await prisma.liveStream.updateMany({
                            where: { id: streamId, viewerCount: { gt: 0 } },
                            data: { viewerCount: { decrement: 1 } },
                        });
                        const stream = await prisma.liveStream.findUnique({
                            where: { id: streamId },
                            select: { viewerCount: true },
                        });
                        io.to(room).emit('stream:viewers', {
                            streamId,
                            viewerCount: stream?.viewerCount || 0,
                        });
                    } catch {
                        // Non-critical, ignore
                    }
                }
            }

            // Remove from connected users
            const userSockets = connectedUsers.get(userId);
            if (userSockets) {
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    connectedUsers.delete(userId);
                    // Notify others that user is offline
                    socket.broadcast.emit('user:offline', { userId });
                }
            }
        });
    });

    // Utility function to send to user
    const sendToUser = (userId: string, event: string, data: any) => {
        io.to(`user:${userId}`).emit(event, data);
    };

    // Utility function to check if user is online
    const isUserOnline = (userId: string): boolean => {
        return connectedUsers.has(userId);
    };

    return { sendToUser, isUserOnline };
};
