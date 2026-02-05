'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { API_ENDPOINTS, apiFetch } from '@/lib/api';

// ============================================
// TYPES
// ============================================
interface User {
    id: string;
    email: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    coverUrl?: string;
    bio?: string;
    isVerified: boolean;
    createdAt: string;
    role?: 'USER' | 'MODERATOR' | 'ADMIN' | 'SUPERADMIN';
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isAdmin: boolean;
    // 2FA challenge state
    pending2FA: { challengeToken: string; email: string } | null;
    login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; requires2FA?: boolean; error?: string }>;
    verify2FA: (code: string) => Promise<{ success: boolean; error?: string }>;
    verifyBackupCode: (code: string) => Promise<{ success: boolean; error?: string }>;
    cancel2FA: () => void;
    signup: (email: string, password: string, username: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    updateUser: (updates: Partial<User>) => void;
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
    const router = useRouter();

    // Check for existing session on mount and handle token refresh
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('0g_token');
            const tokenExpiry = localStorage.getItem('0g_token_expiry');

            if (!token) {
                setIsLoading(false);
                return;
            }

            // Check if token is about to expire (within 7 days) and refresh if needed
            const shouldRefresh = tokenExpiry &&
                new Date(tokenExpiry).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

            try {
                const response = await apiFetch(API_ENDPOINTS.me);
                if (response.ok) {
                    const data = await response.json();
                    setUser(data.user);

                    // Auto-refresh token if approaching expiry
                    if (shouldRefresh) {
                        try {
                            const refreshResponse = await apiFetch(`${API_ENDPOINTS.me.replace('/me', '/refresh')}`, {
                                method: 'POST',
                            });
                            if (refreshResponse.ok) {
                                const refreshData = await refreshResponse.json();
                                localStorage.setItem('0g_token', refreshData.token);
                                localStorage.setItem('0g_token_expiry', refreshData.expiresAt);
                                console.log('[Auth] Token refreshed successfully');
                            }
                        } catch (refreshError) {
                            console.warn('[Auth] Token refresh failed, continuing with current token:', refreshError);
                        }
                    }
                } else {
                    // Token invalid, clear it
                    localStorage.removeItem('0g_token');
                    localStorage.removeItem('0g_token_expiry');
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                // Only clear tokens if it's an auth error, not a network error
                if (navigator.onLine) {
                    localStorage.removeItem('0g_token');
                    localStorage.removeItem('0g_token_expiry');
                }
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
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
                    backupCode: code
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
        displayName: string
    ): Promise<{ success: boolean; error?: string }> => {
        try {
            const response = await apiFetch(API_ENDPOINTS.signup, {
                method: 'POST',
                body: JSON.stringify({ email, password, username, displayName }),
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

    // Update user locally
    const updateUser = (updates: Partial<User>) => {
        if (user) {
            setUser({ ...user, ...updates });
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
        return null;
    }

    return <>{children}</>;
}
