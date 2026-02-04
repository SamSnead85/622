"use strict";

/**
 * CONNECTION SERVICE
 * LinkedIn-style connection request system
 */

import { PrismaClient, ConnectionStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// SEND CONNECTION REQUEST
// ============================================

export async function sendConnectionRequest(
    senderId: string,
    receiverId: string,
    message?: string
) {
    // Prevent self-connection
    if (senderId === receiverId) {
        throw new Error('Cannot send connection request to yourself');
    }

    // Check if already connected (follow relationship exists)
    const existingFollow = await prisma.follow.findUnique({
        where: {
            followerId_followingId: {
                followerId: senderId,
                followingId: receiverId,
            },
        },
    });

    if (existingFollow) {
        throw new Error('Already connected with this user');
    }

    // Check for existing request
    const existingRequest = await prisma.connectionRequest.findFirst({
        where: {
            OR: [
                { senderId, receiverId },
                { senderId: receiverId, receiverId: senderId },
            ],
        },
    });

    if (existingRequest) {
        if (existingRequest.status === 'PENDING') {
            throw new Error('A connection request is already pending');
        }
        if (existingRequest.status === 'BLOCKED') {
            throw new Error('Unable to send connection request');
        }
    }

    // Check if receiver has auto-approve enabled
    const receiverSettings = await prisma.userConnectionSettings.findUnique({
        where: { userId: receiverId },
    });

    // Create request
    const request = await prisma.connectionRequest.create({
        data: {
            senderId,
            receiverId,
            message,
            status: receiverSettings?.autoApprove ? 'ACCEPTED' : 'PENDING',
        },
        include: {
            sender: {
                select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                    isVerified: true,
                },
            },
            receiver: {
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

    // If auto-approved, create mutual follows
    if (receiverSettings?.autoApprove) {
        await createMutualFollows(senderId, receiverId);
    }

    return {
        request,
        autoApproved: receiverSettings?.autoApprove || false,
    };
}

// ============================================
// RESPOND TO REQUEST
// ============================================

export async function respondToConnectionRequest(
    requestId: string,
    userId: string,
    accept: boolean
) {
    // Get the request
    const request = await prisma.connectionRequest.findFirst({
        where: {
            id: requestId,
            receiverId: userId,
            status: 'PENDING',
        },
    });

    if (!request) {
        throw new Error('Request not found or already processed');
    }

    // Update request status
    const updatedRequest = await prisma.connectionRequest.update({
        where: { id: requestId },
        data: {
            status: accept ? 'ACCEPTED' : 'DECLINED',
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

    // If accepted, create mutual follows
    if (accept) {
        await createMutualFollows(request.senderId, request.receiverId);
    }

    return updatedRequest;
}

// ============================================
// BULK ACCEPT/DECLINE
// ============================================

export async function bulkRespondToRequests(
    userId: string,
    requestIds: string[],
    accept: boolean
) {
    const results = await Promise.allSettled(
        requestIds.map(id => respondToConnectionRequest(id, userId, accept))
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return { succeeded, failed, total: requestIds.length };
}

// ============================================
// GET PENDING REQUESTS
// ============================================

export async function getPendingRequests(
    userId: string,
    type: 'received' | 'sent' = 'received',
    cursor?: string,
    limit: number = 20
) {
    const where = type === 'received'
        ? { receiverId: userId, status: 'PENDING' as ConnectionStatus }
        : { senderId: userId, status: 'PENDING' as ConnectionStatus };

    const requests = await prisma.connectionRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        include: {
            sender: {
                select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                    isVerified: true,
                    bio: true,
                },
            },
            receiver: {
                select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                    isVerified: true,
                    bio: true,
                },
            },
        },
    });

    const hasMore = requests.length > limit;
    const results = hasMore ? requests.slice(0, -1) : requests;

    return {
        requests: results,
        nextCursor: hasMore ? results[results.length - 1].id : null,
        count: await prisma.connectionRequest.count({ where }),
    };
}

// ============================================
// CANCEL REQUEST
// ============================================

export async function cancelConnectionRequest(requestId: string, senderId: string) {
    const request = await prisma.connectionRequest.findFirst({
        where: {
            id: requestId,
            senderId,
            status: 'PENDING',
        },
    });

    if (!request) {
        throw new Error('Request not found or cannot be cancelled');
    }

    return prisma.connectionRequest.delete({
        where: { id: requestId },
    });
}

// ============================================
// BLOCK USER
// ============================================

export async function blockUser(userId: string, blockedUserId: string) {
    // Remove any existing connection/request
    await prisma.connectionRequest.deleteMany({
        where: {
            OR: [
                { senderId: userId, receiverId: blockedUserId },
                { senderId: blockedUserId, receiverId: userId },
            ],
        },
    });

    // Remove follows in both directions
    await prisma.follow.deleteMany({
        where: {
            OR: [
                { followerId: userId, followingId: blockedUserId },
                { followerId: blockedUserId, followingId: userId },
            ],
        },
    });

    // Create blocked connection request
    return prisma.connectionRequest.create({
        data: {
            senderId: userId,
            receiverId: blockedUserId,
            status: 'BLOCKED',
        },
    });
}

// ============================================
// CONNECTION SETTINGS
// ============================================

export async function getConnectionSettings(userId: string) {
    const settings = await prisma.userConnectionSettings.findUnique({
        where: { userId },
    });

    return settings || { userId, autoApprove: false };
}

export async function updateConnectionSettings(
    userId: string,
    autoApprove: boolean
) {
    return prisma.userConnectionSettings.upsert({
        where: { userId },
        create: { userId, autoApprove },
        update: { autoApprove },
    });
}

// ============================================
// HELPER: CREATE MUTUAL FOLLOWS
// ============================================

async function createMutualFollows(userA: string, userB: string) {
    // Create follow A -> B
    await prisma.follow.upsert({
        where: {
            followerId_followingId: {
                followerId: userA,
                followingId: userB,
            },
        },
        create: {
            followerId: userA,
            followingId: userB,
        },
        update: {},
    });

    // Create follow B -> A
    await prisma.follow.upsert({
        where: {
            followerId_followingId: {
                followerId: userB,
                followingId: userA,
            },
        },
        create: {
            followerId: userB,
            followingId: userA,
        },
        update: {},
    });
}

// ============================================
// GET CONNECTION STATUS
// ============================================

export async function getConnectionStatus(userId: string, targetUserId: string) {
    // Check for connection request
    const request = await prisma.connectionRequest.findFirst({
        where: {
            OR: [
                { senderId: userId, receiverId: targetUserId },
                { senderId: targetUserId, receiverId: userId },
            ],
        },
    });

    if (request) {
        return {
            status: request.status,
            direction: request.senderId === userId ? 'sent' : 'received',
            requestId: request.id,
        };
    }

    // Check for existing follow
    const [followsTarget, followedByTarget] = await Promise.all([
        prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId: userId,
                    followingId: targetUserId,
                },
            },
        }),
        prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId: targetUserId,
                    followingId: userId,
                },
            },
        }),
    ]);

    if (followsTarget && followedByTarget) {
        return { status: 'CONNECTED', direction: null, requestId: null };
    }

    if (followsTarget) {
        return { status: 'FOLLOWING', direction: null, requestId: null };
    }

    return { status: 'NOT_CONNECTED', direction: null, requestId: null };
}

export default {
    sendConnectionRequest,
    respondToConnectionRequest,
    bulkRespondToRequests,
    getPendingRequests,
    cancelConnectionRequest,
    blockUser,
    getConnectionSettings,
    updateConnectionSettings,
    getConnectionStatus,
};
