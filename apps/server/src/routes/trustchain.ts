/**
 * TRUST CHAIN ROUTES
 * Vouched Entry System — invite chain management, Rally pages, access requests.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../db/client.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import {
    getChainInfo,
    getDegreesFromUser,
    generateVouchCode,
    getRemainingVouches,
    processRallyQueue,
} from '../services/trustChainService.js';

const router = Router();

// ============================================
// AUTHENTICATED ENDPOINTS
// ============================================

/**
 * GET /api/v1/trustchain/me
 * Get current user's trust chain info.
 */
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const chain = await getChainInfo(userId);

        if (!chain) {
            return res.json({
                inChain: false,
                message: 'You are not yet part of the trust chain.',
            });
        }

        res.json({
            inChain: true,
            degree: chain.degree,
            foundingCreator: chain.foundingCreator,
            invitedBy: chain.invitedBy,
            weeklyAllocation: chain.weeklyAllocation,
            invitesUsedThisWeek: chain.invitesUsedThisWeek,
            invitesRemaining: chain.invitesRemaining,
            totalInvitesSent: chain.totalInvitesSent,
            isUnlocked: chain.isUnlocked,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v1/trustchain/user/:userId
 * Get another user's chain info (degree from shared founding creator).
 */
router.get('/user/:userId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const myId = req.user!.id;
        const targetId = req.params.userId;

        const [targetChain, degrees] = await Promise.all([
            getChainInfo(targetId),
            getDegreesFromUser(myId, targetId),
        ]);

        if (!targetChain) {
            return res.json({ inChain: false });
        }

        res.json({
            inChain: true,
            degree: targetChain.degree,
            foundingCreator: targetChain.foundingCreator,
            degreesFromYou: degrees,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/v1/trustchain/vouch
 * Send a vouch invite to someone by email.
 */
const vouchSchema = z.object({
    email: z.string().email(),
    message: z.string().max(500).optional(),
});

router.post('/vouch', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { email, message } = vouchSchema.parse(req.body);

        const result = await generateVouchCode(userId, email, message);

        if ('error' in result) {
            return res.status(400).json({ error: result.error });
        }

        // Send the vouch email (best-effort)
        const inviter = await prisma.user.findUnique({
            where: { id: userId },
            select: { displayName: true, username: true },
        });

        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
            fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from: process.env.EMAIL_FROM || 'noreply@0g.social',
                    to: email,
                    subject: `${inviter?.displayName || inviter?.username || 'Someone'} vouched for you to join 0G`,
                    html: `
                        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;background:#1A1412;color:#FFF5E6;border-radius:16px;">
                            <h2 style="color:#FFB020;font-family:'Space Grotesk',sans-serif;">You've been vouched for.</h2>
                            <p style="color:#BFB09E;">${inviter?.displayName || inviter?.username || 'A trusted member'} personally vouched for you to join 0G — the people's network.</p>
                            ${message ? `<p style="color:#BFB09E;font-style:italic;">"${message}"</p>` : ''}
                            <div style="background:#221C18;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
                                <p style="color:#BFB09E;font-size:14px;margin:0 0 8px 0;">Your invite code:</p>
                                <span style="font-size:28px;font-weight:700;letter-spacing:4px;color:#FFB020;">${result.code}</span>
                            </div>
                            <p style="color:#7A6E60;font-size:13px;">This code is single-use and expires in 14 days. Use it to create your account at 0gravity.ai</p>
                            <p style="color:#7A6E60;font-size:13px;">No ads. No algorithms. No compromise.</p>
                        </div>
                    `,
                }),
            }).catch(err => logger.error('[TrustChain] Vouch email send failed:', err));
        }

        const remaining = await getRemainingVouches(userId);

        res.json({
            success: true,
            code: result.code,
            inviteId: result.inviteId,
            remainingThisWeek: remaining,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v1/trustchain/my-vouches
 * List people the current user has vouched for.
 */
router.get('/my-vouches', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const invites = await prisma.invite.findMany({
            where: { senderId: userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                joinedUser: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        trustLevel: true,
                        strikeCount: true,
                    },
                },
            },
        });

        const remaining = await getRemainingVouches(userId);

        res.json({
            vouches: invites.map(inv => ({
                id: inv.id,
                recipientEmail: inv.recipientEmail,
                status: inv.status,
                sentAt: inv.sentAt,
                joinedUser: inv.joinedUser,
            })),
            remainingThisWeek: remaining,
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// PUBLIC ENDPOINTS (No Auth)
// ============================================

/**
 * GET /api/v1/trustchain/rally/:slug
 * Get Rally page info (public — for the application form).
 */
router.get('/rally/:slug', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const rally = await prisma.rally.findUnique({
            where: { slug: req.params.slug.toLowerCase() },
            include: {
                creator: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        isVerified: true,
                    },
                },
            },
        });

        if (!rally || !rally.isActive) {
            return res.status(404).json({ error: 'Rally page not found or inactive.' });
        }

        res.json({
            slug: rally.slug,
            title: rally.title || `Join ${rally.creator.displayName || rally.creator.username} on 0G`,
            description: rally.description,
            creator: rally.creator,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/v1/trustchain/rally/:slug/apply
 * Submit a Rally application (public, no auth).
 */
const rallyApplySchema = z.object({
    email: z.string().email(),
    displayName: z.string().min(1).max(100),
    statement: z.string().max(500).optional(),
});

router.post('/rally/:slug/apply', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, displayName, statement } = rallyApplySchema.parse(req.body);

        const rally = await prisma.rally.findUnique({
            where: { slug: req.params.slug.toLowerCase() },
        });

        if (!rally || !rally.isActive) {
            return res.status(404).json({ error: 'Rally page not found or inactive.' });
        }

        // Check if already applied
        const existing = await prisma.rallyApplication.findUnique({
            where: { rallyId_email: { rallyId: rally.id, email: email.toLowerCase() } },
        });
        if (existing) {
            if (existing.status === 'approved' && existing.accessCode) {
                return res.json({ status: 'already_approved', message: 'You have already been approved. Check your email for the invite code.' });
            }
            return res.json({ status: 'already_applied', message: 'Your application is being reviewed. We will email you when approved.' });
        }

        // Check if email is already registered
        const existingUser = await prisma.user.findFirst({
            where: { email: email.toLowerCase() },
        });
        if (existingUser) {
            return res.status(400).json({ error: 'This email is already registered on 0G.' });
        }

        // Create application
        await prisma.rallyApplication.create({
            data: {
                rallyId: rally.id,
                email: email.toLowerCase(),
                displayName,
                statement,
            },
        });

        // Process the queue (auto-approve if within weekly allocation)
        const result = await processRallyQueue(rally.id);

        // Check if this specific application was approved
        const myApp = await prisma.rallyApplication.findUnique({
            where: { rallyId_email: { rallyId: rally.id, email: email.toLowerCase() } },
        });

        if (myApp?.status === 'approved' && myApp.accessCode) {
            // Send the code via email
            const creator = await prisma.user.findUnique({
                where: { id: rally.creatorId },
                select: { displayName: true, username: true },
            });

            const resendKey = process.env.RESEND_API_KEY;
            if (resendKey) {
                fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        from: process.env.EMAIL_FROM || 'noreply@0g.social',
                        to: email,
                        subject: `You're in! Your 0G invite code from ${creator?.displayName || 'a creator'}`,
                        html: `
                            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;background:#1A1412;color:#FFF5E6;border-radius:16px;">
                                <h2 style="color:#FFB020;font-family:'Space Grotesk',sans-serif;">You're in.</h2>
                                <p style="color:#BFB09E;">Your application through ${creator?.displayName || creator?.username || 'a creator'}'s Rally has been approved.</p>
                                <div style="background:#221C18;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
                                    <p style="color:#BFB09E;font-size:14px;margin:0 0 8px 0;">Your invite code:</p>
                                    <span style="font-size:28px;font-weight:700;letter-spacing:4px;color:#FFB020;">${myApp.accessCode}</span>
                                </div>
                                <p style="color:#7A6E60;font-size:13px;">This code is single-use and expires in 14 days.</p>
                            </div>
                        `,
                    }),
                }).catch(err => logger.error('[TrustChain] Rally approval email failed:', err));
            }

            return res.json({ status: 'approved', message: 'You have been approved! Check your email for the invite code.' });
        }

        res.json({ status: 'pending', message: 'Your application has been submitted. We will email you when approved.' });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/v1/trustchain/request-access
 * Submit an access request (public, no auth — for people without an invite).
 */
const requestAccessSchema = z.object({
    email: z.string().email(),
    displayName: z.string().min(1).max(100),
    reason: z.string().max(1000).optional(),
});

router.post('/request-access', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, displayName, reason } = requestAccessSchema.parse(req.body);

        // Check if already requested
        const existing = await prisma.accessRequest.findUnique({
            where: { email: email.toLowerCase() },
        });
        if (existing) {
            if (existing.status === 'approved' && existing.accessCode) {
                return res.json({ status: 'already_approved', message: 'You have already been approved. Check your email for the invite code.' });
            }
            if (existing.status === 'pending') {
                return res.json({ status: 'already_pending', message: 'Your request is being reviewed. We will email you when approved.' });
            }
        }

        // Check if email is already registered
        const existingUser = await prisma.user.findFirst({
            where: { email: email.toLowerCase() },
        });
        if (existingUser) {
            return res.status(400).json({ error: 'This email is already registered on 0G.' });
        }

        await prisma.accessRequest.create({
            data: {
                email: email.toLowerCase(),
                displayName,
                reason,
            },
        });

        // Notify admins
        const admins = await prisma.user.findMany({
            where: { role: { in: ['ADMIN', 'SUPERADMIN'] } },
            select: { id: true },
        });
        if (admins.length > 0) {
            await prisma.notification.createMany({
                data: admins.map(admin => ({
                    userId: admin.id,
                    type: 'SYSTEM' as const,
                    message: `New access request from ${displayName} (${email})${reason ? `: "${reason.substring(0, 100)}"` : ''}`,
                })),
            }).catch(() => { /* best-effort */ });
        }

        res.json({ status: 'submitted', message: 'Your request has been submitted. We will email you when approved.' });
    } catch (error) {
        next(error);
    }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * GET /api/v1/trustchain/requests
 * List pending access requests (admin only).
 */
router.get('/requests', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { role: true } });
        if (!user || !['ADMIN', 'SUPERADMIN'].includes(user.role)) {
            throw new AppError('Admin access required', 403);
        }

        const status = (req.query.status as string) || 'pending';
        const requests = await prisma.accessRequest.findMany({
            where: { status },
            orderBy: { createdAt: 'asc' },
            take: 50,
        });

        res.json({ requests });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/v1/trustchain/requests/:id/approve
 * Approve an access request (admin only).
 */
router.post('/requests/:id/approve', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const adminUser = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, role: true } });
        if (!adminUser || !['ADMIN', 'SUPERADMIN'].includes(adminUser.role)) {
            throw new AppError('Admin access required', 403);
        }

        const request = await prisma.accessRequest.findUnique({ where: { id: req.params.id } });
        if (!request) throw new AppError('Request not found', 404);
        if (request.status !== 'pending') throw new AppError('Request already processed', 400);

        // Generate code
        const code = `A${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

        await prisma.accessCode.create({
            data: {
                code,
                type: 'admin_approved',
                maxUses: 1,
                useCount: 0,
                createdById: adminUser.id,
                isActive: true,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            },
        });

        await prisma.accessRequest.update({
            where: { id: request.id },
            data: {
                status: 'approved',
                accessCode: code,
                reviewedBy: adminUser.id,
                reviewedAt: new Date(),
            },
        });

        // Send approval email
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
            fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from: process.env.EMAIL_FROM || 'noreply@0g.social',
                    to: request.email,
                    subject: 'Your 0G access request has been approved',
                    html: `
                        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;background:#1A1412;color:#FFF5E6;border-radius:16px;">
                            <h2 style="color:#FFB020;font-family:'Space Grotesk',sans-serif;">Welcome to 0G.</h2>
                            <p style="color:#BFB09E;">Your request to join 0G has been approved.</p>
                            <div style="background:#221C18;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
                                <p style="color:#BFB09E;font-size:14px;margin:0 0 8px 0;">Your invite code:</p>
                                <span style="font-size:28px;font-weight:700;letter-spacing:4px;color:#FFB020;">${code}</span>
                            </div>
                            <p style="color:#7A6E60;font-size:13px;">This code is single-use and expires in 30 days.</p>
                        </div>
                    `,
                }),
            }).catch(err => logger.error('[TrustChain] Access approval email failed:', err));
        }

        res.json({ success: true, code });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/v1/trustchain/requests/:id/reject
 * Reject an access request (admin only).
 */
router.post('/requests/:id/reject', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const adminUser = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, role: true } });
        if (!adminUser || !['ADMIN', 'SUPERADMIN'].includes(adminUser.role)) {
            throw new AppError('Admin access required', 403);
        }

        const request = await prisma.accessRequest.findUnique({ where: { id: req.params.id } });
        if (!request) throw new AppError('Request not found', 404);
        if (request.status !== 'pending') throw new AppError('Request already processed', 400);

        await prisma.accessRequest.update({
            where: { id: request.id },
            data: {
                status: 'rejected',
                reviewedBy: adminUser.id,
                reviewedAt: new Date(),
            },
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v1/trustchain/rally-applications
 * List Rally applications (admin only).
 */
router.get('/rally-applications', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { role: true } });
        if (!user || !['ADMIN', 'SUPERADMIN'].includes(user.role)) {
            throw new AppError('Admin access required', 403);
        }

        const status = (req.query.status as string) || 'pending';
        const applications = await prisma.rallyApplication.findMany({
            where: { status },
            orderBy: { createdAt: 'asc' },
            take: 50,
            include: {
                rally: {
                    select: { slug: true, creator: { select: { username: true, displayName: true } } },
                },
            },
        });

        res.json({ applications });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/v1/trustchain/rally/:id/allocation
 * Adjust a creator's Rally weekly allocation (admin only).
 */
router.put('/rally/:id/allocation', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const adminUser = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { role: true } });
        if (!adminUser || !['ADMIN', 'SUPERADMIN'].includes(adminUser.role)) {
            throw new AppError('Admin access required', 403);
        }

        const { weeklyAllocation } = z.object({ weeklyAllocation: z.number().int().min(0).max(10000) }).parse(req.body);

        const rally = await prisma.rally.findUnique({ where: { id: req.params.id } });
        if (!rally) throw new AppError('Rally not found', 404);

        await prisma.rally.update({
            where: { id: rally.id },
            data: { weeklyAllocation },
        });

        res.json({ success: true, weeklyAllocation });
    } catch (error) {
        next(error);
    }
});

export default router;
