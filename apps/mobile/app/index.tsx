import { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography } from '@zerog/ui';
import { useAuthStore } from '../stores';

export default function SplashIndex() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const isInitialized = useAuthStore((s) => s.isInitialized);

    // If authenticated, go straight to the feed
    if (isInitialized && isAuthenticated) {
        return <Redirect href="/(tabs)" />;
    }

    // If not authenticated, go to welcome
    if (isInitialized && !isAuthenticated) {
        return <Redirect href="/(auth)/welcome" />;
    }

    // Still initializing — show splash
    return (
        <LinearGradient
            colors={[colors.obsidian[900], colors.obsidian[800]]}
            style={styles.container}
        >
            <View style={styles.logoContainer}>
                <View style={styles.logoIcon}>
                    <LinearGradient
                        colors={[colors.gold[400], colors.gold[600]]}
                        style={styles.logoGradient}
                    >
                        <Text style={styles.logoLetter}>0G</Text>
                    </LinearGradient>
                </View>
                <Text style={styles.brandName}>0G</Text>
                <Text style={styles.tagline}>Zero Gravity Social</Text>
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
    },
    brandName: {
        fontSize: 42,
        fontWeight: '700',
        color: colors.text.primary,
        letterSpacing: -1,
    },
    tagline: {
        fontSize: 16,
        color: colors.text.secondary,
        marginTop: 8,
    },
});
