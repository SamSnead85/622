import { useState, useRef, useEffect, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Animated,
    Easing,
    FlatList,
    Dimensions,
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, Avatar } from '@zerog/ui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const POST_SIZE = (SCREEN_WIDTH - spacing.xl * 2 - spacing.xs * 2) / 3;

// Mock user data
const USER = {
    id: 'me',
    username: 'creative_mind',
    displayName: 'Alex Johnson',
    avatarUrl: 'https://i.pravatar.cc/300?img=68',
    coverUrl: 'https://picsum.photos/800/400?random=999',
    bio: 'Digital creator & storyteller ✨\nSharing moments that matter\n📍 San Francisco',
    followersCount: 24300,
    followingCount: 892,
    postsCount: 156,
    isVerified: true,
    website: 'creativemind.co',
};

const USER_POSTS = Array.from({ length: 18 }, (_, i) => ({
    id: `post-${i}`,
    thumbnail: `https://picsum.photos/400/400?random=${i + 300}`,
    type: i % 4 === 0 ? 'video' : 'image',
    views: Math.floor(Math.random() * 100000) + 10000,
    likes: Math.floor(Math.random() * 5000) + 500,
}));

const formatCount = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
};

// Animated stat component
const AnimatedStat = memo(({ value, label, delay }: { value: number; label: string; delay: number }) => {
    const animValue = useRef(new Animated.Value(0)).current;
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const animation = Animated.timing(animValue, {
            toValue: value,
            duration: 1200,
            delay,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        });

        animValue.addListener(({ value: v }) => {
            setDisplayValue(Math.floor(v));
        });

        animation.start();

        return () => animValue.removeAllListeners();
    }, [value]);

    return (
        <TouchableOpacity style={styles.stat} activeOpacity={0.7}>
            <Text style={styles.statValue}>{formatCount(displayValue)}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </TouchableOpacity>
    );
});

// Post grid item
const PostGridItem = memo(({ post, index }: { post: typeof USER_POSTS[0]; index: number }) => {
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 100,
                friction: 8,
                delay: index * 30,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 300,
                delay: index * 30,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={[
                styles.postItem,
                { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
            ]}
        >
            <TouchableOpacity activeOpacity={0.9}>
                <Image source={{ uri: post.thumbnail }} style={styles.postImage} />
                {post.type === 'video' && (
                    <View style={styles.videoIndicator}>
                        <Text style={styles.videoIcon}>▶</Text>
                        <Text style={styles.viewCount}>{formatCount(post.views)}</Text>
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
});

export default function ProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<'posts' | 'liked' | 'saved'>('posts');

    const scrollY = useRef(new Animated.Value(0)).current;
    const headerScale = useRef(new Animated.Value(1)).current;

    // Parallax effect for cover
    const coverTranslateY = scrollY.interpolate({
        inputRange: [-100, 0, 100],
        outputRange: [50, 0, -30],
        extrapolate: 'clamp',
    });

    const coverScale = scrollY.interpolate({
        inputRange: [-100, 0],
        outputRange: [1.3, 1],
        extrapolate: 'clamp',
    });

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800]]}
                style={StyleSheet.absoluteFill}
            />

            {/* Header buttons */}
            <View style={[styles.headerButtons, { paddingTop: insets.top + spacing.sm }]}>
                <TouchableOpacity style={styles.headerButton}>
                    <Text style={styles.headerIcon}>☰</Text>
                </TouchableOpacity>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.headerButton}>
                        <Text style={styles.headerIcon}>🔔</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerButton}>
                        <Text style={styles.headerIcon}>⚙️</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <Animated.ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
            >
                {/* Cover image with parallax */}
                <Animated.View
                    style={[
                        styles.coverContainer,
                        {
                            transform: [
                                { translateY: coverTranslateY },
                                { scale: coverScale },
                            ],
                        },
                    ]}
                >
                    <Image source={{ uri: USER.coverUrl }} style={styles.coverImage} />
                    <LinearGradient
                        colors={['transparent', colors.obsidian[900]]}
                        style={styles.coverGradient}
                    />
                </Animated.View>

                {/* Profile content */}
                <View style={styles.profileContent}>
                    {/* Avatar */}
                    <View style={styles.avatarSection}>
                        <View style={styles.avatarContainer}>
                            <LinearGradient
                                colors={[colors.gold[400], colors.gold[600]]}
                                style={styles.avatarBorder}
                            >
                                <View style={styles.avatarInner}>
                                    <Image source={{ uri: USER.avatarUrl }} style={styles.avatarImage} />
                                </View>
                            </LinearGradient>
                        </View>
                    </View>

                    {/* User info */}
                    <View style={styles.userInfo}>
                        <View style={styles.nameRow}>
                            <Text style={styles.displayName}>{USER.displayName}</Text>
                            {USER.isVerified && (
                                <View style={styles.verifiedBadge}>
                                    <Text style={styles.verifiedIcon}>✓</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.username}>@{USER.username}</Text>
                        <Text style={styles.bio}>{USER.bio}</Text>

                        {USER.website && (
                            <TouchableOpacity style={styles.websiteLink}>
                                <Text style={styles.websiteIcon}>🔗</Text>
                                <Text style={styles.websiteText}>{USER.website}</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Stats */}
                    <View style={styles.statsContainer}>
                        <AnimatedStat value={USER.postsCount} label="Posts" delay={0} />
                        <View style={styles.statDivider} />
                        <AnimatedStat value={USER.followersCount} label="Followers" delay={100} />
                        <View style={styles.statDivider} />
                        <AnimatedStat value={USER.followingCount} label="Following" delay={200} />
                    </View>

                    {/* Action buttons */}
                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.editButton} activeOpacity={0.8}>
                            <Text style={styles.editButtonText}>Edit Profile</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.shareButton} activeOpacity={0.8}>
                            <Text style={styles.shareIcon}>↗</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Content tabs */}
                    <View style={styles.tabsContainer}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
                            onPress={() => {
                                setActiveTab('posts');
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                        >
                            <Text style={[styles.tabIcon, activeTab === 'posts' && styles.tabIconActive]}>
                                ⊞
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'liked' && styles.tabActive]}
                            onPress={() => {
                                setActiveTab('liked');
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                        >
                            <Text style={[styles.tabIcon, activeTab === 'liked' && styles.tabIconActive]}>
                                ♡
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'saved' && styles.tabActive]}
                            onPress={() => {
                                setActiveTab('saved');
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                        >
                            <Text style={[styles.tabIcon, activeTab === 'saved' && styles.tabIconActive]}>
                                ⚑
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Posts grid */}
                    <View style={styles.postsGrid}>
                        {USER_POSTS.map((post, index) => (
                            <PostGridItem key={post.id} post={post} index={index} />
                        ))}
                    </View>
                </View>
            </Animated.ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.obsidian[900],
    },
    headerButtons: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
    },
    headerRight: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerIcon: {
        fontSize: 18,
    },
    scrollView: {
        flex: 1,
    },
    coverContainer: {
        height: 200,
        position: 'relative',
    },
    coverImage: {
        ...StyleSheet.absoluteFillObject,
        resizeMode: 'cover',
    },
    coverGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 150,
    },
    profileContent: {
        marginTop: -60,
        paddingHorizontal: spacing.xl,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    avatarContainer: {},
    avatarBorder: {
        padding: 4,
        borderRadius: 56,
    },
    avatarInner: {
        borderRadius: 52,
        borderWidth: 4,
        borderColor: colors.obsidian[900],
        overflow: 'hidden',
    },
    avatarImage: {
        width: 96,
        height: 96,
    },
    userInfo: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    displayName: {
        fontSize: 26,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
        letterSpacing: -0.5,
    },
    verifiedBadge: {
        marginLeft: spacing.sm,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: colors.azure[500],
        alignItems: 'center',
        justifyContent: 'center',
    },
    verifiedIcon: {
        fontSize: 12,
        color: colors.text.primary,
        fontWeight: '700',
    },
    username: {
        fontSize: typography.fontSize.base,
        color: colors.text.muted,
        fontFamily: typography.fontFamily.sans,
        marginTop: spacing.xs,
    },
    bio: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        fontFamily: typography.fontFamily.sans,
        textAlign: 'center',
        marginTop: spacing.md,
        lineHeight: 22,
    },
    websiteLink: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.md,
    },
    websiteIcon: {
        fontSize: 14,
        marginRight: spacing.xs,
    },
    websiteText: {
        fontSize: typography.fontSize.base,
        color: colors.gold[500],
        fontFamily: typography.fontFamily.sans,
        fontWeight: '500',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        paddingVertical: spacing.lg,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    stat: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
    },
    statLabel: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        fontFamily: typography.fontFamily.sans,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 32,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.xl,
    },
    editButton: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        paddingVertical: spacing.md,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    editButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
    },
    shareButton: {
        width: 48,
        height: 48,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    shareIcon: {
        fontSize: 20,
        color: colors.text.primary,
    },
    tabsContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.06)',
        marginBottom: spacing.md,
    },
    tab: {
        flex: 1,
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    tabActive: {
        borderBottomWidth: 2,
        borderBottomColor: colors.text.primary,
    },
    tabIcon: {
        fontSize: 22,
        color: colors.text.muted,
    },
    tabIconActive: {
        color: colors.text.primary,
    },
    postsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
    },
    postItem: {
        width: POST_SIZE,
        height: POST_SIZE,
        borderRadius: 4,
        overflow: 'hidden',
    },
    postImage: {
        width: '100%',
        height: '100%',
    },
    videoIndicator: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: 6,
    },
    videoIcon: {
        fontSize: 8,
        color: colors.text.primary,
        marginRight: 4,
    },
    viewCount: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
    },
});
