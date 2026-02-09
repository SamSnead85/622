import { useState, useCallback, memo, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Pressable,
    Share,
    Platform,
    ActionSheetIOS,
    Alert,
    ViewToken,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    useAnimatedScrollHandler,
    interpolate,
    withSpring,
    withTiming,
    withDelay,
    withRepeat,
    FadeInDown,
    FadeIn,
} from 'react-native-reanimated';
import { useVideoPlayer, VideoView } from 'expo-video';
import { colors, typography, spacing } from '@zerog/ui';
import { useFeedStore, useAuthStore, Post } from '../../stores';
import { SkeletonFeed } from '../../components/SkeletonPost';
import { useNetworkQuality } from '../../hooks/useNetworkQuality';
import { RetryView } from '../../components/RetryView';
import { apiFetch, API } from '../../lib/api';


// ============================================
// Time formatting
// ============================================
function timeAgo(dateStr: string) {
    const now = Date.now();
    const d = new Date(dateStr).getTime();
    const seconds = Math.floor((now - d) / 1000);
    if (seconds < 60) return 'now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    return `${Math.floor(seconds / 604800)}w`;
}

function formatCount(num: number) {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
}

// ============================================
// Avatar Glow Ring — premium animated ring
// Different styles: 'online' (emerald pulse), 'active' (gold), 'verified' (gold shimmer), 'none'
// ============================================
const AVATAR_RING_SIZE = 3;

function AvatarGlow({ type, size }: { type: 'online' | 'active' | 'verified' | 'none'; size: number }) {
    const pulse = useSharedValue(1);

    useEffect(() => {
        if (type === 'online') {
            pulse.value = withRepeat(
                withTiming(1.15, { duration: 1800 }),
                -1,
                true
            );
        } else {
            pulse.value = 1;
        }
    }, [type]);

    const ringStyle = useAnimatedStyle(() => {
        if (type === 'none') return { opacity: 0 };
        return {
            opacity: type === 'online' ? interpolate(pulse.value, [1, 1.15], [0.6, 1]) : 0.8,
            transform: [{ scale: type === 'online' ? pulse.value : 1 }],
        };
    });

    const ringColor = type === 'online' ? colors.emerald[500]
        : type === 'active' ? colors.gold[500]
        : type === 'verified' ? colors.gold[400]
        : 'transparent';

    const outerSize = size + AVATAR_RING_SIZE * 2 + 2;

    return (
        <Animated.View
            style={[
                {
                    position: 'absolute',
                    width: outerSize,
                    height: outerSize,
                    borderRadius: outerSize / 2,
                    borderWidth: AVATAR_RING_SIZE,
                    borderColor: ringColor,
                    top: -AVATAR_RING_SIZE - 1,
                    left: -AVATAR_RING_SIZE - 1,
                },
                ringStyle,
            ]}
            pointerEvents="none"
        />
    );
}

// ============================================
// Active Contacts Strip — replaces Intent Hub
// Horizontal scroll of online/active people
// ============================================
const CONTACT_AVATAR_SIZE = 52;

function ActiveContactBubble({
    avatarUrl,
    name,
    isOnline,
    isUser,
    onPress,
    index,
}: {
    avatarUrl?: string;
    name: string;
    isOnline: boolean;
    isUser?: boolean;
    onPress: () => void;
    index: number;
}) {
    const scale = useSharedValue(1);
    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View
            entering={FadeIn.duration(300).delay(index * 60)}
            style={animStyle}
        >
            <Pressable
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    scale.value = withSpring(0.9, { damping: 15 });
                    setTimeout(() => { scale.value = withSpring(1); }, 100);
                    onPress();
                }}
                style={styles.contactBubble}
            >
                <View style={styles.contactAvatarWrap}>
                    {avatarUrl ? (
                        <Image
                            source={{ uri: avatarUrl }}
                            style={styles.contactAvatar}
                            transition={150}
                            cachePolicy="memory-disk"
                        />
                    ) : (
                        <View style={[styles.contactAvatar, styles.contactAvatarPlaceholder]}>
                            <Text style={styles.contactAvatarInitial}>
                                {name[0]?.toUpperCase() || '?'}
                            </Text>
                        </View>
                    )}
                    <AvatarGlow
                        type={isOnline ? 'online' : 'active'}
                        size={CONTACT_AVATAR_SIZE}
                    />
                    {/* Online dot */}
                    {isOnline && (
                        <View style={styles.onlineDot}>
                            <View style={styles.onlineDotInner} />
                        </View>
                    )}
                    {/* Create "+" badge for user's own avatar */}
                    {isUser && (
                        <View style={styles.createBadge}>
                            <Ionicons name="add" size={12} color={colors.obsidian[900]} />
                        </View>
                    )}
                </View>
                <Text style={styles.contactName} numberOfLines={1}>
                    {isUser ? 'You' : name.split(' ')[0]?.slice(0, 8) || name.slice(0, 8)}
                </Text>
            </Pressable>
        </Animated.View>
    );
}

function ActiveContactsStrip({ onCreatePress }: { onCreatePress: () => void }) {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const posts = useFeedStore((s) => s.posts);

    // Derive unique authors from feed (simulate "active contacts")
    // In production, this would come from a presence API
    const activeContacts = useCallback(() => {
        const seen = new Set<string>();
        const contacts: { id: string; username: string; displayName: string; avatarUrl?: string; isOnline: boolean }[] = [];
        for (const post of posts) {
            if (post.author && !seen.has(post.author.id) && post.author.id !== user?.id) {
                seen.add(post.author.id);
                contacts.push({
                    id: post.author.id,
                    username: post.author.username,
                    displayName: post.author.displayName,
                    avatarUrl: post.author.avatarUrl,
                    isOnline: contacts.length < 3, // First 3 shown as "online" (simulated)
                });
            }
            if (contacts.length >= 12) break;
        }
        return contacts;
    }, [posts, user?.id])();

    return (
        <View style={styles.contactsStrip}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.contactsScroll}
            >
                {/* User's own avatar — tap to create */}
                <ActiveContactBubble
                    avatarUrl={user?.avatarUrl}
                    name={user?.displayName || 'You'}
                    isOnline={true}
                    isUser={true}
                    onPress={onCreatePress}
                    index={0}
                />
                {/* Active contacts from feed */}
                {activeContacts.map((contact, i) => (
                    <ActiveContactBubble
                        key={contact.id}
                        avatarUrl={contact.avatarUrl}
                        name={contact.displayName}
                        isOnline={contact.isOnline}
                        onPress={() => router.push(`/profile/${contact.username}` as any)}
                        index={i + 1}
                    />
                ))}
            </ScrollView>
        </View>
    );
}

// ============================================
// Feed Type Tabs
// ============================================
function FeedTabs({
    activeTab,
    onTabChange,
}: {
    activeTab: 'foryou' | 'following';
    onTabChange: (tab: 'foryou' | 'following') => void;
}) {
    return (
        <View style={styles.feedTabs}>
            <TouchableOpacity
                style={[styles.feedTab, activeTab === 'foryou' && styles.feedTabActive]}
                onPress={() => onTabChange('foryou')}
            >
                <Text
                    style={[
                        styles.feedTabText,
                        activeTab === 'foryou' && styles.feedTabTextActive,
                    ]}
                >
                    For You
                </Text>
                {activeTab === 'foryou' && <View style={styles.feedTabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.feedTab, activeTab === 'following' && styles.feedTabActive]}
                onPress={() => onTabChange('following')}
            >
                <Text
                    style={[
                        styles.feedTabText,
                        activeTab === 'following' && styles.feedTabTextActive,
                    ]}
                >
                    Following
                </Text>
                {activeTab === 'following' && <View style={styles.feedTabIndicator} />}
            </TouchableOpacity>
        </View>
    );
}

// ============================================
// Like Heart Overlay Animation
// ============================================
function LikeHeartOverlay({ show }: { show: boolean }) {
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        if (show) {
            scale.value = 0;
            opacity.value = 1;
            scale.value = withSpring(1.2, { damping: 6, stiffness: 200 });
            opacity.value = withDelay(600, withTiming(0, { duration: 400 }));
        }
    }, [show]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[styles.heartOverlay, animatedStyle]} pointerEvents="none">
            <Ionicons name="heart" size={80} color={colors.gold[500]} />
        </Animated.View>
    );
}

// ============================================
// Read More Text
// ============================================
function ReadMoreText({ text }: { text: string }) {
    const [expanded, setExpanded] = useState(false);
    const [needsExpansion, setNeedsExpansion] = useState(false);

    return (
        <View>
            <Text
                style={styles.postContent}
                numberOfLines={expanded ? undefined : 3}
                onTextLayout={(e) => {
                    if (!expanded && e.nativeEvent.lines.length > 3) {
                        setNeedsExpansion(true);
                    }
                }}
            >
                {text}
            </Text>
            {needsExpansion && !expanded && (
                <TouchableOpacity onPress={() => setExpanded(true)}>
                    <Text style={styles.readMore}>Read more</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

// ============================================
// Feed Video Player (auto-play with mute toggle)
// ============================================
function FeedVideoPlayer({ uri, isActive, isFirstVideo, shouldReduceData }: { uri: string; isActive: boolean; isFirstVideo: boolean; shouldReduceData?: boolean }) {
    const [isMuted, setIsMuted] = useState(!isFirstVideo);
    const [showFirstFrame, setShowFirstFrame] = useState(false);

    const player = useVideoPlayer(uri, (player) => {
        player.loop = true;
        player.muted = !isFirstVideo;
    });

    useEffect(() => {
        if (shouldReduceData) {
            // On slow connections, don't autoplay — save bandwidth
            player.pause();
            return;
        }
        if (isActive) {
            player.play();
        } else {
            player.pause();
            player.muted = true;
            setIsMuted(true);
        }
    }, [isActive, player, shouldReduceData]);

    useEffect(() => {
        if (isActive && isFirstVideo && !shouldReduceData) {
            player.muted = false;
            setIsMuted(false);
        }
    }, [isActive, isFirstVideo, player, shouldReduceData]);

    const toggleMute = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newMuted = !player.muted;
        player.muted = newMuted;
        setIsMuted(newMuted);
    };

    return (
        <Pressable onPress={toggleMute} style={styles.videoPlayerContainer}>
            <VideoView
                player={player}
                style={styles.videoPlayer}
                nativeControls={false}
                contentFit="cover"
                onFirstFrameRender={() => setShowFirstFrame(true)}
            />
            {!showFirstFrame && (
                <View style={styles.videoBuffering}>
                    <View style={styles.videoBufferingInner}>
                        <ActivityIndicator size="small" color={colors.gold[500]} />
                    </View>
                </View>
            )}
            <View style={styles.muteIndicator}>
                <Ionicons
                    name={isMuted ? 'volume-mute' : 'volume-high'}
                    size={14}
                    color={colors.text.primary}
                />
            </View>
        </Pressable>
    );
}

// ============================================
// Feed Post Card
// ============================================
const FeedPostCard = memo(
    ({
        post,
        onLike,
        onSave,
        onPress,
        onReorder,
        isVideoActive,
        isFirstVideo,
        isOwnPost,
        shouldReduceData,
    }: {
        post: Post;
        onLike: (id: string) => void;
        onSave: (id: string) => void;
        onPress: (id: string) => void;
        onReorder?: (id: string, direction: 'up' | 'down') => void;
        isVideoActive: boolean;
        isFirstVideo: boolean;
        isOwnPost?: boolean;
        shouldReduceData?: boolean;
    }) => {
        const router = useRouter();
        const lastTapRef = useRef(0);
        const [showHeart, setShowHeart] = useState(false);

        const handleTap = () => {
            const now = Date.now();
            if (now - lastTapRef.current < 300) {
                if (!post.isLiked) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onLike(post.id);
                }
                setShowHeart(true);
                setTimeout(() => setShowHeart(false), 1100);
                lastTapRef.current = 0;
            } else {
                lastTapRef.current = now;
                setTimeout(() => {
                    if (lastTapRef.current === now) {
                        onPress(post.id);
                    }
                }, 300);
            }
        };

        const handleLongPress = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const options = ['Copy Link', 'Share', 'Report', 'Cancel'];
            const cancelIndex = 3;
            const destructiveIndex = 2;

            if (Platform.OS === 'ios') {
                ActionSheetIOS.showActionSheetWithOptions(
                    { options, cancelButtonIndex: cancelIndex, destructiveButtonIndex: destructiveIndex },
                    (buttonIndex) => {
                        if (buttonIndex === 1) {
                            Share.share({
                                message: `Check out this post on 0G`,
                                url: `https://0gravity.ai/post/${post.id}`,
                            });
                        }
                    }
                );
            } else {
                Alert.alert('Post Options', '', [
                    { text: 'Copy Link' },
                    {
                        text: 'Share',
                        onPress: () =>
                            Share.share({
                                message: `Check out this post on 0G: https://0gravity.ai/post/${post.id}`,
                            }),
                    },
                    { text: 'Report', style: 'destructive' },
                    { text: 'Cancel', style: 'cancel' },
                ]);
            }
        };

        return (
            <Animated.View entering={FadeInDown.duration(300).delay(50)}>
                <Pressable
                    style={styles.postCard}
                    onPress={handleTap}
                    onLongPress={handleLongPress}
                    delayLongPress={500}
                >
                    <LikeHeartOverlay show={showHeart} />

                    {/* Post header with avatar glow */}
                    <View style={styles.postHeader}>
                        <TouchableOpacity
                            style={styles.authorRow}
                            onPress={() =>
                                post.author?.username &&
                                router.push(`/profile/${post.author.username}`)
                            }
                        >
                            <View style={styles.avatarWrap}>
                                {post.author?.avatarUrl ? (
                                    <Image
                                        source={{ uri: post.author.avatarUrl }}
                                        style={styles.avatar}
                                        transition={150}
                                        cachePolicy="memory-disk"
                                        recyclingKey={post.author.id}
                                    />
                                ) : (
                                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                        <Text style={styles.avatarInitial}>
                                            {(
                                                post.author?.displayName ||
                                                post.author?.username ||
                                                '?'
                                            )[0].toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                                <AvatarGlow
                                    type={post.author?.isVerified ? 'verified' : 'none'}
                                    size={40}
                                />
                            </View>
                            <View style={styles.authorInfo}>
                                <View style={styles.authorNameRow}>
                                    <Text style={styles.authorName} numberOfLines={1}>
                                        {post.author?.displayName ||
                                            post.author?.username ||
                                            'Anonymous'}
                                    </Text>
                                    {post.author?.isVerified && (
                                        <Ionicons
                                            name="checkmark-circle"
                                            size={14}
                                            color={colors.gold[500]}
                                            style={{ marginLeft: 4 }}
                                        />
                                    )}
                                </View>
                                <Text style={styles.postTime}>
                                    {timeAgo(post.createdAt)}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Post content */}
                    {post.content ? <ReadMoreText text={post.content} /> : null}

                    {/* Media */}
                    {post.mediaUrl && (
                        <View style={styles.mediaContainer}>
                            {post.mediaType === 'VIDEO' ? (
                                <FeedVideoPlayer
                                    uri={post.mediaUrl}
                                    isActive={isVideoActive}
                                    isFirstVideo={isFirstVideo}
                                    shouldReduceData={shouldReduceData}
                                />
                            ) : (
                                <Image
                                    source={{ uri: post.mediaUrl }}
                                    style={[
                                        styles.mediaImage,
                                        post.mediaAspectRatio
                                            ? {
                                                  aspectRatio:
                                                      parseFloat(post.mediaAspectRatio) || 1,
                                              }
                                            : { aspectRatio: 1.5 },
                                    ]}
                                    contentFit="cover"
                                    transition={200}
                                    cachePolicy="memory-disk"
                                    recyclingKey={post.id}
                                />
                            )}
                        </View>
                    )}

                    {/* Actions bar */}
                    <View style={styles.actionsBar}>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onLike(post.id);
                            }}
                        >
                            <Ionicons
                                name={post.isLiked ? 'heart' : 'heart-outline'}
                                size={22}
                                color={post.isLiked ? colors.coral[500] : colors.text.secondary}
                            />
                            <Text style={styles.actionCount}>
                                {formatCount(post.likesCount)}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => onPress(post.id)}
                        >
                            <Ionicons
                                name="chatbubble-outline"
                                size={20}
                                color={colors.text.secondary}
                            />
                            <Text style={styles.actionCount}>
                                {formatCount(post.commentsCount)}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() =>
                                Share.share({
                                    message: `Check out this post on 0G: https://0gravity.ai/post/${post.id}`,
                                })
                            }
                        >
                            <Ionicons
                                name="arrow-redo-outline"
                                size={20}
                                color={colors.text.secondary}
                            />
                            <Text style={styles.actionCount}>
                                {formatCount(post.sharesCount)}
                            </Text>
                        </TouchableOpacity>

                        <View style={{ flex: 1 }} />

                        {/* Reorder arrows — only visible on own posts */}
                        {isOwnPost && onReorder && (
                            <View style={styles.reorderControls}>
                                <TouchableOpacity
                                    style={styles.reorderBtn}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        onReorder(post.id, 'up');
                                    }}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Ionicons name="chevron-up" size={16} color={colors.text.muted} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.reorderBtn}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        onReorder(post.id, 'down');
                                    }}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Ionicons name="chevron-down" size={16} color={colors.text.muted} />
                                </TouchableOpacity>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onSave(post.id);
                            }}
                        >
                            <Ionicons
                                name={post.isSaved ? 'bookmark' : 'bookmark-outline'}
                                size={20}
                                color={post.isSaved ? colors.gold[500] : colors.text.secondary}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Author's Note — pinned highlight from the post author */}
                    {post.authorNote && (
                        <View style={styles.authorNoteContainer}>
                            <View style={styles.authorNoteAccent} />
                            <View style={styles.authorNoteContent}>
                                <View style={styles.authorNoteHeader}>
                                    {post.author?.avatarUrl ? (
                                        <Image
                                            source={{ uri: post.author.avatarUrl }}
                                            style={styles.authorNoteAvatar}
                                            cachePolicy="memory-disk"
                                        />
                                    ) : (
                                        <View style={[styles.authorNoteAvatar, styles.contactAvatarPlaceholder]}>
                                            <Text style={{ fontSize: 8, color: colors.text.primary, fontWeight: '700' }}>
                                                {(post.author?.displayName || '?')[0].toUpperCase()}
                                            </Text>
                                        </View>
                                    )}
                                    <Text style={styles.authorNoteLabel}>Author&apos;s Note</Text>
                                </View>
                                <Text style={styles.authorNoteText} numberOfLines={2}>
                                    {post.authorNote}
                                </Text>
                            </View>
                        </View>
                    )}
                </Pressable>
            </Animated.View>
        );
    },
    (prev, next) =>
        prev.post.id === next.post.id &&
        prev.post.isLiked === next.post.isLiked &&
        prev.post.likesCount === next.post.likesCount &&
        prev.post.isSaved === next.post.isSaved &&
        prev.post.authorNote === next.post.authorNote &&
        prev.isVideoActive === next.isVideoActive &&
        prev.isFirstVideo === next.isFirstVideo &&
        prev.isOwnPost === next.isOwnPost &&
        prev.shouldReduceData === next.shouldReduceData
);

// ============================================
// Feed Screen
// ============================================
export default function FeedScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const flatListRef = useRef<FlatList>(null);
    const { shouldReduceData, isOffline } = useNetworkQuality();

    const posts = useFeedStore((s) => s.posts);
    const isLoading = useFeedStore((s) => s.isLoading);
    const isRefreshing = useFeedStore((s) => s.isRefreshing);
    const hasMore = useFeedStore((s) => s.hasMore);
    const feedError = useFeedStore((s) => s.error);
    const fetchFeed = useFeedStore((s) => s.fetchFeed);
    const likePost = useFeedStore((s) => s.likePost);
    const unlikePost = useFeedStore((s) => s.unlikePost);
    const savePost = useFeedStore((s) => s.savePost);
    const unsavePost = useFeedStore((s) => s.unsavePost);
    const reorderPost = useFeedStore((s) => s.movePost);

    const [feedType, setFeedType] = useState<'foryou' | 'following'>('foryou');
    const [feedView, setFeedView] = useState<'private' | 'community'>(
        user?.communityOptIn && user?.activeFeedView === 'community' ? 'community' : 'private'
    );
    const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

    // Scroll tracking
    const scrollY = useSharedValue(0);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    // Track which video post is currently most visible
    const onViewableItemsChanged = useRef(
        ({ viewableItems }: { viewableItems: ViewToken[] }) => {
            const videoPost = viewableItems.find(
                (item) => item.isViewable && item.item?.mediaType === 'VIDEO'
            );
            setActiveVideoId(videoPost?.item?.id || null);
        }
    ).current;

    const viewabilityConfig = useRef({
        viewAreaCoveragePercentThreshold: 50,
    }).current;

    // Set the first video as active when posts load
    useEffect(() => {
        if (posts.length > 0 && !activeVideoId) {
            const firstVideoPost = posts.find((p) => p.mediaType === 'VIDEO');
            if (firstVideoPost) {
                setActiveVideoId(firstVideoPost.id);
            }
        }
    }, [posts]);

    // Prefetch upcoming images for instant rendering as user scrolls
    useEffect(() => {
        if (posts.length === 0) return;
        const imageUrls = posts
            .filter((p) => p.mediaUrl && p.mediaType !== 'VIDEO')
            .map((p) => p.mediaUrl!)
            .slice(0, 10); // Prefetch first 10 images
        if (imageUrls.length > 0) {
            Image.prefetch(imageUrls);
        }
    }, [posts]);

    useEffect(() => {
        fetchFeed(true, feedType, feedView);
    }, [feedType, feedView]);

    const handleTabChange = useCallback(
        (tab: 'foryou' | 'following') => {
            setFeedType(tab);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        },
        []
    );

    const handleFeedViewToggle = useCallback(() => {
        const next = feedView === 'private' ? 'community' : 'private';
        setFeedView(next);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        // Persist feed view preference to backend
        apiFetch(API.feedView, {
            method: 'PUT',
            body: JSON.stringify({ feedView: next }),
        }).catch(() => {});
    }, [feedView]);

    const handleLike = useCallback(
        (postId: string) => {
            const post = posts.find((p) => p.id === postId);
            if (post?.isLiked) {
                unlikePost(postId);
            } else {
                likePost(postId);
            }
        },
        [posts, likePost, unlikePost]
    );

    const handlePostPress = useCallback(
        (postId: string) => {
            router.push(`/post/${postId}`);
        },
        [router]
    );

    const handleSave = useCallback(
        (postId: string) => {
            const post = posts.find((p) => p.id === postId);
            if (post?.isSaved) {
                unsavePost(postId);
            } else {
                savePost(postId);
            }
        },
        [posts, savePost, unsavePost]
    );

    const handleLoadMore = useCallback(() => {
        if (!isLoading && hasMore) {
            fetchFeed(false, feedType, feedView);
        }
    }, [isLoading, hasMore, fetchFeed, feedType, feedView]);

    const handleReorder = useCallback(
        (postId: string, direction: 'up' | 'down') => {
            reorderPost(postId, direction);
        },
        [reorderPost]
    );

    const getGreeting = () => {
        const profile = user?.culturalProfile || 'standard';
        if (profile === 'muslim') return 'Assalamu Alaikum';
        if (profile === 'custom' && user?.customGreeting) return user.customGreeting;
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const renderPost = useCallback(
        ({ item }: { item: Post }) => {
            return (
                <FeedPostCard
                    post={item}
                    onLike={handleLike}
                    onSave={handleSave}
                    onPress={handlePostPress}
                    onReorder={handleReorder}
                    isVideoActive={item.mediaType === 'VIDEO' && activeVideoId === item.id}
                    isFirstVideo={item.mediaType === 'VIDEO' && activeVideoId === item.id}
                    isOwnPost={item.author?.id === user?.id}
                    shouldReduceData={shouldReduceData}
                />
            );
        },
        [handleLike, handleSave, handlePostPress, handleReorder, activeVideoId, shouldReduceData, user?.id]
    );

    const renderHeader = () => (
        <View>
            {/* Active Contacts Strip — who's online */}
            <ActiveContactsStrip onCreatePress={() => router.push('/(tabs)/create')} />
        </View>
    );

    const renderEmpty = () => {
        if (isLoading) return <SkeletonFeed />;
        if (feedError && posts.length === 0) {
            return (
                <RetryView
                    message="Couldn't load your feed. Check your connection and try again."
                    onRetry={() => fetchFeed(true, feedType, feedView)}
                    icon="cloud-offline-outline"
                />
            );
        }
        return (
            <View style={styles.emptyContainer}>
                <Ionicons
                    name="document-text-outline"
                    size={48}
                    color={colors.text.muted}
                />
                <Text style={styles.emptyTitle}>Your feed is empty</Text>
                <Text style={styles.emptyText}>
                    Create your first post or follow people to get started
                </Text>
                <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={() => router.push('/(tabs)/create')}
                >
                    <Text style={styles.emptyButtonText}>Create Post</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderFooter = () => {
        if (!isLoading || posts.length === 0) return null;
        return (
            <View style={styles.footer}>
                <SkeletonFeed />
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800]]}
                style={StyleSheet.absoluteFill}
            />

            {/* Compact Header — Avatar + Greeting + Actions */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.7}>
                        {user?.avatarUrl ? (
                            <Image source={{ uri: user.avatarUrl }} style={styles.headerAvatar} cachePolicy="memory-disk" />
                        ) : (
                            <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
                                <Text style={styles.headerAvatarInitial}>
                                    {(user?.displayName || 'U')[0].toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <View style={styles.headerGreetingCol}>
                        <Text style={styles.headerGreeting} numberOfLines={1}>
                            {getGreeting()},{' '}
                            {user?.displayName?.split(' ')[0] || 'there'}
                        </Text>
                        {/* Feed view toggle — only if community opt-in */}
                        {user?.communityOptIn && (
                            <TouchableOpacity onPress={handleFeedViewToggle} style={styles.feedViewToggle}>
                                <Ionicons
                                    name={feedView === 'private' ? 'lock-closed' : 'globe'}
                                    size={12}
                                    color={feedView === 'private' ? colors.gold[400] : colors.azure[400]}
                                />
                                <Text style={[styles.feedViewLabel, feedView === 'community' && { color: colors.azure[400] }]}>
                                    {feedView === 'private' ? 'Private Feed' : 'Community Feed'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
                <View style={styles.headerActions}>
                    {/* Tools shortcut for muslim profile */}
                    {user?.culturalProfile === 'muslim' && (
                        <TouchableOpacity
                            style={styles.headerBtn}
                            onPress={() => router.push('/tools' as any)}
                        >
                            <Ionicons name="compass-outline" size={22} color={colors.gold[400]} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={() => router.push('/notifications')}
                    >
                        <Ionicons name="notifications-outline" size={22} color={colors.text.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={() => router.push('/messages')}
                    >
                        <Ionicons name="mail-outline" size={22} color={colors.text.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Slow connection indicator */}
            {(isOffline || shouldReduceData) && (
                <View style={styles.connectionBanner}>
                    <Ionicons
                        name={isOffline ? 'cloud-offline-outline' : 'cellular-outline'}
                        size={14}
                        color={isOffline ? colors.coral[400] : colors.amber[400]}
                    />
                    <Text style={[styles.connectionBannerText, isOffline && { color: colors.coral[400] }]}>
                        {isOffline ? 'No connection — showing cached content' : 'Slow connection — videos paused'}
                    </Text>
                </View>
            )}

            {/* Feed with Intent Hub as Header */}
            <Animated.FlatList
                ref={flatListRef}
                data={posts}
                renderItem={renderPost}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={{
                    paddingHorizontal: spacing.md,
                    paddingBottom: insets.bottom + 100,
                }}
                showsVerticalScrollIndicator={false}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={() => fetchFeed(true, feedType, feedView)}
                        tintColor={colors.gold[500]}
                    />
                }
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                ListEmptyComponent={renderEmpty}
                ListFooterComponent={renderFooter}
                // Performance optimizations
                removeClippedSubviews={Platform.OS === 'android'}
                maxToRenderPerBatch={5}
                windowSize={7}
                initialNumToRender={4}
                updateCellsBatchingPeriod={50}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },

    // Connection banner
    connectionBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 6,
        backgroundColor: colors.obsidian[800],
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
    },
    connectionBannerText: {
        fontSize: 12,
        color: colors.amber[400],
        fontFamily: 'Inter-Medium',
    },

    // Header — compact
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xs,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: spacing.sm,
    },
    headerAvatar: {
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 2,
        borderColor: colors.gold[500],
    },
    headerAvatarPlaceholder: {
        backgroundColor: colors.obsidian[500],
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerAvatarInitial: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text.primary,
    },
    headerGreetingCol: {
        flex: 1,
    },
    headerGreeting: {
        fontSize: 17,
        fontWeight: '700',
        color: colors.text.primary,
        letterSpacing: -0.3,
        fontFamily: 'Inter-Bold',
    },
    feedViewToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    feedViewLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.gold[400],
        fontFamily: 'Inter-SemiBold',
    },
    headerActions: { flexDirection: 'row', gap: spacing.xs },
    headerBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Active Contacts Strip
    contactsStrip: {
        paddingTop: spacing.sm,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
    },
    contactsScroll: {
        paddingHorizontal: spacing.xs,
        gap: spacing.sm,
    },
    contactBubble: {
        alignItems: 'center',
        width: 68,
    },
    contactAvatarWrap: {
        position: 'relative',
        width: CONTACT_AVATAR_SIZE,
        height: CONTACT_AVATAR_SIZE,
        marginBottom: 4,
    },
    contactAvatar: {
        width: CONTACT_AVATAR_SIZE,
        height: CONTACT_AVATAR_SIZE,
        borderRadius: CONTACT_AVATAR_SIZE / 2,
    },
    contactAvatarPlaceholder: {
        backgroundColor: colors.obsidian[500],
        alignItems: 'center',
        justifyContent: 'center',
    },
    contactAvatarInitial: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text.primary,
    },
    contactName: {
        fontSize: 11,
        color: colors.text.secondary,
        fontFamily: 'Inter-Medium',
        textAlign: 'center',
    },
    onlineDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.obsidian[900],
        alignItems: 'center',
        justifyContent: 'center',
    },
    onlineDotInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.emerald[500],
    },
    createBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.gold[500],
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.obsidian[900],
    },

    // Feed Tabs
    feedTabs: {
        flexDirection: 'row',
        paddingHorizontal: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
        marginBottom: spacing.sm,
    },
    feedTab: {
        paddingVertical: spacing.md,
        marginRight: spacing.xl,
        alignItems: 'center',
    },
    feedTabActive: {},
    feedTabText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.muted,
        fontFamily: 'Inter-SemiBold',
    },
    feedTabTextActive: {
        color: colors.text.primary,
    },
    feedTabIndicator: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: colors.gold[500],
        borderRadius: 1,
    },

    // Post card
    postCard: {
        backgroundColor: colors.surface.glass,
        borderRadius: 16,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        overflow: 'hidden',
        position: 'relative',
    },
    heartOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
    },
    authorRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatarWrap: { position: 'relative', width: 40, height: 40 },
    avatar: { width: 40, height: 40, borderRadius: 20 },
    avatarPlaceholder: {
        backgroundColor: colors.obsidian[500],
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text.primary,
    },
    authorInfo: { marginLeft: spacing.sm, flex: 1 },
    authorNameRow: { flexDirection: 'row', alignItems: 'center' },
    authorName: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
        fontFamily: 'Inter-SemiBold',
    },
    postTime: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        marginTop: 1,
    },

    // Post content
    postContent: {
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        lineHeight: 22,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
    },
    readMore: {
        fontSize: typography.fontSize.sm,
        color: colors.gold[500],
        fontWeight: '600',
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
    },

    // Media
    mediaContainer: {
        width: '100%',
    },
    mediaImage: {
        width: '100%',
        aspectRatio: 1.5,
        backgroundColor: colors.obsidian[700],
    },
    videoPlayerContainer: {
        position: 'relative',
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: colors.obsidian[800],
    },
    videoPlayer: {
        width: '100%',
        height: '100%',
    },
    videoBuffering: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.obsidian[800],
    },
    videoBufferingInner: {
        padding: spacing.lg,
    },
    muteIndicator: {
        position: 'absolute',
        bottom: spacing.sm,
        right: spacing.sm,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.surface.overlayMedium,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Actions
    actionsBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: spacing.lg,
    },
    actionCount: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        marginLeft: spacing.xs,
    },
    reorderControls: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: spacing.sm,
        backgroundColor: colors.surface.elevated,
        borderRadius: 12,
        paddingHorizontal: 2,
    },
    reorderBtn: {
        padding: 4,
    },

    // Author's Note
    authorNoteContainer: {
        flexDirection: 'row',
        marginHorizontal: spacing.md,
        marginBottom: spacing.md,
        borderRadius: 10,
        backgroundColor: colors.surface.glass,
        overflow: 'hidden',
    },
    authorNoteAccent: {
        width: 3,
        backgroundColor: colors.gold[500],
        borderTopLeftRadius: 10,
        borderBottomLeftRadius: 10,
    },
    authorNoteContent: {
        flex: 1,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs + 2,
    },
    authorNoteHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 3,
    },
    authorNoteAvatar: {
        width: 16,
        height: 16,
        borderRadius: 8,
    },
    authorNoteLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.gold[500],
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        fontFamily: 'Inter-Bold',
    },
    authorNoteText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        lineHeight: 18,
    },

    // Empty state
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        paddingHorizontal: spacing.xl,
    },
    emptyTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        color: colors.text.primary,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    emptyText: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing.xl,
    },
    emptyButton: {
        backgroundColor: colors.gold[500],
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: 12,
    },
    emptyButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.obsidian[900],
    },

    // Footer
    footer: { paddingVertical: spacing.sm },
});
