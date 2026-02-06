import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../db/client.js';

const router = Router();

// Create scheduled post
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { type, caption, mediaUrl, thumbnailUrl, communityId, topicIds, scheduledFor } = req.body;

        const scheduledDate = new Date(scheduledFor);
        if (scheduledDate <= new Date()) {
            res.status(400).json({ error: 'Scheduled time must be in the future' });
            return;
        }

        const scheduled = await prisma.scheduledPost.create({
            data: {
                userId: req.userId!,
                type: type || 'TEXT',
                caption,
                mediaUrl,
                thumbnailUrl,
                communityId,
                topicIds: topicIds || [],
                scheduledFor: scheduledDate,
            },
        });

        res.status(201).json(scheduled);
    } catch (error) {
        next(error);
    }
});

// List scheduled posts
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const posts = await prisma.scheduledPost.findMany({
            where: {
                userId: req.userId!,
                status: 'PENDING',
            },
            orderBy: { scheduledFor: 'asc' },
        });

        res.json({ posts });
    } catch (error) {
        next(error);
    }
});

// Cancel scheduled post
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const post = await prisma.scheduledPost.findFirst({
            where: { id, userId: req.userId! },
        });

        if (!post) {
            res.status(404).json({ error: 'Scheduled post not found' });
            return;
        }

        if (post.status !== 'PENDING') {
            res.status(400).json({ error: 'Can only cancel pending scheduled posts' });
            return;
        }

        await prisma.scheduledPost.update({
            where: { id },
            data: { status: 'CANCELLED' },
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

export default router;
