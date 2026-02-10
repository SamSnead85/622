// ============================================
// Signup Screen — Enhanced with social sign-in,
// password visibility, animations, haptics,
// auto-advance fields, and polished UX
// ============================================

import { useState, useMemo, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import Animated, {
    FadeInDown,
    FadeInUp,
    FadeIn,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    interpolateColor,
} from 'react-native-reanimated';
import { Button, colors, typography, spacing } from '@zerog/ui';
import { BackButton } from '../../components';
import { useAuthStore } from '../../stores';

WebBrowser.maybeCompleteAuthSession();

// ============================================
// Password Strength
// ============================================

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

// ============================================
// Animated Input Field
// ============================================

interface AnimatedFieldProps {
    label: string;
    placeholder: string;
    value: string;
    onChangeText: (text: string) => void;
    error?: string;
    hint?: string;
    secureTextEntry?: boolean;
    keyboardType?: 'default' | 'email-address';
    autoCapitalize?: 'none' | 'sentences' | 'words';
    autoComplete?: 'email' | 'password' | 'name' | 'off';
    autoCorrect?: boolean;
    returnKeyType?: 'next' | 'done' | 'go';
    onSubmitEditing?: () => void;
    inputRef?: React.RefObject<TextInput>;
    delay?: number;
    icon?: keyof typeof Ionicons.glyphMap;
}

function AnimatedField({
    label, placeholder, value, onChangeText, error, hint, secureTextEntry,
    keyboardType = 'default', autoCapitalize = 'none', autoComplete = 'off',
    autoCorrect = false, returnKeyType = 'next', onSubmitEditing,
    inputRef, delay = 0, icon,
}: AnimatedFieldProps) {
    const [isSecure, setIsSecure] = useState(secureTextEntry ?? false);
    const isFocused = useSharedValue(0);

    const handleFocus = useCallback(() => {
        isFocused.value = withTiming(1, { duration: 200 });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, [isFocused]);

    const handleBlur = useCallback(() => {
        isFocused.value = withTiming(0, { duration: 200 });
    }, [isFocused]);

    const animatedBorderStyle = useAnimatedStyle(() => ({
        borderColor: error
            ? colors.coral[500]
            : interpolateColor(isFocused.value, [0, 1], [colors.border.subtle, colors.gold[500] + '60']),
    }));

    return (
        <Animated.View
            entering={FadeInDown.delay(delay).duration(400).springify()}
            style={styles.fieldGroup}
        >
            <Text style={styles.fieldLabel}>{label}</Text>
            <Animated.View style={[styles.fieldInput, animatedBorderStyle]}>
                {icon && (
                    <View style={styles.fieldIconContainer}>
                        <Ionicons name={icon} size={18} color={colors.text.muted} />
                    </View>
                )}
                <TextInput
                    ref={inputRef}
                    style={[styles.fieldTextInput, icon && styles.fieldTextInputWithIcon]}
                    placeholder={placeholder}
                    placeholderTextColor={colors.text.muted}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    autoComplete={autoComplete}
                    autoCorrect={autoCorrect}
                    secureTextEntry={isSecure}
                    returnKeyType={returnKeyType}
                    onSubmitEditing={onSubmitEditing}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    value={value}
                    onChangeText={onChangeText}
                    selectionColor={colors.gold[500]}
                    accessibilityLabel={label}
                />
                {secureTextEntry && (
                    <TouchableOpacity
                        style={styles.visibilityToggle}
                        onPress={() => {
                            setIsSecure(!isSecure);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        accessibilityLabel={isSecure ? 'Show password' : 'Hide password'}
                    >
                        <Ionicons
                            name={isSecure ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={colors.text.muted}
                        />
                    </TouchableOpacity>
                )}
            </Animated.View>
            {error && (
                <Animated.Text entering={FadeIn.duration(200)} style={styles.fieldError}>
                    {error}
                </Animated.Text>
            )}
            {!error && hint && (
                <Text style={styles.fieldHint}>{hint}</Text>
            )}
        </Animated.View>
    );
}

// ============================================
// Social Button
// ============================================

function SocialButton({
    icon, label, onPress, color, bgColor, borderColor, loading, delay = 0,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    color: string;
    bgColor: string;
    borderColor: string;
    loading?: boolean;
    delay?: number;
}) {
    return (
        <Animated.View entering={FadeInDown.delay(delay).duration(400).springify()}>
            <TouchableOpacity
                style={[styles.socialButton, { backgroundColor: bgColor, borderColor }]}
                onPress={onPress}
                activeOpacity={0.7}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel={label}
            >
                {loading ? (
                    <ActivityIndicator size="small" color={color} />
                ) : (
                    <Ionicons name={icon} size={20} color={color} />
                )}
                <Text style={[styles.socialButtonText, { color }]}>{label}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

// ============================================
// Signup Screen
// ============================================

export default function SignupScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const signup = useAuthStore((s) => s.signup);
    const appleLogin = useAuthStore((s) => s.appleLogin);
    const googleLogin = useAuthStore((s) => s.googleLogin);
    const isLoading = useAuthStore((s) => s.isLoading);

    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [googleLoading, setGoogleLoading] = useState(false);

    const emailRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);
    const confirmRef = useRef<TextInput>(null);

    const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

    // ---- Apple Sign Up ----
    const handleAppleSignup = useCallback(async () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });

            if (credential.identityToken) {
                await appleLogin(credential.identityToken, credential.fullName);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.replace('/(auth)/username');
            }
        } catch (error: any) {
            if (error.code !== 'ERR_REQUEST_CANCELED') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('Apple Sign Up', 'Sign up with Apple failed. Please try again.');
            }
        }
    }, [appleLogin, router]);

    // ---- Google Sign Up ----
    const handleGoogleSignup = useCallback(async () => {
        try {
            setGoogleLoading(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            const redirectUri = AuthSession.makeRedirectUri({ preferLocalhost: false });
            const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

            if (!clientId) {
                Alert.alert('Google Sign Up', 'Google Sign In is being configured. Please use email or Apple for now.');
                setGoogleLoading(false);
                return;
            }

            const discovery = {
                authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
                tokenEndpoint: 'https://oauth2.googleapis.com/token',
            };

            const request = new AuthSession.AuthRequest({
                clientId,
                redirectUri,
                scopes: ['openid', 'profile', 'email'],
                responseType: AuthSession.ResponseType.IdToken,
            });

            const result = await request.promptAsync(discovery);

            if (result.type === 'success' && result.params?.id_token) {
                await googleLogin(result.params.id_token);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.replace('/(auth)/username');
            }
        } catch {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Google Sign Up', 'Sign up with Google failed. Please try again.');
        } finally {
            setGoogleLoading(false);
        }
    }, [googleLogin, router]);

    // ---- Form Validation ----
    const validateForm = useCallback(() => {
        const newErrors: Record<string, string> = {};

        if (!displayName.trim()) newErrors.displayName = 'Name is required';
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
    }, [displayName, email, password, confirmPassword]);

    // ---- Email/Password Signup ----
    const handleSignup = useCallback(async () => {
        if (!validateForm()) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await signup(email.trim(), password, displayName.trim());
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace('/(auth)/username');
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const message = error?.data?.error || error?.message || 'Signup failed';
            setErrors({ email: message });
        }
    }, [validateForm, signup, email, password, displayName, router]);

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
                    <BackButton style={{ alignSelf: 'flex-start', marginBottom: spacing.lg }} />

                    {/* Header */}
                    <Animated.View entering={FadeInDown.delay(50).duration(500).springify()}>
                        <View style={styles.header}>
                            <Text style={styles.title} accessibilityRole="header">Create account</Text>
                            <Text style={styles.subtitle}>
                                Your world, your rules — start in private mode
                            </Text>
                        </View>
                    </Animated.View>

                    {/* Social Sign Up — First for minimum friction */}
                    <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                        <View style={styles.socialButtons}>
                            {Platform.OS === 'ios' && (
                                <SocialButton
                                    icon="logo-apple"
                                    label="Continue with Apple"
                                    onPress={handleAppleSignup}
                                    color={colors.text.primary}
                                    bgColor={colors.obsidian[600]}
                                    borderColor={colors.border.default}
                                    delay={120}
                                />
                            )}
                            <SocialButton
                                icon="logo-google"
                                label="Continue with Google"
                                onPress={handleGoogleSignup}
                                color={colors.text.primary}
                                bgColor={colors.surface.glass}
                                borderColor={colors.border.subtle}
                                loading={googleLoading}
                                delay={160}
                            />
                        </View>
                    </Animated.View>

                    {/* Divider */}
                    <Animated.View entering={FadeIn.delay(200).duration(300)} style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or use email</Text>
                        <View style={styles.dividerLine} />
                    </Animated.View>

                    {/* Form */}
                    <View style={styles.form}>
                        <AnimatedField
                            label="Display Name"
                            placeholder="Your name"
                            value={displayName}
                            onChangeText={(text) => {
                                setDisplayName(text);
                                if (errors.displayName) setErrors((e) => ({ ...e, displayName: '' }));
                            }}
                            error={errors.displayName}
                            autoCapitalize="words"
                            autoComplete="name"
                            returnKeyType="next"
                            onSubmitEditing={() => emailRef.current?.focus()}
                            icon="person-outline"
                            delay={240}
                        />

                        <AnimatedField
                            label="Email"
                            placeholder="you@example.com"
                            value={email}
                            onChangeText={(text) => {
                                setEmail(text);
                                if (errors.email) setErrors((e) => ({ ...e, email: '' }));
                            }}
                            error={errors.email}
                            keyboardType="email-address"
                            autoComplete="email"
                            returnKeyType="next"
                            onSubmitEditing={() => passwordRef.current?.focus()}
                            inputRef={emailRef}
                            icon="mail-outline"
                            delay={280}
                        />

                        <AnimatedField
                            label="Password"
                            placeholder="Create a password"
                            value={password}
                            onChangeText={(text) => {
                                setPassword(text);
                                if (errors.password) setErrors((e) => ({ ...e, password: '' }));
                            }}
                            error={errors.password}
                            hint="At least 8 characters"
                            secureTextEntry
                            autoComplete="password"
                            returnKeyType="next"
                            onSubmitEditing={() => confirmRef.current?.focus()}
                            inputRef={passwordRef}
                            icon="lock-closed-outline"
                            delay={320}
                        />

                        {/* Password Strength Indicator */}
                        {password.length > 0 && (
                            <Animated.View entering={FadeIn.duration(300)} style={styles.strengthContainer}>
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
                            </Animated.View>
                        )}

                        <AnimatedField
                            label="Confirm Password"
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onChangeText={(text) => {
                                setConfirmPassword(text);
                                if (errors.confirmPassword) setErrors((e) => ({ ...e, confirmPassword: '' }));
                            }}
                            error={errors.confirmPassword}
                            secureTextEntry
                            returnKeyType="go"
                            onSubmitEditing={handleSignup}
                            inputRef={confirmRef}
                            icon="shield-checkmark-outline"
                            delay={360}
                        />

                        <Animated.View entering={FadeInDown.delay(400).duration(400)}>
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
                        </Animated.View>
                    </View>

                    {/* Login Link */}
                    <Animated.View entering={FadeInUp.delay(440).duration(400)} style={styles.loginContainer}>
                        <Text style={styles.loginText}>Already have an account? </Text>
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.push('/(auth)/login');
                            }}
                            accessibilityRole="link"
                            accessibilityLabel="Log in to existing account"
                        >
                            <Text style={styles.loginLink}>Log in</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Terms */}
                    <Animated.View entering={FadeIn.delay(480).duration(300)}>
                        <Text style={styles.terms}>
                            By signing up, you agree to our Terms of Service and Privacy Policy
                        </Text>
                    </Animated.View>

                    {/* Privacy Notice */}
                    <Animated.View entering={FadeInDown.delay(520).duration(400)}>
                        <View style={styles.privacyNotice}>
                            <Ionicons name="lock-closed" size={16} color={colors.gold[400]} style={{ marginTop: 1 }} />
                            <Text style={styles.privacyText}>
                                Your account starts in private mode. Only people you invite can see your posts.
                                You can optionally join the larger community later.
                            </Text>
                        </View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
    container: { flex: 1 },
    keyboardView: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingHorizontal: spacing.xl },
    header: { marginBottom: spacing.xl },
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

    // ---- Social Buttons ----
    socialButtons: {
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    socialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderRadius: 14,
        paddingVertical: spacing.md + 2,
        gap: spacing.sm,
    },
    socialButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
    },

    // ---- Divider ----
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.lg,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border.subtle },
    dividerText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        paddingHorizontal: spacing.md,
    },

    // ---- Form ----
    form: { marginBottom: spacing.lg },
    fieldGroup: {
        marginBottom: spacing.md,
    },
    fieldLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.secondary,
        marginBottom: spacing.xs,
    },
    fieldInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: colors.border.subtle,
    },
    fieldIconContainer: {
        paddingLeft: spacing.md,
    },
    fieldTextInput: {
        flex: 1,
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        minHeight: 50,
    },
    fieldTextInputWithIcon: {
        paddingLeft: spacing.sm,
    },
    visibilityToggle: {
        paddingRight: spacing.md,
        paddingVertical: spacing.md,
    },
    fieldError: {
        fontSize: typography.fontSize.xs,
        color: colors.coral[500],
        marginTop: spacing.xs,
    },
    fieldHint: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        marginTop: spacing.xs,
    },

    // ---- Password Strength ----
    strengthContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: -spacing.xs,
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

    // ---- Login Link ----
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: spacing.xl,
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
