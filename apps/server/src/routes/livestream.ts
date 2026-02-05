
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';


const router = Router();

// Validation schemas
const createStreamSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    thumbnailUrl: z.string().url().optional(),
});

// ============================================
// GET /api/v1/livestream/active
// Get all active livestreams
// ============================================
router.get('/active', optionalAuth, async (req: AuthRequest, res) => {
    try {
        const streams = await prisma.liveStream.findMany({
            where: {
                status: 'LIVE'
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true
                    }
                }
            },
            orderBy: {
                viewerCount: 'desc'
            }
        });

        res.json({
            streams,
            count: streams.length,
        });
    } catch (error) {
        console.error('Fetch active streams error:', error);
        res.status(500).json({ error: 'Failed to fetch streams' });
    }
});

// ============================================
// POST /api/v1/livestream/create
// Start a new livestream
// ============================================
router.post('/create', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const input = createStreamSchema.parse(req.body);

        // Check if user already has an active stream
        const existingStream = await prisma.liveStream.findFirst({
            where: {
                userId: req.userId,
                status: 'LIVE'
            }
        });

        if (existingStream) {
            // Auto-end previous stream
            await prisma.liveStream.update({
                where: { id: existingStream.id },
                data: { status: 'ENDED', endedAt: new Date() }
            });
        }

        const stream = await prisma.liveStream.create({
            data: {
                userId: req.userId!,
                title: input.title,
                description: input.description,
                thumbnailUrl: input.thumbnailUrl,
                status: 'LIVE',
                startedAt: new Date(),
                playbackUrl: '',
                streamKey: `stream_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
            }
        });

        res.status(201).json({
            stream,
            streamKey: stream.streamKey,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        next(error);
    }
});

// ============================================
// POST /api/v1/livestream/:id/join
// Join a livestream as viewer
// ============================================
router.post('/:id/join', optionalAuth, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;

        const stream = await prisma.liveStream.update({
            where: { id },
            data: {
                viewerCount: { increment: 1 },
                totalViews: { increment: 1 }
            }
        });

        if (stream.viewerCount > stream.peakViewerCount) {
            await prisma.liveStream.update({
                where: { id },
                data: { peakViewerCount: stream.viewerCount }
            });
        }

        res.json({
            stream,
            joined: true,
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to join stream' });
    }
});

// ============================================
// POST /api/v1/livestream/:id/leave
// Leave a livestream
// ============================================
router.post('/:id/leave', optionalAuth, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;

        await prisma.liveStream.updateMany({
            where: { id, viewerCount: { gt: 0 } },
            data: {
                viewerCount: { decrement: 1 }
            }
        });

        res.json({ left: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to leave stream' });
    }
});

// ============================================
// POST /api/v1/livestream/:id/end
// End a livestream (streamer only)
// ============================================
router.post('/:id/end', authenticate, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;

        const stream = await prisma.liveStream.findUnique({
            where: { id }
        });

        if (!stream) {
            return res.status(404).json({ error: 'Stream not found' });
        }

        // Use optional chaining for safe access
        if (stream.userId !== req.userId && req.user?.role !== 'SUPERADMIN' && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Not authorized to end this stream' });
        }

        await prisma.liveStream.update({
            where: { id },
            data: {
                status: 'ENDED',
                endedAt: new Date()
            }
        });

        res.json({ ended: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to end stream' });
    }
});

// ============================================
// GET /api/v1/livestream/:id
// Get stream details
// ============================================
router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const stream = await prisma.liveStream.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        username: true,
                        displayName: true,
                        avatarUrl: true
                    }
                }
            }
        });

        if (!stream) {
            return res.status(404).json({ error: 'Stream not found' });
        }

        res.json({ stream });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stream' });
    }
});

export { router as livestreamRouter };
