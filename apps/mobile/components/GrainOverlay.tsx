// ============================================
// GrainOverlay — Subtle film grain texture
// Adds analog warmth to screens (2-3% opacity)
// Wrap around screen content for that lived-in feel
// ============================================

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, Filter, FeTurbulence, Rect } from 'react-native-svg';

interface GrainOverlayProps {
    opacity?: number;
}

export function GrainOverlay({ opacity = 0.03 }: GrainOverlayProps) {
    return (
        <View style={[styles.overlay, { opacity }]} pointerEvents="none">
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                <Defs>
                    <Filter id="grain">
                        <FeTurbulence
                            type="fractalNoise"
                            baseFrequency="0.8"
                            numOctaves="4"
                            stitchTiles="stitch"
                        />
                    </Filter>
                </Defs>
                <Rect width="100%" height="100%" filter="url(#grain)" fill="white" />
            </Svg>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
    },
});

export default GrainOverlay;
