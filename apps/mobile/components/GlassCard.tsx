// ============================================
// GlassCard — Reusable glass-surface container
// Consistent card styling across all screens
// ============================================

import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius as br } from '@zerog/ui';

interface GlassCardProps {
    children: ReactNode;
    /** Additional styles */
    style?: ViewStyle;
    /** Padding preset (default: md) */
    padding?: 'none' | 'sm' | 'md' | 'lg';
    /** Border radius preset (default: lg) */
    radius?: 'sm' | 'md' | 'lg' | 'xl';
    /** Show border (default: true) */
    border?: boolean;
    /** Use gold-tinted background */
    gold?: boolean;
    /** Press handler (makes card touchable) */
    onPress?: () => void;
}

const PADDING_MAP = {
    none: 0,
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
};

const RADIUS_MAP = {
    sm: 10,
    md: 14,
    lg: 16,
    xl: 20,
};

export function GlassCard({
    children,
    style,
    padding = 'md',
    radius = 'lg',
    border = true,
    gold = false,
    onPress,
}: GlassCardProps) {
    return (
        <View
            accessibilityRole={onPress ? 'button' : undefined}
            style={[
                styles.card,
                {
                    padding: PADDING_MAP[padding],
                    borderRadius: RADIUS_MAP[radius],
                },
                border && styles.border,
                gold && styles.gold,
                style,
            ]}
        >
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface.glass,
    },
    border: {
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    gold: {
        backgroundColor: colors.surface.goldSubtle,
        borderColor: colors.gold[500] + '20',
    },
});

export default GlassCard;
