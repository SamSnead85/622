"use strict";

/**
 * LIVE STREAM SUGGESTION SERVICE
 * External stream aggregation with community voting
 */

import {
    StreamPlatform,
    SuggestionStatus
} from '@prisma/client';
import { prisma } from '../db/client.js';

// ============================================
// STREAM URL PARSER
// ============================================

interface ParsedStream {
    platform: StreamPlatform;
    externalId: string;
    embedUrl: string;
}

export function parseStreamUrl(url: string): ParsedStream | null {
    // YouTube patterns
    const youtubePatterns = [
        /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
        /youtube\.com\/live\/([a-zA-Z0-9_-]+)/,
        /youtu\.be\/([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of youtubePatterns) {
        const match = url.match(pattern);
        if (match) {
            return {
                platform: 'YOUTUBE',
                externalId: match[1],
                embedUrl: `https://www.youtube.com/embed/${match[1]}?autoplay=1`,
            };
        }
    }

    // Twitch patterns
    const twitchChannelPattern = /twitch\.tv\/([a-zA-Z0-9_]+)/;
    const twitchMatch = url.match(twitchChannelPattern);
    if (twitchMatch) {
        return {
            platform: 'TWITCH',
            externalId: twitchMatch[1],
            embedUrl: `https://player.twitch.tv/?channel=${twitchMatch[1]}&parent=${process.env.DOMAIN || new URL(process.env.APP_URL || 'http://localhost:3000').hostname}`,
        };
    }

    // Facebook Live
    const facebookPattern = /facebook\.com\/.*\/videos\/(\d+)/;
    const fbMatch = url.match(facebookPattern);
    if (fbMatch) {
        return {
            platform: 'FACEBOOK',
            externalId: fbMatch[1],
            embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}`,
        };
    }

    return null;
}

// ============================================
// SUGGEST STREAM
// ============================================

export async function suggestStream(params: {
    url: string;
    title: string;
    description?: string;
    thumbnailUrl?: string;
    suggestedById: string;
}) {
    const parsed = parseStreamUrl(params.url);

    if (!parsed) {
        throw new Error('Unsupported stream URL. Supported: YouTube, Twitch, Facebook');
    }

    // Check for duplicate
    const existing = await prisma.liveStreamSuggestion.findFirst({
        where: {
            externalId: parsed.externalId,
            platformType: parsed.platform,
            status: { in: ['PENDING', 'APPROVED', 'LIVE'] },
        },
    });

    if (existing) {
        throw new Error('This stream has already been suggested');
    }

    return prisma.liveStreamSuggestion.create({
        data: {
            platformType: parsed.platform,
            externalId: parsed.externalId,
            embedUrl: parsed.embedUrl,
            title: params.title,
            description: params.description,
            thumbnailUrl: params.thumbnailUrl,
            suggestedById: params.suggestedById,
        },
        include: {
            suggestedBy: {
                select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                },
            },
        },
    });
}

// ============================================
// GET STREAM SUGGESTIONS
// ============================================

export async function getStreamSuggestions(options: {
    status?: SuggestionStatus;
    platform?: StreamPlatform;
    limit?: number;
    cursor?: string;
}) {
    const { status, platform, limit = 20, cursor } = options;

    const suggestions = await prisma.liveStreamSuggestion.findMany({
        where: {
            ...(status && { status }),
            ...(platform && { platformType: platform }),
        },
        orderBy: [
            { upvotes: 'desc' },
            { createdAt: 'desc' },
        ],
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        include: {
            suggestedBy: {
                select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                },
            },
            _count: {
                select: { votes: true },
            },
        },
    });

    const hasMore = suggestions.length > limit;
    const results = hasMore ? suggestions.slice(0, -1) : suggestions;

    return {
        suggestions: results.map(s => ({
            ...s,
            score: s.upvotes - s.downvotes,
            votesCount: s._count.votes,
        })),
        nextCursor: hasMore ? results[results.length - 1].id : null,
    };
}

// ============================================
// GET LIVE STREAMS (Approved/Live)
// ============================================

export async function getLiveStreams(limit: number = 10) {
    return prisma.liveStreamSuggestion.findMany({
        where: {
            status: { in: ['APPROVED', 'LIVE'] },
        },
        orderBy: [
            { status: 'desc' }, // LIVE first
            { upvotes: 'desc' },
        ],
        take: limit,
        include: {
            suggestedBy: {
                select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                },
            },
        },
    });
}

// ============================================
// VOTE ON STREAM
// ============================================

export async function voteOnStream(
    suggestionId: string,
    userId: string,
    isUpvote: boolean
) {
    const existingVote = await prisma.streamVote.findUnique({
        where: { suggestionId_userId: { suggestionId, userId } },
    });

    if (existingVote) {
        if (existingVote.isUpvote === isUpvote) {
            // Remove vote
            await prisma.streamVote.delete({ where: { id: existingVote.id } });
            await prisma.liveStreamSuggestion.update({
                where: { id: suggestionId },
                data: isUpvote
                    ? { upvotes: { decrement: 1 } }
                    : { downvotes: { decrement: 1 } },
            });
            return { voted: false };
        } else {
            // Change vote
            await prisma.streamVote.update({
                where: { id: existingVote.id },
                data: { isUpvote },
            });
            await prisma.liveStreamSuggestion.update({
                where: { id: suggestionId },
                data: isUpvote
                    ? { upvotes: { increment: 1 }, downvotes: { decrement: 1 } }
                    : { upvotes: { decrement: 1 }, downvotes: { increment: 1 } },
            });
            return { voted: true, isUpvote };
        }
    }

    // New vote
    await prisma.streamVote.create({
        data: { suggestionId, userId, isUpvote },
    });

    await prisma.liveStreamSuggestion.update({
        where: { id: suggestionId },
        data: isUpvote
            ? { upvotes: { increment: 1 } }
            : { downvotes: { increment: 1 } },
    });

    // Auto-approve if reaches threshold
    const suggestion = await prisma.liveStreamSuggestion.findUnique({
        where: { id: suggestionId },
    });

    if (suggestion && suggestion.upvotes >= 5 && suggestion.status === 'PENDING') {
        await prisma.liveStreamSuggestion.update({
            where: { id: suggestionId },
            data: { status: 'APPROVED' },
        });
    }

    return { voted: true, isUpvote };
}

// ============================================
// ADMIN: UPDATE STREAM STATUS
// ============================================

export async function updateStreamStatus(
    suggestionId: string,
    status: SuggestionStatus
) {
    return prisma.liveStreamSuggestion.update({
        where: { id: suggestionId },
        data: { status },
    });
}

// ============================================
// MARK STREAM AS ENDED
// ============================================

export async function markStreamEnded(suggestionId: string) {
    return prisma.liveStreamSuggestion.update({
        where: { id: suggestionId },
        data: { status: 'ENDED' },
    });
}

// ============================================
// GET USER'S VOTE STATUS
// ============================================

export async function getUserVotes(userId: string, suggestionIds: string[]) {
    const votes = await prisma.streamVote.findMany({
        where: {
            userId,
            suggestionId: { in: suggestionIds },
        },
    });

    return votes.reduce((acc, vote) => {
        acc[vote.suggestionId] = vote.isUpvote;
        return acc;
    }, {} as Record<string, boolean>);
}

export default {
    parseStreamUrl,
    suggestStream,
    getStreamSuggestions,
    getLiveStreams,
    voteOnStream,
    updateStreamStatus,
    markStreamEnded,
    getUserVotes,
};
