import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
    FadeInDown,
    FadeIn,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    Easing,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing } from '@zerog/ui';
import { ScreenHeader, GlassCard } from '../../components';
import { showSuccess } from '../../stores/toastStore';

// ─── Types ───────────────────────────────────────────────────────────
interface FeedWeights {
    family: number;
    communities: number;
    trending: number;
    chronological: number;
}

const STORAGE_KEY = '@algorithm-settings';

const DEFAULT_WEIGHTS: FeedWeights = {
    family: 40,
    communities: 30,
    trending: 20,
    chronological: 10,
};

// ─── Feed Category Config ────────────────────────────────────────────
const CATEGORIES: Array<{
    key: keyof FeedWeights;
    label: string;
    color: string;
    icon: keyof typeof Ionicons.glyphMap;
}> = [
    { key: 'family', label: 'Family & Friends', color: colors.emerald[400], icon: 'people' },
    { key: 'communities', label: 'Communities', color: colors.azure[400], icon: 'globe-outline' },
    { key: 'trending', label: 'Trending', color: colors.gold[400], icon: 'trending-up' },
    { key: 'chronological', label: 'Chronological', color: colors.text.muted, icon: 'time-outline' },
];

// ─── "Why You See This" cards ────────────────────────────────────────
const REASON_CARDS: Array<{
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    title: string;
    explanation: string;
}> = [
    {
        icon: 'people',
        iconColor: colors.emerald[400],
        title: 'From your Family Circle',
        explanation: 'Posts from people you\'ve added to your family or close friends list are boosted to the top.',
    },
    {
        icon: 'trending-up',
        iconColor: colors.gold[400],
        title: 'Trending in your community',
        explanation: 'This post is getting high engagement from members of communities you\'ve joined.',
    },
    {
        icon: 'heart',
        iconColor: colors.coral[400],
        title: 'Because you liked similar posts',
        explanation: 'You\'ve engaged with similar content before, so we surface more like it.',
    },
    {
        icon: 'time-outline',
        iconColor: colors.azure[400],
        title: 'Chronological — newest first',
        explanation: 'This post simply appeared because it\'s recent. No algorithmic boost applied.',
    },
];

// ─── Quick Adjustment buttons ────────────────────────────────────────
const QUICK_ADJUSTMENTS: Array<{
    label: string;
    key: keyof FeedWeights;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
}> = [
    { label: 'Family', key: 'family', icon: 'people', color: colors.emerald[400] },
    { label: 'Communities', key: 'communities', icon: 'globe-outline', color: colors.azure[400] },
    { label: 'Trending', key: 'trending', icon: 'trending-up', color: colors.gold[400] },
    { label: 'Explore', key: 'chronological', icon: 'compass-outline', color: colors.text.secondary },
];

// ─── Animated Progress Bar ───────────────────────────────────────────
function AnimatedBar({
    percentage,
    color,
    delay,
}: {
    percentage: number;
    color: string;
    delay: number;
}) {
    const width = useSharedValue(0);

    useEffect(() => {
        width.value = withDelay(
            delay,
            withTiming(percentage, {
                duration: 800,
                easing: Easing.out(Easing.cubic),
            }),
        );
    }, [percentage, delay]);

    const animatedStyle = useAnimatedStyle(() => ({
        width: `${width.value}%` as any,
    }));

    return (
        <View style={styles.barTrack}>
            <Animated.View
                style={[
                    styles.barFill,
                    { backgroundColor: color },
                    animatedStyle,
                ]}
            />
        </View>
    );
}

// ─── Main Screen ─────────────────────────────────────────────────────
export default function AlgorithmInsightsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [weights, setWeights] = useState<FeedWeights>(DEFAULT_WEIGHTS);

    // Load saved weights from AsyncStorage
    useEffect(() => {
        (async () => {
            try {
                const raw = await AsyncStorage.getItem(STORAGE_KEY);
                if (raw) {
                    let parsed: Partial<FeedWeights>;
                    try { parsed = JSON.parse(raw); } catch { return; }
                    setWeights({
                        family: parsed.family ?? DEFAULT_WEIGHTS.family,
                        communities: parsed.communities ?? DEFAULT_WEIGHTS.communities,
                        trending: parsed.trending ?? DEFAULT_WEIGHTS.trending,
                        chronological: parsed.chronological ?? DEFAULT_WEIGHTS.chronological,
                    });
                }
            } catch {
                // use defaults silently
            }
        })();
    }, []);

    // Boost one category by 10%, reduce others proportionally
    const handleQuickAdjust = useCallback(async (key: keyof FeedWeights) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        setWeights((prev) => {
            const boost = 10;
            const current = prev[key];
            // Cap at 70%
            const newValue = Math.min(current + boost, 70);
            const added = newValue - current;

            if (added === 0) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                return prev;
            }

            // Distribute reduction across others
            const otherKeys = (Object.keys(prev) as Array<keyof FeedWeights>).filter((k) => k !== key);
            const otherTotal = otherKeys.reduce((sum, k) => sum + prev[k], 0);

            const updated = { ...prev, [key]: newValue };
            otherKeys.forEach((k) => {
                const ratio = prev[k] / otherTotal;
                updated[k] = Math.max(Math.round(prev[k] - added * ratio), 5);
            });

            // Normalise to 100
            const total = Object.values(updated).reduce((a, b) => a + b, 0);
            if (total !== 100) {
                const diff = 100 - total;
                // add remainder to the boosted key
                updated[key] += diff;
            }

            // Persist
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });

        showSuccess(`Showing more ${key === 'chronological' ? 'Explore' : key.charAt(0).toUpperCase() + key.slice(1)} content`);
    }, []);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800]]}
                style={StyleSheet.absoluteFill}
            />

            <ScreenHeader title="Feed DNA" showBack />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={{
                    paddingBottom: insets.bottom + 40,
                    paddingHorizontal: spacing.lg,
                }}
                showsVerticalScrollIndicator={false}
            >
                {/* ─── 1. Header Section ─────────────────────────── */}
                <Animated.View entering={FadeIn.duration(500)} style={styles.heroSection}>
                    <LinearGradient
                        colors={[colors.surface.goldSubtle, 'transparent']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                    <Ionicons name="analytics-outline" size={28} color={colors.gold[400]} />
                    <Text style={styles.heroTitle}>Your Feed DNA</Text>
                    <Text style={styles.heroSubtitle}>
                        See exactly how your algorithm works — no black boxes
                    </Text>
                </Animated.View>

                {/* ─── 2. Feed Composition Breakdown ─────────────── */}
                <Animated.View entering={FadeInDown.duration(400).delay(100)}>
                    <Text style={styles.sectionTitle}>Feed Composition</Text>

                    <GlassCard padding="lg" style={styles.compositionCard}>
                        {CATEGORIES.map((cat, i) => (
                            <View key={cat.key} style={styles.barRow}>
                                <View style={styles.barLabelRow}>
                                    <View style={styles.barLabelLeft}>
                                        <Ionicons
                                            name={cat.icon}
                                            size={14}
                                            color={cat.color}
                                        />
                                        <Text style={[styles.barLabel, { color: cat.color }]}>
                                            {cat.label}
                                        </Text>
                                    </View>
                                    <Text style={[styles.barPercent, { color: cat.color }]}>
                                        {weights[cat.key]}%
                                    </Text>
                                </View>
                                <AnimatedBar
                                    percentage={weights[cat.key]}
                                    color={cat.color}
                                    delay={200 + i * 150}
                                />
                            </View>
                        ))}
                    </GlassCard>
                </Animated.View>

                {/* ─── 3. "Why You See This" Section ─────────────── */}
                <Animated.View entering={FadeInDown.duration(400).delay(300)}>
                    <Text style={styles.sectionTitle}>Why You See This</Text>
                    <Text style={styles.sectionDesc}>
                        Every post in your feed has a reason — here's how it works
                    </Text>

                    {REASON_CARDS.map((card, i) => (
                        <Animated.View
                            key={card.title}
                            entering={FadeInDown.duration(350).delay(400 + i * 100)}
                        >
                            <GlassCard padding="md" style={styles.reasonCard}>
                                <View style={styles.reasonRow}>
                                    <View
                                        style={[
                                            styles.reasonIconWrap,
                                            { backgroundColor: card.iconColor + '15' },
                                        ]}
                                    >
                                        <Ionicons
                                            name={card.icon}
                                            size={20}
                                            color={card.iconColor}
                                        />
                                    </View>
                                    <View style={styles.reasonContent}>
                                        <Text style={styles.reasonTitle}>{card.title}</Text>
                                        <Text style={styles.reasonExplanation}>
                                            {card.explanation}
                                        </Text>
                                    </View>
                                </View>
                            </GlassCard>
                        </Animated.View>
                    ))}
                </Animated.View>

                {/* ─── 4. Quick Adjustments ───────────────────────── */}
                <Animated.View entering={FadeInDown.duration(400).delay(700)}>
                    <Text style={styles.sectionTitle}>Quick Adjustments</Text>
                    <Text style={styles.sectionDesc}>
                        Tap to show more of what you love
                    </Text>

                    <View style={styles.adjustGrid}>
                        {QUICK_ADJUSTMENTS.map((adj) => (
                            <TouchableOpacity
                                key={adj.key}
                                style={styles.adjustBtn}
                                activeOpacity={0.7}
                                onPress={() => handleQuickAdjust(adj.key)}
                            >
                                <LinearGradient
                                    colors={[adj.color + '18', adj.color + '08']}
                                    style={styles.adjustBtnGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Ionicons
                                        name={adj.icon}
                                        size={22}
                                        color={adj.color}
                                    />
                                    <Text style={[styles.adjustLabel, { color: adj.color }]}>
                                        Show more
                                    </Text>
                                    <Text style={styles.adjustCategory}>
                                        {adj.label}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Animated.View>

                {/* ─── 5. Transparency Badge ──────────────────────── */}
                <Animated.View entering={FadeInDown.duration(400).delay(900)}>
                    <GlassCard
                        padding="lg"
                        style={styles.transparencyBadge}
                    >
                        <View style={styles.transparencyRow}>
                            <View style={styles.shieldWrap}>
                                <Ionicons
                                    name="shield-checkmark"
                                    size={28}
                                    color={colors.gold[400]}
                                />
                            </View>
                            <View style={styles.transparencyContent}>
                                <Text style={styles.transparencyTitle}>
                                    Full Transparency Promise
                                </Text>
                                <Text style={styles.transparencyText}>
                                    Unlike other platforms, you can see and control exactly how your
                                    feed is built. No ads, no hidden promotion, no shadow banning.
                                </Text>
                            </View>
                        </View>
                    </GlassCard>
                </Animated.View>

                {/* ─── Fine-tune link ─────────────────────────────── */}
                <Animated.View entering={FadeInDown.duration(400).delay(1000)}>
                    <TouchableOpacity
                        style={styles.fineTuneBtn}
                        activeOpacity={0.7}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.push('/settings/algorithm' as any);
                        }}
                    >
                        <Ionicons name="options-outline" size={18} color={colors.gold[400]} />
                        <Text style={styles.fineTuneText}>
                            Fine-tune in Algorithm Mixer
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
                    </TouchableOpacity>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.obsidian[900],
    },
    scroll: {
        flex: 1,
    },

    // ─── Hero ─────────────────────────────────────
    heroSection: {
        borderRadius: 16,
        overflow: 'hidden',
        padding: spacing.xl,
        marginTop: spacing.lg,
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: colors.gold[500] + '20',
        alignItems: 'center',
    },
    heroTitle: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
        marginTop: spacing.sm,
        marginBottom: spacing.xs,
    },
    heroSubtitle: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 20,
    },

    // ─── Section headers ──────────────────────────
    sectionTitle: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginTop: spacing.xl,
        marginBottom: spacing.sm,
        marginStart: spacing.xs,
    },
    sectionDesc: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        marginBottom: spacing.md,
        marginStart: spacing.xs,
        lineHeight: 16,
    },

    // ─── Feed Composition Bars ────────────────────
    compositionCard: {
        gap: spacing.lg,
    },
    barRow: {
        gap: spacing.xs,
    },
    barLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    barLabelLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    barLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
    },
    barPercent: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
    },
    barTrack: {
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.obsidian[600],
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: 4,
    },

    // ─── "Why You See This" cards ─────────────────
    reasonCard: {
        marginBottom: spacing.sm,
    },
    reasonRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
    },
    reasonIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    reasonContent: {
        flex: 1,
    },
    reasonTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: 2,
    },
    reasonExplanation: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        lineHeight: 18,
    },

    // ─── Quick Adjustments ────────────────────────
    adjustGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    adjustBtn: {
        width: '48%' as any,
        flexGrow: 1,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    adjustBtnGradient: {
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.md,
        alignItems: 'center',
        gap: spacing.xs,
    },
    adjustLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        marginTop: spacing.xs,
    },
    adjustCategory: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.text.primary,
    },

    // ─── Transparency Badge ───────────────────────
    transparencyBadge: {
        marginTop: spacing.xl,
        borderColor: colors.gold[500] + '40',
        borderWidth: 1,
    },
    transparencyRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
    },
    shieldWrap: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center',
        justifyContent: 'center',
    },
    transparencyContent: {
        flex: 1,
    },
    transparencyTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.gold[400],
        marginBottom: spacing.xs,
    },
    transparencyText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        lineHeight: 20,
    },

    // ─── Fine-tune link ───────────────────────────
    fineTuneBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing.xl,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    fineTuneText: {
        flex: 1,
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
    },
});
