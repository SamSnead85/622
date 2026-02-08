import { useState, useCallback, memo, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    RefreshControl,
    Dimensions,
    Pressable,
    Share,
    Platform,
    ActionSheetIOS,
    Alert,
    ViewToken,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withDelay,
    FadeInDown,
    runOnJS,
} from 'react-native-reanimated';
import { useVideoPlayer, VideoView } from 'expo-video';
import { colors, typography, spacing } from '@zerog/ui';
import { useFeedStore, useAuthStore, Post } from '../../stores';
import { SkeletonFeed } from '../../components/SkeletonPost';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
function FeedVideoPlayer({ uri, isActive }: { uri: string; isActive: boolean }) {
    const [isMuted, setIsMuted] = useState(true);
    const [showFirstFrame, setShowFirstFrame] = useState(false);

    const player = useVideoPlayer(uri, (player) => {
        player.loop = true;
        player.muted = true;
    });

    useEffect(() => {
        if (isActive) {
            player.play();
        } else {
            player.pause();
            player.muted = true;
            setIsMuted(true);
        }
    }, [isActive, player]);

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
            {/* Buffering overlay - show until first frame renders */}
            {!showFirstFrame && (
                <View style={styles.videoBuffering}>
                    <Image source={{ uri }} style={styles.videoThumbnail} blurRadius={10} />
                </View>
            )}
            {/* Mute indicator */}
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
        isVideoActive,
    }: {
        post: Post;
        onLike: (id: string) => void;
        onSave: (id: string) => void;
        onPress: (id: string) => void;
        isVideoActive: boolean;
    }) => {
        const router = useRouter();
        const lastTapRef = useRef(0);
        const [showHeart, setShowHeart] = useState(false);

        const handleTap = () => {
            const now = Date.now();
            if (now - lastTapRef.current < 300) {
                // Double tap - like
                if (!post.isLiked) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onLike(post.id);
                }
                setShowHeart(true);
                setTimeout(() => setShowHeart(false), 1100);
                lastTapRef.current = 0; // Reset to prevent triple-tap
            } else {
                lastTapRef.current = now;
                // Wait to see if it's a double tap before navigating
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
                    {/* Double-tap heart overlay */}
                    <LikeHeartOverlay show={showHeart} />

                    {/* Post header */}
                    <View style={styles.postHeader}>
                        <TouchableOpacity
                            style={styles.authorRow}
                            onPress={() =>
                                post.author?.username &&
                                router.push(`/profile/${post.author.username}`)
                            }
                        >
                            {post.author?.avatarUrl ? (
                                <Image
                                    source={{ uri: post.author.avatarUrl }}
                                    style={styles.avatar}
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

                    {/* Post content with Read More */}
                    {post.content ? <ReadMoreText text={post.content} /> : null}

                    {/* Media */}
                    {post.mediaUrl && (
                        <View style={styles.mediaContainer}>
                            {post.mediaType === 'VIDEO' ? (
                                <FeedVideoPlayer
                                    uri={post.mediaUrl}
                                    isActive={isVideoActive}
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
                                    resizeMode="cover"
                                />
                            )}
                        </View>
                    )}

                    {/* Actions bar */}
                    <View style={styles.actionsBar}>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => {
                                Haptics.impactAsync(
                                    Haptics.ImpactFeedbackStyle.Light
                                );
                                onLike(post.id);
                            }}
                        >
                            <Ionicons
                                name={post.isLiked ? 'heart' : 'heart-outline'}
                                size={22}
                                color={
                                    post.isLiked
                                        ? colors.coral[500]
                                        : colors.text.secondary
                                }
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

                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => {
                                Haptics.impactAsync(
                                    Haptics.ImpactFeedbackStyle.Light
                                );
                                onSave(post.id);
                            }}
                        >
                            <Ionicons
                                name={
                                    post.isSaved ? 'bookmark' : 'bookmark-outline'
                                }
                                size={20}
                                color={
                                    post.isSaved
                                        ? colors.gold[500]
                                        : colors.text.secondary
                                }
                            />
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Animated.View>
        );
    },
    (prev, next) =>
        prev.post.id === next.post.id &&
        prev.post.isLiked === next.post.isLiked &&
        prev.post.likesCount === next.post.likesCount &&
        prev.post.isSaved === next.post.isSaved &&
        prev.isVideoActive === next.isVideoActive
);

// ============================================
// Feed Screen
// ============================================
export default function FeedScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const flatListRef = useRef<FlatList>(null);

    const posts = useFeedStore((s) => s.posts);
    const isLoading = useFeedStore((s) => s.isLoading);
    const isRefreshing = useFeedStore((s) => s.isRefreshing);
    const hasMore = useFeedStore((s) => s.hasMore);
    const fetchFeed = useFeedStore((s) => s.fetchFeed);
    const likePost = useFeedStore((s) => s.likePost);
    const unlikePost = useFeedStore((s) => s.unlikePost);
    const savePost = useFeedStore((s) => s.savePost);
    const unsavePost = useFeedStore((s) => s.unsavePost);

    const [feedType, setFeedType] = useState<'foryou' | 'following'>('foryou');
    const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

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

    useEffect(() => {
        fetchFeed(true, feedType);
    }, []);

    const handleTabChange = useCallback(
        (tab: 'foryou' | 'following') => {
            setFeedType(tab);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // Scroll to top
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            fetchFeed(true, tab);
        },
        [fetchFeed]
    );

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
            fetchFeed(false);
        }
    }, [isLoading, hasMore, fetchFeed]);

    // Greeting based on time of day
    const getGreeting = () => {
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
                    isVideoActive={item.mediaType === 'VIDEO' && activeVideoId === item.id}
                />
            );
        },
        [handleLike, handleSave, handlePostPress, activeVideoId]
    );

    const renderEmpty = () => {
        if (isLoading) return <SkeletonFeed />;
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

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
                <View>
                    <Text style={styles.headerGreeting}>
                        {getGreeting()},{' '}
                        {user?.displayName?.split(' ')[0] || 'there'}
                    </Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={() => router.push('/notifications')}
                    >
                        <Ionicons
                            name="notifications-outline"
                            size={22}
                            color={colors.text.primary}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={() => router.push('/messages')}
                    >
                        <Ionicons
                            name="mail-outline"
                            size={22}
                            color={colors.text.primary}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Feed Type Tabs */}
            <FeedTabs activeTab={feedType} onTabChange={handleTabChange} />

            {/* Feed */}
            <FlatList
                ref={flatListRef}
                data={posts}
                renderItem={renderPost}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{
                    paddingHorizontal: spacing.md,
                    paddingTop: spacing.sm,
                    paddingBottom: insets.bottom + 100,
                }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={() => fetchFeed(true, feedType)}
                        tintColor={colors.gold[500]}
                    />
                }
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                ListEmptyComponent={renderEmpty}
                ListFooterComponent={renderFooter}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.sm,
    },
    headerGreeting: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.text.primary,
        letterSpacing: -0.5,
        fontFamily: 'Inter-Bold',
    },
    headerActions: { flexDirection: 'row', gap: spacing.sm },
    headerBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Feed Tabs
    feedTabs: {
        flexDirection: 'row',
        paddingHorizontal: spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
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
        overflow: 'hidden',
    },
    videoThumbnail: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover' as any,
    },
    muteIndicator: {
        position: 'absolute',
        bottom: spacing.sm,
        right: spacing.sm,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
