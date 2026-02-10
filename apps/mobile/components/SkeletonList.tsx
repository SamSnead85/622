import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated as RNAnimated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing } from '@zerog/ui';

interface SkeletonListProps {
  count?: number;
  variant?: 'message' | 'notification' | 'setting' | 'card';
}

const ShimmerBlock = ({ width, height, borderRadius = 8 }: { width: number | string; height: number; borderRadius?: number }) => {
  const shimmer = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    const loop = RNAnimated.loop(
      RNAnimated.timing(shimmer, { toValue: 1, duration: 1200, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);
  const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-200, 200] });
  return (
    <View style={[{ width: width as any, height, borderRadius, backgroundColor: colors.surface.glass, overflow: 'hidden' }]}>
      <RNAnimated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.05)', 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </RNAnimated.View>
    </View>
  );
};

// Message variant: avatar circle + two lines
const MessageSkeleton = () => (
  <View style={skStyles.row}>
    <ShimmerBlock width={48} height={48} borderRadius={24} />
    <View style={skStyles.textCol}>
      <ShimmerBlock width="60%" height={14} />
      <ShimmerBlock width="80%" height={12} />
    </View>
    <ShimmerBlock width={40} height={12} />
  </View>
);

// Notification variant: icon circle + text
const NotificationSkeleton = () => (
  <View style={skStyles.row}>
    <ShimmerBlock width={40} height={40} borderRadius={20} />
    <View style={skStyles.textCol}>
      <ShimmerBlock width="70%" height={14} />
      <ShimmerBlock width="50%" height={12} />
    </View>
  </View>
);

// Setting variant: icon + label + chevron
const SettingSkeleton = () => (
  <View style={skStyles.settingRow}>
    <ShimmerBlock width={36} height={36} borderRadius={10} />
    <View style={skStyles.textCol}>
      <ShimmerBlock width="40%" height={14} />
    </View>
    <ShimmerBlock width={20} height={20} borderRadius={4} />
  </View>
);

// Card variant: full-width card
const CardSkeleton = () => (
  <View style={skStyles.card}>
    <ShimmerBlock width="100%" height={120} borderRadius={14} />
    <View style={{ marginTop: spacing.sm }}>
      <ShimmerBlock width="60%" height={16} />
    </View>
    <View style={{ marginTop: spacing.xs }}>
      <ShimmerBlock width="80%" height={12} />
    </View>
  </View>
);

const VARIANTS = { message: MessageSkeleton, notification: NotificationSkeleton, setting: SettingSkeleton, card: CardSkeleton };

export default function SkeletonList({ count = 6, variant = 'card' }: SkeletonListProps) {
  const Component = VARIANTS[variant];
  return (
    <View style={skStyles.container}>
      {Array.from({ length: count }).map((_, i) => <Component key={i} />)}
    </View>
  );
}

const skStyles = StyleSheet.create({
  container: { padding: spacing.xl, gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  textCol: { flex: 1, gap: spacing.xs },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  card: { padding: spacing.md, backgroundColor: colors.surface.glass, borderRadius: 14, marginBottom: spacing.md },
});
