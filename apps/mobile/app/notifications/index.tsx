import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SectionList,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { colors, typography, spacing } from '@zerog/ui';
import { useTranslation } from 'react-i18next';
import { useNotificationsStore, Notification } from '../../stores';
import { apiFetch, API } from '../../lib/api';
import { timeAgo } from '../../lib/utils';
import { ScreenHeader, EmptyState } from '../../components';
import SkeletonList from '../../components/SkeletonList';

// ============================================
// Types
// ============================================

type FilterTab = 'all' | 'likes' | 'comments' | 'follows' | 'system';

interface DateSection {
    title: string;
    data: Notification[];
}

// ============================================
// Filter tab configuration
// ============================================

const FILTER_TABS: { key: FilterTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'all', label: 'All', icon: 'notifications' },
    { key: 'likes', label: 'Likes', icon: 'heart' },
    { key: 'comments', label: 'Comments', icon: 'chatbubble' },
    { key: 'follows', label: 'Follows', icon: 'person-add' },
    { key: 'system', label: 'System', icon: 'settings' },
];

// ============================================
// Swipe-to-dismiss threshold (px)
// ============================================

const SWIPE_THRESHOLD = -80;

// ============================================
// Date section grouping
// ============================================

function getDateSection(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    if (date >= todayStart) return 'Today';
    if (date >= yesterdayStart) return 'Yesterday';
    if (date >= weekStart) return 'This Week';
    return 'Earlier';
}

function groupByDate(notifications: Notification[]): DateSection[] {
    const order = ['Today', 'Yesterday', 'This Week', 'Earlier'];
    const groups = new Map<string, Notification[]>();

    for (const notif of notifications) {
        const section = getDateSection(notif.createdAt);
        if (!groups.has(section)) groups.set(section, []);
        groups.get(section)!.push(notif);
    }

    return order
        .filter((title) => groups.has(title))
        .map((title) => ({ title, data: groups.get(title)! }));
}

// ============================================
// Notification icon mapping
// ============================================

function getNotificationIcon(type: string): { name: keyof typeof Ionicons.glyphMap; color: string } {
    switch (type) {
        case 'LIKE': return { name: 'heart', color: colors.coral[500] };
        case 'COMMENT': return { name: 'chatbubble', color: colors.azure[500] };
        case 'FOLLOW': return { name: 'person-add', color: colors.emerald[500] };
        case 'MENTION': return { name: 'at', color: colors.gold[500] };
        case 'SHARE': return { name: 'arrow-redo', color: colors.amber[500] };
        case 'COMMUNITY_INVITE': return { name: 'people', color: colors.azure[400] };
        case 'POST': return { name: 'document-text', color: colors.gold[400] };
        case 'SYSTEM': return { name: 'information-circle', color: colors.text.muted };
        default: return { name: 'notifications', color: colors.gold[500] };
    }
}

// ============================================
// Notification filter logic
// ============================================

const SYSTEM_TYPES = new Set(['SYSTEM', 'COMMUNITY_INVITE', 'SHARE']);

function filterNotifications(notifications: Notification[], filter: FilterTab): Notification[] {
    if (filter === 'all') return notifications;
    if (filter === 'likes') return notifications.filter((n) => n.type === 'LIKE');
    if (filter === 'comments') return notifications.filter((n) => n.type === 'COMMENT');
    if (filter === 'follows') return notifications.filter((n) => n.type === 'FOLLOW');
    if (filter === 'system') return notifications.filter((n) => SYSTEM_TYPES.has(n.type));
    return notifications;
}

// ============================================
// Section header component
// ============================================

const SectionHeader = memo(({ title }: { title: string }) => (
    <Animated.View entering={FadeInDown.duration(250)} style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionLine} />
    </Animated.View>
));

// ============================================
// Notification item component
// ============================================

const NotificationItem = memo(({ item, index, onPress, onReply, onFollowBack, onSwipeDismiss }: {
    item: Notification;
    index: number;
    onPress: (n: Notification) => void;
    onReply: (n: Notification) => void;
    onFollowBack: (n: Notification) => void;
    onSwipeDismiss: (n: Notification) => void;
}) => {
    const iconInfo = getNotificationIcon(item.type);
    const translateX = useSharedValue(0);
    const dismissed = useSharedValue(false);

    const triggerDismiss = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onSwipeDismiss(item);
    }, [item, onSwipeDismiss]);

    const panGesture = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-5, 5])
        .onUpdate((e) => {
            // Only allow swiping left
            if (e.translationX < 0) {
                translateX.value = e.translationX;
            }
        })
        .onEnd((e) => {
            if (e.translationX < SWIPE_THRESHOLD && !dismissed.value) {
                dismissed.value = true;
                translateX.value = withTiming(-400, { duration: 200 }, () => {
                    runOnJS(triggerDismiss)();
                });
            } else {
                translateX.value = withTiming(0, { duration: 200 });
            }
        });

    const swipeStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const behindStyle = useAnimatedStyle(() => ({
        opacity: translateX.value < -20 ? 1 : 0,
    }));

    return (
        <Animated.View entering={FadeInDown.delay(index * 50).duration(300).springify()}>
            {/* Background revealed on swipe */}
            <Animated.View style={[styles.swipeBackground, behindStyle]}>
                <Ionicons name="checkmark-circle" size={22} color={colors.emerald[500]} />
                <Text style={styles.swipeLabel}>Mark read</Text>
            </Animated.View>

            <GestureDetector gesture={panGesture}>
                <Animated.View style={swipeStyle}>
                    <TouchableOpacity
                        style={[styles.notifRow, !item.isRead && styles.notifUnread]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onPress(item);
                        }}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`${!item.isRead ? 'Unread: ' : ''}${item.message || item.content || 'New notification'}, ${timeAgo(item.createdAt)}`}
                        accessibilityActions={[{ name: 'markRead', label: 'Mark as read' }]}
                        onAccessibilityAction={(event) => {
                            if (event.nativeEvent.actionName === 'markRead') {
                                onSwipeDismiss(item);
                            }
                        }}
                    >
                        <View style={[styles.notifIconContainer, !item.isRead && styles.notifIconUnread]}>
                            <Ionicons name={iconInfo.name} size={20} color={iconInfo.color} />
                        </View>
                        <View style={styles.notifContent}>
                            <Text
                                style={[styles.notifMessage, !item.isRead && styles.notifMessageUnread]}
                                numberOfLines={2}
                            >
                                {item.message || item.content || 'New notification'}
                            </Text>
                            <View style={styles.notifMeta}>
                                <Text style={styles.notifTime}>{timeAgo(item.createdAt)}</Text>
                                {item.type === 'COMMENT' && item.postId && (
                                    <TouchableOpacity
                                        style={styles.actionPill}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            onReply(item);
                                        }}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <Ionicons name="arrow-undo-outline" size={12} color={colors.azure[400]} />
                                        <Text style={styles.actionPillText}>Reply</Text>
                                    </TouchableOpacity>
                                )}
                                {item.type === 'FOLLOW' && item.actorId && (
                                    <FollowBackButton actorId={item.actorId} onFollowBack={() => onFollowBack(item)} />
                                )}
                            </View>
                        </View>
                        {!item.isRead && <View style={styles.unreadDot} />}
                    </TouchableOpacity>
                </Animated.View>
            </GestureDetector>
        </Animated.View>
    );
});

const FollowBackButton = memo(({ actorId, onFollowBack }: { actorId: string; onFollowBack: () => void }) => {
    const [followed, setFollowed] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleFollowBack = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setFollowed(true); // optimistic
        setLoading(true);
        try {
            await apiFetch(API.follow(actorId), { method: 'POST' });
            onFollowBack();
        } catch {
            setFollowed(false); // revert
        } finally {
            setLoading(false);
        }
    };

    if (followed) {
        return (
            <View style={[styles.actionPill, styles.actionPillDone]}>
                <Ionicons name="checkmark" size={12} color={colors.emerald[500]} />
                <Text style={[styles.actionPillText, { color: colors.emerald[500] }]}>Following</Text>
            </View>
        );
    }

    return (
        <TouchableOpacity
            style={styles.actionPill}
            onPress={handleFollowBack}
            disabled={loading}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
            <Ionicons name="person-add-outline" size={12} color={colors.gold[400]} />
            <Text style={[styles.actionPillText, { color: colors.gold[400] }]}>Follow back</Text>
        </TouchableOpacity>
    );
});

// ============================================
// Filter tab bar component
// ============================================

const FilterTabBar = memo(({ activeFilter, onSelect }: {
    activeFilter: FilterTab;
    onSelect: (tab: FilterTab) => void;
}) => (
    <View style={styles.filterTabs}>
        {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
                <TouchableOpacity
                    key={tab.key}
                    style={[styles.filterTab, isActive && styles.filterTabActive]}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onSelect(tab.key);
                    }}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={tab.icon}
                        size={14}
                        color={isActive ? colors.gold[500] : colors.text.muted}
                        style={styles.filterTabIcon}
                    />
                    <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                        {tab.label}
                    </Text>
                </TouchableOpacity>
            );
        })}
    </View>
));

// ============================================
// Main screen
// ============================================

export default function NotificationsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const { notifications, isLoading, error, fetchNotifications, markAsRead, markAllAsRead } =
        useNotificationsStore();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleRefresh = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsRefreshing(true);
        await fetchNotifications();
        setIsRefreshing(false);
    }, [fetchNotifications]);

    const handlePress = useCallback(
        (notif: Notification) => {
            if (!notif.isRead) markAsRead(notif.id);
            if (notif.postId) {
                router.push(`/post/${notif.postId}`);
            } else if (notif.type === 'FOLLOW' && notif.actorUsername) {
                router.push(`/profile/${notif.actorUsername}`);
            }
        },
        [markAsRead, router],
    );

    // Filter + group
    const sections = useMemo(() => {
        const filtered = filterNotifications(notifications, activeFilter);
        return groupByDate(filtered);
    }, [notifications, activeFilter]);

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    const handleReply = useCallback(
        (notif: Notification) => {
            if (!notif.isRead) markAsRead(notif.id);
            if (notif.postId) {
                router.push(`/post/${notif.postId}?focusComment=true`);
            }
        },
        [markAsRead, router],
    );

    const handleFollowBack = useCallback(
        (notif: Notification) => {
            // Follow-back is handled optimistically inside FollowBackButton
            if (!notif.isRead) markAsRead(notif.id);
        },
        [markAsRead],
    );

    const handleSwipeDismiss = useCallback(
        (notif: Notification) => {
            if (!notif.isRead) markAsRead(notif.id);
        },
        [markAsRead],
    );

    const handleRetry = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        fetchNotifications();
    }, [fetchNotifications]);

    // Track flat index across sections for stagger offset
    const renderItem = useCallback(
        ({ item, index, section }: { item: Notification; index: number; section: DateSection }) => {
            // Calculate global index for stagger
            let globalIndex = index;
            for (const sec of sections) {
                if (sec.title === section.title) break;
                globalIndex += sec.data.length;
            }
            return (
                <NotificationItem
                    item={item}
                    index={globalIndex}
                    onPress={handlePress}
                    onReply={handleReply}
                    onFollowBack={handleFollowBack}
                    onSwipeDismiss={handleSwipeDismiss}
                />
            );
        },
        [sections, handlePress, handleReply, handleFollowBack, handleSwipeDismiss],
    );

    const renderSectionHeader = useCallback(
        ({ section }: { section: DateSection }) => <SectionHeader title={section.title} />,
        [],
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800]]}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <ScreenHeader
                title={t('notifications.title')}
                showBack
                noBorder
                rightElement={
                    unreadCount > 0 ? (
                        <TouchableOpacity
                            style={styles.markAllBtn}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                markAllAsRead();
                            }}
                        >
                            <Text style={styles.markAllText}>{t('notifications.markAllRead')}</Text>
                        </TouchableOpacity>
                    ) : undefined
                }
            />

            {/* Filter tabs */}
            <FilterTabBar activeFilter={activeFilter} onSelect={setActiveFilter} />

            {/* List */}
            {isLoading && notifications.length === 0 ? (
                <SkeletonList variant="notification" count={8} />
            ) : error && notifications.length === 0 ? (
                <EmptyState
                    icon="cloud-offline-outline"
                    title="Unable to load notifications"
                    message={error}
                    actionLabel="Retry"
                    onAction={handleRetry}
                    iconColor={colors.coral[500]}
                />
            ) : (
                <SectionList
                    sections={sections}
                    renderItem={renderItem}
                    renderSectionHeader={renderSectionHeader}
                    keyExtractor={(item) => item.id}
                    stickySectionHeadersEnabled={false}
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    initialNumToRender={10}
                    contentContainerStyle={[
                        styles.listContent,
                        { paddingBottom: insets.bottom + 40 },
                    ]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            tintColor={colors.gold[500]}
                            progressBackgroundColor={colors.obsidian[800]}
                        />
                    }
                    ListEmptyComponent={
                        <EmptyState
                            icon="notifications-off-outline"
                            title="All caught up!"
                            message="No new notifications. We'll let you know when someone interacts with your content."
                            iconColor={colors.text.muted}
                        />
                    }
                />
            )}
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

    // Mark all read
    markAllBtn: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
    },
    markAllText: {
        fontSize: typography.fontSize.sm,
        color: colors.gold[500],
        fontWeight: '600',
    },

    // Filter tabs
    filterTabs: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        gap: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
    },
    filterTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        backgroundColor: colors.surface.glass,
    },
    filterTabActive: {
        backgroundColor: colors.surface.goldMedium,
    },
    filterTabIcon: {
        marginRight: spacing.xs,
    },
    filterTabText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        fontWeight: '500',
    },
    filterTabTextActive: {
        color: colors.gold[500],
    },

    // List
    listContent: {
        flexGrow: 1,
    },

    // Section header
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.sm,
    },
    sectionTitle: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginRight: spacing.md,
    },
    sectionLine: {
        flex: 1,
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.border.subtle,
    },

    // Notification row
    notifRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.surface.glass,
    },
    notifUnread: {
        backgroundColor: colors.surface.goldFaded,
    },
    notifIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center',
        justifyContent: 'center',
    },
    notifIconUnread: {
        backgroundColor: colors.surface.goldLight,
    },
    notifContent: {
        flex: 1,
        marginStart: spacing.md,
    },
    notifMessage: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        lineHeight: 20,
    },
    notifMessageUnread: {
        color: colors.text.primary,
        fontWeight: '500',
    },
    notifMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: spacing.sm,
    },
    notifTime: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },
    actionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: 12,
        backgroundColor: colors.surface.glass,
    },
    actionPillDone: {
        backgroundColor: colors.surface.glass,
    },
    actionPillText: {
        fontSize: typography.fontSize.xs,
        color: colors.azure[400],
        fontWeight: '600',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.gold[500],
        marginStart: spacing.sm,
    },

    // Swipe-to-dismiss
    swipeBackground: {
        ...StyleSheet.absoluteFillObject,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingRight: spacing.lg,
        backgroundColor: colors.surface.glass,
        gap: spacing.xs,
    },
    swipeLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.emerald[500],
    },
});
