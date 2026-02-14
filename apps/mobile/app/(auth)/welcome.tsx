// ============================================
// Welcome Screen — Revolutionary warm, bold
// "The people's network."
// ============================================

import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
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
import { BrandLogo } from '../../components';

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

    return (
        <LinearGradient
            colors={isDark
                ? [c.background, c.obsidian[700], c.background]
                : [c.background, c.obsidian[700], c.background]
            }
            locations={[0, 0.5, 1]}
            style={[
                styles.container,
                {
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
                {/* Logo */}
                <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.logoSection}>
                    <BrandLogo size="hero" />
                </Animated.View>

                {/* Tagline */}
                <Animated.View entering={FadeInUp.delay(400).duration(600)} style={styles.taglineSection}>
                    <Text style={[styles.tagline, { color: c.text.primary }]}>
                        Your data.{'\n'}Your rules.{'\n'}Your community.
                    </Text>
                    <Text style={[styles.subtitle, { color: c.text.secondary }]}>
                        A social network that doesn't spy on you,{'\n'}
                        sell your attention, or manipulate your feed.
                    </Text>
                </Animated.View>

                {/* Value Propositions — stacked, always visible */}
                <Animated.View entering={FadeInUp.delay(550).duration(500)} style={styles.valuePropSection}>
                    {([
                        { icon: 'lock-closed' as const, text: 'End-to-end encrypted — we can\'t read your messages' },
                        { icon: 'eye-off' as const, text: 'Zero ads, zero tracking, zero data selling' },
                        { icon: 'shield-checkmark' as const, text: 'Invite-only — every member is vouched for' },
                        { icon: 'options' as const, text: 'You control the algorithm, not the other way around' },
                    ]).map((item, index) => (
                        <Animated.View
                            key={item.text}
                            entering={FadeInUp.delay(600 + index * 70).duration(350)}
                            style={styles.valueRow}
                        >
                            <View style={[styles.valueIcon, { backgroundColor: c.gold[500] + '15' }]}>
                                <Ionicons name={item.icon} size={15} color={c.gold[500]} />
                            </View>
                            <Text style={[styles.valueText, { color: c.text.secondary }]}>{item.text}</Text>
                        </Animated.View>
                    ))}
                </Animated.View>

                {/* Spacer */}
                <View style={styles.spacer} />

                {/* CTAs */}
                <Animated.View entering={FadeInUp.delay(600).duration(500)} style={styles.ctaSection}>
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
                            colors={[c.gold[400], c.gold[600]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.primaryGradient}
                        >
                            <Text style={styles.primaryButtonText}>
                                Get started
                            </Text>
                        </LinearGradient>
                    </Pressable>

                    <View style={styles.dividerRow}>
                        <View style={[styles.dividerLine, { backgroundColor: c.border.subtle }]} />
                        <Text style={[styles.dividerText, { color: c.text.muted }]}>Or</Text>
                        <View style={[styles.dividerLine, { backgroundColor: c.border.subtle }]} />
                    </View>

                    <Pressable
                        onPress={handleLogin}
                        style={({ pressed }) => [
                            styles.secondaryButton,
                            {
                                backgroundColor: c.surface.glass,
                                borderColor: c.border.default,
                                opacity: pressed ? 0.85 : 1,
                                transform: [{ scale: pressed ? 0.98 : 1 }],
                            },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Log in to existing account"
                    >
                        <Text style={[styles.secondaryButtonText, { color: c.text.primary }]}>
                            Log in
                        </Text>
                    </Pressable>
                </Animated.View>

                {/* Footer */}
                <Animated.View entering={FadeIn.delay(900).duration(400)} style={styles.footer}>
                    <Text style={[styles.termsText, { color: c.text.muted }]}>
                        By signing up, you agree to our{' '}
                        <Text style={[styles.termsLink, { color: c.gold[500] }]}>Terms</Text>,{' '}
                        <Text style={[styles.termsLink, { color: c.gold[500] }]}>Rules & Policies</Text>
                        , and{' '}
                        <Text style={[styles.termsLink, { color: c.gold[500] }]}>Privacy Policy</Text>.
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
                        <Ionicons name="compass-outline" size={14} color={c.text.muted} />
                        <Text style={[styles.toolsLinkText, { color: c.text.muted }]}>
                            Explore Prayer Times & Qibla
                        </Text>
                    </Pressable>
                </Animated.View>
            </ScrollView>
        </LinearGradient>
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

    // ---- Logo ----
    logoSection: {
        alignItems: 'center',
        paddingTop: 48,
    },

    // ---- Tagline ----
    taglineSection: {
        paddingHorizontal: spacing.xl,
        paddingTop: 40,
    },
    tagline: {
        fontSize: 38,
        fontWeight: '700',
        letterSpacing: -1.5,
        lineHeight: 46,
        fontFamily: 'SpaceGrotesk-Bold',
    },
    subtitle: {
        fontSize: typography.fontSize.base,
        lineHeight: 22,
        marginTop: spacing.lg,
        maxWidth: 300,
        fontFamily: 'Inter',
    },

    // ---- Value Propositions ----
    valuePropSection: {
        paddingTop: 28,
        paddingHorizontal: spacing.xl,
        gap: 14,
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    valueIcon: {
        width: 30,
        height: 30,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    valueText: {
        flex: 1,
        fontSize: typography.fontSize.sm,
        lineHeight: 18,
        fontFamily: 'Inter',
    },

    // ---- Spacer ----
    spacer: {
        flex: 1,
        minHeight: 24,
    },

    // ---- CTAs ----
    ctaSection: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.lg,
    },
    primaryButton: {
        overflow: 'hidden',
        borderRadius: 16,
        shadowColor: '#FFB020',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 14,
        elevation: 4,
    },
    primaryGradient: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
    },
    primaryButtonText: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: '#1A1412',
        fontFamily: 'SpaceGrotesk-Bold',
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
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        fontFamily: 'SpaceGrotesk-SemiBold',
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
