import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../db/client.js';

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
        const { search, role, status, page = '1', limit = '20' } = req.query;
        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
        const take = parseInt(limit as string);

        const where: any = {};
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

        res.json({ users, total, page: parseInt(page as string), totalPages: Math.ceil(total / take) });
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
router.post('/users/:id/suspend', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        const { duration, reason } = req.body; // duration in hours
        const hours = parseInt(duration) || 24;
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
router.post('/users/:id/unsuspend', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
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
router.post('/users/:id/ban', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
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
router.post('/users/:id/unban', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
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
router.post('/users/:id/role', authenticate, requireSuperAdmin, async (req: AuthRequest, res, next) => {
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
router.post('/users/:id/strike', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        const { reason, postId, expiresInDays } = req.body;
        if (!reason) return res.status(400).json({ error: 'Reason is required' });

        const expiresAt = expiresInDays
            ? new Date(Date.now() + parseInt(expiresInDays) * 24 * 60 * 60 * 1000)
            : null;

        const [strike] = await prisma.$transaction([
            prisma.userStrike.create({
                data: {
                    userId: req.params.id,
                    issuedById: req.user!.id,
                    reason,
                    postId: postId || null,
                    expiresAt,
                },
            }),
            prisma.user.update({
                where: { id: req.params.id },
                data: { strikeCount: { increment: 1 } },
            }),
        ]);

        // Check if auto-suspend threshold reached (3 strikes)
        const updatedUser = await prisma.user.findUnique({
            where: { id: req.params.id },
            select: { strikeCount: true },
        });
        let autoSuspended = false;
        if (updatedUser && updatedUser.strikeCount >= 3) {
            await prisma.user.update({
                where: { id: req.params.id },
                data: { suspendedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
            });
            autoSuspended = true;
        }

        res.json({ success: true, strike, autoSuspended });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/admin/strikes/:id — Remove a strike
router.delete('/strikes/:id', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
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
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
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
        const { page = '1', limit = '20' } = req.query;
        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
        const take = parseInt(limit as string);

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

        res.json({ posts, total, page: parseInt(page as string), totalPages: Math.ceil(total / take) });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/admin/posts/:id — Delete a post
router.delete('/posts/:id', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        await prisma.post.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/admin/reports — List pending reports
router.get('/reports', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const skip = (page - 1) * limit;

        const status = (req.query.status as string) || 'PENDING';
        const where = { status: status as any };

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
router.post('/reports/:id/resolve', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
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

export default router;
