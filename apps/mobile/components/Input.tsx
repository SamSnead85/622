// ============================================
// Input — Glass-styled text input
// Consistent input styling across all forms
// ============================================

import React, { forwardRef } from 'react';
import {
    View,
    TextInput,
    Text,
    StyleSheet,
    ViewStyle,
    TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '@zerog/ui';

interface InputProps extends TextInputProps {
    /** Label above input */
    label?: string;
    /** Error message */
    error?: string;
    /** Left icon */
    icon?: keyof typeof Ionicons.glyphMap;
    /** Container styles */
    containerStyle?: ViewStyle;
    /** Input wrapper styles */
    inputContainerStyle?: ViewStyle;
}

export const Input = forwardRef<TextInput, InputProps>(
    ({ label, error, icon, containerStyle, inputContainerStyle, style, ...props }, ref) => {
        return (
            <View style={[styles.container, containerStyle]}>
                {label && (
                    <Text style={styles.label} accessibilityRole="text">
                        {label}
                    </Text>
                )}
                <View
                    style={[
                        styles.inputWrapper,
                        error && styles.inputError,
                        inputContainerStyle,
                    ]}
                >
                    {icon && (
                        <Ionicons
                            name={icon}
                            size={18}
                            color={colors.text.muted}
                            style={styles.icon}
                        />
                    )}
                    <TextInput
                        ref={ref}
                        style={[styles.input, icon && styles.inputWithIcon, style]}
                        placeholderTextColor={colors.text.muted}
                        selectionColor={colors.gold[500]}
                        accessibilityLabel={label || props.placeholder}
                        accessibilityHint={error ? `Error: ${error}` : undefined}
                        accessibilityState={{ disabled: props.editable === false }}
                        {...props}
                    />
                </View>
                {error && (
                    <Text style={styles.errorText} accessibilityRole="alert">
                        {error}
                    </Text>
                )}
            </View>
        );
    }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.md,
    },
    label: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.secondary,
        marginBottom: spacing.xs,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        paddingHorizontal: spacing.lg,
        minHeight: 48,
    },
    inputError: {
        borderColor: colors.coral[500] + '60',
    },
    icon: {
        marginEnd: spacing.sm,
    },
    input: {
        flex: 1,
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        paddingVertical: spacing.md,
    },
    inputWithIcon: {
        paddingStart: 0,
    },
    errorText: {
        fontSize: typography.fontSize.xs,
        color: colors.coral[500],
        marginTop: spacing.xs,
    },
});

export default Input;
