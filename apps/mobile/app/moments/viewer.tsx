import { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableWithoutFeedback,
    Animated,
    Dimensions,
    Image,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '@zerog/ui';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Moment {
    id: string;
    type: 'IMAGE' | 'VIDEO' | 'TEXT';
    mediaUrl: string;
    caption: string | null;
    createdAt: string;
}

interface UserMoments {
    user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
    };
    moments: Moment[];
}

// Mock data for demo
const MOCK_USER_MOMENTS: UserMoments[] = [
    {
        user: {
            id: '1',
            username: 'sarahc',
            displayName: 'Sarah Chen',
            avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
        },
        moments: [
            {
                id: '1',
                type: 'IMAGE',
                mediaUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=1400&fit=crop',
                caption: 'Mountain vibes ✨',
                createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            },
            {
                id: '2',
                type: 'IMAGE',
                mediaUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=1400&fit=crop',
                caption: null,
                createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
            },
        ],
    },
    {
        user: {
            id: '2',
            username: 'marcusj',
            displayName: 'Marcus Johnson',
            avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
        },
        moments: [
            {
                id: '3',
                type: 'IMAGE',
                mediaUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=1400&fit=crop',
                caption: 'Weekend with the fam 👨‍👩‍👧‍👦',
                createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
            },
        ],
    },
];

export default function MomentsViewerScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const initialIndex = params.userIndex ? parseInt(params.userIndex as string, 10) : 0;

    const [userMoments] = useState<UserMoments[]>(MOCK_USER_MOMENTS);
    const [currentUserIndex, setCurrentUserIndex] = useState(initialIndex);
    const [currentMomentIndex, setCurrentMomentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    const progressAnim = useRef(new Animated.Value(0)).current;
    const progressAnimation = useRef<Animated.CompositeAnimation | null>(null);

    const currentUser = userMoments[currentUserIndex];
    const currentMoment = currentUser?.moments[currentMomentIndex];
    const momentDuration = currentMoment?.type === 'VIDEO' ? 15000 : 5000;

    // Start/resume progress animation
    const startProgress = (fromValue = 0) => {
        progressAnim.setValue(fromValue);
        const remainingDuration = momentDuration * (1 - fromValue);

        progressAnimation.current = Animated.timing(progressAnim, {
            toValue: 1,
            duration: remainingDuration,
            useNativeDriver: false,
        });

        progressAnimation.current.start(({ finished }) => {
            if (finished) {
                goToNext();
            }
        });
    };

    // Pause progress
    const pauseProgress = () => {
        progressAnimation.current?.stop();
    };

    // Reset and start progress when moment changes
    useEffect(() => {
        progressAnim.setValue(0);
        startProgress(0);

        return () => {
            progressAnimation.current?.stop();
        };
    }, [currentUserIndex, currentMomentIndex]);

    // Handle pause/resume
    useEffect(() => {
        if (isPaused) {
            pauseProgress();
        } else {
            // Resume from current value
            progressAnim.addListener(({ value }) => {
                progressAnim.removeAllListeners();
                startProgress(value);
            });
        }
    }, [isPaused]);

    const goToNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (!currentUser) return;

        if (currentMomentIndex < currentUser.moments.length - 1) {
            setCurrentMomentIndex((prev) => prev + 1);
        } else if (currentUserIndex < userMoments.length - 1) {
            setCurrentUserIndex((prev) => prev + 1);
            setCurrentMomentIndex(0);
        } else {
            router.back();
        }
    };

    const goToPrev = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (currentMomentIndex > 0) {
            setCurrentMomentIndex((prev) => prev - 1);
        } else if (currentUserIndex > 0) {
            const prevUserMoments = userMoments[currentUserIndex - 1].moments;
            setCurrentUserIndex((prev) => prev - 1);
            setCurrentMomentIndex(prevUserMoments.length - 1);
        }
    };

    const handlePress = (e: { nativeEvent: { locationX: number } }) => {
        const isLeftSide = e.nativeEvent.locationX < SCREEN_WIDTH * 0.3;
        if (isLeftSide) {
            goToPrev();
        } else {
            goToNext();
        }
    };

    const formatTimeAgo = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        return `${Math.floor(diffHours / 24)}d`;
    };

    if (!currentMoment) {
        return null;
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <TouchableWithoutFeedback
                onPress={handlePress}
                onPressIn={() => setIsPaused(true)}
                onPressOut={() => setIsPaused(false)}
            >
                <View style={styles.content}>
                    {/* Media */}
                    {currentMoment.type === 'VIDEO' ? (
                        <Video
                            source={{ uri: currentMoment.mediaUrl }}
                            style={styles.media}
                            resizeMode={ResizeMode.COVER}
                            shouldPlay={!isPaused}
                            isLooping
                            isMuted={false}
                        />
                    ) : currentMoment.type === 'IMAGE' ? (
                        <Image
                            source={{ uri: currentMoment.mediaUrl }}
                            style={styles.media}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={styles.textMoment}>
                            <Text style={styles.textMomentContent}>{currentMoment.caption}</Text>
                        </View>
                    )}

                    {/* Overlays */}
                    <SafeAreaView style={styles.overlay}>
                        {/* Progress bars */}
                        <View style={styles.progressContainer}>
                            {currentUser.moments.map((_, idx) => (
                                <View key={idx} style={styles.progressBarBg}>
                                    <Animated.View
                                        style={[
                                            styles.progressBarFill,
                                            {
                                                width:
                                                    idx < currentMomentIndex
                                                        ? '100%'
                                                        : idx === currentMomentIndex
                                                            ? progressAnim.interpolate({
                                                                inputRange: [0, 1],
                                                                outputRange: ['0%', '100%'],
                                                            })
                                                            : '0%',
                                            },
                                        ]}
                                    />
                                </View>
                            ))}
                        </View>

                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.userInfo}>
                                <Image
                                    source={{ uri: currentUser.user.avatarUrl || undefined }}
                                    style={styles.avatar}
                                />
                                <View>
                                    <Text style={styles.displayName}>{currentUser.user.displayName}</Text>
                                    <Text style={styles.timestamp}>
                                        {formatTimeAgo(currentMoment.createdAt)}
                                    </Text>
                                </View>
                            </View>

                            <TouchableWithoutFeedback onPress={() => router.back()}>
                                <View style={styles.closeButton}>
                                    <Text style={styles.closeIcon}>✕</Text>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </SafeAreaView>

                    {/* Caption */}
                    {currentMoment.caption && currentMoment.type !== 'TEXT' && (
                        <View style={styles.captionContainer}>
                            <Text style={styles.caption}>{currentMoment.caption}</Text>
                        </View>
                    )}
                </View>
            </TouchableWithoutFeedback>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    content: {
        flex: 1,
    },
    media: {
        ...StyleSheet.absoluteFillObject,
    },
    textMoment: {
        flex: 1,
        backgroundColor: colors.coral[500],
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing['2xl'],
    },
    textMomentContent: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: '700',
        color: colors.text.primary,
        textAlign: 'center',
        fontFamily: typography.fontFamily.sans,
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    progressContainer: {
        flexDirection: 'row',
        paddingHorizontal: spacing.sm,
        paddingTop: spacing.sm,
        gap: 4,
    },
    progressBarBg: {
        flex: 1,
        height: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 1,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#fff',
        borderRadius: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    displayName: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
    },
    timestamp: {
        fontSize: typography.fontSize.xs,
        color: 'rgba(255, 255, 255, 0.6)',
        fontFamily: typography.fontFamily.sans,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeIcon: {
        fontSize: 16,
        color: colors.text.primary,
    },
    captionContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing['3xl'],
        paddingTop: spacing.xl,
        backgroundColor: 'transparent',
    },
    caption: {
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
});
