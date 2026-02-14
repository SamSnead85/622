// ============================================
// Mobile API Layer
// Handles all API communication with the backend
// Uses SecureStore for token persistence
// ============================================

import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = '0g_token';
const REQUEST_TIMEOUT_MS = 20_000;

// ============================================
// Dev-only logging (replaces bare console.log)
// ============================================
function devLog(...args: unknown[]): void {
    if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[api]', ...args);
    }
}
function devWarn(...args: unknown[]): void {
    if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[api]', ...args);
    }
}
function devError(...args: unknown[]): void {
    if (__DEV__) {
        // eslint-disable-next-line no-console
        console.error('[api]', ...args);
    }
}

// ============================================
// Request Deduplication
// Prevents identical GET requests from firing concurrently
// ============================================
const inflightRequests = new Map<string, { promise: Promise<unknown>; timestamp: number }>();

const INFLIGHT_TTL_MS = 30_000; // 30s TTL for stale entries
const INFLIGHT_MAX_SIZE = 100;  // Safety valve — clear all if exceeded

function cleanupInflight(): void {
    // Safety valve: if map grows too large, clear everything
    if (inflightRequests.size > INFLIGHT_MAX_SIZE) {
        inflightRequests.clear();
        return;
    }
    // Remove entries older than TTL
    const now = Date.now();
    for (const [key, entry] of inflightRequests) {
        if (now - entry.timestamp > INFLIGHT_TTL_MS) {
            inflightRequests.delete(key);
        }
    }
}

function getDedupeKey(url: string, method: string): string | null {
    // Only dedupe GET requests
    if (method && method.toUpperCase() !== 'GET') return null;
    return url;
}

// ============================================
// Response Cache (in-memory, GET only)
// ============================================
const DEFAULT_CACHE_TTL_MS = 30_000; // 30 seconds
const CACHE_MAX_SIZE = 200;

interface CacheEntry<T = unknown> {
    data: T;
    expiresAt: number;
}

const responseCache = new Map<string, CacheEntry>();

function getCached<T>(key: string): T | undefined {
    const entry = responseCache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
        responseCache.delete(key);
        return undefined;
    }
    return entry.data as T;
}

function setCache<T>(key: string, data: T, ttlMs: number = DEFAULT_CACHE_TTL_MS): void {
    // Evict oldest entries when cache is full
    if (responseCache.size >= CACHE_MAX_SIZE) {
        const firstKey = responseCache.keys().next().value;
        if (firstKey !== undefined) responseCache.delete(firstKey);
    }
    responseCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/** Clear the entire response cache, or a single key. */
export function clearApiCache(key?: string): void {
    if (key) {
        responseCache.delete(key);
    } else {
        responseCache.clear();
    }
}

// API URL configuration
// Set EXPO_PUBLIC_API_URL in .env for local dev (e.g., http://192.168.1.100:5180)
// Production builds MUST have this set at build time.
const PRODUCTION_API = 'https://caravanserver-production-d7da.up.railway.app';
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
        devError('Failed to save token:', e);
    }
};

export const removeToken = async (): Promise<void> => {
    try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (e) {
        devError('Failed to remove token:', e);
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
// JWT Token Expiry Check
// Decodes the JWT payload (without verifying) to
// check if the token has expired locally. This avoids
// making a network request with an obviously expired token.
// ============================================

function decodeJwtPayload(token: string): { exp?: number } | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        // Base64url decode the payload
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

/**
 * Check if a JWT token is expired.
 * Returns true if the token has an `exp` claim that is in the past.
 * Includes a 60-second buffer to account for clock skew.
 */
export function isTokenExpired(token: string): boolean {
    const payload = decodeJwtPayload(token);
    if (!payload?.exp) return false; // No exp claim — assume valid
    const nowSeconds = Math.floor(Date.now() / 1000);
    return payload.exp < nowSeconds + 60; // Proactively expire 60s early to trigger refresh before actual expiry
}

/**
 * Callback invoked when a session expires and refresh fails.
 * Set by the auth store to redirect to login.
 */
let _onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: () => void): void {
    _onSessionExpired = handler;
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
    let didTimeout = false;
    const timeoutId = setTimeout(() => {
        didTimeout = true;
        controller.abort();
    }, timeoutMs);

    // If caller provided a signal, chain it so caller can cancel too
    const callerSignal = options.signal;
    if (callerSignal) {
        if (callerSignal.aborted) {
            clearTimeout(timeoutId);
            const err = new Error('Request was cancelled');
            err.name = 'AbortError';
            throw err;
        }
        callerSignal.addEventListener('abort', () => controller.abort());
    }

    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        return res;
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            if (didTimeout) {
                throw new Error('Request timed out. Please check your connection and try again.');
            }
            // Caller-initiated abort — re-throw as AbortError so callers can detect it
            const abortErr = new Error('Request was cancelled');
            abortErr.name = 'AbortError';
            throw abortErr;
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
let refreshPromise: Promise<string | null> | null = null;

async function attemptTokenRefresh(): Promise<string | null> {
    // If a refresh is already in progress, wait for it instead of returning null
    if (isRefreshing && refreshPromise) {
        return refreshPromise;
    }
    isRefreshing = true;

    refreshPromise = (async () => {
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
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

// ============================================
// Exponential Backoff Retry for Network Errors
// ============================================

const MAX_RETRIES = 1;
const RETRY_DELAYS = [1500]; // Single retry after 1.5s

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

/** Extended options for apiFetch. Superset of RequestInit. */
export interface ApiFetchOptions extends RequestInit {
    /** Set to `false` to bypass the response cache for this request. */
    cache?: boolean;
    /** Custom cache TTL in milliseconds (default 30 000). */
    cacheTtl?: number;
}

export const apiFetch = async <T = unknown>(
    endpoint: string,
    options: ApiFetchOptions = {},
    _isRetry: boolean = false
): Promise<T> => {
    const { cache: useCache = true, cacheTtl, ...fetchOptions } = options;

    let token = await getToken();

    // Pre-check: if token looks expired locally, try refreshing first.
    // If refresh fails, still proceed with the existing token — let the
    // server make the final decision. This prevents aggressive logouts
    // when the refresh endpoint is temporarily unreachable.
    if (token && isTokenExpired(token) && !_isRetry) {
        devWarn('Token expired locally, attempting refresh before request');
        const newToken = await attemptTokenRefresh();
        if (newToken) {
            token = newToken;
        }
        // If refresh failed, proceed with the old token anyway.
        // The server will return 401 if it's truly invalid, and the
        // retry logic below will handle it.
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((fetchOptions.headers as Record<string, string>) || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
    const method = fetchOptions.method || 'GET';
    const isGet = method.toUpperCase() === 'GET';

    // ---- Response cache (GET only) ----
    if (isGet && useCache && !_isRetry) {
        const cached = getCached<T>(url);
        if (cached !== undefined) {
            devLog('cache hit:', endpoint);
            return cached;
        }
    }

    // ---- Deduplicate concurrent identical GET requests ----
    const dedupeKey = getDedupeKey(url, method);
    cleanupInflight();
    if (dedupeKey && inflightRequests.has(dedupeKey) && !_isRetry) {
        devLog('dedup hit:', endpoint);
        return inflightRequests.get(dedupeKey)!.promise as Promise<T>;
    }

    const requestPromise = (async () => {
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (attempt > 0) {
            devWarn(`retry ${attempt}/${MAX_RETRIES} for ${endpoint}`);
        }
        try {
            const res = await fetchWithTimeout(url, {
                ...fetchOptions,
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
                        // Refresh failed — clear token and notify session expired
                        await removeToken();
                        if (_onSessionExpired) _onSessionExpired();
                    }

                    const err = new Error(data?.error || `API error: ${res.status}`) as Error & { status: number; data: unknown };
                    err.status = res.status;
                    err.data = data;
                    throw err;
                }

                // Store successful GET responses in cache
                if (isGet && useCache) {
                    setCache(url, data, cacheTtl);
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
                    if (_onSessionExpired) _onSessionExpired();
                }
                throw new Error(`API error: ${res.status}`);
            }

            return res as unknown as T;
        } catch (error) {
            lastError = error;

            // Only retry on network errors, not on API errors
            if (isRetryableError(error) && attempt < MAX_RETRIES) {
                devWarn(`retryable error on attempt ${attempt}:`, (error as Error).message);
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

    // Store inflight promise for deduplication with timestamp
    if (dedupeKey) {
        inflightRequests.set(dedupeKey, { promise: requestPromise, timestamp: Date.now() });
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

    let data: Record<string, unknown> | null = null;
    try {
        data = await res.json();
    } catch {
        if (!res.ok) throw new Error(`Upload failed (HTTP ${res.status})`);
        throw new Error('Invalid server response');
    }
    if (!res.ok) {
        throw new Error((data as Record<string, unknown>)?.error as string || `Upload failed (HTTP ${res.status})`);
    }
    return data as { url: string; key?: string; type?: string; size?: number };
};

// ============================================
// Connection Quality Detection
// ============================================

export type ConnectionQuality = 'good' | 'slow' | 'offline';

const PING_TIMEOUT_MS = 5_000;
const SLOW_THRESHOLD_MS = 1_500;

/**
 * Ping the API server and return the round-trip time in ms.
 * Returns `Infinity` if the server is unreachable.
 */
export async function pingApi(): Promise<number> {
    const start = Date.now();
    try {
        await fetchWithTimeout(
            `${API_URL}/api/v1/auth/me`,
            { method: 'HEAD', headers: {} },
            PING_TIMEOUT_MS,
        );
        return Date.now() - start;
    } catch {
        return Infinity;
    }
}

/**
 * Measure connection quality to the API server.
 * - `'good'`    — response < 1 500 ms
 * - `'slow'`    — response >= 1 500 ms
 * - `'offline'` — no response / timeout
 */
export async function getConnectionQuality(): Promise<ConnectionQuality> {
    const rtt = await pingApi();
    if (rtt === Infinity) return 'offline';
    if (rtt >= SLOW_THRESHOLD_MS) return 'slow';
    return 'good';
}

// ============================================
// Batch Request Support
// ============================================

export interface BatchResult<T = unknown> {
    status: 'fulfilled' | 'rejected';
    value?: T;
    reason?: unknown;
}

/**
 * Fetch multiple endpoints in parallel.
 * Returns a record keyed by endpoint with the settled result for each.
 *
 * @example
 * const results = await apiFetchBatch([API.feed, API.notifications]);
 * if (results[API.feed].status === 'fulfilled') { ... }
 */
export async function apiFetchBatch<T = unknown>(
    endpoints: string[],
    options?: ApiFetchOptions,
): Promise<Record<string, BatchResult<T>>> {
    const settled = await Promise.allSettled(
        endpoints.map((ep) => apiFetch<T>(ep, options)),
    );

    const results: Record<string, BatchResult<T>> = {};
    endpoints.forEach((ep, i) => {
        const outcome = settled[i]!;
        if (outcome.status === 'fulfilled') {
            results[ep] = { status: 'fulfilled', value: outcome.value };
        } else {
            results[ep] = { status: 'rejected', reason: outcome.reason };
        }
    });

    return results;
}

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
    sendVerificationEmail: '/api/v1/auth/send-verification-email',
    verifyEmail: '/api/v1/auth/verify-email',

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
    blockUser: (userId: string) => `/api/v1/users/${userId}/block`,
    reportUser: (userId: string) => `/api/v1/users/${userId}/report`,
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
    sendMessage: (conversationId: string) => `/api/v1/messages/conversations/${conversationId}/messages`,

    // Feed Preferences (Algorithm Mixer)
    feedPreferences: '/api/v1/users/preferences/feed',

    // Onboarding
    onboardingComplete: '/api/v1/auth/onboarding-complete',

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
    momentReact: (id: string) => `/api/v1/moments/${id}/react`,
    momentViewers: (id: string) => `/api/v1/moments/${id}/viewers`,
    uploadMoment: '/api/v1/upload/moment',

    // Users — social graph
    mutualFriends: (userId: string) => `/api/v1/users/${userId}/mutual-friends`,

    // Connections (Degrees of Connection)
    connections: '/api/v1/connections',
    connectionRequests: '/api/v1/connections/requests',
    connectionRequest: (userId: string) => `/api/v1/connections/request/${userId}`,
    connectionAccept: (requestId: string) => `/api/v1/connections/accept/${requestId}`,
    connectionDecline: (requestId: string) => `/api/v1/connections/decline/${requestId}`,
    connectionRemove: (userId: string) => `/api/v1/connections/${userId}`,
    connectionDegree: (userId: string) => `/api/v1/connections/degree/${userId}`,
    connectionMutual: (userId: string) => `/api/v1/connections/mutual/${userId}`,
    connectionSuggestions: '/api/v1/connections/suggestions',
    connectionStats: '/api/v1/connections/stats',

    // Analytics
    analyticsOverview: '/api/v1/analytics/overview',
    analyticsPosts: '/api/v1/analytics/posts',
    analyticsAudience: '/api/v1/analytics/audience',
    analyticsTopContent: '/api/v1/analytics/top-content',

    // Data Export
    accountExport: '/api/v1/account/export',

    // Reports
    submitReport: '/api/v1/reports',

    // Livestream / Campfire
    livestreamActive: '/api/v1/livestream/active',
    livestreamVods: '/api/v1/livestream/vods',
    livestreamCreate: '/api/v1/livestream/create',
    livestream: (id: string) => `/api/v1/livestream/${id}`,
    livestreamEnd: (id: string) => `/api/v1/livestream/${id}/end`,

    // Audio Spaces
    spacesActive: '/api/v1/spaces/active',
    spacesCreate: '/api/v1/spaces/create',
    space: (id: string) => `/api/v1/spaces/${id}`,
    spaceJoin: (id: string) => `/api/v1/spaces/${id}/join`,
    spaceLeave: (id: string) => `/api/v1/spaces/${id}/leave`,
    spaceRequestSpeak: (id: string) => `/api/v1/spaces/${id}/request-speak`,
    spaceApproveSpeaker: (id: string) => `/api/v1/spaces/${id}/approve-speaker`,
    spaceEnd: (id: string) => `/api/v1/spaces/${id}/end`,

    // Social Platform Integrations
    socialPlatforms: '/api/v1/social/platforms',
    socialAccounts: '/api/v1/social/accounts',
    socialAccount: (id: string) => `/api/v1/social/accounts/${id}`,
    socialAccountSync: (id: string) => `/api/v1/social/accounts/${id}/sync`,
    socialCrossPost: '/api/v1/social/crosspost',
    socialCrossPostBatch: '/api/v1/social/crosspost/batch',
    socialCrossPostInfo: (postId: string) => `/api/v1/social/crosspost/${postId}`,
    socialFeed: '/api/v1/social/feed',
    socialStats: '/api/v1/social/stats',
};
