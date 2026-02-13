// ============================================
// RetryView — Tap-to-retry error state
// Reusable component shown when API calls fail.
// Offers a clear retry button and optional error context.
// ============================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing } from '@zerog/ui';
import { useTheme } from '../contexts/ThemeContext';

interface RetryViewProps {
    /** Error message to display */
    message?: string;
    /** Callback when user taps retry */
    onRetry: () => void;
    /** Whether the retry is currently loading */
    isRetrying?: boolean;
    /** Compact mode for inline use */
    compact?: boolean;
    /** Custom icon name */
    icon?: keyof typeof Ionicons.glyphMap;
}

function RetryViewComponent({
    message = 'Unable to load content. Please check your connection and try again.',
    onRetry,
    isRetrying = false,
    compact = false,
    icon = 'cloud-offline-outline',
}: RetryViewProps) {
    const { colors } = useTheme();

    if (compact) {
        return (
            <TouchableOpacity
                style={[styles.compactContainer, { backgroundColor: colors.surface.glass }]}
                onPress={onRetry}
                disabled={isRetrying}
                activeOpacity={0.7}
            >
                <Ionicons name={icon} size={16} color={colors.text.muted} />
                <Text style={[styles.compactText, { color: colors.text.muted }]}>
                    {isRetrying ? 'Retrying...' : message}
                </Text>
                {!isRetrying && (
                    <View style={[styles.compactRetryBadge, { backgroundColor: colors.surface.goldSubtle }]}>
                        <Ionicons name="refresh" size={12} color={colors.gold[500]} />
                    </View>
                )}
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.container}>
            <View style={[styles.iconCircle, { backgroundColor: colors.surface.glass }]}>
                <Ionicons name={icon} size={32} color={colors.text.muted} />
            </View>
            <Text style={[styles.message, { color: colors.text.secondary }]}>{message}</Text>
            <TouchableOpacity
                style={[
                    styles.retryButton,
                    { backgroundColor: colors.gold[500] },
                    isRetrying && styles.retryButtonDisabled,
                ]}
                onPress={onRetry}
                disabled={isRetrying}
                activeOpacity={0.8}
            >
                <Ionicons name="refresh" size={16} color={colors.text.inverse} />
                <Text style={[styles.retryText, { color: colors.text.inverse }]}>
                    {isRetrying ? 'Retrying...' : 'Tap to Retry'}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

export const RetryView = React.memo(RetryViewComponent);

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
        paddingTop: 60,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    message: {
        fontSize: typography.fontSize.base,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing.xl,
        maxWidth: 280,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.sm + 2,
        borderRadius: 12,
    },
    retryButtonDisabled: {
        opacity: 0.6,
    },
    retryText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
    },
    // Compact variant
    compactContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: 12,
        marginHorizontal: spacing.md,
        marginVertical: spacing.sm,
    },
    compactText: {
        fontSize: typography.fontSize.sm,
        flex: 1,
    },
    compactRetryBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default RetryView;
