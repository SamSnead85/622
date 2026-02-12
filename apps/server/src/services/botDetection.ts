/**
 * BOT DETECTION SERVICE
 * Behavioral analysis to detect bot accounts based on action patterns.
 *
 * Signals:
 * - Signup-to-post velocity (posting within 60s of account creation)
 * - Content similarity (identical content from multiple accounts)
 * - Action regularity (perfectly timed actions = bot)
 * - Follow/unfollow churn
 * - No reading behavior (only posts, never scrolls)
 *
 * Bot Score: 0-100
 *   0-30  = Normal
 *   31-60 = Soft flag (content queued)
 *   61-80 = Hard flag (restricted + admin notified)
 *   81-100 = Auto-shadow-ban
 */

import crypto from 'crypto';
import { cache } from './cache/RedisCache.js';
import { logger } from '../utils/logger.js';

// ============================================
// ACTION TRACKING
// ============================================

export type ActionType = 'post' | 'comment' | 'like' | 'follow' | 'unfollow' | 'message' | 'view' | 'scroll' | 'search';

interface TrackedAction {
    type: ActionType;
    timestamp: number;
    metadata?: Record<string, string>;
}

/**
 * Track a user action for behavioral analysis.
 * Stores last 100 actions per user in Redis with 24h TTL.
 */
export async function trackAction(userId: string, actionType: ActionType, metadata?: Record<string, string>): Promise<void> {
    try {
        const key = `bot:actions:${userId}`;
        const actions = await cache.get<TrackedAction[]>(key) || [];

        actions.push({
            type: actionType,
            timestamp: Date.now(),
            metadata,
        });

        // Keep last 100 actions
        const trimmed = actions.slice(-100);
        await cache.set(key, trimmed, 86400); // 24 hour TTL
    } catch {
        // Redis unavailable — silently skip
    }
}

/**
 * Calculate a bot score (0-100) based on behavioral patterns.
 */
export async function getBotScore(userId: string): Promise<{
    score: number;
    signals: string[];
}> {
    const signals: string[] = [];
    let score = 0;

    try {
        const key = `bot:actions:${userId}`;
        const actions = await cache.get<TrackedAction[]>(key) || [];

        if (actions.length < 3) {
            // Not enough data to analyze
            return { score: 0, signals: [] };
        }

        // Signal 1: Action regularity (perfectly timed actions)
        const intervals = getActionIntervals(actions);
        if (intervals.length >= 5) {
            const stdDev = standardDeviation(intervals);
            const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            // Coefficient of variation < 0.1 means very regular timing (bot-like)
            if (mean > 0 && stdDev / mean < 0.1) {
                signals.push('Suspiciously regular action timing');
                score += 30;
            } else if (mean > 0 && stdDev / mean < 0.2) {
                signals.push('Somewhat regular action timing');
                score += 15;
            }
        }

        // Signal 2: No passive behavior (only active actions, no views/scrolls)
        const passiveActions = actions.filter(a => a.type === 'view' || a.type === 'scroll' || a.type === 'search');
        const activeActions = actions.filter(a => a.type !== 'view' && a.type !== 'scroll' && a.type !== 'search');
        if (activeActions.length > 10 && passiveActions.length === 0) {
            signals.push('No passive browsing behavior detected');
            score += 25;
        }

        // Signal 3: Follow/unfollow churn
        const follows = actions.filter(a => a.type === 'follow');
        const unfollows = actions.filter(a => a.type === 'unfollow');
        if (follows.length > 5 && unfollows.length > 3 && unfollows.length / follows.length > 0.5) {
            signals.push('High follow/unfollow churn ratio');
            score += 20;
        }

        // Signal 4: Rapid posting (more than 5 posts in 10 minutes)
        const posts = actions.filter(a => a.type === 'post');
        if (posts.length >= 5) {
            const recentPosts = posts.filter(a => Date.now() - a.timestamp < 600000); // 10 min
            if (recentPosts.length >= 5) {
                signals.push('Rapid posting: 5+ posts in 10 minutes');
                score += 25;
            }
        }

        // Signal 5: Signup-to-first-action velocity
        if (actions.length > 0) {
            const firstAction = actions[0];
            const accountKey = `bot:signup_time:${userId}`;
            const signupTime = await cache.get<number>(accountKey);
            if (signupTime && firstAction.type === 'post') {
                const velocity = firstAction.timestamp - signupTime;
                if (velocity < 60000) { // First post within 60 seconds
                    signals.push('Posted within 60 seconds of account creation');
                    score += 30;
                }
            }
        }

    } catch {
        // Redis unavailable
    }

    // Cap at 100
    score = Math.min(score, 100);

    if (score > 30) {
        logger.warn(`[BotDetection] User ${userId} scored ${score}: ${signals.join('; ')}`);
    }

    return { score, signals };
}

/**
 * Check if content is similar to recently posted content (coordinated attack detection).
 * Uses a simple content hash to detect exact or near-exact duplicates.
 */
export async function checkContentSimilarity(content: string): Promise<{
    isDuplicate: boolean;
    matchCount: number;
}> {
    if (!content || content.length < 10) {
        return { isDuplicate: false, matchCount: 0 };
    }

    try {
        // Normalize content: lowercase, strip whitespace, remove punctuation
        const normalized = content.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
        const hash = crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);

        const key = `bot:content_hash:${hash}`;
        const count = await cache.increment(key, 3600); // 1 hour window

        if (count > 3) {
            logger.warn(`[BotDetection] Content hash ${hash} posted ${count} times in 1 hour (coordinated attack?)`);
            return { isDuplicate: true, matchCount: count };
        }

        return { isDuplicate: false, matchCount: count };
    } catch {
        return { isDuplicate: false, matchCount: 0 };
    }
}

/**
 * Record signup time for velocity analysis
 */
export async function recordSignupTime(userId: string): Promise<void> {
    try {
        await cache.set(`bot:signup_time:${userId}`, Date.now(), 86400); // 24h
    } catch {
        // Redis unavailable
    }
}

// ============================================
// HELPERS
// ============================================

function getActionIntervals(actions: TrackedAction[]): number[] {
    const intervals: number[] = [];
    for (let i = 1; i < actions.length; i++) {
        intervals.push(actions[i].timestamp - actions[i - 1].timestamp);
    }
    return intervals;
}

function standardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

export default {
    trackAction,
    getBotScore,
    checkContentSimilarity,
    recordSignupTime,
};
