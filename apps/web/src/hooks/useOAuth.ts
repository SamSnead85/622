'use client';

import { useEffect, useCallback } from 'react';
import { API_ENDPOINTS } from '@/lib/api';

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

interface GoogleAuthResponse {
    credential: string;
    clientId: string;
}

interface GoogleUser {
    email: string;
    name: string;
    picture: string;
    sub: string;
}

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: {
                        client_id: string;
                        callback: (response: GoogleAuthResponse) => void;
                        auto_select?: boolean;
                    }) => void;
                    renderButton: (
                        element: HTMLElement | null,
                        config: {
                            type?: 'standard' | 'icon';
                            theme?: 'outline' | 'filled_blue' | 'filled_black';
                            size?: 'large' | 'medium' | 'small';
                            text?: 'signin_with' | 'signup_with' | 'continue_with';
                            shape?: 'rectangular' | 'pill' | 'circle' | 'square';
                            width?: number;
                        }
                    ) => void;
                    prompt: () => void;
                };
            };
        };
    }
}

export function useGoogleAuth(onSuccess: (user: { id: string; email: string; displayName: string; avatarUrl: string }, token: string) => void, onError: (error: string) => void) {
    const handleCredentialResponse = useCallback(async (response: GoogleAuthResponse) => {
        try {
            // Send the Google ID token to our backend
            const res = await fetch(API_ENDPOINTS.login.replace('/login', '/google'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    idToken: response.credential,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                onSuccess(data.user, data.token);
            } else {
                onError(data.error || 'Google login failed');
            }
        } catch (error) {
            console.error('Google auth error:', error);
            onError('Network error during Google login');
        }
    }, [onSuccess, onError]);

    useEffect(() => {
        // Load Google Sign-In script
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            if (window.google && GOOGLE_CLIENT_ID) {
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleCredentialResponse,
                });
            }
        };
        document.head.appendChild(script);

        return () => {
            // Cleanup
            const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
            if (existingScript) {
                existingScript.remove();
            }
        };
    }, [handleCredentialResponse]);

    const triggerGoogleLogin = useCallback(() => {
        if (!GOOGLE_CLIENT_ID) {
            onError('Google login is not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID.');
            return;
        }
        if (window.google) {
            window.google.accounts.id.prompt();
        } else {
            onError('Google Sign-In is loading. Please try again.');
        }
    }, [onError]);

    const renderGoogleButton = useCallback((elementId: string) => {
        if (!GOOGLE_CLIENT_ID) return;

        const element = document.getElementById(elementId);
        if (window.google && element) {
            window.google.accounts.id.renderButton(element, {
                type: 'standard',
                theme: 'filled_black',
                size: 'large',
                text: 'continue_with',
                shape: 'rectangular',
                width: 280,
            });
        }
    }, []);

    return {
        triggerGoogleLogin,
        renderGoogleButton,
        isConfigured: !!GOOGLE_CLIENT_ID,
    };
}

// Apple Sign-In Hook
// Note: Apple Sign-In requires a developer account and proper configuration
export function useAppleAuth(onSuccess: (user: { id: string; email: string; displayName: string }, token: string) => void, onError: (error: string) => void) {
    const triggerAppleLogin = useCallback(() => {
        // Apple Sign-In requires:
        // 1. Apple Developer account
        // 2. Service ID configured for Sign in with Apple
        // 3. Proper domain verification

        // For now, show coming soon message
        onError('Apple Sign-In requires additional configuration. Coming soon!');
    }, [onError]);

    return {
        triggerAppleLogin,
        isConfigured: false, // Set to true when Apple Sign-In is configured
    };
}
