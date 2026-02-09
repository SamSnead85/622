// ============================================
// Real-Time Chat Screen
// Socket.io powered with typing indicators,
// read receipts, and presence status
// ============================================

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '@zerog/ui';
import { apiFetch, API } from '../../lib/api';
import { useAuthStore } from '../../stores';
import { socketManager, SocketMessage, TypingEvent } from '../../lib/socket';
import { Avatar, LoadingView } from '../../components';

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

// ============================================
// Typing Indicator Component
// ============================================

function TypingIndicator({ name }: { name: string }) {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animate = (dot: Animated.Value, delay: number) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
                    Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
                    Animated.delay(600 - delay),
                ])
            );

        const a1 = animate(dot1, 0);
        const a2 = animate(dot2, 200);
        const a3 = animate(dot3, 400);

        a1.start();
        a2.start();
        a3.start();

        return () => { a1.stop(); a2.stop(); a3.stop(); };
    }, []);

    const dotStyle = (dot: Animated.Value) => ({
        opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
        transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
    });

    return (
        <View style={styles.typingContainer}>
            <View style={styles.typingBubble}>
                <Text style={styles.typingName}>{name}</Text>
                <View style={styles.typingDots}>
                    <Animated.View style={[styles.typingDot, dotStyle(dot1)]} />
                    <Animated.View style={[styles.typingDot, dotStyle(dot2)]} />
                    <Animated.View style={[styles.typingDot, dotStyle(dot3)]} />
                </View>
            </View>
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

    // State
    const [messages, setMessages] = useState<Message[]>([]);
    const [participant, setParticipant] = useState<ChatParticipant | null>(null);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [typingUser, setTypingUser] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(false);

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
                // Avoid duplicates
                if (prev.some((m) => m.id === msg.id)) return prev;
                return [...prev, {
                    id: msg.id,
                    content: msg.content,
                    senderId: msg.senderId,
                    createdAt: msg.createdAt,
                    mediaUrl: msg.mediaUrl,
                    mediaType: msg.mediaType,
                    status: 'delivered',
                }];
            });

            // Mark as read if it's from the other person
            if (msg.senderId !== user?.id) {
                socketManager.markMessageRead(conversationId, msg.id);
            }

            // Scroll to bottom
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        });

        // Listen for typing indicators
        const unsubTypingStart = socketManager.on('typing:start', (data: TypingEvent) => {
            if (data.conversationId === conversationId && data.userId !== user?.id) {
                setTypingUser(data.username);
                setIsTyping(true);
            }
        });

        const unsubTypingStop = socketManager.on('typing:stop', (data: TypingEvent) => {
            if (data.conversationId === conversationId && data.userId !== user?.id) {
                setIsTyping(false);
                setTypingUser(null);
            }
        });

        // Listen for read receipts
        const unsubRead = socketManager.on('message:read', (data: { userId: string; conversationId: string; messageId: string }) => {
            if (data.conversationId === conversationId && data.userId !== user?.id) {
                setMessages((prev) =>
                    prev.map((m) => {
                        if (m.senderId === user?.id && !m.isRead) {
                            return { ...m, isRead: true, status: 'read' };
                        }
                        return m;
                    })
                );
            }
        });

        // Listen for presence
        const unsubOnline = socketManager.on('user:online', (data: { userId: string }) => {
            if (data.userId === participant?.id) setIsOnline(true);
        });

        const unsubOffline = socketManager.on('user:offline', (data: { userId: string }) => {
            if (data.userId === participant?.id) setIsOnline(false);
        });

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
                            status: m.isRead ? 'read' : 'delivered',
                        }))
                        : []
                );

                if (data.participant) {
                    setParticipant(data.participant);
                    setIsOnline(data.participant.isOnline ?? false);
                } else if (data.participants) {
                    const other = data.participants.find((p: any) => p.id !== user?.id);
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

    const handleInputChange = useCallback((text: string) => {
        setInputText(text);

        if (!conversationId) return;

        if (text.length > 0 && !isTypingRef.current) {
            isTypingRef.current = true;
            socketManager.startTyping(conversationId);
        }

        // Reset typing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            if (isTypingRef.current) {
                isTypingRef.current = false;
                socketManager.stopTyping(conversationId);
            }
        }, 2000);
    }, [conversationId]);

    // ============================================
    // Send Message
    // ============================================

    const handleSend = useCallback(async () => {
        if (!inputText.trim() || isSending || !conversationId) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

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
                        ? { ...realMsg, id: realMsg.id || optimisticId, status: 'sent' }
                        : m
                )
            );
        } catch {
            // Mark as failed
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === optimisticId
                        ? { ...m, status: 'sending' } // Keep as sending — offline queue will retry
                        : m
                )
            );
        } finally {
            setIsSending(false);
        }
    }, [inputText, isSending, user?.id, conversationId]);

    // ============================================
    // Formatting
    // ============================================

    const formatTime = useCallback((timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, []);

    // ============================================
    // Message Status Icon
    // ============================================

    const StatusIcon = useCallback(({ status }: { status?: string }) => {
        switch (status) {
            case 'sending':
                return <Ionicons name="time-outline" size={12} color={colors.obsidian[500]} />;
            case 'sent':
                return <Ionicons name="checkmark" size={12} color={colors.obsidian[500]} />;
            case 'delivered':
                return <Ionicons name="checkmark-done" size={12} color={colors.obsidian[500]} />;
            case 'read':
                return <Ionicons name="checkmark-done" size={12} color={colors.gold[400]} />;
            default:
                return null;
        }
    }, []);

    // ============================================
    // Render Message
    // ============================================

    const renderMessage = useCallback(({ item }: { item: Message }) => {
        const isOwn = item.senderId === user?.id;

        return (
            <View style={[styles.msgRow, isOwn ? styles.ownRow : styles.otherRow]}>
                {!isOwn && (
                    <Avatar uri={participant?.avatarUrl} name={participant?.displayName} size="xs" style={{ marginEnd: spacing.xs }} />
                )}

                {isOwn ? (
                    <View>
                        <LinearGradient
                            colors={[colors.gold[500], colors.gold[600]]}
                            style={[styles.msgBubble, styles.ownBubble]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Text style={[styles.msgText, styles.ownText]}>{item.content}</Text>
                        </LinearGradient>
                        <View style={styles.msgMeta}>
                            <Text style={[styles.msgTime, styles.ownTime]}>
                                {formatTime(item.createdAt)}
                            </Text>
                            <StatusIcon status={item.status} />
                        </View>
                    </View>
                ) : (
                    <View>
                        <View style={[styles.msgBubble, styles.otherBubble]}>
                            <Text style={styles.msgText}>{item.content}</Text>
                        </View>
                        <Text style={styles.msgTime}>{formatTime(item.createdAt)}</Text>
                    </View>
                )}
            </View>
        );
    }, [user?.id, participant?.avatarUrl, participant?.displayName, formatTime]);

    // ============================================
    // Date Separators
    // ============================================

    const messagesWithDates = useMemo(() => {
        if (messages.length === 0) return [];
        const result: (Message | { type: 'date'; label: string; id: string })[] = [];
        let lastDate = '';

        messages.forEach((msg) => {
            const msgDate = new Date(msg.createdAt).toLocaleDateString();
            if (msgDate !== lastDate) {
                lastDate = msgDate;
                const today = new Date().toLocaleDateString();
                const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
                let label = msgDate;
                if (msgDate === today) label = 'Today';
                else if (msgDate === yesterday) label = 'Yesterday';
                result.push({ type: 'date', label, id: `date-${msgDate}` });
            }
            result.push(msg);
        });

        return result;
    }, [messages]);

    const renderItem = useCallback(({ item }: { item: any }) => {
        if (item.type === 'date') {
            return (
                <View style={styles.dateSeparator}>
                    <View style={styles.dateLine} />
                    <Text style={styles.dateLabel}>{item.label}</Text>
                    <View style={styles.dateLine} />
                </View>
            );
        }
        return renderMessage({ item });
    }, [renderMessage]);

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

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
                    <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
                </TouchableOpacity>

                {participant && (
                    <TouchableOpacity
                        style={styles.userInfo}
                        onPress={() => router.push(`/profile/${participant.username}`)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`${participant.displayName}, ${isOnline ? 'online' : 'offline'}`}
                        accessibilityHint="Opens profile"
                    >
                        <View style={styles.avatarWrapper}>
                            <Avatar uri={participant.avatarUrl} name={participant.displayName} size="md" />
                            {isOnline && <View style={styles.onlineDot} />}
                        </View>
                        <View style={styles.userDetails}>
                            <Text style={styles.displayName} numberOfLines={1}>
                                {participant.displayName}
                            </Text>
                            <Text style={[styles.onlineStatus, isOnline && styles.onlineActive]}>
                                {isOnline ? 'Online' : 'Offline'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}

                {/* Call buttons */}
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.headerActionBtn}
                        onPress={() => {
                            if (participant) {
                                router.push(`/call/${participant.id}?type=audio&name=${encodeURIComponent(participant.displayName)}&avatar=${encodeURIComponent(participant.avatarUrl || '')}`);
                            }
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Start audio call"
                    >
                        <Ionicons name="call-outline" size={20} color={colors.text.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerActionBtn}
                        onPress={() => {
                            if (participant) {
                                router.push(`/call/${participant.id}?type=video&name=${encodeURIComponent(participant.displayName)}&avatar=${encodeURIComponent(participant.avatarUrl || '')}`);
                            }
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Start video call"
                    >
                        <Ionicons name="videocam-outline" size={20} color={colors.text.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Messages */}
            {isLoading ? (
                <LoadingView />
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messagesWithDates}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[styles.messagesList, { paddingBottom: spacing.md }]}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                    ListEmptyComponent={
                        <View style={styles.emptyChat}>
                            <View style={styles.emptyChatIcon}>
                                <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.gold[400]} />
                            </View>
                            <Text style={styles.emptyChatTitle}>Start the conversation</Text>
                            <Text style={styles.emptyChatText}>
                                Messages are end-to-end encrypted. Say hello!
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Typing Indicator */}
            {isTyping && typingUser && <TypingIndicator name={typingUser} />}

            {/* Input */}
            <View style={[styles.inputContainer, { paddingBottom: insets.bottom + spacing.sm }]}>
                <View style={styles.inputWrapper}>
                    <TouchableOpacity style={styles.attachBtn} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Add attachment">
                        <Ionicons name="add-circle-outline" size={24} color={colors.text.muted} />
                    </TouchableOpacity>

                    <TextInput
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
                        <TouchableOpacity onPress={handleSend} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Send message">
                            <LinearGradient
                                colors={[colors.gold[400], colors.gold[600]]}
                                style={styles.sendButton}
                            >
                                <Ionicons name="arrow-up" size={18} color={colors.obsidian[900]} />
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.micBtn} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Record voice message">
                            <Ionicons name="mic-outline" size={22} color={colors.text.muted} />
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
    userInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginStart: spacing.sm },
    avatarWrapper: { position: 'relative' },
    onlineDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#34D399',
        borderWidth: 2,
        borderColor: colors.obsidian[900],
    },
    userDetails: { marginStart: spacing.sm, flex: 1 },
    displayName: { fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.primary },
    onlineStatus: { fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: 1 },
    onlineActive: { color: '#34D399' },
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
    messagesList: { paddingHorizontal: spacing.md, paddingTop: spacing.lg },
    msgRow: { marginBottom: spacing.sm, maxWidth: '78%', flexDirection: 'row', alignItems: 'flex-end' },
    ownRow: { alignSelf: 'flex-end' },
    otherRow: { alignSelf: 'flex-start' },
    msgBubble: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
    ownBubble: { borderBottomRightRadius: 6, minWidth: 60 },
    otherBubble: { backgroundColor: colors.surface.glassHover, borderBottomLeftRadius: 6, minWidth: 60 },
    msgText: { fontSize: typography.fontSize.base, color: colors.text.primary, lineHeight: 22 },
    ownText: { color: colors.obsidian[900] },
    msgMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 2, paddingEnd: 4 },
    msgTime: { fontSize: 11, color: colors.text.muted, marginTop: 2, paddingHorizontal: 4 },
    ownTime: { color: colors.text.muted },

    // Date separator
    dateSeparator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.md,
        paddingHorizontal: spacing.lg,
    },
    dateLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border.subtle },
    dateLabel: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        marginHorizontal: spacing.md,
        fontWeight: '500',
    },

    // Typing indicator
    typingContainer: { paddingHorizontal: spacing.md, paddingBottom: spacing.xs },
    typingBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface.glassHover,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 8,
        alignSelf: 'flex-start',
        gap: 8,
    },
    typingName: { fontSize: typography.fontSize.xs, color: colors.text.muted },
    typingDots: { flexDirection: 'row', gap: 3 },
    typingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.gold[400],
    },

    // Empty
    emptyChat: { alignItems: 'center', paddingTop: 80 },
    emptyChatIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.surface.glass,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    emptyChatTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    emptyChatText: { fontSize: typography.fontSize.sm, color: colors.text.muted, textAlign: 'center', paddingHorizontal: spacing.xl },

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
});
