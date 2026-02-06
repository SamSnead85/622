import { Queue, Worker, Job } from 'bullmq';
import { prisma } from '../../db/client.js';
import { logger } from '../../utils/logger.js';

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
 * Process a single notification
 */
async function processNotification(payload: NotificationPayload): Promise<void> {
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

    await prisma.notification.create({
        data: {
            userId: payload.userId,
            type: payload.type as any,
            actorId: payload.actorId,
            targetId: payload.targetId,
            message: payload.message,
        },
    });
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
