import { useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Image,
    FlatList,
    ViewToken,
    Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import * as Haptics from 'expo-haptics';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';
import { colors, typography, spacing } from '@caravan/ui';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Journey {
    id: string;
    videoUrl: string;
    thumbnailUrl: string;
    caption: string;
    musicName?: string;
    musicArtist?: string;
    likes: number;
    comments: number;
    shares: number;
    user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string;
        isFollowing: boolean;
    };
}

// Mock data
const MOCK_JOURNEYS: Journey[] = [
    {
        id: '1',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=700&fit=crop',
        caption: 'Mountain sunrise vibes 🌄 This view was absolutely worth the 4am wake up call! #nature #hiking',
        musicName: 'Sunrise Dreams',
        musicArtist: 'Ambient Collective',
        likes: 45200,
        comments: 1234,
        shares: 890,
        user: {
            id: '1',
            username: 'sarahc',
            displayName: 'Sarah Chen',
            avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
            isFollowing: false,
        },
    },
    {
        id: '2',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=700&fit=crop',
        caption: 'Forest trail therapy 🌲 Sometimes you just need to disconnect #wellness #mindfulness',
        musicName: 'Forest Ambience',
        musicArtist: 'Nature Sounds',
        likes: 23400,
        comments: 567,
        shares: 234,
        user: {
            id: '2',
            username: 'marcusj',
            displayName: 'Marcus Johnson',
            avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
            isFollowing: true,
        },
    },
    {
        id: '3',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=700&fit=crop',
        caption: 'Secret recipe time 👨‍🍳 Drop a 🔥 if you want the full tutorial! #cooking #food #recipe',
        likes: 89100,
        comments: 4521,
        shares: 2100,
        user: {
            id: '3',
            username: 'chefemily',
            displayName: 'Emily Park',
            avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
            isFollowing: false,
        },
    },
];

function formatCount(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
}

function JourneyCard({
    journey,
    isActive,
    isMuted,
    onToggleMute,
}: {
    journey: Journey;
    isActive: boolean;
    isMuted: boolean;
    onToggleMute: () => void;
}) {
    const videoRef = useRef<Video>(null);
    const [isLiked, setIsLiked] = useState(false);
    const heartScale = useSharedValue(0);
    const heartOpacity = useSharedValue(0);
    const lastTap = useRef(0);

    const handleDoubleTap = () => {
        const now = Date.now();
        if (now - lastTap.current < 300) {
            // Double tap detected
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (!isLiked) {
                setIsLiked(true);
            }
            heartScale.value = withSequence(
                withSpring(1.2),
                withSpring(1),
                withTiming(1, { duration: 400 }),
                withTiming(0, { duration: 200 })
            );
            heartOpacity.value = withSequence(
                withTiming(1, { duration: 100 }),
                withTiming(1, { duration: 600 }),
                withTiming(0, { duration: 200 })
            );
        }
        lastTap.current = now;
    };

    const heartAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: heartScale.value }],
        opacity: heartOpacity.value,
    }));

    const handleLike = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsLiked(!isLiked);
    };

    return (
        <Pressable style={styles.card} onPress={handleDoubleTap}>
            {/* Video */}
            <Video
                ref={videoRef}
                source={{ uri: journey.videoUrl }}
                style={styles.video}
                resizeMode={ResizeMode.COVER}
                shouldPlay={isActive}
                isLooping
                isMuted={isMuted}
                posterSource={{ uri: journey.thumbnailUrl }}
                usePoster
            />

            {/* Double-tap heart */}
            <Animated.View style={[styles.heartContainer, heartAnimatedStyle]}>
                <Text style={styles.heartEmoji}>❤️</Text>
            </Animated.View>

            {/* Mute toggle */}
            <TouchableOpacity style={styles.muteButton} onPress={onToggleMute}>
                <Text style={styles.muteIcon}>{isMuted ? '🔇' : '🔊'}</Text>
            </TouchableOpacity>

            {/* Right side actions */}
            <View style={styles.actions}>
                {/* Profile */}
                <View style={styles.profileContainer}>
                    <Image source={{ uri: journey.user.avatarUrl }} style={styles.avatar} />
                    {!journey.user.isFollowing && (
                        <View style={styles.followButton}>
                            <Text style={styles.followIcon}>+</Text>
                        </View>
                    )}
                </View>

                {/* Like */}
                <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                    <Text style={[styles.actionIcon, isLiked && styles.likedIcon]}>
                        {isLiked ? '❤️' : '🤍'}
                    </Text>
                    <Text style={styles.actionCount}>{formatCount(journey.likes)}</Text>
                </TouchableOpacity>

                {/* Comment */}
                <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionIcon}>💬</Text>
                    <Text style={styles.actionCount}>{formatCount(journey.comments)}</Text>
                </TouchableOpacity>

                {/* Share */}
                <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionIcon}>📤</Text>
                    <Text style={styles.actionCount}>{formatCount(journey.shares)}</Text>
                </TouchableOpacity>

                {/* Music */}
                {journey.musicName && (
                    <View style={styles.musicDisc}>
                        <Text style={styles.musicIcon}>🎵</Text>
                    </View>
                )}
            </View>

            {/* Bottom info */}
            <View style={styles.bottomInfo}>
                <Text style={styles.username}>@{journey.user.username}</Text>
                <Text style={styles.caption} numberOfLines={2}>
                    {journey.caption}
                </Text>
                {journey.musicName && (
                    <View style={styles.musicInfo}>
                        <Text style={styles.musicText}>
                            🎵 {journey.musicName} · {journey.musicArtist}
                        </Text>
                    </View>
                )}
            </View>

            {/* Gradient */}
            <View style={styles.gradient} />
        </Pressable>
    );
}

export default function JourneysScreen() {
    const router = useRouter();
    const [activeIndex, setActiveIndex] = useState(0);
    const [isMuted, setIsMuted] = useState(true);
    const flatListRef = useRef<FlatList>(null);

    const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0 && viewableItems[0].index !== null) {
            setActiveIndex(viewableItems[0].index);
        }
    }, []);

    const viewabilityConfig = {
        itemVisiblePercentThreshold: 50,
    };

    const renderItem = ({ item, index }: { item: Journey; index: number }) => (
        <JourneyCard
            journey={item}
            isActive={index === activeIndex}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted(!isMuted)}
        />
    );

    return (
        <View style={styles.container}>
            {/* Back button */}
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>

            {/* Feed */}
            <FlatList
                ref={flatListRef}
                data={MOCK_JOURNEYS}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                pagingEnabled
                showsVerticalScrollIndicator={false}
                snapToInterval={SCREEN_HEIGHT}
                snapToAlignment="start"
                decelerationRate="fast"
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                getItemLayout={(_, index) => ({
                    length: SCREEN_HEIGHT,
                    offset: SCREEN_HEIGHT * index,
                    index,
                })}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 16,
        zIndex: 30,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    backIcon: {
        fontSize: 20,
        color: '#fff',
    },
    card: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
    video: {
        ...StyleSheet.absoluteFillObject,
    },
    heartContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heartEmoji: {
        fontSize: 100,
    },
    muteButton: {
        position: 'absolute',
        top: 50,
        right: 16,
        zIndex: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    muteIcon: {
        fontSize: 18,
    },
    actions: {
        position: 'absolute',
        right: 12,
        bottom: 100,
        alignItems: 'center',
        gap: 16,
    },
    profileContainer: {
        marginBottom: 8,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#fff',
    },
    followButton: {
        position: 'absolute',
        bottom: -8,
        left: '50%',
        marginLeft: -12,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.coral[500],
        alignItems: 'center',
        justifyContent: 'center',
    },
    followIcon: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    actionButton: {
        alignItems: 'center',
    },
    actionIcon: {
        fontSize: 28,
    },
    likedIcon: {
        transform: [{ scale: 1.1 }],
    },
    actionCount: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
    },
    musicDisc: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1a1a1a',
        borderWidth: 2,
        borderColor: '#333',
        alignItems: 'center',
        justifyContent: 'center',
    },
    musicIcon: {
        fontSize: 16,
    },
    bottomInfo: {
        position: 'absolute',
        left: 12,
        right: 80,
        bottom: 40,
    },
    username: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 8,
    },
    caption: {
        color: '#fff',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 8,
    },
    musicInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    musicText: {
        color: '#fff',
        fontSize: 12,
    },
    gradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 200,
        backgroundColor: 'transparent',
    },
});
