// ============================================
// Voice & Video Call Screen
// Full-featured calling UI with Socket.io
// signaling for WebRTC peer connections
// ============================================

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    Platform,
    Vibration,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '@zerog/ui';
import { socketManager } from '../../lib/socket';
import { useAuthStore } from '../../stores';
import { Avatar } from '../../components';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type CallState = 'initiating' | 'ringing' | 'incoming' | 'connected' | 'ended' | 'rejected' | 'unavailable';

export default function CallScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{
        id: string;
        type: string;
        name: string;
        avatar: string;
        incoming: string;
        callId: string;
    }>();

    const user = useAuthStore((s) => s.user);
    const isIncoming = params.incoming === 'true';
    const callType = (params.type || 'audio') as 'audio' | 'video';
    const targetUserId = params.id;
    const targetName = decodeURIComponent(params.name || 'User');
    const targetAvatar = decodeURIComponent(params.avatar || '');

    // State
    const [callState, setCallState] = useState<CallState>(isIncoming ? 'incoming' : 'initiating');
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeaker, setIsSpeaker] = useState(callType === 'video');
    const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
    const [duration, setDuration] = useState(0);
    const [callId] = useState(() => params.callId || `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

    // Animations
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const ringAnim = useRef(new Animated.Value(0)).current;

    // Timer
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ============================================
    // Animations
    // ============================================

    useEffect(() => {
        // Fade in
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();

        // Pulse animation for ringing/initiating states
        if (callState === 'initiating' || callState === 'ringing' || callState === 'incoming') {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.3, duration: 1000, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
                ])
            );
            pulse.start();

            // Ring animation
            const ring = Animated.loop(
                Animated.sequence([
                    Animated.timing(ringAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                    Animated.timing(ringAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
                ])
            );
            ring.start();

            return () => { pulse.stop(); ring.stop(); };
        }
    }, [callState]);

    // Vibrate for incoming calls
    useEffect(() => {
        if (callState === 'incoming') {
            const pattern = [0, 1000, 500, 1000];
            Vibration.vibrate(pattern, true);
            return () => Vibration.cancel();
        }
    }, [callState]);

    // ============================================
    // Socket Signaling
    // ============================================

    useEffect(() => {
        if (!isIncoming && callState === 'initiating') {
            // Initiate the call
            socketManager.initiateCall({
                callId,
                userId: targetUserId,
                type: callType,
            });
            setCallState('ringing');
        }

        // Listen for call events
        const unsubAnswered = socketManager.on('call:answered', () => {
            setCallState('connected');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        });

        const unsubRejected = socketManager.on('call:rejected', () => {
            setCallState('rejected');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setTimeout(() => router.back(), 2000);
        });

        const unsubEnded = socketManager.on('call:ended', () => {
            setCallState('ended');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setTimeout(() => router.back(), 1500);
        });

        const unsubUnavailable = socketManager.on('call:unavailable', () => {
            setCallState('unavailable');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setTimeout(() => router.back(), 2000);
        });

        const unsubMute = socketManager.on('call:mute', (data: { muted: boolean }) => {
            // Other party muted/unmuted — could show indicator
        });

        return () => {
            unsubAnswered();
            unsubRejected();
            unsubEnded();
            unsubUnavailable();
            unsubMute();
        };
    }, [callState, isIncoming]);

    // Duration timer
    useEffect(() => {
        if (callState === 'connected') {
            timerRef.current = setInterval(() => {
                setDuration((d) => d + 1);
            }, 1000);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [callState]);

    // ============================================
    // Actions
    // ============================================

    const handleAccept = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Vibration.cancel();
        socketManager.answerCall({ callId, answer: {} });
        setCallState('connected');
    }, [callId]);

    const handleDecline = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        Vibration.cancel();
        socketManager.rejectCall(callId);
        setCallState('rejected');
        setTimeout(() => router.back(), 500);
    }, [callId]);

    const handleEndCall = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        socketManager.endCall(callId);
        setCallState('ended');
        setTimeout(() => router.back(), 500);
    }, [callId]);

    const handleToggleMute = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newMuted = !isMuted;
        setIsMuted(newMuted);
        socketManager.toggleMute(callId, newMuted);
    }, [isMuted, callId]);

    const handleToggleSpeaker = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsSpeaker(!isSpeaker);
    }, [isSpeaker]);

    const handleToggleVideo = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsVideoEnabled(!isVideoEnabled);
    }, [isVideoEnabled]);

    // ============================================
    // Format Duration
    // ============================================

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // ============================================
    // Status Text
    // ============================================

    const getStatusText = (): string => {
        switch (callState) {
            case 'initiating':
            case 'ringing':
                return 'Calling...';
            case 'incoming':
                return callType === 'video' ? 'Incoming video call' : 'Incoming audio call';
            case 'connected':
                return formatDuration(duration);
            case 'ended':
                return 'Call ended';
            case 'rejected':
                return 'Call declined';
            case 'unavailable':
                return 'User unavailable';
            default:
                return '';
        }
    };

    // ============================================
    // Render
    // ============================================

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <LinearGradient
                colors={[colors.obsidian[900], '#1a1a2e', colors.obsidian[800]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <View style={[styles.content, { paddingTop: insets.top + spacing.xl }]}>
                {/* Avatar Section */}
                <View style={styles.avatarSection}>
                    {/* Pulse rings */}
                    {(callState === 'ringing' || callState === 'incoming' || callState === 'initiating') && (
                        <>
                            <Animated.View
                                style={[
                                    styles.pulseRing,
                                    { transform: [{ scale: pulseAnim }], opacity: pulseAnim.interpolate({ inputRange: [1, 1.3], outputRange: [0.3, 0] }) },
                                ]}
                            />
                            <Animated.View
                                style={[
                                    styles.pulseRingOuter,
                                    { transform: [{ scale: Animated.multiply(pulseAnim, 1.2) }], opacity: pulseAnim.interpolate({ inputRange: [1, 1.3], outputRange: [0.15, 0] }) },
                                ]}
                            />
                        </>
                    )}

                    <Avatar
                        uri={targetAvatar || undefined}
                        name={targetName}
                        customSize={120}
                        borderColor={colors.gold[400]}
                        borderWidth={3}
                    />
                </View>

                {/* Name & Status */}
                <Text style={styles.callerName}>{targetName}</Text>
                <Animated.Text
                    style={[
                        styles.callStatus,
                        callState === 'connected' && styles.callStatusConnected,
                    ]}
                >
                    {getStatusText()}
                </Animated.Text>

                {/* Encryption badge */}
                <View style={styles.encryptionBadge}>
                    <Ionicons name="lock-closed" size={12} color={colors.gold[400]} />
                    <Text style={styles.encryptionText}>End-to-end encrypted</Text>
                </View>
            </View>

            {/* Controls */}
            <View style={[styles.controls, { paddingBottom: insets.bottom + spacing.xl }]}>
                {callState === 'incoming' ? (
                    /* Incoming call controls */
                    <View style={styles.incomingControls}>
                        <TouchableOpacity onPress={handleDecline} activeOpacity={0.8}>
                            <View style={[styles.callBtn, styles.declineBtn]}>
                                <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
                            </View>
                            <Text style={styles.callBtnLabel}>Decline</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleAccept} activeOpacity={0.8}>
                            <LinearGradient
                                colors={['#34D399', '#10B981']}
                                style={[styles.callBtn, styles.acceptBtn]}
                            >
                                <Ionicons name="call" size={28} color="#fff" />
                            </LinearGradient>
                            <Text style={[styles.callBtnLabel, { color: '#34D399' }]}>Accept</Text>
                        </TouchableOpacity>
                    </View>
                ) : callState === 'connected' ? (
                    /* Connected call controls */
                    <View style={styles.connectedControls}>
                        <View style={styles.controlsRow}>
                            <TouchableOpacity onPress={handleToggleMute} activeOpacity={0.8}>
                                <View style={[styles.controlBtn, isMuted && styles.controlBtnActive]}>
                                    <Ionicons
                                        name={isMuted ? 'mic-off' : 'mic'}
                                        size={22}
                                        color={isMuted ? colors.obsidian[900] : colors.text.primary}
                                    />
                                </View>
                                <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={handleToggleSpeaker} activeOpacity={0.8}>
                                <View style={[styles.controlBtn, isSpeaker && styles.controlBtnActive]}>
                                    <Ionicons
                                        name={isSpeaker ? 'volume-high' : 'volume-medium'}
                                        size={22}
                                        color={isSpeaker ? colors.obsidian[900] : colors.text.primary}
                                    />
                                </View>
                                <Text style={styles.controlLabel}>Speaker</Text>
                            </TouchableOpacity>

                            {callType === 'video' && (
                                <TouchableOpacity onPress={handleToggleVideo} activeOpacity={0.8}>
                                    <View style={[styles.controlBtn, !isVideoEnabled && styles.controlBtnInactive]}>
                                        <Ionicons
                                            name={isVideoEnabled ? 'videocam' : 'videocam-off'}
                                            size={22}
                                            color={colors.text.primary}
                                        />
                                    </View>
                                    <Text style={styles.controlLabel}>Video</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <TouchableOpacity onPress={handleEndCall} activeOpacity={0.8}>
                            <View style={[styles.callBtn, styles.endCallBtn]}>
                                <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
                            </View>
                        </TouchableOpacity>
                    </View>
                ) : (
                    /* Ringing/Ending state */
                    <View style={styles.endingControls}>
                        {(callState === 'ringing' || callState === 'initiating') && (
                            <TouchableOpacity onPress={handleEndCall} activeOpacity={0.8}>
                                <View style={[styles.callBtn, styles.endCallBtn]}>
                                    <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
                                </View>
                                <Text style={styles.callBtnLabel}>Cancel</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    // Avatar
    avatarSection: { alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
    pulseRing: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
        borderColor: colors.gold[400],
    },
    pulseRingOuter: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        borderWidth: 1,
        borderColor: colors.gold[400],
    },

    // Info
    callerName: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    callStatus: {
        fontSize: typography.fontSize.base,
        color: colors.text.muted,
        marginBottom: spacing.md,
    },
    callStatusConnected: { color: '#34D399' },
    encryptionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.surface.glass,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    encryptionText: { fontSize: typography.fontSize.xs, color: colors.gold[400] },

    // Controls
    controls: { paddingHorizontal: spacing.xl },
    incomingControls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    connectedControls: { alignItems: 'center', gap: spacing.xl },
    controlsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.xl,
        marginBottom: spacing.lg,
    },
    endingControls: { alignItems: 'center' },

    // Buttons
    callBtn: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
    },
    acceptBtn: {},
    declineBtn: { backgroundColor: '#EF4444' },
    endCallBtn: { backgroundColor: '#EF4444' },
    callBtnLabel: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        textAlign: 'center',
        marginTop: spacing.sm,
    },

    controlBtn: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center',
        justifyContent: 'center',
    },
    controlBtnActive: { backgroundColor: colors.gold[400] },
    controlBtnInactive: { backgroundColor: colors.surface.glass, opacity: 0.7 },
    controlLabel: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        textAlign: 'center',
        marginTop: spacing.xs,
    },
});
