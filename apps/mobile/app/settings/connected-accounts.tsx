// ============================================
// Connected Accounts — Social Platform Integrations
// Link LinkedIn, X, Instagram, etc. for cross-posting
// ============================================

import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    RefreshControl,
    Switch,
    Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { typography, spacing } from '@zerog/ui';
import { ScreenHeader } from '../../components';
import { apiFetch, API } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';

// ── Types ──
interface Platform {
    id: string;
    name: string;
    icon: string;
    color: string;
    description: string;
    features: string[];
}

interface ConnectedAccount {
    id: string;
    platform: string;
    platformUsername: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    isActive: boolean;
    autoSync: boolean;
    syncFrequency: string | null;
    lastSyncAt: string | null;
    lastSyncStatus: string | null;
    scopes: string[];
    createdAt: string;
    _count: { crossPosts: number };
}

interface SocialStats {
    totalConnectedAccounts: number;
    activeAccounts: number;
    totalCrossPosts: number;
    platformBreakdown: Array<{
        platform: string;
        isActive: boolean;
        postsImported: number;
        lastSyncAt: string | null;
    }>;
}

// ── Platform Card ──
function PlatformCard({
    platform,
    account,
    onConnect,
    onDisconnect,
    onSync,
    onToggleAutoSync,
    isSyncing,
}: {
    platform: Platform;
    account: ConnectedAccount | undefined;
    onConnect: (platform: Platform) => void;
    onDisconnect: (account: ConnectedAccount) => void;
    onSync: (account: ConnectedAccount) => void;
    onToggleAutoSync: (account: ConnectedAccount, value: boolean) => void;
    isSyncing: boolean;
}) {
    const { colors: c } = useTheme();
    const isConnected = !!account && account.isActive;

    return (
        <Animated.View entering={FadeInDown.duration(300)}>
            <View style={[styles.platformCard, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
                {/* Header row */}
                <View style={styles.platformHeader}>
                    <View style={[styles.platformIconContainer, { backgroundColor: platform.color + '18' }]}>
                        <Ionicons
                            name={platform.icon as keyof typeof Ionicons.glyphMap}
                            size={24}
                            color={platform.color}
                        />
                    </View>
                    <View style={styles.platformInfo}>
                        <Text style={[styles.platformName, { color: c.text.primary }]}>{platform.name}</Text>
                        <Text style={[styles.platformDesc, { color: c.text.muted }]}>{platform.description}</Text>
                    </View>
                    {isConnected ? (
                        <View style={[styles.connectedBadge, { backgroundColor: c.emerald[500] + '18' }]}>
                            <Ionicons name="checkmark-circle" size={14} color={c.emerald[500]} />
                            <Text style={[styles.connectedText, { color: c.emerald[500] }]}>Connected</Text>
                        </View>
                    ) : null}
                </View>

                {/* Connected state */}
                {isConnected && account ? (
                    <View style={styles.connectedDetails}>
                        {/* Username */}
                        <View style={[styles.usernameRow, { borderTopColor: c.border.subtle }]}>
                            <Ionicons name="at" size={16} color={c.text.secondary} />
                            <Text style={[styles.usernameText, { color: c.text.secondary }]}>
                                {account.platformUsername || account.displayName || 'Connected'}
                            </Text>
                            <Text style={[styles.postsCount, { color: c.text.muted }]}>
                                {account._count.crossPosts} posts imported
                            </Text>
                        </View>

                        {/* Auto-sync toggle */}
                        <View style={styles.settingRow}>
                            <View style={styles.settingLeft}>
                                <Ionicons name="sync-outline" size={18} color={c.text.secondary} />
                                <Text style={[styles.settingLabel, { color: c.text.primary }]}>Auto-sync new posts</Text>
                            </View>
                            <Switch
                                value={account.autoSync}
                                onValueChange={(v) => onToggleAutoSync(account, v)}
                                trackColor={{ false: c.obsidian[600], true: c.gold[500] + '40' }}
                                thumbColor={account.autoSync ? c.gold[500] : c.obsidian[400]}
                            />
                        </View>

                        {/* Last sync info */}
                        {account.lastSyncAt && (
                            <Text style={[styles.lastSync, { color: c.text.muted }]}>
                                Last synced {new Date(account.lastSyncAt).toLocaleDateString()} at{' '}
                                {new Date(account.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {account.lastSyncStatus === 'failed' && ' · Failed'}
                            </Text>
                        )}

                        {/* Action buttons */}
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={[styles.syncBtn, { backgroundColor: platform.color + '14', borderColor: platform.color + '30' }]}
                                onPress={() => onSync(account)}
                                disabled={isSyncing}
                                activeOpacity={0.7}
                            >
                                {isSyncing ? (
                                    <ActivityIndicator size="small" color={platform.color} />
                                ) : (
                                    <Ionicons name="sync" size={16} color={platform.color} />
                                )}
                                <Text style={[styles.syncBtnText, { color: platform.color }]}>
                                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.disconnectBtn, { borderColor: c.coral[500] + '30' }]}
                                onPress={() => onDisconnect(account)}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="unlink-outline" size={16} color={c.coral[500]} />
                                <Text style={[styles.disconnectBtnText, { color: c.coral[500] }]}>Disconnect</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    /* Not connected — show connect button */
                    <TouchableOpacity
                        style={[styles.connectBtn, { backgroundColor: platform.color, borderColor: platform.color }]}
                        onPress={() => onConnect(platform)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="link-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.connectBtnText}>Connect {platform.name}</Text>
                    </TouchableOpacity>
                )}

                {/* Features */}
                <View style={styles.featuresRow}>
                    {platform.features.includes('import_posts') && (
                        <View style={[styles.featureChip, { backgroundColor: c.surface.glassHover }]}>
                            <Ionicons name="download-outline" size={12} color={c.text.muted} />
                            <Text style={[styles.featureText, { color: c.text.muted }]}>Import</Text>
                        </View>
                    )}
                    {platform.features.includes('share_to') && (
                        <View style={[styles.featureChip, { backgroundColor: c.surface.glassHover }]}>
                            <Ionicons name="share-outline" size={12} color={c.text.muted} />
                            <Text style={[styles.featureText, { color: c.text.muted }]}>Share</Text>
                        </View>
                    )}
                    {platform.features.includes('auto_sync') && (
                        <View style={[styles.featureChip, { backgroundColor: c.surface.glassHover }]}>
                            <Ionicons name="sync-outline" size={12} color={c.text.muted} />
                            <Text style={[styles.featureText, { color: c.text.muted }]}>Auto-sync</Text>
                        </View>
                    )}
                    {platform.features.includes('profile_sync') && (
                        <View style={[styles.featureChip, { backgroundColor: c.surface.glassHover }]}>
                            <Ionicons name="person-outline" size={12} color={c.text.muted} />
                            <Text style={[styles.featureText, { color: c.text.muted }]}>Profile</Text>
                        </View>
                    )}
                </View>
            </View>
        </Animated.View>
    );
}

// ── Main Screen ──
export default function ConnectedAccountsScreen() {
    const { colors: c } = useTheme();
    const insets = useSafeAreaInsets();
    const [platforms, setPlatforms] = useState<Platform[]>([]);
    const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
    const [stats, setStats] = useState<SocialStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [syncingId, setSyncingId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const [platformsRes, accountsRes, statsRes] = await Promise.all([
                apiFetch(API.socialPlatforms),
                apiFetch(API.socialAccounts),
                apiFetch(API.socialStats),
            ]);
            if (platformsRes?.platforms) setPlatforms(platformsRes.platforms);
            if (accountsRes?.accounts) setAccounts(accountsRes.accounts);
            if (statsRes) setStats(statsRes);
        } catch {
            // Silently handle — show empty state
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        fetchData();
    }, [fetchData]);

    const handleConnect = useCallback(async (platform: Platform) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // For now, create a placeholder connection
        // In production, this would open an OAuth flow via WebBrowser
        Alert.alert(
            `Connect ${platform.name}`,
            `This will open ${platform.name} to authorize ZeroG to access your content.\n\nYou can import posts, sync your profile, and cross-post content.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Connect',
                    onPress: async () => {
                        try {
                            const res = await apiFetch(API.socialAccounts, {
                                method: 'POST',
                                body: JSON.stringify({
                                    platform: platform.id,
                                    platformUsername: 'pending_oauth',
                                    autoSync: false,
                                }),
                            });
                            if (res?.account) {
                                setAccounts((prev) => [...prev, res.account]);
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            }
                        } catch {
                            Alert.alert('Error', `Failed to connect ${platform.name}. Please try again.`);
                        }
                    },
                },
            ]
        );
    }, []);

    const handleDisconnect = useCallback(async (account: ConnectedAccount) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            'Disconnect Account',
            `Are you sure you want to disconnect your ${account.platform} account? Your imported posts will remain on ZeroG.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Disconnect',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiFetch(API.socialAccount(account.id), { method: 'DELETE' });
                            setAccounts((prev) => prev.filter((a) => a.id !== account.id));
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } catch {
                            Alert.alert('Error', 'Failed to disconnect account.');
                        }
                    },
                },
            ]
        );
    }, []);

    const handleSync = useCallback(async (account: ConnectedAccount) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSyncingId(account.id);
        try {
            await apiFetch(API.socialAccountSync(account.id), { method: 'POST' });
            // Update the account's last sync time
            setAccounts((prev) =>
                prev.map((a) =>
                    a.id === account.id
                        ? { ...a, lastSyncAt: new Date().toISOString(), lastSyncStatus: 'success' }
                        : a
                )
            );
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
            Alert.alert('Sync Failed', 'Could not sync at this time. Please try again later.');
        } finally {
            setSyncingId(null);
        }
    }, []);

    const handleToggleAutoSync = useCallback(async (account: ConnectedAccount, value: boolean) => {
        try {
            await apiFetch(API.socialAccount(account.id), {
                method: 'PATCH',
                body: JSON.stringify({ autoSync: value }),
            });
            setAccounts((prev) =>
                prev.map((a) => (a.id === account.id ? { ...a, autoSync: value } : a))
            );
        } catch {
            // Silently revert
        }
    }, []);

    const getAccountForPlatform = (platformId: string) =>
        accounts.find((a) => a.platform === platformId);

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: c.background }]}>
                <ScreenHeader title="Connected Accounts" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={c.gold[500]} />
                    <Text style={[styles.loadingText, { color: c.text.muted }]}>Loading platforms...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <ScreenHeader title="Connected Accounts" />
            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={c.gold[500]}
                    />
                }
            >
                {/* Stats Overview */}
                {stats && (
                    <Animated.View entering={FadeInDown.duration(300)} style={styles.statsContainer}>
                        <View style={[styles.statCard, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
                            <Text style={[styles.statNumber, { color: c.gold[500] }]}>{stats.activeAccounts}</Text>
                            <Text style={[styles.statLabel, { color: c.text.muted }]}>Connected</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
                            <Text style={[styles.statNumber, { color: c.gold[500] }]}>{stats.totalCrossPosts}</Text>
                            <Text style={[styles.statLabel, { color: c.text.muted }]}>Posts Imported</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
                            <Text style={[styles.statNumber, { color: c.gold[500] }]}>7</Text>
                            <Text style={[styles.statLabel, { color: c.text.muted }]}>Platforms</Text>
                        </View>
                    </Animated.View>
                )}

                {/* Description */}
                <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.descSection}>
                    <Text style={[styles.descTitle, { color: c.text.primary }]}>
                        Cross-Platform Hub
                    </Text>
                    <Text style={[styles.descBody, { color: c.text.secondary }]}>
                        Connect your social accounts to import content, sync your profile, and share posts across platforms — all from ZeroG.
                    </Text>
                </Animated.View>

                {/* Platform Cards */}
                {platforms.map((platform, index) => (
                    <Animated.View key={platform.id} entering={FadeInDown.delay(150 + index * 50).duration(300)}>
                        <PlatformCard
                            platform={platform}
                            account={getAccountForPlatform(platform.id)}
                            onConnect={handleConnect}
                            onDisconnect={handleDisconnect}
                            onSync={handleSync}
                            onToggleAutoSync={handleToggleAutoSync}
                            isSyncing={syncingId === getAccountForPlatform(platform.id)?.id}
                        />
                    </Animated.View>
                ))}

                {/* Privacy note */}
                <Animated.View entering={FadeInDown.delay(600).duration(300)} style={styles.privacyNote}>
                    <Ionicons name="shield-checkmark-outline" size={16} color={c.text.muted} />
                    <Text style={[styles.privacyText, { color: c.text.muted }]}>
                        Your tokens are encrypted at rest. ZeroG never posts to your accounts without explicit permission. You can disconnect at any time.
                    </Text>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

// ── Styles ──
const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontSize: typography.fontSize.sm, marginTop: 8 },

    // Stats
    statsContainer: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
    statCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderRadius: 14,
        borderWidth: 1,
    },
    statNumber: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
    statLabel: { fontSize: 11, fontWeight: '500', marginTop: 2, letterSpacing: 0.3, textTransform: 'uppercase' },

    // Description
    descSection: { marginBottom: spacing.lg },
    descTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3, marginBottom: 4 },
    descBody: { fontSize: typography.fontSize.sm, lineHeight: 20 },

    // Platform Card
    platformCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    platformHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    platformIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    platformInfo: { flex: 1 },
    platformName: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
    platformDesc: { fontSize: 12, marginTop: 1 },
    connectedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    connectedText: { fontSize: 11, fontWeight: '600' },

    // Connected details
    connectedDetails: { marginTop: spacing.sm },
    usernameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingTop: spacing.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    usernameText: { fontSize: 13, fontWeight: '500', flex: 1 },
    postsCount: { fontSize: 11 },

    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
    },
    settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    settingLabel: { fontSize: 14, fontWeight: '500' },

    lastSync: { fontSize: 11, marginBottom: spacing.sm },

    actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
    syncBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    syncBtnText: { fontSize: 13, fontWeight: '600' },
    disconnectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
    },
    disconnectBtnText: { fontSize: 13, fontWeight: '600' },

    // Connect button
    connectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: spacing.sm,
    },
    connectBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

    // Features
    featuresRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
    featureChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    featureText: { fontSize: 10, fontWeight: '500' },

    // Privacy
    privacyNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginTop: spacing.md,
        paddingHorizontal: spacing.xs,
    },
    privacyText: { flex: 1, fontSize: 12, lineHeight: 17 },
});
