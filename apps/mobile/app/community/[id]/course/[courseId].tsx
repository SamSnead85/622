// ============================================
// Course Detail Screen
// Premium course viewer with module accordion
// and lesson progress tracking
// ============================================

import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { useTheme } from '../../../../contexts/ThemeContext';
import { ScreenHeader } from '../../../../components';
import { apiFetch, API } from '../../../../lib/api';
import { IMAGE_PLACEHOLDER } from '../../../../lib/imagePlaceholder';

// ============================================
// Types
// ============================================

interface Lesson {
    id: string;
    title: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    duration?: number;
    completed: boolean;
    watchedSeconds?: number;
}

interface Module {
    id: string;
    title: string;
    description?: string;
    lessons: Lesson[];
}

interface CourseDetail {
    id: string;
    title: string;
    description?: string;
    coverUrl?: string;
    totalLessons: number;
    completedLessons: number;
    progressPercent: number;
    modules: Module[];
}

// ============================================
// Constants
// ============================================

const COVER_HEIGHT = 220;

const GRADIENT_FALLBACK: [string, string] = ['#0f0c29', '#302b63'];

// ============================================
// Helpers
// ============================================

/** Format seconds into "Xm Ys" or "Xh Ym" */
function formatDuration(seconds: number | undefined): string {
    if (!seconds || seconds <= 0) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s > 0 ? `${s}s` : ''}`.trim();
    return `${s}s`;
}

// ============================================
// Progress Bar Component
// ============================================

function OverallProgress({
    percent,
    completed,
    total,
    themeColors,
}: {
    percent: number;
    completed: number;
    total: number;
    themeColors: typeof colors;
}) {
    const clamped = Math.min(100, Math.max(0, percent));
    const isComplete = clamped >= 100;

    return (
        <View style={[styles.progressCard, { borderColor: themeColors.border.subtle }]}>
            <View style={styles.progressHeader}>
                <View style={styles.progressLabelRow}>
                    <Ionicons
                        name={isComplete ? 'checkmark-circle' : 'school-outline'}
                        size={18}
                        color={isComplete ? themeColors.emerald[500] : themeColors.gold[400]}
                    />
                    <Text style={[styles.progressTitle, { color: themeColors.text.primary }]}>
                        {isComplete ? 'Course Complete!' : 'Your Progress'}
                    </Text>
                </View>
                <Text style={[styles.progressPercent, { color: themeColors.gold[400] }]}>
                    {Math.round(clamped)}%
                </Text>
            </View>

            {/* Progress bar */}
            <View style={[styles.progressBarBg, { backgroundColor: themeColors.obsidian[600] }]}>
                <LinearGradient
                    colors={
                        isComplete
                            ? [themeColors.emerald[500], themeColors.emerald[400]]
                            : [themeColors.gold[600], themeColors.gold[400]]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressBarFill, { width: `${clamped}%` }]}
                />
            </View>

            <Text style={[styles.progressSubtext, { color: themeColors.text.muted }]}>
                {completed} of {total} lessons completed
            </Text>
        </View>
    );
}

// ============================================
// Lesson Row Component
// ============================================

function LessonRow({
    lesson,
    index,
    onPress,
    themeColors,
}: {
    lesson: Lesson;
    index: number;
    onPress: () => void;
    themeColors: typeof colors;
}) {
    const hasVideo = !!lesson.videoUrl;

    return (
        <TouchableOpacity
            style={[styles.lessonRow, { borderColor: themeColors.border.subtle }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Completion indicator */}
            <View
                style={[
                    styles.lessonCheckCircle,
                    lesson.completed
                        ? { backgroundColor: themeColors.emerald[500], borderColor: themeColors.emerald[500] }
                        : { backgroundColor: 'transparent', borderColor: themeColors.obsidian[400] },
                ]}
            >
                {lesson.completed && (
                    <Ionicons name="checkmark" size={12} color="#fff" />
                )}
            </View>

            {/* Lesson info */}
            <View style={styles.lessonInfo}>
                <Text
                    style={[
                        styles.lessonTitle,
                        { color: lesson.completed ? themeColors.text.secondary : themeColors.text.primary },
                    ]}
                    numberOfLines={2}
                >
                    {lesson.title}
                </Text>
                {lesson.duration != null && lesson.duration > 0 && (
                    <View style={styles.lessonMeta}>
                        {hasVideo && (
                            <Ionicons name="videocam-outline" size={12} color={themeColors.text.muted} />
                        )}
                        <Text style={[styles.lessonDuration, { color: themeColors.text.muted }]}>
                            {formatDuration(lesson.duration)}
                        </Text>
                    </View>
                )}
            </View>

            {/* Play / arrow icon */}
            <Ionicons
                name={hasVideo ? 'play-circle-outline' : 'chevron-forward'}
                size={hasVideo ? 24 : 18}
                color={lesson.completed ? themeColors.emerald[400] : themeColors.text.muted}
            />
        </TouchableOpacity>
    );
}

// ============================================
// Module Accordion Component
// ============================================

function ModuleAccordion({
    module: mod,
    index,
    communityId,
    courseId,
    themeColors,
    router,
}: {
    module: Module;
    index: number;
    communityId: string;
    courseId: string;
    themeColors: typeof colors;
    router: ReturnType<typeof useRouter>;
}) {
    const [expanded, setExpanded] = useState(index === 0);

    const completedCount = mod.lessons.filter((l) => l.completed).length;
    const totalCount = mod.lessons.length;
    const allComplete = totalCount > 0 && completedCount === totalCount;

    const handleToggle = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExpanded((prev) => !prev);
    }, []);

    const handleLessonPress = useCallback(
        (lessonId: string) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/community/${communityId}/lesson/${lessonId}?courseId=${courseId}` as any);
        },
        [communityId, courseId, router],
    );

    return (
        <Animated.View entering={FadeInDown.duration(350).delay(index * 80).springify()}>
            <View style={[styles.moduleCard, { borderColor: themeColors.border.subtle }]}>
                {/* Module Header (tap to expand/collapse) */}
                <TouchableOpacity
                    style={styles.moduleHeader}
                    onPress={handleToggle}
                    activeOpacity={0.7}
                >
                    <View style={styles.moduleHeaderLeft}>
                        <View
                            style={[
                                styles.moduleIndexBadge,
                                {
                                    backgroundColor: allComplete
                                        ? 'rgba(16, 185, 129, 0.12)'
                                        : themeColors.surface.goldSubtle,
                                    borderColor: allComplete
                                        ? 'rgba(16, 185, 129, 0.25)'
                                        : 'rgba(212, 175, 55, 0.15)',
                                },
                            ]}
                        >
                            {allComplete ? (
                                <Ionicons name="checkmark" size={14} color={themeColors.emerald[400]} />
                            ) : (
                                <Text style={[styles.moduleIndexText, { color: themeColors.gold[400] }]}>
                                    {index + 1}
                                </Text>
                            )}
                        </View>

                        <View style={styles.moduleTitleBlock}>
                            <Text
                                style={[styles.moduleTitle, { color: themeColors.text.primary }]}
                                numberOfLines={1}
                            >
                                {mod.title}
                            </Text>
                            <Text style={[styles.moduleLessonCount, { color: themeColors.text.muted }]}>
                                {completedCount}/{totalCount} lessons
                            </Text>
                        </View>
                    </View>

                    <Ionicons
                        name={expanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={themeColors.text.muted}
                    />
                </TouchableOpacity>

                {/* Module description (only when expanded) */}
                {expanded && mod.description ? (
                    <Text style={[styles.moduleDescription, { color: themeColors.text.secondary }]}>
                        {mod.description}
                    </Text>
                ) : null}

                {/* Lessons list (only when expanded) */}
                {expanded && (
                    <View style={styles.lessonsList}>
                        {mod.lessons.map((lesson, lessonIdx) => (
                            <LessonRow
                                key={lesson.id}
                                lesson={lesson}
                                index={lessonIdx}
                                onPress={() => handleLessonPress(lesson.id)}
                                themeColors={themeColors}
                            />
                        ))}
                        {mod.lessons.length === 0 && (
                            <Text style={[styles.noLessonsText, { color: themeColors.text.muted }]}>
                                No lessons in this module yet
                            </Text>
                        )}
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

// ============================================
// Main Screen
// ============================================

export default function CourseDetailScreen() {
    const router = useRouter();
    const { id: communityId, courseId } = useLocalSearchParams<{ id: string; courseId: string }>();
    const insets = useSafeAreaInsets();
    const { colors: themeColors } = useTheme();

    const [course, setCourse] = useState<CourseDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ============================================
    // Data Fetching
    // ============================================

    const loadCourse = useCallback(async () => {
        if (!communityId || !courseId) return;
        try {
            setError(null);
            const data = await apiFetch<CourseDetail>(
                `${API.communities}/${communityId}/courses/${courseId}`,
                { cache: !refreshing },
            );
            setCourse(data);
        } catch (e: any) {
            setError(e.message || 'Failed to load course');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [communityId, courseId, refreshing]);

    useEffect(() => {
        loadCourse();
    }, [communityId, courseId]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        loadCourse();
    }, [loadCourse]);

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
                <ScreenHeader title="Course" />
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={themeColors.gold[500]} />
                    <Text style={[styles.loadingText, { color: themeColors.text.muted }]}>
                        Loading course...
                    </Text>
                </View>
            </View>
        );
    }

    // ============================================
    // Render: Error
    // ============================================

    if (error || !course) {
        return (
            <View style={[styles.container, { backgroundColor: themeColors.obsidian[900] }]}>
                <LinearGradient
                    colors={[themeColors.obsidian[900], themeColors.obsidian[800]]}
                    style={StyleSheet.absoluteFill}
                />
                <ScreenHeader title="Course" />
                <View style={styles.centered}>
                    <Ionicons name="cloud-offline-outline" size={48} color={themeColors.text.muted} />
                    <Text style={[styles.errorTitle, { color: themeColors.text.primary }]}>
                        Something went wrong
                    </Text>
                    <Text style={[styles.errorText, { color: themeColors.text.muted }]}>
                        {error || 'Course not found'}
                    </Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={loadCourse}>
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
    // Render: Course Detail
    // ============================================

    return (
        <View style={[styles.container, { backgroundColor: themeColors.obsidian[900] }]}>
            <LinearGradient
                colors={[themeColors.obsidian[900], themeColors.obsidian[800]]}
                style={StyleSheet.absoluteFill}
            />

            <ScreenHeader title="Course" noBorder />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={themeColors.gold[500]}
                    />
                }
            >
                {/* ---- Cover Image ---- */}
                <View style={styles.coverContainer}>
                    {course.coverUrl ? (
                        <Image
                            source={{ uri: course.coverUrl }}
                            style={styles.coverImage}
                            placeholder={IMAGE_PLACEHOLDER.blurhash}
                            transition={IMAGE_PLACEHOLDER.transition}
                            cachePolicy="memory-disk"
                            contentFit="cover"
                        />
                    ) : (
                        <LinearGradient
                            colors={GRADIENT_FALLBACK}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.coverImage}
                        >
                            <Ionicons name="school-outline" size={56} color="rgba(255,255,255,0.08)" />
                        </LinearGradient>
                    )}

                    {/* Bottom gradient overlay */}
                    <LinearGradient
                        colors={['transparent', themeColors.obsidian[900]]}
                        locations={[0.3, 1]}
                        style={styles.coverGradient}
                    />
                </View>

                {/* ---- Title & Description ---- */}
                <View style={styles.content}>
                    <Animated.View entering={FadeInDown.duration(400).delay(0)}>
                        <Text style={[styles.courseTitle, { color: themeColors.text.primary }]}>
                            {course.title}
                        </Text>
                        {course.description ? (
                            <Text style={[styles.courseDescription, { color: themeColors.text.secondary }]}>
                                {course.description}
                            </Text>
                        ) : null}
                    </Animated.View>

                    {/* ---- Overall Progress ---- */}
                    <Animated.View entering={FadeInDown.duration(400).delay(80)}>
                        <OverallProgress
                            percent={course.progressPercent}
                            completed={course.completedLessons}
                            total={course.totalLessons}
                            themeColors={themeColors}
                        />
                    </Animated.View>

                    {/* ---- Modules Section ---- */}
                    <View style={styles.modulesSection}>
                        <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>
                            Modules
                        </Text>
                        <Text style={[styles.sectionSubtitle, { color: themeColors.text.muted }]}>
                            {course.modules.length} {course.modules.length === 1 ? 'module' : 'modules'} · {course.totalLessons} lessons
                        </Text>

                        {course.modules.map((mod, idx) => (
                            <ModuleAccordion
                                key={mod.id}
                                module={mod}
                                index={idx}
                                communityId={communityId!}
                                courseId={courseId!}
                                themeColors={themeColors}
                                router={router}
                            />
                        ))}

                        {course.modules.length === 0 && (
                            <View style={styles.emptyModules}>
                                <Ionicons name="layers-outline" size={40} color={themeColors.text.muted} />
                                <Text style={[styles.emptyModulesText, { color: themeColors.text.muted }]}>
                                    No modules have been added yet
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>
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
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing['2xl'],
    },

    // ---- Loading ----
    loadingText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '500',
        marginTop: spacing.sm,
    },

    // ---- Error ----
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

    // ---- Cover ----
    coverContainer: {
        width: '100%',
        height: COVER_HEIGHT,
        position: 'relative',
    },
    coverImage: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    coverGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: COVER_HEIGHT * 0.5,
    },

    // ---- Content ----
    content: {
        paddingHorizontal: spacing.lg,
        marginTop: -spacing.xl,
    },
    courseTitle: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        lineHeight: 32,
        marginBottom: spacing.sm,
    },
    courseDescription: {
        fontSize: typography.fontSize.base,
        lineHeight: 22,
        marginBottom: spacing.lg,
    },

    // ---- Overall Progress Card ----
    progressCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        borderWidth: 1,
        padding: spacing.lg,
        marginBottom: spacing.xl,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    progressLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    progressTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
    },
    progressPercent: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
    },
    progressBarBg: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressSubtext: {
        fontSize: typography.fontSize.xs,
        fontWeight: '500',
        marginTop: spacing.sm,
    },

    // ---- Modules Section ----
    modulesSection: {
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        marginBottom: spacing.xxs,
    },
    sectionSubtitle: {
        fontSize: typography.fontSize.sm,
        marginBottom: spacing.lg,
    },

    // ---- Module Card ----
    moduleCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: spacing.md,
        overflow: 'hidden',
    },
    moduleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.lg,
    },
    moduleHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: spacing.md,
    },
    moduleIndexBadge: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    moduleIndexText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
    },
    moduleTitleBlock: {
        flex: 1,
    },
    moduleTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        marginBottom: 2,
    },
    moduleLessonCount: {
        fontSize: typography.fontSize.xs,
        fontWeight: '500',
    },
    moduleDescription: {
        fontSize: typography.fontSize.sm,
        lineHeight: 20,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
    },

    // ---- Lessons List ----
    lessonsList: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.06)',
    },
    lessonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255, 255, 255, 0.04)',
    },
    lessonCheckCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    lessonInfo: {
        flex: 1,
    },
    lessonTitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: '500',
        lineHeight: 18,
    },
    lessonMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 3,
    },
    lessonDuration: {
        fontSize: typography.fontSize.xs,
        fontWeight: '500',
    },
    noLessonsText: {
        fontSize: typography.fontSize.sm,
        textAlign: 'center',
        paddingVertical: spacing.xl,
    },

    // ---- Empty Modules ----
    emptyModules: {
        alignItems: 'center',
        paddingVertical: spacing['3xl'],
        gap: spacing.md,
    },
    emptyModulesText: {
        fontSize: typography.fontSize.base,
        textAlign: 'center',
    },
});
