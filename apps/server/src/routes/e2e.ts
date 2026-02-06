import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../db/client.js';

const router = Router();

// Upload key bundle
router.post('/keys', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { identityKey, signedPreKey, preKeySignature, oneTimePreKeys } = req.body;

        if (!identityKey || !signedPreKey || !preKeySignature) {
            res.status(400).json({ error: 'Missing required key bundle fields' });
            return;
        }

        // Upsert key bundle
        const keyBundle = await prisma.userKeyBundle.upsert({
            where: { userId: req.userId! },
            update: {
                identityKey,
                signedPreKey,
                preKeySignature,
                oneTimePreKeys: oneTimePreKeys || [],
                updatedAt: new Date(),
            },
            create: {
                userId: req.userId!,
                identityKey,
                signedPreKey,
                preKeySignature,
                oneTimePreKeys: oneTimePreKeys || [],
            },
        });

        res.json({ success: true, keyBundleId: keyBundle.id });
    } catch (error) {
        next(error);
    }
});

// Get user's public key bundle
router.get('/keys/:userId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { userId } = req.params;

        const keyBundle = await prisma.userKeyBundle.findFirst({
            where: { userId },
            select: {
                identityKey: true,
                signedPreKey: true,
                preKeySignature: true,
                oneTimePreKeys: true,
            },
        });

        if (!keyBundle) {
            res.status(404).json({ error: 'Key bundle not found. User may not have E2E encryption set up.' });
            return;
        }

        // Return and consume one one-time pre-key
        let consumedPreKey: string | null = null;
        if (keyBundle.oneTimePreKeys.length > 0) {
            consumedPreKey = keyBundle.oneTimePreKeys[0];
            // Remove the consumed pre-key
            await prisma.userKeyBundle.updateMany({
                where: { userId },
                data: {
                    oneTimePreKeys: keyBundle.oneTimePreKeys.slice(1),
                },
            });
        }

        res.json({
            identityKey: keyBundle.identityKey,
            signedPreKey: keyBundle.signedPreKey,
            preKeySignature: keyBundle.preKeySignature,
            oneTimePreKeys: consumedPreKey ? [consumedPreKey] : [],
        });
    } catch (error) {
        next(error);
    }
});

// Replenish one-time pre-keys
router.post('/prekeys/replenish', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { newPreKeys } = req.body;

        if (!Array.isArray(newPreKeys) || newPreKeys.length === 0) {
            res.status(400).json({ error: 'Must provide new pre-keys array' });
            return;
        }

        const existing = await prisma.userKeyBundle.findFirst({
            where: { userId: req.userId! },
            select: { oneTimePreKeys: true },
        });

        if (!existing) {
            res.status(404).json({ error: 'No key bundle found. Upload a full bundle first.' });
            return;
        }

        await prisma.userKeyBundle.updateMany({
            where: { userId: req.userId! },
            data: {
                oneTimePreKeys: [...existing.oneTimePreKeys, ...newPreKeys],
            },
        });

        res.json({ success: true, totalPreKeys: existing.oneTimePreKeys.length + newPreKeys.length });
    } catch (error) {
        next(error);
    }
});

export default router;
