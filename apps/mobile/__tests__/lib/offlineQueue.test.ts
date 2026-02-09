// ============================================
// Offline Queue — Unit Tests
// Tests queue management and persistence
// ============================================

import {
    enqueue,
    getQueue,
    getPendingCount,
    clearQueue,
} from '../../lib/offlineQueue';

// ============================================
// Mocks
// ============================================

const mockStorage: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => {
        mockStorage[key] = value;
        return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
        delete mockStorage[key];
        return Promise.resolve();
    }),
}));

jest.mock('@react-native-community/netinfo', () => ({
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(() =>
        Promise.resolve({ isConnected: true, isInternetReachable: true })
    ),
}));

jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn(() => Promise.resolve(null)),
    setItemAsync: jest.fn(() => Promise.resolve()),
    deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../lib/api', () => ({
    apiFetch: jest.fn(),
    apiUpload: jest.fn(),
    API: {
        messages: (id: string) => `/api/v1/messages/conversations/${id}`,
        posts: '/api/v1/posts',
        like: (id: string) => `/api/v1/posts/${id}/like`,
        save: (id: string) => `/api/v1/posts/${id}/save`,
        follow: (id: string) => `/api/v1/users/${id}/follow`,
        communityPollVote: (cid: string, pid: string) =>
            `/api/v1/communities/${cid}/polls/${pid}/vote`,
        proposalVote: (id: string) => `/api/v1/governance/proposals/${id}/vote`,
        moments: '/api/v1/moments',
        uploadPost: '/api/v1/upload/post',
        uploadMoment: '/api/v1/upload/moment',
    },
}));

const AsyncStorage = require('@react-native-async-storage/async-storage');

// ============================================
// Helpers
// ============================================

function clearMockStorage() {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
}

// ============================================
// Tests
// ============================================

describe('Offline Queue', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        clearMockStorage();
    });

    // ------------------------------------------
    // enqueue()
    // ------------------------------------------
    describe('enqueue', () => {
        it('adds an action to the queue', async () => {
            const id = await enqueue('like_post', { postId: 'post-1' });

            expect(id).toBeTruthy();
            expect(id).toMatch(/^offline_/);

            const queue = await getQueue();
            expect(queue).toHaveLength(1);
            expect(queue[0].type).toBe('like_post');
            expect(queue[0].payload).toEqual({ postId: 'post-1' });
            expect(queue[0].retries).toBe(0);
            expect(queue[0].maxRetries).toBe(5);
        });

        it('appends to existing queue items', async () => {
            await enqueue('like_post', { postId: 'post-1' });
            await enqueue('send_message', { conversationId: 'conv-1', content: 'Hello' });
            await enqueue('follow_user', { userId: 'user-1' });

            const queue = await getQueue();
            expect(queue).toHaveLength(3);
            expect(queue[0].type).toBe('like_post');
            expect(queue[1].type).toBe('send_message');
            expect(queue[2].type).toBe('follow_user');
        });

        it('generates unique IDs for each action', async () => {
            const id1 = await enqueue('like_post', { postId: 'p1' });
            const id2 = await enqueue('like_post', { postId: 'p2' });

            expect(id1).not.toBe(id2);
        });

        it('includes createdAt timestamp', async () => {
            const before = new Date().toISOString();
            await enqueue('like_post', { postId: 'post-1' });
            const after = new Date().toISOString();

            const queue = await getQueue();
            expect(queue[0].createdAt).toBeTruthy();
            expect(queue[0].createdAt >= before).toBe(true);
            expect(queue[0].createdAt <= after).toBe(true);
        });
    });

    // ------------------------------------------
    // getQueue()
    // ------------------------------------------
    describe('getQueue', () => {
        it('returns empty array when no items queued', async () => {
            const queue = await getQueue();
            expect(queue).toEqual([]);
        });

        it('returns queued items from storage', async () => {
            await enqueue('create_post', { content: 'Test post' });
            await enqueue('like_post', { postId: 'post-2' });

            const queue = await getQueue();
            expect(queue).toHaveLength(2);
        });
    });

    // ------------------------------------------
    // getPendingCount()
    // ------------------------------------------
    describe('getPendingCount', () => {
        it('returns 0 when queue is empty', async () => {
            const count = await getPendingCount();
            expect(count).toBe(0);
        });

        it('returns correct count after enqueuing', async () => {
            await enqueue('like_post', { postId: 'p1' });
            await enqueue('like_post', { postId: 'p2' });

            const count = await getPendingCount();
            expect(count).toBe(2);
        });

        it('updates count after more items are added', async () => {
            await enqueue('like_post', { postId: 'p1' });
            expect(await getPendingCount()).toBe(1);

            await enqueue('save_post', { postId: 'p2' });
            expect(await getPendingCount()).toBe(2);

            await enqueue('follow_user', { userId: 'u1' });
            expect(await getPendingCount()).toBe(3);
        });
    });

    // ------------------------------------------
    // clearQueue()
    // ------------------------------------------
    describe('clearQueue', () => {
        it('empties the queue', async () => {
            await enqueue('like_post', { postId: 'p1' });
            await enqueue('send_message', { conversationId: 'c1', content: 'Hi' });

            expect(await getPendingCount()).toBe(2);

            await clearQueue();

            expect(await getPendingCount()).toBe(0);
            const queue = await getQueue();
            expect(queue).toEqual([]);
        });

        it('is safe to call on empty queue', async () => {
            await clearQueue();
            expect(await getPendingCount()).toBe(0);
        });
    });

    // ------------------------------------------
    // Persistence
    // ------------------------------------------
    describe('persistence', () => {
        it('persists queue to AsyncStorage on enqueue', async () => {
            await enqueue('like_post', { postId: 'post-1' });

            expect(AsyncStorage.setItem).toHaveBeenCalled();
            const callArgs = AsyncStorage.setItem.mock.calls[0];
            expect(callArgs[0]).toBe('@0g_offline_queue');

            const persisted = JSON.parse(callArgs[1]);
            expect(persisted).toHaveLength(1);
            expect(persisted[0].type).toBe('like_post');
        });

        it('reads queue from AsyncStorage', async () => {
            // Pre-populate storage
            const preloaded = [
                {
                    id: 'offline_pre_1',
                    type: 'like_post',
                    payload: { postId: 'pre-1' },
                    createdAt: '2025-01-01T00:00:00.000Z',
                    retries: 0,
                    maxRetries: 5,
                },
            ];
            mockStorage['@0g_offline_queue'] = JSON.stringify(preloaded);

            const queue = await getQueue();
            expect(queue).toHaveLength(1);
            expect(queue[0].id).toBe('offline_pre_1');
        });

        it('clears storage on clearQueue', async () => {
            await enqueue('like_post', { postId: 'p1' });
            await clearQueue();

            expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@0g_offline_queue');
        });
    });

    // ------------------------------------------
    // Queue action types
    // ------------------------------------------
    describe('supported action types', () => {
        it.each([
            ['send_message', { conversationId: 'c1', content: 'Hello' }],
            ['create_post', { content: 'New post' }],
            ['like_post', { postId: 'p1' }],
            ['unlike_post', { postId: 'p1' }],
            ['follow_user', { userId: 'u1' }],
            ['unfollow_user', { userId: 'u1' }],
            ['save_post', { postId: 'p1' }],
            ['unsave_post', { postId: 'p1' }],
            ['poll_vote', { communityId: 'c1', pollId: 'poll1', optionId: 'o1' }],
            ['proposal_vote', { proposalId: 'prop1', vote: 'FOR' }],
            ['create_moment', { mediaUri: 'file://photo.jpg' }],
        ] as const)('enqueues %s action', async (type, payload) => {
            await enqueue(type as any, payload);
            const queue = await getQueue();
            expect(queue).toHaveLength(1);
            expect(queue[0].type).toBe(type);
            expect(queue[0].payload).toEqual(payload);
        });
    });
});
