import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../db/client.js';
import { v4 as uuid } from 'uuid';

// Validation schemas
const paymentUpdateSchema = z.object({
    paymentEmail: z.string().email('Invalid email format').optional(),
    paymentMethod: z.enum(['paypal', 'wise', 'bank_transfer', 'crypto']).optional(),
    legalName: z.string().min(1).max(200).optional(),
    country: z.string().min(2).max(3).optional(),
});

const enrollSchema = z.object({
    paymentEmail: z.string().email('Invalid email format').optional(),
    legalName: z.string().min(1).max(200).optional(),
    country: z.string().min(2).max(3).optional(),
});

// Require ADMIN or SUPERADMIN role
const requireAdmin = (req: AuthRequest, res: any, next: any) => {
    if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN')) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

const router = Router();

// ============================================
// ENROLL AS GROWTH PARTNER (invite-only)
// User must already have a pre-created GrowthPartner
// record with status 'invited' (created by admin).
// This endpoint activates the invitation.
// ============================================
router.post('/enroll', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const userId = req.user!.id;

        // Check if user has a pre-created invitation
        const existing = await prisma.growthPartner.findUnique({ where: { userId } });

        if (existing && existing.status === 'active') {
            res.status(400).json({ error: 'You are already an active Growth Partner.' });
            return;
        }

        if (!existing || existing.status !== 'invited') {
            res.status(403).json({
                error: 'The Growth Partner program is invite-only. Contact an admin to request access.',
            });
            return;
        }

        // Activate the invitation with provided details
        const data = enrollSchema.parse(req.body);

        const partner = await prisma.growthPartner.update({
            where: { userId },
            data: {
                paymentEmail: data.paymentEmail || null,
                legalName: data.legalName || null,
                country: data.country || null,
                status: 'active',
                enrolledAt: new Date(),
            },
        });

        res.status(201).json({
            success: true,
            partner: {
                id: partner.id,
                referralCode: partner.referralCode,
                tier: partner.tier,
                status: partner.status,
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        next(error);
    }
});

// ============================================
// GET MY GROWTH PARTNER DASHBOARD
// ============================================
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const userId = req.user!.id;

        const partner = await prisma.growthPartner.findUnique({
            where: { userId },
            include: {
                referrals: {
                    orderBy: { invitedAt: 'desc' },
                    take: 50,
                },
                earnings: {
                    orderBy: { earnedAt: 'desc' },
                    take: 50,
                },
            },
        });

        if (!partner) {
            res.status(404).json({ error: 'Not enrolled as Growth Partner.' });
            return;
        }

        // Calculate stats
        const directReferrals = partner.referrals.filter(r => r.referralLevel === 'direct');
        const secondLevelReferrals = partner.referrals.filter(r => r.referralLevel === 'second_level');

        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);

        const monthlyEarnings = partner.earnings
            .filter(e => new Date(e.earnedAt) >= thisMonth && e.status !== 'cancelled')
            .reduce((sum, e) => sum + e.amount, 0);

        // Get next payout date (1st of next month)
        const nextPayout = new Date();
        nextPayout.setMonth(nextPayout.getMonth() + 1);
        nextPayout.setDate(1);

        res.json({
            partner: {
                id: partner.id,
                referralCode: partner.referralCode,
                tier: partner.tier,
                status: partner.status,
                enrolledAt: partner.enrolledAt,
                paymentEmail: partner.paymentEmail,
                paymentMethod: partner.paymentMethod,
            },
            stats: {
                totalEarned: partner.totalEarned,
                totalPaid: partner.totalPaid,
                pendingPayout: partner.pendingPayout,
                monthlyEarnings,
                nextPayoutDate: nextPayout.toISOString(),
                directReferrals: {
                    total: directReferrals.length,
                    qualified: directReferrals.filter(r => r.status === 'qualified').length,
                    pending: directReferrals.filter(r => r.status === 'pending').length,
                    inactive: directReferrals.filter(r => r.status === 'inactive').length,
                },
                secondLevelReferrals: {
                    total: secondLevelReferrals.length,
                    qualified: secondLevelReferrals.filter(r => r.status === 'qualified').length,
                    pending: secondLevelReferrals.filter(r => r.status === 'pending').length,
                },
            },
            recentReferrals: partner.referrals.slice(0, 20).map(r => ({
                id: r.id,
                level: r.referralLevel,
                status: r.status,
                invitedAt: r.invitedAt,
                qualifiedAt: r.qualifiedAt,
                daysActive: r.daysActive,
                rewardAmount: r.rewardAmount,
                flagReason: r.flagReason,
            })),
            recentEarnings: partner.earnings.slice(0, 20).map(e => ({
                id: e.id,
                type: e.type,
                amount: e.amount,
                status: e.status,
                earnedAt: e.earnedAt,
                paidAt: e.paidAt,
            })),
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// UPDATE PAYMENT INFO
// ============================================
router.put('/me/payment', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const userId = req.user!.id;
        const data = paymentUpdateSchema.parse(req.body);

        const partner = await prisma.growthPartner.findUnique({ where: { userId } });
        if (!partner) {
            res.status(404).json({ error: 'Not enrolled as Growth Partner.' });
            return;
        }

        const updated = await prisma.growthPartner.update({
            where: { userId },
            data: {
                ...(data.paymentEmail !== undefined && { paymentEmail: data.paymentEmail }),
                ...(data.paymentMethod !== undefined && { paymentMethod: data.paymentMethod }),
                ...(data.legalName !== undefined && { legalName: data.legalName }),
                ...(data.country !== undefined && { country: data.country }),
            },
        });

        res.json({ success: true, paymentEmail: updated.paymentEmail, paymentMethod: updated.paymentMethod });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        next(error);
    }
});

// ============================================
// GET LEADERBOARD
// ============================================
router.get('/leaderboard', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const partners = await prisma.growthPartner.findMany({
            where: { status: 'active' },
            orderBy: { directReferralsQualified: 'desc' },
            take: 50,
            include: {
                user: {
                    select: { username: true, displayName: true, avatarUrl: true },
                },
            },
        });

        const userId = req.user!.id;
        const myPartner = await prisma.growthPartner.findUnique({ where: { userId } });
        let myRank = -1;
        if (myPartner) {
            myRank = partners.findIndex(p => p.userId === userId) + 1;
            if (myRank === 0) {
                // Not in top 50, find actual rank
                const count = await prisma.growthPartner.count({
                    where: {
                        status: 'active',
                        directReferralsQualified: { gt: myPartner.directReferralsQualified },
                    },
                });
                myRank = count + 1;
            }
        }

        res.json({
            leaderboard: partners.map((p, i) => ({
                rank: i + 1,
                username: p.user?.username || 'unknown',
                displayName: p.user?.displayName || 'Unknown',
                avatarUrl: p.user?.avatarUrl,
                qualifiedReferrals: p.directReferralsQualified + p.secondLevelReferralsQualified,
                tier: p.tier,
            })),
            myRank,
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// ADMIN: LIST ALL GROWTH PARTNERS
// ============================================
router.get('/admin/all', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        const { status, tier, page = '1', limit = '20' } = req.query;
        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

        const where: any = {};
        if (status) where.status = status;
        if (tier) where.tier = tier;

        const [partners, total] = await Promise.all([
            prisma.growthPartner.findMany({
                where,
                include: {
                    user: { select: { username: true, displayName: true, email: true } },
                    _count: { select: { referrals: true, earnings: true } },
                },
                orderBy: { enrolledAt: 'desc' },
                skip,
                take: parseInt(limit as string),
            }),
            prisma.growthPartner.count({ where }),
        ]);

        // Program totals
        const totals = await prisma.growthPartner.aggregate({
            _sum: { totalEarned: true, totalPaid: true, pendingPayout: true },
            _count: true,
        });

        res.json({
            partners: partners.map(p => ({
                ...p,
                user: p.user || null,
            })),
            total,
            programTotals: {
                totalPartners: totals._count,
                totalEarned: totals._sum.totalEarned || 0,
                totalPaid: totals._sum.totalPaid || 0,
                pendingPayouts: totals._sum.pendingPayout || 0,
            },
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// ADMIN: FRAUD REVIEW QUEUE
// ============================================
router.get('/admin/flagged', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        const flagged = await prisma.growthReferral.findMany({
            where: { status: 'flagged' },
            orderBy: { invitedAt: 'desc' },
            include: {
                growthPartner: {
                    include: {
                        user: { select: { username: true, displayName: true } },
                    },
                },
            },
        });

        res.json({
            flagged: flagged.map(r => ({
                id: r.id,
                partnerId: r.growthPartnerId,
                partnerUsername: r.growthPartner.user?.username,
                referredUserId: r.referredUserId,
                level: r.referralLevel,
                flagReason: r.flagReason,
                invitedAt: r.invitedAt,
                daysActive: r.daysActive,
            })),
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// ADMIN: APPROVE/REJECT FLAGGED REFERRAL
// ============================================
router.post('/admin/referrals/:id/review', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        const { id } = req.params;
        const { action, note } = req.body; // action: 'approve' | 'reject'

        const referral = await prisma.growthReferral.findUnique({
            where: { id },
            include: { growthPartner: true },
        });

        if (!referral) {
            res.status(404).json({ error: 'Referral not found.' });
            return;
        }

        if (action === 'approve') {
            const rewardAmount = referral.referralLevel === 'direct' ? 5 : 1;

            await prisma.$transaction([
                prisma.growthReferral.update({
                    where: { id },
                    data: { status: 'qualified', qualifiedAt: new Date(), rewardAmount, flagReason: null },
                }),
                prisma.earning.create({
                    data: {
                        growthPartnerId: referral.growthPartnerId,
                        referralId: id,
                        type: referral.referralLevel === 'direct' ? 'direct_referral' : 'second_level_referral',
                        amount: rewardAmount,
                        status: 'approved',
                        approvedAt: new Date(),
                        note: note || 'Approved from fraud review',
                    },
                }),
                prisma.growthPartner.update({
                    where: { id: referral.growthPartnerId },
                    data: {
                        totalEarned: { increment: rewardAmount },
                        pendingPayout: { increment: rewardAmount },
                        ...(referral.referralLevel === 'direct'
                            ? { directReferralsQualified: { increment: 1 } }
                            : { secondLevelReferralsQualified: { increment: 1 } }),
                    },
                }),
            ]);
        } else {
            await prisma.growthReferral.update({
                where: { id },
                data: { status: 'inactive', flagReason: note || referral.flagReason },
            });
        }

        res.json({ success: true, action });
    } catch (error) {
        next(error);
    }
});

// ============================================
// ADMIN: UPDATE PARTNER STATUS/TIER
// ============================================
router.patch('/admin/:id', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        const { id } = req.params;
        const { status, tier } = req.body;

        const updated = await prisma.growthPartner.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(tier && { tier }),
            },
        });

        res.json({ success: true, partner: updated });
    } catch (error) {
        next(error);
    }
});

// ============================================
// ADMIN: INVITE A USER TO THE GROWTH PARTNER PROGRAM
// Pre-creates a GrowthPartner record with status 'invited'.
// The user can then activate via POST /enroll.
// ============================================
router.post('/admin/invite', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        const { userId, username, tier } = req.body;

        // Resolve user by userId or username
        let targetUserId = userId;
        if (!targetUserId && username) {
            const targetUser = await prisma.user.findUnique({
                where: { username: username.toLowerCase() },
                select: { id: true, username: true, displayName: true },
            });
            if (!targetUser) {
                res.status(404).json({ error: `User @${username} not found.` });
                return;
            }
            targetUserId = targetUser.id;
        }

        if (!targetUserId) {
            res.status(400).json({ error: 'Provide userId or username.' });
            return;
        }

        // Check if already a partner
        const existing = await prisma.growthPartner.findUnique({ where: { userId: targetUserId } });
        if (existing) {
            res.status(400).json({ error: `User already has a growth partner record (status: ${existing.status}).` });
            return;
        }

        // Generate referral code
        const user = await prisma.user.findUnique({ where: { id: targetUserId }, select: { username: true } });
        const code = `${user?.username || 'gp'}-${uuid().slice(0, 6)}`;

        const partner = await prisma.growthPartner.create({
            data: {
                userId: targetUserId,
                referralCode: code,
                status: 'invited',
                tier: tier || 'affiliate',
            },
        });

        // Notify the user
        await prisma.notification.create({
            data: {
                userId: targetUserId,
                type: 'SYSTEM',
                actorId: req.user!.id,
                message: 'You have been invited to the Growth Partner program! Visit your Growth dashboard to activate your account and start earning.',
            },
        }).catch(() => {});

        res.status(201).json({
            success: true,
            partner: {
                id: partner.id,
                userId: partner.userId,
                referralCode: partner.referralCode,
                tier: partner.tier,
                status: partner.status,
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
