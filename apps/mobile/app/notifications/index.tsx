import { useState, useEffect, useCallback, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { useTranslation } from 'react-i18next';
import { useNotificationsStore, Notification } from '../../stores';
import { ScreenHeader, LoadingView, EmptyState } from '../../components';

type FilterTab = 'all' | 'likes' | 'comments' | 'follows';

function timeAgo(dateStr: string) {
    const now = Date.now();
    const d = new Date(dateStr).getTime();
    const seconds = Math.floor((now - d) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    return `${Math.floor(seconds / 604800)}w`;
}

function getNotificationIcon(type: string): { name: keyof typeof Ionicons.glyphMap; color: string } {
    switch (type) {
        case 'LIKE': return { name: 'heart', color: colors.coral[500] };
        case 'COMMENT': return { name: 'chatbubble', color: colors.azure[500] };
        case 'FOLLOW': return { name: 'person-add', color: colors.emerald[500] };
        case 'MENTION': return { name: 'at', color: colors.gold[500] };
        case 'SHARE': return { name: 'arrow-redo', color: colors.amber[500] };
        case 'COMMUNITY_INVITE': return { name: 'people', color: colors.azure[400] };
        case 'POST': return { name: 'document-text', color: colors.gold[400] };
        default: return { name: 'notifications', color: colors.gold[500] };
    }
}

const NotificationItem = memo(({ item, onPress }: { item: Notification; onPress: (n: Notification) => void }) => {
    const iconInfo = getNotificationIcon(item.type);
    return (
        <Animated.View entering={FadeInDown.duration(200)}>
            <TouchableOpacity
                style={[styles.notifRow, !item.isRead && styles.notifUnread]}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onPress(item);
                }}
                activeOpacity={0.8}
            >
                <View style={[styles.notifIconContainer, !item.isRead && styles.notifIconUnread]}>
                    <Ionicons name={iconInfo.name} size={20} color={iconInfo.color} />
                </View>
                <View style={styles.notifContent}>
                    <Text style={[styles.notifMessage, !item.isRead && styles.notifMessageUnread]} numberOfLines={2}>
                        {item.message || item.content || 'New notification'}
                    </Text>
                    <Text style={styles.notifTime}>{timeAgo(item.createdAt)}</Text>
                </View>
                {!item.isRead && <View style={styles.unreadDot} />}
            </TouchableOpacity>
        </Animated.View>
    );
});

export default function NotificationsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const { notifications, isLoading, fetchNotifications, markAsRead, markAllAsRead } = useNotificationsStore();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await fetchNotifications();
        setIsRefreshing(false);
    }, [fetchNotifications]);

    const handlePress = useCallback((notif: Notification) => {
        if (!notif.isRead) markAsRead(notif.id);
        if (notif.postId) {
            router.push(`/post/${notif.postId}`);
        } else if (notif.type === 'FOLLOW' && notif.actorUsername) {
            router.push(`/profile/${notif.actorUsername}`);
        }
    }, [markAsRead, router]);

    // Filter notifications
    const filteredNotifications = activeFilter === 'all'
        ? notifications
        : notifications.filter((n) => {
            if (activeFilter === 'likes') return n.type === 'LIKE';
            if (activeFilter === 'comments') return n.type === 'COMMENT';
            if (activeFilter === 'follows') return n.type === 'FOLLOW';
            return true;
        });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <ScreenHeader
                title={t('notifications.title')}
                rightElement={
                    unreadCount > 0 ? (
                        <TouchableOpacity
                            style={styles.markAllBtn}
                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); markAllAsRead(); }}
                        >
                            <Text style={styles.markAllText}>{t('notifications.markAllRead')}</Text>
                        </TouchableOpacity>
                    ) : undefined
                }
            />

            {/* Filter tabs */}
            <View style={styles.filterTabs}>
                {(['all', 'likes', 'comments', 'follows'] as FilterTab[]).map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.filterTab, activeFilter === tab && styles.filterTabActive]}
                        onPress={() => setActiveFilter(tab)}
                    >
                        <Text style={[styles.filterTabText, activeFilter === tab && styles.filterTabTextActive]}>
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* List */}
            {isLoading && notifications.length === 0 ? (
                <LoadingView />
            ) : (
                <FlatList
                    data={filteredNotifications}
                    renderItem={({ item }) => <NotificationItem item={item} onPress={handlePress} />}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.gold[500]} />
                    }
                    ListEmptyComponent={
                        <EmptyState
                            icon="notifications-outline"
                            title="All caught up"
                            message="You'll see new notifications here when someone interacts with your content"
                        />
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    markAllBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
    markAllText: { fontSize: typography.fontSize.sm, color: colors.gold[500], fontWeight: '600' },

    // Filter tabs
    filterTabs: {
        flexDirection: 'row', paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm, gap: spacing.sm,
        borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
    },
    filterTab: {
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        borderRadius: 20, backgroundColor: colors.surface.glass,
    },
    filterTabActive: { backgroundColor: colors.surface.goldMedium },
    filterTabText: { fontSize: typography.fontSize.sm, color: colors.text.muted, fontWeight: '500' },
    filterTabTextActive: { color: colors.gold[500] },

    // Notification row
    notifRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
        borderBottomWidth: 1, borderBottomColor: colors.surface.glass,
    },
    notifUnread: { backgroundColor: colors.surface.goldFaded },
    notifIconContainer: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center', justifyContent: 'center',
    },
    notifIconUnread: { backgroundColor: colors.surface.goldLight },
    notifContent: { flex: 1, marginStart: spacing.md },
    notifMessage: { fontSize: typography.fontSize.sm, color: colors.text.secondary, lineHeight: 20 },
    notifMessageUnread: { color: colors.text.primary, fontWeight: '500' },
    notifTime: { fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: 4 },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold[500], marginStart: spacing.sm },

});
