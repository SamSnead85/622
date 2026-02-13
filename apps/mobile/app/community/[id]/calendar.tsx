// ============================================
// Community Calendar / Events Screen
// Shows upcoming events grouped by date section
// with RSVP interaction and create-event modal
// ============================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { useTheme } from '../../../contexts/ThemeContext';
import { ScreenHeader } from '../../../components';
import { apiFetch, API } from '../../../lib/api';
import { useAuthStore } from '../../../stores';

// ============================================
// Types
// ============================================

type RsvpStatus = 'going' | 'maybe' | 'cant_go' | null;

interface CommunityEvent {
    id: string;
    title: string;
    description: string;
    startAt: string;
    endAt: string;
    timezone: string;
    location: string;
    isVirtual: boolean;
    meetingUrl: string;
    coverUrl: string | null;
    goingCount: number;
    maybeCount: number;
    myRsvp: RsvpStatus;
}

type SectionKey = 'today' | 'tomorrow' | 'thisWeek' | 'later';

interface EventSection {
    key: SectionKey;
    title: string;
    data: CommunityEvent[];
}

// ============================================
// Helpers
// ============================================

const RSVP_CYCLE: (RsvpStatus)[] = ['going', 'maybe', 'cant_go', null];

function nextRsvp(current: RsvpStatus): RsvpStatus {
    const idx = RSVP_CYCLE.indexOf(current);
    return RSVP_CYCLE[(idx + 1) % RSVP_CYCLE.length];
}

function rsvpLabel(status: RsvpStatus): string {
    switch (status) {
        case 'going':
            return 'Going';
        case 'maybe':
            return 'Maybe';
        case 'cant_go':
            return "Can't Go";
        default:
            return 'RSVP';
    }
}

function rsvpIcon(status: RsvpStatus): string {
    switch (status) {
        case 'going':
            return 'checkmark-circle';
        case 'maybe':
            return 'help-circle';
        case 'cant_go':
            return 'close-circle';
        default:
            return 'add-circle-outline';
    }
}

/** Format a date as "FEB" / "15" pair */
function dateBlock(iso: string): { month: string; day: string } {
    const d = new Date(iso);
    const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const day = d.getDate().toString();
    return { month, day };
}

/** Format a time range like "7:00 PM – 9:00 PM" */
function timeRange(startIso: string, endIso: string): string {
    const fmt = (iso: string) =>
        new Date(iso).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    return `${fmt(startIso)} – ${fmt(endIso)}`;
}

/** Bucket events into date sections */
function bucketEvents(events: CommunityEvent[]): EventSection[] {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const dayAfterTomorrow = new Date(todayStart);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    // End of this week (Sunday)
    const weekEnd = new Date(todayStart);
    weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));

    const buckets: Record<SectionKey, CommunityEvent[]> = {
        today: [],
        tomorrow: [],
        thisWeek: [],
        later: [],
    };

    for (const event of events) {
        const start = new Date(event.startAt);
        if (start >= todayStart && start < tomorrowStart) {
            buckets.today.push(event);
        } else if (start >= tomorrowStart && start < dayAfterTomorrow) {
            buckets.tomorrow.push(event);
        } else if (start >= dayAfterTomorrow && start < weekEnd) {
            buckets.thisWeek.push(event);
        } else if (start >= weekEnd) {
            buckets.later.push(event);
        }
    }

    const labels: Record<SectionKey, string> = {
        today: 'Today',
        tomorrow: 'Tomorrow',
        thisWeek: 'This Week',
        later: 'Later',
    };

    return (Object.keys(buckets) as SectionKey[])
        .filter((k) => buckets[k].length > 0)
        .map((k) => ({ key: k, title: labels[k], data: buckets[k] }));
}

// ============================================
// Main Screen
// ============================================

export default function CommunityCalendarScreen() {
    const { id: communityId } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: c, isDark } = useTheme();
    const user = useAuthStore((s) => s.user);

    // ---- Data state ----
    const [events, setEvents] = useState<CommunityEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ---- Community role (for FAB visibility) ----
    const [communityRole, setCommunityRole] = useState<string | null>(null);

    // ---- Create modal ----
    const [showCreate, setShowCreate] = useState(false);
    const [createTitle, setCreateTitle] = useState('');
    const [createDescription, setCreateDescription] = useState('');
    const [createDate, setCreateDate] = useState('');
    const [createStartTime, setCreateStartTime] = useState('');
    const [createEndTime, setCreateEndTime] = useState('');
    const [createLocation, setCreateLocation] = useState('');
    const [createIsVirtual, setCreateIsVirtual] = useState(false);
    const [createMeetingUrl, setCreateMeetingUrl] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const isAdminOrMod = communityRole === 'admin' || communityRole === 'moderator';

    // ---- Fetch events ----
    const fetchEvents = useCallback(
        async (silent = false) => {
            if (!communityId) return;
            if (!silent) setIsLoading(true);
            setError(null);
            try {
                const data = await apiFetch<{
                    events: CommunityEvent[];
                    role?: string;
                }>(`${API.communities}/${communityId}/events`, { cache: !silent });
                setEvents(data.events || []);
                if (data.role) setCommunityRole(data.role);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Failed to load events');
            } finally {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        },
        [communityId],
    );

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const onRefresh = useCallback(() => {
        setIsRefreshing(true);
        fetchEvents(true);
    }, [fetchEvents]);

    // ---- RSVP handler ----
    const handleRsvp = useCallback(
        async (eventId: string, currentStatus: RsvpStatus) => {
            const newStatus = nextRsvp(currentStatus);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            // Optimistic update
            setEvents((prev) =>
                prev.map((e) => {
                    if (e.id !== eventId) return e;
                    let goingCount = e.goingCount;
                    let maybeCount = e.maybeCount;
                    // Decrement old
                    if (currentStatus === 'going') goingCount--;
                    if (currentStatus === 'maybe') maybeCount--;
                    // Increment new
                    if (newStatus === 'going') goingCount++;
                    if (newStatus === 'maybe') maybeCount++;
                    return { ...e, myRsvp: newStatus, goingCount, maybeCount };
                }),
            );

            try {
                await apiFetch(
                    `${API.communities}/${communityId}/events/${eventId}/rsvp`,
                    {
                        method: 'POST',
                        body: JSON.stringify({ status: newStatus }),
                    },
                );
            } catch {
                // Revert on failure
                setEvents((prev) =>
                    prev.map((e) =>
                        e.id === eventId ? { ...e, myRsvp: currentStatus } : e,
                    ),
                );
            }
        },
        [communityId],
    );

    // ---- Create event ----
    const handleCreate = useCallback(async () => {
        if (!createTitle.trim() || !createDate.trim()) return;
        setIsCreating(true);
        try {
            const startAt = `${createDate}T${createStartTime || '00:00'}:00`;
            const endAt = `${createDate}T${createEndTime || '23:59'}:00`;
            await apiFetch(`${API.communities}/${communityId}/events`, {
                method: 'POST',
                body: JSON.stringify({
                    title: createTitle.trim(),
                    description: createDescription.trim(),
                    startAt,
                    endAt,
                    location: createLocation.trim(),
                    isVirtual: createIsVirtual,
                    meetingUrl: createIsVirtual ? createMeetingUrl.trim() : undefined,
                }),
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            resetCreateForm();
            setShowCreate(false);
            fetchEvents(true);
        } catch {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsCreating(false);
        }
    }, [
        communityId,
        createTitle,
        createDescription,
        createDate,
        createStartTime,
        createEndTime,
        createLocation,
        createIsVirtual,
        createMeetingUrl,
        fetchEvents,
    ]);

    const resetCreateForm = () => {
        setCreateTitle('');
        setCreateDescription('');
        setCreateDate('');
        setCreateStartTime('');
        setCreateEndTime('');
        setCreateLocation('');
        setCreateIsVirtual(false);
        setCreateMeetingUrl('');
    };

    // ---- Sections ----
    const sections = useMemo(() => bucketEvents(events), [events]);

    // Build a flat list with section headers interleaved
    const flatData = useMemo(() => {
        const items: ({ type: 'header'; title: string; key: string } | { type: 'event'; event: CommunityEvent })[] = [];
        for (const section of sections) {
            items.push({ type: 'header', title: section.title, key: section.key });
            for (const event of section.data) {
                items.push({ type: 'event', event });
            }
        }
        return items;
    }, [sections]);

    // ---- Dynamic styles ----
    const dynamicStyles = useMemo(
        () =>
            StyleSheet.create({
                container: {
                    flex: 1,
                    backgroundColor: c.obsidian[900],
                },
                sectionHeader: {
                    paddingHorizontal: spacing.lg,
                    paddingTop: spacing.xl,
                    paddingBottom: spacing.sm,
                },
                sectionTitle: {
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.semibold as '600',
                    color: c.gold[400],
                    letterSpacing: typography.letterSpacing.wider,
                    textTransform: 'uppercase',
                },
                card: {
                    flexDirection: 'row',
                    marginHorizontal: spacing.lg,
                    marginBottom: spacing.md,
                    borderRadius: 16,
                    backgroundColor: c.surface.glass,
                    borderWidth: 1,
                    borderColor: c.border.subtle,
                    overflow: 'hidden',
                },
                dateBlock: {
                    width: 64,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: spacing.lg,
                    borderRightWidth: 1,
                    borderRightColor: c.border.subtle,
                },
                dateMonth: {
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.bold as '700',
                    color: c.gold[400],
                    letterSpacing: typography.letterSpacing.wide,
                },
                dateDay: {
                    fontSize: typography.fontSize['2xl'],
                    fontWeight: typography.fontWeight.bold as '700',
                    color: c.text.primary,
                    marginTop: 2,
                },
                cardBody: {
                    flex: 1,
                    padding: spacing.md,
                    justifyContent: 'center',
                },
                eventTitle: {
                    fontSize: typography.fontSize.base,
                    fontWeight: typography.fontWeight.semibold as '600',
                    color: c.text.primary,
                    marginBottom: 4,
                },
                eventMeta: {
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 4,
                },
                eventMetaText: {
                    fontSize: typography.fontSize.sm,
                    color: c.text.secondary,
                    marginLeft: 4,
                },
                locationRow: {
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: spacing.sm,
                },
                virtualBadge: {
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: c.surface.azureSubtle,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                    alignSelf: 'flex-start',
                },
                virtualBadgeText: {
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.medium as '500',
                    color: c.azure[400],
                    marginLeft: 4,
                },
                bottomRow: {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 4,
                },
                attendeeRow: {
                    flexDirection: 'row',
                    alignItems: 'center',
                },
                attendeeAvatars: {
                    flexDirection: 'row',
                    marginRight: 6,
                },
                avatarCircle: {
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: c.obsidian[500],
                    borderWidth: 1.5,
                    borderColor: c.obsidian[700],
                    alignItems: 'center',
                    justifyContent: 'center',
                },
                avatarText: {
                    fontSize: 9,
                    fontWeight: typography.fontWeight.bold as '700',
                    color: c.text.secondary,
                },
                attendeeCount: {
                    fontSize: typography.fontSize.xs,
                    color: c.text.muted,
                },
                rsvpPill: {
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 20,
                    borderWidth: 1,
                },
                rsvpPillText: {
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.semibold as '600',
                    marginLeft: 4,
                },
                emptyContainer: {
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: spacing['2xl'],
                    paddingTop: spacing['4xl'],
                },
                emptyIcon: {
                    marginBottom: spacing.lg,
                    opacity: 0.4,
                },
                emptyTitle: {
                    fontSize: typography.fontSize.lg,
                    fontWeight: typography.fontWeight.semibold as '600',
                    color: c.text.primary,
                    marginBottom: spacing.sm,
                },
                emptySubtitle: {
                    fontSize: typography.fontSize.sm,
                    color: c.text.muted,
                    textAlign: 'center',
                    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
                },
                fab: {
                    position: 'absolute',
                    right: spacing.xl,
                    bottom: insets.bottom + spacing.xl,
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    overflow: 'hidden',
                },
                fabGradient: {
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                },
                // Modal styles
                modalOverlay: {
                    flex: 1,
                    backgroundColor: c.surface.overlayHeavy,
                    justifyContent: 'flex-end',
                },
                modalSheet: {
                    backgroundColor: c.obsidian[800],
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    paddingHorizontal: spacing.xl,
                    paddingTop: spacing.xl,
                    paddingBottom: insets.bottom + spacing.xl,
                    maxHeight: '90%',
                },
                modalHandle: {
                    width: 40,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: c.obsidian[400],
                    alignSelf: 'center',
                    marginBottom: spacing.lg,
                },
                modalTitle: {
                    fontSize: typography.fontSize.xl,
                    fontWeight: typography.fontWeight.bold as '700',
                    color: c.text.primary,
                    marginBottom: spacing.xl,
                },
                inputLabel: {
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium as '500',
                    color: c.text.secondary,
                    marginBottom: spacing.xs,
                    marginTop: spacing.md,
                },
                input: {
                    backgroundColor: c.obsidian[700],
                    borderRadius: 12,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.md,
                    fontSize: typography.fontSize.base,
                    color: c.text.primary,
                    borderWidth: 1,
                    borderColor: c.border.subtle,
                },
                inputMultiline: {
                    minHeight: 80,
                    textAlignVertical: 'top',
                },
                timeRow: {
                    flexDirection: 'row',
                    gap: spacing.md,
                },
                timeInput: {
                    flex: 1,
                },
                switchRow: {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: spacing.lg,
                    paddingVertical: spacing.sm,
                },
                switchLabel: {
                    fontSize: typography.fontSize.base,
                    color: c.text.primary,
                },
                createButton: {
                    marginTop: spacing.xl,
                    borderRadius: 14,
                    overflow: 'hidden',
                },
                createButtonGradient: {
                    paddingVertical: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                },
                createButtonText: {
                    fontSize: typography.fontSize.base,
                    fontWeight: typography.fontWeight.bold as '700',
                    color: colors.text.inverse,
                },
                createButtonDisabled: {
                    opacity: 0.5,
                },
                errorContainer: {
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: spacing['2xl'],
                },
                errorText: {
                    fontSize: typography.fontSize.base,
                    color: c.coral[400],
                    textAlign: 'center',
                    marginBottom: spacing.lg,
                },
                retryButton: {
                    paddingHorizontal: spacing.xl,
                    paddingVertical: spacing.md,
                    borderRadius: 12,
                    backgroundColor: c.surface.glass,
                    borderWidth: 1,
                    borderColor: c.border.default,
                },
                retryText: {
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.semibold as '600',
                    color: c.text.primary,
                },
            }),
        [c, insets.bottom],
    );

    // ---- RSVP pill colors ----
    const rsvpColors = useCallback(
        (status: RsvpStatus) => {
            switch (status) {
                case 'going':
                    return {
                        bg: 'rgba(16, 185, 129, 0.15)',
                        border: c.emerald[500],
                        text: c.emerald[400],
                    };
                case 'maybe':
                    return {
                        bg: 'rgba(244, 163, 0, 0.15)',
                        border: c.amber[500],
                        text: c.amber[400],
                    };
                case 'cant_go':
                    return {
                        bg: 'rgba(255, 107, 107, 0.15)',
                        border: c.coral[500],
                        text: c.coral[400],
                    };
                default:
                    return {
                        bg: c.surface.glass,
                        border: c.border.default,
                        text: c.text.secondary,
                    };
            }
        },
        [c],
    );

    // ---- Render event card ----
    const renderEventCard = useCallback(
        (event: CommunityEvent, index: number) => {
            const { month, day } = dateBlock(event.startAt);
            const time = timeRange(event.startAt, event.endAt);
            const rColors = rsvpColors(event.myRsvp);
            const totalAttendees = event.goingCount + event.maybeCount;

            return (
                <Animated.View
                    entering={FadeInDown.delay(index * 60).duration(400)}
                    key={event.id}
                >
                    <View style={dynamicStyles.card}>
                        {/* Date block */}
                        <LinearGradient
                            colors={[c.surface.goldSubtle, c.surface.goldFaded]}
                            style={dynamicStyles.dateBlock}
                        >
                            <Text style={dynamicStyles.dateMonth}>{month}</Text>
                            <Text style={dynamicStyles.dateDay}>{day}</Text>
                        </LinearGradient>

                        {/* Card body */}
                        <View style={dynamicStyles.cardBody}>
                            <Text style={dynamicStyles.eventTitle} numberOfLines={2}>
                                {event.title}
                            </Text>

                            {/* Time */}
                            <View style={dynamicStyles.eventMeta}>
                                <Ionicons
                                    name="time-outline"
                                    size={14}
                                    color={c.text.muted}
                                />
                                <Text style={dynamicStyles.eventMetaText}>{time}</Text>
                            </View>

                            {/* Location / Virtual */}
                            <View style={dynamicStyles.locationRow}>
                                {event.isVirtual ? (
                                    <View style={dynamicStyles.virtualBadge}>
                                        <Ionicons
                                            name="videocam"
                                            size={12}
                                            color={c.azure[400]}
                                        />
                                        <Text style={dynamicStyles.virtualBadgeText}>
                                            Virtual
                                        </Text>
                                    </View>
                                ) : event.location ? (
                                    <View style={dynamicStyles.eventMeta}>
                                        <Ionicons
                                            name="location-outline"
                                            size={14}
                                            color={c.text.muted}
                                        />
                                        <Text
                                            style={dynamicStyles.eventMetaText}
                                            numberOfLines={1}
                                        >
                                            {event.location}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>

                            {/* Bottom row: attendees + RSVP */}
                            <View style={dynamicStyles.bottomRow}>
                                <View style={dynamicStyles.attendeeRow}>
                                    {totalAttendees > 0 && (
                                        <View style={dynamicStyles.attendeeAvatars}>
                                            {Array.from({
                                                length: Math.min(totalAttendees, 3),
                                            }).map((_, i) => (
                                                <View
                                                    key={i}
                                                    style={[
                                                        dynamicStyles.avatarCircle,
                                                        i > 0 && { marginLeft: -8 },
                                                    ]}
                                                >
                                                    <Ionicons
                                                        name="person"
                                                        size={10}
                                                        color={c.text.muted}
                                                    />
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                    <Text style={dynamicStyles.attendeeCount}>
                                        {totalAttendees > 0
                                            ? `${totalAttendees} attending`
                                            : 'Be the first!'}
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={[
                                        dynamicStyles.rsvpPill,
                                        {
                                            backgroundColor: rColors.bg,
                                            borderColor: rColors.border,
                                        },
                                    ]}
                                    onPress={() =>
                                        handleRsvp(event.id, event.myRsvp)
                                    }
                                    activeOpacity={0.7}
                                    accessibilityLabel={`RSVP: ${rsvpLabel(event.myRsvp)}`}
                                    accessibilityRole="button"
                                >
                                    <Ionicons
                                        name={rsvpIcon(event.myRsvp) as any}
                                        size={14}
                                        color={rColors.text}
                                    />
                                    <Text
                                        style={[
                                            dynamicStyles.rsvpPillText,
                                            { color: rColors.text },
                                        ]}
                                    >
                                        {rsvpLabel(event.myRsvp)}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Animated.View>
            );
        },
        [c, dynamicStyles, handleRsvp, rsvpColors],
    );

    // ---- Flat list render item ----
    let eventIndex = 0;
    const renderItem = useCallback(
        ({ item }: { item: (typeof flatData)[number] }) => {
            if (item.type === 'header') {
                return (
                    <View style={dynamicStyles.sectionHeader}>
                        <Text style={dynamicStyles.sectionTitle}>{item.title}</Text>
                    </View>
                );
            }
            return renderEventCard(item.event, eventIndex++);
        },
        [dynamicStyles, renderEventCard],
    );

    const keyExtractor = useCallback(
        (item: (typeof flatData)[number], index: number) =>
            item.type === 'header' ? `header-${item.key}` : item.event.id,
        [],
    );

    // ---- Empty state ----
    const EmptyState = useCallback(
        () => (
            <View style={dynamicStyles.emptyContainer}>
                <Ionicons
                    name="calendar-outline"
                    size={64}
                    color={c.text.muted}
                    style={dynamicStyles.emptyIcon}
                />
                <Text style={dynamicStyles.emptyTitle}>No upcoming events</Text>
                <Text style={dynamicStyles.emptySubtitle}>
                    {isAdminOrMod
                        ? 'Tap the + button to create the first event for this community.'
                        : 'Check back later for upcoming community events.'}
                </Text>
            </View>
        ),
        [c, dynamicStyles, isAdminOrMod],
    );

    // ---- Error state ----
    if (error && events.length === 0) {
        return (
            <View style={dynamicStyles.container}>
                <ScreenHeader title="Events" />
                <View style={dynamicStyles.errorContainer}>
                    <Ionicons
                        name="cloud-offline-outline"
                        size={48}
                        color={c.coral[400]}
                        style={{ marginBottom: spacing.lg }}
                    />
                    <Text style={dynamicStyles.errorText}>{error}</Text>
                    <TouchableOpacity
                        style={dynamicStyles.retryButton}
                        onPress={() => fetchEvents()}
                        activeOpacity={0.7}
                    >
                        <Text style={dynamicStyles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={dynamicStyles.container}>
            <ScreenHeader title="Events" />

            {isLoading && events.length === 0 ? (
                <View style={dynamicStyles.emptyContainer}>
                    <ActivityIndicator size="large" color={c.gold[400]} />
                </View>
            ) : (
                <FlatList
                    data={flatData}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    contentContainerStyle={{
                        paddingBottom: insets.bottom + (isAdminOrMod ? 80 : 24),
                    }}
                    ListEmptyComponent={EmptyState}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={onRefresh}
                            tintColor={c.gold[400]}
                            colors={[c.gold[500]]}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* FAB for admin/mod */}
            {isAdminOrMod && (
                <TouchableOpacity
                    style={dynamicStyles.fab}
                    onPress={() => setShowCreate(true)}
                    activeOpacity={0.85}
                    accessibilityLabel="Create event"
                    accessibilityRole="button"
                >
                    <LinearGradient
                        colors={c.gradients.goldShine as unknown as [string, string, ...string[]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={dynamicStyles.fabGradient}
                    >
                        <Ionicons name="add" size={28} color={colors.text.inverse} />
                    </LinearGradient>
                </TouchableOpacity>
            )}

            {/* Create Event Modal */}
            <Modal
                visible={showCreate}
                animationType="slide"
                transparent
                onRequestClose={() => setShowCreate(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={dynamicStyles.modalOverlay}
                >
                    <TouchableOpacity
                        style={{ flex: 1 }}
                        activeOpacity={1}
                        onPress={() => setShowCreate(false)}
                    />
                    <View style={dynamicStyles.modalSheet}>
                        <View style={dynamicStyles.modalHandle} />
                        <Text style={dynamicStyles.modalTitle}>Create Event</Text>

                        {/* Title */}
                        <Text style={dynamicStyles.inputLabel}>Title</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={createTitle}
                            onChangeText={setCreateTitle}
                            placeholder="Event title"
                            placeholderTextColor={c.text.muted}
                            maxLength={100}
                        />

                        {/* Description */}
                        <Text style={dynamicStyles.inputLabel}>Description</Text>
                        <TextInput
                            style={[dynamicStyles.input, dynamicStyles.inputMultiline]}
                            value={createDescription}
                            onChangeText={setCreateDescription}
                            placeholder="What's this event about?"
                            placeholderTextColor={c.text.muted}
                            multiline
                            maxLength={500}
                        />

                        {/* Date */}
                        <Text style={dynamicStyles.inputLabel}>Date</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={createDate}
                            onChangeText={setCreateDate}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={c.text.muted}
                            keyboardType="numbers-and-punctuation"
                        />

                        {/* Time */}
                        <View style={dynamicStyles.timeRow}>
                            <View style={dynamicStyles.timeInput}>
                                <Text style={dynamicStyles.inputLabel}>Start Time</Text>
                                <TextInput
                                    style={dynamicStyles.input}
                                    value={createStartTime}
                                    onChangeText={setCreateStartTime}
                                    placeholder="HH:MM"
                                    placeholderTextColor={c.text.muted}
                                    keyboardType="numbers-and-punctuation"
                                />
                            </View>
                            <View style={dynamicStyles.timeInput}>
                                <Text style={dynamicStyles.inputLabel}>End Time</Text>
                                <TextInput
                                    style={dynamicStyles.input}
                                    value={createEndTime}
                                    onChangeText={setCreateEndTime}
                                    placeholder="HH:MM"
                                    placeholderTextColor={c.text.muted}
                                    keyboardType="numbers-and-punctuation"
                                />
                            </View>
                        </View>

                        {/* Virtual toggle */}
                        <View style={dynamicStyles.switchRow}>
                            <Text style={dynamicStyles.switchLabel}>Virtual Event</Text>
                            <Switch
                                value={createIsVirtual}
                                onValueChange={setCreateIsVirtual}
                                trackColor={{
                                    false: c.obsidian[500],
                                    true: c.gold[600],
                                }}
                                thumbColor={
                                    createIsVirtual ? c.gold[400] : c.obsidian[300]
                                }
                            />
                        </View>

                        {/* Location or Meeting URL */}
                        {createIsVirtual ? (
                            <>
                                <Text style={dynamicStyles.inputLabel}>Meeting URL</Text>
                                <TextInput
                                    style={dynamicStyles.input}
                                    value={createMeetingUrl}
                                    onChangeText={setCreateMeetingUrl}
                                    placeholder="https://meet.google.com/..."
                                    placeholderTextColor={c.text.muted}
                                    keyboardType="url"
                                    autoCapitalize="none"
                                />
                            </>
                        ) : (
                            <>
                                <Text style={dynamicStyles.inputLabel}>Location</Text>
                                <TextInput
                                    style={dynamicStyles.input}
                                    value={createLocation}
                                    onChangeText={setCreateLocation}
                                    placeholder="Where is this event?"
                                    placeholderTextColor={c.text.muted}
                                />
                            </>
                        )}

                        {/* Create button */}
                        <TouchableOpacity
                            style={[
                                dynamicStyles.createButton,
                                (!createTitle.trim() || !createDate.trim() || isCreating) &&
                                    dynamicStyles.createButtonDisabled,
                            ]}
                            onPress={handleCreate}
                            disabled={!createTitle.trim() || !createDate.trim() || isCreating}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={c.gradients.goldShine as unknown as [string, string, ...string[]]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={dynamicStyles.createButtonGradient}
                            >
                                {isCreating ? (
                                    <ActivityIndicator
                                        size="small"
                                        color={colors.text.inverse}
                                    />
                                ) : (
                                    <Text style={dynamicStyles.createButtonText}>
                                        Create Event
                                    </Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}
