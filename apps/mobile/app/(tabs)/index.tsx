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
import { useNavigation } from '@react-navigation/native';
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
import { Avatar, GlassCard } from '../../components';
import { useFeedStore, useAuthStore, Post } from '../../stores';
import { SkeletonFeed } from '../../components/SkeletonPost';
import { useNetworkQuality } from '../../hooks/useNetworkQuality';
import { RetryView } from '../../components/RetryView';
import { apiFetch, API } from '../../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toHijri } from '../../lib/hijri';
import { IMAGE_PLACEHOLDER, AVATAR_PLACEHOLDER } from '../../lib/imagePlaceholder';


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
    hasStory,
    isSeen,
    onPress,
    onLongPress,
    index,
}: {
    avatarUrl?: string;
    name: string;
    isOnline: boolean;
    isUser?: boolean;
    hasStory?: boolean;
    isSeen?: boolean;
    onPress: () => void;
    onLongPress?: () => void;
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
                onLongPress={onLongPress}
                style={styles.contactBubble}
                accessibilityRole="button"
                accessibilityLabel={isUser ? 'Your story' : `${name}${hasStory ? ', has a new story' : ''}`}
                accessibilityHint={isUser ? 'Double tap to view or create your story' : hasStory ? `Double tap to view ${name}'s story` : `Double tap to view ${name}'s profile`}
            >
                <View style={[styles.contactAvatarWrap, hasStory && !isSeen && styles.storyRing, hasStory && isSeen && styles.storyRingSeen]}>
                    {avatarUrl ? (
                        <Image
                            source={{ uri: avatarUrl }}
                            style={[styles.contactAvatar, hasStory && styles.contactAvatarWithStory]}
                            placeholder={AVATAR_PLACEHOLDER.blurhash}
                            transition={AVATAR_PLACEHOLDER.transition}
                            cachePolicy="memory-disk"
                        />
                    ) : (
                        <View style={[styles.contactAvatar, styles.contactAvatarPlaceholder, hasStory && styles.contactAvatarWithStory]}>
                            <Text style={styles.contactAvatarInitial}>
                                {name[0]?.toUpperCase() || '?'}
                            </Text>
                        </View>
                    )}
                    {!hasStory && (
                        <AvatarGlow
                            type={isOnline ? 'online' : 'active'}
                            size={CONTACT_AVATAR_SIZE}
                        />
                    )}
                    {/* Online dot */}
                    {isOnline && !hasStory && (
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
    const [storyUsers, setStoryUsers] = useState<Array<{ userId: string; displayName: string; avatarUrl?: string; isSeen?: boolean }>>([]);

    // Fetch moments feed to show story rings
    useEffect(() => {
        apiFetch<any>(API.momentsFeed).then((data) => {
            const list = data?.moments || data || [];
            if (Array.isArray(list)) {
                const seen = new Set<string>();
                const users: typeof storyUsers = [];
                for (const moment of list) {
                    const uid = moment.user?.id || moment.userId;
                    if (uid && !seen.has(uid)) {
                        seen.add(uid);
                        users.push({
                            userId: uid,
                            displayName: moment.user?.displayName || 'Unknown',
                            avatarUrl: moment.user?.avatarUrl,
                            isSeen: moment.isSeen,
                        });
                    }
                }
                setStoryUsers(users);
            }
        }).catch((error) => {
            console.warn('Failed to fetch moments feed:', error);
        });
    }, []);

    // Derive unique authors from feed (simulate "active contacts")
    // In production, this would come from a presence API
    const activeContacts = useCallback(() => {
        const seen = new Set<string>();
        // Skip users who already show up in story rings
        const storyUserIds = new Set(storyUsers.map((s) => s.userId));
        const contacts: { id: string; username: string; displayName: string; avatarUrl?: string; isOnline: boolean }[] = [];
        for (const post of posts) {
            if (post.author && !seen.has(post.author.id) && post.author.id !== user?.id && !storyUserIds.has(post.author.id)) {
                seen.add(post.author.id);
                contacts.push({
                    id: post.author.id,
                    username: post.author?.username || 'unknown',
                    displayName: post.author?.displayName || 'Anonymous',
                    avatarUrl: post.author.avatarUrl,
                    isOnline: contacts.length < 3, // First 3 shown as "online" (simulated)
                });
            }
            if (contacts.length >= 12) break;
        }
        return contacts;
    }, [posts, user?.id, storyUsers])();

    return (
        <View style={styles.contactsStrip}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.contactsScroll}
            >
                {/* User's own avatar — tap to create moment or go to create */}
                <ActiveContactBubble
                    avatarUrl={user?.avatarUrl}
                    name={user?.displayName || 'You'}
                    isOnline={true}
                    isUser={true}
                    hasStory={storyUsers.some((s) => s.userId === user?.id)}
                    onPress={() => {
                        if (storyUsers.some((s) => s.userId === user?.id)) {
                            router.push(`/moments/${user?.id}` as any);
                        } else {
                            router.push('/moments/create' as any);
                        }
                    }}
                    onLongPress={() => router.push('/moments/create' as any)}
                    index={0}
                />
                {/* Story ring users */}
                {storyUsers.filter((s) => s.userId !== user?.id).map((story, i) => (
                    <ActiveContactBubble
                        key={story.userId}
                        avatarUrl={story.avatarUrl}
                        name={story.displayName}
                        isOnline={false}
                        hasStory={true}
                        isSeen={story.isSeen}
                        onPress={() => router.push(`/moments/${story.userId}` as any)}
                        index={i + 1}
                    />
                ))}
                {/* Active contacts from feed */}
                {activeContacts.map((contact, i) => (
                    <ActiveContactBubble
                        key={contact.id}
                        avatarUrl={contact.avatarUrl}
                        name={contact.displayName}
                        isOnline={contact.isOnline}
                        onPress={() => router.push(`/profile/${contact.username}` as any)}
                        index={i + storyUsers.length}
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
                accessibilityRole="tab"
                accessibilityLabel="For You"
                accessibilityState={{ selected: activeTab === 'foryou' }}
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
                accessibilityRole="tab"
                accessibilityLabel="Following"
                accessibilityState={{ selected: activeTab === 'following' }}
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
                <TouchableOpacity onPress={() => setExpanded(true)} accessibilityRole="button" accessibilityLabel="Read more">
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
        <Pressable onPress={toggleMute} style={styles.videoPlayerContainer} accessibilityRole="button" accessibilityLabel={isMuted ? 'Video muted, tap to unmute' : 'Video playing, tap to mute'}>
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
                            accessibilityRole="button"
                            accessibilityLabel={`View ${post.author?.displayName || post.author?.username || 'Anonymous'}'s profile`}
                            accessibilityHint="Double tap to view profile"
                        >
                            <View style={styles.avatarWrap}>
                                {post.author?.avatarUrl ? (
                                    <Image
                                        source={{ uri: post.author.avatarUrl }}
                                        style={styles.avatar}
                                        placeholder={AVATAR_PLACEHOLDER.blurhash}
                                        transition={AVATAR_PLACEHOLDER.transition}
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
                                            style={{ marginStart: 4 }}
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
                                    placeholder={IMAGE_PLACEHOLDER.blurhash}
                                    transition={IMAGE_PLACEHOLDER.transition}
                                    cachePolicy="memory-disk"
                                    recyclingKey={post.id}
                                    accessibilityLabel={`Post image by ${post.author?.displayName || 'Anonymous'}`}
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
                            accessibilityRole="button"
                            accessibilityLabel={post.isLiked ? `Unlike post by ${post.author?.displayName || 'Anonymous'}, ${formatCount(post.likesCount)} likes` : `Like post by ${post.author?.displayName || 'Anonymous'}, ${formatCount(post.likesCount)} likes`}
                            accessibilityHint="Double tap to like this post"
                            accessibilityState={{ selected: post.isLiked }}
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
                            accessibilityRole="button"
                            accessibilityLabel={`${formatCount(post.commentsCount)} comments`}
                            accessibilityHint="Double tap to view comments"
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
                            accessibilityRole="button"
                            accessibilityLabel="Share post"
                            accessibilityHint="Double tap to share this post"
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
                                    accessibilityRole="button"
                                    accessibilityLabel="Move post up"
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
                                    accessibilityRole="button"
                                    accessibilityLabel="Move post down"
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
                            accessibilityRole="button"
                            accessibilityLabel={post.isSaved ? 'Unsave post' : 'Save post'}
                            accessibilityHint={post.isSaved ? 'Double tap to unsave this post' : 'Double tap to save this post'}
                            accessibilityState={{ selected: post.isSaved }}
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
                                            placeholder={AVATAR_PLACEHOLDER.blurhash}
                                            transition={AVATAR_PLACEHOLDER.transition}
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
// Seed Content Posts — Official 0G welcome content
// ============================================
const SEED_POSTS = [
    { id: 'seed-1', author: '0G Team', avatar: null, content: 'Welcome to 0G — your private, secure social space. Here, you control who sees your content, how your feed works, and what communities you join. No ads, no tracking, no surveillance. Just you and your people.', tag: 'Welcome' },
    { id: 'seed-2', author: '0G Team', avatar: null, content: 'Ramadan Mubarak! 🌙 This Ramadan, use 0G to stay connected with family, track your Quran reading progress, get prayer time reminders, and share meaningful moments with your community.', tag: 'Ramadan 2026' },
    { id: 'seed-3', author: '0G Team', avatar: null, content: 'Did you know? You can customize your feed algorithm in Settings. Choose from Chronological, Family Feed, or create your own custom mix. Your feed, your rules.', tag: 'Pro Tip' },
    { id: 'seed-4', author: '0G Team', avatar: null, content: 'Your privacy matters. By default, only people you invite can see your posts. You can optionally join the larger community later — but you\'re never forced into it.', tag: 'Privacy First' },
];

const SEED_TAG_COLORS: Record<string, string> = {
    'Welcome': colors.emerald[500],
    'Ramadan 2026': colors.gold[500],
    'Pro Tip': colors.azure[500],
    'Privacy First': colors.coral[500],
};

function SeedContentSection({ onDismiss }: { onDismiss: () => void }) {
    return (
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <GlassCard gold style={seedStyles.container}>
                {/* Header with dismiss */}
                <View style={seedStyles.header}>
                    <View style={seedStyles.logoBadge}>
                        <Text style={seedStyles.logoText}>0G</Text>
                    </View>
                    <Text style={seedStyles.headerTitle}>From the 0G Team</Text>
                    <TouchableOpacity
                        onPress={onDismiss}
                        style={seedStyles.dismissBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel="Dismiss seed posts"
                    >
                        <Ionicons name="close" size={18} color={colors.text.muted} />
                    </TouchableOpacity>
                </View>

                {/* Horizontally scrolling seed post cards */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={seedStyles.scroll}
                >
                    {SEED_POSTS.map((post, index) => (
                        <Animated.View
                            key={post.id}
                            entering={FadeInDown.duration(300).delay(300 + index * 80)}
                        >
                            <View style={seedStyles.card}>
                                <View style={[seedStyles.tagPill, { backgroundColor: (SEED_TAG_COLORS[post.tag] || colors.gold[500]) + '20' }]}>
                                    <Text style={[seedStyles.tagText, { color: SEED_TAG_COLORS[post.tag] || colors.gold[500] }]}>
                                        {post.tag}
                                    </Text>
                                </View>
                                <Text style={seedStyles.cardContent} numberOfLines={5}>
                                    {post.content}
                                </Text>
                                <View style={seedStyles.cardFooter}>
                                    <View style={seedStyles.cardAuthorBadge}>
                                        <Text style={seedStyles.cardAuthorBadgeText}>0G</Text>
                                    </View>
                                    <Text style={seedStyles.cardAuthor}>{post.author}</Text>
                                </View>
                            </View>
                        </Animated.View>
                    ))}
                </ScrollView>
            </GlassCard>
        </Animated.View>
    );
}

const seedStyles = StyleSheet.create({
    container: {
        marginBottom: spacing.md,
        paddingBottom: spacing.sm,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    logoBadge: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: colors.gold[500],
        alignItems: 'center',
        justifyContent: 'center',
        marginEnd: spacing.sm,
    },
    logoText: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.obsidian[900],
        letterSpacing: -0.5,
    },
    headerTitle: {
        flex: 1,
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
        fontFamily: 'Inter-SemiBold',
    },
    dismissBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scroll: {
        paddingHorizontal: spacing.xs,
        gap: spacing.sm,
    },
    card: {
        width: 240,
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    tagPill: {
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: 20,
        marginBottom: spacing.sm,
    },
    tagText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.3,
        fontFamily: 'Inter-Bold',
    },
    cardContent: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        lineHeight: 19,
        marginBottom: spacing.md,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardAuthorBadge: {
        width: 20,
        height: 20,
        borderRadius: 6,
        backgroundColor: colors.gold[500],
        alignItems: 'center',
        justifyContent: 'center',
        marginEnd: 6,
    },
    cardAuthorBadgeText: {
        fontSize: 8,
        fontWeight: '800',
        color: colors.obsidian[900],
        letterSpacing: -0.3,
    },
    cardAuthor: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.muted,
        fontFamily: 'Inter-SemiBold',
    },
});

// ============================================
// Getting Started Checklist
// ============================================
const CHECKLIST_ITEMS = [
    { id: 'account', label: 'Create your account', icon: 'checkmark-circle' },
    { id: 'photo', label: 'Add a profile photo', icon: 'camera' },
    { id: 'community', label: 'Join a community', icon: 'people' },
    { id: 'post', label: 'Create your first post', icon: 'create' },
    { id: 'invite', label: 'Invite a friend or family member', icon: 'person-add' },
    { id: 'tools', label: 'Try a Deen tool', icon: 'compass' },
    { id: 'algorithm', label: 'Customize your feed', icon: 'options' },
];

function GettingStartedChecklist({
    completedIds,
    onItemPress,
}: {
    completedIds: Set<string>;
    onItemPress: (id: string) => void;
}) {
    const [expanded, setExpanded] = useState(true);
    const completedCount = completedIds.size;
    const allDone = completedCount === CHECKLIST_ITEMS.length;
    const progress = completedCount / CHECKLIST_ITEMS.length;

    return (
        <Animated.View entering={FadeInDown.duration(400).delay(150)}>
            <GlassCard style={checklistStyles.container}>
                {/* Header — tap to collapse/expand */}
                <TouchableOpacity
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setExpanded(!expanded);
                    }}
                    style={checklistStyles.header}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Getting started checklist, ${completedCount} of ${CHECKLIST_ITEMS.length} complete`}
                >
                    <View style={checklistStyles.headerLeft}>
                        <Ionicons name="rocket" size={18} color={colors.gold[500]} />
                        <Text style={checklistStyles.headerTitle}>Getting Started</Text>
                    </View>
                    <View style={checklistStyles.headerRight}>
                        <Text style={checklistStyles.progressText}>
                            {completedCount}/{CHECKLIST_ITEMS.length}
                        </Text>
                        <Ionicons
                            name={expanded ? 'chevron-up' : 'chevron-down'}
                            size={16}
                            color={colors.text.muted}
                        />
                    </View>
                </TouchableOpacity>

                {/* Progress bar */}
                <View style={checklistStyles.progressBarBg}>
                    <View
                        style={[
                            checklistStyles.progressBarFill,
                            { width: `${progress * 100}%` as any },
                            allDone && checklistStyles.progressBarComplete,
                        ]}
                    />
                </View>

                {/* All done celebration */}
                {allDone && (
                    <Animated.View entering={FadeInDown.duration(300)} style={checklistStyles.celebration}>
                        <Text style={checklistStyles.celebrationEmoji}>🎉✨🌟</Text>
                        <Text style={checklistStyles.celebrationText}>
                            You&apos;re all set! Welcome to 0G.
                        </Text>
                    </Animated.View>
                )}

                {/* Checklist items */}
                {expanded && !allDone && (
                    <View style={checklistStyles.items}>
                        {CHECKLIST_ITEMS.map((item, index) => {
                            const done = completedIds.has(item.id);
                            return (
                                <Animated.View
                                    key={item.id}
                                    entering={FadeInDown.duration(250).delay(index * 40)}
                                >
                                    <TouchableOpacity
                                        style={[checklistStyles.item, done && checklistStyles.itemDone]}
                                        onPress={() => !done && onItemPress(item.id)}
                                        disabled={done}
                                        activeOpacity={0.7}
                                        accessibilityRole="checkbox"
                                        accessibilityState={{ checked: done }}
                                        accessibilityLabel={item.label}
                                    >
                                        <View style={[checklistStyles.itemIcon, done && checklistStyles.itemIconDone]}>
                                            <Ionicons
                                                name={(done ? 'checkmark-circle' : item.icon) as any}
                                                size={18}
                                                color={done ? colors.emerald[500] : colors.text.muted}
                                            />
                                        </View>
                                        <Text style={[checklistStyles.itemLabel, done && checklistStyles.itemLabelDone]}>
                                            {item.label}
                                        </Text>
                                        {!done && (
                                            <Ionicons name="chevron-forward" size={14} color={colors.text.muted} />
                                        )}
                                    </TouchableOpacity>
                                </Animated.View>
                            );
                        })}
                    </View>
                )}
            </GlassCard>
        </Animated.View>
    );
}

const checklistStyles = StyleSheet.create({
    container: {
        marginBottom: spacing.md,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    headerTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
        fontFamily: 'Inter-SemiBold',
    },
    progressText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.gold[500],
        fontFamily: 'Inter-SemiBold',
    },
    progressBarBg: {
        height: 4,
        backgroundColor: colors.obsidian[600],
        borderRadius: 2,
        marginTop: spacing.md,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.gold[500],
        borderRadius: 2,
    },
    progressBarComplete: {
        backgroundColor: colors.emerald[500],
    },
    celebration: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
    },
    celebrationEmoji: {
        fontSize: 28,
        marginBottom: spacing.sm,
    },
    celebrationText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.gold[400],
        fontFamily: 'Inter-SemiBold',
    },
    items: {
        marginTop: spacing.md,
        gap: spacing.xxs,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: spacing.xs,
        borderRadius: 10,
    },
    itemDone: {
        opacity: 0.6,
    },
    itemIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center',
        justifyContent: 'center',
        marginEnd: spacing.sm,
    },
    itemIconDone: {
        backgroundColor: colors.emerald[500] + '18',
    },
    itemLabel: {
        flex: 1,
        fontSize: typography.fontSize.sm,
        fontWeight: '500',
        color: colors.text.primary,
        fontFamily: 'Inter-Medium',
    },
    itemLabelDone: {
        textDecorationLine: 'line-through',
        color: colors.text.muted,
    },
});

// ============================================
// Feed Screen
// ============================================
export default function FeedScreen() {
    const router = useRouter();
    const navigation = useNavigation();
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
    const [unreadMessages, setUnreadMessages] = useState(0);

    // Seed content & checklist state
    const [seedDismissed, setSeedDismissed] = useState(true); // hidden until loaded
    const [checklistCompleted, setChecklistCompleted] = useState<Set<string>>(new Set(['account']));

    // Load seed dismissed state and checklist completion from AsyncStorage
    useEffect(() => {
        AsyncStorage.getItem('@seed-dismissed').then((val) => {
            setSeedDismissed(val === 'true');
        });
        // Load checklist completion
        Promise.all(
            CHECKLIST_ITEMS.map(async (item) => {
                if (item.id === 'account') return item.id;
                if (item.id === 'photo') return user?.avatarUrl ? item.id : null;
                const val = await AsyncStorage.getItem(`@checklist-${item.id}`);
                return val === 'true' ? item.id : null;
            })
        ).then((results) => {
            setChecklistCompleted(new Set(results.filter(Boolean) as string[]));
        });
    }, [user?.avatarUrl]);

    const handleDismissSeed = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSeedDismissed(true);
        AsyncStorage.setItem('@seed-dismissed', 'true');
    }, []);

    const handleChecklistItemPress = useCallback((id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        switch (id) {
            case 'photo':
                router.push('/(tabs)/profile');
                break;
            case 'community':
                router.push('/(tabs)/communities' as any);
                break;
            case 'post':
                router.push('/(tabs)/create');
                break;
            case 'invite':
                Share.share({ message: 'Join me on 0G — a private, secure social space. https://0gravity.ai/invite' });
                AsyncStorage.setItem('@checklist-invite', 'true');
                setChecklistCompleted((prev) => new Set([...prev, 'invite']));
                break;
            case 'tools':
                router.push('/tools' as any);
                break;
            case 'algorithm':
                router.push('/settings/algorithm' as any);
                break;
        }
    }, [router]);

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
            .slice(0, 20); // Prefetch first 20 images
        if (imageUrls.length > 0) {
            Image.prefetch(imageUrls);
        }
    }, [posts]);

    // Prefetch next page images when user is near the bottom of the current feed
    const prefetchedPageRef = useRef<number>(0);
    const onViewableForPrefetch = useCallback(
        ({ viewableItems }: { viewableItems: ViewToken[] }) => {
            if (viewableItems.length === 0 || posts.length === 0) return;
            const lastViewableIndex = Math.max(
                ...viewableItems.map((v) => v.index ?? 0)
            );
            // When user is within 5 posts of the bottom, prefetch next batch
            if (lastViewableIndex >= posts.length - 5 && hasMore && prefetchedPageRef.current < posts.length) {
                prefetchedPageRef.current = posts.length;
                // Trigger load of next page (images will be prefetched when posts state updates)
                if (!isLoading) {
                    fetchFeed(false, feedType, feedView);
                }
            }
        },
        [posts.length, hasMore, isLoading, fetchFeed, feedType, feedView]
    );

    // Extracted so it can be used in parallel fetch and periodic refresh
    const fetchUnreadCount = useCallback(async () => {
        try {
            const data = await apiFetch<{ conversations: Array<{ unreadCount: number }> }>(API.conversations);
            const totalUnread = (data?.conversations || []).reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
            setUnreadMessages(totalUnread);
        } catch (error) {
            console.warn('Failed to fetch unread messages count:', error);
        }
    }, []);

    // Parallel fetch: feed + unread messages on mount and tab/view changes
    // Uses silent mode when cached posts exist to avoid spinners on tab switch
    useEffect(() => {
        const hasCachedPosts = useFeedStore.getState().posts.length > 0;
        Promise.allSettled([
            fetchFeed(true, feedType, feedView, hasCachedPosts),
            fetchUnreadCount(),
        ]);
    }, [feedType, feedView]);

    // Periodic unread count refresh (every 30 seconds) + on screen focus
    useEffect(() => {
        const interval = setInterval(fetchUnreadCount, 30000);
        const unsubscribe = navigation.addListener('focus', fetchUnreadCount);
        return () => {
            clearInterval(interval);
            unsubscribe();
        };
    }, [navigation, fetchUnreadCount]);

    // Background refresh: silently refresh feed every 3 minutes
    useEffect(() => {
        const interval = setInterval(() => {
            if (!isLoading && !isRefreshing) {
                fetchFeed(true, feedType, feedView, true);
            }
        }, 3 * 60 * 1000);
        return () => clearInterval(interval);
    }, [isLoading, isRefreshing, fetchFeed, feedType, feedView]);

    // Scroll to top when tab is tapped while already focused
    useEffect(() => {
        const unsubscribe = navigation.addListener('tabPress', () => {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        });
        return unsubscribe;
    }, [navigation]);

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
        }).catch((error) => {
            console.warn('Failed to update feed view preference:', error);
        });
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

    const hijri = toHijri(new Date());

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

    // ============================================
    // Ramadan Banner — shows 30 days before & during Ramadan
    // ============================================
    const getRamadanBanner = () => {
        const now = new Date();
        // Ramadan 2026 starts approximately February 18, 2026
        const ramadanStart = new Date(2026, 1, 18); // Month is 0-indexed (1 = February)
        const ramadanEnd = new Date(2026, 2, 20); // Approx end (~30 days)
        const eidEnd = new Date(2026, 2, 23); // Eid al-Fitr (~3 days after Ramadan)
        const daysUntil = Math.ceil((ramadanStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntil > 30 || now > eidEnd) return null;

        const isDuring = now >= ramadanStart && now <= ramadanEnd;
        const isEid = now > ramadanEnd && now <= eidEnd;
        return { isDuring, isEid, daysUntil: Math.max(0, daysUntil) };
    };

    const ramadan = getRamadanBanner();

    // ============================================
    // Profile Completion Check
    // ============================================
    const getProfileCompletion = () => {
        if (!user) return { percent: 0, missing: [] as string[] };
        const checks = [
            { done: !!user.displayName, label: 'Display name' },
            { done: !!user.username, label: 'Username' },
            { done: !!user.avatarUrl, label: 'Profile photo' },
            { done: !!user.bio, label: 'Bio' },
        ];
        const done = checks.filter((c) => c.done).length;
        const missing = checks.filter((c) => !c.done).map((c) => c.label);
        return { percent: Math.round((done / checks.length) * 100), missing };
    };

    const profileCompletion = getProfileCompletion();
    const showProfileNudge = profileCompletion.percent < 100;

    const renderHeader = () => (
        <View>
            {/* Ramadan Banner */}
            {ramadan && (
                <Animated.View entering={FadeInDown.duration(400)}>
                    <TouchableOpacity
                        style={styles.ramadanBanner}
                        onPress={() => router.push('/tools' as any)}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="Ramadan banner"
                        accessibilityHint="Double tap to access Deen tools including prayer times and Quran"
                    >
                        <LinearGradient
                            colors={[colors.surface.goldSubtle, colors.surface.goldMedium, colors.surface.goldSubtle]}
                            style={StyleSheet.absoluteFill}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />
                        <View style={styles.ramadanContent}>
                            <Text style={styles.ramadanEmoji}>☪️</Text>
                            <View style={styles.ramadanTextCol}>
                                <Text style={styles.ramadanTitle}>
                                    {ramadan.isEid
                                        ? 'Eid Mubarak!'
                                        : ramadan.isDuring
                                        ? 'Ramadan Mubarak'
                                        : ramadan.daysUntil <= 1
                                        ? 'Ramadan starts tomorrow!'
                                        : `Ramadan in ${ramadan.daysUntil} days`}
                                </Text>
                                <Text style={styles.ramadanSubtitle}>
                                    {ramadan.isEid
                                        ? 'Eid al-Fitr — may your prayers and fasting be accepted'
                                        : ramadan.isDuring
                                        ? 'Prayer times, Quran & more — tap to access your Deen tools'
                                        : 'Get ready — prayer times, Quran reader & fasting tools available'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={colors.gold[400]} />
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* Profile Completion Nudge */}
            {showProfileNudge && (
                <Animated.View entering={FadeInDown.duration(400).delay(100)}>
                    <TouchableOpacity
                        style={styles.profileNudge}
                        onPress={() => router.push('/(tabs)/profile')}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel={`Complete your profile, ${profileCompletion.percent}% done`}
                        accessibilityHint="Double tap to complete your profile"
                    >
                        <View style={styles.profileNudgeRing}>
                            <View style={styles.profileNudgeRingBg} />
                            <View
                                style={[
                                    styles.profileNudgeRingFill,
                                    {
                                        borderColor: profileCompletion.percent >= 75
                                            ? colors.emerald[500]
                                            : profileCompletion.percent >= 50
                                                ? colors.gold[500]
                                                : colors.amber[400],
                                    },
                                ]}
                            />
                            <Text style={styles.profileNudgePercent}>{profileCompletion.percent}%</Text>
                        </View>
                        <View style={styles.profileNudgeInfo}>
                            <Text style={styles.profileNudgeTitle}>Complete your profile</Text>
                            <Text style={styles.profileNudgeSubtitle}>
                                Add your {profileCompletion.missing.slice(0, 2).join(' & ').toLowerCase()}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* Getting Started Checklist */}
            {checklistCompleted.size < CHECKLIST_ITEMS.length && (
                <GettingStartedChecklist
                    completedIds={checklistCompleted}
                    onItemPress={handleChecklistItemPress}
                />
            )}

            {/* Seed Content Posts — shown when feed is empty or sparse */}
            {!seedDismissed && posts.length < 5 && (
                <SeedContentSection onDismiss={handleDismissSeed} />
            )}

            {/* Feed type tabs */}
            <FeedTabs activeTab={feedType} onTabChange={handleTabChange} />

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
                {/* Warm welcome */}
                <View style={styles.emptyIconWrap}>
                    <LinearGradient
                        colors={[colors.surface.goldSubtle, colors.surface.goldMedium]}
                        style={StyleSheet.absoluteFill}
                    />
                    <Ionicons name="sparkles" size={32} color={colors.gold[500]} />
                </View>
                <Text style={styles.emptyTitle}>Your feed is waiting</Text>
                <Text style={styles.emptyText}>
                    Follow people and join communities to see posts here. The more you connect, the richer your feed becomes.
                </Text>

                {/* Action cards */}
                <View style={styles.emptyActions}>
                    <TouchableOpacity
                        style={styles.emptyActionCard}
                        onPress={() => router.push('/(tabs)/search' as any)}
                        accessibilityRole="button"
                        accessibilityLabel="Find People"
                    >
                        <View style={[styles.emptyActionIcon, { backgroundColor: colors.azure[500] + '18' }]}>
                            <Ionicons name="people" size={20} color={colors.azure[500]} />
                        </View>
                        <Text style={styles.emptyActionTitle}>Find People</Text>
                        <Text style={styles.emptyActionDesc}>Discover interesting accounts</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.emptyActionCard}
                        onPress={() => router.push('/(tabs)/communities' as any)}
                        accessibilityRole="button"
                        accessibilityLabel="Join Groups"
                    >
                        <View style={[styles.emptyActionIcon, { backgroundColor: colors.emerald[500] + '18' }]}>
                            <Ionicons name="globe-outline" size={20} color={colors.emerald[500]} />
                        </View>
                        <Text style={styles.emptyActionTitle}>Join Groups</Text>
                        <Text style={styles.emptyActionDesc}>Connect with communities</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.emptyActionCard}
                        onPress={() => router.push('/(tabs)/create')}
                        accessibilityRole="button"
                        accessibilityLabel="Create Post"
                    >
                        <View style={[styles.emptyActionIcon, { backgroundColor: colors.gold[500] + '18' }]}>
                            <Ionicons name="add-circle" size={20} color={colors.gold[500]} />
                        </View>
                        <Text style={styles.emptyActionTitle}>Create Post</Text>
                        <Text style={styles.emptyActionDesc}>Share your first thought</Text>
                    </TouchableOpacity>
                </View>

                {/* Tools spotlight in empty state */}
                <TouchableOpacity
                    style={styles.emptyToolsCard}
                    onPress={() => router.push('/tools' as any)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Explore Tools"
                    accessibilityHint="Prayer times, Qibla compass, Quran reader, and more"
                >
                    <View style={styles.emptyToolsHeader}>
                        <Ionicons name="compass" size={18} color={colors.gold[400]} />
                        <Text style={styles.emptyToolsTitle}>Explore Tools</Text>
                    </View>
                    <Text style={styles.emptyToolsDesc}>
                        Prayer times, Qibla compass, Quran reader, and more — all built in
                    </Text>
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
                    <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Your profile" accessibilityHint="Double tap to view your profile">
                        <Avatar uri={user?.avatarUrl} name={user?.displayName || 'U'} customSize={34} borderColor={colors.gold[500]} />
                    </TouchableOpacity>
                    <View style={styles.headerGreetingCol}>
                        <Text style={styles.headerGreeting} numberOfLines={1}>
                            {getGreeting()},{' '}
                            {user?.displayName?.split(' ')[0] || 'there'}
                        </Text>
                        <Text style={styles.hijriDate}>
                            {hijri.day} {hijri.monthName} {hijri.year} AH
                        </Text>
                        {/* Feed view toggle — only if community opt-in */}
                        {user?.communityOptIn && (
                            <TouchableOpacity onPress={handleFeedViewToggle} style={styles.feedViewToggle} accessibilityRole="button" accessibilityLabel={feedView === 'private' ? 'Private Feed, tap to switch to Community Feed' : 'Community Feed, tap to switch to Private Feed'}>
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
                    {/* Quick actions menu (algorithm, games, tools) */}
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            if (Platform.OS === 'ios') {
                                ActionSheetIOS.showActionSheetWithOptions(
                                    {
                                        options: ['Feed Settings', 'Games', 'Deen Tools', 'Cancel'],
                                        cancelButtonIndex: 3,
                                    },
                                    (index) => {
                                        if (index === 0) router.push('/settings/algorithm' as any);
                                        else if (index === 1) router.push('/games' as any);
                                        else if (index === 2) router.push('/tools' as any);
                                    }
                                );
                            } else {
                                Alert.alert('Quick Actions', '', [
                                    { text: 'Feed Settings', onPress: () => router.push('/settings/algorithm' as any) },
                                    { text: 'Games', onPress: () => router.push('/games' as any) },
                                    { text: 'Deen Tools', onPress: () => router.push('/tools' as any) },
                                    { text: 'Cancel', style: 'cancel' },
                                ]);
                            }
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Quick actions menu"
                    >
                        <Ionicons name="ellipsis-horizontal" size={22} color={colors.text.secondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={() => router.push('/notifications')}
                        accessibilityRole="button"
                        accessibilityLabel="Notifications"
                    >
                        <Ionicons name="notifications-outline" size={22} color={colors.text.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={() => router.push('/messages' as any)}
                        accessibilityRole="button"
                        accessibilityLabel="Messages"
                    >
                        <View>
                            <Ionicons name="chatbubble-outline" size={22} color={colors.gold[400]} />
                            {unreadMessages > 0 && (
                                <View style={styles.messageBadge}>
                                    <Text style={styles.messageBadgeText}>{unreadMessages > 99 ? '99+' : unreadMessages}</Text>
                                </View>
                            )}
                        </View>
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
                    paddingBottom: 100,
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
                removeClippedSubviews={true}
                maxToRenderPerBatch={4}
                windowSize={5}
                initialNumToRender={3}
                updateCellsBatchingPeriod={100}
                getItemLayout={undefined} // Variable height — use estimatedItemSize instead
                maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
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
    hijriDate: {
        fontSize: typography.fontSize.xs,
        color: colors.gold[400],
        fontFamily: 'Inter-Medium',
        marginTop: 2,
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
    messageBadge: {
        position: 'absolute',
        top: -4,
        right: -8,
        backgroundColor: colors.coral[500],
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    messageBadgeText: {
        color: colors.text.primary,
        fontSize: 10,
        fontWeight: '700',
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
    contactAvatarWithStory: {
        width: CONTACT_AVATAR_SIZE - 6,
        height: CONTACT_AVATAR_SIZE - 6,
        borderRadius: (CONTACT_AVATAR_SIZE - 6) / 2,
    },
    storyRing: {
        borderWidth: 2.5,
        borderColor: colors.gold[500],
        borderRadius: CONTACT_AVATAR_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    storyRingSeen: {
        borderWidth: 2,
        borderColor: colors.obsidian[500],
        borderRadius: CONTACT_AVATAR_SIZE / 2,
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
        marginEnd: spacing.xl,
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
        marginBottom: spacing.lg,
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
    authorInfo: { marginStart: spacing.sm, flex: 1 },
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
        marginEnd: spacing.lg,
    },
    actionCount: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        marginStart: spacing.xs,
    },
    reorderControls: {
        flexDirection: 'row',
        alignItems: 'center',
        marginEnd: spacing.sm,
        backgroundColor: colors.surface.glassActive,
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

    // Ramadan Banner
    ramadanBanner: {
        borderRadius: 14, overflow: 'hidden',
        marginBottom: spacing.md,
        borderWidth: 1, borderColor: colors.gold[500] + '30',
    },
    ramadanContent: {
        flexDirection: 'row', alignItems: 'center',
        padding: spacing.md,
    },
    ramadanEmoji: { fontSize: 24, marginEnd: spacing.sm },
    ramadanTextCol: { flex: 1 },
    ramadanTitle: {
        fontSize: typography.fontSize.base, fontWeight: '700',
        color: colors.gold[400], fontFamily: 'Inter-Bold',
    },
    ramadanSubtitle: {
        fontSize: typography.fontSize.xs, color: colors.text.secondary,
        marginTop: 2, lineHeight: 16,
    },

    // Profile Completion Nudge
    profileNudge: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surface.glass, borderRadius: 14,
        padding: spacing.md, marginBottom: spacing.md,
        borderWidth: 1, borderColor: colors.border.subtle,
    },
    profileNudgeRing: {
        width: 44, height: 44, borderRadius: 22,
        alignItems: 'center', justifyContent: 'center',
        marginEnd: spacing.md,
    },
    profileNudgeRingBg: {
        position: 'absolute', width: 44, height: 44, borderRadius: 22,
        borderWidth: 3, borderColor: colors.obsidian[600],
    },
    profileNudgeRingFill: {
        position: 'absolute', width: 44, height: 44, borderRadius: 22,
        borderWidth: 3, borderColor: colors.gold[500],
        borderEndColor: 'transparent', borderBottomColor: 'transparent',
        transform: [{ rotate: '-45deg' }],
    },
    profileNudgePercent: {
        fontSize: 11, fontWeight: '700', color: colors.text.primary,
    },
    profileNudgeInfo: { flex: 1 },
    profileNudgeTitle: {
        fontSize: typography.fontSize.base, fontWeight: '600',
        color: colors.text.primary,
    },
    profileNudgeSubtitle: {
        fontSize: typography.fontSize.xs, color: colors.text.muted,
        marginTop: 2,
    },

    // Empty state — rich
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 40,
        paddingHorizontal: spacing.md,
    },
    emptyIconWrap: {
        width: 64, height: 64, borderRadius: 32,
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
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
        maxWidth: 300,
    },
    emptyActions: {
        flexDirection: 'row', gap: spacing.sm,
        marginBottom: spacing.xl, width: '100%',
    },
    emptyActionCard: {
        flex: 1, backgroundColor: colors.surface.glass,
        borderRadius: 14, padding: spacing.md,
        borderWidth: 1, borderColor: colors.border.subtle,
        alignItems: 'center',
    },
    emptyActionIcon: {
        width: 40, height: 40, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    emptyActionTitle: {
        fontSize: typography.fontSize.sm, fontWeight: '600',
        color: colors.text.primary, textAlign: 'center',
    },
    emptyActionDesc: {
        fontSize: 10, color: colors.text.muted,
        textAlign: 'center', marginTop: 2,
    },
    emptyToolsCard: {
        width: '100%', backgroundColor: colors.surface.glass,
        borderRadius: 14, padding: spacing.lg,
        borderWidth: 1, borderColor: colors.gold[500] + '30',
    },
    emptyToolsHeader: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        marginBottom: spacing.xs,
    },
    emptyToolsTitle: {
        fontSize: typography.fontSize.base, fontWeight: '600',
        color: colors.gold[400],
    },
    emptyToolsDesc: {
        fontSize: typography.fontSize.sm, color: colors.text.secondary,
        lineHeight: 20,
    },

    // Footer
    footer: { paddingVertical: spacing.sm },
});
