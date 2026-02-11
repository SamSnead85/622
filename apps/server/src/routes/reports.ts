
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

        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const skip = (page - 1) * limit;

        const [reports, total] = await Promise.all([
            prisma.report.findMany({
                include: {
                    reporter: {
                        select: { username: true, displayName: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
            }),
            prisma.report.count(),
        ]);

        res.json({ data: reports, meta: { page, limit, total } });
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

        const updateSchema = z.object({
            status: z.enum(['PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED']),
            notes: z.string().max(5000).optional(),
        });
        const data = updateSchema.parse(req.body);

        const report = await prisma.report.update({
            where: { id: req.params.id },
            data: { status: data.status, notes: data.notes }
        });

        res.json({ report });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        next(error);
    }
});

export { router as reportRouter };
