// ============================================
// Email Verification Screen — 6-digit OTP input
// Shown after signup, before username selection
// ============================================

import { useState, useRef, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { typography, spacing } from '@zerog/ui';
import { useAuthStore } from '../../stores';
import { apiFetch, API } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';

const OTP_LENGTH = 6;

export default function VerifyEmailScreen() {
    const { colors: c, isDark } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();

    const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [isVerifying, setIsVerifying] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(60);

    const inputRefs = useRef<(TextInput | null)[]>([]);

    // Resend cooldown timer
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => {
            setResendCooldown(prev => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    const handleCodeChange = useCallback((text: string, index: number) => {
        const newCode = [...code];

        if (text.length > 1) {
            // Handle paste — distribute digits across inputs
            const digits = text.replace(/\D/g, '').split('').slice(0, OTP_LENGTH);
            for (let i = 0; i < digits.length; i++) {
                if (index + i < OTP_LENGTH) {
                    newCode[index + i] = digits[i];
                }
            }
            setCode(newCode);
            const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
            inputRefs.current[nextIndex]?.focus();
        } else {
            newCode[index] = text.replace(/\D/g, '');
            setCode(newCode);
            if (text && index < OTP_LENGTH - 1) {
                inputRefs.current[index + 1]?.focus();
            }
        }

        setError(null);
    }, [code]);

    const handleKeyPress = useCallback((key: string, index: number) => {
        if (key === 'Backspace' && !code[index] && index > 0) {
            const newCode = [...code];
            newCode[index - 1] = '';
            setCode(newCode);
            inputRefs.current[index - 1]?.focus();
        }
    }, [code]);

    const handleVerify = useCallback(async () => {
        const fullCode = code.join('');
        if (fullCode.length !== OTP_LENGTH) {
            setError('Please enter the full 6-digit code');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        Keyboard.dismiss();
        setIsVerifying(true);
        setError(null);

        try {
            await apiFetch(API.verifyEmail || '/api/v1/auth/verify-email', {
                method: 'POST',
                body: JSON.stringify({ code: fullCode }),
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setSuccess(true);

            // Brief delay to show success, then navigate
            setTimeout(() => {
                router.replace('/(auth)/username' as any);
            }, 800);
        } catch (err: unknown) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const errorObj = err as { data?: { error?: string }; message?: string };
            const message = errorObj?.data?.error || (err instanceof Error ? err.message : 'Invalid code. Please try again.');
            setError(message);
        } finally {
            setIsVerifying(false);
        }
    }, [code, router]);

    const handleResend = useCallback(async () => {
        if (resendCooldown > 0 || isResending) return;

        setIsResending(true);
        setError(null);

        try {
            await apiFetch(API.sendVerificationEmail || '/api/v1/auth/send-verification-email', {
                method: 'POST',
            });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setResendCooldown(60);
            setCode(Array(OTP_LENGTH).fill(''));
            inputRefs.current[0]?.focus();
        } catch (err: unknown) {
            const errorObj = err as { data?: { error?: string }; message?: string };
            setError(errorObj?.data?.error || 'Failed to resend code');
        } finally {
            setIsResending(false);
        }
    }, [resendCooldown, isResending]);

    const handleSkip = useCallback(() => {
        // Allow skip but user won't be able to post until verified
        router.replace('/(auth)/username' as any);
    }, [router]);

    // Auto-submit when all digits entered
    useEffect(() => {
        const fullCode = code.join('');
        if (fullCode.length === OTP_LENGTH && !isVerifying) {
            handleVerify();
        }
    }, [code, isVerifying, handleVerify]);

    return (
        <LinearGradient
            colors={[c.background, isDark ? '#0F0F18' : '#F8F9FC', c.background]}
            locations={[0, 0.5, 1]}
            style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}
        >
            {/* Shield icon */}
            <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.iconWrap}>
                <View style={[styles.iconCircle, { backgroundColor: c.emerald[500] + '15' }]}>
                    <Ionicons name="shield-checkmark" size={40} color={c.emerald[500]} />
                </View>
            </Animated.View>

            {/* Title */}
            <Animated.View entering={FadeInDown.delay(200).duration(500)}>
                <Text style={[styles.title, { color: c.text.primary }]}>
                    Verify your email
                </Text>
                <Text style={[styles.subtitle, { color: c.text.secondary }]}>
                    We sent a 6-digit code to{'\n'}
                    <Text style={{ color: c.text.primary, fontWeight: '600' }}>
                        {user?.email || 'your email'}
                    </Text>
                </Text>
            </Animated.View>

            {/* OTP Input */}
            <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.otpRow}>
                {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                    <TextInput
                        key={i}
                        ref={ref => { inputRefs.current[i] = ref; }}
                        style={[
                            styles.otpInput,
                            {
                                backgroundColor: c.surface.glass,
                                borderColor: code[i]
                                    ? (success ? c.emerald[500] : c.text.primary)
                                    : (error ? c.coral[500] : c.border.subtle),
                                color: c.text.primary,
                            },
                        ]}
                        value={code[i]}
                        onChangeText={text => handleCodeChange(text, i)}
                        onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                        keyboardType="number-pad"
                        maxLength={i === 0 ? OTP_LENGTH : 1} // Allow paste on first input
                        textContentType="oneTimeCode"
                        autoComplete="one-time-code"
                        autoFocus={i === 0}
                        selectTextOnFocus
                        accessibilityLabel={`Digit ${i + 1} of ${OTP_LENGTH}`}
                    />
                ))}
            </Animated.View>

            {/* Error */}
            {error && (
                <Animated.View entering={FadeIn.duration(200)}>
                    <Text style={[styles.errorText, { color: c.coral[400] }]}>{error}</Text>
                </Animated.View>
            )}

            {/* Success */}
            {success && (
                <Animated.View entering={FadeIn.duration(200)} style={styles.successRow}>
                    <Ionicons name="checkmark-circle" size={20} color={c.emerald[500]} />
                    <Text style={[styles.successText, { color: c.emerald[500] }]}>Email verified!</Text>
                </Animated.View>
            )}

            {/* Verify button — gold gradient */}
            <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.buttonWrap}>
                <TouchableOpacity
                    onPress={handleVerify}
                    disabled={isVerifying || success || code.join('').length !== OTP_LENGTH}
                    activeOpacity={0.85}
                    style={[
                        styles.verifyButton,
                        (isVerifying || success || code.join('').length !== OTP_LENGTH) && { opacity: 0.5 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Verify email"
                >
                    <LinearGradient
                        colors={[c.gold[400], c.gold[600]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.verifyGradient}
                    >
                        {isVerifying ? (
                            <ActivityIndicator color={c.text.inverse} size="small" />
                        ) : (
                            <Text style={[styles.verifyButtonText, { color: c.text.inverse }]}>Verify</Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>

            {/* Resend */}
            <Animated.View entering={FadeInDown.delay(500).duration(500)} style={styles.resendWrap}>
                <Text style={[styles.resendLabel, { color: c.text.muted }]}>
                    Didn't get the code?
                </Text>
                <TouchableOpacity
                    onPress={handleResend}
                    disabled={resendCooldown > 0 || isResending}
                    accessibilityRole="button"
                    accessibilityLabel={resendCooldown > 0 ? `Resend available in ${resendCooldown} seconds` : 'Resend code'}
                >
                    <Text style={[
                        styles.resendButton,
                        { color: resendCooldown > 0 ? c.text.muted : c.gold[500] },
                    ]}>
                        {isResending ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                    </Text>
                </TouchableOpacity>
            </Animated.View>

            {/* Skip */}
            <TouchableOpacity onPress={handleSkip} style={styles.skipWrap} accessibilityRole="button" accessibilityLabel="Skip verification for now">
                <Text style={[styles.skipText, { color: c.text.muted }]}>
                    Skip for now
                </Text>
                <Text style={[styles.skipNote, { color: c.text.muted }]}>
                    You'll need to verify before posting
                </Text>
            </TouchableOpacity>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    iconWrap: {
        marginBottom: spacing.lg,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 30,
        fontWeight: '800' as const,
        letterSpacing: -1,
        lineHeight: 36,
        textAlign: 'center',
        marginBottom: spacing.sm,
        fontFamily: 'Inter-Bold',
    },
    subtitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: '400' as const,
        textAlign: 'center',
        lineHeight: 20,
        letterSpacing: 0.2,
        marginBottom: spacing.xl,
        fontFamily: 'Inter',
        opacity: 0.7,
    },
    otpRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: spacing.lg,
    },
    otpInput: {
        width: 48,
        height: 56,
        borderRadius: 12,
        borderWidth: 1.5,
        textAlign: 'center',
        fontSize: 22,
        fontWeight: '700' as const,
    },
    errorText: {
        fontSize: typography.fontSize.sm,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    successRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: spacing.md,
    },
    successText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600' as const,
    },
    buttonWrap: {
        width: '100%',
        marginBottom: spacing.lg,
    },
    verifyButton: {
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#FFB020',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 4,
    },
    verifyGradient: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderRadius: 14,
    },
    verifyButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: '700' as const,
        color: '#FFFFFF',
    },
    resendWrap: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    resendLabel: {
        fontSize: typography.fontSize.sm,
        marginBottom: 4,
    },
    resendButton: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600' as const,
    },
    skipWrap: {
        alignItems: 'center',
        marginTop: 'auto',
    },
    skipText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '500' as const,
    },
    skipNote: {
        fontSize: typography.fontSize.xs,
        marginTop: 2,
    },
});
