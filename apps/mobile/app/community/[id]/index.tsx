import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    RefreshControl,
    Alert,
    Share,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { Post, mapApiPost, useCommunitiesStore } from '../../../stores';
import { apiFetch, API } from '../../../lib/api';
import { ScreenHeader, LoadingView, CommunityInviteSheet } from '../../../components';
import { showError, showSuccess } from '../../../stores/toastStore';

const formatCount = (num: number) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
};

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

interface CommunityDetail {
    id: string;
    name: string;
    slug?: string;
    description: string;
    avatarUrl?: string;
    coverUrl?: string;
    membersCount: number;
    postsCount: number;
    isPublic: boolean;
    role: 'member' | 'admin' | 'moderator' | null;
    createdAt: string;
}

export default function CommunityDetailScreen() {
    const router = useRouter();
    const { id: communityId } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const joinCommunity = useCommunitiesStore((s) => s.joinCommunity);
    const leaveCommunity = useCommunitiesStore((s) => s.leaveCommunity);

    const [community, setCommunity] = useState<CommunityDetail | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isJoinLoading, setIsJoinLoading] = useState(false);
    const [showInviteSheet, setShowInviteSheet] = useState(false);

    const loadCommunity = async () => {
        if (!communityId) return;
        try {
            const data = await apiFetch<any>(API.community(communityId));
            const communityData = data.community || data;
            setCommunity(communityData);
            try {
                const postsData = await apiFetch<any>(`${API.posts}?communityId=${communityId}&limit=20`);
                const rawPosts = postsData.posts || postsData.data || [];
                setPosts((Array.isArray(rawPosts) ? rawPosts : []).map(mapApiPost));
            } catch { showError("Couldn't load community posts"); }
        } catch (e: any) {
            if (!isRefreshing) Alert.alert('Error', e.message || 'Failed to load community');
        } finally { setIsLoading(false); setIsRefreshing(false); }
    };

    useEffect(() => { loadCommunity(); }, [communityId]);

    const handleJoinLeave = async () => {
        if (!community) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsJoinLoading(true);
        try {
            if (community.role) {
                await leaveCommunity(community.id);
                setCommunity((c) => c ? { ...c, role: null, membersCount: c.membersCount - 1 } : c);
            } else {
                await joinCommunity(community.id);
                setCommunity((c) => c ? { ...c, role: 'member', membersCount: c.membersCount + 1 } : c);
            }
        } catch { showError('Action failed, please try again'); }
        finally { setIsJoinLoading(false); }
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />
                <LoadingView />
            </View>
        );
    }

    if (!community) {
        return (
            <View style={[styles.container, styles.centered]}>
                <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />
                <Ionicons name="people-outline" size={48} color={colors.text.muted} />
                <Text style={styles.errorText}>Community not found</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backLink} accessibilityLabel="Go back" accessibilityRole="button">
                    <Text style={styles.backLinkText}>Go back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            <ScreenHeader title={community.name} />

            <ScrollView
                contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); loadCommunity(); }} tintColor={colors.gold[500]} />}
            >
                <Animated.View entering={FadeInDown.duration(400)}>
                    {community.coverUrl && (
                        <View style={styles.coverContainer}>
                            <Image source={{ uri: community.coverUrl }} style={styles.coverImage} />
                            <LinearGradient colors={['transparent', colors.obsidian[900]]} style={styles.coverGradient} />
                        </View>
                    )}

                    <View style={styles.content}>
                        <View style={styles.communityInfo}>
                            {community.avatarUrl && <Image source={{ uri: community.avatarUrl }} style={styles.avatar} />}
                            <Text style={styles.communityName}>{community.name}</Text>
                            <Text style={styles.communityDescription}>{community.description}</Text>
                        </View>

                        <View style={styles.statsContainer}>
                            <View style={styles.stat}>
                                <Text style={styles.statValue}>{formatCount(community.membersCount)}</Text>
                                <Text style={styles.statLabel}>Members</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.stat}>
                                <Text style={styles.statValue}>{formatCount(community.postsCount)}</Text>
                                <Text style={styles.statLabel}>Posts</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.joinButton, community.role && styles.leaveButton]}
                            onPress={handleJoinLeave} disabled={isJoinLoading} activeOpacity={0.8}
                            accessibilityLabel={community.role ? 'Leave community' : 'Join community'}
                            accessibilityRole="button"
                        >
                            {community.role ? (
                                <Text style={styles.leaveButtonText}>
                                    {community.role === 'admin' ? 'Admin' : community.role === 'moderator' ? 'Moderator' : 'Leave'}
                                </Text>
                            ) : (
                                <LinearGradient colors={[colors.gold[400], colors.gold[600]]} style={styles.joinGradient}>
                                    <Text style={styles.joinButtonText}>Join Community</Text>
                                </LinearGradient>
                            )}
                        </TouchableOpacity>

                        {/* Share / Invite Row */}
                        {community.role && (
                            <View style={styles.shareRow}>
                                <TouchableOpacity
                                    style={styles.shareBtn}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setShowInviteSheet(true);
                                    }}
                                    activeOpacity={0.8}
                                    accessibilityRole="button"
                                    accessibilityLabel="Invite people to this group"
                                >
                                    <Ionicons name="person-add-outline" size={16} color={colors.gold[500]} />
                                    <Text style={styles.shareBtnText}>Invite People</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.shareBtn}
                                    onPress={async () => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        const link = `https://0gravity.ai/group/${communityId}`;
                                        try {
                                            await Share.share({
                                                message: `Join ${community.name} on 0G!\n\n${community.description}\n\n${link}`,
                                                url: link,
                                            });
                                        } catch {}
                                    }}
                                    activeOpacity={0.8}
                                    accessibilityRole="button"
                                    accessibilityLabel="Share group link"
                                >
                                    <Ionicons name="share-outline" size={16} color={colors.gold[500]} />
                                    <Text style={styles.shareBtnText}>Share</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {community.role && (
                            <View style={styles.roleBadge}>
                                <Ionicons name="shield-checkmark" size={12} color={colors.gold[500]} />
                                <Text style={styles.roleBadgeText}>You are a {community.role}</Text>
                            </View>
                        )}

                        {/* Quick action buttons for members */}
                        {community.role && (
                            <View style={styles.actionRow}>
                                <TouchableOpacity
                                    style={styles.actionBtn}
                                    onPress={() => router.push(`/community/${communityId}/polls` as any)}
                                    accessibilityLabel="Polls"
                                    accessibilityRole="button"
                                >
                                    <Ionicons name="bar-chart-outline" size={18} color={colors.gold[400]} />
                                    <Text style={styles.actionBtnText}>Polls</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.actionBtn}
                                    onPress={() => router.push(`/community/${communityId}/rules` as any)}
                                    accessibilityLabel="Rules"
                                    accessibilityRole="button"
                                >
                                    <Ionicons name="book-outline" size={18} color={colors.gold[400]} />
                                    <Text style={styles.actionBtnText}>Rules</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.actionBtn}
                                    onPress={() => router.push(`/community/${communityId}/governance` as any)}
                                    accessibilityLabel="Governance"
                                    accessibilityRole="button"
                                >
                                    <Ionicons name="people-circle-outline" size={18} color={colors.gold[400]} />
                                    <Text style={styles.actionBtnText}>Governance</Text>
                                </TouchableOpacity>
                                {(community.role === 'admin' || community.role === 'moderator') && (
                                    <TouchableOpacity
                                        style={styles.actionBtn}
                                        onPress={() => router.push(`/community/${communityId}/manage` as any)}
                                        accessibilityLabel="Manage"
                                        accessibilityRole="button"
                                    >
                                        <Ionicons name="settings-outline" size={18} color={colors.gold[400]} />
                                        <Text style={styles.actionBtnText}>Manage</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        <View style={styles.sectionHeader}>
                            <Ionicons name="document-text-outline" size={16} color={colors.text.primary} />
                            <Text style={styles.sectionTitle}>Recent Posts</Text>
                        </View>

                        {posts.length === 0 ? (
                            <View style={styles.emptyPosts}>
                                <Ionicons name="document-text-outline" size={40} color={colors.text.muted} />
                                <Text style={styles.emptyText}>No posts in this community yet</Text>
                            </View>
                        ) : (
                            posts.map((post) => (
                                <TouchableOpacity key={post.id} style={styles.postCard} onPress={() => router.push(`/post/${post.id}`)} activeOpacity={0.8}>
                                    <View style={styles.postHeader}>
                                        <Text style={styles.postAuthor}>{post.author?.displayName || 'Anonymous'}</Text>
                                        <Text style={styles.postTime}>{timeAgo(post.createdAt)}</Text>
                                    </View>
                                    {post.content ? <Text style={styles.postContent} numberOfLines={3}>{post.content}</Text> : null}
                                    {post.mediaUrl && <Image source={{ uri: post.mediaUrl }} style={styles.postMedia} resizeMode="cover" />}
                                    <View style={styles.postStats}>
                                        <View style={styles.postStatItem}>
                                            <Ionicons name="heart-outline" size={14} color={colors.text.muted} />
                                            <Text style={styles.postStat}>{post.likesCount}</Text>
                                        </View>
                                        <View style={styles.postStatItem}>
                                            <Ionicons name="chatbubble-outline" size={14} color={colors.text.muted} />
                                            <Text style={styles.postStat}>{post.commentsCount}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                </Animated.View>
            </ScrollView>

            {/* Invite Sheet */}
            <CommunityInviteSheet
                communityId={communityId || ''}
                communityName={community.name}
                memberCount={community.membersCount}
                description={community.description}
                visible={showInviteSheet}
                onClose={() => setShowInviteSheet(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    centered: { alignItems: 'center', justifyContent: 'center' },
    errorText: { fontSize: typography.fontSize.lg, color: colors.text.muted, marginTop: spacing.md, marginBottom: spacing.md },
    backLink: { paddingVertical: spacing.sm },
    backLinkText: { fontSize: typography.fontSize.base, color: colors.gold[500] },

    coverContainer: { height: 180, position: 'relative' },
    coverImage: { width: '100%', height: '100%' },
    coverGradient: { ...StyleSheet.absoluteFillObject },

    content: { paddingHorizontal: spacing.xl },
    communityInfo: { alignItems: 'center', paddingTop: spacing.xl },
    avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: colors.obsidian[900], marginTop: -36, marginBottom: spacing.md },
    communityName: { fontSize: 28, fontWeight: '700', color: colors.text.primary, letterSpacing: -0.5, textAlign: 'center', fontFamily: 'Inter-Bold' },
    communityDescription: { fontSize: typography.fontSize.base, color: colors.text.secondary, textAlign: 'center', marginTop: spacing.sm, lineHeight: 22 },

    statsContainer: {
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        backgroundColor: colors.surface.glass, borderRadius: 16,
        paddingVertical: spacing.lg, marginVertical: spacing.lg,
        borderWidth: 1, borderColor: colors.border.subtle,
    },
    stat: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.text.primary },
    statLabel: { fontSize: typography.fontSize.sm, color: colors.text.muted, marginTop: 2 },
    statDivider: { width: 1, height: 32, backgroundColor: colors.border.subtle },

    joinButton: { borderRadius: 12, overflow: 'hidden', marginBottom: spacing.lg },
    joinGradient: { paddingVertical: spacing.md, alignItems: 'center' },
    joinButtonText: { fontSize: typography.fontSize.base, fontWeight: '700', color: colors.obsidian[900] },
    leaveButton: { borderWidth: 1, borderColor: colors.border.strong, paddingVertical: spacing.md, alignItems: 'center' },
    leaveButtonText: { fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.secondary },

    shareRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    shareBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: colors.surface.goldSubtle,
        paddingVertical: spacing.sm,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    shareBtnText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.gold[500],
    },

    roleBadge: {
        alignSelf: 'center', backgroundColor: colors.surface.goldMedium,
        paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 8,
        marginBottom: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    },
    roleBadgeText: { fontSize: typography.fontSize.xs, fontWeight: '700', color: colors.gold[500] },

    actionRow: {
        flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, flexWrap: 'wrap',
    },
    actionBtn: {
        flex: 1, minWidth: 70, alignItems: 'center', gap: 4,
        backgroundColor: colors.surface.glass, borderRadius: 12,
        paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
        borderWidth: 1, borderColor: colors.border.subtle,
    },
    actionBtnText: {
        fontSize: typography.fontSize.xs, color: colors.text.secondary, fontWeight: '500',
    },

    sectionHeader: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        borderTopWidth: 1, borderTopColor: colors.border.subtle,
        paddingTop: spacing.lg, marginBottom: spacing.md,
    },
    sectionTitle: { fontSize: typography.fontSize.lg, fontWeight: '700', color: colors.text.primary },

    emptyPosts: { alignItems: 'center', paddingVertical: spacing['2xl'] },
    emptyText: { fontSize: typography.fontSize.base, color: colors.text.muted, marginTop: spacing.md },

    postCard: {
        backgroundColor: colors.surface.glass, borderRadius: 16,
        marginBottom: spacing.md, padding: spacing.md,
        borderWidth: 1, borderColor: colors.border.subtle,
    },
    postHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
    postAuthor: { fontSize: typography.fontSize.sm, fontWeight: '600', color: colors.text.primary },
    postTime: { fontSize: typography.fontSize.xs, color: colors.text.muted },
    postContent: { fontSize: typography.fontSize.base, color: colors.text.primary, lineHeight: 22, marginBottom: spacing.sm },
    postMedia: { width: '100%', height: 200, borderRadius: 12, marginBottom: spacing.sm, backgroundColor: colors.obsidian[700] },
    postStats: { flexDirection: 'row', gap: spacing.lg },
    postStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    postStat: { fontSize: typography.fontSize.sm, color: colors.text.muted },
});
