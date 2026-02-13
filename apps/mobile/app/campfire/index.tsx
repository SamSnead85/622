// ============================================
// Campfire — Stream Discovery Screen
// Browse live streams, VODs, and go live
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
    Dimensions,
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
import { GlassCard } from '../../components';
import { apiFetch, API, clearApiCache } from '../../lib/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = spacing.md;
const STREAM_CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - CARD_GAP) / 2;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================
// Types
// ============================================

interface StreamUser {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
}

interface LiveStream {
    id: string;
    title: string;
    description?: string;
    thumbnailUrl?: string;
    playbackUrl?: string;
    status: string;
    viewerCount: number;
    category?: string;
    user: StreamUser;
    createdAt: string;
}

// ============================================
// Categories
// ============================================

const CATEGORIES = [
    { key: 'all', label: 'All', icon: 'apps' as const },
    { key: 'general', label: 'General', icon: 'chatbubbles' as const },
    { key: 'gaming', label: 'Gaming', icon: 'game-controller' as const },
    { key: 'music', label: 'Music', icon: 'musical-notes' as const },
    { key: 'education', label: 'Education', icon: 'school' as const },
    { key: 'sports', label: 'Sports', icon: 'football' as const },
    { key: 'creative', label: 'Creative', icon: 'color-palette' as const },
    { key: 'talk', label: 'Talk Show', icon: 'mic' as const },
];

// ============================================
// Live Pulse Dot
// ============================================

function LivePulseDot({ size = 8 }: { size?: number }) {
    const pulse = useSharedValue(0);

    useEffect(() => {
        pulse.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
            ),
            -1,
            false,
        );
    }, [pulse]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(pulse.value, [0, 1], [0.5, 1]),
        transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.4]) }],
    }));

    return (
        <Animated.View
            style={[
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: colors.coral[500],
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
                        colors={[colors.coral[500], colors.amber[500]]}
                        style={styles.heroIconBg}
                    >
                        <Ionicons name="flame" size={20} color="#FFFFFF" />
                    </LinearGradient>
                    {liveCount > 0 && (
                        <View style={styles.heroLiveBadge}>
                            <LivePulseDot size={6} />
                            <Text style={styles.heroLiveText}>
                                {liveCount} LIVE
                            </Text>
                        </View>
                    )}
                </View>
                <Text style={styles.heroTitle}>Campfire</Text>
                <Text style={styles.heroSubtitle}>Live streams & conversations</Text>
            </Animated.View>
        </Animated.View>
    );
}

// ============================================
// Stream Card
// ============================================

function StreamCard({ stream, index }: { stream: LiveStream; index: number }) {
    const router = useRouter();
    const scale = useSharedValue(1);

    const handlePressIn = useCallback(() => {
        scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    }, [scale]);

    const handlePressOut = useCallback(() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    }, [scale]);

    const handlePress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push(`/campfire/watch/${stream.id}`);
    }, [stream.id, router]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const column = index % 2;
    const row = Math.floor(index / 2);
    const staggerDelay = 200 + row * 120 + column * 60;

    return (
        <Animated.View
            entering={FadeInDown.delay(staggerDelay).duration(500).springify()}
            style={styles.streamCardWrapper}
        >
            <AnimatedPressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={handlePress}
                style={animatedStyle}
                accessibilityRole="button"
                accessibilityLabel={`Watch ${stream.title} by ${stream.user.displayName}`}
            >
                <View style={styles.streamCard}>
                    {/* Thumbnail */}
                    <View style={styles.thumbnailContainer}>
                        {stream.thumbnailUrl ? (
                            <Image
                                source={{ uri: stream.thumbnailUrl }}
                                style={styles.thumbnail}
                                placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
                                transition={300}
                                cachePolicy="memory-disk"
                            />
                        ) : (
                            <LinearGradient
                                colors={[colors.obsidian[700], colors.obsidian[600]]}
                                style={styles.thumbnail}
                            >
                                <Ionicons name="videocam" size={32} color={colors.text.muted} />
                            </LinearGradient>
                        )}

                        {/* Live badge */}
                        <View style={styles.liveBadge}>
                            <LivePulseDot size={5} />
                            <Text style={styles.liveBadgeText}>LIVE</Text>
                        </View>

                        {/* Viewer count */}
                        <View style={styles.viewerBadge}>
                            <Ionicons name="eye" size={10} color={colors.text.primary} />
                            <Text style={styles.viewerText}>
                                {formatViewerCount(stream.viewerCount)}
                            </Text>
                        </View>

                        {/* Gradient overlay */}
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.6)']}
                            style={styles.thumbnailOverlay}
                        />
                    </View>

                    {/* Info */}
                    <View style={styles.streamInfo}>
                        <View style={styles.streamerRow}>
                            {stream.user.avatarUrl ? (
                                <Image
                                    source={{ uri: stream.user.avatarUrl }}
                                    style={styles.streamerAvatar}
                                    placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
                                    transition={200}
                                    cachePolicy="memory-disk"
                                />
                            ) : (
                                <View style={[styles.streamerAvatar, styles.avatarPlaceholder]}>
                                    <Ionicons name="person" size={10} color={colors.text.muted} />
                                </View>
                            )}
                            <Text style={styles.streamerName} numberOfLines={1}>
                                {stream.user.displayName}
                            </Text>
                        </View>
                        <Text style={styles.streamTitle} numberOfLines={2}>
                            {stream.title}
                        </Text>
                        {stream.category && (
                            <View style={styles.categoryChip}>
                                <Text style={styles.categoryChipText}>{stream.category}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </AnimatedPressable>
        </Animated.View>
    );
}

// ============================================
// VOD Card
// ============================================

function VodCard({ stream, index }: { stream: LiveStream; index: number }) {
    const router = useRouter();

    const handlePress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/campfire/watch/${stream.id}`);
    }, [stream.id, router]);

    return (
        <Animated.View entering={FadeInDown.delay(100 + index * 60).duration(400).springify()}>
            <TouchableOpacity
                style={styles.vodCard}
                onPress={handlePress}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Watch VOD: ${stream.title}`}
            >
                <View style={styles.vodThumbnailContainer}>
                    {stream.thumbnailUrl ? (
                        <Image
                            source={{ uri: stream.thumbnailUrl }}
                            style={styles.vodThumbnail}
                            placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
                            transition={300}
                            cachePolicy="memory-disk"
                        />
                    ) : (
                        <LinearGradient
                            colors={[colors.obsidian[700], colors.obsidian[600]]}
                            style={styles.vodThumbnail}
                        >
                            <Ionicons name="play-circle" size={24} color={colors.text.muted} />
                        </LinearGradient>
                    )}
                    <View style={styles.vodPlayOverlay}>
                        <Ionicons name="play" size={20} color={colors.text.primary} />
                    </View>
                </View>
                <View style={styles.vodInfo}>
                    <Text style={styles.vodTitle} numberOfLines={2}>{stream.title}</Text>
                    <Text style={styles.vodMeta}>
                        {stream.user.displayName} · {formatViewerCount(stream.viewerCount)} views
                    </Text>
                </View>
            </TouchableOpacity>
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
                    colors={[colors.coral[500] + '20', colors.amber[500] + '10']}
                    style={styles.emptyIconCircle}
                >
                    <Ionicons name="flame-outline" size={48} color={colors.coral[400]} />
                </LinearGradient>
            </Animated.View>
            <Text style={styles.emptyTitle}>No Live Streams</Text>
            <Text style={styles.emptySubtitle}>
                Be the first to go live and start a campfire conversation!
            </Text>
        </Animated.View>
    );
}

// ============================================
// Helpers
// ============================================

function formatViewerCount(count: number): string {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return String(count);
}

// ============================================
// Main Screen
// ============================================

export default function CampfireScreen() {
    const router = useRouter();
    const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
    const [vods, setVods] = useState<LiveStream[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeCategory, setActiveCategory] = useState('all');
    const [error, setError] = useState<string | null>(null);

    // ---- Fetch streams ----
    const fetchStreams = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setIsRefreshing(true);
            clearApiCache(API.livestreamActive);
            clearApiCache(API.livestreamVods);
        } else {
            setIsLoading(true);
        }
        setError(null);

        try {
            const [activeData, vodsData] = await Promise.all([
                apiFetch<any>(API.livestreamActive, { cache: !isRefresh }).catch(() => ({ streams: [] })),
                apiFetch<any>(API.livestreamVods, { cache: !isRefresh }).catch(() => ({ streams: [] })),
            ]);

            const active = activeData?.streams || activeData?.data || activeData || [];
            const vodsList = vodsData?.streams || vodsData?.data || vodsData || [];

            setLiveStreams(Array.isArray(active) ? active : []);
            setVods(Array.isArray(vodsList) ? vodsList : []);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load streams');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchStreams();
    }, [fetchStreams]);

    // ---- Filter by category ----
    const filteredStreams = useMemo(() => {
        if (activeCategory === 'all') return liveStreams;
        return liveStreams.filter(
            (s) => s.category?.toLowerCase() === activeCategory.toLowerCase()
        );
    }, [liveStreams, activeCategory]);

    // ---- Go Live button ----
    const handleGoLive = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        router.push('/campfire/go-live');
    }, [router]);

    // ---- Go Live CTA button ----
    const GoLiveButton = useMemo(
        () => (
            <TouchableOpacity
                onPress={handleGoLive}
                style={styles.goLiveHeaderBtn}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Go Live"
            >
                <LinearGradient
                    colors={[colors.coral[500], colors.amber[500]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.goLiveHeaderGradient}
                >
                    <Ionicons name="radio" size={14} color={colors.text.primary} />
                </LinearGradient>
            </TouchableOpacity>
        ),
        [handleGoLive],
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800], colors.obsidian[900]]}
                style={StyleSheet.absoluteFill}
            />

            <ScreenHeader title="Campfire" showBack noBorder rightElement={GoLiveButton} />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={() => fetchStreams(true)}
                        tintColor={colors.gold[500]}
                        colors={[colors.gold[500]]}
                    />
                }
            >
                {/* ---- Hero ---- */}
                <HeroSection liveCount={liveStreams.length} />

                {/* ---- Go Live Banner ---- */}
                <Animated.View entering={FadeInDown.delay(80).duration(500)}>
                    <TouchableOpacity onPress={handleGoLive} activeOpacity={0.8}>
                        <LinearGradient
                            colors={[colors.coral[500], colors.amber[500]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.goLiveBanner}
                        >
                            <View style={styles.goLiveBannerContent}>
                                <View style={styles.goLiveBannerLeft}>
                                    <View style={styles.goLiveBannerIcon}>
                                        <Ionicons name="radio" size={22} color="#FFFFFF" />
                                    </View>
                                    <View>
                                        <Text style={styles.goLiveBannerTitle}>Go Live</Text>
                                        <Text style={styles.goLiveBannerSubtitle}>
                                            Start streaming to your audience
                                        </Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>

                {/* ---- Category Chips ---- */}
                <Animated.View entering={FadeInDown.delay(120).duration(400)}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoryChips}
                    >
                        {CATEGORIES.map((cat) => (
                            <TouchableOpacity
                                key={cat.key}
                                style={[
                                    styles.filterChip,
                                    activeCategory === cat.key && styles.filterChipActive,
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setActiveCategory(cat.key);
                                }}
                                accessibilityRole="tab"
                                accessibilityLabel={`Filter by ${cat.label}`}
                            >
                                <Ionicons
                                    name={cat.icon}
                                    size={14}
                                    color={
                                        activeCategory === cat.key
                                            ? colors.coral[400]
                                            : colors.text.muted
                                    }
                                />
                                <Text
                                    style={[
                                        styles.filterChipText,
                                        activeCategory === cat.key && styles.filterChipTextActive,
                                    ]}
                                >
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </Animated.View>

                {/* ---- Loading ---- */}
                {isLoading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.coral[500]} />
                        <Text style={styles.loadingText}>Finding live streams...</Text>
                    </View>
                )}

                {/* ---- Error ---- */}
                {error && !isLoading && (
                    <Animated.View entering={FadeIn.duration(400)}>
                        <GlassCard style={styles.errorCard} padding="md">
                            <Ionicons name="warning-outline" size={24} color={colors.coral[400]} />
                            <Text style={styles.errorText}>{error}</Text>
                            <TouchableOpacity
                                onPress={() => fetchStreams()}
                                style={styles.retryButton}
                            >
                                <Text style={styles.retryText}>Retry</Text>
                            </TouchableOpacity>
                        </GlassCard>
                    </Animated.View>
                )}

                {/* ---- Live Streams ---- */}
                {!isLoading && !error && (
                    <>
                        {filteredStreams.length > 0 ? (
                            <>
                                <Animated.View
                                    entering={FadeInDown.delay(160).duration(400)}
                                    style={styles.sectionHeader}
                                >
                                    <View style={styles.sectionTitleRow}>
                                        <LivePulseDot size={8} />
                                        <Text style={styles.sectionTitle}>Live Now</Text>
                                    </View>
                                    <Text style={styles.sectionBadge}>
                                        {filteredStreams.length} streams
                                    </Text>
                                </Animated.View>

                                <View style={styles.streamsGrid}>
                                    {filteredStreams.map((stream, index) => (
                                        <StreamCard
                                            key={stream.id}
                                            stream={stream}
                                            index={index}
                                        />
                                    ))}
                                </View>
                            </>
                        ) : (
                            <EmptyState />
                        )}

                        {/* ---- VODs Section ---- */}
                        {vods.length > 0 && (
                            <>
                                <Animated.View
                                    entering={FadeInDown.delay(300).duration(400)}
                                    style={styles.sectionHeader}
                                >
                                    <View style={styles.sectionTitleRow}>
                                        <Ionicons
                                            name="play-circle-outline"
                                            size={18}
                                            color={colors.gold[500]}
                                        />
                                        <Text style={styles.sectionTitle}>Recent VODs</Text>
                                    </View>
                                    <Text style={styles.sectionBadge}>{vods.length} videos</Text>
                                </Animated.View>

                                {vods.map((vod, index) => (
                                    <VodCard key={vod.id} stream={vod} index={index} />
                                ))}
                            </>
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
    container: {
        flex: 1,
        backgroundColor: colors.obsidian[900],
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
    },

    // ---- Header Go Live Button ----
    goLiveHeaderBtn: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    goLiveHeaderGradient: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ---- Hero ----
    heroSection: {
        marginBottom: spacing.lg,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 20,
        paddingVertical: spacing.xl,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.obsidian[800],
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    heroPatternContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    heroDot: {
        position: 'absolute',
        backgroundColor: colors.coral[500],
    },
    heroTextContainer: {
        alignItems: 'center',
    },
    heroIconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    heroIconBg: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroLiveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255, 68, 68, 0.15)',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 68, 68, 0.3)',
    },
    heroLiveText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: colors.coral[500],
        letterSpacing: 1,
    },
    heroTitle: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    heroSubtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
    },

    // ---- Go Live Banner ----
    goLiveBanner: {
        borderRadius: 16,
        marginBottom: spacing.lg,
        overflow: 'hidden',
    },
    goLiveBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md + 2,
        paddingHorizontal: spacing.lg,
    },
    goLiveBannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    goLiveBannerIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    goLiveBannerTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: '#FFFFFF',
    },
    goLiveBannerSubtitle: {
        fontSize: typography.fontSize.xs,
        color: '#FFFFFF',
        opacity: 0.7,
    },

    // ---- Category Chips ----
    categoryChips: {
        flexDirection: 'row',
        gap: spacing.sm,
        paddingBottom: spacing.lg,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    filterChipActive: {
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        borderColor: colors.coral[500] + '30',
    },
    filterChipText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.muted,
    },
    filterChipTextActive: {
        color: colors.coral[400],
    },

    // ---- Section Header ----
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    sectionTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
    },
    sectionBadge: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.muted,
        backgroundColor: colors.surface.glass,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 8,
        overflow: 'hidden',
    },

    // ---- Stream Cards Grid ----
    streamsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: CARD_GAP,
        marginBottom: spacing.xl,
    },
    streamCardWrapper: {
        width: STREAM_CARD_WIDTH,
    },
    streamCard: {
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        overflow: 'hidden',
    },
    thumbnailContainer: {
        width: '100%',
        aspectRatio: 16 / 10,
        position: 'relative',
        backgroundColor: colors.obsidian[700],
    },
    thumbnail: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    thumbnailOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    liveBadge: {
        position: 'absolute',
        top: spacing.sm,
        left: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255, 0, 0, 0.85)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
    },
    liveBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.text.primary,
        letterSpacing: 0.5,
    },
    viewerBadge: {
        position: 'absolute',
        bottom: spacing.sm,
        right: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    viewerText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.text.primary,
    },
    streamInfo: {
        padding: spacing.sm,
    },
    streamerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: spacing.xs,
    },
    streamerAvatar: {
        width: 18,
        height: 18,
        borderRadius: 9,
    },
    avatarPlaceholder: {
        backgroundColor: colors.obsidian[600],
        alignItems: 'center',
        justifyContent: 'center',
    },
    streamerName: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.secondary,
        flex: 1,
    },
    streamTitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.text.primary,
        lineHeight: 17,
        marginBottom: spacing.xs,
    },
    categoryChip: {
        alignSelf: 'flex-start',
        backgroundColor: colors.surface.glass,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: 6,
    },
    categoryChipText: {
        fontSize: 9,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'capitalize',
    },

    // ---- VOD Cards ----
    vodCard: {
        flexDirection: 'row',
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        overflow: 'hidden',
        marginBottom: spacing.md,
    },
    vodThumbnailContainer: {
        width: 140,
        aspectRatio: 16 / 10,
        position: 'relative',
        backgroundColor: colors.obsidian[700],
    },
    vodThumbnail: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    vodPlayOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    vodInfo: {
        flex: 1,
        padding: spacing.md,
        justifyContent: 'center',
    },
    vodTitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.text.primary,
        lineHeight: 18,
        marginBottom: spacing.xs,
    },
    vodMeta: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },

    // ---- Empty State ----
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing['3xl'],
    },
    emptyIconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    emptyTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    emptySubtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
        paddingHorizontal: spacing['2xl'],
        lineHeight: 22,
    },

    // ---- Loading ----
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: spacing['3xl'],
        gap: spacing.md,
    },
    loadingText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
    },

    // ---- Error ----
    errorCard: {
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    errorText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: colors.coral[500] + '20',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 10,
    },
    retryText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.coral[400],
    },
});
