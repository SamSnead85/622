// ============================================
// Reels — Full-screen vertical video feed
// Swipe up/down between short-form videos
// Inspired by Instagram Reels + TikTok with 0G's warm aesthetic
// ============================================

import React, { useState, useCallback, useRef, memo, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    ViewToken,
    Platform,
    Share,
} from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInRight,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withRepeat,
    withSequence,
    Easing,
} from 'react-native-reanimated';
import { typography, spacing } from '@zerog/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../stores';
import { apiFetch, API } from '../../lib/api';
import { AVATAR_PLACEHOLDER } from '../../lib/imagePlaceholder';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── Types ──────────────────────────────────────────────

interface ReelPost {
    id: string;
    caption: string | null;
    mediaUrl: string;
    thumbnailUrl: string | null;
    duration: number | null;
    musicId: string | null;
    viewCount: number;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    createdAt: string;
    user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
        isVerified: boolean;
    };
    music: {
        id: string;
        title: string;
        artist: string;
        coverUrl: string | null;
    } | null;
}

// ── Action Button ──────────────────────────────────────

const ActionButton = memo(({ icon, label, count, onPress, isActive, activeColor }: {
    icon: string;
    label: string;
    count?: number;
    onPress: () => void;
    isActive?: boolean;
    activeColor?: string;
}) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePress = useCallback(() => {
        scale.value = withSequence(
            withTiming(0.8, { duration: 80 }),
            withSpring(1, { damping: 8, stiffness: 300 })
        );
        onPress();
    }, [onPress, scale]);

    const formatCount = (n?: number) => {
        if (!n) return '';
        if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
        if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
        return String(n);
    };

    return (
        <TouchableOpacity onPress={handlePress} activeOpacity={0.7} style={styles.actionBtn}>
            <Animated.View style={[styles.actionIconWrap, animatedStyle]}>
                <Ionicons
                    name={icon as any}
                    size={28}
                    color={isActive ? (activeColor || '#FF4757') : '#FFFFFF'}
                />
            </Animated.View>
            {count !== undefined && count > 0 && (
                <Text style={styles.actionCount}>{formatCount(count)}</Text>
            )}
        </TouchableOpacity>
    );
});

ActionButton.displayName = 'ActionButton';

// ── Music Ticker ───────────────────────────────────────

const MusicTicker = memo(({ music }: { music: ReelPost['music'] }) => {
    const { colors: c } = useTheme();
    const rotation = useSharedValue(0);

    useEffect(() => {
        rotation.value = withRepeat(
            withTiming(360, { duration: 3000, easing: Easing.linear }),
            -1,
            false
        );
    }, [rotation]);

    const discStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }));

    if (!music) return null;

    return (
        <Animated.View entering={FadeInDown.delay(300).duration(300)} style={styles.musicBar}>
            <Ionicons name="musical-notes" size={12} color="#FFFFFF" />
            <Text style={styles.musicText} numberOfLines={1}>
                {music.title} — {music.artist}
            </Text>
            <Animated.View style={[styles.musicDisc, discStyle]}>
                {music.coverUrl ? (
                    <Image source={{ uri: music.coverUrl }} style={styles.musicDiscImage} />
                ) : (
                    <View style={[styles.musicDiscPlaceholder, { backgroundColor: c.gold[500] }]}>
                        <Ionicons name="musical-notes" size={10} color="#FFFFFF" />
                    </View>
                )}
            </Animated.View>
        </Animated.View>
    );
});

MusicTicker.displayName = 'MusicTicker';

// ── Single Reel ────────────────────────────────────────

const ReelItem = memo(({ reel, isActive, height: itemHeight }: {
    reel: ReelPost;
    isActive: boolean;
    height: number;
}) => {
    const { colors: c } = useTheme();
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    const player = useVideoPlayer(reel.mediaUrl, (p) => {
        p.loop = true;
        p.muted = false;
    });

    // Auto-play/pause based on visibility
    useEffect(() => {
        if (isActive && !isPaused) {
            player.play();
            player.muted = isMuted;
        } else {
            player.pause();
        }
    }, [isActive, isPaused, isMuted, player]);

    const togglePause = useCallback(() => {
        setIsPaused((prev) => !prev);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, []);

    const handleLike = useCallback(async () => {
        setIsLiked((prev) => !prev);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            await apiFetch(API.like(reel.id), { method: 'POST' });
        } catch { /* optimistic update */ }
    }, [reel.id]);

    const handleSave = useCallback(async () => {
        setIsSaved((prev) => !prev);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await apiFetch(API.save(reel.id), { method: 'POST' });
        } catch { /* optimistic update */ }
    }, [reel.id]);

    const handleShare = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await Share.share({
                message: `Check out this reel on 0G: ${reel.caption || ''}`,
                url: `https://0g.app/post/${reel.id}`,
            });
        } catch { /* user cancelled share */ }
    }, [reel.id, reel.caption]);

    const handleComment = useCallback(() => {
        router.push(`/post/${reel.id}` as any);
    }, [reel.id, router]);

    const handleProfile = useCallback(() => {
        router.push(`/profile/${reel.user.username}` as any);
    }, [reel.user.username, router]);

    return (
        <View style={[styles.reelContainer, { height: itemHeight }]}>
            {/* Video */}
            <TouchableOpacity
                activeOpacity={1}
                onPress={togglePause}
                style={StyleSheet.absoluteFill}
            >
                <VideoView
                    player={player}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    nativeControls={false}
                />

                {/* Thumbnail while loading */}
                {reel.thumbnailUrl && (
                    <Image
                        source={{ uri: reel.thumbnailUrl }}
                        style={[StyleSheet.absoluteFill, { zIndex: -1 }]}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                    />
                )}
            </TouchableOpacity>

            {/* Pause indicator */}
            {isPaused && (
                <Animated.View entering={FadeIn.duration(150)} style={styles.pauseOverlay}>
                    <View style={styles.pauseIcon}>
                        <Ionicons name="play" size={48} color="#FFFFFF" />
                    </View>
                </Animated.View>
            )}

            {/* Bottom gradient */}
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
                style={styles.bottomGradient}
                pointerEvents="none"
            />

            {/* Bottom info */}
            <View style={styles.bottomInfo}>
                {/* User info */}
                <TouchableOpacity onPress={handleProfile} style={styles.userRow} activeOpacity={0.8}>
                    <Image
                        source={{ uri: reel.user.avatarUrl || undefined }}
                        style={styles.avatar}
                        placeholder={AVATAR_PLACEHOLDER.blurhash}
                        transition={200}
                        cachePolicy="memory-disk"
                    />
                    <Text style={styles.username}>@{reel.user.username}</Text>
                    {reel.user.isVerified && (
                        <Ionicons name="checkmark-circle" size={14} color="#FFD700" />
                    )}
                    {reel.user.id !== user?.id && (
                        <TouchableOpacity style={styles.followBtn}>
                            <Text style={styles.followBtnText}>Follow</Text>
                        </TouchableOpacity>
                    )}
                </TouchableOpacity>

                {/* Caption */}
                {reel.caption && (
                    <Text style={styles.caption} numberOfLines={2}>
                        {reel.caption}
                    </Text>
                )}

                {/* Music */}
                <MusicTicker music={reel.music} />
            </View>

            {/* Right action bar */}
            <Animated.View entering={FadeInRight.delay(200).duration(300)} style={styles.actionBar}>
                <ActionButton
                    icon={isLiked ? 'heart' : 'heart-outline'}
                    label="Like"
                    count={reel.likesCount + (isLiked ? 1 : 0)}
                    onPress={handleLike}
                    isActive={isLiked}
                    activeColor="#FF4757"
                />
                <ActionButton
                    icon="chatbubble-outline"
                    label="Comment"
                    count={reel.commentsCount}
                    onPress={handleComment}
                />
                <ActionButton
                    icon="paper-plane-outline"
                    label="Share"
                    count={reel.sharesCount}
                    onPress={handleShare}
                />
                <ActionButton
                    icon={isSaved ? 'bookmark' : 'bookmark-outline'}
                    label="Save"
                    onPress={handleSave}
                    isActive={isSaved}
                    activeColor="#FFD700"
                />
                <ActionButton
                    icon={isMuted ? 'volume-mute' : 'volume-high'}
                    label="Mute"
                    onPress={() => {
                        setIsMuted((prev) => !prev);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                />
            </Animated.View>
        </View>
    );
});

ReelItem.displayName = 'ReelItem';

// ── Main Screen ────────────────────────────────────────

export default function ReelsScreen() {
    const { colors: c } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [reels, setReels] = useState<ReelPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeIndex, setActiveIndex] = useState(0);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const itemHeight = SCREEN_HEIGHT;

    const loadReels = useCallback(async (cursor?: string) => {
        try {
            if (cursor) setIsLoadingMore(true);
            else setIsLoading(true);

            const url = cursor
                ? `/api/v1/posts/reels?limit=10&cursor=${cursor}`
                : `/api/v1/posts/reels?limit=10`;

            const data = await apiFetch<{ reels: ReelPost[]; nextCursor: string | null }>(url);
            
            if (cursor) {
                setReels((prev) => [...prev, ...data.reels]);
            } else {
                setReels(data.reels);
            }
            setNextCursor(data.nextCursor);
        } catch {
            // Silently handle — show empty state
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        loadReels();
    }, [loadReels]);

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0 && viewableItems[0].index != null) {
            setActiveIndex(viewableItems[0].index);
        }
    }).current;

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 60,
    }).current;

    const handleEndReached = useCallback(() => {
        if (nextCursor && !isLoadingMore) {
            loadReels(nextCursor);
        }
    }, [nextCursor, isLoadingMore, loadReels]);

    const renderItem = useCallback(({ item, index }: { item: ReelPost; index: number }) => (
        <ReelItem
            reel={item}
            isActive={index === activeIndex}
            height={itemHeight}
        />
    ), [activeIndex, itemHeight]);

    const keyExtractor = useCallback((item: ReelPost) => item.id, []);

    if (isLoading) {
        return (
            <View style={[styles.screen, styles.centered, { backgroundColor: '#000' }]}>
                <ActivityIndicator size="large" color={c.gold[400]} />
                <Text style={[styles.loadingText, { color: c.text.muted }]}>Loading reels...</Text>
            </View>
        );
    }

    if (reels.length === 0) {
        return (
            <View style={[styles.screen, styles.centered, { backgroundColor: '#000' }]}>
                <Ionicons name="videocam-outline" size={64} color={c.text.muted + '40'} />
                <Text style={[styles.emptyTitle, { color: c.text.secondary }]}>No reels yet</Text>
                <Text style={[styles.emptySubtitle, { color: c.text.muted }]}>
                    Be the first to post a reel!
                </Text>
                <TouchableOpacity
                    style={[styles.createBtn, { backgroundColor: c.gold[500] }]}
                    onPress={() => router.push('/(tabs)/create' as any)}
                    activeOpacity={0.8}
                >
                    <Text style={styles.createBtnText}>Create Reel</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.screen, { backgroundColor: '#000' }]}>
            <FlatList
                data={reels}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                pagingEnabled
                showsVerticalScrollIndicator={false}
                snapToInterval={itemHeight}
                snapToAlignment="start"
                decelerationRate="fast"
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                onEndReached={handleEndReached}
                onEndReachedThreshold={2}
                getItemLayout={(_, index) => ({
                    length: itemHeight,
                    offset: itemHeight * index,
                    index,
                })}
                initialNumToRender={2}
                maxToRenderPerBatch={3}
                windowSize={3}
                removeClippedSubviews={Platform.OS === 'android'}
            />

            {/* Header overlay */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Reels</Text>
                <TouchableOpacity
                    onPress={() => router.push('/(tabs)/create' as any)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Ionicons name="camera-outline" size={26} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            {/* Loading more indicator */}
            {isLoadingMore && (
                <View style={styles.loadingMore}>
                    <ActivityIndicator size="small" color={c.gold[400]} />
                </View>
            )}
        </View>
    );
}

// ── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    centered: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    // Header
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
        zIndex: 10,
    },
    headerTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -0.5,
    },
    // Reel container
    reelContainer: {
        width: SCREEN_WIDTH,
        position: 'relative',
        backgroundColor: '#000',
    },
    // Pause overlay
    pauseOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    pauseIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Bottom gradient
    bottomGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 300,
    },
    // Bottom info
    bottomInfo: {
        position: 'absolute',
        bottom: 80,
        left: spacing.md,
        right: 80,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    username: {
        fontSize: typography.fontSize.md,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    followBtn: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
        marginLeft: 4,
    },
    followBtnText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    caption: {
        fontSize: typography.fontSize.sm,
        color: '#FFFFFF',
        lineHeight: 20,
        marginBottom: 8,
    },
    // Music bar
    musicBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    musicText: {
        flex: 1,
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: '500',
    },
    musicDisc: {
        width: 28,
        height: 28,
        borderRadius: 14,
        overflow: 'hidden',
    },
    musicDiscImage: {
        width: 28,
        height: 28,
    },
    musicDiscPlaceholder: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Action bar (right side)
    actionBar: {
        position: 'absolute',
        right: 12,
        bottom: 120,
        alignItems: 'center',
        gap: 18,
    },
    actionBtn: {
        alignItems: 'center',
        gap: 2,
    },
    actionIconWrap: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionCount: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
        fontVariant: ['tabular-nums'],
    },
    // Loading
    loadingText: {
        fontSize: typography.fontSize.sm,
        marginTop: spacing.sm,
    },
    loadingMore: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    // Empty state
    emptyTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        marginTop: spacing.md,
    },
    emptySubtitle: {
        fontSize: typography.fontSize.sm,
        textAlign: 'center',
    },
    createBtn: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: spacing.md,
    },
    createBtnText: {
        fontSize: typography.fontSize.md,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
