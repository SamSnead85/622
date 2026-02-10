import { useState, useRef, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import Animated, {
    FadeIn,
    FadeInDown,
    BounceIn,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withDelay,
    withTiming,
} from 'react-native-reanimated';
import { colors, typography, spacing, borderRadius } from '@zerog/ui';
import { Avatar } from '../../components';
import { useAuthStore, useFeedStore, useCommunitiesStore, mapApiPost } from '../../stores';
import { apiFetch, apiUpload, API } from '../../lib/api';
import type { Community } from '../../stores';

const MAX_LENGTH = 2000;
const WARN_THRESHOLD = 1800;
const DANGER_THRESHOLD = 1950;

// ============================================
// Visibility & Audience Types
// ============================================

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
// Media Attachment Bar Items
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
    { key: 'link', icon: 'link-outline', label: 'Link', color: colors.amber[400] },
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

    return (
        <View style={styles.successContainer}>
            {particles.map((p, i) => (
                <SuccessParticle key={i} delay={p.delay} angle={p.angle} distance={p.distance} />
            ))}
            <Animated.View entering={BounceIn.duration(500)}>
                <View style={styles.successCircle}>
                    <Ionicons name="checkmark" size={48} color={colors.obsidian[900]} />
                </View>
            </Animated.View>
            <Animated.Text entering={FadeIn.delay(400).duration(300)} style={styles.successText}>
                Posted!
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
                                <Image source={{ uri: community.avatarUrl }} style={styles.communityThumb} />
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
// Character Counter
// ============================================

function CharacterCounter({ current, max }: { current: number; max: number }) {
    const remaining = max - current;
    const color =
        remaining <= max - DANGER_THRESHOLD
            ? colors.coral[500]
            : remaining <= max - WARN_THRESHOLD
                ? colors.gold[500]
                : colors.text.muted;

    const isNearLimit = remaining <= max - WARN_THRESHOLD;

    return (
        <View style={styles.charCountRow}>
            {isNearLimit && (
                <View style={[styles.charCountRing, { borderColor: color }]}>
                    <Text style={[styles.charCountRingText, { color }]}>{remaining}</Text>
                </View>
            )}
            {!isNearLimit && (
                <Text style={[styles.charCountText, { color }]}>{remaining}</Text>
            )}
        </View>
    );
}

// ============================================
// Main Create Screen
// ============================================

export default function CreateScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const addPost = useFeedStore((s) => s.addPost);
    const communities = useCommunitiesStore((s) => s.communities);
    const fetchCommunities = useCommunitiesStore((s) => s.fetchCommunities);

    const textInputRef = useRef<TextInput>(null);

    // --- State ---
    const [content, setContent] = useState('');
    const [mediaUri, setMediaUri] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
    const [visibility, setVisibility] = useState<PostVisibility>('public');
    const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [showLinkInput, setShowLinkInput] = useState(false);

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

    // ============================================
    // Media Handlers
    // ============================================

    const handlePickPhoto = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
            setMediaUri(result.assets[0].uri);
            setMediaType('image');
        }
    }, []);

    const handlePickVideo = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['videos'],
            allowsEditing: true,
            quality: 0.8,
            videoMaxDuration: 120,
        });
        if (!result.canceled && result.assets[0]) {
            setMediaUri(result.assets[0].uri);
            setMediaType('video');
        }
    }, []);

    const handleTakePhoto = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Camera access is needed to take photos.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            setMediaUri(asset.uri);
            setMediaType(asset.type === 'video' ? 'video' : 'image');
        }
    }, []);

    const handlePoll = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Alert.alert('Coming Soon', 'Poll creation will be available in a future update.');
    }, []);

    const handleLink = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowLinkInput(!showLinkInput);
    }, [showLinkInput]);

    const handleRemoveMedia = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setMediaUri(null);
        setMediaType(null);
    }, []);

    const handleMediaBarPress = useCallback((key: string) => {
        switch (key) {
            case 'photo': return handlePickPhoto();
            case 'video': return handlePickVideo();
            case 'camera': return handleTakePhoto();
            case 'poll': return handlePoll();
            case 'link': return handleLink();
        }
    }, [handlePickPhoto, handlePickVideo, handleTakePhoto, handlePoll, handleLink]);

    // ============================================
    // Discard / Cancel
    // ============================================

    const handleCancel = useCallback(() => {
        if (content.trim() || mediaUri) {
            Alert.alert(
                'Discard Post?',
                'You have unsaved changes. Are you sure you want to discard this post?',
                [
                    { text: 'Keep Editing', style: 'cancel' },
                    {
                        text: 'Discard',
                        style: 'destructive',
                        onPress: () => router.back(),
                    },
                ],
            );
        } else {
            router.back();
        }
    }, [content, mediaUri, router]);

    // ============================================
    // Publish
    // ============================================

    const handlePublish = useCallback(async () => {
        if (!content.trim() && !mediaUri) return;

        Keyboard.dismiss();
        setIsPublishing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            let uploadedMediaUrl: string | undefined;
            let uploadedMediaType: string | undefined;

            if (mediaUri) {
                setUploadProgress(10);
                const fileName = mediaUri.split('/').pop() || 'media';
                const mimeType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
                const uploadResult = await apiUpload(
                    API.uploadPost,
                    mediaUri,
                    mimeType,
                    fileName,
                    (progress) => setUploadProgress(progress * 0.8),
                );
                uploadedMediaUrl = uploadResult.url;
                uploadedMediaType = uploadResult.type || (mediaType === 'video' ? 'VIDEO' : 'IMAGE');
                setUploadProgress(80);
            }

            const postData: Record<string, any> = {
                caption: content.trim(),
                type: uploadedMediaType === 'VIDEO'
                    ? 'VIDEO'
                    : uploadedMediaType === 'IMAGE'
                        ? 'IMAGE'
                        : 'TEXT',
                visibility,
            };
            if (uploadedMediaUrl) postData.mediaUrl = uploadedMediaUrl;
            if (selectedCommunity) postData.communityId = selectedCommunity.id;
            if (linkUrl.trim()) postData.linkUrl = linkUrl.trim();

            const result = await apiFetch<any>(API.posts, {
                method: 'POST',
                body: JSON.stringify(postData),
            });
            setUploadProgress(100);

            const rawPost = result.post || result.data || result;
            if (rawPost?.id) addPost(mapApiPost(rawPost));

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Show success animation
            setShowSuccess(true);
            setTimeout(() => {
                setContent('');
                setMediaUri(null);
                setMediaType(null);
                setUploadProgress(0);
                setShowSuccess(false);
                setLinkUrl('');
                setShowLinkInput(false);
                setSelectedCommunity(null);
                router.push('/(tabs)');
            }, 1400);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to publish post. Please try again.');
        } finally {
            setIsPublishing(false);
            setUploadProgress(0);
        }
    }, [content, mediaUri, mediaType, visibility, selectedCommunity, linkUrl, addPost, router]);

    // ============================================
    // Derived State
    // ============================================

    const canPublish = (content.trim().length > 0 || !!mediaUri) && !isPublishing;

    // ============================================
    // Success Screen
    // ============================================

    if (showSuccess) {
        return (
            <View style={[styles.container, styles.centered]}>
                <LinearGradient
                    colors={[colors.obsidian[900], colors.obsidian[800]]}
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
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800]]}
                style={StyleSheet.absoluteFill}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
                keyboardVerticalOffset={0}
            >
                {/* ======== Header ======== */}
                <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
                    <TouchableOpacity
                        onPress={handleCancel}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.publishBtn,
                            canPublish ? styles.publishBtnActive : styles.publishBtnDisabled,
                        ]}
                        onPress={handlePublish}
                        disabled={!canPublish}
                        activeOpacity={0.8}
                    >
                        {isPublishing ? (
                            <ActivityIndicator size="small" color={colors.obsidian[900]} />
                        ) : (
                            <Text
                                style={[
                                    styles.publishText,
                                    !canPublish && styles.publishTextDisabled,
                                ]}
                            >
                                Post
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* ======== Upload Progress ======== */}
                {isPublishing && uploadProgress > 0 && (
                    <View style={styles.progressBar}>
                        <Animated.View
                            entering={FadeIn.duration(150)}
                            style={[styles.progressFill, { width: `${uploadProgress}%` }]}
                        />
                    </View>
                )}

                {/* ======== Scrollable Composer Body ======== */}
                <ScrollView
                    style={styles.flex}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Audience & Visibility Selectors */}
                    <View style={styles.metaRow}>
                        <AudienceSelector
                            selectedCommunity={selectedCommunity}
                            communities={communities}
                            onSelectPersonal={() => setSelectedCommunity(null)}
                            onSelectCommunity={setSelectedCommunity}
                        />
                        <VisibilitySelector visibility={visibility} onSelect={setVisibility} />
                    </View>

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
                                onChangeText={setContent}
                                textAlignVertical="top"
                                scrollEnabled={false}
                            />
                        </View>
                    </View>

                    {/* Character Counter */}
                    <CharacterCounter current={content.length} max={MAX_LENGTH} />

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
                            />
                            {linkUrl.length > 0 && (
                                <TouchableOpacity onPress={() => setLinkUrl('')}>
                                    <Ionicons name="close-circle" size={18} color={colors.text.muted} />
                                </TouchableOpacity>
                            )}
                        </Animated.View>
                    )}

                    {/* Media Preview */}
                    {mediaUri && (
                        <Animated.View entering={FadeInDown.springify()} style={styles.mediaPreview}>
                            <Image
                                source={{ uri: mediaUri }}
                                style={styles.mediaPreviewImage}
                                contentFit="cover"
                                transition={200}
                            />
                            {mediaType === 'video' && (
                                <View style={styles.videoTag}>
                                    <Ionicons name="videocam" size={10} color={colors.text.primary} />
                                    <Text style={styles.videoTagText}>VIDEO</Text>
                                </View>
                            )}
                            <TouchableOpacity
                                style={styles.removeMediaBtn}
                                onPress={handleRemoveMedia}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="close" size={16} color={colors.text.primary} />
                            </TouchableOpacity>
                        </Animated.View>
                    )}
                </ScrollView>

                {/* ======== Bottom Media Bar ======== */}
                <View style={[styles.mediaBar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
                    <View style={styles.mediaBarDivider} />
                    <View style={styles.mediaBarRow}>
                        {MEDIA_BAR_ITEMS.map((item) => (
                            <TouchableOpacity
                                key={item.key}
                                style={styles.mediaBarItem}
                                onPress={() => handleMediaBarPress(item.key)}
                                activeOpacity={0.6}
                                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                            >
                                <Ionicons
                                    name={item.icon}
                                    size={22}
                                    color={item.color || colors.text.secondary}
                                />
                                <Text style={[styles.mediaBarLabel, { color: item.color || colors.text.muted }]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
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
        minWidth: 72,
        alignItems: 'center',
        justifyContent: 'center',
    },
    publishBtnActive: {
        backgroundColor: colors.gold[500],
        shadowColor: colors.gold[500],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 4,
    },
    publishBtnDisabled: {
        backgroundColor: colors.surface.goldStrong,
    },
    publishText: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.obsidian[900],
        fontFamily: 'Inter-Bold',
    },
    publishTextDisabled: {
        opacity: 0.4,
    },

    // Progress Bar
    progressBar: {
        height: 2,
        backgroundColor: colors.border.subtle,
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.gold[500],
        borderRadius: 1,
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

    // Character Counter
    charCountRow: {
        alignItems: 'flex-end',
        marginTop: spacing.sm,
        marginBottom: spacing.md,
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

    // Media Preview
    mediaPreview: {
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: spacing.md,
    },
    mediaPreviewImage: {
        width: '100%',
        aspectRatio: 16 / 10,
        backgroundColor: colors.obsidian[700],
        borderRadius: borderRadius.xl,
    },
    videoTag: {
        position: 'absolute',
        bottom: spacing.md,
        left: spacing.md,
        backgroundColor: colors.surface.overlay,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: spacing.xxs + 1,
        borderRadius: borderRadius.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    videoTagText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.text.primary,
        letterSpacing: 1,
    },
    removeMediaBtn: {
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
        width: 32,
        height: 32,
        borderRadius: 16,
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
