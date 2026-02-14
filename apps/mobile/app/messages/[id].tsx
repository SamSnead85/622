// ============================================
// Conversation Detail Screen
// Chat with a specific user by conversation/participant ID
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
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
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { typography, spacing } from '@zerog/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../stores';
import { apiFetch, API } from '../../lib/api';

// ============================================
// Types
// ============================================

interface Message {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
}

interface Participant {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    isOnline?: boolean;
}

// ============================================
// Message Bubble
// ============================================

function MessageBubble({
    message,
    isOwn,
    colors: c,
}: {
    message: Message;
    isOwn: boolean;
    colors: Record<string, any>;
}) {
    return (
        <View
            style={[
                styles.bubbleRow,
                isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther,
            ]}
        >
            <View
                style={[
                    styles.bubble,
                    isOwn
                        ? [styles.bubbleOwn, { backgroundColor: c.gold[500] }]
                        : [styles.bubbleOther, { backgroundColor: c.surface.glass }],
                ]}
            >
                <Text
                    style={[
                        styles.bubbleText,
                        { color: isOwn ? '#FFFFFF' : c.text.primary },
                    ]}
                >
                    {message.content}
                </Text>
            </View>
        </View>
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
    const flatListRef = useRef<FlatList>(null);

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

    // ---- Send message ----
    const handleSend = useCallback(async () => {
        const text = inputText.trim();
        if (!text || isSending) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsSending(true);
        setInputText('');

        // Optimistic add
        const tempMessage: Message = {
            id: `temp-${Date.now()}`,
            content: text,
            senderId: user?.id || '',
            createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, tempMessage]);

        try {
            await apiFetch(API.messages(id as string), {
                method: 'POST',
                body: JSON.stringify({ content: text }),
            });
        } catch {
            // Remove optimistic message on failure
            setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
        } finally {
            setIsSending(false);
        }
    }, [inputText, isSending, id, user?.id]);

    // ---- Render message ----
    const renderMessage = useCallback(
        ({ item, index }: { item: Message; index: number }) => (
            <Animated.View entering={FadeInDown.delay(Math.min(index * 20, 200)).duration(200)}>
                <MessageBubble
                    message={item}
                    isOwn={item.senderId === user?.id}
                    colors={c}
                />
            </Animated.View>
        ),
        [c, user?.id],
    );

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            {/* Header */}
            <View
                style={[
                    styles.header,
                    { paddingTop: insets.top + 8, borderBottomColor: c.border.subtle },
                ]}
            >
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backBtn}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Ionicons name="chevron-back" size={24} color={c.text.primary} />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    {participant ? (
                        <>
                            <Text
                                style={[styles.headerName, { color: c.text.primary }]}
                                numberOfLines={1}
                            >
                                {participant.displayName}
                            </Text>
                            {participant.isOnline && (
                                <View style={styles.onlineDot} />
                            )}
                        </>
                    ) : (
                        <Text style={[styles.headerName, { color: c.text.primary }]}>
                            Conversation
                        </Text>
                    )}
                </View>

                <TouchableOpacity
                    style={styles.headerAction}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityRole="button"
                    accessibilityLabel="Call"
                >
                    <Ionicons name="call-outline" size={20} color={c.text.primary} />
                </TouchableOpacity>
            </View>

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
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={[
                            styles.messagesList,
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
                            onChangeText={setInputText}
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
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Ionicons
                                name="send"
                                size={18}
                                color={inputText.trim() ? '#FFFFFF' : c.text.muted}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backBtn: { width: 40, alignItems: 'center' },
    headerCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
    },
    headerName: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
    },
    headerAction: { width: 40, alignItems: 'center' },
    onlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981',
    },

    // Messages
    messagesList: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        flexGrow: 1,
        justifyContent: 'flex-end',
    },
    bubbleRow: {
        marginBottom: spacing.xs,
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
        paddingVertical: spacing.sm + 2,
        borderRadius: 18,
    },
    bubbleOwn: {
        borderBottomRightRadius: 4,
    },
    bubbleOther: {
        borderBottomLeftRadius: 4,
    },
    bubbleText: {
        fontSize: typography.fontSize.md,
        lineHeight: 20,
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
