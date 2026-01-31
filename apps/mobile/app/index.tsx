import { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography } from '@caravan/ui';

export default function SplashIndex() {
    const router = useRouter();
    const fadeAnim = new Animated.Value(0);
    const scaleAnim = new Animated.Value(0.8);

    useEffect(() => {
        // Animate logo entrance
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
                easing: Easing.out(Easing.cubic),
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();

        // Navigate to onboarding/home after delay
        const timer = setTimeout(() => {
            // TODO: Check if user is authenticated
            router.replace('/(auth)/welcome');
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <LinearGradient
            colors={[colors.obsidian[900], colors.obsidian[800]]}
            style={styles.container}
        >
            <Animated.View
                style={[
                    styles.logoContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                {/* Logo Icon */}
                <View style={styles.logoIcon}>
                    <LinearGradient
                        colors={[colors.gold[400], colors.gold[600]]}
                        style={styles.logoGradient}
                    >
                        <Text style={styles.logoLetter}>C</Text>
                    </LinearGradient>
                </View>

                {/* Brand Name */}
                <Text style={styles.brandName}>Caravan</Text>
                <Text style={styles.tagline}>Your Community, Your Story</Text>
            </Animated.View>

            {/* Bottom Attribution */}
            <View style={styles.bottomContainer}>
                <Text style={styles.version}>Version 1.0.0</Text>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoContainer: {
        alignItems: 'center',
    },
    logoIcon: {
        marginBottom: 24,
    },
    logoGradient: {
        width: 100,
        height: 100,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoLetter: {
        fontSize: 48,
        fontWeight: '700',
        color: colors.obsidian[900],
        fontFamily: typography.fontFamily.sans,
    },
    brandName: {
        fontSize: 42,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
        letterSpacing: -1,
    },
    tagline: {
        fontSize: 16,
        color: colors.text.secondary,
        fontFamily: typography.fontFamily.sans,
        marginTop: 8,
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 60,
    },
    version: {
        fontSize: 12,
        color: colors.text.muted,
        fontFamily: typography.fontFamily.sans,
    },
});
