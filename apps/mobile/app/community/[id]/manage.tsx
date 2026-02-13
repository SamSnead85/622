import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    TextInput,
    Alert,
    RefreshControl,
    Platform,
    ActionSheetIOS,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { useTranslation } from 'react-i18next';
import { apiFetch, API } from '../../../lib/api';
import { ScreenHeader, LoadingView, Avatar } from '../../../components';

interface Member {
    id: string;
    userId: string;
    role: 'admin' | 'moderator' | 'member';
    joinedAt: string;
    user: {
        id: string;
        displayName: string;
        username: string;
        avatarUrl?: string;
    };
}

const ROLE_COLORS = {
    admin: colors.gold[500],
    moderator: colors.azure[500],
    member: colors.text.muted,
};

const ROLE_LABELS = {
    admin: 'Admin',
    moderator: 'Mod',
    member: 'Member',
};

export default function CommunityManageScreen() {
    const router = useRouter();
    const { id: communityId } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState<string | null>(null);

    useEffect(() => {
        loadMembers();
    }, [communityId]);

    const loadMembers = async () => {
        if (!communityId) return;
        try {
            const data = await apiFetch<any>(API.communityMembers(communityId));
            const list = data.members || data || [];
            setMembers(Array.isArray(list) ? list : []);
        } catch {
            // silent
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleAction = (member: Member, action: 'promote' | 'demote' | 'mute' | 'ban' | 'remove') => {
        const name = member.user?.displayName || member.user?.username || 'this member';
        const labels: Record<string, string> = {
            promote: `Promote ${name} to moderator?`,
            demote: `Remove moderator role from ${name}?`,
            mute: `Mute ${name}?`,
            ban: `Ban ${name} from this community?`,
            remove: `Remove ${name} from this community?`,
        };

        Alert.alert('Confirm Action', labels[action], [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Confirm',
                style: action === 'ban' || action === 'remove' ? 'destructive' : 'default',
                onPress: async () => {
                    try {
                        await apiFetch(API.communityMember(communityId!, member.userId), {
                            method: 'PUT',
                            body: JSON.stringify({ action }),
                        });
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        loadMembers();
                    } catch (e: unknown) {
                        Alert.alert('Action Failed', e instanceof Error ? e.message : 'Unable to complete action');
                    }
                },
            },
        ]);
    };

    const filteredMembers = members.filter((m) => {
        const matchesSearch = !searchQuery ||
            (m.user?.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (m.user?.username || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = !filterRole || m.role === filterRole;
        return matchesSearch && matchesRole;
    });

    const showMemberActions = useCallback((member: Member) => {
        if (member.role === 'admin') return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const isMod = member.role === 'moderator';
        const toggleModLabel = isMod ? 'Remove Moderator' : 'Make Moderator';
        const toggleModAction = isMod ? 'demote' as const : 'promote' as const;

        if (Platform.OS === 'ios') {
            const options = [toggleModLabel, 'Remove from Group', 'Cancel'];
            const destructiveButtonIndex = 1;
            const cancelButtonIndex = 2;
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    destructiveButtonIndex,
                    cancelButtonIndex,
                    title: member.user?.displayName || 'Member',
                    message: `@${member.user?.username || 'unknown'}`,
                },
                (buttonIndex) => {
                    if (buttonIndex === 0) handleAction(member, toggleModAction);
                    if (buttonIndex === 1) handleAction(member, 'remove');
                },
            );
        } else {
            Alert.alert(
                member.user?.displayName || 'Member',
                `@${member.user?.username || 'unknown'}`,
                [
                    { text: toggleModLabel, onPress: () => handleAction(member, toggleModAction) },
                    { text: 'Remove from Group', style: 'destructive', onPress: () => handleAction(member, 'remove') },
                    { text: 'Cancel', style: 'cancel' },
                ],
            );
        }
    }, [communityId]);

    const renderMember = useCallback(({ item, index }: { item: Member; index: number }) => (
        <Animated.View entering={FadeInDown.duration(300).delay(index * 30)}>
            <TouchableOpacity
                style={styles.memberCard}
                activeOpacity={0.85}
                onLongPress={() => showMemberActions(item)}
                delayLongPress={400}
            >
                <View style={styles.memberLeft}>
                    <Avatar uri={item.user?.avatarUrl} name={item.user?.displayName || 'Member'} size="md" />
                    <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{item.user?.displayName || 'Member'}</Text>
                        <Text style={styles.memberUsername}>@{item.user?.username || 'unknown'}</Text>
                    </View>
                </View>
                <View style={styles.memberRight}>
                    <View style={[styles.rolePill, { borderColor: ROLE_COLORS[item.role] + '40' }]}>
                        <Text style={[styles.roleLabel, { color: ROLE_COLORS[item.role] }]}>
                            {ROLE_LABELS[item.role]}
                        </Text>
                    </View>
                    {item.role !== 'admin' && (
                        <TouchableOpacity
                            style={styles.moreBtn}
                            onPress={() => showMemberActions(item)}
                        >
                            <Ionicons name="ellipsis-horizontal" size={18} color={colors.text.muted} />
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableOpacity>
        </Animated.View>
    ), [communityId, showMemberActions]);

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            <ScreenHeader
                title="Manage Members"
                rightElement={<Text style={styles.memberCount}>{members.length}</Text>}
            />

            {/* Search */}
            <View style={styles.searchRow}>
                <View style={styles.searchInput}>
                    <Ionicons name="search-outline" size={18} color={colors.text.muted} />
                    <TextInput
                        style={styles.searchText}
                        placeholder={t('communities.searchMembers')}
                        placeholderTextColor={colors.text.muted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {/* Role Filters */}
            <View style={styles.filterRow}>
                {[null, 'admin', 'moderator', 'member'].map((role) => (
                    <TouchableOpacity
                        key={role || 'all'}
                        style={[styles.filterChip, filterRole === role && styles.filterChipActive]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setFilterRole(role);
                        }}
                    >
                        <Text style={[styles.filterText, filterRole === role && styles.filterTextActive]}>
                            {role ? ROLE_LABELS[role as keyof typeof ROLE_LABELS] : 'All'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <LoadingView />
            ) : (
                <FlatList
                    data={filteredMembers}
                    keyExtractor={(item) => item.id || item.userId}
                    renderItem={renderMember}
                    contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 40 }}
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    initialNumToRender={10}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadMembers(); }} tintColor={colors.gold[500]} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="people-outline" size={48} color={colors.text.muted} />
                            <Text style={styles.emptyText}>
                                {searchQuery ? 'No members match your search' : 'No members yet'}
                            </Text>
                        </View>
                    }
                    ListFooterComponent={
                        filteredMembers.length > 0 ? (
                            <TouchableOpacity
                                style={styles.viewAllBtn}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    Alert.alert(
                                        'All Members',
                                        `This community has ${members.length} member${members.length !== 1 ? 's' : ''}.`,
                                        [{ text: 'OK' }],
                                    );
                                }}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="people-outline" size={16} color={colors.gold[400]} />
                                <Text style={styles.viewAllText}>View All Members ({members.length})</Text>
                                <Ionicons name="chevron-forward" size={16} color={colors.gold[400]} />
                            </TouchableOpacity>
                        ) : null
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    memberCount: {
        fontSize: typography.fontSize.base, color: colors.text.muted, fontWeight: '600',
        width: 40, textAlign: 'right',
    },
    searchRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
    searchInput: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        backgroundColor: colors.surface.glass, borderRadius: 12,
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        borderWidth: 1, borderColor: colors.border.subtle,
    },
    searchText: {
        flex: 1, fontSize: typography.fontSize.base, color: colors.text.primary,
    },
    filterRow: {
        flexDirection: 'row', gap: spacing.sm,
        paddingHorizontal: spacing.lg, paddingBottom: spacing.sm,
    },
    filterChip: {
        paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
        borderRadius: 10, backgroundColor: colors.surface.glass,
        borderWidth: 1, borderColor: colors.border.subtle,
    },
    filterChipActive: {
        borderColor: colors.gold[500] + '60',
        backgroundColor: colors.surface.goldSubtle,
    },
    filterText: {
        fontSize: typography.fontSize.sm, color: colors.text.muted, fontWeight: '500',
    },
    filterTextActive: { color: colors.gold[400] },
    memberCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: colors.surface.glass, borderRadius: 14,
        padding: spacing.md, marginBottom: spacing.xs,
        borderWidth: 1, borderColor: colors.border.subtle,
    },
    memberLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    memberInfo: { marginStart: spacing.md, flex: 1 },
    memberName: {
        fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.primary,
    },
    memberUsername: {
        fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: 1,
    },
    memberRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    rolePill: {
        paddingHorizontal: spacing.sm, paddingVertical: 2,
        borderRadius: 6, borderWidth: 1,
    },
    roleLabel: { fontSize: typography.fontSize.xs, fontWeight: '700' },
    moreBtn: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center', justifyContent: 'center',
    },
    emptyState: { alignItems: 'center', paddingTop: 80 },
    emptyText: {
        fontSize: typography.fontSize.base, color: colors.text.muted,
        marginTop: spacing.lg, textAlign: 'center',
    },
    viewAllBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: spacing.sm, backgroundColor: colors.surface.glass,
        borderRadius: 14, paddingVertical: spacing.md, marginTop: spacing.md,
        borderWidth: 1, borderColor: colors.gold[500] + '30',
    },
    viewAllText: {
        fontSize: typography.fontSize.base, fontWeight: '600', color: colors.gold[400],
    },
});
