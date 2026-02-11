import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { momentService } from '../services/MomentService.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Validation schemas
const createMomentSchema = z.object({
    type: z.enum(['IMAGE', 'VIDEO', 'TEXT']),
    mediaUrl: z.string().url(),
    thumbnailUrl: z.string().url().optional(),
    duration: z.number().int().positive().optional(),
    caption: z.string().max(2200).optional(),
    musicId: z.string().uuid().optional(),
});

// ============================================
// MOMENTS ROUTES
// ============================================

/**
 * GET /api/v1/moments
 * Get all active moments (stories)
 */
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // If not authenticated, return empty array
        if (!req.user?.id) {
            return res.json({ moments: [] });
        }
        const moments = await momentService.getMomentsFeed(req.user.id);
        res.json({ moments });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/moments/feed
 * Get moments from people the user follows
 */
router.get('/feed', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const feed = await momentService.getMomentsFeed(req.user.id);
        res.json({ moments: feed });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/moments
 * Create a new moment
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {

        const input = createMomentSchema.parse(req.body);
        const moment = await momentService.createMoment({
            userId: req.user!.id,
            ...input,
        });

        res.status(201).json({ moment });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        next(error);
    }
});

/**
 * GET /api/moments/:id
 * Get a single moment
 */
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const moment = await momentService.getMoment(req.params.id, req.user?.id);

        if (!moment) {
            return res.status(404).json({ error: 'Moment not found or expired' });
        }

        res.json({ moment });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/moments/:id/view
 * Mark a moment as viewed
 */
router.post('/:id/view', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await momentService.viewMoment(req.params.id, req.user!.id);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/moments/:id/viewers
 * Get viewers of a moment (owner only)
 */
router.get('/:id/viewers', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const viewers = await momentService.getMomentViewers(req.params.id, req.user!.id);
        res.json({ viewers });
    } catch (error) {
        if ((error as Error).message.includes('not authorized')) {
            return res.status(403).json({ error: 'Not authorized to view this moment\'s viewers' });
        }
        next(error);
    }
});

/**
 * DELETE /api/moments/:id
 * Delete a moment
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await momentService.deleteMoment(req.params.id, req.user!.id);
        res.json({ success: true });
    } catch (error) {
        if ((error as Error).message.includes('not authorized')) {
            return res.status(403).json({ error: 'Not authorized to delete this moment' });
        }
        next(error);
    }
});

/**
 * POST /api/moments/cleanup
 * Cleanup expired moments (admin/cron only)
 */
router.post('/cleanup', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // Only admins can trigger manual cleanup
        if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPERADMIN') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const cleanedCount = await momentService.cleanupExpiredMoments();
        res.json({ success: true, cleanedCount });
    } catch (error) {
        next(error);
    }
});

export default router;
