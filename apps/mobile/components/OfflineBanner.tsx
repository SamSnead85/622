// ============================================
// OfflineBanner — Global network status indicator
// Shows a persistent banner when the device is offline.
// Animates in/out smoothly with Reanimated.
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '@zerog/ui';
import { useNetworkQuality } from '../hooks/useNetworkQuality';

interface OfflineBannerProps {
    /** Optional override message */
    message?: string;
}

function OfflineBannerComponent({ message }: OfflineBannerProps) {
    const { isOffline } = useNetworkQuality();
    const insets = useSafeAreaInsets();

    if (!isOffline) return null;

    return (
        <Animated.View
            entering={SlideInUp.duration(300)}
            exiting={SlideOutUp.duration(200)}
            style={[styles.container, { paddingTop: insets.top > 0 ? 0 : spacing.xs }]}
        >
            <View style={styles.content}>
                <Ionicons name="cloud-offline-outline" size={14} color={colors.coral[400]} />
                <Text style={styles.text}>
                    {message || "You're offline \u2014 check your connection"}
                </Text>
            </View>
        </Animated.View>
    );
}

export const OfflineBanner = React.memo(OfflineBannerComponent);

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.surface.glass,
        borderBottomWidth: 1,
        borderBottomColor: colors.coral[500] + '30',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: spacing.xs + 2,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.coral[500] + '12',
    },
    text: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.coral[400],
    },
});

export default OfflineBanner;
