import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../db/client.js';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import { rateLimiters } from '../middleware/rateLimit.js';

const router = Router();

router.use(rateLimiters.general);

const requireAdmin = (req: AuthRequest, res: any, next: any) => {
    if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN')) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// ============================================
// FOUNDING CREATOR: Claim founding creator status with access code
// ============================================
router.post('/founding', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { accessCode } = req.body;
        if (!accessCode) {
            return res.status(400).json({ error: 'Access code is required' });
        }

        const userId = req.user!.id;

        // Check if already a creator
        const existing = await prisma.creatorProfile.findUnique({ where: { userId } });
        if (existing) {
            return res.status(400).json({ error: 'You already have a creator profile' });
        }

        // Validate the access code — must be type 'founding_creator' and still usable
        const codeRecord = await prisma.accessCode.findUnique({
            where: { code: accessCode.trim().toUpperCase() },
        });

        if (!codeRecord || codeRecord.type !== 'founding_creator') {
            return res.status(400).json({ error: 'Invalid founding creator code' });
        }
        if (!codeRecord.isActive || (codeRecord.maxUses > 0 && codeRecord.useCount >= codeRecord.maxUses)) {
            return res.status(400).json({ error: 'This code has already been used or is no longer active' });
        }
        if (codeRecord.expiresAt && codeRecord.expiresAt < new Date()) {
            return res.status(400).json({ error: 'This code has expired' });
        }

        // Increment code usage
        await prisma.accessCode.update({
            where: { id: codeRecord.id },
            data: { useCount: { increment: 1 } },
        });

        // Generate referral code for the creator
        const referralCode = `FC${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

        // Create the CreatorProfile with partner tier, active status, verified badge
        const profile = await prisma.creatorProfile.create({
            data: {
                userId,
                tier: 'partner',
                status: 'active',
                hasVerifiedBadge: true,
                hasPrioritySupport: true,
                referralCode,
                earlyAccessSlots: 50, // Founding creators get generous invite slots
                agreedToTerms: true,
                agreedAt: new Date(),
            },
        });

        // Auto-elevate the user: trustLevel 3, isVerified, emailVerified
        await prisma.user.update({
            where: { id: userId },
            data: {
                trustLevel: 3,
                isVerified: true,
                emailVerified: true,
            },
        });

        // Send a welcome notification
        await prisma.notification.create({
            data: {
                userId,
                type: 'SYSTEM' as const,
                message: `Welcome to 0G as a Founding Creator! 🎉 Your account has full access — you can post, go live, message, and invite your community from day one. Thank you for being part of our founding story.`,
            },
        }).catch(() => { /* intentionally swallowed: welcome notification is best-effort */ });

        logger.info(`[Creators] Founding creator activated: userId=${userId}, code=${accessCode}`);

        res.json({
            success: true,
            profile,
            message: 'Welcome aboard! You are now a Founding Creator with full platform access.',
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// PUBLIC: Apply to Creator Program
// ============================================
router.post('/apply', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { platform, platformHandle, followerCount, contentNiche, bio, applicationNote } = req.body;

        // Check if already applied
        const existing = await prisma.creatorProfile.findUnique({ where: { userId: req.user!.id } });
        if (existing) {
            return res.status(400).json({ error: 'You have already applied to the creator program' });
        }

        const referralCode = `CR${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

        const profile = await prisma.creatorProfile.create({
            data: {
                userId: req.user!.id,
                platform,
                platformHandle,
                followerCount: parseInt(followerCount) || 0,
                contentNiche,
                bio,
                applicationNote,
                referralCode,
                agreedToTerms: true,
                agreedAt: new Date(),
            },
        });

        res.json({ success: true, profile });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/creators/me — Get my creator profile
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const profile = await prisma.creatorProfile.findUnique({
            where: { userId: req.user!.id },
            include: {
                user: {
                    select: { username: true, displayName: true, avatarUrl: true },
                },
            },
        });
        if (!profile) {
            return res.status(404).json({ error: 'No creator profile found' });
        }
        res.json(profile);
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/creators/me/codes — Get my referral access codes
router.get('/me/codes', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const profile = await prisma.creatorProfile.findUnique({ where: { userId: req.user!.id } });
        if (!profile) return res.status(404).json({ error: 'No creator profile' });

        // Find access codes created by this user with type 'creator'
        const codes = await prisma.accessCode.findMany({
            where: { createdById: req.user!.id, type: 'creator' },
            orderBy: { createdAt: 'desc' },
        });

        const remaining = profile.earlyAccessSlots - profile.slotsUsed;

        res.json({ codes, remaining, total: profile.earlyAccessSlots });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/creators/me/generate-code — Generate a new access code for a follower
router.post('/me/generate-code', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const profile = await prisma.creatorProfile.findUnique({ where: { userId: req.user!.id } });
        if (!profile || profile.status !== 'active') {
            return res.status(403).json({ error: 'Creator profile not active' });
        }
        if (profile.slotsUsed >= profile.earlyAccessSlots) {
            return res.status(400).json({ error: 'No remaining access code slots' });
        }

        const code = `${profile.referralCode.slice(0, 4)}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

        const accessCode = await prisma.accessCode.create({
            data: {
                code,
                type: 'creator',
                maxUses: 1,
                createdById: req.user!.id,
            },
        });

        await prisma.creatorProfile.update({
            where: { userId: req.user!.id },
            data: { slotsUsed: { increment: 1 } },
        });

        res.json({ code: accessCode.code, remaining: profile.earlyAccessSlots - profile.slotsUsed - 1 });
    } catch (error) {
        next(error);
    }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

// GET /api/v1/creators — List all creator applications
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const skip = (page - 1) * limit;

        const { status } = req.query;
        const where = status ? { status: status as string } : {};

        const [creators, total] = await Promise.all([
            prisma.creatorProfile.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
                include: {
                    user: { select: { id: true, username: true, displayName: true, avatarUrl: true, email: true } },
                },
            }),
            prisma.creatorProfile.count({ where }),
        ]);

        res.json({ data: creators, meta: { page, limit, total } });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/creators/:id/approve — Approve creator application
router.post('/:id/approve', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        const { tier, earlyAccessSlots } = req.body;
        const profile = await prisma.creatorProfile.update({
            where: { id: req.params.id },
            data: {
                status: 'active',
                tier: tier || 'ambassador',
                earlyAccessSlots: earlyAccessSlots || 10,
                hasVerifiedBadge: true,
                reviewedBy: req.user!.id,
                reviewedAt: new Date(),
            },
        });
        res.json({ success: true, profile });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/creators/:id/reject — Reject creator application
router.post('/:id/reject', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        const profile = await prisma.creatorProfile.update({
            where: { id: req.params.id },
            data: {
                status: 'suspended',
                reviewedBy: req.user!.id,
                reviewedAt: new Date(),
            },
        });
        res.json({ success: true, profile });
    } catch (error) {
        next(error);
    }
});

export default router;
