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

// In-memory store for active streams (would use Redis in production)
interface ActiveStream {
    id: string;
    userId: string;
    title: string;
    description?: string;
    thumbnailUrl?: string;
    viewerCount: number;
    startedAt: Date;
    user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
    };
}

const activeStreams = new Map<string, ActiveStream>();

// ============================================
// GET /api/v1/livestream/active
// Get all active livestreams
// ============================================
router.get('/active', optionalAuth, async (req: AuthRequest, res) => {
    try {
        const streams = Array.from(activeStreams.values()).map((stream) => ({
            ...stream,
            isFollowing: false, // Could check follow status
        }));

        res.json({
            streams,
            count: streams.length,
        });
    } catch (error) {
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
        const existingStream = Array.from(activeStreams.values()).find(
            (s) => s.userId === req.userId
        );

        if (existingStream) {
            throw new AppError('You already have an active stream', 400);
        }

        // Get user info
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
            },
        });

        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Create stream
        const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const stream: ActiveStream = {
            id: streamId,
            userId: req.userId!,
            title: input.title,
            description: input.description,
            thumbnailUrl: input.thumbnailUrl,
            viewerCount: 0,
            startedAt: new Date(),
            user: {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl || undefined,
            },
        };

        activeStreams.set(streamId, stream);

        res.status(201).json({
            stream,
            streamKey: streamId, // In production, this would be a secure key
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
        const stream = activeStreams.get(id);

        if (!stream) {
            return res.status(404).json({ error: 'Stream not found' });
        }

        stream.viewerCount += 1;

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
        const stream = activeStreams.get(id);

        if (stream) {
            stream.viewerCount = Math.max(0, stream.viewerCount - 1);
        }

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
        const stream = activeStreams.get(id);

        if (!stream) {
            return res.status(404).json({ error: 'Stream not found' });
        }

        if (stream.userId !== req.userId) {
            return res.status(403).json({ error: 'Not authorized to end this stream' });
        }

        activeStreams.delete(id);

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
        const stream = activeStreams.get(id);

        if (!stream) {
            return res.status(404).json({ error: 'Stream not found or has ended' });
        }

        res.json({ stream });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stream' });
    }
});

export { router as livestreamRouter };
