import { useState, useRef, useEffect, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Animated,
    TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, Avatar } from '@zerog/ui';

// Mock conversations data
const MOCK_CONVERSATIONS = [
    {
        id: 'conv1',
        user: {
            id: 'u1',
            username: 'adventure_sarah',
            displayName: 'Sarah Chen',
            avatarUrl: 'https://i.pravatar.cc/150?img=1',
            isOnline: true,
            isVerified: true,
        },
        lastMessage: {
            text: 'Sounds great! 🎉',
            timestamp: new Date(Date.now() - 60000).toISOString(),
            isOwn: false,
        },
        unreadCount: 2,
    },
    {
        id: 'conv2',
        user: {
            id: 'u2',
            username: 'chef_marcus',
            displayName: 'Marcus Williams',
            avatarUrl: 'https://i.pravatar.cc/150?img=3',
            isOnline: false,
            isVerified: false,
        },
        lastMessage: {
            text: 'That recipe was amazing, thanks!',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            isOwn: true,
        },
        unreadCount: 0,
    },
    {
        id: 'conv3',
        user: {
            id: 'u3',
            username: 'tech_insights',
            displayName: 'Tech Insights',
            avatarUrl: 'https://i.pravatar.cc/150?img=5',
            isOnline: true,
            isVerified: true,
        },
        lastMessage: {
            text: 'Check out our latest feature drop 🚀',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            isOwn: false,
        },
        unreadCount: 5,
    },
    {
        id: 'conv4',
        user: {
            id: 'u4',
            username: 'fitness_pro',
            displayName: 'Mike Johnson',
            avatarUrl: 'https://i.pravatar.cc/150?img=12',
            isOnline: false,
            isVerified: true,
        },
        lastMessage: {
            text: 'Great workout today! 💪',
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            isOwn: false,
        },
        unreadCount: 0,
    },
    {
        id: 'conv5',
        user: {
            id: 'u5',
            username: 'travel_tales',
            displayName: 'Emma Davis',
            avatarUrl: 'https://i.pravatar.cc/150?img=9',
            isOnline: true,
            isVerified: false,
        },
        lastMessage: {
            text: 'The sunset was incredible!',
            timestamp: new Date(Date.now() - 172800000).toISOString(),
            isOwn: false,
        },
        unreadCount: 1,
    },
];

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

// Conversation item component
const ConversationItem = memo(({
    conversation,
    index,
    onPress
}: {
    conversation: typeof MOCK_CONVERSATIONS[0];
    index: number;
    onPress: () => void;
}) => {
    const slideAnim = useRef(new Animated.Value(50)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                delay: index * 50,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 300,
                delay: index * 50,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={[
                { opacity: opacityAnim, transform: [{ translateX: slideAnim }] },
            ]}
        >
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
                    <Avatar
                        source={conversation.user.avatarUrl}
                        name={conversation.user.displayName}
                        size="lg"
                    />
                    {conversation.user.isOnline && (
                        <View style={styles.onlineIndicator} />
                    )}
                </View>

                {/* Content */}
                <View style={styles.conversationContent}>
                    <View style={styles.conversationHeader}>
                        <View style={styles.nameContainer}>
                            <Text style={styles.displayName} numberOfLines={1}>
                                {conversation.user.displayName}
                            </Text>
                            {conversation.user.isVerified && (
                                <Text style={styles.verifiedBadge}>✓</Text>
                            )}
                        </View>
                        <Text style={[
                            styles.timestamp,
                            conversation.unreadCount > 0 && styles.timestampUnread,
                        ]}>
                            {formatTime(conversation.lastMessage.timestamp)}
                        </Text>
                    </View>

                    <View style={styles.messagePreview}>
                        <Text
                            style={[
                                styles.lastMessage,
                                conversation.unreadCount > 0 && styles.lastMessageUnread,
                            ]}
                            numberOfLines={1}
                        >
                            {conversation.lastMessage.isOwn && 'You: '}
                            {conversation.lastMessage.text}
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
        </Animated.View>
    );
});

export default function MessagesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'primary' | 'requests'>('primary');

    const filteredConversations = MOCK_CONVERSATIONS.filter((conv) =>
        conv.user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

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

                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'primary' && styles.tabActive]}
                        onPress={() => {
                            setActiveTab('primary');
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                    >
                        <Text style={[styles.tabText, activeTab === 'primary' && styles.tabTextActive]}>
                            Primary
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
                        onPress={() => {
                            setActiveTab('requests');
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                    >
                        <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
                            Requests
                        </Text>
                        <View style={styles.requestsBadge}>
                            <Text style={styles.requestsCount}>3</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Conversations list */}
            <FlatList
                data={filteredConversations}
                renderItem={({ item, index }) => (
                    <ConversationItem
                        conversation={item}
                        index={index}
                        onPress={() => router.push(`/chat/${item.id}`)}
                    />
                )}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: insets.bottom + spacing.xl },
                ]}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>💬</Text>
                        <Text style={styles.emptyTitle}>No messages yet</Text>
                        <Text style={styles.emptySubtitle}>
                            Start a conversation with someone you follow
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.obsidian[900],
    },
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
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    backIcon: {
        fontSize: 20,
        color: colors.text.primary,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
        letterSpacing: -0.5,
    },
    composeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.gold[500],
        alignItems: 'center',
        justifyContent: 'center',
    },
    composeIcon: {
        fontSize: 18,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    searchIcon: {
        fontSize: 16,
        marginRight: spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
    },
    tabsContainer: {
        flexDirection: 'row',
        gap: spacing.lg,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: spacing.sm,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: colors.text.primary,
    },
    tabText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.muted,
        fontFamily: typography.fontFamily.sans,
    },
    tabTextActive: {
        color: colors.text.primary,
    },
    requestsBadge: {
        marginLeft: spacing.sm,
        backgroundColor: colors.coral[500],
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: 10,
    },
    requestsCount: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
    },
    listContent: {
        paddingTop: spacing.md,
    },
    conversationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
    },
    unreadItem: {
        backgroundColor: 'rgba(212, 175, 55, 0.04)',
    },
    avatarContainer: {
        position: 'relative',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: colors.emerald[500],
        borderWidth: 2,
        borderColor: colors.obsidian[900],
    },
    conversationContent: {
        flex: 1,
        marginLeft: spacing.md,
    },
    conversationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    displayName: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
        marginRight: spacing.xs,
    },
    verifiedBadge: {
        fontSize: 12,
        color: colors.azure[400],
    },
    timestamp: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        fontFamily: typography.fontFamily.sans,
    },
    timestampUnread: {
        color: colors.gold[500],
    },
    messagePreview: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    lastMessage: {
        flex: 1,
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        fontFamily: typography.fontFamily.sans,
        marginRight: spacing.md,
    },
    lastMessageUnread: {
        color: colors.text.secondary,
        fontWeight: '500',
    },
    unreadBadge: {
        backgroundColor: colors.gold[500],
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: 12,
        minWidth: 24,
        alignItems: 'center',
    },
    unreadCount: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.obsidian[900],
        fontFamily: typography.fontFamily.sans,
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 100,
        paddingHorizontal: spacing['2xl'],
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
        marginBottom: spacing.sm,
    },
    emptySubtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.muted,
        fontFamily: typography.fontFamily.sans,
        textAlign: 'center',
    },
});
