// ============================================
// CommentsSheet — Instagram-style bottom sheet comments overlay
// Slides up over the feed, swipe down to dismiss.
// Supports nested replies, emoji quick-react, optimistic insert.
// ============================================

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Pressable,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    ActivityIndicator,
    Animated as RNAnimated,
    PanResponder,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '@zerog/ui';
import { useTheme } from '../contexts/ThemeContext';
import { useAuthStore } from '../stores';
import { apiFetch, API } from '../lib/api';
import { AVATAR_PLACEHOLDER } from '../lib/imagePlaceholder';
import { timeAgo } from '../lib/utils';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.72;
const DRAG_THRESHOLD = 80;

// ── Types ────────────────────────────────────────────

interface CommentAuthor {
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
    author: CommentAuthor;
    likesCount: number;
    isLiked?: boolean;
    parentId?: string | null;
    replies?: Comment[];
    repliesCount?: number;
}

interface CommentsSheetProps {
    postId: string | null;
    onClose: () => void;
    onCommentCountChange?: (postId: string, delta: number) => void;
}

// ── Emoji Quick-React Bar ────────────────────────────

const QUICK_EMOJIS = ['❤️', '🙌', '🔥', '👏', '😢', '😍', '😮', '😂'];

function EmojiBar({ onSelect }: { onSelect: (emoji: string) => void }) {
    const { colors: c } = useTheme();
    return (
        <View style={[emojiStyles.bar, { borderTopColor: c.border.subtle }]}>
            {QUICK_EMOJIS.map((emoji) => (
                <TouchableOpacity
                    key={emoji}
                    style={emojiStyles.btn}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onSelect(emoji);
                    }}
                    activeOpacity={0.6}
                >
                    <Text style={emojiStyles.emoji}>{emoji}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const emojiStyles = StyleSheet.create({
    bar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    btn: { padding: 4 },
    emoji: { fontSize: 24 },
});

// ── Nest flat comments into tree ─────────────────────

function nestComments(flat: Comment[]): Comment[] {
    const map = new Map<string, Comment>();
    const roots: Comment[] = [];
    flat.forEach((c) => map.set(c.id, { ...c, replies: [] }));
    map.forEach((c) => {
        if (c.parentId && map.has(c.parentId)) {
            map.get(c.parentId)!.replies!.push(c);
        } else {
            roots.push(c);
        }
    });
    return roots;
}

// ── Single Comment Row ───────────────────────────────

const CommentRow = memo(({
    comment,
    depth,
    onReply,
    onLike,
    postId,
}: {
    comment: Comment;
    depth: number;
    onReply: (comment: Comment) => void;
    onLike: (commentId: string) => void;
    postId: string;
}) => {
    const { colors: c } = useTheme();
    const indent = Math.min(depth, 2) * 36;

    return (
        <View style={{ paddingLeft: indent }}>
            <View style={commentStyles.row}>
                <Image
                    source={{ uri: comment.author.avatarUrl || undefined }}
                    style={commentStyles.avatar}
                    placeholder={AVATAR_PLACEHOLDER.blurhash}
                    transition={150}
                    cachePolicy="memory-disk"
                />
                <View style={commentStyles.body}>
                    <View style={commentStyles.nameRow}>
                        <Text style={[commentStyles.name, { color: c.text.primary }]}>
                            {comment.author.displayName || comment.author.username}
                        </Text>
                        {comment.author.isVerified && (
                            <Ionicons name="checkmark-circle" size={12} color={c.gold[500]} style={{ marginLeft: 3 }} />
                        )}
                        <Text style={[commentStyles.time, { color: c.text.muted }]}>
                            {timeAgo(comment.createdAt)}
                        </Text>
                    </View>
                    <Text style={[commentStyles.content, { color: c.text.primary }]}>
                        {comment.content}
                    </Text>
                    <View style={commentStyles.actions}>
                        <TouchableOpacity
                            onPress={() => onLike(comment.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Text style={[commentStyles.actionText, { color: c.text.muted }]}>
                                {comment.likesCount > 0 ? `${comment.likesCount} like${comment.likesCount > 1 ? 's' : ''}` : 'Like'}
                            </Text>
                        </TouchableOpacity>
                        {depth < 2 && (
                            <TouchableOpacity
                                onPress={() => onReply(comment)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Text style={[commentStyles.actionText, { color: c.text.muted }]}>Reply</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
                <TouchableOpacity
                    style={commentStyles.likeBtn}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onLike(comment.id);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons
                        name={comment.isLiked ? 'heart' : 'heart-outline'}
                        size={14}
                        color={comment.isLiked ? colors.coral[500] : c.text.muted}
                    />
                </TouchableOpacity>
            </View>
            {/* Nested replies */}
            {comment.replies?.map((reply) => (
                <CommentRow
                    key={reply.id}
                    comment={reply}
                    depth={depth + 1}
                    onReply={onReply}
                    onLike={onLike}
                    postId={postId}
                />
            ))}
        </View>
    );
});

const commentStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        paddingVertical: 10,
        paddingHorizontal: 16,
        alignItems: 'flex-start',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 10,
        marginTop: 2,
    },
    body: { flex: 1 },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2,
    },
    name: {
        fontSize: 13,
        fontWeight: '600',
        fontFamily: 'Inter-SemiBold',
    },
    time: {
        fontSize: 11,
        marginLeft: 6,
    },
    content: {
        fontSize: 14,
        lineHeight: 19,
        fontFamily: 'Inter-Regular',
    },
    actions: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 6,
    },
    actionText: {
        fontSize: 12,
        fontWeight: '600',
        fontFamily: 'Inter-SemiBold',
    },
    likeBtn: {
        paddingTop: 8,
        paddingLeft: 8,
    },
});

// ── Main CommentsSheet ───────────────────────────────

function CommentsSheet({ postId, onClose, onCommentCountChange }: CommentsSheetProps) {
    const { colors: c } = useTheme();
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);

    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [inputText, setInputText] = useState('');
    const [replyTo, setReplyTo] = useState<Comment | null>(null);
    const inputRef = useRef<TextInput>(null);
    const flatListRef = useRef<FlatList>(null);

    // ── Swipe-to-dismiss ─────────────────────────────
    const translateY = useRef(new RNAnimated.Value(0)).current;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, g) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
            onPanResponderMove: (_, g) => {
                if (g.dy > 0) translateY.setValue(g.dy);
            },
            onPanResponderRelease: (_, g) => {
                if (g.dy > DRAG_THRESHOLD) {
                    RNAnimated.timing(translateY, { toValue: SHEET_HEIGHT, duration: 200, useNativeDriver: true }).start(onClose);
                } else {
                    RNAnimated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
                }
            },
        })
    ).current;

    // ── Fetch comments ───────────────────────────────
    const fetchComments = useCallback(async () => {
        if (!postId) return;
        setIsLoading(true);
        try {
            const data = await apiFetch<{ comments: Comment[] }>(API.comments(postId));
            setComments(nestComments(data?.comments || []));
        } catch {
            // non-critical
        } finally {
            setIsLoading(false);
        }
    }, [postId]);

    useEffect(() => {
        if (postId) {
            translateY.setValue(0);
            setComments([]);
            setInputText('');
            setReplyTo(null);
            fetchComments();
        }
    }, [postId, fetchComments, translateY]);

    // ── Send comment ─────────────────────────────────
    const handleSend = useCallback(async () => {
        const text = inputText.trim();
        if (!text || !postId || isSending) return;
        setIsSending(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Optimistic insert
        const tempId = `temp-${Date.now()}`;
        const optimistic: Comment = {
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
            isLiked: false,
            parentId: replyTo?.id || null,
            replies: [],
        };

        if (replyTo) {
            // Insert as reply
            setComments((prev) =>
                prev.map((c) => {
                    if (c.id === replyTo.id) {
                        return { ...c, replies: [...(c.replies || []), optimistic] };
                    }
                    return c;
                })
            );
        } else {
            setComments((prev) => [optimistic, ...prev]);
        }

        setInputText('');
        setReplyTo(null);

        try {
            const body: Record<string, string> = { content: text };
            if (replyTo?.id) body.parentId = replyTo.id;
            await apiFetch(API.comments(postId), {
                method: 'POST',
                body: JSON.stringify(body),
            });
            onCommentCountChange?.(postId, 1);
            // Refresh to get server IDs
            fetchComments();
        } catch {
            // Remove optimistic on failure
            setComments((prev) => prev.filter((c) => c.id !== tempId));
        } finally {
            setIsSending(false);
        }
    }, [inputText, postId, isSending, replyTo, user, fetchComments, onCommentCountChange]);

    // ── Like comment ─────────────────────────────────
    const handleLike = useCallback(async (commentId: string) => {
        if (!postId) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Optimistic toggle
        const toggleLike = (list: Comment[]): Comment[] =>
            list.map((c) => {
                if (c.id === commentId) {
                    return {
                        ...c,
                        isLiked: !c.isLiked,
                        likesCount: c.isLiked ? Math.max(0, c.likesCount - 1) : c.likesCount + 1,
                    };
                }
                if (c.replies?.length) return { ...c, replies: toggleLike(c.replies) };
                return c;
            });

        setComments(toggleLike);

        try {
            const target = comments.flatMap(function flatten(c): Comment[] {
                return [c, ...(c.replies || []).flatMap(flatten)];
            }).find((c) => c.id === commentId);

            await apiFetch(API.commentLike(postId, commentId), {
                method: target?.isLiked ? 'DELETE' : 'POST',
            });
        } catch {
            // Revert on failure
            setComments(toggleLike);
        }
    }, [postId, comments]);

    // ── Reply handler ────────────────────────────────
    const handleReply = useCallback((comment: Comment) => {
        setReplyTo(comment);
        inputRef.current?.focus();
    }, []);

    // ── Emoji quick-react ────────────────────────────
    const handleEmojiSelect = useCallback((emoji: string) => {
        setInputText((prev) => prev + emoji);
        inputRef.current?.focus();
    }, []);

    if (!postId) return null;

    return (
        <Modal
            visible={!!postId}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                {/* Backdrop */}
                <Pressable style={styles.backdrop} onPress={onClose} />

                {/* Sheet */}
                <RNAnimated.View
                    style={[
                        styles.sheet,
                        {
                            height: SHEET_HEIGHT,
                            backgroundColor: c.background,
                            borderTopLeftRadius: 16,
                            borderTopRightRadius: 16,
                            paddingBottom: insets.bottom,
                            transform: [{ translateY }],
                        },
                    ]}
                    {...panResponder.panHandlers}
                >
                    {/* Drag handle */}
                    <View style={styles.handleBar}>
                        <View style={[styles.handle, { backgroundColor: c.text.muted + '40' }]} />
                    </View>

                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: c.border.subtle }]}>
                        <Text style={[styles.headerTitle, { color: c.text.primary }]}>Comments</Text>
                        <TouchableOpacity
                            style={styles.headerClose}
                            onPress={onClose}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                            <Ionicons name="paper-plane-outline" size={20} color={c.text.secondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Comment list */}
                    {isLoading ? (
                        <View style={styles.loadingWrap}>
                            <ActivityIndicator color={c.text.muted} />
                        </View>
                    ) : comments.length === 0 ? (
                        <View style={styles.emptyWrap}>
                            <Text style={[styles.emptyTitle, { color: c.text.primary }]}>No comments yet</Text>
                            <Text style={[styles.emptySubtitle, { color: c.text.muted }]}>Start the conversation.</Text>
                        </View>
                    ) : (
                        <FlatList
                            ref={flatListRef}
                            data={comments}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <CommentRow
                                    comment={item}
                                    depth={0}
                                    onReply={handleReply}
                                    onLike={handleLike}
                                    postId={postId}
                                />
                            )}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 8 }}
                            keyboardShouldPersistTaps="handled"
                        />
                    )}

                    {/* Emoji bar */}
                    <EmojiBar onSelect={handleEmojiSelect} />

                    {/* Reply indicator */}
                    {replyTo && (
                        <View style={[styles.replyBar, { backgroundColor: c.surface.glass, borderTopColor: c.border.subtle }]}>
                            <Text style={[styles.replyText, { color: c.text.secondary }]}>
                                Replying to <Text style={{ fontWeight: '700', color: c.text.primary }}>{replyTo.author.displayName}</Text>
                            </Text>
                            <TouchableOpacity onPress={() => setReplyTo(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Ionicons name="close" size={16} color={c.text.muted} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Input */}
                    <View style={[styles.inputBar, { borderTopColor: c.border.subtle, backgroundColor: c.background }]}>
                        {user?.avatarUrl ? (
                            <Image
                                source={{ uri: user.avatarUrl }}
                                style={styles.inputAvatar}
                                placeholder={AVATAR_PLACEHOLDER.blurhash}
                                transition={100}
                                cachePolicy="memory-disk"
                            />
                        ) : (
                            <View style={[styles.inputAvatar, { backgroundColor: c.surface.glassHover, alignItems: 'center', justifyContent: 'center' }]}>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: c.text.primary }}>
                                    {(user?.displayName || '?')[0].toUpperCase()}
                                </Text>
                            </View>
                        )}
                        <TextInput
                            ref={inputRef}
                            style={[styles.input, { color: c.text.primary, backgroundColor: c.surface.glass }]}
                            placeholder={replyTo ? `Reply to ${replyTo.author.displayName}...` : 'Add a comment...'}
                            placeholderTextColor={c.text.muted}
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            maxLength={500}
                            returnKeyType="send"
                            onSubmitEditing={handleSend}
                            blurOnSubmit={false}
                        />
                        {inputText.trim().length > 0 && (
                            <TouchableOpacity
                                style={styles.sendBtn}
                                onPress={handleSend}
                                disabled={isSending}
                            >
                                {isSending ? (
                                    <ActivityIndicator size="small" color={c.gold[500]} />
                                ) : (
                                    <Text style={[styles.sendText, { color: c.gold[500] }]}>Post</Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                </RNAnimated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ── Styles ───────────────────────────────────────────

const styles = StyleSheet.create({
    keyboardView: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 16,
    },
    handleBar: {
        alignItems: 'center',
        paddingTop: 10,
        paddingBottom: 4,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        position: 'relative',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
    },
    headerClose: {
        position: 'absolute',
        right: 16,
    },
    loadingWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Inter-SemiBold',
    },
    emptySubtitle: {
        fontSize: 14,
    },
    replyBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    replyText: {
        fontSize: 13,
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
        gap: 8,
    },
    inputAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    input: {
        flex: 1,
        fontSize: 14,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        maxHeight: 80,
        fontFamily: 'Inter-Regular',
    },
    sendBtn: {
        paddingHorizontal: 4,
    },
    sendText: {
        fontSize: 14,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
    },
});

const MemoizedCommentsSheet = memo(CommentsSheet);
export { MemoizedCommentsSheet as CommentsSheet };
export default MemoizedCommentsSheet;
