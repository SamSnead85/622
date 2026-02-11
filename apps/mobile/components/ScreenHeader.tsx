// ============================================
// ScreenHeader — Reusable top header with safe area
// Includes back button, centered title, optional right action
// ============================================

import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '@zerog/ui';
import { BackButton } from './BackButton';

interface ScreenHeaderProps {
    /** Screen title */
    title: string;
    /** Show back button (default: true) */
    showBack?: boolean;
    /** Custom back button behavior */
    onBack?: () => void;
    /** Right side element (button, count, etc.) */
    rightElement?: ReactNode;
    /** Left side element override (replaces back button) */
    leftElement?: ReactNode;
    /** Hide bottom border */
    noBorder?: boolean;
    /** Additional container styles */
    style?: ViewStyle;
}

function ScreenHeaderComponent({
    title,
    showBack = true,
    onBack,
    rightElement,
    leftElement,
    noBorder = false,
    style,
}: ScreenHeaderProps) {
    const insets = useSafeAreaInsets();

    return (
        <View
            style={[
                styles.header,
                { paddingTop: insets.top + spacing.md },
                noBorder && styles.noBorder,
                style,
            ]}
            accessibilityRole="header"
        >
            <View style={styles.left}>
                {leftElement || (showBack ? <BackButton onPress={onBack} /> : <View style={styles.spacer} />)}
            </View>
            <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
                {title}
            </Text>
            <View style={styles.right}>
                {rightElement || <View style={styles.spacer} />}
            </View>
        </View>
    );
}

export const ScreenHeader = React.memo(ScreenHeaderComponent);

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
    },
    noBorder: {
        borderBottomWidth: 0,
    },
    left: {
        width: 44,
        alignItems: 'flex-start',
    },
    right: {
        width: 44,
        alignItems: 'flex-end',
    },
    title: {
        flex: 1,
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
        textAlign: 'center',
    },
    spacer: {
        width: 44,
    },
});

export default ScreenHeader;

