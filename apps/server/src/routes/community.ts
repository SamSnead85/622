"use strict";

/**
 * COMMUNITY COMMAND CENTER API ROUTES
 * Bulletin board, connections, streams, presence
 */

import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';

// Services
import * as bulletinService from '../services/bulletin.js';
import * as connectionService from '../services/connections.js';
import * as livestreamService from '../services/livestreams.js';
import * as presenceService from '../services/presence.js';

const router = Router();

// ============================================
// BULLETIN BOARD ROUTES
// ============================================

// Get bulletins with filters
router.get('/bulletins', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { type, category, sortBy, search, cursor, limit } = req.query;

        const result = await bulletinService.getBulletins({
            filters: {
                type: type as any,
                category: category as any,
                search: search as string,
            },
            sortBy: (sortBy as 'recent' | 'trending' | 'hot') || 'hot',
            cursor: cursor as string,
            limit: parseInt(limit as string) || 20,
        });

        res.json(result);
    } catch (error) {
        next(error);
    }
});

// Get single bulletin
router.get('/bulletins/:id', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const bulletin = await bulletinService.getBulletinById(req.params.id);

        if (!bulletin) {
            return res.status(404).json({ error: 'Bulletin not found' });
        }

        res.json(bulletin);
    } catch (error) {
        next(error);
    }
});

// Create bulletin
router.post('/bulletins', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const schema = z.object({
            type: z.enum(['ANNOUNCEMENT', 'JOB', 'COLLABORATION', 'INVESTMENT', 'EVENT', 'CALL_TO_ACTION', 'SPOTLIGHT', 'DISCUSSION']),
            title: z.string().min(3).max(200),
            content: z.string().min(10).max(10000),
            category: z.enum(['SOCIAL_JUSTICE', 'CAREER', 'BUSINESS', 'COMMUNITY', 'CULTURE', 'TECH', 'ACTIVISM', 'GENERAL']),
            mediaUrl: z.string().url().optional(),
            externalLink: z.string().url().optional(),
            tags: z.array(z.string()).optional(),
            location: z.string().optional(),
            locationGeo: z.string().optional(),
            eventDate: z.string().datetime().optional(),
        });

        const data = schema.parse(req.body);

        const bulletin = await bulletinService.createBulletin({
            ...data,
            authorId: req.userId!,
            eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
        });

        res.status(201).json(bulletin);
    } catch (error) {
        next(error);
    }
});

// Update bulletin
router.patch('/bulletins/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const bulletin = await bulletinService.updateBulletin(
            req.params.id,
            req.userId!,
            req.body
        );

        res.json(bulletin);
    } catch (error) {
        next(error);
    }
});

// Delete bulletin
router.delete('/bulletins/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await bulletinService.deleteBulletin(req.params.id, req.userId!);
        res.json({ deleted: true });
    } catch (error) {
        next(error);
    }
});

// Vote on bulletin
router.post('/bulletins/:id/vote', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { isUpvote } = z.object({ isUpvote: z.boolean() }).parse(req.body);

        const result = await bulletinService.voteBulletin(
            req.params.id,
            req.userId!,
            isUpvote
        );

        res.json(result);
    } catch (error) {
        next(error);
    }
});

// Add comment
router.post('/bulletins/:id/comments', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { content } = z.object({ content: z.string().min(1).max(2000) }).parse(req.body);

        const comment = await bulletinService.addBulletinComment(
            req.params.id,
            req.userId!,
            content
        );

        res.status(201).json(comment);
    } catch (error) {
        next(error);
    }
});

// Get bulletin stats
router.get('/bulletins-stats', async (_req, res: Response, next: NextFunction) => {
    try {
        const stats = await bulletinService.getBulletinStats();
        res.json(stats);
    } catch (error) {
        next(error);
    }
});

// ============================================
// CONNECTION ROUTES
// ============================================

// Send connection request
router.post('/connections/request', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { receiverId, message } = z.object({
            receiverId: z.string().uuid(),
            message: z.string().max(500).optional(),
        }).parse(req.body);

        const result = await connectionService.sendConnectionRequest(
            req.userId!,
            receiverId,
            message
        );

        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
});

// Respond to request
router.post('/connections/respond/:requestId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { accept } = z.object({ accept: z.boolean() }).parse(req.body);

        const result = await connectionService.respondToConnectionRequest(
            req.params.requestId,
            req.userId!,
            accept
        );

        res.json(result);
    } catch (error) {
        next(error);
    }
});

// Bulk respond
router.post('/connections/bulk-respond', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { requestIds, accept } = z.object({
            requestIds: z.array(z.string().uuid()),
            accept: z.boolean(),
        }).parse(req.body);

        const result = await connectionService.bulkRespondToRequests(
            req.userId!,
            requestIds,
            accept
        );

        res.json(result);
    } catch (error) {
        next(error);
    }
});

// Get pending requests
router.get('/connections/pending', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { type, cursor, limit } = req.query;

        const result = await connectionService.getPendingRequests(
            req.userId!,
            (type as 'received' | 'sent') || 'received',
            cursor as string,
            parseInt(limit as string) || 20
        );

        res.json(result);
    } catch (error) {
        next(error);
    }
});

// Get connection status with user
router.get('/connections/status/:userId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const status = await connectionService.getConnectionStatus(
            req.userId!,
            req.params.userId
        );

        res.json(status);
    } catch (error) {
        next(error);
    }
});

// Cancel request
router.delete('/connections/request/:requestId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await connectionService.cancelConnectionRequest(req.params.requestId, req.userId!);
        res.json({ cancelled: true });
    } catch (error) {
        next(error);
    }
});

// Get/update connection settings
router.get('/connections/settings', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const settings = await connectionService.getConnectionSettings(req.userId!);
        res.json(settings);
    } catch (error) {
        next(error);
    }
});

router.patch('/connections/settings', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { autoApprove } = z.object({ autoApprove: z.boolean() }).parse(req.body);

        const settings = await connectionService.updateConnectionSettings(
            req.userId!,
            autoApprove
        );

        res.json(settings);
    } catch (error) {
        next(error);
    }
});

// ============================================
// LIVE STREAM ROUTES
// ============================================

// Suggest a stream
router.post('/streams/suggest', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = z.object({
            url: z.string().url(),
            title: z.string().min(3).max(200),
            description: z.string().max(1000).optional(),
            thumbnailUrl: z.string().url().optional(),
        }).parse(req.body);

        const suggestion = await livestreamService.suggestStream({
            ...data,
            suggestedById: req.userId!,
        });

        res.status(201).json(suggestion);
    } catch (error) {
        next(error);
    }
});

// Get stream suggestions
router.get('/streams/suggestions', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { status, platform, cursor, limit } = req.query;

        const result = await livestreamService.getStreamSuggestions({
            status: status as any,
            platform: platform as any,
            cursor: cursor as string,
            limit: parseInt(limit as string) || 20,
        });

        res.json(result);
    } catch (error) {
        next(error);
    }
});

// Get live/approved streams
router.get('/streams/live', async (_req, res: Response, next: NextFunction) => {
    try {
        const streams = await livestreamService.getLiveStreams();
        res.json(streams);
    } catch (error) {
        next(error);
    }
});

// Vote on stream
router.post('/streams/:id/vote', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { isUpvote } = z.object({ isUpvote: z.boolean() }).parse(req.body);

        const result = await livestreamService.voteOnStream(
            req.params.id,
            req.userId!,
            isUpvote
        );

        res.json(result);
    } catch (error) {
        next(error);
    }
});

// ============================================
// PRESENCE / STATS ROUTES
// ============================================

// Update presence (heartbeat)
router.post('/presence/heartbeat', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { page } = req.body;
        await presenceService.updatePresence(req.userId!, page);
        res.json({ ok: true });
    } catch (error) {
        next(error);
    }
});

// Get online count and stats
router.get('/presence/stats', async (_req, res: Response, next: NextFunction) => {
    try {
        const stats = await presenceService.getPresenceStats();
        res.json(stats);
    } catch (error) {
        next(error);
    }
});

// Quick online count (for live pulse)
router.get('/presence/count', async (_req, res: Response, next: NextFunction) => {
    try {
        const count = await presenceService.getOnlineCount();
        res.json({ onlineNow: count });
    } catch (error) {
        next(error);
    }
});

export default router;
