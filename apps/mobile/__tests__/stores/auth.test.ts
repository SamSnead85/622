// ============================================
// Auth Store — Unit Tests
// Tests Zustand auth store actions and state
// ============================================

import { act } from '@testing-library/react-native';
import { useAuthStore } from '../../stores/index';

// ============================================
// Mocks
// ============================================

jest.mock('../../lib/api', () => ({
    apiFetch: jest.fn(),
    apiUpload: jest.fn(),
    saveToken: jest.fn(() => Promise.resolve()),
    removeToken: jest.fn(() => Promise.resolve()),
    getToken: jest.fn(() => Promise.resolve(null)),
    API: {
        login: '/api/v1/auth/login',
        signup: '/api/v1/auth/signup',
        appleAuth: '/api/v1/auth/apple',
        me: '/api/v1/auth/me',
        refresh: '/api/v1/auth/refresh',
        feed: '/api/v1/posts/feed',
        posts: '/api/v1/posts',
        post: (id: string) => `/api/v1/posts/${id}`,
        like: (id: string) => `/api/v1/posts/${id}/like`,
        save: (id: string) => `/api/v1/posts/${id}/save`,
        communities: '/api/v1/communities',
        joinCommunity: (id: string) => `/api/v1/communities/${id}/join`,
        leaveCommunity: (id: string) => `/api/v1/communities/${id}/leave`,
        notifications: '/api/v1/notifications',
        notificationRead: (id: string) => `/api/v1/notifications/${id}/read`,
        notificationsReadAll: '/api/v1/notifications/read-all',
    },
}));

jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn(() => Promise.resolve(null)),
    setItemAsync: jest.fn(() => Promise.resolve()),
    deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
}));

// Import mocked modules for assertions
const { apiFetch, saveToken, removeToken, getToken } = require('../../lib/api');

// ============================================
// Helpers
// ============================================

const mockUser = {
    id: 'user-1',
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com',
    avatarUrl: 'https://example.com/avatar.jpg',
    followersCount: 10,
    followingCount: 5,
    postsCount: 3,
    isVerified: false,
    isPrivate: false,
    createdAt: '2025-01-01T00:00:00.000Z',
};

function resetStore() {
    useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: false,
        error: null,
    });
}

// ============================================
// Tests
// ============================================

describe('Auth Store', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        resetStore();
    });

    // ------------------------------------------
    // Initial State
    // ------------------------------------------
    describe('initial state', () => {
        it('has correct default values', () => {
            const state = useAuthStore.getState();
            expect(state.user).toBeNull();
            expect(state.isAuthenticated).toBe(false);
            expect(state.isLoading).toBe(false);
            expect(state.isInitialized).toBe(false);
            expect(state.error).toBeNull();
        });
    });

    // ------------------------------------------
    // login()
    // ------------------------------------------
    describe('login', () => {
        it('sets user and isAuthenticated on success', async () => {
            apiFetch.mockResolvedValueOnce({
                token: 'mock-jwt-token',
                user: mockUser,
            });

            await act(async () => {
                await useAuthStore.getState().login('test@example.com', 'password123');
            });

            const state = useAuthStore.getState();
            expect(state.user).toEqual(mockUser);
            expect(state.isAuthenticated).toBe(true);
            expect(state.isLoading).toBe(false);
            expect(state.error).toBeNull();

            // Verify token was saved
            expect(saveToken).toHaveBeenCalledWith('mock-jwt-token');
        });

        it('calls apiFetch with correct endpoint and body', async () => {
            apiFetch.mockResolvedValueOnce({ token: 'tok', user: mockUser });

            await act(async () => {
                await useAuthStore.getState().login('user@test.com', 'pass');
            });

            expect(apiFetch).toHaveBeenCalledWith('/api/v1/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email: 'user@test.com', password: 'pass' }),
            });
        });

        it('sets error on failure', async () => {
            apiFetch.mockRejectedValueOnce(new Error('Invalid credentials'));

            await act(async () => {
                await expect(
                    useAuthStore.getState().login('test@example.com', 'wrong')
                ).rejects.toThrow('Invalid credentials');
            });

            const state = useAuthStore.getState();
            expect(state.user).toBeNull();
            expect(state.isAuthenticated).toBe(false);
            expect(state.isLoading).toBe(false);
            expect(state.error).toBe('Invalid credentials');
        });

        it('sets isLoading while request is in progress', async () => {
            let resolvePromise: (value: any) => void;
            apiFetch.mockReturnValueOnce(
                new Promise((resolve) => {
                    resolvePromise = resolve;
                })
            );

            const loginPromise = useAuthStore.getState().login('test@example.com', 'pass');

            // While in progress
            expect(useAuthStore.getState().isLoading).toBe(true);
            expect(useAuthStore.getState().error).toBeNull();

            // Resolve
            await act(async () => {
                resolvePromise!({ token: 'tok', user: mockUser });
                await loginPromise;
            });

            expect(useAuthStore.getState().isLoading).toBe(false);
        });
    });

    // ------------------------------------------
    // signup()
    // ------------------------------------------
    describe('signup', () => {
        it('sets user and isAuthenticated on success', async () => {
            apiFetch.mockResolvedValueOnce({
                token: 'signup-token',
                user: mockUser,
            });

            await act(async () => {
                await useAuthStore.getState().signup('new@example.com', 'password', 'New User');
            });

            const state = useAuthStore.getState();
            expect(state.user).toEqual(mockUser);
            expect(state.isAuthenticated).toBe(true);
            expect(state.isLoading).toBe(false);
            expect(saveToken).toHaveBeenCalledWith('signup-token');
        });

        it('includes generated username and access code in request', async () => {
            apiFetch.mockResolvedValueOnce({ token: 'tok', user: mockUser });

            await act(async () => {
                await useAuthStore.getState().signup('new@example.com', 'pass', 'Test Name');
            });

            const callBody = JSON.parse(apiFetch.mock.calls[0][1].body);
            expect(callBody.email).toBe('new@example.com');
            expect(callBody.password).toBe('pass');
            expect(callBody.displayName).toBe('Test Name');
            expect(callBody.accessCode).toBe('MOBILE_BETA');
            expect(callBody.username).toMatch(/^testname\d+$/);
        });

        it('sets error on failure', async () => {
            apiFetch.mockRejectedValueOnce(new Error('Email already exists'));

            await act(async () => {
                await expect(
                    useAuthStore.getState().signup('existing@example.com', 'pass', 'Name')
                ).rejects.toThrow('Email already exists');
            });

            const state = useAuthStore.getState();
            expect(state.error).toBe('Email already exists');
            expect(state.isAuthenticated).toBe(false);
        });
    });

    // ------------------------------------------
    // appleLogin()
    // ------------------------------------------
    describe('appleLogin', () => {
        it('authenticates with Apple identity token', async () => {
            apiFetch.mockResolvedValueOnce({
                token: 'apple-token',
                user: mockUser,
            });

            await act(async () => {
                await useAuthStore.getState().appleLogin('apple-identity-token', {
                    givenName: 'John',
                    familyName: 'Doe',
                });
            });

            const state = useAuthStore.getState();
            expect(state.isAuthenticated).toBe(true);
            expect(state.user).toEqual(mockUser);
            expect(saveToken).toHaveBeenCalledWith('apple-token');

            const callBody = JSON.parse(apiFetch.mock.calls[0][1].body);
            expect(callBody.identityToken).toBe('apple-identity-token');
            expect(callBody.displayName).toBe('John Doe');
        });

        it('works without fullName', async () => {
            apiFetch.mockResolvedValueOnce({ token: 'tok', user: mockUser });

            await act(async () => {
                await useAuthStore.getState().appleLogin('apple-token');
            });

            const callBody = JSON.parse(apiFetch.mock.calls[0][1].body);
            expect(callBody.displayName).toBeUndefined();
        });
    });

    // ------------------------------------------
    // logout()
    // ------------------------------------------
    describe('logout', () => {
        it('clears user, isAuthenticated, and removes token', async () => {
            // Set up authenticated state first
            useAuthStore.setState({
                user: mockUser,
                isAuthenticated: true,
                error: 'some old error',
            });

            await act(async () => {
                await useAuthStore.getState().logout();
            });

            const state = useAuthStore.getState();
            expect(state.user).toBeNull();
            expect(state.isAuthenticated).toBe(false);
            expect(state.error).toBeNull();
            expect(removeToken).toHaveBeenCalled();
        });
    });

    // ------------------------------------------
    // initialize()
    // ------------------------------------------
    describe('initialize', () => {
        it('sets isInitialized without auth when no token exists', async () => {
            getToken.mockResolvedValueOnce(null);

            await act(async () => {
                await useAuthStore.getState().initialize();
            });

            const state = useAuthStore.getState();
            expect(state.isInitialized).toBe(true);
            expect(state.isAuthenticated).toBe(false);
            expect(state.user).toBeNull();
        });

        it('fetches user and sets auth when token exists', async () => {
            getToken.mockResolvedValueOnce('existing-token');
            apiFetch.mockResolvedValueOnce({ user: mockUser });

            await act(async () => {
                await useAuthStore.getState().initialize();
            });

            const state = useAuthStore.getState();
            expect(state.isInitialized).toBe(true);
            expect(state.isAuthenticated).toBe(true);
            expect(state.user).not.toBeNull();
            expect(state.user?.id).toBe('user-1');
        });

        it('clears token when API returns invalid user', async () => {
            getToken.mockResolvedValueOnce('stale-token');
            apiFetch.mockResolvedValueOnce({});

            await act(async () => {
                await useAuthStore.getState().initialize();
            });

            expect(removeToken).toHaveBeenCalled();
            expect(useAuthStore.getState().isAuthenticated).toBe(false);
        });
    });

    // ------------------------------------------
    // updateUser()
    // ------------------------------------------
    describe('updateUser', () => {
        it('merges partial updates into existing user', () => {
            useAuthStore.setState({ user: mockUser });

            act(() => {
                useAuthStore.getState().updateUser({
                    displayName: 'Updated Name',
                    bio: 'New bio',
                });
            });

            const user = useAuthStore.getState().user;
            expect(user?.displayName).toBe('Updated Name');
            expect(user?.bio).toBe('New bio');
            // Other fields remain unchanged
            expect(user?.email).toBe('test@example.com');
            expect(user?.username).toBe('testuser');
        });

        it('does nothing when user is null', () => {
            useAuthStore.setState({ user: null });

            act(() => {
                useAuthStore.getState().updateUser({ displayName: 'Test' });
            });

            expect(useAuthStore.getState().user).toBeNull();
        });
    });

    // ------------------------------------------
    // clearError()
    // ------------------------------------------
    describe('clearError', () => {
        it('resets error to null', () => {
            useAuthStore.setState({ error: 'Something went wrong' });

            act(() => {
                useAuthStore.getState().clearError();
            });

            expect(useAuthStore.getState().error).toBeNull();
        });

        it('is a no-op when error is already null', () => {
            useAuthStore.setState({ error: null });

            act(() => {
                useAuthStore.getState().clearError();
            });

            expect(useAuthStore.getState().error).toBeNull();
        });
    });
});
