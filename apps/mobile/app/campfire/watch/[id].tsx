// ============================================
// Campfire — Stream Viewer
// Full-screen HLS player with live chat,
// reactions, gifts, and real-time socket events
// ============================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    FlatList,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import Animated, {
    FadeIn,
    FadeOut,
    FadeInDown,
    SlideInDown,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withDelay,
    interpolate,
    runOnJS,
    Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '@zerog/ui';
import { apiFetch, API } from '../../../lib/api';
import { socketManager } from '../../../lib/socket';
import { useAuthStore } from '../../../stores';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// Types
// ============================================

interface StreamUser {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
}

interface StreamData {
    id: string;
    title: string;
    description?: string;
    thumbnailUrl?: string;
    playbackUrl?: string;
    status: string;
    viewerCount: number;
    category?: string;
    user: StreamUser;
    createdAt: string;
}

interface ChatMessage {
    id: string;
    userId: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    content: string;
    type?: 'chat' | 'gift' | 'system';
    giftType?: string;
    timestamp: number;
}

interface FloatingReaction {
    id: string;
    emoji: string;
    x: number;
}

// ============================================
// Constants
// ============================================

const REACTION_EMOJIS = ['🔥', '❤️', '😂', '👏', '🎉', '💯'];

const GIFT_TYPES = [
    { key: 'star', emoji: '⭐', label: 'Star', color: colors.gold[500] },
    { key: 'fire', emoji: '🔥', label: 'Fire', color: colors.coral[500] },
    { key: 'diamond', emoji: '💎', label: 'Diamond', color: colors.azure[500] },
    { key: 'crown', emoji: '👑', label: 'Crown', color: colors.amber[500] },
];

// ============================================
// Floating Reaction Animation
// ============================================

function FloatingEmoji({ emoji, x, onComplete }: { emoji: string; x: number; onComplete: () => void }) {
    const translateY = useSharedValue(0);
    const opacity = useSharedValue(1);
    const scale = useSharedValue(0.3);

    useEffect(() => {
        scale.value = withSpring(1, { damping: 8, stiffness: 200 });
        translateY.value = withTiming(-200, { duration: 2000, easing: Easing.out(Easing.ease) });
        opacity.value = withDelay(1200, withTiming(0, { duration: 800 }, () => {
            runOnJS(onComplete)();
        }));
    }, [translateY, opacity, scale, onComplete]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: translateY.value },
            { scale: scale.value },
        ],
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            style={[
                styles.floatingEmoji,
                { left: x },
                animatedStyle,
            ]}
        >
            <Text style={styles.floatingEmojiText}>{emoji}</Text>
        </Animated.View>
    );
}

// ============================================
// Chat Message Component
// ============================================

const ChatBubble = React.memo(function ChatBubble({ message }: { message: ChatMessage }) {
    if (message.type === 'system') {
        return (
            <View style={styles.systemMessage}>
                <Text style={styles.systemMessageText}>{message.content}</Text>
            </View>
        );
    }

    if (message.type === 'gift') {
        const gift = GIFT_TYPES.find((g) => g.key === message.giftType);
        return (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.giftMessage}>
                <Text style={styles.giftEmoji}>{gift?.emoji || '🎁'}</Text>
                <Text style={styles.giftText}>
                    <Text style={[styles.giftSender, { color: gift?.color || colors.gold[400] }]}>
                        {message.displayName}
                    </Text>
                    {' sent a '}
                    <Text style={{ color: gift?.color || colors.gold[400] }}>{gift?.label || 'gift'}</Text>
                </Text>
            </Animated.View>
        );
    }

    return (
        <Animated.View entering={FadeInDown.duration(200)} style={styles.chatBubble}>
            <Text style={styles.chatText}>
                <Text style={styles.chatUsername}>{message.displayName} </Text>
                {message.content}
            </Text>
        </Animated.View>
    );
});

// ============================================
// Viewer Count Badge
// ============================================

function ViewerCountBadge({ count }: { count: number }) {
    return (
        <View style={styles.viewerCountBadge}>
            <View style={styles.viewerDot} />
            <Ionicons name="eye" size={12} color={colors.text.primary} />
            <Text style={styles.viewerCountText}>
                {count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count}
            </Text>
        </View>
    );
}

// ============================================
// Main Screen
// ============================================

export default function StreamViewerScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);

    // ---- State ----
    const [stream, setStream] = useState<StreamData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [viewerCount, setViewerCount] = useState(0);
    const [isFollowing, setIsFollowing] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
    const [showGiftPanel, setShowGiftPanel] = useState(false);

    const chatListRef = useRef<FlatList>(null);
    const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reactionIdRef = useRef(0);

    // ---- Video Player ----
    const player = useVideoPlayer(stream?.playbackUrl || '', (p) => {
        p.loop = false;
        p.muted = false;
        p.play();
    });

    // ---- Fetch stream data ----
    useEffect(() => {
        if (!id) return;

        const fetchStream = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const data = await apiFetch<any>(API.livestream(id));
                const streamData = data?.stream || data;
                setStream(streamData);
                setViewerCount(streamData?.viewerCount || 0);
            } catch (err: any) {
                setError(err.message || 'Failed to load stream');
            } finally {
                setIsLoading(false);
            }
        };

        fetchStream();
    }, [id]);

    // ---- Socket: join/leave stream room ----
    useEffect(() => {
        if (!id || !stream) return;

        // Join the stream room
        socketManager.joinStream(id);

        // Re-join on reconnect
        const unsubConnected = socketManager.on('connected', () => {
            socketManager.joinStream(id);
        });

        // Listen for chat messages
        const unsubChat = socketManager.on('stream:chat', (data: any) => {
            if (data.streamId !== id) return;
            const msg: ChatMessage = {
                id: data.id || `${Date.now()}-${Math.random()}`,
                userId: data.userId,
                username: data.username,
                displayName: data.displayName || data.username,
                avatarUrl: data.avatarUrl,
                content: data.content || data.message,
                type: 'chat',
                timestamp: Date.now(),
            };
            setChatMessages((prev) => [...prev.slice(-100), msg]);
        });

        // Listen for reactions
        const unsubReaction = socketManager.on('stream:reaction', (data: any) => {
            if (data.streamId !== id) return;
            addFloatingReaction(data.emoji || '🔥');
        });

        // Listen for gifts
        const unsubGift = socketManager.on('stream:gift', (data: any) => {
            if (data.streamId !== id) return;
            const msg: ChatMessage = {
                id: `gift-${Date.now()}-${Math.random()}`,
                userId: data.userId,
                username: data.username,
                displayName: data.displayName || data.username,
                content: '',
                type: 'gift',
                giftType: data.giftType,
                timestamp: Date.now(),
            };
            setChatMessages((prev) => [...prev.slice(-100), msg]);
        });

        // Listen for viewer count updates
        const unsubViewers = socketManager.on('stream:viewers', (data: any) => {
            if (data.streamId !== id) return;
            setViewerCount(data.count || 0);
        });

        // Listen for stream ending
        const unsubEnd = socketManager.on('stream:ended', (data: any) => {
            if (data.streamId !== id) return;
            setChatMessages((prev) => [
                ...prev,
                {
                    id: `system-end-${Date.now()}`,
                    userId: 'system',
                    username: 'system',
                    displayName: 'System',
                    content: 'Stream has ended',
                    type: 'system',
                    timestamp: Date.now(),
                },
            ]);
        });

        return () => {
            socketManager.leaveStream(id);
            unsubConnected();
            unsubChat();
            unsubReaction();
            unsubGift();
            unsubViewers();
            unsubEnd();
        };
    }, [id, stream]);

    // ---- Auto-hide controls ----
    useEffect(() => {
        if (showControls) {
            if (controlsTimer.current) clearTimeout(controlsTimer.current);
            controlsTimer.current = setTimeout(() => setShowControls(false), 5000);
        }
        return () => {
            if (controlsTimer.current) clearTimeout(controlsTimer.current);
        };
    }, [showControls]);

    // ---- Add floating reaction ----
    const addFloatingReaction = useCallback((emoji: string) => {
        const newId = `reaction-${reactionIdRef.current++}`;
        const x = SCREEN_WIDTH * 0.7 + Math.random() * (SCREEN_WIDTH * 0.25);
        setFloatingReactions((prev) => [...prev, { id: newId, emoji, x }]);
    }, []);

    const removeFloatingReaction = useCallback((reactionId: string) => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== reactionId));
    }, []);

    // ---- Send chat message ----
    const handleSendChat = useCallback(() => {
        const content = chatInput.trim();
        if (!content || !user) return;

        socketManager.sendStreamChat({
            streamId: id!,
            content,
            userId: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
        });

        // Optimistic add
        setChatMessages((prev) => [
            ...prev.slice(-100),
            {
                id: `local-${Date.now()}`,
                userId: user.id,
                username: user.username,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                content,
                type: 'chat',
                timestamp: Date.now(),
            },
        ]);
        setChatInput('');
    }, [chatInput, id, user]);

    // ---- Send reaction ----
    const handleReaction = useCallback(
        (emoji: string) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            addFloatingReaction(emoji);
            socketManager.sendStreamReaction({
                streamId: id!,
                emoji,
                userId: user?.id,
            });
        },
        [id, user, addFloatingReaction],
    );

    // ---- Send gift ----
    const handleGift = useCallback(
        (giftType: string) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowGiftPanel(false);

            socketManager.sendStreamGift({
                streamId: id!,
                giftType,
                userId: user?.id,
                username: user?.username,
                displayName: user?.displayName,
            });

            // Optimistic add
            const gift = GIFT_TYPES.find((g) => g.key === giftType);
            setChatMessages((prev) => [
                ...prev.slice(-100),
                {
                    id: `gift-local-${Date.now()}`,
                    userId: user?.id || '',
                    username: user?.username || '',
                    displayName: user?.displayName || '',
                    content: '',
                    type: 'gift',
                    giftType,
                    timestamp: Date.now(),
                },
            ]);

            // Burst of reactions
            for (let i = 0; i < 5; i++) {
                setTimeout(() => addFloatingReaction(gift?.emoji || '🎁'), i * 100);
            }
        },
        [id, user, addFloatingReaction],
    );

    // ---- Toggle follow ----
    const handleFollow = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsFollowing((prev) => !prev);
        if (stream?.user.id) {
            apiFetch(`/api/v1/users/${stream.user.id}/follow`, {
                method: isFollowing ? 'DELETE' : 'POST',
            }).catch(() => {
                // Revert on error
                setIsFollowing((prev) => !prev);
            });
        }
    }, [stream, isFollowing]);

    // ---- Toggle controls ----
    const handleTapVideo = useCallback(() => {
        setShowControls((prev) => !prev);
    }, []);

    // ---- Auto-scroll chat ----
    useEffect(() => {
        if (chatMessages.length > 0) {
            setTimeout(() => {
                chatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [chatMessages.length]);

    // ---- Loading state ----
    if (isLoading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={colors.coral[500]} />
                <Text style={styles.loadingText}>Loading stream...</Text>
            </View>
        );
    }

    // ---- Error state ----
    if (error || !stream) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Ionicons name="alert-circle-outline" size={48} color={colors.coral[400]} />
                <Text style={styles.errorTitle}>Stream Unavailable</Text>
                <Text style={styles.errorSubtitle}>{error || 'This stream could not be found.'}</Text>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => router.back()}
                >
                    <Text style={styles.backBtnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.container}>
                {/* ---- Video Player ---- */}
                <Pressable style={styles.videoContainer} onPress={handleTapVideo}>
                    {stream.playbackUrl ? (
                        <VideoView
                            player={player}
                            style={styles.video}
                            contentFit="cover"
                            nativeControls={false}
                        />
                    ) : (
                        <View style={[styles.video, styles.noVideoPlaceholder]}>
                            {stream.thumbnailUrl ? (
                                <Image
                                    source={{ uri: stream.thumbnailUrl }}
                                    style={StyleSheet.absoluteFill}
                                    placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
                                    transition={300}
                                    cachePolicy="memory-disk"
                                />
                            ) : null}
                            <View style={styles.noVideoOverlay}>
                                <Ionicons name="videocam-off" size={40} color={colors.text.muted} />
                                <Text style={styles.noVideoText}>Stream starting soon...</Text>
                            </View>
                        </View>
                    )}

                    {/* ---- Floating Reactions ---- */}
                    {floatingReactions.map((r) => (
                        <FloatingEmoji
                            key={r.id}
                            emoji={r.emoji}
                            x={r.x}
                            onComplete={() => removeFloatingReaction(r.id)}
                        />
                    ))}

                    {/* ---- Top Overlay Controls ---- */}
                    {showControls && (
                        <Animated.View
                            entering={FadeIn.duration(200)}
                            exiting={FadeOut.duration(200)}
                            style={[styles.topOverlay, { paddingTop: insets.top + spacing.sm }]}
                        >
                            <LinearGradient
                                colors={['rgba(0,0,0,0.7)', 'transparent']}
                                style={StyleSheet.absoluteFill}
                            />

                            {/* Back button */}
                            <TouchableOpacity
                                style={styles.overlayBackBtn}
                                onPress={() => router.back()}
                                accessibilityLabel="Go back"
                            >
                                <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
                            </TouchableOpacity>

                            {/* Stream info */}
                            <View style={styles.topStreamInfo}>
                                <Text style={styles.topStreamTitle} numberOfLines={1}>
                                    {stream.title}
                                </Text>
                                <View style={styles.topStreamMeta}>
                                    <ViewerCountBadge count={viewerCount} />
                                    {stream.category && (
                                        <View style={styles.topCategoryBadge}>
                                            <Text style={styles.topCategoryText}>{stream.category}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Spacer */}
                            <View style={{ width: 36 }} />
                        </Animated.View>
                    )}
                </Pressable>

                {/* ---- Bottom Panel: Streamer Info + Chat ---- */}
                <View style={styles.bottomPanel}>
                    {/* Streamer info bar */}
                    <View style={styles.streamerBar}>
                        <View style={styles.streamerInfo}>
                            {stream.user.avatarUrl ? (
                                <Image
                                    source={{ uri: stream.user.avatarUrl }}
                                    style={styles.streamerAvatar}
                                    placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
                                    transition={200}
                                    cachePolicy="memory-disk"
                                />
                            ) : (
                                <View style={[styles.streamerAvatar, styles.avatarPlaceholder]}>
                                    <Ionicons name="person" size={14} color={colors.text.muted} />
                                </View>
                            )}
                            <View style={styles.streamerText}>
                                <Text style={styles.streamerName} numberOfLines={1}>
                                    {stream.user.displayName}
                                </Text>
                                <Text style={styles.streamerUsername}>@{stream.user.username}</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.followBtn,
                                isFollowing && styles.followBtnActive,
                            ]}
                            onPress={handleFollow}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={isFollowing ? 'checkmark' : 'add'}
                                size={16}
                                color={isFollowing ? colors.text.primary : colors.obsidian[900]}
                            />
                            <Text
                                style={[
                                    styles.followBtnText,
                                    isFollowing && styles.followBtnTextActive,
                                ]}
                            >
                                {isFollowing ? 'Following' : 'Follow'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Chat messages */}
                    <FlatList
                        ref={chatListRef}
                        data={chatMessages}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => <ChatBubble message={item} />}
                        style={styles.chatList}
                        contentContainerStyle={styles.chatListContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.chatEmpty}>
                                <Ionicons name="chatbubble-outline" size={24} color={colors.text.muted} />
                                <Text style={styles.chatEmptyText}>
                                    Be the first to say something!
                                </Text>
                            </View>
                        }
                    />

                    {/* Reactions row */}
                    <View style={styles.reactionsRow}>
                        {REACTION_EMOJIS.map((emoji) => (
                            <TouchableOpacity
                                key={emoji}
                                style={styles.reactionBtn}
                                onPress={() => handleReaction(emoji)}
                                activeOpacity={0.6}
                            >
                                <Text style={styles.reactionEmoji}>{emoji}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={styles.giftBtn}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                setShowGiftPanel((prev) => !prev);
                            }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="gift" size={18} color={colors.gold[400]} />
                        </TouchableOpacity>
                    </View>

                    {/* Gift panel */}
                    {showGiftPanel && (
                        <Animated.View entering={SlideInDown.duration(300)} style={styles.giftPanel}>
                            {GIFT_TYPES.map((gift) => (
                                <TouchableOpacity
                                    key={gift.key}
                                    style={styles.giftItem}
                                    onPress={() => handleGift(gift.key)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.giftIconCircle, { backgroundColor: gift.color + '20' }]}>
                                        <Text style={styles.giftItemEmoji}>{gift.emoji}</Text>
                                    </View>
                                    <Text style={[styles.giftItemLabel, { color: gift.color }]}>
                                        {gift.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </Animated.View>
                    )}

                    {/* Chat input */}
                    <View style={[styles.chatInputContainer, { paddingBottom: insets.bottom || spacing.md }]}>
                        <TextInput
                            style={styles.chatInput}
                            placeholder="Say something..."
                            placeholderTextColor={colors.text.muted}
                            value={chatInput}
                            onChangeText={setChatInput}
                            returnKeyType="send"
                            onSubmitEditing={handleSendChat}
                            maxLength={200}
                        />
                        <TouchableOpacity
                            style={[
                                styles.sendBtn,
                                !chatInput.trim() && styles.sendBtnDisabled,
                            ]}
                            onPress={handleSendChat}
                            disabled={!chatInput.trim()}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name="send"
                                size={18}
                                color={chatInput.trim() ? colors.obsidian[900] : colors.text.muted}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </KeyboardAvoidingView>
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
    centered: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
    },

    // ---- Video ----
    videoContainer: {
        width: SCREEN_WIDTH,
        aspectRatio: 16 / 9,
        backgroundColor: '#000',
        position: 'relative',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    noVideoPlaceholder: {
        backgroundColor: colors.obsidian[800],
        position: 'relative',
    },
    noVideoOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        gap: spacing.sm,
    },
    noVideoText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
    },

    // ---- Top Overlay ----
    topOverlay: {
        ...StyleSheet.absoluteFillObject,
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: spacing.lg,
        zIndex: 10,
    },
    overlayBackBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    topStreamInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    topStreamTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    topStreamMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing.xs,
    },
    viewerCountBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: 6,
    },
    viewerDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.coral[500],
    },
    viewerCountText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: colors.text.primary,
    },
    topCategoryBadge: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: 6,
    },
    topCategoryText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.primary,
        textTransform: 'capitalize',
    },

    // ---- Floating Reactions ----
    floatingEmoji: {
        position: 'absolute',
        bottom: 20,
        zIndex: 20,
    },
    floatingEmojiText: {
        fontSize: 28,
    },

    // ---- Bottom Panel ----
    bottomPanel: {
        flex: 1,
        backgroundColor: colors.obsidian[900],
    },

    // ---- Streamer Bar ----
    streamerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
    },
    streamerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        flex: 1,
    },
    streamerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    avatarPlaceholder: {
        backgroundColor: colors.obsidian[600],
        alignItems: 'center',
        justifyContent: 'center',
    },
    streamerText: {
        flex: 1,
    },
    streamerName: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
    },
    streamerUsername: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },
    followBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.coral[500],
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 10,
    },
    followBtnActive: {
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    followBtnText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.obsidian[900],
    },
    followBtnTextActive: {
        color: colors.text.primary,
    },

    // ---- Chat ----
    chatList: {
        flex: 1,
    },
    chatListContent: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    chatBubble: {
        marginBottom: spacing.xs,
    },
    chatText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        lineHeight: 20,
    },
    chatUsername: {
        fontWeight: '700',
        color: colors.coral[400],
    },
    systemMessage: {
        paddingVertical: spacing.xs,
        alignItems: 'center',
    },
    systemMessageText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        fontStyle: 'italic',
    },
    giftMessage: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surface.goldSubtle,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 10,
        marginBottom: spacing.xs,
    },
    giftEmoji: {
        fontSize: 20,
    },
    giftText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
    },
    giftSender: {
        fontWeight: '700',
    },
    chatEmpty: {
        alignItems: 'center',
        paddingVertical: spacing['2xl'],
        gap: spacing.sm,
    },
    chatEmptyText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
    },

    // ---- Reactions Row ----
    reactionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        gap: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border.subtle,
    },
    reactionBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surface.glass,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    reactionEmoji: {
        fontSize: 16,
    },
    giftBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.gold[500] + '30',
        marginLeft: 'auto',
    },

    // ---- Gift Panel ----
    giftPanel: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.obsidian[800],
        borderTopWidth: 1,
        borderTopColor: colors.border.subtle,
    },
    giftItem: {
        alignItems: 'center',
        gap: spacing.xs,
    },
    giftIconCircle: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    giftItemEmoji: {
        fontSize: 24,
    },
    giftItemLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
    },

    // ---- Chat Input ----
    chatInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        gap: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border.subtle,
        backgroundColor: colors.obsidian[900],
    },
    chatInput: {
        flex: 1,
        backgroundColor: colors.obsidian[700],
        borderRadius: 20,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm + 2,
        fontSize: typography.fontSize.sm,
        color: colors.text.primary,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    sendBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.coral[500],
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendBtnDisabled: {
        backgroundColor: colors.obsidian[600],
    },

    // ---- Loading / Error ----
    loadingText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        marginTop: spacing.sm,
    },
    errorTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
    },
    errorSubtitle: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        paddingHorizontal: spacing['2xl'],
    },
    backBtn: {
        backgroundColor: colors.coral[500] + '20',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: 12,
        marginTop: spacing.md,
    },
    backBtnText: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.coral[400],
    },
});
