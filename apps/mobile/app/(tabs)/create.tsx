import { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Image,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '@zerog/ui';
import { useAuthStore, useFeedStore } from '../../stores';
import { apiFetch, apiUpload, API } from '../../lib/api';

export default function CreateScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const addPost = useFeedStore((s) => s.addPost);

    const [content, setContent] = useState('');
    const [mediaUri, setMediaUri] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handlePickMedia = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            quality: 0.8,
            videoMaxDuration: 120,
        });

        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            setMediaUri(asset.uri);
            setMediaType(asset.type === 'video' ? 'video' : 'image');
        }
    };

    const handleTakePhoto = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Camera access is needed to take photos.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            setMediaUri(asset.uri);
            setMediaType(asset.type === 'video' ? 'video' : 'image');
        }
    };

    const handleRemoveMedia = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setMediaUri(null);
        setMediaType(null);
    };

    const handlePublish = async () => {
        if (!content.trim() && !mediaUri) {
            Alert.alert('Empty Post', 'Add some text or media to your post.');
            return;
        }

        setIsPublishing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            let uploadedMediaUrl: string | undefined;
            let uploadedMediaType: string | undefined;

            // Upload media if present
            if (mediaUri) {
                setUploadProgress(10);
                const fileName = mediaUri.split('/').pop() || 'media';
                const mimeType = mediaType === 'video'
                    ? 'video/mp4'
                    : 'image/jpeg';

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

            // Create post
            const postData: any = {
                content: content.trim(),
            };

            if (uploadedMediaUrl) {
                postData.mediaUrl = uploadedMediaUrl;
                postData.mediaType = uploadedMediaType;
            }

            const result = await apiFetch<any>(API.posts, {
                method: 'POST',
                body: JSON.stringify(postData),
            });

            setUploadProgress(100);

            // Add to feed optimistically
            if (result.post || result.data) {
                addPost(result.post || result.data);
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Reset and navigate
            setContent('');
            setMediaUri(null);
            setMediaType(null);
            setUploadProgress(0);
            router.push('/(tabs)');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to publish post. Please try again.');
        } finally {
            setIsPublishing(false);
            setUploadProgress(0);
        }
    };

    const canPublish = (content.trim().length > 0 || mediaUri) && !isPublishing;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800]]}
                style={StyleSheet.absoluteFill}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>New Post</Text>
                    <TouchableOpacity
                        style={[styles.publishBtn, !canPublish && styles.publishBtnDisabled]}
                        onPress={handlePublish}
                        disabled={!canPublish}
                    >
                        {isPublishing ? (
                            <ActivityIndicator size="small" color={colors.obsidian[900]} />
                        ) : (
                            <Text style={[styles.publishText, !canPublish && styles.publishTextDisabled]}>
                                Post
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Upload progress */}
                {isPublishing && uploadProgress > 0 && (
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
                    </View>
                )}

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Composer */}
                    <View style={styles.composerRow}>
                        {user?.avatarUrl ? (
                            <Image source={{ uri: user.avatarUrl }} style={styles.userAvatar} />
                        ) : (
                            <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
                                <Text style={styles.userAvatarInitial}>
                                    {(user?.displayName || '?')[0].toUpperCase()}
                                </Text>
                            </View>
                        )}

                        <TextInput
                            style={styles.textInput}
                            placeholder="What's on your mind?"
                            placeholderTextColor={colors.text.muted}
                            multiline
                            maxLength={2000}
                            value={content}
                            onChangeText={setContent}
                            autoFocus
                        />
                    </View>

                    {/* Character count */}
                    <View style={styles.charCountRow}>
                        <Text style={styles.charCount}>
                            {content.length}/2000
                        </Text>
                    </View>

                    {/* Media preview */}
                    {mediaUri && (
                        <View style={styles.mediaPreview}>
                            <Image
                                source={{ uri: mediaUri }}
                                style={styles.mediaPreviewImage}
                                resizeMode="cover"
                            />
                            {mediaType === 'video' && (
                                <View style={styles.videoTag}>
                                    <Text style={styles.videoTagText}>VIDEO</Text>
                                </View>
                            )}
                            <TouchableOpacity
                                style={styles.removeMediaBtn}
                                onPress={handleRemoveMedia}
                            >
                                <Text style={styles.removeMediaIcon}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Media options */}
                    <View style={styles.mediaOptions}>
                        <TouchableOpacity style={styles.mediaOptionBtn} onPress={handlePickMedia}>
                            <Text style={styles.mediaOptionIcon}>🖼️</Text>
                            <Text style={styles.mediaOptionText}>Gallery</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.mediaOptionBtn} onPress={handleTakePhoto}>
                            <Text style={styles.mediaOptionIcon}>📷</Text>
                            <Text style={styles.mediaOptionText}>Camera</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    keyboardView: { flex: 1 },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    },
    cancelText: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
    },
    headerTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '600',
        color: colors.text.primary,
    },
    publishBtn: {
        backgroundColor: colors.gold[500],
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        minWidth: 60,
        alignItems: 'center',
    },
    publishBtnDisabled: {
        backgroundColor: 'rgba(212, 175, 55, 0.3)',
    },
    publishText: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.obsidian[900],
    },
    publishTextDisabled: {
        color: 'rgba(10, 10, 11, 0.5)',
    },

    // Progress
    progressBar: {
        height: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.gold[500],
    },

    // Scroll
    scrollView: { flex: 1 },
    scrollContent: { padding: spacing.lg },

    // Composer
    composerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: spacing.md,
    },
    userAvatarPlaceholder: {
        backgroundColor: colors.obsidian[500],
        alignItems: 'center',
        justifyContent: 'center',
    },
    userAvatarInitial: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text.primary,
    },
    textInput: {
        flex: 1,
        fontSize: typography.fontSize.lg,
        color: colors.text.primary,
        minHeight: 100,
        textAlignVertical: 'top',
        lineHeight: 26,
    },

    // Character count
    charCountRow: {
        alignItems: 'flex-end',
        marginTop: spacing.sm,
        marginBottom: spacing.lg,
    },
    charCount: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },

    // Media preview
    mediaPreview: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: spacing.lg,
        position: 'relative',
    },
    mediaPreviewImage: {
        width: '100%',
        aspectRatio: 1.5,
        backgroundColor: colors.obsidian[700],
    },
    videoTag: {
        position: 'absolute',
        bottom: spacing.md,
        left: spacing.md,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: 4,
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
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeMediaIcon: {
        fontSize: 14,
        color: colors.text.primary,
    },

    // Media options
    mediaOptions: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    mediaOptionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    mediaOptionIcon: {
        fontSize: 18,
        marginRight: spacing.sm,
    },
    mediaOptionText: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
    },
});
