import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../db/client.js';
import crypto from 'crypto';

const router = Router();

// Optional auth — sets req.user if token present, continues otherwise
const optionalAuth = (req: AuthRequest, res: any, next: any) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return next();
    authenticate(req, res, () => next());
};

const requireAdmin = (req: AuthRequest, res: any, next: any) => {
    if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN')) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// ============================================
// PUBLIC ENDPOINTS
// ============================================

// GET /api/v1/campaigns/:slug — Public campaign landing page data
router.get('/:slug', async (req, res, next) => {
    try {
        const campaign = await prisma.campaign.findUnique({
            where: { slug: req.params.slug },
            include: {
                _count: { select: { signups: true } },
            },
        });
        if (!campaign || campaign.status === 'draft') {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        // Increment view count
        await prisma.campaign.update({
            where: { id: campaign.id },
            data: { viewCount: { increment: 1 } },
        });

        res.json({
            id: campaign.id,
            slug: campaign.slug,
            title: campaign.title,
            description: campaign.description,
            type: campaign.type,
            status: campaign.status,
            coverUrl: campaign.coverUrl,
            logoUrl: campaign.logoUrl,
            brandColor: campaign.brandColor,
            eventDate: campaign.eventDate,
            eventLocation: campaign.eventLocation,
            eventCity: campaign.eventCity,
            incentiveType: campaign.incentiveType,
            incentiveValue: campaign.incentiveValue,
            incentiveRules: campaign.incentiveRules,
            raffleDrawDate: campaign.raffleDrawDate,
            signupGoal: campaign.signupGoal,
            signupCount: campaign.signupCount,
            partnerName: campaign.partnerName,
            partnerLogo: campaign.partnerLogo,
            partnerUrl: campaign.partnerUrl,
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/campaigns/:slug/signup — Public campaign signup (no auth required)
router.post('/:slug/signup', async (req, res, next) => {
    try {
        const { name, email, phone, source, referredBy } = req.body;
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        const campaign = await prisma.campaign.findUnique({ where: { slug: req.params.slug } });
        if (!campaign || campaign.status !== 'active') {
            return res.status(404).json({ error: 'Campaign not found or inactive' });
        }

        // Create or update signup
        const signup = await prisma.campaignSignup.upsert({
            where: { campaignId_email: { campaignId: campaign.id, email } },
            update: { name, phone, source, referredBy },
            create: {
                campaignId: campaign.id,
                name,
                email,
                phone,
                source: source || 'link',
                referredBy,
            },
        });

        // Increment signup count
        await prisma.campaign.update({
            where: { id: campaign.id },
            data: { signupCount: { increment: 1 } },
        });

        // Generate an early access code for the signup if campaign has them
        let accessCode: string | null = null;
        if (campaign.incentiveType === 'early_access') {
            const code = `C${campaign.slug.slice(0, 3).toUpperCase()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
            const created = await prisma.accessCode.create({
                data: {
                    code,
                    type: 'campaign',
                    maxUses: 1,
                    campaignId: campaign.id,
                },
            });
            accessCode = created.code;
        }

        res.json({
            success: true,
            signup: { id: signup.id, name: signup.name, email: signup.email },
            accessCode,
            message: campaign.incentiveType === 'raffle'
                ? `You're entered in the raffle! Drawing on ${campaign.raffleDrawDate ? new Date(campaign.raffleDrawDate).toLocaleDateString() : 'TBD'}.`
                : accessCode
                    ? `Welcome! Your early access code is: ${accessCode}`
                    : 'Thanks for signing up!',
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

// GET /api/v1/campaigns — List all campaigns (admin)
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const skip = (page - 1) * limit;

        const [campaigns, total] = await Promise.all([
            prisma.campaign.findMany({
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
                include: { _count: { select: { signups: true, accessCodes: true } } },
            }),
            prisma.campaign.count(),
        ]);

        res.json({ data: campaigns, meta: { page, limit, total } });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/campaigns — Create campaign (admin)
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        const createCampaignSchema = z.object({
            title: z.string().min(1).max(200),
            description: z.string().min(1).max(2000),
            type: z.enum(['event', 'referral', 'engagement', 'content', 'growth']).optional(),
            slug: z.string().max(200).regex(/^[a-z0-9-]*$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
            coverUrl: z.string().url().optional(),
            logoUrl: z.string().url().optional(),
            brandColor: z.string().max(20).optional(),
            eventDate: z.string().datetime().optional(),
            eventLocation: z.string().max(500).optional(),
            eventCity: z.string().max(200).optional(),
            incentiveType: z.string().max(100).optional(),
            incentiveValue: z.string().max(500).optional(),
            incentiveRules: z.string().max(2000).optional(),
            raffleDrawDate: z.string().datetime().optional(),
            signupGoal: z.number().int().positive().max(1_000_000).optional(),
            partnerName: z.string().max(200).optional(),
            partnerLogo: z.string().url().optional(),
            partnerUrl: z.string().url().optional(),
            expiresAt: z.string().datetime().optional(),
        });

        const parsed = createCampaignSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'Invalid campaign data', details: parsed.error.flatten() });
        }

        const {
            title, description, type, slug,
            coverUrl, logoUrl, brandColor,
            eventDate, eventLocation, eventCity,
            incentiveType, incentiveValue, incentiveRules, raffleDrawDate,
            signupGoal,
            partnerName, partnerLogo, partnerUrl,
            expiresAt,
        } = parsed.data;

        const finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        const campaign = await prisma.campaign.create({
            data: {
                title,
                description,
                type: type || 'event',
                slug: finalSlug,
                status: 'active',
                coverUrl,
                logoUrl,
                brandColor,
                eventDate: eventDate ? new Date(eventDate) : null,
                eventLocation,
                eventCity,
                incentiveType,
                incentiveValue,
                incentiveRules,
                raffleDrawDate: raffleDrawDate ? new Date(raffleDrawDate) : null,
                signupGoal: signupGoal || 100,
                partnerName,
                partnerLogo,
                partnerUrl,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                createdById: req.user!.id,
            },
        });

        res.json(campaign);
    } catch (error) {
        next(error);
    }
});

// PATCH /api/v1/campaigns/:id — Update campaign (admin)
const updateCampaignSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(2000).optional(),
    status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'ENDED']).optional(),
    slug: z.string().max(200).regex(/^[a-z0-9-]*$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
    coverUrl: z.string().url().optional().nullable(),
    logoUrl: z.string().url().optional().nullable(),
    brandColor: z.string().max(20).optional(),
    eventDate: z.string().datetime().optional().nullable(),
    eventLocation: z.string().max(500).optional().nullable(),
    eventCity: z.string().max(200).optional().nullable(),
    incentiveType: z.string().max(100).optional().nullable(),
    incentiveValue: z.string().max(500).optional().nullable(),
    incentiveRules: z.string().max(2000).optional().nullable(),
    raffleDrawDate: z.string().datetime().optional().nullable(),
    signupGoal: z.number().int().positive().max(1_000_000).optional().nullable(),
    partnerName: z.string().max(200).optional().nullable(),
    partnerLogo: z.string().url().optional().nullable(),
    partnerUrl: z.string().url().optional().nullable(),
    expiresAt: z.string().datetime().optional().nullable(),
    imageUrl: z.string().url().optional().nullable(),
    maxSignups: z.number().int().positive().optional().nullable(),
    startDate: z.string().datetime().optional().nullable(),
    endDate: z.string().datetime().optional().nullable(),
    requirements: z.string().max(2000).optional().nullable(),
}).strict();

router.patch('/:id', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        const parsed = updateCampaignSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'Invalid update data', details: parsed.error.flatten() });
        }

        // Only include defined fields in the update
        const updateData: Record<string, any> = {};
        for (const [key, value] of Object.entries(parsed.data)) {
            if (value !== undefined) {
                // Convert date strings to Date objects
                if (['startDate', 'endDate', 'eventDate', 'raffleDrawDate', 'expiresAt'].includes(key) && typeof value === 'string') {
                    updateData[key] = new Date(value);
                } else {
                    updateData[key] = value;
                }
            }
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        const campaign = await prisma.campaign.update({
            where: { id: req.params.id },
            data: updateData,
        });
        res.json(campaign);
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/campaigns/:id/signups — List signups (admin)
router.get('/:id/signups', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        // Check if id is a UUID or slug
        const where = req.params.id.includes('-')
            ? { id: req.params.id }
            : { slug: req.params.id };

        const campaign = await prisma.campaign.findFirst({ where });
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

        const signups = await prisma.campaignSignup.findMany({
            where: { campaignId: campaign.id },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ signups, total: signups.length });
    } catch (error) {
        next(error);
    }
});

export default router;
