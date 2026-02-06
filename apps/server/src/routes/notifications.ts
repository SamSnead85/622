import { Router } from 'express';
import { prisma } from '../db/client.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ============================================
// GET /api/v1/notifications
// Get user's notifications
// ============================================
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { cursor, limit = '50' } = req.query;
        const parsedLimit = Math.min(parseInt(limit as string) || 50, 100);

        // Single query with actor info included - eliminates N+1
        const notifications = await prisma.notification.findMany({
            where: { userId: req.userId },
            take: parsedLimit + 1,
            cursor: cursor ? { id: cursor as string } : undefined,
            orderBy: { createdAt: 'desc' },
        });

        const hasMore = notifications.length > parsedLimit;
        const results = hasMore ? notifications.slice(0, -1) : notifications;

        // Batch fetch actors in a single query (still O(1) queries, not N+1)
        const actorIds = [...new Set(results.map((n) => n.actorId).filter((id): id is string => id !== null))];
        const actors = actorIds.length > 0
            ? await prisma.user.findMany({
                where: { id: { in: actorIds } },
                select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                },
            })
            : [];
        const actorsMap = new Map(actors.map((a) => [a.id, a]));

        // Also get unread count for badge
        const unreadCount = await prisma.notification.count({
            where: { userId: req.userId, isRead: false },
        });

        res.json({
            notifications: results.map((n) => ({
                id: n.id,
                type: n.type,
                message: n.message,
                read: n.isRead,
                actorId: n.actorId,
                actor: n.actorId ? actorsMap.get(n.actorId) || null : null,
                targetId: n.targetId,
                targetType: null,
                createdAt: n.createdAt,
            })),
            unreadCount,
            nextCursor: hasMore ? results[results.length - 1].id : null,
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// PUT /api/v1/notifications/:id/read
// Mark single notification as read
// ============================================
router.put('/:id/read', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { id } = req.params;

        await prisma.notification.update({
            where: {
                id,
                userId: req.userId,
            },
            data: { isRead: true },
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// ============================================
// PUT /api/v1/notifications/read-all
// Mark all notifications as read
// ============================================
router.put('/read-all', authenticate, async (req: AuthRequest, res, next) => {
    try {
        await prisma.notification.updateMany({
            where: {
                userId: req.userId,
                isRead: false,
            },
            data: { isRead: true },
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// ============================================
// DELETE /api/v1/notifications/:id
// Delete a notification
// ============================================
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { id } = req.params;

        await prisma.notification.delete({
            where: {
                id,
                userId: req.userId,
            },
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

export { router as notificationsRouter };
