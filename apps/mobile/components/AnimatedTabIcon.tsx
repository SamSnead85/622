import React, { useEffect } from 'react';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@zerog/ui';

// ============================================
// AnimatedTabIcon — bounce on focus transition
// ============================================

interface AnimatedTabIconProps {
    name: string;
    focused: boolean;
    color: string;
    size: number;
}

export function AnimatedTabIcon({ name, focused, color, size }: AnimatedTabIconProps) {
    const scale = useSharedValue(1);

    useEffect(() => {
        if (focused) {
            // Bounce: 1.0 -> 1.15 -> 1.0
            scale.value = withSpring(1.15, { damping: 6, stiffness: 300 }, () => {
                scale.value = withSpring(1, { damping: 8, stiffness: 200 });
            });
        } else {
            // Smoothly return to 1.0
            scale.value = withSpring(1, { damping: 10, stiffness: 200 });
        }
    }, [focused]);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View
            style={animStyle}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
        >
            <Ionicons
                name={name as keyof typeof Ionicons.glyphMap}
                size={size}
                color={color}
            />
        </Animated.View>
    );
}
