import { Queue, Worker } from 'bullmq';
import { prisma } from '../../db/client.js';
import { logger } from '../../utils/logger.js';

const QUEUE_NAME = 'growth-qualification';
const REWARD_DIRECT = 5; // $5 per qualified direct referral
const REWARD_SECOND_LEVEL = 1; // $1 per qualified second-level referral
const QUALIFICATION_DAYS = 7;

let qualificationQueue: Queue | null = null;
let qualificationWorker: Worker | null = null;

/**
 * Daily job: check all pending GrowthReferrals, update daysActive,
 * auto-qualify at 7 days, flag suspicious patterns.
 */
async function processGrowthQualification() {
    try {
        const pendingReferrals = await prisma.growthReferral.findMany({
            where: { status: 'pending' },
            include: {
                growthPartner: true,
            },
        });

        if (pendingReferrals.length === 0) return;

        logger.info(`[GrowthQualification] Processing ${pendingReferrals.length} pending referrals`);

        const now = new Date();
        const recentThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000); // Active within 48h

        for (const referral of pendingReferrals) {
            try {
                // Fetch the referred user's activity
                const referredUser = await prisma.user.findUnique({
                    where: { id: referral.referredUserId },
                    select: {
                        id: true,
                        lastActiveAt: true,
                        email: true,
                        createdAt: true,
                    },
                });

                if (!referredUser) {
                    // User was deleted — mark inactive
                    await prisma.growthReferral.update({
                        where: { id: referral.id },
                        data: { status: 'inactive', flagReason: 'user_deleted' },
                    });
                    continue;
                }

                // --- Fraud detection ---
                const flagReasons: string[] = [];

                // 1. Disposable email check
                const disposableDomains = [
                    'tempmail.com', 'throwaway.email', 'guerrillamail.com',
                    'mailinator.com', 'yopmail.com', 'sharklasers.com',
                    'trashmail.com', '10minutemail.com', 'fakeinbox.com',
                ];
                const emailDomain = referredUser.email.split('@')[1]?.toLowerCase();
                if (emailDomain && disposableDomains.includes(emailDomain)) {
                    flagReasons.push('disposable_email');
                }

                // 2. Suspicious timing: account created and last active at nearly the same time
                //    with very little actual activity (could be bot/fake signup)
                const timeSinceCreation = now.getTime() - new Date(referredUser.createdAt).getTime();
                const daysSinceCreation = timeSinceCreation / (24 * 60 * 60 * 1000);
                if (daysSinceCreation > 3 && referral.daysActive === 0) {
                    flagReasons.push('superficial_engagement');
                }

                // 3. Check for IP duplicates: same partner has multiple referrals from similar patterns
                //    (simplified — check if multiple referrals were created in same minute)
                const sameMinuteReferrals = await prisma.growthReferral.count({
                    where: {
                        growthPartnerId: referral.growthPartnerId,
                        id: { not: referral.id },
                        invitedAt: {
                            gte: new Date(new Date(referral.invitedAt).getTime() - 60000),
                            lte: new Date(new Date(referral.invitedAt).getTime() + 60000),
                        },
                    },
                });
                if (sameMinuteReferrals >= 3) {
                    flagReasons.push('suspicious_timing');
                }

                // If suspicious, flag and skip
                if (flagReasons.length > 0) {
                    await prisma.growthReferral.update({
                        where: { id: referral.id },
                        data: { status: 'flagged', flagReason: flagReasons.join(', ') },
                    });
                    logger.warn(`[GrowthQualification] Flagged referral ${referral.id}: ${flagReasons.join(', ')}`);
                    continue;
                }

                // --- Activity tracking ---
                const wasRecentlyActive = new Date(referredUser.lastActiveAt) >= recentThreshold;
                const newDaysActive = wasRecentlyActive
                    ? referral.daysActive + 1
                    : referral.daysActive;

                // --- Auto-qualify at 7 days ---
                if (newDaysActive >= QUALIFICATION_DAYS) {
                    const rewardAmount = referral.referralLevel === 'direct'
                        ? REWARD_DIRECT
                        : REWARD_SECOND_LEVEL;

                    await prisma.$transaction([
                        prisma.growthReferral.update({
                            where: { id: referral.id },
                            data: {
                                status: 'qualified',
                                qualifiedAt: now,
                                daysActive: newDaysActive,
                                lastActiveAt: referredUser.lastActiveAt,
                                rewardAmount,
                            },
                        }),
                        prisma.earning.create({
                            data: {
                                growthPartnerId: referral.growthPartnerId,
                                referralId: referral.id,
                                type: referral.referralLevel === 'direct'
                                    ? 'direct_referral'
                                    : 'second_level_referral',
                                amount: rewardAmount,
                                status: 'approved',
                                approvedAt: now,
                                note: `Auto-qualified after ${newDaysActive} active days`,
                            },
                        }),
                        prisma.growthPartner.update({
                            where: { id: referral.growthPartnerId },
                            data: {
                                totalEarned: { increment: rewardAmount },
                                pendingPayout: { increment: rewardAmount },
                                ...(referral.referralLevel === 'direct'
                                    ? { directReferralsQualified: { increment: 1 } }
                                    : { secondLevelReferralsQualified: { increment: 1 } }),
                            },
                        }),
                    ]);

                    logger.info(`[GrowthQualification] Qualified referral ${referral.id} — $${rewardAmount} earned`);
                } else {
                    // Just update daysActive
                    await prisma.growthReferral.update({
                        where: { id: referral.id },
                        data: {
                            daysActive: newDaysActive,
                            lastActiveAt: referredUser.lastActiveAt,
                        },
                    });
                }
            } catch (error) {
                logger.error(`[GrowthQualification] Error processing referral ${referral.id}:`, error);
            }
        }

        logger.info('[GrowthQualification] Daily processing complete');
    } catch (error) {
        logger.error('[GrowthQualification] Worker error:', error);
    }
}

export async function initGrowthQualificationWorker() {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
        // Fallback: use setInterval if no Redis — run daily (every 24h)
        logger.info('[GrowthQualification] No Redis URL, using interval-based daily checker');
        setInterval(processGrowthQualification, 24 * 60 * 60 * 1000);
        // Run on startup after a short delay
        setTimeout(processGrowthQualification, 10000);
        return;
    }

    try {
        const connection = { url: redisUrl };

        qualificationQueue = new Queue(QUEUE_NAME, {
            connection,
            defaultJobOptions: {
                removeOnComplete: true,
                removeOnFail: 100,
            },
        });

        // Add recurring job: run daily at midnight UTC
        await qualificationQueue.add(
            'daily-qualification',
            {},
            {
                repeat: { every: 24 * 60 * 60 * 1000 }, // Every 24 hours
            },
        );

        qualificationWorker = new Worker(
            QUEUE_NAME,
            async () => {
                await processGrowthQualification();
            },
            { connection },
        );

        qualificationWorker.on('failed', (job, error) => {
            logger.error(`[GrowthQualification] Job ${job?.id} failed:`, error);
        });

        logger.info('[GrowthQualification] Worker initialized with BullMQ');
    } catch (error) {
        logger.error('[GrowthQualification] Failed to initialize, falling back to interval:', error);
        setInterval(processGrowthQualification, 24 * 60 * 60 * 1000);
        setTimeout(processGrowthQualification, 10000);
    }
}

export async function shutdownGrowthQualificationWorker() {
    await qualificationWorker?.close();
    await qualificationQueue?.close();
}
