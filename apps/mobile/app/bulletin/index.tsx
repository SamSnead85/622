// ============================================
// Bulletin Board Screen
// Community announcements and pinned posts
// ============================================

import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { typography, spacing } from '@zerog/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { ScreenHeader } from '../../components';

// ============================================
// Types
// ============================================

interface BulletinItem {
    id: string;
    title: string;
    content: string;
    author: string;
    createdAt: string;
    isPinned?: boolean;
    category?: string;
}

// ============================================
// Bulletin Card
// ============================================

function BulletinCard({
    item,
    index,
    colors: c,
}: {
    item: BulletinItem;
    index: number;
    colors: Record<string, any>;
}) {
    return (
        <Animated.View entering={FadeInDown.delay(Math.min(index * 60, 300)).duration(300)}>
            <View
                style={[
                    styles.card,
                    { backgroundColor: c.surface.glass, borderColor: c.border.subtle },
                    item.isPinned && { borderColor: c.gold[500] + '40' },
                ]}
            >
                {item.isPinned && (
                    <View style={styles.pinnedBadge}>
                        <Ionicons name="pin" size={12} color={c.gold[500]} />
                        <Text style={[styles.pinnedText, { color: c.gold[500] }]}>Pinned</Text>
                    </View>
                )}
                {item.category && (
                    <View style={[styles.categoryBadge, { backgroundColor: c.gold[500] + '15' }]}>
                        <Text style={[styles.categoryText, { color: c.gold[500] }]}>
                            {item.category}
                        </Text>
                    </View>
                )}
                <Text style={[styles.cardTitle, { color: c.text.primary }]} numberOfLines={2}>
                    {item.title}
                </Text>
                <Text style={[styles.cardContent, { color: c.text.secondary }]} numberOfLines={3}>
                    {item.content}
                </Text>
                <View style={styles.cardFooter}>
                    <Text style={[styles.cardAuthor, { color: c.text.muted }]}>
                        {item.author}
                    </Text>
                    <Text style={[styles.cardTime, { color: c.text.muted }]}>
                        {item.createdAt}
                    </Text>
                </View>
            </View>
        </Animated.View>
    );
}

// ============================================
// Main Screen
// ============================================

export default function BulletinScreen() {
    const { colors: c } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [items, setItems] = useState<BulletinItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadBulletins = useCallback(async () => {
        // TODO: Replace with actual API call
        // Simulate loading
        const timer = setTimeout(() => {
            setItems([]);
            setIsLoading(false);
            setIsRefreshing(false);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        loadBulletins();
    }, [loadBulletins]);

    const handleRefresh = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsRefreshing(true);
        loadBulletins();
    }, [loadBulletins]);

    const renderItem = useCallback(
        ({ item, index }: { item: BulletinItem; index: number }) => (
            <BulletinCard item={item} index={index} colors={c} />
        ),
        [c],
    );

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <ScreenHeader title="Bulletin Board" />

            {/* Content */}
            {isLoading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={c.gold[400]} />
                </View>
            ) : (
                <FlatList
                    data={items}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[
                        styles.listContent,
                        items.length === 0 && styles.listContentEmpty,
                        { paddingBottom: insets.bottom + spacing.xl },
                    ]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            tintColor={c.gold[400]}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Animated.View entering={FadeIn.duration(400)}>
                                <View style={[styles.emptyIcon, { backgroundColor: c.surface.glass }]}>
                                    <Ionicons name="megaphone-outline" size={48} color={c.text.muted + '60'} />
                                </View>
                            </Animated.View>
                            <Text style={[styles.emptyTitle, { color: c.text.secondary }]}>
                                No bulletins yet
                            </Text>
                            <Text style={[styles.emptySubtitle, { color: c.text.muted }]}>
                                Community announcements and pinned posts will appear here
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
    },
    backBtn: { width: 40, alignItems: 'center' },
    headerTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
    },
    listContent: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
    },
    listContentEmpty: {
        flex: 1,
        justifyContent: 'center',
    },

    // Card
    card: {
        borderRadius: 14,
        borderWidth: 1,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    pinnedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: spacing.xs,
    },
    pinnedText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
    },
    categoryBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: 8,
        marginBottom: spacing.xs,
    },
    categoryText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    cardTitle: {
        fontSize: typography.fontSize.md,
        fontWeight: '700',
        marginBottom: spacing.xs,
    },
    cardContent: {
        fontSize: typography.fontSize.sm,
        lineHeight: 20,
        marginBottom: spacing.sm,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardAuthor: {
        fontSize: typography.fontSize.xs,
        fontWeight: '500',
    },
    cardTime: {
        fontSize: typography.fontSize.xs,
    },

    // States
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        gap: spacing.sm,
    },
    emptyIcon: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    emptyTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '600',
    },
    emptySubtitle: {
        fontSize: typography.fontSize.sm,
        textAlign: 'center',
        lineHeight: 20,
    },
});
