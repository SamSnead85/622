// ============================================
// Mobile API Layer
// Handles all API communication with the backend
// Uses SecureStore for token persistence
// ============================================

import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = '0g_token';

// API URL configuration
// Set EXPO_PUBLIC_API_URL in your environment for production
// For local dev on simulator: http://localhost:5180
// For local dev on device: use your machine's IP (e.g., http://192.168.1.100:5180)
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5180';

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
// API Fetch Helper
// ============================================

export const apiFetch = async <T = any>(
    endpoint: string,
    options: RequestInit = {}
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

    const res = await fetch(url, {
        ...options,
        headers,
    });

    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (!res.ok) {
            const err: any = new Error(data?.error || `API error: ${res.status}`);
            err.status = res.status;
            err.data = data;
            throw err;
        }
        return data as T;
    }

    if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
    }

    return res as unknown as T;
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

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            // Don't set Content-Type — let FormData set it with boundary
        },
        body: formData,
    });

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
    me: '/api/v1/auth/me',

    // Posts & Feed
    feed: '/api/v1/posts/feed',
    posts: '/api/v1/posts',
    post: (id: string) => `/api/v1/posts/${id}`,
    like: (id: string) => `/api/v1/posts/${id}/like`,
    save: (id: string) => `/api/v1/posts/${id}/save`,
    comments: (id: string) => `/api/v1/posts/${id}/comments`,
    reorder: '/api/v1/posts/reorder',

    // Users & Profiles
    users: '/api/v1/users',
    userProfile: (username: string) => `/api/v1/users/${username}`,
    userPosts: (userId: string) => `/api/v1/users/${userId}/posts`,
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

    // Messages
    conversations: '/api/v1/messages/conversations',
    messages: (conversationId: string) => `/api/v1/messages/conversations/${conversationId}`,
};
