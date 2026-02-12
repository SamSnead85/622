import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { cache } from '../services/cache/RedisCache.js';
import { queueNotification } from '../services/notifications/NotificationQueue.js';
import { logger } from '../utils/logger.js';
import { getFeedImageUrls, transformImageUrl, getVideoThumbnailUrl } from '../services/cloudinary.js';

const router = Router();

// Helper: clamp limit to prevent unbounded queries
function clampLimit(raw: string | undefined, defaultVal = 20, max = 100): number {
    const parsed = parseInt(raw || String(defaultVal));
    return Math.min(Math.max(1, isNaN(parsed) ? defaultVal : parsed), max);
}

// GET /api/v1/posts - List all public posts (no auth required)
router.get('/', optionalAuth, async (req: AuthRequest, res, next) => {
    try {
        const { cursor, limit: rawLimit } = req.query;
        const limit = clampLimit(rawLimit as string, 20, 50);

        const posts = await prisma.post.findMany({
            where: { isPublic: true, deletedAt: null },
            take: limit + 1,
            ...(cursor && { cursor: { id: cursor as string }, skip: 1 }),
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        isVerified: true,
                    },
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true,
                    },
                },
            },
        });

        const hasMore = posts.length > limit;
        const results = hasMore ? posts.slice(0, -1) : posts;

        res.json({
            posts: results.map((post) => ({
                ...post,
                likesCount: post._count.likes,
                commentsCount: post._count.comments,
            })),
            nextCursor: hasMore ? results[results.length - 1]?.id : null,
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/posts/feed
router.get('/feed', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { cursor, limit: rawFeedLimit, type = 'foryou', view } = req.query;
        const limit = clampLimit(rawFeedLimit as string, 10, 50);

        // ── Privacy-First Feed Isolation ──
        // Determine which feed view the user is requesting.
        // "private" = only posts from groups/communities user belongs to + people they follow.
        // "community" = the broader public feed (only available if communityOptIn is true).
        const currentUser = await prisma.user.findUnique({
            where: { id: req.userId },
            select: { communityOptIn: true, activeFeedView: true },
        });
        const feedView = (view as string) || currentUser?.activeFeedView || 'private';

        // Block community feed access for users who haven't opted in
        if (feedView === 'community' && !currentUser?.communityOptIn) {
            return res.json({
                posts: [],
                nextCursor: null,
                feedView: 'private',
                communityOptIn: false,
                message: 'Join the community to see the community feed',
            });
        }

        // Create cache key based on user, pagination, type, AND view
        const cacheKey = `feed:${req.userId}:${feedView}:${type}:${cursor || 'initial'}:${limit}`;

        // Try cache first — all pages are now cached (5-min TTL)
        const cached = await cache.get(cacheKey);
        if (cached) {
            return res.json({ ...cached, feedView });
        }

        // Check if user is a "new user" (has no follows)
        const followCount = await prisma.follow.count({
            where: { followerId: req.userId },
        });
        const isNewUser = followCount === 0;

        // Fetch real posts from database
        // Community feed default: only show posts from users who opted into the community
        let whereClause: any = {
            isPublic: true,
            deletedAt: null,
            user: { communityOptIn: true }, // Privacy wall: only community members' posts
        };

        if (feedView === 'private') {
            // ── PRIVATE FEED: Only groups + followed users ──
            // Parallelize: fetch memberships and following concurrently
            const [memberships, following] = await Promise.all([
                prisma.communityMember.findMany({
                    where: { userId: req.userId!, isBanned: false },
                    select: { communityId: true },
                }),
                prisma.follow.findMany({
                    where: { followerId: req.userId },
                    select: { followingId: true },
                }),
            ]);
            const communityIds = memberships.map((m) => m.communityId);
            const followingIds = following.map((f) => f.followingId);

            // Combine: posts from my communities + posts from people I follow + my own posts
            whereClause = {
                deletedAt: null,
                OR: [
                    // Posts in communities I belong to
                    ...(communityIds.length > 0 ? [{ communityId: { in: communityIds } }] : []),
                    // Posts from people I follow (non-community posts)
                    ...(followingIds.length > 0 ? [{ userId: { in: followingIds }, communityId: null }] : []),
                    // My own posts
                    { userId: req.userId },
                ],
            };
        } else if (type === 'following') {
            // ── COMMUNITY FEED — Following tab ──
            // Get posts from users the current user follows (public posts only)
            let following;
            try {
                following = await prisma.follow.findMany({
                    where: { followerId: req.userId },
                    select: { followingId: true },
                });
            } catch (dbError) {
                logger.error('Database error fetching following:', dbError);
                throw new AppError('Failed to load feed', 503);
            }

            if (following.length === 0) {
                whereClause = { isPublic: true, deletedAt: null };
            } else {
                whereClause = {
                    isPublic: true,
                    deletedAt: null,
                    userId: { in: following.map((f) => f.followingId) },
                };
            }
        }
        // else: community "foryou" feed — use default whereClause (all public posts)

        let posts;
        try {
            // For "For You" feed, fetch more posts to rank them intelligently
            const fetchLimit = type === 'foryou'
                ? limit * 3  // Fetch 3x to have pool for ranking
                : limit + 1;

            posts = await prisma.post.findMany({
                where: whereClause,
                take: fetchLimit,
                ...(cursor && { cursor: { id: cursor as string }, skip: 1 }),
                orderBy: [
                    { isPinned: 'desc' },
                    { createdAt: 'desc' }, // Get recent posts first, then rank by engagement
                ],
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            displayName: true,
                            avatarUrl: true,
                            isVerified: true,
                            // Privacy-first: include public profile fields for identity masking
                            usePublicProfile: true,
                            publicDisplayName: true,
                            publicUsername: true,
                            publicAvatarUrl: true,
                            communityOptIn: true,
                        },
                    },
                    music: {
                        select: {
                            id: true,
                            title: true,
                            artist: true,
                            coverUrl: true,
                        },
                    },
                    _count: {
                        select: {
                            likes: true,
                            comments: true,
                            shares: true,
                        },
                    },
                },
            });

            // Posts fetched successfully
        } catch (dbError) {
            logger.error('Database error fetching posts:', dbError);
            throw new AppError('Failed to load posts', 503);
        }

        // Load user feed preferences for personalized ranking
        let feedPrefs = { recencyWeight: 50, engagementWeight: 50, followingRatio: 70, contentTypes: {} as Record<string, number> };
        try {
            const prefs = await prisma.userFeedPreferences.findUnique({ where: { userId: req.userId! } });
            if (prefs) {
                feedPrefs = {
                    recencyWeight: prefs.recencyWeight,
                    engagementWeight: prefs.engagementWeight,
                    followingRatio: prefs.followingRatio,
                    contentTypes: (prefs.contentTypes as Record<string, number>) || {},
                };
            }
        } catch { /* Use defaults */ }

        const explain = req.query.explain === 'true';

        // Smart ranking algorithm for "For You" feed
        if (type === 'foryou' && !cursor) {
            const now = Date.now();
            const oneHourMs = 60 * 60 * 1000;

            // Normalize weights to 0-1 range
            const recencyW = feedPrefs.recencyWeight / 100;
            const engagementW = feedPrefs.engagementWeight / 100;

            // Fetch user interests for personalization
            let userInterestTopicIds: Set<string> = new Set();
            try {
                const interests = await prisma.userInterest.findMany({
                    where: { userId: req.userId, level: { not: 'NOT_INTERESTED' } },
                    select: { topicId: true, level: true },
                });
                userInterestTopicIds = new Set(interests.map(i => i.topicId));
            } catch { /* Graceful degradation - no personalization */ }

            // Get post-topic mappings for personalization
            const postIds = posts.map(p => p.id);
            let postTopics: Map<string, string[]> = new Map();
            try {
                const topics = await prisma.postTopic.findMany({
                    where: { postId: { in: postIds } },
                    select: { postId: true, topicId: true },
                });
                for (const t of topics) {
                    if (!postTopics.has(t.postId)) postTopics.set(t.postId, []);
                    postTopics.get(t.postId)!.push(t.topicId);
                }
            } catch { /* Graceful degradation */ }

            // Calculate engagement score for each post
            const rankedPosts = posts.map(post => {
                const rawEngagement =
                    (post._count.likes * 3) +      // Likes worth 3 points
                    (post._count.comments * 5) +    // Comments worth 5 points (higher engagement)
                    (post._count.shares * 7);       // Shares worth 7 points (viral signal)

                // Apply user engagement weight preference
                const engagementScore = rawEngagement * engagementW;

                // Time decay influenced by recency weight
                const ageInHours = (now - new Date(post.createdAt).getTime()) / oneHourMs;
                const decayRate = 12 / (recencyW * 2 + 0.1); // Higher recency weight = slower decay
                const timeDecay = Math.pow(0.5, ageInHours / decayRate);

                // Topic interest boost
                const postTopicIds = postTopics.get(post.id) || [];
                const interestMatch = postTopicIds.some(tid => userInterestTopicIds.has(tid));
                const interestBoost = interestMatch ? 2.0 : 1.0;

                // Content type weight from user preferences
                const contentTypeWeight = feedPrefs.contentTypes[post.type] ?? 1.0;

                // Pinned posts always show first
                const pinnedBoost = post.isPinned ? 10000 : 0;

                // New user boost
                const newUserBoost = isNewUser ? 1.5 : 1;

                const finalScore = pinnedBoost + (
                    (engagementScore + 1) *
                    timeDecay *
                    interestBoost *
                    contentTypeWeight *
                    newUserBoost
                );

                const rankingFactors = explain ? {
                    engagement: { score: rawEngagement, weight: engagementW },
                    timeDecay: { ageHours: Math.round(ageInHours), decay: parseFloat(timeDecay.toFixed(4)) },
                    interestMatch,
                    contentTypeWeight,
                    finalScore: parseFloat(finalScore.toFixed(2)),
                } : undefined;

                return {
                    ...post,
                    _engagementScore: finalScore,
                    _rankingFactors: rankingFactors,
                };
            });

            // Sort by engagement score
            rankedPosts.sort((a, b) => b._engagementScore - a._engagementScore);

            // Diversity reorder: spread out posts from the same author
            // instead of removing them. No posts are ever dropped — only reordered.
            // In community feed, after 3 consecutive posts from one author,
            // push extras further down the list (interleave with other authors).
            if (feedView === 'community') {
                const maxConsecutive = 3;
                const reordered: typeof rankedPosts = [];
                const deferred: typeof rankedPosts = [];
                const authorCount: Record<string, number> = {};

                for (const post of rankedPosts) {
                    const count = authorCount[post.userId] || 0;
                    if (count >= maxConsecutive) {
                        deferred.push(post); // Push down, don't remove
                    } else {
                        authorCount[post.userId] = count + 1;
                        reordered.push(post);
                    }
                }
                // Append deferred posts at the end — they still show up, just lower
                rankedPosts.length = 0;
                rankedPosts.push(...reordered, ...deferred);
            }

            // Take only the requested limit — all posts are in the pool, none removed
            posts = rankedPosts.slice(0, limit + 1);
        }

        const hasMore = posts.length > limit;
        const results = hasMore ? posts.slice(0, -1) : posts;

        // Check if current user liked/saved posts
        const [likes, saves] = await Promise.all([
            prisma.like.findMany({
                where: { userId: req.userId, postId: { in: results.map((p) => p.id) } },
            }),
            prisma.save.findMany({
                where: { userId: req.userId, postId: { in: results.map((p) => p.id) } },
            }),
        ]).catch(() => [[], []]);

        const likedPostIds = new Set(likes.map((l) => l.postId));
        const savedPostIds = new Set(saves.map((s) => s.postId));

        // ── Public profile masking for community feed ──
        // When viewing the community feed, authors who use a public profile
        // appear under their public persona — their real identity is hidden.
        const maskAuthor = (user: any) => {
            if (feedView === 'community' && user?.usePublicProfile) {
                return {
                    id: user.id,
                    username: user.publicUsername || user.username,
                    displayName: user.publicDisplayName || user.displayName,
                    avatarUrl: user.publicAvatarUrl || user.avatarUrl,
                    isVerified: user.isVerified,
                };
            }
            // Strip privacy fields from response regardless
            const { usePublicProfile, publicDisplayName, publicUsername, publicAvatarUrl, communityOptIn, ...cleanUser } = user || {};
            return cleanUser;
        };

        const response = {
            posts: results.map((post: any) => {
                // ── Image optimization: serve feed-sized images, not full-res ──
                // This is the #1 speed improvement — reduces ~3MB per image to ~50KB.
                const { thumbnailUrl: optimizedThumb, feedMediaUrl } = getFeedImageUrls(post.mediaUrl, post.type);

                // ── Video poster: use DB thumbnailUrl, or derive one from Cloudinary ──
                const videoThumbnail = post.type === 'VIDEO'
                    ? (post.thumbnailUrl || getVideoThumbnailUrl(post.mediaUrl))
                    : null;

                return {
                    ...post,
                    // Optimized URLs: feedMediaUrl is 800px for feed, thumbnailUrl is 200px for grids
                    mediaUrl: feedMediaUrl ?? post.mediaUrl,
                    thumbnailUrl: optimizedThumb ?? videoThumbnail ?? post.thumbnailUrl,
                    // Keep the original full-res URL for detail views
                    fullMediaUrl: post.mediaUrl,
                    // User avatar: serve at 200px for feed
                    user: {
                        ...maskAuthor(post.user),
                        avatarUrl: transformImageUrl(post.user?.avatarUrl, 200, 'auto') ?? post.user?.avatarUrl,
                    },
                    likesCount: post._count.likes,
                    commentsCount: post._count.comments,
                    sharesCount: post._count.shares,
                    isLiked: likedPostIds.has(post.id),
                    isSaved: savedPostIds.has(post.id),
                    ...(post._rankingFactors ? { rankingFactors: post._rankingFactors } : {}),
                    _engagementScore: undefined,
                    _rankingFactors: undefined,
                };
            }),
            nextCursor: hasMore ? results[results.length - 1].id : null,
            feedView,
            communityOptIn: currentUser?.communityOptIn ?? false,
        };

        // Feed response ready

        // Cache feed pages for 5 minutes (was 30 seconds — too aggressive)
        // Cache ALL pages, not just the initial one
        const FEED_CACHE_TTL = 300; // 5 minutes
        await cache.set(cacheKey, response, FEED_CACHE_TTL);

        res.json(response);
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/posts/:postId
router.get('/:postId', optionalAuth, async (req: AuthRequest, res, next) => {
    try {
        const { postId } = req.params;

        // First check if post exists
        const post = await prisma.post.findUnique({
            where: { id: postId },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        isVerified: true,
                    },
                },
                music: true,
                _count: {
                    select: {
                        likes: true,
                        comments: true,
                        shares: true,
                        rsvps: true,
                    },
                },
            },
        });

        if (!post) {
            throw new AppError('Post not found', 404);
        }

        // Increment view count in background (don't wait)
        prisma.post.update({
            where: { id: postId },
            data: { viewCount: { increment: 1 } },
        }).catch(() => { }); // Silently ignore if update fails

        let isLiked = false;
        let isSaved = false;
        let isRsvped = false;

        if (req.userId) {
            const [like, save, rsvp] = await Promise.all([
                prisma.like.findUnique({
                    where: { userId_postId: { userId: req.userId, postId } },
                }),
                prisma.save.findUnique({
                    where: { userId_postId: { userId: req.userId, postId } },
                }),
                prisma.postRSVP.findUnique({
                    where: { userId_postId: { userId: req.userId, postId } },
                }),
            ]);

            isLiked = !!like;
            isSaved = !!save;
            isRsvped = !!rsvp;
        }

        res.json({
            ...post,
            likesCount: post._count.likes,
            commentsCount: post._count.comments,
            sharesCount: post._count.shares,
            rsvpCount: post._count.rsvps,
            isLiked,
            isSaved,
            isRsvped,
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/posts
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const createSchema = z.object({
            type: z.enum(['IMAGE', 'VIDEO', 'TEXT', 'POLL', 'RALLY']),
            caption: z.string().max(2200).optional(),
            mediaUrl: z.string().url().optional(),
            thumbnailUrl: z.string().url().optional(),
            mediaCropY: z.number().min(0).max(100).optional(), // Vertical crop position 0-100
            mediaAspectRatio: z.enum(['16:9', '4:3', '1:1', '4:5', 'original']).optional(),
            duration: z.number().optional(),
            musicId: z.string().optional(),
            communityId: z.string().optional(),
            isPublic: z.boolean().optional(),
            topicIds: z.array(z.string()).max(3).optional(), // Max 3 topics
        });

        const data = createSchema.parse(req.body);
        const { topicIds, ...postData } = data;

        // === Content filter enforcement (server-side, defense-in-depth) ===
        if (data.communityId && data.caption) {
            const filters = await prisma.contentFilter.findMany({
                where: { communityId: data.communityId, isActive: true },
            });

            if (filters.length > 0) {
                const lowerText = data.caption.toLowerCase();
                let blocked = false;
                let blockReason = '';

                for (const filter of filters) {
                    let hit = false;

                    switch (filter.type) {
                        case 'keyword': {
                            const keywords = filter.pattern.split(',').map(k => k.trim().toLowerCase());
                            hit = keywords.some(kw => kw && lowerText.includes(kw));
                            break;
                        }
                        case 'link': {
                            const urlRegex = /https?:\/\/[^\s]+|www\.[^\s]+/i;
                            if (filter.pattern === '*') {
                                hit = urlRegex.test(data.caption);
                            } else {
                                const domains = filter.pattern.split(',').map(d => d.trim().toLowerCase());
                                hit = domains.some(d => d && lowerText.includes(d));
                            }
                            break;
                        }
                        case 'spam': {
                            const capsRatio = (data.caption.match(/[A-Z]/g) || []).length / Math.max(data.caption.length, 1);
                            const repeatedChars = /(.)\1{4,}/g.test(data.caption);
                            const excessivePunctuation = (data.caption.match(/[!?]{3,}/g) || []).length > 0;
                            hit = capsRatio > 0.7 || repeatedChars || excessivePunctuation;
                            break;
                        }
                        case 'newuser': {
                            const days = parseInt(filter.pattern) || 7;
                            const membership = await prisma.communityMember.findUnique({
                                where: { userId_communityId: { userId: req.userId!, communityId: data.communityId } },
                            });
                            if (membership) {
                                const joinedDaysAgo = (Date.now() - new Date(membership.joinedAt).getTime()) / (1000 * 60 * 60 * 24);
                                hit = joinedDaysAgo < days;
                            }
                            break;
                        }
                    }

                    if (hit) {
                        // Increment hit count (non-blocking)
                        prisma.contentFilter.update({
                            where: { id: filter.id },
                            data: { hitCount: { increment: 1 } },
                        }).catch(() => {});

                        if (filter.action === 'block') {
                            blocked = true;
                            blockReason = `Content blocked by community filter (${filter.type})`;
                            break;
                        }
                    }
                }

                if (blocked) {
                    throw new AppError(blockReason || 'Content not allowed in this community.', 403);
                }
            }
        }

        // Extract hashtags from caption
        const hashtags = data.caption?.match(/#\w+/g) || [];

        const post = await prisma.post.create({
            data: {
                userId: req.userId!,
                ...postData,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        isVerified: true,
                    },
                },
            },
        });

        // Process hashtags
        for (const tag of hashtags) {
            const tagName = tag.slice(1).toLowerCase();

            const hashtag = await prisma.hashtag.upsert({
                where: { name: tagName },
                update: { usageCount: { increment: 1 } },
                create: { name: tagName, usageCount: 1 },
            });

            await prisma.postHashtag.create({
                data: { postId: post.id, hashtagId: hashtag.id },
            });
        }

        // Process topics
        if (topicIds && topicIds.length > 0) {
            await Promise.all(
                topicIds.map(async (topicId) => {
                    // Create PostTopic relation
                    await prisma.postTopic.create({
                        data: { postId: post.id, topicId },
                    });

                    // Increment topic postCount
                    await prisma.topic.update({
                        where: { id: topicId },
                        data: { postCount: { increment: 1 } },
                    });
                })
            );
        }

        // Invalidate feed cache for the post creator
        await cache.invalidate(`feed:${req.userId}:*`);

        // Invalidate followers' "foryou" feed caches so they see the new post
        // Batched invalidation to avoid unbounded memory usage for users with many followers
        const BATCH_SIZE = 100;
        let skip = 0;
        let batch;
        do {
            batch = await prisma.follow.findMany({
                where: { followingId: req.userId! },
                select: { followerId: true },
                take: BATCH_SIZE,
                skip,
            });
            if (batch.length > 0) {
                await Promise.all(
                    batch.map(f => cache.invalidate(`feed:${f.followerId}:foryou:initial:*`))
                ).catch(err => logger.error('Feed cache invalidation error:', err));
            }
            skip += BATCH_SIZE;
        } while (batch.length === BATCH_SIZE);

        res.status(201).json(post);
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/posts/:postId (soft delete - preserves data)
router.delete('/:postId', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { postId } = req.params;

        const post = await prisma.post.findUnique({
            where: { id: postId },
        });

        if (!post) {
            throw new AppError('Post not found', 404);
        }

        // Allow deletion if user owns the post OR is an admin/moderator
        const userRole = req.user?.role;
        const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN' || userRole === 'MODERATOR';

        if (post.userId !== req.userId && !isAdmin) {
            throw new AppError('Not authorized', 403);
        }

        // Soft delete: set deletedAt timestamp instead of hard delete
        await prisma.post.update({
            where: { id: postId },
            data: { deletedAt: new Date() },
        });

        // Invalidate feed cache
        await cache.invalidate(`feed:${post.userId}:*`);

        res.json({ deleted: true, moderatorAction: isAdmin && post.userId !== req.userId });
    } catch (error) {
        next(error);
    }
});

// PUT /api/v1/posts/:postId - Edit post (owner only)
router.put('/:postId', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { postId } = req.params;

        const updateSchema = z.object({
            caption: z.string().max(2200).optional(),
        });

        const { caption } = updateSchema.parse(req.body);

        const post = await prisma.post.findUnique({
            where: { id: postId },
        });

        if (!post) {
            throw new AppError('Post not found', 404);
        }

        const userRole = req.user?.role;
        const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN' || userRole === 'MODERATOR';

        if (post.userId !== req.userId && !isAdmin) {
            throw new AppError('Not authorized to edit this post', 403);
        }

        const updatedPost = await prisma.post.update({
            where: { id: postId },
            data: { caption },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        isVerified: true,
                    },
                },
            },
        });

        res.json(updatedPost);
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/posts/:postId/rsvp - Mark "I'm In"
router.post('/:postId/rsvp', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { postId } = req.params;
        const statusSchema = z.object({
            status: z.enum(['IN', 'MAYBE', 'OUT']).optional().default('IN'),
        });

        const { status } = statusSchema.parse(req.body);

        const post = await prisma.post.findUnique({
            where: { id: postId },
        });

        if (!post) {
            throw new AppError('Post not found', 404);
        }

        const rsvp = await prisma.postRSVP.upsert({
            where: {
                userId_postId: {
                    userId: req.userId!,
                    postId,
                },
            },
            update: { status },
            create: {
                userId: req.userId!,
                postId,
                status,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                    },
                },
            },
        });

        // Get updated RSVP count
        const rsvpCount = await prisma.postRSVP.count({
            where: { postId, status: 'IN' },
        });

        res.json({ rsvp, rsvpCount, isRsvped: true });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/posts/:postId/rsvp - Remove RSVP
router.delete('/:postId/rsvp', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { postId } = req.params;

        await prisma.postRSVP.delete({
            where: {
                userId_postId: {
                    userId: req.userId!,
                    postId,
                },
            },
        }).catch(() => { });

        const rsvpCount = await prisma.postRSVP.count({
            where: { postId, status: 'IN' },
        });

        res.json({ rsvpCount, isRsvped: false });
    } catch (error) {
        next(error);
    }
});

// PUT /api/v1/posts/:postId/comments/:commentId - Edit comment
router.put('/:postId/comments/:commentId', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { commentId } = req.params;

        const updateSchema = z.object({
            content: z.string().min(1).max(500),
        });

        const { content } = updateSchema.parse(req.body);

        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
        });

        if (!comment) {
            throw new AppError('Comment not found', 404);
        }

        const userRole = req.user?.role;
        const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN' || userRole === 'MODERATOR';

        if (comment.userId !== req.userId && !isAdmin) {
            throw new AppError('Not authorized to edit this comment', 403);
        }

        const updatedComment = await prisma.comment.update({
            where: { id: commentId },
            data: { content },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        isVerified: true,
                    },
                },
            },
        });

        res.json(updatedComment);
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/posts/:postId/comments/:commentId - Delete comment
router.delete('/:postId/comments/:commentId', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { postId, commentId } = req.params;

        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
        });

        if (!comment) {
            throw new AppError('Comment not found', 404);
        }

        // Get the post to check ownership
        const post = await prisma.post.findUnique({ where: { id: postId } });

        // Allow deletion if user owns the comment, owns the post, or is admin
        const userRole = req.user?.role;
        const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN' || userRole === 'MODERATOR';
        const isCommentOwner = comment.userId === req.userId;
        const isPostOwner = post?.userId === req.userId;

        if (!isCommentOwner && !isPostOwner && !isAdmin) {
            throw new AppError('Not authorized to delete this comment', 403);
        }

        await prisma.comment.delete({
            where: { id: commentId },
        });

        res.json({ deleted: true });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/posts/:postId/like
router.post('/:postId/like', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { postId } = req.params;

        const post = await prisma.post.findUnique({
            where: { id: postId },
        });

        if (!post) {
            throw new AppError('Post not found', 404);
        }

        await prisma.like.create({
            data: {
                userId: req.userId!,
                postId,
            },
        });

        // Queue notification asynchronously (doesn't block response)
        if (post.userId !== req.userId) {
            queueNotification({
                userId: post.userId,
                type: 'LIKE',
                actorId: req.userId,
                targetId: postId,
                message: 'liked your post',
            });
        }

        res.json({ liked: true });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/posts/:postId/like
router.delete('/:postId/like', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { postId } = req.params;

        await prisma.like.delete({
            where: {
                userId_postId: {
                    userId: req.userId!,
                    postId,
                },
            },
        }).catch(() => { });

        res.json({ liked: false });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/posts/saved - List saved posts for current user
router.get('/saved', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { cursor, limit: rawLimit } = req.query;
        const limit = clampLimit(rawLimit as string, 20, 50);

        const saves = await prisma.save.findMany({
            where: { userId: req.userId! },
            take: limit + 1,
            ...(cursor && { cursor: { id: cursor as string }, skip: 1 }),
            orderBy: { createdAt: 'desc' },
            include: {
                post: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                displayName: true,
                                avatarUrl: true,
                                isVerified: true,
                            },
                        },
                        _count: {
                            select: { likes: true, comments: true, shares: true },
                        },
                    },
                },
            },
        });

        const hasMore = saves.length > limit;
        const results = hasMore ? saves.slice(0, -1) : saves;

        res.json({
            posts: results.map((s) => ({
                ...s.post,
                likesCount: s.post._count.likes,
                commentsCount: s.post._count.comments,
                sharesCount: s.post._count.shares,
                isSaved: true,
                savedAt: s.createdAt,
            })),
            nextCursor: hasMore ? results[results.length - 1].id : null,
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/posts/:postId/save
router.post('/:postId/save', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { postId } = req.params;

        await prisma.save.create({
            data: {
                userId: req.userId!,
                postId,
            },
        });

        res.json({ saved: true });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/posts/:postId/save
router.delete('/:postId/save', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { postId } = req.params;

        await prisma.save.delete({
            where: {
                userId_postId: {
                    userId: req.userId!,
                    postId,
                },
            },
        }).catch(() => { });

        res.json({ saved: false });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/posts/:postId/comments
router.get('/:postId/comments', optionalAuth, async (req: AuthRequest, res, next) => {
    try {
        const { postId } = req.params;
        const { cursor, limit: rawCommentLimit } = req.query;
        const limit = clampLimit(rawCommentLimit as string, 50, 100);

        const comments = await prisma.comment.findMany({
            where: { postId, parentId: null },
            take: limit + 1,
            ...(cursor && { cursor: { id: cursor as string }, skip: 1 }),
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        isVerified: true,
                    },
                },
                _count: {
                    select: { replies: true },
                },
            },
        });

        const hasMore = comments.length > limit;
        const results = hasMore ? comments.slice(0, -1) : comments;

        res.json({
            comments: results.map((c) => ({
                ...c,
                parentId: c.parentId,
                repliesCount: c._count.replies,
            })),
            nextCursor: hasMore ? results[results.length - 1].id : null,
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/posts/:postId/comments
router.post('/:postId/comments', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { postId } = req.params;

        const commentSchema = z.object({
            content: z.string().min(1).max(500),
            parentId: z.string().optional(),
        });

        const { content, parentId } = commentSchema.parse(req.body);

        const post = await prisma.post.findUnique({
            where: { id: postId },
        });

        if (!post) {
            throw new AppError('Post not found', 404);
        }

        // Validate parent comment exists and belongs to the same post
        let parentComment: Awaited<ReturnType<typeof prisma.comment.findUnique>> = null;
        if (parentId) {
            parentComment = await prisma.comment.findUnique({
                where: { id: parentId },
            });

            if (!parentComment) {
                throw new AppError('Parent comment not found', 404);
            }

            if (parentComment.postId !== postId) {
                throw new AppError('Parent comment does not belong to this post', 400);
            }
        }

        const comment = await prisma.comment.create({
            data: {
                postId,
                userId: req.userId!,
                content,
                parentId: parentId || null,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        isVerified: true,
                    },
                },
                _count: {
                    select: { replies: true },
                },
            },
        });

        // Queue notification to post author
        if (post.userId !== req.userId) {
            queueNotification({
                userId: post.userId,
                type: 'COMMENT',
                actorId: req.userId,
                targetId: postId,
                message: parentId ? 'replied to a comment on your post' : 'commented on your post',
            });
        }

        // Queue notification to parent comment author (for replies)
        if (parentComment && parentComment.userId !== req.userId && parentComment.userId !== post.userId) {
            queueNotification({
                userId: parentComment.userId,
                type: 'COMMENT',
                actorId: req.userId,
                targetId: postId,
                message: 'replied to your comment',
            });
        }

        res.status(201).json({
            ...comment,
            parentId: comment.parentId,
            repliesCount: comment._count.replies,
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/posts/feed/stats - Content source breakdown
router.get('/feed/stats', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const userId = req.userId!;

        // Get following IDs
        const following = await prisma.follow.findMany({
            where: { followerId: userId },
            select: { followingId: true },
        });
        const followingIds = new Set(following.map(f => f.followingId));

        // Get recent feed posts (last 50)
        const recentPosts = await prisma.post.findMany({
            where: { isPublic: true, deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: { userId: true, type: true },
        });

        // Calculate source breakdown
        let fromFollowing = 0;
        let fromDiscovery = 0;
        const typeBreakdown: Record<string, number> = {};

        for (const post of recentPosts) {
            if (followingIds.has(post.userId)) {
                fromFollowing++;
            } else {
                fromDiscovery++;
            }
            typeBreakdown[post.type] = (typeBreakdown[post.type] || 0) + 1;
        }

        const total = recentPosts.length || 1;

        res.json({
            sources: {
                following: { count: fromFollowing, percentage: Math.round((fromFollowing / total) * 100) },
                discovery: { count: fromDiscovery, percentage: Math.round((fromDiscovery / total) * 100) },
            },
            contentTypes: Object.fromEntries(
                Object.entries(typeBreakdown).map(([type, count]) => [
                    type,
                    { count, percentage: Math.round((count / total) * 100) },
                ])
            ),
            totalAnalyzed: recentPosts.length,
        });
    } catch (error) {
        next(error);
    }
});

// PATCH /api/v1/posts/:postId/pin - Toggle pin on a post (owner only)
router.patch('/:postId/pin', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { postId } = req.params;
        const post = await prisma.post.findUnique({ where: { id: postId } });
        if (!post) throw new AppError('Post not found', 404);

        const userRole = req.user?.role;
        const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN';
        if (post.userId !== req.userId && !isAdmin) {
            throw new AppError('Not authorized', 403);
        }

        const updatedPost = await prisma.post.update({
            where: { id: postId },
            data: { isPinned: !post.isPinned, sortOrder: !post.isPinned ? 9999 : 0 },
        });

        // Invalidate cache
        await cache.invalidate(`feed:${post.userId}:*`);

        res.json({ id: updatedPost.id, isPinned: updatedPost.isPinned, sortOrder: updatedPost.sortOrder });
    } catch (error) {
        next(error);
    }
});

// PUT /api/v1/posts/reorder - Reorder user's own posts (set sortOrder for multiple posts)
router.put('/reorder', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const reorderSchema = z.object({
            posts: z.array(z.object({
                id: z.string(),
                sortOrder: z.number().int().min(0),
            })).min(1).max(100),
        });

        const { posts: postOrders } = reorderSchema.parse(req.body);

        // Verify all posts belong to the user
        const postIds = postOrders.map(p => p.id);
        const userPosts = await prisma.post.findMany({
            where: { id: { in: postIds }, userId: req.userId!, deletedAt: null },
            select: { id: true },
        });
        const ownedIds = new Set(userPosts.map(p => p.id));
        const unauthorized = postIds.filter(id => !ownedIds.has(id));
        if (unauthorized.length > 0) {
            throw new AppError(`Cannot reorder posts you don't own: ${unauthorized.join(', ')}`, 403);
        }

        // Batch update sort orders
        await prisma.$transaction(
            postOrders.map(({ id, sortOrder }) =>
                prisma.post.update({ where: { id }, data: { sortOrder } })
            )
        );

        // Invalidate cache
        await cache.invalidate(`feed:${req.userId}:*`);

        res.json({ success: true, updated: postOrders.length });
    } catch (error) {
        next(error);
    }
});

export { router as postsRouter };
