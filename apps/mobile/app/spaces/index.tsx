// ============================================
// Spaces — Discovery Screen
// Browse active audio spaces, start a new one
// ============================================

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Pressable,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Animated, {
    FadeInDown,
    FadeIn,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    withSpring,
    interpolate,
    Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '@zerog/ui';
import { ScreenHeader } from '../../components';
import { apiFetch, API, clearApiCache } from '../../lib/api';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================
// Types
// ============================================

interface SpacePreview {
    id: string;
    title: string;
    description: string;
    topic: string;
    hostId: string;
    hostName: string;
    hostAvatar: string | null;
    speakerCount: number;
    listenerCount: number;
    totalParticipants: number;
    maxSpeakers: number;
    createdAt: number;
    status: string;
    speakerPreviews: { userId: string; name: string; avatar: string | null }[];
}

// ============================================
// Topics
// ============================================

const TOPICS = [
    { key: 'all', label: 'All', icon: 'apps' as const },
    { key: 'General', label: 'General', icon: 'chatbubbles' as const },
    { key: 'Tech', label: 'Tech', icon: 'code-slash' as const },
    { key: 'Music', label: 'Music', icon: 'musical-notes' as const },
    { key: 'Sports', label: 'Sports', icon: 'football' as const },
    { key: 'Culture', label: 'Culture', icon: 'earth' as const },
    { key: 'Gaming', label: 'Gaming', icon: 'game-controller' as const },
    { key: 'News', label: 'News', icon: 'newspaper' as const },
    { key: 'Comedy', label: 'Comedy', icon: 'happy' as const },
];

// ============================================
// Live Pulse Ring
// ============================================

function LivePulseRing({ size = 10 }: { size?: number }) {
    const pulse = useSharedValue(0);

    useEffect(() => {
        pulse.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
            ),
            -1,
            false,
        );
    }, [pulse]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(pulse.value, [0, 1], [0.4, 1]),
        transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.5]) }],
    }));

    return (
        <Animated.View
            style={[
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: colors.emerald[500],
                },
                animatedStyle,
            ]}
        />
    );
}

// ============================================
// Hero Section
// ============================================

function HeroSection({ liveCount }: { liveCount: number }) {
    const float = useSharedValue(0);

    useEffect(() => {
        float.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
            ),
            -1,
            false,
        );
    }, [float]);

    const animatedFloat = useAnimatedStyle(() => ({
        transform: [{ translateY: interpolate(float.value, [0, 1], [0, -6]) }],
    }));

    return (
        <Animated.View entering={FadeInDown.delay(60).duration(600)} style={styles.heroSection}>
            <View style={styles.heroPatternContainer}>
                {Array.from({ length: 12 }).map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.heroDot,
                            {
                                left: `${(i % 4) * 28 + 5}%` as any,
                                top: `${Math.floor(i / 4) * 35 + 10}%` as any,
                                opacity: 0.03 + (i % 3) * 0.02,
                                width: 4 + (i % 3) * 2,
                                height: 4 + (i % 3) * 2,
                                borderRadius: 2 + (i % 3),
                            },
                        ]}
                    />
                ))}
            </View>

            <Animated.View style={[styles.heroTextContainer, animatedFloat]}>
                <View style={styles.heroIconRow}>
                    <LinearGradient
                        colors={[colors.amber[500], colors.gold[500]]}
                        style={styles.heroIconBg}
                    >
                        <Ionicons name="mic" size={20} color="#FFFFFF" />
                    </LinearGradient>
                    {liveCount > 0 && (
                        <View style={styles.heroLiveBadge}>
                            <LivePulseRing size={6} />
                            <Text style={styles.heroLiveText}>
                                {liveCount} LIVE
                            </Text>
                        </View>
                    )}
                </View>
                <Text style={styles.heroTitle}>Spaces</Text>
                <Text style={styles.heroSubtitle}>Live audio conversations</Text>
            </Animated.View>
        </Animated.View>
    );
}

// ============================================
// Space Card
// ============================================

function SpaceCard({ space, index }: { space: SpacePreview; index: number }) {
    const router = useRouter();
    const scale = useSharedValue(1);

    const handlePressIn = useCallback(() => {
        scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
    }, [scale]);

    const handlePressOut = useCallback(() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    }, [scale]);

    const handlePress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push(`/spaces/${space.id}`);
    }, [space.id, router]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const staggerDelay = 150 + index * 100;
    const timeAgo = getTimeAgo(space.createdAt);

    return (
        <Animated.View entering={FadeInDown.delay(staggerDelay).duration(500).springify()}>
            <AnimatedPressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={handlePress}
                style={animatedStyle}
                accessibilityRole="button"
                accessibilityLabel={`Join ${space.title} hosted by ${space.hostName}`}
            >
                <View style={styles.spaceCard}>
                    {/* Top Row: Topic + Live */}
                    <View style={styles.cardTopRow}>
                        <View style={styles.topicBadge}>
                            <Text style={styles.topicBadgeText}>{space.topic}</Text>
                        </View>
                        <View style={styles.liveIndicator}>
                            <LivePulseRing size={6} />
                            <Text style={styles.liveIndicatorText}>LIVE</Text>
                        </View>
                    </View>

                    {/* Title */}
                    <Text style={styles.cardTitle} numberOfLines={2}>
                        {space.title}
                    </Text>

                    {/* Host */}
                    <View style={styles.hostRow}>
                        {space.hostAvatar ? (
                            <Image
                                source={{ uri: space.hostAvatar }}
                                style={styles.hostAvatar}
                                placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
                                transition={200}
                                cachePolicy="memory-disk"
                            />
                        ) : (
                            <View style={[styles.hostAvatar, styles.avatarPlaceholder]}>
                                <Ionicons name="person" size={10} color={colors.text.muted} />
                            </View>
                        )}
                        <Text style={styles.hostName} numberOfLines={1}>
                            {space.hostName}
                        </Text>
                        <View style={styles.hostBadge}>
                            <Text style={styles.hostBadgeText}>Host</Text>
                        </View>
                    </View>

                    {/* Speaker Avatars Row */}
                    {space.speakerPreviews.length > 0 && (
                        <View style={styles.speakerAvatarRow}>
                            {space.speakerPreviews.map((speaker, idx) => (
                                <View
                                    key={speaker.userId}
                                    style={[
                                        styles.speakerAvatarWrap,
                                        { marginLeft: idx > 0 ? -8 : 0, zIndex: 10 - idx },
                                    ]}
                                >
                                    {speaker.avatar ? (
                                        <Image
                                            source={{ uri: speaker.avatar }}
                                            style={styles.speakerAvatarSmall}
                                            placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
                                            transition={200}
                                            cachePolicy="memory-disk"
                                        />
                                    ) : (
                                        <View style={[styles.speakerAvatarSmall, styles.avatarPlaceholder]}>
                                            <Ionicons name="person" size={10} color={colors.text.muted} />
                                        </View>
                                    )}
                                </View>
                            ))}
                            {space.speakerCount > 3 && (
                                <View style={[styles.speakerAvatarWrap, { marginLeft: -8 }]}>
                                    <View style={[styles.speakerAvatarSmall, styles.moreAvatar]}>
                                        <Text style={styles.moreAvatarText}>+{space.speakerCount - 3}</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Bottom Stats */}
                    <View style={styles.cardBottomRow}>
                        <View style={styles.statItem}>
                            <Ionicons name="mic" size={12} color={colors.amber[400]} />
                            <Text style={styles.statText}>{space.speakerCount} speakers</Text>
                        </View>
                        <View style={styles.statDot} />
                        <View style={styles.statItem}>
                            <Ionicons name="headset" size={12} color={colors.text.muted} />
                            <Text style={styles.statText}>{space.listenerCount} listening</Text>
                        </View>
                        <View style={styles.statDot} />
                        <Text style={styles.timeText}>{timeAgo}</Text>
                    </View>
                </View>
            </AnimatedPressable>
        </Animated.View>
    );
}

// ============================================
// Empty State
// ============================================

function EmptyState() {
    const float = useSharedValue(0);

    useEffect(() => {
        float.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
            ),
            -1,
            false,
        );
    }, [float]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: interpolate(float.value, [0, 1], [0, -8]) }],
    }));

    return (
        <Animated.View entering={FadeIn.delay(200).duration(600)} style={styles.emptyState}>
            <Animated.View style={animatedStyle}>
                <LinearGradient
                    colors={[colors.amber[500] + '20', colors.gold[500] + '10']}
                    style={styles.emptyIconCircle}
                >
                    <Ionicons name="mic-outline" size={48} color={colors.amber[400]} />
                </LinearGradient>
            </Animated.View>
            <Text style={styles.emptyTitle}>No Active Spaces</Text>
            <Text style={styles.emptySubtitle}>
                Start a Space and invite others to join the conversation!
            </Text>
        </Animated.View>
    );
}

// ============================================
// Helpers
// ============================================

function getTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

// ============================================
// Main Screen
// ============================================

export default function SpacesScreen() {
    const router = useRouter();
    const [spaces, setSpaces] = useState<SpacePreview[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTopic, setActiveTopic] = useState('all');
    const [error, setError] = useState<string | null>(null);

    const fetchSpaces = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setIsRefreshing(true);
            clearApiCache(API.spacesActive);
        } else {
            setIsLoading(true);
        }
        setError(null);

        try {
            const data = await apiFetch<{ spaces: SpacePreview[] }>(
                API.spacesActive,
                { cache: !isRefresh },
            );
            setSpaces(data?.spaces || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load spaces');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchSpaces();
    }, [fetchSpaces]);

    // Auto-refresh every 15 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            clearApiCache(API.spacesActive);
            apiFetch<{ spaces: SpacePreview[] }>(API.spacesActive, { cache: false })
                .then((data) => setSpaces(data?.spaces || []))
                .catch(() => { /* silent refresh failure */ });
        }, 15000);
        return () => clearInterval(interval);
    }, []);

    const filteredSpaces = useMemo(() => {
        if (activeTopic === 'all') return spaces;
        return spaces.filter(
            (s) => s.topic.toLowerCase() === activeTopic.toLowerCase(),
        );
    }, [spaces, activeTopic]);

    const handleStartSpace = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        router.push('/spaces/create');
    }, [router]);

    const StartButton = useMemo(
        () => (
            <TouchableOpacity
                onPress={handleStartSpace}
                style={styles.headerBtn}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Start a Space"
            >
                <LinearGradient
                    colors={[colors.amber[500], colors.gold[500]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.headerBtnGradient}
                >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                </LinearGradient>
            </TouchableOpacity>
        ),
        [handleStartSpace],
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800], colors.obsidian[900]]}
                style={StyleSheet.absoluteFill}
            />

            <ScreenHeader title="Spaces" showBack noBorder rightElement={StartButton} />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={() => fetchSpaces(true)}
                        tintColor={colors.amber[500]}
                        colors={[colors.amber[500]]}
                    />
                }
            >
                <HeroSection liveCount={spaces.length} />

                {/* Start Banner */}
                <Animated.View entering={FadeInDown.delay(80).duration(500)}>
                    <TouchableOpacity onPress={handleStartSpace} activeOpacity={0.8}>
                        <LinearGradient
                            colors={[colors.amber[500], colors.gold[500]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.startBanner}
                        >
                            <View style={styles.startBannerContent}>
                                <View style={styles.startBannerLeft}>
                                    <View style={styles.startBannerIcon}>
                                        <Ionicons name="mic" size={22} color="#FFFFFF" />
                                    </View>
                                    <View>
                                        <Text style={styles.startBannerTitle}>Start a Space</Text>
                                        <Text style={styles.startBannerSubtitle}>
                                            Host a live audio conversation
                                        </Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>

                {/* Topic Chips */}
                <Animated.View entering={FadeInDown.delay(120).duration(400)}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.topicChips}
                    >
                        {TOPICS.map((topic) => (
                            <TouchableOpacity
                                key={topic.key}
                                style={[
                                    styles.filterChip,
                                    activeTopic === topic.key && styles.filterChipActive,
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setActiveTopic(topic.key);
                                }}
                                accessibilityRole="tab"
                                accessibilityLabel={`Filter by ${topic.label}`}
                            >
                                <Ionicons
                                    name={topic.icon}
                                    size={14}
                                    color={activeTopic === topic.key ? colors.amber[400] : colors.text.muted}
                                />
                                <Text
                                    style={[
                                        styles.filterChipText,
                                        activeTopic === topic.key && styles.filterChipTextActive,
                                    ]}
                                >
                                    {topic.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </Animated.View>

                {/* Loading */}
                {isLoading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.amber[500]} />
                        <Text style={styles.loadingText}>Finding live spaces...</Text>
                    </View>
                )}

                {/* Error */}
                {error && !isLoading && (
                    <Animated.View entering={FadeIn.duration(400)} style={styles.errorCard}>
                        <Ionicons name="warning-outline" size={24} color={colors.coral[400]} />
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity onPress={() => fetchSpaces()} style={styles.retryButton}>
                            <Text style={styles.retryText}>Retry</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Spaces List */}
                {!isLoading && !error && (
                    <>
                        {filteredSpaces.length > 0 ? (
                            <>
                                <Animated.View
                                    entering={FadeInDown.delay(160).duration(400)}
                                    style={styles.sectionHeader}
                                >
                                    <View style={styles.sectionTitleRow}>
                                        <LivePulseRing size={8} />
                                        <Text style={styles.sectionTitle}>Live Now</Text>
                                    </View>
                                    <Text style={styles.sectionBadge}>
                                        {filteredSpaces.length} {filteredSpaces.length === 1 ? 'space' : 'spaces'}
                                    </Text>
                                </Animated.View>

                                {filteredSpaces.map((space, index) => (
                                    <SpaceCard key={space.id} space={space} index={index} />
                                ))}
                            </>
                        ) : (
                            <EmptyState />
                        )}
                    </>
                )}

                <View style={{ height: spacing['3xl'] }} />
            </ScrollView>
        </View>
    );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },

    headerBtn: { borderRadius: 12, overflow: 'hidden' },
    headerBtnGradient: {
        width: 36, height: 36, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
    },

    heroSection: {
        marginBottom: spacing.lg, position: 'relative', overflow: 'hidden',
        borderRadius: 20, paddingVertical: spacing.xl, paddingHorizontal: spacing.lg,
        backgroundColor: colors.obsidian[800], borderWidth: 1, borderColor: colors.border.subtle,
    },
    heroPatternContainer: { ...StyleSheet.absoluteFillObject },
    heroDot: { position: 'absolute', backgroundColor: colors.amber[500] },
    heroTextContainer: { alignItems: 'center' },
    heroIconRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
    heroIconBg: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    heroLiveBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
        borderRadius: 8, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    heroLiveText: { fontSize: typography.fontSize.xs, fontWeight: '700', color: colors.emerald[400], letterSpacing: 1 },
    heroTitle: {
        fontSize: typography.fontSize['3xl'], fontWeight: '700', fontFamily: 'Inter-Bold',
        color: colors.text.primary, marginBottom: spacing.xs, textAlign: 'center',
    },
    heroSubtitle: { fontSize: typography.fontSize.base, color: colors.text.secondary, textAlign: 'center' },

    startBanner: { borderRadius: 16, marginBottom: spacing.lg, overflow: 'hidden' },
    startBannerContent: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: spacing.md + 2, paddingHorizontal: spacing.lg,
    },
    startBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    startBannerIcon: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center',
    },
    startBannerTitle: { fontSize: typography.fontSize.lg, fontWeight: '700', fontFamily: 'Inter-Bold', color: '#FFFFFF' },
    startBannerSubtitle: { fontSize: typography.fontSize.xs, color: '#FFFFFF', opacity: 0.7 },

    topicChips: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.lg },
    filterChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: 10,
        backgroundColor: colors.surface.glass, borderWidth: 1, borderColor: colors.border.subtle,
    },
    filterChipActive: { backgroundColor: 'rgba(244, 163, 0, 0.1)', borderColor: colors.amber[500] + '30' },
    filterChipText: { fontSize: typography.fontSize.sm, fontWeight: '600', color: colors.text.muted },
    filterChipTextActive: { color: colors.amber[400] },

    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    sectionTitle: { fontSize: typography.fontSize.xl, fontWeight: '700', fontFamily: 'Inter-Bold', color: colors.text.primary },
    sectionBadge: {
        fontSize: typography.fontSize.xs, fontWeight: '600', color: colors.text.muted,
        backgroundColor: colors.surface.glass, paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs, borderRadius: 8, overflow: 'hidden',
    },

    spaceCard: {
        backgroundColor: colors.surface.glass, borderRadius: 16,
        borderWidth: 1, borderColor: colors.border.subtle,
        padding: spacing.lg, marginBottom: spacing.md,
    },
    cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
    topicBadge: { backgroundColor: colors.amber[500] + '15', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 6 },
    topicBadgeText: { fontSize: typography.fontSize.xs, fontWeight: '700', color: colors.amber[400], textTransform: 'uppercase', letterSpacing: 0.5 },
    liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    liveIndicatorText: { fontSize: 10, fontWeight: '800', color: colors.emerald[400], letterSpacing: 0.5 },
    cardTitle: { fontSize: typography.fontSize.lg, fontWeight: '700', fontFamily: 'Inter-Bold', color: colors.text.primary, lineHeight: 22, marginBottom: spacing.sm },
    hostRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
    hostAvatar: { width: 22, height: 22, borderRadius: 11 },
    avatarPlaceholder: { backgroundColor: colors.obsidian[600], alignItems: 'center', justifyContent: 'center' },
    hostName: { fontSize: typography.fontSize.sm, fontWeight: '600', color: colors.text.secondary, flex: 1 },
    hostBadge: { backgroundColor: colors.amber[500] + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    hostBadgeText: { fontSize: 9, fontWeight: '700', color: colors.amber[400], textTransform: 'uppercase', letterSpacing: 0.5 },

    speakerAvatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
    speakerAvatarWrap: { borderWidth: 2, borderColor: colors.obsidian[800], borderRadius: 16 },
    speakerAvatarSmall: { width: 28, height: 28, borderRadius: 14 },
    moreAvatar: { backgroundColor: colors.obsidian[600], alignItems: 'center', justifyContent: 'center' },
    moreAvatarText: { fontSize: 9, fontWeight: '700', color: colors.text.secondary },

    cardBottomRow: { flexDirection: 'row', alignItems: 'center' },
    statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statText: { fontSize: typography.fontSize.xs, color: colors.text.muted, fontWeight: '600' },
    statDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.obsidian[500], marginHorizontal: spacing.sm },
    timeText: { fontSize: typography.fontSize.xs, color: colors.text.muted },

    emptyState: { alignItems: 'center', paddingVertical: spacing['3xl'] },
    emptyIconCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
    emptyTitle: { fontSize: typography.fontSize.xl, fontWeight: '700', fontFamily: 'Inter-Bold', color: colors.text.primary, marginBottom: spacing.sm },
    emptySubtitle: { fontSize: typography.fontSize.base, color: colors.text.secondary, textAlign: 'center', paddingHorizontal: spacing['2xl'], lineHeight: 22 },

    loadingContainer: { alignItems: 'center', paddingVertical: spacing['3xl'], gap: spacing.md },
    loadingText: { fontSize: typography.fontSize.sm, color: colors.text.muted },

    errorCard: {
        alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg,
        backgroundColor: colors.surface.glass, borderRadius: 16,
        borderWidth: 1, borderColor: colors.border.subtle, padding: spacing.xl,
    },
    errorText: { fontSize: typography.fontSize.sm, color: colors.text.secondary, textAlign: 'center' },
    retryButton: { backgroundColor: colors.amber[500] + '20', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 10 },
    retryText: { fontSize: typography.fontSize.sm, fontWeight: '700', color: colors.amber[400] },
});
