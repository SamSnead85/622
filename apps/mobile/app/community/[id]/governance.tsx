import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert,
    TextInput,
    Modal,
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
    Keyboard,
    TouchableWithoutFeedback,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { useTheme } from '../../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { apiFetch, API } from '../../../lib/api';
import { ScreenHeader, LoadingView } from '../../../components';
import { showError } from '../../../stores/toastStore';

interface Proposal {
    id: string;
    title: string;
    description: string;
    type: 'RULE_CHANGE' | 'MODERATOR_ELECTION' | 'BAN_APPEAL' | 'FEATURE_REQUEST' | 'POLICY_CHANGE';
    status: 'ACTIVE' | 'PASSED' | 'REJECTED' | 'EXPIRED';
    votesFor: number;
    votesAgainst: number;
    quorum: number;
    totalMembers: number;
    userVote?: 'FOR' | 'AGAINST' | null;
    expiresAt: string;
    createdAt: string;
    creator?: { displayName: string; username: string };
}

const TYPE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
    RULE_CHANGE: { icon: 'book-outline', color: colors.gold[500], label: 'Rule Change' },
    MODERATOR_ELECTION: { icon: 'person-add-outline', color: colors.azure[500], label: 'Election' },
    BAN_APPEAL: { icon: 'hand-left-outline', color: colors.coral[500], label: 'Ban Appeal' },
    FEATURE_REQUEST: { icon: 'bulb-outline', color: colors.emerald[500], label: 'Feature' },
    POLICY_CHANGE: { icon: 'shield-outline', color: colors.azure[400], label: 'Policy' },
};

const STATUS_COLORS: Record<string, string> = {
    ACTIVE: colors.gold[500],
    PASSED: colors.emerald[500],
    REJECTED: colors.coral[500],
    EXPIRED: colors.text.muted,
};

const PROPOSAL_TYPES = Object.entries(TYPE_CONFIG).map(([value, conf]) => ({
    value,
    ...conf,
}));

function ProposalCard({
    proposal,
    communityId,
    onVote,
    onPress,
}: {
    proposal: Proposal;
    communityId: string;
    onVote: (proposalId: string, vote: 'FOR' | 'AGAINST') => void;
    onPress: () => void;
}) {
    const config = TYPE_CONFIG[proposal.type] || TYPE_CONFIG.FEATURE_REQUEST!;
    const totalVotes = proposal.votesFor + proposal.votesAgainst;
    const forPct = totalVotes > 0 ? Math.round((proposal.votesFor / totalVotes) * 100) : 50;
    const quorumPct = proposal.totalMembers > 0 ? Math.round((totalVotes / proposal.quorum) * 100) : 0;
    const isActive = proposal.status === 'ACTIVE';
    const hasVoted = !!proposal.userVote;

    return (
        <TouchableOpacity style={styles.proposalCard} onPress={onPress} activeOpacity={0.7}>
            {/* Header */}
            <View style={styles.proposalHeader}>
                <View style={[styles.typeBadge, { backgroundColor: config.color + '18' }]}>
                    <Ionicons name={config.icon} size={14} color={config.color} />
                    <Text style={[styles.typeLabel, { color: config.color }]}>{config.label}</Text>
                </View>
                <View style={[styles.statusBadge, { borderColor: STATUS_COLORS[proposal.status] + '40' }]}>
                    <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[proposal.status] }]} />
                    <Text style={[styles.statusLabel, { color: STATUS_COLORS[proposal.status] }]}>
                        {proposal.status.charAt(0) + proposal.status.slice(1).toLowerCase()}
                    </Text>
                </View>
            </View>

            <Text style={styles.proposalTitle}>{proposal.title}</Text>
            <Text style={styles.proposalDesc} numberOfLines={2}>{proposal.description}</Text>

            {/* Vote progress bar */}
            <View style={styles.voteBar}>
                <View style={[styles.voteBarFor, { width: `${forPct}%` }]} />
            </View>
            <View style={styles.voteLabels}>
                <Text style={styles.voteLabelFor}>For {proposal.votesFor}</Text>
                <Text style={styles.voteLabelAgainst}>Against {proposal.votesAgainst}</Text>
            </View>

            {/* Quorum progress */}
            <View style={styles.quorumRow}>
                <Text style={styles.quorumLabel}>Quorum</Text>
                <View style={styles.quorumBar}>
                    <View style={[styles.quorumFill, { width: `${Math.min(100, quorumPct)}%` }]} />
                </View>
                <Text style={styles.quorumPct}>{quorumPct}%</Text>
            </View>

            {/* Vote buttons */}
            {isActive && !hasVoted && (
                <View style={styles.voteButtons}>
                    <TouchableOpacity
                        style={[styles.voteBtn, styles.voteBtnFor]}
                        onPress={() => onVote(proposal.id, 'FOR')}
                    >
                        <Ionicons name="checkmark" size={16} color={colors.emerald[500]} />
                        <Text style={styles.voteBtnForText}>Support</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.voteBtn, styles.voteBtnAgainst]}
                        onPress={() => onVote(proposal.id, 'AGAINST')}
                    >
                        <Ionicons name="close" size={16} color={colors.coral[500]} />
                        <Text style={styles.voteBtnAgainstText}>Oppose</Text>
                    </TouchableOpacity>
                </View>
            )}

            {hasVoted && (
                <View style={styles.votedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.gold[400]} />
                    <Text style={styles.votedText}>You voted {proposal.userVote?.toLowerCase()}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

export default function GovernanceScreen() {
    const router = useRouter();
    const { id: communityId } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const { colors: c } = useTheme();
    const { t } = useTranslation();
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newType, setNewType] = useState('FEATURE_REQUEST');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadProposals();
    }, [communityId]);

    const loadProposals = async () => {
        if (!communityId) return;
        try {
            const data = await apiFetch<any>(API.proposals(communityId));
            const list = data?.proposals || data || [];
            setProposals(Array.isArray(list) ? list : []);
        } catch {
            showError('Could not load proposals');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleVote = async (proposalId: string, vote: 'FOR' | 'AGAINST') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // Optimistic
        setProposals((prev) =>
            prev.map((p) =>
                p.id === proposalId
                    ? {
                        ...p,
                        userVote: vote,
                        votesFor: vote === 'FOR' ? p.votesFor + 1 : p.votesFor,
                        votesAgainst: vote === 'AGAINST' ? p.votesAgainst + 1 : p.votesAgainst,
                    }
                    : p
            )
        );

        try {
            await apiFetch(API.proposalVote(proposalId), {
                method: 'POST',
                body: JSON.stringify({ vote }),
            });
        } catch {
            loadProposals();
            showError('Could not submit vote');
        }
    };

    const handleCreate = async () => {
        if (!newTitle.trim() || !communityId) return;
        setCreating(true);
        try {
            await apiFetch(API.proposals(communityId), {
                method: 'POST',
                body: JSON.stringify({
                    title: newTitle.trim(),
                    description: newDesc.trim(),
                    type: newType,
                }),
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowCreate(false);
            setNewTitle('');
            setNewDesc('');
            loadProposals();
        } catch (e: unknown) {
            Alert.alert('Proposal Creation Failed', e instanceof Error ? e.message : 'Unable to create proposal');
        } finally {
            setCreating(false);
        }
    };

    const renderProposal = useCallback(
        ({ item, index }: { item: Proposal; index: number }) => (
            <Animated.View entering={FadeInDown.duration(300).delay(index * 60)}>
                <ProposalCard
                    proposal={item}
                    communityId={communityId!}
                    onVote={handleVote}
                    onPress={() => router.push(`/community/${communityId}/proposal/${item.id}` as any)}
                />
            </Animated.View>
        ),
        [communityId]
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            <ScreenHeader
                title="Governance"
                rightElement={
                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => setShowCreate(true)}
                    >
                        <Ionicons name="add" size={24} color={colors.gold[400]} />
                    </TouchableOpacity>
                }
            />

            {/* Info banner */}
            <View style={styles.infoBanner}>
                <Ionicons name="information-circle-outline" size={16} color={colors.azure[400]} />
                <Text style={styles.infoText}>
                    Decisions are made democratically. Propose changes and vote on what matters to your community.
                </Text>
            </View>

            {loading ? (
                <LoadingView />
            ) : (
                <FlatList
                    data={proposals}
                    keyExtractor={(item) => item.id}
                    renderItem={renderProposal}
                    contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 40 }}
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    initialNumToRender={10}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProposals(); }} tintColor={colors.gold[500]} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="people-circle-outline" size={48} color={colors.text.muted} />
                            <Text style={styles.emptyTitle}>No proposals yet</Text>
                            <Text style={styles.emptyText}>
                                Be the first to propose a change. The community will vote on it.
                            </Text>
                            <TouchableOpacity
                                style={styles.createBtn}
                                onPress={() => setShowCreate(true)}
                            >
                                <LinearGradient colors={[colors.gold[400], colors.gold[600]]} style={styles.createBtnGradient}>
                                    <Ionicons name="add" size={18} color={c.text.inverse} />
                                    <Text style={[styles.createBtnText, { color: c.text.inverse }]}>New Proposal</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            {/* Moderation log link */}
            <TouchableOpacity
                style={[styles.modLogBtn, { bottom: insets.bottom + spacing.md }]}
                onPress={() => {
                    // Navigate to moderation log
                    Alert.alert(
                        'Moderation Log',
                        'Full transparency: all moderation actions are logged and visible to community members.',
                        [{ text: 'OK' }]
                    );
                }}
            >
                <Ionicons name="document-text-outline" size={14} color={colors.text.muted} />
                <Text style={styles.modLogText}>View Moderation Log</Text>
            </TouchableOpacity>

            {/* Create modal */}
            <Modal visible={showCreate} animationType="slide" transparent>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={[styles.modalContent, { paddingBottom: insets.bottom + spacing.lg }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>New Proposal</Text>
                            <TouchableOpacity onPress={() => setShowCreate(false)}>
                                <Ionicons name="close" size={24} color={colors.text.primary} />
                            </TouchableOpacity>
                        </View>

                        {/* Type selector */}
                        <Text style={styles.modalLabel}>Type</Text>
                        <View style={styles.typeGrid}>
                            {PROPOSAL_TYPES.map((t) => (
                                <TouchableOpacity
                                    key={t.value}
                                    style={[styles.typeChip, newType === t.value && { borderColor: t.color + '60', backgroundColor: t.color + '10' }]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setNewType(t.value);
                                    }}
                                >
                                    <Ionicons name={t.icon} size={14} color={newType === t.value ? t.color : colors.text.muted} />
                                    <Text style={[styles.typeChipText, newType === t.value && { color: t.color }]}>{t.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.modalLabel}>Title</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t('communities.proposeTitle')}
                            placeholderTextColor={colors.text.muted}
                            value={newTitle}
                            onChangeText={setNewTitle}
                            maxLength={120}
                        />

                        <Text style={styles.modalLabel}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.inputMulti]}
                            placeholder={t('communities.proposeDetail')}
                            placeholderTextColor={colors.text.muted}
                            value={newDesc}
                            onChangeText={setNewDesc}
                            multiline
                            maxLength={1000}
                        />

                        <TouchableOpacity
                            style={[styles.submitBtn, (!newTitle.trim()) && styles.submitBtnDisabled]}
                            onPress={handleCreate}
                            disabled={creating || !newTitle.trim()}
                        >
                            <LinearGradient
                                colors={newTitle.trim() ? [colors.gold[400], colors.gold[600]] : [colors.obsidian[500], colors.obsidian[600]]}
                                style={styles.submitBtnGradient}
                            >
                                {creating ? (
                                    <ActivityIndicator size="small" color={c.text.inverse} />
                                ) : (
                                    <Text style={[styles.submitBtnText, { color: newTitle.trim() ? c.text.inverse : colors.text.muted }]}>
                                        Submit Proposal
                                    </Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    addBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center', justifyContent: 'center',
    },

    // Info banner
    infoBanner: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        marginHorizontal: spacing.lg, marginTop: spacing.md,
        paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
        backgroundColor: colors.azure[500] + '10', borderRadius: 10,
    },
    infoText: {
        flex: 1, fontSize: typography.fontSize.xs, color: colors.azure[400],
        lineHeight: 16,
    },

    // Proposal card
    proposalCard: {
        backgroundColor: colors.surface.glass, borderRadius: 16,
        padding: spacing.lg, marginBottom: spacing.md,
        borderWidth: 1, borderColor: colors.border.subtle,
    },
    proposalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: spacing.sm,
    },
    typeBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 6,
    },
    typeLabel: { fontSize: 11, fontWeight: '700' },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: spacing.sm, paddingVertical: 3,
        borderRadius: 6, borderWidth: 1,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusLabel: { fontSize: 11, fontWeight: '700' },
    proposalTitle: {
        fontSize: typography.fontSize.lg, fontWeight: '700',
        color: colors.text.primary, lineHeight: 22, marginBottom: 4,
    },
    proposalDesc: {
        fontSize: typography.fontSize.sm, color: colors.text.secondary,
        lineHeight: 18, marginBottom: spacing.md,
    },

    // Vote bar
    voteBar: {
        height: 6, borderRadius: 3, backgroundColor: colors.coral[500] + '30',
        overflow: 'hidden',
    },
    voteBarFor: {
        height: '100%', backgroundColor: colors.emerald[500],
        borderRadius: 3,
    },
    voteLabels: {
        flexDirection: 'row', justifyContent: 'space-between', marginTop: 4,
    },
    voteLabelFor: { fontSize: 11, color: colors.emerald[500], fontWeight: '600' },
    voteLabelAgainst: { fontSize: 11, color: colors.coral[500], fontWeight: '600' },

    // Quorum
    quorumRow: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        marginTop: spacing.sm,
    },
    quorumLabel: { fontSize: 11, color: colors.text.muted, fontWeight: '500' },
    quorumBar: {
        flex: 1, height: 3, borderRadius: 2,
        backgroundColor: colors.obsidian[600],
    },
    quorumFill: {
        height: '100%', borderRadius: 2, backgroundColor: colors.gold[500],
    },
    quorumPct: { fontSize: 11, color: colors.text.muted, fontWeight: '600', width: 30, textAlign: 'right' },

    // Vote buttons
    voteButtons: {
        flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md,
    },
    voteBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: 10,
        borderWidth: 1,
    },
    voteBtnFor: {
        borderColor: colors.emerald[500] + '40',
        backgroundColor: colors.emerald[500] + '10',
    },
    voteBtnAgainst: {
        borderColor: colors.coral[500] + '40',
        backgroundColor: colors.coral[500] + '10',
    },
    voteBtnForText: {
        fontSize: typography.fontSize.sm, fontWeight: '600', color: colors.emerald[500],
    },
    voteBtnAgainstText: {
        fontSize: typography.fontSize.sm, fontWeight: '600', color: colors.coral[500],
    },
    votedBadge: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
        marginTop: spacing.sm,
    },
    votedText: {
        fontSize: typography.fontSize.xs, color: colors.gold[400], fontWeight: '500',
    },

    // Empty
    emptyState: { alignItems: 'center', paddingTop: 60 },
    emptyTitle: {
        fontSize: typography.fontSize.lg, fontWeight: '700',
        color: colors.text.primary, marginTop: spacing.md,
    },
    emptyText: {
        fontSize: typography.fontSize.base, color: colors.text.muted,
        textAlign: 'center', marginTop: spacing.sm, lineHeight: 22,
        paddingHorizontal: spacing.xl, marginBottom: spacing.xl,
    },
    createBtn: { borderRadius: 14, overflow: 'hidden' },
    createBtnGradient: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        paddingVertical: spacing.md, paddingHorizontal: spacing.xl,
    },
    createBtnText: {
        fontSize: typography.fontSize.base, fontWeight: '700',
    },

    // Mod log
    modLogBtn: {
        position: 'absolute', left: spacing.lg, right: spacing.lg,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: spacing.xs, paddingVertical: spacing.sm,
    },
    modLogText: {
        fontSize: typography.fontSize.xs, color: colors.text.muted,
        textDecorationLine: 'underline',
    },

    // Modal
    modalOverlay: {
        flex: 1, justifyContent: 'flex-end',
        backgroundColor: colors.surface.overlayMedium,
    },
    modalContent: {
        backgroundColor: colors.obsidian[800],
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: spacing.xl,
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: spacing.xl,
    },
    modalTitle: {
        fontSize: 20, fontWeight: '700', color: colors.text.primary, fontFamily: 'Inter-Bold',
    },
    modalLabel: {
        fontSize: typography.fontSize.xs, fontWeight: '700',
        color: colors.text.muted, textTransform: 'uppercase',
        letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.md,
    },
    typeGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs,
    },
    typeChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
        borderRadius: 8, borderWidth: 1, borderColor: colors.border.subtle,
    },
    typeChipText: {
        fontSize: typography.fontSize.xs, color: colors.text.muted, fontWeight: '600',
    },
    input: {
        backgroundColor: colors.surface.glass, borderRadius: 12,
        padding: spacing.md, fontSize: typography.fontSize.base,
        color: colors.text.primary, borderWidth: 1, borderColor: colors.border.subtle,
    },
    inputMulti: { minHeight: 100, textAlignVertical: 'top' },
    submitBtn: {
        borderRadius: 14, overflow: 'hidden', marginTop: spacing.xl,
    },
    submitBtnDisabled: {},
    submitBtnGradient: {
        alignItems: 'center', justifyContent: 'center', paddingVertical: 14,
    },
    submitBtnText: {
        fontSize: typography.fontSize.base, fontWeight: '700',
    },
});
