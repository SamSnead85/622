import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/client.js';
import { logger } from '../utils/logger.js';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';

interface AuthenticatedSocket extends Socket {
    userId?: string;
    username?: string;
}

const connectedUsers = new Map<string, Set<string>>(); // userId -> Set<socketId>

// Active WebRTC calls: callId -> { from, to, offer }
const activeCalls = new Map<string, { from: string; to: string; offer?: any }>();

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

    // Authentication middleware
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
            await prisma.user.update({
                where: { id: userId },
                data: { lastActiveAt: new Date() },
            });

            socket.broadcast.emit('presence:update', { userId, status });
        });

        // === WebRTC Call Signaling ===
        socket.on('call:initiate', (data: { callId: string; userId: string; type: 'audio' | 'video'; offer: any }) => {
            const { callId, userId: targetUserId, type, offer } = data;
            activeCalls.set(callId, { from: userId, to: targetUserId, offer });

            // Find target user's socket and send incoming call
            const targetSockets = connectedUsers.get(targetUserId);
            if (targetSockets) {
                targetSockets.forEach(socketId => {
                    io.to(socketId).emit('call:incoming', {
                        callId,
                        type,
                        from: { id: userId },
                        offer,
                    });
                });
            }
        });

        socket.on('call:answer', (data: { callId: string; answer: any }) => {
            const call = activeCalls.get(data.callId);
            if (call) {
                const callerSockets = connectedUsers.get(call.from);
                if (callerSockets) {
                    callerSockets.forEach(socketId => {
                        io.to(socketId).emit('call:answered', { answer: data.answer });
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
