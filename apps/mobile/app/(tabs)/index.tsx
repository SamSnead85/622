import { useState, useRef, useCallback, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    FlatList,
    TouchableOpacity,
    Animated,
    Easing,
    Image,
    Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Video, ResizeMode } from 'expo-av';
import { colors, typography, spacing, Avatar } from '@caravan/ui';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Mock data for feed
const MOCK_FEED = [
    {
        id: '1',
        user: {
            id: 'u1',
            username: 'adventure_sarah',
            displayName: 'Sarah Chen',
            avatarUrl: 'https://i.pravatar.cc/150?img=1',
            isVerified: true,
        },
        type: 'video',
        mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        thumbnailUrl: 'https://picsum.photos/400/700?random=1',
        caption: 'Golden hour at the summit 🌄 #adventure #hiking #sunset',
        likesCount: 12400,
        commentsCount: 342,
        sharesCount: 89,
        isLiked: false,
    },
    {
        id: '2',
        user: {
            id: 'u2',
            username: 'chef_marcus',
            displayName: 'Marcus Williams',
            avatarUrl: 'https://i.pravatar.cc/150?img=3',
            isVerified: false,
        },
        type: 'video',
        mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        thumbnailUrl: 'https://picsum.photos/400/700?random=2',
        caption: 'The secret to perfect pasta 🍝 Recipe in bio!',
        likesCount: 8900,
        commentsCount: 521,
        sharesCount: 234,
        isLiked: true,
    },
    {
        id: '3',
        user: {
            id: 'u3',
            username: 'tech_insights',
            displayName: 'Tech Insights',
            avatarUrl: 'https://i.pravatar.cc/150?img=5',
            isVerified: true,
        },
        type: 'video',
        mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        thumbnailUrl: 'https://picsum.photos/400/700?random=3',
        caption: 'The future is here. AI just changed everything. #tech #ai #future',
        likesCount: 45000,
        commentsCount: 1200,
        sharesCount: 890,
        isLiked: false,
    },
];

// Animated action button component
const ActionButton = memo(({
    icon,
    count,
    isActive,
    activeColor,
    onPress
}: {
    icon: string;
    count: number;
    isActive?: boolean;
    activeColor?: string;
    onPress: () => void;
}) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePress = () => {
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 0.8,
                duration: 80,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 400,
                friction: 6,
                useNativeDriver: true,
            }),
        ]).start();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
    };

    const formatCount = (num: number) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.9}
            style={styles.actionButton}
        >
            <Animated.View
                style={[
                    styles.actionIconContainer,
                    { transform: [{ scale: scaleAnim }] },
                ]}
            >
                <Text style={[
                    styles.actionIcon,
                    isActive && { color: activeColor || colors.coral[500] },
                ]}>
                    {icon}
                </Text>
            </Animated.View>
            <Text style={styles.actionCount}>{formatCount(count)}</Text>
        </TouchableOpacity>
    );
});

// Individual feed item component
const FeedItem = memo(({
    item,
    isActive,
    onDoubleTap
}: {
    item: typeof MOCK_FEED[0];
    isActive: boolean;
    onDoubleTap: () => void;
}) => {
    const router = useRouter();
    const [liked, setLiked] = useState(item.isLiked);
    const [likesCount, setLikesCount] = useState(item.likesCount);
    const heartAnim = useRef(new Animated.Value(0)).current;
    const lastTap = useRef(0);

    const handleDoubleTap = () => {
        const now = Date.now();
        if (now - lastTap.current < 300) {
            // Double tap detected
            if (!liked) {
                setLiked(true);
                setLikesCount((prev) => prev + 1);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                // Heart animation
                Animated.sequence([
                    Animated.spring(heartAnim, {
                        toValue: 1,
                        tension: 100,
                        friction: 6,
                        useNativeDriver: true,
                    }),
                    Animated.delay(400),
                    Animated.timing(heartAnim, {
                        toValue: 0,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                ]).start();
            }
            onDoubleTap();
        }
        lastTap.current = now;
    };

    const handleLike = () => {
        setLiked(!liked);
        setLikesCount((prev) => liked ? prev - 1 : prev + 1);
    };

    return (
        <Pressable style={styles.feedItem} onPress={handleDoubleTap}>
            {/* Video/Image Background */}
            <View style={styles.mediaContainer}>
                {item.type === 'video' ? (
                    <Video
                        source={{ uri: item.mediaUrl }}
                        style={styles.video}
                        resizeMode={ResizeMode.COVER}
                        isLooping
                        shouldPlay={isActive}
                        isMuted={false}
                    />
                ) : (
                    <Image
                        source={{ uri: item.mediaUrl }}
                        style={styles.image}
                        resizeMode="cover"
                    />
                )}

                {/* Gradient overlays for depth */}
                <LinearGradient
                    colors={['rgba(0,0,0,0.6)', 'transparent', 'transparent']}
                    style={styles.gradientTop}
                />
                <LinearGradient
                    colors={['transparent', 'transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.gradientBottom}
                />
            </View>

            {/* Double tap heart animation */}
            <Animated.View
                style={[
                    styles.doubleTapHeart,
                    {
                        opacity: heartAnim,
                        transform: [
                            {
                                scale: heartAnim.interpolate({
                                    inputRange: [0, 0.5, 1],
                                    outputRange: [0.5, 1.3, 1],
                                }),
                            },
                        ],
                    },
                ]}
                pointerEvents="none"
            >
                <Text style={styles.doubleTapHeartIcon}>❤️</Text>
            </Animated.View>

            {/* Right side actions */}
            <View style={styles.actionsContainer}>
                {/* User avatar */}
                <TouchableOpacity
                    style={styles.avatarContainer}
                    onPress={() => router.push(`/profile/${item.user.id}`)}
                >
                    <View style={styles.avatarBorder}>
                        <Avatar
                            source={item.user.avatarUrl}
                            name={item.user.displayName}
                            size="lg"
                        />
                    </View>
                    <View style={styles.followBadge}>
                        <Text style={styles.followBadgeIcon}>+</Text>
                    </View>
                </TouchableOpacity>

                {/* Like */}
                <ActionButton
                    icon={liked ? '❤️' : '🤍'}
                    count={likesCount}
                    isActive={liked}
                    onPress={handleLike}
                />

                {/* Comment */}
                <ActionButton
                    icon="💬"
                    count={item.commentsCount}
                    onPress={() => { }}
                />

                {/* Share */}
                <ActionButton
                    icon="📤"
                    count={item.sharesCount}
                    onPress={() => { }}
                />

                {/* More */}
                <TouchableOpacity style={styles.moreButton}>
                    <Text style={styles.moreIcon}>⋯</Text>
                </TouchableOpacity>
            </View>

            {/* Bottom content */}
            <View style={styles.contentContainer}>
                {/* User info */}
                <View style={styles.userInfo}>
                    <Text style={styles.username}>
                        @{item.user.username}
                        {item.user.isVerified && (
                            <Text style={styles.verifiedBadge}> ✓</Text>
                        )}
                    </Text>
                </View>

                {/* Caption */}
                <Text style={styles.caption} numberOfLines={2}>
                    {item.caption}
                </Text>

                {/* Music/Sound indicator */}
                <View style={styles.soundContainer}>
                    <View style={styles.soundIcon}>
                        <Text style={styles.musicEmoji}>🎵</Text>
                    </View>
                    <View style={styles.soundTextContainer}>
                        <Text style={styles.soundText} numberOfLines={1}>
                            Original Sound - {item.user.displayName}
                        </Text>
                    </View>
                </View>
            </View>
        </Pressable>
    );
});

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const [activeIndex, setActiveIndex] = useState(0);
    const [feedTab, setFeedTab] = useState<'following' | 'foryou'>('foryou');

    const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setActiveIndex(viewableItems[0].index);
        }
    }, []);

    const viewabilityConfig = {
        itemVisiblePercentThreshold: 50,
    };

    return (
        <View style={styles.container}>
            {/* Premium header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
                {/* Live indicator */}
                <TouchableOpacity style={styles.liveButton}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                </TouchableOpacity>

                {/* Tab switcher */}
                <View style={styles.tabSwitcher}>
                    <TouchableOpacity
                        style={styles.tabButton}
                        onPress={() => {
                            setFeedTab('following');
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                    >
                        <Text style={[
                            styles.tabText,
                            feedTab === 'following' && styles.tabTextActive,
                        ]}>
                            Following
                        </Text>
                        {feedTab === 'following' && <View style={styles.tabIndicator} />}
                    </TouchableOpacity>

                    <View style={styles.tabDivider} />

                    <TouchableOpacity
                        style={styles.tabButton}
                        onPress={() => {
                            setFeedTab('foryou');
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                    >
                        <Text style={[
                            styles.tabText,
                            feedTab === 'foryou' && styles.tabTextActive,
                        ]}>
                            For You
                        </Text>
                        {feedTab === 'foryou' && <View style={styles.tabIndicator} />}
                    </TouchableOpacity>
                </View>

                {/* Search */}
                <TouchableOpacity style={styles.searchButton}>
                    <Text style={styles.searchIcon}>🔍</Text>
                </TouchableOpacity>
            </View>

            {/* Feed */}
            <FlatList
                data={MOCK_FEED}
                renderItem={({ item, index }) => (
                    <FeedItem
                        item={item}
                        isActive={index === activeIndex}
                        onDoubleTap={() => { }}
                    />
                )}
                keyExtractor={(item) => item.id}
                pagingEnabled
                showsVerticalScrollIndicator={false}
                snapToInterval={SCREEN_HEIGHT}
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
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
    },
    liveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.coral[500],
        marginRight: 6,
    },
    liveText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.text.primary,
        letterSpacing: 1,
    },
    tabSwitcher: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tabButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        alignItems: 'center',
    },
    tabText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.5)',
        fontFamily: typography.fontFamily.sans,
    },
    tabTextActive: {
        color: colors.text.primary,
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        width: 20,
        height: 2,
        borderRadius: 1,
        backgroundColor: colors.text.primary,
    },
    tabDivider: {
        width: 1,
        height: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    searchButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchIcon: {
        fontSize: 20,
    },
    feedItem: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
    mediaContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    video: {
        ...StyleSheet.absoluteFillObject,
    },
    image: {
        ...StyleSheet.absoluteFillObject,
    },
    gradientTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 150,
    },
    gradientBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 300,
    },
    doubleTapHeart: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -50,
        marginTop: -50,
        width: 100,
        height: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    doubleTapHeartIcon: {
        fontSize: 80,
    },
    actionsContainer: {
        position: 'absolute',
        right: spacing.md,
        bottom: 120,
        alignItems: 'center',
        gap: spacing.lg,
    },
    avatarContainer: {
        marginBottom: spacing.md,
    },
    avatarBorder: {
        padding: 2,
        borderRadius: 26,
        borderWidth: 2,
        borderColor: colors.gold[500],
    },
    followBadge: {
        position: 'absolute',
        bottom: -6,
        left: '50%',
        marginLeft: -10,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.gold[500],
        alignItems: 'center',
        justifyContent: 'center',
    },
    followBadgeIcon: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.obsidian[900],
    },
    actionButton: {
        alignItems: 'center',
    },
    actionIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    actionIcon: {
        fontSize: 24,
    },
    actionCount: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
    },
    moreButton: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    moreIcon: {
        fontSize: 20,
        color: colors.text.primary,
        fontWeight: '900',
    },
    contentContainer: {
        position: 'absolute',
        left: spacing.lg,
        right: 80,
        bottom: 100,
    },
    userInfo: {
        marginBottom: spacing.sm,
    },
    username: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
    },
    verifiedBadge: {
        color: colors.azure[400],
    },
    caption: {
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
        lineHeight: 22,
        marginBottom: spacing.md,
    },
    soundContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    soundIcon: {
        marginRight: spacing.sm,
    },
    musicEmoji: {
        fontSize: 14,
    },
    soundTextContainer: {
        flex: 1,
        overflow: 'hidden',
    },
    soundText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        fontFamily: typography.fontFamily.sans,
    },
});
