import { useState, useEffect, useRef, memo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Animated,
    TextInput,
    ActivityIndicator,
    RefreshControl,
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '@zerog/ui';
import { apiFetch, API } from '../../lib/api';

interface Conversation {
    id: string;
    participant: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
        isOnline?: boolean;
    };
    lastMessage?: {
        content: string;
        createdAt: string;
        senderId: string;
    };
    unreadCount: number;
}

const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
    return date.toLocaleDateString();
};

const ConversationItem = memo(({
    conversation,
    onPress,
    userId,
}: {
    conversation: Conversation;
    onPress: () => void;
    userId?: string;
}) => {
    const p = conversation.participant;

    return (
        <TouchableOpacity
            style={[
                styles.conversationItem,
                conversation.unreadCount > 0 && styles.unreadItem,
            ]}
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPress();
            }}
            activeOpacity={0.8}
        >
            {/* Avatar */}
            <View style={styles.avatarContainer}>
                {p.avatarUrl ? (
                    <Image source={{ uri: p.avatarUrl }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <Text style={styles.avatarInitial}>
                            {(p.displayName || p.username || '?')[0].toUpperCase()}
                        </Text>
                    </View>
                )}
                {p.isOnline && <View style={styles.onlineIndicator} />}
            </View>

            {/* Content */}
            <View style={styles.conversationContent}>
                <View style={styles.conversationHeader}>
                    <Text style={styles.displayName} numberOfLines={1}>
                        {p.displayName || p.username}
                    </Text>
                    {conversation.lastMessage && (
                        <Text style={[
                            styles.timestamp,
                            conversation.unreadCount > 0 && styles.timestampUnread,
                        ]}>
                            {formatTime(conversation.lastMessage.createdAt)}
                        </Text>
                    )}
                </View>

                <View style={styles.messagePreview}>
                    <Text
                        style={[
                            styles.lastMessage,
                            conversation.unreadCount > 0 && styles.lastMessageUnread,
                        ]}
                        numberOfLines={1}
                    >
                        {conversation.lastMessage
                            ? `${conversation.lastMessage.senderId === userId ? 'You: ' : ''}${conversation.lastMessage.content}`
                            : 'No messages yet'}
                    </Text>
                    {conversation.unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadCount}>
                                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
});

export default function MessagesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const loadConversations = async () => {
        try {
            const data = await apiFetch<any>(API.conversations);
            const convos = data.conversations || data.data || [];
            setConversations(Array.isArray(convos) ? convos : []);
        } catch (err) {
            // Silently handle — user might be offline
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        loadConversations();
    }, []);

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        loadConversations();
    }, []);

    const filteredConversations = searchQuery.trim()
        ? conversations.filter((conv) => {
            const q = searchQuery.toLowerCase();
            return (
                conv.participant.displayName?.toLowerCase().includes(q) ||
                conv.participant.username?.toLowerCase().includes(q)
            );
        })
        : conversations;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800]]}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.back();
                        }}
                    >
                        <Text style={styles.backIcon}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Messages</Text>
                    <TouchableOpacity style={styles.composeButton}>
                        <Text style={styles.composeIcon}>✏️</Text>
                    </TouchableOpacity>
                </View>

                {/* Search */}
                <View style={styles.searchContainer}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search messages..."
                        placeholderTextColor={colors.text.muted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {/* Conversations list */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.gold[500]} />
                </View>
            ) : (
                <FlatList
                    data={filteredConversations}
                    renderItem={({ item }) => (
                        <ConversationItem
                            conversation={item}
                            onPress={() => router.push(`/chat/${item.id}`)}
                        />
                    )}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[
                        styles.listContent,
                        { paddingBottom: insets.bottom + spacing.xl },
                    ]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            tintColor={colors.gold[500]}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyIcon}>💬</Text>
                            <Text style={styles.emptyTitle}>No messages yet</Text>
                            <Text style={styles.emptySubtitle}>
                                Start a conversation with someone in your community
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    header: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },
    backButton: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        alignItems: 'center', justifyContent: 'center',
    },
    backIcon: { fontSize: 20, color: colors.text.primary },
    headerTitle: {
        fontSize: 22, fontWeight: '700', color: colors.text.primary, letterSpacing: -0.5,
    },
    composeButton: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: colors.gold[500],
        alignItems: 'center', justifyContent: 'center',
    },
    composeIcon: { fontSize: 18 },
    searchContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    searchIcon: { fontSize: 16, marginRight: spacing.sm },
    searchInput: { flex: 1, fontSize: typography.fontSize.base, color: colors.text.primary },

    // Loading
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    // List
    listContent: { paddingTop: spacing.md },
    conversationItem: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    },
    unreadItem: { backgroundColor: 'rgba(212, 175, 55, 0.04)' },
    avatarContainer: { position: 'relative' },
    avatar: { width: 52, height: 52, borderRadius: 26 },
    avatarPlaceholder: {
        backgroundColor: colors.obsidian[500],
        alignItems: 'center', justifyContent: 'center',
    },
    avatarInitial: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
    onlineIndicator: {
        position: 'absolute', bottom: 0, right: 0,
        width: 14, height: 14, borderRadius: 7,
        backgroundColor: colors.emerald[500],
        borderWidth: 2, borderColor: colors.obsidian[900],
    },
    conversationContent: { flex: 1, marginLeft: spacing.md },
    conversationHeader: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 4,
    },
    displayName: {
        fontSize: typography.fontSize.base, fontWeight: '600',
        color: colors.text.primary, flex: 1, marginRight: spacing.sm,
    },
    timestamp: { fontSize: typography.fontSize.sm, color: colors.text.muted },
    timestampUnread: { color: colors.gold[500] },
    messagePreview: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    lastMessage: {
        flex: 1, fontSize: typography.fontSize.sm,
        color: colors.text.muted, marginRight: spacing.md,
    },
    lastMessageUnread: { color: colors.text.secondary, fontWeight: '500' },
    unreadBadge: {
        backgroundColor: colors.gold[500],
        paddingHorizontal: spacing.sm, paddingVertical: 2,
        borderRadius: 12, minWidth: 24, alignItems: 'center',
    },
    unreadCount: { fontSize: 11, fontWeight: '700', color: colors.obsidian[900] },

    // Empty
    emptyState: { alignItems: 'center', paddingTop: 100, paddingHorizontal: spacing['2xl'] },
    emptyIcon: { fontSize: 48, marginBottom: spacing.lg },
    emptyTitle: { fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.sm },
    emptySubtitle: { fontSize: typography.fontSize.base, color: colors.text.muted, textAlign: 'center' },
});
