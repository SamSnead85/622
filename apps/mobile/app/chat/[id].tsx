import { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Image,
    ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '@zerog/ui';
import { apiFetch, API } from '../../lib/api';
import { useAuthStore } from '../../stores';

interface Message {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
    isRead?: boolean;
}

interface ChatParticipant {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    isOnline?: boolean;
}

export default function ChatScreen() {
    const router = useRouter();
    const { id: conversationId } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const flatListRef = useRef<FlatList>(null);

    const [messages, setMessages] = useState<Message[]>([]);
    const [participant, setParticipant] = useState<ChatParticipant | null>(null);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);

    // Load conversation messages
    useEffect(() => {
        if (!conversationId) return;

        const loadMessages = async () => {
            try {
                const data = await apiFetch<any>(API.messages(conversationId));
                const msgs = data.messages || data.data || [];
                setMessages(Array.isArray(msgs) ? msgs : []);

                if (data.participant) {
                    setParticipant(data.participant);
                } else if (data.participants) {
                    const other = data.participants.find((p: any) => p.id !== user?.id);
                    if (other) setParticipant(other);
                }
            } catch (err) {
                // Silently handle
            } finally {
                setIsLoading(false);
            }
        };

        loadMessages();
    }, [conversationId, user?.id]);

    const handleSend = useCallback(async () => {
        if (!inputText.trim() || isSending) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const text = inputText.trim();
        setInputText('');

        // Optimistic message
        const optimisticMsg: Message = {
            id: `temp-${Date.now()}`,
            content: text,
            senderId: user?.id || 'me',
            createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, optimisticMsg]);

        setIsSending(true);
        try {
            const data = await apiFetch<any>(API.messages(conversationId!), {
                method: 'POST',
                body: JSON.stringify({ content: text }),
            });

            // Replace optimistic with real message
            const realMsg = data.message || data.data || data;
            setMessages((prev) =>
                prev.map((m) => (m.id === optimisticMsg.id ? { ...realMsg, id: realMsg.id || optimisticMsg.id } : m))
            );
        } catch {
            // Mark failed — keep the optimistic message visible
        } finally {
            setIsSending(false);
        }

        // Scroll to bottom
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, [inputText, isSending, user?.id, conversationId]);

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderMessage = useCallback(({ item }: { item: Message }) => {
        const isOwn = item.senderId === user?.id;

        return (
            <View style={[styles.msgRow, isOwn ? styles.ownRow : styles.otherRow]}>
                {isOwn ? (
                    <LinearGradient
                        colors={[colors.gold[500], colors.gold[600]]}
                        style={[styles.msgBubble, styles.ownBubble]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Text style={[styles.msgText, styles.ownText]}>{item.content}</Text>
                        <Text style={[styles.msgTime, styles.ownTime]}>{formatTime(item.createdAt)}</Text>
                    </LinearGradient>
                ) : (
                    <View style={[styles.msgBubble, styles.otherBubble]}>
                        <Text style={styles.msgText}>{item.content}</Text>
                        <Text style={styles.msgTime}>{formatTime(item.createdAt)}</Text>
                    </View>
                )}
            </View>
        );
    }, [user?.id]);

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800]]}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>

                {participant && (
                    <View style={styles.userInfo}>
                        {participant.avatarUrl ? (
                            <Image source={{ uri: participant.avatarUrl }} style={styles.headerAvatar} />
                        ) : (
                            <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
                                <Text style={styles.headerAvatarInitial}>
                                    {(participant.displayName || '?')[0].toUpperCase()}
                                </Text>
                            </View>
                        )}
                        <View style={styles.userDetails}>
                            <Text style={styles.displayName}>{participant.displayName}</Text>
                            <Text style={styles.onlineStatus}>
                                {participant.isOnline ? 'Online' : 'Offline'}
                            </Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Messages */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.gold[500]} />
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
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                    ListEmptyComponent={
                        <View style={styles.emptyChat}>
                            <Text style={styles.emptyChatText}>No messages yet. Say hello!</Text>
                        </View>
                    }
                />
            )}

            {/* Input */}
            <View style={[styles.inputContainer, { paddingBottom: insets.bottom + spacing.md }]}>
                <View style={styles.inputWrapper}>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Message..."
                        placeholderTextColor={colors.text.muted}
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxLength={2000}
                        returnKeyType="send"
                        blurOnSubmit={false}
                        onSubmitEditing={handleSend}
                    />

                    {inputText.trim() ? (
                        <TouchableOpacity onPress={handleSend} activeOpacity={0.8}>
                            <LinearGradient
                                colors={[colors.gold[400], colors.gold[600]]}
                                style={styles.sendButton}
                            >
                                <Text style={styles.sendIcon}>↑</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.sendButtonPlaceholder} />
                    )}
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    },
    backButton: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
    },
    backIcon: { fontSize: 20, color: colors.text.primary },
    userInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    headerAvatar: { width: 40, height: 40, borderRadius: 20 },
    headerAvatarPlaceholder: {
        backgroundColor: colors.obsidian[500], alignItems: 'center', justifyContent: 'center',
    },
    headerAvatarInitial: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
    userDetails: { marginLeft: spacing.md },
    displayName: { fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.primary },
    onlineStatus: { fontSize: typography.fontSize.sm, color: colors.text.muted },

    // Loading
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    // Messages
    messagesList: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
    msgRow: { marginBottom: spacing.sm, maxWidth: '80%' },
    ownRow: { alignSelf: 'flex-end' },
    otherRow: { alignSelf: 'flex-start' },
    msgBubble: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: 20 },
    ownBubble: { borderBottomRightRadius: 4 },
    otherBubble: { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderBottomLeftRadius: 4 },
    msgText: { fontSize: typography.fontSize.base, color: colors.text.primary, lineHeight: 22 },
    ownText: { color: colors.obsidian[900] },
    msgTime: { fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs, alignSelf: 'flex-end' },
    ownTime: { color: 'rgba(10, 10, 11, 0.6)' },

    // Empty
    emptyChat: { alignItems: 'center', paddingTop: 80 },
    emptyChatText: { fontSize: typography.fontSize.base, color: colors.text.muted },

    // Input
    inputContainer: {
        paddingHorizontal: spacing.lg, paddingTop: spacing.md,
        borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.06)',
    },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'flex-end',
        backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: 24,
        paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
        borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    textInput: {
        flex: 1, fontSize: typography.fontSize.base, color: colors.text.primary,
        paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, maxHeight: 100,
    },
    sendButton: {
        width: 36, height: 36, borderRadius: 18,
        alignItems: 'center', justifyContent: 'center',
    },
    sendIcon: { fontSize: 18, fontWeight: '700', color: colors.obsidian[900] },
    sendButtonPlaceholder: { width: 36, height: 36 },
});
