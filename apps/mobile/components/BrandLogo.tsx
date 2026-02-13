import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface BrandLogoProps {
    size?: 'hero' | 'standard' | 'compact';
}

const FONT_SIZE = {
    hero: 52,
    standard: 40,
    compact: 28,
} as const;

export function BrandLogo({ size = 'standard' }: BrandLogoProps) {
    const { colors } = useTheme();

    return (
        <Text style={[styles.logo, { fontSize: FONT_SIZE[size], color: colors.gold[500] }]}>
            0G
        </Text>
    );
}

const styles = StyleSheet.create({
    logo: {
        fontFamily: 'Inter-Bold',
        fontWeight: '800',
        letterSpacing: -1.5,
    },
});
