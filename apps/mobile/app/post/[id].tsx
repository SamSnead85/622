// ============================================
// Post Detail Screen — Premium full post view
// Heart burst like, nested comments, pull-to-refresh,
// staggered animations, haptic feedback, share sheet
// ============================================

import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    Share,
    Pressable,
    Alert,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { IMAGE_PLACEHOLDER, AVATAR_PLACEHOLDER } from '../../lib/imagePlaceholder';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
    FadeInDown,
    FadeInUp,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
    withTiming,
    withDelay,
    runOnJS,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import { useVideoPlayer, VideoView } from 'expo-video';
import { colors, typography, spacing } from '@zerog/ui';
import { apiFetch, API } from '../../lib/api';
import { useAuthStore, mapApiPost } from '../../stores';
import { ScreenHeader, Avatar, GlassCard, AnimatedLikeButton } from '../../components';
import { showError } from '../../stores/toastStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// Types
// ============================================

interface PostAuthor {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    isVerified?: boolean;
}

interface Comment {
    id: string;
    content: string;
    createdAt: string;
    author: PostAuthor;
    likesCount: number;
    isLiked?: boolean;
    parentId?: string | null;
    replies?: Comment[];
}

interface PostDetail {
    id: string;
    content: string;
    mediaUrl?: string;
    fullMediaUrl?: string;
    mediaType?: string;
    mediaAspectRatio?: string;
    createdAt: string;
    author: PostAuthor;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    isLiked: boolean;
    isSaved: boolean;
}

// ============================================
// Helpers
// ============================================

function timeAgo(dateStr: string) {
    const now = Date.now();
    const d = new Date(dateStr).getTime();
    const seconds = Math.floor((now - d) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(dateStr).toLocaleDateString();
}

function formatCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}

/** Nest flat comments into a tree by parentId */
function nestComments(flat: Comment[]): Comment[] {
    const map = new Map<string, Comment>();
    const roots: Comment[] = [];

    flat.forEach((c) => {
        map.set(c.id, { ...c, replies: [] });
    });

    map.forEach((c) => {
        if (c.parentId && map.has(c.parentId)) {
            const parent = map.get(c.parentId);
            if (parent) {
                if (!parent.replies) parent.replies = [];
                parent.replies.push(c);
            }
        } else {
            roots.push(c);
        }
    });

    return roots;
}

// ============================================
// Skeleton Loader
// ============================================

function PostSkeleton() {
    const shimmer = useSharedValue(0);

    useEffect(() => {
        shimmer.value = withTiming(1, { duration: 1200 });
        const interval = setInterval(() => {
            shimmer.value = 0;
            shimmer.value = withTiming(1, { duration: 1200 });
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    const shimmerStyle = useAnimatedStyle(() => ({
        opacity: interpolate(shimmer.value, [0, 0.5, 1], [0.3, 0.6, 0.3], Extrapolation.CLAMP),
    }));

    const Block = ({ w, h, r = 6, mb = 0 }: { w: number | string; h: number; r?: number; mb?: number }) => (
        <Animated.View
            style={[
                {
                    width: w as any,
                    height: h,
                    borderRadius: r,
                    backgroundColor: colors.obsidian[600],
                    marginBottom: mb,
                },
                shimmerStyle,
            ]}
        />
    );

    return (
        <View style={skeletonStyles.container}>
            {/* Author skeleton */}
            <View style={skeletonStyles.authorRow}>
                <Block w={44} h={44} r={22} />
                <View style={{ marginStart: spacing.md, flex: 1 }}>
                    <Block w={140} h={14} r={7} mb={6} />
                    <Block w={80} h={10} r={5} />
                </View>
            </View>
            {/* Content skeleton */}
            <Block w="100%" h={16} r={8} mb={8} />
            <Block w="90%" h={16} r={8} mb={8} />
            <Block w="65%" h={16} r={8} mb={spacing.md} />
            {/* Media skeleton */}
            <Block w="100%" h={220} r={12} mb={spacing.md} />
            {/* Actions skeleton */}
            <View style={skeletonStyles.actionsRow}>
                <Block w={60} h={14} r={7} />
                <Block w={60} h={14} r={7} />
                <Block w={60} h={14} r={7} />
            </View>
            {/* Comment skeletons */}
            <View style={skeletonStyles.divider} />
            {[1, 2, 3].map((i) => (
                <View key={i} style={skeletonStyles.commentSkel}>
                    <Block w={32} h={32} r={16} />
                    <View style={{ marginStart: spacing.sm, flex: 1 }}>
                        <Block w="70%" h={50} r={12} mb={4} />
                        <Block w={60} h={10} r={5} />
                    </View>
                </View>
            ))}
        </View>
    );
}

const skeletonStyles = StyleSheet.create({
    container: { padding: spacing.lg },
    authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
    actionsRow: { flexDirection: 'row', gap: spacing.xl },
    divider: {
        height: 1,
        backgroundColor: colors.border.subtle,
        marginVertical: spacing.lg,
    },
    commentSkel: {
        flexDirection: 'row',
        marginBottom: spacing.md,
    },
});

// ============================================
// Video Player Component
// ============================================

function PostVideoPlayer({ uri }: { uri: string }) {
    const [isMuted, setIsMuted] = useState(true);

    const player = useVideoPlayer(uri, (p) => {
        p.loop = true;
        p.muted = true;
        p.play();
    });

    const toggleMute = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        player.muted = !player.muted;
        setIsMuted(player.muted);
    };

    return (
        <Pressable
            onPress={toggleMute}
            style={styles.videoPlayerWrap}
            accessibilityRole="button"
            accessibilityLabel={isMuted ? 'Video muted, tap to unmute' : 'Video playing, tap to mute'}
        >
            <VideoView
                player={player}
                style={styles.videoPlayerView}
                nativeControls={false}
                contentFit="cover"
            />
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
// Save Button with animated bounce
// ============================================

function SaveButton({ isSaved, onPress }: { isSaved: boolean; onPress: () => void }) {
    const scale = useSharedValue(1);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        scale.value = withSequence(
            withSpring(1.3, { damping: 4, stiffness: 300 }),
            withSpring(1, { damping: 6, stiffness: 200 })
        );
        onPress();
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={isSaved ? 'Unsave post' : 'Save post'}
            accessibilityState={{ selected: isSaved }}
        >
            <Animated.View style={animStyle}>
                <Ionicons
                    name={isSaved ? 'bookmark' : 'bookmark-outline'}
                    size={22}
                    color={isSaved ? colors.gold[500] : colors.text.secondary}
                />
            </Animated.View>
        </TouchableOpacity>
    );
}

// ============================================
// Nested Comment Item (with reply support)
// ============================================

const CommentItem = memo(function CommentItem({
    comment,
    index,
    depth,
    postId,
    onLike,
    onReply,
}: {
    comment: Comment;
    index: number;
    depth: number;
    postId: string;
    onLike: (id: string) => void;
    onReply: (parentId: string, authorName: string) => void;
}) {
    const maxDepth = 3;
    const indent = Math.min(depth, maxDepth) * 28;

    return (
        <Animated.View
            entering={FadeInDown.duration(300).delay(Math.min(index * 60, 400))}
            style={{ marginStart: indent }}
        >
            <View
                style={styles.commentRow}
                accessibilityLabel={`Comment by ${comment.author?.displayName || 'Anonymous'}: ${comment.content}`}
            >
                <TouchableOpacity activeOpacity={0.7}>
                    <Avatar
                        uri={comment.author?.avatarUrl}
                        name={comment.author?.displayName}
                        customSize={depth > 0 ? 28 : 32}
                        style={styles.commentAvatarOffset}
                    />
                </TouchableOpacity>
                <View style={styles.commentContent}>
                    <View style={styles.commentBubble}>
                        <View style={styles.commentAuthorRow}>
                            <Text style={styles.commentAuthor}>
                                {comment.author?.displayName || 'Anonymous'}
                            </Text>
                            {comment.author?.isVerified && (
                                <Ionicons
                                    name="checkmark-circle"
                                    size={12}
                                    color={colors.gold[500]}
                                    style={styles.commentVerifiedIcon}
                                />
                            )}
                        </View>
                        <Text style={styles.commentText}>{comment.content}</Text>
                    </View>
                    <View style={styles.commentMeta}>
                        <Text style={styles.commentTime}>{timeAgo(comment.createdAt)}</Text>
                        <TouchableOpacity
                            style={styles.commentLikeBtn}
                            onPress={() => onLike(comment.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityRole="button"
                            accessibilityLabel={
                                comment.isLiked
                                    ? `Unlike comment by ${comment.author?.displayName || 'Anonymous'}`
                                    : `Like comment by ${comment.author?.displayName || 'Anonymous'}`
                            }
                            accessibilityState={{ selected: comment.isLiked }}
                        >
                            <Ionicons
                                name={comment.isLiked ? 'heart' : 'heart-outline'}
                                size={14}
                                color={comment.isLiked ? colors.coral[500] : colors.text.muted}
                            />
                            {comment.likesCount > 0 && (
                                <Text
                                    style={[
                                        styles.commentLikeCount,
                                        comment.isLiked && { color: colors.coral[500] },
                                    ]}
                                >
                                    {comment.likesCount}
                                </Text>
                            )}
                        </TouchableOpacity>
                        {depth < maxDepth && (
                            <TouchableOpacity
                                onPress={() =>
                                    onReply(comment.id, comment.author?.displayName || 'Anonymous')
                                }
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityRole="button"
                                accessibilityLabel="Reply to comment"
                            >
                                <Text style={styles.replyBtn}>Reply</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            {/* Render nested replies */}
            {comment.replies &&
                comment.replies.map((reply, rIdx) => (
                    <CommentItem
                        key={reply.id}
                        comment={reply}
                        index={index + rIdx + 1}
                        depth={depth + 1}
                        postId={postId}
                        onLike={onLike}
                        onReply={onReply}
                    />
                ))}
        </Animated.View>
    );
});

// ============================================
// Main Post Detail Screen
// ============================================

export default function PostDetailScreen() {
    const router = useRouter();
    const { id: postId } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const flatListRef = useRef<FlatList>(null);
    const inputRef = useRef<TextInput>(null);

    const [post, setPost] = useState<PostDetail | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [nestedComments, setNestedComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);

    // ============================================
    // Data Fetching
    // ============================================

    const loadData = useCallback(
        async (refresh = false) => {
            if (!postId) return;
            if (refresh) setIsRefreshing(true);
            try {
                const [postData, commentsData] = await Promise.all([
                    apiFetch<any>(API.post(postId)),
                    apiFetch<any>(API.comments(postId)),
                ]);

                const rawPost = postData.post || postData.data || postData;
                const mapped = mapApiPost(rawPost);
                setPost({
                    id: mapped.id,
                    content: mapped.content,
                    mediaUrl: mapped.mediaUrl,
                    mediaType: mapped.mediaType,
                    mediaAspectRatio: mapped.mediaAspectRatio,
                    createdAt: mapped.createdAt,
                    author: mapped.author || {
                        id: '',
                        username: '',
                        displayName: 'Anonymous',
                    },
                    likesCount: mapped.likesCount,
                    commentsCount: mapped.commentsCount,
                    sharesCount: mapped.sharesCount,
                    isLiked: mapped.isLiked,
                    isSaved: mapped.isSaved,
                });

                const rawComments = commentsData.comments || commentsData.data || [];
                const flat: Comment[] = (Array.isArray(rawComments) ? rawComments : []).map(
                    (c: any) => ({
                        id: c.id,
                        content: c.content || '',
                        createdAt: c.createdAt,
                        author: c.user ||
                            c.author || { id: '', username: '', displayName: 'Anonymous' },
                        likesCount: c.likesCount ?? c._count?.likes ?? 0,
                        isLiked: c.isLiked ?? false,
                        parentId: c.parentId || null,
                    })
                );
                setComments(flat);
                setNestedComments(nestComments(flat));
            } catch (e: any) {
                if (!refresh) {
                    Alert.alert('Error', e.message || 'Failed to load post');
                }
            } finally {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        },
        [postId]
    );

    useEffect(() => {
        loadData();
    }, [loadData]);

    // ============================================
    // Actions
    // ============================================

    const handleLike = useCallback(async () => {
        if (!post) return;
        const wasLiked = post.isLiked;
        // Optimistic update
        setPost((p) =>
            p
                ? {
                      ...p,
                      isLiked: !p.isLiked,
                      likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1,
                  }
                : p
        );
        try {
            await apiFetch(API.like(post.id), { method: wasLiked ? 'DELETE' : 'POST' });
        } catch {
            // Revert
            setPost((p) =>
                p
                    ? {
                          ...p,
                          isLiked: wasLiked,
                          likesCount: wasLiked ? p.likesCount + 1 : p.likesCount - 1,
                      }
                    : p
            );
            showError('Could not update like');
        }
    }, [post]);

    const handleSave = useCallback(async () => {
        if (!post) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const wasSaved = post.isSaved;
        setPost((p) => (p ? { ...p, isSaved: !p.isSaved } : p));
        try {
            await apiFetch(API.save(post.id), { method: wasSaved ? 'DELETE' : 'POST' });
        } catch {
            setPost((p) => (p ? { ...p, isSaved: wasSaved } : p));
            showError('Could not save post');
        }
    }, [post]);

    const handleShare = useCallback(async () => {
        if (!post) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await Share.share({
            message: `Check out this post on 0G: https://0gravity.ai/post/${post.id}`,
        });
    }, [post]);

    const handleCommentLike = useCallback(
        async (commentId: string) => {
            if (!postId) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const comment = comments.find((c) => c.id === commentId);
            // Optimistic update
            const updatedComments = comments.map((c) =>
                c.id === commentId
                    ? {
                          ...c,
                          isLiked: !c.isLiked,
                          likesCount: c.isLiked ? c.likesCount - 1 : c.likesCount + 1,
                      }
                    : c
            );
            setComments(updatedComments);
            setNestedComments(nestComments(updatedComments));

            try {
                await apiFetch(API.commentLike(postId, commentId), {
                    method: comment?.isLiked ? 'DELETE' : 'POST',
                });
            } catch {
                // Revert
                const reverted = updatedComments.map((c) =>
                    c.id === commentId
                        ? {
                              ...c,
                              isLiked: !c.isLiked,
                              likesCount: c.isLiked ? c.likesCount - 1 : c.likesCount + 1,
                          }
                        : c
                );
                setComments(reverted);
                setNestedComments(nestComments(reverted));
                showError('Could not share post');
            }
        },
        [postId, comments]
    );

    const handleReply = useCallback((parentId: string, authorName: string) => {
        setReplyTo({ id: parentId, name: authorName });
        inputRef.current?.focus();
    }, []);

    const cancelReply = useCallback(() => {
        setReplyTo(null);
    }, []);

    const handleComment = useCallback(async () => {
        if (!commentText.trim() || isSending || !postId) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const text = commentText.trim();
        setCommentText('');
        setIsSending(true);

        const tempId = `temp-${Date.now()}`;
        const temp: Comment = {
            id: tempId,
            content: text,
            createdAt: new Date().toISOString(),
            author: {
                id: user?.id || '',
                username: user?.username || '',
                displayName: user?.displayName || '',
                avatarUrl: user?.avatarUrl,
            },
            likesCount: 0,
            parentId: replyTo?.id || null,
        };

        const updatedComments = [...comments, temp];
        setComments(updatedComments);
        setNestedComments(nestComments(updatedComments));
        setReplyTo(null);

        try {
            const body: any = { content: text };
            if (replyTo?.id) body.parentId = replyTo.id;

            const data = await apiFetch<any>(API.comments(postId), {
                method: 'POST',
                body: JSON.stringify(body),
            });
            const raw = data.comment || data.data || data;
            const real: Comment = {
                id: raw.id || tempId,
                content: raw.content || '',
                createdAt: raw.createdAt || temp.createdAt,
                author: raw.user || raw.author || temp.author,
                likesCount: raw.likesCount ?? 0,
                isLiked: raw.isLiked ?? false,
                parentId: raw.parentId || temp.parentId,
            };
            const finalComments = updatedComments.map((c) => (c.id === tempId ? real : c));
            setComments(finalComments);
            setNestedComments(nestComments(finalComments));
            setPost((p) => (p ? { ...p, commentsCount: p.commentsCount + 1 } : p));
        } catch {
            const reverted = updatedComments.filter((c) => c.id !== tempId);
            setComments(reverted);
            setNestedComments(nestComments(reverted));
            showError('Could not post comment');
        } finally {
            setIsSending(false);
        }
    }, [commentText, isSending, postId, user, replyTo, comments]);

    // ============================================
    // Loading State
    // ============================================

    if (isLoading) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={[colors.obsidian[900], colors.obsidian[800]]}
                    style={StyleSheet.absoluteFill}
                />
                <ScreenHeader title="Post" />
                <PostSkeleton />
            </View>
        );
    }

    // ============================================
    // Error State
    // ============================================

    if (!post) {
        return (
            <View style={[styles.container, styles.centered]}>
                <LinearGradient
                    colors={[colors.obsidian[900], colors.obsidian[800]]}
                    style={StyleSheet.absoluteFill}
                />
                <ScreenHeader title="Post" />
                <View style={styles.errorContainer}>
                    <View style={styles.errorIconWrap}>
                        <Ionicons
                            name="alert-circle-outline"
                            size={48}
                            color={colors.text.muted}
                        />
                    </View>
                    <Text style={styles.errorText}>Post not found</Text>
                    <Text style={styles.errorSubtext}>
                        This post may have been removed or is unavailable.
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backLink}
                        accessibilityRole="link"
                        accessibilityLabel="Go back"
                    >
                        <Text style={styles.backLinkText}>Go back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ============================================
    // Post Header Content
    // ============================================

    const renderHeader = useCallback(() => (
        <View>
            {/* Author Section */}
            <Animated.View entering={FadeInDown.duration(350).springify()}>
                <GlassCard style={styles.postCard} padding="lg" radius="xl">
                    <TouchableOpacity
                        style={styles.authorRow}
                        onPress={() =>
                            post.author?.username &&
                            router.push(`/profile/${post.author.username}`)
                        }
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`View ${post.author?.displayName || 'Anonymous'}'s profile`}
                        accessibilityHint="Double tap to view profile"
                    >
                        <Avatar
                            uri={post.author?.avatarUrl}
                            name={post.author?.displayName}
                            customSize={46}
                            glow={post.author?.isVerified}
                        />
                        <View style={styles.authorInfo}>
                            <View style={styles.authorNameRow}>
                                <Text style={styles.authorName}>
                                    {post.author?.displayName || 'Anonymous'}
                                </Text>
                                {post.author?.isVerified && (
                                <Ionicons
                                    name="checkmark-circle"
                                    size={15}
                                    color={colors.gold[500]}
                                    style={styles.authorVerifiedIcon}
                                />
                                )}
                            </View>
                            <View style={styles.postMetaRow}>
                                {post.author?.username ? (
                                    <Text style={styles.authorHandle}>
                                        @{post.author.username}
                                    </Text>
                                ) : null}
                                <Text style={styles.metaDot}>·</Text>
                                <Text style={styles.postTime}>{timeAgo(post.createdAt)}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* Post Content */}
                    {post.content ? (
                        <Text style={styles.postContent} selectable>
                            {post.content}
                        </Text>
                    ) : null}

                    {/* Media — use fullMediaUrl (original res) for detail view, fall back to mediaUrl */}
                    {(post.fullMediaUrl || post.mediaUrl) && (
                        <View style={styles.mediaContainer}>
                            {post.mediaType === 'VIDEO' ? (
                                <PostVideoPlayer uri={post.fullMediaUrl || post.mediaUrl} />
                            ) : (
                                <Image
                                    source={{ uri: post.fullMediaUrl || post.mediaUrl }}
                                    placeholder={IMAGE_PLACEHOLDER.blurhash}
                                    transition={IMAGE_PLACEHOLDER.transition}
                                    cachePolicy="memory-disk"
                                    style={[
                                        styles.mediaImage,
                                        post.mediaAspectRatio
                                            ? {
                                                  aspectRatio:
                                                      parseFloat(post.mediaAspectRatio) || 1.5,
                                              }
                                            : {},
                                    ]}
                                    contentFit="cover"
                                />
                            )}
                        </View>
                    )}

                    {/* Engagement Stats */}
                    {(post.likesCount > 0 ||
                        post.commentsCount > 0 ||
                        post.sharesCount > 0) && (
                        <View style={styles.statsRow}>
                            {post.likesCount > 0 && (
                                <Text style={styles.statText}>
                                    {formatCount(post.likesCount)}{' '}
                                    {post.likesCount === 1 ? 'like' : 'likes'}
                                </Text>
                            )}
                            {post.commentsCount > 0 && (
                                <Text style={styles.statText}>
                                    {formatCount(post.commentsCount)}{' '}
                                    {post.commentsCount === 1 ? 'comment' : 'comments'}
                                </Text>
                            )}
                            {post.sharesCount > 0 && (
                                <Text style={styles.statText}>
                                    {formatCount(post.sharesCount)}{' '}
                                    {post.sharesCount === 1 ? 'share' : 'shares'}
                                </Text>
                            )}
                        </View>
                    )}

                    {/* Action Bar */}
                    <View style={styles.actionsBar}>
                        <AnimatedLikeButton
                            isLiked={post.isLiked}
                            count={post.likesCount}
                            onPress={handleLike}
                            authorName={post.author?.displayName}
                        />

                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => inputRef.current?.focus()}
                            accessibilityRole="button"
                            accessibilityLabel={`Comment on post, ${post.commentsCount} comments`}
                        >
                            <Ionicons
                                name="chatbubble-outline"
                                size={20}
                                color={colors.text.secondary}
                            />
                            {post.commentsCount > 0 && (
                                <Text style={styles.actionCount}>{post.commentsCount}</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={handleShare}
                            accessibilityRole="button"
                            accessibilityLabel="Share post"
                            accessibilityHint="Double tap to share this post"
                        >
                            <Ionicons
                                name="arrow-redo-outline"
                                size={20}
                                color={colors.text.secondary}
                            />
                            {post.sharesCount > 0 && (
                                <Text style={styles.actionCount}>{post.sharesCount}</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.flex1} />

                        <SaveButton isSaved={post.isSaved} onPress={handleSave} />
                    </View>
                </GlassCard>
            </Animated.View>

            {/* Comments Header */}
            <Animated.View
                entering={FadeInDown.duration(300).delay(150)}
                style={styles.commentsHeader}
            >
                <Text style={styles.commentsTitle} accessibilityRole="header">
                    Comments
                </Text>
                <View style={styles.commentsBadge}>
                    <Text style={styles.commentsBadgeText}>{comments.length}</Text>
                </View>
            </Animated.View>
        </View>
    ), [post, comments, handleLike, handleSave, handleShare, router]);

    // ============================================
    // Render
    // ============================================

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800]]}
                style={StyleSheet.absoluteFill}
            />

            <ScreenHeader
                title="Post"
                rightElement={
                    <TouchableOpacity
                        onPress={() =>
                            Alert.alert('Options', '', [
                                {
                                    text: 'Report Post',
                                    style: 'destructive',
                                    onPress: () => {
                                        apiFetch(API.report(post.id), { method: 'POST' });
                                        Haptics.notificationAsync(
                                            Haptics.NotificationFeedbackType.Success
                                        );
                                        Alert.alert('Reported', 'Thank you for your report.');
                                    },
                                },
                                { text: 'Cancel', style: 'cancel' },
                            ])
                        }
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        accessibilityRole="button"
                        accessibilityLabel="More options"
                    >
                        <Ionicons
                            name="ellipsis-horizontal"
                            size={20}
                            color={colors.text.secondary}
                        />
                    </TouchableOpacity>
                }
            />

            <FlatList
                ref={flatListRef}
                data={nestedComments}
                renderItem={({ item, index }) => (
                    <CommentItem
                        comment={item}
                        index={index}
                        depth={0}
                        postId={postId!}
                        onLike={handleCommentLike}
                        onReply={handleReply}
                    />
                )}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={true}
                maxToRenderPerBatch={8}
                windowSize={5}
                initialNumToRender={6}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={() => loadData(true)}
                        tintColor={colors.gold[500]}
                        colors={[colors.gold[500]]}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.noComments}>
                        <Ionicons
                            name="chatbubble-ellipses-outline"
                            size={32}
                            color={colors.text.muted}
                        />
                        <Text style={styles.noCommentsText}>No comments yet</Text>
                        <Text style={styles.noCommentsSubtext}>Be the first to share your thoughts!</Text>
                    </View>
                }
            />

            {/* Reply indicator */}
            {replyTo && (
                <Animated.View entering={FadeInUp.duration(200)} style={styles.replyIndicator}>
                    <Ionicons name="return-down-forward" size={14} color={colors.gold[500]} />
                    <Text style={styles.replyText}>
                        Replying to <Text style={styles.replyName}>{replyTo.name}</Text>
                    </Text>
                    <TouchableOpacity
                        onPress={cancelReply}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel="Cancel reply"
                    >
                        <Ionicons name="close-circle" size={18} color={colors.text.muted} />
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* Comment Input */}
            <View style={[styles.commentInput, { paddingBottom: insets.bottom + spacing.sm }]}>
                <Avatar
                    uri={user?.avatarUrl}
                    name={user?.displayName}
                    customSize={32}
                    style={styles.commentInputAvatar}
                />
                <TextInput
                    ref={inputRef}
                    style={styles.commentTextInput}
                    placeholder={replyTo ? `Reply to ${replyTo.name}...` : 'Write a comment...'}
                    placeholderTextColor={colors.text.muted}
                    value={commentText}
                    onChangeText={setCommentText}
                    multiline
                    maxLength={1000}
                    accessibilityLabel={
                        replyTo ? `Reply to ${replyTo.name}` : 'Write a comment'
                    }
                />
                {commentText.trim() ? (
                    <TouchableOpacity
                        onPress={handleComment}
                        disabled={isSending}
                        accessibilityRole="button"
                        accessibilityLabel="Send comment"
                    >
                        <LinearGradient
                            colors={[colors.gold[400], colors.gold[600]]}
                            style={styles.sendBtn}
                        >
                            {isSending ? (
                                <ActivityIndicator size="small" color={colors.obsidian[900]} />
                            ) : (
                                <Ionicons
                                    name="arrow-up"
                                    size={18}
                                    color={colors.obsidian[900]}
                                />
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                ) : null}
            </View>
        </KeyboardAvoidingView>
    );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    centered: { alignItems: 'center', justifyContent: 'center' },

    // Error
    errorContainer: { alignItems: 'center', padding: spacing.xl, flex: 1, justifyContent: 'center' },
    errorIconWrap: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.surface.glass,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    errorText: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    errorSubtext: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    backLink: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.surface.goldSubtle,
        borderRadius: 20,
    },
    backLinkText: {
        fontSize: typography.fontSize.base,
        color: colors.gold[500],
        fontWeight: '600',
    },

    // Post Card
    postCard: {
        marginHorizontal: spacing.md,
        marginTop: spacing.sm,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    authorInfo: { marginStart: spacing.md, flex: 1 },
    authorNameRow: { flexDirection: 'row', alignItems: 'center' },
    authorName: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.text.primary,
    },
    postMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
        gap: spacing.xs,
    },
    authorHandle: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
    },
    metaDot: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
    },
    postTime: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
    },
    postContent: {
        fontSize: 16,
        color: colors.text.primary,
        lineHeight: 24,
        marginBottom: spacing.md,
        letterSpacing: 0.1,
    },

    // Media
    mediaContainer: {
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: spacing.md,
    },
    mediaImage: {
        width: '100%',
        aspectRatio: 1.5,
        backgroundColor: colors.obsidian[700],
    },
    videoPlayerWrap: {
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: colors.obsidian[800],
        position: 'relative',
    },
    videoPlayerView: { width: '100%', height: '100%' },
    muteIndicator: {
        position: 'absolute',
        bottom: spacing.sm,
        right: spacing.sm,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: colors.surface.overlayMedium,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Stats
    statsRow: {
        flexDirection: 'row',
        gap: spacing.lg,
        paddingBottom: spacing.sm,
        marginBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
    },
    statText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
    },

    // Actions
    actionsBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: spacing.xs,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginStart: spacing.xl,
        gap: spacing.xs,
    },
    actionCount: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
    },

    // Comments header
    commentsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
    },
    commentsTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
    },
    commentsBadge: {
        marginStart: spacing.sm,
        backgroundColor: colors.surface.goldSubtle,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: 10,
    },
    commentsBadgeText: {
        fontSize: typography.fontSize.xs,
        color: colors.gold[500],
        fontWeight: '600',
    },

    // Empty comments
    noComments: {
        alignItems: 'center',
        paddingVertical: spacing['3xl'],
        gap: spacing.sm,
    },
    noCommentsText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.muted,
    },
    noCommentsSubtext: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        opacity: 0.7,
    },

    // Comment item
    commentRow: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    commentContent: { flex: 1, marginStart: spacing.sm },
    commentBubble: {
        backgroundColor: colors.surface.glassHover,
        borderRadius: 16,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    commentAuthorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    commentAuthor: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.primary,
    },
    commentText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        lineHeight: 20,
    },
    commentMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        marginStart: spacing.md,
        gap: spacing.md,
    },
    commentTime: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },
    commentLikeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    commentLikeCount: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },
    replyBtn: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        fontWeight: '600',
    },

    // Reply indicator
    replyIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xs,
        backgroundColor: colors.surface.goldSubtle,
        gap: spacing.sm,
    },
    replyText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        flex: 1,
    },
    replyName: {
        color: colors.gold[500],
        fontWeight: '600',
    },

    // Comment input
    commentInput: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border.subtle,
        backgroundColor: colors.obsidian[900],
    },
    commentTextInput: {
        flex: 1,
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        backgroundColor: colors.surface.glassHover,
        borderRadius: 20,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        maxHeight: 100,
        marginEnd: spacing.sm,
    },
    sendBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Extracted inline styles
    flex1: { flex: 1 },
    commentAvatarOffset: { marginTop: 4 },
    commentVerifiedIcon: { marginStart: 3 },
    authorVerifiedIcon: { marginStart: 4 },
    commentInputAvatar: { marginEnd: spacing.sm },
});
