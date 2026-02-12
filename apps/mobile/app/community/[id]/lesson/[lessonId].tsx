// ============================================
// Lesson Viewer Screen
// Premium learning experience with video, content, and progress
// ============================================

import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useVideoPlayer, VideoView } from 'expo-video';
import { colors, typography, spacing } from '@zerog/ui';
import { useTheme } from '../../../../contexts/ThemeContext';
import { ScreenHeader } from '../../../../components';
import { apiFetch, API } from '../../../../lib/api';

// ============================================
// Types
// ============================================

interface LessonResource {
    id: string;
    title: string;
    url: string;
    type: string; // 'pdf' | 'link' | 'file' | etc.
}

interface LessonProgress {
    completed: boolean;
    watchedSeconds: number;
}

interface LessonModule {
    title: string;
    courseId: string;
}

interface Lesson {
    id: string;
    title: string;
    content: string;
    videoUrl: string | null;
    thumbnailUrl: string | null;
    duration: number | null;
    resources: LessonResource[];
    module: LessonModule;
    progress: LessonProgress | null;
}

// ============================================
// Constants
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_HEIGHT = SCREEN_WIDTH * (9 / 16);

const RESOURCE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    pdf: 'document-text-outline',
    link: 'link-outline',
    file: 'download-outline',
    video: 'videocam-outline',
    image: 'image-outline',
};

// ============================================
// Helper: Format duration (seconds → "5m 30s")
// ============================================

function formatDuration(seconds: number | null): string {
    if (!seconds || seconds <= 0) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    if (s === 0) return `${m}m`;
    return `${m}m ${s}s`;
}

// ============================================
// Helper: Simple markdown-like content renderer
// ============================================

function renderContent(
    content: string,
    themeColors: typeof colors,
): React.ReactNode[] {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];

    lines.forEach((line, index) => {
        const trimmed = line.trim();

        if (!trimmed) {
            elements.push(<View key={`sp-${index}`} style={contentStyles.spacer} />);
            return;
        }

        // Heading: ### or ## or #
        if (trimmed.startsWith('### ')) {
            elements.push(
                <Text
                    key={`h3-${index}`}
                    style={[contentStyles.h3, { color: themeColors.text.primary }]}
                >
                    {trimmed.slice(4)}
                </Text>,
            );
            return;
        }
        if (trimmed.startsWith('## ')) {
            elements.push(
                <Text
                    key={`h2-${index}`}
                    style={[contentStyles.h2, { color: themeColors.text.primary }]}
                >
                    {trimmed.slice(3)}
                </Text>,
            );
            return;
        }
        if (trimmed.startsWith('# ')) {
            elements.push(
                <Text
                    key={`h1-${index}`}
                    style={[contentStyles.h1, { color: themeColors.text.primary }]}
                >
                    {trimmed.slice(2)}
                </Text>,
            );
            return;
        }

        // Bullet: - or *
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            elements.push(
                <View key={`li-${index}`} style={contentStyles.bulletRow}>
                    <Text style={[contentStyles.bulletDot, { color: themeColors.gold[400] }]}>
                        •
                    </Text>
                    <Text style={[contentStyles.paragraph, { color: themeColors.text.secondary }]}>
                        {trimmed.slice(2)}
                    </Text>
                </View>,
            );
            return;
        }

        // Regular paragraph
        elements.push(
            <Text
                key={`p-${index}`}
                style={[contentStyles.paragraph, { color: themeColors.text.secondary }]}
            >
                {trimmed}
            </Text>,
        );
    });

    return elements;
}

const contentStyles = StyleSheet.create({
    spacer: { height: spacing.sm },
    h1: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        lineHeight: typography.fontSize['2xl'] * typography.lineHeight.tight,
        marginTop: spacing.xl,
        marginBottom: spacing.sm,
    },
    h2: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        lineHeight: typography.fontSize.xl * typography.lineHeight.tight,
        marginTop: spacing.lg,
        marginBottom: spacing.xs,
    },
    h3: {
        fontSize: typography.fontSize.lg,
        fontWeight: '600',
        lineHeight: typography.fontSize.lg * typography.lineHeight.tight,
        marginTop: spacing.lg,
        marginBottom: spacing.xs,
    },
    bulletRow: {
        flexDirection: 'row',
        paddingLeft: spacing.sm,
        marginBottom: spacing.xs,
    },
    bulletDot: {
        fontSize: typography.fontSize.base,
        lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
        marginRight: spacing.sm,
    },
    paragraph: {
        fontSize: typography.fontSize.base,
        lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
        marginBottom: spacing.xs,
        flex: 1,
    },
});

// ============================================
// Main Screen
// ============================================

export default function LessonViewerScreen() {
    const router = useRouter();
    const { id: communityId, lessonId, courseId } = useLocalSearchParams<{
        id: string;
        lessonId: string;
        courseId: string;
    }>();
    const insets = useSafeAreaInsets();
    const { colors: themeColors } = useTheme();

    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [marking, setMarking] = useState(false);
    const [completed, setCompleted] = useState(false);

    // ============================================
    // Video Player
    // ============================================

    const player = useVideoPlayer(lesson?.videoUrl || '', (p) => {
        p.loop = false;
    });

    // ============================================
    // Data Fetching
    // ============================================

    const loadLesson = useCallback(async () => {
        if (!communityId || !courseId || !lessonId) return;
        try {
            setError(null);
            const data = await apiFetch<Lesson>(
                `${API.communities}/${communityId}/courses/${courseId}/lessons/${lessonId}`,
                { cache: false },
            );
            setLesson(data);
            setCompleted(data.progress?.completed ?? false);
        } catch (e: any) {
            setError(e.message || 'Failed to load lesson');
        } finally {
            setLoading(false);
        }
    }, [communityId, courseId, lessonId]);

    useEffect(() => {
        loadLesson();
    }, [loadLesson]);

    // ============================================
    // Mark Complete
    // ============================================

    const handleMarkComplete = useCallback(async () => {
        if (!communityId || !courseId || !lessonId || marking) return;

        setMarking(true);
        try {
            await apiFetch(
                `${API.communities}/${communityId}/courses/${courseId}/lessons/${lessonId}/progress`,
                {
                    method: 'POST',
                    body: JSON.stringify({ completed: true }),
                },
            );
            setCompleted(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setMarking(false);
        }
    }, [communityId, courseId, lessonId, marking]);

    // ============================================
    // Resource Press
    // ============================================

    const handleResourcePress = useCallback((resource: LessonResource) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (resource.url) {
            Linking.openURL(resource.url).catch(() => {});
        }
    }, []);

    // ============================================
    // Render: Loading
    // ============================================

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: themeColors.obsidian[900] }]}>
                <LinearGradient
                    colors={[themeColors.obsidian[900], themeColors.obsidian[800]]}
                    style={StyleSheet.absoluteFill}
                />
                <ScreenHeader title="Lesson" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={themeColors.gold[500]} />
                    <Text style={[styles.loadingText, { color: themeColors.text.muted }]}>
                        Loading lesson...
                    </Text>
                </View>
            </View>
        );
    }

    // ============================================
    // Render: Error
    // ============================================

    if (error || !lesson) {
        return (
            <View style={[styles.container, { backgroundColor: themeColors.obsidian[900] }]}>
                <LinearGradient
                    colors={[themeColors.obsidian[900], themeColors.obsidian[800]]}
                    style={StyleSheet.absoluteFill}
                />
                <ScreenHeader title="Lesson" />
                <View style={styles.errorContainer}>
                    <Ionicons name="cloud-offline-outline" size={48} color={themeColors.text.muted} />
                    <Text style={[styles.errorTitle, { color: themeColors.text.primary }]}>
                        Something went wrong
                    </Text>
                    <Text style={[styles.errorText, { color: themeColors.text.muted }]}>
                        {error || 'Lesson not found'}
                    </Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={loadLesson}>
                        <LinearGradient
                            colors={[themeColors.gold[400], themeColors.gold[600]]}
                            style={styles.retryBtnGradient}
                        >
                            <Ionicons name="refresh" size={16} color={themeColors.obsidian[900]} />
                            <Text style={[styles.retryBtnText, { color: themeColors.obsidian[900] }]}>
                                Try Again
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ============================================
    // Render: Lesson
    // ============================================

    const hasVideo = !!lesson.videoUrl;
    const durationLabel = formatDuration(lesson.duration);
    const hasResources = lesson.resources && lesson.resources.length > 0;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.obsidian[900] }]}>
            <LinearGradient
                colors={[themeColors.obsidian[900], themeColors.obsidian[800]]}
                style={StyleSheet.absoluteFill}
            />

            {/* Header — overlays video when present */}
            {!hasVideo && <ScreenHeader title="Lesson" noBorder />}

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* ============================================ */}
                {/* Video Player or Hero Section */}
                {/* ============================================ */}

                {hasVideo ? (
                    <Animated.View entering={FadeIn.duration(400)}>
                        <View style={styles.videoContainer}>
                            <VideoView
                                player={player}
                                style={styles.videoPlayer}
                                allowsFullscreen
                                allowsPictureInPicture
                            />
                        </View>

                        {/* Back button overlay on video */}
                        <TouchableOpacity
                            style={[styles.videoBackBtn, { top: insets.top + spacing.sm }]}
                            onPress={() => router.back()}
                            activeOpacity={0.7}
                        >
                            <View style={styles.videoBackBtnBg}>
                                <Ionicons name="chevron-back" size={22} color="#FAFAFA" />
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                ) : (
                    <Animated.View entering={FadeIn.duration(400)}>
                        <LinearGradient
                            colors={['#1a1a2e', '#16213e', '#0d1117']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroSection}
                        >
                            <View style={styles.heroIconContainer}>
                                <Ionicons
                                    name="book-outline"
                                    size={40}
                                    color="rgba(212, 175, 55, 0.4)"
                                />
                            </View>
                            <Text style={styles.heroTitle} numberOfLines={3}>
                                {lesson.title}
                            </Text>
                            {durationLabel ? (
                                <View style={styles.heroDurationBadge}>
                                    <Ionicons name="time-outline" size={13} color={themeColors.gold[400]} />
                                    <Text style={[styles.heroDurationText, { color: themeColors.gold[400] }]}>
                                        {durationLabel}
                                    </Text>
                                </View>
                            ) : null}
                        </LinearGradient>
                    </Animated.View>
                )}

                {/* ============================================ */}
                {/* Lesson Meta */}
                {/* ============================================ */}

                <Animated.View
                    entering={FadeInDown.duration(400).delay(100)}
                    style={styles.metaSection}
                >
                    {/* Module breadcrumb */}
                    <TouchableOpacity
                        style={[styles.breadcrumb, { backgroundColor: themeColors.surface.glass }]}
                        activeOpacity={0.7}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.back();
                        }}
                    >
                        <Ionicons name="layers-outline" size={13} color={themeColors.gold[400]} />
                        <Text
                            style={[styles.breadcrumbText, { color: themeColors.gold[400] }]}
                            numberOfLines={1}
                        >
                            {lesson.module.title}
                        </Text>
                        <Ionicons name="chevron-forward" size={11} color={themeColors.text.muted} />
                    </TouchableOpacity>

                    {/* Title (below video) */}
                    {hasVideo && (
                        <Text style={[styles.lessonTitle, { color: themeColors.text.primary }]}>
                            {lesson.title}
                        </Text>
                    )}

                    {/* Duration badge (below video) */}
                    {hasVideo && durationLabel ? (
                        <View style={styles.metaRow}>
                            <View style={[styles.metaBadge, { backgroundColor: themeColors.surface.goldSubtle }]}>
                                <Ionicons name="time-outline" size={13} color={themeColors.gold[400]} />
                                <Text style={[styles.metaBadgeText, { color: themeColors.gold[400] }]}>
                                    {durationLabel}
                                </Text>
                            </View>
                            {completed && (
                                <View style={[styles.metaBadge, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                                    <Ionicons name="checkmark-circle" size={13} color={themeColors.emerald[400]} />
                                    <Text style={[styles.metaBadgeText, { color: themeColors.emerald[400] }]}>
                                        Completed
                                    </Text>
                                </View>
                            )}
                        </View>
                    ) : null}
                </Animated.View>

                {/* ============================================ */}
                {/* Content */}
                {/* ============================================ */}

                {lesson.content ? (
                    <Animated.View
                        entering={FadeInDown.duration(400).delay(200)}
                        style={styles.contentSection}
                    >
                        <View style={[styles.contentDivider, { backgroundColor: themeColors.border.subtle }]} />
                        {renderContent(lesson.content, themeColors)}
                    </Animated.View>
                ) : null}

                {/* ============================================ */}
                {/* Resources */}
                {/* ============================================ */}

                {hasResources && (
                    <Animated.View
                        entering={FadeInDown.duration(400).delay(300)}
                        style={styles.resourcesSection}
                    >
                        <View style={[styles.contentDivider, { backgroundColor: themeColors.border.subtle }]} />
                        <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>
                            Resources
                        </Text>

                        {lesson.resources.map((resource) => {
                            const iconName = RESOURCE_ICONS[resource.type] || 'document-outline';
                            return (
                                <TouchableOpacity
                                    key={resource.id}
                                    style={[
                                        styles.resourceCard,
                                        {
                                            backgroundColor: themeColors.surface.glass,
                                            borderColor: themeColors.border.subtle,
                                        },
                                    ]}
                                    onPress={() => handleResourcePress(resource)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.resourceIcon, { backgroundColor: themeColors.surface.goldSubtle }]}>
                                        <Ionicons
                                            name={iconName as any}
                                            size={18}
                                            color={themeColors.gold[400]}
                                        />
                                    </View>
                                    <View style={styles.resourceInfo}>
                                        <Text
                                            style={[styles.resourceTitle, { color: themeColors.text.primary }]}
                                            numberOfLines={1}
                                        >
                                            {resource.title}
                                        </Text>
                                        <Text style={[styles.resourceType, { color: themeColors.text.muted }]}>
                                            {resource.type.toUpperCase()}
                                        </Text>
                                    </View>
                                    <Ionicons
                                        name="open-outline"
                                        size={16}
                                        color={themeColors.text.muted}
                                    />
                                </TouchableOpacity>
                            );
                        })}
                    </Animated.View>
                )}
            </ScrollView>

            {/* ============================================ */}
            {/* Bottom Action Bar */}
            {/* ============================================ */}

            <Animated.View
                entering={FadeInDown.duration(500).delay(400)}
                style={[
                    styles.bottomBar,
                    {
                        paddingBottom: insets.bottom + spacing.md,
                        borderTopColor: themeColors.border.subtle,
                    },
                ]}
            >
                <LinearGradient
                    colors={[
                        'transparent',
                        themeColors.obsidian[900] + 'CC',
                        themeColors.obsidian[900],
                    ]}
                    locations={[0, 0.3, 0.5]}
                    style={styles.bottomBarGradient}
                />

                {completed ? (
                    <View style={[styles.completedBanner, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                        <Ionicons name="checkmark-circle" size={22} color={themeColors.emerald[400]} />
                        <Text style={[styles.completedText, { color: themeColors.emerald[400] }]}>
                            Lesson Completed
                        </Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.completeBtn}
                        onPress={handleMarkComplete}
                        disabled={marking}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={[themeColors.gold[400], themeColors.gold[600]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.completeBtnGradient}
                        >
                            {marking ? (
                                <ActivityIndicator size="small" color={themeColors.obsidian[900]} />
                            ) : (
                                <>
                                    <Ionicons
                                        name="checkmark-circle-outline"
                                        size={20}
                                        color={themeColors.obsidian[900]}
                                    />
                                    <Text style={[styles.completeBtnText, { color: themeColors.obsidian[900] }]}>
                                        Mark as Complete
                                    </Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </Animated.View>
        </View>
    );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },

    // Loading
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
    },
    loadingText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '500',
    },

    // Error
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing['2xl'],
        gap: spacing.sm,
    },
    errorTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        marginTop: spacing.sm,
    },
    errorText: {
        fontSize: typography.fontSize.sm,
        textAlign: 'center',
        lineHeight: 20,
    },
    retryBtn: {
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: spacing.md,
    },
    retryBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xl,
    },
    retryBtnText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
    },

    // Video
    videoContainer: {
        width: SCREEN_WIDTH,
        height: VIDEO_HEIGHT,
        backgroundColor: '#000',
    },
    videoPlayer: {
        width: '100%',
        height: '100%',
    },
    videoBackBtn: {
        position: 'absolute',
        left: spacing.lg,
        zIndex: 10,
    },
    videoBackBtnBg: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },

    // Hero (no-video fallback)
    heroSection: {
        width: SCREEN_WIDTH,
        paddingTop: 80,
        paddingBottom: spacing['2xl'],
        paddingHorizontal: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroIconContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(212, 175, 55, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.15)',
    },
    heroTitle: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: '#FAFAFA',
        textAlign: 'center',
        lineHeight: typography.fontSize['2xl'] * typography.lineHeight.tight,
        marginBottom: spacing.md,
    },
    heroDurationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: 8,
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
    },
    heroDurationText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
    },

    // Meta section
    metaSection: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
    },
    breadcrumb: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        borderRadius: 8,
        marginBottom: spacing.md,
    },
    breadcrumbText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        maxWidth: 200,
    },
    lessonTitle: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        lineHeight: typography.fontSize['2xl'] * typography.lineHeight.tight,
        marginBottom: spacing.sm,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flexWrap: 'wrap',
    },
    metaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 6,
    },
    metaBadgeText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
    },

    // Content
    contentSection: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
    },
    contentDivider: {
        height: 1,
        marginBottom: spacing.lg,
    },

    // Section title
    sectionTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        marginBottom: spacing.md,
    },

    // Resources
    resourcesSection: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
    },
    resourceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: spacing.sm,
        gap: spacing.md,
    },
    resourceIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resourceInfo: {
        flex: 1,
    },
    resourceTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        marginBottom: 2,
    },
    resourceType: {
        fontSize: typography.fontSize.xs,
        fontWeight: '500',
        letterSpacing: 0.5,
    },

    // Bottom bar
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xl,
    },
    bottomBarGradient: {
        ...StyleSheet.absoluteFillObject,
    },

    // Complete button
    completeBtn: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#D4AF37',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    completeBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: 16,
    },
    completeBtnText: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        letterSpacing: 0.3,
    },

    // Completed banner
    completedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.25)',
    },
    completedText: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
});
