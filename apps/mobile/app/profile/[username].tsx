import { useState, useEffect, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    RefreshControl,
    Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { useAuthStore, Post, mapApiPost } from '../../stores';
import { apiFetch, API } from '../../lib/api';
import { ScreenHeader, LoadingView, Avatar } from '../../components';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const POST_SIZE = (SCREEN_WIDTH - spacing.xl * 2 - spacing.xs * 2) / 3;

const formatCount = (num: number) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
};

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

const PostGridItem = memo(({ post }: { post: Post }) => {
    const router = useRouter();
    return (
        <TouchableOpacity style={styles.postItem} activeOpacity={0.9} onPress={() => router.push(`/post/${post.id}`)}>
            {post.mediaUrl ? (
                <Image source={{ uri: post.mediaUrl }} style={styles.postImage} />
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

    const loadProfile = async () => {
        if (!username) return;
        try {
            const data = await apiFetch<any>(API.userProfile(username));
            setProfile(data);
            if (data.id) {
                const postsData = await apiFetch<any>(`${API.userPosts(data.id)}?limit=50`);
                const rawPosts = postsData.posts || postsData.data || [];
                setPosts((Array.isArray(rawPosts) ? rawPosts : []).map(mapApiPost));
            }
        } catch (e: any) {
            if (!isRefreshing) Alert.alert('Error', e.message || 'Failed to load profile');
        } finally { setIsLoading(false); setIsRefreshing(false); }
    };

    useEffect(() => { loadProfile(); }, [username]);

    const handleFollow = async () => {
        if (!profile) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsFollowLoading(true);
        const wasFollowing = profile.isFollowing;
        setProfile((p) => p ? { ...p, isFollowing: !wasFollowing, followersCount: wasFollowing ? p.followersCount - 1 : p.followersCount + 1 } : p);
        try {
            await apiFetch(API.follow(profile.id), { method: wasFollowing ? 'DELETE' : 'POST' });
        } catch {
            setProfile((p) => p ? { ...p, isFollowing: wasFollowing, followersCount: wasFollowing ? p.followersCount + 1 : p.followersCount - 1 } : p);
        } finally { setIsFollowLoading(false); }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />
                <LoadingView />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={[styles.container, styles.centered]}>
                <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />
                <Ionicons name="person-outline" size={48} color={colors.text.muted} />
                <Text style={styles.errorText}>User not found</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
                    <Text style={styles.backLinkText}>Go back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (profile.isOwnProfile) {
        router.replace('/(tabs)/profile');
        return null;
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            <ScreenHeader title={`@${profile.username}`} />

            <ScrollView
                contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); loadProfile(); }} tintColor={colors.gold[500]} />
                }
            >
                <Animated.View entering={FadeInDown.duration(400)}>
                    <View style={styles.profileContent}>
                        <View style={styles.avatarSection}>
                            <Avatar uri={profile.avatarUrl} name={profile.displayName} size="2xl" />
                        </View>

                        <View style={styles.userInfo}>
                            <View style={styles.nameRow}>
                                <Text style={styles.displayName}>{profile.displayName}</Text>
                                {profile.isVerified && <Ionicons name="checkmark-circle" size={18} color={colors.gold[500]} style={{ marginStart: 6 }} />}
                            </View>
                            <Text style={styles.username}>@{profile.username}</Text>
                            {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
                            {profile.website && <Text style={styles.website}>{profile.website}</Text>}
                        </View>

                        <View style={styles.statsContainer}>
                            <View style={styles.stat}><Text style={styles.statValue}>{formatCount(profile.postsCount)}</Text><Text style={styles.statLabel}>Posts</Text></View>
                            <View style={styles.statDivider} />
                            <View style={styles.stat}><Text style={styles.statValue}>{formatCount(profile.followersCount)}</Text><Text style={styles.statLabel}>Followers</Text></View>
                            <View style={styles.statDivider} />
                            <View style={styles.stat}><Text style={styles.statValue}>{formatCount(profile.followingCount)}</Text><Text style={styles.statLabel}>Following</Text></View>
                        </View>

                        <TouchableOpacity
                            style={[styles.followButton, profile.isFollowing && styles.followButtonActive]}
                            onPress={handleFollow} disabled={isFollowLoading} activeOpacity={0.8}
                        >
                            {profile.isFollowing ? (
                                <Text style={styles.followButtonActiveText}>Following</Text>
                            ) : (
                                <LinearGradient colors={[colors.gold[400], colors.gold[600]]} style={styles.followGradient}>
                                    <Text style={styles.followButtonText}>Follow</Text>
                                </LinearGradient>
                            )}
                        </TouchableOpacity>

                        <View style={styles.sectionHeader}>
                            <Ionicons name="grid-outline" size={16} color={colors.text.primary} />
                            <Text style={styles.sectionTitle}>Posts</Text>
                            <Text style={styles.sectionCount}>{posts.length}</Text>
                        </View>

                        {posts.length === 0 ? (
                            <View style={styles.emptyPosts}>
                                <Ionicons name="camera-outline" size={32} color={colors.text.muted} />
                                <Text style={styles.emptyText}>No posts yet</Text>
                            </View>
                        ) : (
                            <View style={styles.postsGrid}>
                                {posts.map((post) => <PostGridItem key={post.id} post={post} />)}
                            </View>
                        )}
                    </View>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    centered: { alignItems: 'center', justifyContent: 'center' },
    errorText: { fontSize: typography.fontSize.lg, color: colors.text.muted, marginTop: spacing.md, marginBottom: spacing.md },
    backLink: { paddingVertical: spacing.sm },
    backLinkText: { fontSize: typography.fontSize.base, color: colors.gold[500] },

    profileContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
    avatarSection: { alignItems: 'center', marginBottom: spacing.lg },

    userInfo: { alignItems: 'center', marginBottom: spacing.md },
    nameRow: { flexDirection: 'row', alignItems: 'center' },
    displayName: { fontSize: 26, fontWeight: '700', color: colors.text.primary, letterSpacing: -0.5, fontFamily: 'Inter-Bold' },
    username: { fontSize: typography.fontSize.base, color: colors.text.muted, marginTop: spacing.xs },
    bio: { fontSize: typography.fontSize.base, color: colors.text.secondary, textAlign: 'center', marginTop: spacing.md, lineHeight: 22 },
    website: { fontSize: typography.fontSize.sm, color: colors.gold[500], marginTop: spacing.sm },

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

    followButton: { borderRadius: 12, overflow: 'hidden', marginBottom: spacing.xl },
    followButtonActive: {
        borderWidth: 1, borderColor: colors.border.strong,
        paddingVertical: spacing.md, alignItems: 'center', borderRadius: 12,
    },
    followGradient: { paddingVertical: spacing.md, alignItems: 'center' },
    followButtonText: { fontSize: typography.fontSize.base, fontWeight: '700', color: colors.obsidian[900] },
    followButtonActiveText: { fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.secondary },

    sectionHeader: {
        flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md,
        borderTopWidth: 1, borderTopColor: colors.border.subtle, paddingTop: spacing.lg, gap: spacing.sm,
    },
    sectionTitle: { fontSize: typography.fontSize.lg, fontWeight: '700', color: colors.text.primary },
    sectionCount: { fontSize: typography.fontSize.sm, color: colors.text.muted },
    postsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    postItem: { width: POST_SIZE, height: POST_SIZE, borderRadius: 8, overflow: 'hidden' },
    postImage: { width: '100%', height: '100%' },
    textPostBg: { backgroundColor: colors.obsidian[600], padding: spacing.sm, alignItems: 'center', justifyContent: 'center' },
    textPostContent: { fontSize: typography.fontSize.xs, color: colors.text.primary, textAlign: 'center' },
    videoIndicator: {
        position: 'absolute', top: spacing.sm, right: spacing.sm,
        backgroundColor: colors.surface.overlayMedium, width: 24, height: 24, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
    },
    emptyPosts: { alignItems: 'center', paddingVertical: spacing['2xl'] },
    emptyText: { fontSize: typography.fontSize.base, color: colors.text.muted, marginTop: spacing.md },
});
