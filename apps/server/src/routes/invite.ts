import { Router, Request, Response, NextFunction } from 'express';
import { inviteService } from '../services/invite/InviteService.js';
import { prisma } from '../db/client.js';

const router = Router();

// Auth request type
interface AuthRequest extends Request {
    user?: { id: string };
}

// Middleware to ensure user is authenticated
const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
};

/**
 * GET /api/invite
 * Get user's sent invites
 */
router.get('/', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const invites = await inviteService.getUserInvites(req.user!.id);
        const remaining = await inviteService.getRemainingInvites(req.user!.id);

        res.json({ invites, remainingToday: remaining });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/invite/email
 * Send an email invite
 */
router.post('/email', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { email, message } = req.body;

        if (!email || typeof email !== 'string') {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        const result = await inviteService.sendEmailInvite(req.user!.id, email, message);

        if (result.status === 'failed') {
            return res.status(400).json({ error: result.error });
        }

        res.json({ success: true, inviteId: result.inviteId });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/invite/link
 * Create a shareable invite link
 */
router.post('/link', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { code, url } = await inviteService.createInviteLink(req.user!.id);
        res.json({ code, url });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/invite/bulk
 * Send invites to multiple pending connections
 */
router.post('/bulk', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { connectionIds, message } = req.body;

        if (!Array.isArray(connectionIds) || connectionIds.length === 0) {
            return res.status(400).json({ error: 'Connection IDs required' });
        }

        if (connectionIds.length > 50) {
            return res.status(400).json({ error: 'Maximum 50 invites per request' });
        }

        const result = await inviteService.sendBulkInvites(
            req.user!.id,
            connectionIds,
            message
        );

        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/invite/sms-bulk
 * Send SMS invites to multiple phone numbers (max 20)
 * Used by the contact picker invite flow
 */
router.post('/sms-bulk', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { phones, message } = req.body;

        if (!Array.isArray(phones) || phones.length === 0) {
            return res.status(400).json({ error: 'Phone numbers required' });
        }

        if (phones.length > 20) {
            return res.status(400).json({ error: 'Maximum 20 invites per batch' });
        }

        // Basic phone validation
        const validPhones = phones.filter((p: unknown) => typeof p === 'string' && p.length >= 10);
        if (validPhones.length === 0) {
            return res.status(400).json({ error: 'No valid phone numbers provided' });
        }

        const result = await inviteService.sendBulkSmsInvites(
            req.user!.id,
            validPhones,
            message
        );

        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/invite/connections
 * Get pending connections that can be invited
 */
router.get('/connections', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { status, platform } = req.query;

        const where: Record<string, unknown> = { userId: req.user!.id };

        if (status) {
            where.inviteStatus = status as string;
        }

        if (platform) {
            where.platform = platform as string;
        }

        const connections = await prisma.pendingConnection.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                matchedUser: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                    },
                },
            },
        });

        // Group by status for UI
        const grouped = {
            matched: connections.filter(c => c.matchedUserId),
            invitable: connections.filter(c => !c.matchedUserId && c.email && c.inviteStatus === 'NOT_SENT'),
            sent: connections.filter(c => ['SENT', 'REMINDED', 'OPENED'].includes(c.inviteStatus)),
            joined: connections.filter(c => c.inviteStatus === 'JOINED'),
            unknown: connections.filter(c => !c.matchedUserId && !c.email),
        };

        res.json({ connections: grouped, total: connections.length });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/invite/validate/:code
 * Validate a referral code (for join flow)
 */
router.post('/validate/:code', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const invite = await prisma.invite.findUnique({
            where: { referralCode: req.params.code },
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                    },
                },
            },
        });

        if (!invite) {
            return res.status(404).json({ error: 'Invalid invite code' });
        }

        if (invite.status === 'JOINED') {
            return res.status(400).json({ error: 'Invite already used' });
        }

        // Track that invite was opened
        await inviteService.trackInviteOpened(req.params.code);

        res.json({
            valid: true,
            sender: invite.sender,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/invite/complete/:code
 * Mark invite as completed when user joins
 */
router.post('/complete/:code', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const success = await inviteService.handleReferralJoin(
            req.params.code,
            req.user!.id
        );

        if (!success) {
            return res.status(404).json({ error: 'Invalid invite code' });
        }

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

export default router;
