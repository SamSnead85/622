// ============================================
// Space Room — Live audio room UI
// Like Twitter Spaces but with premium dark UI
// ============================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
    FadeOut,
    ZoomIn,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    withDelay,
    interpolate,
    Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '@zerog/ui';
import { apiFetch, API, clearApiCache } from '../../lib/api';
import { socketManager } from '../../lib/socket';
import { useAuthStore } from '../../stores';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// Types
// ============================================

interface Speaker {
    userId: string;
    name: string;
    avatar: string | null;
    isMuted: boolean;
    joinedAt: number;
}

interface Listener {
    userId: string;
    name: string;
    avatar: string | null;
    joinedAt: number;
}

interface SpeakRequest {
    userId: string;
    name: string;
    avatar: string | null;
    requestedAt: number;
}

interface SpaceData {
    id: string;
    title: string;
    description: string;
    topic: string;
    hostId: string;
    hostName: string;
    hostAvatar: string | null;
    speakers: Speaker[];
    listeners: Listener[];
    speakRequests: SpeakRequest[];
    speakerCount: number;
    listenerCount: number;
    maxSpeakers: number;
    createdAt: number;
    status: string;
}

interface FloatingReaction {
    id: string;
    emoji: string;
    username: string;
}

// ============================================
// Speaking Indicator — animated pulsing ring
// ============================================

function SpeakingRing({ isActive, size }: { isActive: boolean; size: number }) {
    const pulse = useSharedValue(0);

    useEffect(() => {
        if (isActive) {
            pulse.value = withRepeat(
                withSequence(
                    withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }),
                    withTiming(0, { duration: 800, easing: Easing.in(Easing.ease) }),
                ),
                -1,
                false,
            );
        } else {
            pulse.value = withTiming(0, { duration: 300 });
        }
    }, [isActive, pulse]);

    const ringStyle = useAnimatedStyle(() => ({
        position: 'absolute',
        width: size + 12,
        height: size + 12,
        borderRadius: (size + 12) / 2,
        borderWidth: 2.5,
        borderColor: `rgba(244, 163, 0, ${interpolate(pulse.value, [0, 1], [0.15, 0.7])})`,
        transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.15]) }],
    }));

    const outerRingStyle = useAnimatedStyle(() => ({
        position: 'absolute',
        width: size + 22,
        height: size + 22,
        borderRadius: (size + 22) / 2,
        borderWidth: 1.5,
        borderColor: `rgba(244, 163, 0, ${interpolate(pulse.value, [0, 1], [0.05, 0.3])})`,
        transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.2]) }],
    }));

    if (!isActive) return null;

    return (
        <>
            <Animated.View style={outerRingStyle} />
            <Animated.View style={ringStyle} />
        </>
    );
}

// ============================================
// Speaker Tile
// ============================================

function SpeakerTile({
    speaker,
    isHost,
    isSelf,
    index,
}: {
    speaker: Speaker;
    isHost: boolean;
    isSelf: boolean;
    index: number;
}) {
    const isSpeaking = !speaker.isMuted; // Placeholder until WebRTC audio levels
    const avatarSize = 68;

    return (
        <Animated.View
            entering={ZoomIn.delay(index * 80).duration(400).springify()}
            style={styles.speakerTile}
        >
            {/* Speaking indicator rings */}
            <View style={styles.speakerAvatarContainer}>
                <SpeakingRing isActive={isSpeaking} size={avatarSize} />

                {/* Avatar */}
                {speaker.avatar ? (
                    <Image
                        source={{ uri: speaker.avatar }}
                        style={[styles.speakerAvatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
                        placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
                        transition={200}
                        cachePolicy="memory-disk"
                    />
                ) : (
                    <View
                        style={[
                            styles.speakerAvatar,
                            styles.avatarPlaceholder,
                            { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
                        ]}
                    >
                        <Ionicons name="person" size={28} color={colors.text.muted} />
                    </View>
                )}

                {/* Muted badge */}
                {speaker.isMuted && (
                    <View style={styles.mutedBadge}>
                        <Ionicons name="mic-off" size={10} color={colors.text.primary} />
                    </View>
                )}
            </View>

            {/* Name */}
            <Text style={styles.speakerName} numberOfLines={1}>
                {isSelf ? 'You' : speaker.name}
            </Text>

            {/* Role badges */}
            <View style={styles.roleBadgeRow}>
                {isHost && (
                    <View style={styles.hostRoleBadge}>
                        <Ionicons name="star" size={8} color={colors.amber[400]} />
                        <Text style={styles.roleBadgeText}>Host</Text>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

// ============================================
// Floating Reaction
// ============================================

function FloatingReactionBubble({ reaction }: { reaction: FloatingReaction }) {
    const translateY = useSharedValue(0);
    const opacity = useSharedValue(1);

    useEffect(() => {
        translateY.value = withTiming(-200, { duration: 2500, easing: Easing.out(Easing.ease) });
        opacity.value = withDelay(1500, withTiming(0, { duration: 1000 }));
    }, [translateY, opacity]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: translateY.value },
            { translateX: Math.random() * 60 - 30 },
        ],
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[styles.floatingReaction, animatedStyle]}>
            <Text style={styles.floatingReactionEmoji}>{reaction.emoji}</Text>
        </Animated.View>
    );
}

// ============================================
// Speak Request Card
// ============================================

function SpeakRequestCard({
    request,
    onApprove,
}: {
    request: SpeakRequest;
    onApprove: (userId: string) => void;
}) {
    return (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.requestCard}>
            <View style={styles.requestLeft}>
                {request.avatar ? (
                    <Image
                        source={{ uri: request.avatar }}
                        style={styles.requestAvatar}
                        placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
                        transition={200}
                        cachePolicy="memory-disk"
                    />
                ) : (
                    <View style={[styles.requestAvatar, styles.avatarPlaceholder]}>
                        <Ionicons name="person" size={14} color={colors.text.muted} />
                    </View>
                )}
                <View>
                    <Text style={styles.requestName}>{request.name}</Text>
                    <Text style={styles.requestLabel}>wants to speak</Text>
                </View>
            </View>
            <TouchableOpacity
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onApprove(request.userId);
                }}
                style={styles.approveBtn}
                activeOpacity={0.7}
            >
                <Ionicons name="checkmark" size={16} color={colors.obsidian[900]} />
            </TouchableOpacity>
        </Animated.View>
    );
}

// ============================================
// Reaction Emojis
// ============================================

const REACTION_EMOJIS = ['👏', '🔥', '💯', '❤️', '🙌', '😂'];

// ============================================
// Main Room Screen
// ============================================

export default function SpaceRoomScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const currentUser = useAuthStore((s) => s.user);
    const userId = currentUser?.id;

    const [space, setSpace] = useState<SpaceData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMuted, setIsMuted] = useState(true);
    const [hasRequestedSpeak, setHasRequestedSpeak] = useState(false);
    const [reactions, setReactions] = useState<FloatingReaction[]>([]);
    const [showReactions, setShowReactions] = useState(false);
    const [isEnded, setIsEnded] = useState(false);

    const reactionCounter = useRef(0);

    // Derived state
    const isHost = space?.hostId === userId;
    const isSpeaker = space?.speakers.some((s) => s.userId === userId) ?? false;
    const isListener = space?.listeners.some((l) => l.userId === userId) ?? false;
    const speakRequests = space?.speakRequests || [];

    // ---- Fetch space data ----
    const fetchSpace = useCallback(async () => {
        if (!id) return;
        try {
            clearApiCache(API.space(id));
            const data = await apiFetch<{ space: SpaceData }>(API.space(id), { cache: false });
            if (data?.space) {
                setSpace(data.space);
                if (data.space.status === 'ended') {
                    setIsEnded(true);
                }
                // Sync mute state for current user
                const me = data.space.speakers.find((s) => s.userId === userId);
                if (me) setIsMuted(me.isMuted);
            }
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to load space');
            router.back();
        } finally {
            setIsLoading(false);
        }
    }, [id, userId, router]);

    // ---- Join space on mount ----
    useEffect(() => {
        if (!id) return;

        // Join via REST API first
        apiFetch<{ space: SpaceData }>(API.spaceJoin(id), { method: 'POST' })
            .then((data) => {
                if (data?.space) {
                    setSpace(data.space);
                    if (data.space.status === 'ended') setIsEnded(true);
                    const me = data.space.speakers.find((s) => s.userId === userId);
                    if (me) setIsMuted(me.isMuted);
                }
                setIsLoading(false);
            })
            .catch((err) => {
                // If join fails, try fetching (might already be in)
                fetchSpace();
            });

        // Join socket room
        socketManager.joinSpace(id);

        return () => {
            // Leave socket room on unmount
            socketManager.leaveSpace(id);
        };
    }, [id, userId, fetchSpace]);

    // ---- Socket event listeners ----
    useEffect(() => {
        const unsubUpdate = socketManager.on('space:update', (data: any) => {
            if (data.spaceId === id) {
                setSpace((prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        speakers: data.speakers || prev.speakers,
                        listeners: data.listeners || prev.listeners,
                        speakerCount: data.speakerCount ?? prev.speakerCount,
                        listenerCount: data.listenerCount ?? prev.listenerCount,
                        speakRequests: data.speakRequests || prev.speakRequests,
                    };
                });
            }
        });

        const unsubMute = socketManager.on('space:mute-update', (data: any) => {
            if (data.spaceId === id) {
                setSpace((prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        speakers: prev.speakers.map((s) =>
                            s.userId === data.userId ? { ...s, isMuted: data.muted } : s,
                        ),
                    };
                });
                if (data.userId === userId) {
                    setIsMuted(data.muted);
                }
            }
        });

        const unsubReaction = socketManager.on('space:reaction', (data: any) => {
            if (data.spaceId !== id) return;
            const reactionId = `${Date.now()}-${reactionCounter.current++}`;
            setReactions((prev) => [...prev.slice(-15), { id: reactionId, emoji: data.emoji, username: data.username }]);
            // Auto-remove after animation
            setTimeout(() => {
                setReactions((prev) => prev.filter((r) => r.id !== reactionId));
            }, 3000);
        });

        const unsubEnded = socketManager.on('space:ended', (data: any) => {
            if (data.spaceId === id) {
                setIsEnded(true);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
        });

        const unsubPromoted = socketManager.on('space:promoted', (data: any) => {
            if (data.spaceId === id) {
                setHasRequestedSpeak(false);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                fetchSpace(); // Refresh to get updated role
            }
        });

        const unsubSpeakReq = socketManager.on('space:speak-request', (data: any) => {
            if (data.spaceId === id && isHost) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                fetchSpace(); // Refresh to show the request
            }
        });

        return () => {
            unsubUpdate();
            unsubMute();
            unsubReaction();
            unsubEnded();
            unsubPromoted();
            unsubSpeakReq();
        };
    }, [id, userId, isHost, fetchSpace]);

    // ---- Actions ----
    const handleToggleMute = useCallback(() => {
        if (!id) return;
        const newMuted = !isMuted;
        setIsMuted(newMuted);
        socketManager.toggleSpaceMute(id, newMuted);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, [id, isMuted]);

    const handleRequestSpeak = useCallback(async () => {
        if (!id || hasRequestedSpeak) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            await apiFetch(API.spaceRequestSpeak(id), { method: 'POST' });
            socketManager.requestSpeak(id);
            setHasRequestedSpeak(true);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to request to speak');
        }
    }, [id, hasRequestedSpeak]);

    const handleApproveSpeaker = useCallback(async (speakerId: string) => {
        if (!id) return;
        try {
            await apiFetch(API.spaceApproveSpeaker(id), {
                method: 'POST',
                body: JSON.stringify({ speakerId }),
            });
            socketManager.approveSpeaker(id, speakerId);
            fetchSpace();
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to approve speaker');
        }
    }, [id, fetchSpace]);

    const handleLeave = useCallback(async () => {
        if (!id) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        if (isHost) {
            Alert.alert(
                'End Space?',
                'As the host, leaving will end the space for everyone.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'End Space',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await apiFetch(API.spaceEnd(id), { method: 'POST' });
                                socketManager.endSpace(id);
                                router.back();
                            } catch {
                                router.back();
                            }
                        },
                    },
                ],
            );
        } else {
            try {
                await apiFetch(API.spaceLeave(id), { method: 'POST' });
                socketManager.leaveSpace(id);
            } catch {
                // Silent fail
            }
            router.back();
        }
    }, [id, isHost, router]);

    const handleReaction = useCallback((emoji: string) => {
        if (!id) return;
        socketManager.sendSpaceReaction(id, emoji);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowReactions(false);
    }, [id]);

    // ---- Loading state ----
    if (isLoading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={colors.amber[500]} />
                <Text style={styles.loadingText}>Joining space...</Text>
            </View>
        );
    }

    // ---- Ended state ----
    if (isEnded) {
        return (
            <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
                <LinearGradient
                    colors={[colors.obsidian[900], colors.obsidian[800]]}
                    style={StyleSheet.absoluteFill}
                />
                <Animated.View entering={FadeIn.duration(500)} style={styles.endedContent}>
                    <View style={styles.endedIconCircle}>
                        <Ionicons name="mic-off-outline" size={48} color={colors.text.muted} />
                    </View>
                    <Text style={styles.endedTitle}>Space Ended</Text>
                    <Text style={styles.endedSubtitle}>
                        {space?.title || 'This space'} has ended. Thanks for listening!
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.endedButton}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.endedButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        );
    }

    if (!space) return null;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient
                colors={[colors.obsidian[900], '#0D0D10', colors.obsidian[900]]}
                style={StyleSheet.absoluteFill}
            />

            {/* ---- Header ---- */}
            <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.headerBackBtn}
                    activeOpacity={0.7}
                >
                    <Ionicons name="chevron-down" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <View style={styles.headerLiveDot} />
                    <Text style={styles.headerLiveText}>LIVE</Text>
                </View>
                <View style={styles.headerRight}>
                    <View style={styles.listenerCountBadge}>
                        <Ionicons name="headset" size={12} color={colors.text.secondary} />
                        <Text style={styles.listenerCountText}>
                            {(space.speakerCount || 0) + (space.listenerCount || 0)}
                        </Text>
                    </View>
                </View>
            </Animated.View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ---- Title & Topic ---- */}
                <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.titleSection}>
                    <View style={styles.topicBadge}>
                        <Text style={styles.topicBadgeText}>{space.topic}</Text>
                    </View>
                    <Text style={styles.spaceTitle}>{space.title}</Text>
                    {space.description ? (
                        <Text style={styles.spaceDescription} numberOfLines={3}>
                            {space.description}
                        </Text>
                    ) : null}
                </Animated.View>

                {/* ---- Speakers Grid ---- */}
                <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                    <View style={styles.speakersSectionHeader}>
                        <Ionicons name="mic" size={16} color={colors.amber[400]} />
                        <Text style={styles.speakersSectionTitle}>
                            Speakers ({space.speakerCount}/{space.maxSpeakers})
                        </Text>
                    </View>
                    <View style={styles.speakersGrid}>
                        {space.speakers.map((speaker, index) => (
                            <SpeakerTile
                                key={speaker.userId}
                                speaker={speaker}
                                isHost={speaker.userId === space.hostId}
                                isSelf={speaker.userId === userId}
                                index={index}
                            />
                        ))}
                    </View>
                </Animated.View>

                {/* ---- Speak Requests (host only) ---- */}
                {isHost && speakRequests.length > 0 && (
                    <Animated.View entering={FadeInDown.delay(300).duration(400)}>
                        <View style={styles.requestsSectionHeader}>
                            <Ionicons name="hand-left" size={16} color={colors.coral[400]} />
                            <Text style={styles.requestsSectionTitle}>
                                Requests ({speakRequests.length})
                            </Text>
                        </View>
                        {speakRequests.map((req) => (
                            <SpeakRequestCard
                                key={req.userId}
                                request={req}
                                onApprove={handleApproveSpeaker}
                            />
                        ))}
                    </Animated.View>
                )}

                {/* ---- Listeners ---- */}
                {space.listenerCount > 0 && (
                    <Animated.View entering={FadeInDown.delay(350).duration(400)} style={styles.listenersSection}>
                        <View style={styles.listenersSectionHeader}>
                            <Ionicons name="headset" size={16} color={colors.text.muted} />
                            <Text style={styles.listenersSectionTitle}>
                                Listeners ({space.listenerCount})
                            </Text>
                        </View>
                        <View style={styles.listenersRow}>
                            {space.listeners.slice(0, 20).map((listener, idx) => (
                                <View key={listener.userId} style={styles.listenerItem}>
                                    {listener.avatar ? (
                                        <Image
                                            source={{ uri: listener.avatar }}
                                            style={styles.listenerAvatar}
                                            placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
                                            transition={200}
                                            cachePolicy="memory-disk"
                                        />
                                    ) : (
                                        <View style={[styles.listenerAvatar, styles.avatarPlaceholder]}>
                                            <Ionicons name="person" size={12} color={colors.text.muted} />
                                        </View>
                                    )}
                                    <Text style={styles.listenerName} numberOfLines={1}>{listener.name}</Text>
                                </View>
                            ))}
                            {space.listenerCount > 20 && (
                                <Text style={styles.moreListeners}>
                                    +{space.listenerCount - 20} more
                                </Text>
                            )}
                        </View>
                    </Animated.View>
                )}

                <View style={{ height: 140 }} />
            </ScrollView>

            {/* ---- Floating Reactions ---- */}
            <View style={styles.reactionsContainer} pointerEvents="none">
                {reactions.map((r) => (
                    <FloatingReactionBubble key={r.id} reaction={r} />
                ))}
            </View>

            {/* ---- Reaction Picker ---- */}
            {showReactions && (
                <Animated.View
                    entering={FadeInUp.duration(200)}
                    exiting={FadeOut.duration(150)}
                    style={[styles.reactionPicker, { bottom: 90 + insets.bottom }]}
                >
                    {REACTION_EMOJIS.map((emoji) => (
                        <TouchableOpacity
                            key={emoji}
                            onPress={() => handleReaction(emoji)}
                            style={styles.reactionBtn}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.reactionEmoji}>{emoji}</Text>
                        </TouchableOpacity>
                    ))}
                </Animated.View>
            )}

            {/* ---- Bottom Controls ---- */}
            <Animated.View
                entering={FadeInUp.delay(400).duration(400)}
                style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}
            >
                <LinearGradient
                    colors={['transparent', colors.obsidian[900], colors.obsidian[900]]}
                    style={styles.bottomBarGradient}
                />

                <View style={styles.controlsRow}>
                    {/* Leave button */}
                    <TouchableOpacity
                        onPress={handleLeave}
                        style={styles.leaveBtn}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="exit-outline" size={20} color={colors.coral[400]} />
                        <Text style={styles.leaveBtnText}>
                            {isHost ? 'End' : 'Leave'}
                        </Text>
                    </TouchableOpacity>

                    {/* Center controls */}
                    <View style={styles.centerControls}>
                        {/* Mute/unmute (speakers only) */}
                        {isSpeaker && (
                            <TouchableOpacity
                                onPress={handleToggleMute}
                                style={[styles.controlBtn, !isMuted && styles.controlBtnActive]}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={isMuted ? 'mic-off' : 'mic'}
                                    size={24}
                                    color={isMuted ? colors.text.muted : colors.obsidian[900]}
                                />
                            </TouchableOpacity>
                        )}

                        {/* Request to speak (listeners only) */}
                        {isListener && !isSpeaker && (
                            <TouchableOpacity
                                onPress={handleRequestSpeak}
                                style={[
                                    styles.controlBtn,
                                    hasRequestedSpeak && styles.controlBtnRequested,
                                ]}
                                disabled={hasRequestedSpeak}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name="hand-left"
                                    size={22}
                                    color={hasRequestedSpeak ? colors.amber[400] : colors.text.primary}
                                />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Reaction button */}
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setShowReactions((p) => !p);
                        }}
                        style={styles.reactionToggleBtn}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.reactionToggleEmoji}>🔥</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
}

// ============================================
// Styles
// ============================================

const SPEAKER_TILE_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - spacing.md * 2) / 3;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    centered: { alignItems: 'center', justifyContent: 'center' },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.lg },

    loadingText: { fontSize: typography.fontSize.base, color: colors.text.muted, marginTop: spacing.lg },

    // ---- Header ----
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    },
    headerBackBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: colors.surface.glass, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: colors.border.subtle,
    },
    headerCenter: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
        borderRadius: 8, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.25)',
    },
    headerLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.emerald[500] },
    headerLiveText: { fontSize: 10, fontWeight: '800', color: colors.emerald[400], letterSpacing: 1 },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    listenerCountBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: colors.surface.glass, paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm, borderRadius: 10,
        borderWidth: 1, borderColor: colors.border.subtle,
    },
    listenerCountText: { fontSize: typography.fontSize.sm, fontWeight: '700', color: colors.text.primary },

    // ---- Title Section ----
    titleSection: { paddingTop: spacing.lg, paddingBottom: spacing.xl, alignItems: 'center' },
    topicBadge: {
        backgroundColor: colors.amber[500] + '15', paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs, borderRadius: 8, marginBottom: spacing.md,
    },
    topicBadgeText: {
        fontSize: typography.fontSize.xs, fontWeight: '700', color: colors.amber[400],
        textTransform: 'uppercase', letterSpacing: 0.5,
    },
    spaceTitle: {
        fontSize: typography.fontSize['2xl'], fontWeight: '700', fontFamily: 'Inter-Bold',
        color: colors.text.primary, textAlign: 'center', lineHeight: 30,
        paddingHorizontal: spacing.lg,
    },
    spaceDescription: {
        fontSize: typography.fontSize.sm, color: colors.text.secondary, textAlign: 'center',
        marginTop: spacing.sm, paddingHorizontal: spacing.xl, lineHeight: 20,
    },

    // ---- Speakers Grid ----
    speakersSectionHeader: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg,
    },
    speakersSectionTitle: {
        fontSize: typography.fontSize.base, fontWeight: '700', color: colors.text.primary,
    },
    speakersGrid: {
        flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
        gap: spacing.lg, marginBottom: spacing.xl,
    },
    speakerTile: {
        width: SPEAKER_TILE_WIDTH, alignItems: 'center',
    },
    speakerAvatarContainer: {
        alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
    },
    speakerAvatar: {
        borderWidth: 2, borderColor: colors.obsidian[700],
    },
    avatarPlaceholder: {
        backgroundColor: colors.obsidian[600], alignItems: 'center', justifyContent: 'center',
    },
    mutedBadge: {
        position: 'absolute', bottom: -2, right: -2,
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: colors.coral[500], alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: colors.obsidian[900],
    },
    speakerName: {
        fontSize: typography.fontSize.xs, fontWeight: '600', color: colors.text.secondary,
        textAlign: 'center', marginBottom: 2,
    },
    roleBadgeRow: { flexDirection: 'row', gap: 4 },
    hostRoleBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 2,
        backgroundColor: colors.amber[500] + '20', paddingHorizontal: 6,
        paddingVertical: 1, borderRadius: 4,
    },
    roleBadgeText: { fontSize: 9, fontWeight: '700', color: colors.amber[400] },

    // ---- Speak Requests ----
    requestsSectionHeader: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md,
    },
    requestsSectionTitle: {
        fontSize: typography.fontSize.base, fontWeight: '700', color: colors.text.primary,
    },
    requestCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: colors.surface.glass, borderRadius: 14, borderWidth: 1,
        borderColor: colors.border.subtle, padding: spacing.md, marginBottom: spacing.sm,
    },
    requestLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    requestAvatar: { width: 36, height: 36, borderRadius: 18 },
    requestName: { fontSize: typography.fontSize.sm, fontWeight: '700', color: colors.text.primary },
    requestLabel: { fontSize: typography.fontSize.xs, color: colors.text.muted },
    approveBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: colors.emerald[500], alignItems: 'center', justifyContent: 'center',
    },

    // ---- Listeners ----
    listenersSection: { marginBottom: spacing.xl },
    listenersSectionHeader: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md,
    },
    listenersSectionTitle: {
        fontSize: typography.fontSize.base, fontWeight: '700', color: colors.text.muted,
    },
    listenersRow: {
        flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md,
    },
    listenerItem: { alignItems: 'center', width: 56 },
    listenerAvatar: { width: 36, height: 36, borderRadius: 18, marginBottom: 4 },
    listenerName: { fontSize: 10, color: colors.text.muted, textAlign: 'center' },
    moreListeners: { fontSize: typography.fontSize.xs, color: colors.text.muted, marginLeft: spacing.sm },

    // ---- Floating Reactions ----
    reactionsContainer: {
        position: 'absolute', bottom: 120, right: spacing.lg, width: 60,
        height: 250, alignItems: 'center',
    },
    floatingReaction: { position: 'absolute', bottom: 0 },
    floatingReactionEmoji: { fontSize: 28 },

    // ---- Reaction Picker ----
    reactionPicker: {
        position: 'absolute', right: spacing.lg,
        backgroundColor: colors.obsidian[700], borderRadius: 16,
        padding: spacing.sm, flexDirection: 'row', gap: spacing.xs,
        borderWidth: 1, borderColor: colors.border.default,
    },
    reactionBtn: {
        width: 40, height: 40, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: colors.surface.glass,
    },
    reactionEmoji: { fontSize: 20 },

    // ---- Bottom Bar ----
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: spacing.lg, paddingTop: spacing.lg,
    },
    bottomBarGradient: {
        ...StyleSheet.absoluteFillObject, top: -40,
    },
    controlsRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    leaveBtn: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        backgroundColor: 'rgba(255, 107, 107, 0.12)', paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md, borderRadius: 24,
        borderWidth: 1, borderColor: 'rgba(255, 107, 107, 0.2)',
    },
    leaveBtnText: { fontSize: typography.fontSize.sm, fontWeight: '700', color: colors.coral[400] },
    centerControls: { flexDirection: 'row', gap: spacing.md },
    controlBtn: {
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: colors.surface.glass, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: colors.border.subtle,
    },
    controlBtnActive: {
        backgroundColor: colors.amber[500], borderColor: colors.amber[500],
    },
    controlBtnRequested: {
        backgroundColor: colors.amber[500] + '20', borderColor: colors.amber[500] + '40',
    },
    reactionToggleBtn: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: colors.surface.glass, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: colors.border.subtle,
    },
    reactionToggleEmoji: { fontSize: 22 },

    // ---- Ended State ----
    endedContent: { alignItems: 'center', padding: spacing['2xl'] },
    endedIconCircle: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: colors.surface.glass, alignItems: 'center', justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    endedTitle: {
        fontSize: typography.fontSize['2xl'], fontWeight: '700', fontFamily: 'Inter-Bold',
        color: colors.text.primary, marginBottom: spacing.sm,
    },
    endedSubtitle: {
        fontSize: typography.fontSize.base, color: colors.text.secondary,
        textAlign: 'center', marginBottom: spacing.xl, lineHeight: 22,
        paddingHorizontal: spacing.xl,
    },
    endedButton: {
        backgroundColor: colors.amber[500] + '20', paddingHorizontal: spacing['2xl'],
        paddingVertical: spacing.md, borderRadius: 14,
    },
    endedButtonText: { fontSize: typography.fontSize.base, fontWeight: '700', color: colors.amber[400] },
});
