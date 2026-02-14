// ============================================
// Welcome Screen — Premium, minimal, exclusive
// Inspired by Clubhouse's exclusivity, Threads' clean launch,
// and luxury brand aesthetics (centered, breathing room, contrast)
// ============================================

import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
    FadeInUp,
    FadeInDown,
    FadeIn,
} from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { useTheme } from '../../contexts/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function WelcomeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: c, isDark } = useTheme();

    const handleCreateAccount = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('/(auth)/signup');
    }, [router]);

    const handleLogin = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/(auth)/login');
    }, [router]);

    // Adaptive colors that work in both modes
    const accentColor = isDark ? c.gold[500] : c.gold[600];
    const accentBg = isDark ? c.gold[500] : c.text.primary;
    const accentText = isDark ? c.text.inverse : c.text.inverse;
    const pillBg = c.surface.glass;
    const pillText = c.text.secondary;
    const pillIcon = isDark ? c.gold[500] : c.gold[500];

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: c.background,
                    paddingTop: insets.top,
                    paddingBottom: insets.bottom,
                },
            ]}
        >
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={true}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── Top section: Logo + Headline ── */}
                <View style={styles.heroSection}>
                    {/* Brand mark */}
                    <Animated.View entering={FadeIn.delay(200).duration(800)} style={styles.logoWrap}>
                        <View style={[styles.logoMark, { backgroundColor: accentBg }]}>
                            <Text style={[styles.logoText, { color: accentText }]}>0G</Text>
                        </View>
                    </Animated.View>

                    {/* Headline — one powerful line */}
                    <Animated.View entering={FadeInUp.delay(400).duration(600)}>
                        <Text style={[styles.headline, { color: c.text.primary }]} accessibilityRole="header">
                            Social without{'\n'}the surveillance.
                        </Text>
                    </Animated.View>

                    {/* Subline — one sentence */}
                    <Animated.View entering={FadeInUp.delay(550).duration(500)}>
                        <Text style={[styles.subline, { color: c.text.muted }]}>
                            Private. Invite-only. Yours.
                        </Text>
                    </Animated.View>
                </View>

                {/* ── Trust signals — compact pills ── */}
                <Animated.View entering={FadeInUp.delay(650).duration(500)} style={styles.trustSection}>
                    {([
                        { icon: 'lock-closed' as const, label: 'Encrypted' },
                        { icon: 'eye-off' as const, label: 'No tracking' },
                        { icon: 'shield-checkmark' as const, label: 'Invite-only' },
                    ]).map((item, index) => (
                        <Animated.View
                            key={item.label}
                            entering={FadeInUp.delay(700 + index * 60).duration(300)}
                            style={[styles.trustPill, { backgroundColor: pillBg }]}
                        >
                            <Ionicons name={item.icon} size={13} color={pillIcon} />
                            <Text style={[styles.trustLabel, { color: pillText }]}>{item.label}</Text>
                        </Animated.View>
                    ))}
                </Animated.View>

                {/* ── Spacer ── */}
                <View style={styles.spacer} />

                {/* ── CTAs ── */}
                <Animated.View entering={FadeInUp.delay(800).duration(500)} style={styles.ctaSection}>
                    <Pressable
                        onPress={handleCreateAccount}
                        style={({ pressed }) => [
                            styles.primaryButton,
                            {
                                backgroundColor: accentBg,
                                opacity: pressed ? 0.9 : 1,
                                transform: [{ scale: pressed ? 0.98 : 1 }],
                            },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Get started"
                    >
                        <Text style={[styles.primaryButtonText, { color: accentText }]}>
                            Get started
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={handleLogin}
                        style={({ pressed }) => [
                            styles.secondaryButton,
                            {
                                opacity: pressed ? 0.7 : 1,
                                transform: [{ scale: pressed ? 0.98 : 1 }],
                            },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Log in to existing account"
                    >
                        <Text style={[styles.secondaryButtonText, { color: c.text.secondary }]}>
                            I already have an account
                        </Text>
                    </Pressable>
                </Animated.View>

                {/* ── Footer ── */}
                <Animated.View entering={FadeIn.delay(1000).duration(400)} style={styles.footer}>
                    <Text style={[styles.termsText, { color: c.text.muted }]}>
                        By continuing, you agree to our{' '}
                        <Text style={[styles.termsLink, { color: accentColor }]}>Terms</Text>
                        {' & '}
                        <Text style={[styles.termsLink, { color: accentColor }]}>Privacy Policy</Text>.
                    </Text>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },

    // ── Hero ──
    heroSection: {
        alignItems: 'center',
        paddingTop: SCREEN_HEIGHT * 0.12,
        paddingHorizontal: spacing.xl,
    },
    logoWrap: {
        marginBottom: 40,
    },
    logoMark: {
        width: 72,
        height: 72,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        fontSize: 32,
        fontWeight: '800',
        fontFamily: 'SpaceGrotesk-Bold',
        letterSpacing: -1,
    },

    headline: {
        fontSize: 34,
        fontWeight: '700',
        letterSpacing: -1,
        lineHeight: 40,
        textAlign: 'center',
        fontFamily: 'SpaceGrotesk-Bold',
    },
    subline: {
        fontSize: typography.fontSize.base,
        fontWeight: '500',
        letterSpacing: 2,
        textTransform: 'uppercase',
        textAlign: 'center',
        marginTop: 16,
        fontFamily: 'Inter-Medium',
    },

    // ── Trust signals ──
    trustSection: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginTop: 32,
        paddingHorizontal: spacing.lg,
    },
    trustPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
    },
    trustLabel: {
        fontSize: 12,
        fontWeight: '600',
        fontFamily: 'Inter-SemiBold',
    },

    // ── Spacer ──
    spacer: {
        flex: 1,
        minHeight: 60,
    },

    // ── CTAs ──
    ctaSection: {
        paddingHorizontal: 28,
        gap: 14,
    },
    primaryButton: {
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.obsidian[900],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 4,
    },
    primaryButtonText: {
        fontSize: 17,
        fontWeight: '700',
        fontFamily: 'SpaceGrotesk-Bold',
        letterSpacing: 0.3,
    },
    secondaryButton: {
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonText: {
        fontSize: 15,
        fontWeight: '600',
        fontFamily: 'Inter-SemiBold',
    },

    // ── Footer ──
    footer: {
        paddingHorizontal: spacing.xl,
        paddingTop: 20,
        paddingBottom: 16,
        alignItems: 'center',
    },
    termsText: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
        fontFamily: 'Inter',
    },
    termsLink: {
        fontFamily: 'Inter-SemiBold',
        fontWeight: '600',
    },
});
