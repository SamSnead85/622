import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, AppStateStatus, LogBox } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import * as Linking from 'expo-linking';
import * as Sentry from '@sentry/react-native';
import {
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
} from '@expo-google-fonts/inter';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { useAuthStore } from '../stores';
import { colors } from '@zerog/ui';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ToastProvider } from '../components/ToastProvider';
import { OfflineBanner } from '../components/OfflineBanner';
import { socketManager, CallIncoming } from '../lib/socket';
import { initI18n } from '../lib/i18n';
import { startAutoSync, stopAutoSync, syncQueue } from '../lib/offlineQueue';

// ============================================
// Suppress noisy dev warnings that don't affect production
// ============================================
LogBox.ignoreLogs([
    'Socket connection failed',
    'Push notification registration failed',
    'Warning:',
    'Possible Unhandled Promise',
    'Non-serializable values were found in the navigation state',
    'No native splash screen',
    'The \'NO_COLOR\' env',
    'Require cycle:',
    'expo-image',
    'new NativeEventEmitter',
    'EventEmitter.removeListener',
    'Each child in a list',
    'VirtualizedLists should never be nested',
    'AsyncStorage has been extracted',
    'Cannot update a component',
    'Sending `onAnimatedValueUpdate`',
    'Failed to get',
    'Bridgeless mode',
]);

// ============================================
// Sentry Error Tracking
// Set EXPO_PUBLIC_SENTRY_DSN in .env when ready for production
// ============================================
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

if (SENTRY_DSN) {
    Sentry.init({
        dsn: SENTRY_DSN,
        tracesSampleRate: 0.2, // 20% of transactions for performance monitoring
        enableAutoSessionTracking: true,
        enableNativeFramesTracking: true,
        debug: __DEV__,
    });
}

// ============================================
// Global unhandled promise rejection handler
// Prevents red "uncaught exception" screens in Expo for non-fatal errors
// (e.g., failed API calls, AsyncStorage errors, socket disconnects)
// ============================================
if (typeof global !== 'undefined') {
    const originalHandler = (global as any).ErrorUtils?.getGlobalHandler?.();
    (global as any).ErrorUtils?.setGlobalHandler?.((error: Error, isFatal?: boolean) => {
        // Only suppress non-fatal errors in dev (Expo shows red screen for all)
        if (__DEV__ && !isFatal) {
            console.warn('[Suppressed non-fatal error]', error?.message || error);
            return;
        }
        // In production or for fatal errors, use the original handler
        if (originalHandler) {
            originalHandler(error, isFatal);
        }
    });
}

// Prevent splash screen from auto-hiding until we check auth + load fonts
SplashScreen.preventAutoHideAsync();

// Initialize i18n eagerly (outside component to avoid re-init)
let i18nReady = false;
initI18n().then(() => { i18nReady = true; }).catch(() => { i18nReady = true; });

function RootLayout() {
    return (
        <ThemeProvider>
            <RootLayoutInner />
        </ThemeProvider>
    );
}

function RootLayoutInner() {
    const router = useRouter();
    const { isDark, colors: c } = useTheme();
    const initialize = useAuthStore((s) => s.initialize);
    const isInitialized = useAuthStore((s) => s.isInitialized);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const [i18nLoaded, setI18nLoaded] = useState(i18nReady);
    const appState = useRef(AppState.currentState);

    const [fontsLoaded] = Font.useFonts({
        Inter: Inter_400Regular,
        'Inter-Medium': Inter_500Medium,
        'Inter-SemiBold': Inter_600SemiBold,
        'Inter-Bold': Inter_700Bold,
    });

    // ============================================
    // Initialize Auth
    // ============================================

    useEffect(() => {
        initialize();
    }, []);

    // ============================================
    // Wait for i18n
    // ============================================

    useEffect(() => {
        if (!i18nReady) {
            // Check once after a reasonable delay instead of polling
            const timeout = setTimeout(() => {
                setI18nLoaded(true); // Proceed regardless after 500ms
            }, 500);
            return () => clearTimeout(timeout);
        } else {
            setI18nLoaded(true);
        }
    }, []);

    // ============================================
    // Hide splash only when auth + fonts + i18n are ready
    // ============================================

    useEffect(() => {
        if (isInitialized && fontsLoaded && i18nLoaded) {
            SplashScreen.hideAsync();
        }
    }, [isInitialized, fontsLoaded, i18nLoaded]);

    // ============================================
    // Socket.io Connection
    // ============================================

    useEffect(() => {
        if (isInitialized && isAuthenticated) {
            // Connect to Socket.io
            socketManager.connect().catch((err) => {
                console.warn('Socket connection failed:', err);
            });

            // Listen for incoming calls
            const unsubCall = socketManager.on('call:incoming', (data: CallIncoming) => {
                Alert.alert(
                    data.type === 'video' ? 'Incoming Video Call' : 'Incoming Audio Call',
                    `${data.from.displayName} is calling`,
                    [
                        {
                            text: 'Decline',
                            style: 'destructive',
                            onPress: () => socketManager.rejectCall(data.callId),
                        },
                        {
                            text: 'Accept',
                            onPress: () => {
                                router.push(
                                    `/call/${data.from.id}?type=${data.type}&name=${encodeURIComponent(data.from.displayName)}&avatar=${encodeURIComponent(data.from.avatarUrl || '')}&incoming=true&callId=${data.callId}`
                                );
                            },
                        },
                    ],
                    { cancelable: false }
                );
            });

            // Listen for game invites from other users
            const unsubGameInvite = socketManager.on('game:invite', (data: { code: string; gameType: string; hostName: string }) => {
                Alert.alert(
                    'Game Invite',
                    `${data.hostName || 'Someone'} invited you to play ${data.gameType || 'a game'}!`,
                    [
                        { text: 'Not Now', style: 'cancel' },
                        {
                            text: 'Join',
                            onPress: () => {
                                router.push(`/games/lobby/${data.code}` as any);
                            },
                        },
                    ],
                    { cancelable: true }
                );
            });

            return () => {
                unsubCall();
                unsubGameInvite();
                socketManager.disconnect();
            };
        }
    }, [isInitialized, isAuthenticated]);

    // ============================================
    // Push Notifications Registration
    // ============================================

    useEffect(() => {
        if (isInitialized && isAuthenticated) {
            import('../lib/notifications')
                .then(({ registerForPushNotifications }) => {
                    registerForPushNotifications().catch((err) => {
                        console.warn('Push notification registration failed:', err);
                    });
                })
                .catch(() => {
                    // Silently handle — notifications not available
                });
        }
    }, [isInitialized, isAuthenticated]);

    // ============================================
    // Offline Queue Auto-Sync
    // ============================================

    useEffect(() => {
        if (isInitialized && isAuthenticated) {
            startAutoSync();
            // Sync any pending actions immediately
            syncQueue().catch(() => {});

            return () => stopAutoSync();
        }
    }, [isInitialized, isAuthenticated]);

    // ============================================
    // App State Change Handler (background/foreground)
    // ============================================

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                // Coming back to foreground
                if (isAuthenticated) {
                    socketManager.connect().catch(() => {});
                    socketManager.updatePresence('online');
                    syncQueue().catch(() => {});
                }
            } else if (nextAppState === 'background') {
                socketManager.updatePresence('away');
            }
            appState.current = nextAppState;
        });

        return () => subscription.remove();
    }, [isAuthenticated]);

    // ============================================
    // Deep Link Handling (Game Invites, Posts, Communities, Profiles)
    // ============================================

    useEffect(() => {
        const handleDeepLink = (event: { url: string }) => {
            const url = event.url;

            // Helper: route game links based on auth state
            const navigateToGame = (gameCode: string) => {
                if (isAuthenticated) {
                    router.push(`/games/lobby/${gameCode}` as any);
                } else {
                    // Guest flow — collect a display name first
                    router.push(`/games/guest-join?code=${gameCode}` as any);
                }
            };

            try {
                // Normalize URL for parsing - convert custom scheme to http for URL constructor
                let urlToParse = url;
                if (url.startsWith('zerog://')) {
                    urlToParse = url.replace('zerog://', 'https://');
                }
                
                const parsed = new URL(urlToParse);
                const pathParts = parsed.pathname.split('/').filter(Boolean);
                
                if (pathParts.length >= 2) {
                    const [type, id] = pathParts;
                    
                    if (type === 'game' && id) {
                        // Handle game codes (6 character alphanumeric)
                        const gameCode = id.toUpperCase();
                        navigateToGame(gameCode);
                    } else if (type === 'post' && id) {
                        router.push(`/post/${id}` as any);
                    } else if (type === 'group' && id) {
                        // Group invite — lightweight join flow (no registration required)
                        router.push(`/join-group?code=${id}&name=${parsed.searchParams.get('name') || ''}` as any);
                    } else if (type === 'community' && id) {
                        router.push(`/community/${id}` as any);
                    } else if (type === 'profile' && id) {
                        router.push(`/profile/${id}` as any);
                    }
                }
            } catch (error) {
                // Fallback to regex matching if URL parsing fails
                // Try game link pattern
                const gameMatch = url.match(/\/game\/([A-Z0-9]{6})/i);
                if (gameMatch) {
                    const gameCode = gameMatch[1].toUpperCase();
                    navigateToGame(gameCode);
                    return;
                }
                
                // Try other patterns with regex as fallback
                const postMatch = url.match(/\/(?:post|zerog:\/\/post)\/([^\/\?]+)/i);
                if (postMatch) {
                    router.push(`/post/${postMatch[1]}` as any);
                    return;
                }
                
                // Try group invite pattern (lightweight join)
                const groupMatch = url.match(/\/group\/([^\/\?]+)/i);
                if (groupMatch) {
                    router.push(`/join-group?code=${groupMatch[1]}` as any);
                    return;
                }

                const communityMatch = url.match(/\/(?:community|zerog:\/\/community)\/([^\/\?]+)/i);
                if (communityMatch) {
                    router.push(`/community/${communityMatch[1]}` as any);
                    return;
                }
                
                const profileMatch = url.match(/\/(?:profile|zerog:\/\/profile)\/([^\/\?]+)/i);
                if (profileMatch) {
                    router.push(`/profile/${profileMatch[1]}` as any);
                    return;
                }
            }
        };

        // Check if app was opened with a deep link
        Linking.getInitialURL().then((url) => {
            if (url) handleDeepLink({ url });
        });

        // Listen for new deep links while app is open
        const subscription = Linking.addEventListener('url', handleDeepLink);
        return () => subscription.remove();
    }, [isAuthenticated]);

    // ============================================
    // Render
    // ============================================

    if (!isInitialized || !fontsLoaded || !i18nLoaded) {
        return null;
    }

    return (
        <ErrorBoundary screenName="Root">
            <GestureHandlerRootView style={[styles.container, { backgroundColor: c.obsidian[900] }]}>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <OfflineBanner />
                <Stack
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: c.obsidian[900] },
                        gestureEnabled: true,
                        gestureDirection: 'horizontal',
                        animation: 'slide_from_right',
                        animationDuration: 200,
                    }}
                >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
                    <Stack.Screen name="discover" options={{ animation: 'fade', gestureEnabled: false }} />
                    <Stack.Screen name="interests" />
                    <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
                    <Stack.Screen name="settings/algorithm" />
                    <Stack.Screen name="settings/notifications" />
                    <Stack.Screen name="community/[id]/manage" />
                    <Stack.Screen name="community/[id]/rules" />
                    <Stack.Screen name="community/[id]/polls" />
                    <Stack.Screen name="community/[id]/poll-create" />
                    <Stack.Screen name="moments/create" options={{ animation: 'fade', presentation: 'fullScreenModal' }} />
                    <Stack.Screen name="moments/[id]" options={{ animation: 'fade', presentation: 'fullScreenModal' }} />
                    <Stack.Screen name="analytics" />
                    <Stack.Screen name="community/[id]/governance" />
                    <Stack.Screen name="community/[id]/proposal/[proposalId]" />
                    <Stack.Screen name="community/[id]/classroom" />
                    <Stack.Screen name="community/[id]/course/[courseId]" />
                    <Stack.Screen name="community/[id]/lesson/[lessonId]" />
                    <Stack.Screen name="community/[id]/calendar" />
                    <Stack.Screen name="community/[id]/leaderboard" />
                    <Stack.Screen name="tools" options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
                    <Stack.Screen name="games" options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="campfire" options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="spaces" options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen
                        name="call/[id]"
                        options={{
                            animation: 'fade',
                            presentation: 'fullScreenModal',
                            gestureEnabled: false,
                        }}
                    />
                </Stack>
                <ToastProvider />
            </GestureHandlerRootView>
        </ErrorBoundary>
    );
}

// Wrap with Sentry error boundary for crash reporting
export default SENTRY_DSN ? Sentry.wrap(RootLayout) : RootLayout;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.obsidian[900],
    },
});
