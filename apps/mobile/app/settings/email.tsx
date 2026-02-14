// ============================================
// Email Settings Screen
// Update email address, verify email
// ============================================

import { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { typography, spacing } from '@zerog/ui';
import { ScreenHeader } from '../../components';
import { useAuthStore } from '../../stores';
import { apiFetch, API } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';

export default function EmailSettingsScreen() {
    const { colors: c } = useTheme();
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const refreshUser = useAuthStore((s) => s.refreshUser);

    const [newEmail, setNewEmail] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const isValidEmail = (email: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

    const handleUpdateEmail = useCallback(async () => {
        const trimmed = newEmail.trim();
        if (!trimmed || !isValidEmail(trimmed)) {
            setError('Please enter a valid email address');
            return;
        }
        if (trimmed === user?.email) {
            setError('This is already your current email');
            return;
        }

        setError(null);
        setSuccess(null);
        setIsSaving(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        try {
            await apiFetch(`/api/v1/users/me/email`, {
                method: 'PUT',
                body: JSON.stringify({ email: trimmed }),
            });
            setSuccess('Verification email sent to your new address. Please check your inbox.');
            setNewEmail('');
            refreshUser?.();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to update email';
            setError(message);
        } finally {
            setIsSaving(false);
        }
    }, [newEmail, user?.email, refreshUser]);

    const handleResendVerification = useCallback(async () => {
        setIsResending(true);
        setError(null);
        setSuccess(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        try {
            await apiFetch(`/api/v1/auth/resend-verification`, {
                method: 'POST',
            });
            setSuccess('Verification email sent! Check your inbox.');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to resend verification';
            setError(message);
        } finally {
            setIsResending(false);
        }
    }, []);

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <ScreenHeader title="Email" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <ScrollView
                    contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Current Email */}
                    <Animated.View entering={FadeInDown.duration(300)} style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: c.text.muted }]}>
                            Current Email
                        </Text>
                        <View style={[styles.card, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
                            <View style={styles.emailRow}>
                                <Ionicons name="mail" size={20} color={c.gold[400]} />
                                <Text style={[styles.emailText, { color: c.text.primary }]}>
                                    {user?.email || 'No email set'}
                                </Text>
                                {user?.emailVerified ? (
                                    <View style={[styles.badge, { backgroundColor: c.gold[500] + '20' }]}>
                                        <Ionicons name="checkmark-circle" size={14} color={c.gold[500]} />
                                        <Text style={[styles.badgeText, { color: c.gold[500] }]}>Verified</Text>
                                    </View>
                                ) : (
                                    <View style={[styles.badge, { backgroundColor: c.surface.coralSubtle }]}>
                                        <Ionicons name="alert-circle" size={14} color={c.coral[500]} />
                                        <Text style={[styles.badgeText, { color: c.coral[500] }]}>Unverified</Text>
                                    </View>
                                )}
                            </View>

                            {!user?.emailVerified && (
                                <TouchableOpacity
                                    style={[styles.resendBtn, { borderColor: c.gold[500] + '30' }]}
                                    onPress={handleResendVerification}
                                    disabled={isResending}
                                    activeOpacity={0.7}
                                >
                                    {isResending ? (
                                        <ActivityIndicator size="small" color={c.gold[400]} />
                                    ) : (
                                        <>
                                            <Ionicons name="refresh" size={16} color={c.gold[400]} />
                                            <Text style={[styles.resendText, { color: c.gold[400] }]}>
                                                Resend verification email
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    </Animated.View>

                    {/* Change Email */}
                    <Animated.View entering={FadeInDown.duration(300).delay(100)} style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: c.text.muted }]}>
                            Change Email
                        </Text>
                        <View style={[styles.card, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
                            <TextInput
                                style={[styles.input, {
                                    color: c.text.primary,
                                    backgroundColor: c.surface.glass,
                                    borderColor: c.border.subtle,
                                }]}
                                placeholder="New email address"
                                placeholderTextColor={c.text.muted}
                                value={newEmail}
                                onChangeText={(text) => {
                                    setNewEmail(text);
                                    setError(null);
                                    setSuccess(null);
                                }}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            <TouchableOpacity
                                style={[styles.saveBtn, {
                                    backgroundColor: newEmail.trim() ? c.gold[500] : c.surface.glassHover,
                                    opacity: isSaving ? 0.6 : 1,
                                }]}
                                onPress={handleUpdateEmail}
                                disabled={isSaving || !newEmail.trim()}
                                activeOpacity={0.7}
                            >
                                {isSaving ? (
                                    <ActivityIndicator size="small" color={c.text.inverse} />
                                ) : (
                                    <Text style={[styles.saveBtnText, {
                                        color: newEmail.trim() ? c.text.inverse : c.text.muted,
                                    }]}>
                                        Update Email
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    {/* Status Messages */}
                    {error && (
                        <Animated.View entering={FadeInDown.duration(200)} style={[styles.statusCard, { backgroundColor: c.surface.coralSubtle, borderColor: c.coral[500] + '30' }]}>
                            <Ionicons name="alert-circle" size={16} color={c.coral[500]} />
                            <Text style={[styles.statusText, { color: c.coral[500] }]}>{error}</Text>
                        </Animated.View>
                    )}
                    {success && (
                        <Animated.View entering={FadeInDown.duration(200)} style={[styles.statusCard, { backgroundColor: c.gold[500] + '15', borderColor: c.gold[500] + '30' }]}>
                            <Ionicons name="checkmark-circle" size={16} color={c.gold[500]} />
                            <Text style={[styles.statusText, { color: c.gold[500] }]}>{success}</Text>
                        </Animated.View>
                    )}

                    {/* Info */}
                    <Animated.View entering={FadeInDown.duration(300).delay(200)} style={styles.infoSection}>
                        <Ionicons name="information-circle" size={16} color={c.text.muted} />
                        <Text style={[styles.infoText, { color: c.text.muted }]}>
                            Changing your email requires verification. A confirmation link will be sent to your new address.
                        </Text>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    flex: { flex: 1 },
    content: { padding: spacing.lg },
    section: { marginBottom: spacing.xl },
    sectionTitle: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: spacing.sm,
        marginLeft: spacing.xs,
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: spacing.lg,
    },
    emailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    emailText: {
        flex: 1,
        fontSize: typography.fontSize.md,
        fontWeight: '500',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
    },
    resendBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        marginTop: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 12,
        borderWidth: 1,
    },
    resendText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
    },
    input: {
        fontSize: typography.fontSize.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: spacing.md,
    },
    saveBtn: {
        paddingVertical: spacing.sm + 2,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtnText: {
        fontSize: typography.fontSize.md,
        fontWeight: '700',
    },
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: spacing.md,
    },
    statusText: {
        flex: 1,
        fontSize: typography.fontSize.sm,
        fontWeight: '500',
    },
    infoSection: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    infoText: {
        flex: 1,
        fontSize: typography.fontSize.xs,
        lineHeight: 18,
    },
});
