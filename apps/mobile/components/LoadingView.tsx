// ============================================
// LoadingView — Centered loading indicator
// Consistent loading state across all screens
// ============================================

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography, spacing } from '@zerog/ui';

interface LoadingViewProps {
    /** Optional message below spinner */
    message?: string;
    /** Spinner size (default: large) */
    size?: 'small' | 'large';
    /** Fill entire screen (default: true) */
    fullScreen?: boolean;
    /** Additional styles */
    style?: ViewStyle;
    /** Spinner color (default: gold) */
    color?: string;
}

function LoadingViewComponent({
    message,
    size = 'large',
    fullScreen = true,
    style,
    color = colors.gold[500],
}: LoadingViewProps) {
    return (
        <View
            style={[
                styles.container,
                fullScreen && styles.fullScreen,
                style,
            ]}
            accessibilityRole="progressbar"
            accessibilityLabel={message || 'Loading'}
        >
            <ActivityIndicator size={size} color={color} />
            {message && <Text style={styles.message}>{message}</Text>}
        </View>
    );
}

export const LoadingView = React.memo(LoadingViewComponent);

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    fullScreen: {
        flex: 1,
    },
    message: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        marginTop: spacing.md,
        textAlign: 'center',
    },
});

export default LoadingView;

