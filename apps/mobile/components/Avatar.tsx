// ============================================
// Avatar — Reusable circular profile image
// Supports multiple sizes, fallback initial letter,
// and optional cause/identity frame rings
// ============================================

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Circle, G } from 'react-native-svg';
import { colors, typography } from '@zerog/ui';
import { AVATAR_PLACEHOLDER } from '../lib/imagePlaceholder';
import { getAvatarFrame, type AvatarFrame } from '../lib/avatarFrames';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const SIZES: Record<AvatarSize, number> = {
    xs: 28,
    sm: 36,
    md: 40,
    lg: 48,
    xl: 64,
    '2xl': 96,
};

const FONT_SIZES: Record<AvatarSize, number> = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    '2xl': 36,
};

/** Ring width scales with avatar size */
function getRingWidth(dimension: number): number {
    if (dimension <= 36) return 2.5;
    if (dimension <= 48) return 3;
    if (dimension <= 64) return 3.5;
    return 4.5;
}

/** Renders a segmented or gradient ring around the avatar using SVG arcs */
function FrameRing({ frame, dimension }: { frame: AvatarFrame; dimension: number }) {
    const ringWidth = getRingWidth(dimension);
    const svgSize = dimension + ringWidth * 2 + 2; // +2 for anti-alias padding
    const center = svgSize / 2;
    const radius = (dimension / 2) + (ringWidth / 2) + 0.5;
    const circumference = 2 * Math.PI * radius;
    const segmentCount = frame.ringColors.length;
    const segmentLength = circumference / segmentCount;
    const gapLength = frame.segmented ? 1.5 : 0; // Small gap between segments for flag-style

    return (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
            <Svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
                <G rotation="-90" origin={`${center}, ${center}`}>
                    {frame.ringColors.map((color, i) => {
                        const offset = i * segmentLength;
                        const dash = frame.segmented
                            ? segmentLength - gapLength
                            : segmentLength;
                        return (
                            <Circle
                                key={`${frame.id}-${i}`}
                                cx={center}
                                cy={center}
                                r={radius}
                                stroke={color}
                                strokeWidth={ringWidth}
                                fill="none"
                                strokeDasharray={`${dash} ${circumference - dash}`}
                                strokeDashoffset={-offset}
                                strokeLinecap={frame.segmented ? 'butt' : 'round'}
                            />
                        );
                    })}
                </G>
            </Svg>
        </View>
    );
}

interface AvatarProps {
    /** Image URL */
    uri?: string | null;
    /** Display name for fallback initial */
    name?: string;
    /** Size preset */
    size?: AvatarSize;
    /** Custom pixel size (overrides preset) */
    customSize?: number;
    /** Border color for ring effect */
    borderColor?: string;
    /** Border width */
    borderWidth?: number;
    /** Additional styles */
    style?: ViewStyle;
    /** Show gold glow ring */
    glow?: boolean;
    /** Accessibility label */
    label?: string;
    /** Avatar frame ID (cause/identity ring) */
    frameId?: string | null;
}

function Avatar({
    uri,
    name,
    size = 'md',
    customSize,
    borderColor,
    borderWidth: borderW,
    style,
    glow = false,
    label,
    frameId,
}: AvatarProps) {
    const dimension = customSize || SIZES[size];
    const fontSize = customSize ? customSize * 0.4 : FONT_SIZES[size];
    const radius = dimension / 2;
    const initial = name?.charAt(0).toUpperCase() || '?';
    const frame = getAvatarFrame(frameId);

    // When a frame is active, add padding for the ring
    const ringWidth = frame ? getRingWidth(dimension) : 0;
    const outerSize = dimension + (ringWidth * 2) + 2;

    const containerStyle: ViewStyle = {
        width: dimension,
        height: dimension,
        borderRadius: radius,
        ...(borderColor && !frame && { borderColor, borderWidth: borderW || 2 }),
        ...(glow && !frame && {
            shadowColor: colors.gold[500],
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.4,
            shadowRadius: 8,
        }),
    };

    const avatarContent = uri ? (
        <Image
            source={{ uri }}
            style={[containerStyle, style]}
            contentFit="cover"
            placeholder={AVATAR_PLACEHOLDER.blurhash}
            transition={AVATAR_PLACEHOLDER.transition}
            cachePolicy="memory-disk"
            accessibilityLabel={label || `${name || 'User'}'s avatar`}
            accessibilityRole="image"
        />
    ) : (
        <View
            style={[styles.placeholder, containerStyle, style]}
            accessibilityLabel={label || `${name || 'User'}'s avatar`}
            accessibilityRole="image"
        >
            <Text style={[styles.initial, { fontSize }]}>{initial}</Text>
        </View>
    );

    // If no frame, return the avatar directly (no wrapper overhead)
    if (!frame) return avatarContent;

    // With frame: wrap in a container that includes the SVG ring
    return (
        <View
            style={{
                width: outerSize,
                height: outerSize,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <FrameRing frame={frame} dimension={dimension} />
            {avatarContent}
        </View>
    );
}

const MemoizedAvatar = React.memo(Avatar);
export { MemoizedAvatar as Avatar };
export default MemoizedAvatar;

const styles = StyleSheet.create({
    placeholder: {
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center',
        justifyContent: 'center',
    },
    initial: {
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
    },
});
