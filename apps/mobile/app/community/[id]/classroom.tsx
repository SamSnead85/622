// ============================================
// Classroom / Courses Screen
// Premium course listing with glassmorphism cards
// ============================================

import { useState, useEffect, useCallback } from 'react';
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
    Dimensions,
    Keyboard,
    TouchableWithoutFeedback,
    Alert,
} from 'react-native';
import { Image } from 'expo-image';
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
import { IMAGE_PLACEHOLDER } from '../../../lib/imagePlaceholder';

// ============================================
// Types
// ============================================

interface Course {
    id: string;
    title: string;
    description: string;
    coverUrl?: string;
    requiredLevel: number;
    isLocked: boolean;
    totalLessons: number;
    completedLessons: number;
    progressPercent: number;
    moduleCount: number;
}

// ============================================
// Constants
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - spacing.lg * 2;
const COVER_HEIGHT = CARD_WIDTH * (9 / 16);

const LEVEL_OPTIONS = [0, 1, 2, 3, 4, 5, 10, 15, 20];

const GRADIENT_PRESETS: [string, string][] = [
    ['#1a1a2e', '#16213e'],
    ['#0f0c29', '#302b63'],
    ['#1c1c3c', '#2d2d5e'],
    ['#141e30', '#243b55'],
    ['#0d1117', '#1a2332'],
];

// ============================================
// Course Card Component
// ============================================

function CourseCard({
    course,
    index,
    onPress,
    themeColors,
}: {
    course: Course;
    index: number;
    onPress: () => void;
    themeColors: typeof colors;
}) {
    const gradientPair = GRADIENT_PRESETS[index % GRADIENT_PRESETS.length]!;
    const progressWidth = Math.min(100, Math.max(0, course.progressPercent));
    const isComplete = course.progressPercent >= 100;

    return (
        <Animated.View entering={FadeInDown.duration(400).delay(index * 80).springify()}>
            <TouchableOpacity
                style={[styles.courseCard, { borderColor: themeColors.border.subtle }]}
                onPress={onPress}
                activeOpacity={0.8}
                disabled={course.isLocked}
            >
                {/* Cover Image */}
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
                            colors={gradientPair}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.coverImage}
                        >
                            <Ionicons
                                name="school-outline"
                                size={48}
                                color="rgba(255,255,255,0.12)"
                            />
                        </LinearGradient>
                    )}

                    {/* Glass overlay at bottom for text */}
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.75)', 'rgba(0,0,0,0.92)']}
                        locations={[0, 0.5, 1]}
                        style={styles.coverOverlay}
                    >
                        {/* Module count badge */}
                        <View style={styles.modulesBadge}>
                            <Ionicons name="layers-outline" size={12} color={themeColors.gold[400]} />
                            <Text style={[styles.modulesText, { color: themeColors.gold[400] }]}>
                                {course.moduleCount} {course.moduleCount === 1 ? 'module' : 'modules'}
                            </Text>
                        </View>

                        <Text style={styles.courseTitle} numberOfLines={2}>
                            {course.title}
                        </Text>
                        <Text style={styles.courseDesc} numberOfLines={2}>
                            {course.description}
                        </Text>
                    </LinearGradient>

                    {/* Completion badge */}
                    {isComplete && (
                        <View style={styles.completeBadge}>
                            <Ionicons name="checkmark-circle" size={16} color={themeColors.emerald[500]} />
                            <Text style={[styles.completeText, { color: themeColors.emerald[400] }]}>
                                Complete
                            </Text>
                        </View>
                    )}

                    {/* Locked overlay */}
                    {course.isLocked && (
                        <View style={styles.lockedOverlay}>
                            <View style={styles.lockedContent}>
                                <View style={styles.lockIconContainer}>
                                    <Ionicons name="lock-closed" size={28} color="rgba(255,255,255,0.9)" />
                                </View>
                                <Text style={styles.lockedText}>Requires Level {course.requiredLevel}</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Progress Section */}
                <View style={[styles.progressSection, { borderTopColor: themeColors.border.subtle }]}>
                    <View style={styles.progressRow}>
                        <Text style={[styles.progressLabel, { color: themeColors.text.secondary }]}>
                            {course.completedLessons}/{course.totalLessons} lessons completed
                        </Text>
                        <Text style={[styles.progressPercent, { color: themeColors.gold[400] }]}>
                            {Math.round(course.progressPercent)}%
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
                            style={[styles.progressBarFill, { width: `${progressWidth}%` }]}
                        />
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

// ============================================
// Main Screen
// ============================================

export default function ClassroomScreen() {
    const router = useRouter();
    const { id: communityId } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const { colors: themeColors } = useTheme();

    const user = useAuthStore((s) => s.user);

    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Create modal state
    const [showCreate, setShowCreate] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newLevel, setNewLevel] = useState(0);
    const [creating, setCreating] = useState(false);

    // Determine if user is admin/mod (from community membership data)
    const [userRole, setUserRole] = useState<string | null>(null);
    const isAdmin = userRole === 'admin' || userRole === 'moderator';

    // ============================================
    // Data Fetching
    // ============================================

    const loadCourses = useCallback(async () => {
        if (!communityId) return;
        try {
            setError(null);
            const data = await apiFetch<{ courses: Course[]; role?: string }>(
                `${API.communities}/${communityId}/courses`,
                { cache: !refreshing }
            );
            const list = data.courses || [];
            setCourses(Array.isArray(list) ? list : []);
            if (data.role) setUserRole(data.role);
        } catch (e: any) {
            setError(e.message || 'Failed to load courses');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [communityId, refreshing]);

    useEffect(() => {
        loadCourses();
    }, [communityId]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        loadCourses();
    }, [loadCourses]);

    // ============================================
    // Create Course
    // ============================================

    const handleCreate = async () => {
        if (!newTitle.trim() || !communityId) return;
        setCreating(true);
        try {
            await apiFetch(`${API.communities}/${communityId}/courses`, {
                method: 'POST',
                body: JSON.stringify({
                    title: newTitle.trim(),
                    description: newDesc.trim(),
                    requiredLevel: newLevel,
                }),
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowCreate(false);
            setNewTitle('');
            setNewDesc('');
            setNewLevel(0);
            loadCourses();
        } catch (e: any) {
            Alert.alert('Course Creation Failed', e.message || 'Unable to create course');
        } finally {
            setCreating(false);
        }
    };

    // ============================================
    // Course Press
    // ============================================

    const handleCoursePress = useCallback(
        (course: Course) => {
            if (course.isLocked) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                return;
            }
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/community/${communityId}/course/${course.id}` as any);
        },
        [communityId, router]
    );

    // ============================================
    // Render
    // ============================================

    const renderCourse = useCallback(
        ({ item, index }: { item: Course; index: number }) => (
            <CourseCard
                course={item}
                index={index}
                onPress={() => handleCoursePress(item)}
                themeColors={themeColors}
            />
        ),
        [handleCoursePress, themeColors]
    );

    const keyExtractor = useCallback((item: Course) => item.id, []);

    return (
        <View style={[styles.container, { backgroundColor: themeColors.obsidian[900] }]}>
            <LinearGradient
                colors={[themeColors.obsidian[900], themeColors.obsidian[800]]}
                style={StyleSheet.absoluteFill}
            />

            <ScreenHeader title="Classroom" />

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={themeColors.gold[500]} />
                    <Text style={[styles.loadingText, { color: themeColors.text.muted }]}>
                        Loading courses...
                    </Text>
                </View>
            ) : error ? (
                <View style={styles.errorContainer}>
                    <Ionicons name="cloud-offline-outline" size={48} color={themeColors.text.muted} />
                    <Text style={[styles.errorTitle, { color: themeColors.text.primary }]}>
                        Unable to load classroom
                    </Text>
                    <Text style={[styles.errorText, { color: themeColors.text.muted }]}>
                        {error}
                    </Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={loadCourses}>
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
            ) : (
                <FlatList
                    data={courses}
                    keyExtractor={keyExtractor}
                    renderItem={renderCourse}
                    contentContainerStyle={[
                        styles.listContent,
                        { paddingBottom: insets.bottom + 80 },
                    ]}
                    removeClippedSubviews
                    maxToRenderPerBatch={6}
                    windowSize={5}
                    initialNumToRender={4}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={themeColors.gold[500]}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={[styles.emptyIconContainer, { backgroundColor: themeColors.surface.goldSubtle }]}>
                                <Ionicons
                                    name="school-outline"
                                    size={44}
                                    color={themeColors.gold[500]}
                                />
                            </View>
                            <Text style={[styles.emptyTitle, { color: themeColors.text.primary }]}>
                                No courses yet
                            </Text>
                            <Text style={[styles.emptyText, { color: themeColors.text.muted }]}>
                                Community admins can create courses to share knowledge, tutorials, and structured learning paths with members.
                            </Text>
                            {isAdmin && (
                                <TouchableOpacity
                                    style={styles.emptyCreateBtn}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        setShowCreate(true);
                                    }}
                                >
                                    <LinearGradient
                                        colors={[themeColors.gold[400], themeColors.gold[600]]}
                                        style={styles.emptyCreateBtnGradient}
                                    >
                                        <Ionicons name="add" size={18} color={themeColors.obsidian[900]} />
                                        <Text style={[styles.emptyCreateBtnText, { color: themeColors.obsidian[900] }]}>
                                            Create First Course
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            )}
                        </View>
                    }
                />
            )}

            {/* FAB for admins/mods */}
            {isAdmin && courses.length > 0 && (
                <TouchableOpacity
                    style={[styles.fab, { bottom: insets.bottom + spacing.xl }]}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setShowCreate(true);
                    }}
                    activeOpacity={0.85}
                >
                    <LinearGradient
                        colors={[themeColors.gold[400], themeColors.gold[600]]}
                        style={styles.fabGradient}
                    >
                        <Ionicons name="add" size={28} color={themeColors.obsidian[900]} />
                    </LinearGradient>
                </TouchableOpacity>
            )}

            {/* Create Course Modal */}
            <Modal visible={showCreate} animationType="slide" transparent>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={[styles.modalOverlay, { backgroundColor: themeColors.surface.overlayMedium }]}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={[
                            styles.modalContent,
                            {
                                backgroundColor: themeColors.obsidian[800],
                                paddingBottom: insets.bottom + spacing.lg,
                            },
                        ]}>
                            {/* Modal Header */}
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: themeColors.text.primary }]}>
                                    New Course
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setShowCreate(false)}
                                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                >
                                    <Ionicons name="close" size={24} color={themeColors.text.primary} />
                                </TouchableOpacity>
                            </View>

                            {/* Title Input */}
                            <Text style={[styles.modalLabel, { color: themeColors.text.muted }]}>
                                TITLE
                            </Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    {
                                        backgroundColor: themeColors.surface.glass,
                                        borderColor: themeColors.border.subtle,
                                        color: themeColors.text.primary,
                                    },
                                ]}
                                placeholder="Course title..."
                                placeholderTextColor={themeColors.text.muted}
                                value={newTitle}
                                onChangeText={setNewTitle}
                                maxLength={120}
                            />

                            {/* Description Input */}
                            <Text style={[styles.modalLabel, { color: themeColors.text.muted }]}>
                                DESCRIPTION
                            </Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    styles.inputMulti,
                                    {
                                        backgroundColor: themeColors.surface.glass,
                                        borderColor: themeColors.border.subtle,
                                        color: themeColors.text.primary,
                                    },
                                ]}
                                placeholder="What will members learn?"
                                placeholderTextColor={themeColors.text.muted}
                                value={newDesc}
                                onChangeText={setNewDesc}
                                multiline
                                maxLength={500}
                            />

                            {/* Required Level Picker */}
                            <Text style={[styles.modalLabel, { color: themeColors.text.muted }]}>
                                REQUIRED LEVEL
                            </Text>
                            <View style={styles.levelGrid}>
                                {LEVEL_OPTIONS.map((level) => {
                                    const isSelected = newLevel === level;
                                    return (
                                        <TouchableOpacity
                                            key={level}
                                            style={[
                                                styles.levelChip,
                                                {
                                                    borderColor: isSelected
                                                        ? themeColors.gold[500] + '60'
                                                        : themeColors.border.subtle,
                                                    backgroundColor: isSelected
                                                        ? themeColors.surface.goldLight
                                                        : 'transparent',
                                                },
                                            ]}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setNewLevel(level);
                                            }}
                                        >
                                            {level === 0 ? (
                                                <Ionicons
                                                    name="globe-outline"
                                                    size={13}
                                                    color={isSelected ? themeColors.gold[400] : themeColors.text.muted}
                                                />
                                            ) : (
                                                <Ionicons
                                                    name="lock-closed-outline"
                                                    size={13}
                                                    color={isSelected ? themeColors.gold[400] : themeColors.text.muted}
                                                />
                                            )}
                                            <Text
                                                style={[
                                                    styles.levelChipText,
                                                    {
                                                        color: isSelected
                                                            ? themeColors.gold[400]
                                                            : themeColors.text.muted,
                                                    },
                                                ]}
                                            >
                                                {level === 0 ? 'Open' : `Lv. ${level}`}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Create Button */}
                            <TouchableOpacity
                                style={[styles.submitBtn, !newTitle.trim() && styles.submitBtnDisabled]}
                                onPress={handleCreate}
                                disabled={creating || !newTitle.trim()}
                            >
                                <LinearGradient
                                    colors={
                                        newTitle.trim()
                                            ? [themeColors.gold[400], themeColors.gold[600]]
                                            : [themeColors.obsidian[500], themeColors.obsidian[600]]
                                    }
                                    style={styles.submitBtnGradient}
                                >
                                    {creating ? (
                                        <ActivityIndicator size="small" color={themeColors.obsidian[900]} />
                                    ) : (
                                        <>
                                            <Ionicons
                                                name="school"
                                                size={18}
                                                color={newTitle.trim() ? themeColors.obsidian[900] : themeColors.text.muted}
                                            />
                                            <Text
                                                style={[
                                                    styles.submitBtnText,
                                                    {
                                                        color: newTitle.trim()
                                                            ? themeColors.obsidian[900]
                                                            : themeColors.text.muted,
                                                    },
                                                ]}
                                            >
                                                Create Course
                                            </Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>
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

    // List
    listContent: {
        padding: spacing.lg,
    },

    // Course Card
    courseCard: {
        borderRadius: 18,
        overflow: 'hidden',
        marginBottom: spacing.lg,
        borderWidth: 1,
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
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
    coverOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
        paddingTop: COVER_HEIGHT * 0.35,
    },
    modulesBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: 'rgba(212, 175, 55, 0.12)',
        marginBottom: spacing.sm,
    },
    modulesText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    courseTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        color: '#FAFAFA',
        lineHeight: 26,
        marginBottom: 4,
        fontFamily: 'Inter-Bold',
    },
    courseDesc: {
        fontSize: typography.fontSize.sm,
        color: 'rgba(255,255,255,0.65)',
        lineHeight: 18,
    },

    // Complete badge
    completeBadge: {
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    completeText: {
        fontSize: 11,
        fontWeight: '700',
    },

    // Locked overlay
    lockedOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(10, 10, 11, 0.7)',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(8px)',
    },
    lockedContent: {
        alignItems: 'center',
        gap: spacing.md,
    },
    lockIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    lockedText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: 0.5,
    },

    // Progress section
    progressSection: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderTopWidth: 1,
    },
    progressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    progressLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: '500',
    },
    progressPercent: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
    },
    progressBarBg: {
        height: 5,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },

    // Empty state
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 80,
        paddingHorizontal: spacing.xl,
    },
    emptyIconContainer: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    emptyTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        marginBottom: spacing.sm,
    },
    emptyText: {
        fontSize: typography.fontSize.base,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing.xl,
    },
    emptyCreateBtn: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    emptyCreateBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
    },
    emptyCreateBtnText: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
    },

    // FAB
    fab: {
        position: 'absolute',
        right: spacing.xl,
        borderRadius: 30,
        overflow: 'hidden',
        shadowColor: '#D4AF37',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 8,
    },
    fabGradient: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: spacing.xl,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    modalTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
    },
    modalLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.sm,
        marginTop: spacing.md,
    },
    input: {
        borderRadius: 12,
        padding: spacing.md,
        fontSize: typography.fontSize.base,
        borderWidth: 1,
    },
    inputMulti: {
        minHeight: 90,
        textAlignVertical: 'top',
    },

    // Level picker
    levelGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
    },
    levelChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 8,
        borderWidth: 1,
    },
    levelChipText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
    },

    // Submit
    submitBtn: {
        borderRadius: 14,
        overflow: 'hidden',
        marginTop: spacing.xl,
    },
    submitBtnDisabled: {
        opacity: 0.9,
    },
    submitBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: 14,
    },
    submitBtnText: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
    },
});
