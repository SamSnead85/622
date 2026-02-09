import { useState, useEffect, memo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    FlatList,
    Alert,
    TextInput,
    Platform,
    Modal,
    KeyboardAvoidingView,
    Switch,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { LoadingView } from '../../components';
import { useCommunitiesStore, Community } from '../../stores';
import { RetryView } from '../../components/RetryView';

const formatCount = (num: number) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
};

const CommunityCard = memo(({ community }: { community: Community }) => {
    const router = useRouter();
    return (
        <Animated.View entering={FadeInDown.duration(300)}>
            <TouchableOpacity
                style={styles.communityCard}
                activeOpacity={0.95}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/community/${community.id}`);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${community.name}, ${formatCount(community.membersCount)} members`}
                accessibilityHint="Double tap to open community"
            >
                {community.coverUrl && (
                    <View style={styles.cardCover}>
                        <Image source={{ uri: community.coverUrl }} style={styles.coverImage} transition={200} cachePolicy="memory-disk" contentFit="cover" />
                        <LinearGradient colors={['transparent', colors.surface.overlayHeavy]} style={styles.coverGradient} />
                    </View>
                )}
                <View style={styles.cardContent}>
                    {community.avatarUrl && (
                        <Image source={{ uri: community.avatarUrl }} style={styles.cardAvatar} transition={150} cachePolicy="memory-disk" />
                    )}
                    <Text style={styles.cardName} numberOfLines={1}>{community.name}</Text>
                    <Text style={styles.cardDescription} numberOfLines={2}>{community.description}</Text>
                    <View style={styles.cardStats}>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{formatCount(community.membersCount)}</Text>
                            <Text style={styles.statLabel}>members</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{formatCount(community.postsCount)}</Text>
                            <Text style={styles.statLabel}>posts</Text>
                        </View>
                    </View>
                    {community.role && (
                        <View style={styles.roleBadge}>
                            <Ionicons name="shield-checkmark" size={12} color={colors.gold[500]} />
                            <Text style={styles.roleBadgeText}>
                                {community.role.charAt(0).toUpperCase() + community.role.slice(1)}
                            </Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});

function CreateCommunityModal({ visible, onClose, onCreate }: { visible: boolean; onClose: () => void; onCreate: () => void }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPrivate, setIsPrivate] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const insets = useSafeAreaInsets();
    const { createCommunity } = useCommunitiesStore();

    const handleCreate = async () => {
        if (!name.trim() || name.trim().length < 3) {
            Alert.alert('Name Required', 'Community name must be at least 3 characters.');
            return;
        }
        setIsCreating(true);
        try {
            await createCommunity(name.trim(), description.trim(), isPrivate);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setName('');
            setDescription('');
            setIsPrivate(true);
            onClose();
            onCreate();
        } catch {
            Alert.alert('Error', 'Failed to create community. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <KeyboardAvoidingView style={[styles.modalContainer, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Cancel">
                        <Text style={styles.modalCancel}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle} accessibilityRole="header">New Community</Text>
                    <TouchableOpacity onPress={handleCreate} disabled={isCreating || !name.trim()} accessibilityRole="button" accessibilityLabel="Create community" accessibilityState={{ disabled: isCreating || !name.trim() }}>
                        {isCreating ? (
                            <ActivityIndicator size="small" color={colors.gold[500]} />
                        ) : (
                            <Text style={[styles.modalDone, (!name.trim()) && { opacity: 0.4 }]}>Create</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                    <Text style={styles.inputLabel}>Name</Text>
                    <TextInput
                        style={styles.modalInput}
                        value={name}
                        onChangeText={setName}
                        placeholder="Community name"
                        placeholderTextColor={colors.text.muted}
                        maxLength={50}
                        autoFocus
                        accessibilityLabel="Community name"
                    />

                    <Text style={styles.inputLabel}>Description</Text>
                    <TextInput
                        style={[styles.modalInput, { minHeight: 80, textAlignVertical: 'top' }]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="What is this community about?"
                        placeholderTextColor={colors.text.muted}
                        maxLength={500}
                        multiline
                        accessibilityLabel="Community description"
                    />

                    <View style={styles.switchRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.switchLabel}>Private Community</Text>
                            <Text style={styles.switchDescription}>Only invited members can join and see content</Text>
                        </View>
                        <Switch
                            value={isPrivate}
                            onValueChange={setIsPrivate}
                            trackColor={{ false: colors.surface.glassHover, true: colors.gold[500] }}
                            thumbColor="#fff"
                        />
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

export default function CommunitiesScreen() {
    const insets = useSafeAreaInsets();
    const { communities, isLoading, error: commError, fetchCommunities } = useCommunitiesStore();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        fetchCommunities();
    }, []);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchCommunities();
        setIsRefreshing(false);
    };

    const filteredCommunities = searchQuery.trim()
        ? communities.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : communities;

    const renderCommunity = useCallback(({ item }: { item: Community }) => (
        <CommunityCard community={item} />
    ), []);

    const renderEmpty = () => {
        if (isLoading) {
            return <LoadingView message="Loading communities..." />;
        }
        if (commError && communities.length === 0) {
            return (
                <RetryView
                    message="Couldn't load communities. Tap to try again."
                    onRetry={fetchCommunities}
                />
            );
        }
        return (
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                    <Ionicons name="people-outline" size={56} color={colors.text.muted} />
                </View>
                <Text style={styles.emptyTitle}>No communities yet</Text>
                <Text style={styles.emptyText}>
                    Create a private group or join an existing community to get started
                </Text>
                <TouchableOpacity
                    style={styles.createBtn}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setShowCreateModal(true);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Create community"
                >
                    <LinearGradient colors={[colors.gold[400], colors.gold[600]]} style={styles.createBtnGradient}>
                        <Ionicons name="add" size={20} color={colors.obsidian[900]} />
                        <Text style={styles.createBtnText}>Create Community</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <View style={styles.headerRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle} accessibilityRole="header">Communities</Text>
                        <Text style={styles.headerSubtitle}>Your private groups and tribes</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.headerCreateBtn}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setShowCreateModal(true);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Create community"
                    >
                        <Ionicons name="add" size={22} color={colors.gold[500]} />
                    </TouchableOpacity>
                </View>

                {/* Search bar */}
                {communities.length > 0 && (
                    <View style={styles.searchContainer}>
                        <Ionicons name="search-outline" size={16} color={colors.text.muted} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search communities..."
                            placeholderTextColor={colors.text.muted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCapitalize="none"
                            accessibilityLabel="Search communities"
                        />
                    </View>
                )}
            </View>

            <FlatList
                data={filteredCommunities}
                renderItem={renderCommunity}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 120 }]}
                showsVerticalScrollIndicator={false}
                onRefresh={handleRefresh}
                refreshing={isRefreshing}
                ListEmptyComponent={renderEmpty}
            />

            <CreateCommunityModal
                visible={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreate={() => fetchCommunities()}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    header: {
        paddingHorizontal: spacing.xl, paddingBottom: spacing.lg,
        borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
    },
    headerTitle: { fontSize: 34, fontWeight: '700', color: colors.text.primary, letterSpacing: -1, fontFamily: 'Inter-Bold' },
    headerSubtitle: { fontSize: typography.fontSize.base, color: colors.text.secondary, marginTop: spacing.xs },
    searchContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surface.glassHover, borderRadius: 12,
        paddingHorizontal: spacing.md, marginTop: spacing.md,
        borderWidth: 1, borderColor: colors.border.subtle, gap: spacing.sm,
    },
    searchInput: { flex: 1, fontSize: typography.fontSize.sm, color: colors.text.primary, paddingVertical: spacing.sm },
    listContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },

    // Loading
    loadingContainer: { alignItems: 'center', paddingTop: 80 },
    loadingText: { fontSize: typography.fontSize.base, color: colors.text.muted, marginTop: spacing.lg },

    // Empty
    emptyContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: spacing.xl },
    emptyIconContainer: { marginBottom: spacing.lg },
    emptyTitle: { fontSize: typography.fontSize['2xl'], fontWeight: '700', color: colors.text.primary, marginBottom: spacing.sm },
    emptyText: { fontSize: typography.fontSize.base, color: colors.text.secondary, textAlign: 'center', lineHeight: 22, marginBottom: spacing['2xl'] },
    createBtn: { borderRadius: 16, overflow: 'hidden' },
    createBtnGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, gap: spacing.sm },
    createBtnText: { fontSize: typography.fontSize.base, fontWeight: '700', color: colors.obsidian[900] },

    // Community card
    communityCard: {
        backgroundColor: colors.surface.glass, borderRadius: 20, marginBottom: spacing.lg,
        overflow: 'hidden', borderWidth: 1, borderColor: colors.border.subtle,
    },
    cardCover: { height: 120, position: 'relative' },
    coverImage: { ...StyleSheet.absoluteFillObject, resizeMode: 'cover' as any },
    coverGradient: { ...StyleSheet.absoluteFillObject },
    cardContent: { padding: spacing.lg, alignItems: 'center' },
    cardAvatar: {
        width: 56, height: 56, borderRadius: 28, marginTop: -40,
        borderWidth: 3, borderColor: colors.obsidian[900], marginBottom: spacing.md,
    },
    cardName: { fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.text.primary, textAlign: 'center', letterSpacing: -0.5 },
    cardDescription: { fontSize: typography.fontSize.sm, color: colors.text.secondary, textAlign: 'center', marginTop: spacing.xs, lineHeight: 20 },
    cardStats: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg },
    stat: { alignItems: 'center', paddingHorizontal: spacing.xl },
    statValue: { fontSize: typography.fontSize.lg, fontWeight: '700', color: colors.text.primary },
    statLabel: { fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: 2 },
    statDivider: { width: 1, height: 24, backgroundColor: colors.border.subtle },
    roleBadge: {
        marginTop: spacing.md, backgroundColor: colors.surface.goldMedium,
        paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 8,
        flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    },
    roleBadgeText: { fontSize: typography.fontSize.xs, fontWeight: '700', color: colors.gold[500] },
    // Header row
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    headerCreateBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: colors.gold[500] + '30',
    },
    // Modal
    modalContainer: { flex: 1, backgroundColor: colors.obsidian[900] },
    modalHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
        borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
    },
    modalCancel: { fontSize: typography.fontSize.base, color: colors.text.secondary },
    modalTitle: { fontSize: typography.fontSize.lg, fontWeight: '700', color: colors.text.primary },
    modalDone: { fontSize: typography.fontSize.base, fontWeight: '700', color: colors.gold[500] },
    modalBody: { padding: spacing.xl },
    inputLabel: {
        fontSize: typography.fontSize.xs, fontWeight: '600', color: colors.text.muted,
        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs, marginTop: spacing.lg,
    },
    modalInput: {
        backgroundColor: colors.surface.glass, borderRadius: 12,
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
        fontSize: typography.fontSize.base, color: colors.text.primary,
        borderWidth: 1, borderColor: colors.border.subtle,
    },
    switchRow: {
        flexDirection: 'row', alignItems: 'center', marginTop: spacing.xl,
        backgroundColor: colors.surface.glass, borderRadius: 12,
        padding: spacing.md, borderWidth: 1, borderColor: colors.border.subtle,
    },
    switchLabel: { fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.primary },
    switchDescription: { fontSize: typography.fontSize.sm, color: colors.text.muted, marginTop: 2 },
});
