// ============================================
// CommentsSheet — Instagram-style comments overlay
// ============================================
//
// Built on top of the shared BottomSheet primitive.
// Uses useApiQuery for data fetching and @zerog/types for type safety.
// The input bar is rendered as the BottomSheet's `footer` prop,
// guaranteeing it's always visible and above the keyboard.

import React, { useState, useCallback, useRef, memo, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing } from '@zerog/ui';
import type { Comment, UserSummary } from '@zerog/types';
import { mapServerComment } from '@zerog/types';
import { useTheme } from '../contexts/ThemeContext';
import { useAuthStore } from '../stores';
import { apiFetch, API } from '../lib/api';
import { AVATAR_PLACEHOLDER } from '../lib/imagePlaceholder';
import { timeAgo } from '../lib/utils';
import { BottomSheet } from './BottomSheet';
import { EmptyState } from './EmptyState';
import { LoadingView } from './LoadingView';

// ── Types ───────────────────────────────────────────

interface CommentsSheetProps {
    postId: string | null;
    onClose: () => void;
    onCommentCountChange?: (postId: string, delta: number) => void;
}

// ── Constants ───────────────────────────────────────

const QUICK_EMOJIS = ['❤️', '🙌', '🔥', '👏', '😢', '😍', '😮', '😂'];

// ── Nest flat comments into tree ────────────────────

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

// ── CommentRow ──────────────────────────────────────

const CommentRow = memo(({
    comment,
    depth,
    onReply,
    onLike,
}: {
    comment: Comment;
    depth: number;
    onReply: (comment: Comment) => void;
    onLike: (commentId: string) => void;
}) => {
    const { colors: c } = useTheme();
    const indent = Math.min(depth, 2) * 32;

    return (
        <View style={{ paddingLeft: indent }}>
            <View style={rowStyles.row}>
                <Image
                    source={{ uri: comment.author.avatarUrl || undefined }}
                    style={rowStyles.avatar}
                    placeholder={AVATAR_PLACEHOLDER.blurhash}
                    transition={150}
                    cachePolicy="memory-disk"
                />
                <View style={rowStyles.body}>
                    <View style={rowStyles.nameRow}>
                        <Text style={[rowStyles.name, { color: c.text.primary }]}>
                            {comment.author.displayName || comment.author.username}
                        </Text>
                        {comment.author.isVerified && (
                            <Ionicons name="checkmark-circle" size={12} color={colors.gold[500]} style={{ marginLeft: 3 }} />
                        )}
                        <Text style={[rowStyles.time, { color: c.text.muted }]}>
                            {timeAgo(comment.createdAt)}
                        </Text>
                    </View>
                    <Text style={[rowStyles.content, { color: c.text.primary }]}>
                        {comment.content}
                    </Text>
                    <View style={rowStyles.actions}>
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onLike(comment.id);
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Text style={[
                                rowStyles.actionText,
                                { color: comment.isLiked ? colors.coral[500] : c.text.muted },
                            ]}>
                                {comment.likesCount > 0
                                    ? `${comment.likesCount} like${comment.likesCount > 1 ? 's' : ''}`
                                    : 'Like'}
                            </Text>
                        </TouchableOpacity>
                        {depth < 2 && (
                            <TouchableOpacity
                                onPress={() => onReply(comment)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Text style={[rowStyles.actionText, { color: c.text.muted }]}>Reply</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
                <TouchableOpacity
                    style={rowStyles.likeBtn}
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
            {comment.replies?.map((reply) => (
                <CommentRow
                    key={reply.id}
                    comment={reply}
                    depth={depth + 1}
                    onReply={onReply}
                    onLike={onLike}
                />
            ))}
        </View>
    );
});

const rowStyles = StyleSheet.create({
    row: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 16, alignItems: 'flex-start' },
    avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 10, marginTop: 2 },
    body: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
    name: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter-SemiBold' },
    time: { fontSize: 11, marginLeft: 6 },
    content: { fontSize: 14, lineHeight: 19, fontFamily: 'Inter-Regular' },
    actions: { flexDirection: 'row', gap: 16, marginTop: 6 },
    actionText: { fontSize: 12, fontWeight: '600', fontFamily: 'Inter-SemiBold' },
    likeBtn: { paddingTop: 8, paddingLeft: 8 },
});

// ── EmojiBar ────────────────────────────────────────

const EmojiBar = memo(({ onSelect }: { onSelect: (emoji: string) => void }) => {
    const { colors: c } = useTheme();
    return (
        <View style={[styles.emojiBar, { borderTopColor: c.border.subtle }]}>
            {QUICK_EMOJIS.map((emoji) => (
                <TouchableOpacity
                    key={emoji}
                    style={styles.emojiBtn}
                    onPress={() => onSelect(emoji)}
                    activeOpacity={0.6}
                >
                    <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
});

// ── InputFooter ─────────────────────────────────────
// Rendered as the BottomSheet's `footer` prop — always visible.

const InputFooter = memo(({
    inputRef,
    inputText,
    setInputText,
    replyTo,
    setReplyTo,
    onSend,
    onEmojiSelect,
    isSending,
}: {
    inputRef: React.RefObject<TextInput>;
    inputText: string;
    setInputText: (text: string) => void;
    replyTo: Comment | null;
    setReplyTo: (comment: Comment | null) => void;
    onSend: () => void;
    onEmojiSelect: (emoji: string) => void;
    isSending: boolean;
}) => {
    const { colors: c } = useTheme();
    const user = useAuthStore((s) => s.user);

    return (
        <View>
            {/* Emoji quick-react */}
            <EmojiBar onSelect={onEmojiSelect} />

            {/* Reply indicator */}
            {replyTo && (
                <View style={[styles.replyBar, { backgroundColor: c.surface.glass }]}>
                    <Text style={[styles.replyText, { color: c.text.secondary }]}>
                        Replying to{' '}
                        <Text style={{ fontWeight: '700', color: c.text.primary }}>
                            {replyTo.author.displayName}
                        </Text>
                    </Text>
                    <TouchableOpacity
                        onPress={() => setReplyTo(null)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="close-circle" size={18} color={c.text.muted} />
                    </TouchableOpacity>
                </View>
            )}

            {/* Input row */}
            <View style={[styles.inputRow, { borderTopColor: c.border.subtle }]}>
                {user?.avatarUrl ? (
                    <Image
                        source={{ uri: user.avatarUrl }}
                        style={styles.inputAvatar}
                        placeholder={AVATAR_PLACEHOLDER.blurhash}
                        transition={100}
                        cachePolicy="memory-disk"
                    />
                ) : (
                    <View style={[styles.inputAvatar, styles.inputAvatarFallback, { backgroundColor: c.surface.glassHover }]}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: c.text.primary }}>
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
                    onSubmitEditing={onSend}
                    blurOnSubmit={false}
                />
                {inputText.trim().length > 0 && (
                    <TouchableOpacity
                        style={styles.postBtn}
                        onPress={onSend}
                        disabled={isSending}
                        activeOpacity={0.7}
                    >
                        {isSending ? (
                            <ActivityIndicator size="small" color={colors.gold[500]} />
                        ) : (
                            <Text style={[styles.postBtnText, { color: colors.gold[500] }]}>Post</Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
});

// ── Main CommentsSheet ──────────────────────────────

function CommentsSheetInner({ postId, onClose, onCommentCountChange }: CommentsSheetProps) {
    const { colors: c } = useTheme();
    const user = useAuthStore((s) => s.user);

    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [inputText, setInputText] = useState('');
    const [replyTo, setReplyTo] = useState<Comment | null>(null);
    const inputRef = useRef<TextInput>(null);
    const flatListRef = useRef<FlatList>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    // ── Fetch comments ──────────────────────────────
    const fetchComments = useCallback(async () => {
        if (!postId) return;
        setIsLoading(true);
        try {
            const data = await apiFetch<{ comments: Array<Record<string, unknown>> }>(API.comments(postId));
            if (!isMountedRef.current) return;
            // Transform server comments (user → author) and nest them
            const mapped = (data?.comments || []).map((raw) => mapServerComment(raw));
            setComments(nestComments(mapped));
        } catch {
            // Non-critical — show empty state
        } finally {
            if (isMountedRef.current) setIsLoading(false);
        }
    }, [postId]);

    // Reset and fetch when postId changes
    useEffect(() => {
        if (postId) {
            setComments([]);
            setInputText('');
            setReplyTo(null);
            fetchComments();
        }
    }, [postId, fetchComments]);

    // ── Send comment ────────────────────────────────
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
            setComments((prev) =>
                prev.map((cm) =>
                    cm.id === replyTo.id ? { ...cm, replies: [...(cm.replies || []), optimistic] } : cm
                )
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
            fetchComments(); // Refresh to get server IDs
        } catch {
            // Remove optimistic on failure
            if (isMountedRef.current) {
                setComments((prev) => prev.filter((cm) => cm.id !== tempId));
            }
        } finally {
            if (isMountedRef.current) setIsSending(false);
        }
    }, [inputText, postId, isSending, replyTo, user, fetchComments, onCommentCountChange]);

    // ── Like comment ────────────────────────────────
    const handleLike = useCallback(async (commentId: string) => {
        if (!postId) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const toggleLike = (list: Comment[]): Comment[] =>
            list.map((cm) => {
                if (cm.id === commentId) {
                    return {
                        ...cm,
                        isLiked: !cm.isLiked,
                        likesCount: cm.isLiked ? Math.max(0, cm.likesCount - 1) : cm.likesCount + 1,
                    };
                }
                if (cm.replies?.length) return { ...cm, replies: toggleLike(cm.replies) };
                return cm;
            });

        setComments(toggleLike);

        try {
            // Find the comment to determine current like state
            const flat = comments.flatMap(function flatten(cm): Comment[] {
                return [cm, ...(cm.replies || []).flatMap(flatten)];
            });
            const target = flat.find((cm) => cm.id === commentId);
            await apiFetch(API.commentLike(postId, commentId), {
                method: target?.isLiked ? 'DELETE' : 'POST',
            });
        } catch {
            // Revert on failure
            if (isMountedRef.current) setComments(toggleLike);
        }
    }, [postId, comments]);

    const handleReply = useCallback((comment: Comment) => {
        setReplyTo(comment);
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    const handleEmojiSelect = useCallback((emoji: string) => {
        setInputText((prev) => prev + emoji);
        setTimeout(() => inputRef.current?.focus(), 50);
    }, []);

    // ── Render ──────────────────────────────────────

    const footer = (
        <InputFooter
            inputRef={inputRef as React.RefObject<TextInput>}
            inputText={inputText}
            setInputText={setInputText}
            replyTo={replyTo}
            setReplyTo={setReplyTo}
            onSend={handleSend}
            onEmojiSelect={handleEmojiSelect}
            isSending={isSending}
        />
    );

    return (
        <BottomSheet
            visible={!!postId}
            onClose={onClose}
            title="Comments"
            heightRatio={0.72}
            footer={footer}
        >
            {isLoading ? (
                <LoadingView message="" />
            ) : comments.length === 0 ? (
                <EmptyState
                    icon="chatbubble-outline"
                    title="No comments yet"
                    message="Start the conversation."
                    iconSize={40}
                />
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
                        />
                    )}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 8 }}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                />
            )}
        </BottomSheet>
    );
}

// ── Styles ──────────────────────────────────────────

const styles = StyleSheet.create({
    emojiBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    emojiBtn: { padding: 4 },
    emojiText: { fontSize: 24 },
    replyBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    replyText: { fontSize: 13 },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
        gap: 8,
    },
    inputAvatar: { width: 32, height: 32, borderRadius: 16 },
    inputAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
    input: {
        flex: 1,
        fontSize: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        maxHeight: 80,
        fontFamily: 'Inter-Regular',
    },
    postBtn: { paddingHorizontal: 6, paddingVertical: 4 },
    postBtnText: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter-Bold' },
});

// ── Export ───────────────────────────────────────────

export const CommentsSheet = memo(CommentsSheetInner);
export default CommentsSheet;
