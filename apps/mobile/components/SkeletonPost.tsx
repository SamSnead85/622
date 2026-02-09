import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing } from '@zerog/ui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function ShimmerBlock({
    width,
    height,
    borderRadius = 4,
    style,
}: {
    width: number | string;
    height: number;
    borderRadius?: number;
    style?: any;
}) {
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(shimmerAnim, {
                toValue: 1,
                duration: 1200,
                useNativeDriver: true,
            })
        ).start();
    }, []);

    const translateX = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
    });

    return (
        <View
            style={[
                {
                    width: width as any,
                    height,
                    borderRadius,
                    backgroundColor: colors.obsidian[700],
                    overflow: 'hidden',
                },
                style,
            ]}
        >
            <Animated.View
                style={{
                    ...StyleSheet.absoluteFillObject,
                    transform: [{ translateX }],
                }}
            >
                <LinearGradient
                    colors={['transparent', 'rgba(255,255,255,0.04)', 'transparent']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={{ width: SCREEN_WIDTH, height: '100%' }}
                />
            </Animated.View>
        </View>
    );
}

export default function SkeletonPost() {
    return (
        <View style={styles.card}>
            {/* Header row */}
            <View style={styles.header}>
                <ShimmerBlock width={40} height={40} borderRadius={20} />
                <View style={styles.headerText}>
                    <ShimmerBlock width={120} height={14} borderRadius={7} />
                    <ShimmerBlock
                        width={60}
                        height={10}
                        borderRadius={5}
                        style={{ marginTop: 6 }}
                    />
                </View>
            </View>

            {/* Content lines */}
            <ShimmerBlock
                width="100%"
                height={14}
                borderRadius={7}
                style={{ marginTop: spacing.md }}
            />
            <ShimmerBlock
                width="85%"
                height={14}
                borderRadius={7}
                style={{ marginTop: 8 }}
            />
            <ShimmerBlock
                width="60%"
                height={14}
                borderRadius={7}
                style={{ marginTop: 8 }}
            />

            {/* Media placeholder */}
            <ShimmerBlock
                width="100%"
                height={200}
                borderRadius={12}
                style={{ marginTop: spacing.md }}
            />

            {/* Actions row */}
            <View style={styles.actions}>
                <ShimmerBlock width={50} height={14} borderRadius={7} />
                <ShimmerBlock width={50} height={14} borderRadius={7} />
                <ShimmerBlock width={50} height={14} borderRadius={7} />
            </View>
        </View>
    );
}

export function SkeletonFeed() {
    return (
        <View style={styles.feed}>
            <SkeletonPost />
            <SkeletonPost />
            <SkeletonPost />
        </View>
    );
}

export function SkeletonGrid() {
    return (
        <View style={styles.gridContainer}>
            {Array.from({ length: 9 }).map((_, i) => (
                <ShimmerBlock
                    key={i}
                    width="31%"
                    height={110}
                    borderRadius={8}
                    style={{ marginBottom: spacing.xs }}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    feed: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
    },
    card: {
        backgroundColor: colors.surface.glass,
        borderRadius: 16,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerText: {
        marginLeft: spacing.sm,
    },
    actions: {
        flexDirection: 'row',
        gap: spacing.xl,
        marginTop: spacing.md,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
        paddingHorizontal: spacing.xl,
    },
});
