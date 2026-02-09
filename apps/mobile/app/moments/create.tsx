import { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Image,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { apiFetch, apiUpload, API } from '../../lib/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function MomentCreateScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [mediaUri, setMediaUri] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
    const [caption, setCaption] = useState('');
    const [posting, setPosting] = useState(false);

    const pickMedia = async (source: 'camera' | 'gallery') => {
        try {
            let result;
            if (source === 'camera') {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission Required', 'Camera access is needed to create a moment.');
                    return;
                }
                result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ['images', 'videos'],
                    allowsEditing: true,
                    quality: 0.8,
                    videoMaxDuration: 30,
                });
            } else {
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images', 'videos'],
                    allowsEditing: true,
                    quality: 0.8,
                    videoMaxDuration: 30,
                });
            }

            if (!result.canceled && result.assets[0]) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setMediaUri(result.assets[0].uri);
                setMediaType(result.assets[0].type === 'video' ? 'video' : 'image');
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to pick media');
        }
    };

    const handlePost = async () => {
        if (!mediaUri) return;
        setPosting(true);
        try {
            // Upload the media first
            const ext = mediaUri.split('.').pop() || (mediaType === 'video' ? 'mp4' : 'jpg');
            const mimeType = mediaType === 'video' ? `video/${ext}` : `image/${ext}`;
            const upload = await apiUpload(API.uploadMoment, mediaUri, mimeType, `moment.${ext}`);

            // Create the moment
            await apiFetch(API.moments, {
                method: 'POST',
                body: JSON.stringify({
                    mediaUrl: upload.url,
                    mediaType: mediaType.toUpperCase(),
                    caption: caption.trim() || undefined,
                }),
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to post moment');
        } finally {
            setPosting(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
                <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
                    <Ionicons name="close" size={26} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Moment</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                {!mediaUri ? (
                    /* Media Picker */
                    <Animated.View entering={FadeIn.duration(400)} style={styles.pickerArea}>
                        <Ionicons name="sparkles" size={48} color={colors.gold[400]} />
                        <Text style={styles.pickerTitle}>Share a moment</Text>
                        <Text style={styles.pickerDesc}>
                            Photos and videos disappear after 24 hours. Only visible to your followers.
                        </Text>

                        <View style={styles.pickerBtns}>
                            <TouchableOpacity style={styles.pickerBtn} onPress={() => pickMedia('camera')}>
                                <LinearGradient
                                    colors={[colors.gold[400], colors.gold[600]]}
                                    style={styles.pickerBtnGradient}
                                >
                                    <Ionicons name="camera" size={24} color={colors.obsidian[900]} />
                                    <Text style={styles.pickerBtnText}>Camera</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.pickerBtn} onPress={() => pickMedia('gallery')}>
                                <View style={styles.pickerBtnOutline}>
                                    <Ionicons name="images" size={24} color={colors.gold[400]} />
                                    <Text style={styles.pickerBtnTextOutline}>Gallery</Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.privacyBadge}>
                            <Ionicons name="lock-closed" size={14} color={colors.emerald[500]} />
                            <Text style={styles.privacyText}>Auto-deletes after 24h. View count visible only to you.</Text>
                        </View>
                    </Animated.View>
                ) : (
                    /* Preview + Caption */
                    <View style={styles.previewArea}>
                        <Image source={{ uri: mediaUri }} style={styles.preview} resizeMode="cover" />
                        <LinearGradient
                            colors={['transparent', colors.obsidian[900] + 'CC', colors.obsidian[900]]}
                            style={styles.previewGradient}
                        />

                        <View style={styles.captionArea}>
                            <TextInput
                                style={styles.captionInput}
                                placeholder="Add a caption..."
                                placeholderTextColor={colors.text.muted}
                                value={caption}
                                onChangeText={setCaption}
                                maxLength={200}
                                multiline
                            />

                            <View style={styles.previewActions}>
                                <TouchableOpacity
                                    style={styles.retakeBtn}
                                    onPress={() => {
                                        setMediaUri(null);
                                        setCaption('');
                                    }}
                                >
                                    <Ionicons name="refresh" size={18} color={colors.text.primary} />
                                    <Text style={styles.retakeText}>Retake</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.postBtn}
                                    onPress={handlePost}
                                    disabled={posting}
                                    activeOpacity={0.9}
                                >
                                    <LinearGradient
                                        colors={[colors.gold[400], colors.gold[600]]}
                                        style={styles.postBtnGradient}
                                    >
                                        {posting ? (
                                            <ActivityIndicator size="small" color={colors.obsidian[900]} />
                                        ) : (
                                            <>
                                                <Ionicons name="send" size={16} color={colors.obsidian[900]} />
                                                <Text style={styles.postBtnText}>Share</Text>
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.lg, paddingBottom: spacing.sm,
        zIndex: 10,
    },
    closeBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18, fontWeight: '700', color: colors.text.primary, fontFamily: 'Inter-Bold',
    },

    // Picker
    pickerArea: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: spacing['2xl'],
    },
    pickerTitle: {
        fontSize: 28, fontWeight: '700', color: colors.text.primary,
        fontFamily: 'Inter-Bold', marginTop: spacing.lg, letterSpacing: -0.5,
    },
    pickerDesc: {
        fontSize: typography.fontSize.base, color: colors.text.secondary,
        textAlign: 'center', marginTop: spacing.sm, lineHeight: 22,
    },
    pickerBtns: {
        flexDirection: 'row', gap: spacing.md, marginTop: spacing['2xl'],
    },
    pickerBtn: { borderRadius: 14, overflow: 'hidden', flex: 1 },
    pickerBtnGradient: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: spacing.sm, paddingVertical: spacing.lg,
    },
    pickerBtnText: {
        fontSize: typography.fontSize.base, fontWeight: '700',
        color: colors.obsidian[900],
    },
    pickerBtnOutline: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: spacing.sm, paddingVertical: spacing.lg,
        borderWidth: 1.5, borderColor: colors.gold[500] + '60',
        borderRadius: 14,
    },
    pickerBtnTextOutline: {
        fontSize: typography.fontSize.base, fontWeight: '700',
        color: colors.gold[400],
    },
    privacyBadge: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        marginTop: spacing['2xl'], paddingHorizontal: spacing.lg,
    },
    privacyText: {
        flex: 1, fontSize: typography.fontSize.xs, color: colors.text.muted, lineHeight: 16,
    },

    // Preview
    previewArea: { flex: 1, position: 'relative' },
    preview: {
        ...StyleSheet.absoluteFillObject,
    },
    previewGradient: {
        position: 'absolute', left: 0, right: 0, bottom: 0, height: '40%',
    },
    captionArea: {
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: spacing.lg,
    },
    captionInput: {
        backgroundColor: colors.obsidian[900] + '80',
        borderRadius: 14, padding: spacing.md,
        fontSize: typography.fontSize.base, color: colors.text.primary,
        marginBottom: spacing.md, minHeight: 50,
    },
    previewActions: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    retakeBtn: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
        paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    },
    retakeText: {
        fontSize: typography.fontSize.base, color: colors.text.primary, fontWeight: '500',
    },
    postBtn: { borderRadius: 14, overflow: 'hidden' },
    postBtnGradient: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        paddingVertical: spacing.md, paddingHorizontal: spacing.xl,
    },
    postBtnText: {
        fontSize: typography.fontSize.base, fontWeight: '700',
        color: colors.obsidian[900],
    },
});
