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
    Image,
    Dimensions,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
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
import { apiFetch, API } from '../../lib/api';
import { useAuthStore } from '../../stores';
import { socketManager, SocketMessage, TypingEvent } from '../../lib/socket';
import { Avatar } from '../../components';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// Types
// ============================================

interface Message {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
    isRead?: boolean;
    status?: 'sending' | 'sent' | 'delivered' | 'read';
    mediaUrl?: string;
    mediaType?: string;
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
                    color="rgba(255,255,255,0.4)"
                />
            );
        case 'sent':
            return (
                <Ionicons
                    name="checkmark"
                    size={13}
                    color="rgba(255,255,255,0.5)"
                />
            );
        case 'delivered':
            return (
                <Ionicons
                    name="checkmark-done"
                    size={13}
                    color="rgba(255,255,255,0.5)"
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
}: {
    item: Message;
    isOwn: boolean;
    showTail: boolean;
    participant: ChatParticipant | null;
    formatTime: (ts: string) => string;
}) {
    const hasMedia = !!item.mediaUrl;
    const isImage = item.mediaType === 'IMAGE' || item.mediaType === 'image';

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
                <View style={styles.ownBubbleWrap}>
                    {/* Media */}
                    {hasMedia && isImage && (
                        <View style={styles.mediaBubble}>
                            <Image
                                source={{ uri: item.mediaUrl }}
                                style={styles.mediaImage}
                                resizeMode="cover"
                            />
                        </View>
                    )}

                    {/* Text bubble */}
                    {item.content ? (
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
                    ) : null}

                    {/* Meta row: time + read receipt */}
                    <View style={styles.ownMeta}>
                        <Text style={[styles.msgTime, styles.ownTime]}>
                            {formatTime(item.createdAt)}
                        </Text>
                        <ReadReceipt status={item.status} />
                    </View>
                </View>
            ) : (
                <View style={styles.otherBubbleWrap}>
                    {/* Media */}
                    {hasMedia && isImage && (
                        <View style={styles.mediaBubble}>
                            <Image
                                source={{ uri: item.mediaUrl }}
                                style={styles.mediaImage}
                                resizeMode="cover"
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
                </View>
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

    // Animated send button glow
    const sendGlow = useSharedValue(0);

    useEffect(() => {
        if (inputText.trim().length > 0) {
            sendGlow.value = withSpring(1, { damping: 12, stiffness: 150 });
        } else {
            sendGlow.value = withTiming(0, { duration: 200 });
        }
    }, [inputText]);

    const sendBtnAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(sendGlow.value, [0, 1], [0.85, 1], Extrapolation.CLAMP) }],
        opacity: interpolate(sendGlow.value, [0, 1], [0.5, 1], Extrapolation.CLAMP),
    }));

    // Refs
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTypingRef = useRef(false);

    // ============================================
    // Socket Connection & Event Handlers
    // ============================================

    useEffect(() => {
        if (!conversationId) return;

        // Join conversation room
        socketManager.joinConversation(conversationId);

        // Listen for new messages
        const unsubMessage = socketManager.on('message:new', (msg: SocketMessage) => {
            if (msg.conversationId !== conversationId) return;

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
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        });

        // Typing indicators
        const unsubTypingStart = socketManager.on(
            'typing:start',
            (data: TypingEvent) => {
                if (
                    data.conversationId === conversationId &&
                    data.userId !== user?.id
                ) {
                    setTypingUser(data.username);
                    setIsTyping(true);
                }
            }
        );

        const unsubTypingStop = socketManager.on(
            'typing:stop',
            (data: TypingEvent) => {
                if (
                    data.conversationId === conversationId &&
                    data.userId !== user?.id
                ) {
                    setIsTyping(false);
                    setTypingUser(null);
                }
            }
        );

        // Read receipts
        const unsubRead = socketManager.on(
            'message:read',
            (data: { userId: string; conversationId: string; messageId: string }) => {
                if (
                    data.conversationId === conversationId &&
                    data.userId !== user?.id
                ) {
                    setMessages((prev) =>
                        prev.map((m) => {
                            if (m.senderId === user?.id && !m.isRead) {
                                return { ...m, isRead: true, status: 'read' as const };
                            }
                            return m;
                        })
                    );
                }
            }
        );

        // Presence
        const unsubOnline = socketManager.on(
            'user:online',
            (data: { userId: string }) => {
                if (data.userId === participant?.id) setIsOnline(true);
            }
        );

        const unsubOffline = socketManager.on(
            'user:offline',
            (data: { userId: string }) => {
                if (data.userId === participant?.id) setIsOnline(false);
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
                // Silently handle — retry available via pull
            } finally {
                setIsLoading(false);
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
        if (!inputText.trim() || isSending || !conversationId) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const text = inputText.trim();
        setInputText('');

        // Stop typing indicator
        if (isTypingRef.current) {
            isTypingRef.current = false;
            socketManager.stopTyping(conversationId);
        }

        // Optimistic message
        const optimisticId = `temp-${Date.now()}`;
        const optimisticMsg: Message = {
            id: optimisticId,
            content: text,
            senderId: user?.id || 'me',
            createdAt: new Date().toISOString(),
            status: 'sending',
        };
        setMessages((prev) => [...prev, optimisticMsg]);

        // Scroll to bottom
        setTimeout(
            () => flatListRef.current?.scrollToEnd({ animated: true }),
            50
        );

        // Send via Socket for real-time
        socketManager.sendMessage({ conversationId, content: text });

        // Also send via REST for persistence
        setIsSending(true);
        try {
            const data = await apiFetch<any>(API.messages(conversationId), {
                method: 'POST',
                body: JSON.stringify({ content: text }),
            });

            const realMsg = data.message || data.data || data;
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === optimisticId
                        ? {
                              ...realMsg,
                              id: realMsg.id || optimisticId,
                              status: 'sent' as const,
                          }
                        : m
                )
            );
        } catch {
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === optimisticId
                        ? { ...m, status: 'sending' as const }
                        : m
                )
            );
        } finally {
            setIsSending(false);
        }
    }, [inputText, isSending, user?.id, conversationId]);

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
                />
            );
        },
        [user?.id, participant, formatTime, shouldShowTail]
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
                <View style={styles.inputWrapper}>
                    <TouchableOpacity
                        style={styles.attachBtn}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel="Add attachment"
                    >
                        <Ionicons
                            name="add-circle-outline"
                            size={24}
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

                    {inputText.trim() ? (
                        <TouchableOpacity
                            onPress={handleSend}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel="Send message"
                            disabled={isSending}
                        >
                            <Animated.View style={sendBtnAnimStyle}>
                                <LinearGradient
                                    colors={[colors.gold[400], colors.gold[600]]}
                                    style={styles.sendButton}
                                >
                                    {isSending ? (
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
});
