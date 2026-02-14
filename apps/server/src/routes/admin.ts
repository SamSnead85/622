import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../db/client.js';
import { getRecentThreats, getThreatSummary } from '../services/securityMonitor.js';
import { blockIP, getClientIP, logSecurityEvent, SecurityEvents } from '../services/security.js';
import { recordBan } from '../services/evasionDetection.js';
import { sendAlert } from '../services/alerting.js';
import { logger } from '../utils/logger.js';
import { propagateVouchStrike } from '../services/trustChainService.js';
import { rateLimiters } from '../middleware/rateLimit.js';
import { safeParseInt } from '../utils/validation.js';

const router = Router();

// ============================================
// MIDDLEWARE: Require ADMIN or SUPERADMIN role
// ============================================
const requireAdmin = (req: AuthRequest, res: any, next: any) => {
    if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN')) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

const requireSuperAdmin = (req: AuthRequest, res: any, next: any) => {
    if (!req.user || req.user.role !== 'SUPERADMIN') {
        return res.status(403).json({ error: 'Super admin access required' });
    }
    next();
};

// ============================================
// USER MANAGEMENT
// ============================================

// GET /api/v1/admin/users — List all users with filtering
router.get('/users', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        const { search, role, status } = req.query;
        const page = safeParseInt(req.query.page, 1, 1, 10000);
        const take = safeParseInt(req.query.limit, 20, 1, 100);
        const skip = (page - 1) * take;

        const where: Record<string, unknown> = {};
        if (search) {
            where.OR = [
                { username: { contains: search as string, mode: 'insensitive' } },
                { displayName: { contains: search as string, mode: 'insensitive' } },
                { email: { contains: search as string, mode: 'insensitive' } },
            ];
        }
        if (role) where.role = role;
        if (status === 'banned') where.isBanned = true;
        if (status === 'suspended') where.suspendedUntil = { gt: new Date() };
        if (status === 'active') {
            where.isBanned = false;
            where.OR = [
                { suspendedUntil: null },
                { suspendedUntil: { lt: new Date() } },
            ];
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    username: true,
                    displayName: true,
                    email: true,
                    avatarUrl: true,
                    role: true,
                    isVerified: true,
                    isBanned: true,
                    strikeCount: true,
                    suspendedUntil: true,
                    createdAt: true,
                    lastActiveAt: true,
                    _count: { select: { posts: true, communityMemberships: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take,
            }),
            prisma.user.count({ where }),
        ]);

        res.json({ users, total, page, totalPages: Math.ceil(total / take) });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/admin/users/:id — Get single user detail
router.get('/users/:id', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
            select: {
                id: true,
                username: true,
                displayName: true,
                email: true,
                bio: true,
                avatarUrl: true,
                role: true,
                isVerified: true,
                isBanned: true,
                strikeCount: true,
                suspendedUntil: true,
                createdAt: true,
                lastActiveAt: true,
                _count: { select: { posts: true, communityMemberships: true, followers: true, following: true } },
                receivedStrikes: {
                    where: { isActive: true },
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        reason: true,
                        postId: true,
                        isActive: true,
                        createdAt: true,
                        expiresAt: true,
                        issuedBy: { select: { username: true, displayName: true } },
                    },
                },
            },
        });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/admin/users/:id/suspend — Suspend a user
router.post('/users/:id/suspend', authenticate, requireAdmin, rateLimiters.general, async (req: AuthRequest, res, next) => {
    try {
        const suspendSchema = z.object({
            duration: z.number().int().positive().max(8760).optional().default(24), // max 1 year in hours
            reason: z.string().min(1).max(500).optional().default('Policy violation'),
        });
        const { duration, reason } = suspendSchema.parse(req.body);
        const hours = duration;
        const suspendedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);

        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { suspendedUntil },
            select: { id: true, username: true, suspendedUntil: true },
        });

        res.json({ success: true, user, reason, suspendedUntil });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/admin/users/:id/unsuspend — Lift suspension
router.post('/users/:id/unsuspend', authenticate, requireAdmin, rateLimiters.general, async (req: AuthRequest, res, next) => {
    try {
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { suspendedUntil: null },
            select: { id: true, username: true, suspendedUntil: true },
        });
        res.json({ success: true, user });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/admin/users/:id/ban — Ban a user
router.post('/users/:id/ban', authenticate, requireAdmin, rateLimiters.general, async (req: AuthRequest, res, next) => {
    try {
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { isBanned: true },
            select: { id: true, username: true, isBanned: true },
        });
        res.json({ success: true, user });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/admin/users/:id/unban — Unban a user
router.post('/users/:id/unban', authenticate, requireAdmin, rateLimiters.general, async (req: AuthRequest, res, next) => {
    try {
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { isBanned: false },
            select: { id: true, username: true, isBanned: true },
        });
        res.json({ success: true, user });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/admin/users/:id/role — Change user role (SUPERADMIN only)
router.post('/users/:id/role', authenticate, requireSuperAdmin, rateLimiters.general, async (req: AuthRequest, res, next) => {
    try {
        const { role } = req.body;
        if (!['USER', 'MODERATOR', 'ADMIN', 'SUPERADMIN'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { role },
            select: { id: true, username: true, role: true },
        });
        res.json({ success: true, user });
    } catch (error) {
        next(error);
    }
});

// ============================================
// STRIKE MANAGEMENT
// ============================================

// POST /api/v1/admin/users/:id/strike — Issue a strike
router.post('/users/:id/strike', authenticate, requireAdmin, rateLimiters.general, async (req: AuthRequest, res, next) => {
    try {
        const strikeSchema = z.object({
            reason: z.string().min(1).max(500),
            postId: z.string().uuid().optional(),
            expiresInDays: z.number().int().positive().max(365).optional(),
        });
        const { reason, postId, expiresInDays } = strikeSchema.parse(req.body);

        const expiresAt = expiresInDays
            ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
            : null;

        let autoSuspended = false;
        const strike = await prisma.$transaction(async (tx) => {
            const newStrike = await tx.userStrike.create({
                data: {
                    userId: req.params.id,
                    issuedById: req.user!.id,
                    reason,
                    postId: postId || null,
                    expiresAt,
                },
            });
            const updatedUser = await tx.user.update({
                where: { id: req.params.id },
                data: { strikeCount: { increment: 1 } },
            });

            // Check if auto-suspend threshold reached (3 strikes)
            if (updatedUser.strikeCount >= 3) {
                await tx.user.update({
                    where: { id: req.params.id },
                    data: { suspendedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
                });
                autoSuspended = true;
            }

            return newStrike;
        });

        // ── Reputation bonding: propagate vouch strike to inviter ──
        propagateVouchStrike(req.params.id).catch((err) =>
            logger.warn('[Admin] Vouch strike propagation failed (non-blocking):', { error: err?.message || err })
        );

        res.json({ success: true, strike, autoSuspended });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/admin/strikes/:id — Remove a strike
router.delete('/strikes/:id', authenticate, requireAdmin, rateLimiters.general, async (req: AuthRequest, res, next) => {
    try {
        const strike = await prisma.userStrike.findUnique({ where: { id: req.params.id } });
        if (!strike) return res.status(404).json({ error: 'Strike not found' });

        await prisma.$transaction([
            prisma.userStrike.update({
                where: { id: req.params.id },
                data: { isActive: false },
            }),
            prisma.user.update({
                where: { id: strike.userId },
                data: { strikeCount: { decrement: 1 } },
            }),
        ]);

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/admin/strikes — List all active strikes
router.get('/strikes', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        const page = safeParseInt(req.query.page, 1, 1, 10000);
        const limit = safeParseInt(req.query.limit, 50, 1, 100);
        const skip = (page - 1) * limit;

        const where = { isActive: true };

        const [strikes, total] = await Promise.all([
            prisma.userStrike.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
                include: {
                    user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
                    issuedBy: { select: { id: true, username: true, displayName: true } },
                },
            }),
            prisma.userStrike.count({ where }),
        ]);

        res.json({ data: strikes, meta: { page, limit, total } });
    } catch (error) {
        next(error);
    }
});

// ============================================
// CONTENT MODERATION
// ============================================

// GET /api/v1/admin/posts — List posts for moderation
router.get('/posts', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        const page = safeParseInt(req.query.page, 1, 1, 10000);
        const take = safeParseInt(req.query.limit, 20, 1, 100);
        const skip = (page - 1) * take;

        const [posts, total] = await Promise.all([
            prisma.post.findMany({
                include: {
                    user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
                    _count: { select: { likes: true, comments: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take,
            }),
            prisma.post.count(),
        ]);

        res.json({ posts, total, page, totalPages: Math.ceil(total / take) });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/admin/posts/:id — Delete a post
router.delete('/posts/:id', authenticate, requireAdmin, rateLimiters.general, async (req: AuthRequest, res, next) => {
    try {
        await prisma.post.update({
            where: { id: req.params.id },
            data: { deletedAt: new Date() },
        });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/admin/reports — List pending reports
router.get('/reports', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        const page = safeParseInt(req.query.page, 1, 1, 10000);
        const limit = safeParseInt(req.query.limit, 50, 1, 100);
        const skip = (page - 1) * limit;

        const VALID_REPORT_STATUSES = ['PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED'] as const;
        const rawStatus = (req.query.status as string) || 'PENDING';
        const status = VALID_REPORT_STATUSES.includes(rawStatus as (typeof VALID_REPORT_STATUSES)[number])
            ? rawStatus
            : 'PENDING';
        const where: Record<string, unknown> = { status };

        const [reports, total] = await Promise.all([
            prisma.report.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
                include: {
                    reporter: { select: { id: true, username: true, displayName: true } },
                },
            }),
            prisma.report.count({ where }),
        ]);

        res.json({ data: reports, meta: { page, limit, total } });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/admin/reports/:id/resolve — Resolve a report
router.post('/reports/:id/resolve', authenticate, requireAdmin, rateLimiters.general, async (req: AuthRequest, res, next) => {
    try {
        const { action, notes } = req.body; // action: 'dismiss' | 'warn' | 'strike' | 'remove'
        const report = await prisma.report.update({
            where: { id: req.params.id },
            data: { status: 'RESOLVED', notes: notes || `Resolved with action: ${action}` },
        });
        res.json({ success: true, report });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/admin/stats — Dashboard statistics
router.get('/stats', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        const [
            totalUsers,
            activeUsers,
            bannedUsers,
            totalPosts,
            totalCommunities,
            pendingReports,
            activeStrikes,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { lastActiveAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
            prisma.user.count({ where: { isBanned: true } }),
            prisma.post.count(),
            prisma.community.count(),
            prisma.report.count({ where: { status: 'PENDING' } }),
            prisma.userStrike.count({ where: { isActive: true } }),
        ]);

        res.json({
            totalUsers,
            activeUsers,
            bannedUsers,
            totalPosts,
            totalCommunities,
            pendingReports,
            activeStrikes,
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// SECURITY: THREAT DASHBOARD
// ============================================

// GET /api/v1/admin/threats — Recent threat events
router.get('/threats', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        const limit = safeParseInt(req.query.limit, 50, 1, 200);
        const threats = getRecentThreats(limit);
        res.json({ threats, count: threats.length });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/admin/threats/summary — Threat statistics
router.get('/threats/summary', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        const summary = getThreatSummary();

        // Add shadow-banned count
        const shadowBannedCount = await prisma.user.count({ where: { isShadowBanned: true } });
        const blockedIPCount = await prisma.blockedIP.count();
        const bannedFingerprintCount = await prisma.bannedFingerprint.count();
        const bannedDomainCount = await prisma.bannedEmailDomain.count();

        res.json({
            ...summary,
            shadowBannedCount,
            blockedIPCount,
            bannedFingerprintCount,
            bannedDomainCount,
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/admin/security/audit-log — Security audit log
router.get('/security/audit-log', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        const limit = safeParseInt(req.query.limit, 50, 1, 200);
        const offset = safeParseInt(req.query.offset, 0, 0, 10000);
        const action = req.query.action as string | undefined;
        const severity = req.query.severity as string | undefined;

        const where: Record<string, unknown> = {};
        if (action) where.action = action;
        if (severity) where.severity = severity;

        const [logs, total] = await Promise.all([
            prisma.securityAuditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.securityAuditLog.count({ where }),
        ]);

        res.json({ logs, total, limit, offset });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/admin/threats/action — Take action on a threat
router.post('/threats/action', authenticate, requireAdmin, rateLimiters.general, async (req: AuthRequest, res, next) => {
    try {
        const schema = z.object({
            action: z.enum(['ban_user', 'shadow_ban', 'block_ip', 'dismiss', 'approve_post']),
            userId: z.string().optional(),
            ip: z.string().optional(),
            postId: z.string().optional(),
            reason: z.string().optional(),
        });

        const data = schema.parse(req.body);

        switch (data.action) {
            case 'ban_user': {
                if (!data.userId) throw new Error('userId required for ban_user');
                const user = await prisma.user.update({
                    where: { id: data.userId },
                    data: { isBanned: true },
                });
                // Record ban for evasion detection
                const userSessions = await prisma.session.findMany({
                    where: { userId: data.userId },
                    select: { ipAddress: true },
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                });
                await recordBan(data.userId, userSessions[0]?.ipAddress || '0.0.0.0');
                // Delete all sessions
                await prisma.session.deleteMany({ where: { userId: data.userId } });
                // Hide all their posts
                await prisma.post.updateMany({
                    where: { userId: data.userId },
                    data: { visible: false },
                });
                await logSecurityEvent({
                    action: SecurityEvents.ADMIN_ACTION,
                    userId: req.userId,
                    ipAddress: getClientIP(req),
                    details: { action: 'ban_user', targetUserId: data.userId, reason: data.reason },
                    severity: 'HIGH',
                });
                res.json({ success: true, message: `User ${user.username} banned` });
                break;
            }
            case 'shadow_ban': {
                if (!data.userId) throw new Error('userId required for shadow_ban');
                const user = await prisma.user.update({
                    where: { id: data.userId },
                    data: { isShadowBanned: true },
                });
                // Hide all their posts
                await prisma.post.updateMany({
                    where: { userId: data.userId },
                    data: { visible: false },
                });
                await logSecurityEvent({
                    action: SecurityEvents.ADMIN_ACTION,
                    userId: req.userId,
                    ipAddress: getClientIP(req),
                    details: { action: 'shadow_ban', targetUserId: data.userId, reason: data.reason },
                    severity: 'MEDIUM',
                });
                res.json({ success: true, message: `User ${user.username} shadow-banned` });
                break;
            }
            case 'block_ip': {
                if (!data.ip) throw new Error('ip required for block_ip');
                await blockIP({
                    ipAddress: data.ip,
                    reason: data.reason || 'Blocked by admin',
                    threatLevel: 'HIGH',
                    source: 'admin',
                    createdById: req.userId,
                });
                res.json({ success: true, message: `IP ${data.ip} blocked` });
                break;
            }
            case 'approve_post': {
                if (!data.postId) throw new Error('postId required for approve_post');
                await prisma.post.update({
                    where: { id: data.postId },
                    data: { visible: true },
                });
                res.json({ success: true, message: 'Post approved and visible' });
                break;
            }
            case 'dismiss': {
                res.json({ success: true, message: 'Threat dismissed' });
                break;
            }
        }
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/admin/moderation-queue — Posts held for review
router.get('/moderation-queue', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        const limit = safeParseInt(req.query.limit, 20, 1, 100);
        const offset = safeParseInt(req.query.offset, 0, 0, 10000);

        const [posts, total] = await Promise.all([
            prisma.post.findMany({
                where: { visible: false, deletedAt: null },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            displayName: true,
                            avatarUrl: true,
                            trustLevel: true,
                            emailVerified: true,
                            createdAt: true,
                            isShadowBanned: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.post.count({ where: { visible: false, deletedAt: null } }),
        ]);

        res.json({ posts, total, limit, offset });
    } catch (error) {
        next(error);
    }
});

export default router;
