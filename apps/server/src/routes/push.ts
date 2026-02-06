import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../db/client.js';

const router = Router();

// Register push subscription
router.post('/subscribe', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { endpoint, keys } = req.body;

        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            res.status(400).json({ error: 'Invalid push subscription data' });
            return;
        }

        // Upsert by endpoint to avoid duplicates
        const existing = await prisma.pushSubscription.findFirst({
            where: { userId: req.userId!, endpoint },
        });

        if (existing) {
            await prisma.pushSubscription.update({
                where: { id: existing.id },
                data: { p256dh: keys.p256dh, auth: keys.auth },
            });
        } else {
            await prisma.pushSubscription.create({
                data: {
                    userId: req.userId!,
                    endpoint,
                    p256dh: keys.p256dh,
                    auth: keys.auth,
                },
            });
        }

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// Unsubscribe
router.delete('/subscribe', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { endpoint } = req.body;

        if (endpoint) {
            await prisma.pushSubscription.deleteMany({
                where: { userId: req.userId!, endpoint },
            });
        } else {
            // Delete all subscriptions for user
            await prisma.pushSubscription.deleteMany({
                where: { userId: req.userId! },
            });
        }

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// Get notification preferences
router.get('/preferences', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        let prefs = await prisma.notificationPreferences.findUnique({
            where: { userId: req.userId! },
        });

        if (!prefs) {
            res.json({
                pushEnabled: true,
                emailDigest: 'daily',
                quietHoursFrom: null,
                quietHoursTo: null,
                quietTimezone: null,
                channels: { social: true, communities: true, messages: true, system: true },
            });
            return;
        }

        res.json(prefs);
    } catch (error) {
        next(error);
    }
});

// Update notification preferences
router.put('/preferences', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { pushEnabled, emailDigest, quietHoursFrom, quietHoursTo, quietTimezone, channels } = req.body;

        const prefs = await prisma.notificationPreferences.upsert({
            where: { userId: req.userId! },
            update: {
                pushEnabled: pushEnabled ?? true,
                emailDigest: emailDigest ?? 'daily',
                quietHoursFrom: quietHoursFrom ?? null,
                quietHoursTo: quietHoursTo ?? null,
                quietTimezone: quietTimezone ?? null,
                channels: channels ?? {},
            },
            create: {
                userId: req.userId!,
                pushEnabled: pushEnabled ?? true,
                emailDigest: emailDigest ?? 'daily',
                quietHoursFrom: quietHoursFrom ?? null,
                quietHoursTo: quietHoursTo ?? null,
                quietTimezone: quietTimezone ?? null,
                channels: channels ?? {},
            },
        });

        res.json(prefs);
    } catch (error) {
        next(error);
    }
});

export default router;
