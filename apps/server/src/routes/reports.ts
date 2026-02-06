
import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Validation schemas
const createReportSchema = z.object({
    targetId: z.string().uuid(),
    targetType: z.enum(['POST', 'USER', 'COMMENT', 'COMMUNITY', 'LIVESTREAM', 'MESSAGE']),
    reason: z.string().min(1).max(1000)
});

// ============================================
// POST /api/v1/reports
// Submit a report
// ============================================
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const input = createReportSchema.parse(req.body);

        const report = await prisma.report.create({
            data: {
                reporterId: req.userId!,
                targetId: input.targetId,
                targetType: input.targetType,
                reason: input.reason,
                status: 'PENDING'
            }
        });

        res.status(201).json({ report });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        next(error);
    }
});

// ============================================
// GET /api/v1/reports
// List reports (Admin only)
// ============================================
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPERADMIN') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const reports = await prisma.report.findMany({
            include: {
                reporter: {
                    select: { username: true, displayName: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ reports });
    } catch (error) {
        next(error);
    }
});

// ============================================
// PUT /api/v1/reports/:id
// Update report status (Admin only)
// ============================================
router.put('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPERADMIN') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { status, notes } = req.body;

        // Validate Status Enum?
        // Let Prisma handle enum validation or Zod. 
        // For now, raw update is fine, prisma will throw if invalid.

        const report = await prisma.report.update({
            where: { id: req.params.id },
            data: { status, notes }
        });

        res.json({ report });

    } catch (error) {
        next(error);
    }
});

export { router as reportRouter };
