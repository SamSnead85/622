// API Configuration
// This file handles the API URL based on environment

const PRODUCTION_API = 'https://0g-server.up.railway.app';

const getApiUrl = () => {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl) return envUrl;

    // In production, always use the production API — never fall back to localhost
    if (process.env.NODE_ENV === 'production') return PRODUCTION_API;

    // Development fallback
    return 'http://localhost:5180';
};

export const API_URL = getApiUrl();

export const API_ENDPOINTS = {
    // Auth
    login: `${API_URL}/api/v1/auth/login`,
    signup: `${API_URL}/api/v1/auth/signup`,
    logout: `${API_URL}/api/v1/auth/logout`,
    me: `${API_URL}/api/v1/auth/me`,
    refresh: `${API_URL}/api/v1/auth/refresh`,

    // Users
    users: `${API_URL}/api/v1/users`,
    profile: (username: string) => `${API_URL}/api/v1/users/${username}`,
    updateProfile: `${API_URL}/api/v1/users/profile`,
    follow: (userId: string) => `${API_URL}/api/v1/users/${userId}/follow`,
    userPosts: (userId: string) => `${API_URL}/api/v1/users/${userId}/posts`,
    followers: (userId: string) => `${API_URL}/api/v1/users/${userId}/followers`,
    following: (userId: string) => `${API_URL}/api/v1/users/${userId}/following`,

    // Posts
    posts: `${API_URL}/api/v1/posts`,
    feed: `${API_URL}/api/v1/posts/feed`,
    post: (postId: string) => `${API_URL}/api/v1/posts/${postId}`,
    like: (postId: string) => `${API_URL}/api/v1/posts/${postId}/like`,
    save: (postId: string) => `${API_URL}/api/v1/posts/${postId}/save`,
    savedPosts: `${API_URL}/api/v1/posts/saved`,
    comments: (postId: string) => `${API_URL}/api/v1/posts/${postId}/comments`,

    // Search
    search: `${API_URL}/api/v1/search`,

    // Communities
    communities: `${API_URL}/api/v1/communities`,
    community: (communityId: string) => `${API_URL}/api/v1/communities/${communityId}`,

    // Messages
    conversations: `${API_URL}/api/v1/messages/conversations`,
    messages: (conversationId: string) => `${API_URL}/api/v1/messages/conversations/${conversationId}`,

    // Moments (Stories)
    moments: `${API_URL}/api/v1/moments`,
    momentsFeed: `${API_URL}/api/v1/moments/feed`,
    moment: (momentId: string) => `${API_URL}/api/v1/moments/${momentId}`,
    momentView: (momentId: string) => `${API_URL}/api/v1/moments/${momentId}/view`,

    // Journeys (Short-form video)
    journeys: `${API_URL}/api/v1/journeys`,
    journeysFeed: `${API_URL}/api/v1/journeys/feed`,
    journey: (journeyId: string) => `${API_URL}/api/v1/journeys/${journeyId}`,
    journeyLike: (journeyId: string) => `${API_URL}/api/v1/journeys/${journeyId}/like`,

    // Notifications
    notifications: `${API_URL}/api/v1/notifications`,
    notificationRead: (notificationId: string) => `${API_URL}/api/v1/notifications/${notificationId}/read`,
    notificationsReadAll: `${API_URL}/api/v1/notifications/read-all`,

    // Live Streaming
    livestreams: `${API_URL}/api/v1/livestream`,
    livestreamActive: `${API_URL}/api/v1/livestream/active`,
    livestreamCreate: `${API_URL}/api/v1/livestream/create`,

    // Upload
    upload: {
        avatar: `${API_URL}/api/v1/upload/avatar`,
        cover: `${API_URL}/api/v1/upload/cover`,
        post: `${API_URL}/api/v1/upload/post`,
        moment: `${API_URL}/api/v1/upload/moment`,
        message: `${API_URL}/api/v1/upload/message`,
        journey: `${API_URL}/api/v1/upload/journey`,
    },

    // Health check
    health: `${API_URL}/health`,
};

// ============================================
// API RESPONSE WRAPPER
// Clean separation between response metadata and payload data
// ============================================
export interface ApiResponse<T = any> {
    ok: boolean;
    status: number;
    data: T;
    json(): Promise<T>; // Backward-compat shim for callers that still call .json()
    [key: string]: any; // Dynamic properties spread via Object.assign for backward compat
}

// Default timeout for API requests (30 seconds)
const API_TIMEOUT_MS = 30_000;

// Delay helper for retry logic
const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

// Core fetch logic (single attempt)
async function _doFetch(
    url: string,
    options: RequestInit,
    headers: HeadersInit,
): Promise<ApiResponse> {
    // AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    // If the caller already provided a signal, chain them so either can abort
    const callerSignal = options.signal;
    if (callerSignal) {
        callerSignal.addEventListener('abort', () => controller.abort());
    }

    try {
        const res = await fetch(url, {
            ...options,
            headers,
            credentials: 'include',
            signal: controller.signal,
        });

        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await res.json();

            if (!res.ok) {
                const err = new Error(data?.error || `API error: ${res.status}`);
                (err as any).status = res.status;
                (err as any).data = data;
                throw err;
            }

            // Return a clean wrapper — never mutate the parsed data object
            const wrapper: ApiResponse = {
                ok: res.ok,
                status: res.status,
                data,
                json: () => Promise.resolve(data),
            };

            // Spread data properties onto wrapper for backward compatibility
            // (many callers access response.posts, response.users, etc. directly)
            return Object.assign(wrapper, data);
        }

        if (!res.ok) {
            throw new Error(`API error: ${res.status}`);
        }

        return {
            ok: res.ok,
            status: res.status,
            data: res,
            json: () => res.json(),
        } as ApiResponse;
    } catch (err: unknown) {
        // Convert AbortError from timeout into a friendlier message
        if (err instanceof DOMException && err.name === 'AbortError') {
            throw new Error(`Request timed out after ${API_TIMEOUT_MS / 1000}s`);
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}

// API fetch helper with auth, 30s timeout, and single retry on 5xx
export const apiFetch = async (
    url: string,
    options: RequestInit = {}
): Promise<ApiResponse> => {
    const token = typeof window !== 'undefined'
        ? localStorage.getItem('0g_token')
        : null;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    try {
        return await _doFetch(url, options, headers);
    } catch (err: unknown) {
        // Retry once on 5xx server errors (with 1s delay)
        const status = (err as any)?.status;
        if (typeof status === 'number' && status >= 500 && status < 600) {
            await delay(1000);
            return _doFetch(url, options, headers);
        }
        throw err;
    }
};

// Typed API helpers
export const api = {
    get: (url: string) => apiFetch(url, { method: 'GET' }),
    post: (url: string, data: unknown) => apiFetch(url, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    put: (url: string, data: unknown) => apiFetch(url, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (url: string) => apiFetch(url, { method: 'DELETE' }),
};

// File upload helper (multipart/form-data)
export const apiUpload = async (
    url: string,
    file: File,
    onProgress?: (progress: number) => void
): Promise<{ url: string; key?: string; type?: string; size?: number }> => {
    const token = typeof window !== 'undefined'
        ? localStorage.getItem('0g_token')
        : null;

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('file', file);

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable && onProgress) {
                const progress = Math.round((e.loaded / e.total) * 100);
                onProgress(progress);
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const result = JSON.parse(xhr.responseText);
                    resolve(result);
                } catch {
                    reject(new Error('Invalid response'));
                }
            } else {
                try {
                    const error = JSON.parse(xhr.responseText);
                    reject(new Error(error.error || 'Upload failed'));
                } catch {
                    reject(new Error('Upload failed'));
                }
            }
        });

        xhr.addEventListener('error', () => {
            reject(new Error('Network error'));
        });
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

        xhr.open('POST', url);
        if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        xhr.withCredentials = true;
        xhr.send(formData);
    });
};
