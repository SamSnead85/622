import { useState, useEffect, useCallback, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '@zerog/ui';
import { useNotificationsStore, Notification } from '../../stores';

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

function getNotificationIcon(type: string) {
    switch (type) {
        case 'LIKE': return '❤️';
        case 'COMMENT': return '💬';
        case 'FOLLOW': return '👤';
        case 'MENTION': return '@';
        case 'SHARE': return '↗️';
        case 'COMMUNITY_INVITE': return '👥';
        case 'POST': return '📝';
        default: return '🔔';
    }
}

const NotificationItem = memo(({ item, onPress }: { item: Notification; onPress: (n: Notification) => void }) => (
    <TouchableOpacity
        style={[styles.notifRow, !item.isRead && styles.notifUnread]}
        onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress(item);
        }}
        activeOpacity={0.8}
    >
        {/* Icon */}
        <View style={[styles.notifIconContainer, !item.isRead && styles.notifIconUnread]}>
            <Text style={styles.notifIcon}>{getNotificationIcon(item.type)}</Text>
        </View>

        {/* Content */}
        <View style={styles.notifContent}>
            <Text style={[styles.notifMessage, !item.isRead && styles.notifMessageUnread]} numberOfLines={2}>
                {item.message || item.content || 'New notification'}
            </Text>
            <Text style={styles.notifTime}>{timeAgo(item.createdAt)}</Text>
        </View>

        {/* Unread dot */}
        {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
));

export default function NotificationsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { notifications, isLoading, fetchNotifications, markAsRead, markAllAsRead } = useNotificationsStore();
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await fetchNotifications();
        setIsRefreshing(false);
    }, [fetchNotifications]);

    const handlePress = useCallback((notif: Notification) => {
        if (!notif.isRead) {
            markAsRead(notif.id);
        }
        // Navigate based on notification type
        if (notif.postId) {
            router.push(`/post/${notif.postId}`);
        } else if (notif.type === 'FOLLOW' && notif.actorId) {
            // Could navigate to profile
        }
    }, [markAsRead, router]);

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800]]}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                {unreadCount > 0 ? (
                    <TouchableOpacity
                        style={styles.markAllBtn}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            markAllAsRead();
                        }}
                    >
                        <Text style={styles.markAllText}>Read all</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 60 }} />
                )}
            </View>

            {/* List */}
            {isLoading && notifications.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.gold[500]} />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={({ item }) => (
                        <NotificationItem item={item} onPress={handlePress} />
                    )}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            tintColor={colors.gold[500]}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>🔔</Text>
                            <Text style={styles.emptyTitle}>All caught up</Text>
                            <Text style={styles.emptyText}>
                                You'll see new notifications here when someone interacts with your content
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

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    },
    backButton: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        alignItems: 'center', justifyContent: 'center',
    },
    backIcon: { fontSize: 20, color: colors.text.primary },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
    markAllBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
    markAllText: { fontSize: typography.fontSize.sm, color: colors.gold[500], fontWeight: '600' },

    // Loading
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    // Notification row
    notifRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.03)',
    },
    notifUnread: { backgroundColor: 'rgba(212, 175, 55, 0.04)' },
    notifIconContainer: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        alignItems: 'center', justifyContent: 'center',
    },
    notifIconUnread: { backgroundColor: 'rgba(212, 175, 55, 0.12)' },
    notifIcon: { fontSize: 18 },
    notifContent: { flex: 1, marginLeft: spacing.md },
    notifMessage: { fontSize: typography.fontSize.sm, color: colors.text.secondary, lineHeight: 20 },
    notifMessageUnread: { color: colors.text.primary, fontWeight: '500' },
    notifTime: { fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: 4 },
    unreadDot: {
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: colors.gold[500], marginLeft: spacing.sm,
    },

    // Empty
    emptyContainer: { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing['2xl'] },
    emptyIcon: { fontSize: 48, marginBottom: spacing.lg },
    emptyTitle: { fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.sm },
    emptyText: { fontSize: typography.fontSize.base, color: colors.text.muted, textAlign: 'center', lineHeight: 22 },
});
