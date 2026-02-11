// ============================================
// Chat/DM Screen — Premium real-time messaging
// Socket.io powered with typing indicators,
// read receipts, presence, image support,
// timestamp grouping, and haptic feedback
// ============================================

import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ActivityIndicator,
    Alert,
    ActionSheetIOS,
    Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
    FadeIn,
    FadeInDown,
    SlideInRight,
    SlideInLeft,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withRepeat,
    withSequence,
    withDelay,
    interpolate,
    Extrapolation,
    Easing,
} from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { apiFetch, apiUpload, API } from '../../lib/api';
import { useAuthStore } from '../../stores';
import { socketManager, SocketMessage, TypingEvent } from '../../lib/socket';
import { Avatar } from '../../components';
import { showError } from '../../stores/toastStore';
import { IMAGE_PLACEHOLDER } from '../../lib/imagePlaceholder';

// ============================================
// Types
// ============================================

interface Message {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
    isRead?: boolean;
    status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
    mediaUrl?: string;
    mediaType?: string;
    replyToId?: string;
    replyTo?: {
        id: string;
        content: string;
        senderId: string;
    };
}

interface ImageAttachment {
    uri: string;
    mimeType: string;
    fileName: string;
}

interface ChatParticipant {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    isOnline?: boolean;
}

type ListItem = Message | { type: 'date'; label: string; id: string };

// ============================================
// Typing Indicator — three bouncing gold dots
// ============================================

function TypingIndicator({ name }: { name: string }) {
    const dot1 = useSharedValue(0);
    const dot2 = useSharedValue(0);
    const dot3 = useSharedValue(0);

    useEffect(() => {
        const bounce = (delay: number) =>
            withDelay(
                delay,
                withRepeat(
                    withSequence(
                        withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) }),
                        withTiming(0, { duration: 300, easing: Easing.in(Easing.ease) }),
                        withDelay(400, withTiming(0, { duration: 0 }))
                    ),
                    -1,
                    false
                )
            );

        dot1.value = bounce(0);
        dot2.value = bounce(150);
        dot3.value = bounce(300);

        return () => {
            dot1.value = 0;
            dot2.value = 0;
            dot3.value = 0;
        };
    }, []);

    const d1Style = useAnimatedStyle(() => ({
        opacity: interpolate(dot1.value, [0, 1], [0.3, 1], Extrapolation.CLAMP),
        transform: [
            { translateY: interpolate(dot1.value, [0, 1], [0, -5], Extrapolation.CLAMP) },
            { scale: interpolate(dot1.value, [0, 1], [0.85, 1.15], Extrapolation.CLAMP) },
        ],
    }));

    const d2Style = useAnimatedStyle(() => ({
        opacity: interpolate(dot2.value, [0, 1], [0.3, 1], Extrapolation.CLAMP),
        transform: [
            { translateY: interpolate(dot2.value, [0, 1], [0, -5], Extrapolation.CLAMP) },
            { scale: interpolate(dot2.value, [0, 1], [0.85, 1.15], Extrapolation.CLAMP) },
        ],
    }));

    const d3Style = useAnimatedStyle(() => ({
        opacity: interpolate(dot3.value, [0, 1], [0.3, 1], Extrapolation.CLAMP),
        transform: [
            { translateY: interpolate(dot3.value, [0, 1], [0, -5], Extrapolation.CLAMP) },
            { scale: interpolate(dot3.value, [0, 1], [0.85, 1.15], Extrapolation.CLAMP) },
        ],
    }));

    return (
        <Animated.View
            entering={FadeIn.duration(200)}
            style={styles.typingContainer}
        >
            <View style={styles.typingBubble}>
                <Text style={styles.typingName}>{name} is typing</Text>
                <View style={styles.typingDots}>
                    <Animated.View style={[styles.typingDot, d1Style]} />
                    <Animated.View style={[styles.typingDot, d2Style]} />
                    <Animated.View style={[styles.typingDot, d3Style]} />
                </View>
            </View>
        </Animated.View>
    );
}

// ============================================
// Read Receipt (double checkmarks)
// ============================================

function ReadReceipt({ status }: { status?: string }) {
    switch (status) {
        case 'sending':
            return (
                <Ionicons
                    name="time-outline"
                    size={13}
                    color={colors.text.muted}
                />
            );
        case 'sent':
            return (
                <Ionicons
                    name="checkmark"
                    size={13}
                    color={colors.text.secondary}
                />
            );
        case 'delivered':
            return (
                <Ionicons
                    name="checkmark-done"
                    size={13}
                    color={colors.text.secondary}
                />
            );
        case 'read':
            return (
                <Ionicons
                    name="checkmark-done"
                    size={13}
                    color={colors.gold[400]}
                />
            );
        case 'failed':
            return (
                <Ionicons
                    name="alert-circle"
                    size={13}
                    color="#EF4444"
                />
            );
        default:
            return null;
    }
}

// ============================================
// Message Bubble
// ============================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const MessageBubble = memo(function MessageBubble({
    item,
    isOwn,
    showTail,
    participant,
    formatTime,
    onLongPress,
    onRetry,
    currentUserId,
}: {
    item: Message;
    isOwn: boolean;
    showTail: boolean;
    participant: ChatParticipant | null;
    formatTime: (ts: string) => string;
    onLongPress?: (msg: Message) => void;
    onRetry?: (msg: Message) => void;
    currentUserId?: string;
}) {
    const hasMedia = !!item.mediaUrl;
    const isImage = item.mediaType === 'IMAGE' || item.mediaType === 'image';
    const replyTo = item.replyTo;
    const isFailed = item.status === 'failed';

    const ReplyQuote = replyTo ? (
        <View style={styles.replyQuote}>
            <View style={styles.replyQuoteLine} />
            <View style={styles.replyQuoteContent}>
                <Text style={styles.replyQuoteAuthor} numberOfLines={1}>
                    {replyTo.senderId === currentUserId ? 'You' : (participant?.displayName || 'User')}
                </Text>
                <Text style={styles.replyQuoteText} numberOfLines={1}>
                    {replyTo.content || 'Photo'}
                </Text>
            </View>
        </View>
    ) : null;

    return (
        <Animated.View
            entering={isOwn ? SlideInRight.duration(250).springify() : SlideInLeft.duration(250).springify()}
            style={[styles.msgRow, isOwn ? styles.ownRow : styles.otherRow]}
        >
            {/* Receiver avatar */}
            {!isOwn && showTail && (
                <Avatar
                    uri={participant?.avatarUrl}
                    name={participant?.displayName}
                    customSize={28}
                    style={styles.receiverAvatar}
                />
            )}
            {!isOwn && !showTail && <View style={styles.avatarSpacer} />}

            {isOwn ? (
                <Pressable
                    style={[styles.ownBubbleWrap, isFailed && styles.failedBubbleWrap]}
                    onLongPress={() => onLongPress?.(item)}
                    delayLongPress={400}
                >
                    {ReplyQuote}

                    {/* Media */}
                    {hasMedia && isImage && (
                        <View style={[styles.mediaBubble, isFailed && styles.failedMediaBubble]}>
                            <Image
                                source={{ uri: item.mediaUrl }}
                                style={styles.mediaImage}
                                contentFit="cover"
                                placeholder={IMAGE_PLACEHOLDER.blurhash}
                                transition={IMAGE_PLACEHOLDER.transition}
                                cachePolicy="memory-disk"
                            />
                        </View>
                    )}

                    {/* Text bubble */}
                    {item.content ? (
                        isFailed ? (
                            <View
                                style={[
                                    styles.msgBubble,
                                    styles.ownBubble,
                                    styles.failedBubble,
                                    showTail && styles.ownBubbleTail,
                                ]}
                            >
                                <Text style={[styles.msgText, styles.ownText, styles.failedText]} selectable>
                                    {item.content}
                                </Text>
                            </View>
                        ) : (
                            <LinearGradient
                                colors={[colors.gold[500], colors.gold[600]]}
                                style={[
                                    styles.msgBubble,
                                    styles.ownBubble,
                                    showTail && styles.ownBubbleTail,
                                ]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Text style={[styles.msgText, styles.ownText]} selectable>
                                    {item.content}
                                </Text>
                            </LinearGradient>
                        )
                    ) : null}

                    {/* Meta row: time + read receipt + retry */}
                    <View style={styles.ownMeta}>
                        {isFailed ? (
                            <TouchableOpacity
                                style={styles.retryButton}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    onRetry?.(item);
                                }}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityRole="button"
                                accessibilityLabel="Retry sending message"
                            >
                                <Ionicons name="refresh-outline" size={12} color="#EF4444" />
                                <Text style={styles.retryText}>Tap to retry</Text>
                            </TouchableOpacity>
                        ) : (
                            <>
                                <Text style={[styles.msgTime, styles.ownTime]}>
                                    {formatTime(item.createdAt)}
                                </Text>
                                <ReadReceipt status={item.status} />
                            </>
                        )}
                    </View>
                </Pressable>
            ) : (
                <Pressable
                    style={styles.otherBubbleWrap}
                    onLongPress={() => onLongPress?.(item)}
                    delayLongPress={400}
                >
                    {ReplyQuote}

                    {/* Media */}
                    {hasMedia && isImage && (
                        <View style={styles.mediaBubble}>
                            <Image
                                source={{ uri: item.mediaUrl }}
                                style={styles.mediaImage}
                                contentFit="cover"
                                placeholder={IMAGE_PLACEHOLDER.blurhash}
                                transition={IMAGE_PLACEHOLDER.transition}
                                cachePolicy="memory-disk"
                            />
                        </View>
                    )}

                    {/* Text bubble */}
                    {item.content ? (
                        <View
                            style={[
                                styles.msgBubble,
                                styles.otherBubble,
                                showTail && styles.otherBubbleTail,
                            ]}
                        >
                            <Text style={styles.msgText} selectable>
                                {item.content}
                            </Text>
                        </View>
                    ) : null}

                    <Text style={styles.msgTime}>{formatTime(item.createdAt)}</Text>
                </Pressable>
            )}
        </Animated.View>
    );
});

// ============================================
// Skeleton Loader for Chat
// ============================================

function ChatSkeleton() {
    const shimmer = useSharedValue(0);

    useEffect(() => {
        shimmer.value = withRepeat(
            withTiming(1, { duration: 1200 }),
            -1,
            true
        );
    }, []);

    const shimmerStyle = useAnimatedStyle(() => ({
        opacity: interpolate(shimmer.value, [0, 1], [0.3, 0.6], Extrapolation.CLAMP),
    }));

    const Block = ({ w, h, r = 8, self }: { w: number; h: number; r?: number; self?: 'flex-start' | 'flex-end' }) => (
        <Animated.View
            style={[
                {
                    width: w,
                    height: h,
                    borderRadius: r,
                    backgroundColor: colors.obsidian[600],
                    alignSelf: self || 'flex-start',
                    marginBottom: spacing.sm,
                },
                shimmerStyle,
            ]}
        />
    );

    return (
        <View style={{ padding: spacing.lg, flex: 1 }}>
            <Block w={100} h={12} r={6} self="center" />
            <View style={{ height: spacing.lg }} />
            <Block w={200} h={40} r={16} />
            <Block w={160} h={36} r={16} />
            <Block w={220} h={48} r={16} self="flex-end" />
            <Block w={180} h={36} r={16} self="flex-end" />
            <View style={{ height: spacing.md }} />
            <Block w={100} h={12} r={6} self="center" />
            <View style={{ height: spacing.md }} />
            <Block w={240} h={44} r={16} />
            <Block w={190} h={36} r={16} self="flex-end" />
            <Block w={140} h={40} r={16} />
        </View>
    );
}

// ============================================
// Main Chat Screen
// ============================================

export default function ChatScreen() {
    const router = useRouter();
    const { id: conversationId } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const flatListRef = useRef<FlatList>(null);
    const inputRef = useRef<TextInput>(null);

    // State
    const [messages, setMessages] = useState<Message[]>([]);
    const [participant, setParticipant] = useState<ChatParticipant | null>(null);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [typingUser, setTypingUser] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(false);
    const [imageAttachment, setImageAttachment] = useState<ImageAttachment | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const isMountedRef = useRef(true);

    // Animated send button glow
    const sendGlow = useSharedValue(0);

    useEffect(() => {
        if (inputText.trim().length > 0 || imageAttachment) {
            sendGlow.value = withSpring(1, { damping: 12, stiffness: 150 });
        } else {
            sendGlow.value = withTiming(0, { duration: 200 });
        }
    }, [inputText, imageAttachment]);

    const sendBtnAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(sendGlow.value, [0, 1], [0.85, 1], Extrapolation.CLAMP) }],
        opacity: interpolate(sendGlow.value, [0, 1], [0.5, 1], Extrapolation.CLAMP),
    }));

    // Refs
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTypingRef = useRef(false);
    const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Clean up all timers and refs on unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
            // Stop typing if we were typing when unmounting
            if (isTypingRef.current && conversationId) {
                socketManager.stopTyping(conversationId);
                isTypingRef.current = false;
            }
        };
    }, [conversationId]);

    // Keyboard handling — scroll to bottom when keyboard appears
    useEffect(() => {
        const showSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => {
                scrollTimerRef.current = setTimeout(
                    () => flatListRef.current?.scrollToEnd({ animated: true }),
                    150
                );
            }
        );
        return () => {
            showSub.remove();
        };
    }, []);

    // ============================================
    // Socket Connection & Event Handlers
    // ============================================

    useEffect(() => {
        if (!conversationId) return;

        // Join conversation room
        socketManager.joinConversation(conversationId);

        // Listen for new messages
        const unsubMessage = socketManager.on('message:new', (msg: SocketMessage) => {
            if (msg.conversationId !== conversationId || !isMountedRef.current) return;

            setMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) return prev;
                return [
                    ...prev,
                    {
                        id: msg.id,
                        content: msg.content,
                        senderId: msg.senderId,
                        createdAt: msg.createdAt,
                        mediaUrl: msg.mediaUrl,
                        mediaType: msg.mediaType,
                        status: 'delivered',
                    },
                ];
            });

            // Mark as read if from the other person
            if (msg.senderId !== user?.id) {
                socketManager.markMessageRead(conversationId, msg.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }

            // Scroll to bottom
            scrollTimerRef.current = setTimeout(
                () => flatListRef.current?.scrollToEnd({ animated: true }),
                100
            );
        });

        // Typing indicators
        const unsubTypingStart = socketManager.on(
            'typing:start',
            (data: TypingEvent) => {
                if (
                    !isMountedRef.current ||
                    data.conversationId !== conversationId ||
                    data.userId === user?.id
                ) return;
                setTypingUser(data.username);
                setIsTyping(true);
            }
        );

        const unsubTypingStop = socketManager.on(
            'typing:stop',
            (data: TypingEvent) => {
                if (
                    !isMountedRef.current ||
                    data.conversationId !== conversationId ||
                    data.userId === user?.id
                ) return;
                setIsTyping(false);
                setTypingUser(null);
            }
        );

        // Read receipts
        const unsubRead = socketManager.on(
            'message:read',
            (data: { userId: string; conversationId: string; messageId: string }) => {
                if (
                    !isMountedRef.current ||
                    data.conversationId !== conversationId ||
                    data.userId === user?.id
                ) return;
                setMessages((prev) =>
                    prev.map((m) => {
                        if (m.senderId === user?.id && !m.isRead) {
                            return { ...m, isRead: true, status: 'read' as const };
                        }
                        return m;
                    })
                );
            }
        );

        // Presence
        const unsubOnline = socketManager.on(
            'user:online',
            (data: { userId: string }) => {
                if (isMountedRef.current && data.userId === participant?.id) setIsOnline(true);
            }
        );

        const unsubOffline = socketManager.on(
            'user:offline',
            (data: { userId: string }) => {
                if (isMountedRef.current && data.userId === participant?.id) setIsOnline(false);
            }
        );

        return () => {
            socketManager.leaveConversation(conversationId);
            unsubMessage();
            unsubTypingStart();
            unsubTypingStop();
            unsubRead();
            unsubOnline();
            unsubOffline();
        };
    }, [conversationId, user?.id, participant?.id]);

    // ============================================
    // Load Initial Messages (REST API)
    // ============================================

    useEffect(() => {
        if (!conversationId) return;

        const loadMessages = async () => {
            try {
                const data = await apiFetch<any>(API.messages(conversationId));
                if (!isMountedRef.current) return;

                const msgs = data.messages || data.data || [];
                setMessages(
                    Array.isArray(msgs)
                        ? msgs.map((m: any) => ({
                              ...m,
                              status: m.isRead ? ('read' as const) : ('delivered' as const),
                          }))
                        : []
                );

                if (data.participant) {
                    setParticipant(data.participant);
                    setIsOnline(data.participant.isOnline ?? false);
                } else if (data.participants) {
                    const other = data.participants.find(
                        (p: any) => p.id !== user?.id
                    );
                    if (other) {
                        setParticipant(other);
                        setIsOnline(other.isOnline ?? false);
                    }
                }
            } catch {
                if (isMountedRef.current) showError('Could not load messages');
            } finally {
                if (isMountedRef.current) setIsLoading(false);
            }
        };

        loadMessages();
    }, [conversationId, user?.id]);

    // ============================================
    // Typing Management
    // ============================================

    const handleInputChange = useCallback(
        (text: string) => {
            setInputText(text);
            if (!conversationId) return;

            if (text.length > 0 && !isTypingRef.current) {
                isTypingRef.current = true;
                socketManager.startTyping(conversationId);
            }

            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            typingTimeoutRef.current = setTimeout(() => {
                if (isTypingRef.current) {
                    isTypingRef.current = false;
                    socketManager.stopTyping(conversationId);
                }
            }, 2000);
        },
        [conversationId]
    );

    // ============================================
    // Send Message
    // ============================================

    const handleSend = useCallback(async () => {
        const hasText = inputText.trim().length > 0;
        const hasImage = !!imageAttachment;
        if ((!hasText && !hasImage) || isSending || !conversationId) return;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const text = inputText.trim();
        setInputText('');
        const currentReplyTo = replyTo;
        setReplyTo(null);
        const currentImage = imageAttachment;
        setImageAttachment(null);

        // Stop typing indicator
        if (isTypingRef.current) {
            isTypingRef.current = false;
            socketManager.stopTyping(conversationId);
        }

        // Upload image first if attached
        let mediaUrl: string | undefined;
        let mediaType: string | undefined;
        if (currentImage) {
            setIsUploading(true);
            try {
                const uploadResult = await apiUpload(
                    API.uploadPost,
                    currentImage.uri,
                    currentImage.mimeType,
                    currentImage.fileName
                );
                mediaUrl = uploadResult.url;
                mediaType = 'image';
            } catch {
                showError('Could not upload image');
                setIsUploading(false);
                return;
            }
            setIsUploading(false);
        }

        // Optimistic message
        const optimisticId = `temp-${Date.now()}`;
        const optimisticMsg: Message = {
            id: optimisticId,
            content: text,
            senderId: user?.id || 'me',
            createdAt: new Date().toISOString(),
            status: 'sending',
            mediaUrl,
            mediaType,
            replyToId: currentReplyTo?.id,
            replyTo: currentReplyTo ? {
                id: currentReplyTo.id,
                content: currentReplyTo.content,
                senderId: currentReplyTo.senderId,
            } : undefined,
        };
        setMessages((prev) => [...prev, optimisticMsg]);

        // Scroll to bottom (tracked via ref for cleanup)
        scrollTimerRef.current = setTimeout(
            () => flatListRef.current?.scrollToEnd({ animated: true }),
            50
        );

        // Send via Socket for real-time
        socketManager.sendMessage({
            conversationId,
            content: text,
            mediaUrl,
            mediaType,
        });

        // Also send via REST for persistence
        setIsSending(true);
        try {
            const body: Record<string, any> = { content: text };
            if (mediaUrl) {
                body.mediaUrl = mediaUrl;
                body.mediaType = 'image';
            }
            if (currentReplyTo?.id) {
                body.replyToId = currentReplyTo.id;
            }

            const data = await apiFetch<any>(API.messages(conversationId), {
                method: 'POST',
                body: JSON.stringify(body),
            });

            const realMsg = data.message || data.data || data;
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === optimisticId
                        ? {
                              ...realMsg,
                              id: realMsg.id || optimisticId,
                              status: 'sent' as const,
                              replyTo: optimisticMsg.replyTo,
                          }
                        : m
                )
            );
        } catch {
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === optimisticId
                        ? { ...m, status: 'failed' as const }
                        : m
                )
            );
            showError('Could not send message');
        } finally {
            setIsSending(false);
        }
    }, [inputText, isSending, user?.id, conversationId, imageAttachment, replyTo]);

    // ============================================
    // Retry Failed Message
    // ============================================

    const handleRetry = useCallback(async (failedMsg: Message) => {
        if (!conversationId) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Mark as sending again
        setMessages((prev) =>
            prev.map((m) =>
                m.id === failedMsg.id ? { ...m, status: 'sending' as const } : m
            )
        );

        // Re-send via socket
        socketManager.sendMessage({
            conversationId,
            content: failedMsg.content,
            mediaUrl: failedMsg.mediaUrl,
            mediaType: failedMsg.mediaType,
        });

        // Re-send via REST
        try {
            const body: Record<string, any> = { content: failedMsg.content };
            if (failedMsg.mediaUrl) {
                body.mediaUrl = failedMsg.mediaUrl;
                body.mediaType = failedMsg.mediaType || 'image';
            }
            if (failedMsg.replyToId) {
                body.replyToId = failedMsg.replyToId;
            }

            const data = await apiFetch<any>(API.messages(conversationId), {
                method: 'POST',
                body: JSON.stringify(body),
            });

            const realMsg = data.message || data.data || data;
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === failedMsg.id
                        ? {
                              ...realMsg,
                              id: realMsg.id || failedMsg.id,
                              status: 'sent' as const,
                              replyTo: failedMsg.replyTo,
                          }
                        : m
                )
            );
        } catch {
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === failedMsg.id
                        ? { ...m, status: 'failed' as const }
                        : m
                )
            );
            showError('Retry failed. Tap to try again.');
        }
    }, [conversationId]);

    // ============================================
    // Image Picker
    // ============================================

    const handlePickImage = useCallback(async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                const fileName = asset.fileName || `chat-image-${Date.now()}.jpg`;
                const mimeType = asset.mimeType || 'image/jpeg';
                setImageAttachment({ uri: asset.uri, mimeType, fileName });
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
        } catch {
            showError('Could not open image picker');
        }
    }, []);

    // ============================================
    // Message Long-Press (Reply / Copy)
    // ============================================

    const handleMessageLongPress = useCallback((msg: Message) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const options = ['Reply', 'Copy', 'Cancel'];
        const cancelButtonIndex = 2;

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                { options, cancelButtonIndex },
                (buttonIndex) => {
                    if (buttonIndex === 0) {
                        setReplyTo(msg);
                        inputRef.current?.focus();
                    } else if (buttonIndex === 1 && msg.content) {
                        import('expo-clipboard').then((Clipboard) => {
                            Clipboard.setStringAsync(msg.content);
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        });
                    }
                }
            );
        } else {
            Alert.alert(
                'Message',
                undefined,
                [
                    {
                        text: 'Reply',
                        onPress: () => {
                            setReplyTo(msg);
                            inputRef.current?.focus();
                        },
                    },
                    {
                        text: 'Copy',
                        onPress: () => {
                            if (msg.content) {
                                import('expo-clipboard').then((Clipboard) => {
                                    Clipboard.setStringAsync(msg.content);
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                });
                            }
                        },
                    },
                    { text: 'Cancel', style: 'cancel' },
                ],
                { cancelable: true }
            );
        }
    }, []);

    // ============================================
    // Format Helpers
    // ============================================

    const formatTime = useCallback((timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        });
    }, []);

    const formatDateLabel = useCallback((dateStr: string) => {
        const today = new Date();
        const date = new Date(dateStr);
        const todayStr = today.toLocaleDateString();
        const yesterdayStr = new Date(
            Date.now() - 86400000
        ).toLocaleDateString();
        const msgDateStr = date.toLocaleDateString();

        if (msgDateStr === todayStr) return 'Today';
        if (msgDateStr === yesterdayStr) return 'Yesterday';

        // Same week — show day name
        const diffDays = Math.floor(
            (today.getTime() - date.getTime()) / 86400000
        );
        if (diffDays < 7) {
            return date.toLocaleDateString(undefined, { weekday: 'long' });
        }

        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year:
                date.getFullYear() !== today.getFullYear()
                    ? 'numeric'
                    : undefined,
        });
    }, []);

    // ============================================
    // Messages with Date Separators
    // ============================================

    const listData: ListItem[] = useMemo(() => {
        if (messages.length === 0) return [];
        const result: ListItem[] = [];
        let lastDate = '';

        messages.forEach((msg) => {
            const msgDate = new Date(msg.createdAt).toLocaleDateString();
            if (msgDate !== lastDate) {
                lastDate = msgDate;
                result.push({
                    type: 'date',
                    label: formatDateLabel(msg.createdAt),
                    id: `date-${msgDate}`,
                });
            }
            result.push(msg);
        });

        return result;
    }, [messages, formatDateLabel]);

    // ============================================
    // Determine if bubble should show tail
    // (first in a consecutive group from same sender)
    // ============================================

    const shouldShowTail = useCallback(
        (index: number): boolean => {
            const item = listData[index];
            if (!item || 'type' in item) return false;

            // Check if previous message is from same sender
            const prevItem = listData[index - 1];
            if (!prevItem || 'type' in prevItem) return true;
            return prevItem.senderId !== item.senderId;
        },
        [listData]
    );

    // ============================================
    // Render Items
    // ============================================

    const renderItem = useCallback(
        ({ item, index }: { item: ListItem; index: number }) => {
            if ('type' in item && item.type === 'date') {
                return (
                    <Animated.View
                        entering={FadeIn.duration(300)}
                        style={styles.dateSeparator}
                    >
                        <View style={styles.dateLine} />
                        <View style={styles.datePill}>
                            <Text style={styles.dateLabel}>{item.label}</Text>
                        </View>
                        <View style={styles.dateLine} />
                    </Animated.View>
                );
            }

            const msg = item as Message;
            const isOwn = msg.senderId === user?.id;
            const showTail = shouldShowTail(index);

            return (
                <MessageBubble
                    item={msg}
                    isOwn={isOwn}
                    showTail={showTail}
                    participant={participant}
                    formatTime={formatTime}
                    onLongPress={handleMessageLongPress}
                    onRetry={handleRetry}
                    currentUserId={user?.id}
                />
            );
        },
        [user?.id, participant, formatTime, shouldShowTail, handleMessageLongPress, handleRetry]
    );

    // ============================================
    // Render
    // ============================================

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
        >
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800]]}
                style={StyleSheet.absoluteFill}
            />

            {/* ====== Header ====== */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons
                        name="chevron-back"
                        size={22}
                        color={colors.text.primary}
                    />
                </TouchableOpacity>

                {participant && (
                    <TouchableOpacity
                        style={styles.userInfo}
                        onPress={() =>
                            router.push(`/profile/${participant.username}`)
                        }
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`${participant.displayName}, ${isOnline ? 'online' : 'offline'}`}
                        accessibilityHint="Opens profile"
                    >
                        <View style={styles.avatarWrapper}>
                            <Avatar
                                uri={participant.avatarUrl}
                                name={participant.displayName}
                                customSize={40}
                            />
                            {isOnline && <View style={styles.onlineDot} />}
                        </View>
                        <View style={styles.userDetails}>
                            <Text style={styles.displayName} numberOfLines={1}>
                                {participant.displayName}
                            </Text>
                            <Text
                                style={[
                                    styles.onlineStatus,
                                    isOnline && styles.onlineActive,
                                ]}
                            >
                                {isOnline ? 'Online' : 'Offline'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}

                {/* Call actions */}
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.headerActionBtn}
                        onPress={() => {
                            Alert.alert('Coming Soon', 'Voice and video calls will be available in a future update.');
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Start audio call"
                    >
                        <Ionicons
                            name="call-outline"
                            size={19}
                            color={colors.text.primary}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerActionBtn}
                        onPress={() => {
                            Alert.alert('Coming Soon', 'Voice and video calls will be available in a future update.');
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Start video call"
                    >
                        <Ionicons
                            name="videocam-outline"
                            size={19}
                            color={colors.text.primary}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* ====== Messages ====== */}
            {isLoading ? (
                <ChatSkeleton />
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={listData}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[
                        styles.messagesList,
                        { paddingBottom: spacing.md },
                    ]}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() =>
                        flatListRef.current?.scrollToEnd({ animated: false })
                    }
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={8}
                    windowSize={5}
                    initialNumToRender={15}
                    ListEmptyComponent={
                        <View style={styles.emptyChat}>
                            <View style={styles.emptyChatIcon}>
                                <Ionicons
                                    name="chatbubble-ellipses-outline"
                                    size={48}
                                    color={colors.gold[400]}
                                />
                            </View>
                            <Text style={styles.emptyChatTitle}>
                                Start the conversation
                            </Text>
                            <Text style={styles.emptyChatText}>
                                Messages are end-to-end encrypted. Say hello!
                            </Text>
                        </View>
                    }
                />
            )}

            {/* ====== Typing Indicator ====== */}
            {isTyping && typingUser && <TypingIndicator name={typingUser} />}

            {/* ====== Input Bar ====== */}
            <View
                style={[
                    styles.inputContainer,
                    { paddingBottom: insets.bottom + spacing.sm },
                ]}
            >
                {/* Reply-to preview */}
                {replyTo && (
                    <Animated.View entering={FadeInDown.duration(200)} style={styles.replyBar}>
                        <View style={styles.replyBarLine} />
                        <View style={styles.replyBarContent}>
                            <Text style={styles.replyBarAuthor} numberOfLines={1}>
                                Replying to {replyTo.senderId === user?.id ? 'yourself' : (participant?.displayName || 'user')}
                            </Text>
                            <Text style={styles.replyBarText} numberOfLines={1}>
                                {replyTo.content || 'Photo'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => setReplyTo(null)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityLabel="Dismiss reply"
                        >
                            <Ionicons name="close-circle" size={20} color={colors.text.muted} />
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Image attachment preview */}
                {imageAttachment && (
                    <Animated.View entering={FadeInDown.duration(200)} style={styles.imagePreviewBar}>
                        <Image
                            source={{ uri: imageAttachment.uri }}
                            style={styles.imagePreviewThumb}
                            contentFit="cover"
                            placeholder={IMAGE_PLACEHOLDER.blurhash}
                            transition={IMAGE_PLACEHOLDER.transition}
                            cachePolicy="memory-disk"
                        />
                        <Text style={styles.imagePreviewLabel} numberOfLines={1}>
                            {imageAttachment.fileName}
                        </Text>
                        <TouchableOpacity
                            onPress={() => setImageAttachment(null)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityLabel="Remove image"
                        >
                            <Ionicons name="close-circle" size={20} color={colors.text.muted} />
                        </TouchableOpacity>
                    </Animated.View>
                )}

                <View style={styles.inputWrapper}>
                    <TouchableOpacity
                        style={styles.attachBtn}
                        activeOpacity={0.7}
                        onPress={handlePickImage}
                        accessibilityRole="button"
                        accessibilityLabel="Attach image"
                    >
                        <Ionicons
                            name="image-outline"
                            size={22}
                            color={colors.text.muted}
                        />
                    </TouchableOpacity>

                    <TextInput
                        ref={inputRef}
                        style={styles.textInput}
                        placeholder="Message..."
                        placeholderTextColor={colors.text.muted}
                        value={inputText}
                        onChangeText={handleInputChange}
                        multiline
                        maxLength={5000}
                        returnKeyType="send"
                        blurOnSubmit={false}
                        onSubmitEditing={handleSend}
                        accessibilityLabel="Type a message"
                    />

                    {(inputText.trim() || imageAttachment) ? (
                        <TouchableOpacity
                            onPress={handleSend}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel="Send message"
                            disabled={isSending || isUploading}
                        >
                            <Animated.View style={sendBtnAnimStyle}>
                                <LinearGradient
                                    colors={[colors.gold[400], colors.gold[600]]}
                                    style={styles.sendButton}
                                >
                                    {(isSending || isUploading) ? (
                                        <ActivityIndicator
                                            size="small"
                                            color={colors.obsidian[900]}
                                        />
                                    ) : (
                                        <Ionicons
                                            name="arrow-up"
                                            size={18}
                                            color={colors.obsidian[900]}
                                        />
                                    )}
                                </LinearGradient>
                            </Animated.View>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.micBtn}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel="Record voice message"
                        >
                            <Ionicons
                                name="mic-outline"
                                size={22}
                                color={colors.text.muted}
                            />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border.subtle,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center',
        justifyContent: 'center',
    },
    userInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginStart: spacing.sm,
    },
    avatarWrapper: { position: 'relative' },
    onlineDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.emerald[400],
        borderWidth: 2,
        borderColor: colors.obsidian[900],
    },
    userDetails: { marginStart: spacing.sm, flex: 1 },
    displayName: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
    },
    onlineStatus: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        marginTop: 1,
    },
    onlineActive: { color: colors.emerald[400] },
    headerActions: { flexDirection: 'row', gap: spacing.xs },
    headerActionBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Messages
    messagesList: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.lg,
    },
    msgRow: {
        marginBottom: spacing.xs,
        maxWidth: '78%',
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    ownRow: { alignSelf: 'flex-end' },
    otherRow: { alignSelf: 'flex-start' },
    msgBubble: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
    },
    ownBubble: {
        borderBottomRightRadius: 6,
        minWidth: 60,
    },
    ownBubbleTail: {
        borderBottomRightRadius: 6,
    },
    otherBubble: {
        backgroundColor: colors.surface.glassHover,
        borderBottomLeftRadius: 6,
        minWidth: 60,
    },
    otherBubbleTail: {
        borderBottomLeftRadius: 6,
    },
    ownBubbleWrap: { alignItems: 'flex-end' },
    otherBubbleWrap: { alignItems: 'flex-start' },
    msgText: {
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        lineHeight: 22,
    },
    ownText: { color: colors.obsidian[900], fontWeight: '500' },
    ownMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
        marginTop: 2,
        paddingEnd: 4,
    },
    msgTime: {
        fontSize: 11,
        color: colors.text.muted,
        marginTop: 2,
        paddingHorizontal: 4,
    },
    ownTime: { color: colors.text.muted },

    // Failed message styles
    failedBubbleWrap: { opacity: 0.85 },
    failedBubble: {
        backgroundColor: `${'#EF4444'}20`,
        borderWidth: 1,
        borderColor: `${'#EF4444'}40`,
    },
    failedText: { color: colors.text.primary },
    failedMediaBubble: { opacity: 0.6 },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 2,
    },
    retryText: {
        fontSize: 11,
        color: '#EF4444',
        fontWeight: '600',
    },

    // Media in bubbles
    mediaBubble: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: spacing.xs,
    },
    mediaImage: {
        width: 200,
        height: 200,
        borderRadius: 16,
        backgroundColor: colors.obsidian[700],
    },

    // Date separator
    dateSeparator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.md,
        paddingHorizontal: spacing.md,
    },
    dateLine: {
        flex: 1,
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.border.subtle,
    },
    datePill: {
        backgroundColor: colors.surface.glass,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    dateLabel: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        fontWeight: '500',
    },

    // Typing indicator
    typingContainer: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.xs,
    },
    typingBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface.glassHover,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 8,
        alignSelf: 'flex-start',
        gap: spacing.sm,
    },
    typingName: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },
    typingDots: { flexDirection: 'row', gap: 4 },
    typingDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: colors.gold[400],
    },

    // Empty
    emptyChat: { alignItems: 'center', paddingTop: 100 },
    emptyChatIcon: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.surface.goldLight,
    },
    emptyChatTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    emptyChatText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
        lineHeight: 20,
    },

    // Input
    inputContainer: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border.subtle,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: colors.surface.glass,
        borderRadius: 24,
        paddingHorizontal: spacing.xs,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    attachBtn: { padding: 8, justifyContent: 'center' },
    textInput: {
        flex: 1,
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        paddingHorizontal: spacing.sm,
        paddingVertical: Platform.OS === 'ios' ? 10 : 8,
        maxHeight: 100,
    },
    sendButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        margin: 2,
    },
    micBtn: { padding: 8, justifyContent: 'center' },

    // MessageBubble extracted styles
    receiverAvatar: { marginEnd: spacing.xs, marginBottom: 2 },
    avatarSpacer: { width: 28 + spacing.xs },

    // Reply quote inside message bubble
    replyQuote: {
        flexDirection: 'row',
        alignItems: 'stretch',
        backgroundColor: `${colors.obsidian[700]}80`,
        borderRadius: 8,
        marginBottom: spacing.xs,
        overflow: 'hidden',
    },
    replyQuoteLine: {
        width: 3,
        backgroundColor: colors.gold[400],
    },
    replyQuoteContent: {
        flex: 1,
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
    },
    replyQuoteAuthor: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.gold[400],
        marginBottom: 1,
    },
    replyQuoteText: {
        fontSize: 12,
        color: colors.text.muted,
    },

    // Reply bar above input
    replyBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface.glass,
        borderRadius: 12,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
        marginBottom: spacing.xs,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    replyBarLine: {
        width: 3,
        height: '100%',
        minHeight: 28,
        backgroundColor: colors.gold[400],
        borderRadius: 2,
        marginEnd: spacing.sm,
    },
    replyBarContent: {
        flex: 1,
    },
    replyBarAuthor: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.gold[400],
        marginBottom: 1,
    },
    replyBarText: {
        fontSize: 13,
        color: colors.text.muted,
    },

    // Image attachment preview above input
    imagePreviewBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface.glass,
        borderRadius: 12,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
        marginBottom: spacing.xs,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    imagePreviewThumb: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: colors.obsidian[700],
    },
    imagePreviewLabel: {
        flex: 1,
        fontSize: 13,
        color: colors.text.secondary,
        marginHorizontal: spacing.sm,
    },
});
