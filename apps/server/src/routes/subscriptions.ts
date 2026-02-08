
import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ── Helpers ────────────────────────────────────────────

/** Dynamically import Stripe only when the secret key is available. */
async function getStripe() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return null;

    const { default: Stripe } = await import('stripe');
    return new Stripe(key, { apiVersion: '2025-01-27.acacia' });
}

/** Resolve the client-facing base URL used for redirects. */
function getClientUrl(): string {
    return (
        process.env.CLIENT_URL ||
        process.env.FRONTEND_URL ||
        process.env.APP_URL ||
        'http://localhost:3000'
    );
}

// ============================================
// GET /api/v1/subscriptions
// Get current user's subscription status
// ============================================
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const stripe = await getStripe();

        const subscription = await prisma.subscription.findUnique({
            where: { userId: req.userId }
        });

        // If Stripe is configured, fetch live prices; otherwise return empty plans
        let plans: { id: string; name: string; price: number; currency: string }[] = [];

        if (stripe) {
            try {
                const prices = await stripe.prices.list({
                    active: true,
                    expand: ['data.product'],
                    limit: 10,
                });

                plans = prices.data.map((p) => ({
                    id: p.id,
                    name:
                        typeof p.product === 'object' && 'name' in p.product
                            ? p.product.name
                            : p.id,
                    price: p.unit_amount ?? 0,
                    currency: p.currency,
                }));
            } catch (err) {
                console.error('[subscriptions] Failed to fetch Stripe prices:', err);
            }
        }

        res.json({
            subscription: subscription || null,
            availablePlans: plans,
            isSubscribed: subscription?.status === 'active',
            stripeConfigured: !!stripe,
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// POST /api/v1/subscriptions/checkout
// Create a Stripe Checkout session
// ============================================
router.post('/checkout', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const stripe = await getStripe();

        if (!stripe) {
            return res.status(503).json({
                error: 'Stripe is not configured. Set the STRIPE_SECRET_KEY environment variable to enable payments.',
            });
        }

        const { planId } = req.body;

        if (!planId || typeof planId !== 'string') {
            return res.status(400).json({ error: 'planId is required' });
        }

        // Look up or create a Stripe customer for the user
        const user = await prisma.user.findUnique({ where: { id: req.userId } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        let stripeCustomerId = (
            await prisma.subscription.findUnique({ where: { userId: req.userId } })
        )?.stripeCustomerId;

        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: { userId: req.userId! },
            });
            stripeCustomerId = customer.id;
        }

        const clientUrl = getClientUrl();

        const session = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            mode: 'subscription',
            line_items: [{ price: planId, quantity: 1 }],
            success_url: `${clientUrl}/settings/billing?success=true`,
            cancel_url: `${clientUrl}/settings/billing?canceled=true`,
            metadata: { userId: req.userId! },
        });

        res.json({ url: session.url });
    } catch (error) {
        next(error);
    }
});

// ============================================
// POST /api/v1/subscriptions/portal
// Create a Stripe Customer Portal session
// ============================================
router.post('/portal', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const stripe = await getStripe();

        if (!stripe) {
            return res.status(503).json({
                error: 'Stripe is not configured. Set the STRIPE_SECRET_KEY environment variable to enable payments.',
            });
        }

        const subscription = await prisma.subscription.findUnique({
            where: { userId: req.userId },
        });

        if (!subscription?.stripeCustomerId) {
            return res.status(400).json({ error: 'No active subscription found' });
        }

        const clientUrl = getClientUrl();

        const session = await stripe.billingPortal.sessions.create({
            customer: subscription.stripeCustomerId,
            return_url: `${clientUrl}/settings/billing`,
        });

        res.json({ url: session.url });
    } catch (error) {
        next(error);
    }
});

export { router as subscriptionRouter };
