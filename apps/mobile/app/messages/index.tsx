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
    Alert,
    Platform,
    ActionSheetIOS,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
    FadeInDown,
    FadeIn,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { colors, typography, spacing } from '@zerog/ui';
import { useAuthStore } from '../../stores';
import { apiFetch, API } from '../../lib/api';
import { RetryView } from '../../components/RetryView';
import { ScreenHeader, Avatar, EmptyState } from '../../components';
import SkeletonList from '../../components/SkeletonList';
import { useDebounce } from '../../hooks/useDebounce';
import { showError } from '../../stores/toastStore';
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

interface OnlineContact {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
}

type FilterTab = 'all' | 'unread' | 'archived';

const FILTER_TABS: { key: FilterTab; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: 'chatbubbles-outline' },
    { key: 'unread', label: 'Unread', icon: 'mail-unread-outline' },
    { key: 'archived', label: 'Archived', icon: 'archive-outline' },
];

// ============================================
// Time formatting — delegates to shared util
// ============================================

const formatTime = (timestamp: string): string => {
    if (!timestamp) return '';
    return timeAgo(timestamp);
};

// ============================================
// Conversation Item with animation + long-press
// ============================================

// ============================================
// Swipe Action Buttons (revealed behind the row)
// ============================================

const SWIPE_THRESHOLD = 70;
const SWIPE_ACTION_WIDTH = 75;

const SwipeableConversationItem = memo(({
    conversation,
    onPress,
    onLongPress,
    userId,
    index,
    isMuted,
    isPinned,
    onPin,
    onArchive,
    onDelete,
}: {
    conversation: Conversation;
    onPress: () => void;
    onLongPress: () => void;
    userId?: string;
    index: number;
    isMuted?: boolean;
    isPinned?: boolean;
    onPin: () => void;
    onArchive: () => void;
    onDelete: () => void;
}) => {
    const p = conversation.participant;
    const hasUnread = conversation.unreadCount > 0;
    const translateX = useSharedValue(0);
    const contextStartX = useSharedValue(0);

    const triggerPin = useCallback(() => { onPin(); }, [onPin]);
    const triggerArchive = useCallback(() => { onArchive(); }, [onArchive]);
    const triggerDelete = useCallback(() => { onDelete(); }, [onDelete]);

    const panGesture = Gesture.Pan()
        .activeOffsetX([-15, 15])
        .failOffsetY([-10, 10])
        .onStart(() => {
            contextStartX.value = translateX.value;
        })
        .onUpdate((e) => {
            const next = contextStartX.value + e.translationX;
            // Allow swipe left (negative) to reveal right actions, and swipe right (positive) to reveal left action
            translateX.value = Math.max(-SWIPE_ACTION_WIDTH * 2, Math.min(SWIPE_ACTION_WIDTH, next));
        })
        .onEnd((e) => {
            // Swipe left far enough → reveal delete/archive actions
            if (e.translationX < -SWIPE_THRESHOLD) {
                translateX.value = withSpring(-SWIPE_ACTION_WIDTH * 2, { damping: 20, stiffness: 200 });
            }
            // Swipe right far enough → reveal pin action
            else if (e.translationX > SWIPE_THRESHOLD) {
                translateX.value = withSpring(SWIPE_ACTION_WIDTH, { damping: 20, stiffness: 200 });
            }
            // Snap back
            else {
                translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
            }
        });

    const rowStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const leftActionStyle = useAnimatedStyle(() => ({
        opacity: translateX.value > 10 ? withTiming(1, { duration: 150 }) : withTiming(0, { duration: 100 }),
    }));

    const rightActionStyle = useAnimatedStyle(() => ({
        opacity: translateX.value < -10 ? withTiming(1, { duration: 150 }) : withTiming(0, { duration: 100 }),
    }));

    const handleSwipeAction = useCallback((action: 'pin' | 'archive' | 'delete') => {
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (action === 'pin') triggerPin();
        else if (action === 'archive') triggerArchive();
        else if (action === 'delete') triggerDelete();
    }, [triggerPin, triggerArchive, triggerDelete]);

    return (
        <Animated.View entering={FadeInDown.duration(300).delay(Math.min(index, 8) * 60).springify()}>
            <View style={styles.swipeContainer}>
                {/* Left action (pin) — revealed on swipe right */}
                <Animated.View style={[styles.swipeActionLeft, leftActionStyle]}>
                    <TouchableOpacity
                        style={[styles.swipeActionBtn, styles.swipeActionPin]}
                        onPress={() => handleSwipeAction('pin')}
                        accessibilityLabel={isPinned ? 'Unpin conversation' : 'Pin conversation'}
                    >
                        <Ionicons name={isPinned ? 'pin-outline' : 'pin'} size={20} color="#fff" />
                        <Text style={styles.swipeActionLabel}>{isPinned ? 'Unpin' : 'Pin'}</Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* Right actions (archive + delete) — revealed on swipe left */}
                <Animated.View style={[styles.swipeActionRight, rightActionStyle]}>
                    <TouchableOpacity
                        style={[styles.swipeActionBtn, styles.swipeActionArchive]}
                        onPress={() => handleSwipeAction('archive')}
                        accessibilityLabel="Archive conversation"
                    >
                        <Ionicons name="archive-outline" size={20} color="#fff" />
                        <Text style={styles.swipeActionLabel}>Archive</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.swipeActionBtn, styles.swipeActionDelete]}
                        onPress={() => handleSwipeAction('delete')}
                        accessibilityLabel="Delete conversation"
                    >
                        <Ionicons name="trash-outline" size={20} color="#fff" />
                        <Text style={styles.swipeActionLabel}>Delete</Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* Main conversation row */}
                <GestureDetector gesture={panGesture}>
                    <Animated.View style={rowStyle}>
                        <TouchableOpacity
                            style={[
                                styles.conversationItem,
                                hasUnread && styles.unreadItem,
                                isPinned && styles.pinnedItem,
                            ]}
                            onPress={() => {
                                // If swiped open, close first
                                if (Math.abs(translateX.value) > 10) {
                                    translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
                                    return;
                                }
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onPress();
                            }}
                            onLongPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                onLongPress();
                            }}
                            delayLongPress={400}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel={`Conversation with ${p?.displayName || p?.username || 'Unknown'}${conversation.lastMessage ? `, last message: ${conversation.lastMessage.content}` : ', no messages yet'}${hasUnread ? `, ${conversation.unreadCount} unread` : ''}${isMuted ? ', muted' : ''}${isPinned ? ', pinned' : ''}`}
                            accessibilityHint="Double-tap to open, long press for options, swipe for quick actions"
                        >
                            {/* Pin indicator */}
                            {isPinned && (
                                <View style={styles.pinIndicator}>
                                    <Ionicons name="pin" size={10} color={colors.gold[500]} />
                                </View>
                            )}

                            {/* Avatar with online indicator */}
                            <View style={styles.avatarContainer}>
                                <Avatar uri={p?.avatarUrl} name={p?.displayName || p?.username || '?'} customSize={54} />
                                {p?.isOnline && (
                                    <View style={styles.onlineIndicator}>
                                        <View style={styles.onlineIndicatorInner} />
                                    </View>
                                )}
                            </View>

                            {/* Content */}
                            <View style={styles.conversationContent}>
                                <View style={styles.conversationHeader}>
                                    <View style={styles.nameRow}>
                                        <Text style={[styles.displayName, hasUnread && styles.displayNameUnread]} numberOfLines={1}>
                                            {p?.displayName || p?.username || 'Unknown'}
                                        </Text>
                                        {isMuted && (
                                            <Ionicons
                                                name="notifications-off"
                                                size={13}
                                                color={colors.text.muted}
                                                style={styles.mutedIcon}
                                            />
                                        )}
                                    </View>
                                    {conversation.lastMessage?.createdAt && (
                                        <Text style={[
                                            styles.timestamp,
                                            hasUnread && styles.timestampUnread,
                                        ]}>
                                            {formatTime(conversation.lastMessage.createdAt)}
                                        </Text>
                                    )}
                                </View>

                                <View style={styles.messagePreview}>
                                    <Text
                                        style={[
                                            styles.lastMessage,
                                            hasUnread && styles.lastMessageUnread,
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {conversation.lastMessage?.content
                                            ? `${conversation.lastMessage.senderId === userId ? 'You: ' : ''}${conversation.lastMessage.content}`
                                            : 'No messages yet'}
                                    </Text>
                                    {hasUnread && (
                                        <View style={styles.unreadBadge}>
                                            <Text style={styles.unreadCount}>
                                                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Chevron */}
                            <Ionicons
                                name="chevron-forward"
                                size={16}
                                color={colors.text.muted}
                                style={styles.chevron}
                            />
                        </TouchableOpacity>
                    </Animated.View>
                </GestureDetector>
            </View>
        </Animated.View>
    );
});

// ============================================
// Online Now strip
// ============================================

function OnlineNowStrip({
    contacts,
    onContactPress,
}: {
    contacts: OnlineContact[];
    onContactPress: (c: OnlineContact) => void;
}) {
    if (contacts.length === 0) return null;

    return (
        <Animated.View entering={FadeIn.duration(400)} style={styles.onlineStrip}>
            <View style={styles.onlineStripHeader}>
                <View style={styles.onlineStripDot} />
                <Text style={styles.onlineStripLabel}>Online Now</Text>
            </View>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.onlineStripScroll}
            >
                {contacts.map((c) => (
                    <TouchableOpacity
                        key={c.id}
                        style={styles.onlineContact}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onContactPress(c);
                        }}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Message ${c.displayName || c.username}`}
                        accessibilityHint="Opens conversation"
                    >
                        <View style={styles.onlineContactAvatarWrap}>
                            <View style={styles.onlineRing}>
                                <Avatar
                                    uri={c.avatarUrl}
                                    name={c.displayName || c.username}
                                    customSize={46}
                                />
                            </View>
                            <View style={styles.onlineContactDot} />
                        </View>
                        <Text style={styles.onlineContactName} numberOfLines={1}>
                            {(c.displayName || c.username).split(' ')[0]?.slice(0, 8)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </Animated.View>
    );
}

// ============================================
// Main Screen
// ============================================

export default function MessagesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [onlineContacts, setOnlineContacts] = useState<OnlineContact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
    const [mutedIds, setMutedIds] = useState<Set<string>>(new Set());
    const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
    const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());
    const debouncedSearch = useDebounce(searchQuery, 300);
    const isMountedRef = useRef(true);

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    // ---- Data fetching ----

    const loadConversations = async () => {
        try {
            const data = await apiFetch<any>(API.conversations);
            const convos = data.conversations || data.data || [];
            if (isMountedRef.current) {
                setConversations(Array.isArray(convos) ? convos : []);
                setLoadError(false);
            }
        } catch {
            if (isMountedRef.current) setLoadError(true);
        } finally {
            if (isMountedRef.current) {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        }
    };

    const loadOnlineContacts = async () => {
        try {
            if (!user?.id) return;
            const data = await apiFetch<any>(`${API.users}/${user.id}/following?limit=20`);
            const following = data.following || [];
            // Filter to only online contacts for the "Online Now" strip
            const online = following
                .filter((f: any) => f.isOnline)
                .map((f: any) => ({
                    id: f.id,
                    username: f.username,
                    displayName: f.displayName,
                    avatarUrl: f.avatarUrl,
                }));
            if (isMountedRef.current) setOnlineContacts(online);
        } catch {
            // Non-critical — strip just won't show
        }
    };

    useEffect(() => {
        loadConversations();
        loadOnlineContacts();
    }, []);

    const handleRefresh = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsRefreshing(true);
        loadConversations();
        loadOnlineContacts();
    }, []);

    // ---- Unread count for the tab badge ----

    const unreadTotal = useMemo(
        () => conversations.filter((c) => c.unreadCount > 0 && !archivedIds.has(c.id)).length,
        [conversations, archivedIds],
    );

    // ---- Filtering (debounced + tab), sorting (pinned first) ----

    const filteredConversations = useMemo(() => {
        let result = [...conversations];

        // Apply tab filter first
        if (activeFilter === 'archived') {
            result = result.filter((c) => archivedIds.has(c.id));
        } else if (activeFilter === 'unread') {
            result = result.filter((c) => c.unreadCount > 0 && !archivedIds.has(c.id));
        } else {
            // 'all' — exclude archived (unless searching)
            if (!debouncedSearch.trim()) {
                result = result.filter((c) => !archivedIds.has(c.id));
            }
        }

        // Apply search filter
        if (debouncedSearch.trim()) {
            const q = debouncedSearch.toLowerCase();
            result = result.filter((conv) =>
                conv?.participant?.displayName?.toLowerCase().includes(q) ||
                conv?.participant?.username?.toLowerCase().includes(q) ||
                conv?.lastMessage?.content?.toLowerCase().includes(q)
            );
        }

        // Sort: pinned conversations first, then by last message time
        return result.sort((a, b) => {
            const aPinned = pinnedIds.has(a.id) ? 1 : 0;
            const bPinned = pinnedIds.has(b.id) ? 1 : 0;
            if (aPinned !== bPinned) return bPinned - aPinned;
            const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
            const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
            return bTime - aTime;
        });
    }, [conversations, activeFilter, archivedIds, pinnedIds, debouncedSearch]);

    // ---- Long-press context menu ----

    const confirmDelete = useCallback((conversation: Conversation) => {
        const name = conversation.participant?.displayName || conversation.participant?.username || 'this user';
        Alert.alert(
            'Delete Conversation',
            `Are you sure you want to delete your conversation with ${name}? This can't be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        // Optimistic removal
                        setConversations((prev) =>
                            prev.filter((c) => c.id !== conversation.id)
                        );
                        try {
                            await apiFetch(API.messages(conversation.id), {
                                method: 'DELETE',
                            });
                        } catch {
                            // Restore on failure
                            showError('Could not delete conversation');
                            loadConversations();
                        }
                    },
                },
            ]
        );
    }, []);

    const toggleMute = useCallback((conversation: Conversation) => {
        const isMuted = mutedIds.has(conversation.id);
        setMutedIds((prev) => {
            const next = new Set(prev);
            if (isMuted) next.delete(conversation.id);
            else next.add(conversation.id);
            return next;
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, [mutedIds]);

    const togglePin = useCallback((conversation: Conversation) => {
        setPinnedIds((prev) => {
            const next = new Set(prev);
            if (next.has(conversation.id)) next.delete(conversation.id);
            else next.add(conversation.id);
            return next;
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, []);

    const handleArchive = useCallback((conversation: Conversation) => {
        setArchivedIds((prev) => {
            const next = new Set(prev);
            next.add(conversation.id);
            return next;
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, []);

    const handleLongPress = useCallback((conversation: Conversation) => {
        const p = conversation.participant;
        const name = p?.displayName || p?.username || 'Unknown';
        const isMuted = mutedIds.has(conversation.id);
        const isPinned = pinnedIds.has(conversation.id);

        if (Platform.OS === 'ios') {
            const options = [
                isPinned ? 'Unpin' : 'Pin',
                isMuted ? 'Unmute' : 'Mute',
                'Archive',
                'Delete',
                'Cancel',
            ];
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    title: name,
                    options,
                    destructiveButtonIndex: 3,
                    cancelButtonIndex: 4,
                },
                (buttonIndex) => {
                    if (buttonIndex === 0) togglePin(conversation);
                    else if (buttonIndex === 1) toggleMute(conversation);
                    else if (buttonIndex === 2) handleArchive(conversation);
                    else if (buttonIndex === 3) confirmDelete(conversation);
                }
            );
        } else {
            Alert.alert(
                name,
                undefined,
                [
                    {
                        text: isPinned ? 'Unpin' : 'Pin',
                        onPress: () => togglePin(conversation),
                    },
                    {
                        text: isMuted ? 'Unmute' : 'Mute',
                        onPress: () => toggleMute(conversation),
                    },
                    {
                        text: 'Archive',
                        onPress: () => handleArchive(conversation),
                    },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => confirmDelete(conversation),
                    },
                    { text: 'Cancel', style: 'cancel' },
                ],
                { cancelable: true }
            );
        }
    }, [mutedIds, pinnedIds, toggleMute, togglePin, handleArchive, confirmDelete]);

    // ---- Navigate to conversation ----

    const handleConversationPress = useCallback((conversationId: string) => {
        router.push(`/chat/${conversationId}` as any);
    }, [router]);

    const handleContactPress = useCallback((contact: OnlineContact) => {
        const existing = conversations.find((conv) => conv?.participant?.id === contact.id);
        if (existing) {
            router.push(`/chat/${existing.id}`);
        } else {
            router.push(`/profile/${contact.username}` as any);
        }
    }, [conversations, router]);

    // ---- Render ----

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

            {/* Search Bar */}
            <Animated.View entering={FadeInDown.duration(300).delay(50)} style={styles.searchBarWrapper}>
                <View style={[styles.searchContainer, searchFocused && styles.searchContainerFocused]}>
                    <Ionicons
                        name="search-outline"
                        size={16}
                        color={searchFocused ? colors.gold[500] : colors.text.muted}
                    />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search conversations..."
                        placeholderTextColor={colors.text.muted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        returnKeyType="search"
                        accessibilityLabel="Search conversations"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity
                            onPress={() => setSearchQuery('')}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityLabel="Clear search"
                        >
                            <Ionicons name="close-circle" size={16} color={colors.text.muted} />
                        </TouchableOpacity>
                    )}
                </View>
            </Animated.View>

            {/* Filter Tabs */}
            <Animated.View entering={FadeInDown.duration(300).delay(80)} style={styles.filterTabsRow}>
                {FILTER_TABS.map((tab) => {
                    const isActive = activeFilter === tab.key;
                    const showBadge = tab.key === 'unread' && unreadTotal > 0;
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={[styles.filterTab, isActive && styles.filterTabActive]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setActiveFilter(tab.key);
                            }}
                            activeOpacity={0.7}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: isActive }}
                            accessibilityLabel={`${tab.label}${showBadge ? `, ${unreadTotal} unread` : ''}`}
                        >
                            <Ionicons
                                name={tab.icon as any}
                                size={14}
                                color={isActive ? colors.gold[500] : colors.text.muted}
                            />
                            <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                                {tab.label}
                            </Text>
                            {showBadge && (
                                <View style={styles.filterTabBadge}>
                                    <Text style={styles.filterTabBadgeText}>
                                        {unreadTotal > 99 ? '99+' : unreadTotal}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </Animated.View>

            {/* Online Now contacts */}
            {activeFilter !== 'archived' && (
                <OnlineNowStrip
                    contacts={onlineContacts}
                    onContactPress={handleContactPress}
                />
            )}

            {/* Conversations list */}
            {isLoading ? (
                <SkeletonList variant="message" count={8} />
            ) : loadError && conversations.length === 0 ? (
                <RetryView
                    message="Couldn't load messages. Check your connection."
                    onRetry={() => {
                        setLoadError(false);
                        setIsLoading(true);
                        loadConversations();
                    }}
                />
            ) : (
                <FlatList
                    data={filteredConversations}
                    renderItem={({ item, index }) => (
                        <SwipeableConversationItem
                            conversation={item}
                            onPress={() => handleConversationPress(item.id)}
                            onLongPress={() => handleLongPress(item)}
                            userId={user?.id}
                            index={index}
                            isMuted={mutedIds.has(item.id)}
                            isPinned={pinnedIds.has(item.id)}
                            onPin={() => togglePin(item)}
                            onArchive={() => handleArchive(item)}
                            onDelete={() => confirmDelete(item)}
                        />
                    )}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[
                        styles.listContent,
                        { paddingBottom: insets.bottom + spacing.xl + 80 },
                    ]}
                    showsVerticalScrollIndicator={false}
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={8}
                    windowSize={5}
                    initialNumToRender={6}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            tintColor={colors.gold[500]}
                            colors={[colors.gold[500]]}
                        />
                    }
                    ListEmptyComponent={
                        debouncedSearch.trim() ? (
                            <EmptyState
                                icon="search-outline"
                                title="No conversations found"
                                message={`No conversations match "${debouncedSearch}"`}
                            />
                        ) : activeFilter === 'unread' ? (
                            <EmptyState
                                icon="checkmark-done-outline"
                                title="All caught up"
                                message="You have no unread messages"
                            />
                        ) : activeFilter === 'archived' ? (
                            <EmptyState
                                icon="archive-outline"
                                title="No archived conversations"
                                message="Swipe left on a conversation to archive it"
                            />
                        ) : (
                            <View style={styles.elegantEmpty}>
                                <LinearGradient
                                    colors={[`${colors.gold[500]}15`, 'transparent']}
                                    style={styles.elegantEmptyGlow}
                                />
                                <View style={styles.elegantEmptyIcon}>
                                    <Ionicons name="chatbubbles" size={40} color={colors.gold[500]} />
                                </View>
                                <Text style={styles.elegantEmptyTitle}>No conversations yet</Text>
                                <Text style={styles.elegantEmptyMessage}>
                                    Start chatting with someone{'\n'}in your community
                                </Text>
                                <TouchableOpacity
                                    style={styles.elegantEmptyButton}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        router.push('/(tabs)/search');
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="add" size={18} color={colors.obsidian[900]} />
                                    <Text style={styles.elegantEmptyButtonText}>New Conversation</Text>
                                </TouchableOpacity>
                            </View>
                        )
                    }
                />
            )}

            {/* Floating Action Button */}
            <Animated.View
                entering={FadeInDown.duration(400).delay(300).springify()}
                style={[styles.fabContainer, { bottom: insets.bottom + 24 }]}
            >
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        router.push('/(tabs)/search');
                    }}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="New message"
                    accessibilityHint="Opens search to start a new conversation"
                >
                    <LinearGradient
                        colors={[colors.gold[400], colors.gold[600]]}
                        style={styles.fabGradient}
                    >
                        <Ionicons name="add" size={28} color={colors.obsidian[900]} />
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.obsidian[900],
    },

    // Header compose button
    composeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.gold[500],
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Search
    searchBarWrapper: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.md,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        paddingHorizontal: spacing.md,
        paddingVertical: Platform.OS === 'ios' ? spacing.sm + 2 : spacing.sm,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        gap: spacing.sm,
    },
    searchContainerFocused: {
        borderColor: `${colors.gold[500]}60`,
        backgroundColor: `${colors.surface.glass}`,
    },
    searchInput: {
        flex: 1,
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        paddingVertical: 0,
    },

    // Filter tabs
    filterTabsRow: {
        flexDirection: 'row',
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.md,
        gap: spacing.sm,
    },
    filterTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        borderRadius: 20,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        gap: 5,
    },
    filterTabActive: {
        backgroundColor: `${colors.gold[500]}15`,
        borderColor: `${colors.gold[500]}40`,
    },
    filterTabText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.muted,
    },
    filterTabTextActive: {
        color: colors.gold[500],
    },
    filterTabBadge: {
        backgroundColor: colors.gold[500],
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    filterTabBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.obsidian[900],
    },

    // Online Now strip
    onlineStrip: {
        paddingTop: spacing.xs,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
    },
    onlineStripHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.sm,
        gap: 6,
    },
    onlineStripDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.emerald[500],
    },
    onlineStripLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    onlineStripScroll: {
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
    },
    onlineContact: {
        alignItems: 'center',
        width: 64,
    },
    onlineContactAvatarWrap: {
        position: 'relative',
        marginBottom: 4,
    },
    onlineRing: {
        borderRadius: 25,
        padding: 2,
        borderWidth: 2,
        borderColor: `${colors.emerald[500]}40`,
    },
    onlineContactDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.emerald[500],
        borderWidth: 2,
        borderColor: colors.obsidian[900],
    },
    onlineContactName: {
        fontSize: 10,
        color: colors.text.secondary,
        textAlign: 'center',
    },

    // Swipe actions
    swipeContainer: {
        position: 'relative',
        overflow: 'hidden',
    },
    swipeActionLeft: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: SWIPE_ACTION_WIDTH,
        flexDirection: 'row',
    },
    swipeActionRight: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: SWIPE_ACTION_WIDTH * 2,
        flexDirection: 'row',
    },
    swipeActionBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    swipeActionPin: {
        backgroundColor: colors.gold[600],
    },
    swipeActionArchive: {
        backgroundColor: colors.azure[600],
    },
    swipeActionDelete: {
        backgroundColor: colors.coral[500],
    },
    swipeActionLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#fff',
    },

    // Pin indicator
    pinIndicator: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.md,
        zIndex: 1,
    },

    // Conversation list
    listContent: {
        paddingTop: spacing.sm,
    },
    conversationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: `${colors.border.subtle}40`,
        backgroundColor: colors.obsidian[900],
    },
    unreadItem: {
        backgroundColor: `${colors.gold[500]}0D`,
    },
    pinnedItem: {
        backgroundColor: `${colors.gold[500]}08`,
    },

    // Avatar + online dot
    avatarContainer: {
        position: 'relative',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.obsidian[900],
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.obsidian[900],
    },
    onlineIndicatorInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.emerald[500],
    },

    // Conversation content
    conversationContent: {
        flex: 1,
        marginStart: spacing.md,
    },
    conversationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginEnd: spacing.sm,
    },
    displayName: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
        flexShrink: 1,
    },
    displayNameUnread: {
        fontWeight: '700',
    },
    mutedIcon: {
        marginStart: 4,
        opacity: 0.6,
    },
    timestamp: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },
    timestampUnread: {
        color: colors.gold[500],
        fontWeight: '600',
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
        marginEnd: spacing.md,
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
    },
    chevron: {
        marginStart: spacing.xs,
        opacity: 0.4,
    },

    // Floating Action Button
    fabContainer: {
        position: 'absolute',
        right: spacing.xl,
        zIndex: 100,
    },
    fab: {
        width: 58,
        height: 58,
        borderRadius: 29,
        shadowColor: colors.gold[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 8,
    },
    fabGradient: {
        width: 58,
        height: 58,
        borderRadius: 29,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Elegant empty state
    elegantEmpty: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
        paddingHorizontal: spacing.xl,
    },
    elegantEmptyGlow: {
        position: 'absolute',
        top: 60,
        width: 200,
        height: 200,
        borderRadius: 100,
    },
    elegantEmptyIcon: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: `${colors.gold[500]}12`,
        borderWidth: 1,
        borderColor: `${colors.gold[500]}20`,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    elegantEmptyTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
        marginBottom: spacing.sm,
    },
    elegantEmptyMessage: {
        fontSize: typography.fontSize.base,
        color: colors.text.muted,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing.xl,
    },
    elegantEmptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.gold[500],
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.sm + 2,
        borderRadius: 14,
    },
    elegantEmptyButtonText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.obsidian[900],
    },
});
