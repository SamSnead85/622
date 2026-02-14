// ============================================
// MediaCarousel — Swipeable multi-media viewer
// Supports image carousels and mixed media (images + videos)
// Inspired by Instagram carousels with 0G's warm aesthetic
// ============================================

import React, { useState, useCallback, useRef, memo, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    FlatList,
    TouchableOpacity,
    ViewToken,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    FadeIn,
    FadeOut,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { typography, spacing } from '@zerog/ui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Types ──────────────────────────────────────────────

export interface MediaItem {
    id: string;
    mediaUrl: string;
    thumbnailUrl?: string | null;
    type: 'IMAGE' | 'VIDEO';
    position: number;
    aspectRatio?: string | null;
    duration?: number | null;
    width?: number | null;
    height?: number | null;
    altText?: string | null;
}

interface MediaCarouselProps {
    media: MediaItem[];
    width?: number;
    height?: number;
    showCounter?: boolean;
    showDots?: boolean;
    onSlideChange?: (index: number) => void;
    onDoubleTap?: () => void;
    borderRadius?: number;
}

// ── Pagination Dots ────────────────────────────────────

const PaginationDots = memo(({ total, current, color }: { total: number; current: number; color: string }) => {
    if (total <= 1) return null;

    // For many dots, show a sliding window of 5
    const maxVisible = 7;
    const dots = [];

    let start = 0;
    let end = total;

    if (total > maxVisible) {
        start = Math.max(0, current - Math.floor(maxVisible / 2));
        end = Math.min(total, start + maxVisible);
        if (end - start < maxVisible) {
            start = Math.max(0, end - maxVisible);
        }
    }

    for (let i = start; i < end; i++) {
        const isActive = i === current;
        const distance = Math.abs(i - current);
        const scale = distance === 0 ? 1 : distance === 1 ? 0.75 : 0.5;

        dots.push(
            <Animated.View
                key={i}
                style={[
                    styles.dot,
                    {
                        backgroundColor: isActive ? color : color + '50',
                        width: isActive ? 8 : 6 * scale,
                        height: isActive ? 8 : 6 * scale,
                        opacity: isActive ? 1 : 0.5 + scale * 0.3,
                    },
                ]}
            />
        );
    }

    return (
        <Animated.View entering={FadeIn.duration(200)} style={styles.dotsContainer}>
            {dots}
        </Animated.View>
    );
});

PaginationDots.displayName = 'PaginationDots';

// ── Video Slide ────────────────────────────────────────

const VideoSlide = memo(({ item, isActive, width: slideWidth, height: slideHeight }: {
    item: MediaItem;
    isActive: boolean;
    width: number;
    height: number;
}) => {
    const { colors: c } = useTheme();
    const [isMuted, setIsMuted] = useState(true);

    const player = useVideoPlayer(item.mediaUrl, (p) => {
        p.loop = true;
        p.muted = true;
    });

    // Auto-play/pause based on visibility
    React.useEffect(() => {
        if (isActive) {
            player.play();
        } else {
            player.pause();
        }
    }, [isActive, player]);

    React.useEffect(() => {
        player.muted = isMuted;
    }, [isMuted, player]);

    const toggleMute = useCallback(() => {
        setIsMuted((prev) => !prev);
    }, []);

    return (
        <View style={[styles.slide, { width: slideWidth, height: slideHeight }]}>
            <VideoView
                player={player}
                style={[styles.slideMedia, { width: slideWidth, height: slideHeight }]}
                contentFit="cover"
                nativeControls={false}
            />
            {/* Mute toggle */}
            <TouchableOpacity
                style={[styles.muteBtn, { backgroundColor: c.background + 'CC' }]}
                onPress={toggleMute}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                <Ionicons
                    name={isMuted ? 'volume-mute' : 'volume-high'}
                    size={14}
                    color={c.text.primary}
                />
            </TouchableOpacity>
            {/* Duration badge */}
            {item.duration && (
                <View style={[styles.durationBadge, { backgroundColor: c.background + 'CC' }]}>
                    <Text style={[styles.durationText, { color: c.text.primary }]}>
                        {Math.floor(item.duration / 60)}:{String(item.duration % 60).padStart(2, '0')}
                    </Text>
                </View>
            )}
        </View>
    );
});

VideoSlide.displayName = 'VideoSlide';

// ── Image Slide ────────────────────────────────────────

const ImageSlide = memo(({ item, width: slideWidth, height: slideHeight }: {
    item: MediaItem;
    width: number;
    height: number;
}) => {
    return (
        <View style={[styles.slide, { width: slideWidth, height: slideHeight }]}>
            <Image
                source={{ uri: item.mediaUrl }}
                style={[styles.slideMedia, { width: slideWidth, height: slideHeight }]}
                contentFit="cover"
                placeholder={item.thumbnailUrl ? { uri: item.thumbnailUrl } : undefined}
                transition={200}
                cachePolicy="memory-disk"
                accessibilityLabel={item.altText || 'Post image'}
            />
        </View>
    );
});

ImageSlide.displayName = 'ImageSlide';

// ── Main Carousel ──────────────────────────────────────

function MediaCarouselInner({
    media,
    width = SCREEN_WIDTH,
    height,
    showCounter = true,
    showDots = true,
    onSlideChange,
    borderRadius = 0,
}: MediaCarouselProps) {
    const { colors: c } = useTheme();
    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    // Calculate height based on aspect ratio of first item, or default to 4:5
    const computedHeight = useMemo(() => {
        if (height) return height;
        const firstItem = media[0];
        if (firstItem?.aspectRatio) {
            const [w, h] = firstItem.aspectRatio.split(':').map(Number);
            if (w && h) return width * (h / w);
        }
        // Default 4:5 ratio (Instagram-style portrait)
        return width * 1.25;
    }, [height, media, width]);

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0 && viewableItems[0].index != null) {
            setActiveIndex(viewableItems[0].index);
            onSlideChange?.(viewableItems[0].index);
        }
    }).current;

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50,
    }).current;

    const renderItem = useCallback(({ item, index }: { item: MediaItem; index: number }) => {
        if (item.type === 'VIDEO') {
            return (
                <VideoSlide
                    item={item}
                    isActive={index === activeIndex}
                    width={width}
                    height={computedHeight}
                />
            );
        }
        return (
            <ImageSlide
                item={item}
                width={width}
                height={computedHeight}
            />
        );
    }, [activeIndex, width, computedHeight]);

    const keyExtractor = useCallback((item: MediaItem) => item.id, []);

    // Single media — no carousel needed
    if (media.length <= 1) {
        const item = media[0];
        if (!item) return null;

        if (item.type === 'VIDEO') {
            return (
                <View style={[{ borderRadius, overflow: 'hidden' }]}>
                    <VideoSlide item={item} isActive width={width} height={computedHeight} />
                </View>
            );
        }
        return (
            <View style={[{ borderRadius, overflow: 'hidden' }]}>
                <ImageSlide item={item} width={width} height={computedHeight} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { borderRadius, overflow: 'hidden' }]}>
            <FlatList
                ref={flatListRef}
                data={media}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                getItemLayout={(_, index) => ({
                    length: width,
                    offset: width * index,
                    index,
                })}
                decelerationRate="fast"
                snapToInterval={width}
                snapToAlignment="start"
                bounces={false}
                initialNumToRender={2}
                maxToRenderPerBatch={3}
                windowSize={3}
            />

            {/* Counter badge (top right) */}
            {showCounter && media.length > 1 && (
                <Animated.View
                    entering={FadeIn.delay(200).duration(300)}
                    style={[styles.counterBadge, { backgroundColor: c.background + 'CC' }]}
                >
                    <Text style={[styles.counterText, { color: c.text.primary }]}>
                        {activeIndex + 1}/{media.length}
                    </Text>
                </Animated.View>
            )}

            {/* Pagination dots (bottom center) */}
            {showDots && media.length > 1 && (
                <PaginationDots
                    total={media.length}
                    current={activeIndex}
                    color={c.gold[500]}
                />
            )}

            {/* Swipe progress bar (top) */}
            {media.length > 1 && (
                <View style={styles.progressContainer}>
                    {media.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.progressSegment,
                                {
                                    backgroundColor: i <= activeIndex
                                        ? c.gold[500]
                                        : c.text.primary + '25',
                                    flex: 1,
                                },
                            ]}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}

export const MediaCarousel = memo(MediaCarouselInner);

// ── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    slide: {
        position: 'relative',
    },
    slideMedia: {
        flex: 1,
    },
    // Pagination dots
    dotsContainer: {
        position: 'absolute',
        bottom: 12,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 5,
    },
    dot: {
        borderRadius: 4,
    },
    // Counter badge
    counterBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    counterText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    // Progress bar
    progressContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        gap: 2,
        paddingHorizontal: 4,
        paddingTop: 4,
    },
    progressSegment: {
        height: 2.5,
        borderRadius: 2,
    },
    // Video controls
    muteBtn: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    durationBadge: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    durationText: {
        fontSize: 11,
        fontWeight: '600',
        fontVariant: ['tabular-nums'],
    },
});
