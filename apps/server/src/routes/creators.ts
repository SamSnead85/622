import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

const requireAdmin = (req: AuthRequest, res: any, next: any) => {
    if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN')) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

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
        const { status } = req.query;
        const where = status ? { status: status as string } : {};

        const creators = await prisma.creatorProfile.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { id: true, username: true, displayName: true, avatarUrl: true, email: true } },
            },
        });
        res.json(creators);
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
