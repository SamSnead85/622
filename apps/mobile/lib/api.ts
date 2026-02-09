// ============================================
// Mobile API Layer
// Handles all API communication with the backend
// Uses SecureStore for token persistence
// ============================================

import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = '0g_token';
const REQUEST_TIMEOUT_MS = 15_000;

// ============================================
// Request Deduplication
// Prevents identical GET requests from firing concurrently
// ============================================
const inflightRequests = new Map<string, Promise<any>>();

function getDedupeKey(url: string, method: string): string | null {
    // Only dedupe GET requests
    if (method && method.toUpperCase() !== 'GET') return null;
    return url;
}

// API URL configuration
// Set EXPO_PUBLIC_API_URL in .env for local dev (e.g., http://192.168.1.100:5180)
// Production builds MUST have this set at build time.
const PRODUCTION_API = 'https://0g-server.up.railway.app';
export const API_URL = process.env.EXPO_PUBLIC_API_URL
    || (__DEV__ ? 'http://localhost:5180' : PRODUCTION_API);

// ============================================
// Token Management (SecureStore)
// ============================================

export const getToken = async (): Promise<string | null> => {
    try {
        return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
        return null;
    }
};

export const saveToken = async (token: string): Promise<void> => {
    try {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (e) {
        console.error('Failed to save token:', e);
    }
};

export const removeToken = async (): Promise<void> => {
    try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (e) {
        console.error('Failed to remove token:', e);
    }
};

// ============================================
// Error Utilities
// ============================================

export function isNetworkError(error: unknown): boolean {
    if (error instanceof TypeError) return true;
    if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        return msg.includes('network request failed') ||
            msg.includes('no internet') ||
            msg.includes('request timed out');
    }
    return false;
}

// ============================================
// Internal fetch with timeout
// ============================================

async function fetchWithTimeout(
    url: string,
    options: RequestInit & { signal?: AbortSignal },
    timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // If caller provided a signal, chain it
    if (options.signal) {
        options.signal.addEventListener('abort', () => controller.abort());
    }

    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        return res;
    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw new Error('Request timed out. Please check your connection and try again.');
        }
        // Network failure (no connection, DNS failure, etc.)
        throw new Error('No internet connection. Please check your network and try again.');
    } finally {
        clearTimeout(timeoutId);
    }
}

// ============================================
// Token refresh logic (prevents infinite loops)
// ============================================

let isRefreshing = false;

async function attemptTokenRefresh(): Promise<string | null> {
    if (isRefreshing) return null;
    isRefreshing = true;

    try {
        const token = await getToken();
        if (!token) return null;

        const url = `${API_URL}/api/v1/auth/refresh`;
        const res = await fetchWithTimeout(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });

        if (res.ok) {
            const data = await res.json();
            if (data.token) {
                await saveToken(data.token);
                return data.token;
            }
        }
        return null;
    } catch {
        return null;
    } finally {
        isRefreshing = false;
    }
}

// ============================================
// Exponential Backoff Retry for Network Errors
// ============================================

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // 1s, 2s, 4s

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
    // Only retry on network errors, not on API errors (4xx/5xx)
    if (error instanceof TypeError) return true;
    if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        return (
            msg.includes('network request failed') ||
            msg.includes('no internet') ||
            msg.includes('request timed out') ||
            msg.includes('no internet connection')
        );
    }
    return false;
}

// ============================================
// API Fetch Helper
// ============================================

export const apiFetch = async <T = any>(
    endpoint: string,
    options: RequestInit = {},
    _isRetry: boolean = false
): Promise<T> => {
    const token = await getToken();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
    const method = options.method || 'GET';

    // Deduplicate concurrent identical GET requests
    const dedupeKey = getDedupeKey(url, method);
    if (dedupeKey && inflightRequests.has(dedupeKey) && !_isRetry) {
        return inflightRequests.get(dedupeKey) as Promise<T>;
    }

    const requestPromise = (async () => {
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const res = await fetchWithTimeout(url, {
                ...options,
                headers,
            });

            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await res.json();

                if (!res.ok) {
                    // 401 — attempt token refresh once, then retry
                    if (res.status === 401 && !_isRetry) {
                        const newToken = await attemptTokenRefresh();
                        if (newToken) {
                            return apiFetch<T>(endpoint, options, true);
                        }
                        // Refresh failed — clear token (caller/store should redirect to login)
                        await removeToken();
                    }

                    const err: any = new Error(data?.error || `API error: ${res.status}`);
                    err.status = res.status;
                    err.data = data;
                    throw err;
                }
                return data as T;
            }

            if (!res.ok) {
                if (res.status === 401 && !_isRetry) {
                    const newToken = await attemptTokenRefresh();
                    if (newToken) {
                        return apiFetch<T>(endpoint, options, true);
                    }
                    await removeToken();
                }
                throw new Error(`API error: ${res.status}`);
            }

            return res as unknown as T;
        } catch (error) {
            lastError = error;

            // Only retry on network errors, not on API errors
            if (isRetryableError(error) && attempt < MAX_RETRIES) {
                await sleep(RETRY_DELAYS[attempt]!);
                continue;
            }

            // Not retryable or max retries reached — throw
            throw error;
        }
    }

    // Should not reach here, but TypeScript needs it
    throw lastError;
    })();

    // Store inflight promise for deduplication
    if (dedupeKey) {
        inflightRequests.set(dedupeKey, requestPromise);
        requestPromise.finally(() => {
            inflightRequests.delete(dedupeKey);
        });
    }

    return requestPromise;
};

// ============================================
// File Upload Helper
// ============================================

export const apiUpload = async (
    endpoint: string,
    fileUri: string,
    mimeType: string,
    fileName: string,
    onProgress?: (progress: number) => void
): Promise<{ url: string; key?: string; type?: string; size?: number }> => {
    const token = await getToken();
    const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

    const formData = new FormData();
    formData.append('file', {
        uri: fileUri,
        type: mimeType,
        name: fileName,
    } as any);

    const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            // Don't set Content-Type — let FormData set it with boundary
        },
        body: formData,
    }, 60_000); // 60s timeout for uploads

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data?.error || 'Upload failed');
    }
    return data;
};

// ============================================
// API Endpoints
// ============================================

export const API = {
    // Auth
    login: '/api/v1/auth/login',
    signup: '/api/v1/auth/signup',
    googleAuth: '/api/v1/auth/google',
    appleAuth: '/api/v1/auth/apple',
    me: '/api/v1/auth/me',
    refresh: '/api/v1/auth/refresh',

    // Posts & Feed
    feed: '/api/v1/posts/feed',
    posts: '/api/v1/posts',
    post: (id: string) => `/api/v1/posts/${id}`,
    like: (id: string) => `/api/v1/posts/${id}/like`,
    save: (id: string) => `/api/v1/posts/${id}/save`,
    savedPosts: '/api/v1/posts/saved',
    comments: (id: string) => `/api/v1/posts/${id}/comments`,
    commentLike: (postId: string, commentId: string) =>
        `/api/v1/posts/${postId}/comments/${commentId}/like`,
    reorder: '/api/v1/posts/reorder',
    report: (id: string) => `/api/v1/posts/${id}/report`,

    // Users & Profiles
    users: '/api/v1/users',
    userProfile: (username: string) => `/api/v1/users/${username}`,
    userPosts: (userId: string) => `/api/v1/users/${userId}/posts`,
    likedPosts: (userId: string) => `/api/v1/users/${userId}/liked`,
    updateProfile: '/api/v1/users/profile',
    checkUsername: '/api/v1/auth/check-username',
    follow: (userId: string) => `/api/v1/users/${userId}/follow`,
    communityOptIn: '/api/v1/users/community-opt-in',
    publicProfile: '/api/v1/users/public-profile',
    feedView: '/api/v1/users/feed-view',

    // Communities
    communities: '/api/v1/communities',
    community: (id: string) => `/api/v1/communities/${id}`,
    joinCommunity: (id: string) => `/api/v1/communities/${id}/join`,
    leaveCommunity: (id: string) => `/api/v1/communities/${id}/leave`,

    // Upload
    uploadPost: '/api/v1/upload/post',
    uploadAvatar: '/api/v1/upload/avatar',
    uploadCover: '/api/v1/upload/cover',

    // Search
    search: '/api/v1/search',
    trending: '/api/v1/search/trending',

    // Notifications
    notifications: '/api/v1/notifications',
    notificationRead: (id: string) => `/api/v1/notifications/${id}/read`,
    notificationsReadAll: '/api/v1/notifications/read-all',

    // Messages
    conversations: '/api/v1/messages/conversations',
    messages: (conversationId: string) => `/api/v1/messages/conversations/${conversationId}`,

    // Feed Preferences (Algorithm Mixer)
    feedPreferences: '/api/v1/users/preferences/feed',

    // Topics & Interests
    topics: '/api/v1/topics',
    userInterests: '/api/v1/topics/user/interests',
    updateInterest: (topicId: string) => `/api/v1/topics/user/interests/${topicId}`,

    // Push / Notification Preferences
    pushPreferences: '/api/v1/push/preferences',
    pushRegister: '/api/v1/push/register',

    // Community Management
    communityMembers: (id: string) => `/api/v1/communities/${id}/members`,
    communityMember: (id: string, userId: string) => `/api/v1/communities/${id}/members/${userId}`,
    communityPolls: (id: string) => `/api/v1/communities/${id}/polls`,
    communityPollVote: (id: string, pollId: string) => `/api/v1/communities/${id}/polls/${pollId}/vote`,
    communityFilters: (id: string) => `/api/v1/communities/${id}/filters`,
    communityAnalytics: (id: string) => `/api/v1/communities/${id}/analytics`,
    communityModeration: (id: string) => `/api/v1/communities/${id}/moderation`,

    // Governance
    proposals: (communityId: string) => `/api/v1/governance/${communityId}/proposals`,
    proposalVote: (proposalId: string) => `/api/v1/governance/proposals/${proposalId}/vote`,
    moderationLog: (communityId: string) => `/api/v1/governance/${communityId}/moderation-log`,

    // Moments / Stories
    moments: '/api/v1/moments',
    momentsFeed: '/api/v1/moments/feed',
    momentView: (id: string) => `/api/v1/moments/${id}/view`,
    momentViewers: (id: string) => `/api/v1/moments/${id}/viewers`,
    uploadMoment: '/api/v1/upload/moment',

    // Analytics
    analyticsOverview: '/api/v1/analytics/overview',
    analyticsPosts: '/api/v1/analytics/posts',
    analyticsAudience: '/api/v1/analytics/audience',
    analyticsTopContent: '/api/v1/analytics/top-content',

    // Data Export
    accountExport: '/api/v1/account/export',

    // Reports
    submitReport: '/api/v1/reports',
};
