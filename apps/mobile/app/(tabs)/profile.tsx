import { useState, useEffect, memo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { useAuthStore, Post, mapApiPost } from '../../stores';
import { apiFetch, API } from '../../lib/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const POST_SIZE = (SCREEN_WIDTH - spacing.xl * 2 - spacing.xs * 2) / 3;

const formatCount = (num: number) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
};

const PostGridItem = memo(({ post }: { post: Post }) => {
    const router = useRouter();
    return (
        <TouchableOpacity style={styles.postItem} activeOpacity={0.9} onPress={() => router.push(`/post/${post.id}`)}>
            {post.mediaUrl ? (
                <Image source={{ uri: post.mediaUrl }} style={styles.postImage} transition={150} cachePolicy="memory-disk" recyclingKey={post.id} />
            ) : (
                <View style={[styles.postImage, styles.textPostBg]}>
                    <Text style={styles.textPostContent} numberOfLines={3}>{post.content}</Text>
                </View>
            )}
            {post.mediaType === 'VIDEO' && (
                <View style={styles.videoIndicator}>
                    <Ionicons name="play" size={10} color={colors.text.primary} />
                </View>
            )}
        </TouchableOpacity>
    );
});

type ProfileTab = 'posts' | 'likes' | 'saved';

export default function ProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const refreshUser = useAuthStore((s) => s.refreshUser);

    const [userPosts, setUserPosts] = useState<Post[]>([]);
    const [likedPosts, setLikedPosts] = useState<Post[]>([]);
    const [savedPosts, setSavedPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
    const [loadedTabs, setLoadedTabs] = useState<Set<ProfileTab>>(new Set(['posts']));

    const loadUserPosts = async () => {
        try {
            const data = await apiFetch<any>(`${API.userPosts(user!.id)}?limit=50`);
            const rawPosts = data.posts || data.data || [];
            setUserPosts((Array.isArray(rawPosts) ? rawPosts : []).map(mapApiPost));
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to load posts');
        }
        finally { setIsLoading(false); setIsRefreshing(false); }
    };

    const loadLikedPosts = async () => {
        if (!user?.id) return;
        try {
            const data = await apiFetch<any>(API.likedPosts(user.id));
            const rawPosts = data.posts || data.data || [];
            setLikedPosts((Array.isArray(rawPosts) ? rawPosts : []).map(mapApiPost));
        } catch { /* silent — endpoint may not exist yet */ }
    };

    const loadSavedPosts = async () => {
        try {
            const data = await apiFetch<any>(API.savedPosts);
            const rawPosts = data.posts || data.data || [];
            setSavedPosts((Array.isArray(rawPosts) ? rawPosts : []).map(mapApiPost));
        } catch { /* silent — endpoint may not exist yet */ }
    };

    useEffect(() => {
        if (user?.id) loadUserPosts();
    }, [user?.id]);

    // Load tab data on first visit
    useEffect(() => {
        if (loadedTabs.has(activeTab)) return;
        setLoadedTabs((prev) => new Set(prev).add(activeTab));
        if (activeTab === 'likes') loadLikedPosts();
        if (activeTab === 'saved') loadSavedPosts();
    }, [activeTab]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshUser();
        await loadUserPosts();
        if (loadedTabs.has('likes')) loadLikedPosts();
        if (loadedTabs.has('saved')) loadSavedPosts();
    };

    if (!user) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={colors.gold[500]} />
            </View>
        );
    }

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(400)}>
            {/* Cover photo area */}
            <View style={styles.coverArea}>
                {user.coverUrl ? (
                    <Image source={{ uri: user.coverUrl }} style={styles.coverImage} transition={300} cachePolicy="memory-disk" contentFit="cover" />
                ) : (
                    <LinearGradient
                        colors={[colors.obsidian[700], colors.obsidian[800]]}
                        style={styles.coverImage}
                    />
                )}
                <LinearGradient
                    colors={['transparent', colors.obsidian[900]]}
                    style={styles.coverGradient}
                />
            </View>

            <View style={styles.profileContent}>
                {/* Avatar (overlapping cover) */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatarContainer}>
                        <LinearGradient colors={[colors.gold[400], colors.gold[600]]} style={styles.avatarBorder}>
                            <View style={styles.avatarInner}>
                                {user.avatarUrl ? (
                                    <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} transition={200} cachePolicy="memory-disk" />
                                ) : (
                                    <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                                        <Text style={styles.avatarInitial}>
                                            {(user.displayName || user.username || '?')[0].toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </LinearGradient>
                    </View>
                </View>

                {/* User info */}
                <View style={styles.userInfo}>
                    <View style={styles.nameRow}>
                        <Text style={styles.displayName}>{user.displayName}</Text>
                        {user.isVerified && <Ionicons name="checkmark-circle" size={18} color={colors.gold[500]} style={{ marginLeft: 6 }} />}
                    </View>
                    <Text style={styles.username}>@{user.username}</Text>
                    {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
                </View>

                {/* Privacy badge */}
                <View style={styles.privacyBadge}>
                    <Ionicons name={user.communityOptIn ? 'globe-outline' : 'lock-closed'} size={12} color={colors.gold[400]} />
                    <Text style={styles.privacyText}>
                        {user.communityOptIn ? 'Community Member' : 'Private Mode'}
                    </Text>
                </View>

                {/* Stats */}
                <View style={styles.statsContainer}>
                    <TouchableOpacity style={styles.stat}>
                        <Text style={styles.statValue}>{formatCount(user.postsCount)}</Text>
                        <Text style={styles.statLabel}>Posts</Text>
                    </TouchableOpacity>
                    <View style={styles.statDivider} />
                    <TouchableOpacity style={styles.stat}>
                        <Text style={styles.statValue}>{formatCount(user.followersCount)}</Text>
                        <Text style={styles.statLabel}>Followers</Text>
                    </TouchableOpacity>
                    <View style={styles.statDivider} />
                    <TouchableOpacity style={styles.stat}>
                        <Text style={styles.statValue}>{formatCount(user.followingCount)}</Text>
                        <Text style={styles.statLabel}>Following</Text>
                    </TouchableOpacity>
                </View>

                {/* Edit Profile button */}
                <TouchableOpacity style={styles.editButton} activeOpacity={0.8} onPress={() => router.push('/settings')}>
                    <Ionicons name="create-outline" size={16} color={colors.text.primary} />
                    <Text style={styles.editButtonText}>Edit Profile</Text>
                </TouchableOpacity>

                {/* Content tabs */}
                <View style={styles.contentTabs}>
                    {(['posts', 'likes', 'saved'] as ProfileTab[]).map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.contentTab, activeTab === tab && styles.contentTabActive]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Ionicons
                                name={tab === 'posts' ? 'grid-outline' : tab === 'likes' ? 'heart-outline' : 'bookmark-outline'}
                                size={20}
                                color={activeTab === tab ? colors.gold[500] : colors.text.muted}
                            />
                            <Text style={[styles.contentTabText, activeTab === tab && styles.contentTabTextActive]}>
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </Animated.View>
    );

    const postsData = activeTab === 'posts' ? userPosts : activeTab === 'likes' ? likedPosts : savedPosts;

    const renderPost = useCallback(({ item }: { item: Post }) => <PostGridItem post={item} />, []);

    const renderEmpty = () => {
        if (isLoading) {
            return <View style={styles.centered}><ActivityIndicator size="small" color={colors.gold[500]} /></View>;
        }
        return (
            <View style={styles.emptyPosts}>
                <Ionicons
                    name={activeTab === 'posts' ? 'camera-outline' : activeTab === 'likes' ? 'heart-outline' : 'bookmark-outline'}
                    size={40}
                    color={colors.text.muted}
                />
                <Text style={styles.emptyText}>
                    {activeTab === 'posts' ? 'No posts yet' : activeTab === 'likes' ? 'No liked posts yet' : 'No saved posts yet'}
                </Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            {/* Header buttons (floating) */}
            <View style={[styles.headerButtons, { paddingTop: insets.top + spacing.sm }]}>
                <View />
                <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/settings')}>
                    <Ionicons name="settings-outline" size={22} color={colors.text.primary} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={postsData}
                renderItem={renderPost}
                keyExtractor={(item) => item.id}
                numColumns={3}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                columnWrapperStyle={styles.postsRow}
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                showsVerticalScrollIndicator={false}
                onRefresh={handleRefresh}
                refreshing={isRefreshing}
                removeClippedSubviews={Platform.OS === 'android'}
                maxToRenderPerBatch={12}
                windowSize={9}
                initialNumToRender={9}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing['2xl'] },

    // Header buttons
    headerButtons: {
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
        flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg,
    },
    headerButton: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: colors.surface.overlayLight, alignItems: 'center', justifyContent: 'center',
    },

    // Cover
    coverArea: { height: 160, position: 'relative' },
    coverImage: { width: '100%', height: '100%' },
    coverGradient: { ...StyleSheet.absoluteFillObject },

    profileContent: { paddingHorizontal: spacing.xl, marginTop: -40 },

    // Avatar
    avatarSection: { alignItems: 'center', marginBottom: spacing.md },
    avatarContainer: {},
    avatarBorder: { padding: 4, borderRadius: 56 },
    avatarInner: { borderRadius: 52, borderWidth: 4, borderColor: colors.obsidian[900], overflow: 'hidden' },
    avatarImage: { width: 96, height: 96 },
    avatarPlaceholder: { backgroundColor: colors.obsidian[500], alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { fontSize: 36, fontWeight: '700', color: colors.text.primary },

    // User info
    userInfo: { alignItems: 'center', marginBottom: spacing.md },
    nameRow: { flexDirection: 'row', alignItems: 'center' },
    displayName: { fontSize: 26, fontWeight: '700', color: colors.text.primary, letterSpacing: -0.5, fontFamily: 'Inter-Bold' },
    username: { fontSize: typography.fontSize.base, color: colors.text.muted, marginTop: spacing.xs },
    bio: { fontSize: typography.fontSize.base, color: colors.text.secondary, textAlign: 'center', marginTop: spacing.md, lineHeight: 22 },

    // Privacy badge
    privacyBadge: {
        flexDirection: 'row', alignItems: 'center', alignSelf: 'center',
        backgroundColor: colors.surface.goldSubtle, paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs, borderRadius: 20, marginBottom: spacing.lg, gap: spacing.xs,
    },
    privacyText: { fontSize: typography.fontSize.xs, color: colors.gold[400], fontWeight: '600' },

    // Stats
    statsContainer: {
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        backgroundColor: colors.surface.glass, borderRadius: 16,
        paddingVertical: spacing.lg, marginBottom: spacing.lg,
        borderWidth: 1, borderColor: colors.border.subtle,
    },
    stat: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.text.primary },
    statLabel: { fontSize: typography.fontSize.sm, color: colors.text.muted, marginTop: 2 },
    statDivider: { width: 1, height: 32, backgroundColor: colors.border.subtle },

    // Edit button
    editButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: colors.surface.glassHover, paddingVertical: spacing.md,
        borderRadius: 12, marginBottom: spacing.xl,
        borderWidth: 1, borderColor: colors.border.subtle, gap: spacing.sm,
    },
    editButtonText: { fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.primary },

    // Content tabs
    contentTabs: {
        flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
        marginBottom: spacing.md,
    },
    contentTab: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: spacing.md, gap: spacing.xs,
    },
    contentTabActive: { borderBottomWidth: 2, borderBottomColor: colors.gold[500] },
    contentTabText: { fontSize: typography.fontSize.sm, color: colors.text.muted, fontWeight: '500' },
    contentTabTextActive: { color: colors.gold[500] },

    // Posts grid
    postsRow: { paddingHorizontal: spacing.xl, gap: spacing.xs },
    postItem: { width: POST_SIZE, height: POST_SIZE, borderRadius: 8, overflow: 'hidden', marginBottom: spacing.xs },
    postImage: { width: '100%', height: '100%' },
    textPostBg: { backgroundColor: colors.obsidian[600], padding: spacing.sm, alignItems: 'center', justifyContent: 'center' },
    textPostContent: { fontSize: typography.fontSize.xs, color: colors.text.primary, textAlign: 'center' },
    videoIndicator: {
        position: 'absolute', top: spacing.sm, right: spacing.sm,
        backgroundColor: colors.surface.overlayMedium, width: 24, height: 24, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
    },

    // Empty
    emptyPosts: { alignItems: 'center', paddingVertical: spacing['3xl'] },
    emptyText: { fontSize: typography.fontSize.base, color: colors.text.muted, marginTop: spacing.md },
});
