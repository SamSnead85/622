import { Router } from 'express';
import { prisma } from '../db/client.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { rateLimiters } from '../middleware/rateLimit.js';

const router = Router();
router.use(rateLimiters.general);

// All endpoints require authentication
router.use(authenticate);

// ── Pagination helper ──
const clampLimit = (val: string | undefined, max = 50, defaultVal = 20) => {
    const n = parseInt(val as string) || defaultVal;
    return Math.min(Math.max(1, n), max);
};

// ──────────────────────────────────────────────────────────────────
// HELPER: Get IDs of all 1st-degree connections (mutual follows)
// ──────────────────────────────────────────────────────────────────
async function getConnectionIds(userId: string): Promise<string[]> {
    const connections = await prisma.$queryRaw<{ id: string }[]>`
        SELECT u.id
        FROM "User" u
        WHERE EXISTS (
            SELECT 1 FROM "Follow" f1
            WHERE f1."followerId" = ${userId} AND f1."followingId" = u.id
        )
        AND EXISTS (
            SELECT 1 FROM "Follow" f2
            WHERE f2."followerId" = u.id AND f2."followingId" = ${userId}
        )
    `;
    return connections.map(c => c.id);
}

// ──────────────────────────────────────────────────────────────────
// HELPER: Count mutual connections between two users
// ──────────────────────────────────────────────────────────────────
async function countMutualConnections(userIdA: string, userIdB: string): Promise<number> {
    const result = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count
        FROM "User" u
        WHERE EXISTS (
            SELECT 1 FROM "Follow" f1
            WHERE f1."followerId" = ${userIdA} AND f1."followingId" = u.id
        )
        AND EXISTS (
            SELECT 1 FROM "Follow" f2
            WHERE f2."followerId" = u.id AND f2."followingId" = ${userIdA}
        )
        AND EXISTS (
            SELECT 1 FROM "Follow" f3
            WHERE f3."followerId" = ${userIdB} AND f3."followingId" = u.id
        )
        AND EXISTS (
            SELECT 1 FROM "Follow" f4
            WHERE f4."followerId" = u.id AND f4."followingId" = ${userIdB}
        )
    `;
    return Number(result[0]?.count ?? 0);
}

// ──────────────────────────────────────────────────────────────────
// HELPER: Check if two users are mutually connected
// ──────────────────────────────────────────────────────────────────
async function areMutuallyConnected(userIdA: string, userIdB: string): Promise<boolean> {
    const [followAB, followBA] = await Promise.all([
        prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: userIdA, followingId: userIdB } },
        }),
        prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: userIdB, followingId: userIdA } },
        }),
    ]);
    return !!followAB && !!followBA;
}

// ──────────────────────────────────────────────────────────────────
// HELPER: Check if a user is blocked (either direction)
// ──────────────────────────────────────────────────────────────────
async function isBlocked(userIdA: string, userIdB: string): Promise<boolean> {
    const block = await prisma.block.findFirst({
        where: {
            OR: [
                { blockerId: userIdA, blockedId: userIdB },
                { blockerId: userIdB, blockedId: userIdA },
            ],
        },
    });
    return !!block;
}

// ══════════════════════════════════════════════════════════════════
// 1. GET /  — Get current user's connections (1st degree)
// ══════════════════════════════════════════════════════════════════
router.get('/', async (req: AuthRequest, res, next) => {
    try {
        const userId = req.userId!;
        const limit = clampLimit(req.query.limit as string);
        const cursor = req.query.cursor as string | undefined;
        const search = req.query.search as string | undefined;

        // Use raw query for efficient mutual-follow detection with cursor pagination
        // We order by the Follow.createdAt of the outgoing follow to get "connectedSince"
        type ConnectionRow = {
            id: string;
            username: string;
            displayName: string;
            avatarUrl: string | null;
            isVerified: boolean;
            connectedSince: Date;
        };

        const fetchLimit = limit + 1;
        let connections: ConnectionRow[];

        if (search && cursor) {
            const searchPattern = `%${search}%`;
            connections = await prisma.$queryRaw<ConnectionRow[]>`
                SELECT u.id, u.username, u."displayName", u."avatarUrl", u."isVerified",
                       GREATEST(f1."createdAt", f2."createdAt") as "connectedSince"
                FROM "User" u
                INNER JOIN "Follow" f1 ON f1."followerId" = ${userId} AND f1."followingId" = u.id
                INNER JOIN "Follow" f2 ON f2."followerId" = u.id AND f2."followingId" = ${userId}
                WHERE (u."displayName" ILIKE ${searchPattern} OR u."username" ILIKE ${searchPattern})
                AND GREATEST(f1."createdAt", f2."createdAt") < (
                    SELECT GREATEST(fa."createdAt", fb."createdAt")
                    FROM "Follow" fa
                    INNER JOIN "Follow" fb ON fb."followerId" = fa."followingId" AND fb."followingId" = ${userId}
                    WHERE fa."followerId" = ${userId} AND fa."followingId" = ${cursor}
                )
                ORDER BY "connectedSince" DESC
                LIMIT ${fetchLimit}
            `;
        } else if (search) {
            const searchPattern = `%${search}%`;
            connections = await prisma.$queryRaw<ConnectionRow[]>`
                SELECT u.id, u.username, u."displayName", u."avatarUrl", u."isVerified",
                       GREATEST(f1."createdAt", f2."createdAt") as "connectedSince"
                FROM "User" u
                INNER JOIN "Follow" f1 ON f1."followerId" = ${userId} AND f1."followingId" = u.id
                INNER JOIN "Follow" f2 ON f2."followerId" = u.id AND f2."followingId" = ${userId}
                WHERE (u."displayName" ILIKE ${searchPattern} OR u."username" ILIKE ${searchPattern})
                ORDER BY "connectedSince" DESC
                LIMIT ${fetchLimit}
            `;
        } else if (cursor) {
            connections = await prisma.$queryRaw<ConnectionRow[]>`
                SELECT u.id, u.username, u."displayName", u."avatarUrl", u."isVerified",
                       GREATEST(f1."createdAt", f2."createdAt") as "connectedSince"
                FROM "User" u
                INNER JOIN "Follow" f1 ON f1."followerId" = ${userId} AND f1."followingId" = u.id
                INNER JOIN "Follow" f2 ON f2."followerId" = u.id AND f2."followingId" = ${userId}
                WHERE GREATEST(f1."createdAt", f2."createdAt") < (
                    SELECT GREATEST(fa."createdAt", fb."createdAt")
                    FROM "Follow" fa
                    INNER JOIN "Follow" fb ON fb."followerId" = fa."followingId" AND fb."followingId" = ${userId}
                    WHERE fa."followerId" = ${userId} AND fa."followingId" = ${cursor}
                )
                ORDER BY "connectedSince" DESC
                LIMIT ${fetchLimit}
            `;
        } else {
            connections = await prisma.$queryRaw<ConnectionRow[]>`
                SELECT u.id, u.username, u."displayName", u."avatarUrl", u."isVerified",
                       GREATEST(f1."createdAt", f2."createdAt") as "connectedSince"
                FROM "User" u
                INNER JOIN "Follow" f1 ON f1."followerId" = ${userId} AND f1."followingId" = u.id
                INNER JOIN "Follow" f2 ON f2."followerId" = u.id AND f2."followingId" = ${userId}
                ORDER BY "connectedSince" DESC
                LIMIT ${fetchLimit}
            `;
        }

        const hasMore = connections.length > limit;
        const items = connections.slice(0, limit);

        // Enrich with mutual connection counts (batch for performance)
        const enriched = await Promise.all(
            items.map(async (conn) => ({
                ...conn,
                mutualConnectionsCount: await countMutualConnections(userId, conn.id),
            }))
        );

        res.json({
            connections: enriched,
            nextCursor: hasMore ? items[items.length - 1]?.id : null,
            hasMore,
        });
    } catch (error) {
        next(error);
    }
});

// ══════════════════════════════════════════════════════════════════
// 2. GET /requests — Get pending connection requests
// ══════════════════════════════════════════════════════════════════
router.get('/requests', async (req: AuthRequest, res, next) => {
    try {
        const userId = req.userId!;
        const type = (req.query.type as string) || 'received';

        if (type !== 'received' && type !== 'sent') {
            throw new AppError('Invalid type. Must be "received" or "sent".', 400);
        }

        const requests = await prisma.connectionRequest.findMany({
            where: type === 'received'
                ? { receiverId: userId, status: 'PENDING' }
                : { senderId: userId, status: 'PENDING' },
            take: 100,
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
            orderBy: { createdAt: 'desc' },
        });

        // Enrich with mutual connection counts
        const enriched = await Promise.all(
            requests.map(async (req_item) => {
                const otherUserId = type === 'received' ? req_item.senderId : req_item.receiverId;
                const mutualConnectionsCount = await countMutualConnections(userId, otherUserId);
                return {
                    id: req_item.id,
                    sender: req_item.sender,
                    receiver: req_item.receiver,
                    message: req_item.message,
                    createdAt: req_item.createdAt,
                    mutualConnectionsCount,
                };
            })
        );

        res.json({ requests: enriched });
    } catch (error) {
        next(error);
    }
});

// ══════════════════════════════════════════════════════════════════
// 3. POST /request/:userId — Send connection request
// ══════════════════════════════════════════════════════════════════
router.post('/request/:userId', async (req: AuthRequest, res, next) => {
    try {
        const senderId = req.userId!;
        const receiverId = req.params.userId;
        const { message } = req.body as { message?: string };

        // Validate: not self
        if (senderId === receiverId) {
            throw new AppError('Cannot send a connection request to yourself', 400);
        }

        // Validate: target user exists
        const targetUser = await prisma.user.findUnique({
            where: { id: receiverId },
            select: { id: true, displayName: true },
        });
        if (!targetUser) {
            throw new AppError('User not found', 404);
        }

        // Validate: not blocked
        if (await isBlocked(senderId, receiverId)) {
            throw new AppError('Cannot send connection request to this user', 403);
        }

        // Validate: not already connected (mutual follow)
        if (await areMutuallyConnected(senderId, receiverId)) {
            throw new AppError('You are already connected with this user', 409);
        }

        // Validate: no pending request in either direction
        const existingRequest = await prisma.connectionRequest.findFirst({
            where: {
                OR: [
                    { senderId, receiverId, status: 'PENDING' },
                    { senderId: receiverId, receiverId: senderId, status: 'PENDING' },
                ],
            },
        });
        if (existingRequest) {
            throw new AppError('A connection request already exists between you and this user', 409);
        }

        // Create connection request (upsert to prevent race-condition duplicates)
        const request = await prisma.connectionRequest.upsert({
            where: {
                senderId_receiverId: { senderId, receiverId },
            },
            create: {
                senderId,
                receiverId,
                status: 'PENDING',
                message: message?.slice(0, 500) || null,
            },
            update: {}, // If already exists, do nothing
        });

        // Create notification for the receiver
        const senderUser = await prisma.user.findUnique({
            where: { id: senderId },
            select: { displayName: true },
        });

        await prisma.notification.create({
            data: {
                userId: receiverId,
                type: 'CONNECTION_REQUEST',
                actorId: senderId,
                targetId: request.id,
                message: `${senderUser?.displayName ?? 'Someone'} sent you a connection request`,
            },
        });

        logger.info(`Connection request sent: ${senderId} -> ${receiverId}`);

        res.status(201).json({
            request: {
                id: request.id,
                status: request.status,
            },
        });
    } catch (error) {
        next(error);
    }
});

// ══════════════════════════════════════════════════════════════════
// 4. POST /accept/:requestId — Accept connection request
// ══════════════════════════════════════════════════════════════════
router.post('/accept/:requestId', async (req: AuthRequest, res, next) => {
    try {
        const userId = req.userId!;
        const { requestId } = req.params;

        // Find the request
        const connectionRequest = await prisma.connectionRequest.findUnique({
            where: { id: requestId },
            include: {
                sender: { select: { id: true, displayName: true } },
            },
        });

        if (!connectionRequest) {
            throw new AppError('Connection request not found', 404);
        }

        // Only the receiver can accept
        if (connectionRequest.receiverId !== userId) {
            throw new AppError('You can only accept requests sent to you', 403);
        }

        if (connectionRequest.status !== 'PENDING') {
            throw new AppError(`Request has already been ${connectionRequest.status.toLowerCase()}`, 409);
        }

        // Accept: create mutual follows + update request in a transaction
        await prisma.$transaction(async (tx) => {
            // Create mutual Follow records using upsert (idempotent)
            await tx.follow.upsert({
                where: {
                    followerId_followingId: {
                        followerId: connectionRequest.senderId,
                        followingId: connectionRequest.receiverId,
                    },
                },
                update: {},
                create: {
                    followerId: connectionRequest.senderId,
                    followingId: connectionRequest.receiverId,
                },
            });

            await tx.follow.upsert({
                where: {
                    followerId_followingId: {
                        followerId: connectionRequest.receiverId,
                        followingId: connectionRequest.senderId,
                    },
                },
                update: {},
                create: {
                    followerId: connectionRequest.receiverId,
                    followingId: connectionRequest.senderId,
                },
            });

            // Update request status
            await tx.connectionRequest.update({
                where: { id: requestId },
                data: { status: 'ACCEPTED' },
            });
        });

        // Notify the sender that their request was accepted
        const acceptorUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { displayName: true },
        });

        await prisma.notification.create({
            data: {
                userId: connectionRequest.senderId,
                type: 'CONNECTION_ACCEPTED',
                actorId: userId,
                targetId: requestId,
                message: `${acceptorUser?.displayName ?? 'Someone'} accepted your connection request`,
            },
        });

        logger.info(`Connection accepted: ${connectionRequest.senderId} <-> ${connectionRequest.receiverId}`);

        res.json({ connected: true });
    } catch (error) {
        next(error);
    }
});

// ══════════════════════════════════════════════════════════════════
// 5. POST /decline/:requestId — Decline connection request
// ══════════════════════════════════════════════════════════════════
router.post('/decline/:requestId', async (req: AuthRequest, res, next) => {
    try {
        const userId = req.userId!;
        const { requestId } = req.params;

        const connectionRequest = await prisma.connectionRequest.findUnique({
            where: { id: requestId },
        });

        if (!connectionRequest) {
            throw new AppError('Connection request not found', 404);
        }

        // Only the receiver can decline
        if (connectionRequest.receiverId !== userId) {
            throw new AppError('You can only decline requests sent to you', 403);
        }

        if (connectionRequest.status !== 'PENDING') {
            throw new AppError(`Request has already been ${connectionRequest.status.toLowerCase()}`, 409);
        }

        await prisma.connectionRequest.update({
            where: { id: requestId },
            data: { status: 'DECLINED' },
        });

        logger.info(`Connection declined: ${connectionRequest.senderId} -> ${connectionRequest.receiverId}`);

        res.json({ declined: true });
    } catch (error) {
        next(error);
    }
});

// ══════════════════════════════════════════════════════════════════
// 6. DELETE /:userId — Remove connection
// ══════════════════════════════════════════════════════════════════
router.delete('/:userId', async (req: AuthRequest, res, next) => {
    try {
        const userId = req.userId!;
        const targetId = req.params.userId;

        if (userId === targetId) {
            throw new AppError('Cannot disconnect from yourself', 400);
        }

        // Delete both follow records in a transaction
        await prisma.$transaction(async (tx) => {
            await tx.follow.deleteMany({
                where: {
                    OR: [
                        { followerId: userId, followingId: targetId },
                        { followerId: targetId, followingId: userId },
                    ],
                },
            });

            // Also clean up any accepted connection requests between them
            await tx.connectionRequest.updateMany({
                where: {
                    OR: [
                        { senderId: userId, receiverId: targetId, status: 'ACCEPTED' },
                        { senderId: targetId, receiverId: userId, status: 'ACCEPTED' },
                    ],
                },
                data: { status: 'DECLINED' },
            });
        });

        logger.info(`Connection removed: ${userId} <-> ${targetId}`);

        res.json({ disconnected: true });
    } catch (error) {
        next(error);
    }
});

// ══════════════════════════════════════════════════════════════════
// 7. GET /degree/:userId — Get connection degree to a specific user
// ══════════════════════════════════════════════════════════════════
router.get('/degree/:userId', async (req: AuthRequest, res, next) => {
    try {
        const userId = req.userId!;
        const targetId = req.params.userId;

        if (userId === targetId) {
            res.json({ degree: 0, path: [], mutualConnections: [] });
            return;
        }

        // Check degree 1: direct mutual follow
        const isDirectConnection = await areMutuallyConnected(userId, targetId);
        if (isDirectConnection) {
            const mutualConns = await getMutualConnectionUsers(userId, targetId, 5);
            res.json({ degree: 1, path: [], mutualConnections: mutualConns });
            return;
        }

        // Check degree 2: connections of my connections
        const myConnectionIds = await getConnectionIds(userId);
        if (myConnectionIds.length > 0) {
            // Find which of my connections are also connected to the target
            const bridgeUsers = await prisma.$queryRaw<Array<{
                id: string;
                displayName: string;
                avatarUrl: string | null;
            }>>`
                SELECT u.id, u."displayName", u."avatarUrl"
                FROM "User" u
                WHERE u.id = ANY(${myConnectionIds}::text[])
                AND EXISTS (
                    SELECT 1 FROM "Follow" f1
                    WHERE f1."followerId" = u.id AND f1."followingId" = ${targetId}
                )
                AND EXISTS (
                    SELECT 1 FROM "Follow" f2
                    WHERE f2."followerId" = ${targetId} AND f2."followingId" = u.id
                )
                LIMIT 5
            `;

            if (bridgeUsers.length > 0) {
                const mutualConns = await getMutualConnectionUsers(userId, targetId, 5);
                res.json({
                    degree: 2,
                    path: bridgeUsers.map(u => ({
                        id: u.id,
                        displayName: u.displayName,
                        avatarUrl: u.avatarUrl,
                    })),
                    mutualConnections: mutualConns,
                });
                return;
            }

            // Check degree 3: connections of 2nd-degree connections
            // Get 2nd-degree connection IDs (connections of my connections, excluding me and my direct connections)
            const excludeIds = [userId, ...myConnectionIds];
            const secondDegreeIds = await prisma.$queryRaw<{ id: string }[]>`
                SELECT DISTINCT u.id
                FROM "User" u
                INNER JOIN "Follow" f1 ON f1."followingId" = u.id AND f1."followerId" = ANY(${myConnectionIds}::text[])
                INNER JOIN "Follow" f2 ON f2."followerId" = u.id AND f2."followingId" = ANY(${myConnectionIds}::text[])
                WHERE u.id != ALL(${excludeIds}::text[])
                LIMIT 1000
            `;

            if (secondDegreeIds.length > 0) {
                const secondDegreeIdList = secondDegreeIds.map(s => s.id);

                // Check if any 2nd-degree connection is connected to the target
                const thirdDegreeBridge = await prisma.$queryRaw<Array<{
                    id: string;
                    displayName: string;
                    avatarUrl: string | null;
                }>>`
                    SELECT u.id, u."displayName", u."avatarUrl"
                    FROM "User" u
                    WHERE u.id = ANY(${secondDegreeIdList}::text[])
                    AND EXISTS (
                        SELECT 1 FROM "Follow" f1
                        WHERE f1."followerId" = u.id AND f1."followingId" = ${targetId}
                    )
                    AND EXISTS (
                        SELECT 1 FROM "Follow" f2
                        WHERE f2."followerId" = ${targetId} AND f2."followingId" = u.id
                    )
                    LIMIT 3
                `;

                if (thirdDegreeBridge.length > 0) {
                    res.json({
                        degree: 3,
                        path: thirdDegreeBridge.map(u => ({
                            id: u.id,
                            displayName: u.displayName,
                            avatarUrl: u.avatarUrl,
                        })),
                        mutualConnections: [],
                    });
                    return;
                }
            }
        }

        // Beyond 3rd degree or no path found
        res.json({ degree: null, path: [], mutualConnections: [] });
    } catch (error) {
        next(error);
    }
});

// ──────────────────────────────────────────────────────────────────
// HELPER: Get mutual connection user objects
// ──────────────────────────────────────────────────────────────────
async function getMutualConnectionUsers(
    userIdA: string,
    userIdB: string,
    maxResults: number
): Promise<Array<{ id: string; displayName: string; avatarUrl: string | null }>> {
    return prisma.$queryRaw<Array<{
        id: string;
        displayName: string;
        avatarUrl: string | null;
    }>>`
        SELECT u.id, u."displayName", u."avatarUrl"
        FROM "User" u
        WHERE EXISTS (
            SELECT 1 FROM "Follow" f1
            WHERE f1."followerId" = ${userIdA} AND f1."followingId" = u.id
        )
        AND EXISTS (
            SELECT 1 FROM "Follow" f2
            WHERE f2."followerId" = u.id AND f2."followingId" = ${userIdA}
        )
        AND EXISTS (
            SELECT 1 FROM "Follow" f3
            WHERE f3."followerId" = ${userIdB} AND f3."followingId" = u.id
        )
        AND EXISTS (
            SELECT 1 FROM "Follow" f4
            WHERE f4."followerId" = u.id AND f4."followingId" = ${userIdB}
        )
        LIMIT ${maxResults}
    `;
}

// ══════════════════════════════════════════════════════════════════
// 8. GET /mutual/:userId — Get mutual connections with a user
// ══════════════════════════════════════════════════════════════════
router.get('/mutual/:userId', async (req: AuthRequest, res, next) => {
    try {
        const userId = req.userId!;
        const targetId = req.params.userId;
        const limit = clampLimit(req.query.limit as string);
        const cursor = req.query.cursor as string | undefined;

        if (userId === targetId) {
            throw new AppError('Cannot get mutual connections with yourself', 400);
        }

        // Get mutual connections: users connected to BOTH me and the target
        type MutualConnectionRow = {
            id: string;
            username: string;
            displayName: string;
            avatarUrl: string | null;
            isVerified: boolean;
        };

        const fetchLimit = limit + 1;
        let mutualConnections: MutualConnectionRow[];

        if (cursor) {
            mutualConnections = await prisma.$queryRaw<MutualConnectionRow[]>`
                SELECT u.id, u.username, u."displayName", u."avatarUrl", u."isVerified"
                FROM "User" u
                WHERE EXISTS (
                    SELECT 1 FROM "Follow" f1
                    WHERE f1."followerId" = ${userId} AND f1."followingId" = u.id
                )
                AND EXISTS (
                    SELECT 1 FROM "Follow" f2
                    WHERE f2."followerId" = u.id AND f2."followingId" = ${userId}
                )
                AND EXISTS (
                    SELECT 1 FROM "Follow" f3
                    WHERE f3."followerId" = ${targetId} AND f3."followingId" = u.id
                )
                AND EXISTS (
                    SELECT 1 FROM "Follow" f4
                    WHERE f4."followerId" = u.id AND f4."followingId" = ${targetId}
                )
                AND u.id > ${cursor}
                ORDER BY u.id ASC
                LIMIT ${fetchLimit}
            `;
        } else {
            mutualConnections = await prisma.$queryRaw<MutualConnectionRow[]>`
                SELECT u.id, u.username, u."displayName", u."avatarUrl", u."isVerified"
                FROM "User" u
                WHERE EXISTS (
                    SELECT 1 FROM "Follow" f1
                    WHERE f1."followerId" = ${userId} AND f1."followingId" = u.id
                )
                AND EXISTS (
                    SELECT 1 FROM "Follow" f2
                    WHERE f2."followerId" = u.id AND f2."followingId" = ${userId}
                )
                AND EXISTS (
                    SELECT 1 FROM "Follow" f3
                    WHERE f3."followerId" = ${targetId} AND f3."followingId" = u.id
                )
                AND EXISTS (
                    SELECT 1 FROM "Follow" f4
                    WHERE f4."followerId" = u.id AND f4."followingId" = ${targetId}
                )
                ORDER BY u.id ASC
                LIMIT ${fetchLimit}
            `;
        }

        const hasMore = mutualConnections.length > limit;
        const items = mutualConnections.slice(0, limit);

        res.json({
            mutualConnections: items,
            nextCursor: hasMore ? items[items.length - 1]?.id : null,
            hasMore,
        });
    } catch (error) {
        next(error);
    }
});

// ══════════════════════════════════════════════════════════════════
// 9. GET /suggestions — Get connection suggestions
// ══════════════════════════════════════════════════════════════════
router.get('/suggestions', async (req: AuthRequest, res, next) => {
    try {
        const userId = req.userId!;
        const limit = clampLimit(req.query.limit as string, 30, 15);

        // Get my current connections
        const myConnectionIds = await getConnectionIds(userId);

        if (myConnectionIds.length === 0) {
            // No connections yet — suggest popular users from shared communities
            const communitySuggestions = await prisma.$queryRaw<Array<{
                id: string;
                username: string;
                displayName: string;
                avatarUrl: string | null;
                isVerified: boolean;
                mutualConnectionsCount: number;
            }>>`
                SELECT DISTINCT u.id, u.username, u."displayName", u."avatarUrl", u."isVerified",
                       0 as "mutualConnectionsCount"
                FROM "User" u
                INNER JOIN "CommunityMember" cm1 ON cm1."userId" = u.id
                INNER JOIN "CommunityMember" cm2 ON cm2."communityId" = cm1."communityId" AND cm2."userId" = ${userId}
                WHERE u.id != ${userId}
                AND u."isBanned" = false
                AND NOT EXISTS (
                    SELECT 1 FROM "Block" b
                    WHERE (b."blockerId" = ${userId} AND b."blockedId" = u.id)
                       OR (b."blockerId" = u.id AND b."blockedId" = ${userId})
                )
                ORDER BY u."lastActiveAt" DESC
                LIMIT ${limit}
            `;

            res.json({ suggestions: communitySuggestions });
            return;
        }

        // Get blocked user IDs
        const blockedUsers = await prisma.block.findMany({
            where: {
                OR: [
                    { blockerId: userId },
                    { blockedId: userId },
                ],
            },
            take: 100,
            select: { blockerId: true, blockedId: true },
        });
        const blockedIds = blockedUsers.map(b =>
            b.blockerId === userId ? b.blockedId : b.blockerId
        );

        // Get pending request user IDs
        const pendingRequests = await prisma.connectionRequest.findMany({
            where: {
                OR: [
                    { senderId: userId, status: 'PENDING' },
                    { receiverId: userId, status: 'PENDING' },
                ],
            },
            take: 100,
            select: { senderId: true, receiverId: true },
        });
        const pendingIds = pendingRequests.map(r =>
            r.senderId === userId ? r.receiverId : r.senderId
        );

        // Exclude: self, already connected, blocked, pending requests
        const excludeIds = [userId, ...myConnectionIds, ...blockedIds, ...pendingIds];

        // Find 2nd-degree connections (friends of friends) ranked by mutual connection count
        const suggestions = await prisma.$queryRaw<Array<{
            id: string;
            username: string;
            displayName: string;
            avatarUrl: string | null;
            isVerified: boolean;
            mutualConnectionsCount: number;
            sharedCommunities: number;
        }>>`
            SELECT u.id, u.username, u."displayName", u."avatarUrl", u."isVerified",
                   COUNT(DISTINCT bridge.id) as "mutualConnectionsCount",
                   COALESCE(shared_comm.cnt, 0) as "sharedCommunities"
            FROM "User" u
            INNER JOIN "Follow" f1 ON f1."followingId" = u.id AND f1."followerId" = ANY(${myConnectionIds}::text[])
            INNER JOIN "Follow" f2 ON f2."followerId" = u.id AND f2."followingId" = ANY(${myConnectionIds}::text[])
            INNER JOIN "User" bridge ON bridge.id = f1."followerId"
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::int as cnt
                FROM "CommunityMember" cm1
                INNER JOIN "CommunityMember" cm2 ON cm2."communityId" = cm1."communityId" AND cm2."userId" = ${userId}
                WHERE cm1."userId" = u.id
            ) shared_comm ON true
            WHERE u.id != ALL(${excludeIds}::text[])
            AND u."isBanned" = false
            GROUP BY u.id, u.username, u."displayName", u."avatarUrl", u."isVerified", shared_comm.cnt
            ORDER BY "mutualConnectionsCount" DESC, "sharedCommunities" DESC, u."lastActiveAt" DESC
            LIMIT ${limit}
        `;

        // Convert bigint counts to numbers
        const formattedSuggestions = suggestions.map(s => ({
            ...s,
            mutualConnectionsCount: Number(s.mutualConnectionsCount),
            sharedCommunities: Number(s.sharedCommunities),
        }));

        res.json({ suggestions: formattedSuggestions });
    } catch (error) {
        next(error);
    }
});

// ══════════════════════════════════════════════════════════════════
// 10. GET /stats — Connection statistics
// ══════════════════════════════════════════════════════════════════
router.get('/stats', async (req: AuthRequest, res, next) => {
    try {
        const userId = req.userId!;

        // Total connections (mutual follows)
        const totalConnectionsResult = await prisma.$queryRaw<{ count: bigint }[]>`
            SELECT COUNT(*) as count
            FROM "User" u
            WHERE EXISTS (
                SELECT 1 FROM "Follow" f1
                WHERE f1."followerId" = ${userId} AND f1."followingId" = u.id
            )
            AND EXISTS (
                SELECT 1 FROM "Follow" f2
                WHERE f2."followerId" = u.id AND f2."followingId" = ${userId}
            )
        `;
        const totalConnections = Number(totalConnectionsResult[0]?.count ?? 0);

        // Pending received
        const pendingReceived = await prisma.connectionRequest.count({
            where: { receiverId: userId, status: 'PENDING' },
        });

        // Pending sent
        const pendingSent = await prisma.connectionRequest.count({
            where: { senderId: userId, status: 'PENDING' },
        });

        // Connection growth: new mutual follows in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const growthResult = await prisma.$queryRaw<{ count: bigint }[]>`
            SELECT COUNT(*) as count
            FROM "User" u
            INNER JOIN "Follow" f1 ON f1."followerId" = ${userId} AND f1."followingId" = u.id
            INNER JOIN "Follow" f2 ON f2."followerId" = u.id AND f2."followingId" = ${userId}
            WHERE GREATEST(f1."createdAt", f2."createdAt") >= ${thirtyDaysAgo}
        `;
        const connectionGrowth = Number(growthResult[0]?.count ?? 0);

        res.json({
            totalConnections,
            pendingReceived,
            pendingSent,
            connectionGrowth,
        });
    } catch (error) {
        next(error);
    }
});

export default router;
