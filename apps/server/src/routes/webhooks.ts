import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../db/client.js';
import { logger } from '../utils/logger.js';

const router = Router();

const stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-01-28.clover' })
    : null;

/**
 * POST /api/v1/webhooks/stripe
 * Handles Stripe webhook events for subscription lifecycle
 * 
 * IMPORTANT: This endpoint must receive the raw body for signature verification.
 * The express.json() middleware must be skipped for this route.
 */
router.post('/stripe', async (req: Request, res: Response) => {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
        logger.warn('Stripe webhook received but STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET not configured');
        return res.status(200).json({ received: true });
    }

    const sig = req.headers['stripe-signature'];
    if (!sig) {
        return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    let event: Stripe.Event;

    try {
        // req.body is a Buffer when using express.raw() middleware
        const rawBody = Buffer.isBuffer(req.body) ? req.body : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
        event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
        logger.error(`Stripe webhook signature verification failed: ${err.message}`);
        return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    logger.info(`Stripe webhook received: ${event.type}`);

    try {
        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;
                const status = subscription.status;

                // Find user by Stripe customer ID via Subscription model
                const existingSubscription = await prisma.subscription.findFirst({
                    where: { stripeCustomerId: customerId },
                    include: { user: true },
                });

                if (existingSubscription) {
                    await prisma.subscription.update({
                        where: { id: existingSubscription.id },
                        data: {
                            status: mapStripeStatus(status),
                            stripeSubscriptionId: subscription.id,
                            stripePriceId: subscription.items.data[0]?.price?.id || null,
                            currentPeriodEnd: new Date(((subscription as any).current_period_end || 0) * 1000),
                        },
                    });
                    logger.info(`Updated subscription for user ${existingSubscription.userId}: ${status}`);
                } else {
                    // Try to find user by customer ID in metadata or create subscription
                    const customer = await stripe.customers.retrieve(customerId);
                    if (customer && !customer.deleted && 'metadata' in customer && customer.metadata.userId) {
                        await prisma.subscription.upsert({
                            where: { userId: customer.metadata.userId },
                            create: {
                                userId: customer.metadata.userId,
                                stripeCustomerId: customerId,
                                stripeSubscriptionId: subscription.id,
                                stripePriceId: subscription.items.data[0]?.price?.id || null,
                                status: mapStripeStatus(status),
                                currentPeriodEnd: new Date(((subscription as any).current_period_end || 0) * 1000),
                            },
                            update: {
                                status: mapStripeStatus(status),
                                stripeSubscriptionId: subscription.id,
                                stripePriceId: subscription.items.data[0]?.price?.id || null,
                                currentPeriodEnd: new Date(((subscription as any).current_period_end || 0) * 1000),
                            },
                        });
                        logger.info(`Created/updated subscription for user ${customer.metadata.userId}: ${status}`);
                    } else {
                        logger.warn(`No subscription found for Stripe customer: ${customerId}`);
                    }
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;

                const existingSubscription = await prisma.subscription.findFirst({
                    where: { stripeCustomerId: customerId },
                });

                if (existingSubscription) {
                    await prisma.subscription.update({
                        where: { id: existingSubscription.id },
                        data: {
                            status: 'canceled',
                            currentPeriodEnd: new Date(((subscription as any).current_period_end || 0) * 1000),
                        },
                    });
                    logger.info(`Subscription cancelled for user ${existingSubscription.userId}`);
                }
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                const customerId = invoice.customer as string;

                const existingSubscription = await prisma.subscription.findFirst({
                    where: { stripeCustomerId: customerId },
                });

                if (existingSubscription) {
                    await prisma.subscription.update({
                        where: { id: existingSubscription.id },
                        data: { status: 'active' },
                    });
                    logger.info(`Payment succeeded for user ${existingSubscription.userId}`);
                }
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                const customerId = invoice.customer as string;

                const existingSubscription = await prisma.subscription.findFirst({
                    where: { stripeCustomerId: customerId },
                });

                if (existingSubscription) {
                    await prisma.subscription.update({
                        where: { id: existingSubscription.id },
                        data: { status: 'past_due' },
                    });
                    logger.warn(`Payment failed for user ${existingSubscription.userId}`);
                }
                break;
            }

            default:
                logger.info(`Unhandled Stripe event type: ${event.type}`);
        }
    } catch (error) {
        logger.error('Error processing Stripe webhook:', error);
        // Return 200 to prevent Stripe from retrying
        return res.status(200).json({ received: true, error: 'Processing error' });
    }

    res.status(200).json({ received: true });
});

function mapStripeStatus(status: string): 'active' | 'INACTIVE' | 'canceled' | 'past_due' | 'trialing' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'paused' {
    switch (status) {
        case 'active': return 'active';
        case 'past_due': return 'past_due';
        case 'canceled': return 'canceled';
        case 'unpaid': return 'unpaid';
        case 'trialing': return 'trialing';
        case 'incomplete': return 'incomplete';
        case 'incomplete_expired': return 'incomplete_expired';
        case 'paused': return 'paused';
        default: return 'INACTIVE';
    }
}

export { router as webhooksRouter };
