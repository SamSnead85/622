import React from 'react';
import {
    View,
    StyleSheet,
    ViewStyle,
    TouchableOpacity,
    TouchableOpacityProps,
} from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../theme';

type CardVariant = 'default' | 'glass' | 'elevated' | 'outlined';

interface CardProps extends TouchableOpacityProps {
    children: React.ReactNode;
    variant?: CardVariant;
    padding?: keyof typeof spacing;
    style?: ViewStyle;
    pressable?: boolean;
}

const variantStyles: Record<CardVariant, ViewStyle> = {
    default: {
        backgroundColor: colors.obsidian[700],
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    glass: {
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    elevated: {
        backgroundColor: colors.obsidian[700],
        ...shadows.md,
    },
    outlined: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.border.default,
    },
};

export const Card: React.FC<CardProps> = ({
    children,
    variant = 'default',
    padding = 'lg',
    style,
    pressable = false,
    ...props
}) => {
    const cardStyle = [
        styles.base,
        variantStyles[variant],
        { padding: spacing[padding] },
        style,
    ];

    if (pressable) {
        return (
            <TouchableOpacity
                style={cardStyle}
                activeOpacity={0.85}
                {...props}
            >
                {children}
            </TouchableOpacity>
        );
    }

    return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
    base: {
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
    },
});
