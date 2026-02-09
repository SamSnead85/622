import { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { apiFetch, API } from '../../../../lib/api';

interface ProposalDetail {
    id: string;
    title: string;
    description: string;
    type: string;
    status: 'ACTIVE' | 'PASSED' | 'REJECTED' | 'EXPIRED';
    votesFor: number;
    votesAgainst: number;
    quorum: number;
    totalMembers: number;
    userVote?: 'FOR' | 'AGAINST' | null;
    expiresAt: string;
    createdAt: string;
    creator?: { displayName: string; username: string; avatarUrl?: string };
}

interface ModLogEntry {
    id: string;
    action: string;
    reason?: string;
    createdAt: string;
    actor?: { displayName: string };
}

const TYPE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
    RULE_CHANGE: { icon: 'book-outline', color: colors.gold[500], label: 'Rule Change' },
    MODERATOR_ELECTION: { icon: 'person-add-outline', color: colors.azure[500], label: 'Election' },
    BAN_APPEAL: { icon: 'hand-left-outline', color: colors.coral[500], label: 'Ban Appeal' },
    FEATURE_REQUEST: { icon: 'bulb-outline', color: colors.emerald[500], label: 'Feature Request' },
    POLICY_CHANGE: { icon: 'shield-outline', color: '#A78BFA', label: 'Policy Change' },
};

const STATUS_COLORS: Record<string, string> = {
    ACTIVE: colors.gold[500],
    PASSED: colors.emerald[500],
    REJECTED: colors.coral[500],
    EXPIRED: colors.text.muted,
};

function getTimeRemaining(expiresAt: string): string {
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms <= 0) return 'Voting ended';
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h remaining`;
    return `${Math.floor(ms / 60000)}m remaining`;
}

export default function ProposalDetailScreen() {
    const router = useRouter();
    const { id: communityId, proposalId } = useLocalSearchParams<{ id: string; proposalId: string }>();
    const insets = useSafeAreaInsets();
    const [proposal, setProposal] = useState<ProposalDetail | null>(null);
    const [modLog, setModLog] = useState<ModLogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [proposalId]);

    const loadData = async () => {
        if (!communityId || !proposalId) return;
        try {
            const [propRes, logRes] = await Promise.allSettled([
                apiFetch<any>(`${API.proposals(communityId)}/${proposalId}`),
                apiFetch<any>(API.moderationLog(communityId)),
            ]);

            if (propRes.status === 'fulfilled') {
                setProposal(propRes.value?.proposal || propRes.value);
            }
            if (logRes.status === 'fulfilled') {
                const entries = logRes.value?.entries || logRes.value || [];
                setModLog(Array.isArray(entries) ? entries.slice(0, 20) : []);
            }
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    };

    const handleVote = async (vote: 'FOR' | 'AGAINST') => {
        if (!proposal || !proposalId) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Optimistic
        setProposal((prev) =>
            prev
                ? {
                    ...prev,
                    userVote: vote,
                    votesFor: vote === 'FOR' ? prev.votesFor + 1 : prev.votesFor,
                    votesAgainst: vote === 'AGAINST' ? prev.votesAgainst + 1 : prev.votesAgainst,
                }
                : prev
        );

        try {
            await apiFetch(API.proposalVote(proposalId), {
                method: 'POST',
                body: JSON.stringify({ vote }),
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
            loadData();
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />
                <ActivityIndicator size="large" color={colors.gold[500]} />
            </View>
        );
    }

    if (!proposal) {
        return (
            <View style={[styles.container, styles.centered]}>
                <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />
                <Ionicons name="document-text-outline" size={48} color={colors.text.muted} />
                <Text style={styles.errorText}>Proposal not found</Text>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backLinkText}>Go back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const config = TYPE_CONFIG[proposal.type] || TYPE_CONFIG.FEATURE_REQUEST!;
    const totalVotes = proposal.votesFor + proposal.votesAgainst;
    const forPct = totalVotes > 0 ? Math.round((proposal.votesFor / totalVotes) * 100) : 50;
    const quorumPct = proposal.quorum > 0 ? Math.round((totalVotes / proposal.quorum) * 100) : 0;
    const isActive = proposal.status === 'ACTIVE';

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Proposal</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 120 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Type & Status */}
                <Animated.View entering={FadeIn.duration(300)} style={styles.metaRow}>
                    <View style={[styles.typeBadge, { backgroundColor: config.color + '18' }]}>
                        <Ionicons name={config.icon} size={16} color={config.color} />
                        <Text style={[styles.typeLabel, { color: config.color }]}>{config.label}</Text>
                    </View>
                    <View style={[styles.statusBadge, { borderColor: STATUS_COLORS[proposal.status] + '40' }]}>
                        <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[proposal.status] }]} />
                        <Text style={[styles.statusLabel, { color: STATUS_COLORS[proposal.status] }]}>
                            {proposal.status.charAt(0) + proposal.status.slice(1).toLowerCase()}
                        </Text>
                    </View>
                </Animated.View>

                {/* Title & Description */}
                <Animated.View entering={FadeInDown.duration(300).delay(100)}>
                    <Text style={styles.title}>{proposal.title}</Text>
                    <Text style={styles.description}>{proposal.description}</Text>
                    {proposal.creator && (
                        <Text style={styles.creator}>
                            Proposed by {proposal.creator.displayName} (@{proposal.creator.username})
                        </Text>
                    )}
                    <Text style={styles.expiry}>{getTimeRemaining(proposal.expiresAt)}</Text>
                </Animated.View>

                {/* Vote progress */}
                <Animated.View entering={FadeInDown.duration(300).delay(200)} style={styles.voteSection}>
                    <Text style={styles.sectionTitle}>Votes</Text>
                    <View style={styles.voteBar}>
                        <View style={[styles.voteBarFor, { width: `${forPct}%` }]} />
                    </View>
                    <View style={styles.voteLabels}>
                        <View style={styles.voteLabelRow}>
                            <View style={[styles.voteDot, { backgroundColor: colors.emerald[500] }]} />
                            <Text style={styles.voteLabelFor}>For: {proposal.votesFor} ({forPct}%)</Text>
                        </View>
                        <View style={styles.voteLabelRow}>
                            <View style={[styles.voteDot, { backgroundColor: colors.coral[500] }]} />
                            <Text style={styles.voteLabelAgainst}>Against: {proposal.votesAgainst} ({100 - forPct}%)</Text>
                        </View>
                    </View>

                    {/* Quorum */}
                    <View style={styles.quorumSection}>
                        <Text style={styles.quorumLabel}>
                            Quorum Progress: {totalVotes} / {proposal.quorum} votes needed
                        </Text>
                        <View style={styles.quorumBar}>
                            <View style={[styles.quorumFill, { width: `${Math.min(100, quorumPct)}%` }]} />
                        </View>
                    </View>
                </Animated.View>

                {/* Vote buttons */}
                {isActive && !proposal.userVote && (
                    <Animated.View entering={FadeInDown.duration(300).delay(300)} style={styles.voteButtons}>
                        <TouchableOpacity style={styles.voteFor} onPress={() => handleVote('FOR')} activeOpacity={0.8}>
                            <LinearGradient colors={[colors.emerald[400], colors.emerald[600]]} style={styles.voteBtnGradient}>
                                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                <Text style={styles.voteBtnText}>Support</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.voteAgainst} onPress={() => handleVote('AGAINST')} activeOpacity={0.8}>
                            <View style={styles.voteAgainstInner}>
                                <Ionicons name="close-circle" size={20} color={colors.coral[500]} />
                                <Text style={styles.voteAgainstText}>Oppose</Text>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {proposal.userVote && (
                    <View style={styles.userVoteBadge}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.gold[400]} />
                        <Text style={styles.userVoteText}>
                            You voted {proposal.userVote.toLowerCase()} this proposal
                        </Text>
                    </View>
                )}

                {/* Moderation Log */}
                {modLog.length > 0 && (
                    <Animated.View entering={FadeInDown.duration(300).delay(400)}>
                        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Moderation Log</Text>
                        <Text style={styles.modLogInfo}>Full transparency — all actions are recorded</Text>
                        {modLog.map((entry) => (
                            <View key={entry.id} style={styles.logEntry}>
                                <Ionicons name="document-text-outline" size={14} color={colors.text.muted} />
                                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                                    <Text style={styles.logAction}>{entry.action}</Text>
                                    {entry.reason && <Text style={styles.logReason}>{entry.reason}</Text>}
                                    <Text style={styles.logMeta}>
                                        {entry.actor?.displayName || 'System'} · {new Date(entry.createdAt).toLocaleDateString()}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </Animated.View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    centered: { alignItems: 'center', justifyContent: 'center' },
    errorText: { fontSize: typography.fontSize.lg, color: colors.text.muted, marginTop: spacing.md },
    backLinkText: { fontSize: typography.fontSize.base, color: colors.gold[500], marginTop: spacing.sm },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
        borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20, fontWeight: '700', color: colors.text.primary, fontFamily: 'Inter-Bold',
    },
    scroll: { flex: 1 },

    // Meta
    metaRow: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    typeBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 8,
    },
    typeLabel: { fontSize: typography.fontSize.xs, fontWeight: '700' },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: spacing.sm, paddingVertical: 4,
        borderRadius: 8, borderWidth: 1,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusLabel: { fontSize: typography.fontSize.xs, fontWeight: '700' },

    // Content
    title: {
        fontSize: 24, fontWeight: '700', color: colors.text.primary,
        fontFamily: 'Inter-Bold', lineHeight: 30, letterSpacing: -0.5,
    },
    description: {
        fontSize: typography.fontSize.base, color: colors.text.secondary,
        lineHeight: 24, marginTop: spacing.md,
    },
    creator: {
        fontSize: typography.fontSize.sm, color: colors.text.muted,
        marginTop: spacing.md,
    },
    expiry: {
        fontSize: typography.fontSize.sm, color: colors.gold[400],
        fontWeight: '600', marginTop: spacing.xs,
    },

    // Votes
    voteSection: {
        marginTop: spacing.xl, backgroundColor: colors.surface.glass,
        borderRadius: 16, padding: spacing.lg,
        borderWidth: 1, borderColor: colors.border.subtle,
    },
    sectionTitle: {
        fontSize: typography.fontSize.base, fontWeight: '700',
        color: colors.text.primary, fontFamily: 'Inter-Bold',
        marginBottom: spacing.md,
    },
    voteBar: {
        height: 8, borderRadius: 4, backgroundColor: colors.coral[500] + '30',
        overflow: 'hidden',
    },
    voteBarFor: {
        height: '100%', backgroundColor: colors.emerald[500], borderRadius: 4,
    },
    voteLabels: { marginTop: spacing.sm, gap: spacing.xs },
    voteLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    voteDot: { width: 8, height: 8, borderRadius: 4 },
    voteLabelFor: { fontSize: typography.fontSize.sm, color: colors.emerald[500], fontWeight: '600' },
    voteLabelAgainst: { fontSize: typography.fontSize.sm, color: colors.coral[500], fontWeight: '600' },
    quorumSection: { marginTop: spacing.md },
    quorumLabel: { fontSize: typography.fontSize.xs, color: colors.text.muted, marginBottom: spacing.xs },
    quorumBar: {
        height: 4, borderRadius: 2, backgroundColor: colors.obsidian[600],
    },
    quorumFill: {
        height: '100%', borderRadius: 2, backgroundColor: colors.gold[500],
    },

    // Vote buttons
    voteButtons: {
        flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl,
    },
    voteFor: { flex: 1, borderRadius: 14, overflow: 'hidden' },
    voteBtnGradient: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: spacing.sm, paddingVertical: spacing.md,
    },
    voteBtnText: { fontSize: typography.fontSize.base, fontWeight: '700', color: '#fff' },
    voteAgainst: {
        flex: 1, borderRadius: 14, borderWidth: 1.5,
        borderColor: colors.coral[500] + '50',
    },
    voteAgainstInner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: spacing.sm, paddingVertical: spacing.md,
    },
    voteAgainstText: {
        fontSize: typography.fontSize.base, fontWeight: '700', color: colors.coral[500],
    },
    userVoteBadge: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
        marginTop: spacing.lg, justifyContent: 'center',
    },
    userVoteText: {
        fontSize: typography.fontSize.sm, color: colors.gold[400], fontWeight: '500',
    },

    // Moderation log
    modLogInfo: {
        fontSize: typography.fontSize.xs, color: colors.text.muted,
        marginTop: -spacing.sm, marginBottom: spacing.md,
    },
    logEntry: {
        flexDirection: 'row', paddingVertical: spacing.sm,
        borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
    },
    logAction: {
        fontSize: typography.fontSize.sm, color: colors.text.primary, fontWeight: '500',
    },
    logReason: {
        fontSize: typography.fontSize.xs, color: colors.text.secondary, marginTop: 2,
    },
    logMeta: {
        fontSize: 11, color: colors.text.muted, marginTop: 2,
    },
});
