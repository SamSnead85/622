import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface BrandLogoProps {
    size?: 'hero' | 'standard' | 'compact';
}

const FONT_SIZE = {
    hero: 52,
    standard: 40,
    compact: 28,
} as const;

const MARK_SIZE = {
    hero: 72,
    standard: 56,
    compact: 40,
} as const;

export function BrandLogo({ size = 'standard' }: BrandLogoProps) {
    const { colors, isDark } = useTheme();
    const fontSize = FONT_SIZE[size];
    const markSize = MARK_SIZE[size];
    const borderRadius = size === 'hero' ? 20 : size === 'standard' ? 16 : 12;

    // In light mode, use a dark mark with inverse text for contrast
    // In dark mode, use the gold glow effect
    if (!isDark) {
        return (
            <View style={[styles.mark, { width: markSize, height: markSize, borderRadius, backgroundColor: colors.text.primary }]}>
                <Text style={[styles.markText, { fontSize: fontSize * 0.6, color: colors.text.inverse }]}>
                    0G
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text
                style={[
                    styles.logo,
                    {
                        fontSize,
                        color: colors.gold[500],
                        textShadowColor: colors.gold[500] + '60',
                        textShadowOffset: { width: 0, height: 0 },
                        textShadowRadius: size === 'hero' ? 20 : 12,
                    },
                ]}
            >
                0G
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    logo: {
        fontFamily: 'SpaceGrotesk-Bold',
        fontWeight: '700',
        letterSpacing: -1.5,
    },
    mark: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    markText: {
        fontFamily: 'SpaceGrotesk-Bold',
        fontWeight: '800',
        letterSpacing: -1,
    },
});
