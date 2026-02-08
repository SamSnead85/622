import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { useAuthStore } from '../stores';

// Prevent splash screen from auto-hiding until we check auth
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const initialize = useAuthStore((s) => s.initialize);
    const isInitialized = useAuthStore((s) => s.isInitialized);

    useEffect(() => {
        initialize().finally(() => {
            SplashScreen.hideAsync();
        });
    }, []);

    if (!isInitialized) {
        return null;
    }

    return (
        <GestureHandlerRootView style={styles.container}>
            <StatusBar style="light" />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: '#0A0A0B' },
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0B',
    },
});
