/**
 * Content Moderation Utilities
 * Basic profanity filter and content safety checks
 */

// ============================================
// PROFANITY FILTER
// ============================================

// Basic list - in production, use a comprehensive library
const profanityList = new Set([
    // Add entries as needed - keeping this minimal for the example
    'spam', 'scam', 'fake',
]);

// Patterns that indicate spam
const spamPatterns = [
    /buy now/i,
    /click here/i,
    /free money/i,
    /\b100% free\b/i,
    /make \$\d+ fast/i,
    /https?:\/\/[^\s]+\.(xyz|tk|ml)/i, // Suspicious TLDs
];

/**
 * Check if text contains profanity
 */
export function containsProfanity(text: string): boolean {
    const words = text.toLowerCase().split(/\s+/);
    return words.some(word => profanityList.has(word));
}

/**
 * Filter profanity from text, replacing with asterisks
 */
export function filterProfanity(text: string): string {
    let filtered = text;
    for (const word of profanityList) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        filtered = filtered.replace(regex, '*'.repeat(word.length));
    }
    return filtered;
}

// ============================================
// SPAM DETECTION
// ============================================

/**
 * Check if text looks like spam
 */
export function isLikelySpam(text: string): { isSpam: boolean; reasons: string[] } {
    const reasons: string[] = [];

    // Check spam patterns
    for (const pattern of spamPatterns) {
        if (pattern.test(text)) {
            reasons.push(`Matches spam pattern: ${pattern.source}`);
        }
    }

    // Check for excessive caps
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.5 && text.length > 10) {
        reasons.push('Excessive capital letters');
    }

    // Check for excessive repeated characters
    if (/(.)\1{4,}/.test(text)) {
        reasons.push('Excessive repeated characters');
    }

    // Check for too many URLs
    const urlCount = (text.match(/https?:\/\//g) || []).length;
    if (urlCount > 3) {
        reasons.push('Too many URLs');
    }

    // Check for suspicious URL shorteners
    const shorteners = ['bit.ly', 'tinyurl', 'goo.gl', 't.co'];
    for (const shortener of shorteners) {
        if (text.toLowerCase().includes(shortener)) {
            reasons.push(`Contains URL shortener: ${shortener}`);
        }
    }

    return {
        isSpam: reasons.length > 0,
        reasons,
    };
}

// ============================================
// CONTENT SAFETY
// ============================================

interface ContentCheckResult {
    isSafe: boolean;
    flags: string[];
    filteredContent?: string;
}

/**
 * Comprehensive content check
 */
export function checkContent(text: string): ContentCheckResult {
    const flags: string[] = [];

    // Check profanity
    if (containsProfanity(text)) {
        flags.push('contains_profanity');
    }

    // Check spam
    const spamCheck = isLikelySpam(text);
    if (spamCheck.isSpam) {
        flags.push('likely_spam');
    }

    // Check length
    if (text.length < 2) {
        flags.push('too_short');
    }
    if (text.length > 10000) {
        flags.push('too_long');
    }

    // Filter content if needed
    const filteredContent = flags.includes('contains_profanity')
        ? filterProfanity(text)
        : undefined;

    return {
        isSafe: flags.length === 0,
        flags,
        filteredContent,
    };
}

// ============================================
// USER BEHAVIOR TRACKING
// ============================================

interface UserBehavior {
    userId: string;
    postCount: number;
    flaggedCount: number;
    lastPost: number;
    warnings: number;
}

const userBehaviors = new Map<string, UserBehavior>();

/**
 * Track user posting behavior for rate limiting and abuse detection
 */
export function trackPost(userId: string, wasFlagged: boolean): {
    allowed: boolean;
    reason?: string;
} {
    const now = Date.now();
    let behavior = userBehaviors.get(userId);

    if (!behavior) {
        behavior = {
            userId,
            postCount: 0,
            flaggedCount: 0,
            lastPost: 0,
            warnings: 0,
        };
        userBehaviors.set(userId, behavior);
    }

    // Reset counts after 24 hours
    const hoursSinceReset = (now - behavior.lastPost) / 3600000;
    if (hoursSinceReset > 24) {
        behavior.postCount = 0;
        behavior.flaggedCount = 0;
    }

    // Update behavior
    behavior.postCount++;
    behavior.lastPost = now;
    if (wasFlagged) {
        behavior.flaggedCount++;
        behavior.warnings++;
    }

    // Check limits
    if (behavior.flaggedCount > 5) {
        return { allowed: false, reason: 'Too many flagged posts' };
    }
    if (behavior.postCount > 100) {
        return { allowed: false, reason: 'Daily post limit reached' };
    }
    if (behavior.warnings > 10) {
        return { allowed: false, reason: 'Account suspended for repeated violations' };
    }

    // Check rate limiting (min 30 seconds between posts)
    const timeSinceLastPost = now - behavior.lastPost;
    if (timeSinceLastPost < 30000 && behavior.postCount > 1) {
        return { allowed: false, reason: 'Posting too quickly' };
    }

    return { allowed: true };
}

/**
 * Get user's moderation status
 */
export function getUserModerationStatus(userId: string): {
    status: 'good' | 'warning' | 'restricted';
    warnings: number;
    flaggedPosts: number;
} {
    const behavior = userBehaviors.get(userId);

    if (!behavior) {
        return { status: 'good', warnings: 0, flaggedPosts: 0 };
    }

    let status: 'good' | 'warning' | 'restricted' = 'good';
    if (behavior.warnings > 3) status = 'warning';
    if (behavior.warnings > 7) status = 'restricted';

    return {
        status,
        warnings: behavior.warnings,
        flaggedPosts: behavior.flaggedCount,
    };
}

// ============================================
// EXPORTS
// ============================================

export default {
    containsProfanity,
    filterProfanity,
    isLikelySpam,
    checkContent,
    trackPost,
    getUserModerationStatus,
};
