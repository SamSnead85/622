// ============================================
// Request Access Screen — For people without an invite
// Warm revolutionary aesthetic, simple form
// ============================================

import { useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Keyboard,
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
import { BackButton, BrandLogo } from '../../components';
import { useTheme } from '../../contexts/ThemeContext';
import { apiFetch, API } from '../../lib/api';

export default function RequestAccessScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: c, isDark } = useTheme();

    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [reason, setReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const emailRef = useRef<TextInput>(null);
    const reasonRef = useRef<TextInput>(null);

    const handleSubmit = useCallback(async () => {
        Keyboard.dismiss();
        setError(null);

        if (!displayName.trim()) {
            setError('Please enter your name.');
            return;
        }
        if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
            setError('Please enter a valid email address.');
            return;
        }

        setIsLoading(true);
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await apiFetch(`/api/v1/trustchain/request-access`, {
                method: 'POST',
                body: JSON.stringify({
                    email: email.trim(),
                    displayName: displayName.trim(),
                    reason: reason.trim() || undefined,
                }),
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setIsSubmitted(true);
        } catch (err: unknown) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [displayName, email, reason]);

    // ---- Success State ----
    if (isSubmitted) {
        return (
            <View
                style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}
            >
                <View style={styles.successContainer}>
                    <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.successIconWrap}>
                        <View style={[styles.successIcon, { backgroundColor: c.gold[500] + '20' }]}>
                            <Ionicons name="mail-outline" size={40} color={c.gold[500]} />
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInUp.delay(400).duration(500)}>
                        <Text style={[styles.successTitle, { color: c.text.primary }]}>
                            Request submitted
                        </Text>
                        <Text style={[styles.successSubtitle, { color: c.text.secondary }]}>
                            We'll review your request and email you when you're in.{'\n'}
                            The people's network is worth the wait.
                        </Text>
                    </Animated.View>

                    <Animated.View entering={FadeInUp.delay(600).duration(400)}>
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.back();
                            }}
                            style={[styles.backButton, { backgroundColor: c.surface.glass, borderColor: c.border.default }]}
                        >
                            <Text style={[styles.backButtonText, { color: c.text.primary }]}>Back to sign up</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </View>
        );
    }

    // ---- Form State ----
    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
                    ]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                    bounces={false}
                >
                    <BackButton style={{ alignSelf: 'flex-start', marginBottom: spacing.md }} />

                    <Animated.View entering={FadeInDown.delay(30).duration(500).springify()} style={styles.logoArea}>
                        <BrandLogo size="standard" />
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(60).duration(500).springify()}>
                        <View style={styles.header}>
                            <Text style={[styles.title, { color: c.text.primary }]} accessibilityRole="header">
                                Request access
                            </Text>
                            <Text style={[styles.subtitle, { color: c.text.secondary }]}>
                                0G is invite-only. Tell us a bit about yourself{'\n'}and we'll review your request.
                            </Text>
                        </View>
                    </Animated.View>

                    {/* Error Banner */}
                    {error && (
                        <Animated.View entering={FadeIn.duration(200)} style={[styles.errorBanner, { backgroundColor: c.surface.coralSubtle, borderColor: c.coral[500] + '30' }]}>
                            <Ionicons name="alert-circle" size={18} color={c.coral[400]} />
                            <Text style={[styles.errorText, { color: c.coral[400] }]}>{error}</Text>
                        </Animated.View>
                    )}

                    {/* Form */}
                    <View style={styles.form}>
                        {/* Name */}
                        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                            <Text style={[styles.label, { color: c.text.secondary }]}>Name</Text>
                            <View style={[styles.inputWrap, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
                                <Ionicons name="person-outline" size={18} color={c.text.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: c.text.primary }]}
                                    placeholder="Your name"
                                    placeholderTextColor={c.text.muted}
                                    value={displayName}
                                    onChangeText={setDisplayName}
                                    autoCapitalize="words"
                                    autoComplete="name"
                                    returnKeyType="next"
                                    onSubmitEditing={() => emailRef.current?.focus()}
                                    selectionColor={c.gold[500]}
                                />
                            </View>
                        </Animated.View>

                        {/* Email */}
                        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
                            <Text style={[styles.label, { color: c.text.secondary }]}>Email</Text>
                            <View style={[styles.inputWrap, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
                                <Ionicons name="mail-outline" size={18} color={c.text.muted} style={styles.inputIcon} />
                                <TextInput
                                    ref={emailRef}
                                    style={[styles.input, { color: c.text.primary }]}
                                    placeholder="Email address"
                                    placeholderTextColor={c.text.muted}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoComplete="email"
                                    returnKeyType="next"
                                    onSubmitEditing={() => reasonRef.current?.focus()}
                                    selectionColor={c.gold[500]}
                                />
                            </View>
                        </Animated.View>

                        {/* Reason */}
                        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                            <Text style={[styles.label, { color: c.text.secondary }]}>Why do you want to join 0G? <Text style={{ color: c.text.muted }}>(optional)</Text></Text>
                            <View style={[styles.inputWrap, styles.textareaWrap, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
                                <TextInput
                                    ref={reasonRef}
                                    style={[styles.input, styles.textarea, { color: c.text.primary }]}
                                    placeholder="Tell us about yourself and why you want to join..."
                                    placeholderTextColor={c.text.muted}
                                    value={reason}
                                    onChangeText={setReason}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                    maxLength={1000}
                                    returnKeyType="done"
                                    selectionColor={c.gold[500]}
                                />
                            </View>
                            <Text style={[styles.charCount, { color: c.text.muted }]}>{reason.length}/1000</Text>
                        </Animated.View>

                        {/* Submit */}
                        <Animated.View entering={FadeInDown.delay(260).duration(400)}>
                            <TouchableOpacity
                                onPress={handleSubmit}
                                disabled={isLoading}
                                activeOpacity={0.85}
                                style={[styles.submitButton, { shadowColor: c.gold[500] }, isLoading && { opacity: 0.85 }]}
                            >
                                <LinearGradient
                                    colors={isLoading ? [c.gold[600], c.gold[700]] : [c.gold[400], c.gold[600]]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.submitGradient}
                                >
                                    {isLoading ? (
                                        <View style={styles.loadingRow}>
                                            <ActivityIndicator size="small" color={c.text.inverse} />
                                            <Text style={[styles.submitText, { color: c.text.inverse }]}>Submitting...</Text>
                                        </View>
                                    ) : (
                                        <Text style={[styles.submitText, { color: c.text.inverse }]}>Submit request</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>

                    {/* Back to signup */}
                    <Animated.View entering={FadeInUp.delay(300).duration(400)} style={styles.linkContainer}>
                        <Text style={[styles.linkText, { color: c.text.secondary }]}>Have an invite code? </Text>
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.back();
                            }}
                        >
                            <Text style={[styles.linkAction, { color: c.gold[500] }]}>Sign up</Text>
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

    logoArea: { alignItems: 'center', marginBottom: spacing.lg },
    header: { marginBottom: spacing.xl },
    title: {
        fontSize: 30,
        fontWeight: '800',
        letterSpacing: -1,
        lineHeight: 36,
        fontFamily: 'SpaceGrotesk-Bold',
    },
    subtitle: {
        fontSize: typography.fontSize.sm,
        marginTop: 6,
        lineHeight: 20,
        fontFamily: 'Inter',
        opacity: 0.7,
    },

    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        borderRadius: 12,
        borderWidth: 1,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.lg,
    },
    errorText: {
        flex: 1,
        fontSize: typography.fontSize.sm,
        lineHeight: 18,
    },

    form: { gap: spacing.lg },

    label: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        marginBottom: spacing.xs,
        fontFamily: 'Inter-SemiBold',
    },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: 1.5,
    },
    textareaWrap: {
        alignItems: 'flex-start',
    },
    inputIcon: {
        paddingLeft: spacing.md,
    },
    input: {
        flex: 1,
        fontSize: typography.fontSize.base,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        minHeight: 50,
        fontFamily: 'Inter',
    },
    textarea: {
        minHeight: 100,
        paddingTop: spacing.md,
    },
    charCount: {
        fontSize: typography.fontSize.xs,
        textAlign: 'right',
        marginTop: spacing.xxs,
    },

    submitButton: {
        marginTop: spacing.sm,
        // shadowColor set dynamically via theme — see inline styles
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 4,
    },
    submitGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderRadius: 14,
    },
    submitText: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'SpaceGrotesk-Bold',
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },

    linkContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: spacing.xl,
    },
    linkText: { fontSize: typography.fontSize.base },
    linkAction: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        fontFamily: 'Inter-SemiBold',
    },

    // ---- Success State ----
    successContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    successIconWrap: {
        marginBottom: spacing.xl,
    },
    successIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    successTitle: {
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: -0.5,
        fontFamily: 'SpaceGrotesk-Bold',
        marginBottom: spacing.md,
    },
    successSubtitle: {
        fontSize: typography.fontSize.base,
        textAlign: 'center',
        lineHeight: 22,
        fontFamily: 'Inter',
    },
    backButton: {
        marginTop: spacing.xl,
        paddingVertical: 14,
        paddingHorizontal: spacing.xl,
        borderRadius: 14,
        borderWidth: 1,
    },
    backButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        fontFamily: 'SpaceGrotesk-SemiBold',
    },
});
