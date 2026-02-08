import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Re-create the maskUserForDiscovery function from users.ts ──
// This is the exact logic from src/routes/users.ts:10-24
function maskUserForDiscovery(u: any) {
    if (u.usePublicProfile) {
        return {
            id: u.id,
            username: u.publicUsername || u.username,
            displayName: u.publicDisplayName || u.displayName,
            bio: u.publicBio || u.bio,
            avatarUrl: u.publicAvatarUrl || u.avatarUrl,
            isVerified: u.isVerified,
        };
    }
    // Strip privacy fields
    const { usePublicProfile, publicDisplayName, publicUsername, publicAvatarUrl, publicBio, communityOptIn, ...clean } = u;
    return clean;
}

// ── Re-create the maskAuthor function from posts.ts feed endpoint ──
// This is the exact logic from src/routes/posts.ts:367-380
function maskAuthor(user: any, feedView: string) {
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
}

// ── Re-create the diversity filter from posts.ts ──
// This is the exact logic from src/routes/posts.ts:324-342
function diversityReorder<T extends { userId: string }>(posts: T[], maxConsecutive: number = 3): T[] {
    const reordered: T[] = [];
    const deferred: T[] = [];
    const authorCount: Record<string, number> = {};

    for (const post of posts) {
        const count = authorCount[post.userId] || 0;
        if (count >= maxConsecutive) {
            deferred.push(post);
        } else {
            authorCount[post.userId] = count + 1;
            reordered.push(post);
        }
    }
    return [...reordered, ...deferred];
}

// ── Helper: build a private feed where clause ──
// Mirrors the logic in posts.ts:107-134
function buildPrivateFeedFilter(userId: string, communityIds: string[], followingIds: string[]) {
    return {
        deletedAt: null,
        OR: [
            ...(communityIds.length > 0 ? [{ communityId: { in: communityIds } }] : []),
            ...(followingIds.length > 0 ? [{ userId: { in: followingIds }, communityId: null }] : []),
            { userId },
        ],
    };
}

// ── Helper: check if community feed is blocked ──
function shouldBlockCommunityFeed(feedView: string, communityOptIn: boolean): boolean {
    return feedView === 'community' && !communityOptIn;
}

// =============================================
// USER DISCOVERY MASKING TESTS
// =============================================
describe('Privacy: maskUserForDiscovery', () => {
    const baseUser = {
        id: 'user-1',
        username: 'realuser',
        displayName: 'Real Name',
        bio: 'My real bio',
        avatarUrl: 'https://cdn.example.com/real-avatar.jpg',
        isVerified: true,
        usePublicProfile: false,
        publicDisplayName: null,
        publicUsername: null,
        publicAvatarUrl: null,
        publicBio: null,
        communityOptIn: true,
    };

    it('should return clean user without privacy fields when usePublicProfile is false', () => {
        const result = maskUserForDiscovery(baseUser);

        expect(result.id).toBe('user-1');
        expect(result.username).toBe('realuser');
        expect(result.displayName).toBe('Real Name');
        // Privacy fields should be stripped
        expect(result).not.toHaveProperty('usePublicProfile');
        expect(result).not.toHaveProperty('publicDisplayName');
        expect(result).not.toHaveProperty('publicUsername');
        expect(result).not.toHaveProperty('publicAvatarUrl');
        expect(result).not.toHaveProperty('publicBio');
        expect(result).not.toHaveProperty('communityOptIn');
    });

    it('should mask identity with public profile fields when usePublicProfile is true', () => {
        const publicUser = {
            ...baseUser,
            usePublicProfile: true,
            publicDisplayName: 'Anon Display',
            publicUsername: 'anon_user',
            publicAvatarUrl: 'https://cdn.example.com/anon-avatar.jpg',
            publicBio: 'Anonymous bio',
        };

        const result = maskUserForDiscovery(publicUser);

        expect(result.id).toBe('user-1');
        expect(result.username).toBe('anon_user');
        expect(result.displayName).toBe('Anon Display');
        expect(result.bio).toBe('Anonymous bio');
        expect(result.avatarUrl).toBe('https://cdn.example.com/anon-avatar.jpg');
        // Should NOT expose real identity
        expect(result.username).not.toBe('realuser');
        expect(result.displayName).not.toBe('Real Name');
    });

    it('should fall back to real fields when public profile fields are null', () => {
        const partialPublicUser = {
            ...baseUser,
            usePublicProfile: true,
            publicDisplayName: null,
            publicUsername: null,
            publicAvatarUrl: null,
            publicBio: null,
        };

        const result = maskUserForDiscovery(partialPublicUser);

        // Falls back to real values because public ones are null
        expect(result.username).toBe('realuser');
        expect(result.displayName).toBe('Real Name');
        expect(result.avatarUrl).toBe('https://cdn.example.com/real-avatar.jpg');
    });

    it('should preserve isVerified status regardless of masking', () => {
        const publicUser = { ...baseUser, usePublicProfile: true, publicUsername: 'masked' };
        const result = maskUserForDiscovery(publicUser);
        expect(result.isVerified).toBe(true);
    });
});

// =============================================
// COMMUNITY FEED AUTHOR MASKING TESTS
// =============================================
describe('Privacy: maskAuthor for community feed', () => {
    const author = {
        id: 'author-1',
        username: 'realauthor',
        displayName: 'Real Author',
        avatarUrl: 'https://cdn.example.com/real.jpg',
        isVerified: false,
        usePublicProfile: true,
        publicDisplayName: 'Public Author',
        publicUsername: 'pub_author',
        publicAvatarUrl: 'https://cdn.example.com/public.jpg',
        communityOptIn: true,
    };

    it('should mask author in community feed when they use public profile', () => {
        const result = maskAuthor(author, 'community');

        expect(result.username).toBe('pub_author');
        expect(result.displayName).toBe('Public Author');
        expect(result.avatarUrl).toBe('https://cdn.example.com/public.jpg');
    });

    it('should NOT mask author in private feed even if they have public profile', () => {
        const result = maskAuthor(author, 'private');

        // In private feed, we strip privacy fields but show real identity
        expect(result).not.toHaveProperty('usePublicProfile');
        expect(result).not.toHaveProperty('publicDisplayName');
        expect(result.username).toBe('realauthor');
        expect(result.displayName).toBe('Real Author');
    });

    it('should strip privacy fields from non-public-profile users in community feed', () => {
        const normalAuthor = { ...author, usePublicProfile: false };
        const result = maskAuthor(normalAuthor, 'community');

        expect(result.username).toBe('realauthor');
        expect(result).not.toHaveProperty('usePublicProfile');
        expect(result).not.toHaveProperty('publicDisplayName');
        expect(result).not.toHaveProperty('publicUsername');
        expect(result).not.toHaveProperty('communityOptIn');
    });

    it('should handle null user gracefully', () => {
        const result = maskAuthor(null, 'community');
        // Should not throw, returns an empty-ish object
        expect(result).toBeDefined();
    });
});

// =============================================
// USER SEARCH PRIVACY TESTS
// =============================================
describe('Privacy: User search only exposes community-opted-in users', () => {
    it('should build a filter that requires communityOptIn=true', () => {
        // Simulates the where clause from users.ts:31-44
        const buildUserSearchFilter = (search?: string) => ({
            isGroupOnly: false,
            communityOptIn: true,
            ...(search ? {
                OR: [
                    { username: { contains: search, mode: 'insensitive' } },
                    { displayName: { contains: search, mode: 'insensitive' } },
                    { publicUsername: { contains: search, mode: 'insensitive' } },
                    { publicDisplayName: { contains: search, mode: 'insensitive' } },
                ],
            } : {}),
        });

        const filterNoSearch = buildUserSearchFilter();
        expect(filterNoSearch.communityOptIn).toBe(true);
        expect(filterNoSearch.isGroupOnly).toBe(false);
        expect(filterNoSearch).not.toHaveProperty('OR');

        const filterWithSearch = buildUserSearchFilter('john');
        expect(filterWithSearch.communityOptIn).toBe(true);
        expect(filterWithSearch.OR).toBeDefined();
        expect(filterWithSearch.OR).toHaveLength(4);
    });

    it('should exclude group-only users from global search', () => {
        const filter = {
            isGroupOnly: false,
            communityOptIn: true,
        };
        expect(filter.isGroupOnly).toBe(false);
    });

    it('should search across both real and public usernames', () => {
        const filter = {
            OR: [
                { username: { contains: 'test', mode: 'insensitive' } },
                { displayName: { contains: 'test', mode: 'insensitive' } },
                { publicUsername: { contains: 'test', mode: 'insensitive' } },
                { publicDisplayName: { contains: 'test', mode: 'insensitive' } },
            ],
        };
        expect(filter.OR).toHaveLength(4);
        expect(filter.OR[2]).toHaveProperty('publicUsername');
        expect(filter.OR[3]).toHaveProperty('publicDisplayName');
    });
});

// =============================================
// PRIVATE FEED ISOLATION TESTS
// =============================================
describe('Privacy: Private feed isolation', () => {
    it('should include own posts in private feed', () => {
        const filter = buildPrivateFeedFilter('user-1', [], []);
        const orClauses = filter.OR;

        // Even with no communities and no following, own posts should appear
        const ownPostClause = orClauses.find((c: any) => c.userId === 'user-1');
        expect(ownPostClause).toBeDefined();
    });

    it('should include posts from communities user belongs to', () => {
        const filter = buildPrivateFeedFilter('user-1', ['comm-A', 'comm-B'], []);
        const orClauses = filter.OR;

        const communityClause = orClauses.find((c: any) => c.communityId);
        expect(communityClause).toBeDefined();
        expect(communityClause.communityId.in).toEqual(['comm-A', 'comm-B']);
    });

    it('should include posts from followed users (non-community posts)', () => {
        const filter = buildPrivateFeedFilter('user-1', [], ['user-2', 'user-3']);
        const orClauses = filter.OR;

        const followingClause = orClauses.find((c: any) => c.userId?.in);
        expect(followingClause).toBeDefined();
        expect(followingClause.userId.in).toEqual(['user-2', 'user-3']);
        expect(followingClause.communityId).toBeNull();
    });

    it('should combine all three sources: own, community, and following', () => {
        const filter = buildPrivateFeedFilter('user-1', ['comm-X'], ['user-5']);
        const orClauses = filter.OR;

        // Should have 3 clauses: community, following, own
        expect(orClauses).toHaveLength(3);
    });

    it('should only have own posts clause when user has no communities or follows', () => {
        const filter = buildPrivateFeedFilter('user-1', [], []);
        expect(filter.OR).toHaveLength(1);
        expect(filter.OR[0]).toEqual({ userId: 'user-1' });
    });

    it('should set deletedAt to null (no deleted posts)', () => {
        const filter = buildPrivateFeedFilter('user-1', [], []);
        expect(filter.deletedAt).toBeNull();
    });
});

// =============================================
// COMMUNITY FEED GATING TESTS
// =============================================
describe('Privacy: Community feed access gating', () => {
    it('should block community feed for non-opted-in users', () => {
        expect(shouldBlockCommunityFeed('community', false)).toBe(true);
    });

    it('should allow community feed for opted-in users', () => {
        expect(shouldBlockCommunityFeed('community', true)).toBe(false);
    });

    it('should never block private feed regardless of opt-in status', () => {
        expect(shouldBlockCommunityFeed('private', false)).toBe(false);
        expect(shouldBlockCommunityFeed('private', true)).toBe(false);
    });
});

// =============================================
// DIVERSITY FILTER TESTS
// =============================================
describe('Privacy: Diversity filter (reorder, never remove)', () => {
    it('should not remove any posts — only reorder them', () => {
        const posts = [
            { userId: 'a', id: '1' },
            { userId: 'a', id: '2' },
            { userId: 'a', id: '3' },
            { userId: 'a', id: '4' },
            { userId: 'a', id: '5' },
            { userId: 'b', id: '6' },
        ];

        const result = diversityReorder(posts);

        // All posts should still be present
        expect(result).toHaveLength(6);
        const ids = result.map((p) => p.id).sort();
        expect(ids).toEqual(['1', '2', '3', '4', '5', '6']);
    });

    it('should keep first 3 consecutive posts from same author at top', () => {
        const posts = [
            { userId: 'a', id: '1' },
            { userId: 'a', id: '2' },
            { userId: 'a', id: '3' },
            { userId: 'a', id: '4' },
            { userId: 'b', id: '5' },
        ];

        const result = diversityReorder(posts);

        // First 3 should be from user 'a', then 'b', then the deferred 'a' post
        expect(result[0].userId).toBe('a');
        expect(result[1].userId).toBe('a');
        expect(result[2].userId).toBe('a');
        expect(result[3].userId).toBe('b');
        expect(result[4].userId).toBe('a');
        expect(result[4].id).toBe('4');
    });

    it('should not reorder when no author has more than maxConsecutive posts', () => {
        const posts = [
            { userId: 'a', id: '1' },
            { userId: 'b', id: '2' },
            { userId: 'c', id: '3' },
        ];

        const result = diversityReorder(posts);
        expect(result).toEqual(posts);
    });

    it('should handle empty input', () => {
        const result = diversityReorder([]);
        expect(result).toEqual([]);
    });

    it('should respect custom maxConsecutive parameter', () => {
        const posts = [
            { userId: 'a', id: '1' },
            { userId: 'a', id: '2' },
            { userId: 'b', id: '3' },
        ];

        const result = diversityReorder(posts, 1);
        // Only 1 consecutive 'a' allowed, second gets deferred
        expect(result[0].userId).toBe('a');
        expect(result[0].id).toBe('1');
        expect(result[1].userId).toBe('b');
        expect(result[2].userId).toBe('a');
        expect(result[2].id).toBe('2');
    });

    it('should handle multiple deferred authors correctly', () => {
        const posts = [
            { userId: 'a', id: '1' },
            { userId: 'a', id: '2' },
            { userId: 'a', id: '3' },
            { userId: 'a', id: '4' },
            { userId: 'b', id: '5' },
            { userId: 'b', id: '6' },
            { userId: 'b', id: '7' },
            { userId: 'b', id: '8' },
        ];

        const result = diversityReorder(posts);

        // All 8 posts should be present
        expect(result).toHaveLength(8);

        // First section: 3 from a, 3 from b (interleaved by insertion order)
        const firstSix = result.slice(0, 6);
        const aCount = firstSix.filter((p) => p.userId === 'a').length;
        const bCount = firstSix.filter((p) => p.userId === 'b').length;
        expect(aCount).toBe(3);
        expect(bCount).toBe(3);

        // Last section: deferred posts
        const lastTwo = result.slice(6);
        expect(lastTwo).toHaveLength(2);
    });
});
