// ============================================
// Calls Screen — Recent calls list
// Shows call history and lets users start new calls
// ============================================

import { useState, useCallback, useEffect } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { colors, typography, spacing } from '@zerog/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../stores';
import { AVATAR_PLACEHOLDER } from '../../lib/imagePlaceholder';

interface RecentCall {
    id: string;
    userId: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    type: 'audio' | 'video';
    direction: 'incoming' | 'outgoing' | 'missed';
    duration?: number; // seconds
    timestamp: string;
}

function formatCallTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDuration(seconds?: number): string {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function CallItem({ call, onPress, colors: c }: { call: RecentCall; onPress: () => void; colors: Record<string, any> }) {
    const isMissed = call.direction === 'missed';
    const directionIcon = call.direction === 'incoming' ? 'arrow-down-outline' :
        call.direction === 'outgoing' ? 'arrow-up-outline' : 'arrow-down-outline';
    const directionColor = isMissed ? c.coral[500] : c.text.muted;

    return (
        <TouchableOpacity
            style={[styles.callItem, { borderBottomColor: c.border.subtle }]}
            onPress={onPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${call.direction} ${call.type} call with ${call.displayName}`}
        >
            <Image
                source={{ uri: call.avatarUrl || undefined }}
                style={styles.avatar}
                placeholder={AVATAR_PLACEHOLDER.blurhash}
                transition={200}
                cachePolicy="memory-disk"
            />
            <View style={styles.callInfo}>
                <Text style={[styles.callName, { color: isMissed ? c.coral[500] : c.text.primary }]} numberOfLines={1}>
                    {call.displayName}
                </Text>
                <View style={styles.callMeta}>
                    <Ionicons name={directionIcon} size={12} color={directionColor} />
                    <Text style={[styles.callMetaText, { color: directionColor }]}>
                        {call.direction === 'missed' ? 'Missed' : call.direction === 'incoming' ? 'Incoming' : 'Outgoing'}
                        {call.type === 'video' ? ' video' : ''} call
                        {call.duration ? ` · ${formatDuration(call.duration)}` : ''}
                    </Text>
                </View>
            </View>
            <View style={styles.callRight}>
                <Text style={[styles.callTime, { color: c.text.muted }]}>{formatCallTime(call.timestamp)}</Text>
                <TouchableOpacity
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onPress();
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons
                        name={call.type === 'video' ? 'videocam-outline' : 'call-outline'}
                        size={20}
                        color={c.gold[500]}
                    />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
}

export default function CallsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: c } = useTheme();
    const user = useAuthStore((s) => s.user);

    const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // For now, show empty state — call history will populate as users make calls
    // In a full implementation, this would fetch from an API endpoint

    const handleCallUser = useCallback((call: RecentCall) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push({
            pathname: '/call/[id]',
            params: {
                id: call.userId,
                type: call.type,
                name: encodeURIComponent(call.displayName),
                avatar: encodeURIComponent(call.avatarUrl || ''),
            },
        });
    }, [router]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // TODO: Fetch call history from API
        setTimeout(() => setIsRefreshing(false), 500);
    }, []);

    return (
        <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
            {/* Header */}
            <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="chevron-back" size={24} color={c.text.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: c.text.primary }]}>Calls</Text>
                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={[styles.headerAction, { backgroundColor: c.surface.glass }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            // TODO: Open contact picker to start a new call
                        }}
                    >
                        <Ionicons name="add" size={22} color={c.gold[500]} />
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* Encrypted badge */}
            <Animated.View entering={FadeInDown.delay(100).duration(300)} style={[styles.encryptedBadge, { backgroundColor: c.surface.glass }]}>
                <Ionicons name="shield-checkmark" size={14} color={c.emerald[500]} />
                <Text style={[styles.encryptedText, { color: c.text.muted }]}>
                    All calls are end-to-end encrypted
                </Text>
            </Animated.View>

            {recentCalls.length > 0 ? (
                <FlatList
                    data={recentCalls}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => (
                        <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
                            <CallItem call={item} onPress={() => handleCallUser(item)} colors={c} />
                        </Animated.View>
                    )}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            tintColor={c.gold[500]}
                        />
                    }
                    contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                />
            ) : (
                /* Empty State */
                <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.emptyContainer}>
                    <View style={[styles.emptyIcon, { backgroundColor: c.gold[500] + '15' }]}>
                        <Ionicons name="call-outline" size={40} color={c.gold[500]} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: c.text.primary }]}>No calls yet</Text>
                    <Text style={[styles.emptySubtitle, { color: c.text.muted }]}>
                        Start a voice or video call from{'\n'}any conversation. All calls are{'\n'}end-to-end encrypted.
                    </Text>
                    <TouchableOpacity
                        style={[styles.emptyAction, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.push('/(tabs)/messages' as any);
                        }}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="chatbubble-outline" size={18} color={c.gold[500]} />
                        <Text style={[styles.emptyActionText, { color: c.text.primary }]}>Go to messages</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    backBtn: {
        marginRight: spacing.sm,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        fontFamily: 'SpaceGrotesk-Bold',
        letterSpacing: -0.5,
        flex: 1,
    },
    headerRight: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    headerAction: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },

    encryptedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    encryptedText: {
        fontSize: 12,
        fontFamily: 'Inter',
    },

    // ---- Call Item ----
    callItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: spacing.md,
    },
    callInfo: {
        flex: 1,
    },
    callName: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        fontFamily: 'Inter-SemiBold',
    },
    callMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    callMetaText: {
        fontSize: typography.fontSize.xs,
        fontFamily: 'Inter',
    },
    callRight: {
        alignItems: 'flex-end',
        gap: 6,
    },
    callTime: {
        fontSize: 11,
        fontFamily: 'Inter',
    },

    // ---- Empty State ----
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '700',
        fontFamily: 'SpaceGrotesk-Bold',
        marginBottom: spacing.sm,
    },
    emptySubtitle: {
        fontSize: typography.fontSize.base,
        textAlign: 'center',
        lineHeight: 22,
        fontFamily: 'Inter',
        marginBottom: spacing.xl,
    },
    emptyAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: 12,
        paddingHorizontal: spacing.lg,
        borderRadius: 14,
        borderWidth: 1,
    },
    emptyActionText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        fontFamily: 'Inter-SemiBold',
    },
});
