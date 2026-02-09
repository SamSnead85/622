import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
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
import { ErrorBoundary } from '../components/ErrorBoundary';
import { socketManager, CallIncoming } from '../lib/socket';
import { initI18n } from '../lib/i18n';
import { startAutoSync, stopAutoSync, syncQueue } from '../lib/offlineQueue';

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

// Prevent splash screen from auto-hiding until we check auth + load fonts
SplashScreen.preventAutoHideAsync();

// Initialize i18n eagerly (outside component to avoid re-init)
let i18nReady = false;
initI18n().then(() => { i18nReady = true; }).catch(() => { i18nReady = true; });

function RootLayout() {
    const router = useRouter();
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
            const check = setInterval(() => {
                if (i18nReady) {
                    setI18nLoaded(true);
                    clearInterval(check);
                }
            }, 50);
            return () => clearInterval(check);
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

            return () => {
                unsubCall();
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
    // Render
    // ============================================

    if (!isInitialized || !fontsLoaded || !i18nLoaded) {
        return null;
    }

    return (
        <ErrorBoundary screenName="Root">
            <GestureHandlerRootView style={styles.container}>
                <StatusBar style="light" />
                <Stack
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: colors.obsidian[900] },
                        animation: 'slide_from_right',
                    }}
                >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
                    <Stack.Screen name="discover" options={{ animation: 'fade', gestureEnabled: false }} />
                    <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
                    <Stack.Screen
                        name="call/[id]"
                        options={{
                            animation: 'fade',
                            presentation: 'fullScreenModal',
                            gestureEnabled: false,
                        }}
                    />
                </Stack>
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
