import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { apiFetch, API } from '../../../lib/api';
import { ScreenHeader, LoadingView } from '../../../components';
import { showError } from '../../../stores/toastStore';

interface PollOption {
    id: string;
    text: string;
    votes: number;
}

interface Poll {
    id: string;
    question: string;
    options: PollOption[];
    totalVotes: number;
    userVoteId?: string;
    isAnonymous: boolean;
    expiresAt?: string;
    createdAt: string;
    creator?: { displayName: string; username: string };
}

function getTimeRemaining(expiresAt?: string): string | null {
    if (!expiresAt) return null;
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms <= 0) return 'Ended';
    const hours = Math.floor(ms / 3600000);
    if (hours >= 24) return `${Math.floor(hours / 24)}d left`;
    if (hours >= 1) return `${hours}h left`;
    return `${Math.floor(ms / 60000)}m left`;
}

function PollCard({
    poll,
    communityId,
    onVote,
}: {
    poll: Poll;
    communityId: string;
    onVote: (pollId: string, optionId: string) => void;
}) {
    const totalVotes = poll.totalVotes || poll.options.reduce((sum, o) => sum + o.votes, 0);
    const hasVoted = !!poll.userVoteId;
    const timeLeft = getTimeRemaining(poll.expiresAt);
    const isExpired = timeLeft === 'Ended';

    return (
        <View style={styles.pollCard}>
            <View style={styles.pollHeader}>
                <Text style={styles.pollQuestion}>{poll.question}</Text>
                {poll.isAnonymous && (
                    <View style={styles.anonBadge}>
                        <Ionicons name="eye-off-outline" size={12} color={colors.text.muted} />
                        <Text style={styles.anonText}>Anonymous</Text>
                    </View>
                )}
            </View>

            {poll.options.map((option) => {
                const pct = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
                const isMyVote = poll.userVoteId === option.id;

                return (
                    <TouchableOpacity
                        key={option.id}
                        style={styles.optionRow}
                        onPress={() => {
                            if (!hasVoted && !isExpired) onVote(poll.id, option.id);
                        }}
                        activeOpacity={hasVoted || isExpired ? 1 : 0.7}
                        disabled={hasVoted || isExpired}
                    >
                        {(hasVoted || isExpired) && (
                            <View style={[styles.optionBar, { width: `${pct}%` }]} />
                        )}
                        <Text style={[styles.optionText, isMyVote && styles.optionTextVoted]}>
                            {option.text}
                        </Text>
                        {(hasVoted || isExpired) && (
                            <Text style={styles.optionPct}>{pct}%</Text>
                        )}
                        {isMyVote && (
                            <Ionicons name="checkmark-circle" size={16} color={colors.gold[400]} style={{ marginStart: 4 }} />
                        )}
                    </TouchableOpacity>
                );
            })}

            <View style={styles.pollFooter}>
                <Text style={styles.pollVotes}>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</Text>
                {timeLeft && (
                    <Text style={[styles.pollExpiry, isExpired && { color: colors.coral[400] }]}>{timeLeft}</Text>
                )}
            </View>
        </View>
    );
}

export default function CommunityPollsScreen() {
    const router = useRouter();
    const { id: communityId } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const [polls, setPolls] = useState<Poll[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadPolls();
    }, [communityId]);

    const loadPolls = async () => {
        if (!communityId) return;
        try {
            const data = await apiFetch<any>(API.communityPolls(communityId));
            const list = data.polls || data || [];
            setPolls(Array.isArray(list) ? list : []);
        } catch {
            showError('Could not load polls');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadPolls();
    };

    const handleVote = async (pollId: string, optionId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // Optimistic update
        setPolls((prev) =>
            prev.map((p) =>
                p.id === pollId
                    ? {
                        ...p,
                        userVoteId: optionId,
                        totalVotes: p.totalVotes + 1,
                        options: p.options.map((o) =>
                            o.id === optionId ? { ...o, votes: o.votes + 1 } : o
                        ),
                    }
                    : p
            )
        );

        try {
            await apiFetch(API.communityPollVote(communityId!, pollId), {
                method: 'POST',
                body: JSON.stringify({ optionId }),
            });
        } catch {
            // Revert on failure
            loadPolls();
            showError('Could not submit vote');
        }
    };

    const renderPoll = useCallback(
        ({ item, index }: { item: Poll; index: number }) => (
            <Animated.View entering={FadeInDown.duration(300).delay(index * 60)}>
                <PollCard poll={item} communityId={communityId!} onVote={handleVote} />
            </Animated.View>
        ),
        [communityId]
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            <ScreenHeader
                title="Polls"
                rightElement={
                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => router.push(`/community/${communityId}/poll-create` as any)}
                    >
                        <Ionicons name="add" size={24} color={colors.gold[400]} />
                    </TouchableOpacity>
                }
            />

            {loading ? (
                <LoadingView />
            ) : (
                <FlatList
                    data={polls}
                    keyExtractor={(item) => item.id}
                    renderItem={renderPoll}
                    contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 40 }}
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    initialNumToRender={10}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.gold[500]} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="bar-chart-outline" size={48} color={colors.text.muted} />
                            <Text style={styles.emptyTitle}>No polls yet</Text>
                            <Text style={styles.emptyText}>
                                Create a poll to get the community's opinion on something.
                            </Text>
                            <TouchableOpacity
                                style={styles.createBtn}
                                onPress={() => router.push(`/community/${communityId}/poll-create` as any)}
                            >
                                <LinearGradient colors={[colors.gold[400], colors.gold[600]]} style={styles.createBtnGradient}>
                                    <Ionicons name="add" size={18} color={colors.obsidian[900]} />
                                    <Text style={styles.createBtnText}>Create Poll</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
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

    // Poll card
    pollCard: {
        backgroundColor: colors.surface.glass, borderRadius: 16,
        padding: spacing.lg, marginBottom: spacing.md,
        borderWidth: 1, borderColor: colors.border.subtle,
    },
    pollHeader: { marginBottom: spacing.md },
    pollQuestion: {
        fontSize: typography.fontSize.lg, fontWeight: '700',
        color: colors.text.primary, lineHeight: 24,
    },
    anonBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        marginTop: spacing.xs,
    },
    anonText: { fontSize: typography.fontSize.xs, color: colors.text.muted },
    optionRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.obsidian[700], borderRadius: 10,
        paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md,
        marginBottom: spacing.xs, overflow: 'hidden', position: 'relative',
    },
    optionBar: {
        position: 'absolute', left: 0, top: 0, bottom: 0,
        backgroundColor: colors.gold[500] + '15',
        borderRadius: 10,
    },
    optionText: {
        flex: 1, fontSize: typography.fontSize.base, color: colors.text.secondary,
        fontWeight: '500', zIndex: 1,
    },
    optionTextVoted: { color: colors.gold[400], fontWeight: '600' },
    optionPct: {
        fontSize: typography.fontSize.sm, color: colors.text.muted,
        fontWeight: '600', zIndex: 1,
    },
    pollFooter: {
        flexDirection: 'row', justifyContent: 'space-between',
        marginTop: spacing.sm,
    },
    pollVotes: { fontSize: typography.fontSize.sm, color: colors.text.muted },
    pollExpiry: { fontSize: typography.fontSize.sm, color: colors.text.muted },

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
        color: colors.obsidian[900],
    },
});
