import { Queue, Worker } from 'bullmq';
import { prisma } from '../../db/client.js';
import { logger } from '../../utils/logger.js';

const QUEUE_NAME = 'scheduled-posts';

let scheduleQueue: Queue | null = null;
let scheduleWorker: Worker | null = null;

// Process scheduled posts
async function processScheduledPosts() {
    try {
        const now = new Date();

        // Find all posts due for publishing
        const duePosts = await prisma.scheduledPost.findMany({
            where: {
                status: 'PENDING',
                scheduledFor: { lte: now },
            },
            take: 50,
        });

        if (duePosts.length === 0) return;

        logger.info(`Processing ${duePosts.length} scheduled posts`);

        for (const scheduled of duePosts) {
            try {
                // Create the actual post
                await prisma.post.create({
                    data: {
                        userId: scheduled.userId,
                        type: scheduled.type,
                        caption: scheduled.caption,
                        mediaUrl: scheduled.mediaUrl,
                        thumbnailUrl: scheduled.thumbnailUrl,
                        communityId: scheduled.communityId,
                        isPublic: true,
                    },
                });

                // Mark as published
                await prisma.scheduledPost.update({
                    where: { id: scheduled.id },
                    data: { status: 'PUBLISHED' },
                });

                logger.info(`Published scheduled post ${scheduled.id}`);
            } catch (error) {
                logger.error(`Failed to publish scheduled post ${scheduled.id}:`, error);

                await prisma.scheduledPost.update({
                    where: { id: scheduled.id },
                    data: { status: 'FAILED' },
                });
            }
        }
    } catch (error) {
        logger.error('Scheduled post processing error:', error);
    }
}

export async function initScheduleWorker() {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
        // Fallback: use setInterval if no Redis
        logger.info('No Redis URL found, using interval-based schedule checker');
        setInterval(processScheduledPosts, 60000); // Check every minute
        // Run immediately on startup
        processScheduledPosts();
        return;
    }

    try {
        const connection = { url: redisUrl };

        scheduleQueue = new Queue(QUEUE_NAME, {
            connection,
            defaultJobOptions: {
                removeOnComplete: true,
                removeOnFail: 100,
            },
        });

        // Add recurring job to check every minute
        await scheduleQueue.add(
            'check-scheduled',
            {},
            {
                repeat: { every: 60000 }, // Every minute
            },
        );

        scheduleWorker = new Worker(
            QUEUE_NAME,
            async () => {
                await processScheduledPosts();
            },
            { connection },
        );

        scheduleWorker.on('failed', (job, error) => {
            logger.error(`Schedule job ${job?.id} failed:`, error);
        });

        logger.info('Schedule worker initialized with BullMQ');
    } catch (error) {
        logger.error('Failed to initialize schedule worker, falling back to interval:', error);
        setInterval(processScheduledPosts, 60000);
        processScheduledPosts();
    }
}

export async function shutdownScheduleWorker() {
    await scheduleWorker?.close();
    await scheduleQueue?.close();
}
