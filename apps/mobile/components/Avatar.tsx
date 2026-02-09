// ============================================
// Avatar — Reusable circular profile image
// Supports multiple sizes with fallback initial letter
// ============================================

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { colors, typography } from '@zerog/ui';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const SIZES: Record<AvatarSize, number> = {
    xs: 28,
    sm: 36,
    md: 40,
    lg: 48,
    xl: 64,
    '2xl': 96,
};

const FONT_SIZES: Record<AvatarSize, number> = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    '2xl': 36,
};

interface AvatarProps {
    /** Image URL */
    uri?: string | null;
    /** Display name for fallback initial */
    name?: string;
    /** Size preset */
    size?: AvatarSize;
    /** Custom pixel size (overrides preset) */
    customSize?: number;
    /** Border color for ring effect */
    borderColor?: string;
    /** Border width */
    borderWidth?: number;
    /** Additional styles */
    style?: ViewStyle;
    /** Show gold glow ring */
    glow?: boolean;
    /** Accessibility label */
    label?: string;
}

export function Avatar({
    uri,
    name,
    size = 'md',
    customSize,
    borderColor,
    borderWidth: borderW,
    style,
    glow = false,
    label,
}: AvatarProps) {
    const dimension = customSize || SIZES[size];
    const fontSize = customSize ? customSize * 0.4 : FONT_SIZES[size];
    const radius = dimension / 2;
    const initial = name?.charAt(0).toUpperCase() || '?';

    const containerStyle: ViewStyle = {
        width: dimension,
        height: dimension,
        borderRadius: radius,
        ...(borderColor && { borderColor, borderWidth: borderW || 2 }),
        ...(glow && {
            shadowColor: colors.gold[500],
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.4,
            shadowRadius: 8,
        }),
    };

    if (uri) {
        return (
            <Image
                source={{ uri }}
                style={[containerStyle, style]}
                contentFit="cover"
                transition={200}
                accessibilityLabel={label || `${name || 'User'}'s avatar`}
                accessibilityRole="image"
            />
        );
    }

    return (
        <View
            style={[styles.placeholder, containerStyle, style]}
            accessibilityLabel={label || `${name || 'User'}'s avatar`}
            accessibilityRole="image"
        >
            <Text style={[styles.initial, { fontSize }]}>{initial}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    placeholder: {
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center',
        justifyContent: 'center',
    },
    initial: {
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
    },
});

export default Avatar;
