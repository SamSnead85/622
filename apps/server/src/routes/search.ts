import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../db/client.js';
import { rateLimiters } from '../middleware/rateLimit.js';

const router = Router();

// Apply general rate limiting to all search endpoints
router.use(rateLimiters.general);

import { Prisma } from '@prisma/client';

// Allowed tables for FTS — whitelist to prevent injection via table name
const FTS_TABLES = new Set(['User', 'Post', 'Community']);

// Helper: Try FTS query with fallback to LIKE
async function ftsSearch(table: string, query: string, limit: number, offset: number): Promise<any[] | null> {
    if (!FTS_TABLES.has(table)) return null;
    try {
        // Use Prisma.sql tagged template for safe parameterized queries
        const results = await prisma.$queryRaw(
            Prisma.sql`SELECT id FROM ${Prisma.raw(`"${table}"`)} WHERE search_vector @@ plainto_tsquery('english', ${query}) ORDER BY ts_rank(search_vector, plainto_tsquery('english', ${query})) DESC LIMIT ${limit} OFFSET ${offset}`
        );
        return results as any[];
    } catch {
        // FTS not available (migration not run), return null for fallback
        return null;
    }
}

// Unified search endpoint
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { q, type = 'all', page = '1', limit = '20' } = req.query;
        const query = (q as string || '').trim();

        if (!query || query.length < 2) {
            res.status(400).json({ error: 'Search query must be at least 2 characters' });
            return;
        }

        const pageNum = parseInt(page as string);
        const limitNum = Math.min(parseInt(limit as string), 50);
        const skip = (pageNum - 1) * limitNum;

        const searchType = type as string;
        const results: any = {};
        const counts: any = {};

        // Search posts (try FTS first, fallback to LIKE)
        if (searchType === 'all' || searchType === 'posts') {
            const postLimit = searchType === 'posts' ? limitNum : 5;
            const postSkip = searchType === 'posts' ? skip : 0;

            const ftsResults = await ftsSearch('Post', query, postLimit, postSkip);

            let posts, postCount;
            if (ftsResults && ftsResults.length > 0) {
                const ftsIds = ftsResults.map((r: any) => r.id);
                [posts, postCount] = await Promise.all([
                    prisma.post.findMany({
                        where: { id: { in: ftsIds }, deletedAt: null, isPublic: true },
                        include: {
                            user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
                        },
                    }),
                    prisma.post.count({
                        where: { deletedAt: null, isPublic: true, caption: { contains: query, mode: 'insensitive' } },
                    }),
                ]);
            } else {
                [posts, postCount] = await Promise.all([
                    prisma.post.findMany({
                        where: {
                            deletedAt: null,
                            isPublic: true,
                            caption: { contains: query, mode: 'insensitive' },
                        },
                        include: {
                            user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
                        },
                        orderBy: { createdAt: 'desc' },
                        take: postLimit,
                        skip: postSkip,
                    }),
                    prisma.post.count({
                        where: {
                            deletedAt: null,
                            isPublic: true,
                            caption: { contains: query, mode: 'insensitive' },
                        },
                    }),
                ]);
            }
            results.posts = posts;
            counts.posts = postCount;
        }

        // Search users
        if (searchType === 'all' || searchType === 'users') {
            const [users, userCount] = await Promise.all([
                prisma.user.findMany({
                    where: {
                        OR: [
                            { username: { contains: query, mode: 'insensitive' } },
                            { displayName: { contains: query, mode: 'insensitive' } },
                            { bio: { contains: query, mode: 'insensitive' } },
                        ],
                    },
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        bio: true,
                        isVerified: true,
                        _count: { select: { followers: true, posts: true } },
                    },
                    take: searchType === 'users' ? limitNum : 5,
                    skip: searchType === 'users' ? skip : 0,
                }),
                prisma.user.count({
                    where: {
                        OR: [
                            { username: { contains: query, mode: 'insensitive' } },
                            { displayName: { contains: query, mode: 'insensitive' } },
                        ],
                    },
                }),
            ]);
            results.users = users;
            counts.users = userCount;
        }

        // Search communities
        if (searchType === 'all' || searchType === 'communities') {
            const [communities, communityCount] = await Promise.all([
                prisma.community.findMany({
                    where: {
                        OR: [
                            { name: { contains: query, mode: 'insensitive' } },
                            { description: { contains: query, mode: 'insensitive' } },
                        ],
                    },
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        avatarUrl: true,
                        coverUrl: true,
                        _count: { select: { members: true } },
                    },
                    take: searchType === 'communities' ? limitNum : 5,
                    skip: searchType === 'communities' ? skip : 0,
                }),
                prisma.community.count({
                    where: {
                        OR: [
                            { name: { contains: query, mode: 'insensitive' } },
                            { description: { contains: query, mode: 'insensitive' } },
                        ],
                    },
                }),
            ]);
            results.communities = communities;
            counts.communities = communityCount;
        }

        // Search hashtags
        if (searchType === 'all' || searchType === 'hashtags') {
            const [hashtags, hashtagCount] = await Promise.all([
                prisma.hashtag.findMany({
                    where: { name: { contains: query, mode: 'insensitive' } },
                    orderBy: { usageCount: 'desc' },
                    take: searchType === 'hashtags' ? limitNum : 10,
                    skip: searchType === 'hashtags' ? skip : 0,
                }),
                prisma.hashtag.count({
                    where: { name: { contains: query, mode: 'insensitive' } },
                }),
            ]);
            results.hashtags = hashtags;
            counts.hashtags = hashtagCount;
        }

        res.json({
            query,
            type: searchType,
            results,
            counts,
            pagination: { page: pageNum, limit: limitNum },
        });
    } catch (error) {
        next(error);
    }
});

// Trending endpoint
router.get('/trending', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const trending = await prisma.hashtag.findMany({
            orderBy: { usageCount: 'desc' },
            take: 20,
        });

        res.json({ trending });
    } catch (error) {
        next(error);
    }
});

export default router;
