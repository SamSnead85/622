'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { API_ENDPOINTS } from '@/lib/api';

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

interface GoogleAuthResponse {
    credential: string;
    clientId: string;
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
                        use_fedcm_for_prompt?: boolean;
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
                    prompt: (momentListener?: (notification: {
                        isNotDisplayed: () => boolean;
                        isSkippedMoment: () => boolean;
                        getNotDisplayedReason: () => string;
                        getSkippedReason: () => string;
                    }) => void) => void;
                    cancel: () => void;
                };
            };
        };
    }
}

export function useGoogleAuth(
    onSuccess: (user: { id: string; email: string; displayName: string; avatarUrl: string }, token: string) => void,
    onError: (error: string) => void
) {
    const [isLibraryLoaded, setIsLibraryLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const buttonContainerRef = useRef<string | null>(null);

    const handleCredentialResponse = useCallback(async (response: GoogleAuthResponse) => {
        setIsLoading(true);
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
                // Store token in localStorage
                localStorage.setItem('six22_token', data.token);
                onSuccess(data.user, data.token);
            } else {
                onError(data.error || 'Google login failed');
            }
        } catch (error) {
            console.error('Google auth error:', error);
            onError('Network error during Google login');
        } finally {
            setIsLoading(false);
        }
    }, [onSuccess, onError]);

    useEffect(() => {
        if (!GOOGLE_CLIENT_ID) {
            console.warn('Google Client ID not configured');
            return;
        }

        // Check if script already loaded
        if (window.google?.accounts?.id) {
            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleCredentialResponse,
                use_fedcm_for_prompt: true,
            });
            setIsLibraryLoaded(true);
            return;
        }

        // Load Google Sign-In script
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;

        script.onload = () => {
            if (window.google?.accounts?.id) {
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleCredentialResponse,
                    use_fedcm_for_prompt: true,
                });
                setIsLibraryLoaded(true);

                // Re-render button if we have a container
                if (buttonContainerRef.current) {
                    const element = document.getElementById(buttonContainerRef.current);
                    if (element) {
                        window.google.accounts.id.renderButton(element, {
                            type: 'standard',
                            theme: 'filled_black',
                            size: 'large',
                            text: 'continue_with',
                            shape: 'rectangular',
                            width: 280,
                        });
                    }
                }
            }
        };

        script.onerror = () => {
            console.error('Failed to load Google Sign-In script');
            onError('Failed to load Google Sign-In. Please try again.');
        };

        document.head.appendChild(script);

        return () => {
            // Cleanup
            if (window.google?.accounts?.id) {
                window.google.accounts.id.cancel();
            }
        };
    }, [handleCredentialResponse, onError]);

    const triggerGoogleLogin = useCallback(() => {
        if (!GOOGLE_CLIENT_ID) {
            onError('Google login is not configured. Please contact support.');
            return;
        }

        if (!isLibraryLoaded || !window.google?.accounts?.id) {
            onError('Google Sign-In is loading. Please wait a moment and try again.');
            return;
        }

        // Use prompt with moment listener to handle cases where prompt doesn't show
        window.google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed()) {
                const reason = notification.getNotDisplayedReason();
                console.log('Google One Tap not displayed:', reason);
                // Common reasons: browser_not_supported, invalid_client, opt_out_or_no_session
                if (reason === 'opt_out_or_no_session' || reason === 'suppressed_by_user') {
                    onError('Please click the Google button to sign in, or allow popups for this site.');
                }
            } else if (notification.isSkippedMoment()) {
                console.log('Google One Tap skipped:', notification.getSkippedReason());
            }
        });
    }, [isLibraryLoaded, onError]);

    const renderGoogleButton = useCallback((elementId: string) => {
        if (!GOOGLE_CLIENT_ID) return;

        buttonContainerRef.current = elementId;

        // Wait for library to load
        if (!isLibraryLoaded || !window.google?.accounts?.id) {
            // Will be rendered when script loads
            return;
        }

        const element = document.getElementById(elementId);
        if (element) {
            window.google.accounts.id.renderButton(element, {
                type: 'standard',
                theme: 'filled_black',
                size: 'large',
                text: 'continue_with',
                shape: 'rectangular',
                width: 280,
            });
        }
    }, [isLibraryLoaded]);

    return {
        triggerGoogleLogin,
        renderGoogleButton,
        isConfigured: !!GOOGLE_CLIENT_ID,
        isLibraryLoaded,
        isLoading,
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
