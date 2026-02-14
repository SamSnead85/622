// ============================================
// Connections — Network Hub
// My Circle, Requests, and Discover tabs
// ============================================

import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    RefreshControl,
    ActivityIndicator,
    Alert,
    Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
    FadeInDown,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { apiFetch, API, clearApiCache } from '../../lib/api';
import { timeAgo } from '../../lib/utils';
import { ScreenHeader, Avatar, EmptyState } from '../../components';
import SkeletonList from '../../components/SkeletonList';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// Types
// ============================================

interface ConnectionUser {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    isVerified?: boolean;
}

interface Connection {
    id: string;
    user: ConnectionUser;
    connectedAt: string;
    mutualCount?: number;
}

interface ConnectionRequest {
    id: string;
    user: ConnectionUser;
    message?: string;
    mutualCount?: number;
    degree?: number;
    createdAt: string;
    status: string;
}

interface Suggestion {
    id: string;
    user: ConnectionUser;
    degree: number;
    mutualCount: number;
    connectedThrough?: string;
}

type TabKey = 'circle' | 'requests' | 'discover';
type RequestSubTab = 'received' | 'sent';

// ============================================
// Tab configuration
// ============================================

const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'circle', label: 'My Circle', icon: 'people' },
    { key: 'requests', label: 'Requests', icon: 'person-add' },
    { key: 'discover', label: 'Discover', icon: 'compass' },
];

// ============================================
// Connection Card — shared card component
// ============================================

const ConnectionCard = memo(({ user, onPress, rightElement }: {
    user: ConnectionUser;
    onPress: () => void;
    rightElement?: React.ReactNode;
}) => {
    const { colors: c } = useTheme();
    return (
        <TouchableOpacity
            style={[styles.connectionCard, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}
            onPress={onPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${user.displayName}, @${user.username}`}
        >
            <Avatar uri={user.avatarUrl} name={user.displayName || '?'} customSize={48} />
            <View style={styles.connectionInfo}>
                <View style={styles.connectionNameRow}>
                    <Text style={[styles.connectionName, { color: c.text.primary }]} numberOfLines={1}>
                        {user.displayName}
                    </Text>
                    {user.isVerified && (
                        <Ionicons name="checkmark-circle" size={14} color={colors.gold[500]} />
                    )}
                </View>
                <Text style={[styles.connectionUsername, { color: c.text.muted }]} numberOfLines={1}>
                    @{user.username}
                </Text>
            </View>
            {rightElement}
        </TouchableOpacity>
    );
});

// ============================================
// Degree Badge
// ============================================

const DegreeBadge = memo(({ degree }: { degree: number }) => {
    const bg = degree === 2 ? colors.azure[500] + '25' : colors.gold[500] + '25';
    const fg = degree === 2 ? colors.azure[400] : colors.gold[400];
    return (
        <View style={[styles.degreeBadge, { backgroundColor: bg }]}>
            <Text style={[styles.degreeBadgeText, { color: fg }]}>{degree}nd</Text>
        </View>
    );
});

// ============================================
// Mutual Count Pill
// ============================================

const MutualPill = memo(({ count }: { count: number }) => {
    const { colors: c } = useTheme();
    if (!count || count <= 0) return null;
    return (
        <View style={[styles.mutualPill, { backgroundColor: c.surface.glassHover }]}>
            <Ionicons name="people-outline" size={11} color={colors.azure[400]} />
            <Text style={[styles.mutualPillText, { color: c.text.muted }]}>
                {count} mutual
            </Text>
        </View>
    );
});

// ============================================
// Tab Bar with animated indicator
// ============================================

const TabBar = memo(({ activeTab, onSelect, pendingCount }: {
    activeTab: TabKey;
    onSelect: (tab: TabKey) => void;
    pendingCount: number;
}) => {
    const { colors: c } = useTheme();
    const tabWidth = (SCREEN_WIDTH - spacing.lg * 2) / TABS.length;
    const indicatorX = useSharedValue(0);

    const activeIndex = TABS.findIndex((t) => t.key === activeTab);

    useEffect(() => {
        indicatorX.value = withSpring(activeIndex * tabWidth, {
            damping: 20,
            stiffness: 200,
        });
    }, [activeIndex, tabWidth, indicatorX]);

    const indicatorStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: indicatorX.value }],
        width: tabWidth,
    }));

    return (
        <View style={[styles.tabBar, { borderBottomColor: c.border.subtle }]}>
            {/* Animated indicator */}
            <Animated.View style={[styles.tabIndicator, indicatorStyle]}>
                <LinearGradient
                    colors={[colors.gold[500], colors.gold[600]]}
                    style={styles.tabIndicatorGradient}
                />
            </Animated.View>

            {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, { width: tabWidth }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onSelect(tab.key);
                        }}
                        activeOpacity={0.7}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: isActive }}
                        accessibilityLabel={tab.label}
                    >
                        <Ionicons
                            name={tab.icon}
                            size={18}
                            color={isActive ? colors.gold[500] : c.text.muted}
                        />
                        <Text style={[
                            styles.tabLabel,
                            { color: isActive ? colors.gold[500] : c.text.muted },
                            isActive && styles.tabLabelActive,
                        ]}>
                            {tab.label}
                        </Text>
                        {tab.key === 'requests' && pendingCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>
                                    {pendingCount > 99 ? '99+' : pendingCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
});

// ============================================
// Search Bar
// ============================================

const SearchBar = memo(({ value, onChangeText, placeholder }: {
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
}) => {
    const { colors: c } = useTheme();
    return (
        <View style={[styles.searchContainer, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
            <Ionicons name="search" size={18} color={c.text.muted} />
            <TextInput
                style={[styles.searchInput, { color: c.text.primary }]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={c.text.muted}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
            />
            {value.length > 0 && (
                <TouchableOpacity
                    onPress={() => onChangeText('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons name="close-circle" size={18} color={c.text.muted} />
                </TouchableOpacity>
            )}
        </View>
    );
});

// ============================================
// Request Sub-Tab Toggle
// ============================================

const RequestSubToggle = memo(({ active, onSelect }: {
    active: RequestSubTab;
    onSelect: (tab: RequestSubTab) => void;
}) => {
    const { colors: c } = useTheme();
    return (
        <View style={[styles.subToggle, { backgroundColor: c.surface.glass }]}>
            {(['received', 'sent'] as const).map((tab) => {
                const isActive = active === tab;
                return (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.subToggleBtn, isActive && styles.subToggleBtnActive]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onSelect(tab);
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={[
                            styles.subToggleText,
                            { color: isActive ? colors.gold[500] : c.text.muted },
                            isActive && styles.subToggleTextActive,
                        ]}>
                            {tab === 'received' ? 'Received' : 'Sent'}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
});

// ============================================
// My Circle Tab
// ============================================

function MyCircleTab() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: c } = useTheme();
    const [connections, setConnections] = useState<Connection[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchConnections = useCallback(async (query: string = '') => {
        try {
            setError(null);
            const endpoint = query
                ? `${API.connections}?search=${encodeURIComponent(query)}`
                : API.connections;
            const data = await apiFetch<{ connections: Connection[] } | Connection[]>(endpoint, { cache: false });
            const list = Array.isArray(data) ? data : (data.connections ?? []);
            setConnections(list);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to load connections';
            setError(msg);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchConnections();
    }, [fetchConnections]);

    const handleSearch = useCallback((text: string) => {
        setSearchQuery(text);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            fetchConnections(text);
        }, 400);
    }, [fetchConnections]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (searchTimeout.current) clearTimeout(searchTimeout.current);
        };
    }, []);

    const handleRefresh = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setRefreshing(true);
        clearApiCache(API.connections);
        await fetchConnections(searchQuery);
    }, [fetchConnections, searchQuery]);

    const handleRemove = useCallback((connection: Connection) => {
        Alert.alert(
            'Remove Connection',
            `Remove ${connection.user.displayName} from your circle?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        try {
                            await apiFetch(API.connectionRemove(connection.user.id), { method: 'DELETE' });
                            setConnections((prev) => prev.filter((c) => c.id !== connection.id));
                        } catch {
                            // Silently fail — user can retry
                        }
                    },
                },
            ],
        );
    }, []);

    const renderItem = useCallback(({ item, index }: { item: Connection; index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 40).duration(300).springify()}>
            <ConnectionCard
                user={item.user}
                onPress={() => router.push(`/profile/${item.user.username}` as any)}
                rightElement={
                    <View style={styles.circleRight}>
                        {item.mutualCount != null && item.mutualCount > 0 && (
                            <MutualPill count={item.mutualCount} />
                        )}
                        <Text style={[styles.connectedAgo, { color: c.text.muted }]}>
                            {timeAgo(item.connectedAt)}
                        </Text>
                        <TouchableOpacity
                            onPress={() => handleRemove(item)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityLabel={`Remove ${item.user.displayName}`}
                        >
                            <Ionicons name="ellipsis-horizontal" size={18} color={c.text.muted} />
                        </TouchableOpacity>
                    </View>
                }
            />
        </Animated.View>
    ), [router, c.text.muted, handleRemove]);

    if (loading) return <SkeletonList variant="message" count={8} />;

    if (error && connections.length === 0) {
        return (
            <EmptyState
                icon="cloud-offline-outline"
                title="Unable to load connections"
                message={error}
                actionLabel="Retry"
                onAction={() => {
                    setLoading(true);
                    fetchConnections();
                }}
                iconColor={colors.coral[500]}
            />
        );
    }

    return (
        <View style={styles.tabContent}>
            <SearchBar
                value={searchQuery}
                onChangeText={handleSearch}
                placeholder="Search your circle..."
            />
            <FlatList
                data={connections}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: insets.bottom + 40 },
                    connections.length === 0 && styles.listEmpty,
                ]}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews
                maxToRenderPerBatch={10}
                windowSize={5}
                initialNumToRender={10}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.gold[500]}
                        progressBackgroundColor={colors.obsidian[800]}
                    />
                }
                ListEmptyComponent={
                    <EmptyState
                        icon="people-outline"
                        title="Your circle is empty"
                        message="Connect with people you trust to grow your network."
                        iconColor={c.text.muted}
                        compact
                    />
                }
            />
        </View>
    );
}

// ============================================
// Requests Tab
// ============================================

function RequestsTab() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: c } = useTheme();
    const [subTab, setSubTab] = useState<RequestSubTab>('received');
    const [received, setReceived] = useState<ConnectionRequest[]>([]);
    const [sent, setSent] = useState<ConnectionRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());

    const fetchRequests = useCallback(async () => {
        try {
            setError(null);
            const [receivedData, sentData] = await Promise.all([
                apiFetch<{ requests: ConnectionRequest[] } | ConnectionRequest[]>(
                    `${API.connectionRequests}?type=received`, { cache: false }
                ),
                apiFetch<{ requests: ConnectionRequest[] } | ConnectionRequest[]>(
                    `${API.connectionRequests}?type=sent`, { cache: false }
                ),
            ]);
            const rList = Array.isArray(receivedData) ? receivedData : (receivedData.requests ?? []);
            const sList = Array.isArray(sentData) ? sentData : (sentData.requests ?? []);
            setReceived(rList);
            setSent(sList);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to load requests';
            setError(msg);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleRefresh = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setRefreshing(true);
        clearApiCache(API.connectionRequests);
        await fetchRequests();
    }, [fetchRequests]);

    const setActionLoadingFor = useCallback((id: string, loading: boolean) => {
        setActionLoading((prev) => {
            const next = new Set(prev);
            if (loading) next.add(id);
            else next.delete(id);
            return next;
        });
    }, []);

    const handleAccept = useCallback(async (request: ConnectionRequest) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setActionLoadingFor(request.id, true);
        try {
            await apiFetch(API.connectionAccept(request.id), { method: 'POST' });
            setReceived((prev) => prev.filter((r) => r.id !== request.id));
        } catch {
            // Silently fail
        } finally {
            setActionLoadingFor(request.id, false);
        }
    }, [setActionLoadingFor]);

    const handleDecline = useCallback(async (request: ConnectionRequest) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setActionLoadingFor(request.id, true);
        try {
            await apiFetch(API.connectionDecline(request.id), { method: 'POST' });
            setReceived((prev) => prev.filter((r) => r.id !== request.id));
        } catch {
            // Silently fail
        } finally {
            setActionLoadingFor(request.id, false);
        }
    }, [setActionLoadingFor]);

    const handleCancelSent = useCallback(async (request: ConnectionRequest) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setActionLoadingFor(request.id, true);
        try {
            await apiFetch(API.connectionDecline(request.id), { method: 'POST' });
            setSent((prev) => prev.filter((r) => r.id !== request.id));
        } catch {
            // Silently fail
        } finally {
            setActionLoadingFor(request.id, false);
        }
    }, [setActionLoadingFor]);

    const renderReceivedItem = useCallback(({ item, index }: { item: ConnectionRequest; index: number }) => {
        const isLoading = actionLoading.has(item.id);
        return (
            <Animated.View entering={FadeInDown.delay(index * 40).duration(300).springify()}>
                <ConnectionCard
                    user={item.user}
                    onPress={() => router.push(`/profile/${item.user.username}` as any)}
                    rightElement={
                        <View style={styles.requestActions}>
                            {item.mutualCount != null && item.mutualCount > 0 && (
                                <MutualPill count={item.mutualCount} />
                            )}
                            {item.degree != null && item.degree > 1 && (
                                <DegreeBadge degree={item.degree} />
                            )}
                            <View style={styles.requestButtons}>
                                {isLoading ? (
                                    <ActivityIndicator size="small" color={colors.gold[500]} />
                                ) : (
                                    <>
                                        <TouchableOpacity
                                            style={styles.declineBtn}
                                            onPress={() => handleDecline(item)}
                                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                            accessibilityLabel={`Decline ${item.user.displayName}`}
                                        >
                                            <Ionicons name="close" size={18} color={colors.coral[400]} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => handleAccept(item)}
                                            accessibilityLabel={`Accept ${item.user.displayName}`}
                                            activeOpacity={0.8}
                                        >
                                            <LinearGradient
                                                colors={[colors.emerald[500], colors.emerald[600]]}
                                                style={styles.acceptBtn}
                                            >
                                                <Ionicons name="checkmark" size={18} color="#fff" />
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        </View>
                    }
                />
                {item.message ? (
                    <View style={[styles.requestMessage, { backgroundColor: c.surface.glassHover }]}>
                        <Ionicons name="chatbubble-outline" size={12} color={c.text.muted} />
                        <Text style={[styles.requestMessageText, { color: c.text.secondary }]} numberOfLines={2}>
                            {item.message}
                        </Text>
                    </View>
                ) : null}
            </Animated.View>
        );
    }, [router, c, actionLoading, handleAccept, handleDecline]);

    const renderSentItem = useCallback(({ item, index }: { item: ConnectionRequest; index: number }) => {
        const isLoading = actionLoading.has(item.id);
        return (
            <Animated.View entering={FadeInDown.delay(index * 40).duration(300).springify()}>
                <ConnectionCard
                    user={item.user}
                    onPress={() => router.push(`/profile/${item.user.username}` as any)}
                    rightElement={
                        <View style={styles.sentRight}>
                            <Text style={[styles.sentStatus, { color: c.text.muted }]}>
                                Pending
                            </Text>
                            {isLoading ? (
                                <ActivityIndicator size="small" color={colors.coral[400]} />
                            ) : (
                                <TouchableOpacity
                                    style={[styles.cancelBtn, { borderColor: c.border.subtle }]}
                                    onPress={() => handleCancelSent(item)}
                                    activeOpacity={0.7}
                                    accessibilityLabel={`Cancel request to ${item.user.displayName}`}
                                >
                                    <Text style={[styles.cancelBtnText, { color: colors.coral[400] }]}>Cancel</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    }
                />
            </Animated.View>
        );
    }, [router, c, actionLoading, handleCancelSent]);

    const data = subTab === 'received' ? received : sent;

    if (loading) return <SkeletonList variant="message" count={6} />;

    if (error && received.length === 0 && sent.length === 0) {
        return (
            <EmptyState
                icon="cloud-offline-outline"
                title="Unable to load requests"
                message={error}
                actionLabel="Retry"
                onAction={() => {
                    setLoading(true);
                    fetchRequests();
                }}
                iconColor={colors.coral[500]}
            />
        );
    }

    return (
        <View style={styles.tabContent}>
            <RequestSubToggle active={subTab} onSelect={setSubTab} />
            <FlatList
                data={data}
                renderItem={subTab === 'received' ? renderReceivedItem : renderSentItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: insets.bottom + 40 },
                    data.length === 0 && styles.listEmpty,
                ]}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews
                maxToRenderPerBatch={10}
                windowSize={5}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.gold[500]}
                        progressBackgroundColor={colors.obsidian[800]}
                    />
                }
                ListEmptyComponent={
                    <EmptyState
                        icon="person-add-outline"
                        title="No pending requests"
                        message={subTab === 'received'
                            ? 'No one has sent you a connection request yet.'
                            : 'You haven\'t sent any connection requests.'}
                        iconColor={c.text.muted}
                        compact
                    />
                }
            />
        </View>
    );
}

// ============================================
// Discover Tab
// ============================================

function DiscoverTab() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: c } = useTheme();
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [connectingIds, setConnectingIds] = useState<Set<string>>(new Set());
    const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());

    const fetchSuggestions = useCallback(async () => {
        try {
            setError(null);
            const data = await apiFetch<{ suggestions: Suggestion[] } | Suggestion[]>(
                API.connectionSuggestions, { cache: false }
            );
            const list = Array.isArray(data) ? data : (data.suggestions ?? []);
            setSuggestions(list);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to load suggestions';
            setError(msg);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchSuggestions();
    }, [fetchSuggestions]);

    const handleRefresh = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setRefreshing(true);
        clearApiCache(API.connectionSuggestions);
        await fetchSuggestions();
    }, [fetchSuggestions]);

    const handleConnect = useCallback(async (suggestion: Suggestion) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setConnectingIds((prev) => new Set(prev).add(suggestion.user.id));
        try {
            await apiFetch(API.connectionRequest(suggestion.user.id), { method: 'POST' });
            setConnectedIds((prev) => new Set(prev).add(suggestion.user.id));
        } catch {
            // Silently fail
        } finally {
            setConnectingIds((prev) => {
                const next = new Set(prev);
                next.delete(suggestion.user.id);
                return next;
            });
        }
    }, []);

    const renderItem = useCallback(({ item, index }: { item: Suggestion; index: number }) => {
        const isConnecting = connectingIds.has(item.user.id);
        const isConnected = connectedIds.has(item.user.id);

        return (
            <Animated.View entering={FadeInDown.delay(index * 40).duration(300).springify()}>
                <TouchableOpacity
                    style={[styles.suggestionCard, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}
                    onPress={() => router.push(`/profile/${item.user.username}` as any)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.user.displayName}, ${item.degree}nd degree connection`}
                >
                    <View style={styles.suggestionTop}>
                        <Avatar uri={item.user.avatarUrl} name={item.user.displayName || '?'} customSize={56} />
                        <DegreeBadge degree={item.degree} />
                    </View>

                    <Text style={[styles.suggestionName, { color: c.text.primary }]} numberOfLines={1}>
                        {item.user.displayName}
                    </Text>
                    {item.user.isVerified && (
                        <View style={styles.verifiedRow}>
                            <Ionicons name="checkmark-circle" size={12} color={colors.gold[500]} />
                        </View>
                    )}
                    <Text style={[styles.suggestionUsername, { color: c.text.muted }]} numberOfLines={1}>
                        @{item.user.username}
                    </Text>

                    {item.mutualCount > 0 && (
                        <View style={styles.suggestionMutual}>
                            <Ionicons name="people-outline" size={12} color={colors.azure[400]} />
                            <Text style={[styles.suggestionMutualText, { color: c.text.muted }]}>
                                {item.mutualCount} mutual
                            </Text>
                        </View>
                    )}

                    {item.connectedThrough ? (
                        <Text style={[styles.connectedThrough, { color: c.text.muted }]} numberOfLines={1}>
                            Through {item.connectedThrough}
                        </Text>
                    ) : null}

                    {/* Connect button */}
                    {isConnected ? (
                        <View style={[styles.connectedBtn, { backgroundColor: colors.emerald[500] + '20' }]}>
                            <Ionicons name="checkmark" size={16} color={colors.emerald[500]} />
                            <Text style={[styles.connectedBtnText, { color: colors.emerald[500] }]}>Sent</Text>
                        </View>
                    ) : (
                        <TouchableOpacity
                            onPress={() => handleConnect(item)}
                            disabled={isConnecting}
                            activeOpacity={0.8}
                            accessibilityLabel={`Connect with ${item.user.displayName}`}
                        >
                            <LinearGradient
                                colors={[colors.gold[500], colors.gold[600]]}
                                style={styles.connectBtn}
                            >
                                {isConnecting ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="person-add" size={14} color="#fff" />
                                        <Text style={styles.connectBtnText}>Connect</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </TouchableOpacity>
            </Animated.View>
        );
    }, [router, c, connectingIds, connectedIds, handleConnect]);

    if (loading) return <SkeletonList variant="card" count={4} />;

    if (error && suggestions.length === 0) {
        return (
            <EmptyState
                icon="cloud-offline-outline"
                title="Unable to load suggestions"
                message={error}
                actionLabel="Retry"
                onAction={() => {
                    setLoading(true);
                    fetchSuggestions();
                }}
                iconColor={colors.coral[500]}
            />
        );
    }

    return (
        <View style={styles.tabContent}>
            <FlatList
                data={suggestions}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={styles.discoverGrid}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: insets.bottom + 40 },
                    suggestions.length === 0 && styles.listEmpty,
                ]}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews
                maxToRenderPerBatch={8}
                windowSize={5}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.gold[500]}
                        progressBackgroundColor={colors.obsidian[800]}
                    />
                }
                ListEmptyComponent={
                    <EmptyState
                        icon="compass-outline"
                        title="No suggestions right now"
                        message="Invite friends to grow your network."
                        iconColor={c.text.muted}
                        compact
                    />
                }
            />
        </View>
    );
}

// ============================================
// Main Screen
// ============================================

export default function ConnectionsScreen() {
    const { colors: c } = useTheme();
    const [activeTab, setActiveTab] = useState<TabKey>('circle');
    const [pendingCount, setPendingCount] = useState(0);

    // Fetch pending request count
    useEffect(() => {
        (async () => {
            try {
                const data = await apiFetch<{ requests: ConnectionRequest[] } | ConnectionRequest[]>(
                    `${API.connectionRequests}?type=received`
                );
                const list = Array.isArray(data) ? data : (data.requests ?? []);
                setPendingCount(list.length);
            } catch {
                // Non-critical — badge just won't show
            }
        })();
    }, []);

    const renderActiveTab = useMemo(() => {
        switch (activeTab) {
            case 'circle': return <MyCircleTab />;
            case 'requests': return <RequestsTab />;
            case 'discover': return <DiscoverTab />;
        }
    }, [activeTab]);

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800]]}
                style={StyleSheet.absoluteFill}
            />

            <ScreenHeader
                title="Connections"
                showBack
                noBorder
            />

            <TabBar
                activeTab={activeTab}
                onSelect={setActiveTab}
                pendingCount={pendingCount}
            />

            {renderActiveTab}
        </View>
    );
}

// ============================================
// Styles
// ============================================

const CARD_GAP = spacing.sm;
const CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - CARD_GAP) / 2;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.obsidian[900],
    },

    // ─── Tab Bar ─────────────────────────────────
    tabBar: {
        flexDirection: 'row',
        position: 'relative',
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        gap: 6,
    },
    tabLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: '500',
    },
    tabLabelActive: {
        fontWeight: '700',
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        height: 3,
        zIndex: 1,
    },
    tabIndicatorGradient: {
        flex: 1,
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3,
        marginHorizontal: spacing.xl,
    },
    badge: {
        backgroundColor: colors.coral[500],
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        marginLeft: 2,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#fff',
    },

    // ─── Tab Content ─────────────────────────────
    tabContent: {
        flex: 1,
    },

    // ─── Search Bar ──────────────────────────────
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: spacing.lg,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 14,
        borderWidth: 1,
        gap: spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: typography.fontSize.base,
        paddingVertical: 2,
    },

    // ─── List ────────────────────────────────────
    listContent: {
        flexGrow: 1,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
    },
    listEmpty: {
        justifyContent: 'center',
    },

    // ─── Connection Card ─────────────────────────
    connectionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: spacing.sm,
        gap: spacing.md,
    },
    connectionInfo: {
        flex: 1,
        gap: 2,
    },
    connectionNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    connectionName: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        flexShrink: 1,
    },
    connectionUsername: {
        fontSize: typography.fontSize.sm,
    },

    // ─── Circle Tab Right ────────────────────────
    circleRight: {
        alignItems: 'flex-end',
        gap: 4,
    },
    connectedAgo: {
        fontSize: typography.fontSize.xs,
    },

    // ─── Degree Badge ────────────────────────────
    degreeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    degreeBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },

    // ─── Mutual Pill ─────────────────────────────
    mutualPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    mutualPillText: {
        fontSize: 10,
        fontWeight: '600',
    },

    // ─── Request Sub-Toggle ──────────────────────
    subToggle: {
        flexDirection: 'row',
        marginHorizontal: spacing.lg,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
        borderRadius: 12,
        padding: 3,
    },
    subToggleBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderRadius: 10,
    },
    subToggleBtnActive: {
        backgroundColor: colors.surface.goldMedium,
    },
    subToggleText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '500',
    },
    subToggleTextActive: {
        fontWeight: '700',
    },

    // ─── Request Actions ─────────────────────────
    requestActions: {
        alignItems: 'flex-end',
        gap: 6,
    },
    requestButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    acceptBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    declineBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.coral[500] + '15',
        alignItems: 'center',
        justifyContent: 'center',
    },
    requestMessage: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
        marginLeft: spacing.lg + 48 + spacing.md,
        marginRight: spacing.lg,
        marginTop: -spacing.xs,
        marginBottom: spacing.sm,
        padding: spacing.sm,
        borderRadius: 10,
    },
    requestMessageText: {
        flex: 1,
        fontSize: typography.fontSize.xs,
        lineHeight: 16,
    },

    // ─── Sent Request ────────────────────────────
    sentRight: {
        alignItems: 'flex-end',
        gap: 6,
    },
    sentStatus: {
        fontSize: typography.fontSize.xs,
        fontWeight: '500',
    },
    cancelBtn: {
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
    },
    cancelBtnText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
    },

    // ─── Discover Grid ───────────────────────────
    discoverGrid: {
        gap: CARD_GAP,
    },
    suggestionCard: {
        width: CARD_WIDTH,
        padding: spacing.md,
        borderRadius: 18,
        borderWidth: 1,
        alignItems: 'center',
        marginBottom: CARD_GAP,
    },
    suggestionTop: {
        position: 'relative',
        marginBottom: spacing.sm,
    },
    suggestionName: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        textAlign: 'center',
    },
    verifiedRow: {
        marginTop: 2,
    },
    suggestionUsername: {
        fontSize: typography.fontSize.xs,
        textAlign: 'center',
        marginTop: 2,
    },
    suggestionMutual: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: spacing.sm,
    },
    suggestionMutualText: {
        fontSize: 11,
        fontWeight: '500',
    },
    connectedThrough: {
        fontSize: 10,
        marginTop: 4,
        textAlign: 'center',
    },

    // ─── Connect Button ──────────────────────────
    connectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 14,
        marginTop: spacing.md,
        width: '100%',
    },
    connectBtnText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: '#fff',
    },
    connectedBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 14,
        marginTop: spacing.md,
        width: '100%',
    },
    connectedBtnText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
    },
});
