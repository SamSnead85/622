import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
    TouchableOpacityProps,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
    children: React.ReactNode;
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    fullWidth?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, { container: ViewStyle; text: TextStyle }> = {
    primary: {
        container: {
            backgroundColor: colors.gold[500],
        },
        text: {
            color: colors.text.inverse,
        },
    },
    secondary: {
        container: {
            backgroundColor: colors.surface.glass,
            borderWidth: 1,
            borderColor: colors.border.default,
        },
        text: {
            color: colors.text.primary,
        },
    },
    ghost: {
        container: {
            backgroundColor: 'transparent',
        },
        text: {
            color: colors.gold[500],
        },
    },
    danger: {
        container: {
            backgroundColor: colors.coral[500],
        },
        text: {
            color: colors.text.primary,
        },
    },
};

const sizeStyles: Record<ButtonSize, { container: ViewStyle; text: TextStyle }> = {
    sm: {
        container: {
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderRadius: borderRadius.md,
        },
        text: {
            fontSize: typography.fontSize.sm,
        },
    },
    md: {
        container: {
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            borderRadius: borderRadius.lg,
        },
        text: {
            fontSize: typography.fontSize.base,
        },
    },
    lg: {
        container: {
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.lg,
            borderRadius: borderRadius.lg,
        },
        text: {
            fontSize: typography.fontSize.lg,
        },
    },
};

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    disabled,
    style,
    ...props
}) => {
    const variantStyle = variantStyles[variant];
    const sizeStyle = sizeStyles[size];

    return (
        <TouchableOpacity
            style={[
                styles.base,
                variantStyle.container,
                sizeStyle.container,
                fullWidth && styles.fullWidth,
                disabled && styles.disabled,
                style,
            ]}
            disabled={disabled || loading}
            activeOpacity={0.8}
            {...props}
        >
            {loading ? (
                <ActivityIndicator
                    size="small"
                    color={variant === 'primary' ? colors.text.inverse : colors.text.primary}
                />
            ) : (
                <>
                    {leftIcon}
                    <Text
                        style={[
                            styles.text,
                            variantStyle.text,
                            sizeStyle.text,
                            leftIcon && styles.textWithLeftIcon,
                            rightIcon && styles.textWithRightIcon,
                        ]}
                    >
                        {children}
                    </Text>
                    {rightIcon}
                </>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    fullWidth: {
        width: '100%',
    },
    disabled: {
        opacity: 0.5,
    },
    text: {
        fontFamily: typography.fontFamily.sans,
        fontWeight: typography.fontWeight.semibold as TextStyle['fontWeight'],
    },
    textWithLeftIcon: {
        marginLeft: spacing.sm,
    },
    textWithRightIcon: {
        marginRight: spacing.sm,
    },
});
