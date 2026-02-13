// ============================================
// Username Screen — Clean, theme-aware
// Simplified: pick a username, then go to main app
// ============================================

import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
    FadeInDown,
    FadeInUp,
    FadeIn,
} from 'react-native-reanimated';
import { typography, spacing } from '@zerog/ui';
import { BackButton } from '../../components';
import { apiFetch, API } from '../../lib/api';
import { useAuthStore } from '../../stores';
import { useTheme } from '../../contexts/ThemeContext';

function RequirementItem({ met, text, colors: c }: { met: boolean; text: string; colors: any }) {
    return (
        <View style={reqStyles.item}>
            <Ionicons
                name={met ? 'checkmark-circle' : 'ellipse-outline'}
                size={14}
                color={met ? c.emerald[500] : c.text.muted}
            />
            <Text style={[reqStyles.text, { color: met ? c.text.secondary : c.text.muted }]}>{text}</Text>
        </View>
    );
}

const reqStyles = StyleSheet.create({
    item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    text: { fontSize: typography.fontSize.sm },
});

export default function UsernameScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: c, isDark } = useTheme();
    const refreshUser = useAuthStore((s) => s.refreshUser);

    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [error, setError] = useState('');

    // Username availability check
    useEffect(() => {
        if (username.length < 3) { setIsAvailable(null); return; }
        setChecking(true);
        const timer = setTimeout(async () => {
            try {
                const data = await apiFetch<any>(API.checkUsername, {
                    method: 'POST',
                    body: JSON.stringify({ username }),
                });
                const available = data.available !== false;
                setIsAvailable(available);
                if (available) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
                // On error, don't block the user
                setIsAvailable(true);
            } finally {
                setChecking(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [username]);

    const handleContinue = useCallback(async () => {
        if (!username || username.length < 3) {
            setError('Username must be at least 3 characters');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }
        if (!isAvailable) {
            setError('This username is not available');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setLoading(true);
        try {
            await apiFetch(API.updateProfile, { method: 'PUT', body: JSON.stringify({ username }) });
            // Mark onboarding as complete — user goes straight to the app
            try {
                await apiFetch(API.onboardingComplete, { method: 'POST' });
            } catch {
                // Non-critical — continue even if this fails
            }
            await refreshUser();
            router.replace('/(tabs)' as any);
        } catch (err: any) {
            setError(err?.data?.error || err?.message || 'Unable to update username.');
        } finally {
            setLoading(false);
        }
    }, [username, isAvailable, refreshUser, router]);

    const handleSkip = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Mark onboarding complete even when skipping
        try {
            await apiFetch(API.onboardingComplete, { method: 'POST' });
            await refreshUser();
        } catch {
            // Non-critical
        }
        router.replace('/(tabs)' as any);
    }, [refreshUser, router]);

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
                    ]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Back button */}
                    <BackButton
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
                        style={{ alignSelf: 'flex-start', marginBottom: spacing.xl }}
                    />

                    {/* Header */}
                    <Animated.View entering={FadeInDown.delay(100).duration(500)}>
                        <Text style={[styles.title, { color: c.text.primary }]}>
                            What would you like{'\n'}to be called?
                        </Text>
                        <Text style={[styles.subtitle, { color: c.text.secondary }]}>
                            Your @handle is unique. You can change it anytime
                        </Text>
                    </Animated.View>

                    {/* Username Input */}
                    <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.inputSection}>
                        <Text style={[styles.inputLabel, { color: c.text.secondary }]}>Handle</Text>
                        <View style={[
                            styles.inputWrapper,
                            {
                                backgroundColor: c.surface.glass,
                                borderColor: error
                                    ? c.coral[500]
                                    : isAvailable === true
                                        ? c.emerald[500] + '60'
                                        : c.border.subtle,
                            },
                        ]}>
                            <Text style={[styles.inputPrefix, { color: c.text.muted }]}>@</Text>
                            <TextInput
                                style={[styles.textInput, { color: c.text.primary }]}
                                placeholder="username"
                                placeholderTextColor={c.text.muted}
                                autoCapitalize="none"
                                autoCorrect={false}
                                autoFocus
                                value={username}
                                onChangeText={(text) => {
                                    setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                                    setError('');
                                }}
                                selectionColor={c.gold[500]}
                                accessibilityLabel="Username"
                            />
                            <View style={styles.statusIndicator}>
                                {checking && (
                                    <ActivityIndicator size="small" color={c.text.muted} />
                                )}
                                {!checking && isAvailable === true && (
                                    <View style={[styles.statusDot, { backgroundColor: c.emerald[500] }]}>
                                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                    </View>
                                )}
                                {!checking && isAvailable === false && (
                                    <View style={[styles.statusDot, { backgroundColor: c.coral[500] }]}>
                                        <Ionicons name="close" size={14} color="#FFFFFF" />
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Status messages */}
                        <View style={styles.statusMessage}>
                            {checking && (
                                <Text style={[styles.statusText, { color: c.text.muted }]}>Checking availability...</Text>
                            )}
                            {!checking && isAvailable === true && (
                                <Text style={[styles.statusText, { color: c.emerald[500] }]}>Username is available</Text>
                            )}
                            {!checking && isAvailable === false && (
                                <Text style={[styles.statusText, { color: c.coral[500] }]}>Username is taken</Text>
                            )}
                            {error ? <Text style={[styles.statusText, { color: c.coral[500] }]}>{error}</Text> : null}
                        </View>

                        {/* Requirements */}
                        <View style={styles.requirements}>
                            <RequirementItem met={username.length >= 3} text="At least 3 characters" colors={c} />
                            <RequirementItem met={username.length <= 20} text="Maximum 20 characters" colors={c} />
                            <RequirementItem met={/^[a-z0-9_]*$/.test(username)} text="Only lowercase, numbers, underscores" colors={c} />
                        </View>
                    </Animated.View>

                    {/* Spacer */}
                    <View style={styles.spacer} />

                    {/* CTA — gold gradient, matches entire auth flow */}
                    <Animated.View entering={FadeInUp.delay(300).duration(500)}>
                        <TouchableOpacity
                            onPress={handleContinue}
                            disabled={!isAvailable || loading}
                            activeOpacity={0.85}
                            style={[styles.continueButton, (!isAvailable || loading) && { opacity: 0.5 }]}
                            accessibilityRole="button"
                            accessibilityLabel={loading ? 'Setting up your profile' : 'Sign up'}
                        >
                            <LinearGradient
                                colors={(!isAvailable || loading) ? [c.border.subtle, c.border.default] : [c.gold[400], c.gold[600]]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.continueGradient}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="#000" />
                                ) : (
                                    <Text style={styles.continueButtonText}>Sign up</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.skipButton}
                            onPress={handleSkip}
                            accessibilityRole="button"
                            accessibilityLabel="Skip username selection"
                        >
                            <Text style={[styles.skipText, { color: c.text.muted }]}>I'll do this later</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    keyboardView: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingHorizontal: spacing.xl },

    title: {
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: -0.8,
        lineHeight: 36,
        fontFamily: 'Inter-Bold',
    },
    subtitle: {
        fontSize: typography.fontSize.base,
        marginTop: spacing.sm,
        lineHeight: 22,
    },

    // ---- Input ----
    inputSection: {
        marginTop: spacing['2xl'],
    },
    inputLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: '500',
        marginBottom: spacing.sm,
        fontFamily: 'Inter-Medium',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: 1.5,
        paddingHorizontal: spacing.md,
    },
    inputPrefix: {
        fontSize: 18,
        fontWeight: '500',
        marginEnd: spacing.xs,
    },
    textInput: {
        flex: 1,
        fontSize: typography.fontSize.base,
        paddingVertical: spacing.md,
        minHeight: 50,
        fontFamily: 'Inter',
    },
    statusIndicator: {
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusDot: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusMessage: {
        minHeight: 20,
        marginTop: spacing.sm,
    },
    statusText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '500',
    },
    requirements: {
        marginTop: spacing.xl,
        gap: spacing.sm,
    },

    // ---- Spacer ----
    spacer: { flex: 1, minHeight: 40 },

    // ---- CTA — gold gradient, matches auth flow ----
    continueButton: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    continueGradient: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderRadius: 14,
    },
    continueButtonText: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: '#FFFFFF',
        fontFamily: 'Inter-Bold',
    },
    skipButton: {
        alignSelf: 'center',
        paddingVertical: spacing.lg,
    },
    skipText: {
        fontSize: typography.fontSize.base,
        fontFamily: 'Inter-Medium',
    },
});
