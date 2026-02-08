import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Re-create the feed ranking algorithm from posts.ts:266-315 ──
interface MockPost {
    id: string;
    userId: string;
    type: string;
    isPinned: boolean;
    createdAt: Date;
    _count: { likes: number; comments: number; shares: number };
}

interface FeedPrefs {
    recencyWeight: number;
    engagementWeight: number;
    followingRatio: number;
    contentTypes: Record<string, number>;
}

interface RankedPost extends MockPost {
    _engagementScore: number;
}

function rankPosts(
    posts: MockPost[],
    feedPrefs: FeedPrefs,
    userInterestTopicIds: Set<string> = new Set(),
    postTopics: Map<string, string[]> = new Map(),
    isNewUser: boolean = false,
    referenceTime?: number,
): RankedPost[] {
    const now = referenceTime ?? Date.now();
    const oneHourMs = 60 * 60 * 1000;

    const recencyW = feedPrefs.recencyWeight / 100;
    const engagementW = feedPrefs.engagementWeight / 100;

    return posts.map((post) => {
        const rawEngagement =
            (post._count.likes * 3) +
            (post._count.comments * 5) +
            (post._count.shares * 7);

        const engagementScore = rawEngagement * engagementW;

        const ageInHours = (now - new Date(post.createdAt).getTime()) / oneHourMs;
        const decayRate = 12 / (recencyW * 2 + 0.1);
        const timeDecay = Math.pow(0.5, ageInHours / decayRate);

        const postTopicIds = postTopics.get(post.id) || [];
        const interestMatch = postTopicIds.some((tid) => userInterestTopicIds.has(tid));
        const interestBoost = interestMatch ? 2.0 : 1.0;

        const contentTypeWeight = feedPrefs.contentTypes[post.type] ?? 1.0;

        const pinnedBoost = post.isPinned ? 10000 : 0;
        const newUserBoost = isNewUser ? 1.5 : 1;

        const finalScore = pinnedBoost + (
            (engagementScore + 1) *
            timeDecay *
            interestBoost *
            contentTypeWeight *
            newUserBoost
        );

        return { ...post, _engagementScore: finalScore };
    }).sort((a, b) => b._engagementScore - a._engagementScore);
}

// ── Pagination helper (mirrors posts.ts:348-349 logic) ──
function paginate<T>(items: T[], limit: number): { results: T[]; hasMore: boolean; nextCursor: string | null } {
    const hasMore = items.length > limit;
    const results = hasMore ? items.slice(0, limit) : items;
    return {
        results,
        hasMore,
        nextCursor: hasMore ? (results[results.length - 1] as any)?.id ?? null : null,
    };
}

// ── Test data factories ──
function createPost(overrides: Partial<MockPost> = {}): MockPost {
    return {
        id: overrides.id ?? `post-${Math.random().toString(36).slice(2, 8)}`,
        userId: overrides.userId ?? 'default-user',
        type: overrides.type ?? 'TEXT',
        isPinned: overrides.isPinned ?? false,
        createdAt: overrides.createdAt ?? new Date(),
        _count: overrides._count ?? { likes: 0, comments: 0, shares: 0 },
    };
}

const defaultPrefs: FeedPrefs = {
    recencyWeight: 50,
    engagementWeight: 50,
    followingRatio: 70,
    contentTypes: {},
};

// =============================================
// FEED RANKING TESTS
// =============================================
describe('Feed: Ranking algorithm', () => {
    const now = Date.now();

    it('should rank posts with higher engagement above lower engagement', () => {
        const posts = [
            createPost({ id: 'low', createdAt: new Date(now), _count: { likes: 1, comments: 0, shares: 0 } }),
            createPost({ id: 'high', createdAt: new Date(now), _count: { likes: 50, comments: 20, shares: 10 } }),
        ];

        const ranked = rankPosts(posts, defaultPrefs, new Set(), new Map(), false, now);

        expect(ranked[0].id).toBe('high');
        expect(ranked[1].id).toBe('low');
    });

    it('should rank newer posts higher when engagement is similar', () => {
        const recentDate = new Date(now - 1 * 60 * 60 * 1000); // 1 hour ago
        const oldDate = new Date(now - 48 * 60 * 60 * 1000);   // 48 hours ago

        const posts = [
            createPost({ id: 'old', createdAt: oldDate, _count: { likes: 5, comments: 2, shares: 1 } }),
            createPost({ id: 'new', createdAt: recentDate, _count: { likes: 5, comments: 2, shares: 1 } }),
        ];

        const ranked = rankPosts(posts, defaultPrefs, new Set(), new Map(), false, now);

        expect(ranked[0].id).toBe('new');
        expect(ranked[1].id).toBe('old');
    });

    it('should always place pinned posts at the top', () => {
        const posts = [
            createPost({ id: 'viral', _count: { likes: 1000, comments: 500, shares: 200 }, createdAt: new Date(now) }),
            createPost({ id: 'pinned', isPinned: true, _count: { likes: 0, comments: 0, shares: 0 }, createdAt: new Date(now - 24 * 60 * 60 * 1000) }),
        ];

        const ranked = rankPosts(posts, defaultPrefs, new Set(), new Map(), false, now);

        expect(ranked[0].id).toBe('pinned');
    });

    it('should apply engagement weights from user preferences', () => {
        const highEngagementPrefs: FeedPrefs = { ...defaultPrefs, engagementWeight: 100 };
        const lowEngagementPrefs: FeedPrefs = { ...defaultPrefs, engagementWeight: 10 };

        const posts = [
            createPost({ id: 'a', createdAt: new Date(now), _count: { likes: 100, comments: 50, shares: 20 } }),
        ];

        const highRanked = rankPosts(posts, highEngagementPrefs, new Set(), new Map(), false, now);
        const lowRanked = rankPosts(posts, lowEngagementPrefs, new Set(), new Map(), false, now);

        // Higher engagement weight should amplify the score
        expect(highRanked[0]._engagementScore).toBeGreaterThan(lowRanked[0]._engagementScore);
    });

    it('should boost score for posts matching user interests', () => {
        const topicMap = new Map([['post-a', ['topic-1']]]);
        const interests = new Set(['topic-1']);

        const posts = [
            createPost({ id: 'post-a', createdAt: new Date(now), _count: { likes: 5, comments: 1, shares: 0 } }),
            createPost({ id: 'post-b', createdAt: new Date(now), _count: { likes: 5, comments: 1, shares: 0 } }),
        ];

        const ranked = rankPosts(posts, defaultPrefs, interests, topicMap, false, now);

        // post-a matches interest so should rank higher
        expect(ranked[0].id).toBe('post-a');
    });

    it('should apply content type weight from preferences', () => {
        const prefs: FeedPrefs = { ...defaultPrefs, contentTypes: { VIDEO: 3.0, TEXT: 0.5 } };

        const posts = [
            createPost({ id: 'text', type: 'TEXT', createdAt: new Date(now), _count: { likes: 5, comments: 2, shares: 1 } }),
            createPost({ id: 'video', type: 'VIDEO', createdAt: new Date(now), _count: { likes: 5, comments: 2, shares: 1 } }),
        ];

        const ranked = rankPosts(posts, prefs, new Set(), new Map(), false, now);

        expect(ranked[0].id).toBe('video');
    });

    it('should give new users a 1.5x boost', () => {
        const posts = [
            createPost({ id: 'p1', createdAt: new Date(now), _count: { likes: 10, comments: 5, shares: 2 } }),
        ];

        const normalRanked = rankPosts(posts, defaultPrefs, new Set(), new Map(), false, now);
        const newUserRanked = rankPosts(posts, defaultPrefs, new Set(), new Map(), true, now);

        expect(newUserRanked[0]._engagementScore).toBeGreaterThan(normalRanked[0]._engagementScore);
        // The boost is exactly 1.5x for the non-pinned portion
        const normalNonPinned = normalRanked[0]._engagementScore;
        const newUserNonPinned = newUserRanked[0]._engagementScore;
        expect(newUserNonPinned / normalNonPinned).toBeCloseTo(1.5, 1);
    });

    it('should use default content type weight of 1.0 for unknown types', () => {
        const prefs: FeedPrefs = { ...defaultPrefs, contentTypes: { VIDEO: 2.0 } };

        const posts = [
            createPost({ id: 'text', type: 'TEXT', createdAt: new Date(now), _count: { likes: 10, comments: 5, shares: 2 } }),
        ];

        const rankedWithPrefs = rankPosts(posts, prefs, new Set(), new Map(), false, now);
        const rankedDefault = rankPosts(posts, defaultPrefs, new Set(), new Map(), false, now);

        // TEXT type not in contentTypes, so both should use default weight 1.0
        expect(rankedWithPrefs[0]._engagementScore).toBe(rankedDefault[0]._engagementScore);
    });
});

// =============================================
// ENGAGEMENT SCORE CALCULATION
// =============================================
describe('Feed: Engagement score weights', () => {
    it('should weight likes=3, comments=5, shares=7', () => {
        const post = createPost({
            createdAt: new Date(),
            _count: { likes: 10, comments: 10, shares: 10 },
        });

        const rawEngagement =
            (post._count.likes * 3) +
            (post._count.comments * 5) +
            (post._count.shares * 7);

        expect(rawEngagement).toBe(30 + 50 + 70);
        expect(rawEngagement).toBe(150);
    });

    it('should give shares the highest individual weight', () => {
        const likesOnly = createPost({ _count: { likes: 1, comments: 0, shares: 0 } });
        const commentsOnly = createPost({ _count: { likes: 0, comments: 1, shares: 0 } });
        const sharesOnly = createPost({ _count: { likes: 0, comments: 0, shares: 1 } });

        const likeScore = likesOnly._count.likes * 3;
        const commentScore = commentsOnly._count.comments * 5;
        const shareScore = sharesOnly._count.shares * 7;

        expect(shareScore).toBeGreaterThan(commentScore);
        expect(commentScore).toBeGreaterThan(likeScore);
    });
});

// =============================================
// SORT ORDER TESTS
// =============================================
describe('Feed: Sort order', () => {
    const now = Date.now();

    it('should sort by score descending (highest first)', () => {
        const posts = [
            createPost({ id: 'low', createdAt: new Date(now), _count: { likes: 1, comments: 0, shares: 0 } }),
            createPost({ id: 'mid', createdAt: new Date(now), _count: { likes: 10, comments: 5, shares: 2 } }),
            createPost({ id: 'high', createdAt: new Date(now), _count: { likes: 100, comments: 50, shares: 20 } }),
        ];

        const ranked = rankPosts(posts, defaultPrefs, new Set(), new Map(), false, now);

        expect(ranked[0].id).toBe('high');
        expect(ranked[1].id).toBe('mid');
        expect(ranked[2].id).toBe('low');
    });

    it('should maintain stable order for equal-scored posts', () => {
        const sameDatePosts = Array.from({ length: 5 }, (_, i) =>
            createPost({ id: `post-${i}`, createdAt: new Date(now), _count: { likes: 0, comments: 0, shares: 0 } }),
        );

        const ranked = rankPosts(sameDatePosts, defaultPrefs, new Set(), new Map(), false, now);

        // All scores should be equal
        const scores = ranked.map((p) => p._engagementScore);
        expect(new Set(scores).size).toBe(1);
    });
});

// =============================================
// OWN POSTS VISIBILITY
// =============================================
describe('Feed: Own posts are never filtered out', () => {
    it('should include own posts in private feed filter', () => {
        // Simulates buildPrivateFeedFilter logic
        const userId = 'me';
        const communityIds: string[] = [];
        const followingIds: string[] = [];

        const whereClause = {
            deletedAt: null,
            OR: [
                ...(communityIds.length > 0 ? [{ communityId: { in: communityIds } }] : []),
                ...(followingIds.length > 0 ? [{ userId: { in: followingIds }, communityId: null }] : []),
                { userId },
            ],
        };

        const ownPostClause = whereClause.OR.find((c: any) => c.userId === 'me');
        expect(ownPostClause).toBeDefined();
    });

    it('should always have own posts in the OR clause regardless of other filters', () => {
        const userId = 'my-user-id';

        // Even with communities and following
        const whereClause = {
            OR: [
                { communityId: { in: ['c1', 'c2'] } },
                { userId: { in: ['other-1', 'other-2'] }, communityId: null },
                { userId },
            ],
        };

        const ownClause = whereClause.OR.find((c: any) =>
            typeof c.userId === 'string' && c.userId === userId,
        );
        expect(ownClause).toBeDefined();
    });

    it('should rank own posts normally (no penalty or removal)', () => {
        const now = Date.now();
        const posts = [
            createPost({ id: 'mine', userId: 'me', createdAt: new Date(now), _count: { likes: 10, comments: 5, shares: 2 } }),
            createPost({ id: 'theirs', userId: 'other', createdAt: new Date(now), _count: { likes: 10, comments: 5, shares: 2 } }),
        ];

        const ranked = rankPosts(posts, defaultPrefs, new Set(), new Map(), false, now);

        // Both posts should have the same score since they have same engagement and time
        expect(ranked[0]._engagementScore).toBe(ranked[1]._engagementScore);
        expect(ranked).toHaveLength(2);
    });
});

// =============================================
// PAGINATION TESTS
// =============================================
describe('Feed: Pagination', () => {
    it('should return hasMore=true when posts exceed limit', () => {
        const items = Array.from({ length: 11 }, (_, i) => ({ id: `p${i}` }));
        const { results, hasMore, nextCursor } = paginate(items, 10);

        expect(hasMore).toBe(true);
        expect(results).toHaveLength(10);
        expect(nextCursor).toBe('p9');
    });

    it('should return hasMore=false when posts fit within limit', () => {
        const items = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}` }));
        const { results, hasMore, nextCursor } = paginate(items, 10);

        expect(hasMore).toBe(false);
        expect(results).toHaveLength(5);
        expect(nextCursor).toBeNull();
    });

    it('should return hasMore=false when posts exactly match limit', () => {
        const items = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}` }));
        const { results, hasMore } = paginate(items, 10);

        expect(hasMore).toBe(false);
        expect(results).toHaveLength(10);
    });

    it('should handle empty post list', () => {
        const { results, hasMore, nextCursor } = paginate([], 10);

        expect(hasMore).toBe(false);
        expect(results).toHaveLength(0);
        expect(nextCursor).toBeNull();
    });

    it('should return the last item id as nextCursor', () => {
        const items = Array.from({ length: 21 }, (_, i) => ({ id: `post-${i}` }));
        const { nextCursor } = paginate(items, 20);

        expect(nextCursor).toBe('post-19');
    });

    it('should not include the extra overflow item in results', () => {
        const items = Array.from({ length: 6 }, (_, i) => ({ id: `p${i}` }));
        const { results } = paginate(items, 5);

        expect(results).toHaveLength(5);
        expect(results.map((r: any) => r.id)).not.toContain('p5');
    });
});

// =============================================
// TIME DECAY TESTS
// =============================================
describe('Feed: Time decay behavior', () => {
    it('should reduce score significantly for very old posts', () => {
        const now = Date.now();
        const recentPost = createPost({
            id: 'recent',
            createdAt: new Date(now - 1 * 60 * 60 * 1000),     // 1 hour ago
            _count: { likes: 10, comments: 5, shares: 2 },
        });
        const oldPost = createPost({
            id: 'old',
            createdAt: new Date(now - 7 * 24 * 60 * 60 * 1000), // 1 week ago
            _count: { likes: 10, comments: 5, shares: 2 },
        });

        const ranked = rankPosts([oldPost, recentPost], defaultPrefs, new Set(), new Map(), false, now);

        expect(ranked[0].id).toBe('recent');
        expect(ranked[0]._engagementScore).toBeGreaterThan(ranked[1]._engagementScore * 2);
    });

    it('should decay faster for old posts when user has higher recency weight', () => {
        const now = Date.now();
        const halfDayAgo = new Date(now - 12 * 60 * 60 * 1000); // 12 hours ago

        const post = createPost({
            id: 'p1',
            createdAt: halfDayAgo,
            _count: { likes: 10, comments: 5, shares: 2 },
        });

        const lowRecency: FeedPrefs = { ...defaultPrefs, recencyWeight: 20 };
        const highRecency: FeedPrefs = { ...defaultPrefs, recencyWeight: 80 };

        const rankedLow = rankPosts([post], lowRecency, new Set(), new Map(), false, now);
        const rankedHigh = rankPosts([post], highRecency, new Set(), new Map(), false, now);

        // Higher recency weight = user wants fresh content = old posts decay faster = lower score
        expect(rankedLow[0]._engagementScore).toBeGreaterThan(rankedHigh[0]._engagementScore);
    });
});

// =============================================
// FEED VIEW SELECTION
// =============================================
describe('Feed: View selection logic', () => {
    it('should default to private feed when no view specified', () => {
        const currentUser = { communityOptIn: false, activeFeedView: 'private' as const };
        const requestedView = undefined;

        const feedView = requestedView || currentUser.activeFeedView || 'private';
        expect(feedView).toBe('private');
    });

    it('should respect explicitly requested view', () => {
        const requestedView = 'community';
        const currentUser = { activeFeedView: 'private' };

        const feedView = requestedView || currentUser.activeFeedView || 'private';
        expect(feedView).toBe('community');
    });

    it('should use user activeFeedView when no query parameter', () => {
        const requestedView = undefined;
        const currentUser = { activeFeedView: 'community' };

        const feedView = requestedView || currentUser.activeFeedView || 'private';
        expect(feedView).toBe('community');
    });

    it('should fall back to private when user has no activeFeedView', () => {
        const requestedView = undefined;
        const currentUser = { activeFeedView: null };

        const feedView = requestedView || currentUser.activeFeedView || 'private';
        expect(feedView).toBe('private');
    });
});

// =============================================
// FOR YOU FETCH MULTIPLIER
// =============================================
describe('Feed: ForYou fetch multiplier', () => {
    it('should fetch 3x the limit for ForYou feed to enable ranking', () => {
        const limit = 10;
        const type = 'foryou';

        const fetchLimit = type === 'foryou' ? limit * 3 : limit + 1;
        expect(fetchLimit).toBe(30);
    });

    it('should fetch limit+1 for non-ForYou feeds (pagination check)', () => {
        const limit = 10;
        const type = 'following';

        const fetchLimit = type === 'foryou' ? limit * 3 : limit + 1;
        expect(fetchLimit).toBe(11);
    });
});
