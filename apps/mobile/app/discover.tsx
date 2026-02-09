import { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    ActivityIndicator,
    Animated as RNAnimated,
    Easing,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn, withSpring, useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { apiFetch, API } from '../lib/api';
import { useAuthStore } from '../stores';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================
// Celebration Particles — burst on mount
// ============================================
const PARTICLE_COLORS = [colors.gold[400], colors.gold[500], colors.emerald[500], colors.azure[500], colors.coral[400], '#F0D47A'];
const NUM_PARTICLES = 24;

function CelebrationBurst() {
    const particles = useRef(
        Array.from({ length: NUM_PARTICLES }, (_, i) => ({
            x: new RNAnimated.Value(SCREEN_WIDTH / 2),
            y: new RNAnimated.Value(80),
            opacity: new RNAnimated.Value(1),
            scale: new RNAnimated.Value(0),
            color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
            targetX: SCREEN_WIDTH / 2 + (Math.random() - 0.5) * SCREEN_WIDTH * 0.9,
            targetY: 80 + Math.random() * 300 - 100,
            size: 6 + Math.random() * 6,
        }))
    ).current;

    useEffect(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        particles.forEach((p, i) => {
            const delay = i * 20;
            RNAnimated.sequence([
                RNAnimated.delay(delay),
                RNAnimated.parallel([
                    RNAnimated.spring(p.scale, { toValue: 1, tension: 80, friction: 5, useNativeDriver: true }),
                    RNAnimated.timing(p.x, { toValue: p.targetX, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                    RNAnimated.timing(p.y, { toValue: p.targetY, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                ]),
                RNAnimated.timing(p.opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
            ]).start();
        });
    }, []);

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {particles.map((p, i) => (
                <RNAnimated.View
                    key={i}
                    style={{
                        position: 'absolute',
                        width: p.size,
                        height: p.size,
                        borderRadius: p.size / 2,
                        backgroundColor: p.color,
                        opacity: p.opacity,
                        transform: [
                            { translateX: p.x },
                            { translateY: p.y },
                            { scale: p.scale },
                        ],
                    }}
                />
            ))}
        </View>
    );
}

interface SuggestedUser {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    bio?: string;
    followersCount?: number;
    isFollowing?: boolean;
}

interface SuggestedCommunity {
    id: string;
    name: string;
    description?: string;
    avatarUrl?: string;
    membersCount?: number;
    isJoined?: boolean;
}

export default function DiscoverScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);

    const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
    const [suggestedCommunities, setSuggestedCommunities] = useState<SuggestedCommunity[]>([]);
    const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
    const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSuggestions();
    }, []);

    const loadSuggestions = async () => {
        setLoading(true);
        try {
            const [usersRes, communitiesRes] = await Promise.allSettled([
                apiFetch<any>(`${API.search}?q=trending&limit=12`),
                apiFetch<any>(API.communities),
            ]);

            if (usersRes.status === 'fulfilled' && usersRes.value?.users) {
                setSuggestedUsers(
                    usersRes.value.users
                        .filter((u: any) => u.id !== user?.id)
                        .slice(0, 10)
                        .map((u: any) => ({
                            id: u.id,
                            username: u.username,
                            displayName: u.displayName || u.username,
                            avatarUrl: u.avatarUrl,
                            bio: u.bio,
                            followersCount: u.followersCount || 0,
                        }))
                );
            }

            if (communitiesRes.status === 'fulfilled') {
                const communities = Array.isArray(communitiesRes.value) ? communitiesRes.value : communitiesRes.value?.communities || [];
                setSuggestedCommunities(
                    communities.slice(0, 6).map((c: any) => ({
                        id: c.id,
                        name: c.name,
                        description: c.description,
                        avatarUrl: c.avatarUrl,
                        membersCount: c.membersCount || c._count?.members || 0,
                    }))
                );
            }
        } catch {
            // Silently handle — discovery is best-effort
        } finally {
            setLoading(false);
        }
    };

    const handleFollow = async (userId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const isFollowing = followedIds.has(userId);
        setFollowedIds((prev) => {
            const next = new Set(prev);
            if (isFollowing) next.delete(userId);
            else next.add(userId);
            return next;
        });
        try {
            if (isFollowing) {
                await apiFetch(`/users/${userId}/unfollow`, { method: 'POST' });
            } else {
                await apiFetch(`/users/${userId}/follow`, { method: 'POST' });
            }
        } catch {
            // Revert on error
            setFollowedIds((prev) => {
                const next = new Set(prev);
                if (isFollowing) next.add(userId);
                else next.delete(userId);
                return next;
            });
        }
    };

    const handleJoin = async (communityId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const isJoined = joinedIds.has(communityId);
        setJoinedIds((prev) => {
            const next = new Set(prev);
            if (isJoined) next.delete(communityId);
            else next.add(communityId);
            return next;
        });
        try {
            await apiFetch(`/communities/${communityId}/${isJoined ? 'leave' : 'join'}`, { method: 'POST' });
        } catch {
            setJoinedIds((prev) => {
                const next = new Set(prev);
                if (isJoined) next.add(communityId);
                else next.delete(communityId);
                return next;
            });
        }
    };

    const totalFollowed = followedIds.size + joinedIds.size;

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0A0A0B', '#0D0D10', '#0A0A0B']} style={StyleSheet.absoluteFill} />

            {/* Celebration particles on first mount */}
            <CelebrationBurst />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <Animated.View entering={FadeIn.duration(600)}>
                    <Text style={styles.welcomeText}>Welcome to 0G</Text>
                    <Text style={styles.subtitle}>
                        Follow people and join communities to fill your feed with content you care about
                    </Text>
                </Animated.View>

                {/* Progress indicator */}
                <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.progressRow}>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${Math.min(100, totalFollowed * 20)}%` }]} />
                    </View>
                    <Text style={styles.progressText}>
                        {totalFollowed === 0 ? 'Follow at least 3 to get started' : totalFollowed < 3 ? `${3 - totalFollowed} more to go` : 'Looking great!'}
                    </Text>
                </Animated.View>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.gold[500]} />
                    <Text style={styles.loadingText}>Finding great content for you...</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Suggested People */}
                    {suggestedUsers.length > 0 && (
                        <Animated.View entering={FadeInDown.duration(400).delay(300)}>
                            <Text style={styles.sectionTitle}>People to Follow</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.peopleScroll}>
                                {suggestedUsers.map((u, i) => {
                                    const isFollowed = followedIds.has(u.id);
                                    return (
                                        <Animated.View key={u.id} entering={FadeInDown.duration(300).delay(400 + i * 60)}>
                                            <View style={styles.personCard}>
                                                <TouchableOpacity
                                                    onPress={() => router.push(`/profile/${u.username}` as any)}
                                                    activeOpacity={0.8}
                                                >
                                                    {u.avatarUrl ? (
                                                        <Image source={{ uri: u.avatarUrl }} style={styles.personAvatar} cachePolicy="memory-disk" />
                                                    ) : (
                                                        <View style={[styles.personAvatar, styles.personAvatarPlaceholder]}>
                                                            <LinearGradient
                                                                colors={[colors.gold[400], colors.gold[600]]}
                                                                style={StyleSheet.absoluteFill}
                                                            />
                                                            <Text style={styles.personInitial}>
                                                                {(u.displayName || '?')[0].toUpperCase()}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </TouchableOpacity>
                                                <Text style={styles.personName} numberOfLines={1}>{u.displayName}</Text>
                                                <Text style={styles.personHandle} numberOfLines={1}>@{u.username}</Text>
                                                {u.bio && <Text style={styles.personBio} numberOfLines={2}>{u.bio}</Text>}
                                                <TouchableOpacity
                                                    style={[styles.followBtn, isFollowed && styles.followBtnActive]}
                                                    onPress={() => handleFollow(u.id)}
                                                >
                                                    <Text style={[styles.followBtnText, isFollowed && styles.followBtnTextActive]}>
                                                        {isFollowed ? 'Following' : 'Follow'}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </Animated.View>
                                    );
                                })}
                            </ScrollView>
                        </Animated.View>
                    )}

                    {/* Suggested Communities */}
                    {suggestedCommunities.length > 0 && (
                        <Animated.View entering={FadeInDown.duration(400).delay(600)}>
                            <Text style={styles.sectionTitle}>Communities to Join</Text>
                            <View style={styles.communitiesList}>
                                {suggestedCommunities.map((c, i) => {
                                    const isJoined = joinedIds.has(c.id);
                                    return (
                                        <Animated.View key={c.id} entering={FadeInDown.duration(300).delay(700 + i * 80)}>
                                            <TouchableOpacity
                                                style={styles.communityRow}
                                                onPress={() => router.push(`/community/${c.id}` as any)}
                                                activeOpacity={0.8}
                                            >
                                                {c.avatarUrl ? (
                                                    <Image source={{ uri: c.avatarUrl }} style={styles.communityAvatar} cachePolicy="memory-disk" />
                                                ) : (
                                                    <View style={[styles.communityAvatar, styles.communityAvatarPlaceholder]}>
                                                        <Ionicons name="people" size={20} color={colors.gold[400]} />
                                                    </View>
                                                )}
                                                <View style={styles.communityInfo}>
                                                    <Text style={styles.communityName} numberOfLines={1}>{c.name}</Text>
                                                    <Text style={styles.communityMeta} numberOfLines={1}>
                                                        {c.membersCount} members{c.description ? ` · ${c.description}` : ''}
                                                    </Text>
                                                </View>
                                                <TouchableOpacity
                                                    style={[styles.joinBtn, isJoined && styles.joinBtnActive]}
                                                    onPress={() => handleJoin(c.id)}
                                                >
                                                    <Text style={[styles.joinBtnText, isJoined && styles.joinBtnTextActive]}>
                                                        {isJoined ? 'Joined' : 'Join'}
                                                    </Text>
                                                </TouchableOpacity>
                                            </TouchableOpacity>
                                        </Animated.View>
                                    );
                                })}
                            </View>
                        </Animated.View>
                    )}

                    {/* Deen Tools Spotlight */}
                    <Animated.View entering={FadeInDown.duration(400).delay(900)}>
                        <Text style={styles.sectionTitle}>Powerful Tools</Text>
                        <TouchableOpacity
                            style={styles.toolsSpotlight}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.push('/tools' as any);
                            }}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[colors.surface.goldSubtle, 'transparent']}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                            <View style={styles.toolsSpotlightContent}>
                                <View style={styles.toolsIconRow}>
                                    <View style={[styles.miniToolIcon, { backgroundColor: colors.gold[500] + '20' }]}>
                                        <Ionicons name="time-outline" size={18} color={colors.gold[500]} />
                                    </View>
                                    <View style={[styles.miniToolIcon, { backgroundColor: colors.emerald[500] + '20' }]}>
                                        <Ionicons name="compass-outline" size={18} color={colors.emerald[500]} />
                                    </View>
                                    <View style={[styles.miniToolIcon, { backgroundColor: '#D4AF3720' }]}>
                                        <Ionicons name="book-outline" size={18} color="#D4AF37" />
                                    </View>
                                    <View style={[styles.miniToolIcon, { backgroundColor: colors.azure[500] + '20' }]}>
                                        <Ionicons name="scan-outline" size={18} color={colors.azure[500]} />
                                    </View>
                                    <View style={[styles.miniToolIcon, { backgroundColor: colors.coral[500] + '20' }]}>
                                        <Ionicons name="shield-checkmark-outline" size={18} color={colors.coral[500]} />
                                    </View>
                                </View>
                                <Text style={styles.toolsSpotlightTitle}>Prayer Times · Qibla · Quran · Halal Check · Boycott Check</Text>
                                <Text style={styles.toolsSpotlightDesc}>
                                    Essential daily tools — prayer schedules, direction finder, Quran reader, and product scanners.
                                    {'\n'}Ramadan starts in 2 weeks. Get ready.
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.gold[400]} style={{ marginRight: spacing.md }} />
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Privacy highlight */}
                    <Animated.View entering={FadeInDown.duration(400).delay(1000)} style={styles.privacyCard}>
                        <View style={styles.privacyIcon}>
                            <Ionicons name="shield-checkmark" size={24} color={colors.emerald[500]} />
                        </View>
                        <Text style={styles.privacyTitle}>Your privacy is protected</Text>
                        <Text style={styles.privacyText}>
                            Your account starts in private mode. Only people you follow will see your content. No tracking, no ads, no data selling.
                        </Text>
                    </Animated.View>
                </ScrollView>
            )}

            {/* Floating CTA */}
            <View style={[styles.ctaBar, { paddingBottom: insets.bottom + spacing.md }]}>
                <TouchableOpacity
                    style={[styles.ctaButton, totalFollowed >= 3 && styles.ctaButtonReady]}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        router.replace('/(tabs)');
                    }}
                    activeOpacity={0.9}
                >
                    <LinearGradient
                        colors={totalFollowed >= 3 ? [colors.gold[400], colors.gold[600]] : [colors.obsidian[500], colors.obsidian[600]]}
                        style={styles.ctaGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Text style={[styles.ctaText, totalFollowed >= 3 && styles.ctaTextReady]}>
                            {totalFollowed >= 3 ? "Let's Go" : 'Skip for now'}
                        </Text>
                        <Ionicons
                            name="arrow-forward"
                            size={20}
                            color={totalFollowed >= 3 ? colors.obsidian[900] : colors.text.muted}
                            style={{ marginLeft: spacing.sm }}
                        />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0A0B' },
    header: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
    },
    welcomeText: {
        fontSize: 32, fontWeight: '700', color: colors.text.primary,
        fontFamily: 'Inter-Bold', letterSpacing: -0.8,
    },
    subtitle: {
        fontSize: typography.fontSize.base, color: colors.text.secondary,
        marginTop: spacing.sm, lineHeight: 22,
    },
    progressRow: {
        marginTop: spacing.lg,
    },
    progressBar: {
        height: 4, borderRadius: 2,
        backgroundColor: colors.obsidian[600],
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%', borderRadius: 2,
        backgroundColor: colors.gold[500],
    },
    progressText: {
        fontSize: typography.fontSize.xs, color: colors.text.muted,
        marginTop: spacing.xs,
    },
    loadingContainer: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
    },
    loadingText: {
        fontSize: typography.fontSize.base, color: colors.text.muted,
        marginTop: spacing.lg,
    },
    scroll: { flex: 1 },
    sectionTitle: {
        fontSize: typography.fontSize.lg, fontWeight: '700',
        color: colors.text.primary, fontFamily: 'Inter-Bold',
        paddingHorizontal: spacing.xl, marginTop: spacing.xl, marginBottom: spacing.md,
    },

    // People
    peopleScroll: {
        paddingHorizontal: spacing.lg, gap: spacing.md,
    },
    personCard: {
        width: 150, backgroundColor: colors.surface.glass,
        borderRadius: 16, padding: spacing.md,
        borderWidth: 1, borderColor: colors.border.subtle,
        alignItems: 'center',
    },
    personAvatar: {
        width: 64, height: 64, borderRadius: 32,
        marginBottom: spacing.sm,
    },
    personAvatarPlaceholder: {
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
    },
    personInitial: {
        fontSize: 24, fontWeight: '700', color: colors.obsidian[900],
        zIndex: 1,
    },
    personName: {
        fontSize: typography.fontSize.base, fontWeight: '600',
        color: colors.text.primary, textAlign: 'center',
    },
    personHandle: {
        fontSize: typography.fontSize.xs, color: colors.text.muted,
        marginTop: 2,
    },
    personBio: {
        fontSize: typography.fontSize.xs, color: colors.text.secondary,
        textAlign: 'center', marginTop: spacing.xs, lineHeight: 16,
    },
    followBtn: {
        marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 8,
        borderRadius: 20, borderWidth: 1.5, borderColor: colors.gold[500],
    },
    followBtnActive: {
        backgroundColor: colors.gold[500], borderColor: colors.gold[500],
    },
    followBtnText: {
        fontSize: typography.fontSize.sm, fontWeight: '600', color: colors.gold[500],
    },
    followBtnTextActive: {
        color: colors.obsidian[900],
    },

    // Communities
    communitiesList: {
        paddingHorizontal: spacing.xl, gap: spacing.sm,
    },
    communityRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surface.glass, borderRadius: 14,
        padding: spacing.md, borderWidth: 1, borderColor: colors.border.subtle,
    },
    communityAvatar: {
        width: 44, height: 44, borderRadius: 12,
    },
    communityAvatarPlaceholder: {
        backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center', justifyContent: 'center',
    },
    communityInfo: { flex: 1, marginLeft: spacing.md },
    communityName: {
        fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.primary,
    },
    communityMeta: {
        fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: 2,
    },
    joinBtn: {
        paddingHorizontal: spacing.md, paddingVertical: 6,
        borderRadius: 16, borderWidth: 1.5, borderColor: colors.gold[500],
    },
    joinBtnActive: {
        backgroundColor: colors.gold[500],
    },
    joinBtnText: {
        fontSize: typography.fontSize.sm, fontWeight: '600', color: colors.gold[500],
    },
    joinBtnTextActive: {
        color: colors.obsidian[900],
    },

    // Tools spotlight
    toolsSpotlight: {
        marginHorizontal: spacing.xl,
        backgroundColor: colors.surface.glass,
        borderRadius: 16, borderWidth: 1, borderColor: colors.border.subtle,
        overflow: 'hidden', flexDirection: 'row', alignItems: 'center',
    },
    toolsSpotlightContent: {
        flex: 1, padding: spacing.lg,
    },
    toolsIconRow: {
        flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm,
    },
    miniToolIcon: {
        width: 32, height: 32, borderRadius: 8,
        alignItems: 'center', justifyContent: 'center',
    },
    toolsSpotlightTitle: {
        fontSize: typography.fontSize.xs, color: colors.gold[400],
        fontWeight: '600', letterSpacing: 0.3,
    },
    toolsSpotlightDesc: {
        fontSize: typography.fontSize.sm, color: colors.text.secondary,
        marginTop: spacing.xs, lineHeight: 18,
    },

    // Privacy
    privacyCard: {
        marginHorizontal: spacing.xl, marginTop: spacing.xl,
        backgroundColor: colors.surface.glass, borderRadius: 16,
        padding: spacing.xl, borderWidth: 1, borderColor: colors.border.subtle,
        alignItems: 'center',
    },
    privacyIcon: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: colors.emerald[500] + '15',
        alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
    },
    privacyTitle: {
        fontSize: typography.fontSize.lg, fontWeight: '700', color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    privacyText: {
        fontSize: typography.fontSize.sm, color: colors.text.secondary,
        textAlign: 'center', lineHeight: 20,
    },

    // CTA
    ctaBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: spacing.xl, paddingTop: spacing.md,
        backgroundColor: colors.obsidian[900] + 'F0',
    },
    ctaButton: {
        borderRadius: 16, overflow: 'hidden',
    },
    ctaButtonReady: {
        shadowColor: colors.gold[500], shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
    },
    ctaGradient: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 16, paddingHorizontal: spacing.xl,
    },
    ctaText: {
        fontSize: typography.fontSize.lg, fontWeight: '600',
        color: colors.text.muted, fontFamily: 'Inter-SemiBold',
    },
    ctaTextReady: {
        color: colors.obsidian[900],
    },
});
