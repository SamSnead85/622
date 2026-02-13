import { useState, useEffect, memo, useCallback, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    FlatList,
    Platform,
    RefreshControl,
    Share,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
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
    withRepeat,
    withSpring,
    Easing,
    interpolate,
    useAnimatedScrollHandler,
    Extrapolation,
} from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { Avatar, LoadingView, EmptyState, SkeletonGrid } from '../../components';
import { useAuthStore, Post, mapApiPost } from '../../stores';
import { apiFetch, API } from '../../lib/api';
import { showError } from '../../stores/toastStore';
import { IMAGE_PLACEHOLDER } from '../../lib/imagePlaceholder';
import { formatCount } from '../../lib/utils';
import { getProfileCompletion, ProfileStep } from '../../lib/profileCompletion';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = 220;
const AVATAR_SIZE = 108;
const AVATAR_RING_SIZE = AVATAR_SIZE + 8;
const POST_GAP = 2;
const POST_SIZE = (SCREEN_WIDTH - POST_GAP * 2) / 3;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Post>);

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
const StatItem = memo(({
    value,
    label,
    onPress,
}: {
    value: number;
    label: string;
    onPress?: () => void;
}) => (
    <TouchableOpacity
        style={styles.stat}
        activeOpacity={0.7}
        onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress?.();
        }}
        accessibilityRole="button"
        accessibilityLabel={`${formatCount(value)} ${label}`}
    >
        <AnimatedStatValue value={value} />
        <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
));

// ─── Tab Types ───────────────────────────────────────────
type ProfileTab = 'posts' | 'likes' | 'saved';

const TABS: { key: ProfileTab; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { key: 'posts', icon: 'grid-outline', iconActive: 'grid', label: 'Posts' },
    { key: 'likes', icon: 'heart-outline', iconActive: 'heart', label: 'Likes' },
    { key: 'saved', icon: 'bookmark-outline', iconActive: 'bookmark', label: 'Saved' },
];

// ─── Error State Component ──────────────────────────────
const ProfileError = memo(({ message, onRetry }: { message: string; onRetry: () => void }) => (
    <View style={styles.errorContainer}>
        <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />
        <Ionicons name="cloud-offline-outline" size={56} color={colors.text.muted} />
        <Text style={styles.errorTitle}>Unable to load profile</Text>
        <Text style={styles.errorMessage}>{message}</Text>
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
    </View>
));

// ─── Main Screen ─────────────────────────────────────────
export default function ProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: c } = useTheme();
    const user = useAuthStore((s) => s.user);
    const refreshUser = useAuthStore((s) => s.refreshUser);

    const [userPosts, setUserPosts] = useState<Post[]>([]);
    const [likedPosts, setLikedPosts] = useState<Post[]>([]);
    const [savedPosts, setSavedPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
    const [loadedTabs, setLoadedTabs] = useState<Set<ProfileTab>>(new Set(['posts']));
    const [loadError, setLoadError] = useState<string | null>(null);
    const flatListRef = useRef<FlatList>(null);

    // Animated tab indicator
    const tabIndicatorX = useSharedValue(0);
    const TAB_WIDTH = (SCREEN_WIDTH - spacing.xl * 2) / 3;

    const indicatorStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: tabIndicatorX.value }],
        width: TAB_WIDTH,
    }));

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

    // Verified name shimmer
    const shimmerX = useSharedValue(-1);
    useEffect(() => {
        if (user?.isVerified) {
            shimmerX.value = withRepeat(
                withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
                -1,
                true
            );
        }
    }, [user?.isVerified]);
    const shimmerStyle = useAnimatedStyle(() => ({
        opacity: 0.15 + 0.15 * shimmerX.value,
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

    // ── Share Profile ────────────────────────────────────
    const handleShareProfile = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            const displayName = user?.displayName || user?.username || 'User';
            const username = user?.username || '';
            await Share.share({
                message: `Check out ${displayName}'s profile on Caravan!\nhttps://caravan.social/@${username}`,
                title: `${displayName} on Caravan`,
            });
        } catch {
            // User cancelled share — no action needed
        }
    }, [user?.displayName, user?.username]);

    // ── Data Loading ─────────────────────────────────────
    const loadUserPosts = useCallback(async () => {
        if (!user?.id) { setIsLoading(false); return; }
        setLoadError(null);
        try {
            const data = await apiFetch<any>(`${API.userPosts(user.id)}?limit=50`);
            const rawPosts = data.posts || data.data || [];
            setUserPosts((Array.isArray(rawPosts) ? rawPosts : []).map(mapApiPost));
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Failed to load posts';
            setLoadError(msg);
            showError(msg);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [user?.id]);

    const loadLikedPosts = useCallback(async () => {
        if (!user?.id) return;
        try {
            const data = await apiFetch<any>(API.likedPosts(user.id));
            const rawPosts = data.posts || data.data || [];
            setLikedPosts((Array.isArray(rawPosts) ? rawPosts : []).map(mapApiPost));
        } catch { showError("Couldn't load liked posts"); }
    }, [user?.id]);

    const loadSavedPosts = useCallback(async () => {
        try {
            const data = await apiFetch<any>(API.savedPosts);
            const rawPosts = data.posts || data.data || [];
            setSavedPosts((Array.isArray(rawPosts) ? rawPosts : []).map(mapApiPost));
        } catch { showError("Couldn't load saved posts"); }
    }, []);

    useEffect(() => {
        if (user?.id) loadUserPosts();
    }, [user?.id, loadUserPosts]);

    useEffect(() => {
        if (loadedTabs.has(activeTab)) return;
        setLoadedTabs((prev) => new Set(prev).add(activeTab));
        if (activeTab === 'likes') loadLikedPosts();
        if (activeTab === 'saved') loadSavedPosts();
    }, [activeTab, loadedTabs, loadLikedPosts, loadSavedPosts]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await refreshUser();
        await loadUserPosts();
        if (loadedTabs.has('likes')) loadLikedPosts();
        if (loadedTabs.has('saved')) loadSavedPosts();
    }, [refreshUser, loadUserPosts, loadLikedPosts, loadSavedPosts, loadedTabs]);

    const handleRetry = useCallback(() => {
        setIsLoading(true);
        setLoadError(null);
        loadUserPosts();
    }, [loadUserPosts]);

    // Refresh profile data when screen gains focus
    useFocusEffect(
        useCallback(() => {
            if (user?.id) refreshUser();
        }, [user?.id, refreshUser])
    );

    // ── Data ─────────────────────────────────────────────
    const postsData = useMemo(() => {
        if (activeTab === 'posts') return userPosts;
        if (activeTab === 'likes') return likedPosts;
        return savedPosts;
    }, [activeTab, userPosts, likedPosts, savedPosts]);

    const renderPost = useCallback(
        ({ item, index }: { item: Post; index: number }) => (
            <PostGridItem post={item} index={index} />
        ),
        [],
    );

    // ── Loading State ────────────────────────────────────
    if (!user) {
        return (
            <View style={[styles.container, { backgroundColor: c.obsidian[900] }]}>
                <LinearGradient colors={[c.obsidian[900], c.obsidian[800]]} style={StyleSheet.absoluteFill} />
                <LoadingView message="Loading profile..." />
            </View>
        );
    }

    // ── Error State ──────────────────────────────────────
    if (loadError && userPosts.length === 0 && !isLoading) {
        return <ProfileError message={loadError} onRetry={handleRetry} />;
    }

    // ── Header ───────────────────────────────────────────
    const renderHeader = () => (
        <View>
            {/* Cover Photo with Parallax */}
            <Animated.View style={styles.coverArea}>
                <Animated.View style={[styles.coverImageWrap, coverAnimStyle]}>
                    {user.coverUrl ? (
                        <Image
                            source={{ uri: user.coverUrl }}
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
                            {/* Decorative pattern overlay */}
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

                {/* Bottom fade into background — smooth multi-stop */}
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
                                    uri={user.avatarUrl}
                                    name={user.displayName || user.username || '?'}
                                    customSize={AVATAR_SIZE}
                                />
                            </View>
                        </LinearGradient>
                        {/* Gold glow shadow */}
                        <View style={styles.avatarGlow} />
                    </View>
                </Animated.View>

                {/* User Info */}
                <Animated.View
                    entering={FadeInDown.delay(180).duration(400).springify().damping(18)}
                    style={styles.userInfo}
                >
                    <View style={styles.nameRow}>
                        <View style={styles.nameShimmerWrap}>
                            <Text style={styles.displayName} accessibilityRole="header">
                                {user.displayName || user.username || 'User'}
                            </Text>
                            {user.isVerified && (
                                <Animated.View
                                    style={[
                                        StyleSheet.absoluteFill,
                                        styles.shimmerOverlay,
                                        shimmerStyle,
                                    ]}
                                    pointerEvents="none"
                                />
                            )}
                        </View>
                        {user.isVerified && (
                            <Ionicons
                                name="checkmark-circle"
                                size={20}
                                color={colors.gold[500]}
                                style={styles.verifiedIcon}
                            />
                        )}
                    </View>
                    <Text style={styles.username}>@{user.username || 'unknown'}</Text>
                </Animated.View>

                {/* Bio */}
                {user.bio ? (
                    <Animated.View
                        entering={FadeInDown.delay(240).duration(400).springify().damping(18)}
                        style={styles.bioSection}
                    >
                        <Text style={styles.bio}>{user.bio}</Text>
                        <TouchableOpacity
                            style={styles.bioEditBtn}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.push('/settings');
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityLabel="Edit bio"
                        >
                            <Ionicons name="pencil" size={12} color={colors.gold[400]} />
                        </TouchableOpacity>
                    </Animated.View>
                ) : (
                    <Animated.View
                        entering={FadeInDown.delay(240).duration(400).springify().damping(18)}
                    >
                        <TouchableOpacity
                            style={styles.addBioBtn}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.push('/settings');
                            }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="add-circle-outline" size={14} color={colors.gold[400]} />
                            <Text style={styles.addBioText}>Add a bio</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Privacy Badge */}
                <Animated.View
                    entering={FadeInDown.delay(280).duration(400).springify().damping(18)}
                    style={styles.privacyBadge}
                >
                    <Ionicons
                        name={user.communityOptIn ? 'globe-outline' : 'lock-closed'}
                        size={12}
                        color={colors.gold[400]}
                    />
                    <Text style={styles.privacyText}>
                        {user.communityOptIn ? 'Community Member' : 'Private Mode'}
                    </Text>
                </Animated.View>

                {/* Stats */}
                <Animated.View
                    entering={FadeInDown.delay(320).duration(400).springify().damping(18)}
                >
                    <LinearGradient
                        colors={[colors.surface.glassHover, colors.surface.glass]}
                        style={styles.statsContainer}
                    >
                        <StatItem value={user.postsCount ?? 0} label="Posts" />
                        <View style={styles.statDivider} />
                        <StatItem value={user.followersCount ?? 0} label="Followers" />
                        <View style={styles.statDivider} />
                        <StatItem value={user.followingCount ?? 0} label="Following" />
                    </LinearGradient>
                </Animated.View>

                {/* Action Buttons */}
                <Animated.View
                    entering={FadeInDown.delay(380).duration(400).springify().damping(18)}
                    style={styles.profileActions}
                >
                    <TouchableOpacity
                        style={styles.editButton}
                        activeOpacity={0.8}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            router.push('/settings');
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Edit profile"
                    >
                        <Ionicons name="create-outline" size={16} color={colors.gold[500]} />
                        <Text style={styles.editButtonText}>Edit Profile</Text>
                    </TouchableOpacity>

                    {(user.postsCount || 0) > 0 && (
                        <TouchableOpacity
                            style={styles.analyticsButton}
                            activeOpacity={0.8}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.push('/analytics' as any);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="View analytics"
                        >
                            <Ionicons name="analytics-outline" size={18} color={colors.gold[400]} />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.shareButton}
                        activeOpacity={0.8}
                        onPress={handleShareProfile}
                        accessibilityRole="button"
                        accessibilityLabel="Share profile"
                    >
                        <Ionicons name="share-outline" size={18} color={colors.text.secondary} />
                    </TouchableOpacity>
                </Animated.View>

                {/* Profile Completion Widget */}
                {user && (() => {
                    const completion = getProfileCompletion({
                        avatarUrl: user.avatarUrl,
                        coverUrl: user.coverUrl,
                        bio: user.bio,
                        username: user.username,
                        displayName: user.displayName,
                        interests: (user as any).interests,
                        culturalProfile: (user as any).culturalProfile,
                        postsCount: user.postsCount || 0,
                        followingCount: user.followingCount || 0,
                    });
                    if (completion.percentage >= 100) return null;
                    const nextItems = completion.nextSteps.slice(0, 3);
                    return (
                        <Animated.View
                            entering={FadeInDown.delay(420).duration(400).springify()}
                            style={[profileCompletionStyles.container, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}
                        >
                            <View style={profileCompletionStyles.header}>
                                <View style={profileCompletionStyles.progressRing}>
                                    <Text style={[profileCompletionStyles.progressText, { color: c.text.primary }]}>
                                        {completion.percentage}%
                                    </Text>
                                </View>
                                <View style={profileCompletionStyles.headerText}>
                                    <Text style={[profileCompletionStyles.title, { color: c.text.primary }]}>
                                        Complete your profile
                                    </Text>
                                    <Text style={[profileCompletionStyles.subtitle, { color: c.text.muted }]}>
                                        {completion.nextSteps.length} steps remaining
                                    </Text>
                                </View>
                            </View>
                            <View style={profileCompletionStyles.steps}>
                                {nextItems.map((step: ProfileStep) => (
                                    <TouchableOpacity
                                        key={step.id}
                                        style={[profileCompletionStyles.stepRow, { backgroundColor: c.surface.glassHover }]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            if (step.route) router.push(step.route as any);
                                        }}
                                        activeOpacity={0.7}
                                        accessibilityRole="button"
                                        accessibilityLabel={step.label}
                                    >
                                        <View style={[profileCompletionStyles.stepIcon, { backgroundColor: c.surface.goldSubtle }]}>
                                            <Ionicons name={step.icon as any} size={18} color={c.gold[500]} />
                                        </View>
                                        <View style={profileCompletionStyles.stepText}>
                                            <Text style={[profileCompletionStyles.stepLabel, { color: c.text.primary }]}>
                                                {step.label}
                                            </Text>
                                            <Text style={[profileCompletionStyles.stepDesc, { color: c.text.muted }]}>
                                                {step.description}
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={16} color={c.text.muted} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </Animated.View>
                    );
                })()}

                {/* Premium Segmented Tabs */}
                <Animated.View
                    entering={FadeInDown.delay(440).duration(400).springify().damping(18)}
                    style={styles.tabContainer}
                >
                    {/* Active indicator */}
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

                    {/* Bottom gold line */}
                    <View style={styles.tabBottomLine} />
                </Animated.View>
            </View>
        </View>
    );

    // ── Empty & Loading States ───────────────────────────
    const emptyConfig = useMemo(() => ({
        posts: {
            icon: 'camera-outline' as const,
            title: 'Your story starts here',
            message: 'Share your first photo, thought, or moment with your community.',
            actionLabel: 'Create Post',
        },
        likes: {
            icon: 'heart-outline' as const,
            title: 'No likes yet',
            message: "Explore the feed and double-tap posts you love — they'll show up here.",
            actionLabel: undefined,
        },
        saved: {
            icon: 'bookmark-outline' as const,
            title: 'Your collection is empty',
            message: 'Bookmark posts you want to revisit — recipes, inspiration, reminders.',
            actionLabel: undefined,
        },
    }), []);

    const renderEmpty = useCallback(() => {
        if (isLoading) {
            return (
                <View style={styles.skeletonWrap}>
                    <SkeletonGrid />
                </View>
            );
        }

        const cfg = emptyConfig[activeTab];

        return (
            <EmptyState
                icon={cfg.icon}
                title={cfg.title}
                message={cfg.message}
                actionLabel={cfg.actionLabel}
                onAction={cfg.actionLabel ? () => router.push('/(tabs)/create' as any) : undefined}
                compact
            />
        );
    }, [isLoading, activeTab, emptyConfig, router]);

    // ── Render ────────────────────────────────────────────
    return (
        <View style={[styles.container, { backgroundColor: c.obsidian[900] }]}>
            <LinearGradient
                colors={[c.obsidian[900], c.obsidian[800], c.obsidian[900]]}
                locations={[0, 0.5, 1]}
                style={StyleSheet.absoluteFill}
            />

            {/* Floating Header Buttons */}
            <View style={[styles.headerBar, { paddingTop: insets.top + spacing.xs }]}>
                <Text style={styles.headerTitle}>You</Text>
                <TouchableOpacity
                    style={styles.headerIconBtn}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push('/settings');
                    }}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Settings"
                >
                    <Ionicons name="settings-outline" size={22} color={colors.text.primary} />
                </TouchableOpacity>
            </View>

            <AnimatedFlatList
                ref={flatListRef}
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
    listContent: {
        paddingBottom: 100,
    },

    // ── Error State ──────────────────────────────────────
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

    // ── Floating Header ──────────────────────────────────
    headerBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.sm,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.text.primary,
        letterSpacing: -0.3,
    },
    headerIconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface.overlayLight,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border.subtle,
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
        marginBottom: spacing.sm,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    nameShimmerWrap: {
        position: 'relative',
    },
    shimmerOverlay: {
        backgroundColor: colors.gold[400],
        borderRadius: 4,
    },
    verifiedIcon: {
        marginStart: 6,
    },
    displayName: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: '700',
        color: colors.text.primary,
        letterSpacing: typography.letterSpacing.tight,
        fontFamily: 'Inter-Bold',
    },
    username: {
        fontSize: typography.fontSize.base,
        color: colors.text.muted,
        marginTop: spacing.xxs,
    },

    // ── Bio ──────────────────────────────────────────────
    bioSection: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    bio: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 22,
        flex: 1,
    },
    bioEditBtn: {
        marginLeft: spacing.sm,
        marginTop: 2,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addBioBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.sm,
        marginBottom: spacing.sm,
    },
    addBioText: {
        fontSize: typography.fontSize.sm,
        color: colors.gold[400],
        fontWeight: '500',
    },

    // ── Privacy Badge ────────────────────────────────────
    privacyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        backgroundColor: colors.surface.goldSubtle,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        borderRadius: 20,
        marginBottom: spacing.lg,
        gap: spacing.xs,
        borderWidth: 1,
        borderColor: colors.surface.goldLight,
    },
    privacyText: {
        fontSize: typography.fontSize.xs,
        color: colors.gold[400],
        fontWeight: '600',
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
        fontSize: typography.fontSize['3xl'],
        fontWeight: '800',
        color: colors.gold[400],
        fontFamily: 'Inter-Bold',
        letterSpacing: typography.letterSpacing.tight,
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

    // ── Action Buttons ───────────────────────────────────
    profileActions: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.xl,
    },
    editButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md + 2,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: colors.gold[500],
        backgroundColor: colors.surface.goldFaded,
        gap: spacing.sm,
    },
    editButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.gold[500],
    },
    analyticsButton: {
        width: 48,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface.glassHover,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.gold[500] + '30',
    },
    shareButton: {
        width: 48,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },

    // ── Premium Segmented Tabs ───────────────────────────
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
    tabBottomLine: {
        display: 'none',
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

    // ── Skeleton ─────────────────────────────────────────
    skeletonWrap: {
        paddingTop: spacing.md,
    },
});

// ── Profile Completion Widget Styles ─────────────────
const profileCompletionStyles = StyleSheet.create({
    container: {
        marginHorizontal: spacing.lg,
        marginTop: spacing.lg,
        borderRadius: 16,
        borderWidth: 1,
        padding: spacing.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    progressRing: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 3,
        borderColor: colors.gold[500],
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
    },
    headerText: {
        marginLeft: spacing.md,
        flex: 1,
    },
    title: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        fontFamily: 'Inter-SemiBold',
    },
    subtitle: {
        fontSize: typography.fontSize.xs,
        marginTop: 2,
    },
    steps: {
        gap: spacing.sm,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: 12,
    },
    stepIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepText: {
        flex: 1,
        marginLeft: spacing.md,
    },
    stepLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        fontFamily: 'Inter-SemiBold',
    },
    stepDesc: {
        fontSize: typography.fontSize.xs,
        marginTop: 1,
    },
});
