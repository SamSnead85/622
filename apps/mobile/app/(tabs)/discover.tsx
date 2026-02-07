import { useState, useRef, useCallback, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
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
import { colors, typography, spacing, Avatar, Card } from '@zerog/ui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - spacing.xl * 2 - spacing.md) / 2;

// Mock trending data
const TRENDING_TOPICS = [
    { id: '1', name: 'Photography', posts: '234K', emoji: '📸' },
    { id: '2', name: 'Fitness', posts: '189K', emoji: '💪' },
    { id: '3', name: 'Cooking', posts: '156K', emoji: '🍳' },
    { id: '4', name: 'Travel', posts: '312K', emoji: '✈️' },
    { id: '5', name: 'Gaming', posts: '421K', emoji: '🎮' },
    { id: '6', name: 'Music', posts: '267K', emoji: '🎵' },
];

const SUGGESTED_USERS = [
    {
        id: 'u1',
        username: 'creative_studio',
        displayName: 'Creative Studio',
        avatarUrl: 'https://i.pravatar.cc/150?img=10',
        followers: '1.2M',
        bio: 'Design inspiration daily',
        isVerified: true,
    },
    {
        id: 'u2',
        username: 'nature_lover',
        displayName: 'Nature Photography',
        avatarUrl: 'https://i.pravatar.cc/150?img=11',
        followers: '890K',
        bio: 'Wildlife & Landscapes',
        isVerified: true,
    },
    {
        id: 'u3',
        username: 'fitness_pro',
        displayName: 'Fitness Pro',
        avatarUrl: 'https://i.pravatar.cc/150?img=12',
        followers: '2.1M',
        bio: 'Transform your life',
        isVerified: true,
    },
];

const TRENDING_POSTS = [
    {
        id: 'p1',
        thumbnail: 'https://picsum.photos/400/600?random=10',
        views: '2.4M',
        user: { username: 'viral_moments', avatarUrl: 'https://i.pravatar.cc/150?img=20' },
    },
    {
        id: 'p2',
        thumbnail: 'https://picsum.photos/400/600?random=11',
        views: '1.8M',
        user: { username: 'funny_clips', avatarUrl: 'https://i.pravatar.cc/150?img=21' },
    },
    {
        id: 'p3',
        thumbnail: 'https://picsum.photos/400/600?random=12',
        views: '3.2M',
        user: { username: 'amazing_talent', avatarUrl: 'https://i.pravatar.cc/150?img=22' },
    },
    {
        id: 'p4',
        thumbnail: 'https://picsum.photos/400/600?random=13',
        views: '1.5M',
        user: { username: 'daily_inspo', avatarUrl: 'https://i.pravatar.cc/150?img=23' },
    },
    {
        id: 'p5',
        thumbnail: 'https://picsum.photos/400/600?random=14',
        views: '980K',
        user: { username: 'tech_demos', avatarUrl: 'https://i.pravatar.cc/150?img=24' },
    },
    {
        id: 'p6',
        thumbnail: 'https://picsum.photos/400/600?random=15',
        views: '2.1M',
        user: { username: 'art_daily', avatarUrl: 'https://i.pravatar.cc/150?img=25' },
    },
];

// Animated search bar
const SearchBar = memo(({ value, onChange }: { value: string; onChange: (text: string) => void }) => {
    const [focused, setFocused] = useState(false);
    const widthAnim = useRef(new Animated.Value(1)).current;
    const borderAnim = useRef(new Animated.Value(0)).current;

    const handleFocus = () => {
        setFocused(true);
        Animated.parallel([
            Animated.spring(widthAnim, {
                toValue: 1.02,
                tension: 300,
                friction: 20,
                useNativeDriver: true,
            }),
            Animated.timing(borderAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: false,
            }),
        ]).start();
    };

    const handleBlur = () => {
        setFocused(false);
        Animated.parallel([
            Animated.spring(widthAnim, {
                toValue: 1,
                tension: 300,
                friction: 20,
                useNativeDriver: true,
            }),
            Animated.timing(borderAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
            }),
        ]).start();
    };

    const borderColor = borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(255, 255, 255, 0.08)', colors.gold[500]],
    });

    return (
        <Animated.View
            style={[
                styles.searchContainer,
                { transform: [{ scale: widthAnim }], borderColor },
            ]}
        >
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
                style={styles.searchInput}
                placeholder="Search creators, communities, topics..."
                placeholderTextColor={colors.text.muted}
                value={value}
                onChangeText={onChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
            />
            {value.length > 0 && (
                <TouchableOpacity onPress={() => onChange('')}>
                    <Text style={styles.clearIcon}>✕</Text>
                </TouchableOpacity>
            )}
        </Animated.View>
    );
});

// Topic chip component
const TopicChip = memo(({ topic, index }: { topic: typeof TRENDING_TOPICS[0]; index: number }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;

    useCallback(() => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 100,
            friction: 8,
            delay: index * 50,
            useNativeDriver: true,
        }).start();
    }, [])();

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={styles.topicChip}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                activeOpacity={0.8}
            >
                <Text style={styles.topicEmoji}>{topic.emoji}</Text>
                <View style={styles.topicText}>
                    <Text style={styles.topicName}>{topic.name}</Text>
                    <Text style={styles.topicPosts}>{topic.posts} posts</Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});

// Suggested user card
const SuggestedUserCard = memo(({ user }: { user: typeof SUGGESTED_USERS[0] }) => {
    const [following, setFollowing] = useState(false);

    return (
        <View style={styles.userCard}>
            <LinearGradient
                colors={['rgba(212, 175, 55, 0.1)', 'rgba(212, 175, 55, 0.02)']}
                style={styles.userCardGradient}
            />
            <View style={styles.userCardBorder} />

            <View style={styles.userCardContent}>
                <View style={styles.userAvatarContainer}>
                    <LinearGradient
                        colors={[colors.gold[400], colors.gold[600]]}
                        style={styles.userAvatarBorder}
                    >
                        <View style={styles.userAvatarInner}>
                            <Avatar source={user.avatarUrl} name={user.displayName} size="xl" />
                        </View>
                    </LinearGradient>
                </View>

                <Text style={styles.userDisplayName} numberOfLines={1}>
                    {user.displayName}
                    {user.isVerified && <Text style={styles.verifiedBadge}> ✓</Text>}
                </Text>
                <Text style={styles.userUsername}>@{user.username}</Text>
                <Text style={styles.userFollowers}>{user.followers} followers</Text>

                <TouchableOpacity
                    style={[
                        styles.followButton,
                        following && styles.followingButton,
                    ]}
                    onPress={() => {
                        setFollowing(!following);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }}
                    activeOpacity={0.8}
                >
                    <Text style={[
                        styles.followButtonText,
                        following && styles.followingButtonText,
                    ]}>
                        {following ? 'Following' : 'Follow'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
});

// Trending post grid item
const TrendingPost = memo(({ post }: { post: typeof TRENDING_POSTS[0] }) => {
    return (
        <TouchableOpacity style={styles.trendingPost} activeOpacity={0.9}>
            <Image
                source={{ uri: post.thumbnail }}
                style={styles.trendingThumbnail}
            />
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)']}
                style={styles.trendingGradient}
            />
            <View style={styles.trendingOverlay}>
                <View style={styles.trendingViews}>
                    <Text style={styles.viewsIcon}>▶</Text>
                    <Text style={styles.viewsCount}>{post.views}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
});

export default function DiscoverScreen() {
    const insets = useSafeAreaInsets();
    const [searchQuery, setSearchQuery] = useState('');

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800]]}
                style={StyleSheet.absoluteFill}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 100 },
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Discover</Text>
                    <Text style={styles.headerSubtitle}>Find your next obsession</Text>
                </View>

                {/* Search */}
                <SearchBar value={searchQuery} onChange={setSearchQuery} />

                {/* Trending Topics */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Trending Topics</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>See all</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.topicsContainer}
                    >
                        {TRENDING_TOPICS.map((topic, index) => (
                            <TopicChip key={topic.id} topic={topic} index={index} />
                        ))}
                    </ScrollView>
                </View>

                {/* Suggested Creators */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Suggested Creators</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>See all</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.usersContainer}
                    >
                        {SUGGESTED_USERS.map((user) => (
                            <SuggestedUserCard key={user.id} user={user} />
                        ))}
                    </ScrollView>
                </View>

                {/* Trending Now */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Trending Now</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>See all</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.trendingGrid}>
                        {TRENDING_POSTS.map((post) => (
                            <TrendingPost key={post.id} post={post} />
                        ))}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.obsidian[900],
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.xl,
    },
    header: {
        marginBottom: spacing.xl,
    },
    headerTitle: {
        fontSize: 34,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
        letterSpacing: -1,
    },
    headerSubtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        fontFamily: typography.fontFamily.sans,
        marginTop: spacing.xs,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 16,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderWidth: 1,
        marginBottom: spacing['2xl'],
    },
    searchIcon: {
        fontSize: 18,
        marginRight: spacing.md,
    },
    searchInput: {
        flex: 1,
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
    },
    clearIcon: {
        fontSize: 14,
        color: colors.text.muted,
        padding: spacing.xs,
    },
    section: {
        marginBottom: spacing['2xl'],
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
        letterSpacing: -0.5,
    },
    seeAllText: {
        fontSize: typography.fontSize.sm,
        color: colors.gold[500],
        fontFamily: typography.fontFamily.sans,
        fontWeight: '600',
    },
    topicsContainer: {
        paddingRight: spacing.xl,
        gap: spacing.md,
    },
    topicChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 12,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    topicEmoji: {
        fontSize: 24,
        marginRight: spacing.md,
    },
    topicText: {},
    topicName: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
    },
    topicPosts: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        fontFamily: typography.fontFamily.sans,
        marginTop: 2,
    },
    usersContainer: {
        paddingRight: spacing.xl,
        gap: spacing.md,
    },
    userCard: {
        width: 160,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
    },
    userCardGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    userCardBorder: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    userCardContent: {
        padding: spacing.lg,
        alignItems: 'center',
    },
    userAvatarContainer: {
        marginBottom: spacing.md,
    },
    userAvatarBorder: {
        padding: 3,
        borderRadius: 36,
    },
    userAvatarInner: {
        borderRadius: 32,
        overflow: 'hidden',
    },
    userDisplayName: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
        textAlign: 'center',
    },
    verifiedBadge: {
        color: colors.azure[400],
    },
    userUsername: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        fontFamily: typography.fontFamily.sans,
        marginTop: 2,
    },
    userFollowers: {
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
        fontFamily: typography.fontFamily.sans,
        marginTop: spacing.sm,
    },
    followButton: {
        backgroundColor: colors.gold[500],
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        marginTop: spacing.md,
    },
    followingButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.text.muted,
    },
    followButtonText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.obsidian[900],
        fontFamily: typography.fontFamily.sans,
    },
    followingButtonText: {
        color: colors.text.secondary,
    },
    trendingGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    trendingPost: {
        width: CARD_WIDTH,
        height: CARD_WIDTH * 1.4,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: colors.obsidian[700],
    },
    trendingThumbnail: {
        ...StyleSheet.absoluteFillObject,
        resizeMode: 'cover',
    },
    trendingGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
    },
    trendingOverlay: {
        position: 'absolute',
        bottom: spacing.md,
        left: spacing.md,
    },
    trendingViews: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 8,
    },
    viewsIcon: {
        fontSize: 10,
        color: colors.text.primary,
        marginRight: 4,
    },
    viewsCount: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
    },
});
