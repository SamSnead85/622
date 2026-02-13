// ============================================
// EmptyState — Reusable empty list state
// Shows icon, message, and optional action button
// ============================================

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing } from '@zerog/ui';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './Button';

interface EmptyStateProps {
    /** Icon name (Ionicons) */
    icon?: keyof typeof Ionicons.glyphMap;
    /** Title text */
    title?: string;
    /** Description text */
    message: string;
    /** Action button label */
    actionLabel?: string;
    /** Action button handler */
    onAction?: () => void;
    /** Icon size (default: 48) */
    iconSize?: number;
    /** Icon color */
    iconColor?: string;
    /** Additional styles */
    style?: ViewStyle;
    /** Compact mode with less padding */
    compact?: boolean;
}

function EmptyStateComponent({
    icon = 'albums-outline',
    title,
    message,
    actionLabel,
    onAction,
    iconSize = 48,
    iconColor,
    style,
    compact = false,
}: EmptyStateProps) {
    const { colors } = useTheme();
    const resolvedIconColor = iconColor ?? colors.text.muted;

    return (
        <View
            style={[
                styles.container,
                compact && styles.compact,
                style,
            ]}
            accessibilityRole="text"
            accessibilityLabel={`${title ? title + '. ' : ''}${message}`}
        >
            <View style={[styles.iconCircle, { backgroundColor: colors.surface.glass }]}>
                <Ionicons name={icon} size={iconSize} color={resolvedIconColor} />
            </View>
            {title && (
                <Text style={[styles.title, { color: colors.text.primary }]}>
                    {title}
                </Text>
            )}
            <Text style={[styles.message, { color: colors.text.muted }]}>
                {message}
            </Text>
            {actionLabel && onAction && (
                <Button
                    title={actionLabel}
                    onPress={onAction}
                    variant="secondary"
                    size="sm"
                    style={styles.actionButton}
                />
            )}
        </View>
    );
}

export const EmptyState = React.memo(EmptyStateComponent);

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        paddingHorizontal: spacing.xl,
    },
    compact: {
        paddingTop: spacing['2xl'],
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    title: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    message: {
        fontSize: typography.fontSize.base,
        textAlign: 'center',
        lineHeight: 22,
        maxWidth: 280,
    },
    actionButton: {
        marginTop: spacing.lg,
    },
});

export default EmptyState;
