// ============================================
// BackButton — Reusable glass-circle back button
// Standard 40x40 circle used across all screens
// ============================================

import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '@zerog/ui';
import { useTheme } from '../contexts/ThemeContext';

interface BackButtonProps {
    /** Override default router.back() behavior */
    onPress?: () => void;
    /** Custom icon (default: chevron-back) */
    icon?: keyof typeof Ionicons.glyphMap;
    /** Icon size (default: 24) */
    size?: number;
    /** Additional styles */
    style?: ViewStyle;
    /** Icon color override */
    color?: string;
    /** Accessibility label */
    label?: string;
}

function BackButton({
    onPress,
    icon = 'chevron-back',
    size = 24,
    style,
    color,
    label = 'Go back',
}: BackButtonProps) {
    const router = useRouter();
    const { colors } = useTheme();
    const iconColor = color ?? colors.text.primary;

    return (
        <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.surface.glassHover }, style]}
            onPress={onPress || (() => router.back())}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityHint="Double tap to navigate back"
        >
            <Ionicons name={icon} size={size} color={iconColor} />
        </TouchableOpacity>
    );
}

const MemoizedBackButton = React.memo(BackButton);
export { MemoizedBackButton as BackButton };
export default MemoizedBackButton;

const styles = StyleSheet.create({
    button: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
