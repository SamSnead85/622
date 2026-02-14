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

function BrandLogoComponent({ size = 'standard' }: BrandLogoProps) {
    const { colors, isDark } = useTheme();
    const fontSize = FONT_SIZE[size];
    const markSize = MARK_SIZE[size];
    const borderRadius = size === 'hero' ? 20 : size === 'standard' ? 16 : 12;

    // In light mode, use a dark rounded mark with inverse text for contrast
    if (!isDark) {
        return (
            <View style={[styles.mark, { width: markSize, height: markSize, borderRadius, backgroundColor: colors.text.primary }]}>
                <Text style={[styles.markText, { fontSize: fontSize * 0.6, color: colors.text.inverse }]}>
                    0G
                </Text>
            </View>
        );
    }

    // In dark mode, use the brand accent color with glow effect
    // Blue glow in dark mode, amber glow in warm mode
    return (
        <View style={styles.container}>
            <Text
                style={[
                    styles.logo,
                    {
                        fontSize,
                        color: colors.gold[500],
                        textShadowColor: colors.gold[400] + '50',
                        textShadowOffset: { width: 0, height: 0 },
                        textShadowRadius: size === 'hero' ? 24 : 14,
                    },
                ]}
            >
                0G
            </Text>
        </View>
    );
}

export const BrandLogo = React.memo(BrandLogoComponent);

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
