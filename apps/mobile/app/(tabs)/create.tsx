import { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Easing,
    Dimensions,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, CameraType, FlashMode } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '@zerog/ui';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CreateScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [cameraType, setCameraType] = useState(CameraType.back);
    const [flashMode, setFlashMode] = useState(FlashMode.off);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingProgress, setRecordingProgress] = useState(0);

    const cameraRef = useRef<Camera>(null);
    const recordButtonScale = useRef(new Animated.Value(1)).current;
    const recordRingScale = useRef(new Animated.Value(1)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        })();

        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();
    }, []);

    const handleFlipCamera = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setCameraType(cameraType === CameraType.back ? CameraType.front : CameraType.back);
    };

    const handleToggleFlash = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setFlashMode(flashMode === FlashMode.off ? FlashMode.on : FlashMode.off);
    };

    const handleRecordStart = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setIsRecording(true);

        Animated.parallel([
            Animated.spring(recordButtonScale, {
                toValue: 0.8,
                tension: 200,
                friction: 10,
                useNativeDriver: true,
            }),
            Animated.spring(recordRingScale, {
                toValue: 1.3,
                tension: 200,
                friction: 10,
                useNativeDriver: true,
            }),
            Animated.timing(progressAnim, {
                toValue: 1,
                duration: 60000, // 60 seconds max
                useNativeDriver: false,
            }),
        ]).start();

        // Simulate recording progress
        const interval = setInterval(() => {
            setRecordingProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(interval);
                    handleRecordStop();
                    return 100;
                }
                return prev + (100 / 600); // 60 seconds
            });
        }, 100);
    };

    const handleRecordStop = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsRecording(false);
        setRecordingProgress(0);

        Animated.parallel([
            Animated.spring(recordButtonScale, {
                toValue: 1,
                tension: 200,
                friction: 10,
                useNativeDriver: true,
            }),
            Animated.spring(recordRingScale, {
                toValue: 1,
                tension: 200,
                friction: 10,
                useNativeDriver: true,
            }),
        ]).start();

        progressAnim.setValue(0);
    };

    const handleTakePhoto = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // Animate shutter effect
        Animated.sequence([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 50,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handleOpenGallery = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            // Navigate to editor with selected media
        }
    };

    if (hasPermission === null) {
        return (
            <View style={styles.permissionContainer}>
                <Text style={styles.permissionText}>Requesting camera permission...</Text>
            </View>
        );
    }

    if (hasPermission === false) {
        return (
            <View style={styles.permissionContainer}>
                <Text style={styles.permissionTitle}>Camera Access Needed</Text>
                <Text style={styles.permissionText}>
                    Allow 0G to access your camera to create amazing content
                </Text>
                <TouchableOpacity style={styles.permissionButton}>
                    <Text style={styles.permissionButtonText}>Open Settings</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Camera View */}
            <Animated.View style={[styles.cameraContainer, { opacity: fadeAnim }]}>
                <Camera
                    ref={cameraRef}
                    style={styles.camera}
                    type={cameraType}
                    flashMode={flashMode}
                    ratio="16:9"
                />
            </Animated.View>

            {/* Gradient overlays */}
            <LinearGradient
                colors={['rgba(0,0,0,0.6)', 'transparent']}
                style={styles.topGradient}
            />
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.bottomGradient}
            />

            {/* Top controls */}
            <View style={[styles.topControls, { paddingTop: insets.top + spacing.md }]}>
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.back();
                    }}
                >
                    <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>

                <View style={styles.topRightControls}>
                    <TouchableOpacity style={styles.controlButton} onPress={handleToggleFlash}>
                        <Text style={styles.controlIcon}>{flashMode === FlashMode.on ? '⚡' : '⚡'}</Text>
                        {flashMode === FlashMode.on && <View style={styles.controlActiveIndicator} />}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.controlButton}>
                        <Text style={styles.controlIcon}>⏱️</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.controlButton}>
                        <Text style={styles.controlIcon}>✨</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Recording progress bar */}
            {isRecording && (
                <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBackground}>
                        <Animated.View
                            style={[
                                styles.progressBar,
                                {
                                    width: progressAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0%', '100%'],
                                    }),
                                },
                            ]}
                        />
                    </View>
                </View>
            )}

            {/* Bottom controls */}
            <View style={[styles.bottomControls, { paddingBottom: insets.bottom + spacing['2xl'] }]}>
                {/* Mode selector */}
                <View style={styles.modeSelector}>
                    <TouchableOpacity style={styles.modeButton}>
                        <Text style={styles.modeText}>15s</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modeButton, styles.modeButtonActive]}>
                        <Text style={[styles.modeText, styles.modeTextActive]}>60s</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.modeButton}>
                        <Text style={styles.modeText}>Photo</Text>
                    </TouchableOpacity>
                </View>

                {/* Main controls row */}
                <View style={styles.mainControls}>
                    {/* Gallery picker */}
                    <TouchableOpacity style={styles.galleryButton} onPress={handleOpenGallery}>
                        <View style={styles.galleryPreview}>
                            <LinearGradient
                                colors={[colors.obsidian[600], colors.obsidian[700]]}
                                style={StyleSheet.absoluteFill}
                            />
                            <Text style={styles.galleryIcon}>🖼️</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Record button */}
                    <View style={styles.recordButtonContainer}>
                        {/* Outer ring */}
                        <Animated.View
                            style={[
                                styles.recordRing,
                                {
                                    transform: [{ scale: recordRingScale }],
                                    borderColor: isRecording ? colors.coral[500] : colors.text.primary,
                                },
                            ]}
                        />

                        {/* Record button */}
                        <TouchableOpacity
                            onPressIn={handleRecordStart}
                            onPressOut={handleRecordStop}
                            onPress={handleTakePhoto}
                            activeOpacity={1}
                        >
                            <Animated.View
                                style={[
                                    styles.recordButton,
                                    {
                                        transform: [{ scale: recordButtonScale }],
                                        backgroundColor: isRecording ? colors.coral[500] : colors.text.primary,
                                        borderRadius: isRecording ? 8 : 40,
                                    },
                                ]}
                            />
                        </TouchableOpacity>

                        {/* Recording indicator */}
                        {isRecording && (
                            <View style={styles.recordingIndicator}>
                                <View style={styles.recordingDot} />
                                <Text style={styles.recordingText}>REC</Text>
                            </View>
                        )}
                    </View>

                    {/* Flip camera */}
                    <TouchableOpacity style={styles.flipButton} onPress={handleFlipCamera}>
                        <View style={styles.flipButtonInner}>
                            <Text style={styles.flipIcon}>🔄</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Effects bar */}
                <View style={styles.effectsBar}>
                    <TouchableOpacity style={styles.effectButton}>
                        <Text style={styles.effectIcon}>🎭</Text>
                        <Text style={styles.effectLabel}>Effects</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.effectButton}>
                        <Text style={styles.effectIcon}>🎵</Text>
                        <Text style={styles.effectLabel}>Sounds</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.effectButton}>
                        <Text style={styles.effectIcon}>📝</Text>
                        <Text style={styles.effectLabel}>Text</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.effectButton}>
                        <Text style={styles.effectIcon}>⏳</Text>
                        <Text style={styles.effectLabel}>Timer</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    permissionContainer: {
        flex: 1,
        backgroundColor: colors.obsidian[900],
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing['2xl'],
    },
    permissionTitle: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
        marginBottom: spacing.md,
    },
    permissionText: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        fontFamily: typography.fontFamily.sans,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    permissionButton: {
        backgroundColor: colors.gold[500],
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: 12,
    },
    permissionButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.obsidian[900],
        fontFamily: typography.fontFamily.sans,
    },
    cameraContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    camera: {
        flex: 1,
    },
    topGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 150,
    },
    bottomGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 300,
    },
    topControls: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: spacing.lg,
    },
    closeButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeIcon: {
        fontSize: 20,
        color: colors.text.primary,
    },
    topRightControls: {
        gap: spacing.md,
    },
    controlButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    controlIcon: {
        fontSize: 20,
    },
    controlActiveIndicator: {
        position: 'absolute',
        bottom: 4,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.gold[500],
    },
    progressBarContainer: {
        position: 'absolute',
        top: 100,
        left: spacing.xl,
        right: spacing.xl,
    },
    progressBarBackground: {
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: colors.coral[500],
        borderRadius: 2,
    },
    bottomControls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: spacing.xl,
    },
    modeSelector: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: spacing.xl,
        gap: spacing.xl,
    },
    modeButton: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    modeButtonActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
    },
    modeText: {
        fontSize: typography.fontSize.base,
        color: 'rgba(255, 255, 255, 0.5)',
        fontWeight: '600',
        fontFamily: typography.fontFamily.sans,
    },
    modeTextActive: {
        color: colors.text.primary,
    },
    mainControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xl,
    },
    galleryButton: {
        width: 48,
        height: 48,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    galleryPreview: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    galleryIcon: {
        fontSize: 24,
    },
    recordButtonContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    recordRing: {
        position: 'absolute',
        width: 88,
        height: 88,
        borderRadius: 44,
        borderWidth: 4,
    },
    recordButton: {
        width: 72,
        height: 72,
    },
    recordingIndicator: {
        position: 'absolute',
        top: -30,
        flexDirection: 'row',
        alignItems: 'center',
    },
    recordingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.coral[500],
        marginRight: 6,
    },
    recordingText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.coral[500],
        letterSpacing: 1,
    },
    flipButton: {
        width: 48,
        height: 48,
    },
    flipButtonInner: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    flipIcon: {
        fontSize: 24,
    },
    effectsBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: spacing.md,
    },
    effectButton: {
        alignItems: 'center',
    },
    effectIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    effectLabel: {
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
        fontFamily: typography.fontFamily.sans,
    },
});
