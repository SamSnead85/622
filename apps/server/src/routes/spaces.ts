import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest, authenticate } from '../middleware/auth.js';
import { prisma } from '../db/client.js';
import { logger } from '../utils/logger.js';
import { rateLimiters } from '../middleware/rateLimit.js';

// ============================================
// AUDIO SPACES — In-memory room management
// Like Twitter Spaces / Clubhouse — real-time audio rooms
// WebRTC audio will be layered on later; this handles
// room state, roles, and coordination via REST + Socket.IO
// ============================================

// ============================================
// Types
// ============================================

export interface SpaceSpeaker {
    userId: string;
    name: string;
    avatar: string | null;
    isMuted: boolean;
    joinedAt: number;
}

export interface SpaceListener {
    userId: string;
    name: string;
    avatar: string | null;
    joinedAt: number;
}

export interface SpaceRoom {
    id: string;
    title: string;
    description: string;
    topic: string;
    hostId: string;
    hostName: string;
    hostAvatar: string | null;
    speakers: Map<string, SpaceSpeaker>;
    listeners: Map<string, SpaceListener>;
    speakRequests: Map<string, { name: string; avatar: string | null; requestedAt: number }>;
    maxSpeakers: number;
    createdAt: number;
    status: 'live' | 'ended';
    reactions: { emoji: string; userId: string; timestamp: number }[];
}

// ============================================
// In-Memory Store
// ============================================

export const activeSpaces = new Map<string, SpaceRoom>();

// Periodic cleanup — remove ended spaces older than 30 minutes
setInterval(() => {
    const now = Date.now();
    const THIRTY_MINUTES = 30 * 60 * 1000;
    let cleaned = 0;
    for (const [id, space] of activeSpaces.entries()) {
        if (space.status === 'ended' && now - space.createdAt > THIRTY_MINUTES) {
            activeSpaces.delete(id);
            cleaned++;
        }
        // Also clean up spaces with no participants that are older than 1 hour
        if (
            space.status === 'live' &&
            space.speakers.size === 0 &&
            space.listeners.size === 0 &&
            now - space.createdAt > 60 * 60 * 1000
        ) {
            activeSpaces.delete(id);
            cleaned++;
        }
    }
    // Emergency cleanup if map gets too large
    if (activeSpaces.size > 5000) {
        activeSpaces.clear();
        logger.warn('Spaces map cleared (exceeded 5k entries)');
    }
    if (cleaned > 0) {
        logger.info(`Spaces cleanup: removed ${cleaned} stale space(s)`);
    }
}, 5 * 60 * 1000);

// ============================================
// Helpers
// ============================================

function serializeSpace(space: SpaceRoom) {
    return {
        id: space.id,
        title: space.title,
        description: space.description,
        topic: space.topic,
        hostId: space.hostId,
        hostName: space.hostName,
        hostAvatar: space.hostAvatar,
        speakers: Array.from(space.speakers.values()),
        listeners: Array.from(space.listeners.values()),
        speakRequests: Array.from(space.speakRequests.entries()).map(([userId, req]) => ({
            userId,
            name: req.name,
            avatar: req.avatar,
            requestedAt: req.requestedAt,
        })),
        speakerCount: space.speakers.size,
        listenerCount: space.listeners.size,
        maxSpeakers: space.maxSpeakers,
        createdAt: space.createdAt,
        status: space.status,
    };
}

function serializeSpacePreview(space: SpaceRoom) {
    const speakersList = Array.from(space.speakers.values()).slice(0, 3);
    return {
        id: space.id,
        title: space.title,
        description: space.description,
        topic: space.topic,
        hostId: space.hostId,
        hostName: space.hostName,
        hostAvatar: space.hostAvatar,
        speakerCount: space.speakers.size,
        listenerCount: space.listeners.size,
        totalParticipants: space.speakers.size + space.listeners.size,
        maxSpeakers: space.maxSpeakers,
        createdAt: space.createdAt,
        status: space.status,
        speakerPreviews: speakersList.map((s) => ({
            userId: s.userId,
            name: s.name,
            avatar: s.avatar,
        })),
    };
}

// ============================================
// Router
// ============================================

export const spacesRouter = Router();

// Apply rate limiting to all routes
spacesRouter.use(rateLimiters.general);

// ---- Create a new space ----
spacesRouter.post('/create', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId!;
        const { title, description, topic, maxSpeakers } = req.body;

        if (!title || typeof title !== 'string' || title.trim().length === 0) {
            res.status(400).json({ error: 'Title is required' });
            return;
        }

        if (title.length > 100) {
            res.status(400).json({ error: 'Title must be 100 characters or less' });
            return;
        }

        // Check if user already hosts an active space
        for (const space of activeSpaces.values()) {
            if (space.hostId === userId && space.status === 'live') {
                res.status(409).json({ error: 'You already have an active space. End it before creating a new one.' });
                return;
            }
        }

        // Fetch user info
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, username: true, displayName: true, avatarUrl: true },
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const spaceId = uuidv4();
        const displayName = user.displayName || user.username;
        const clampedMaxSpeakers = Math.min(Math.max(Number(maxSpeakers) || 6, 2), 12);

        const space: SpaceRoom = {
            id: spaceId,
            title: title.trim(),
            description: (description || '').trim().slice(0, 500),
            topic: (topic || 'General').trim().slice(0, 50),
            hostId: userId,
            hostName: displayName,
            hostAvatar: user.avatarUrl || null,
            speakers: new Map(),
            listeners: new Map(),
            speakRequests: new Map(),
            maxSpeakers: clampedMaxSpeakers,
            createdAt: Date.now(),
            status: 'live',
            reactions: [],
        };

        // Host is automatically a speaker
        space.speakers.set(userId, {
            userId,
            name: displayName,
            avatar: user.avatarUrl || null,
            isMuted: false,
            joinedAt: Date.now(),
        });

        activeSpaces.set(spaceId, space);
        logger.info(`Space created: "${title}" by ${displayName} (${spaceId})`);

        res.status(201).json({ space: serializeSpace(space) });
    } catch (error) {
        logger.error('Error creating space:', error);
        res.status(500).json({ error: 'Failed to create space' });
    }
});

// ---- Get all active spaces ----
spacesRouter.get('/active', async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const spaces = Array.from(activeSpaces.values())
            .filter((s) => s.status === 'live')
            .sort((a, b) => {
                // Sort by total participants (most popular first), then by creation time
                const aTotal = a.speakers.size + a.listeners.size;
                const bTotal = b.speakers.size + b.listeners.size;
                if (bTotal !== aTotal) return bTotal - aTotal;
                return b.createdAt - a.createdAt;
            })
            .map(serializeSpacePreview);

        res.json({ spaces });
    } catch (error) {
        logger.error('Error fetching active spaces:', error);
        res.status(500).json({ error: 'Failed to fetch spaces' });
    }
});

// ---- Get space details ----
spacesRouter.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const space = activeSpaces.get(req.params.id);
        if (!space) {
            res.status(404).json({ error: 'Space not found' });
            return;
        }

        res.json({ space: serializeSpace(space) });
    } catch (error) {
        logger.error('Error fetching space:', error);
        res.status(500).json({ error: 'Failed to fetch space' });
    }
});

// ---- Join space as listener ----
spacesRouter.post('/:id/join', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId!;
        const space = activeSpaces.get(req.params.id);

        if (!space) {
            res.status(404).json({ error: 'Space not found' });
            return;
        }

        if (space.status !== 'live') {
            res.status(410).json({ error: 'This space has ended' });
            return;
        }

        // Already in the space (as speaker or listener)
        if (space.speakers.has(userId) || space.listeners.has(userId)) {
            res.json({ space: serializeSpace(space) });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, username: true, displayName: true, avatarUrl: true },
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        space.listeners.set(userId, {
            userId,
            name: user.displayName || user.username,
            avatar: user.avatarUrl || null,
            joinedAt: Date.now(),
        });

        logger.info(`User ${user.displayName || user.username} joined space "${space.title}" as listener`);
        res.json({ space: serializeSpace(space) });
    } catch (error) {
        logger.error('Error joining space:', error);
        res.status(500).json({ error: 'Failed to join space' });
    }
});

// ---- Leave space ----
spacesRouter.post('/:id/leave', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId!;
        const space = activeSpaces.get(req.params.id);

        if (!space) {
            res.status(404).json({ error: 'Space not found' });
            return;
        }

        space.speakers.delete(userId);
        space.listeners.delete(userId);
        space.speakRequests.delete(userId);

        // If the host leaves, end the space
        if (space.hostId === userId) {
            space.status = 'ended';
            logger.info(`Space "${space.title}" ended (host left)`);
        }

        res.json({ space: serializeSpace(space) });
    } catch (error) {
        logger.error('Error leaving space:', error);
        res.status(500).json({ error: 'Failed to leave space' });
    }
});

// ---- Request to speak ----
spacesRouter.post('/:id/request-speak', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId!;
        const space = activeSpaces.get(req.params.id);

        if (!space) {
            res.status(404).json({ error: 'Space not found' });
            return;
        }

        if (space.status !== 'live') {
            res.status(410).json({ error: 'This space has ended' });
            return;
        }

        // Already a speaker
        if (space.speakers.has(userId)) {
            res.status(400).json({ error: 'You are already a speaker' });
            return;
        }

        if (space.speakers.size >= space.maxSpeakers) {
            res.status(400).json({ error: 'Speaker slots are full' });
            return;
        }

        // Already requested
        if (space.speakRequests.has(userId)) {
            res.status(400).json({ error: 'You have already requested to speak' });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, username: true, displayName: true, avatarUrl: true },
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        space.speakRequests.set(userId, {
            name: user.displayName || user.username,
            avatar: user.avatarUrl || null,
            requestedAt: Date.now(),
        });

        logger.info(`User ${user.displayName || user.username} requested to speak in "${space.title}"`);
        res.json({ space: serializeSpace(space) });
    } catch (error) {
        logger.error('Error requesting to speak:', error);
        res.status(500).json({ error: 'Failed to request to speak' });
    }
});

// ---- Approve speaker (host only) ----
spacesRouter.post('/:id/approve-speaker', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId!;
        const { speakerId } = req.body;
        const space = activeSpaces.get(req.params.id);

        if (!space) {
            res.status(404).json({ error: 'Space not found' });
            return;
        }

        if (space.hostId !== userId) {
            res.status(403).json({ error: 'Only the host can approve speakers' });
            return;
        }

        if (space.status !== 'live') {
            res.status(410).json({ error: 'This space has ended' });
            return;
        }

        if (!speakerId || typeof speakerId !== 'string') {
            res.status(400).json({ error: 'speakerId is required' });
            return;
        }

        if (space.speakers.size >= space.maxSpeakers) {
            res.status(400).json({ error: 'Speaker slots are full' });
            return;
        }

        const request = space.speakRequests.get(speakerId);
        if (!request) {
            res.status(404).json({ error: 'No speak request found for this user' });
            return;
        }

        // Move from listeners/requests to speakers
        space.speakRequests.delete(speakerId);
        space.listeners.delete(speakerId);

        space.speakers.set(speakerId, {
            userId: speakerId,
            name: request.name,
            avatar: request.avatar,
            isMuted: true, // Start muted
            joinedAt: Date.now(),
        });

        logger.info(`Speaker ${request.name} approved in "${space.title}"`);
        res.json({ space: serializeSpace(space) });
    } catch (error) {
        logger.error('Error approving speaker:', error);
        res.status(500).json({ error: 'Failed to approve speaker' });
    }
});

// ---- End space (host only) ----
spacesRouter.post('/:id/end', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId!;
        const space = activeSpaces.get(req.params.id);

        if (!space) {
            res.status(404).json({ error: 'Space not found' });
            return;
        }

        if (space.hostId !== userId) {
            res.status(403).json({ error: 'Only the host can end the space' });
            return;
        }

        space.status = 'ended';
        logger.info(`Space "${space.title}" ended by host`);

        res.json({ space: serializeSpace(space) });
    } catch (error) {
        logger.error('Error ending space:', error);
        res.status(500).json({ error: 'Failed to end space' });
    }
});
