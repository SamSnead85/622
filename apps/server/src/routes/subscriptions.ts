
import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ============================================
// GET /api/v1/subscriptions
// Get current user's subscription status
// ============================================
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const subscription = await prisma.subscription.findUnique({
            where: { userId: req.userId }
        });

        // Mock plans
        const plans = [
            { id: 'price_monthly', name: 'Pro Monthly', price: 999, currency: 'usd' },
            { id: 'price_yearly', name: 'Pro Yearly', price: 9900, currency: 'usd' }
        ];

        res.json({
            subscription: subscription || null,
            availablePlans: plans,
            isSubscribed: subscription?.status === 'active'
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// POST /api/v1/subscriptions/checkout
// Create a checkout session (Mock)
// ============================================
router.post('/checkout', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { planId } = req.body;

        // In a real app, we would:
        // 1. Create/Get Stripe Customer
        // 2. Create Stripe Checkout Session
        // 3. Return session.url

        if (!process.env.STRIPE_SECRET_KEY) {
            // Mock success for demo purposes without keys
            // Use "upsert" to simulate subscribing
            await prisma.subscription.upsert({
                where: { userId: req.userId },
                update: {
                    status: 'active',
                    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                    stripePriceId: planId
                },
                create: {
                    userId: req.userId!,
                    status: 'active',
                    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    stripePriceId: planId
                }
            });

            return res.json({
                url: `${process.env.CLIENT_URL || process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000'}/settings/billing?success=true`
            });
        }

        // Real Impl would go here...
        res.status(501).json({ error: 'Stripe not configured' });

    } catch (error) {
        next(error);
    }
});

// ============================================
// POST /api/v1/subscriptions/portal
// Create customer portal session (Mock)
// ============================================
router.post('/portal', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!process.env.STRIPE_SECRET_KEY) {
        return res.json({
            url: `${process.env.CLIENT_URL || process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000'}/settings/billing`
        });
    }
    res.status(501).json({ error: 'Stripe not configured' });
});

export { router as subscriptionRouter };
