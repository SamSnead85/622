import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
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
    ScrollView,
    RefreshControl,
    Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '@zerog/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { useCommunitiesStore, useAuthStore, Community } from '../../stores';
import { apiFetch, API } from '../../lib/api';
import { IMAGE_PLACEHOLDER } from '../../lib/imagePlaceholder';
import { useDebounce } from '../../hooks/useDebounce';
import { formatCount } from '../../lib/utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 3) / 2;

// ============================================
// Types & Constants
// ============================================

type CategoryFilter = 'all' | 'faith' | 'business' | 'tech' | 'culture' | 'family' | 'education' | 'health';
type TabKey = 'discover' | 'my-groups';

const CATEGORY_FILTERS: { key: CategoryFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'faith', label: 'Faith' },
    { key: 'business', label: 'Business' },
    { key: 'tech', label: 'Tech' },
    { key: 'culture', label: 'Culture' },
    { key: 'family', label: 'Family' },
    { key: 'education', label: 'Education' },
    { key: 'health', label: 'Health' },
];

const CATEGORY_GRADIENTS: Record<string, [string, string]> = {
    faith: [colors.gold[600], colors.gold[400]],
    business: [colors.azure[500], colors.azure[400]],
    tech: [colors.emerald[500], colors.emerald[400]],
    culture: [colors.coral[500], colors.coral[400]],
    family: ['#9B59B6', '#C39BD3'],
    education: [colors.azure[500], colors.azure[300]],
    health: [colors.emerald[500], colors.emerald[300]],
    default: [colors.obsidian[600], colors.obsidian[500]],
};

const CAT_KEYWORDS: Record<CategoryFilter, string[]> = {
    all: [],
    faith: ['faith', 'islam', 'deen', 'prayer', 'quran', 'muslim', 'spiritual', 'mosque', 'ramadan'],
    family: ['family', 'parent', 'kids', 'children', 'marriage', 'sisters', 'brothers'],
    education: ['education', 'learn', 'study', 'school', 'university', 'course', 'book'],
    tech: ['tech', 'code', 'programming', 'developer', 'software', 'ai', 'data', 'engineering'],
    business: ['business', 'entrepreneur', 'startup', 'finance', 'invest', 'career', 'professional'],
    health: ['health', 'fitness', 'wellness', 'mental', 'nutrition', 'exercise', 'yoga'],
    culture: ['culture', 'art', 'food', 'travel', 'music', 'history', 'language', 'halal'],
};

function getCoverGradient(community: Community): [string, string] {
    const text = `${community.name} ${community.description || ''}`.toLowerCase();
    for (const [cat, keywords] of Object.entries(CAT_KEYWORDS)) {
        if (cat === 'all') continue;
        if (keywords.some((kw) => text.includes(kw))) {
            return CATEGORY_GRADIENTS[cat] ?? CATEGORY_GRADIENTS.default;
        }
    }
    return CATEGORY_GRADIENTS.default;
}

// ============================================
// Community Card (Grid Item)
// ============================================

const CommunityCard = memo(function CommunityCard({ community, onPress, onJoin }: {
    community: Community;
    onPress: () => void;
    onJoin?: () => void;
}) {
    const hasCover = !!community.coverUrl;
    const isApprovalRequired = community.approvalRequired === true;
    const isMember = !!community.role;
    const isPending = community.requestStatus === 'pending';

    return (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.88}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`${community.name}, ${formatCount(community.membersCount)} members`}
        >
            {/* Cover */}
            <View style={styles.cardCover}>
                {hasCover ? (
                    <Image
                        source={{ uri: community.coverUrl }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                        placeholder={IMAGE_PLACEHOLDER.blurhash}
                        transition={IMAGE_PLACEHOLDER.transition}
                        cachePolicy="memory-disk"
                    />
                ) : (
                    <LinearGradient
                        colors={getCoverGradient(community)}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                )}
                {/* Subtle bottom fade */}
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.35)']}
                    style={styles.cardCoverFade}
                />
            </View>

            {/* Avatar overlapping cover */}
            <View style={styles.cardAvatarWrap}>
                {community.avatarUrl ? (
                    <Image
                        source={{ uri: community.avatarUrl }}
                        style={styles.cardAvatar}
                        contentFit="cover"
                        placeholder={IMAGE_PLACEHOLDER.blurhash}
                        transition={IMAGE_PLACEHOLDER.transition}
                        cachePolicy="memory-disk"
                    />
                ) : (
                    <View style={[styles.cardAvatar, styles.cardAvatarFallback]}>
                        <Text style={styles.cardAvatarLetter}>
                            {community.name.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}
            </View>

            {/* Body */}
            <View style={styles.cardBody}>
                <Text style={styles.cardName} numberOfLines={1}>
                    {community.name}
                </Text>
                {community.description ? (
                    <Text style={styles.cardDescription} numberOfLines={2}>
                        {community.description}
                    </Text>
                ) : null}

                {/* Bottom row */}
                <View style={styles.cardFooter}>
                    <Text style={styles.cardMembers}>
                        {formatCount(community.membersCount)} Members
                    </Text>
                    {isMember ? (
                        <View style={[styles.accessBadge, styles.accessBadgeGreen]}>
                            <Text style={[styles.accessBadgeText, styles.accessBadgeTextGreen]}>Joined</Text>
                        </View>
                    ) : isPending ? (
                        <View style={[styles.accessBadge, { backgroundColor: colors.obsidian[600] }]}>
                            <Text style={[styles.accessBadgeText, { color: colors.text.muted }]}>Requested</Text>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={[
                                styles.accessBadge,
                                isApprovalRequired ? styles.accessBadgeAmber : styles.accessBadgeGreen,
                            ]}
                            onPress={(e) => {
                                e.stopPropagation?.();
                                onJoin?.();
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Text style={[
                                styles.accessBadgeText,
                                isApprovalRequired ? styles.accessBadgeTextAmber : styles.accessBadgeTextGreen,
                            ]}>
                                {isApprovalRequired ? 'Request' : 'Join'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
});

// ============================================
// Category Chips
// ============================================

function CategoryChips({ active, onSelect }: {
    active: CategoryFilter;
    onSelect: (cat: CategoryFilter) => void;
}) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
            style={styles.chipsContainer}
        >
            {CATEGORY_FILTERS.map((cat) => {
                const isActive = active === cat.key;
                return (
                    <TouchableOpacity
                        key={cat.key}
                        style={[styles.chip, isActive && styles.chipActive]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onSelect(cat.key);
                        }}
                        activeOpacity={0.7}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: isActive }}
                    >
                        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                            {cat.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
}

// ============================================
// Tab Switcher (Discover / My Groups)
// ============================================

function TabSwitcher({ active, onChange }: {
    active: TabKey;
    onChange: (tab: TabKey) => void;
}) {
    return (
        <View style={styles.tabBar}>
            {(['discover', 'my-groups'] as TabKey[]).map((tab) => {
                const isActive = active === tab;
                const label = tab === 'discover' ? 'Discover' : 'My Groups';
                return (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, isActive && styles.tabActive]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onChange(tab);
                        }}
                        activeOpacity={0.7}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: isActive }}
                    >
                        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                            {label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

// ============================================
// Empty State
// ============================================

function EmptyState({ tab, searchActive }: { tab: TabKey; searchActive: boolean }) {
    const icon = searchActive ? 'search-outline' : tab === 'discover' ? 'compass-outline' : 'heart-outline';
    const title = searchActive
        ? 'No matches found'
        : tab === 'discover'
            ? 'Communities are on the way'
            : 'Find your people';
    const subtitle = searchActive
        ? 'Try different keywords or browse by category'
        : tab === 'discover'
            ? 'Be the first to start a community and bring people together!'
            : 'Explore and join communities that match your interests';

    return (
        <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
                <Ionicons name={icon} size={36} color={colors.text.muted} />
            </View>
            <Text style={styles.emptyTitle}>{title}</Text>
            <Text style={styles.emptySubtitle}>{subtitle}</Text>
        </View>
    );
}

// ============================================
// Create Community Modal
// ============================================

function CreateCommunityModal({ visible, onClose, onCreate }: {
    visible: boolean;
    onClose: () => void;
    onCreate: () => void;
}) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [approvalRequired, setApprovalRequired] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const insets = useSafeAreaInsets();
    const { createCommunity } = useCommunitiesStore();

    // Reset form when modal opens
    useEffect(() => {
        if (visible) {
            setName('');
            setDescription('');
            setIsPrivate(false);
            setApprovalRequired(false);
        }
    }, [visible]);

    const handleCreate = async () => {
        if (!name.trim() || name.trim().length < 3) {
            Alert.alert('Name Required', 'Community name must be at least 3 characters.');
            return;
        }
        setIsCreating(true);
        try {
            await createCommunity(name.trim(), description.trim(), isPrivate);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onClose();
            onCreate();
        } catch {
            Alert.alert('Creation Failed', 'We couldn\'t create your community. Please check your connection and try again.');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={[styles.modalContainer, { paddingTop: insets.top }]}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

                {/* Header */}
                <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Cancel">
                        <Text style={styles.modalCancel}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>New Community</Text>
                    <TouchableOpacity
                        onPress={handleCreate}
                        disabled={isCreating || !name.trim()}
                        accessibilityRole="button"
                        accessibilityLabel="Create community"
                    >
                        {isCreating ? (
                            <ActivityIndicator size="small" color={colors.gold[500]} />
                        ) : (
                            <Text style={[styles.modalDone, !name.trim() && styles.modalDoneDisabled]}>Create</Text>
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
                        style={[styles.modalInput, styles.modalTextArea]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="What is this community about?"
                        placeholderTextColor={colors.text.muted}
                        maxLength={500}
                        multiline
                        accessibilityLabel="Community description"
                    />

                    <View style={styles.switchRow}>
                        <View style={styles.switchTextWrap}>
                            <Text style={styles.switchLabel}>Private Community</Text>
                            <Text style={styles.switchDescription}>Only invited members can see content</Text>
                        </View>
                        <Switch
                            value={isPrivate}
                            onValueChange={setIsPrivate}
                            trackColor={{ false: colors.surface.glassHover, true: colors.gold[500] }}
                            thumbColor={colors.text.primary}
                            accessibilityLabel="Private community toggle"
                        />
                    </View>

                    <View style={styles.switchRow}>
                        <View style={styles.switchTextWrap}>
                            <Text style={styles.switchLabel}>Approval Required</Text>
                            <Text style={styles.switchDescription}>New members need admin approval to join</Text>
                        </View>
                        <Switch
                            value={approvalRequired}
                            onValueChange={setApprovalRequired}
                            trackColor={{ false: colors.surface.glassHover, true: colors.amber[500] }}
                            thumbColor={colors.text.primary}
                            accessibilityLabel="Approval required toggle"
                        />
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ============================================
// Main Screen
// ============================================

export default function CommunitiesScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { colors: c } = useTheme();
    const {
        communities,
        isLoading,
        fetchCommunities,
        joinCommunity,
    } = useCommunitiesStore();

    const [activeTab, setActiveTab] = useState<TabKey>('discover');
    const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedQuery = useDebounce(searchQuery, 300);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [discoverCommunities, setDiscoverCommunities] = useState<Community[]>([]);
    const [isLoadingDiscover, setIsLoadingDiscover] = useState(false);
    const [featuredCommunities, setFeaturedCommunities] = useState<Community[]>([]);
    const [featuredLoading, setFeaturedLoading] = useState(true);
    const searchInputRef = useRef<TextInput>(null);

    // ============================================
    // Data Fetching
    // ============================================

    useEffect(() => {
        fetchCommunities();
        fetchDiscover();
        fetchFeatured();
    }, []);

    const fetchFeatured = async () => {
        setFeaturedLoading(true);
        try {
            const data = await apiFetch<any>(`${API.communities}?featured=true&limit=10`);
            const list = data.communities || data.data || data || [];
            setFeaturedCommunities(Array.isArray(list) ? list : []);
        } catch {
            // Silent fail — featured is non-critical
        } finally {
            setFeaturedLoading(false);
        }
    };

    // Re-fetch discover when search or category changes
    useEffect(() => {
        fetchDiscover();
    }, [debouncedQuery, activeCategory]);

    const fetchDiscover = async () => {
        setIsLoadingDiscover(true);
        try {
            let url = `${API.communities}?discover=true&limit=30`;
            if (debouncedQuery.trim()) {
                url += `&search=${encodeURIComponent(debouncedQuery.trim())}`;
            }
            if (activeCategory !== 'all') {
                url += `&category=${activeCategory}`;
            }
            const data = await apiFetch<any>(url);
            const list = data.communities || data.data || data || [];
            setDiscoverCommunities(Array.isArray(list) ? list : []);
        } catch {
            // Silently fail — user can pull to refresh
        } finally {
            setIsLoadingDiscover(false);
        }
    };

    const handleRefresh = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsRefreshing(true);
        await Promise.all([fetchCommunities(), fetchDiscover()]);
        setIsRefreshing(false);
    };

    const handleJoin = useCallback(async (communityId: string, approvalRequired?: boolean) => {
        try {
            const result = await apiFetch(`/api/v1/communities/${communityId}/join`, { method: 'POST' }) as any;

            if (result?.status === 'pending') {
                // Request-to-join — mark as pending in local state
                setDiscoverCommunities((prev) =>
                    prev.map((c) => c.id === communityId ? { ...c, requestStatus: 'pending' } : c)
                );
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Request Sent', 'Your request to join has been sent to the admin for approval.');
            } else {
                // Direct join
                setDiscoverCommunities((prev) =>
                    prev.map((c) => c.id === communityId ? { ...c, role: 'member' as const } : c)
                );
                fetchCommunities(true); // Refresh my groups
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch {
            Alert.alert('Join Failed', 'Unable to join community. Please try again.');
        }
    }, [fetchCommunities]);

    // ============================================
    // Derived Data
    // ============================================

    const myGroups = useMemo(() =>
        communities.filter((c) => c.role !== null),
    [communities]);

    const joinedIds = useMemo(() => new Set(myGroups.map((c) => c.id)), [myGroups]);

    const discoverList = useMemo(() => {
        let pool = discoverCommunities.filter((c) => !joinedIds.has(c.id));

        // Also include non-joined communities from the main store
        const discoverIds = new Set(pool.map((c) => c.id));
        communities.forEach((c) => {
            if (!c.role && !discoverIds.has(c.id)) {
                pool.push(c);
            }
        });

        // Client-side search fallback
        if (debouncedQuery.trim()) {
            const q = debouncedQuery.trim().toLowerCase();
            pool = pool.filter(
                (c) => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
            );
        }

        // Client-side category filter fallback
        if (activeCategory !== 'all') {
            const keywords = CAT_KEYWORDS[activeCategory];
            pool = pool.filter((c) => {
                const text = `${c.name} ${c.description || ''}`.toLowerCase();
                return keywords.some((kw) => text.includes(kw));
            });
        }

        return pool;
    }, [discoverCommunities, communities, joinedIds, debouncedQuery, activeCategory]);

    const filteredMyGroups = useMemo(() => {
        if (!debouncedQuery.trim()) return myGroups;
        const q = debouncedQuery.trim().toLowerCase();
        return myGroups.filter((c) =>
            c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
        );
    }, [myGroups, debouncedQuery]);

    const activeData = activeTab === 'discover' ? discoverList : filteredMyGroups;
    const isLoadingActive = activeTab === 'discover' ? isLoadingDiscover : isLoading;

    // ============================================
    // Grid Render
    // ============================================

    const renderGridItem = useCallback(({ item }: { item: Community }) => (
        <CommunityCard
            community={item}
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/community/${item.id}`);
            }}
            onJoin={() => handleJoin(item.id, item.approvalRequired)}
        />
    ), [router, handleJoin]);

    const renderEmpty = () => {
        if (isLoadingActive) {
            return (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={colors.gold[500]} />
                </View>
            );
        }
        return <EmptyState tab={activeTab} searchActive={!!debouncedQuery.trim()} />;
    };

    // ============================================
    // Main Render
    // ============================================

    return (
        <View style={[styles.container, { backgroundColor: c.obsidian[900] }]}>
            <LinearGradient
                colors={[c.obsidian[900], c.obsidian[800]]}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>Communities</Text>
                    <TouchableOpacity
                        style={styles.createBtn}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setShowCreateModal(true);
                        }}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="Create community"
                    >
                        <Ionicons name="add" size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={16} color={colors.text.muted} style={styles.searchIcon} />
                    <TextInput
                        ref={searchInputRef}
                        style={styles.searchInput}
                        placeholder="Search communities..."
                        placeholderTextColor={colors.text.muted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="search"
                        accessibilityLabel="Search communities"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity
                            onPress={() => {
                                setSearchQuery('');
                                searchInputRef.current?.blur();
                            }}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel="Clear search"
                        >
                            <Ionicons name="close-circle" size={18} color={colors.text.muted} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Category Chips */}
                <CategoryChips active={activeCategory} onSelect={setActiveCategory} />

                {/* Tabs */}
                <TabSwitcher active={activeTab} onChange={setActiveTab} />
            </View>

            {/* Grid */}
            <FlatList
                data={activeData}
                renderItem={renderGridItem}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={styles.gridRow}
                contentContainerStyle={[styles.gridContent, { paddingBottom: insets.bottom + 24 }]}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={activeTab === 'discover' && !debouncedQuery.trim() ? (
                    featuredLoading ? (
                        <ActivityIndicator size="small" color={colors.gold[500]} style={{ padding: 20 }} />
                    ) : featuredCommunities.length > 0 ? (
                        <View style={styles.featuredSection}>
                            <View style={styles.featuredHeader}>
                                <Ionicons name="star" size={16} color={colors.gold[500]} />
                                <Text style={styles.featuredTitle}>Featured Communities</Text>
                            </View>
                            <FlatList
                                horizontal
                                data={featuredCommunities}
                                keyExtractor={(item) => `featured-${item.id}`}
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.featuredCard}
                                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/community/${item.id}`); }}
                                        activeOpacity={0.85}
                                    >
                                        <Image
                                            source={{ uri: item.coverUrl || item.avatarUrl }}
                                            style={styles.featuredCover}
                                            placeholder={IMAGE_PLACEHOLDER.blurhash}
                                            transition={IMAGE_PLACEHOLDER.transition}
                                            contentFit="cover"
                                            cachePolicy="memory-disk"
                                        />
                                        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.featuredOverlay}>
                                            <Text style={styles.featuredName} numberOfLines={1}>{item.name}</Text>
                                            <Text style={styles.featuredMembers}>{formatCount(item.membersCount || item.memberCount || 0)} members</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    ) : null
                ) : null}
                ListEmptyComponent={renderEmpty}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.gold[500]}
                        colors={[colors.gold[500]]}
                    />
                }
                removeClippedSubviews
                maxToRenderPerBatch={8}
                windowSize={7}
                initialNumToRender={6}
            />

            {/* Create Modal */}
            <CreateCommunityModal
                visible={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreate={() => {
                    fetchCommunities();
                    fetchDiscover();
                }}
            />
        </View>
    );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.obsidian[900],
    },

    // Header
    header: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.text.primary,
        letterSpacing: -0.3,
    },
    createBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.gold[500],
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Search
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.obsidian[700],
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        marginBottom: spacing.sm,
    },
    searchIcon: {
        marginRight: spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    },

    // Category Chips
    chipsContainer: {
        marginBottom: spacing.xs,
    },
    chipsScroll: {
        gap: spacing.sm,
        paddingRight: spacing.lg,
    },
    chip: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        backgroundColor: colors.obsidian[700],
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    chipActive: {
        backgroundColor: colors.gold[500],
        borderColor: colors.gold[500],
    },
    chipText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        fontWeight: '500',
    },
    chipTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },

    // Tabs
    tabBar: {
        flexDirection: 'row',
        marginTop: spacing.xs,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.sm + 2,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: colors.gold[500],
    },
    tabText: {
        fontSize: typography.fontSize.base,
        fontWeight: '500',
        color: colors.text.muted,
    },
    tabTextActive: {
        color: colors.text.primary,
        fontWeight: '600',
    },

    // Grid
    gridContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
    },
    gridRow: {
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },

    // Card
    card: {
        width: CARD_WIDTH,
        backgroundColor: colors.obsidian[700],
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
    },
    cardCover: {
        width: '100%',
        height: 130,
        position: 'relative',
        overflow: 'hidden',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    cardCoverFade: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 40,
    },

    // Avatar
    cardAvatarWrap: {
        position: 'absolute',
        top: 130 - 18, // overlap the cover by half the avatar
        right: spacing.sm,
        zIndex: 2,
    },
    cardAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: colors.obsidian[700],
    },
    cardAvatarFallback: {
        backgroundColor: colors.obsidian[500],
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardAvatarLetter: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text.primary,
    },

    // Card Body
    cardBody: {
        paddingHorizontal: spacing.sm + 2,
        paddingTop: spacing.sm + 6,
        paddingBottom: spacing.sm + 2,
    },
    cardName: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text.primary,
        marginBottom: 2,
    },
    cardDescription: {
        fontSize: 12,
        color: colors.text.muted,
        lineHeight: 16,
        marginBottom: spacing.sm,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cardMembers: {
        fontSize: 12,
        color: colors.text.secondary,
        fontWeight: '500',
    },
    accessBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    accessBadgeGreen: {
        backgroundColor: colors.emerald[500] + '20',
    },
    accessBadgeAmber: {
        backgroundColor: colors.amber[500] + '20',
    },
    accessBadgeText: {
        fontSize: 10,
        fontWeight: '600',
    },
    accessBadgeTextGreen: {
        color: colors.emerald[400],
    },
    accessBadgeTextAmber: {
        color: colors.amber[400],
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: spacing.xl,
    },
    emptyIconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: colors.obsidian[700],
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    emptyTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    emptySubtitle: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        textAlign: 'center',
        lineHeight: 20,
    },

    // Loading
    loadingWrap: {
        paddingTop: 80,
        alignItems: 'center',
    },

    // Modal
    modalContainer: {
        flex: 1,
        backgroundColor: colors.obsidian[900],
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    modalCancel: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
    },
    modalTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
    },
    modalDone: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.gold[500],
    },
    modalDoneDisabled: {
        opacity: 0.4,
    },
    modalBody: {
        padding: spacing.xl,
    },
    inputLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: spacing.xs,
        marginTop: spacing.lg,
    },
    modalInput: {
        backgroundColor: colors.obsidian[700],
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    modalTextArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.lg,
        backgroundColor: colors.obsidian[700],
        borderRadius: 12,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    switchTextWrap: {
        flex: 1,
    },
    switchLabel: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
    },
    switchDescription: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        marginTop: 2,
    },

    // ─── Featured Section ─────────────────────
    featuredSection: {
        marginBottom: spacing.lg,
    },
    featuredHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    featuredTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.text.primary,
        letterSpacing: 0.3,
    },
    featuredCard: {
        width: 200,
        height: 120,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: colors.obsidian[700],
    },
    featuredCover: {
        width: '100%',
        height: '100%',
    },
    featuredOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: spacing.md,
    },
    featuredName: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: '#fff',
    },
    featuredMembers: {
        fontSize: typography.fontSize.xs,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
    },
});
