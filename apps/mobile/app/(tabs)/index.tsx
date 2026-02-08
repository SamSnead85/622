import { useState, useCallback, memo, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    RefreshControl,
    ActivityIndicator,
    Dimensions,
    Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '@zerog/ui';
import { useFeedStore, useAuthStore, Post } from '../../stores';

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
// Feed Post Card
// ============================================
const FeedPostCard = memo(({ post, onLike, onPress, isOwner, onMoveUp, onMoveDown, isFirst, isLast }: {
    post: Post;
    onLike: (id: string) => void;
    onPress: (id: string) => void;
    isOwner: boolean;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    isFirst: boolean;
    isLast: boolean;
}) => {
    const router = useRouter();

    return (
        <Pressable style={styles.postCard} onPress={() => onPress(post.id)}>
            {/* Post header */}
            <View style={styles.postHeader}>
                <TouchableOpacity
                    style={styles.authorRow}
                    onPress={() => router.push(`/profile/${post.author.username}`)}
                >
                    {post.author.avatarUrl ? (
                        <Image
                            source={{ uri: post.author.avatarUrl }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarInitial}>
                                {(post.author.displayName || post.author.username || '?')[0].toUpperCase()}
                            </Text>
                        </View>
                    )}
                    <View style={styles.authorInfo}>
                        <Text style={styles.authorName} numberOfLines={1}>
                            {post.author.displayName || post.author.username}
                        </Text>
                        <Text style={styles.postTime}>{timeAgo(post.createdAt)}</Text>
                    </View>
                </TouchableOpacity>

                {/* Reorder arrows for own posts */}
                {isOwner && (
                    <View style={styles.reorderButtons}>
                        <TouchableOpacity
                            onPress={onMoveUp}
                            disabled={isFirst}
                            style={[styles.reorderBtn, isFirst && styles.reorderBtnDisabled]}
                        >
                            <Text style={[styles.reorderIcon, isFirst && styles.reorderIconDisabled]}>▲</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={onMoveDown}
                            disabled={isLast}
                            style={[styles.reorderBtn, isLast && styles.reorderBtnDisabled]}
                        >
                            <Text style={[styles.reorderIcon, isLast && styles.reorderIconDisabled]}>▼</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Post content */}
            {post.content ? (
                <Text style={styles.postContent} numberOfLines={6}>
                    {post.content}
                </Text>
            ) : null}

            {/* Media */}
            {post.mediaUrl && (
                <View style={styles.mediaContainer}>
                    {post.mediaType === 'VIDEO' ? (
                        <View style={styles.videoPlaceholder}>
                            <Image
                                source={{ uri: post.mediaUrl }}
                                style={styles.mediaImage}
                                resizeMode="cover"
                            />
                            <View style={styles.playOverlay}>
                                <Text style={styles.playIcon}>▶</Text>
                            </View>
                        </View>
                    ) : (
                        <Image
                            source={{ uri: post.mediaUrl }}
                            style={[
                                styles.mediaImage,
                                post.mediaAspectRatio ? {
                                    aspectRatio: parseFloat(post.mediaAspectRatio) || 1,
                                } : { aspectRatio: 1.5 },
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
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onLike(post.id);
                    }}
                >
                    <Text style={[styles.actionIcon, post.isLiked && styles.actionIconActive]}>
                        {post.isLiked ? '❤️' : '🤍'}
                    </Text>
                    <Text style={styles.actionCount}>{formatCount(post.likesCount)}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn}>
                    <Text style={styles.actionIcon}>💬</Text>
                    <Text style={styles.actionCount}>{formatCount(post.commentsCount)}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn}>
                    <Text style={styles.actionIcon}>↗️</Text>
                    <Text style={styles.actionCount}>{formatCount(post.sharesCount)}</Text>
                </TouchableOpacity>

                <View style={{ flex: 1 }} />

                <TouchableOpacity style={styles.actionBtn}>
                    <Text style={styles.actionIcon}>🔖</Text>
                </TouchableOpacity>
            </View>
        </Pressable>
    );
}, (prev, next) =>
    prev.post.id === next.post.id &&
    prev.post.isLiked === next.post.isLiked &&
    prev.post.likesCount === next.post.likesCount &&
    prev.isFirst === next.isFirst &&
    prev.isLast === next.isLast
);

// ============================================
// Feed Screen
// ============================================
export default function FeedScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);

    const posts = useFeedStore((s) => s.posts);
    const isLoading = useFeedStore((s) => s.isLoading);
    const isRefreshing = useFeedStore((s) => s.isRefreshing);
    const hasMore = useFeedStore((s) => s.hasMore);
    const fetchFeed = useFeedStore((s) => s.fetchFeed);
    const likePost = useFeedStore((s) => s.likePost);
    const unlikePost = useFeedStore((s) => s.unlikePost);
    const movePost = useFeedStore((s) => s.movePost);

    useEffect(() => {
        fetchFeed(true);
    }, []);

    const handleLike = useCallback((postId: string) => {
        const post = posts.find((p) => p.id === postId);
        if (post?.isLiked) {
            unlikePost(postId);
        } else {
            likePost(postId);
        }
    }, [posts, likePost, unlikePost]);

    const handlePostPress = useCallback((postId: string) => {
        // Navigate to post detail when ready
    }, []);

    const handleLoadMore = useCallback(() => {
        if (!isLoading && hasMore) {
            fetchFeed(false);
        }
    }, [isLoading, hasMore, fetchFeed]);

    const renderPost = useCallback(({ item, index }: { item: Post; index: number }) => {
        const isOwner = item.author.id === user?.id;
        return (
            <FeedPostCard
                post={item}
                onLike={handleLike}
                onPress={handlePostPress}
                isOwner={isOwner}
                isFirst={index === 0}
                isLast={index === posts.length - 1}
                onMoveUp={() => movePost(item.id, 'up')}
                onMoveDown={() => movePost(item.id, 'down')}
            />
        );
    }, [handleLike, handlePostPress, user?.id, posts.length, movePost]);

    const renderEmpty = () => {
        if (isLoading) return null;
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📝</Text>
                <Text style={styles.emptyTitle}>Your feed is empty</Text>
                <Text style={styles.emptyText}>
                    Create your first post or invite friends to get started
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
                <ActivityIndicator size="small" color={colors.gold[500]} />
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
                <Text style={styles.headerTitle}>Caravan</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.headerBtn}>
                        <Text style={styles.headerBtnIcon}>🔔</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerBtn}>
                        <Text style={styles.headerBtnIcon}>✉️</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Feed */}
            <FlatList
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
                        onRefresh={() => fetchFeed(true)}
                        tintColor={colors.gold[500]}
                    />
                }
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={renderEmpty}
                ListFooterComponent={renderFooter}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.text.primary,
        letterSpacing: -0.5,
    },
    headerActions: { flexDirection: 'row', gap: spacing.sm },
    headerBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerBtnIcon: { fontSize: 18 },

    // Post card
    postCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
        overflow: 'hidden',
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
    authorName: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
    },
    postTime: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        marginTop: 1,
    },

    // Reorder
    reorderButtons: { flexDirection: 'row', gap: 2 },
    reorderBtn: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
    },
    reorderBtnDisabled: { opacity: 0.2 },
    reorderIcon: { fontSize: 10, color: colors.text.secondary },
    reorderIconDisabled: { color: colors.text.muted },

    // Post content
    postContent: {
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        lineHeight: 22,
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
    videoPlaceholder: {
        position: 'relative',
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    playIcon: {
        fontSize: 40,
        color: 'rgba(255, 255, 255, 0.9)',
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
    actionIcon: { fontSize: 18 },
    actionIconActive: {},
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
    emptyIcon: { fontSize: 48, marginBottom: spacing.lg },
    emptyTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        color: colors.text.primary,
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
    footer: { paddingVertical: spacing.xl },
});
