"use strict";

/**
 * CONTENT MODERATION SERVICE
 * Handles word filtering, explicit content detection, and content rating
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Common explicit/profane words for basic filtering
// This is a minimal set - real implementation would use more comprehensive lists
const EXPLICIT_WORDS_BASIC = [
    // Add explicit words here - keeping minimal for code review
    'explicit_word_1',
    'explicit_word_2',
];

export interface ModerationResult {
    allowed: boolean;
    flagged: boolean;
    blockedWords: string[];
    flaggedWords: string[];
    reason?: string;
}

/**
 * Get content moderation settings for a territory
 */
export async function getTerritoryModerationSettings(territoryId: string) {
    return prisma.contentModerationSettings.findUnique({
        where: { territoryId },
    });
}

/**
 * Create or update content moderation settings for a territory
 */
export async function upsertTerritoryModerationSettings(
    territoryId: string,
    settings: {
        explicitLanguageFilter?: boolean;
        explicitMaterialsFilter?: boolean;
        aiModerationEnabled?: boolean;
        aiSensitivity?: number;
        blockedWords?: string[];
        flaggedWords?: string[];
        minContentRating?: string;
        maxContentRating?: string;
    }
) {
    return prisma.contentModerationSettings.upsert({
        where: { territoryId },
        create: {
            territoryId,
            ...settings,
        },
        update: settings,
    });
}

/**
 * Check content against moderation rules
 */
export async function moderateContent(
    content: string,
    territoryId?: string
): Promise<ModerationResult> {
    const lowerContent = content.toLowerCase();
    const words = lowerContent.split(/\s+/);

    let blockedWords: string[] = [];
    let flaggedWords: string[] = [];

    // Get territory-specific settings if available
    let settings: Awaited<ReturnType<typeof getTerritoryModerationSettings>> = null;
    if (territoryId) {
        settings = await getTerritoryModerationSettings(territoryId);
    }

    // Apply explicit language filter
    if (!settings || settings.explicitLanguageFilter) {
        // Check against basic explicit words list
        for (const word of words) {
            if (EXPLICIT_WORDS_BASIC.includes(word)) {
                blockedWords.push(word);
            }
        }
    }

    // Apply custom blocked words
    if (settings?.blockedWords && settings.blockedWords.length > 0) {
        for (const blockedWord of settings.blockedWords) {
            if (lowerContent.includes(blockedWord.toLowerCase())) {
                blockedWords.push(blockedWord);
            }
        }
    }

    // Apply custom flagged words (flag but don't block)
    if (settings?.flaggedWords && settings.flaggedWords.length > 0) {
        for (const flagWord of settings.flaggedWords) {
            if (lowerContent.includes(flagWord.toLowerCase())) {
                flaggedWords.push(flagWord);
            }
        }
    }

    // Remove duplicates
    blockedWords = [...new Set(blockedWords)];
    flaggedWords = [...new Set(flaggedWords)];

    const allowed = blockedWords.length === 0;
    const flagged = flaggedWords.length > 0;

    return {
        allowed,
        flagged,
        blockedWords,
        flaggedWords,
        reason: !allowed
            ? `Content contains blocked words: ${blockedWords.join(', ')}`
            : undefined,
    };
}

/**
 * Add words to the blocked list for a territory
 */
export async function addBlockedWords(territoryId: string, words: string[]) {
    const current = await getTerritoryModerationSettings(territoryId);
    const currentWords = current?.blockedWords || [];
    const newWords = [...new Set([...currentWords, ...words])];

    return upsertTerritoryModerationSettings(territoryId, {
        blockedWords: newWords,
    });
}

/**
 * Remove words from the blocked list for a territory  
 */
export async function removeBlockedWords(territoryId: string, words: string[]) {
    const current = await getTerritoryModerationSettings(territoryId);
    const currentWords = current?.blockedWords || [];
    const newWords = currentWords.filter(w => !words.includes(w));

    return upsertTerritoryModerationSettings(territoryId, {
        blockedWords: newWords,
    });
}

/**
 * Add words to the flagged list for a territory
 */
export async function addFlaggedWords(territoryId: string, words: string[]) {
    const current = await getTerritoryModerationSettings(territoryId);
    const currentWords = current?.flaggedWords || [];
    const newWords = [...new Set([...currentWords, ...words])];

    return upsertTerritoryModerationSettings(territoryId, {
        flaggedWords: newWords,
    });
}

/**
 * Content ratings from most to least restrictive
 */
export const CONTENT_RATINGS = ['G', 'PG', 'PG13', 'R', 'NC17'] as const;
export type ContentRating = typeof CONTENT_RATINGS[number];

/**
 * Check if a content rating is allowed given min/max settings
 */
export function isRatingAllowed(
    rating: ContentRating,
    minRating: ContentRating = 'G',
    maxRating: ContentRating = 'PG13'
): boolean {
    const ratingIndex = CONTENT_RATINGS.indexOf(rating);
    const minIndex = CONTENT_RATINGS.indexOf(minRating);
    const maxIndex = CONTENT_RATINGS.indexOf(maxRating);

    return ratingIndex >= minIndex && ratingIndex <= maxIndex;
}

export default {
    getTerritoryModerationSettings,
    upsertTerritoryModerationSettings,
    moderateContent,
    addBlockedWords,
    removeBlockedWords,
    addFlaggedWords,
    isRatingAllowed,
    CONTENT_RATINGS,
};
