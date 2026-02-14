import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../db/client.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { rateLimiters } from '../middleware/rateLimit.js';

const router = Router();

// ============================================
// HELPERS
// ============================================
function hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
}

function generateApiKey(): string {
    return `0g_${crypto.randomBytes(32).toString('hex')}`;
}

function generateSecret(): string {
    return crypto.randomBytes(48).toString('hex');
}

// ============================================
// APP MANAGEMENT
// ============================================

// GET /api/v1/developer/apps - List user's apps
router.get('/apps', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const apps = await prisma.developerApp.findMany({
            where: { ownerId: req.userId! },
            include: {
                apiKeys: { select: { id: true, name: true, keyPrefix: true, isActive: true, lastUsedAt: true, requestCount: true, createdAt: true } },
                webhooks: { select: { id: true, url: true, events: true, isActive: true, failCount: true, lastFiredAt: true } },
                _count: { select: { oauthTokens: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json({ apps });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/developer/apps - Create new app
router.post('/apps', rateLimiters.general, authenticate, async (req: AuthRequest, res, next) => {
    try {
        const schema = z.object({
            name: z.string().min(2).max(60),
            description: z.string().max(500).optional(),
            websiteUrl: z.string().url().optional(),
            callbackUrl: z.string().url().optional(),
            logoUrl: z.string().url().optional(),
            scopes: z.string().optional(),
        });

        const data = schema.parse(req.body);
        const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const clientSecret = generateSecret();

        const app = await prisma.developerApp.create({
            data: {
                ownerId: req.userId!,
                name: data.name,
                slug,
                description: data.description,
                websiteUrl: data.websiteUrl,
                callbackUrl: data.callbackUrl,
                logoUrl: data.logoUrl,
                clientSecret: hashKey(clientSecret),
                scopes: data.scopes || 'read',
            },
        });

        // Auto-create a default API key
        const rawKey = generateApiKey();
        await prisma.apiKey.create({
            data: {
                appId: app.id,
                name: 'Default Key',
                keyHash: hashKey(rawKey),
                keyPrefix: rawKey.substring(0, 11), // "0g_" + first 8 chars
                scopes: data.scopes || 'read',
            },
        });

        res.status(201).json({
            app: {
                id: app.id,
                name: app.name,
                slug: app.slug,
                clientId: app.clientId,
                scopes: app.scopes,
                createdAt: app.createdAt,
            },
            clientSecret, // Only returned once at creation
            apiKey: rawKey, // Only returned once at creation
            warning: 'Store these credentials securely. They will not be shown again.',
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/v1/developer/apps/:appId - Update app
router.put('/apps/:appId', rateLimiters.general, authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { appId } = req.params;

        const app = await prisma.developerApp.findFirst({ where: { id: appId, ownerId: req.userId! } });
        if (!app) throw new AppError('App not found', 404);

        const schema = z.object({
            name: z.string().min(2).max(60).optional(),
            description: z.string().max(500).optional(),
            websiteUrl: z.string().url().optional().nullable(),
            callbackUrl: z.string().url().optional().nullable(),
            logoUrl: z.string().url().optional().nullable(),
            scopes: z.string().optional(),
            isActive: z.boolean().optional(),
        });

        const data = schema.parse(req.body);

        const updated = await prisma.developerApp.update({
            where: { id: appId },
            data,
        });

        res.json(updated);
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/developer/apps/:appId - Delete app
router.delete('/apps/:appId', rateLimiters.general, authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { appId } = req.params;

        const app = await prisma.developerApp.findFirst({ where: { id: appId, ownerId: req.userId! } });
        if (!app) throw new AppError('App not found', 404);

        await prisma.developerApp.delete({ where: { id: appId } });
        res.json({ deleted: true });
    } catch (error) {
        next(error);
    }
});

// ============================================
// API KEY MANAGEMENT
// ============================================

// POST /api/v1/developer/apps/:appId/keys - Create new API key
router.post('/apps/:appId/keys', rateLimiters.general, authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { appId } = req.params;
        const { name, scopes } = req.body;

        const app = await prisma.developerApp.findFirst({ where: { id: appId, ownerId: req.userId! } });
        if (!app) throw new AppError('App not found', 404);

        const rawKey = generateApiKey();

        const key = await prisma.apiKey.create({
            data: {
                appId,
                name: name || 'API Key',
                keyHash: hashKey(rawKey),
                keyPrefix: rawKey.substring(0, 11),
                scopes: scopes || app.scopes,
            },
        });

        res.status(201).json({
            key: {
                id: key.id,
                name: key.name,
                prefix: key.keyPrefix,
                scopes: key.scopes,
                createdAt: key.createdAt,
            },
            apiKey: rawKey,
            warning: 'Store this key securely. It will not be shown again.',
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/developer/apps/:appId/keys/:keyId - Revoke key
router.delete('/apps/:appId/keys/:keyId', rateLimiters.general, authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { appId, keyId } = req.params;

        const app = await prisma.developerApp.findFirst({ where: { id: appId, ownerId: req.userId! } });
        if (!app) throw new AppError('App not found', 404);

        await prisma.apiKey.delete({ where: { id: keyId } });
        res.json({ revoked: true });
    } catch (error) {
        next(error);
    }
});

// ============================================
// WEBHOOK MANAGEMENT
// ============================================

// POST /api/v1/developer/apps/:appId/webhooks - Create webhook
router.post('/apps/:appId/webhooks', rateLimiters.general, authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { appId } = req.params;

        const app = await prisma.developerApp.findFirst({ where: { id: appId, ownerId: req.userId! } });
        if (!app) throw new AppError('App not found', 404);

        const schema = z.object({
            url: z.string().url(),
            events: z.string().min(1), // comma-separated
        });

        const data = schema.parse(req.body);
        const secret = generateSecret();

        const webhook = await prisma.webhook.create({
            data: {
                appId,
                url: data.url,
                secret: hashKey(secret),
                events: data.events,
            },
        });

        res.status(201).json({
            webhook: {
                id: webhook.id,
                url: webhook.url,
                events: webhook.events,
                isActive: webhook.isActive,
            },
            signingSecret: secret,
            warning: 'Store the signing secret securely. It will not be shown again.',
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/developer/apps/:appId/webhooks/:webhookId
router.delete('/apps/:appId/webhooks/:webhookId', rateLimiters.general, authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { appId, webhookId } = req.params;

        const app = await prisma.developerApp.findFirst({ where: { id: appId, ownerId: req.userId! } });
        if (!app) throw new AppError('App not found', 404);

        await prisma.webhook.delete({ where: { id: webhookId } });
        res.json({ deleted: true });
    } catch (error) {
        next(error);
    }
});

// ============================================
// OAUTH2 FLOW
// ============================================

// GET /api/v1/developer/oauth/authorize
// Client redirects user here with: client_id, redirect_uri, scope, state
router.get('/oauth/authorize', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { client_id, redirect_uri, scope, state } = req.query;

        if (!client_id) throw new AppError('client_id is required', 400);

        const app = await prisma.developerApp.findUnique({
            where: { clientId: client_id as string },
        });
        if (!app || !app.isActive) throw new AppError('Invalid application', 400);

        // Generate authorization code
        const code = crypto.randomBytes(32).toString('hex');

        // Store temporarily (expires in 5 minutes)
        // In production, store in Redis. For now, use a temp token in DB.
        const token = await prisma.oAuthToken.create({
            data: {
                appId: app.id,
                userId: req.userId!,
                accessToken: code,
                scopes: (scope as string) || app.scopes,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
            },
        });

        // Return auth code (in real OAuth, this redirects to callback URL)
        const redirectUrl = (redirect_uri as string) || app.callbackUrl;
        if (redirectUrl) {
            const url = new URL(redirectUrl);
            url.searchParams.set('code', code);
            if (state) url.searchParams.set('state', state as string);
            return res.redirect(url.toString());
        }

        res.json({ code, expiresIn: 300 });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/developer/oauth/token
// Exchange auth code for access token
router.post('/oauth/token', rateLimiters.auth, async (req, res, next) => {
    try {
        const { grant_type, code, client_id, client_secret } = req.body;

        if (grant_type !== 'authorization_code') {
            throw new AppError('Only authorization_code grant type is supported', 400);
        }

        if (!code || !client_id || !client_secret) {
            throw new AppError('code, client_id, and client_secret are required', 400);
        }

        // Verify client
        const app = await prisma.developerApp.findUnique({ where: { clientId: client_id } });
        if (!app || hashKey(client_secret) !== app.clientSecret) {
            throw new AppError('Invalid client credentials', 401);
        }

        // Find and verify auth code
        const authCode = await prisma.oAuthToken.findUnique({ where: { accessToken: code } });
        if (!authCode || authCode.appId !== app.id || authCode.expiresAt < new Date()) {
            throw new AppError('Invalid or expired authorization code', 400);
        }

        // Generate access and refresh tokens
        const accessToken = `0gat_${crypto.randomBytes(32).toString('hex')}`;
        const refreshToken = `0grt_${crypto.randomBytes(32).toString('hex')}`;

        // Update with real tokens
        await prisma.oAuthToken.update({
            where: { id: authCode.id },
            data: {
                accessToken,
                refreshToken,
                expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
            },
        });

        res.json({
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: 3600,
            refresh_token: refreshToken,
            scope: authCode.scopes,
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// PUBLIC API ENDPOINTS (for third-party apps)
// Authenticated via API key or OAuth token
// ============================================

// API key / OAuth middleware
async function authenticateApi(req: AuthRequest, res: any, next: any) {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'] as string;

    try {
        // Option 1: API Key in header
        if (apiKeyHeader) {
            const keyHash = hashKey(apiKeyHeader);
            const key = await prisma.apiKey.findUnique({
                where: { keyHash },
                include: { app: true },
            });

            if (!key || !key.isActive || !key.app.isActive) {
                return res.status(401).json({ error: 'Invalid API key' });
            }

            // Update usage stats
            await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date(), requestCount: { increment: 1 } } });
            await prisma.developerApp.update({ where: { id: key.appId }, data: { lastUsedAt: new Date(), requestCount: { increment: 1 } } });

            (req as any).apiApp = key.app;
            (req as any).apiScopes = key.scopes.split(',');
            return next();
        }

        // Option 2: OAuth Bearer token
        if (authHeader?.startsWith('Bearer 0gat_')) {
            const token = authHeader.split(' ')[1];
            const oauthToken = await prisma.oAuthToken.findUnique({
                where: { accessToken: token },
                include: { app: true },
            });

            if (!oauthToken || oauthToken.expiresAt < new Date()) {
                return res.status(401).json({ error: 'Invalid or expired token' });
            }

            req.userId = oauthToken.userId;
            (req as any).apiApp = oauthToken.app;
            (req as any).apiScopes = oauthToken.scopes.split(',');
            return next();
        }

        return res.status(401).json({ error: 'API key or OAuth token required. Pass X-Api-Key header or Bearer token.' });
    } catch (error) {
        return res.status(500).json({ error: 'Authentication error' });
    }
}

// Helper to check scopes
function requireScope(scope: string) {
    return (req: any, res: any, next: any) => {
        const scopes = req.apiScopes || [];
        if (!scopes.includes(scope) && !scopes.includes('all')) {
            return res.status(403).json({ error: `Insufficient scope. Required: ${scope}` });
        }
        next();
    };
}

// ---- PUBLIC API: Communities ----

router.get('/public/communities', authenticateApi, requireScope('read'), async (req: AuthRequest, res, next) => {
    try {
        const { search, limit = '20', cursor } = req.query;

        const communities = await prisma.community.findMany({
            where: {
                isPublic: true,
                ...(search ? { name: { contains: search as string, mode: 'insensitive' as const } } : {}),
            },
            take: parseInt(limit as string),
            ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
            orderBy: { memberCount: 'desc' },
            select: {
                id: true, name: true, slug: true, description: true, avatarUrl: true,
                coverUrl: true, memberCount: true, postCount: true, category: true,
                brandColor: true, tagline: true, logoUrl: true, websiteUrl: true, createdAt: true,
            },
        });

        res.json({ data: communities, meta: { count: communities.length } });
    } catch (error) {
        next(error);
    }
});

router.get('/public/communities/:id', authenticateApi, requireScope('read'), async (req: AuthRequest, res, next) => {
    try {
        const community = await prisma.community.findUnique({
            where: { id: req.params.id },
            select: {
                id: true, name: true, slug: true, description: true, avatarUrl: true,
                coverUrl: true, memberCount: true, postCount: true, isPublic: true, category: true,
                brandColor: true, tagline: true, logoUrl: true, websiteUrl: true, createdAt: true,
            },
        });

        if (!community) throw new AppError('Community not found', 404);
        if (!community.isPublic) throw new AppError('Private community', 403);

        res.json({ data: community });
    } catch (error) {
        next(error);
    }
});

// ---- PUBLIC API: Posts ----

router.get('/public/posts', authenticateApi, requireScope('read'), async (req: AuthRequest, res, next) => {
    try {
        const { communityId, limit = '20', cursor } = req.query;

        const posts = await prisma.post.findMany({
            where: { deletedAt: null, ...(communityId ? { communityId: communityId as string } : {}) },
            take: parseInt(limit as string),
            ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
                _count: { select: { likes: true, comments: true } },
            },
        });

        res.json({
            data: posts.map(p => ({
                id: p.id, content: p.caption, type: p.type, mediaUrl: p.mediaUrl,
                communityId: p.communityId, createdAt: p.createdAt,
                author: p.user,
                stats: { likes: p._count.likes, comments: p._count.comments },
            })),
            meta: { count: posts.length },
        });
    } catch (error) {
        next(error);
    }
});

// ---- PUBLIC API: Create Community (write scope) ----

router.post('/public/communities', rateLimiters.general, authenticateApi, requireScope('write'), async (req: AuthRequest, res, next) => {
    try {
        if (!req.userId) throw new AppError('OAuth token with user context required for write operations', 403);

        const schema = z.object({
            name: z.string().min(3).max(50),
            description: z.string().max(500).optional(),
            category: z.string().optional(),
            isPublic: z.boolean().optional(),
            brandColor: z.string().optional(),
            tagline: z.string().optional(),
            logoUrl: z.string().url().optional(),
        });

        const data = schema.parse(req.body);
        const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        const community = await prisma.community.create({
            data: {
                ...data,
                slug,
                creatorId: req.userId,
                memberCount: 1,
            },
        });

        await prisma.communityMember.create({
            data: { userId: req.userId, communityId: community.id, role: 'ADMIN' },
        });

        res.status(201).json({ data: community });
    } catch (error) {
        next(error);
    }
});

// ---- PUBLIC API: Create Post (write scope) ----

router.post('/public/posts', rateLimiters.general, authenticateApi, requireScope('write'), async (req: AuthRequest, res, next) => {
    try {
        if (!req.userId) throw new AppError('OAuth token with user context required', 403);

        const schema = z.object({
            content: z.string().min(1).max(5000),
            communityId: z.string().optional(),
            type: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'LINK', 'EVENT']).optional(),
            mediaUrl: z.string().url().optional(),
        });

        const data = schema.parse(req.body);

        const post = await prisma.post.create({
            data: {
                userId: req.userId,
                caption: data.content,
                communityId: data.communityId,
                type: (data.type as 'IMAGE' | 'VIDEO' | 'TEXT') || 'TEXT',
                mediaUrl: data.mediaUrl,
            },
        });

        res.status(201).json({ data: post });
    } catch (error) {
        next(error);
    }
});

// ---- PUBLIC API: Users (read scope) ----

router.get('/public/users/:username', authenticateApi, requireScope('read'), async (req: AuthRequest, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { username: req.params.username },
            select: {
                id: true, username: true, displayName: true, avatarUrl: true, bio: true,
                isVerified: true, createdAt: true,
                _count: { select: { posts: true, followers: true, following: true } },
            },
        });

        if (!user) throw new AppError('User not found', 404);
        res.json({ data: user });
    } catch (error) {
        next(error);
    }
});

// ---- PUBLIC API: Stats ----

router.get('/public/stats', authenticateApi, requireScope('read'), async (_req, res, next) => {
    try {
        const [users, communities, posts] = await Promise.all([
            prisma.user.count(),
            prisma.community.count(),
            prisma.post.count(),
        ]);

        res.json({ data: { users, communities, posts, platform: '0G Social', version: 'v1' } });
    } catch (error) {
        next(error);
    }
});

export { router as developerRouter };
