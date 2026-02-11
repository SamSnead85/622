import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../db/client.js';

const createScheduledPostSchema = z.object({
    type: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'POLL', 'RALLY']).optional().default('TEXT'),
    caption: z.string().min(1).max(5000),
    mediaUrl: z.string().url().optional(),
    thumbnailUrl: z.string().url().optional(),
    communityId: z.string().uuid().optional(),
    topicIds: z.array(z.string()).optional().default([]),
    scheduledFor: z.string().datetime({ message: 'scheduledFor must be a valid ISO 8601 datetime' }),
});

const router = Router();

// Create scheduled post
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = createScheduledPostSchema.parse(req.body);

        const scheduledDate = new Date(data.scheduledFor);
        if (scheduledDate <= new Date()) {
            res.status(400).json({ error: 'Scheduled time must be in the future' });
            return;
        }

        const scheduled = await prisma.scheduledPost.create({
            data: {
                userId: req.userId!,
                type: data.type,
                caption: data.caption,
                mediaUrl: data.mediaUrl,
                thumbnailUrl: data.thumbnailUrl,
                communityId: data.communityId,
                topicIds: data.topicIds,
                scheduledFor: scheduledDate,
            },
        });

        res.status(201).json(scheduled);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
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
