// ============================================
// Notification Permission Priming Screen
// Shown once after signup before the native iOS dialog
// ============================================

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { Button } from '../../components';

const PRIMING_KEY = '@notification-priming-shown';

// ============================================
// Floating notification example badges
// ============================================

interface NotificationBadge {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    color: string;
    top: number;
    left?: number;
    right?: number;
    delay: number;
}

const NOTIFICATION_BADGES: NotificationBadge[] = [
    {
        icon: 'time-outline',
        label: 'Asr in 15 min',
        color: colors.gold[400],
        top: 8,
        right: -8,
        delay: 400,
    },
    {
        icon: 'chatbubble-outline',
        label: 'New message',
        color: colors.azure[400],
        top: 70,
        left: -16,
        delay: 600,
    },
    {
        icon: 'calendar-outline',
        label: 'Community event',
        color: colors.emerald[400],
        top: 120,
        right: -12,
        delay: 800,
    },
];

// ============================================
// Benefit row data
// ============================================

interface Benefit {
    icon: keyof typeof Ionicons.glyphMap;
    emoji: string;
    title: string;
    subtitle: string;
    color: string;
}

const BENEFITS: Benefit[] = [
    {
        icon: 'moon-outline',
        emoji: '🕌',
        title: 'Prayer time reminders',
        subtitle: 'never miss a prayer',
        color: colors.gold[400],
    },
    {
        icon: 'chatbubbles-outline',
        emoji: '💬',
        title: 'Messages from family & friends',
        subtitle: '',
        color: colors.azure[400],
    },
    {
        icon: 'people-outline',
        emoji: '👥',
        title: 'Community updates & events',
        subtitle: '',
        color: colors.emerald[400],
    },
];

// ============================================
// Component
// ============================================

export default function NotificationPrimingScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);

    const markPrimingShown = useCallback(async () => {
        try {
            await AsyncStorage.setItem(PRIMING_KEY, 'true');
        } catch {
            // Silently handle
        }
    }, []);

    const navigateForward = useCallback(() => {
        router.replace('/(tabs)');
    }, [router]);

    const handleEnable = useCallback(async () => {
        setLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            await Notifications.requestPermissionsAsync();
        } catch {
            // Permission request failed — proceed anyway
        }

        await markPrimingShown();
        setLoading(false);
        navigateForward();
    }, [markPrimingShown, navigateForward]);

    const handleSkip = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await markPrimingShown();
        navigateForward();
    }, [markPrimingShown, navigateForward]);

    return (
        <LinearGradient
            colors={[colors.obsidian[900], colors.obsidian[900], colors.obsidian[800]]}
            style={styles.container}
        >
            <View style={[styles.content, { paddingTop: insets.top + spacing['3xl'], paddingBottom: insets.bottom + spacing.lg }]}>

                {/* ============================================ */}
                {/* Hero: Bell icon with glow + floating badges  */}
                {/* ============================================ */}
                <Animated.View entering={FadeIn.duration(600)} style={styles.heroSection}>
                    <View style={styles.bellContainer}>
                        {/* Gold glow layers */}
                        <View style={styles.glowOuter} />
                        <View style={styles.glowMiddle} />
                        <View style={styles.glowInner}>
                            <Ionicons name="notifications" size={56} color={colors.gold[400]} />
                        </View>

                        {/* Floating notification examples */}
                        {NOTIFICATION_BADGES.map((badge, i) => (
                            <Animated.View
                                key={i}
                                entering={FadeInDown.delay(badge.delay).duration(500).springify()}
                                style={[
                                    styles.floatingBadge,
                                    {
                                        top: badge.top,
                                        ...(badge.left != null ? { left: badge.left } : {}),
                                        ...(badge.right != null ? { right: badge.right } : {}),
                                    },
                                ]}
                            >
                                <View style={[styles.floatingBadgeIcon, { backgroundColor: badge.color + '20' }]}>
                                    <Ionicons name={badge.icon} size={14} color={badge.color} />
                                </View>
                                <Text style={styles.floatingBadgeText}>{badge.label}</Text>
                            </Animated.View>
                        ))}
                    </View>
                </Animated.View>

                {/* ============================================ */}
                {/* Title + Subtitle                             */}
                {/* ============================================ */}
                <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.textSection}>
                    <Text style={styles.title}>Stay Connected{'\n'}to What Matters</Text>
                    <Text style={styles.subtitle}>
                        Get timely updates from your community, conversations, and daily spiritual tools.
                    </Text>
                </Animated.View>

                {/* ============================================ */}
                {/* Benefits list                                */}
                {/* ============================================ */}
                <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.benefitsSection}>
                    {BENEFITS.map((benefit, i) => (
                        <Animated.View
                            key={i}
                            entering={FadeInDown.delay(500 + i * 120).duration(400)}
                            style={styles.benefitRow}
                        >
                            <View style={[styles.benefitIcon, { backgroundColor: benefit.color + '15' }]}>
                                <Ionicons name={benefit.icon} size={22} color={benefit.color} />
                            </View>
                            <View style={styles.benefitTextContainer}>
                                <Text style={styles.benefitTitle}>
                                    {benefit.emoji} {benefit.title}
                                    {benefit.subtitle ? (
                                        <Text style={styles.benefitSubtitle}> — {benefit.subtitle}</Text>
                                    ) : null}
                                </Text>
                            </View>
                        </Animated.View>
                    ))}
                </Animated.View>

                {/* Spacer */}
                <View style={styles.spacer} />

                {/* ============================================ */}
                {/* Actions                                      */}
                {/* ============================================ */}
                <Animated.View entering={FadeInDown.delay(800).duration(500)} style={styles.actionsSection}>
                    <Button
                        title="Enable Notifications"
                        onPress={handleEnable}
                        variant="primary"
                        size="lg"
                        fullWidth
                        loading={loading}
                        icon="notifications-outline"
                        style={styles.enableButton}
                    />

                    <Pressable
                        onPress={handleSkip}
                        style={styles.skipButton}
                        accessibilityRole="button"
                        accessibilityLabel="Skip enabling notifications"
                    >
                        <Text style={styles.skipText}>Maybe Later</Text>
                    </Pressable>
                </Animated.View>

                {/* ============================================ */}
                {/* Privacy note                                 */}
                {/* ============================================ */}
                <Animated.View entering={FadeIn.delay(1000).duration(400)} style={styles.privacySection}>
                    <Ionicons name="settings-outline" size={14} color={colors.text.muted} />
                    <Text style={styles.privacyText}>
                        You can customize which notifications you receive in Settings
                    </Text>
                </Animated.View>
            </View>
        </LinearGradient>
    );
}

// ============================================
// Styles
// ============================================

const BELL_SIZE = 110;
const GLOW_OUTER = 180;
const GLOW_MIDDLE = 150;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.xl,
    },

    // ── Hero ──────────────────────────────────
    heroSection: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    bellContainer: {
        width: GLOW_OUTER + 40,
        height: GLOW_OUTER + 40,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    glowOuter: {
        position: 'absolute',
        width: GLOW_OUTER,
        height: GLOW_OUTER,
        borderRadius: GLOW_OUTER / 2,
        backgroundColor: 'rgba(212, 175, 55, 0.06)',
    },
    glowMiddle: {
        position: 'absolute',
        width: GLOW_MIDDLE,
        height: GLOW_MIDDLE,
        borderRadius: GLOW_MIDDLE / 2,
        backgroundColor: 'rgba(212, 175, 55, 0.10)',
    },
    glowInner: {
        width: BELL_SIZE,
        height: BELL_SIZE,
        borderRadius: BELL_SIZE / 2,
        backgroundColor: 'rgba(212, 175, 55, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        // Gold glow shadow
        shadowColor: colors.gold[500],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
        elevation: 0,
    },

    // ── Floating notification badges ─────────
    floatingBadge: {
        position: 'absolute',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.obsidian[700],
        borderRadius: 20,
        paddingVertical: spacing.xs + 1,
        paddingHorizontal: spacing.sm + 2,
        gap: spacing.xs + 2,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        // Subtle lift shadow
        shadowColor: colors.obsidian[900],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    floatingBadgeIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    floatingBadgeText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
        fontFamily: 'Inter-Medium',
    },

    // ── Text section ─────────────────────────
    textSection: {
        alignItems: 'center',
        marginBottom: spacing['2xl'],
    },
    title: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: '700',
        color: colors.text.primary,
        textAlign: 'center',
        letterSpacing: -0.8,
        lineHeight: 38,
        fontFamily: 'Inter-Bold',
    },
    subtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
        marginTop: spacing.md,
        lineHeight: 22,
        maxWidth: 300,
        fontFamily: 'Inter',
    },

    // ── Benefits ─────────────────────────────
    benefitsSection: {
        gap: spacing.md,
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    benefitIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    benefitTextContainer: {
        flex: 1,
    },
    benefitTitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        fontFamily: 'Inter-Medium',
        lineHeight: 21,
    },
    benefitSubtitle: {
        color: colors.text.secondary,
        fontFamily: 'Inter',
    },

    // ── Spacer ───────────────────────────────
    spacer: {
        flex: 1,
    },

    // ── Actions ──────────────────────────────
    actionsSection: {
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    enableButton: {
        shadowColor: colors.gold[500],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    skipButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
    },
    skipText: {
        fontSize: typography.fontSize.base,
        color: colors.text.muted,
        fontFamily: 'Inter-Medium',
    },

    // ── Privacy ──────────────────────────────
    privacySection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs + 2,
    },
    privacyText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        textAlign: 'center',
        fontFamily: 'Inter',
    },
});
