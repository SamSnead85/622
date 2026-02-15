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
    Share,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, shadows } from '@zerog/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { useCommunitiesStore, useAuthStore, Community } from '../../stores';
import { apiFetch, API } from '../../lib/api';
import { IMAGE_PLACEHOLDER } from '../../lib/imagePlaceholder';
import { useDebounce } from '../../hooks/useDebounce';
import { formatCount } from '../../lib/utils';
import { ErrorBoundary } from '../../components';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 3) / 2;
const FEATURED_CARD_WIDTH = SCREEN_WIDTH - 48;
const FEATURED_CARD_HEIGHT = 180;

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
    family: [colors.coral[500], colors.coral[300]],
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

const MOCK_AVATARS = [
    'https://i.pravatar.cc/40?img=1',
    'https://i.pravatar.cc/40?img=2',
    'https://i.pravatar.cc/40?img=3',
];

const CommunityCard = memo(function CommunityCard({ community, onPress, onJoin }: {
    community: Community;
    onPress: () => void;
    onJoin?: () => void;
}) {
    const hasCover = !!community.coverUrl;
    const isApprovalRequired = community.approvalRequired === true;
    const isMember = !!community.role;
    const isPending = community.requestStatus === 'pending';
    // Flag to prevent parent onPress from firing when join button is tapped
    const joinTappedRef = useRef(false);

    return (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.88}
            onPress={() => {
                // Skip navigation if the join button was just tapped
                if (joinTappedRef.current) {
                    joinTappedRef.current = false;
                    return;
                }
                onPress();
            }}
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
                {/* Gradient overlay for text readability */}
                <LinearGradient
                    colors={['transparent', colors.surface.overlayMedium]}
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
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardMembers}>
                            {formatCount(community.membersCount)} Members
                        </Text>
                        {/* Activity indicator */}
                        <View style={styles.activityRow}>
                            <View style={styles.activeDot} />
                            <Text style={styles.activeText}>Active now</Text>
                        </View>
                    </View>
                    <View style={styles.cardFooterActions}>
                        <TouchableOpacity
                            onPress={() => {
                                joinTappedRef.current = true;
                                Share.share({ message: `Join ${community.name} on 0G! https://0gravity.ai/community/${community.id}` });
                            }}
                            style={{ padding: 4 }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityLabel={`Share ${community.name}`}
                        >
                            <Ionicons name="share-outline" size={18} color={colors.text.muted} />
                        </TouchableOpacity>
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
                                    styles.accessBadgeJoinProminent,
                                    isApprovalRequired ? styles.accessBadgeAmber : styles.accessBadgeGreen,
                                ]}
                                onPress={() => {
                                    // Set flag so parent TouchableOpacity skips navigation
                                    joinTappedRef.current = true;
                                    onJoin?.();
                                }}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Ionicons
                                    name={isApprovalRequired ? 'lock-open-outline' : 'add-circle-outline'}
                                    size={12}
                                    color={isApprovalRequired ? colors.amber[400] : colors.emerald[400]}
                                />
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

                {/* Member avatar stack */}
                <View style={styles.avatarStack}>
                    {MOCK_AVATARS.map((uri, i) => (
                        <Image
                            key={`avatar-${i}`}
                            source={{ uri }}
                            style={[
                                styles.stackAvatar,
                                { marginLeft: i === 0 ? 0 : -8, zIndex: 3 - i },
                            ]}
                            contentFit="cover"
                            placeholder={IMAGE_PLACEHOLDER.blurhash}
                            transition={IMAGE_PLACEHOLDER.transition}
                            cachePolicy="memory-disk"
                        />
                    ))}
                    <Text style={styles.stackMore}>
                        +{Math.max((community.membersCount || 0) - 3, 0)}
                    </Text>
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

function EmptyState({ tab, searchActive, onSwitchToDiscover, onCreateCommunity }: {
    tab: TabKey;
    searchActive: boolean;
    onSwitchToDiscover?: () => void;
    onCreateCommunity?: () => void;
}) {
    const icon: keyof typeof Ionicons.glyphMap = searchActive
        ? 'search-outline'
        : tab === 'discover'
            ? 'compass-outline'
            : 'people-outline';
    const title = searchActive
        ? 'No matches found'
        : tab === 'discover'
            ? 'Communities are on the way'
            : 'No Communities Yet';
    const subtitle = searchActive
        ? 'Try different keywords or browse by category'
        : tab === 'discover'
            ? 'Be the first to start a community and bring people together!'
            : 'Join a community or create your own';

    return (
        <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
                <Ionicons name={icon} size={tab === 'my-groups' && !searchActive ? 64 : 36} color={colors.text.muted} />
            </View>
            <Text style={styles.emptyTitle}>{title}</Text>
            <Text style={styles.emptySubtitle}>{subtitle}</Text>
            {tab === 'my-groups' && !searchActive && (
                <View style={styles.emptyActions}>
                    <TouchableOpacity
                        style={[styles.emptyActionBtn, styles.emptyActionBtnPrimary]}
                        onPress={onSwitchToDiscover}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="compass-outline" size={16} color={colors.text.primary} />
                        <Text style={styles.emptyActionBtnPrimaryText}>Discover Communities</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.emptyActionBtn, styles.emptyActionBtnSecondary]}
                        onPress={onCreateCommunity}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="add-circle-outline" size={16} color={colors.gold[400]} />
                        <Text style={styles.emptyActionBtnSecondaryText}>Create Community</Text>
                    </TouchableOpacity>
                </View>
            )}
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
            await createCommunity(name.trim(), description.trim(), isPrivate, approvalRequired);
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
        fetchCommunities().catch(() => { /* handled in store */ });
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
            const result = await apiFetch<{ status?: string }>(`/api/v1/communities/${communityId}/join`, { method: 'POST' });

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

    // Recommended communities: top 5 by member count from discover list
    const recommendedCommunities = useMemo(() => {
        return [...discoverList]
            .sort((a, b) => (b.membersCount || 0) - (a.membersCount || 0))
            .slice(0, 5);
    }, [discoverList]);

    // Exclude recommended IDs from the main grid to avoid duplicate cards
    const recommendedIds = useMemo(
        () => new Set(recommendedCommunities.map((c) => c.id)),
        [recommendedCommunities],
    );

    // The grid data: on Discover tab without search, exclude items already shown in Recommended
    const gridData = useMemo(() => {
        if (activeTab === 'discover' && !debouncedQuery.trim() && recommendedIds.size > 0) {
            return discoverList.filter((c) => !recommendedIds.has(c.id));
        }
        return activeData;
    }, [activeTab, debouncedQuery, discoverList, activeData, recommendedIds]);

    const renderGridItem = useCallback(({ item, index }: { item: Community; index: number }) => (
        <Animated.View entering={FadeInDown.delay(Math.min(index * 60, 300)).duration(300)}>
            <CommunityCard
                community={item}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/community/${item.id}`);
                }}
                onJoin={() => handleJoin(item.id, item.approvalRequired)}
            />
        </Animated.View>
    ), [router, handleJoin]);

    const renderEmpty = () => {
        if (isLoadingActive) {
            return (
                <View style={{ paddingHorizontal: spacing.lg, gap: spacing.lg, paddingTop: spacing.lg }}>
                    {[0, 1, 2, 3, 4, 5].map(i => (
                        <Animated.View
                            key={i}
                            entering={FadeIn.delay(i * 80).duration(300)}
                            style={{
                                height: 120,
                                borderRadius: 14,
                                backgroundColor: c.surface.glass,
                                borderWidth: 1,
                                borderColor: c.border.subtle,
                            }}
                        />
                    ))}
                </View>
            );
        }
        // Don't show empty state if recommended communities are visible in the header
        if (activeTab === 'discover' && !debouncedQuery.trim() && recommendedCommunities.length > 0) {
            return null;
        }
        return (
            <EmptyState
                tab={activeTab}
                searchActive={!!debouncedQuery.trim()}
                onSwitchToDiscover={() => setActiveTab('discover')}
                onCreateCommunity={() => router.push('/community/create')}
            />
        );
    };

    // ============================================
    // Main Render
    // ============================================

    return (
        <ErrorBoundary>
        <View style={[styles.container, { backgroundColor: c.background }]}>

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>Communities</Text>
                    <TouchableOpacity
                        style={styles.createBtn}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            router.push('/community/create');
                        }}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="Create community"
                    >
                        <Ionicons name="add" size={22} color={colors.text.primary} />
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
                data={gridData}
                renderItem={renderGridItem}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={styles.gridRow}
                contentContainerStyle={[styles.gridContent, { paddingBottom: insets.bottom + 24 }]}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={activeTab === 'discover' && !debouncedQuery.trim() ? (
                    <View>
                        {/* ─── Featured Hero Section ─── */}
                        {featuredLoading ? (
                            <ActivityIndicator size="small" color={c.gold[500]} style={{ padding: 20 }} />
                        ) : featuredCommunities.length > 0 ? (
                            <View style={styles.featuredSection}>
                                <View style={styles.featuredHeader}>
                                    <Ionicons name="star" size={16} color={c.gold[500]} />
                                    <Text style={[styles.featuredTitle, { color: c.text.primary }]}>Featured Communities</Text>
                                </View>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}
                                    decelerationRate="fast"
                                    snapToInterval={FEATURED_CARD_WIDTH + spacing.md}
                                    snapToAlignment="start"
                                >
                                    {featuredCommunities.map((item, index) => (
                                        <Animated.View
                                            key={`featured-${item.id}`}
                                            entering={FadeInDown.delay(Math.min(index * 80, 400)).duration(350)}
                                        >
                                            <TouchableOpacity
                                                style={styles.featuredCard}
                                                onPress={() => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    router.push(`/community/${item.id}`);
                                                }}
                                                activeOpacity={0.85}
                                            >
                                                {item.coverUrl || item.avatarUrl ? (
                                                    <Image
                                                        source={{ uri: item.coverUrl || item.avatarUrl }}
                                                        style={styles.featuredCover}
                                                        placeholder={IMAGE_PLACEHOLDER.blurhash}
                                                        transition={IMAGE_PLACEHOLDER.transition}
                                                        contentFit="cover"
                                                        cachePolicy="memory-disk"
                                                    />
                                                ) : (
                                                    <LinearGradient
                                                        colors={getCoverGradient(item)}
                                                        style={styles.featuredCover}
                                                        start={{ x: 0, y: 0 }}
                                                        end={{ x: 1, y: 1 }}
                                                    />
                                                )}
                                                <LinearGradient
                                                    colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.75)']}
                                                    style={styles.featuredOverlay}
                                                >
                                                    <View style={styles.featuredOverlayContent}>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={[styles.featuredName, { color: c.text.primary }]} numberOfLines={1}>
                                                                {item.name}
                                                            </Text>
                                                            <View style={styles.featuredMeta}>
                                                                <Text style={[styles.featuredMembers, { color: c.text.secondary }]}>
                                                                    {formatCount(item.membersCount || 0)} members
                                                                </Text>
                                                                <View style={styles.featuredActiveBadge}>
                                                                    <View style={styles.featuredActiveDot} />
                                                                    <Text style={styles.featuredActiveText}>Active now</Text>
                                                                </View>
                                                            </View>
                                                        </View>
                                                        {!item.role && (
                                                            <TouchableOpacity
                                                                style={styles.featuredJoinBtn}
                                                                onPress={() => handleJoin(item.id, item.approvalRequired)}
                                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                            >
                                                                <Text style={styles.featuredJoinText}>Join</Text>
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        </Animated.View>
                                    ))}
                                </ScrollView>
                            </View>
                        ) : null}

                        {/* ─── Recommended for You Section ─── */}
                        {recommendedCommunities.length > 0 && (
                            <View style={styles.recommendedSection}>
                                <View style={styles.recommendedHeader}>
                                    <Text style={[styles.recommendedTitle, { color: c.text.primary }]}>Recommended for You</Text>
                                </View>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}
                                >
                                    {recommendedCommunities.map((item, index) => {
                                        const isMember = !!item.role;
                                        const isPending = item.requestStatus === 'pending';
                                        const isApproval = item.approvalRequired === true;
                                        return (
                                            <Animated.View
                                                key={`rec-${item.id}`}
                                                entering={FadeInDown.delay(Math.min(index * 60, 300)).duration(300)}
                                            >
                                                <TouchableOpacity
                                                    style={styles.recommendedCard}
                                                    onPress={() => {
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        router.push(`/community/${item.id}`);
                                                    }}
                                                    activeOpacity={0.85}
                                                >
                                                    <View style={styles.recommendedCoverWrap}>
                                                        {item.coverUrl || item.avatarUrl ? (
                                                            <Image
                                                                source={{ uri: item.coverUrl || item.avatarUrl }}
                                                                style={StyleSheet.absoluteFill}
                                                                contentFit="cover"
                                                                placeholder={IMAGE_PLACEHOLDER.blurhash}
                                                                transition={IMAGE_PLACEHOLDER.transition}
                                                                cachePolicy="memory-disk"
                                                            />
                                                        ) : (
                                                            <LinearGradient
                                                                colors={getCoverGradient(item)}
                                                                style={StyleSheet.absoluteFill}
                                                                start={{ x: 0, y: 0 }}
                                                                end={{ x: 1, y: 1 }}
                                                            />
                                                        )}
                                                        <LinearGradient
                                                            colors={['transparent', colors.surface.overlayMedium]}
                                                            style={styles.recommendedCoverFade}
                                                        />
                                                    </View>
                                                    <View style={styles.recommendedBody}>
                                                        <Text style={[styles.recommendedName, { color: c.text.primary }]} numberOfLines={1}>
                                                            {item.name}
                                                        </Text>
                                                        <Text style={[styles.recommendedMembers, { color: c.text.secondary }]}>
                                                            {formatCount(item.membersCount || 0)} members
                                                        </Text>
                                                        <View style={styles.activityRow}>
                                                            <View style={styles.activeDot} />
                                                            <Text style={styles.activeText}>Active now</Text>
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>
                                            </Animated.View>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        )}

                        {/* ─── "All Communities" label before the grid ─── */}
                        {gridData.length > 0 && (
                            <View style={styles.recommendedHeader}>
                                <Text style={[styles.recommendedTitle, { color: c.text.primary }]}>All Communities</Text>
                            </View>
                        )}
                    </View>
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
        </ErrorBoundary>
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
        borderBottomColor: colors.border.subtle,
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
        backgroundColor: colors.surface.glass,
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        borderWidth: 1,
        borderColor: colors.border.subtle,
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
        borderRadius: 24,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    chipActive: {
        backgroundColor: colors.gold[500],
        borderColor: colors.gold[400],
    },
    chipText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        fontWeight: '500',
    },
    chipTextActive: {
        color: colors.text.primary,
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
        backgroundColor: colors.surface.glass,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        overflow: 'hidden',
        ...shadows.md,
    },
    cardCover: {
        width: '100%',
        height: CARD_WIDTH / 2, // 2:1 aspect ratio
        position: 'relative',
        overflow: 'hidden',
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
    },
    cardCoverFade: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
    },

    // Avatar
    cardAvatarWrap: {
        position: 'absolute',
        top: (CARD_WIDTH / 2) - 18, // overlap the cover by half the avatar
        right: spacing.sm,
        zIndex: 2,
    },
    cardAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: colors.surface.glass,
    },
    cardAvatarFallback: {
        backgroundColor: colors.surface.glassHover,
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
    cardFooterActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    accessBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    accessBadgeJoinProminent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
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
        backgroundColor: colors.surface.glass,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border.subtle,
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
    emptyActions: {
        marginTop: spacing.lg,
        gap: spacing.sm,
        width: '100%',
        alignItems: 'center',
    },
    emptyActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: 14,
        minWidth: 220,
    },
    emptyActionBtnPrimary: {
        backgroundColor: colors.gold[500],
    },
    emptyActionBtnPrimaryText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
    },
    emptyActionBtnSecondary: {
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.gold[500] + '30',
    },
    emptyActionBtnSecondaryText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.gold[400],
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
        borderBottomColor: colors.border.subtle,
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
        backgroundColor: colors.surface.glass,
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    modalTextArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.lg,
        backgroundColor: colors.surface.glass,
        borderRadius: 12,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border.subtle,
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

    // ─── Activity Indicators ─────────────────
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    activeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.emerald[500],
    },
    activeText: {
        fontSize: 11,
        color: colors.text.muted,
    },

    // ─── Member Avatar Stack ─────────────────
    avatarStack: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    stackAvatar: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: colors.surface.glass,
    },
    stackMore: {
        fontSize: 10,
        color: colors.text.muted,
        marginLeft: 4,
        fontWeight: '500',
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
        width: FEATURED_CARD_WIDTH,
        height: FEATURED_CARD_HEIGHT,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        ...shadows.lg,
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
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        justifyContent: 'flex-end',
    },
    featuredOverlayContent: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    featuredName: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
    },
    featuredMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: 4,
    },
    featuredMembers: {
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
    },
    featuredActiveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.emerald[500] + '25',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    featuredActiveDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: colors.emerald[400],
    },
    featuredActiveText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.emerald[400],
    },
    featuredJoinBtn: {
        backgroundColor: colors.gold[500],
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        borderRadius: 10,
        marginLeft: spacing.sm,
    },
    featuredJoinText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.text.inverse,
    },

    // ─── Recommended for You ──────────────────
    recommendedSection: {
        marginBottom: spacing.lg,
    },
    recommendedHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    recommendedTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
    },
    recommendedSeeAll: {
        fontSize: typography.fontSize.sm,
        color: colors.gold[500],
        fontWeight: '600',
    },
    recommendedCard: {
        width: 160,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        ...shadows.sm,
    },
    recommendedCoverWrap: {
        width: '100%',
        height: 80,
        overflow: 'hidden',
        position: 'relative',
    },
    recommendedCoverFade: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 30,
    },
    recommendedBody: {
        padding: spacing.sm,
    },
    recommendedName: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.text.primary,
        marginBottom: 2,
    },
    recommendedMembers: {
        fontSize: 11,
        color: colors.text.secondary,
    },
});
