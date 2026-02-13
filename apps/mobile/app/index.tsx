import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Redirect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import ReanimatedView, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing as REasing,
} from 'react-native-reanimated';
import { colors } from '@zerog/ui';
import { useAuthStore } from '../stores';
import { useTheme } from '../contexts/ThemeContext';

export default function SplashIndex() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const isInitialized = useAuthStore((s) => s.isInitialized);
    const user = useAuthStore((s) => s.user);

    // Animated values
    const logoScale = useRef(new Animated.Value(0.3)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const glowOpacity = useRef(new Animated.Value(0)).current;
    const glowScale = useRef(new Animated.Value(0.5)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const textTranslateY = useRef(new Animated.Value(20)).current;

    // Animated progress bar: 0% → 100% over ~2 seconds
    const progressWidth = useSharedValue(0);
    const animatedProgressStyle = useAnimatedStyle(() => ({
        width: `${progressWidth.value}%` as any,
    }));

    useEffect(() => {
        progressWidth.value = withTiming(100, {
            duration: 2000,
            easing: REasing.out(REasing.cubic),
        });
    }, []);

    useEffect(() => {
        // Logo entrance: spring scale + fade
        Animated.parallel([
            Animated.spring(logoScale, {
                toValue: 1,
                tension: 60,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.timing(logoOpacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start();

        // Gold glow pulse (start after logo appears)
        setTimeout(() => {
            Animated.loop(
                Animated.parallel([
                    Animated.sequence([
                        Animated.timing(glowOpacity, {
                            toValue: 0.6,
                            duration: 1200,
                            easing: Easing.inOut(Easing.ease),
                            useNativeDriver: true,
                        }),
                        Animated.timing(glowOpacity, {
                            toValue: 0.2,
                            duration: 1200,
                            easing: Easing.inOut(Easing.ease),
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.sequence([
                        Animated.timing(glowScale, {
                            toValue: 1.2,
                            duration: 1200,
                            easing: Easing.inOut(Easing.ease),
                            useNativeDriver: true,
                        }),
                        Animated.timing(glowScale, {
                            toValue: 0.8,
                            duration: 1200,
                            easing: Easing.inOut(Easing.ease),
                            useNativeDriver: true,
                        }),
                    ]),
                ])
            ).start();
        }, 200);

        // Text entrance (staggered)
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(textOpacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.spring(textTranslateY, {
                    toValue: 0,
                    tension: 60,
                    friction: 10,
                    useNativeDriver: true,
                }),
            ]).start();
        }, 400);
    }, []);

    // If authenticated, go straight to main app
    // Onboarding completion is now handled at signup/username step
    if (isInitialized && isAuthenticated) {
        return <Redirect href="/(tabs)" />;
    }

    // If not authenticated, go to welcome
    if (isInitialized && !isAuthenticated) {
        return <Redirect href="/(auth)/welcome" />;
    }

    // Still initializing — show animated splash
    return (
        <LinearGradient
            colors={[colors.obsidian[900], colors.obsidian[900], colors.obsidian[900]]}
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <View style={styles.logoContainer}>
                {/* Gold glow behind logo */}
                <Animated.View
                    style={[
                        styles.glow,
                        {
                            opacity: glowOpacity,
                            transform: [{ scale: glowScale }],
                        },
                    ]}
                />

                {/* Logo icon */}
                <Animated.View
                    style={[
                        styles.logoIcon,
                        {
                            opacity: logoOpacity,
                            transform: [{ scale: logoScale }],
                        },
                    ]}
                >
                    <LinearGradient
                        colors={[colors.gold[400], colors.gold[600]]}
                        style={styles.logoGradient}
                    >
                        <Text style={styles.logoLetter}>0G</Text>
                    </LinearGradient>
                </Animated.View>

                {/* Brand name */}
                <Animated.View
                    style={{
                        opacity: textOpacity,
                        transform: [{ translateY: textTranslateY }],
                    }}
                >
                    <Text style={styles.brandName}>0G</Text>
                    <Text style={styles.tagline}>Your Platform. Your Rules.</Text>
                </Animated.View>
            </View>

            {/* Subtle gold progress bar at bottom */}
            <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                    <ReanimatedView
                        style={[styles.progressFill, animatedProgressStyle]}
                    />
                </View>
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
    glow: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: colors.gold[500],
        top: -50,
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
        shadowColor: colors.gold[500],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 8,
    },
    logoLetter: {
        fontSize: 48,
        fontWeight: '700',
        color: '#FFFFFF',
        fontFamily: 'Inter-Bold',
    },
    brandName: {
        fontSize: 42,
        fontWeight: '700',
        color: colors.text.primary,
        letterSpacing: -1,
        textAlign: 'center',
        fontFamily: 'Inter-Bold',
    },
    tagline: {
        fontSize: 16,
        color: colors.text.secondary,
        marginTop: 8,
        textAlign: 'center',
        fontFamily: 'Inter',
    },
    progressContainer: {
        position: 'absolute',
        bottom: 80,
        left: 80,
        right: 80,
    },
    progressTrack: {
        height: 2,
        backgroundColor: colors.obsidian[600],
        borderRadius: 1,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.gold[500],
        borderRadius: 1,
    },
});
