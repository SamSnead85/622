import { useState, useEffect, useRef, memo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    RefreshControl,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '@zerog/ui';
import { useAuthStore } from '../../stores';
import { apiFetch, API } from '../../lib/api';
import { RetryView } from '../../components/RetryView';
import { ScreenHeader, LoadingView, Avatar, EmptyState } from '../../components';

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
            accessibilityRole="button"
            accessibilityLabel={`Conversation with ${p.displayName || p.username}${conversation.lastMessage ? `, last message: ${conversation.lastMessage.content}` : ', no messages yet'}${conversation.unreadCount > 0 ? `, ${conversation.unreadCount} unread` : ''}`}
        >
            {/* Avatar */}
            <View style={styles.avatarContainer}>
                <Avatar uri={p.avatarUrl} name={p.displayName || p.username} customSize={52} />
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

// Quick-access contacts strip
interface QuickContact {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
}

function QuickContactsStrip({ contacts, onContactPress }: { contacts: QuickContact[]; onContactPress: (c: QuickContact) => void }) {
    if (contacts.length === 0) return null;
    return (
        <View style={styles.quickContactsStrip}>
            <Text style={styles.quickContactsLabel}>Quick Message</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickContactsScroll}>
                {contacts.map((c) => (
                    <TouchableOpacity
                        key={c.id}
                        style={styles.quickContact}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onContactPress(c);
                        }}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Message ${c.displayName || c.username}`}
                        accessibilityHint="Opens conversation"
                    >
                        <Avatar uri={c.avatarUrl} name={c.displayName || c.username} customSize={44} style={{ marginBottom: 4 }} />
                        <Text style={styles.quickContactName} numberOfLines={1}>
                            {(c.displayName || c.username).split(' ')[0]?.slice(0, 8)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

export default function MessagesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [quickContacts, setQuickContacts] = useState<QuickContact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const loadConversations = async () => {
        try {
            const data = await apiFetch<any>(API.conversations);
            const convos = data.conversations || data.data || [];
            setConversations(Array.isArray(convos) ? convos : []);
        } catch (err) {
            setLoadError(true);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    // Load user's following list for quick contacts
    const loadQuickContacts = async () => {
        try {
            if (!user?.id) return;
            const data = await apiFetch<any>(`${API.users}/${user.id}/following?limit=20`);
            const following = data.following || [];
            setQuickContacts(following.map((f: any) => ({
                id: f.id,
                username: f.username,
                displayName: f.displayName,
                avatarUrl: f.avatarUrl,
            })));
        } catch {
            // Non-critical — strip just won't show
        }
    };

    useEffect(() => {
        loadConversations();
        loadQuickContacts();
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
            <ScreenHeader
                title="Messages"
                onBack={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.back();
                }}
                rightElement={
                    <TouchableOpacity
                        style={styles.composeButton}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.push('/(tabs)/search');
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Compose new message"
                        accessibilityHint="Opens search to find someone to message"
                    >
                        <Ionicons name="create-outline" size={20} color={colors.obsidian[900]} />
                    </TouchableOpacity>
                }
                noBorder
            />

            {/* Search */}
            <View style={styles.searchBarWrapper}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={16} color={colors.text.muted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search messages..."
                        placeholderTextColor={colors.text.muted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        accessibilityLabel="Search messages"
                    />
                </View>
            </View>

            {/* Quick-access contacts */}
            <QuickContactsStrip
                contacts={quickContacts}
                onContactPress={(c) => {
                    // Find existing conversation or open new one
                    const existing = conversations.find(conv => conv.participant.id === c.id);
                    if (existing) {
                        router.push(`/chat/${existing.id}`);
                    } else {
                        // Navigate to user profile where they can start a conversation
                        router.push(`/profile/${c.username}` as any);
                    }
                }}
            />

            {/* Conversations list */}
            {isLoading ? (
                <LoadingView />
            ) : loadError && conversations.length === 0 ? (
                <RetryView
                    message="Couldn't load messages. Check your connection."
                    onRetry={() => { setLoadError(false); setIsLoading(true); loadConversations(); }}
                />
            ) : (
                    <FlatList
                    data={filteredConversations}
                    renderItem={({ item }) => (
                        <ConversationItem
                            conversation={item}
                            onPress={() => router.push(`/chat/${item.id}`)}
                            userId={user?.id}
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
                        <EmptyState
                            icon="chatbubbles-outline"
                            title="No messages yet"
                            message="Start a conversation with someone in your community"
                        />
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    composeButton: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: colors.gold[500],
        alignItems: 'center', justifyContent: 'center',
    },
    searchBarWrapper: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
    },
    searchContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surface.glass,
        borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        borderWidth: 1, borderColor: colors.border.subtle, gap: spacing.sm,
    },
    searchInput: { flex: 1, fontSize: typography.fontSize.base, color: colors.text.primary },

    // Quick contacts
    quickContactsStrip: {
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
        paddingVertical: spacing.sm,
    },
    quickContactsLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.xs,
    },
    quickContactsScroll: {
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
    },
    quickContact: {
        alignItems: 'center',
        width: 60,
    },
    quickContactName: {
        fontSize: 10,
        color: colors.text.secondary,
        textAlign: 'center',
    },

    // List
    listContent: { paddingTop: spacing.md },
    conversationItem: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    },
    unreadItem: { backgroundColor: colors.surface.glass },
    avatarContainer: { position: 'relative' },
    onlineIndicator: {
        position: 'absolute', bottom: 0, right: 0,
        width: 14, height: 14, borderRadius: 7,
        backgroundColor: colors.emerald[500],
        borderWidth: 2, borderColor: colors.obsidian[900],
    },
    conversationContent: { flex: 1, marginStart: spacing.md },
    conversationHeader: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 4,
    },
    displayName: {
        fontSize: typography.fontSize.base, fontWeight: '600',
        color: colors.text.primary, flex: 1, marginEnd: spacing.sm,
    },
    timestamp: { fontSize: typography.fontSize.sm, color: colors.text.muted },
    timestampUnread: { color: colors.gold[500] },
    messagePreview: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    lastMessage: {
        flex: 1, fontSize: typography.fontSize.sm,
        color: colors.text.muted, marginEnd: spacing.md,
    },
    lastMessageUnread: { color: colors.text.secondary, fontWeight: '500' },
    unreadBadge: {
        backgroundColor: colors.gold[500],
        paddingHorizontal: spacing.sm, paddingVertical: 2,
        borderRadius: 12, minWidth: 24, alignItems: 'center',
    },
    unreadCount: { fontSize: 11, fontWeight: '700', color: colors.obsidian[900] },

});
