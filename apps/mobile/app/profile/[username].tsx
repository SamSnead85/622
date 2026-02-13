import { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    RefreshControl,
    FlatList,
    Platform,
    Share,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
    FadeInDown,
    FadeIn,
    useSharedValue,
    useAnimatedStyle,
    useAnimatedScrollHandler,
    withTiming,
    withSpring,
    interpolate,
    Extrapolation,
    Easing,
} from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { useAuthStore, Post, mapApiPost } from '../../stores';
import { apiFetch, API } from '../../lib/api';
import { ScreenHeader, LoadingView, Avatar, EmptyState, SkeletonGrid } from '../../components';
import { IMAGE_PLACEHOLDER } from '../../lib/imagePlaceholder';
import { formatCount } from '../../lib/utils';
import { showError } from '../../stores/toastStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = 200;
const AVATAR_SIZE = 96;
const AVATAR_RING_SIZE = AVATAR_SIZE + 8;
const POST_GAP = 2;
const POST_SIZE = (SCREEN_WIDTH - POST_GAP * 2) / 3;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Post>);

interface UserProfile {
    id: string;
    username: string;
    displayName: string;
    bio?: string;
    website?: string;
    avatarUrl?: string;
    coverUrl?: string;
    isVerified: boolean;
    isPrivate: boolean;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    isFollowing: boolean;
    isOwnProfile: boolean;
}

// ─── Animated Stat Counter ──────────────────────────────
const AnimatedStatValue = memo(({ value }: { value: number }) => {
    const animatedValue = useSharedValue(0);
    const prevValue = useRef(0);

    useEffect(() => {
        if (value !== prevValue.current) {
            animatedValue.value = 0;
            animatedValue.value = withSpring(1, {
                damping: 14,
                stiffness: 120,
                mass: 0.8,
            });
            prevValue.current = value;
        }
    }, [value]);

    const animStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: interpolate(animatedValue.value, [0, 0.5, 1], [0.85, 1.08, 1], Extrapolation.CLAMP) },
        ],
        opacity: interpolate(animatedValue.value, [0, 0.3, 1], [0.5, 1, 1], Extrapolation.CLAMP),
    }));

    return (
        <Animated.Text style={[styles.statValue, animStyle]}>
            {formatCount(value)}
        </Animated.Text>
    );
});

// ─── Post Grid Item ──────────────────────────────────────
const PostGridItem = memo(({ post, index }: { post: Post; index: number }) => {
    const router = useRouter();
    return (
        <Animated.View entering={FadeIn.delay(Math.min(index * 30, 300)).duration(250)}>
            <TouchableOpacity
                style={styles.postItem}
                activeOpacity={0.85}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/post/${post.id}`);
                }}
                accessibilityRole="button"
                accessibilityLabel={post.content ? `Post: ${post.content.substring(0, 80)}` : 'View post'}
            >
                {post.mediaUrl ? (
                    <Image
                        source={{ uri: post.thumbnailUrl || post.mediaUrl }}
                        style={styles.postImage}
                        placeholder={IMAGE_PLACEHOLDER.blurhash}
                        transition={IMAGE_PLACEHOLDER.transition}
                        cachePolicy="memory-disk"
                        recyclingKey={post.id}
                        contentFit="cover"
                        accessibilityLabel="Post image"
                    />
                ) : (
                    <LinearGradient
                        colors={[colors.obsidian[600], colors.obsidian[700]]}
                        style={[styles.postImage, styles.textPostBg]}
                    >
                        <Text style={styles.textPostContent} numberOfLines={4}>
                            {post.content}
                        </Text>
                    </LinearGradient>
                )}
                {post.mediaType === 'VIDEO' && (
                    <View style={styles.videoIndicator}>
                        <Ionicons name="play" size={10} color={colors.text.primary} />
                    </View>
                )}
                {(post.likesCount > 0 || post.commentsCount > 0) && (
                    <LinearGradient
                        colors={['transparent', colors.surface.overlayMedium]}
                        style={styles.postOverlay}
                    >
                        <View style={styles.postMeta}>
                            {post.likesCount > 0 && (
                                <View style={styles.postMetaItem}>
                                    <Ionicons name="heart" size={10} color={colors.text.primary} />
                                    <Text style={styles.postMetaText}>{formatCount(post.likesCount)}</Text>
                                </View>
                            )}
                        </View>
                    </LinearGradient>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
});

// ─── Stat Item ───────────────────────────────────────────
const StatItem = memo(({ value, label }: { value: number; label: string }) => (
    <View style={styles.stat}>
        <AnimatedStatValue value={value} />
        <Text style={styles.statLabel}>{label}</Text>
    </View>
));

// ─── Tab Types ───────────────────────────────────────────
type ProfileTab = 'posts' | 'likes';

const TABS: { key: ProfileTab; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { key: 'posts', icon: 'grid-outline', iconActive: 'grid', label: 'Posts' },
    { key: 'likes', icon: 'heart-outline', iconActive: 'heart', label: 'Likes' },
];

// ─── Follow Button ───────────────────────────────────────
const FollowButton = memo(({
    isFollowing,
    isLoading,
    onPress,
}: {
    isFollowing: boolean;
    isLoading: boolean;
    onPress: () => void;
}) => {
    const scale = useSharedValue(1);
    const bgProgress = useSharedValue(isFollowing ? 1 : 0);

    useEffect(() => {
        bgProgress.value = withTiming(isFollowing ? 1 : 0, {
            duration: 300,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
    }, [isFollowing]);

    const handlePress = useCallback(() => {
        scale.value = withSpring(0.92, { damping: 15 }, () => {
            scale.value = withSpring(1, { damping: 12 });
        });
        onPress();
    }, [onPress]);

    const buttonAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: interpolate(bgProgress.value, [0, 1], [1, 0.95]),
    }));

    return (
        <Animated.View style={[styles.followButtonWrap, buttonAnimStyle]}>
            <TouchableOpacity
                style={[styles.followButton, isFollowing && styles.followButtonActive]}
                onPress={handlePress}
                disabled={isLoading}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={isFollowing ? 'Unfollow' : 'Follow'}
            >
                {isFollowing ? (
                    <View style={styles.followingInner}>
                        <Ionicons name="checkmark" size={16} color={colors.text.secondary} style={styles.followIconMargin} />
                        <Text style={styles.followButtonActiveText}>Following</Text>
                    </View>
                ) : (
                    <LinearGradient colors={[colors.gold[400], colors.gold[600]]} style={styles.followGradient}>
                        <Ionicons name="person-add" size={14} color="#FFFFFF" style={styles.followIconMargin} />
                        <Text style={styles.followButtonText}>Follow</Text>
                    </LinearGradient>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
});

// ─── Error State ─────────────────────────────────────────
const ProfileError = memo(({
    message,
    onRetry,
    onGoBack,
}: {
    message: string;
    onRetry: () => void;
    onGoBack: () => void;
}) => (
    <View style={styles.errorContainer}>
        <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />
        <Ionicons name="cloud-offline-outline" size={56} color={colors.text.muted} />
        <Text style={styles.errorTitle}>Unable to load profile</Text>
        <Text style={styles.errorMessage}>{message}</Text>
        <View style={styles.errorActions}>
            <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onRetry();
                }}
                activeOpacity={0.8}
            >
                <Ionicons name="refresh" size={18} color="#FFFFFF" />
                <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.goBackButton}
                onPress={onGoBack}
                activeOpacity={0.8}
            >
                <Text style={styles.goBackButtonText}>Go Back</Text>
            </TouchableOpacity>
        </View>
    </View>
));

// ─── Main Screen ─────────────────────────────────────────
export default function UserProfileScreen() {
    const router = useRouter();
    const { username } = useLocalSearchParams<{ username: string }>();
    const insets = useSafeAreaInsets();
    const currentUser = useAuthStore((s) => s.user);

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFollowLoading, setIsFollowLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Mutual friends
    const [mutualFriends, setMutualFriends] = useState<{ id: string; displayName: string; avatarUrl?: string }[]>([]);
    const [mutualTotal, setMutualTotal] = useState(0);

    // Tabs
    const [likedPosts, setLikedPosts] = useState<Post[]>([]);
    const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
    const [loadedTabs, setLoadedTabs] = useState<Set<ProfileTab>>(new Set(['posts']));

    // Animated tab indicator
    const tabIndicatorX = useSharedValue(0);
    const TAB_WIDTH = (SCREEN_WIDTH - spacing.xl * 2) / 2;

    const indicatorStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: tabIndicatorX.value }],
        width: TAB_WIDTH,
    }));

    const switchTab = useCallback((tab: ProfileTab) => {
        const idx = TABS.findIndex((t) => t.key === tab);
        tabIndicatorX.value = withTiming(idx * TAB_WIDTH, {
            duration: 280,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
        setActiveTab(tab);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, [TAB_WIDTH]);

    // ── Parallax scroll ──────────────────────────────────
    const scrollY = useSharedValue(0);
    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    const coverAnimStyle = useAnimatedStyle(() => {
        const translateY = interpolate(
            scrollY.value,
            [-COVER_HEIGHT, 0, COVER_HEIGHT],
            [-COVER_HEIGHT / 2, 0, COVER_HEIGHT * 0.4],
            Extrapolation.CLAMP,
        );
        const scale = interpolate(
            scrollY.value,
            [-COVER_HEIGHT, 0, COVER_HEIGHT],
            [1.6, 1, 1],
            Extrapolation.CLAMP,
        );
        return {
            transform: [{ translateY }, { scale }],
        };
    });

    const coverOverlayStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            scrollY.value,
            [0, COVER_HEIGHT * 0.6],
            [0.3, 0.85],
            Extrapolation.CLAMP,
        );
        return { opacity };
    });

    // ── Data Loading ─────────────────────────────────────
    const loadMutualFriends = useCallback(async (userId: string) => {
        try {
            const data = await apiFetch<any>(API.mutualFriends(userId));
            const friends = data.users || data.mutualFriends || data.data || [];
            setMutualFriends(Array.isArray(friends) ? friends.slice(0, 3) : []);
            setMutualTotal(data.total ?? data.count ?? (Array.isArray(friends) ? friends.length : 0));
        } catch {
            // Silently hide if API fails
            setMutualFriends([]);
            setMutualTotal(0);
        }
    }, []);

    const loadProfile = useCallback(async () => {
        if (!username) return;
        setLoadError(null);
        try {
            const data = await apiFetch<any>(API.userProfile(username));
            setProfile(data);
            if (data?.id) {
                const postsData = await apiFetch<any>(`${API.userPosts(data.id)}?limit=50`);
                const rawPosts = postsData.posts || postsData.data || [];
                setPosts((Array.isArray(rawPosts) ? rawPosts : []).map(mapApiPost));
                if (!data.isOwnProfile) {
                    loadMutualFriends(data.id);
                }
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Failed to load profile';
            setLoadError(msg);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [username, loadMutualFriends]);

    useEffect(() => { loadProfile(); }, [loadProfile]);

    const handleRetry = useCallback(() => {
        setIsLoading(true);
        setLoadError(null);
        loadProfile();
    }, [loadProfile]);

    const handleFollow = useCallback(async () => {
        if (!profile) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsFollowLoading(true);
        const wasFollowing = profile.isFollowing;
        setProfile((p) => p ? {
            ...p,
            isFollowing: !wasFollowing,
            followersCount: wasFollowing ? Math.max(0, p.followersCount - 1) : p.followersCount + 1,
        } : p);
        try {
            await apiFetch(API.follow(profile.id), { method: wasFollowing ? 'DELETE' : 'POST' });
        } catch {
            // Revert on failure
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setProfile((p) => p ? {
                ...p,
                isFollowing: wasFollowing,
                followersCount: wasFollowing ? p.followersCount + 1 : Math.max(0, p.followersCount - 1),
            } : p);
        } finally {
            setIsFollowLoading(false);
        }
    }, [profile]);

    const handleShareProfile = useCallback(async () => {
        if (!profile) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            const displayName = profile.displayName || profile.username || 'User';
            await Share.share({
                message: `Check out ${displayName}'s profile on Caravan!\nhttps://caravan.social/@${profile.username || ''}`,
                title: `${displayName} on Caravan`,
            });
        } catch {
            // User cancelled share — no action needed
        }
    }, [profile]);

    const loadLikedPosts = useCallback(async () => {
        if (!profile?.id) return;
        try {
            const data = await apiFetch<any>(API.likedPosts(profile.id));
            const rawPosts = data.posts || data.data || [];
            setLikedPosts((Array.isArray(rawPosts) ? rawPosts : []).map(mapApiPost));
        } catch { showError("Couldn't load liked posts"); }
    }, [profile?.id]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await loadProfile();
        if (loadedTabs.has('likes')) loadLikedPosts();
    }, [loadProfile, loadedTabs, loadLikedPosts]);

    // Lazy-load tab data
    useEffect(() => {
        if (loadedTabs.has(activeTab)) return;
        setLoadedTabs((prev) => new Set(prev).add(activeTab));
        if (activeTab === 'likes') loadLikedPosts();
    }, [activeTab, loadedTabs, loadLikedPosts]);

    // ── Redirect own profile ─────────────────────────────
    useEffect(() => {
        if (profile?.isOwnProfile) {
            router.replace('/(tabs)/profile');
        }
    }, [profile?.isOwnProfile, router]);

    // ── Memoized data & renderers (must be before early returns) ──
    const postsData = useMemo(() => {
        if (activeTab === 'posts') return posts;
        return likedPosts;
    }, [activeTab, posts, likedPosts]);

    const renderPost = useCallback(
        ({ item, index }: { item: Post; index: number }) => (
            <PostGridItem post={item} index={index} />
        ),
        [],
    );

    const renderEmpty = useCallback(() => {
        if (isLoading) {
            return (
                <View style={styles.skeletonWrap}>
                    <SkeletonGrid />
                </View>
            );
        }
        const isPostsTab = activeTab === 'posts';
        return (
            <EmptyState
                icon={isPostsTab ? 'camera-outline' : 'heart-outline'}
                title={isPostsTab ? 'No posts to show' : 'No liked posts yet'}
                message={isPostsTab ? 'When this person shares something, it will appear here.' : 'Posts this person has liked will show up here.'}
                compact
            />
        );
    }, [isLoading, activeTab]);

    // ── Loading State ────────────────────────────────────
    if (isLoading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />
                <LoadingView />
            </View>
        );
    }

    // ── Error State ──────────────────────────────────────
    if (loadError && !profile) {
        return (
            <ProfileError
                message={loadError}
                onRetry={handleRetry}
                onGoBack={() => router.back()}
            />
        );
    }

    if (!profile) {
        return (
            <View style={[styles.container, styles.centered]}>
                <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />
                <Ionicons name="person-outline" size={48} color={colors.text.muted} />
                <Text style={styles.notFoundTitle}>User not found</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
                    <Text style={styles.backLinkText}>Go back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (profile.isOwnProfile) {
        return null;
    }

    // ── Header ───────────────────────────────────────────
    const renderHeader = () => (
        <View>
            {/* Cover Photo with Parallax */}
            <Animated.View style={styles.coverArea}>
                <Animated.View style={[styles.coverImageWrap, coverAnimStyle]}>
                    {profile.coverUrl ? (
                        <Image
                            source={{ uri: profile.coverUrl }}
                            style={styles.coverImage}
                            placeholder={IMAGE_PLACEHOLDER.blurhash}
                            transition={400}
                            cachePolicy="memory-disk"
                            contentFit="cover"
                        />
                    ) : (
                        <LinearGradient
                            colors={[colors.gold[700], colors.gold[600], colors.gold[500]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.coverImage}
                        >
                            <View style={styles.coverPattern}>
                                <LinearGradient
                                    colors={[colors.surface.overlayLight, 'transparent', colors.surface.overlayLight]}
                                    style={StyleSheet.absoluteFill}
                                />
                            </View>
                        </LinearGradient>
                    )}
                </Animated.View>

                {/* Gradient overlay for text readability */}
                <Animated.View style={[styles.coverGradientOverlay, coverOverlayStyle]}>
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)', colors.obsidian[900]]}
                        locations={[0, 0.3, 0.65, 1]}
                        style={StyleSheet.absoluteFill}
                    />
                </Animated.View>

                {/* Bottom fade */}
                <LinearGradient
                    colors={['transparent', colors.surface.overlayLight, colors.surface.overlayMedium, colors.obsidian[900]]}
                    locations={[0, 0.35, 0.7, 1]}
                    style={styles.coverFade}
                />
            </Animated.View>

            {/* Profile Content */}
            <View style={styles.profileContent}>
                {/* Avatar */}
                <Animated.View
                    entering={FadeInDown.delay(100).duration(400).springify().damping(18)}
                    style={styles.avatarSection}
                >
                    <View style={styles.avatarWrapper}>
                        <LinearGradient
                            colors={[colors.gold[400], colors.gold[500], colors.gold[600]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.avatarRing}
                        >
                            <View style={styles.avatarInner}>
                                <Avatar
                                    uri={profile.avatarUrl}
                                    name={profile.displayName || profile.username || '?'}
                                    customSize={AVATAR_SIZE}
                                />
                            </View>
                        </LinearGradient>
                        <View style={styles.avatarGlow} />
                    </View>
                </Animated.View>

                {/* User Info */}
                <Animated.View
                    entering={FadeInDown.delay(180).duration(400).springify().damping(18)}
                    style={styles.userInfo}
                >
                    <View style={styles.nameRow}>
                        <Text style={styles.displayName}>{profile.displayName || profile.username || 'User'}</Text>
                        {profile.isVerified && (
                            <Ionicons name="checkmark-circle" size={18} color={colors.gold[500]} style={styles.verifiedIcon} />
                        )}
                    </View>
                    <Text style={styles.username}>@{profile.username || 'unknown'}</Text>
                    {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
                    {profile.website ? <Text style={styles.website}>{profile.website}</Text> : null}
                </Animated.View>

                {/* Mutual friends */}
                {mutualTotal > 0 && (
                    <Animated.View entering={FadeInDown.delay(220).duration(400).springify().damping(18)}>
                        <TouchableOpacity
                            style={styles.mutualRow}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={styles.mutualAvatars}>
                                {mutualFriends.map((f, i) => (
                                    <View key={f.id} style={[styles.mutualAvatarWrap, { marginLeft: i > 0 ? -8 : 0, zIndex: 3 - i }]}>
                                        <Avatar uri={f.avatarUrl} name={f.displayName || '?'} customSize={24} />
                                    </View>
                                ))}
                            </View>
                            <Text style={styles.mutualText}>
                                {mutualTotal <= 3
                                    ? `${mutualTotal} mutual friend${mutualTotal !== 1 ? 's' : ''}`
                                    : `You and ${mutualTotal} others follow this person`}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Stats */}
                <Animated.View entering={FadeInDown.delay(260).duration(400).springify().damping(18)}>
                    <LinearGradient
                        colors={[colors.surface.glassHover, colors.surface.glass]}
                        style={styles.statsContainer}
                    >
                        <StatItem value={profile.postsCount ?? 0} label="Posts" />
                        <View style={styles.statDivider} />
                        <StatItem value={profile.followersCount ?? 0} label="Followers" />
                        <View style={styles.statDivider} />
                        <StatItem value={profile.followingCount ?? 0} label="Following" />
                    </LinearGradient>
                </Animated.View>

                {/* Action Buttons */}
                <Animated.View
                    entering={FadeInDown.delay(320).duration(400).springify().damping(18)}
                    style={styles.actionRow}
                >
                    <View style={styles.followCol}>
                        <FollowButton
                            isFollowing={profile.isFollowing}
                            isLoading={isFollowLoading}
                            onPress={handleFollow}
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.shareBtn}
                        activeOpacity={0.8}
                        onPress={handleShareProfile}
                        accessibilityRole="button"
                        accessibilityLabel="Share profile"
                    >
                        <Ionicons name="share-outline" size={18} color={colors.text.secondary} />
                    </TouchableOpacity>
                </Animated.View>

                {/* Segmented Tabs */}
                <Animated.View
                    entering={FadeInDown.delay(380).duration(400).springify().damping(18)}
                    style={styles.tabContainer}
                >
                    <Animated.View style={[styles.tabIndicator, indicatorStyle]}>
                        <LinearGradient
                            colors={[colors.surface.goldMedium, colors.surface.goldSubtle]}
                            style={styles.tabIndicatorInner}
                        />
                    </Animated.View>

                    {TABS.map((tab) => (
                        <TouchableOpacity
                            key={tab.key}
                            style={styles.tab}
                            onPress={() => switchTab(tab.key)}
                            activeOpacity={0.7}
                            accessibilityRole="tab"
                            accessibilityLabel={tab.label}
                            accessibilityState={{ selected: activeTab === tab.key }}
                        >
                            <Ionicons
                                name={activeTab === tab.key ? tab.iconActive : tab.icon}
                                size={18}
                                color={activeTab === tab.key ? colors.gold[500] : colors.text.muted}
                            />
                            <Text
                                style={[
                                    styles.tabText,
                                    activeTab === tab.key && styles.tabTextActive,
                                ]}
                            >
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </Animated.View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800], colors.obsidian[900]]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />

            <ScreenHeader title={`@${profile.username || ''}`} />

            <AnimatedFlatList
                data={postsData}
                renderItem={renderPost}
                keyExtractor={(item: Post) => item.id}
                numColumns={3}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                columnWrapperStyle={styles.postsRow}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.gold[500]}
                        progressBackgroundColor={colors.obsidian[700]}
                        colors={[colors.gold[500]]}
                    />
                }
                removeClippedSubviews={Platform.OS === 'android'}
                maxToRenderPerBatch={12}
                windowSize={9}
                initialNumToRender={9}
            />
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.obsidian[900],
    },
    centered: {
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Error / Not Found ────────────────────────────────
    errorContainer: {
        flex: 1,
        backgroundColor: colors.obsidian[900],
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    errorTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        color: colors.text.primary,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    errorMessage: {
        fontSize: typography.fontSize.base,
        color: colors.text.muted,
        textAlign: 'center',
        marginBottom: spacing.xl,
        lineHeight: 22,
    },
    errorActions: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: 14,
        backgroundColor: colors.gold[500],
    },
    retryButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    goBackButton: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    goBackButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.secondary,
    },
    notFoundTitle: {
        fontSize: typography.fontSize.lg,
        color: colors.text.muted,
        marginTop: spacing.md,
        marginBottom: spacing.md,
    },
    backLink: {
        paddingVertical: spacing.sm,
    },
    backLinkText: {
        fontSize: typography.fontSize.base,
        color: colors.gold[500],
    },

    // ── Cover ────────────────────────────────────────────
    coverArea: {
        height: COVER_HEIGHT,
        position: 'relative',
        overflow: 'hidden',
    },
    coverImageWrap: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    coverPattern: {
        ...StyleSheet.absoluteFillObject,
    },
    coverGradientOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
    },
    coverFade: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: COVER_HEIGHT * 0.75,
        zIndex: 2,
    },

    // ── Profile Content ──────────────────────────────────
    profileContent: {
        paddingHorizontal: spacing.xl,
        marginTop: -(AVATAR_RING_SIZE / 2),
    },

    // ── Avatar ───────────────────────────────────────────
    avatarSection: {
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatarRing: {
        width: AVATAR_RING_SIZE,
        height: AVATAR_RING_SIZE,
        borderRadius: AVATAR_RING_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowColor: colors.gold[500],
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 16,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    avatarInner: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        borderWidth: 3,
        borderColor: colors.obsidian[900],
        overflow: 'hidden',
    },
    avatarGlow: {
        position: 'absolute',
        top: -8,
        left: -8,
        right: -8,
        bottom: -8,
        borderRadius: (AVATAR_RING_SIZE + 16) / 2,
        backgroundColor: 'transparent',
        ...Platform.select({
            ios: {
                shadowColor: colors.gold[500],
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
            },
        }),
    },

    // ── User Info ────────────────────────────────────────
    userInfo: {
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    displayName: {
        fontSize: 26,
        fontWeight: '700',
        color: colors.text.primary,
        letterSpacing: -0.5,
        fontFamily: 'Inter-Bold',
    },
    username: {
        fontSize: typography.fontSize.base,
        color: colors.text.muted,
        marginTop: spacing.xs,
    },
    bio: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
        marginTop: spacing.md,
        lineHeight: 22,
    },
    website: {
        fontSize: typography.fontSize.sm,
        color: colors.gold[500],
        marginTop: spacing.sm,
    },

    // ── Mutual friends ───────────────────────────────────
    mutualRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
        alignSelf: 'center',
    },
    mutualAvatars: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    mutualAvatarWrap: {
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.obsidian[900],
        overflow: 'hidden',
    },
    mutualText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },

    // ── Stats ────────────────────────────────────────────
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
        paddingVertical: spacing.lg + 2,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        overflow: 'hidden',
    },
    stat: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.xs,
    },
    statValue: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        color: colors.gold[400],
        fontFamily: 'Inter-Bold',
        letterSpacing: -0.5,
    },
    statLabel: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        marginTop: 4,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    statDivider: {
        width: 1,
        height: 36,
        backgroundColor: colors.border.subtle,
    },

    // ── Action Row ───────────────────────────────────────
    actionRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.xl,
    },
    followCol: {
        flex: 1,
    },
    followButtonWrap: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    followButton: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    followButtonActive: {
        borderWidth: 1,
        borderColor: colors.border.strong,
    },
    followingInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
    },
    followGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
    },
    followButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    followButtonActiveText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.secondary,
    },
    shareBtn: {
        width: 48,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },

    // ── Segmented Tabs ───────────────────────────────────
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        padding: spacing.xs,
        marginBottom: spacing.lg,
        position: 'relative',
        borderWidth: 1,
        borderColor: colors.border.subtle,
        overflow: 'hidden',
    },
    tabIndicator: {
        position: 'absolute',
        top: spacing.xs,
        left: spacing.xs,
        bottom: spacing.xs,
        borderRadius: 10,
        overflow: 'hidden',
    },
    tabIndicatorInner: {
        flex: 1,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.gold[500] + '25',
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        gap: spacing.xs,
        zIndex: 1,
    },
    tabText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        fontWeight: '500',
    },
    tabTextActive: {
        color: colors.gold[500],
        fontWeight: '600',
    },

    // ── Posts Grid ────────────────────────────────────────
    postsRow: {
        gap: POST_GAP,
    },
    postItem: {
        width: POST_SIZE,
        height: POST_SIZE,
        overflow: 'hidden',
        backgroundColor: colors.obsidian[700],
    },
    postImage: {
        width: '100%',
        height: '100%',
    },
    textPostBg: {
        padding: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textPostContent: {
        fontSize: typography.fontSize.xs,
        color: colors.text.primary,
        textAlign: 'center',
        lineHeight: 16,
    },
    videoIndicator: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
        backgroundColor: colors.surface.overlayMedium,
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    postOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 32,
        justifyContent: 'flex-end',
        paddingHorizontal: spacing.sm,
        paddingBottom: spacing.xs,
    },
    postMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    postMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    postMetaText: {
        fontSize: 9,
        color: colors.text.primary,
        fontWeight: '600',
    },
    emptyPosts: {
        alignItems: 'center',
        paddingVertical: spacing['2xl'],
    },
    emptyText: {
        fontSize: typography.fontSize.base,
        color: colors.text.muted,
        marginTop: spacing.md,
    },
    // ── Additional Styles ───────────────────────────────────
    verifiedIcon: {
        marginStart: 6,
    },
    followIconMargin: {
        marginRight: 6,
    },
    listContent: {
        paddingBottom: 100,
    },
    skeletonWrap: {
        paddingTop: spacing.md,
    },
});
