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
    ActivityIndicator,
    Dimensions,
    Share,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { apiFetch, API } from '../../lib/api';
import { useAuthStore, mapApiPost } from '../../stores';

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
            } catch { /* silent */ }
            finally { setIsLoading(false); }
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
                <ActivityIndicator size="large" color={colors.gold[500]} />
            </View>
        );
    }

    if (!post) {
        return (
            <View style={[styles.container, styles.centered]}>
                <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />
                <Ionicons name="alert-circle-outline" size={48} color={colors.text.muted} />
                <Text style={styles.errorText}>Post not found</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
                    <Text style={styles.backLinkText}>Go back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(300)}>
            <View style={styles.postSection}>
                <TouchableOpacity style={styles.authorRow} onPress={() => post.author?.username && router.push(`/profile/${post.author.username}`)}>
                    {post.author?.avatarUrl ? (
                        <Image source={{ uri: post.author.avatarUrl }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarInitial}>{(post.author?.displayName || '?')[0].toUpperCase()}</Text>
                        </View>
                    )}
                    <View style={styles.authorInfo}>
                        <View style={styles.authorNameRow}>
                            <Text style={styles.authorName}>{post.author?.displayName || 'Anonymous'}</Text>
                            {post.author?.isVerified && <Ionicons name="checkmark-circle" size={14} color={colors.gold[500]} style={{ marginLeft: 4 }} />}
                        </View>
                        <Text style={styles.postTime}>{timeAgo(post.createdAt)}</Text>
                    </View>
                </TouchableOpacity>

                {post.content ? <Text style={styles.postContent}>{post.content}</Text> : null}

                {post.mediaUrl && (
                    <View style={styles.mediaContainer}>
                        {post.mediaType === 'VIDEO' ? (
                            <View style={styles.videoContainer}>
                                <Image source={{ uri: post.mediaUrl }} style={styles.mediaImage} resizeMode="cover" />
                                <View style={styles.playOverlay}>
                                    <View style={styles.playButton}>
                                        <Ionicons name="play" size={32} color="#fff" />
                                    </View>
                                </View>
                            </View>
                        ) : (
                            <Image source={{ uri: post.mediaUrl }} style={[styles.mediaImage, post.mediaAspectRatio ? { aspectRatio: parseFloat(post.mediaAspectRatio) || 1.5 } : {}]} resizeMode="cover" />
                        )}
                    </View>
                )}

                {/* Actions */}
                <View style={styles.actionsBar}>
                    <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
                        <Ionicons name={post.isLiked ? 'heart' : 'heart-outline'} size={22} color={post.isLiked ? colors.coral[500] : colors.text.secondary} />
                        <Text style={styles.actionCount}>{post.likesCount}</Text>
                    </TouchableOpacity>
                    <View style={styles.actionBtn}>
                        <Ionicons name="chatbubble-outline" size={20} color={colors.text.secondary} />
                        <Text style={styles.actionCount}>{post.commentsCount}</Text>
                    </View>
                    <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
                        <Ionicons name="arrow-redo-outline" size={20} color={colors.text.secondary} />
                        <Text style={styles.actionCount}>{post.sharesCount}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.commentsHeader}>
                <Text style={styles.commentsTitle}>Comments</Text>
                <Text style={styles.commentsCount}>{comments.length}</Text>
            </View>
        </Animated.View>
    );

    const renderComment = ({ item }: { item: Comment }) => (
        <View style={styles.commentRow}>
            {item.author?.avatarUrl ? (
                <Image source={{ uri: item.author.avatarUrl }} style={styles.commentAvatar} />
            ) : (
                <View style={[styles.commentAvatar, styles.commentAvatarPlaceholder]}>
                    <Text style={styles.commentAvatarInitial}>{(item.author?.displayName || '?')[0].toUpperCase()}</Text>
                </View>
            )}
            <View style={styles.commentContent}>
                <View style={styles.commentBubble}>
                    <Text style={styles.commentAuthor}>{item.author?.displayName || 'Anonymous'}</Text>
                    <Text style={styles.commentText}>{item.content}</Text>
                </View>
                <View style={styles.commentMeta}>
                    <Text style={styles.commentTime}>{timeAgo(item.createdAt)}</Text>
                    <TouchableOpacity style={styles.commentLikeBtn}>
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

            <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Post</Text>
                <View style={{ width: 40 }} />
            </View>

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
                />
                {commentText.trim() ? (
                    <TouchableOpacity onPress={handleComment}>
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

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
        borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '600', color: colors.text.primary, fontFamily: 'Inter-SemiBold' },

    postSection: { padding: spacing.lg },
    authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    avatarPlaceholder: { backgroundColor: colors.obsidian[500], alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
    authorInfo: { marginLeft: spacing.md },
    authorNameRow: { flexDirection: 'row', alignItems: 'center' },
    authorName: { fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.primary },
    postTime: { fontSize: typography.fontSize.sm, color: colors.text.muted, marginTop: 2 },
    postContent: { fontSize: 16, color: colors.text.primary, lineHeight: 24, marginBottom: spacing.md },

    mediaContainer: { borderRadius: 12, overflow: 'hidden', marginBottom: spacing.md },
    mediaImage: { width: '100%', aspectRatio: 1.5, backgroundColor: colors.obsidian[700] },
    videoContainer: { position: 'relative' },
    playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
    playButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },

    actionsBar: { flexDirection: 'row', paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border.subtle },
    actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: spacing.xl },
    actionCount: { fontSize: typography.fontSize.sm, color: colors.text.secondary, marginLeft: spacing.xs },

    commentsHeader: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border.subtle,
    },
    commentsTitle: { fontSize: typography.fontSize.lg, fontWeight: '700', color: colors.text.primary },
    commentsCount: { fontSize: typography.fontSize.sm, color: colors.text.muted, marginLeft: spacing.sm },
    noComments: { alignItems: 'center', paddingVertical: spacing.xl },
    noCommentsText: { fontSize: typography.fontSize.base, color: colors.text.muted },

    commentRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
    commentAvatar: { width: 32, height: 32, borderRadius: 16, marginTop: 4 },
    commentAvatarPlaceholder: { backgroundColor: colors.obsidian[500], alignItems: 'center', justifyContent: 'center' },
    commentAvatarInitial: { fontSize: 12, fontWeight: '700', color: colors.text.primary },
    commentContent: { flex: 1, marginLeft: spacing.sm },
    commentBubble: { backgroundColor: colors.surface.glassHover, borderRadius: 16, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    commentAuthor: { fontSize: typography.fontSize.sm, fontWeight: '600', color: colors.text.primary, marginBottom: 2 },
    commentText: { fontSize: typography.fontSize.sm, color: colors.text.secondary, lineHeight: 20 },
    commentMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginLeft: spacing.md, gap: spacing.md },
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
        maxHeight: 100, marginRight: spacing.sm,
    },
    sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
