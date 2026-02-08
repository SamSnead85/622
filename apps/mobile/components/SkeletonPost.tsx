import { View, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { colors, spacing } from '@zerog/ui';

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
    const shimmerAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnim, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    return (
        <Animated.View
            style={[
                {
                    width: width as any,
                    height,
                    borderRadius,
                    backgroundColor: colors.obsidian[600],
                    opacity: shimmerAnim,
                },
                style,
            ]}
        />
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
});
