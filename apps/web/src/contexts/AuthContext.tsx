'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { API_ENDPOINTS, apiFetch } from '@/lib/api';
import { isStealthActive } from '@/lib/stealth/engine';
import { DECOY_USER } from '@/lib/stealth/decoyData';

// TYPES
// ============================================
export interface User {
    id: string;
    email: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    coverUrl?: string;
    bio?: string;
    isVerified: boolean;
    isGroupOnly?: boolean;
    primaryCommunityId?: string | null;
    createdAt: string;
    role?: 'USER' | 'MODERATOR' | 'ADMIN' | 'SUPERADMIN';
    isGrowthPartner?: boolean;
    growthPartnerTier?: string;
    postsCount?: number;
    followersCount?: number;
    followingCount?: number;
    // Privacy-first architecture
    communityOptIn?: boolean;
    activeFeedView?: 'private' | 'community';
    usePublicProfile?: boolean;
    publicDisplayName?: string;
    publicUsername?: string;
    publicAvatarUrl?: string;
    publicBio?: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isStealth: boolean; // Travel Shield active
    // 2FA challenge state
    pending2FA: { challengeToken: string; email: string } | null;
    login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; requires2FA?: boolean; error?: string }>;
    verify2FA: (code: string) => Promise<{ success: boolean; error?: string }>;
    verifyBackupCode: (code: string) => Promise<{ success: boolean; error?: string }>;
    cancel2FA: () => void;
    signup: (email: string, password: string, username: string, displayName: string, options?: { groupOnly?: boolean; primaryCommunityId?: string; accessCode?: string }) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    updateUser: (updates: Partial<User>) => Promise<void>;
}

// ============================================
// CONTEXT
// ============================================
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [pending2FA, setPending2FA] = useState<{ challengeToken: string; email: string } | null>(null);
    const [isStealth, setIsStealth] = useState(false);
    const router = useRouter();

    // Check for existing session on mount and handle token refresh
    useEffect(() => {
        // Safety timeout: never let the loading state hang for more than 8 seconds.
        // Mobile browsers and slow networks can cause the auth check to stall.
        const safetyTimer = setTimeout(() => {
            setIsLoading(false);
        }, 8000);

        const checkAuth = async () => {
            try {
                // Travel Shield: If stealth is active, load decoy profile
                if (typeof window !== 'undefined' && isStealthActive()) {
                    setUser(DECOY_USER as User);
                    setIsStealth(true);
                    setIsLoading(false);
                    return;
                }

                if (typeof window === 'undefined') {
                    setIsLoading(false);
                    return;
                }

                const token = localStorage.getItem('0g_token');
                const tokenExpiry = localStorage.getItem('0g_token_expiry');

                if (!token) {
                    setIsLoading(false);
                    return;
                }

                // Check if token is about to expire (within 7 days) and refresh if needed
                const shouldRefresh = tokenExpiry &&
                    new Date(tokenExpiry).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

                // Add a per-request timeout so the auth check doesn't hang
                const controller = new AbortController();
                const requestTimer = setTimeout(() => controller.abort(), 6000);

                try {
                    const response = await apiFetch(API_ENDPOINTS.me, { signal: controller.signal });
                    clearTimeout(requestTimer);

                    if (response.ok) {
                        const data = await response.json();
                        setUser(data.user);

                        // Auto-refresh token if approaching expiry
                        if (shouldRefresh) {
                            try {
                                const refreshResponse = await apiFetch(API_ENDPOINTS.refresh, {
                                    method: 'POST',
                                });
                                if (refreshResponse.ok) {
                                    const refreshData = await refreshResponse.json();
                                    localStorage.setItem('0g_token', refreshData.token);
                                    localStorage.setItem('0g_token_expiry', refreshData.expiresAt);
                                }
                            } catch {
                                // Token refresh failed, continuing with current token
                            }
                        }
                    } else {
                        // Token invalid, clear it
                        localStorage.removeItem('0g_token');
                        localStorage.removeItem('0g_token_expiry');
                    }
                } catch (error: any) {
                    clearTimeout(requestTimer);
                    // Only clear tokens if it's an auth error, not a network/timeout error
                    if (error?.name !== 'AbortError' && typeof navigator !== 'undefined' && navigator.onLine) {
                        localStorage.removeItem('0g_token');
                        localStorage.removeItem('0g_token_expiry');
                    }
                }
            } catch (error) {
                // Catch-all: localStorage or any other unexpected error
                console.error('Auth check failed:', error);
            } finally {
                clearTimeout(safetyTimer);
                setIsLoading(false);
            }
        };

        checkAuth();

        // Listen for storage events to handle OAuth login from login page
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === '0g_token' && e.newValue && !e.oldValue) {
                // Token was just added (OAuth login), re-check auth
                checkAuth();
            }
        };

        // Custom event for same-tab storage changes (since StorageEvent doesn't fire in same tab)
        const handleCustomStorage = () => {
            checkAuth();
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('storage', handleCustomStorage as EventListener);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('storage', handleCustomStorage as EventListener);
        };
    }, []);

    // Login
    const login = async (email: string, password: string, rememberMe: boolean = true): Promise<{ success: boolean; requires2FA?: boolean; error?: string }> => {
        try {
            const response = await apiFetch(API_ENDPOINTS.login, {
                method: 'POST',
                body: JSON.stringify({ email, password, rememberMe }),
            });

            const data = await response.json();

            if (response.ok) {
                // Check if 2FA is required
                if (data.requires2FA && data.challengeToken) {
                    setPending2FA({ challengeToken: data.challengeToken, email });
                    return { success: true, requires2FA: true };
                }

                // Normal login success
                localStorage.setItem('0g_token', data.token);
                if (data.expiresAt) {
                    localStorage.setItem('0g_token_expiry', data.expiresAt);
                }
                setUser(data.user);
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Login failed' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    };

    // Verify 2FA code
    const verify2FA = async (code: string): Promise<{ success: boolean; error?: string }> => {
        if (!pending2FA) {
            return { success: false, error: 'No pending 2FA challenge' };
        }

        try {
            const response = await apiFetch(`${API_ENDPOINTS.login.replace('/login', '/2fa/challenge')}`, {
                method: 'POST',
                body: JSON.stringify({
                    challengeToken: pending2FA.challengeToken,
                    code
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                localStorage.setItem('0g_token', data.token);
                if (data.expiresAt) {
                    localStorage.setItem('0g_token_expiry', data.expiresAt);
                }
                setUser(data.user);
                setPending2FA(null);
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Invalid verification code' };
            }
        } catch (error) {
            console.error('2FA verification error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    };

    // Verify backup code
    const verifyBackupCode = async (code: string): Promise<{ success: boolean; error?: string }> => {
        if (!pending2FA) {
            return { success: false, error: 'No pending 2FA challenge' };
        }

        try {
            const response = await apiFetch(`${API_ENDPOINTS.login.replace('/login', '/2fa/challenge')}`, {
                method: 'POST',
                body: JSON.stringify({
                    challengeToken: pending2FA.challengeToken,
                    code: code
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                localStorage.setItem('0g_token', data.token);
                if (data.expiresAt) {
                    localStorage.setItem('0g_token_expiry', data.expiresAt);
                }
                setUser(data.user);
                setPending2FA(null);
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Invalid backup code' };
            }
        } catch (error) {
            console.error('Backup code verification error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    };

    // Cancel 2FA challenge
    const cancel2FA = () => {
        setPending2FA(null);
    };

    // Signup
    const signup = async (
        email: string,
        password: string,
        username: string,
        displayName: string,
        options?: { groupOnly?: boolean; primaryCommunityId?: string; accessCode?: string }
    ): Promise<{ success: boolean; error?: string }> => {
        try {
            const response = await apiFetch(API_ENDPOINTS.signup, {
                method: 'POST',
                body: JSON.stringify({
                    email,
                    password,
                    username,
                    displayName,
                    ...(options?.accessCode && { accessCode: options.accessCode }),
                    ...(options?.groupOnly && {
                        groupOnly: true,
                        primaryCommunityId: options.primaryCommunityId,
                    }),
                }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('0g_token', data.token);
                if (data.expiresAt) {
                    localStorage.setItem('0g_token_expiry', data.expiresAt);
                }
                setUser(data.user);
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Signup failed' };
            }
        } catch (error) {
            console.error('Signup error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    };

    // Logout
    const logout = async () => {
        try {
            await apiFetch(API_ENDPOINTS.logout, { method: 'POST' });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('0g_token');
            setUser(null);
            router.push('/');
        }
    };


    // Update user locally and refetch from backend to ensure consistency
    const updateUser = async (updates: Partial<User>) => {
        if (user) {
            // Optimistically update UI
            setUser({ ...user, ...updates });

            // Refetch from backend to ensure we have the latest data
            try {
                const response = await apiFetch(API_ENDPOINTS.me);
                if (response.ok) {
                    const data = await response.json();
                    setUser(data.user);
                }
            } catch (error) {
                console.error('[Auth] Failed to refresh user profile:', error);
                // Keep optimistic update if backend fails
            }
        }
    };


    // Computed admin check
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN' || user?.role === 'MODERATOR';

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                isAdmin: !!isAdmin,
                isStealth,
                pending2FA,
                login,
                verify2FA,
                verifyBackupCode,
                cancel2FA,
                signup,
                logout,
                updateUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );

}

// ============================================
// HOOK
// ============================================
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// ============================================
// PROTECTED ROUTE WRAPPER
// ============================================
export function ProtectedRoute({ children }: { children: ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            // Store the current path for redirect after login
            if (typeof window !== 'undefined') {
                const currentPath = window.location.pathname;
                // Don't store login/signup pages
                if (!currentPath.includes('/login') && !currentPath.includes('/signup')) {
                    sessionStorage.setItem('0g_redirect', currentPath);
                }
            }
            router.push('/login?error=auth_required');
        }
    }, [isLoading, isAuthenticated, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#050508] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        // Show a brief redirect message instead of blank screen
        return (
            <div className="min-h-screen bg-[#050508] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-white/50 text-sm">Redirecting to sign in...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

// ============================================
// ADMIN ROUTE WRAPPER
// ============================================
export function AdminRoute({ children }: { children: ReactNode }) {
    const { user, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

    useEffect(() => {
        if (isLoading) return;
        if (!isAuthenticated) {
            if (typeof window !== 'undefined') {
                const currentPath = window.location.pathname;
                if (!currentPath.includes('/login') && !currentPath.includes('/signup')) {
                    sessionStorage.setItem('0g_redirect', currentPath);
                }
            }
            router.push('/login?error=auth_required');
            return;
        }
        if (!isAdmin) {
            router.push('/dashboard');
        }
    }, [isLoading, isAuthenticated, isAdmin, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#050508] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated || !isAdmin) {
        return (
            <div className="min-h-screen bg-[#050508] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-white/50 text-sm">
                        {!isAuthenticated ? 'Redirecting to sign in...' : 'Redirecting to dashboard...'}
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
