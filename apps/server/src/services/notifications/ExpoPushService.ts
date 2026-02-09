// ============================================
// EXPO PUSH NOTIFICATION SERVICE
// Sends native push notifications to mobile
// devices via Expo Push Notification service
// ============================================

import { prisma } from '../../db/client.js';
import { logger } from '../../utils/logger.js';

// ============================================
// Types
// ============================================

interface ExpoPushMessage {
    to: string;
    title?: string;
    body: string;
    data?: Record<string, any>;
    sound?: 'default' | null;
    badge?: number;
    priority?: 'default' | 'normal' | 'high';
    channelId?: string;
    categoryId?: string;
}

interface ExpoPushTicket {
    status: 'ok' | 'error';
    id?: string;
    message?: string;
    details?: Record<string, any>;
}

// ============================================
// Constants
// ============================================

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const MAX_BATCH_SIZE = 100;

// ============================================
// Token Storage
// ============================================

/**
 * Register an Expo push token for a user
 */
export async function registerExpoPushToken(
    userId: string,
    token: string,
    platform: 'ios' | 'android'
): Promise<void> {
    try {
        // Use PushSubscription model - store Expo token in endpoint field
        // Check if this token already exists
        const existing = await prisma.pushSubscription.findFirst({
            where: {
                userId,
                endpoint: token,
            },
        });

        if (existing) {
            // Token already registered
            return;
        }

        // Remove old tokens for this user on same platform
        // (keeping the model compatible with web push subscriptions)
        await prisma.pushSubscription.deleteMany({
            where: {
                userId,
                auth: platform, // Store platform in auth field
                p256dh: 'expo', // Mark as expo push token
            },
        });

        // Create new token registration
        await prisma.pushSubscription.create({
            data: {
                userId,
                endpoint: token,
                p256dh: 'expo', // Mark as expo push token
                auth: platform, // Store platform in auth field
            },
        });

        logger.info(`Registered Expo push token for user ${userId} (${platform})`);
    } catch (error) {
        logger.error('Failed to register Expo push token:', error);
        throw error;
    }
}

/**
 * Remove a push token
 */
export async function removeExpoPushToken(userId: string, token: string): Promise<void> {
    try {
        await prisma.pushSubscription.deleteMany({
            where: {
                userId,
                endpoint: token,
            },
        });
    } catch (error) {
        logger.error('Failed to remove Expo push token:', error);
    }
}

/**
 * Get all Expo push tokens for a user
 */
async function getUserExpoPushTokens(userId: string): Promise<string[]> {
    const subscriptions = await prisma.pushSubscription.findMany({
        where: {
            userId,
            p256dh: 'expo', // Only expo tokens
        },
        select: {
            endpoint: true,
        },
    });

    return subscriptions
        .map((s) => s.endpoint)
        .filter((token) => token.startsWith('ExponentPushToken['));
}

// ============================================
// Send Push Notifications
// ============================================

/**
 * Send a push notification to a specific user
 */
export async function sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
    options?: {
        sound?: 'default' | null;
        badge?: number;
        priority?: 'default' | 'normal' | 'high';
        channelId?: string;
    }
): Promise<void> {
    try {
        // Check if user has push enabled
        const prefs = await prisma.notificationPreferences.findUnique({
            where: { userId },
            select: { pushEnabled: true },
        });

        if (prefs && !prefs.pushEnabled) {
            logger.info(`Push disabled for user ${userId}, skipping`);
            return;
        }

        const tokens = await getUserExpoPushTokens(userId);
        if (tokens.length === 0) {
            return; // No tokens registered
        }

        const messages: ExpoPushMessage[] = tokens.map((token) => ({
            to: token,
            title,
            body,
            data,
            sound: options?.sound ?? 'default',
            badge: options?.badge,
            priority: options?.priority ?? 'high',
            channelId: options?.channelId ?? 'default',
        }));

        await sendExpoPushBatch(messages);
    } catch (error) {
        logger.error(`Failed to send push to user ${userId}:`, error);
    }
}

/**
 * Send push notifications to multiple users
 */
export async function sendBatchPushNotifications(
    notifications: Array<{
        userId: string;
        title: string;
        body: string;
        data?: Record<string, any>;
    }>
): Promise<void> {
    const allMessages: ExpoPushMessage[] = [];

    for (const notif of notifications) {
        const tokens = await getUserExpoPushTokens(notif.userId);
        for (const token of tokens) {
            allMessages.push({
                to: token,
                title: notif.title,
                body: notif.body,
                data: notif.data,
                sound: 'default',
                priority: 'high',
            });
        }
    }

    if (allMessages.length > 0) {
        await sendExpoPushBatch(allMessages);
    }
}

/**
 * Send a batch of messages to Expo Push API
 */
async function sendExpoPushBatch(messages: ExpoPushMessage[]): Promise<void> {
    // Split into batches of MAX_BATCH_SIZE
    for (let i = 0; i < messages.length; i += MAX_BATCH_SIZE) {
        const batch = messages.slice(i, i + MAX_BATCH_SIZE);

        try {
            const response = await fetch(EXPO_PUSH_URL, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(batch),
            });

            if (!response.ok) {
                logger.error(`Expo Push API error: ${response.status} ${response.statusText}`);
                continue;
            }

            const result = await response.json();
            const tickets: ExpoPushTicket[] = result.data || [];

            // Handle failed tickets
            tickets.forEach((ticket, idx) => {
                if (ticket.status === 'error') {
                    logger.warn(`Push notification failed for ${batch[idx].to}: ${ticket.message}`);

                    // Remove invalid tokens
                    if (ticket.details?.error === 'DeviceNotRegistered') {
                        // Token is no longer valid — remove it
                        prisma.pushSubscription.deleteMany({
                            where: { endpoint: batch[idx].to },
                        }).catch((e) => logger.error('Failed to remove invalid token:', e));
                    }
                }
            });

            logger.info(`Sent ${batch.length} push notifications, ${tickets.filter(t => t.status === 'ok').length} succeeded`);
        } catch (error) {
            logger.error('Expo Push batch send failed:', error);
        }
    }
}
