import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    RefreshControl,
    Modal,
    TextInput,
    Switch,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
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

// ============================================
// Expiration Options
// ============================================

const EXPIRATION_OPTIONS = [
    { label: '1 day', value: '1d' },
    { label: '3 days', value: '3d' },
    { label: '7 days', value: '7d' },
    { label: 'No expiration', value: null },
] as const;

// ============================================
// Create Poll Modal
// ============================================

function CreatePollModal({
    visible,
    onClose,
    communityId,
    onCreated,
}: {
    visible: boolean;
    onClose: () => void;
    communityId: string;
    onCreated: (poll: Poll) => void;
}) {
    const insets = useSafeAreaInsets();
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [allowMultiple, setAllowMultiple] = useState(false);
    const [expiresIn, setExpiresIn] = useState<string | null>('3d');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canSubmit = question.trim().length > 0 && options.filter((o) => o.trim().length > 0).length >= 2;

    const resetForm = () => {
        setQuestion('');
        setOptions(['', '']);
        setAllowMultiple(false);
        setExpiresIn('3d');
    };

    const addOption = () => {
        if (options.length < 6) setOptions([...options, '']);
    };

    const removeOption = (index: number) => {
        if (options.length <= 2) return;
        setOptions(options.filter((_, i) => i !== index));
    };

    const updateOption = (index: number, text: string) => {
        const updated = [...options];
        updated[index] = text;
        setOptions(updated);
    };

    const handleSubmit = async () => {
        if (!canSubmit || isSubmitting) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsSubmitting(true);
        try {
            const data = await apiFetch<any>(API.communityPolls(communityId), {
                method: 'POST',
                body: JSON.stringify({
                    question: question.trim(),
                    options: options.filter((o) => o.trim()).map((o) => o.trim()),
                    allowMultiple,
                    expiresIn,
                }),
            });
            const newPoll: Poll = data.poll || data;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onCreated(newPoll);
            resetForm();
            onClose();
        } catch {
            showError('Could not create poll');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={[createStyles.container, { paddingTop: insets.top }]}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

                {/* Header */}
                <View style={createStyles.header}>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={createStyles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={createStyles.headerTitle}>New Poll</Text>
                    <View style={{ width: 50 }} />
                </View>

                <ScrollView
                    contentContainerStyle={createStyles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Question */}
                    <View style={createStyles.card}>
                        <Text style={createStyles.label}>Question</Text>
                        <TextInput
                            style={createStyles.questionInput}
                            placeholder="Ask the community something..."
                            placeholderTextColor={colors.text.muted}
                            value={question}
                            onChangeText={setQuestion}
                            maxLength={200}
                            multiline
                            autoFocus
                        />
                    </View>

                    {/* Options */}
                    <View style={createStyles.card}>
                        <Text style={createStyles.label}>Options</Text>
                        {options.map((opt, i) => (
                            <View key={i} style={createStyles.optionRow}>
                                <TextInput
                                    style={createStyles.optionInput}
                                    placeholder={`Option ${i + 1}`}
                                    placeholderTextColor={colors.text.muted}
                                    value={opt}
                                    onChangeText={(text) => updateOption(i, text)}
                                    maxLength={100}
                                />
                                {options.length > 2 && (
                                    <TouchableOpacity
                                        style={createStyles.removeBtn}
                                        onPress={() => removeOption(i)}
                                        hitSlop={8}
                                    >
                                        <Ionicons name="close-circle" size={20} color={colors.coral[400]} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                        {options.length < 6 && (
                            <TouchableOpacity style={createStyles.addOptionBtn} onPress={addOption} activeOpacity={0.7}>
                                <Ionicons name="add-circle-outline" size={18} color={colors.gold[400]} />
                                <Text style={createStyles.addOptionText}>Add Option</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Settings */}
                    <View style={createStyles.card}>
                        <View style={createStyles.switchRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={createStyles.switchLabel}>Allow multiple votes</Text>
                                <Text style={createStyles.switchHint}>Members can select more than one option</Text>
                            </View>
                            <Switch
                                value={allowMultiple}
                                onValueChange={setAllowMultiple}
                                trackColor={{ false: colors.surface.glassHover, true: colors.gold[500] }}
                                thumbColor={colors.text.primary}
                            />
                        </View>
                    </View>

                    {/* Expiration */}
                    <View style={createStyles.card}>
                        <Text style={createStyles.label}>Expires</Text>
                        <View style={createStyles.expirationRow}>
                            {EXPIRATION_OPTIONS.map((opt) => {
                                const isActive = expiresIn === opt.value;
                                return (
                                    <TouchableOpacity
                                        key={opt.label}
                                        style={[createStyles.expirationChip, isActive && createStyles.expirationChipActive]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setExpiresIn(opt.value);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[createStyles.expirationText, isActive && createStyles.expirationTextActive]}>
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Submit */}
                    <TouchableOpacity
                        style={[createStyles.submitBtn, !canSubmit && createStyles.submitBtnDisabled]}
                        onPress={handleSubmit}
                        disabled={!canSubmit || isSubmitting}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={canSubmit ? [colors.gold[400], colors.gold[600]] : [colors.obsidian[600], colors.obsidian[700]]}
                            style={createStyles.submitGradient}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color={canSubmit ? colors.obsidian[900] : colors.text.muted} />
                            ) : (
                                <>
                                    <Ionicons name="bar-chart-outline" size={18} color={canSubmit ? colors.obsidian[900] : colors.text.muted} />
                                    <Text style={[createStyles.submitText, !canSubmit && createStyles.submitTextDisabled]}>
                                        Create Poll
                                    </Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const createStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
        borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
    },
    cancelText: { fontSize: typography.fontSize.base, color: colors.text.secondary },
    headerTitle: { fontSize: typography.fontSize.lg, fontWeight: '700', color: colors.text.primary },
    scrollContent: { padding: spacing.lg, paddingBottom: 60, gap: spacing.md },
    card: {
        backgroundColor: colors.surface.glass, borderRadius: 16,
        padding: spacing.lg, borderWidth: 1, borderColor: colors.border.subtle,
    },
    label: {
        fontSize: typography.fontSize.xs, fontWeight: '600', color: colors.text.muted,
        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm,
    },
    questionInput: {
        fontSize: typography.fontSize.base, color: colors.text.primary,
        minHeight: 60, textAlignVertical: 'top',
    },
    optionRow: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        marginBottom: spacing.xs,
    },
    optionInput: {
        flex: 1, fontSize: typography.fontSize.base, color: colors.text.primary,
        backgroundColor: colors.obsidian[700], borderRadius: 10,
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    },
    removeBtn: { padding: 4 },
    addOptionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
        marginTop: spacing.sm, paddingVertical: spacing.xs,
    },
    addOptionText: { fontSize: typography.fontSize.sm, color: colors.gold[400], fontWeight: '600' },
    switchRow: { flexDirection: 'row', alignItems: 'center' },
    switchLabel: { fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.primary },
    switchHint: { fontSize: typography.fontSize.sm, color: colors.text.muted, marginTop: 2 },
    expirationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    expirationChip: {
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        borderRadius: 10, backgroundColor: colors.obsidian[700],
        borderWidth: 1, borderColor: colors.border.subtle,
    },
    expirationChipActive: {
        borderColor: colors.gold[500] + '60', backgroundColor: colors.surface.goldSubtle,
    },
    expirationText: { fontSize: typography.fontSize.sm, color: colors.text.muted, fontWeight: '500' },
    expirationTextActive: { color: colors.gold[400] },
    submitBtn: { borderRadius: 14, overflow: 'hidden', marginTop: spacing.sm },
    submitBtnDisabled: { opacity: 0.7 },
    submitGradient: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: spacing.sm, paddingVertical: spacing.md,
    },
    submitText: { fontSize: typography.fontSize.base, fontWeight: '700', color: colors.obsidian[900] },
    submitTextDisabled: { color: colors.text.muted },
});

// ============================================
// Main Polls Screen
// ============================================

export default function CommunityPollsScreen() {
    const router = useRouter();
    const { id: communityId } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const [polls, setPolls] = useState<Poll[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

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

    const handlePollCreated = (newPoll: Poll) => {
        // Optimistically add to the top of the list
        setPolls((prev) => [newPoll, ...prev]);
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
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setShowCreateModal(true);
                        }}
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
                                onPress={() => setShowCreateModal(true)}
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

            <CreatePollModal
                visible={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                communityId={communityId!}
                onCreated={handlePollCreated}
            />
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
