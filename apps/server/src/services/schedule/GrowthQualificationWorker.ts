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

        // --- Batch-load all referred users in ONE query (eliminates N+1) ---
        const referredUserIds = [...new Set(pendingReferrals.map(r => r.referredUserId))];
        const referredUsers = await prisma.user.findMany({
            where: { id: { in: referredUserIds } },
            select: { id: true, lastActiveAt: true, email: true, createdAt: true },
        });
        const userMap = new Map(referredUsers.map(u => [u.id, u]));

        // --- Batch-load suspicious-timing counts per partner (eliminates N queries) ---
        // Group referrals by partner to check for burst patterns
        const partnerIds = [...new Set(pendingReferrals.map(r => r.growthPartnerId))];
        const allPartnerReferrals = await prisma.growthReferral.findMany({
            where: { growthPartnerId: { in: partnerIds } },
            select: { id: true, growthPartnerId: true, invitedAt: true },
        });
        // Build a lookup: for each referral, count how many sibling referrals were created within ±60s
        const siblingCounts = new Map<string, number>();
        for (const ref of allPartnerReferrals) {
            const refTime = new Date(ref.invitedAt).getTime();
            const siblings = allPartnerReferrals.filter(r =>
                r.growthPartnerId === ref.growthPartnerId &&
                r.id !== ref.id &&
                Math.abs(new Date(r.invitedAt).getTime() - refTime) <= 60000
            );
            siblingCounts.set(ref.id, siblings.length);
        }

        // --- Process each referral (now using in-memory lookups, not individual queries) ---
        for (const referral of pendingReferrals) {
            try {
                const referredUser = userMap.get(referral.referredUserId);

                if (!referredUser) {
                    await prisma.growthReferral.update({
                        where: { id: referral.id },
                        data: { status: 'inactive', flagReason: 'user_deleted' },
                    });
                    continue;
                }

                // --- Fraud detection (all in-memory, no DB queries) ---
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

                // 2. Superficial engagement: account old but no activity
                const timeSinceCreation = now.getTime() - new Date(referredUser.createdAt).getTime();
                const daysSinceCreation = timeSinceCreation / (24 * 60 * 60 * 1000);
                if (daysSinceCreation > 3 && referral.daysActive === 0) {
                    flagReasons.push('superficial_engagement');
                }

                // 3. Suspicious timing: multiple referrals from same partner in same minute
                if ((siblingCounts.get(referral.id) || 0) >= 3) {
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
