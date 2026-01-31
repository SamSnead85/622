import React, { useState } from 'react';
import {
    TextInput,
    View,
    Text,
    StyleSheet,
    TextInputProps,
    TouchableOpacity,
    ViewStyle,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../theme';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    hint?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    containerStyle,
    secureTextEntry,
    style,
    ...props
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const isPassword = secureTextEntry !== undefined;

    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={styles.label}>{label}</Text>}

            <View
                style={[
                    styles.inputContainer,
                    isFocused && styles.inputContainerFocused,
                    error && styles.inputContainerError,
                ]}
            >
                {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

                <TextInput
                    style={[
                        styles.input,
                        leftIcon && styles.inputWithLeftIcon,
                        (rightIcon || isPassword) && styles.inputWithRightIcon,
                        style,
                    ]}
                    placeholderTextColor={colors.text.muted}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    secureTextEntry={isPassword && !showPassword}
                    {...props}
                />

                {isPassword && (
                    <TouchableOpacity
                        style={styles.rightIcon}
                        onPress={() => setShowPassword(!showPassword)}
                    >
                        <Text style={styles.showHideText}>
                            {showPassword ? 'Hide' : 'Show'}
                        </Text>
                    </TouchableOpacity>
                )}

                {rightIcon && !isPassword && (
                    <View style={styles.rightIcon}>{rightIcon}</View>
                )}
            </View>

            {error && <Text style={styles.error}>{error}</Text>}
            {hint && !error && <Text style={styles.hint}>{hint}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.lg,
    },
    label: {
        fontFamily: typography.fontFamily.sans,
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium as any,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
    },
    inputContainerFocused: {
        borderColor: colors.gold[500],
    },
    inputContainerError: {
        borderColor: colors.coral[500],
    },
    input: {
        flex: 1,
        fontFamily: typography.fontFamily.sans,
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        minHeight: 48,
    },
    inputWithLeftIcon: {
        paddingLeft: spacing.sm,
    },
    inputWithRightIcon: {
        paddingRight: spacing.sm,
    },
    leftIcon: {
        paddingLeft: spacing.lg,
    },
    rightIcon: {
        paddingRight: spacing.lg,
    },
    showHideText: {
        fontFamily: typography.fontFamily.sans,
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium as any,
        color: colors.gold[500],
    },
    error: {
        fontFamily: typography.fontFamily.sans,
        fontSize: typography.fontSize.sm,
        color: colors.coral[500],
        marginTop: spacing.xs,
    },
    hint: {
        fontFamily: typography.fontFamily.sans,
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        marginTop: spacing.xs,
    },
});
