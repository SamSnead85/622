import { useState, useEffect, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    ActivityIndicator,
    Alert,
    RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '@zerog/ui';
import { useAuthStore, Post } from '../../stores';
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
    const mediaUri = post.mediaUrl;

    return (
        <TouchableOpacity
            style={styles.postItem}
            activeOpacity={0.9}
        >
            {mediaUri ? (
                <Image source={{ uri: mediaUri }} style={styles.postImage} />
            ) : (
                <View style={[styles.postImage, styles.textPostBg]}>
                    <Text style={styles.textPostContent} numberOfLines={3}>
                        {post.content}
                    </Text>
                </View>
            )}
            {post.mediaType === 'VIDEO' && (
                <View style={styles.videoIndicator}>
                    <Text style={styles.videoIcon}>▶</Text>
                </View>
            )}
        </TouchableOpacity>
    );
});

export default function ProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);
    const refreshUser = useAuthStore((s) => s.refreshUser);

    const [userPosts, setUserPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadUserPosts = async () => {
        try {
            const data = await apiFetch<any>(
                `${API.posts}?userId=${user?.id}&limit=50`
            );
            const posts = data.posts || data.data || [];
            setUserPosts(Array.isArray(posts) ? posts : []);
        } catch (err) {
            // Silently handle
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (user?.id) loadUserPosts();
    }, [user?.id]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshUser();
        await loadUserPosts();
    };

    const handleLogout = () => {
        Alert.alert('Log Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log Out',
                style: 'destructive',
                onPress: async () => {
                    await logout();
                    router.replace('/');
                },
            },
        ]);
    };

    if (!user) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={colors.gold[500]} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800]]}
                style={StyleSheet.absoluteFill}
            />

            {/* Header buttons */}
            <View style={[styles.headerButtons, { paddingTop: insets.top + spacing.sm }]}>
                <View />
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.headerButton} onPress={handleLogout}>
                        <Text style={styles.headerIcon}>⚙️</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.gold[500]}
                    />
                }
            >
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
                                    {user.avatarUrl ? (
                                        <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
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
                        <Text style={styles.displayName}>{user.displayName}</Text>
                        <Text style={styles.username}>@{user.username}</Text>
                        {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
                    </View>

                    {/* Privacy badge */}
                    <View style={styles.privacyBadge}>
                        <Text style={styles.privacyIcon}>🔒</Text>
                        <Text style={styles.privacyText}>
                            {user.communityOptIn ? 'Community Member' : 'Private Mode'}
                        </Text>
                    </View>

                    {/* Stats */}
                    <View style={styles.statsContainer}>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{formatCount(user.postsCount)}</Text>
                            <Text style={styles.statLabel}>Posts</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{formatCount(user.followersCount)}</Text>
                            <Text style={styles.statLabel}>Followers</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{formatCount(user.followingCount)}</Text>
                            <Text style={styles.statLabel}>Following</Text>
                        </View>
                    </View>

                    {/* Action buttons */}
                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.editButton} activeOpacity={0.8}>
                            <Text style={styles.editButtonText}>Edit Profile</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.logoutButton}
                            activeOpacity={0.8}
                            onPress={handleLogout}
                        >
                            <Text style={styles.logoutText}>Log Out</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Posts grid */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Posts</Text>
                        <Text style={styles.sectionCount}>{userPosts.length}</Text>
                    </View>

                    {isLoading ? (
                        <View style={styles.centered}>
                            <ActivityIndicator size="small" color={colors.gold[500]} />
                        </View>
                    ) : userPosts.length === 0 ? (
                        <View style={styles.emptyPosts}>
                            <Text style={styles.emptyIcon}>📸</Text>
                            <Text style={styles.emptyText}>No posts yet</Text>
                        </View>
                    ) : (
                        <View style={styles.postsGrid}>
                            {userPosts.map((post) => (
                                <PostGridItem key={post.id} post={post} />
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing['2xl'] },
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
    headerRight: { flexDirection: 'row', gap: spacing.sm },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerIcon: { fontSize: 18 },
    scrollView: { flex: 1, marginTop: 60 },
    profileContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },

    // Avatar
    avatarSection: { alignItems: 'center', marginBottom: spacing.lg },
    avatarContainer: {},
    avatarBorder: { padding: 4, borderRadius: 56 },
    avatarInner: {
        borderRadius: 52,
        borderWidth: 4,
        borderColor: colors.obsidian[900],
        overflow: 'hidden',
    },
    avatarImage: { width: 96, height: 96 },
    avatarPlaceholder: {
        backgroundColor: colors.obsidian[500],
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: { fontSize: 36, fontWeight: '700', color: colors.text.primary },

    // User info
    userInfo: { alignItems: 'center', marginBottom: spacing.md },
    displayName: {
        fontSize: 26,
        fontWeight: '700',
        color: colors.text.primary,
        letterSpacing: -0.5,
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

    // Privacy badge
    privacyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: 20,
        marginBottom: spacing.lg,
    },
    privacyIcon: { fontSize: 12, marginRight: spacing.xs },
    privacyText: {
        fontSize: typography.fontSize.xs,
        color: colors.gold[400],
        fontWeight: '600',
    },

    // Stats
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
    stat: { flex: 1, alignItems: 'center' },
    statValue: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        color: colors.text.primary,
    },
    statLabel: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        marginTop: 2,
    },
    statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255, 255, 255, 0.08)' },

    // Action buttons
    actionButtons: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
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
    },
    logoutButton: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 82, 82, 0.3)',
        backgroundColor: 'rgba(255, 82, 82, 0.08)',
    },
    logoutText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.coral[500],
    },

    // Posts section
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.06)',
        paddingTop: spacing.lg,
    },
    sectionTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
    },
    sectionCount: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        marginLeft: spacing.sm,
    },

    // Posts grid
    postsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    postItem: {
        width: POST_SIZE,
        height: POST_SIZE,
        borderRadius: 8,
        overflow: 'hidden',
    },
    postImage: { width: '100%', height: '100%' },
    textPostBg: {
        backgroundColor: colors.obsidian[600],
        padding: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textPostContent: {
        fontSize: typography.fontSize.xs,
        color: colors.text.primary,
        textAlign: 'center',
    },
    videoIndicator: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: 6,
    },
    videoIcon: { fontSize: 8, color: colors.text.primary },

    // Empty state
    emptyPosts: { alignItems: 'center', paddingVertical: spacing['2xl'] },
    emptyIcon: { fontSize: 40, marginBottom: spacing.md },
    emptyText: { fontSize: typography.fontSize.base, color: colors.text.muted },
});
