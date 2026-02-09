import { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    Share,
    Pressable,
    Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useVideoPlayer, VideoView } from 'expo-video';
import { colors, typography, spacing } from '@zerog/ui';
import { apiFetch, API } from '../../lib/api';
import { useAuthStore, mapApiPost } from '../../stores';
import { ScreenHeader, LoadingView, Avatar } from '../../components';

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
}

interface PostDetail {
    id: string;
    content: string;
    mediaUrl?: string;
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

// Video player for post detail (auto-plays since it's the only video)
function PostVideoPlayer({ uri }: { uri: string }) {
    const [isMuted, setIsMuted] = useState(true);

    const player = useVideoPlayer(uri, (player) => {
        player.loop = true;
        player.muted = true;
        player.play();
    });

    const toggleMute = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        player.muted = !player.muted;
        setIsMuted(player.muted);
    };

    return (
        <Pressable onPress={toggleMute} style={styles.videoPlayerWrap} accessibilityRole="button" accessibilityLabel={isMuted ? 'Video muted, tap to unmute' : 'Video playing, tap to mute'}>
            <VideoView
                player={player}
                style={styles.videoPlayerView}
                nativeControls={false}
                contentFit="cover"
            />
            <View style={styles.muteIndicator}>
                <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={14} color={colors.text.primary} />
            </View>
        </Pressable>
    );
}

export default function PostDetailScreen() {
    const router = useRouter();
    const { id: postId } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const flatListRef = useRef<FlatList>(null);

    const [post, setPost] = useState<PostDetail | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (!postId) return;
        const load = async () => {
            try {
                const [postData, commentsData] = await Promise.all([
                    apiFetch<any>(API.post(postId)),
                    apiFetch<any>(API.comments(postId)),
                ]);
                const rawPost = postData.post || postData.data || postData;
                const mapped = mapApiPost(rawPost);
                setPost({
                    id: mapped.id, content: mapped.content,
                    mediaUrl: mapped.mediaUrl, mediaType: mapped.mediaType,
                    mediaAspectRatio: mapped.mediaAspectRatio,
                    createdAt: mapped.createdAt,
                    author: mapped.author || { id: '', username: '', displayName: 'Anonymous' },
                    likesCount: mapped.likesCount, commentsCount: mapped.commentsCount,
                    sharesCount: mapped.sharesCount, isLiked: mapped.isLiked, isSaved: mapped.isSaved,
                });
                const rawComments = commentsData.comments || commentsData.data || [];
                setComments(
                    (Array.isArray(rawComments) ? rawComments : []).map((c: any) => ({
                        id: c.id, content: c.content || '',
                        createdAt: c.createdAt,
                        author: c.user || c.author || { id: '', username: '', displayName: 'Anonymous' },
                        likesCount: c.likesCount ?? c._count?.likes ?? 0,
                        isLiked: c.isLiked ?? false,
                    }))
                );
            } catch (e: any) {
                Alert.alert('Error', e.message || 'Failed to load post');
            } finally { setIsLoading(false); }
        };
        load();
    }, [postId]);

    const handleLike = useCallback(async () => {
        if (!post) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setPost((p) => p ? { ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1 } : p);
        try {
            await apiFetch(API.like(post.id), { method: post.isLiked ? 'DELETE' : 'POST' });
        } catch {
            setPost((p) => p ? { ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1 } : p);
        }
    }, [post]);

    const handleShare = useCallback(async () => {
        if (!post) return;
        await Share.share({ message: `Check out this post on 0G: https://0gravity.ai/post/${post.id}` });
    }, [post]);

    const handleCommentLike = useCallback(async (commentId: string) => {
        if (!postId) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Optimistic update
        setComments((prev) =>
            prev.map((c) =>
                c.id === commentId
                    ? { ...c, isLiked: !c.isLiked, likesCount: c.isLiked ? c.likesCount - 1 : c.likesCount + 1 }
                    : c
            )
        );
        try {
            const comment = comments.find((c) => c.id === commentId);
            await apiFetch(API.commentLike(postId, commentId), {
                method: comment?.isLiked ? 'DELETE' : 'POST',
            });
        } catch {
            // Revert
            setComments((prev) =>
                prev.map((c) =>
                    c.id === commentId
                        ? { ...c, isLiked: !c.isLiked, likesCount: c.isLiked ? c.likesCount - 1 : c.likesCount + 1 }
                        : c
                )
            );
        }
    }, [postId, comments]);

    const handleComment = useCallback(async () => {
        if (!commentText.trim() || isSending || !postId) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const text = commentText.trim();
        setCommentText('');
        setIsSending(true);

        const temp: Comment = {
            id: `temp-${Date.now()}`, content: text,
            createdAt: new Date().toISOString(),
            author: { id: user?.id || '', username: user?.username || '', displayName: user?.displayName || '', avatarUrl: user?.avatarUrl },
            likesCount: 0,
        };
        setComments((prev) => [...prev, temp]);

        try {
            const data = await apiFetch<any>(API.comments(postId), { method: 'POST', body: JSON.stringify({ content: text }) });
            const raw = data.comment || data.data || data;
            const real: Comment = {
                id: raw.id || temp.id, content: raw.content || '',
                createdAt: raw.createdAt || temp.createdAt,
                author: raw.user || raw.author || temp.author,
                likesCount: raw.likesCount ?? 0, isLiked: raw.isLiked ?? false,
            };
            setComments((prev) => prev.map((c) => c.id === temp.id ? real : c));
            setPost((p) => p ? { ...p, commentsCount: p.commentsCount + 1 } : p);
        } catch {
            setComments((prev) => prev.filter((c) => c.id !== temp.id));
        } finally {
            setIsSending(false);
        }
    }, [commentText, isSending, postId, user]);

    if (isLoading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />
                <LoadingView />
            </View>
        );
    }

    if (!post) {
        return (
            <View style={[styles.container, styles.centered]}>
                <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />
                <Ionicons name="alert-circle-outline" size={48} color={colors.text.muted} />
                <Text style={styles.errorText}>Post not found</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backLink} accessibilityRole="link" accessibilityLabel="Go back">
                    <Text style={styles.backLinkText}>Go back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(300)}>
            <View style={styles.postSection}>
                <TouchableOpacity style={styles.authorRow} onPress={() => post.author?.username && router.push(`/profile/${post.author.username}`)} accessibilityRole="button" accessibilityLabel={`View ${post.author?.displayName || 'Anonymous'}'s profile`} accessibilityHint="Double tap to view profile">
                    <Avatar uri={post.author?.avatarUrl} name={post.author?.displayName} customSize={44} />
                    <View style={styles.authorInfo}>
                        <View style={styles.authorNameRow}>
                            <Text style={styles.authorName}>{post.author?.displayName || 'Anonymous'}</Text>
                            {post.author?.isVerified && <Ionicons name="checkmark-circle" size={14} color={colors.gold[500]} style={{ marginStart: 4 }} />}
                        </View>
                        <Text style={styles.postTime}>{timeAgo(post.createdAt)}</Text>
                    </View>
                </TouchableOpacity>

                {post.content ? <Text style={styles.postContent}>{post.content}</Text> : null}

                {post.mediaUrl && (
                    <View style={styles.mediaContainer}>
                        {post.mediaType === 'VIDEO' ? (
                            <PostVideoPlayer uri={post.mediaUrl} />
                        ) : (
                            <Image source={{ uri: post.mediaUrl }} style={[styles.mediaImage, post.mediaAspectRatio ? { aspectRatio: parseFloat(post.mediaAspectRatio) || 1.5 } : {}]} resizeMode="cover" />
                        )}
                    </View>
                )}

                {/* Actions */}
                <View style={styles.actionsBar}>
                    <TouchableOpacity style={styles.actionBtn} onPress={handleLike} accessibilityRole="button" accessibilityLabel={post.isLiked ? `Unlike post, ${post.likesCount} likes` : `Like post, ${post.likesCount} likes`} accessibilityHint="Double tap to like this post" accessibilityState={{ selected: post.isLiked }}>
                        <Ionicons name={post.isLiked ? 'heart' : 'heart-outline'} size={22} color={post.isLiked ? colors.coral[500] : colors.text.secondary} />
                        <Text style={styles.actionCount}>{post.likesCount}</Text>
                    </TouchableOpacity>
                    <View style={styles.actionBtn} accessibilityRole="text" accessibilityLabel={`${post.commentsCount} comments`}>
                        <Ionicons name="chatbubble-outline" size={20} color={colors.text.secondary} />
                        <Text style={styles.actionCount}>{post.commentsCount}</Text>
                    </View>
                    <TouchableOpacity style={styles.actionBtn} onPress={handleShare} accessibilityRole="button" accessibilityLabel="Share post" accessibilityHint="Double tap to share this post">
                        <Ionicons name="arrow-redo-outline" size={20} color={colors.text.secondary} />
                        <Text style={styles.actionCount}>{post.sharesCount}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.commentsHeader}>
                <Text style={styles.commentsTitle} accessibilityRole="header">Comments</Text>
                <Text style={styles.commentsCount}>{comments.length}</Text>
            </View>
        </Animated.View>
    );

    const renderComment = ({ item }: { item: Comment }) => (
        <View style={styles.commentRow} accessibilityLabel={`Comment by ${item.author?.displayName || 'Anonymous'}: ${item.content}`}>
            <Avatar uri={item.author?.avatarUrl} name={item.author?.displayName} customSize={32} style={{ marginTop: 4 }} />
            <View style={styles.commentContent}>
                <View style={styles.commentBubble}>
                    <Text style={styles.commentAuthor}>{item.author?.displayName || 'Anonymous'}</Text>
                    <Text style={styles.commentText}>{item.content}</Text>
                </View>
                <View style={styles.commentMeta}>
                    <Text style={styles.commentTime}>{timeAgo(item.createdAt)}</Text>
                    <TouchableOpacity style={styles.commentLikeBtn} onPress={() => handleCommentLike(item.id)} accessibilityRole="button" accessibilityLabel={item.isLiked ? `Unlike comment by ${item.author?.displayName || 'Anonymous'}` : `Like comment by ${item.author?.displayName || 'Anonymous'}`} accessibilityState={{ selected: item.isLiked }}>
                        <Ionicons name={item.isLiked ? 'heart' : 'heart-outline'} size={14} color={item.isLiked ? colors.coral[500] : colors.text.muted} />
                        {item.likesCount > 0 && <Text style={styles.commentLikeCount}>{item.likesCount}</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            <ScreenHeader title="Post" />

            <FlatList
                ref={flatListRef}
                data={comments}
                renderItem={renderComment}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.noComments}>
                        <Text style={styles.noCommentsText}>No comments yet. Be the first!</Text>
                    </View>
                }
            />

            <View style={[styles.commentInput, { paddingBottom: insets.bottom + spacing.sm }]}>
                <TextInput
                    style={styles.commentTextInput}
                    placeholder="Write a comment..."
                    placeholderTextColor={colors.text.muted}
                    value={commentText}
                    onChangeText={setCommentText}
                    multiline
                    maxLength={1000}
                    accessibilityLabel="Write a comment"
                />
                {commentText.trim() ? (
                    <TouchableOpacity onPress={handleComment} accessibilityRole="button" accessibilityLabel="Send comment">
                        <LinearGradient colors={[colors.gold[400], colors.gold[600]]} style={styles.sendBtn}>
                            <Ionicons name="arrow-up" size={18} color={colors.obsidian[900]} />
                        </LinearGradient>
                    </TouchableOpacity>
                ) : null}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    centered: { alignItems: 'center', justifyContent: 'center' },
    errorText: { fontSize: typography.fontSize.lg, color: colors.text.muted, marginTop: spacing.md, marginBottom: spacing.md },
    backLink: { paddingVertical: spacing.sm },
    backLinkText: { fontSize: typography.fontSize.base, color: colors.gold[500] },

    postSection: { padding: spacing.lg },
    authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
    authorInfo: { marginStart: spacing.md },
    authorNameRow: { flexDirection: 'row', alignItems: 'center' },
    authorName: { fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.primary },
    postTime: { fontSize: typography.fontSize.sm, color: colors.text.muted, marginTop: 2 },
    postContent: { fontSize: 16, color: colors.text.primary, lineHeight: 24, marginBottom: spacing.md },

    mediaContainer: { borderRadius: 12, overflow: 'hidden', marginBottom: spacing.md },
    mediaImage: { width: '100%', aspectRatio: 1.5, backgroundColor: colors.obsidian[700] },
    videoPlayerWrap: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.obsidian[800], position: 'relative' },
    videoPlayerView: { width: '100%', height: '100%' },
    muteIndicator: {
        position: 'absolute', bottom: spacing.sm, right: spacing.sm,
        width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surface.overlayMedium,
        alignItems: 'center', justifyContent: 'center',
    },

    actionsBar: { flexDirection: 'row', paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border.subtle },
    actionBtn: { flexDirection: 'row', alignItems: 'center', marginEnd: spacing.xl },
    actionCount: { fontSize: typography.fontSize.sm, color: colors.text.secondary, marginStart: spacing.xs },

    commentsHeader: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border.subtle,
    },
    commentsTitle: { fontSize: typography.fontSize.lg, fontWeight: '700', color: colors.text.primary },
    commentsCount: { fontSize: typography.fontSize.sm, color: colors.text.muted, marginStart: spacing.sm },
    noComments: { alignItems: 'center', paddingVertical: spacing.xl },
    noCommentsText: { fontSize: typography.fontSize.base, color: colors.text.muted },

    commentRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
    commentContent: { flex: 1, marginStart: spacing.sm },
    commentBubble: { backgroundColor: colors.surface.glassHover, borderRadius: 16, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    commentAuthor: { fontSize: typography.fontSize.sm, fontWeight: '600', color: colors.text.primary, marginBottom: 2 },
    commentText: { fontSize: typography.fontSize.sm, color: colors.text.secondary, lineHeight: 20 },
    commentMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginStart: spacing.md, gap: spacing.md },
    commentTime: { fontSize: typography.fontSize.xs, color: colors.text.muted },
    commentLikeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    commentLikeCount: { fontSize: typography.fontSize.xs, color: colors.text.muted },

    commentInput: {
        flexDirection: 'row', alignItems: 'flex-end',
        paddingHorizontal: spacing.lg, paddingTop: spacing.sm,
        borderTopWidth: 1, borderTopColor: colors.border.subtle,
        backgroundColor: colors.obsidian[900],
    },
    commentTextInput: {
        flex: 1, fontSize: typography.fontSize.base, color: colors.text.primary,
        backgroundColor: colors.surface.glassHover, borderRadius: 20,
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        maxHeight: 100, marginEnd: spacing.sm,
    },
    sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
