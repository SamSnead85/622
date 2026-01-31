// API Configuration
// This file handles the API URL based on environment

const getApiUrl = () => {
    // In browser, use the environment variable
    if (typeof window !== 'undefined') {
        return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5180';
    }
    // On server-side, use the environment variable
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5180';
};

export const API_URL = getApiUrl();

export const API_ENDPOINTS = {
    // Auth
    login: `${API_URL}/api/v1/auth/login`,
    signup: `${API_URL}/api/v1/auth/signup`,
    logout: `${API_URL}/api/v1/auth/logout`,
    me: `${API_URL}/api/v1/auth/me`,

    // Users
    users: `${API_URL}/api/v1/users`,
    profile: (username: string) => `${API_URL}/api/v1/users/${username}`,
    follow: (userId: string) => `${API_URL}/api/v1/users/${userId}/follow`,

    // Posts
    posts: `${API_URL}/api/v1/posts`,
    post: (postId: string) => `${API_URL}/api/v1/posts/${postId}`,
    like: (postId: string) => `${API_URL}/api/v1/posts/${postId}/like`,
    comments: (postId: string) => `${API_URL}/api/v1/posts/${postId}/comments`,

    // Communities
    communities: `${API_URL}/api/v1/communities`,
    community: (communityId: string) => `${API_URL}/api/v1/communities/${communityId}`,

    // Messages
    conversations: `${API_URL}/api/v1/messages/conversations`,
    messages: (conversationId: string) => `${API_URL}/api/v1/messages/conversations/${conversationId}`,

    // Health check
    health: `${API_URL}/health`,
};

// API fetch helper with auth
export const apiFetch = async (
    url: string,
    options: RequestInit = {}
): Promise<Response> => {
    const token = typeof window !== 'undefined'
        ? localStorage.getItem('six22_token')
        : null;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, {
        ...options,
        headers,
        credentials: 'include',
    });
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
