import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../db/client.js';
import { rateLimiters } from '../middleware/rateLimit.js';

const feedPreferencesSchema = z.object({
    recencyWeight: z.number().min(0).max(100).optional(),
    engagementWeight: z.number().min(0).max(100).optional(),
    followingRatio: z.number().min(0).max(100).optional(),
    contentTypes: z.record(z.string(), z.number().min(0).max(2)).optional(),
});

const router = Router();

// Get feed preferences
router.get('/feed', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        let prefs = await prisma.userFeedPreferences.findUnique({
            where: { userId: req.userId! },
        });

        if (!prefs) {
            // Return defaults
            res.json({
                recencyWeight: 50,
                engagementWeight: 50,
                followingRatio: 70,
                contentTypes: { VIDEO: 1.0, IMAGE: 1.0, TEXT: 0.8, AUDIO: 0.8 },
            });
            return;
        }

        res.json(prefs);
    } catch (error) {
        next(error);
    }
});

// Update feed preferences
router.put('/feed', authenticate, rateLimiters.general, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = feedPreferencesSchema.parse(req.body);

        const prefs = await prisma.userFeedPreferences.upsert({
            where: { userId: req.userId! },
            update: {
                recencyWeight: data.recencyWeight ?? 50,
                engagementWeight: data.engagementWeight ?? 50,
                followingRatio: data.followingRatio ?? 70,
                contentTypes: data.contentTypes ?? {},
            },
            create: {
                userId: req.userId!,
                recencyWeight: data.recencyWeight ?? 50,
                engagementWeight: data.engagementWeight ?? 50,
                followingRatio: data.followingRatio ?? 70,
                contentTypes: data.contentTypes ?? {},
            },
        });

        res.json(prefs);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        next(error);
    }
});

export default router;
