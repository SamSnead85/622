import { Router, Request, Response, NextFunction } from 'express';
import { SocialPlatform, CrossPostDirection, CrossPostStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { rateLimiters } from '../middleware/rateLimit.js';
import { safeParseInt } from '../utils/validation.js';

const router = Router();

// ── Validation Schemas ──
const connectAccountSchema = z.object({
    platform: z.nativeEnum(SocialPlatform),
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    tokenExpiresAt: z.string().datetime().optional(),
    platformUserId: z.string().optional(),
    platformUsername: z.string().optional(),
    displayName: z.string().optional(),
    avatarUrl: z.string().url().optional(),
    scopes: z.array(z.string()).optional(),
    autoSync: z.boolean().optional(),
    syncFrequency: z.enum(['realtime', 'hourly', 'daily', 'manual']).optional(),
});

const updateAccountSchema = z.object({
    autoSync: z.boolean().optional(),
    syncFrequency: z.enum(['realtime', 'hourly', 'daily', 'manual']).optional(),
    isActive: z.boolean().optional(),
});

const crossPostSchema = z.object({
    sourceUrl: z.string().url(),
    sourcePlatform: z.nativeEnum(SocialPlatform),
    sourcePostId: z.string().optional(),
    sourceAuthor: z.string().optional(),
    sourceAuthorAvatar: z.string().url().optional(),
    caption: z.string().optional(),
    mediaUrl: z.string().url().optional(),
    thumbnailUrl: z.string().url().optional(),
    type: z.enum(['TEXT', 'IMAGE', 'VIDEO']).optional(),
});

const batchCrossPostSchema = z.object({
    posts: z.array(crossPostSchema).min(1).max(50),
    connectedAccountId: z.string().uuid(),
});

// ============================================
// GET /api/v1/social/accounts
// List all connected social accounts for the user
// ============================================
router.get('/accounts', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Authentication required' });

        const accounts = await prisma.connectedAccount.findMany({
            where: { userId: req.user.id },
            take: 100,
            select: {
                id: true,
                platform: true,
                platformUsername: true,
                displayName: true,
                avatarUrl: true,
                isActive: true,
                autoSync: true,
                syncFrequency: true,
                lastSyncAt: true,
                lastSyncStatus: true,
                scopes: true,
                createdAt: true,
                _count: { select: { crossPosts: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json({ accounts });
    } catch (error) {
        next(error);
    }
});

// ============================================
// POST /api/v1/social/accounts
// Connect a new social platform account
// ============================================
router.post('/accounts', authenticate, rateLimiters.general, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Authentication required' });

        const data = connectAccountSchema.parse(req.body);

        // Check if already connected
        const existing = await prisma.connectedAccount.findUnique({
            where: { userId_platform: { userId: req.user.id, platform: data.platform } },
        });

        if (existing) {
            // Update existing connection
            const updated = await prisma.connectedAccount.update({
                where: { id: existing.id },
                data: {
                    accessToken: data.accessToken ?? existing.accessToken,
                    refreshToken: data.refreshToken ?? existing.refreshToken,
                    tokenExpiresAt: data.tokenExpiresAt ? new Date(data.tokenExpiresAt) : existing.tokenExpiresAt,
                    platformUserId: data.platformUserId ?? existing.platformUserId,
                    platformUsername: data.platformUsername ?? existing.platformUsername,
                    displayName: data.displayName ?? existing.displayName,
                    avatarUrl: data.avatarUrl ?? existing.avatarUrl,
                    scopes: data.scopes ?? existing.scopes,
                    autoSync: data.autoSync ?? existing.autoSync,
                    syncFrequency: data.syncFrequency ?? existing.syncFrequency,
                    isActive: true,
                },
            });

            return res.json({ account: updated, reconnected: true });
        }

        const account = await prisma.connectedAccount.create({
            data: {
                userId: req.user.id,
                platform: data.platform,
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
                tokenExpiresAt: data.tokenExpiresAt ? new Date(data.tokenExpiresAt) : undefined,
                platformUserId: data.platformUserId,
                platformUsername: data.platformUsername,
                displayName: data.displayName,
                avatarUrl: data.avatarUrl,
                scopes: data.scopes ?? [],
                autoSync: data.autoSync ?? false,
                syncFrequency: data.syncFrequency ?? 'daily',
            },
        });

        res.status(201).json({ account });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid request', details: error.errors });
        }
        next(error);
    }
});

// ============================================
// PATCH /api/v1/social/accounts/:id
// Update connected account settings
// ============================================
router.patch('/accounts/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Authentication required' });

        const data = updateAccountSchema.parse(req.body);

        const account = await prisma.connectedAccount.findFirst({
            where: { id: req.params.id, userId: req.user.id },
        });

        if (!account) return res.status(404).json({ error: 'Connected account not found' });

        const updated = await prisma.connectedAccount.update({
            where: { id: account.id },
            data,
        });

        res.json({ account: updated });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid request', details: error.errors });
        }
        next(error);
    }
});

// ============================================
// DELETE /api/v1/social/accounts/:id
// Disconnect a social platform account
// ============================================
router.delete('/accounts/:id', authenticate, rateLimiters.general, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Authentication required' });

        const account = await prisma.connectedAccount.findFirst({
            where: { id: req.params.id, userId: req.user.id },
        });

        if (!account) return res.status(404).json({ error: 'Connected account not found' });

        await prisma.connectedAccount.delete({ where: { id: account.id } });

        res.json({ success: true, message: `${account.platform} account disconnected` });
    } catch (error) {
        next(error);
    }
});

// ============================================
// POST /api/v1/social/accounts/:id/sync
// Trigger a manual sync for a connected account
// ============================================
router.post('/accounts/:id/sync', authenticate, rateLimiters.general, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Authentication required' });

        const account = await prisma.connectedAccount.findFirst({
            where: { id: req.params.id, userId: req.user.id, isActive: true },
        });

        if (!account) return res.status(404).json({ error: 'Connected account not found or inactive' });

        // Update sync timestamp
        await prisma.connectedAccount.update({
            where: { id: account.id },
            data: { lastSyncAt: new Date(), lastSyncStatus: 'syncing' },
        });

        // In production, this would trigger an async job to fetch new posts
        // For now, return acknowledgment
        res.json({
            success: true,
            message: `Sync started for ${account.platform}`,
            account: {
                id: account.id,
                platform: account.platform,
                lastSyncAt: new Date(),
            },
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// POST /api/v1/social/crosspost
// Import a single post from an external platform
// ============================================
router.post('/crosspost', authenticate, rateLimiters.general, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Authentication required' });

        const data = crossPostSchema.parse(req.body);

        // Find connected account for this platform
        const connectedAccount = await prisma.connectedAccount.findUnique({
            where: { userId_platform: { userId: req.user.id, platform: data.sourcePlatform } },
        });

        if (!connectedAccount || !connectedAccount.isActive) {
            return res.status(400).json({
                error: `No active ${data.sourcePlatform} account connected. Connect your account first.`,
            });
        }

        // Check for duplicate
        if (data.sourcePostId) {
            const existing = await prisma.crossPost.findFirst({
                where: {
                    sourcePlatform: data.sourcePlatform,
                    sourcePostId: data.sourcePostId,
                    post: { userId: req.user.id },
                },
            });
            if (existing) {
                return res.status(409).json({ error: 'This post has already been imported' });
            }
        }

        // Create the post and cross-post record in a transaction
        const result = await prisma.$transaction(async (tx) => {
            const post = await tx.post.create({
                data: {
                    userId: req.user!.id,
                    type: (data.type as 'TEXT' | 'IMAGE' | 'VIDEO') ?? 'TEXT',
                    caption: data.caption,
                    mediaUrl: data.mediaUrl,
                    thumbnailUrl: data.thumbnailUrl,
                    isPublic: true,
                },
            });

            const crossPost = await tx.crossPost.create({
                data: {
                    postId: post.id,
                    connectedAccountId: connectedAccount.id,
                    sourcePlatform: data.sourcePlatform,
                    sourcePostId: data.sourcePostId,
                    sourceUrl: data.sourceUrl,
                    sourceAuthor: data.sourceAuthor ?? connectedAccount.platformUsername,
                    sourceAuthorAvatar: data.sourceAuthorAvatar ?? connectedAccount.avatarUrl,
                    direction: 'INBOUND' as CrossPostDirection,
                    status: 'COMPLETED' as CrossPostStatus,
                    syncedAt: new Date(),
                },
            });

            return { post, crossPost };
        });

        res.status(201).json(result);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid request', details: error.errors });
        }
        next(error);
    }
});

// ============================================
// POST /api/v1/social/crosspost/batch
// Batch import multiple posts from an external platform
// ============================================
router.post('/crosspost/batch', authenticate, rateLimiters.general, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Authentication required' });

        const data = batchCrossPostSchema.parse(req.body);

        const connectedAccount = await prisma.connectedAccount.findFirst({
            where: { id: data.connectedAccountId, userId: req.user.id, isActive: true },
        });

        if (!connectedAccount) {
            return res.status(400).json({ error: 'Connected account not found or inactive' });
        }

        const results: Array<{ sourceUrl: string; status: string; postId?: string; error?: string }> = [];

        for (const item of data.posts) {
            try {
                // Check for duplicate
                if (item.sourcePostId) {
                    const existing = await prisma.crossPost.findFirst({
                        where: {
                            sourcePlatform: item.sourcePlatform,
                            sourcePostId: item.sourcePostId,
                            post: { userId: req.user!.id },
                        },
                    });
                    if (existing) {
                        results.push({ sourceUrl: item.sourceUrl, status: 'skipped', error: 'Already imported' });
                        continue;
                    }
                }

                const result = await prisma.$transaction(async (tx) => {
                    const post = await tx.post.create({
                        data: {
                            userId: req.user!.id,
                            type: (item.type as 'TEXT' | 'IMAGE' | 'VIDEO') ?? 'TEXT',
                            caption: item.caption,
                            mediaUrl: item.mediaUrl,
                            thumbnailUrl: item.thumbnailUrl,
                            isPublic: true,
                        },
                    });

                    await tx.crossPost.create({
                        data: {
                            postId: post.id,
                            connectedAccountId: connectedAccount.id,
                            sourcePlatform: item.sourcePlatform,
                            sourcePostId: item.sourcePostId,
                            sourceUrl: item.sourceUrl,
                            sourceAuthor: item.sourceAuthor ?? connectedAccount.platformUsername,
                            sourceAuthorAvatar: item.sourceAuthorAvatar ?? connectedAccount.avatarUrl,
                            direction: 'INBOUND' as CrossPostDirection,
                            status: 'COMPLETED' as CrossPostStatus,
                            syncedAt: new Date(),
                        },
                    });

                    return post;
                });

                results.push({ sourceUrl: item.sourceUrl, status: 'imported', postId: result.id });
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                results.push({ sourceUrl: item.sourceUrl, status: 'failed', error: message });
            }
        }

        // Update sync timestamp
        await prisma.connectedAccount.update({
            where: { id: connectedAccount.id },
            data: { lastSyncAt: new Date(), lastSyncStatus: 'success' },
        });

        const imported = results.filter((r) => r.status === 'imported').length;
        const skipped = results.filter((r) => r.status === 'skipped').length;
        const failed = results.filter((r) => r.status === 'failed').length;

        res.status(201).json({
            summary: { total: data.posts.length, imported, skipped, failed },
            results,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid request', details: error.errors });
        }
        next(error);
    }
});

// ============================================
// GET /api/v1/social/crosspost/:postId
// Get cross-post info for a specific post
// ============================================
router.get('/crosspost/:postId', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const crossPosts = await prisma.crossPost.findMany({
            where: { postId: req.params.postId },
            take: 100,
            select: {
                id: true,
                sourcePlatform: true,
                sourceUrl: true,
                sourceAuthor: true,
                sourceAuthorAvatar: true,
                direction: true,
                status: true,
                syncedAt: true,
                metadata: true,
            },
        });

        res.json({ crossPosts });
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/v1/social/platforms
// Get available platforms and their OAuth config
// ============================================
router.get('/platforms', async (_req: Request, res: Response) => {
    const platforms = [
        {
            id: 'LINKEDIN',
            name: 'LinkedIn',
            icon: 'logo-linkedin',
            color: '#0A66C2',
            description: 'Import professional posts and articles',
            scopes: ['r_liteprofile', 'r_emailaddress', 'w_member_social'],
            features: ['import_posts', 'share_to', 'profile_sync'],
            oauthUrl: 'https://www.linkedin.com/oauth/v2/authorization',
        },
        {
            id: 'TWITTER',
            name: 'X (Twitter)',
            icon: 'logo-twitter',
            color: '#000000',
            description: 'Sync tweets and threads',
            scopes: ['tweet.read', 'users.read', 'offline.access'],
            features: ['import_posts', 'share_to', 'profile_sync', 'auto_sync'],
            oauthUrl: 'https://twitter.com/i/oauth2/authorize',
        },
        {
            id: 'INSTAGRAM',
            name: 'Instagram',
            icon: 'logo-instagram',
            color: '#E4405F',
            description: 'Import photos, reels, and stories',
            scopes: ['user_profile', 'user_media'],
            features: ['import_posts', 'profile_sync'],
            oauthUrl: 'https://api.instagram.com/oauth/authorize',
        },
        {
            id: 'FACEBOOK',
            name: 'Facebook',
            icon: 'logo-facebook',
            color: '#1877F2',
            description: 'Import posts and photos',
            scopes: ['public_profile', 'user_posts', 'user_photos'],
            features: ['import_posts', 'share_to', 'profile_sync'],
            oauthUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
        },
        {
            id: 'TIKTOK',
            name: 'TikTok',
            icon: 'musical-notes',
            color: '#000000',
            description: 'Import videos and content',
            scopes: ['user.info.basic', 'video.list'],
            features: ['import_posts', 'profile_sync'],
            oauthUrl: 'https://www.tiktok.com/v2/auth/authorize/',
        },
        {
            id: 'YOUTUBE',
            name: 'YouTube',
            icon: 'logo-youtube',
            color: '#FF0000',
            description: 'Import videos and shorts',
            scopes: ['https://www.googleapis.com/auth/youtube.readonly'],
            features: ['import_posts', 'profile_sync'],
            oauthUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        },
        {
            id: 'THREADS',
            name: 'Threads',
            icon: 'at-circle',
            color: '#000000',
            description: 'Import threads and replies',
            scopes: ['threads_basic', 'threads_content_publish'],
            features: ['import_posts', 'share_to', 'auto_sync'],
            oauthUrl: 'https://threads.net/oauth/authorize',
        },
    ];

    res.json({ platforms });
});

// ============================================
// GET /api/v1/social/feed
// Get a unified feed of cross-posted content
// ============================================
router.get('/feed', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Authentication required' });

        const cursor = req.query.cursor as string | undefined;
        const limit = safeParseInt(req.query.limit, 20, 1, 100);
        const platform = req.query.platform as string | undefined;

        const whereClause: Record<string, unknown> = {
            post: { userId: req.user.id, deletedAt: null },
            direction: 'INBOUND',
            status: 'COMPLETED',
        };

        if (platform) {
            whereClause.sourcePlatform = platform;
        }

        if (cursor) {
            whereClause.createdAt = { lt: new Date(cursor) };
        }

        const crossPosts = await prisma.crossPost.findMany({
            where: whereClause,
            include: {
                post: {
                    select: {
                        id: true,
                        type: true,
                        caption: true,
                        mediaUrl: true,
                        thumbnailUrl: true,
                        viewCount: true,
                        createdAt: true,
                        _count: { select: { likes: true, comments: true } },
                    },
                },
                connectedAccount: {
                    select: {
                        platform: true,
                        platformUsername: true,
                        avatarUrl: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
        });

        const hasMore = crossPosts.length > limit;
        const items = hasMore ? crossPosts.slice(0, limit) : crossPosts;
        const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

        res.json({ items, nextCursor, hasMore });
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/v1/social/stats
// Get aggregated stats for connected accounts
// ============================================
router.get('/stats', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Authentication required' });

        const accounts = await prisma.connectedAccount.findMany({
            where: { userId: req.user.id },
            take: 100,
            select: {
                id: true,
                platform: true,
                isActive: true,
                lastSyncAt: true,
                _count: { select: { crossPosts: true } },
            },
        });

        const totalCrossPosts = await prisma.crossPost.count({
            where: { post: { userId: req.user.id } },
        });

        const platformBreakdown = accounts.map((a) => ({
            platform: a.platform,
            isActive: a.isActive,
            postsImported: a._count.crossPosts,
            lastSyncAt: a.lastSyncAt,
        }));

        res.json({
            totalConnectedAccounts: accounts.length,
            activeAccounts: accounts.filter((a) => a.isActive).length,
            totalCrossPosts,
            platformBreakdown,
        });
    } catch (error) {
        next(error);
    }
});

export default router;
