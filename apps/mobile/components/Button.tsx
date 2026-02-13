// ============================================
// Button — Primary & Secondary action buttons
// Gold primary, glass secondary, with loading state
// ============================================

import React, { ReactNode } from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '@zerog/ui';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
    /** Button label */
    title: string;
    /** Press handler */
    onPress: () => void;
    /** Visual variant (default: primary) */
    variant?: ButtonVariant;
    /** Size preset (default: md) */
    size?: ButtonSize;
    /** Show loading spinner */
    loading?: boolean;
    /** Disable button */
    disabled?: boolean;
    /** Icon name (Ionicons) */
    icon?: keyof typeof Ionicons.glyphMap;
    /** Icon position (default: left) */
    iconPosition?: 'left' | 'right';
    /** Full width */
    fullWidth?: boolean;
    /** Haptic feedback (default: true) */
    haptic?: boolean;
    /** Additional container styles */
    style?: ViewStyle;
    /** Additional text styles */
    textStyle?: TextStyle;
    /** Custom children instead of title */
    children?: ReactNode;
    /** Accessibility label */
    label?: string;
}

const SIZE_CONFIG = {
    sm: { paddingH: spacing.md, paddingV: spacing.xs + 2, fontSize: typography.fontSize.sm, iconSize: 14, minHeight: 36 },
    md: { paddingH: spacing.xl, paddingV: spacing.md, fontSize: typography.fontSize.base, iconSize: 18, minHeight: 44 },
    lg: { paddingH: spacing['2xl'], paddingV: spacing.lg, fontSize: typography.fontSize.lg, iconSize: 20, minHeight: 52 },
};

function ButtonComponent({
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    haptic = true,
    style,
    textStyle,
    children,
    label,
}: ButtonProps) {
    const sizeConfig = SIZE_CONFIG[size];
    const isDisabled = disabled || loading;

    const handlePress = () => {
        if (haptic) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress();
    };

    const variantStyles = VARIANT_STYLES[variant];

    return (
        <TouchableOpacity
            style={[
                styles.button,
                {
                    paddingHorizontal: sizeConfig.paddingH,
                    paddingVertical: sizeConfig.paddingV,
                    minHeight: sizeConfig.minHeight,
                },
                variantStyles.container,
                fullWidth && styles.fullWidth,
                isDisabled && styles.disabled,
                style,
            ]}
            onPress={handlePress}
            disabled={isDisabled}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={label || title}
            accessibilityState={{ disabled: isDisabled, busy: loading }}
            accessibilityHint={loading ? 'Loading, please wait' : undefined}
        >
            {loading ? (
                <ActivityIndicator
                    size="small"
                    color={variantStyles.spinnerColor}
                />
            ) : (
                <>
                    {icon && iconPosition === 'left' && (
                        <Ionicons name={icon} size={sizeConfig.iconSize} color={variantStyles.iconColor} />
                    )}
                    {children || (
                        <Text
                            style={[
                                styles.text,
                                { fontSize: sizeConfig.fontSize },
                                variantStyles.text,
                                textStyle,
                            ]}
                        >
                            {title}
                        </Text>
                    )}
                    {icon && iconPosition === 'right' && (
                        <Ionicons name={icon} size={sizeConfig.iconSize} color={variantStyles.iconColor} />
                    )}
                </>
            )}
        </TouchableOpacity>
    );
}

export const Button = React.memo(ButtonComponent);

/** Convenience alias */
export function PrimaryButton(props: Omit<ButtonProps, 'variant'>) {
    return <Button variant="primary" {...props} />;
}

export function SecondaryButton(props: Omit<ButtonProps, 'variant'>) {
    return <Button variant="secondary" {...props} />;
}

const VARIANT_STYLES = {
    primary: {
        container: {
            backgroundColor: colors.gold[500],
        } as ViewStyle,
        text: {
            color: '#FFFFFF',
        } as TextStyle,
        iconColor: colors.obsidian[900],
        spinnerColor: colors.obsidian[900],
    },
    secondary: {
        container: {
            backgroundColor: colors.surface.glass,
            borderWidth: 1,
            borderColor: colors.border.subtle,
        } as ViewStyle,
        text: {
            color: colors.text.primary,
        } as TextStyle,
        iconColor: colors.text.primary,
        spinnerColor: colors.text.primary,
    },
    ghost: {
        container: {
            backgroundColor: 'transparent',
        } as ViewStyle,
        text: {
            color: colors.gold[500],
        } as TextStyle,
        iconColor: colors.gold[500],
        spinnerColor: colors.gold[500],
    },
    danger: {
        container: {
            backgroundColor: colors.surface.coralSubtle,
            borderWidth: 1,
            borderColor: colors.coral[500] + '30',
        } as ViewStyle,
        text: {
            color: colors.coral[500],
        } as TextStyle,
        iconColor: colors.coral[500],
        spinnerColor: colors.coral[500],
    },
};

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        borderRadius: 14,
    },
    fullWidth: {
        width: '100%',
    },
    disabled: {
        opacity: 0.5,
    },
    text: {
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
    },
});

export default Button;

