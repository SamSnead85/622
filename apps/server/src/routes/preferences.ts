import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../db/client.js';

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
router.put('/feed', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { recencyWeight, engagementWeight, followingRatio, contentTypes } = req.body;

        const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

        const prefs = await prisma.userFeedPreferences.upsert({
            where: { userId: req.userId! },
            update: {
                recencyWeight: clamp(recencyWeight ?? 50, 0, 100),
                engagementWeight: clamp(engagementWeight ?? 50, 0, 100),
                followingRatio: clamp(followingRatio ?? 70, 0, 100),
                contentTypes: contentTypes ?? {},
            },
            create: {
                userId: req.userId!,
                recencyWeight: clamp(recencyWeight ?? 50, 0, 100),
                engagementWeight: clamp(engagementWeight ?? 50, 0, 100),
                followingRatio: clamp(followingRatio ?? 70, 0, 100),
                contentTypes: contentTypes ?? {},
            },
        });

        res.json(prefs);
    } catch (error) {
        next(error);
    }
});

export default router;
