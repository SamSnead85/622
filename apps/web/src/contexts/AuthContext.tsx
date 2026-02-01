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
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
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
    const router = useRouter();

    // Check for existing session on mount
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('six22_token');
            if (!token) {
                setIsLoading(false);
                return;
            }

            try {
                const response = await apiFetch(API_ENDPOINTS.me);
                if (response.ok) {
                    const data = await response.json();
                    setUser(data.user);
                } else {
                    // Token invalid, clear it
                    localStorage.removeItem('six22_token');
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                localStorage.removeItem('six22_token');
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []);

    // Login
    const login = async (email: string, password: string, rememberMe: boolean = true): Promise<{ success: boolean; error?: string }> => {
        try {
            const response = await apiFetch(API_ENDPOINTS.login, {
                method: 'POST',
                body: JSON.stringify({ email, password, rememberMe }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('six22_token', data.token);
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
                localStorage.setItem('six22_token', data.token);
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
            localStorage.removeItem('six22_token');
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

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
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
            router.push('/login');
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
