import { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { apiFetch, apiUpload, API } from '../../lib/api';
import { ScreenHeader, BackButton } from '../../components';
import { IMAGE_PLACEHOLDER } from '../../lib/imagePlaceholder';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type FontStyle = 'normal' | 'bold' | 'italic';

interface TextOverlay {
    text: string;
    fontStyle: FontStyle;
    position: { x: number; y: number };
}

export default function MomentCreateScreen() {
    const router = useRouter();
    const [mediaUri, setMediaUri] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
    const [caption, setCaption] = useState('');
    const [posting, setPosting] = useState(false);

    // Text overlay state
    const [textOverlay, setTextOverlay] = useState<TextOverlay | null>(null);
    const [showTextInput, setShowTextInput] = useState(false);
    const [draftText, setDraftText] = useState('');
    const [draftFontStyle, setDraftFontStyle] = useState<FontStyle>('normal');

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
                    textOverlay: textOverlay || undefined,
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
            <ScreenHeader
                title="New Moment"
                leftElement={<BackButton icon="close" size={26} onPress={() => router.back()} />}
            />

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
                            <TouchableOpacity style={styles.pickerBtn} onPress={() => pickMedia('camera')} accessibilityRole="button" accessibilityLabel="Take photo or video with camera">
                                <LinearGradient
                                    colors={[colors.gold[400], colors.gold[600]]}
                                    style={styles.pickerBtnGradient}
                                >
                                    <Ionicons name="camera" size={24} color={colors.obsidian[900]} />
                                    <Text style={styles.pickerBtnText}>Camera</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.pickerBtn} onPress={() => pickMedia('gallery')} accessibilityRole="button" accessibilityLabel="Choose from gallery">
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
                        <Image 
                            source={{ uri: mediaUri }} 
                            style={styles.preview} 
                            contentFit="cover"
                            placeholder={IMAGE_PLACEHOLDER.blurhash}
                            transition={IMAGE_PLACEHOLDER.transition}
                            cachePolicy="memory-disk"
                        />

                        {/* Text overlay on preview */}
                        {textOverlay && (
                            <View style={styles.textOverlayContainer} pointerEvents="none">
                                <Text
                                    style={[
                                        styles.textOverlayText,
                                        textOverlay.fontStyle === 'bold' && styles.textOverlayBold,
                                        textOverlay.fontStyle === 'italic' && styles.textOverlayItalic,
                                    ]}
                                >
                                    {textOverlay.text}
                                </Text>
                            </View>
                        )}

                        {/* Toolbar */}
                        <View style={styles.toolbar}>
                            <TouchableOpacity
                                style={[styles.toolbarBtn, textOverlay && styles.toolbarBtnActive]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    if (textOverlay) {
                                        setDraftText(textOverlay.text);
                                        setDraftFontStyle(textOverlay.fontStyle);
                                    } else {
                                        setDraftText('');
                                        setDraftFontStyle('normal');
                                    }
                                    setShowTextInput(true);
                                }}
                                accessibilityRole="button"
                                accessibilityLabel="Add text overlay"
                            >
                                <Text style={styles.toolbarBtnLabel}>Aa</Text>
                            </TouchableOpacity>
                        </View>

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
                                        setTextOverlay(null);
                                    }}
                                    accessibilityRole="button"
                                    accessibilityLabel="Retake photo or video"
                                >
                                    <Ionicons name="refresh" size={18} color={colors.text.primary} />
                                    <Text style={styles.retakeText}>Retake</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.postBtn}
                                    onPress={handlePost}
                                    disabled={posting}
                                    activeOpacity={0.9}
                                    accessibilityRole="button"
                                    accessibilityLabel="Share moment"
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

            {/* Text overlay input modal */}
            <Modal visible={showTextInput} transparent animationType="fade">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.textModalContainer}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowTextInput(false)} />
                    <View style={styles.textModalContent}>
                        <TextInput
                            style={[
                                styles.textModalInput,
                                draftFontStyle === 'bold' && { fontWeight: '700' },
                                draftFontStyle === 'italic' && { fontStyle: 'italic' },
                            ]}
                            placeholder="Type your text..."
                            placeholderTextColor={colors.text.muted}
                            value={draftText}
                            onChangeText={setDraftText}
                            multiline
                            maxLength={100}
                            autoFocus
                        />
                        <View style={styles.fontStyleRow}>
                            {(['normal', 'bold', 'italic'] as FontStyle[]).map((fs) => (
                                <TouchableOpacity
                                    key={fs}
                                    style={[styles.fontStyleBtn, draftFontStyle === fs && styles.fontStyleBtnActive]}
                                    onPress={() => setDraftFontStyle(fs)}
                                >
                                    <Text
                                        style={[
                                            styles.fontStyleLabel,
                                            fs === 'bold' && { fontWeight: '700' },
                                            fs === 'italic' && { fontStyle: 'italic' },
                                            draftFontStyle === fs && styles.fontStyleLabelActive,
                                        ]}
                                    >
                                        {fs.charAt(0).toUpperCase() + fs.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.textModalActions}>
                            {textOverlay && (
                                <TouchableOpacity
                                    style={styles.textModalRemoveBtn}
                                    onPress={() => {
                                        setTextOverlay(null);
                                        setShowTextInput(false);
                                    }}
                                >
                                    <Text style={styles.textModalRemoveText}>Remove</Text>
                                </TouchableOpacity>
                            )}
                            <View style={{ flex: 1 }} />
                            <TouchableOpacity
                                style={styles.textModalDoneBtn}
                                onPress={() => {
                                    const trimmed = draftText.trim();
                                    if (trimmed) {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setTextOverlay({
                                            text: trimmed,
                                            fontStyle: draftFontStyle,
                                            position: { x: 0.5, y: 0.5 },
                                        });
                                    }
                                    setShowTextInput(false);
                                }}
                            >
                                <Text style={styles.textModalDoneText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },

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

    // Toolbar
    toolbar: {
        position: 'absolute',
        top: spacing.lg,
        right: spacing.lg,
        zIndex: 10,
        gap: spacing.sm,
    },
    toolbarBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface.overlayLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toolbarBtnActive: {
        backgroundColor: colors.gold[500] + '40',
    },
    toolbarBtnLabel: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text.primary,
    },

    // Text overlay on preview
    textOverlayContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5,
    },
    textOverlayText: {
        fontSize: 28,
        color: '#FFFFFF',
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
        textShadowColor: 'rgba(0,0,0,0.75)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
    },
    textOverlayBold: {
        fontWeight: '700',
    },
    textOverlayItalic: {
        fontStyle: 'italic',
    },

    // Text input modal
    textModalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    textModalContent: {
        backgroundColor: colors.obsidian[800],
        borderRadius: 20,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    textModalInput: {
        fontSize: 22,
        color: colors.text.primary,
        textAlign: 'center',
        minHeight: 80,
        marginBottom: spacing.md,
    },
    fontStyleRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    fontStyleBtn: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 12,
        backgroundColor: colors.surface.glass,
    },
    fontStyleBtnActive: {
        backgroundColor: colors.surface.goldMedium,
    },
    fontStyleLabel: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
    },
    fontStyleLabelActive: {
        color: colors.gold[500],
    },
    textModalActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    textModalRemoveBtn: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    textModalRemoveText: {
        fontSize: typography.fontSize.base,
        color: colors.coral[500],
        fontWeight: '600',
    },
    textModalDoneBtn: {
        backgroundColor: colors.gold[500],
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xl,
        borderRadius: 12,
    },
    textModalDoneText: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.obsidian[900],
    },
});
