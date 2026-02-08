// ============================================
// Push Notifications
// Handles registration, token management, and
// notification event listeners for Expo
// ============================================

import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { apiFetch } from './api';

// ============================================
// Configuration
// ============================================

// Set default notification behavior when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

const PUSH_REGISTER_ENDPOINT = '/api/v1/push/register';

// ============================================
// Push Token Registration
// ============================================

/**
 * Registers for push notifications:
 * 1. Checks that we're on a physical device
 * 2. Requests notification permissions
 * 3. Gets the Expo push token
 * 4. Sends it to the backend
 *
 * Returns the Expo push token string, or null if registration failed.
 */
export async function registerForPushNotifications(): Promise<string | null> {
    // Push notifications only work on physical devices
    if (!Device.isDevice) {
        console.warn('Push notifications require a physical device');
        return null;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not already granted
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.warn('Push notification permission not granted');
        return null;
    }

    // Get the Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
    });
    const token = tokenData.data;

    // Send the token to the backend
    const platform: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';
    try {
        await apiFetch(PUSH_REGISTER_ENDPOINT, {
            method: 'POST',
            body: JSON.stringify({ token, platform }),
        });
    } catch (error) {
        console.error('Failed to register push token with backend:', error);
    }

    // Configure Android notification channel
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF6B35',
        });
    }

    return token;
}

// ============================================
// usePushNotifications Hook
// ============================================

export interface PushNotificationState {
    expoPushToken: string | null;
    notification: Notifications.Notification | null;
    error: Error | null;
}

/**
 * React hook that:
 * - Registers for push notifications on mount
 * - Listens for incoming notifications
 * - Listens for notification interaction (taps)
 *
 * Returns the current push token, latest notification, and any error.
 */
export function usePushNotifications(): PushNotificationState {
    const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
    const [notification, setNotification] = useState<Notifications.Notification | null>(null);
    const [error, setError] = useState<Error | null>(null);

    const notificationListener = useRef<Notifications.Subscription>();
    const responseListener = useRef<Notifications.Subscription>();

    useEffect(() => {
        // Register and get token
        registerForPushNotifications()
            .then((token) => {
                setExpoPushToken(token);
            })
            .catch((err) => {
                console.error('Push notification registration error:', err);
                setError(err instanceof Error ? err : new Error(String(err)));
            });

        // Listen for notifications received while app is foregrounded
        notificationListener.current = Notifications.addNotificationReceivedListener(
            (notification) => {
                setNotification(notification);
            }
        );

        // Listen for user interactions with notifications (taps)
        responseListener.current = Notifications.addNotificationResponseReceivedListener(
            (response) => {
                // You can navigate to specific screens based on notification data here
                console.log('Notification tapped:', response.notification.request.content.data);
            }
        );

        return () => {
            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(notificationListener.current);
            }
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
            }
        };
    }, []);

    return { expoPushToken, notification, error };
}
