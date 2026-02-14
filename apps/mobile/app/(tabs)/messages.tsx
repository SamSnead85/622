import { useState, useEffect, memo, useCallback, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    RefreshControl,
    ScrollView,
    Platform,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
    FadeInDown,
    FadeIn,
    FadeInRight,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { colors, spacing, typography } from '@zerog/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../stores';
import { apiFetch, API } from '../../lib/api';
import { Avatar, EmptyState, ErrorBoundary } from '../../components';
import SkeletonList from '../../components/SkeletonList';
import { useDebounce } from '../../hooks/useDebounce';
import { timeAgo } from '../../lib/utils';

// ============================================
// Types
// ============================================

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
    isPinned?: boolean;
    isArchived?: boolean;
}

interface OnlineConnection {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
}

type FilterTab = 'all' | 'unread';

// ============================================
// Online Now Avatar
// ============================================

const OnlineAvatar = memo(({ user, onPress, index }: { user: OnlineConnection; onPress: () => void; index: number }) => {
    const { colors: c } = useTheme();
    return (
        <Animated.View entering={FadeInRight.delay(index * 50).duration(200)}>
            <TouchableOpacity
                style={styles.onlineItem}
                onPress={onPress}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Message ${user.displayName}`}
            >
                <View style={styles.onlineAvatarWrap}>
                    <Avatar uri={user.avatarUrl} name={user.displayName} customSize={52} />
                    <View style={[styles.onlineRing, { borderColor: colors.emerald[500] }]} />
                    <View style={[styles.onlineBadge, { borderColor: c.obsidian[900] }]} />
                </View>
                <Text style={[styles.onlineName, { color: c.text.secondary }]} numberOfLines={1}>
                    {(user.displayName || '').split(' ')[0]}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );
});

// ============================================
// Conversation Row
// ============================================

const ConversationRow = memo(({
    conversation,
    onPress,
    userId,
    index,
}: {
    conversation: Conversation;
    onPress: () => void;
    userId?: string;
    index: number;
}) => {
    const { colors: c } = useTheme();
    const p = conversation.participant;
    const hasUnread = conversation.unreadCount > 0;

    return (
        <Animated.View entering={FadeInDown.duration(250).delay(Math.min(index * 40, 300))}>
            <TouchableOpacity
                style={[styles.conversationRow, hasUnread && { backgroundColor: c.surface.glass }]}
                onPress={onPress}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Chat with ${p.displayName}${hasUnread ? `, ${conversation.unreadCount} unread` : ''}`}
            >
                <View style={styles.avatarWrap}>
                    <Avatar uri={p.avatarUrl} name={p.displayName} customSize={48} />
                    {p.isOnline && (
                        <View style={[styles.onlineDot, { borderColor: c.obsidian[900] }]}>
                            <View style={styles.onlineDotInner} />
                        </View>
                    )}
                </View>
                <View style={styles.conversationInfo}>
                    <View style={styles.conversationTop}>
                        <Text style={[styles.conversationName, { color: c.text.primary }, hasUnread && styles.conversationNameBold]} numberOfLines={1}>
                            {p.displayName}
                        </Text>
                        {conversation.lastMessage && (
                            <Text style={[styles.conversationTime, { color: hasUnread ? colors.gold[400] : c.text.muted }]}>
                                {timeAgo(conversation.lastMessage.createdAt)}
                            </Text>
                        )}
                    </View>
                    <View style={styles.conversationBottom}>
                        <Text style={[styles.conversationPreview, { color: hasUnread ? c.text.primary : c.text.secondary }]} numberOfLines={1}>
                            {conversation.lastMessage
                                ? (conversation.lastMessage.senderId === userId ? 'You: ' : '') + conversation.lastMessage.content
                                : 'Start a conversation'}
                        </Text>
                        {hasUnread && (
                            <View style={styles.unreadBadge}>
                                <Text style={[styles.unreadBadgeText, { color: c.text.inverse }]}>
                                    {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});

// ============================================
// Messages Tab Screen
// ============================================

export default function MessagesTab() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: c } = useTheme();
    const user = useAuthStore((s) => s.user);

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [onlineConnections, setOnlineConnections] = useState<OnlineConnection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [fetchError, setFetchError] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
    const debouncedSearch = useDebounce(searchQuery, 300);

    const fetchConversations = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        setFetchError(false);
        try {
            const data = await apiFetch<{ conversations: { id: string; participant?: Conversation['participant']; participants?: Conversation['participant'][]; lastMessage?: Conversation['lastMessage']; unreadCount?: number; isPinned?: boolean; isArchived?: boolean }[] }>(API.conversations);
            // Server returns `participants` (array), normalize to `participant` (singular) for DMs
            const normalized: Conversation[] = (data?.conversations || []).map((conv) => {
                const participant = conv.participant || (conv.participants && conv.participants[0]) || {
                    id: '',
                    username: 'Unknown',
                    displayName: 'Unknown User',
                };
                // Derive isOnline from lastActiveAt if available (within last 5 minutes)
                const participantWithMeta = participant as Conversation['participant'] & { lastActiveAt?: string };
                if (!participant.isOnline && participantWithMeta.lastActiveAt) {
                    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
                    participant.isOnline = new Date(participantWithMeta.lastActiveAt).getTime() > fiveMinAgo;
                }
                return {
                    id: conv.id,
                    participant,
                    lastMessage: conv.lastMessage || undefined,
                    unreadCount: conv.unreadCount || 0,
                    isPinned: conv.isPinned,
                    isArchived: conv.isArchived,
                };
            });
            setConversations(normalized);
        } catch (err) {
            setFetchError(true);
            if (__DEV__) console.warn('Failed to load conversations:', err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    const fetchOnlineConnections = useCallback(async () => {
        try {
            const data = await apiFetch<{ users: OnlineConnection[] }>('/api/v1/users/connections?online=true&limit=20');
            setOnlineConnections(data?.users || []);
        } catch {
            // Silently fail — online strip just won't show
        }
    }, []);

    useEffect(() => {
        fetchConversations();
        fetchOnlineConnections();
    }, [fetchConversations, fetchOnlineConnections]);

    useFocusEffect(
        useCallback(() => {
            fetchConversations(true);
            fetchOnlineConnections();
        }, [fetchConversations, fetchOnlineConnections])
    );

    const filteredConversations = useMemo(() => {
        let list = conversations;
        if (activeFilter === 'unread') {
            list = list.filter(c => c.unreadCount > 0);
        }
        if (debouncedSearch.trim()) {
            const q = debouncedSearch.toLowerCase();
            list = list.filter(c =>
                (c.participant?.displayName || '').toLowerCase().includes(q) ||
                (c.participant?.username || '').toLowerCase().includes(q)
            );
        }
        // Pinned first, then by last message time
        return list.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            const aTime = a.lastMessage?.createdAt || '';
            const bTime = b.lastMessage?.createdAt || '';
            return bTime.localeCompare(aTime);
        });
    }, [conversations, activeFilter, debouncedSearch]);

    const totalUnread = useMemo(() =>
        conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
        [conversations]
    );

    const handleConversationPress = useCallback((conv: Conversation) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/messages/${conv.id}` as any);
    }, [router]);

    const handleOnlinePress = useCallback(async (connection: OnlineConnection) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            // Find or create conversation with this user
            const data = await apiFetch<{ conversation: { id: string } }>(
                API.conversations,
                {
                    method: 'POST',
                    body: JSON.stringify({ participantIds: [connection.id] }),
                }
            );
            if (data?.conversation?.id) {
                router.push(`/messages/${data.conversation.id}` as any);
            } else {
                Alert.alert('Error', 'Could not start a conversation. Please try again.');
            }
        } catch {
            // Show error instead of navigating with a user ID (which would 404)
            Alert.alert('Connection Error', 'Could not start a conversation. Please try again.');
        }
    }, [router]);

    const renderConversation = useCallback(({ item, index }: { item: Conversation; index: number }) => (
        <ConversationRow
            conversation={item}
            onPress={() => handleConversationPress(item)}
            userId={user?.id}
            index={index}
        />
    ), [handleConversationPress, user?.id]);

    const renderEmpty = () => {
        if (isLoading) return <SkeletonList count={6} />;
        if (fetchError && conversations.length === 0) {
            return (
                <View style={styles.errorContainer}>
                    <Ionicons name="cloud-offline-outline" size={48} color={c.text.muted} />
                    <Text style={[styles.errorText, { color: c.text.secondary }]}>
                        Couldn't load messages
                    </Text>
                    <TouchableOpacity
                        style={[styles.retryButton, { borderColor: c.border.default }]}
                        onPress={() => { setFetchError(false); fetchConversations(); }}
                    >
                        <Text style={[styles.retryText, { color: c.text.primary }]}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        return (
            <EmptyState
                icon="chatbubbles-outline"
                iconSize={64}
                title="Start a Conversation"
                message="Message your connections to get started"
                actionLabel="Find Connections"
                onAction={() => router.push('/connections' as any)}
            />
        );
    };

    const listHeader = useMemo(() => (
        <>
            {/* Online Now */}
            {onlineConnections.length > 0 && (
                <View style={styles.onlineSection}>
                    <Text style={[styles.onlineSectionTitle, { color: c.text.muted }]}>ONLINE NOW</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.onlineList}
                    >
                        {onlineConnections.map((conn, idx) => (
                            <OnlineAvatar
                                key={conn.id}
                                user={conn}
                                onPress={() => handleOnlinePress(conn)}
                                index={idx}
                            />
                        ))}
                    </ScrollView>
                </View>
            )}
        </>
    ), [onlineConnections, c.text.muted, handleOnlinePress]);

    return (
        <ErrorBoundary>
        <View style={[styles.container, { backgroundColor: c.obsidian[900] }]}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
                <Text style={[styles.headerTitle, { color: c.text.primary }]}>Messages</Text>
                <TouchableOpacity
                    style={[styles.newChatBtn, { backgroundColor: c.surface.glass }]}
                    onPress={() => router.push('/messages/new' as any)}
                    accessibilityRole="button"
                    accessibilityLabel="New message"
                >
                    <Ionicons name="create-outline" size={20} color={colors.gold[500]} />
                </TouchableOpacity>
            </View>

            {/* Search bar */}
            <View style={[styles.searchBar, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
                <Ionicons name="search" size={18} color={c.text.muted} />
                <TextInput
                    style={[styles.searchInput, { color: c.text.primary }]}
                    placeholder="Search conversations..."
                    placeholderTextColor={c.text.muted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                    autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                        <Ionicons name="close-circle" size={18} color={c.text.muted} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Filter tabs */}
            <View style={styles.filterRow}>
                <TouchableOpacity
                    style={[styles.filterChip, activeFilter === 'all' && { backgroundColor: c.text.primary + '15', borderColor: c.text.primary + '30' }]}
                    onPress={() => setActiveFilter('all')}
                >
                    <Text style={[styles.filterChipText, { color: activeFilter === 'all' ? c.text.primary : c.text.muted }]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterChip, activeFilter === 'unread' && { backgroundColor: colors.gold[500] + '15', borderColor: colors.gold[500] + '30' }]}
                    onPress={() => setActiveFilter('unread')}
                >
                    <Text style={[styles.filterChipText, { color: activeFilter === 'unread' ? colors.gold[400] : c.text.muted }]}>
                        Unread{totalUnread > 0 ? ` (${totalUnread})` : ''}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Conversation list */}
            <FlatList
                ListHeaderComponent={listHeader}
                data={filteredConversations}
                renderItem={renderConversation}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={renderEmpty}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={() => { setIsRefreshing(true); fetchConversations(); }}
                        tintColor={colors.gold[400]}
                    />
                }
                contentContainerStyle={[
                    styles.listContent,
                    filteredConversations.length === 0 && styles.listContentEmpty,
                ]}
                showsVerticalScrollIndicator={false}
            />

        </View>
        </ErrorBoundary>
    );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.sm,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    newChatBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Online Now ──
    onlineSection: {
        paddingTop: spacing.xs,
        paddingBottom: spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border.subtle,
        marginBottom: spacing.xs,
    },
    onlineSectionTitle: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.sm,
    },
    onlineList: {
        paddingHorizontal: spacing.md,
        gap: 4,
    },
    onlineItem: {
        alignItems: 'center',
        width: 68,
    },
    onlineAvatarWrap: {
        position: 'relative',
        marginBottom: 4,
    },
    onlineRing: {
        position: 'absolute',
        top: -2,
        left: -2,
        right: -2,
        bottom: -2,
        borderRadius: 28,
        borderWidth: 2,
    },
    onlineBadge: {
        position: 'absolute',
        bottom: 1,
        right: 1,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: colors.emerald[500],
        borderWidth: 2,
    },
    onlineName: {
        fontSize: 11,
        fontWeight: '500',
        textAlign: 'center',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: spacing.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        padding: 0,
    },
    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: spacing.md,
        paddingBottom: 100,
    },
    listContentEmpty: {
        flex: 1,
        justifyContent: 'center',
    },
    conversationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: spacing.sm,
        borderRadius: 12,
        marginBottom: 2,
    },
    avatarWrap: {
        position: 'relative',
        marginRight: spacing.md,
    },
    onlineDot: {
        position: 'absolute',
        bottom: 1,
        right: 1,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        backgroundColor: colors.emerald[500],
        alignItems: 'center',
        justifyContent: 'center',
    },
    onlineDotInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.emerald[500],
    },
    conversationInfo: {
        flex: 1,
    },
    conversationTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 3,
    },
    conversationName: {
        fontSize: 15,
        fontWeight: '500',
        flex: 1,
        marginRight: spacing.sm,
    },
    conversationNameBold: {
        fontWeight: '700',
    },
    conversationTime: {
        fontSize: 12,
    },
    conversationBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    conversationPreview: {
        fontSize: 14,
        flex: 1,
        marginRight: spacing.sm,
    },
    unreadBadge: {
        backgroundColor: colors.gold[500],
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 5,
    },
    unreadBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    errorContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 12,
    },
    errorText: {
        fontSize: 16,
        fontWeight: '500',
    },
    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        marginTop: 8,
    },
    retryText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
