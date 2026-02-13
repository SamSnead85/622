// ============================================
// BrandLogo — "0G" rendered via SVG with metallic chrome gradient
// Works on both light and dark backgrounds (no image, no black bg)
// ============================================

import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';

interface BrandLogoProps {
    /** Width of the SVG container — height auto-scales at 1:2 ratio */
    size?: 'hero' | 'standard' | 'compact';
}

// Dimensions per size variant
const SIZES = {
    hero: { width: 140, height: 70, fontSize: 66 },
    standard: { width: 110, height: 55, fontSize: 52 },
    compact: { width: 80, height: 40, fontSize: 38 },
} as const;

export function BrandLogo({ size = 'standard' }: BrandLogoProps) {
    const { isDark } = useTheme();
    const { width, height, fontSize } = SIZES[size];

    // Dark mode: chrome highlight from white → bright blue → deep blue
    // Light mode: steel blue gradient that pops against white
    const stops = isDark
        ? [
              { offset: '0%', color: '#FFFFFF', opacity: '0.95' },   // chrome highlight
              { offset: '15%', color: '#C8D4FF', opacity: '1' },     // ice blue
              { offset: '35%', color: '#8FA3FF', opacity: '1' },     // bright
              { offset: '55%', color: '#6B7FFF', opacity: '1' },     // core
              { offset: '75%', color: '#4A5CE8', opacity: '1' },     // deep
              { offset: '100%', color: '#3545C0', opacity: '1' },    // shadow
          ]
        : [
              { offset: '0%', color: '#4A5CE8', opacity: '1' },      // deep blue top
              { offset: '20%', color: '#5B6DF5', opacity: '1' },     // medium
              { offset: '45%', color: '#6B7FFF', opacity: '1' },     // core
              { offset: '65%', color: '#5060E0', opacity: '1' },     // dip (metallic band)
              { offset: '85%', color: '#6B7FFF', opacity: '1' },     // bright again
              { offset: '100%', color: '#3D4DD0', opacity: '1' },    // deep bottom
          ];

    return (
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <Defs>
                {/* Vertical gradient — simulates top-lit metallic surface */}
                <LinearGradient id="chrome" x1="0%" y1="0%" x2="0%" y2="100%">
                    {stops.map((s, i) => (
                        <Stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
                    ))}
                </LinearGradient>
            </Defs>
            <SvgText
                x={width / 2}
                y={height * 0.78}
                textAnchor="middle"
                fontFamily="Inter-Bold"
                fontSize={fontSize}
                fontWeight="900"
                letterSpacing={-2}
                fill="url(#chrome)"
            >
                0G
            </SvgText>
        </Svg>
    );
}
