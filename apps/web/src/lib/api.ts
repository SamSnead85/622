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
    updateProfile: `${API_URL}/api/v1/users/profile`,
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

    // Upload
    upload: {
        avatar: `${API_URL}/api/v1/upload/avatar`,
        cover: `${API_URL}/api/v1/upload/cover`,
        post: `${API_URL}/api/v1/upload/post`,
        moment: `${API_URL}/api/v1/upload/moment`,
        message: `${API_URL}/api/v1/upload/message`,
    },

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

// File upload helper (multipart/form-data)
export const apiUpload = async (
    url: string,
    file: File,
    onProgress?: (progress: number) => void
): Promise<{ url: string; key?: string; type?: string; size?: number }> => {
    const token = typeof window !== 'undefined'
        ? localStorage.getItem('six22_token')
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

        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

        xhr.open('POST', url);
        if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        xhr.withCredentials = true;
        xhr.send(formData);
    });
};
