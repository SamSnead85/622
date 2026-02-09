import { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, Input, colors, typography, spacing } from '@zerog/ui';
import { BackButton } from '../../components';
import { useAuthStore } from '../../stores';

// Password strength calculation
function getPasswordStrength(password: string): { level: number; label: string; color: string } {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 1) return { level: 1, label: 'Weak', color: colors.coral[500] };
    if (score <= 2) return { level: 2, label: 'Fair', color: colors.amber[500] };
    if (score <= 3) return { level: 3, label: 'Good', color: colors.gold[500] };
    return { level: 4, label: 'Strong', color: colors.emerald[500] };
}

export default function SignupScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const signup = useAuthStore((s) => s.signup);
    const appleLogin = useAuthStore((s) => s.appleLogin);
    const isLoading = useAuthStore((s) => s.isLoading);

    const handleAppleSignup = async () => {
        try {
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });

            if (credential.identityToken) {
                await appleLogin(credential.identityToken, credential.fullName);
                router.replace('/(auth)/username');
            }
        } catch (error: any) {
            if (error.code !== 'ERR_REQUEST_CANCELED') {
                Alert.alert('Apple Sign Up', 'Sign up with Apple failed. Please try again.');
            }
        }
    };

    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!displayName.trim()) {
            newErrors.displayName = 'Name is required';
        }

        if (!email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Please enter a valid email';
        }

        if (!password) {
            newErrors.password = 'Password is required';
        } else if (password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
        }

        if (password !== confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSignup = async () => {
        if (!validateForm()) return;

        try {
            await signup(email.trim(), password, displayName.trim());
            router.replace('/(auth)/username');
        } catch (error: any) {
            const message = error?.data?.error || error?.message || 'Signup failed';
            setErrors({ email: message });
        }
    };

    return (
        <LinearGradient
            colors={[colors.obsidian[900], colors.obsidian[800]]}
            style={styles.container}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
                    ]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Back button */}
                    <BackButton style={{ alignSelf: 'flex-start', marginBottom: spacing.xl }} />

                    <Animated.View entering={FadeInDown.duration(400)}>
                        <View style={styles.header}>
                            <Text style={styles.title} accessibilityRole="header">Create account</Text>
                            <Text style={styles.subtitle}>
                                Join your private community — your world, your rules
                            </Text>
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.duration(400).delay(100)}>
                        <View style={styles.form}>
                            <Input
                                label="Display Name"
                                placeholder="Your name"
                                autoCapitalize="words"
                                accessibilityLabel="Display name"
                                value={displayName}
                                onChangeText={(text) => {
                                    setDisplayName(text);
                                    if (errors.displayName) setErrors((e) => ({ ...e, displayName: '' }));
                                }}
                                error={errors.displayName}
                            />

                            <Input
                                label="Email"
                                placeholder="Enter your email"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoComplete="email"
                                accessibilityLabel="Email address"
                                value={email}
                                onChangeText={(text) => {
                                    setEmail(text);
                                    if (errors.email) setErrors((e) => ({ ...e, email: '' }));
                                }}
                                error={errors.email}
                            />

                            <Input
                                label="Password"
                                placeholder="Create a password"
                                secureTextEntry
                                accessibilityLabel="Password"
                                value={password}
                                onChangeText={(text) => {
                                    setPassword(text);
                                    if (errors.password) setErrors((e) => ({ ...e, password: '' }));
                                }}
                                error={errors.password}
                                hint="At least 8 characters"
                            />

                            {/* Password strength indicator */}
                            {password.length > 0 && (
                                <View style={styles.strengthContainer}>
                                    <View style={styles.strengthBar}>
                                        {[1, 2, 3, 4].map((level) => (
                                            <View
                                                key={level}
                                                style={[
                                                    styles.strengthSegment,
                                                    {
                                                        backgroundColor:
                                                            level <= passwordStrength.level
                                                                ? passwordStrength.color
                                                                : colors.obsidian[600],
                                                    },
                                                ]}
                                            />
                                        ))}
                                    </View>
                                    <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                                        {passwordStrength.label}
                                    </Text>
                                </View>
                            )}

                            <Input
                                label="Confirm Password"
                                placeholder="Confirm your password"
                                secureTextEntry
                                accessibilityLabel="Confirm password"
                                value={confirmPassword}
                                onChangeText={(text) => {
                                    setConfirmPassword(text);
                                    if (errors.confirmPassword) setErrors((e) => ({ ...e, confirmPassword: '' }));
                                }}
                                error={errors.confirmPassword}
                            />

                            <Button
                                variant="primary"
                                size="lg"
                                fullWidth
                                loading={isLoading}
                                onPress={handleSignup}
                                style={styles.submitButton}
                                accessibilityRole="button"
                                accessibilityLabel="Create account"
                            >
                                Create Account
                            </Button>
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.duration(400).delay(200)}>
                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>or sign up with</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <View style={styles.socialButtons}>
                            {Platform.OS === 'ios' && (
                                <TouchableOpacity
                                    style={[styles.socialButton, styles.appleButton]}
                                    onPress={handleAppleSignup}
                                    activeOpacity={0.7}
                                    accessibilityRole="button"
                                    accessibilityLabel="Sign up with Apple"
                                >
                                    <Ionicons name="logo-apple" size={20} color={colors.text.primary} />
                                    <Text style={[styles.socialButtonText, { color: colors.text.primary }]}>
                                        Sign up with Apple
                                    </Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={styles.socialButton} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Sign up with Google, coming soon" accessibilityState={{ disabled: true }}>
                                <Ionicons name="logo-google" size={18} color={colors.text.muted} />
                                <Text style={styles.socialButtonText}>Google</Text>
                                <Text style={styles.comingSoonBadge}>Soon</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    <View style={styles.loginContainer}>
                        <Text style={styles.loginText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/login')} accessibilityRole="link" accessibilityLabel="Log in to existing account">
                            <Text style={styles.loginLink}>Log in</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.terms}>
                        By signing up, you agree to our Terms of Service and Privacy Policy
                    </Text>

                    {/* Privacy notice */}
                    <View style={styles.privacyNotice}>
                        <Ionicons name="lock-closed" size={16} color={colors.gold[400]} style={{ marginTop: 1 }} />
                        <Text style={styles.privacyText}>
                            Your account starts in private mode. Only people you invite can see your posts.
                            You can optionally join the larger community later.
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    keyboardView: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingHorizontal: spacing.xl },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'flex-start',
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    header: { marginBottom: spacing['2xl'] },
    title: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: '700',
        color: colors.text.primary,
        letterSpacing: -0.5,
        fontFamily: 'Inter-Bold',
    },
    subtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        marginTop: spacing.sm,
    },
    form: { marginBottom: spacing.lg },
    strengthContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: -spacing.sm,
        marginBottom: spacing.md,
        paddingHorizontal: 2,
    },
    strengthBar: {
        flexDirection: 'row',
        flex: 1,
        gap: 4,
    },
    strengthSegment: {
        flex: 1,
        height: 3,
        borderRadius: 2,
    },
    strengthLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        marginStart: spacing.sm,
    },
    submitButton: { marginTop: spacing.md },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.xl,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border.subtle },
    dividerText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        paddingHorizontal: spacing.md,
    },
    socialButtons: { flexDirection: 'row', gap: spacing.md },
    socialButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        borderRadius: 12,
        paddingVertical: spacing.md,
        gap: spacing.sm,
        opacity: 0.6,
    },
    appleButton: {
        opacity: 1,
        backgroundColor: colors.obsidian[600],
        borderColor: colors.border.default,
    },
    socialButtonText: {
        fontSize: typography.fontSize.base,
        color: colors.text.muted,
        fontWeight: '500',
    },
    comingSoonBadge: {
        fontSize: 9,
        color: colors.text.muted,
        backgroundColor: colors.surface.glassActive,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
        fontWeight: '600',
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: spacing['2xl'],
    },
    loginText: { fontSize: typography.fontSize.base, color: colors.text.secondary },
    loginLink: {
        fontSize: typography.fontSize.base,
        color: colors.gold[500],
        fontWeight: '600',
    },
    terms: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        textAlign: 'center',
        marginTop: spacing.xl,
        lineHeight: 18,
    },
    privacyNotice: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.surface.goldSubtle,
        borderRadius: 12,
        padding: spacing.md,
        marginTop: spacing.lg,
        borderWidth: 1,
        borderColor: colors.surface.goldMedium,
        gap: spacing.sm,
    },
    privacyText: {
        flex: 1,
        fontSize: typography.fontSize.xs,
        color: colors.gold[400],
        lineHeight: 18,
    },
});
