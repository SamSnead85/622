import React, { useCallback, useEffect } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withDelay,
    withSequence,
    runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '@zerog/ui';

// ============================================
// Particle — tiny heart that bursts outward and fades
// ============================================

const PARTICLE_COUNT = 6;

interface ParticleProps {
    index: number;
    trigger: Animated.SharedValue<number>;
}

function Particle({ index, trigger }: ParticleProps) {
    const angle = (index / PARTICLE_COUNT) * 2 * Math.PI;
    const radius = 24 + (index % 2) * 8; // stagger distance

    const animStyle = useAnimatedStyle(() => {
        const progress = trigger.value;
        return {
            opacity: progress * (1 - progress) * 4, // peaks at 0.5, fades at 1
            transform: [
                { translateX: Math.cos(angle) * radius * progress },
                { translateY: Math.sin(angle) * radius * progress },
                { scale: 0.5 + 0.5 * (1 - progress) },
            ],
        };
    });

    return (
        <Animated.View style={[styles.particle, animStyle]} pointerEvents="none">
            <Ionicons name="heart" size={8} color={colors.coral[500]} />
        </Animated.View>
    );
}

// ============================================
// AnimatedLikeButton — heart with burst effect
// ============================================

interface AnimatedLikeButtonProps {
    isLiked: boolean;
    count: number;
    onPress: () => void;
    authorName?: string;
}

export function AnimatedLikeButton({
    isLiked,
    count,
    onPress,
    authorName,
}: AnimatedLikeButtonProps) {
    const heartScale = useSharedValue(1);
    const particleTrigger = useSharedValue(0);
    const countOpacity = useSharedValue(1);

    // Animate heart when isLiked changes to true externally
    useEffect(() => {
        if (isLiked) {
            heartScale.value = withSequence(
                withSpring(1.4, { damping: 4, stiffness: 300 }),
                withSpring(1, { damping: 6, stiffness: 200 })
            );
        }
    }, [isLiked]);

    const fireHaptic = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, []);

    const handlePress = useCallback(() => {
        // Haptic feedback
        runOnJS(fireHaptic)();

        if (!isLiked) {
            // Liking — bounce + particles
            heartScale.value = withSequence(
                withSpring(1.4, { damping: 4, stiffness: 300 }),
                withSpring(1, { damping: 6, stiffness: 200 })
            );

            // Particle burst: animate 0 -> 1
            particleTrigger.value = 0;
            particleTrigger.value = withTiming(1, { duration: 500 });
        } else {
            // Unliking — subtle shrink
            heartScale.value = withSequence(
                withSpring(0.8, { damping: 8, stiffness: 300 }),
                withSpring(1, { damping: 6, stiffness: 200 })
            );
        }

        // Brief count bump
        countOpacity.value = withSequence(
            withTiming(0.5, { duration: 80 }),
            withTiming(1, { duration: 200 })
        );

        onPress();
    }, [isLiked, onPress]);

    const heartAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: heartScale.value }],
    }));

    const countAnimStyle = useAnimatedStyle(() => ({
        opacity: countOpacity.value,
    }));

    const accessibilityLabel = authorName
        ? `${isLiked ? 'Unlike' : 'Like'} post by ${authorName}. ${count} ${count === 1 ? 'like' : 'likes'}`
        : `${isLiked ? 'Unlike' : 'Like'} post. ${count} ${count === 1 ? 'like' : 'likes'}`;

    return (
        <Pressable
            onPress={handlePress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={isLiked ? 'Double tap to unlike this post' : 'Double tap to like this post'}
            accessibilityState={{ selected: isLiked }}
            style={styles.container}
        >
            {/* Particle burst layer */}
            <View style={styles.particleContainer} pointerEvents="none">
                {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
                    <Particle key={i} index={i} trigger={particleTrigger} />
                ))}
            </View>

            {/* Heart icon */}
            <Animated.View style={heartAnimStyle}>
                <Ionicons
                    name={isLiked ? 'heart' : 'heart-outline'}
                    size={22}
                    color={isLiked ? colors.coral[500] : colors.text.secondary}
                />
            </Animated.View>

            {/* Count */}
            {count > 0 && (
                <Animated.Text
                    style={[
                        styles.count,
                        { color: isLiked ? colors.coral[500] : colors.text.secondary },
                        countAnimStyle,
                    ]}
                >
                    {count}
                </Animated.Text>
            )}
        </Pressable>
    );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        minHeight: 44,
        minWidth: 44,
        paddingVertical: 4,
    },
    particleContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    particle: {
        position: 'absolute',
    },
    count: {
        fontSize: 13,
        fontWeight: '600',
        fontFamily: 'Inter-SemiBold',
        minWidth: 16,
    },
});
