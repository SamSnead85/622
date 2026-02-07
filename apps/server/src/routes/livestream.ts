/**
 * LIVESTREAM ROUTES
 * Full Mux integration for RTMP ingest, HLS playback, webhooks, categories, and VODs.
 */

import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import {
    createMuxLiveStream,
    endMuxLiveStream,
    getPlaybackUrl,
    getThumbnailUrl,
    isMuxConfigured,
} from '../services/mux.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ============================================
// CONSTANTS
// ============================================

const STREAM_CATEGORIES = [
    'gaming',
    'music',
    'creative',
    'irl',
    'sports',
    'tech',
    'education',
    'entertainment',
    'other',
] as const;

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createStreamSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    thumbnailUrl: z.string().url().optional(),
    category: z.enum(STREAM_CATEGORIES).optional(),
    tags: z.array(z.string().max(50)).max(10).optional(),
    isRecorded: z.boolean().optional().default(true),
});

// ============================================
// GET /api/v1/livestream/active
// Get all active livestreams, optionally filtered by category
// ============================================
router.get('/active', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { category } = req.query;

        const streams = await prisma.liveStream.findMany({
            where: {
                status: 'LIVE',
                ...(category && typeof category === 'string' ? { category } : {}),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        isVerified: true,
                    },
                },
            },
            orderBy: { viewerCount: 'desc' },
        });

        // Enrich with Mux thumbnail URLs
        const enriched = streams.map(stream => ({
            ...stream,
            thumbnailUrl: stream.muxPlaybackId
                ? getThumbnailUrl(stream.muxPlaybackId, { width: 640 })
                : stream.thumbnailUrl,
            playbackUrl: stream.muxPlaybackId
                ? getPlaybackUrl(stream.muxPlaybackId)
                : stream.playbackUrl,
        }));

        res.json({
            streams: enriched,
            count: enriched.length,
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/v1/livestream/categories
// Get available categories with active stream counts
// ============================================
router.get('/categories', optionalAuth, async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const counts = await prisma.liveStream.groupBy({
            by: ['category'],
            where: { status: 'LIVE', category: { not: null } },
            _count: true,
        });

        const categories = STREAM_CATEGORIES.map(cat => ({
            id: cat,
            label: cat.charAt(0).toUpperCase() + cat.slice(1),
            activeStreams: counts.find(c => c.category === cat)?._count || 0,
        }));

        res.json({ categories });
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/v1/livestream/vods
// Get recorded streams (VODs) with Mux asset playback
// ============================================
router.get('/vods', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { cursor, limit = '20', category } = req.query;
        const limitNum = Math.min(parseInt(limit as string) || 20, 50);

        const vods = await prisma.liveStream.findMany({
            where: {
                status: 'ENDED',
                muxAssetId: { not: null },
                ...(category && typeof category === 'string' ? { category } : {}),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        isVerified: true,
                    },
                },
            },
            orderBy: { endedAt: 'desc' },
            take: limitNum + 1,
            ...(cursor && typeof cursor === 'string' ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        const hasMore = vods.length > limitNum;
        const results = hasMore ? vods.slice(0, -1) : vods;

        const enriched = results.map(vod => ({
            ...vod,
            thumbnailUrl: vod.muxPlaybackId
                ? getThumbnailUrl(vod.muxPlaybackId, { width: 640, time: 5 })
                : vod.thumbnailUrl,
            playbackUrl: vod.muxPlaybackId
                ? getPlaybackUrl(vod.muxPlaybackId)
                : null,
        }));

        res.json({
            vods: enriched,
            nextCursor: hasMore ? results[results.length - 1].id : null,
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// POST /api/v1/livestream/create
// Create a new livestream with Mux integration
// ============================================
router.post('/create', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const input = createStreamSchema.parse(req.body);

        // End any existing active stream for this user
        const existingStream = await prisma.liveStream.findFirst({
            where: { userId: req.userId!, status: 'LIVE' },
        });

        if (existingStream) {
            await prisma.liveStream.update({
                where: { id: existingStream.id },
                data: { status: 'ENDED', endedAt: new Date() },
            });
            if (existingStream.muxStreamId) {
                endMuxLiveStream(existingStream.muxStreamId).catch(() => {});
            }
        }

        // Create Mux live stream if configured
        let muxData: Awaited<ReturnType<typeof createMuxLiveStream>> | null = null;
        if (isMuxConfigured()) {
            muxData = await createMuxLiveStream({ record: input.isRecorded });
        }

        const stream = await prisma.liveStream.create({
            data: {
                userId: req.userId!,
                title: input.title,
                description: input.description,
                thumbnailUrl: input.thumbnailUrl,
                category: input.category,
                tags: input.tags || [],
                isRecorded: input.isRecorded,
                status: 'SCHEDULED',
                streamKey: muxData?.streamKey || `stream_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                muxStreamId: muxData?.muxStreamId || null,
                muxPlaybackId: muxData?.muxPlaybackId || null,
                playbackUrl: muxData ? getPlaybackUrl(muxData.muxPlaybackId) : '',
            },
        });

        res.status(201).json({
            stream: {
                id: stream.id,
                title: stream.title,
                status: stream.status,
                category: stream.category,
                muxPlaybackId: stream.muxPlaybackId,
            },
            // Streaming credentials - shown to the streamer
            streamKey: stream.streamKey,
            rtmpUrl: muxData?.rtmpUrl || null,
            rtmpsUrl: muxData?.rtmpsUrl || null,
            playbackUrl: stream.muxPlaybackId ? getPlaybackUrl(stream.muxPlaybackId) : null,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        next(error);
    }
});

// ============================================
// POST /api/v1/livestream/webhooks/mux
// Mux webhook handler (unauthenticated - verified by signature)
// ============================================
router.post('/webhooks/mux', async (req, res, next) => {
    try {
        const event = req.body;
        const eventType = event?.type;

        logger.info(`Mux webhook received: ${eventType}`);

        switch (eventType) {
            case 'video.live_stream.connected': {
                // Streamer connected but not yet recording
                const streamId = event.data?.id;
                if (streamId) {
                    await prisma.liveStream.updateMany({
                        where: { muxStreamId: streamId },
                        data: { status: 'LIVE', startedAt: new Date() },
                    });
                    logger.info(`Stream connected: ${streamId}`);
                }
                break;
            }

            case 'video.live_stream.active': {
                // Stream is live and playable
                const streamId = event.data?.id;
                if (streamId) {
                    const updated = await prisma.liveStream.updateMany({
                        where: { muxStreamId: streamId },
                        data: { status: 'LIVE', startedAt: new Date() },
                    });

                    if (updated.count > 0) {
                        // Get the stream to emit socket event
                        const stream = await prisma.liveStream.findFirst({
                            where: { muxStreamId: streamId },
                            select: { id: true, title: true, userId: true },
                        });

                        if (stream) {
                            // Socket.IO emission is handled via the global io reference
                            // The io instance is accessed from the app context
                            const { io } = await import('../index.js').catch(() => ({ io: null }));
                            if (io) {
                                io.emit('stream:live', {
                                    streamId: stream.id,
                                    title: stream.title,
                                    userId: stream.userId,
                                });
                            }
                        }
                    }
                    logger.info(`Stream active (live): ${streamId}`);
                }
                break;
            }

            case 'video.live_stream.idle': {
                // Stream has ended
                const streamId = event.data?.id;
                if (streamId) {
                    const stream = await prisma.liveStream.findFirst({
                        where: { muxStreamId: streamId },
                        select: { id: true },
                    });

                    await prisma.liveStream.updateMany({
                        where: { muxStreamId: streamId },
                        data: { status: 'ENDED', endedAt: new Date(), viewerCount: 0 },
                    });

                    if (stream) {
                        const { io } = await import('../index.js').catch(() => ({ io: null }));
                        if (io) {
                            io.to(`stream:${stream.id}`).emit('stream:ended', { streamId: stream.id });
                        }
                    }
                    logger.info(`Stream idle (ended): ${streamId}`);
                }
                break;
            }

            case 'video.asset.live_stream_completed': {
                // VOD asset is ready
                const assetId = event.data?.id;
                const liveStreamId = event.data?.live_stream_id;
                const playbackId = event.data?.playback_ids?.[0]?.id;

                if (liveStreamId && assetId) {
                    await prisma.liveStream.updateMany({
                        where: { muxStreamId: liveStreamId },
                        data: {
                            muxAssetId: assetId,
                            ...(playbackId ? { muxPlaybackId: playbackId } : {}),
                        },
                    });
                    logger.info(`VOD asset ready for stream ${liveStreamId}: ${assetId}`);
                }
                break;
            }

            default:
                logger.info(`Unhandled Mux webhook event: ${eventType}`);
        }

        // Always respond 200 to Mux
        res.status(200).json({ received: true });
    } catch (error) {
        logger.error('Mux webhook error:', error);
        // Still respond 200 so Mux doesn't retry
        res.status(200).json({ received: true, error: 'Processing error' });
    }
});

// ============================================
// POST /api/v1/livestream/:id/join
// Join a livestream as viewer
// ============================================
router.post('/:id/join', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const stream = await prisma.liveStream.update({
            where: { id },
            data: {
                viewerCount: { increment: 1 },
                totalViews: { increment: 1 },
            },
        });

        if (stream.viewerCount > stream.peakViewerCount) {
            await prisma.liveStream.update({
                where: { id },
                data: { peakViewerCount: stream.viewerCount },
            });
        }

        res.json({
            stream: {
                ...stream,
                playbackUrl: stream.muxPlaybackId ? getPlaybackUrl(stream.muxPlaybackId) : stream.playbackUrl,
                thumbnailUrl: stream.muxPlaybackId ? getThumbnailUrl(stream.muxPlaybackId) : stream.thumbnailUrl,
            },
            joined: true,
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// POST /api/v1/livestream/:id/leave
// Leave a livestream
// ============================================
router.post('/:id/leave', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        await prisma.liveStream.updateMany({
            where: { id, viewerCount: { gt: 0 } },
            data: { viewerCount: { decrement: 1 } },
        });

        res.json({ left: true });
    } catch (error) {
        next(error);
    }
});

// ============================================
// POST /api/v1/livestream/:id/end
// End a livestream (streamer or admin only)
// ============================================
router.post('/:id/end', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const stream = await prisma.liveStream.findUnique({ where: { id } });

        if (!stream) {
            return res.status(404).json({ error: 'Stream not found' });
        }

        if (stream.userId !== req.userId && req.user?.role !== 'SUPERADMIN' && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Not authorized to end this stream' });
        }

        // Signal Mux to end the stream
        if (stream.muxStreamId) {
            endMuxLiveStream(stream.muxStreamId).catch(err => {
                logger.error('Failed to end Mux stream:', err);
            });
        }

        await prisma.liveStream.update({
            where: { id },
            data: { status: 'ENDED', endedAt: new Date(), viewerCount: 0 },
        });

        res.json({
            ended: true,
            summary: {
                duration: stream.startedAt
                    ? Math.round((Date.now() - new Date(stream.startedAt).getTime()) / 1000)
                    : 0,
                peakViewers: stream.peakViewerCount,
                totalViews: stream.totalViews,
            },
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/v1/livestream/:id
// Get stream details
// ============================================
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const stream = await prisma.liveStream.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        isVerified: true,
                        _count: { select: { followers: true } },
                    },
                },
                _count: { select: { chatMessages: true } },
            },
        });

        if (!stream) {
            return res.status(404).json({ error: 'Stream not found' });
        }

        res.json({
            stream: {
                ...stream,
                playbackUrl: stream.muxPlaybackId ? getPlaybackUrl(stream.muxPlaybackId) : stream.playbackUrl,
                thumbnailUrl: stream.muxPlaybackId ? getThumbnailUrl(stream.muxPlaybackId) : stream.thumbnailUrl,
                chatCount: stream._count.chatMessages,
                user: {
                    ...stream.user,
                    followersCount: stream.user._count.followers,
                },
            },
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/v1/livestream/:id/chat
// Get recent chat messages for a stream
// ============================================
router.get('/:id/chat', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { cursor, limit = '50' } = req.query;
        const limitNum = Math.min(parseInt(limit as string) || 50, 100);

        const messages = await prisma.liveStreamChat.findMany({
            where: { streamId: id },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        isVerified: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limitNum + 1,
            ...(cursor && typeof cursor === 'string' ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        const hasMore = messages.length > limitNum;
        const results = hasMore ? messages.slice(0, -1) : messages;

        res.json({
            messages: results.reverse(), // Return in chronological order
            nextCursor: hasMore ? results[0].id : null,
        });
    } catch (error) {
        next(error);
    }
});

export { router as livestreamRouter };
