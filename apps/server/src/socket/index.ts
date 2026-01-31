import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/client.js';
import { logger } from '../utils/logger.js';

interface AuthenticatedSocket extends Socket {
    userId?: string;
    username?: string;
}

const connectedUsers = new Map<string, Set<string>>(); // userId -> Set<socketId>

export const setupSocketHandlers = (io: SocketServer) => {
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

        // Handle new messages
        socket.on('message:send', async (data: {
            conversationId: string;
            content: string;
            mediaUrl?: string;
            mediaType?: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';
        }) => {
            try {
                const { conversationId, content, mediaUrl, mediaType } = data;

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

        // Handle typing indicators
        socket.on('typing:start', (conversationId: string) => {
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

        // Handle disconnect
        socket.on('disconnect', () => {
            logger.info(`User disconnected: ${socket.username}`);

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
