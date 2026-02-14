// ============================================
// Conversation Detail Screen
// Real-time chat with socket.io, typing indicators, read receipts
// ============================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn, FadeInUp } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../stores';
import { apiFetch, API } from '../../lib/api';
import { socketManager, SocketMessage } from '../../lib/socket';
import { ScreenHeader, Avatar } from '../../components';
import { timeAgo } from '../../lib/utils';

// ============================================
// Types
// ============================================

interface Message {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
    status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

interface Participant {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    isOnline?: boolean;
}

// ============================================
// Date separator
// ============================================

function shouldShowDateSeparator(current: Message, previous?: Message): boolean {
    if (!previous) return true;
    const a = new Date(current.createdAt).toDateString();
    const b = new Date(previous.createdAt).toDateString();
    return a !== b;
}

function formatDateLabel(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const todayStr = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === todayStr) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

// ============================================
// Message Bubble
// ============================================

function MessageBubble({
    message,
    isOwn,
    showTail,
    c,
}: {
    message: Message;
    isOwn: boolean;
    showTail: boolean;
    c: Record<string, any>;
}) {
    const isFailed = message.status === 'failed';

    return (
        <View style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther]}>
            <View
                style={[
                    styles.bubble,
                    isOwn
                        ? [styles.bubbleOwn, { backgroundColor: c.gold[500] }, showTail && styles.bubbleOwnTail]
                        : [styles.bubbleOther, { backgroundColor: c.surface.glass }, showTail && styles.bubbleOtherTail],
                    isFailed && { opacity: 0.5 },
                ]}
            >
                <Text style={[styles.bubbleText, { color: isOwn ? c.text.inverse : c.text.primary }]}>
                    {message.content}
                </Text>
                <View style={styles.bubbleMeta}>
                    <Text style={[styles.bubbleTime, { color: isOwn ? 'rgba(255,255,255,0.6)' : c.text.muted }]}>
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {isOwn && (
                        <Ionicons
                            name={
                                message.status === 'read' ? 'checkmark-done'
                                    : message.status === 'delivered' ? 'checkmark-done'
                                    : message.status === 'sending' ? 'time-outline'
                                    : message.status === 'failed' ? 'alert-circle'
                                    : 'checkmark'
                            }
                            size={14}
                            color={
                                message.status === 'read' ? colors.azure[400]
                                    : message.status === 'failed' ? colors.coral[400]
                                    : isOwn ? 'rgba(255,255,255,0.5)' : c.text.muted
                            }
                        />
                    )}
                </View>
            </View>
            {isFailed && (
                <Text style={[styles.failedLabel, { color: colors.coral[400] }]}>Failed to send</Text>
            )}
        </View>
    );
}

// ============================================
// Typing Indicator
// ============================================

function TypingIndicator({ name, c }: { name: string; c: Record<string, any> }) {
    return (
        <Animated.View entering={FadeInUp.duration(200)} style={styles.typingRow}>
            <View style={[styles.typingBubble, { backgroundColor: c.surface.glass }]}>
                <View style={styles.typingDots}>
                    {[0, 1, 2].map((i) => (
                        <Animated.View
                            key={i}
                            entering={FadeIn.delay(i * 150).duration(300)}
                            style={[styles.typingDot, { backgroundColor: c.text.muted }]}
                        />
                    ))}
                </View>
            </View>
            <Text style={[styles.typingLabel, { color: c.text.muted }]}>
                {name} is typing...
            </Text>
        </Animated.View>
    );
}

// ============================================
// Main Screen
// ============================================

export default function ConversationScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors: c } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const user = useAuthStore((s) => s.user);

    const [messages, setMessages] = useState<Message[]>([]);
    const [participant, setParticipant] = useState<Participant | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [inputText, setInputText] = useState('');
    const [fetchError, setFetchError] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const localTypingRef = useRef(false);

    // ---- Load conversation data ----
    const loadConversation = useCallback(async () => {
        if (!id) return;
        setFetchError(false);
        try {
            const data = await apiFetch<any>(API.messages(id as string));
            setMessages(data?.messages || []);
            setParticipant(data?.participant || null);
        } catch {
            setFetchError(true);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadConversation();
    }, [loadConversation]);

    // ---- Socket.io: join room, listen for messages, typing, read receipts ----
    useEffect(() => {
        if (!id) return;
        const conversationId = id as string;

        socketManager.joinConversation(conversationId);

        const unsubMessage = socketManager.on('message:new', (msg: SocketMessage) => {
            if (msg.conversationId === conversationId) {
                setMessages((prev) => {
                    // Avoid duplicates
                    if (prev.some((m) => m.id === msg.id)) return prev;
                    return [...prev, {
                        id: msg.id,
                        content: msg.content,
                        senderId: msg.senderId,
                        createdAt: msg.createdAt,
                        status: 'delivered',
                    }];
                });
                // Auto-mark as read if from the other person
                if (msg.senderId !== user?.id) {
                    socketManager.markMessageRead(conversationId, msg.id);
                }
                // Scroll to bottom
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
            }
        });

        const unsubTypingStart = socketManager.on('typing:start', (data) => {
            if (data.conversationId === conversationId && data.userId !== user?.id) {
                setIsTyping(true);
            }
        });

        const unsubTypingStop = socketManager.on('typing:stop', (data) => {
            if (data.conversationId === conversationId && data.userId !== user?.id) {
                setIsTyping(false);
            }
        });

        const unsubRead = socketManager.on('message:read', (data) => {
            if (data.conversationId === conversationId && data.userId !== user?.id) {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.senderId === user?.id && m.status !== 'read'
                            ? { ...m, status: 'read' as const }
                            : m
                    )
                );
            }
        });

        return () => {
            unsubMessage();
            unsubTypingStart();
            unsubTypingStop();
            unsubRead();
            socketManager.leaveConversation(conversationId);
            // Stop typing if we were
            if (localTypingRef.current) {
                socketManager.stopTyping(conversationId);
            }
        };
    }, [id, user?.id]);

    // ---- Handle typing indicator emission ----
    const handleInputChange = useCallback((text: string) => {
        setInputText(text);
        if (!id) return;
        const conversationId = id as string;

        if (text.trim() && !localTypingRef.current) {
            localTypingRef.current = true;
            socketManager.startTyping(conversationId);
        }

        // Reset the stop-typing timer
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            if (localTypingRef.current) {
                localTypingRef.current = false;
                socketManager.stopTyping(conversationId);
            }
        }, 2000);

        if (!text.trim() && localTypingRef.current) {
            localTypingRef.current = false;
            socketManager.stopTyping(conversationId);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        }
    }, [id]);

    // Cleanup typing timeout
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, []);

    // ---- Send message via socket + API ----
    const handleSend = useCallback(async () => {
        const text = inputText.trim();
        if (!text || isSending || !id) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsSending(true);
        setInputText('');

        // Stop typing
        if (localTypingRef.current) {
            localTypingRef.current = false;
            socketManager.stopTyping(id as string);
        }

        // Optimistic add
        const tempId = `temp-${Date.now()}`;
        const tempMessage: Message = {
            id: tempId,
            content: text,
            senderId: user?.id || '',
            createdAt: new Date().toISOString(),
            status: 'sending',
        };
        setMessages((prev) => [...prev, tempMessage]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

        try {
            // Send via socket for real-time delivery
            socketManager.sendMessage({
                conversationId: id as string,
                content: text,
            });

            // Also persist via REST
            const data = await apiFetch<{ message: { id: string } }>(API.sendMessage(id as string), {
                method: 'POST',
                body: JSON.stringify({ content: text }),
            });

            // Replace temp message with real one
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === tempId
                        ? { ...m, id: data?.message?.id || tempId, status: 'sent' as const }
                        : m
                )
            );
        } catch {
            // Mark as failed
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === tempId ? { ...m, status: 'failed' as const } : m
                )
            );
        } finally {
            setIsSending(false);
        }
    }, [inputText, isSending, id, user?.id]);

    // ---- Render message with date separators ----
    const renderMessage = useCallback(
        ({ item, index }: { item: Message; index: number }) => {
            const prevMessage = index > 0 ? messages[index - 1] : undefined;
            const nextMessage = index < messages.length - 1 ? messages[index + 1] : undefined;
            const showDate = shouldShowDateSeparator(item, prevMessage);
            const showTail = !nextMessage || nextMessage.senderId !== item.senderId;
            const isRecent = index >= messages.length - 3;

            return (
                <View>
                    {showDate && (
                        <View style={styles.dateSeparator}>
                            <View style={[styles.dateLine, { backgroundColor: c.border.subtle }]} />
                            <Text style={[styles.dateLabel, { color: c.text.muted }]}>
                                {formatDateLabel(item.createdAt)}
                            </Text>
                            <View style={[styles.dateLine, { backgroundColor: c.border.subtle }]} />
                        </View>
                    )}
                    <Animated.View entering={isRecent ? FadeInDown.duration(150) : undefined}>
                        <MessageBubble
                            message={item}
                            isOwn={item.senderId === user?.id}
                            showTail={showTail}
                            c={c}
                        />
                    </Animated.View>
                </View>
            );
        },
        [c, user?.id, messages],
    );

    // ---- Header subtitle (online status) ----
    const headerSubtitle = participant?.isOnline ? 'Online' : undefined;

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <ScreenHeader
                title={participant?.displayName || 'Conversation'}
                rightElement={
                    <View style={styles.headerActions}>
                        {participant?.isOnline && (
                            <View style={styles.onlineIndicator}>
                                <View style={styles.onlineDot} />
                                <Text style={[styles.onlineText, { color: colors.emerald[500] }]}>Online</Text>
                            </View>
                        )}
                        <TouchableOpacity
                            style={styles.headerAction}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            accessibilityRole="button"
                            accessibilityLabel="Call"
                            onPress={() => {
                                if (participant) {
                                    router.push(`/call/${participant.id}?type=audio&name=${encodeURIComponent(participant.displayName)}&avatar=${encodeURIComponent(participant.avatarUrl || '')}` as any);
                                }
                            }}
                        >
                            <Ionicons name="call-outline" size={20} color={c.text.primary} />
                        </TouchableOpacity>
                    </View>
                }
            />

            {/* Messages */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
                keyboardVerticalOffset={0}
            >
                {isLoading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={c.gold[400]} />
                        <Text style={[styles.loadingText, { color: c.text.muted }]}>
                            Loading conversation...
                        </Text>
                    </View>
                ) : fetchError ? (
                    <View style={styles.centered}>
                        <Ionicons name="cloud-offline-outline" size={48} color={c.text.muted} />
                        <Text style={[styles.errorText, { color: c.text.secondary }]}>
                            Couldn't load messages
                        </Text>
                        <TouchableOpacity
                            style={[styles.retryBtn, { borderColor: c.border.default }]}
                            onPress={() => {
                                setIsLoading(true);
                                loadConversation();
                            }}
                        >
                            <Text style={[styles.retryText, { color: c.text.primary }]}>
                                Try Again
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            extraData={messages.length}
                            renderItem={renderMessage}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={[
                                styles.messagesList,
                                messages.length === 0 && styles.emptyList,
                                { paddingBottom: spacing.md },
                            ]}
                            showsVerticalScrollIndicator={false}
                            onContentSizeChange={() =>
                                flatListRef.current?.scrollToEnd({ animated: true })
                            }
                            ListEmptyComponent={
                                <View style={styles.centered}>
                                    <Animated.View entering={FadeIn.duration(400)}>
                                        <Ionicons
                                            name="chatbubble-ellipses-outline"
                                            size={48}
                                            color={c.text.muted + '40'}
                                        />
                                    </Animated.View>
                                    <Text style={[styles.emptyText, { color: c.text.muted }]}>
                                        No messages yet. Say hello!
                                    </Text>
                                </View>
                            }
                        />

                        {/* Typing indicator */}
                        {isTyping && participant && (
                            <TypingIndicator name={participant.displayName.split(' ')[0]} c={c} />
                        )}
                    </>
                )}

                {/* Input Bar */}
                <View
                    style={[
                        styles.inputBar,
                        {
                            paddingBottom: insets.bottom + spacing.xs,
                            borderTopColor: c.border.subtle,
                            backgroundColor: c.background,
                        },
                    ]}
                >
                    <View
                        style={[
                            styles.inputContainer,
                            { backgroundColor: c.surface.glass, borderColor: c.border.subtle },
                        ]}
                    >
                        <TextInput
                            style={[styles.textInput, { color: c.text.primary }]}
                            placeholder="Type a message..."
                            placeholderTextColor={c.text.muted}
                            value={inputText}
                            onChangeText={handleInputChange}
                            multiline
                            maxLength={2000}
                            returnKeyType="default"
                            accessibilityLabel="Message input"
                        />
                    </View>
                    <TouchableOpacity
                        style={[
                            styles.sendBtn,
                            {
                                backgroundColor: inputText.trim()
                                    ? c.gold[500]
                                    : c.surface.glass,
                            },
                        ]}
                        onPress={handleSend}
                        disabled={!inputText.trim() || isSending}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel="Send message"
                    >
                        {isSending ? (
                            <ActivityIndicator size="small" color={c.text.inverse} />
                        ) : (
                            <Ionicons
                                name="send"
                                size={18}
                                color={inputText.trim() ? c.text.inverse : c.text.muted}
                            />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
    container: { flex: 1 },
    flex: { flex: 1 },

    // Header
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    headerAction: { width: 40, alignItems: 'center' },
    onlineIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    onlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.emerald[500],
    },
    onlineText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
    },

    // Date separator
    dateSeparator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.md,
        paddingHorizontal: spacing.sm,
    },
    dateLine: {
        flex: 1,
        height: StyleSheet.hairlineWidth,
    },
    dateLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        marginHorizontal: spacing.md,
    },

    // Messages
    messagesList: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        flexGrow: 1,
    },
    emptyList: {
        flex: 1,
        justifyContent: 'center',
    },
    bubbleRow: {
        marginBottom: 2,
        maxWidth: '80%',
    },
    bubbleRowOwn: {
        alignSelf: 'flex-end',
    },
    bubbleRowOther: {
        alignSelf: 'flex-start',
    },
    bubble: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 18,
    },
    bubbleOwn: {
        borderBottomRightRadius: 18,
    },
    bubbleOwnTail: {
        borderBottomRightRadius: 4,
        marginBottom: spacing.xs,
    },
    bubbleOther: {
        borderBottomLeftRadius: 18,
    },
    bubbleOtherTail: {
        borderBottomLeftRadius: 4,
        marginBottom: spacing.xs,
    },
    bubbleText: {
        fontSize: typography.fontSize.md,
        lineHeight: 20,
    },
    bubbleMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
        marginTop: 2,
    },
    bubbleTime: {
        fontSize: 10,
    },
    failedLabel: {
        fontSize: typography.fontSize.xs,
        marginTop: 2,
        textAlign: 'right',
    },

    // Typing indicator
    typingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.xs,
        gap: spacing.sm,
    },
    typingBubble: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 18,
        borderBottomLeftRadius: 4,
    },
    typingDots: {
        flexDirection: 'row',
        gap: 4,
    },
    typingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        opacity: 0.5,
    },
    typingLabel: {
        fontSize: typography.fontSize.xs,
    },

    // States
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.xl,
    },
    loadingText: {
        fontSize: typography.fontSize.sm,
        marginTop: spacing.sm,
    },
    errorText: {
        fontSize: typography.fontSize.md,
        fontWeight: '500',
    },
    retryBtn: {
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        marginTop: spacing.sm,
    },
    retryText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
    },
    emptyText: {
        fontSize: typography.fontSize.sm,
        marginTop: spacing.sm,
        textAlign: 'center',
    },

    // Input Bar
    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
        gap: spacing.sm,
    },
    inputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-end',
        borderRadius: 22,
        borderWidth: 1,
        paddingHorizontal: spacing.md,
        paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
        minHeight: 44,
        maxHeight: 120,
    },
    textInput: {
        flex: 1,
        fontSize: typography.fontSize.md,
        paddingVertical: 2,
        maxHeight: 100,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
