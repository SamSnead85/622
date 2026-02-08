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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '@zerog/ui';
import { apiFetch, API } from '../../lib/api';
import { useAuthStore } from '../../stores';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PostAuthor {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
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
                setPost(postData.post || postData.data || postData);
                const c = commentsData.comments || commentsData.data || [];
                setComments(Array.isArray(c) ? c : []);
            } catch {
                // handle error silently
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [postId]);

    const handleLike = useCallback(async () => {
        if (!post) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Optimistic toggle
        setPost((p) => p ? {
            ...p,
            isLiked: !p.isLiked,
            likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1,
        } : p);
        try {
            await apiFetch(API.like(post.id), {
                method: post.isLiked ? 'DELETE' : 'POST',
            });
        } catch {
            // Revert
            setPost((p) => p ? {
                ...p,
                isLiked: !p.isLiked,
                likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1,
            } : p);
        }
    }, [post]);

    const handleComment = useCallback(async () => {
        if (!commentText.trim() || isSending || !postId) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const text = commentText.trim();
        setCommentText('');
        setIsSending(true);

        // Optimistic comment
        const temp: Comment = {
            id: `temp-${Date.now()}`,
            content: text,
            createdAt: new Date().toISOString(),
            author: {
                id: user?.id || '',
                username: user?.username || '',
                displayName: user?.displayName || '',
                avatarUrl: user?.avatarUrl,
            },
            likesCount: 0,
        };
        setComments((prev) => [...prev, temp]);

        try {
            const data = await apiFetch<any>(API.comments(postId), {
                method: 'POST',
                body: JSON.stringify({ content: text }),
            });
            const real = data.comment || data.data || data;
            setComments((prev) => prev.map((c) => c.id === temp.id ? { ...real, id: real.id || temp.id } : c));
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
                <Text style={styles.errorText}>Post not found</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
                    <Text style={styles.backLinkText}>Go back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const renderHeader = () => (
        <View>
            {/* Post content */}
            <View style={styles.postSection}>
                {/* Author */}
                <TouchableOpacity style={styles.authorRow} onPress={() => router.push(`/profile/${post.author.username}`)}>
                    {post.author.avatarUrl ? (
                        <Image source={{ uri: post.author.avatarUrl }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarInitial}>
                                {(post.author.displayName || '?')[0].toUpperCase()}
                            </Text>
                        </View>
                    )}
                    <View style={styles.authorInfo}>
                        <Text style={styles.authorName}>{post.author.displayName}</Text>
                        <Text style={styles.postTime}>{timeAgo(post.createdAt)}</Text>
                    </View>
                </TouchableOpacity>

                {/* Content */}
                {post.content ? (
                    <Text style={styles.postContent}>{post.content}</Text>
                ) : null}

                {/* Media */}
                {post.mediaUrl && (
                    <View style={styles.mediaContainer}>
                        {post.mediaType === 'VIDEO' ? (
                            <View style={styles.videoContainer}>
                                <Image source={{ uri: post.mediaUrl }} style={styles.mediaImage} resizeMode="cover" />
                                <View style={styles.playOverlay}>
                                    <Text style={styles.playIcon}>▶</Text>
                                </View>
                            </View>
                        ) : (
                            <Image
                                source={{ uri: post.mediaUrl }}
                                style={[styles.mediaImage, post.mediaAspectRatio ? { aspectRatio: parseFloat(post.mediaAspectRatio) || 1.5 } : {}]}
                                resizeMode="cover"
                            />
                        )}
                    </View>
                )}

                {/* Actions */}
                <View style={styles.actionsBar}>
                    <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
                        <Text style={styles.actionIcon}>{post.isLiked ? '❤️' : '🤍'}</Text>
                        <Text style={styles.actionCount}>{post.likesCount}</Text>
                    </TouchableOpacity>
                    <View style={styles.actionBtn}>
                        <Text style={styles.actionIcon}>💬</Text>
                        <Text style={styles.actionCount}>{post.commentsCount}</Text>
                    </View>
                    <View style={styles.actionBtn}>
                        <Text style={styles.actionIcon}>↗️</Text>
                        <Text style={styles.actionCount}>{post.sharesCount}</Text>
                    </View>
                </View>
            </View>

            {/* Comments header */}
            <View style={styles.commentsHeader}>
                <Text style={styles.commentsTitle}>Comments</Text>
                <Text style={styles.commentsCount}>{comments.length}</Text>
            </View>
        </View>
    );

    const renderComment = ({ item }: { item: Comment }) => (
        <View style={styles.commentRow}>
            {item.author.avatarUrl ? (
                <Image source={{ uri: item.author.avatarUrl }} style={styles.commentAvatar} />
            ) : (
                <View style={[styles.commentAvatar, styles.commentAvatarPlaceholder]}>
                    <Text style={styles.commentAvatarInitial}>
                        {(item.author.displayName || '?')[0].toUpperCase()}
                    </Text>
                </View>
            )}
            <View style={styles.commentContent}>
                <View style={styles.commentBubble}>
                    <Text style={styles.commentAuthor}>{item.author.displayName}</Text>
                    <Text style={styles.commentText}>{item.content}</Text>
                </View>
                <Text style={styles.commentTime}>{timeAgo(item.createdAt)}</Text>
            </View>
        </View>
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Post</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Comments list with post as header */}
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

            {/* Comment input */}
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
                        <LinearGradient
                            colors={[colors.gold[400], colors.gold[600]]}
                            style={styles.sendBtn}
                        >
                            <Text style={styles.sendIcon}>↑</Text>
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
    errorText: { fontSize: typography.fontSize.lg, color: colors.text.muted, marginBottom: spacing.md },
    backLink: { paddingVertical: spacing.sm },
    backLinkText: { fontSize: typography.fontSize.base, color: colors.gold[500] },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    },
    backButton: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        alignItems: 'center', justifyContent: 'center',
    },
    backIcon: { fontSize: 20, color: colors.text.primary },
    headerTitle: { fontSize: 18, fontWeight: '600', color: colors.text.primary },

    // Post
    postSection: { padding: spacing.lg },
    authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    avatarPlaceholder: { backgroundColor: colors.obsidian[500], alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
    authorInfo: { marginLeft: spacing.md },
    authorName: { fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.primary },
    postTime: { fontSize: typography.fontSize.sm, color: colors.text.muted, marginTop: 2 },
    postContent: { fontSize: 16, color: colors.text.primary, lineHeight: 24, marginBottom: spacing.md },

    // Media
    mediaContainer: { borderRadius: 12, overflow: 'hidden', marginBottom: spacing.md },
    mediaImage: { width: '100%', aspectRatio: 1.5, backgroundColor: colors.obsidian[700] },
    videoContainer: { position: 'relative' },
    playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
    playIcon: { fontSize: 40, color: 'rgba(255,255,255,0.9)' },

    // Actions
    actionsBar: {
        flexDirection: 'row', paddingTop: spacing.sm,
        borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.06)',
    },
    actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: spacing.xl },
    actionIcon: { fontSize: 20 },
    actionCount: { fontSize: typography.fontSize.sm, color: colors.text.secondary, marginLeft: spacing.xs },

    // Comments
    commentsHeader: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.06)',
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
    commentBubble: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: 16,
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    },
    commentAuthor: { fontSize: typography.fontSize.sm, fontWeight: '600', color: colors.text.primary, marginBottom: 2 },
    commentText: { fontSize: typography.fontSize.sm, color: colors.text.secondary, lineHeight: 20 },
    commentTime: { fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: 4, marginLeft: spacing.md },

    // Comment input
    commentInput: {
        flexDirection: 'row', alignItems: 'flex-end',
        paddingHorizontal: spacing.lg, paddingTop: spacing.sm,
        borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.06)',
        backgroundColor: colors.obsidian[900],
    },
    commentTextInput: {
        flex: 1, fontSize: typography.fontSize.base, color: colors.text.primary,
        backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: 20,
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        maxHeight: 100, marginRight: spacing.sm,
    },
    sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    sendIcon: { fontSize: 18, fontWeight: '700', color: colors.obsidian[900] },
});
