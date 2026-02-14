import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    RefreshControl,
    Modal,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { typography, spacing } from '@zerog/ui';
import { useTheme } from '../../../contexts/ThemeContext';
import { apiFetch } from '../../../lib/api';
import { LoadingView, Avatar } from '../../../components';
import { showError, showSuccess } from '../../../stores/toastStore';
import { useAuthStore } from '../../../stores';
import { timeAgo } from '../../../lib/utils';

// ============================================
// Types
// ============================================

interface BulletinAuthor {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
}

interface BulletinComment {
    id: string;
    content: string;
    author: BulletinAuthor;
    createdAt: string;
}

interface Bulletin {
    id: string;
    title: string;
    content: string;
    category?: string;
    isPinned: boolean;
    upvotes: number;
    downvotes: number;
    userVote?: 'up' | 'down' | null;
    commentCount: number;
    comments?: BulletinComment[];
    author: BulletinAuthor;
    createdAt: string;
}

// ============================================
// Constants
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type FilterKey = 'recent' | 'popular' | 'pinned';

const FILTER_TABS: { key: FilterKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'recent', label: 'Recent', icon: 'time-outline' },
    { key: 'popular', label: 'Popular', icon: 'flame-outline' },
    { key: 'pinned', label: 'Pinned', icon: 'pin-outline' },
];

const CATEGORIES = [
    'General',
    'Announcement',
    'Question',
    'Discussion',
    'Event',
    'Resource',
];

// ============================================
// Bulletin Card
// ============================================

function BulletinCard({
    bulletin,
    onVote,
    colors: c,
}: {
    bulletin: Bulletin;
    onVote: (id: string, direction: 'up' | 'down') => void;
    colors: ReturnType<typeof useTheme>['colors'];
}) {
    const voteCount = bulletin.upvotes - bulletin.downvotes;

    return (
        <Animated.View entering={FadeInDown.duration(300).springify()}>
            <View style={[cardStyles.card, { backgroundColor: c.surface.glass, borderColor: c.surface.glassHover }]}>
                {/* Pinned badge */}
                {bulletin.isPinned && (
                    <View style={[cardStyles.pinnedBadge, { backgroundColor: c.gold[500] + '20' }]}>
                        <Ionicons name="pin" size={12} color={c.gold[500]} />
                        <Text style={[cardStyles.pinnedText, { color: c.gold[500] }]}>Pinned</Text>
                    </View>
                )}

                {/* Header: author + timestamp */}
                <View style={cardStyles.header}>
                    <View style={cardStyles.authorRow}>
                        <Avatar
                            uri={bulletin.author.avatarUrl}
                            name={bulletin.author.displayName}
                            size="xs"
                        />
                        <View style={cardStyles.authorInfo}>
                            <Text style={[cardStyles.authorName, { color: c.text.primary }]}>
                                {bulletin.author.displayName}
                            </Text>
                            <Text style={[cardStyles.timestamp, { color: c.text.muted }]}>
                                {timeAgo(bulletin.createdAt)}
                            </Text>
                        </View>
                    </View>
                    {bulletin.category ? (
                        <View style={[cardStyles.categoryTag, { backgroundColor: c.azure[500] + '20' }]}>
                            <Text style={[cardStyles.categoryText, { color: c.azure[500] }]}>
                                {bulletin.category}
                            </Text>
                        </View>
                    ) : null}
                </View>

                {/* Title + content */}
                <Text style={[cardStyles.title, { color: c.text.primary }]}>{bulletin.title}</Text>
                <Text style={[cardStyles.content, { color: c.text.secondary }]} numberOfLines={3}>
                    {bulletin.content}
                </Text>

                {/* Footer: votes + comments */}
                <View style={cardStyles.footer}>
                    <View style={cardStyles.voteRow}>
                        <TouchableOpacity
                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onVote(bulletin.id, 'up'); }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityLabel="Upvote"
                        >
                            <Ionicons
                                name={bulletin.userVote === 'up' ? 'arrow-up-circle' : 'arrow-up-circle-outline'}
                                size={22}
                                color={bulletin.userVote === 'up' ? c.emerald[500] : c.text.muted}
                            />
                        </TouchableOpacity>
                        <Animated.Text
                            key={voteCount}
                            entering={FadeInDown.duration(200)}
                            style={[cardStyles.voteCount, {
                                color: voteCount > 0 ? c.emerald[500] : voteCount < 0 ? c.ruby[500] : c.text.muted,
                            }]}
                        >
                            {voteCount}
                        </Animated.Text>
                        <TouchableOpacity
                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onVote(bulletin.id, 'down'); }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityLabel="Downvote"
                        >
                            <Ionicons
                                name={bulletin.userVote === 'down' ? 'arrow-down-circle' : 'arrow-down-circle-outline'}
                                size={22}
                                color={bulletin.userVote === 'down' ? c.ruby[500] : c.text.muted}
                            />
                        </TouchableOpacity>
                    </View>

                    <View style={cardStyles.commentRow}>
                        <Ionicons name="chatbubble-outline" size={16} color={c.text.muted} />
                        <Text style={[cardStyles.commentCount, { color: c.text.muted }]}>
                            {bulletin.commentCount}
                        </Text>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
}

// ============================================
// Compose Modal
// ============================================

function ComposeModal({
    visible,
    onClose,
    communityId,
    isAdmin,
    onCreated,
}: {
    visible: boolean;
    onClose: () => void;
    communityId: string;
    isAdmin: boolean;
    onCreated: (bulletin: Bulletin) => void;
}) {
    const insets = useSafeAreaInsets();
    const { colors: c } = useTheme();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState<string | null>(null);
    const [isPinned, setIsPinned] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canSubmit = title.trim().length > 0 && content.trim().length > 0;

    const resetForm = () => {
        setTitle('');
        setContent('');
        setCategory(null);
        setIsPinned(false);
    };

    const handleSubmit = async () => {
        if (!canSubmit || isSubmitting) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsSubmitting(true);
        try {
            const data = await apiFetch<{ bulletin: Bulletin } | Bulletin>('/api/v1/bulletins', {
                method: 'POST',
                body: JSON.stringify({
                    communityId,
                    title: title.trim(),
                    content: content.trim(),
                    category,
                    isPinned,
                }),
            });
            const newBulletin = 'bulletin' in data ? data.bulletin : data;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showSuccess('Bulletin posted!');
            onCreated(newBulletin);
            resetForm();
            onClose();
        } catch {
            showError('Could not create bulletin');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={[composeStyles.container, { paddingTop: insets.top }]}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <LinearGradient colors={[c.obsidian[900], c.obsidian[800]]} style={StyleSheet.absoluteFill} />

                {/* Header */}
                <View style={composeStyles.header}>
                    <TouchableOpacity onPress={onClose} accessibilityLabel="Cancel">
                        <Text style={[composeStyles.cancelText, { color: c.text.muted }]}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={[composeStyles.headerTitle, { color: c.text.primary }]}>New Bulletin</Text>
                    <View style={{ width: 50 }} />
                </View>

                <ScrollView
                    contentContainerStyle={composeStyles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Title */}
                    <View style={[composeStyles.card, { backgroundColor: c.surface.glass }]}>
                        <Text style={[composeStyles.label, { color: c.text.secondary }]}>Title</Text>
                        <TextInput
                            style={[composeStyles.titleInput, { color: c.text.primary, borderColor: c.surface.glassHover }]}
                            placeholder="Bulletin title..."
                            placeholderTextColor={c.text.muted}
                            value={title}
                            onChangeText={setTitle}
                            maxLength={150}
                            autoFocus
                        />
                    </View>

                    {/* Content */}
                    <View style={[composeStyles.card, { backgroundColor: c.surface.glass }]}>
                        <Text style={[composeStyles.label, { color: c.text.secondary }]}>Content</Text>
                        <TextInput
                            style={[composeStyles.contentInput, { color: c.text.primary, borderColor: c.surface.glassHover }]}
                            placeholder="Write your bulletin..."
                            placeholderTextColor={c.text.muted}
                            value={content}
                            onChangeText={setContent}
                            maxLength={2000}
                            multiline
                            textAlignVertical="top"
                        />
                    </View>

                    {/* Category picker */}
                    <View style={[composeStyles.card, { backgroundColor: c.surface.glass }]}>
                        <Text style={[composeStyles.label, { color: c.text.secondary }]}>Category (optional)</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={composeStyles.categoryScroll}>
                            {CATEGORIES.map((cat) => {
                                const isSelected = category === cat;
                                return (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[
                                            composeStyles.categoryChip,
                                            { borderColor: c.surface.glassHover },
                                            isSelected && { backgroundColor: c.azure[500] + '20', borderColor: c.azure[500] },
                                        ]}
                                        onPress={() => setCategory(isSelected ? null : cat)}
                                    >
                                        <Text style={[
                                            composeStyles.categoryChipText,
                                            { color: isSelected ? c.azure[500] : c.text.muted },
                                        ]}>
                                            {cat}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>

                    {/* Pin toggle (admin only) */}
                    {isAdmin && (
                        <View style={[composeStyles.card, { backgroundColor: c.surface.glass }]}>
                            <TouchableOpacity
                                style={composeStyles.pinRow}
                                onPress={() => setIsPinned(!isPinned)}
                                activeOpacity={0.7}
                            >
                                <View style={composeStyles.pinLabel}>
                                    <Ionicons name="pin" size={18} color={isPinned ? c.gold[500] : c.text.muted} />
                                    <Text style={[composeStyles.pinText, { color: c.text.primary }]}>Pin to top</Text>
                                </View>
                                <View style={[
                                    composeStyles.toggle,
                                    { backgroundColor: isPinned ? c.gold[500] : c.surface.glassHover },
                                ]}>
                                    <View style={[
                                        composeStyles.toggleKnob,
                                        { backgroundColor: c.text.primary },
                                        isPinned && composeStyles.toggleKnobActive,
                                    ]} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>

                {/* Submit */}
                <View style={[composeStyles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
                    <TouchableOpacity
                        style={[
                            composeStyles.submitBtn,
                            { backgroundColor: canSubmit ? c.gold[500] : c.surface.glassHover },
                        ]}
                        onPress={handleSubmit}
                        disabled={!canSubmit || isSubmitting}
                        activeOpacity={0.8}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator size="small" color={c.obsidian[900]} />
                        ) : (
                            <Text style={[composeStyles.submitText, { color: canSubmit ? c.obsidian[900] : c.text.muted }]}>
                                Post Bulletin
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ============================================
// Main Bulletin Board Component
// ============================================

export default function BulletinBoard({ communityId: propCommunityId }: { communityId?: string }) {
    const params = useLocalSearchParams<{ id: string }>();
    const communityId = propCommunityId || params.id;
    const insets = useSafeAreaInsets();
    const { colors: c } = useTheme();
    const currentUser = useAuthStore((s) => s.user);

    // ── State ──────────────────────────────────
    const [bulletins, setBulletins] = useState<Bulletin[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<FilterKey>('recent');
    const [showComposer, setShowComposer] = useState(false);
    const [communityRole, setCommunityRole] = useState<string | null>(null);

    // ── Refs ──────────────────────────────────
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    const isAdmin = communityRole === 'admin' || communityRole === 'moderator';

    // ── Fetch bulletins ──────────────────────────────────
    const fetchBulletins = useCallback(async (silent = false) => {
        if (!communityId) return;
        if (!silent) setIsLoading(true);
        try {
            const data = await apiFetch<{ bulletins: Bulletin[]; role?: string }>(
                `/api/v1/bulletins?communityId=${communityId}`,
                { cache: false },
            );
            if (!isMountedRef.current) return;
            const list = data?.bulletins || (Array.isArray(data) ? data : []);
            setBulletins(list);
            if (data?.role) setCommunityRole(data.role);
        } catch {
            if (isMountedRef.current) showError('Could not load bulletins');
        } finally {
            if (isMountedRef.current) {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        }
    }, [communityId]);

    useEffect(() => { fetchBulletins(); }, [fetchBulletins]);

    // ── Pull to refresh ──────────────────────────────────
    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        fetchBulletins(true);
    }, [fetchBulletins]);

    // ── Vote ──────────────────────────────────
    const handleVote = useCallback(async (bulletinId: string, direction: 'up' | 'down') => {
        // Optimistic update
        setBulletins((prev) =>
            prev.map((b) => {
                if (b.id !== bulletinId) return b;
                const wasUp = b.userVote === 'up';
                const wasDown = b.userVote === 'down';
                const isSame = b.userVote === direction;

                let upvotes = b.upvotes;
                let downvotes = b.downvotes;
                let userVote: 'up' | 'down' | null = direction;

                if (isSame) {
                    // Toggle off
                    userVote = null;
                    if (direction === 'up') upvotes -= 1;
                    else downvotes -= 1;
                } else {
                    // Switch or new vote
                    if (wasUp) upvotes -= 1;
                    if (wasDown) downvotes -= 1;
                    if (direction === 'up') upvotes += 1;
                    else downvotes += 1;
                }

                return { ...b, upvotes, downvotes, userVote };
            }),
        );

        try {
            await apiFetch(`/api/v1/bulletins/${bulletinId}/vote`, {
                method: 'POST',
                body: JSON.stringify({ direction }),
            });
        } catch {
            // Revert on failure
            if (isMountedRef.current) fetchBulletins(true);
        }
    }, [fetchBulletins]);

    // ── New bulletin callback ──────────────────────────────────
    const handleBulletinCreated = useCallback((newBulletin: Bulletin) => {
        setBulletins((prev) => [newBulletin, ...prev]);
    }, []);

    // ── Filtered + sorted list ──────────────────────────────────
    const filteredBulletins = useMemo(() => {
        let list = [...bulletins];

        if (activeFilter === 'pinned') {
            list = list.filter((b) => b.isPinned);
        } else if (activeFilter === 'popular') {
            list.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
        } else {
            // 'recent' — pinned first, then by date
            const pinned = list.filter((b) => b.isPinned);
            const rest = list.filter((b) => !b.isPinned);
            rest.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            list = [...pinned, ...rest];
        }

        return list;
    }, [bulletins, activeFilter]);

    // ── Render ──────────────────────────────────

    if (isLoading && bulletins.length === 0) {
        return <LoadingView />;
    }

    return (
        <View style={[screenStyles.container, { backgroundColor: 'transparent' }]}>
            {/* Filter tabs */}
            <View style={[screenStyles.filterBar, { borderBottomColor: c.surface.glassHover }]}>
                {FILTER_TABS.map((tab) => {
                    const isActive = activeFilter === tab.key;
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={[
                                screenStyles.filterTab,
                                isActive && { backgroundColor: c.gold[500] + '15' },
                            ]}
                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveFilter(tab.key); }}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={tab.icon as any}
                                size={14}
                                color={isActive ? c.gold[500] : c.text.muted}
                            />
                            <Text style={[
                                screenStyles.filterLabel,
                                { color: isActive ? c.gold[500] : c.text.muted },
                                isActive && { fontFamily: typography.semiBold },
                            ]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Bulletin list */}
            <FlatList
                data={filteredBulletins}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <BulletinCard bulletin={item} onVote={handleVote} colors={c} />
                )}
                contentContainerStyle={[
                    screenStyles.listContent,
                    filteredBulletins.length === 0 && screenStyles.emptyContainer,
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={c.gold[500]}
                        colors={[c.gold[500]]}
                    />
                }
                ListEmptyComponent={
                    <View style={screenStyles.emptyState}>
                        <Ionicons name="clipboard-outline" size={48} color={c.text.muted} />
                        <Text style={[screenStyles.emptyTitle, { color: c.text.primary }]}>
                            No bulletins yet
                        </Text>
                        <Text style={[screenStyles.emptyDesc, { color: c.text.muted }]}>
                            {activeFilter === 'pinned'
                                ? 'No pinned bulletins in this community'
                                : 'Be the first to post a bulletin!'}
                        </Text>
                    </View>
                }
            />

            {/* FAB — compose */}
            <TouchableOpacity
                style={[screenStyles.fab, { backgroundColor: c.gold[500] }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowComposer(true); }}
                activeOpacity={0.85}
                accessibilityLabel="Create new bulletin"
            >
                <Ionicons name="add" size={28} color={c.obsidian[900]} />
            </TouchableOpacity>

            {/* Compose modal */}
            <ComposeModal
                visible={showComposer}
                onClose={() => setShowComposer(false)}
                communityId={communityId}
                isAdmin={isAdmin}
                onCreated={handleBulletinCreated}
            />
        </View>
    );
}

// ============================================
// Styles — Card
// ============================================

const cardStyles = StyleSheet.create({
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    pinnedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: 8,
        marginBottom: spacing.xs,
        gap: 4,
    },
    pinnedText: {
        fontSize: 11,
        fontFamily: typography.semiBold,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        flex: 1,
    },
    authorInfo: {
        flex: 1,
    },
    authorName: {
        fontSize: 13,
        fontFamily: typography.semiBold,
    },
    timestamp: {
        fontSize: 11,
        fontFamily: typography.regular,
    },
    categoryTag: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: 6,
    },
    categoryText: {
        fontSize: 11,
        fontFamily: typography.medium,
    },
    title: {
        fontSize: 16,
        fontFamily: typography.bold,
        marginBottom: 4,
    },
    content: {
        fontSize: 14,
        fontFamily: typography.regular,
        lineHeight: 20,
        marginBottom: spacing.sm,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    voteRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    voteCount: {
        fontSize: 14,
        fontFamily: typography.semiBold,
        minWidth: 24,
        textAlign: 'center',
    },
    commentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    commentCount: {
        fontSize: 13,
        fontFamily: typography.medium,
    },
});

// ============================================
// Styles — Compose Modal
// ============================================

const composeStyles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    cancelText: {
        fontSize: 16,
        fontFamily: typography.medium,
    },
    headerTitle: {
        fontSize: 17,
        fontFamily: typography.bold,
    },
    scrollContent: {
        padding: spacing.lg,
        gap: spacing.md,
    },
    card: {
        borderRadius: 16,
        padding: spacing.md,
    },
    label: {
        fontSize: 13,
        fontFamily: typography.semiBold,
        marginBottom: spacing.xs,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    titleInput: {
        fontSize: 16,
        fontFamily: typography.medium,
        borderWidth: 1,
        borderRadius: 12,
        padding: spacing.sm,
        minHeight: 44,
    },
    contentInput: {
        fontSize: 15,
        fontFamily: typography.regular,
        borderWidth: 1,
        borderRadius: 12,
        padding: spacing.sm,
        minHeight: 120,
    },
    categoryScroll: {
        marginTop: spacing.xs,
    },
    categoryChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: spacing.xs,
    },
    categoryChipText: {
        fontSize: 13,
        fontFamily: typography.medium,
    },
    pinRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    pinLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    pinText: {
        fontSize: 15,
        fontFamily: typography.medium,
    },
    toggle: {
        width: 44,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        paddingHorizontal: 3,
    },
    toggleKnob: {
        width: 20,
        height: 20,
        borderRadius: 10,
    },
    toggleKnobActive: {
        alignSelf: 'flex-end',
    },
    footer: {
        paddingHorizontal: spacing.lg,
    },
    submitBtn: {
        height: 50,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitText: {
        fontSize: 16,
        fontFamily: typography.bold,
    },
});

// ============================================
// Styles — Screen
// ============================================

const screenStyles = StyleSheet.create({
    container: {
        flex: 1,
        minHeight: 400,
    },
    filterBar: {
        flexDirection: 'row',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        gap: spacing.xs,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    filterTab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: 20,
    },
    filterLabel: {
        fontSize: 13,
        fontFamily: typography.medium,
    },
    listContent: {
        padding: spacing.md,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xl * 2,
        gap: spacing.sm,
    },
    emptyTitle: {
        fontSize: 18,
        fontFamily: typography.bold,
    },
    emptyDesc: {
        fontSize: 14,
        fontFamily: typography.regular,
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
    },
    fab: {
        position: 'absolute',
        right: spacing.lg,
        bottom: spacing.lg,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
});
