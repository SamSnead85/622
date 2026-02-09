import { useState } from 'react';
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
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, BounceIn } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { useAuthStore, useFeedStore, mapApiPost } from '../../stores';
import { apiFetch, apiUpload, API } from '../../lib/api';

const MAX_LENGTH = 2000;

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
    const [showSuccess, setShowSuccess] = useState(false);

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
        const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
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

    const handleCancel = () => {
        if (content.trim() || mediaUri) {
            Alert.alert('Discard Post?', 'You have unsaved changes. Are you sure you want to discard this post?', [
                { text: 'Keep Editing', style: 'cancel' },
                { text: 'Discard', style: 'destructive', onPress: () => router.back() },
            ]);
        } else {
            router.back();
        }
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

            if (mediaUri) {
                setUploadProgress(10);
                const fileName = mediaUri.split('/').pop() || 'media';
                const mimeType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
                const uploadResult = await apiUpload(API.uploadPost, mediaUri, mimeType, fileName, (progress) => setUploadProgress(progress * 0.8));
                uploadedMediaUrl = uploadResult.url;
                uploadedMediaType = uploadResult.type || (mediaType === 'video' ? 'VIDEO' : 'IMAGE');
                setUploadProgress(80);
            }

            const postData: any = {
                caption: content.trim(),
                type: uploadedMediaType === 'VIDEO' ? 'VIDEO' : uploadedMediaType === 'IMAGE' ? 'IMAGE' : 'TEXT',
            };
            if (uploadedMediaUrl) postData.mediaUrl = uploadedMediaUrl;

            const result = await apiFetch<any>(API.posts, { method: 'POST', body: JSON.stringify(postData) });
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
                router.push('/(tabs)');
            }, 1200);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to publish post. Please try again.');
        } finally {
            setIsPublishing(false);
            setUploadProgress(0);
        }
    };

    const canPublish = (content.trim().length > 0 || mediaUri) && !isPublishing;

    // Character count color
    const charCountColor =
        content.length >= 1950 ? colors.coral[500] :
        content.length >= 1800 ? colors.gold[500] :
        colors.text.muted;

    if (showSuccess) {
        return (
            <View style={[styles.container, styles.centered]}>
                <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />
                <Animated.View entering={BounceIn}>
                    <Ionicons name="checkmark-circle" size={80} color={colors.emerald[500]} />
                </Animated.View>
                <Animated.Text entering={FadeIn.delay(300)} style={styles.successText}>
                    Post published!
                </Animated.Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
                    <TouchableOpacity onPress={handleCancel}>
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
                            <Text style={[styles.publishText, !canPublish && styles.publishTextDisabled]}>Post</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {isPublishing && uploadProgress > 0 && (
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
                    </View>
                )}

                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <View style={styles.composerRow}>
                        {user?.avatarUrl ? (
                            <Image source={{ uri: user.avatarUrl }} style={styles.userAvatar} />
                        ) : (
                            <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
                                <Text style={styles.userAvatarInitial}>{(user?.displayName || '?')[0].toUpperCase()}</Text>
                            </View>
                        )}
                        <TextInput
                            style={styles.textInput}
                            placeholder="What's on your mind?"
                            placeholderTextColor={colors.text.muted}
                            multiline
                            maxLength={MAX_LENGTH}
                            value={content}
                            onChangeText={setContent}
                            autoFocus
                        />
                    </View>

                    <View style={styles.charCountRow}>
                        <Text style={[styles.charCount, { color: charCountColor }]}>{content.length}/{MAX_LENGTH}</Text>
                    </View>

                    {mediaUri && (
                        <Animated.View entering={FadeInDown} style={styles.mediaPreview}>
                            <Image source={{ uri: mediaUri }} style={styles.mediaPreviewImage} resizeMode="cover" />
                            {mediaType === 'video' && (
                                <View style={styles.videoTag}>
                                    <Ionicons name="videocam" size={10} color={colors.text.primary} />
                                    <Text style={styles.videoTagText}>VIDEO</Text>
                                </View>
                            )}
                            <TouchableOpacity style={styles.removeMediaBtn} onPress={handleRemoveMedia}>
                                <Ionicons name="close" size={16} color={colors.text.primary} />
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    <View style={styles.mediaOptions}>
                        <TouchableOpacity style={styles.mediaOptionBtn} onPress={handlePickMedia}>
                            <Ionicons name="images-outline" size={20} color={colors.text.secondary} />
                            <Text style={styles.mediaOptionText}>Gallery</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.mediaOptionBtn} onPress={handleTakePhoto}>
                            <Ionicons name="camera-outline" size={20} color={colors.text.secondary} />
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
    centered: { alignItems: 'center', justifyContent: 'center' },
    successText: { fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.text.primary, marginTop: spacing.lg },
    keyboardView: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
        borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
    },
    cancelText: { fontSize: typography.fontSize.base, color: colors.text.secondary },
    headerTitle: { fontSize: typography.fontSize.lg, fontWeight: '600', color: colors.text.primary, fontFamily: 'Inter-SemiBold' },
    publishBtn: { backgroundColor: colors.gold[500], paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 20, minWidth: 60, alignItems: 'center' },
    publishBtnDisabled: { backgroundColor: colors.surface.goldStrong },
    publishText: { fontSize: typography.fontSize.base, fontWeight: '700', color: colors.obsidian[900] },
    publishTextDisabled: { opacity: 0.5, color: colors.obsidian[900] },
    progressBar: { height: 3, backgroundColor: colors.border.subtle },
    progressFill: { height: '100%', backgroundColor: colors.gold[500] },
    scrollView: { flex: 1 },
    scrollContent: { padding: spacing.lg },
    composerRow: { flexDirection: 'row', alignItems: 'flex-start' },
    userAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: spacing.md },
    userAvatarPlaceholder: { backgroundColor: colors.obsidian[500], alignItems: 'center', justifyContent: 'center' },
    userAvatarInitial: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
    textInput: { flex: 1, fontSize: typography.fontSize.lg, color: colors.text.primary, minHeight: 100, textAlignVertical: 'top', lineHeight: 26 },
    charCountRow: { alignItems: 'flex-end', marginTop: spacing.sm, marginBottom: spacing.lg },
    charCount: { fontSize: typography.fontSize.xs },
    mediaPreview: { borderRadius: 16, overflow: 'hidden', marginBottom: spacing.lg, position: 'relative' },
    mediaPreviewImage: { width: '100%', aspectRatio: 1.5, backgroundColor: colors.obsidian[700] },
    videoTag: { position: 'absolute', bottom: spacing.md, left: spacing.md, backgroundColor: colors.surface.overlay, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 4 },
    videoTagText: { fontSize: 10, fontWeight: '700', color: colors.text.primary, letterSpacing: 1 },
    removeMediaBtn: { position: 'absolute', top: spacing.md, right: spacing.md, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface.overlay, alignItems: 'center', justifyContent: 'center' },
    mediaOptions: { flexDirection: 'row', gap: spacing.md },
    mediaOptionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface.glass, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: colors.border.subtle, gap: spacing.sm },
    mediaOptionText: { fontSize: typography.fontSize.base, color: colors.text.secondary },
});
