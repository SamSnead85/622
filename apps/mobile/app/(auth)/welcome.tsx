import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useRef, useCallback, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    useAnimatedScrollHandler,
    interpolate,
    withSpring,
    FadeInUp,
} from 'react-native-reanimated';
import { Button, colors, typography, spacing } from '@zerog/ui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Slide {
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    title: string;
    subtitle: string;
}

const SLIDES: Slide[] = [
    {
        icon: 'shield-checkmark',
        iconColor: colors.gold[500],
        title: 'Your World,\nYour Rules',
        subtitle:
            'Posts are private by default. Your data is encrypted and protected. Nobody sees your content unless you invite them.',
    },
    {
        icon: 'people',
        iconColor: colors.emerald[500],
        title: 'Connect With\nYour People',
        subtitle:
            'Create private groups for family, friends, and teams. Your content stays within your chosen circles — completely separated from the public.',
    },
    {
        icon: 'globe-outline',
        iconColor: colors.azure[500],
        title: 'Join When\nYou\'re Ready',
        subtitle:
            'Community is always optional. You control your visibility. Stay private forever, or join thousands already connecting on 0G.',
    },
];

function SlideItem({
    slide,
    index,
    scrollX,
}: {
    slide: Slide;
    index: number;
    scrollX: Animated.SharedValue<number>;
}) {
    const animatedIconStyle = useAnimatedStyle(() => {
        const inputRange = [
            (index - 1) * SCREEN_WIDTH,
            index * SCREEN_WIDTH,
            (index + 1) * SCREEN_WIDTH,
        ];
        const translateY = interpolate(scrollX.value, inputRange, [40, 0, 40]);
        const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0]);
        const scale = interpolate(scrollX.value, inputRange, [0.6, 1, 0.6]);
        return {
            transform: [{ translateY }, { scale }],
            opacity,
        };
    });

    const animatedTextStyle = useAnimatedStyle(() => {
        const inputRange = [
            (index - 1) * SCREEN_WIDTH,
            index * SCREEN_WIDTH,
            (index + 1) * SCREEN_WIDTH,
        ];
        const translateY = interpolate(scrollX.value, inputRange, [30, 0, 30]);
        const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0]);
        return {
            transform: [{ translateY }],
            opacity,
        };
    });

    return (
        <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
                <View style={[styles.iconCircle, { backgroundColor: `${slide.iconColor}15` }]}>
                    <View style={[styles.iconInner, { backgroundColor: `${slide.iconColor}25` }]}>
                        <Ionicons name={slide.icon} size={64} color={slide.iconColor} />
                    </View>
                </View>
            </Animated.View>

            <Animated.View style={[styles.textContainer, animatedTextStyle]}>
                <Text style={styles.slideTitle}>{slide.title}</Text>
                <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
            </Animated.View>
        </View>
    );
}

function PaginationDots({
    count,
    scrollX,
}: {
    count: number;
    scrollX: Animated.SharedValue<number>;
}) {
    return (
        <View style={styles.dotsContainer}>
            {Array.from({ length: count }).map((_, i) => {
                const dotStyle = useAnimatedStyle(() => {
                    const inputRange = [
                        (i - 1) * SCREEN_WIDTH,
                        i * SCREEN_WIDTH,
                        (i + 1) * SCREEN_WIDTH,
                    ];
                    const width = interpolate(scrollX.value, inputRange, [8, 24, 8], 'clamp');
                    const opacity = interpolate(scrollX.value, inputRange, [0.3, 1, 0.3], 'clamp');
                    return { width, opacity };
                });

                return (
                    <Animated.View
                        key={i}
                        style={[styles.dot, dotStyle]}
                    />
                );
            })}
        </View>
    );
}

export default function WelcomeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const scrollX = useSharedValue(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<Animated.FlatList<Slide>>(null);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollX.value = event.contentOffset.x;
        },
    });

    const onViewableItemsChanged = useCallback(
        ({ viewableItems }: { viewableItems: any[] }) => {
            if (viewableItems.length > 0) {
                setCurrentIndex(viewableItems[0].index ?? 0);
            }
        },
        []
    );

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50,
    }).current;

    const isLastSlide = currentIndex === SLIDES.length - 1;

    return (
        <LinearGradient
            colors={[colors.obsidian[900], '#0D0D10', colors.obsidian[900]]}
            style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        >
            {/* Skip button */}
            <Animated.View entering={FadeInUp.delay(800).duration(400)} style={styles.skipContainer}>
                <Pressable onPress={() => router.push('/(auth)/login')} style={styles.skipButton}>
                    <Text style={styles.skipText}>Skip</Text>
                </Pressable>
            </Animated.View>

            {/* Slides */}
            <Animated.FlatList
                ref={flatListRef as any}
                data={SLIDES}
                renderItem={({ item, index }) => (
                    <SlideItem slide={item} index={index} scrollX={scrollX} />
                )}
                keyExtractor={(_, index) => index.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                style={styles.slideList}
            />

            {/* Pagination dots */}
            <PaginationDots count={SLIDES.length} scrollX={scrollX} />

            {/* Bottom actions */}
            <Animated.View entering={FadeInUp.delay(600).duration(500)} style={styles.actionsSection}>
                <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onPress={() => {
                        if (isLastSlide) {
                            router.push('/(auth)/signup');
                        } else {
                            flatListRef.current?.scrollToIndex({
                                index: currentIndex + 1,
                                animated: true,
                            });
                        }
                    }}
                >
                    {isLastSlide ? 'Get Started' : 'Next'}
                </Button>

                <Button
                    variant="ghost"
                    size="lg"
                    fullWidth
                    onPress={() => router.push('/(auth)/login')}
                    style={styles.loginButton}
                >
                    Already have an account? Log in
                </Button>
            </Animated.View>

            {/* Footer */}
            <Text style={styles.terms}>
                By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    skipContainer: {
        alignItems: 'flex-end',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
    },
    skipButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    skipText: {
        fontSize: typography.fontSize.base,
        color: colors.text.muted,
        fontFamily: 'Inter-Medium',
    },
    slideList: {
        flex: 1,
    },
    slide: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    iconContainer: {
        marginBottom: spacing['3xl'],
    },
    iconCircle: {
        width: 160,
        height: 160,
        borderRadius: 80,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconInner: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        alignItems: 'center',
        paddingHorizontal: spacing.md,
    },
    slideTitle: {
        fontSize: 34,
        fontWeight: '700',
        color: colors.text.primary,
        textAlign: 'center',
        letterSpacing: -1,
        lineHeight: 42,
        fontFamily: 'Inter-Bold',
    },
    slideSubtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
        marginTop: spacing.lg,
        lineHeight: 24,
        maxWidth: 320,
        fontFamily: 'Inter',
    },
    dotsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: spacing.xl,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.gold[500],
    },
    actionsSection: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.md,
    },
    loginButton: {
        marginTop: spacing.md,
    },
    terms: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.lg,
    },
});
