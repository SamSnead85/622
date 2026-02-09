import { Queue, Worker, Job } from 'bullmq';
import { prisma } from '../../db/client.js';
import { logger } from '../../utils/logger.js';
import { sendPushNotification } from './ExpoPushService.js';

// ============================================
// NOTIFICATION QUEUE SERVICE
// Uses BullMQ to async process notifications
// so they don't block API request handlers
// ============================================

interface NotificationPayload {
    userId: string;
    type: string;
    actorId?: string;
    targetId?: string;
    message: string;
}

interface BatchNotificationPayload {
    notifications: NotificationPayload[];
}

let notificationQueue: Queue | null = null;
let notificationWorker: Worker | null = null;

/**
 * Initialize the BullMQ notification queue
 * Gracefully degrades to synchronous if Redis is unavailable
 */
export function initNotificationQueue(): void {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
        logger.warn('⚠️ REDIS_URL not set. Notifications will be processed synchronously.');
        return;
    }

    try {
        const connection = {
            url: redisUrl,
            maxRetriesPerRequest: null,
        };

        // Create the queue
        notificationQueue = new Queue('notifications', {
            connection: { url: redisUrl },
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
                removeOnComplete: { count: 1000 },
                removeOnFail: { count: 5000 },
            },
        });

        // Create the worker
        notificationWorker = new Worker('notifications', async (job: Job) => {
            if (job.name === 'create-notification') {
                const payload = job.data as NotificationPayload;
                await processNotification(payload);
            } else if (job.name === 'create-batch-notifications') {
                const payload = job.data as BatchNotificationPayload;
                await processBatchNotifications(payload);
            }
        }, {
            connection: { url: redisUrl },
            concurrency: 5,
            limiter: {
                max: 100,
                duration: 1000, // 100 notifications per second max
            },
        });

        notificationWorker.on('completed', (job) => {
            logger.info(`Notification job ${job.id} completed`);
        });

        notificationWorker.on('failed', (job, err) => {
            logger.error(`Notification job ${job?.id} failed:`, err);
        });

        logger.info('✅ Notification queue initialized with BullMQ');
    } catch (error) {
        logger.error('Failed to initialize notification queue:', error);
        notificationQueue = null;
        notificationWorker = null;
    }
}

/**
 * Check if current time is within user's quiet hours
 */
async function isInQuietHours(userId: string): Promise<boolean> {
    try {
        const prefs = await prisma.notificationPreferences.findUnique({
            where: { userId },
            select: { quietHoursFrom: true, quietHoursTo: true, quietTimezone: true },
        });

        if (!prefs?.quietHoursFrom || !prefs?.quietHoursTo) return false;

        const now = new Date();
        // Simple hour comparison (timezone handling simplified)
        const currentHour = now.getUTCHours();
        const currentMinute = now.getUTCMinutes();
        const currentTime = currentHour * 60 + currentMinute;

        const [fromH, fromM] = prefs.quietHoursFrom.split(':').map(Number);
        const [toH, toM] = prefs.quietHoursTo.split(':').map(Number);
        const fromTime = fromH * 60 + fromM;
        const toTime = toH * 60 + toM;

        if (fromTime <= toTime) {
            return currentTime >= fromTime && currentTime <= toTime;
        } else {
            // Wraps midnight (e.g., 22:00 to 08:00)
            return currentTime >= fromTime || currentTime <= toTime;
        }
    } catch {
        return false;
    }
}

/**
 * Check if notification channel is enabled for user
 */
async function isChannelEnabled(userId: string, notificationType: string): Promise<boolean> {
    try {
        const prefs = await prisma.notificationPreferences.findUnique({
            where: { userId },
            select: { channels: true },
        });

        if (!prefs?.channels) return true; // Default: all enabled

        const channels = prefs.channels as Record<string, boolean>;
        const channelMap: Record<string, string> = {
            LIKE: 'social',
            COMMENT: 'social',
            FOLLOW: 'social',
            MENTION: 'social',
            MESSAGE: 'messages',
            COMMUNITY_INVITE: 'communities',
            PROPOSAL: 'communities',
            SYSTEM: 'system',
        };

        const channel = channelMap[notificationType] || 'system';
        return channels[channel] !== false; // Default to enabled
    } catch {
        return true;
    }
}

/**
 * Process a single notification with quiet hours and channel checks
 */
async function processNotification(payload: NotificationPayload): Promise<void> {
    // Check channel preferences
    const channelEnabled = await isChannelEnabled(payload.userId, payload.type);
    if (!channelEnabled) {
        logger.info(`Notification channel disabled for user ${payload.userId}, type ${payload.type}`);
        return;
    }

    // Check quiet hours (defer notification if in quiet hours)
    const inQuietHours = await isInQuietHours(payload.userId);
    if (inQuietHours) {
        logger.info(`User ${payload.userId} is in quiet hours, deferring notification`);
        // Still create the notification but don't send push
        // The notification will be visible when user opens the app
    }

    // Deduplication: Check if a similar notification was created in the last 60 seconds
    const recentDuplicate = await prisma.notification.findFirst({
        where: {
            userId: payload.userId,
            type: payload.type as any,
            actorId: payload.actorId,
            targetId: payload.targetId,
            createdAt: {
                gte: new Date(Date.now() - 60000), // Last 60 seconds
            },
        },
    });

    if (recentDuplicate) {
        logger.info(`Skipping duplicate notification for user ${payload.userId}`);
        return;
    }

    // Batch similar notifications: Check for recent similar ones to aggregate
    // e.g., "5 people liked your post" instead of 5 separate notifications
    if (payload.type === 'LIKE' && payload.targetId) {
        const recentLikes = await prisma.notification.count({
            where: {
                userId: payload.userId,
                type: 'LIKE' as any,
                targetId: payload.targetId,
                isRead: false,
                createdAt: { gte: new Date(Date.now() - 3600000) }, // Last hour
            },
        });

        if (recentLikes > 0) {
            // Update existing notification with aggregated count
            const existingNotif = await prisma.notification.findFirst({
                where: {
                    userId: payload.userId,
                    type: 'LIKE' as any,
                    targetId: payload.targetId,
                    isRead: false,
                },
                orderBy: { createdAt: 'desc' },
            });

            if (existingNotif) {
                await prisma.notification.update({
                    where: { id: existingNotif.id },
                    data: {
                        message: `${recentLikes + 1} people liked your post`,
                        createdAt: new Date(), // Bump timestamp
                    },
                });
                return;
            }
        }
    }

    const notification = await prisma.notification.create({
        data: {
            userId: payload.userId,
            type: payload.type as any,
            actorId: payload.actorId,
            targetId: payload.targetId,
            message: payload.message,
        },
    });

    // Send native push notification (non-blocking)
    if (!inQuietHours) {
        const pushTitle = getPushTitle(payload.type);
        const pushData: Record<string, any> = {
            type: payload.type,
            notificationId: notification.id,
        };
        if (payload.targetId) pushData.postId = payload.targetId;
        if (payload.actorId) pushData.actorId = payload.actorId;

        sendPushNotification(payload.userId, pushTitle, payload.message, pushData).catch((err) => {
            logger.error('Failed to send push notification:', err);
        });
    }
}

/**
 * Process a batch of notifications
 */
async function processBatchNotifications(payload: BatchNotificationPayload): Promise<void> {
    const { notifications } = payload;

    if (notifications.length === 0) return;

    // Use createMany for batch insert efficiency
    await prisma.notification.createMany({
        data: notifications.map(n => ({
            userId: n.userId,
            type: n.type as any,
            actorId: n.actorId,
            targetId: n.targetId,
            message: n.message,
        })),
        skipDuplicates: true,
    });
}

/**
 * Queue a notification for async processing
 * Falls back to synchronous creation if queue is unavailable
 */
export async function queueNotification(payload: NotificationPayload): Promise<void> {
    // Don't notify yourself
    if (payload.userId === payload.actorId) return;

    if (notificationQueue) {
        try {
            await notificationQueue.add('create-notification', payload, {
                priority: getNotificationPriority(payload.type),
            });
            return;
        } catch (error) {
            logger.error('Failed to queue notification, falling back to sync:', error);
        }
    }

    // Synchronous fallback
    await processNotification(payload);
}

/**
 * Queue a batch of notifications
 */
export async function queueBatchNotifications(notifications: NotificationPayload[]): Promise<void> {
    // Filter out self-notifications
    const filtered = notifications.filter(n => n.userId !== n.actorId);
    if (filtered.length === 0) return;

    if (notificationQueue) {
        try {
            await notificationQueue.add('create-batch-notifications', { notifications: filtered });
            return;
        } catch (error) {
            logger.error('Failed to queue batch notifications, falling back to sync:', error);
        }
    }

    // Synchronous fallback
    await processBatchNotifications({ notifications: filtered });
}

/**
 * Get push notification title based on type
 */
function getPushTitle(type: string): string {
    switch (type) {
        case 'MESSAGE': return 'New Message';
        case 'LIKE': return 'New Like';
        case 'COMMENT': return 'New Comment';
        case 'FOLLOW': return 'New Follower';
        case 'MENTION': return 'You were mentioned';
        case 'COMMUNITY_INVITE': return 'Community Invitation';
        case 'COMMUNITY_POST': return 'New Community Post';
        case 'PROPOSAL': return 'New Proposal';
        default: return '0G';
    }
}

/**
 * Get priority based on notification type (lower = higher priority)
 */
function getNotificationPriority(type: string): number {
    switch (type) {
        case 'MESSAGE': return 1;    // Highest priority
        case 'MENTION': return 2;
        case 'FOLLOW': return 3;
        case 'COMMENT': return 4;
        case 'LIKE': return 5;
        default: return 10;          // Lowest priority
    }
}

/**
 * Gracefully shut down the notification queue
 */
export async function shutdownNotificationQueue(): Promise<void> {
    if (notificationWorker) {
        await notificationWorker.close();
    }
    if (notificationQueue) {
        await notificationQueue.close();
    }
}
