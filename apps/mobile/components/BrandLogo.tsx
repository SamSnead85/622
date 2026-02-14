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

export function BrandLogo({ size = 'standard' }: BrandLogoProps) {
    const { colors } = useTheme();
    const fontSize = FONT_SIZE[size];

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
});
