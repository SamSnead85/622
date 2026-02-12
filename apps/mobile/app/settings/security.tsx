// ============================================
// Security Settings Screen
// Active sessions, email verification status, account security
// ============================================

import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { typography, spacing } from '@zerog/ui';
import { ScreenHeader } from '../../components';
import { useAuthStore } from '../../stores';
import { apiFetch, API } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';
import { useRouter } from 'expo-router';

interface SessionInfo {
    id: string;
    deviceType: string;
    deviceName: string;
    ipAddress: string | null;
    createdAt: string;
    expiresAt: string;
    isCurrent: boolean;
}

export default function SecuritySettingsScreen() {
    const { colors: c, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const refreshUser = useAuthStore((s) => s.refreshUser);

    const [sessions, setSessions] = useState<SessionInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [revokingId, setRevokingId] = useState<string | null>(null);
    const [isRevokingAll, setIsRevokingAll] = useState(false);
    const [isResendingVerification, setIsResendingVerification] = useState(false);

    const emailVerified = (user as any)?.emailVerified ?? false;

    const fetchSessions = useCallback(async () => {
        try {
            const data = await apiFetch('/api/v1/auth/sessions');
            setSessions(data.sessions || []);
        } catch (err) {
            // Silently fail — user can pull to refresh
        }
    }, []);

    useEffect(() => {
        setIsLoading(true);
        fetchSessions().finally(() => setIsLoading(false));
    }, [fetchSessions]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await fetchSessions();
        setIsRefreshing(false);
    }, [fetchSessions]);

    const handleRevokeSession = useCallback(async (sessionId: string) => {
        Alert.alert(
            'Revoke Session',
            'This will log out the device immediately. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Revoke',
                    style: 'destructive',
                    onPress: async () => {
                        setRevokingId(sessionId);
                        try {
                            await apiFetch(`/api/v1/auth/sessions/${sessionId}`, { method: 'DELETE' });
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            setSessions(prev => prev.filter(s => s.id !== sessionId));
                        } catch (err: any) {
                            Alert.alert('Error', err?.data?.error || 'Failed to revoke session');
                        } finally {
                            setRevokingId(null);
                        }
                    },
                },
            ]
        );
    }, []);

    const handleRevokeAll = useCallback(async () => {
        Alert.alert(
            'Log Out All Other Devices',
            'This will immediately end all other sessions. Only your current device will stay logged in.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log Out All',
                    style: 'destructive',
                    onPress: async () => {
                        setIsRevokingAll(true);
                        try {
                            await apiFetch('/api/v1/auth/sessions', { method: 'DELETE' });
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            setSessions(prev => prev.filter(s => s.isCurrent));
                        } catch (err: any) {
                            Alert.alert('Error', err?.data?.error || 'Failed to revoke sessions');
                        } finally {
                            setIsRevokingAll(false);
                        }
                    },
                },
            ]
        );
    }, []);

    const handleResendVerification = useCallback(async () => {
        setIsResendingVerification(true);
        try {
            await apiFetch(API.sendVerificationEmail || '/api/v1/auth/send-verification-email', { method: 'POST' });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Code Sent', 'Check your email for the verification code.');
            router.push('/(auth)/verify-email' as any);
        } catch (err: any) {
            Alert.alert('Error', err?.data?.error || 'Failed to send verification email');
        } finally {
            setIsResendingVerification(false);
        }
    }, [router]);

    const getDeviceIcon = (deviceType: string): keyof typeof Ionicons.glyphMap => {
        const type = deviceType.toLowerCase();
        if (type.includes('ios') || type.includes('iphone')) return 'phone-portrait-outline';
        if (type.includes('android')) return 'phone-portrait-outline';
        if (type.includes('tablet') || type.includes('ipad')) return 'tablet-portrait-outline';
        if (type.includes('web') || type.includes('browser')) return 'globe-outline';
        if (type.includes('desktop')) return 'desktop-outline';
        return 'hardware-chip-outline';
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const otherSessions = sessions.filter(s => !s.isCurrent);

    return (
        <View style={[styles.container, { backgroundColor: c.obsidian[900] }]}>
            <ScreenHeader title="Security" />

            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={c.text.secondary} />
                }
            >
                {/* Email Verification Status */}
                <Animated.View entering={FadeInDown.delay(50).duration(400)}>
                    <Text style={[styles.sectionTitle, { color: c.text.secondary }]}>
                        Account Verification
                    </Text>
                    <View style={[styles.card, { backgroundColor: c.obsidian[700], borderColor: c.border.subtle }]}>
                        <View style={styles.verificationRow}>
                            <View style={[
                                styles.verificationIcon,
                                { backgroundColor: emailVerified ? c.emerald[500] + '15' : c.coral[500] + '15' },
                            ]}>
                                <Ionicons
                                    name={emailVerified ? 'shield-checkmark' : 'shield-outline'}
                                    size={22}
                                    color={emailVerified ? c.emerald[500] : c.coral[500]}
                                />
                            </View>
                            <View style={styles.verificationInfo}>
                                <Text style={[styles.verificationTitle, { color: c.text.primary }]}>
                                    Email {emailVerified ? 'Verified' : 'Not Verified'}
                                </Text>
                                <Text style={[styles.verificationSubtitle, { color: c.text.secondary }]}>
                                    {emailVerified
                                        ? 'Your email is verified. Your account is secure.'
                                        : 'Verify your email to unlock posting and messaging.'}
                                </Text>
                            </View>
                        </View>
                        {!emailVerified && (
                            <TouchableOpacity
                                onPress={handleResendVerification}
                                disabled={isResendingVerification}
                                style={[styles.verifyButton, { backgroundColor: c.emerald[500] }]}
                                accessibilityRole="button"
                                accessibilityLabel="Verify email now"
                            >
                                {isResendingVerification ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.verifyButtonText}>Verify Now</Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>

                {/* Current Session */}
                <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                    <Text style={[styles.sectionTitle, { color: c.text.secondary }]}>
                        This Device
                    </Text>
                    {isLoading ? (
                        <View style={[styles.card, { backgroundColor: c.obsidian[700], borderColor: c.border.subtle }]}>
                            <ActivityIndicator color={c.text.secondary} />
                        </View>
                    ) : (
                        sessions.filter(s => s.isCurrent).map(session => (
                            <View
                                key={session.id}
                                style={[styles.card, styles.sessionCard, { backgroundColor: c.obsidian[700], borderColor: c.emerald[500] + '30' }]}
                            >
                                <View style={[styles.sessionIcon, { backgroundColor: c.emerald[500] + '15' }]}>
                                    <Ionicons name={getDeviceIcon(session.deviceType)} size={20} color={c.emerald[500]} />
                                </View>
                                <View style={styles.sessionInfo}>
                                    <Text style={[styles.sessionDevice, { color: c.text.primary }]}>
                                        {session.deviceName || session.deviceType || 'This device'}
                                    </Text>
                                    <Text style={[styles.sessionMeta, { color: c.text.tertiary }]}>
                                        Active now
                                    </Text>
                                </View>
                                <View style={[styles.currentBadge, { backgroundColor: c.emerald[500] + '20' }]}>
                                    <Text style={[styles.currentBadgeText, { color: c.emerald[500] }]}>Current</Text>
                                </View>
                            </View>
                        ))
                    )}
                </Animated.View>

                {/* Other Sessions */}
                {!isLoading && otherSessions.length > 0 && (
                    <Animated.View entering={FadeInDown.delay(150).duration(400)}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={[styles.sectionTitle, { color: c.text.secondary }]}>
                                Other Devices ({otherSessions.length})
                            </Text>
                            <TouchableOpacity
                                onPress={handleRevokeAll}
                                disabled={isRevokingAll}
                                accessibilityRole="button"
                                accessibilityLabel="Log out all other devices"
                            >
                                {isRevokingAll ? (
                                    <ActivityIndicator size="small" color={c.coral[500]} />
                                ) : (
                                    <Text style={[styles.revokeAllText, { color: c.coral[500] }]}>
                                        Log out all
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        {otherSessions.map((session, index) => (
                            <Animated.View
                                key={session.id}
                                entering={FadeInDown.delay(200 + index * 50).duration(400)}
                            >
                                <View style={[styles.card, styles.sessionCard, { backgroundColor: c.obsidian[700], borderColor: c.border.subtle }]}>
                                    <View style={[styles.sessionIcon, { backgroundColor: c.obsidian[600] }]}>
                                        <Ionicons name={getDeviceIcon(session.deviceType)} size={20} color={c.text.secondary} />
                                    </View>
                                    <View style={styles.sessionInfo}>
                                        <Text style={[styles.sessionDevice, { color: c.text.primary }]}>
                                            {session.deviceName || session.deviceType || 'Unknown device'}
                                        </Text>
                                        <Text style={[styles.sessionMeta, { color: c.text.tertiary }]}>
                                            Logged in {formatDate(session.createdAt)}
                                            {session.ipAddress ? ` · ${session.ipAddress}` : ''}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => handleRevokeSession(session.id)}
                                        disabled={revokingId === session.id}
                                        style={[styles.revokeButton, { borderColor: c.coral[500] + '40' }]}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Revoke session on ${session.deviceName || 'device'}`}
                                    >
                                        {revokingId === session.id ? (
                                            <ActivityIndicator size="small" color={c.coral[500]} />
                                        ) : (
                                            <Ionicons name="close-circle-outline" size={20} color={c.coral[500]} />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </Animated.View>
                        ))}
                    </Animated.View>
                )}

                {/* No other sessions */}
                {!isLoading && otherSessions.length === 0 && (
                    <Animated.View entering={FadeInDown.delay(150).duration(400)}>
                        <Text style={[styles.sectionTitle, { color: c.text.secondary }]}>
                            Other Devices
                        </Text>
                        <View style={[styles.card, styles.emptyCard, { backgroundColor: c.obsidian[700], borderColor: c.border.subtle }]}>
                            <Ionicons name="checkmark-circle-outline" size={28} color={c.emerald[500]} />
                            <Text style={[styles.emptyText, { color: c.text.secondary }]}>
                                No other active sessions
                            </Text>
                        </View>
                    </Animated.View>
                )}

                {/* Security Tips */}
                <Animated.View entering={FadeInDown.delay(250).duration(400)}>
                    <Text style={[styles.sectionTitle, { color: c.text.secondary }]}>
                        Security Tips
                    </Text>
                    <View style={[styles.card, { backgroundColor: c.obsidian[700], borderColor: c.border.subtle }]}>
                        {[
                            { icon: 'key-outline' as const, text: 'Use a strong, unique password' },
                            { icon: 'finger-print-outline' as const, text: 'Enable biometric lock on your device' },
                            { icon: 'eye-off-outline' as const, text: 'Don\'t share your login on public devices' },
                            { icon: 'notifications-outline' as const, text: 'We\'ll notify you of any new device logins' },
                        ].map((tip, i) => (
                            <View key={i} style={[styles.tipRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border.subtle }]}>
                                <Ionicons name={tip.icon} size={16} color={c.text.tertiary} />
                                <Text style={[styles.tipText, { color: c.text.secondary }]}>{tip.text}</Text>
                            </View>
                        ))}
                    </View>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
    },
    sectionTitle: {
        fontSize: typography.sizes.xs,
        fontWeight: '600' as const,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 8,
        marginTop: 20,
        marginLeft: 4,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 8,
        marginLeft: 4,
        marginRight: 4,
    },
    card: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 16,
        marginBottom: 8,
    },
    // Verification
    verificationRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    verificationIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    verificationInfo: {
        flex: 1,
    },
    verificationTitle: {
        fontSize: typography.sizes.md,
        fontWeight: '600' as const,
        marginBottom: 2,
    },
    verificationSubtitle: {
        fontSize: typography.sizes.sm,
        lineHeight: 18,
    },
    verifyButton: {
        marginTop: 14,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    verifyButtonText: {
        color: '#fff',
        fontSize: typography.sizes.sm,
        fontWeight: '600' as const,
    },
    // Sessions
    sessionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
    },
    sessionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    sessionInfo: {
        flex: 1,
    },
    sessionDevice: {
        fontSize: typography.sizes.sm,
        fontWeight: '600' as const,
        marginBottom: 2,
    },
    sessionMeta: {
        fontSize: typography.sizes.xs,
    },
    currentBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    currentBadgeText: {
        fontSize: typography.sizes.xs,
        fontWeight: '600' as const,
    },
    revokeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    revokeAllText: {
        fontSize: typography.sizes.sm,
        fontWeight: '600' as const,
    },
    // Empty state
    emptyCard: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 28,
        gap: 8,
    },
    emptyText: {
        fontSize: typography.sizes.sm,
    },
    // Tips
    tipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
    },
    tipText: {
        fontSize: typography.sizes.sm,
        flex: 1,
    },
});
