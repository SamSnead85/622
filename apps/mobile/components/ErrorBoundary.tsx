// ============================================
// ErrorBoundary — Graceful crash recovery UI
// Catches JS errors in the component tree and shows
// a user-friendly recovery screen instead of a blank app.
// ============================================

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '@zerog/ui';

interface Props {
    children: ReactNode;
    /** Optional: custom fallback component */
    fallback?: ReactNode;
    /** Optional: screen name for logging context */
    screenName?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log to Sentry if available
        try {
            const Sentry = require('@sentry/react-native');
            if (Sentry?.captureException) {
                Sentry.captureException(error, {
                    extra: {
                        componentStack: errorInfo.componentStack,
                        screenName: this.props.screenName,
                    },
                });
            }
        } catch {
            // Sentry not available
        }
        console.error(`[ErrorBoundary${this.props.screenName ? ` - ${this.props.screenName}` : ''}]`, error, errorInfo.componentStack);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <View style={styles.container}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="warning-outline" size={40} color={colors.gold[500]} />
                    </View>
                    <Text style={styles.title}>Something went wrong</Text>
                    <Text style={styles.message}>
                        We hit an unexpected error. Tap below to try again.
                    </Text>
                    {__DEV__ && this.state.error && (
                        <ScrollView style={styles.devDetails} horizontal={false}>
                            <Text style={styles.devText}>{this.state.error.message}</Text>
                        </ScrollView>
                    )}
                    <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Retry">
                        <Ionicons name="refresh" size={18} color={colors.obsidian[900]} />
                        <Text style={styles.retryText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.obsidian[900],
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    title: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        color: colors.text.primary,
        marginBottom: spacing.sm,
        textAlign: 'center',
        fontFamily: 'Inter-Bold',
    },
    message: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing.xl,
    },
    devDetails: {
        maxHeight: 100,
        backgroundColor: colors.surface.glass,
        borderRadius: 10,
        padding: spacing.sm,
        marginBottom: spacing.lg,
        width: '100%',
    },
    devText: {
        fontSize: 11,
        color: colors.coral[400],
        fontFamily: 'monospace',
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.gold[500],
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: 14,
    },
    retryText: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.obsidian[900],
    },
});

export default ErrorBoundary;
