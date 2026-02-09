import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
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

function RootLayout() {
    const initialize = useAuthStore((s) => s.initialize);
    const isInitialized = useAuthStore((s) => s.isInitialized);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    const [fontsLoaded] = Font.useFonts({
        Inter: Inter_400Regular,
        'Inter-Medium': Inter_500Medium,
        'Inter-SemiBold': Inter_600SemiBold,
        'Inter-Bold': Inter_700Bold,
    });

    useEffect(() => {
        initialize();
    }, []);

    // Hide splash only when both auth check AND fonts are ready
    useEffect(() => {
        if (isInitialized && fontsLoaded) {
            SplashScreen.hideAsync();
        }
    }, [isInitialized, fontsLoaded]);

    // Register for push notifications after auth is initialized and user is authenticated
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

    if (!isInitialized || !fontsLoaded) {
        return null;
    }

    return (
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
                <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            </Stack>
        </GestureHandlerRootView>
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
