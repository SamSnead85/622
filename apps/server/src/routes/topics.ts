import { Router } from 'express';
import { prisma } from '../db/client.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { rateLimiters } from '../middleware/rateLimit.js';
import { z } from 'zod';

const router = Router();

// Apply general rate limiting to all topic endpoints
router.use(rateLimiters.general);

// GET /api/v1/topics - List all topics
router.get('/', async (req, res, next) => {
    try {
        const topics = await prisma.topic.findMany({
            where: { isActive: true },
            orderBy: { postCount: 'desc' },
            select: {
                id: true,
                slug: true,
                name: true,
                description: true,
                icon: true,
                color: true,
                postCount: true,
            },
            take: 100,
        });

        res.json({ topics });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/topics/:slug - Get topic details
router.get('/:slug', async (req, res, next) => {
    try {
        const { slug } = req.params;

        const topic = await prisma.topic.findUnique({
            where: { slug },
            include: {
                _count: {
                    select: {
                        posts: true,
                        userInterests: true,
                    },
                },
            },
        });

        if (!topic) {
            throw new AppError('Topic not found', 404);
        }

        res.json(topic);
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/topics/user/interests - Get current user's interests
router.get('/user/interests', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const interests = await prisma.userInterest.findMany({
            where: { userId: req.userId },
            include: {
                topic: {
                    select: {
                        id: true,
                        slug: true,
                        name: true,
                        description: true,
                        icon: true,
                        color: true,
                    },
                },
            },
        });

        res.json({ interests });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/topics/user/interests - Update user interests
const updateInterestsSchema = z.object({
    topicIds: z.array(z.string()),
    level: z.enum(['NOT_INTERESTED', 'INTERESTED', 'VERY_INTERESTED']).optional(),
});

router.post('/user/interests', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { topicIds, level = 'INTERESTED' } = updateInterestsSchema.parse(req.body);

        // Remove existing interests not in the new list
        await prisma.userInterest.deleteMany({
            where: {
                userId: req.userId,
                topicId: { notIn: topicIds },
            },
        });

        // Upsert new interests
        const interests = await Promise.all(
            topicIds.map((topicId) =>
                prisma.userInterest.upsert({
                    where: {
                        userId_topicId: {
                            userId: req.userId!,
                            topicId,
                        },
                    },
                    update: { level },
                    create: {
                        userId: req.userId!,
                        topicId,
                        level,
                    },
                    include: {
                        topic: {
                            select: {
                                id: true,
                                slug: true,
                                name: true,
                                icon: true,
                                color: true,
                            },
                        },
                    },
                })
            )
        );

        res.json({ interests });
    } catch (error) {
        next(error);
    }
});

// PUT /api/v1/topics/user/interests/:topicId - Update interest level
const updateInterestLevelSchema = z.object({
    level: z.enum(['NOT_INTERESTED', 'INTERESTED', 'VERY_INTERESTED']),
});

router.put('/user/interests/:topicId', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { topicId } = req.params;
        const { level } = updateInterestLevelSchema.parse(req.body);

        const interest = await prisma.userInterest.upsert({
            where: {
                userId_topicId: {
                    userId: req.userId!,
                    topicId,
                },
            },
            update: { level },
            create: {
                userId: req.userId!,
                topicId,
                level,
            },
            include: {
                topic: true,
            },
        });

        res.json(interest);
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/topics/user/interests/:topicId - Remove interest
router.delete('/user/interests/:topicId', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { topicId } = req.params;

        await prisma.userInterest.delete({
            where: {
                userId_topicId: {
                    userId: req.userId!,
                    topicId,
                },
            },
        });

        res.json({ message: 'Interest removed successfully' });
    } catch (error) {
        next(error);
    }
});

export default router;
