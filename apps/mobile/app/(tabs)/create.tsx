import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    Keyboard,
    Dimensions,
    FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import Animated, {
    FadeIn,
    FadeOut,
    FadeInDown,
    FadeInUp,
    BounceIn,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withDelay,
    withTiming,
    withSequence,
    cancelAnimation,
    runOnJS,
    Layout,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { colors, typography, spacing, borderRadius } from '@zerog/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { Avatar } from '../../components';
import { useAuthStore, useFeedStore, useCommunitiesStore, mapApiPost } from '../../stores';
import { apiFetch, apiUpload, API } from '../../lib/api';
import type { Community } from '../../stores';
import { IMAGE_PLACEHOLDER, AVATAR_PLACEHOLDER } from '../../lib/imagePlaceholder';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDebounce } from '../../hooks/useDebounce';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_LENGTH = 2000;
const WARN_THRESHOLD = 1800;
const DANGER_THRESHOLD = 1950;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_POLL_OPTIONS = 6;
const MIN_POLL_OPTIONS = 2;

// ============================================
// Types
// ============================================

interface MediaItem {
    uri: string;
    type: 'image' | 'video';
    originalSize: number;
    compressedSize: number | null;
    width?: number;
    height?: number;
    fileName: string;
    uploadProgress: number;
    uploadError: string | null;
    isUploading: boolean;
    compressedUri: string | null;
}

interface PollOption {
    id: string;
    text: string;
}

interface SuggestionItem {
    id: string;
    label: string;
    subtitle?: string;
    avatarUrl?: string;
}

type PostVisibility = 'private' | 'community' | 'public';

interface VisibilityOption {
    key: PostVisibility;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    description: string;
}

const VISIBILITY_OPTIONS: VisibilityOption[] = [
    { key: 'private', label: 'Private', icon: 'lock-closed', description: 'Only you can see' },
    { key: 'community', label: 'Community', icon: 'people', description: 'Your communities' },
    { key: 'public', label: 'Public', icon: 'globe-outline', description: 'Everyone can see' },
];

// ============================================
// Image Compression Utility
// ============================================

async function compressImage(uri: string): Promise<{ uri: string; size: number }> {
    try {
        const result = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 1920 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        const info = await FileSystem.getInfoAsync(result.uri);
        return { uri: result.uri, size: info.exists && info.size ? info.size : 0 };
    } catch {
        return { uri, size: 0 }; // Fallback to original if compression fails
    }
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getMimeType(asset: ImagePicker.ImagePickerAsset): string {
    if (asset.type === 'video') return 'video/mp4';
    const ext = asset.uri.split('.').pop()?.toLowerCase();
    if (ext === 'png') return 'image/png';
    if (ext === 'gif') return 'image/gif';
    if (ext === 'webp') return 'image/webp';
    return 'image/jpeg';
}

// ============================================
// Media Bar Items
// ============================================

interface MediaBarItem {
    key: string;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    color?: string;
}

const MEDIA_BAR_ITEMS: MediaBarItem[] = [
    { key: 'photo', icon: 'image-outline', label: 'Photo', color: colors.emerald[400] },
    { key: 'video', icon: 'videocam-outline', label: 'Video', color: colors.azure[400] },
    { key: 'camera', icon: 'camera-outline', label: 'Camera', color: colors.gold[400] },
    { key: 'poll', icon: 'stats-chart-outline', label: 'Poll', color: colors.coral[400] },
    { key: 'location', icon: 'location-outline', label: 'Location', color: colors.amber[400] },
    // Import from connected platforms — hidden for v1.0
];

// ============================================
// Hashtag Suggestions (common trending tags)
// ============================================

const COMMON_HASHTAGS = [
    'community', 'faith', 'inspiration', 'daily', 'blessed',
    'gratitude', 'prayer', 'quran', 'sunnah', 'reminder',
    'halal', 'muslim', 'islam', 'dua', 'jummah',
    'ramadan', 'eid', 'charity', 'dawah', 'knowledge',
];

// ============================================
// Success Burst Particle
// ============================================

function SuccessParticle({ delay, angle, distance }: { delay: number; angle: number; distance: number }) {
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const opacity = useSharedValue(1);
    const scale = useSharedValue(0);

    useEffect(() => {
        scale.value = withDelay(delay, withSpring(1, { damping: 8 }));
        translateX.value = withDelay(delay, withSpring(x, { damping: 12 }));
        translateY.value = withDelay(delay, withSpring(y, { damping: 12 }));
        opacity.value = withDelay(delay + 400, withTiming(0, { duration: 300 }));
    }, []);

    const animStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[styles.particle, animStyle]}>
            <View style={styles.particleDot} />
        </Animated.View>
    );
}

// ============================================
// Success Screen with Checkmark Burst
// ============================================

function SuccessAnimation() {
    const particles = Array.from({ length: 12 }, (_, i) => ({
        angle: (i * Math.PI * 2) / 12,
        distance: 50 + Math.random() * 30,
        delay: i * 30,
    }));

    const checkScale = useSharedValue(0);

    useEffect(() => {
        checkScale.value = withDelay(200, withSpring(1, { damping: 6, stiffness: 120 }));
    }, []);

    const checkStyle = useAnimatedStyle(() => ({
        transform: [{ scale: checkScale.value }],
    }));

    return (
        <View style={styles.successContainer}>
            {particles.map((p, i) => (
                <SuccessParticle key={i} delay={p.delay} angle={p.angle} distance={p.distance} />
            ))}
            <Animated.View entering={BounceIn.duration(500)} style={checkStyle}>
                <View style={styles.successCircle}>
                    <Ionicons name="checkmark" size={48} color="#FFFFFF" />
                </View>
            </Animated.View>
            <Animated.Text entering={FadeIn.delay(400).duration(300)} style={styles.successText}>
                Posted!
            </Animated.Text>
            <Animated.Text entering={FadeIn.delay(600).duration(300)} style={styles.successSubtext}>
                Your post is now live
            </Animated.Text>
        </View>
    );
}

// ============================================
// Audience Selector Row
// ============================================

function AudienceSelector({
    selectedCommunity,
    communities,
    onSelectPersonal,
    onSelectCommunity,
}: {
    selectedCommunity: Community | null;
    communities: Community[];
    onSelectPersonal: () => void;
    onSelectCommunity: (c: Community) => void;
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <View style={styles.audienceSection}>
            <TouchableOpacity
                style={styles.audienceSelector}
                onPress={() => {
                    Haptics.selectionAsync();
                    setExpanded(!expanded);
                }}
                activeOpacity={0.7}
            >
                <View style={styles.audienceIconWrap}>
                    <Ionicons
                        name={selectedCommunity ? 'people' : 'person'}
                        size={14}
                        color={colors.gold[500]}
                    />
                </View>
                <Text style={styles.audienceText} numberOfLines={1}>
                    {selectedCommunity ? selectedCommunity.name : 'Personal Feed'}
                </Text>
                <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={colors.text.muted}
                />
            </TouchableOpacity>

            {expanded && (
                <Animated.View entering={FadeInDown.duration(200)} style={styles.audienceDropdown}>
                    <TouchableOpacity
                        style={[
                            styles.audienceOption,
                            !selectedCommunity && styles.audienceOptionActive,
                        ]}
                        onPress={() => {
                            onSelectPersonal();
                            setExpanded(false);
                            Haptics.selectionAsync();
                        }}
                    >
                        <Ionicons name="person" size={16} color={!selectedCommunity ? colors.gold[500] : colors.text.muted} />
                        <Text style={[styles.audienceOptionText, !selectedCommunity && styles.audienceOptionTextActive]}>
                            Personal Feed
                        </Text>
                        {!selectedCommunity && (
                            <Ionicons name="checkmark" size={16} color={colors.gold[500]} />
                        )}
                    </TouchableOpacity>

                    {communities.filter(c => c.role).map((community) => (
                        <TouchableOpacity
                            key={community.id}
                            style={[
                                styles.audienceOption,
                                selectedCommunity?.id === community.id && styles.audienceOptionActive,
                            ]}
                            onPress={() => {
                                onSelectCommunity(community);
                                setExpanded(false);
                                Haptics.selectionAsync();
                            }}
                        >
                            {community.avatarUrl ? (
                                <Image source={{ uri: community.avatarUrl }} style={styles.communityThumb} placeholder={AVATAR_PLACEHOLDER.blurhash} transition={AVATAR_PLACEHOLDER.transition} cachePolicy="memory-disk" />
                            ) : (
                                <View style={[styles.communityThumb, styles.communityThumbPlaceholder]}>
                                    <Text style={styles.communityThumbInitial}>
                                        {community.name.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.audienceOptionInfo}>
                                <Text
                                    style={[
                                        styles.audienceOptionText,
                                        selectedCommunity?.id === community.id && styles.audienceOptionTextActive,
                                    ]}
                                    numberOfLines={1}
                                >
                                    {community.name}
                                </Text>
                                <Text style={styles.audienceOptionSub}>
                                    {community.membersCount} members
                                </Text>
                            </View>
                            {selectedCommunity?.id === community.id && (
                                <Ionicons name="checkmark" size={16} color={colors.gold[500]} />
                            )}
                        </TouchableOpacity>
                    ))}

                    {communities.filter(c => c.role).length === 0 && (
                        <View style={styles.audienceOption}>
                            <Text style={styles.audienceOptionSub}>No communities joined yet</Text>
                        </View>
                    )}
                </Animated.View>
            )}
        </View>
    );
}

// ============================================
// Visibility Selector
// ============================================

function VisibilitySelector({
    visibility,
    onSelect,
}: {
    visibility: PostVisibility;
    onSelect: (v: PostVisibility) => void;
}) {
    return (
        <View style={styles.visibilityRow}>
            {VISIBILITY_OPTIONS.map((opt) => {
                const isActive = visibility === opt.key;
                return (
                    <TouchableOpacity
                        key={opt.key}
                        style={[styles.visibilityChip, isActive && styles.visibilityChipActive]}
                        onPress={() => {
                            Haptics.selectionAsync();
                            onSelect(opt.key);
                        }}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={opt.icon}
                            size={14}
                            color={isActive ? colors.gold[500] : colors.text.muted}
                        />
                        <Text style={[styles.visibilityLabel, isActive && styles.visibilityLabelActive]}>
                            {opt.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

// ============================================
// Character Counter with Ring
// ============================================

function CharacterCounter({ current, max }: { current: number; max: number }) {
    const remaining = max - current;
    const progress = current / max;
    const color =
        remaining <= max - DANGER_THRESHOLD
            ? colors.coral[500]
            : remaining <= max - WARN_THRESHOLD
                ? colors.gold[500]
                : colors.text.muted;

    const isNearLimit = remaining <= max - WARN_THRESHOLD;

    return (
        <View style={styles.charCountRow}>
            {isNearLimit ? (
                <Animated.View
                    entering={FadeIn.duration(200)}
                    style={[styles.charCountRing, { borderColor: color }]}
                >
                    <Text style={[styles.charCountRingText, { color }]}>{remaining}</Text>
                </Animated.View>
            ) : (
                <Text style={[styles.charCountText, { color }]}>
                    {current > 0 ? `${current}/${max}` : ''}
                </Text>
            )}
        </View>
    );
}

// ============================================
// Formatting Toolbar
// ============================================

function FormattingToolbar({
    onBold,
    onItalic,
    onStrikethrough,
}: {
    onBold: () => void;
    onItalic: () => void;
    onStrikethrough: () => void;
}) {
    return (
        <Animated.View entering={FadeIn.duration(200)} style={styles.formattingBar}>
            <TouchableOpacity
                style={styles.formatBtn}
                onPress={() => {
                    Haptics.selectionAsync();
                    onBold();
                }}
                activeOpacity={0.6}
            >
                <Text style={styles.formatBtnTextBold}>B</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.formatBtn}
                onPress={() => {
                    Haptics.selectionAsync();
                    onItalic();
                }}
                activeOpacity={0.6}
            >
                <Text style={styles.formatBtnTextItalic}>I</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.formatBtn}
                onPress={() => {
                    Haptics.selectionAsync();
                    onStrikethrough();
                }}
                activeOpacity={0.6}
            >
                <Text style={styles.formatBtnTextStrike}>S</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

// ============================================
// Suggestion Dropdown (Hashtags / Mentions)
// ============================================

function SuggestionDropdown({
    items,
    onSelect,
    type,
}: {
    items: SuggestionItem[];
    onSelect: (item: SuggestionItem) => void;
    type: 'hashtag' | 'mention';
}) {
    if (items.length === 0) return null;

    return (
        <Animated.View entering={FadeInDown.duration(150)} exiting={FadeOut.duration(100)} style={styles.suggestionsContainer}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestionsContent}
                keyboardShouldPersistTaps="always"
            >
                {items.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        style={styles.suggestionChip}
                        onPress={() => {
                            Haptics.selectionAsync();
                            onSelect(item);
                        }}
                        activeOpacity={0.7}
                    >
                        {type === 'mention' && item.avatarUrl ? (
                            <Image
                                source={{ uri: item.avatarUrl }}
                                style={styles.suggestionAvatar}
                                placeholder={AVATAR_PLACEHOLDER.blurhash}
                                transition={AVATAR_PLACEHOLDER.transition}
                                cachePolicy="memory-disk"
                            />
                        ) : (
                            <Ionicons
                                name={type === 'hashtag' ? 'pricetag' : 'person'}
                                size={12}
                                color={colors.gold[500]}
                            />
                        )}
                        <Text style={styles.suggestionText} numberOfLines={1}>
                            {type === 'hashtag' ? `#${item.label}` : `@${item.label}`}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </Animated.View>
    );
}

// ============================================
// Poll Creator
// ============================================

function PollCreator({
    options,
    onUpdateOption,
    onAddOption,
    onRemoveOption,
    onClose,
}: {
    options: PollOption[];
    onUpdateOption: (id: string, text: string) => void;
    onAddOption: () => void;
    onRemoveOption: (id: string) => void;
    onClose: () => void;
}) {
    return (
        <Animated.View entering={FadeInDown.springify()} style={styles.pollContainer}>
            <View style={styles.pollHeader}>
                <View style={styles.pollHeaderLeft}>
                    <Ionicons name="stats-chart" size={16} color={colors.coral[400]} />
                    <Text style={styles.pollTitle}>Create Poll</Text>
                </View>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={22} color={colors.text.muted} />
                </TouchableOpacity>
            </View>

            {options.map((option, index) => (
                <Animated.View
                    key={option.id}
                    entering={FadeInDown.delay(index * 50).duration(200)}
                    layout={Layout.springify()}
                    style={styles.pollOptionRow}
                >
                    <View style={styles.pollOptionNumber}>
                        <Text style={styles.pollOptionNumberText}>{index + 1}</Text>
                    </View>
                    <TextInput
                        style={styles.pollOptionInput}
                        placeholder={`Option ${index + 1}`}
                        placeholderTextColor={colors.text.muted}
                        value={option.text}
                        onChangeText={(text) => onUpdateOption(option.id, text)}
                        maxLength={80}
                        accessibilityLabel={`Poll option ${index + 1}`}
                    />
                    {options.length > MIN_POLL_OPTIONS && (
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.selectionAsync();
                                onRemoveOption(option.id);
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="remove-circle-outline" size={20} color={colors.coral[400]} />
                        </TouchableOpacity>
                    )}
                </Animated.View>
            ))}

            {options.length < MAX_POLL_OPTIONS && (
                <TouchableOpacity
                    style={styles.pollAddBtn}
                    onPress={() => {
                        Haptics.selectionAsync();
                        onAddOption();
                    }}
                    activeOpacity={0.7}
                >
                    <Ionicons name="add-circle-outline" size={18} color={colors.gold[500]} />
                    <Text style={styles.pollAddText}>Add option</Text>
                </TouchableOpacity>
            )}
        </Animated.View>
    );
}

// ============================================
// Location Tag
// ============================================

function LocationTag({
    location,
    onRemove,
}: {
    location: string;
    onRemove: () => void;
}) {
    return (
        <Animated.View entering={FadeIn.duration(200)} style={styles.locationTag}>
            <Ionicons name="location" size={14} color={colors.amber[400]} />
            <Text style={styles.locationTagText} numberOfLines={1}>{location}</Text>
            <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={14} color={colors.text.muted} />
            </TouchableOpacity>
        </Animated.View>
    );
}

// ============================================
// Draggable Media Item with Gesture Reordering
// ============================================

function DraggableMediaItem({
    item,
    index,
    onRemove,
    onRetry,
    onMoveLeft,
    onMoveRight,
    isFirst,
    isLast,
    totalCount,
}: {
    item: MediaItem;
    index: number;
    onRemove: () => void;
    onRetry: () => void;
    onMoveLeft: () => void;
    onMoveRight: () => void;
    isFirst: boolean;
    isLast: boolean;
    totalCount: number;
}) {
    const dragX = useSharedValue(0);
    const dragScale = useSharedValue(1);
    const isDragging = useSharedValue(false);

    const panGesture = Gesture.Pan()
        .activateAfterLongPress(250)
        .onStart(() => {
            isDragging.value = true;
            dragScale.value = withSpring(1.08, { damping: 10 });
            runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
        })
        .onUpdate((e) => {
            dragX.value = e.translationX;
        })
        .onEnd((e) => {
            const THRESHOLD = 50;
            if (e.translationX < -THRESHOLD && !isLast) {
                runOnJS(onMoveRight)();
                runOnJS(Haptics.selectionAsync)();
            } else if (e.translationX > THRESHOLD && !isFirst) {
                runOnJS(onMoveLeft)();
                runOnJS(Haptics.selectionAsync)();
            }
            dragX.value = withSpring(0, { damping: 15 });
            dragScale.value = withSpring(1, { damping: 10 });
            isDragging.value = false;
        });

    const dragAnimStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: dragX.value },
            { scale: dragScale.value },
        ],
        zIndex: isDragging.value ? 100 : 1,
        opacity: isDragging.value ? 0.92 : 1,
    }));

    // Upload progress ring value
    const progressWidth = item.isUploading ? `${Math.round(item.uploadProgress * 100)}%` : '0%';

    return (
        <GestureDetector gesture={panGesture}>
            <Animated.View
                entering={FadeInDown.delay(index * 60).springify()}
                layout={Layout.springify()}
                style={[styles.mediaStripItem, dragAnimStyle]}
            >
                <Image
                    source={{ uri: item.compressedUri || item.uri }}
                    style={styles.mediaStripThumb}
                    contentFit="cover"
                    placeholder={IMAGE_PLACEHOLDER.blurhash}
                    transition={200}
                    cachePolicy="memory-disk"
                />

                {/* Upload progress overlay */}
                {item.isUploading && (
                    <View style={styles.mediaUploadOverlay}>
                        <ActivityIndicator size="small" color={colors.gold[500]} />
                        <Text style={styles.mediaUploadProgressText}>
                            {Math.round(item.uploadProgress * 100)}%
                        </Text>
                        {/* Progress bar at bottom of thumbnail */}
                        <View style={styles.mediaProgressBarBg}>
                            <View style={[styles.mediaProgressBarFill, { width: progressWidth }]} />
                        </View>
                    </View>
                )}

                {/* Error overlay with retry */}
                {item.uploadError && !item.isUploading && (
                    <View style={[styles.mediaUploadOverlay, styles.mediaErrorOverlay]}>
                        <Ionicons name="alert-circle" size={20} color={colors.coral[400]} />
                        <Text style={styles.mediaErrorText}>{item.uploadError}</Text>
                        <TouchableOpacity
                            style={styles.mediaRetryBtn}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onRetry();
                            }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="refresh" size={12} color={colors.text.primary} />
                            <Text style={styles.mediaRetryText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Video badge */}
                {item.type === 'video' && (
                    <View style={styles.mediaStripVideoTag}>
                        <Ionicons name="videocam" size={10} color={colors.text.primary} />
                        <Text style={styles.mediaStripVideoLabel}>Video</Text>
                    </View>
                )}

                {/* File info: size + type */}
                <View style={styles.mediaInfoOverlay}>
                    <Text style={styles.mediaInfoText}>
                        {item.compressedSize !== null && item.compressedSize > 0
                            ? formatFileSize(item.compressedSize)
                            : formatFileSize(item.originalSize)}
                    </Text>
                    <Text style={styles.mediaInfoTypeText}>
                        {item.type === 'video' ? 'MP4' : (item.fileName.split('.').pop()?.toUpperCase() || 'IMG')}
                    </Text>
                </View>

                {/* Compression savings badge with original→compressed */}
                {item.compressedSize !== null && item.compressedSize > 0 && item.originalSize > 0 && (
                    <View style={styles.compressionBadge}>
                        <Ionicons name="arrow-down" size={8} color={colors.emerald[400]} />
                        <Text style={styles.compressionText}>
                            {Math.round((1 - item.compressedSize / item.originalSize) * 100)}%
                        </Text>
                        <Text style={styles.compressionDetailText}>
                            {formatFileSize(item.originalSize)}→{formatFileSize(item.compressedSize)}
                        </Text>
                    </View>
                )}

                {/* Remove button */}
                <TouchableOpacity
                    style={styles.mediaStripRemoveBtn}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onRemove();
                    }}
                    activeOpacity={0.7}
                >
                    <Ionicons name="close" size={12} color={colors.text.primary} />
                </TouchableOpacity>

                {/* Drag handle indicator (visible when multiple items) */}
                {totalCount > 1 && (
                    <View style={styles.dragHandleIndicator}>
                        <View style={styles.dragHandleDot} />
                        <View style={styles.dragHandleDot} />
                        <View style={styles.dragHandleDot} />
                    </View>
                )}

                {/* Reorder arrows (tap fallback) */}
                {totalCount > 1 && (
                    <View style={styles.reorderControls}>
                        {!isFirst && (
                            <TouchableOpacity
                                style={styles.reorderBtn}
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    onMoveLeft();
                                }}
                            >
                                <Ionicons name="chevron-back" size={12} color={colors.text.primary} />
                            </TouchableOpacity>
                        )}
                        {!isLast && (
                            <TouchableOpacity
                                style={styles.reorderBtn}
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    onMoveRight();
                                }}
                            >
                                <Ionicons name="chevron-forward" size={12} color={colors.text.primary} />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </Animated.View>
        </GestureDetector>
    );
}

// ============================================
// Main Create Screen
// ============================================

export default function CreateScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: c } = useTheme();
    const user = useAuthStore((s) => s.user);
    const addPost = useFeedStore((s) => s.addPost);
    const communities = useCommunitiesStore((s) => s.communities);
    const fetchCommunities = useCommunitiesStore((s) => s.fetchCommunities);

    const textInputRef = useRef<TextInput>(null);
    const scrollRef = useRef<ScrollView>(null);
    const successTimerRef = useRef<ReturnType<typeof setTimeout>>();

    // --- Core State ---
    const [content, setContent] = useState('');
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [visibility, setVisibility] = useState<PostVisibility>('public');
    const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [draftSavedVisible, setDraftSavedVisible] = useState(false);

    // --- Poll State ---
    const [showPoll, setShowPoll] = useState(false);
    const [pollOptions, setPollOptions] = useState<PollOption[]>([
        { id: '1', text: '' },
        { id: '2', text: '' },
    ]);

    // --- Location State ---
    const [locationName, setLocationName] = useState<string | null>(null);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);

    // --- Suggestion State ---
    const [hashtagSuggestions, setHashtagSuggestions] = useState<SuggestionItem[]>([]);
    const [mentionSuggestions, setMentionSuggestions] = useState<SuggestionItem[]>([]);
    const [activeSuggestionType, setActiveSuggestionType] = useState<'hashtag' | 'mention' | null>(null);
    const [cursorPosition, setCursorPosition] = useState(0);

    // --- Publish retry limit ---
    const publishRetryCount = useRef(0);
    const MAX_PUBLISH_RETRIES = 3;

    // --- Publish button animation with idle pulse ---
    const publishScale = useSharedValue(1);
    const publishGlow = useSharedValue(1);

    // Subtle scale pulse when content is ready to post
    const hasPublishableContent = content.trim().length > 0 || mediaItems.length > 0 || showPoll;
    useEffect(() => {
        if (hasPublishableContent && !isPublishing) {
            publishGlow.value = withDelay(
                400,
                withSequence(
                    withSpring(1.04, { damping: 8, stiffness: 120 }),
                    withSpring(1, { damping: 10, stiffness: 100 }),
                ),
            );
        } else {
            publishGlow.value = withTiming(1, { duration: 200 });
        }
        return () => {
            cancelAnimation(publishGlow);
        };
    }, [hasPublishableContent, isPublishing]);

    const publishAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: publishScale.value * publishGlow.value }],
    }));

    // --- Draft auto-save ---
    const DRAFT_KEY = '@post-draft';
    const debouncedContent = useDebounce(content, 5000);
    const debouncedCommunityId = useDebounce(selectedCommunity?.id, 5000);

    // Restore draft on mount
    useEffect(() => {
        AsyncStorage.getItem(DRAFT_KEY).then((raw) => {
            if (!raw) return;
            try {
                const draft = JSON.parse(raw) as { content: string; communityId?: string; timestamp: number };
                if (Date.now() - draft.timestamp < 24 * 60 * 60 * 1000 && draft.content) {
                    setContent(draft.content);
                }
            } catch {
                // Ignore corrupt draft
            }
        }).catch(() => { /* non-critical */ });
    }, []);

    // Auto-save draft when debounced content changes
    useEffect(() => {
        if (!debouncedContent.trim()) return;
        const draft = {
            content: debouncedContent,
            communityId: debouncedCommunityId || undefined,
            timestamp: Date.now(),
        };
        AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft)).then(() => {
            setDraftSavedVisible(true);
            const timer = setTimeout(() => setDraftSavedVisible(false), 2000);
            return () => clearTimeout(timer);
        }).catch(() => { /* non-critical: draft save failed */ });
    }, [debouncedContent, debouncedCommunityId]);

    const clearDraft = useCallback(() => {
        AsyncStorage.removeItem(DRAFT_KEY).catch(() => { /* non-critical */ });
    }, []);

    // --- Load communities on mount ---
    useEffect(() => {
        fetchCommunities();
    }, []);

    // --- Auto-focus text input on mount ---
    useEffect(() => {
        const timer = setTimeout(() => {
            textInputRef.current?.focus();
        }, 300);
        return () => clearTimeout(timer);
    }, []);

    // --- Cleanup success timer on unmount ---
    useEffect(() => {
        return () => {
            if (successTimerRef.current) clearTimeout(successTimerRef.current);
        };
    }, []);

    // ============================================
    // Text Analysis for Suggestions
    // ============================================

    const handleTextChange = useCallback((text: string) => {
        setContent(text);

        // Find the word being typed at cursor position
        const beforeCursor = text.slice(0, cursorPosition + (text.length - content.length));
        const words = beforeCursor.split(/\s/);
        const currentWord = words[words.length - 1] || '';

        if (currentWord.startsWith('#') && currentWord.length > 1) {
            const query = currentWord.slice(1).toLowerCase();
            const matches = COMMON_HASHTAGS
                .filter(tag => tag.startsWith(query))
                .slice(0, 8)
                .map(tag => ({ id: tag, label: tag }));
            setHashtagSuggestions(matches);
            setMentionSuggestions([]);
            setActiveSuggestionType(matches.length > 0 ? 'hashtag' : null);
        } else if (currentWord.startsWith('@') && currentWord.length > 1) {
            const query = currentWord.slice(1).toLowerCase();
            // Search for users via API
            fetchMentionSuggestions(query);
            setHashtagSuggestions([]);
            setActiveSuggestionType('mention');
        } else {
            setHashtagSuggestions([]);
            setMentionSuggestions([]);
            setActiveSuggestionType(null);
        }
    }, [content, cursorPosition]);

    const fetchMentionSuggestions = useCallback(async (query: string) => {
        if (query.length < 2) {
            setMentionSuggestions([]);
            return;
        }
        try {
            const data = await apiFetch<any>(`${API.search}?q=${encodeURIComponent(query)}&type=users&limit=6`, { cache: true, cacheTtl: 10000 });
            const users = data.users || data.results || [];
            setMentionSuggestions(
                users.map((u: any) => ({
                    id: u.id || u.username,
                    label: u.username || u.displayName,
                    subtitle: u.displayName,
                    avatarUrl: u.avatarUrl,
                }))
            );
        } catch {
            setMentionSuggestions([]);
        }
    }, []);

    const handleSuggestionSelect = useCallback((item: SuggestionItem) => {
        const beforeCursor = content.slice(0, cursorPosition);
        const afterCursor = content.slice(cursorPosition);
        const words = beforeCursor.split(/\s/);
        const currentWord = words[words.length - 1] || '';

        const prefix = activeSuggestionType === 'hashtag' ? '#' : '@';
        const replacement = `${prefix}${item.label} `;
        const newBefore = beforeCursor.slice(0, beforeCursor.length - currentWord.length) + replacement;

        setContent(newBefore + afterCursor);
        setHashtagSuggestions([]);
        setMentionSuggestions([]);
        setActiveSuggestionType(null);
    }, [content, cursorPosition, activeSuggestionType]);

    // ============================================
    // Rich Text Formatting
    // ============================================

    const insertFormatting = useCallback((wrapper: string) => {
        const before = content.slice(0, cursorPosition);
        const after = content.slice(cursorPosition);
        const insertion = `${wrapper}text${wrapper}`;
        setContent(before + insertion + after);
    }, [content, cursorPosition]);

    const handleBold = useCallback(() => insertFormatting('**'), [insertFormatting]);
    const handleItalic = useCallback(() => insertFormatting('_'), [insertFormatting]);
    const handleStrikethrough = useCallback(() => insertFormatting('~~'), [insertFormatting]);

    // ============================================
    // Media Handlers
    // ============================================

    const processAssets = useCallback(async (assets: ImagePicker.ImagePickerAsset[]) => {
        const newItems: MediaItem[] = [];

        for (const asset of assets) {
            const fileInfo = await FileSystem.getInfoAsync(asset.uri);
            const originalSize = fileInfo.exists && fileInfo.size ? fileInfo.size : 0;

            if (originalSize > MAX_FILE_SIZE) {
                Alert.alert('File Too Large', `${asset.uri.split('/').pop()} exceeds the 50MB limit.`);
                continue;
            }

            const item: MediaItem = {
                uri: asset.uri,
                type: asset.type === 'video' ? 'video' : 'image',
                originalSize,
                compressedSize: null,
                width: asset.width,
                height: asset.height,
                fileName: asset.uri.split('/').pop() || 'media',
                uploadProgress: 0,
                uploadError: null,
                isUploading: false,
                compressedUri: null,
            };

            // Compress images in background
            if (item.type === 'image') {
                const compressed = await compressImage(asset.uri);
                item.compressedUri = compressed.uri;
                item.compressedSize = compressed.size;
            }

            newItems.push(item);
        }

        setMediaItems(prev => {
            const combined = [...prev, ...newItems].slice(0, 4);
            return combined;
        });
    }, []);

    const handlePickPhoto = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsMultipleSelection: true,
            selectionLimit: 4 - mediaItems.length,
            quality: 0.8,
            allowsEditing: false,
            videoMaxDuration: 120,
        });
        if (!result.canceled && result.assets.length > 0) {
            processAssets(result.assets);
        }
    }, [mediaItems.length, processAssets]);

    const handlePickVideo = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['videos'],
            allowsEditing: true,
            quality: 0.8,
            videoMaxDuration: 120,
        });
        if (!result.canceled && result.assets[0]) {
            processAssets(result.assets);
        }
    }, [processAssets]);

    const handleTakePhoto = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Camera access is needed to take photos.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
        if (!result.canceled && result.assets[0]) {
            processAssets(result.assets);
        }
    }, [processAssets]);

    const handleRemoveMedia = useCallback((index: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setMediaItems(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleRetryMedia = useCallback((index: number) => {
        // Clear the error state so the item can be retried during publish
        setMediaItems(prev => prev.map((m, i) =>
            i === index ? { ...m, uploadError: null, uploadProgress: 0 } : m
        ));
    }, []);

    const handleMoveMedia = useCallback((fromIndex: number, toIndex: number) => {
        if (toIndex < 0 || toIndex >= mediaItems.length) return;
        setMediaItems(prev => {
            const updated = [...prev];
            const [moved] = updated.splice(fromIndex, 1);
            updated.splice(toIndex, 0, moved);
            return updated;
        });
    }, [mediaItems.length]);

    // ============================================
    // Poll Handlers
    // ============================================

    const handleTogglePoll = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (showPoll) {
            setShowPoll(false);
            setPollOptions([{ id: '1', text: '' }, { id: '2', text: '' }]);
        } else {
            setShowPoll(true);
        }
    }, [showPoll]);

    const handleUpdatePollOption = useCallback((id: string, text: string) => {
        setPollOptions(prev => prev.map(o => o.id === id ? { ...o, text } : o));
    }, []);

    const handleAddPollOption = useCallback(() => {
        if (pollOptions.length >= MAX_POLL_OPTIONS) return;
        setPollOptions(prev => [...prev, { id: String(Date.now()), text: '' }]);
    }, [pollOptions.length]);

    const handleRemovePollOption = useCallback((id: string) => {
        if (pollOptions.length <= MIN_POLL_OPTIONS) return;
        setPollOptions(prev => prev.filter(o => o.id !== id));
    }, [pollOptions.length]);

    // ============================================
    // Location Handler
    // ============================================

    const handleLocation = useCallback(async () => {
        if (locationName) {
            setLocationName(null);
            Haptics.selectionAsync();
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsLoadingLocation(true);

        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Location access is needed to tag your location.');
                setIsLoadingLocation(false);
                return;
            }

            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const [place] = await Location.reverseGeocodeAsync({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
            });

            if (place) {
                const parts = [place.name, place.city, place.region].filter(Boolean);
                setLocationName(parts.join(', ') || 'Current Location');
            } else {
                setLocationName('Current Location');
            }
        } catch {
            Alert.alert('Location Error', 'Could not determine your location. Please try again.');
        } finally {
            setIsLoadingLocation(false);
        }
    }, [locationName]);

    const handleImportFromPlatform = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            'Import from Platform',
            'Connect your social accounts to import posts from LinkedIn, X, Instagram, and more.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Connect Accounts',
                    onPress: () => router.push('/settings/connected-accounts' as any),
                },
            ]
        );
    }, [router]);

    const handleMediaBarPress = useCallback((key: string) => {
        switch (key) {
            case 'photo': return handlePickPhoto();
            case 'video': return handlePickVideo();
            case 'camera': return handleTakePhoto();
            case 'poll': return handleTogglePoll();
            case 'location': return handleLocation();
            case 'import': return handleImportFromPlatform();
        }
    }, [handlePickPhoto, handlePickVideo, handleTakePhoto, handleTogglePoll, handleLocation, handleImportFromPlatform]);

    // ============================================
    // Discard / Cancel
    // ============================================

    const handleCancel = useCallback(() => {
        const hasContent = content.trim() || mediaItems.length > 0 || showPoll;
        if (hasContent) {
            Alert.alert(
                'Discard Post?',
                'Your draft will be saved automatically.',
                [
                    { text: 'Keep Editing', style: 'cancel' },
                    {
                        text: 'Discard',
                        style: 'destructive',
                        onPress: () => {
                            // Save draft before leaving
                            if (content.trim()) {
                                const draft = { content, communityId: selectedCommunity?.id, timestamp: Date.now() };
                                AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft)).catch(() => { /* non-critical */ });
                            }
                            router.back();
                        },
                    },
                ],
            );
        } else {
            router.back();
        }
    }, [content, mediaItems, showPoll, selectedCommunity, router]);

    // ============================================
    // Upload Single Media with Retry
    // ============================================

    const uploadSingleMedia = useCallback(async (
        item: MediaItem,
        index: number,
        onProgress: (progress: number) => void,
    ): Promise<{ url: string; type: string } | null> => {
        const maxRetries = 2;
        let lastError: string | null = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                setMediaItems(prev => prev.map((m, i) =>
                    i === index ? { ...m, isUploading: true, uploadError: null } : m
                ));

                const uriToUpload = item.compressedUri || item.uri;
                const mimeType = getMimeType({ uri: uriToUpload, type: item.type } as any);
                const result = await apiUpload(
                    API.uploadPost,
                    uriToUpload,
                    mimeType,
                    item.fileName,
                    (progress) => {
                        onProgress(progress);
                        setMediaItems(prev => prev.map((m, i) =>
                            i === index ? { ...m, uploadProgress: progress } : m
                        ));
                    },
                );

                setMediaItems(prev => prev.map((m, i) =>
                    i === index ? { ...m, isUploading: false, uploadProgress: 1 } : m
                ));

                return {
                    url: result.url,
                    type: result.type || (item.type === 'video' ? 'VIDEO' : 'IMAGE'),
                };
            } catch (error: unknown) {
                lastError = error instanceof Error ? error.message : 'Upload failed';
                if (attempt < maxRetries) {
                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                }
            }
        }

        setMediaItems(prev => prev.map((m, i) =>
            i === index ? { ...m, isUploading: false, uploadError: lastError } : m
        ));
        return null;
    }, []);

    // ============================================
    // Publish
    // ============================================

    const handlePublish = useCallback(async () => {
        if (!content.trim() && mediaItems.length === 0 && !showPoll) return;

        // Validate poll
        if (showPoll) {
            const filledOptions = pollOptions.filter(o => o.text.trim());
            if (filledOptions.length < MIN_POLL_OPTIONS) {
                Alert.alert('Incomplete Poll', `Please fill in at least ${MIN_POLL_OPTIONS} poll options.`);
                return;
            }
        }

        Keyboard.dismiss();
        setIsPublishing(true);

        // Animate publish button
        publishScale.value = withSequence(
            withTiming(0.9, { duration: 100 }),
            withTiming(1, { duration: 100 }),
        );
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const uploadedItems: Array<{ url: string; type: string; thumbnailUrl?: string; duration?: number }> = [];
            let primaryMediaUrl: string | undefined;
            let primaryMediaType: string | undefined;

            // Upload ALL media items
            if (mediaItems.length > 0) {
                setUploadProgress(5);
                const progressPerItem = 75 / mediaItems.length;

                for (let i = 0; i < mediaItems.length; i++) {
                    const result = await uploadSingleMedia(
                        mediaItems[i],
                        i,
                        (progress) => setUploadProgress(5 + (i * progressPerItem) + progress * progressPerItem),
                    );

                    if (!result) {
                        const hasErrors = mediaItems.some(m => m.uploadError);
                        if (hasErrors) {
                            if (publishRetryCount.current >= MAX_PUBLISH_RETRIES) {
                                publishRetryCount.current = 0;
                                Alert.alert('Upload Failed', `Media upload failed after ${MAX_PUBLISH_RETRIES} attempts. Please try again later.`);
                                setIsPublishing(false);
                            } else {
                                Alert.alert(
                                    'Upload Failed',
                                    `Media ${i + 1} of ${mediaItems.length} failed to upload. Would you like to retry? (${MAX_PUBLISH_RETRIES - publishRetryCount.current} attempts remaining)`,
                                    [
                                        { text: 'Cancel', style: 'cancel', onPress: () => { setIsPublishing(false); publishRetryCount.current = 0; } },
                                        { text: 'Retry', onPress: () => { publishRetryCount.current++; handlePublish(); } },
                                    ]
                                );
                            }
                            return;
                        }
                    } else {
                        uploadedItems.push(result);
                    }
                }

                // Primary media = first item (for backwards compatibility)
                if (uploadedItems.length > 0) {
                    primaryMediaUrl = uploadedItems[0].url;
                    primaryMediaType = uploadedItems[0].type;
                }
                setUploadProgress(80);
            }

            // Determine post type
            let postType: string;
            if (uploadedItems.length > 1) {
                // Multiple items = carousel
                postType = 'CAROUSEL';
            } else if (primaryMediaType === 'VIDEO') {
                postType = 'VIDEO';
            } else if (primaryMediaType === 'IMAGE') {
                postType = 'IMAGE';
            } else if (showPoll) {
                postType = 'POLL';
            } else {
                postType = 'TEXT';
            }

            const postData: Record<string, any> = {
                caption: content.trim(),
                type: postType,
                visibility,
            };
            if (primaryMediaUrl) postData.mediaUrl = primaryMediaUrl;
            if (selectedCommunity) postData.communityId = selectedCommunity.id;
            if (linkUrl.trim()) postData.linkUrl = linkUrl.trim();
            if (locationName) postData.location = locationName;

            // Send all media items for carousel/multi-media posts
            if (uploadedItems.length > 1) {
                postData.mediaItems = uploadedItems.map((item, idx) => ({
                    mediaUrl: item.url,
                    thumbnailUrl: item.thumbnailUrl,
                    type: item.type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
                    duration: item.duration,
                }));
            }

            // Add poll data
            if (showPoll) {
                const filledOptions = pollOptions.filter(o => o.text.trim());
                postData.pollOptions = filledOptions.map(o => o.text.trim());
            }

            const result = await apiFetch<any>(API.posts, {
                method: 'POST',
                body: JSON.stringify(postData),
            });
            setUploadProgress(100);

            const rawPost = result.post || result.data || result;
            if (rawPost?.id) addPost(mapApiPost(rawPost));

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Clear saved draft on successful publish
            clearDraft();

            // Show success animation
            setShowSuccess(true);
            if (successTimerRef.current) clearTimeout(successTimerRef.current);
            successTimerRef.current = setTimeout(() => {
                setContent('');
                setMediaItems([]);
                setUploadProgress(0);
                setShowSuccess(false);
                setLinkUrl('');
                setShowLinkInput(false);
                setSelectedCommunity(null);
                setShowPoll(false);
                setPollOptions([{ id: '1', text: '' }, { id: '2', text: '' }]);
                setLocationName(null);
                router.push('/(tabs)');
            }, 1200);
        } catch (error: unknown) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            if (publishRetryCount.current >= MAX_PUBLISH_RETRIES) {
                publishRetryCount.current = 0;
                Alert.alert('Publishing Failed', `Failed after ${MAX_PUBLISH_RETRIES} attempts. Please try again later.`);
            } else {
                Alert.alert(
                    'Publishing Failed',
                    error instanceof Error ? error.message : 'Failed to publish post. Please try again.',
                    [
                        { text: 'OK', style: 'cancel', onPress: () => { publishRetryCount.current = 0; } },
                        { text: 'Retry', onPress: () => { publishRetryCount.current++; handlePublish(); } },
                    ]
                );
            }
        } finally {
            setIsPublishing(false);
            setUploadProgress(0);
        }
    }, [content, mediaItems, visibility, selectedCommunity, linkUrl, showPoll, pollOptions, locationName, addPost, router, clearDraft, publishScale, uploadSingleMedia]);

    // ============================================
    // Derived State
    // ============================================

    const canPublish = (content.trim().length > 0 || mediaItems.length > 0 || (showPoll && pollOptions.filter(o => o.text.trim()).length >= MIN_POLL_OPTIONS)) && !isPublishing;

    const suggestions = activeSuggestionType === 'hashtag' ? hashtagSuggestions : mentionSuggestions;

    // ============================================
    // Success Screen
    // ============================================

    if (showSuccess) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: c.obsidian[900] }]}>
                <LinearGradient
                    colors={[c.obsidian[900], c.obsidian[800]]}
                    style={StyleSheet.absoluteFill}
                />
                <SuccessAnimation />
            </View>
        );
    }

    // ============================================
    // Main Composer
    // ============================================

    return (
        <View style={[styles.container, { backgroundColor: c.obsidian[900] }]}>
            <LinearGradient
                colors={[c.obsidian[900], c.obsidian[800]]}
                style={StyleSheet.absoluteFill}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
                keyboardVerticalOffset={0}
            >
                {/* ======== Header ======== */}
                <Animated.View
                    entering={FadeIn.duration(200)}
                    style={[styles.header, { paddingTop: insets.top + spacing.sm }]}
                >
                    <TouchableOpacity
                        onPress={handleCancel}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>

                    <Animated.View style={publishAnimStyle}>
                        <TouchableOpacity
                            style={[
                                styles.publishBtn,
                                canPublish ? styles.publishBtnActive : styles.publishBtnDisabled,
                            ]}
                            onPress={handlePublish}
                            disabled={!canPublish}
                            activeOpacity={0.8}
                        >
                            {canPublish && (
                                <LinearGradient
                                    colors={[colors.gold[400], colors.gold[600]]}
                                    style={StyleSheet.absoluteFill}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                />
                            )}
                            {isPublishing ? (
                                <View style={styles.publishingRow}>
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                    <Text style={styles.publishingText}>
                                        {uploadProgress > 0 ? `${Math.round(uploadProgress)}%` : ''}
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.publishContentRow}>
                                    <Ionicons name="send" size={14} color={canPublish ? '#FFFFFF' : colors.text.muted} />
                                    <Text
                                        style={[
                                            styles.publishText,
                                            !canPublish && styles.publishTextDisabled,
                                        ]}
                                    >
                                        Post
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                </Animated.View>

                {/* ======== Upload Progress ======== */}
                {isPublishing && uploadProgress > 0 && (
                    <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} style={styles.progressBar}>
                        <Animated.View
                            style={[styles.progressFill, { width: `${uploadProgress}%` }]}
                        />
                    </Animated.View>
                )}

                {/* ======== Scrollable Composer Body ======== */}
                <ScrollView
                    ref={scrollRef}
                    style={styles.flex}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Audience & Visibility Selectors */}
                    <Animated.View entering={FadeInDown.delay(50).duration(200)} style={styles.metaRow}>
                        <AudienceSelector
                            selectedCommunity={selectedCommunity}
                            communities={communities}
                            onSelectPersonal={() => setSelectedCommunity(null)}
                            onSelectCommunity={setSelectedCommunity}
                        />
                        <VisibilitySelector visibility={visibility} onSelect={setVisibility} />
                    </Animated.View>

                    {/* Location Tag */}
                    {locationName && (
                        <LocationTag location={locationName} onRemove={() => setLocationName(null)} />
                    )}

                    {/* Composer Area */}
                    <View style={styles.composerRow}>
                        <Avatar
                            uri={user?.avatarUrl}
                            name={user?.displayName || '?'}
                            size="md"
                            style={{ marginTop: spacing.xxs }}
                        />
                        <View style={styles.composerContent}>
                            <Text style={styles.userName}>
                                {user?.displayName || 'You'}
                            </Text>
                            <TextInput
                                ref={textInputRef}
                                style={styles.textInput}
                                placeholder="What's on your mind?"
                                placeholderTextColor={colors.text.muted}
                                multiline
                                maxLength={MAX_LENGTH}
                                value={content}
                                onChangeText={handleTextChange}
                                onSelectionChange={(e) => setCursorPosition(e.nativeEvent.selection.end)}
                                textAlignVertical="top"
                                scrollEnabled={false}
                                accessibilityLabel="Post content"
                            />
                        </View>
                    </View>

                    {/* Suggestions */}
                    {activeSuggestionType && suggestions.length > 0 && (
                        <SuggestionDropdown
                            items={suggestions}
                            onSelect={handleSuggestionSelect}
                            type={activeSuggestionType}
                        />
                    )}

                    {/* Formatting Toolbar + Character Counter */}
                    <View style={styles.counterDraftRow}>
                        <FormattingToolbar onBold={handleBold} onItalic={handleItalic} onStrikethrough={handleStrikethrough} />
                        <View style={styles.counterDraftRight}>
                            <CharacterCounter current={content.length} max={MAX_LENGTH} />
                            {draftSavedVisible && (
                                <Animated.Text
                                    entering={FadeIn.duration(200)}
                                    exiting={FadeOut.duration(200)}
                                    style={styles.draftSavedText}
                                >
                                    Draft saved
                                </Animated.Text>
                            )}
                        </View>
                    </View>

                    {/* Link URL Input */}
                    {showLinkInput && (
                        <Animated.View entering={FadeInDown.duration(200)} style={styles.linkInputWrap}>
                            <Ionicons name="link" size={16} color={colors.text.muted} />
                            <TextInput
                                style={styles.linkInput}
                                placeholder="Paste a URL..."
                                placeholderTextColor={colors.text.muted}
                                value={linkUrl}
                                onChangeText={setLinkUrl}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="url"
                                accessibilityLabel="Link URL"
                            />
                            {linkUrl.length > 0 && (
                                <TouchableOpacity onPress={() => setLinkUrl('')}>
                                    <Ionicons name="close-circle" size={18} color={colors.text.muted} />
                                </TouchableOpacity>
                            )}
                        </Animated.View>
                    )}

                    {/* Poll Creator */}
                    {showPoll && (
                        <PollCreator
                            options={pollOptions}
                            onUpdateOption={handleUpdatePollOption}
                            onAddOption={handleAddPollOption}
                            onRemoveOption={handleRemovePollOption}
                            onClose={handleTogglePoll}
                        />
                    )}

                    {/* Media Preview Strip */}
                    {mediaItems.length > 0 && (
                        <Animated.View entering={FadeInDown.springify()} style={styles.mediaStripContainer}>
                            <View style={styles.mediaStripHeader}>
                                <Text style={styles.mediaStripTitle}>
                                    {mediaItems.length} {mediaItems.length === 1 ? 'item' : 'items'}
                                </Text>
                                {mediaItems.length < 4 && (
                                    <TouchableOpacity
                                        style={styles.mediaAddMoreBtn}
                                        onPress={handlePickPhoto}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="add" size={16} color={colors.gold[500]} />
                                        <Text style={styles.mediaAddMoreText}>Add more</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.mediaStripContent}
                            >
                                {mediaItems.map((item, index) => (
                                    <DraggableMediaItem
                                        key={`${item.uri}-${index}`}
                                        item={item}
                                        index={index}
                                        onRemove={() => handleRemoveMedia(index)}
                                        onRetry={() => handleRetryMedia(index)}
                                        onMoveLeft={() => handleMoveMedia(index, index - 1)}
                                        onMoveRight={() => handleMoveMedia(index, index + 1)}
                                        isFirst={index === 0}
                                        isLast={index === mediaItems.length - 1}
                                        totalCount={mediaItems.length}
                                    />
                                ))}
                            </ScrollView>
                        </Animated.View>
                    )}
                </ScrollView>

                {/* ======== Bottom Media Bar ======== */}
                <Animated.View
                    entering={FadeInUp.duration(200)}
                    style={[styles.mediaBar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}
                >
                    <View style={styles.mediaBarDivider} />
                    <View style={styles.mediaBarRow}>
                        {MEDIA_BAR_ITEMS.map((item) => {
                            const isActive =
                                (item.key === 'poll' && showPoll) ||
                                (item.key === 'location' && !!locationName);
                            return (
                                <TouchableOpacity
                                    key={item.key}
                                    style={[styles.mediaBarItem, isActive && styles.mediaBarItemActive]}
                                    onPress={() => handleMediaBarPress(item.key)}
                                    activeOpacity={0.6}
                                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                                >
                                    {item.key === 'location' && isLoadingLocation ? (
                                        <ActivityIndicator size="small" color={item.color} />
                                    ) : (
                                        <Ionicons
                                            name={item.icon}
                                            size={22}
                                            color={isActive ? colors.gold[500] : (item.color || colors.text.secondary)}
                                        />
                                    )}
                                    <Text style={[
                                        styles.mediaBarLabel,
                                        { color: isActive ? colors.gold[500] : (item.color || colors.text.muted) },
                                    ]}>
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </View>
    );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
    // Layout
    container: {
        flex: 1,
        backgroundColor: colors.obsidian[900],
    },
    flex: {
        flex: 1,
    },
    centered: {
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border.subtle,
    },
    cancelText: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        fontFamily: 'Inter',
    },
    publishBtn: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.sm + 2,
        borderRadius: borderRadius.full,
        minWidth: 88,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    publishBtnActive: {
        shadowColor: colors.gold[500],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 4,
    },
    publishBtnDisabled: {
        backgroundColor: colors.surface.goldStrong,
    },
    publishContentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    publishText: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: '#FFFFFF',
        fontFamily: 'Inter-Bold',
    },
    publishTextDisabled: {
        opacity: 0.4,
    },
    publishingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    publishingText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: '#FFFFFF',
    },

    // Progress Bar
    progressBar: {
        height: 3,
        backgroundColor: colors.border.subtle,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.gold[500],
        borderRadius: 1.5,
    },

    // Scroll content
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.xl,
        flexGrow: 1,
    },

    // Meta Row (Audience + Visibility)
    metaRow: {
        marginBottom: spacing.lg,
        gap: spacing.md,
    },

    // Audience Selector
    audienceSection: {
        zIndex: 10,
    },
    audienceSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface.glass,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        gap: spacing.sm,
        alignSelf: 'flex-start',
    },
    audienceIconWrap: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center',
        justifyContent: 'center',
    },
    audienceText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.primary,
        fontWeight: '600',
        maxWidth: 160,
    },
    audienceDropdown: {
        marginTop: spacing.sm,
        backgroundColor: colors.obsidian[700],
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        overflow: 'hidden',
    },
    audienceOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md + 2,
        gap: spacing.md,
    },
    audienceOptionActive: {
        backgroundColor: colors.surface.goldSubtle,
    },
    audienceOptionInfo: {
        flex: 1,
    },
    audienceOptionText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        fontWeight: '500',
    },
    audienceOptionTextActive: {
        color: colors.gold[500],
        fontWeight: '600',
    },
    audienceOptionSub: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        marginTop: 1,
    },
    communityThumb: {
        width: 28,
        height: 28,
        borderRadius: 8,
    },
    communityThumbPlaceholder: {
        backgroundColor: colors.obsidian[500],
        alignItems: 'center',
        justifyContent: 'center',
    },
    communityThumbInitial: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.text.primary,
    },

    // Visibility Selector
    visibilityRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    visibilityChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        gap: spacing.xs + 2,
    },
    visibilityChipActive: {
        backgroundColor: colors.surface.goldSubtle,
        borderColor: colors.surface.goldStrong,
    },
    visibilityLabel: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        fontWeight: '500',
    },
    visibilityLabelActive: {
        color: colors.gold[500],
        fontWeight: '600',
    },

    // Composer
    composerRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    composerContent: {
        flex: 1,
    },
    userName: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.primary,
        fontFamily: 'Inter-SemiBold',
        marginBottom: spacing.xs,
    },
    textInput: {
        fontSize: typography.fontSize.lg,
        color: colors.text.primary,
        minHeight: 120,
        lineHeight: 26,
        fontFamily: 'Inter',
        paddingTop: 0,
        paddingBottom: 0,
    },

    // Counter + Draft Row
    counterDraftRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.sm,
        marginBottom: spacing.md,
    },
    counterDraftRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    draftSavedText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        fontFamily: 'Inter-Medium',
    },

    // Character Counter
    charCountRow: {
        alignItems: 'flex-end',
    },
    charCountText: {
        fontSize: typography.fontSize.xs,
        fontFamily: 'Inter',
    },
    charCountRing: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    charCountRingText: {
        fontSize: 10,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
    },

    // Formatting Toolbar
    formattingBar: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    formatBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        alignItems: 'center',
        justifyContent: 'center',
    },
    formatBtnTextBold: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.text.secondary,
        fontFamily: 'Inter-Bold',
    },
    formatBtnTextItalic: {
        fontSize: 14,
        fontStyle: 'italic',
        color: colors.text.secondary,
        fontFamily: 'Inter',
    },

    // Suggestions
    suggestionsContainer: {
        marginBottom: spacing.sm,
    },
    suggestionsContent: {
        gap: spacing.xs,
        paddingVertical: spacing.xs,
    },
    suggestionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface.glass,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        gap: spacing.xs,
    },
    suggestionAvatar: {
        width: 18,
        height: 18,
        borderRadius: 9,
    },
    suggestionText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.primary,
        fontWeight: '500',
        maxWidth: 120,
    },

    // Link Input
    linkInputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface.glass,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    linkInput: {
        flex: 1,
        fontSize: typography.fontSize.sm,
        color: colors.text.primary,
        fontFamily: 'Inter',
    },

    // Poll
    pollContainer: {
        backgroundColor: colors.surface.glass,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        padding: spacing.lg,
        marginBottom: spacing.md,
    },
    pollHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    pollHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    pollTitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.primary,
        fontFamily: 'Inter-SemiBold',
    },
    pollOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    pollOptionNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pollOptionNumberText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.gold[500],
    },
    pollOptionInput: {
        flex: 1,
        backgroundColor: colors.obsidian[700],
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        borderRadius: borderRadius.lg,
        fontSize: typography.fontSize.sm,
        color: colors.text.primary,
        fontFamily: 'Inter',
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    pollAddBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        marginTop: spacing.xs,
    },
    pollAddText: {
        fontSize: typography.fontSize.sm,
        color: colors.gold[500],
        fontWeight: '500',
    },

    // Location Tag
    locationTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface.glass,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        gap: spacing.xs,
        alignSelf: 'flex-start',
        marginBottom: spacing.md,
    },
    locationTagText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
        fontWeight: '500',
        maxWidth: 200,
    },

    // Media Preview Strip
    mediaStripContainer: {
        marginBottom: spacing.md,
    },
    mediaStripHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    mediaStripTitle: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        fontWeight: '500',
    },
    mediaAddMoreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    mediaAddMoreText: {
        fontSize: typography.fontSize.xs,
        color: colors.gold[500],
        fontWeight: '500',
    },
    mediaStripContent: {
        gap: spacing.sm,
    },
    mediaStripItem: {
        width: 120,
        height: 120,
        borderRadius: 14,
        overflow: 'hidden',
        position: 'relative',
    },
    mediaStripThumb: {
        width: '100%',
        height: '100%',
        borderRadius: 14,
        backgroundColor: colors.obsidian[700],
    },
    mediaStripVideoTag: {
        position: 'absolute',
        bottom: spacing.xs,
        left: spacing.xs,
        backgroundColor: colors.surface.overlay,
        paddingHorizontal: 5,
        paddingVertical: 3,
        borderRadius: borderRadius.sm,
        flexDirection: 'row',
        alignItems: 'center',
    },
    mediaStripRemoveBtn: {
        position: 'absolute',
        top: spacing.xs,
        right: spacing.xs,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: colors.surface.overlay,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mediaUploadOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        gap: 4,
    },
    mediaErrorOverlay: {
        backgroundColor: 'rgba(255,80,80,0.15)',
    },
    mediaUploadProgressText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.text.primary,
    },
    mediaErrorText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.coral[400],
    },
    mediaInfoOverlay: {
        position: 'absolute',
        bottom: spacing.xs,
        right: spacing.xs,
        backgroundColor: colors.surface.overlay,
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    mediaInfoText: {
        fontSize: 9,
        fontWeight: '600',
        color: colors.text.primary,
        letterSpacing: 0.2,
    },
    compressionBadge: {
        position: 'absolute',
        top: spacing.xs,
        left: spacing.xs,
        backgroundColor: 'rgba(16,185,129,0.2)',
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    compressionText: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.emerald[400],
    },
    compressionDetailText: {
        fontSize: 7,
        fontWeight: '500',
        color: colors.emerald[300],
        opacity: 0.8,
    },
    mediaInfoTypeText: {
        fontSize: 8,
        fontWeight: '500',
        color: colors.text.muted,
        marginTop: 1,
    },
    mediaProgressBarBg: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 1.5,
    },
    mediaProgressBarFill: {
        height: '100%',
        backgroundColor: colors.gold[500],
        borderRadius: 1.5,
    },
    mediaRetryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        gap: 4,
        marginTop: 2,
    },
    mediaRetryText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.text.primary,
    },
    mediaStripVideoLabel: {
        fontSize: 8,
        fontWeight: '600',
        color: colors.text.primary,
        marginLeft: 2,
    },
    dragHandleIndicator: {
        position: 'absolute',
        top: 4,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 3,
    },
    dragHandleDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.4)',
    },
    formatBtnTextStrike: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text.secondary,
        fontFamily: 'Inter',
        textDecorationLine: 'line-through',
    },
    reorderControls: {
        position: 'absolute',
        bottom: spacing.xs,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 4,
    },
    reorderBtn: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: colors.surface.overlay,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Bottom Media Bar
    mediaBar: {
        backgroundColor: colors.obsidian[900],
    },
    mediaBarDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.border.subtle,
    },
    mediaBarRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.md,
    },
    mediaBarItem: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        gap: 3,
        borderRadius: borderRadius.lg,
    },
    mediaBarItemActive: {
        backgroundColor: colors.surface.goldSubtle,
    },
    mediaBarLabel: {
        fontSize: 10,
        fontWeight: '500',
        letterSpacing: 0.2,
    },

    // Success Animation
    successContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    successCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: colors.emerald[500],
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.emerald[500],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 8,
    },
    successText: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
        marginTop: spacing.lg,
    },
    successSubtext: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        fontFamily: 'Inter',
        marginTop: spacing.xs,
    },
    particle: {
        position: 'absolute',
    },
    particleDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.gold[500],
    },
});
