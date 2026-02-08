import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, colors, typography, spacing } from '@zerog/ui';

export default function WelcomeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.stagger(150, [
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.cubic),
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 600,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.cubic),
                }),
            ]),
        ]).start();
    }, []);

    return (
        <LinearGradient
            colors={[colors.obsidian[900], colors.obsidian[800]]}
            style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        >
            {/* Hero Section */}
            <Animated.View
                style={[
                    styles.heroSection,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                {/* Logo */}
                <View style={styles.logoContainer}>
                    <LinearGradient
                        colors={[colors.gold[400], colors.gold[600]]}
                        style={styles.logoGradient}
                    >
                        <Text style={styles.logoLetter}>C</Text>
                    </LinearGradient>
                </View>

                <Text style={styles.title}>Welcome to Caravan</Text>
                <Text style={styles.subtitle}>
                    Your private community platform. Connect with family, friends, and tribes — on your terms.
                </Text>
            </Animated.View>

            {/* Features */}
            <Animated.View
                style={[
                    styles.featuresSection,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                <FeatureItem
                    icon="🔒"
                    title="Private by Default"
                    description="Nobody sees your posts unless you invite them. Your world, your rules."
                />
                <FeatureItem
                    icon="👥"
                    title="Private Groups & Tribes"
                    description="Family groups, friend circles, teams — completely separated from the public."
                />
                <FeatureItem
                    icon="🌍"
                    title="Community is Optional"
                    description="Join the larger community when you're ready, or stay private forever."
                />
            </Animated.View>

            {/* Actions */}
            <Animated.View
                style={[
                    styles.actionsSection,
                    {
                        opacity: fadeAnim,
                    },
                ]}
            >
                <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onPress={() => router.push('/(auth)/signup')}
                >
                    Get Started
                </Button>

                <Button
                    variant="ghost"
                    size="lg"
                    fullWidth
                    onPress={() => router.push('/(auth)/login')}
                    style={styles.loginButton}
                >
                    Already have an account? Log in
                </Button>
            </Animated.View>

            {/* Footer */}
            <Text style={styles.terms}>
                By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
        </LinearGradient>
    );
}

interface FeatureItemProps {
    icon: string;
    title: string;
    description: string;
}

function FeatureItem({ icon, title, description }: FeatureItemProps) {
    return (
        <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>{icon}</Text>
            <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{title}</Text>
                <Text style={styles.featureDescription}>{description}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: spacing.xl,
    },
    heroSection: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: spacing['3xl'],
    },
    logoContainer: {
        marginBottom: spacing.xl,
    },
    logoGradient: {
        width: 80,
        height: 80,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoLetter: {
        fontSize: 40,
        fontWeight: '700',
        color: colors.obsidian[900],
        fontFamily: typography.fontFamily.sans,
    },
    title: {
        fontSize: typography.fontSize['4xl'],
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
        textAlign: 'center',
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: typography.fontSize.lg,
        color: colors.text.secondary,
        fontFamily: typography.fontFamily.sans,
        textAlign: 'center',
        marginTop: spacing.md,
        lineHeight: 26,
    },
    featuresSection: {
        paddingVertical: spacing['2xl'],
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
        paddingHorizontal: spacing.sm,
    },
    featureIcon: {
        fontSize: 32,
        marginRight: spacing.lg,
    },
    featureText: {
        flex: 1,
    },
    featureTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
    },
    featureDescription: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        fontFamily: typography.fontFamily.sans,
        marginTop: 2,
    },
    actionsSection: {
        paddingBottom: spacing.lg,
    },
    loginButton: {
        marginTop: spacing.md,
    },
    terms: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        fontFamily: typography.fontFamily.sans,
        textAlign: 'center',
        paddingBottom: spacing.lg,
    },
});
