// ============================================
// Welcome Screen — Clean, minimal, theme-aware
// Single screen: logo, tagline, CTAs
// Inspired by UpScrolled simplicity + 0G identity
// ============================================

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
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
import { typography, spacing } from '@zerog/ui';
import { useTheme } from '../../contexts/ThemeContext';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const LOGO_SOURCE = require('../../assets/logo-0g.png');

export default function WelcomeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();

    const handleCreateAccount = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('/(auth)/signup');
    }, [router]);

    const handleLogin = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/(auth)/login');
    }, [router]);

    return (
        <View
            style={[
                styles.container,
                {
                    paddingTop: insets.top,
                    paddingBottom: insets.bottom,
                    backgroundColor: colors.background,
                },
            ]}
        >
            {/* Logo */}
            <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.logoSection}>
                <Image
                    source={LOGO_SOURCE}
                    style={styles.logoImage}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                />
            </Animated.View>

            {/* Tagline */}
            <Animated.View entering={FadeInUp.delay(400).duration(600)} style={styles.taglineSection}>
                <Text style={[styles.tagline, { color: colors.text.primary }]}>
                    Social without{'\n'}the surveillance.
                </Text>
                <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
                    Private communities, encrypted messaging, and a feed that works for you — not advertisers. Built for people who refuse to be the product.
                </Text>
            </Animated.View>

            {/* Spacer */}
            <View style={styles.spacer} />

            {/* CTAs */}
            <Animated.View entering={FadeInUp.delay(600).duration(500)} style={styles.ctaSection}>
                {/* Create Account — gold gradient, matches login/signup */}
                <Pressable
                    onPress={handleCreateAccount}
                    style={({ pressed }) => [
                        styles.primaryButton,
                        {
                            opacity: pressed ? 0.9 : 1,
                            transform: [{ scale: pressed ? 0.98 : 1 }],
                        },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Create account"
                >
                    <LinearGradient
                        colors={[colors.gold[400], colors.gold[600]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.primaryGradient}
                    >
                        <Text style={styles.primaryButtonText}>
                            Create account
                        </Text>
                    </LinearGradient>
                </Pressable>

                {/* Divider */}
                <View style={styles.dividerRow}>
                    <View style={[styles.dividerLine, { backgroundColor: colors.border.subtle }]} />
                    <Text style={[styles.dividerText, { color: colors.text.muted }]}>Or</Text>
                    <View style={[styles.dividerLine, { backgroundColor: colors.border.subtle }]} />
                </View>

                {/* Log In — secondary, glass surface */}
                <Pressable
                    onPress={handleLogin}
                    style={({ pressed }) => [
                        styles.secondaryButton,
                        {
                            backgroundColor: colors.surface.glass,
                            borderColor: colors.border.subtle,
                            opacity: pressed ? 0.85 : 1,
                            transform: [{ scale: pressed ? 0.98 : 1 }],
                        },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Log in to existing account"
                >
                    <Text style={[styles.secondaryButtonText, { color: colors.text.primary }]}>
                        Log in
                    </Text>
                </Pressable>
            </Animated.View>

            {/* Footer */}
            <Animated.View entering={FadeIn.delay(900).duration(400)} style={styles.footer}>
                <Text style={[styles.termsText, { color: colors.text.muted }]}>
                    By signing up, you agree to our{' '}
                    <Text style={[styles.termsLink, { color: colors.gold[500] }]}>Terms</Text>,{' '}
                    <Text style={[styles.termsLink, { color: colors.gold[500] }]}>Rules & Policies</Text>
                    , and{' '}
                    <Text style={[styles.termsLink, { color: colors.gold[500] }]}>Privacy Policy</Text>.
                </Text>

                <Pressable
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push('/tools' as any);
                    }}
                    style={styles.toolsLink}
                    accessibilityRole="button"
                    accessibilityLabel="Explore Prayer Times, Qibla, and more tools"
                >
                    <Ionicons name="compass-outline" size={14} color={colors.text.muted} />
                    <Text style={[styles.toolsLinkText, { color: colors.text.muted }]}>
                        Explore Prayer Times & Qibla
                    </Text>
                </Pressable>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    // ---- Logo ----
    logoSection: {
        alignItems: 'center',
        paddingTop: 48,
    },
    logoImage: {
        width: 120,
        height: 120,
    },

    // ---- Tagline ----
    taglineSection: {
        paddingHorizontal: spacing.xl,
        paddingTop: 48,
    },
    tagline: {
        fontSize: 38,
        fontWeight: '800',
        letterSpacing: -1.5,
        lineHeight: 46,
        fontFamily: 'Inter-Bold',
    },
    subtitle: {
        fontSize: typography.fontSize.base,
        lineHeight: 22,
        marginTop: spacing.lg,
        maxWidth: 300,
        fontFamily: 'Inter',
    },

    // ---- Spacer ----
    spacer: {
        flex: 1,
    },

    // ---- CTAs ----
    ctaSection: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.lg,
    },
    primaryButton: {
        overflow: 'hidden',
        borderRadius: 14,
    },
    primaryGradient: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderRadius: 14,
    },
    primaryButtonText: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: '#FFFFFF',
        fontFamily: 'Inter-Bold',
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.md,
        paddingHorizontal: spacing.xl,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        fontSize: typography.fontSize.sm,
        marginHorizontal: spacing.md,
        fontFamily: 'Inter',
    },
    secondaryButton: {
        height: 52,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        fontFamily: 'Inter-SemiBold',
    },

    // ---- Footer ----
    footer: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xl,
        alignItems: 'center',
    },
    termsText: {
        fontSize: typography.fontSize.xs,
        textAlign: 'center',
        lineHeight: 18,
        fontFamily: 'Inter',
    },
    termsLink: {
        fontFamily: 'Inter-Medium',
    },
    toolsLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: spacing.md,
        paddingVertical: spacing.xs,
    },
    toolsLinkText: {
        fontSize: typography.fontSize.xs,
        fontFamily: 'Inter-Medium',
    },
});
