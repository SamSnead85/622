// ============================================
// Login Screen — Theme-aware, polished, functional
// ============================================

import { useState, useRef, useCallback, useEffect } from 'react';
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
    Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as LocalAuthentication from 'expo-local-authentication';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
    FadeInDown,
    FadeInUp,
    FadeIn,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withSequence,
    interpolateColor,
} from 'react-native-reanimated';
import { typography, spacing } from '@zerog/ui';
import { BackButton, BrandLogo } from '../../components';
import { useAuthStore } from '../../stores';
import { apiFetch } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';

WebBrowser.maybeCompleteAuthSession();

const BIOMETRIC_ENABLED_KEY = '@biometric-enabled';
const LAST_EMAIL_KEY = '@last-login-email';

// ============================================
// User-friendly error message mapping
// ============================================

function friendlyError(raw: string): string {
    const lower = raw.toLowerCase();
    if (lower.includes('invalid') || lower.includes('credentials') || lower.includes('unauthorized')) {
        return 'Incorrect email or password. Please try again.';
    }
    if (lower.includes('not found') || lower.includes('no user') || lower.includes('no account')) {
        return 'No account found with this email. Would you like to sign up?';
    }
    if (lower.includes('too many') || lower.includes('rate limit') || lower.includes('throttl')) {
        return 'Too many attempts. Please wait a moment and try again.';
    }
    if (lower.includes('network') || lower.includes('fetch') || lower.includes('timeout')) {
        return 'Connection issue. Please check your internet and try again.';
    }
    if (lower.includes('locked') || lower.includes('disabled') || lower.includes('suspended')) {
        return 'This account has been temporarily locked. Please try again later or contact support.';
    }
    if (lower.includes('server') || lower.includes('500') || lower.includes('internal')) {
        return 'A server error occurred. Please try again in a moment.';
    }
    if (raw.length < 100 && !raw.includes('Error:') && !raw.includes('at ')) {
        return raw;
    }
    return 'Sign in failed. Please try again.';
}

// ============================================
// Login Screen
// ============================================

export default function LoginScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: c, isDark } = useTheme();
    const login = useAuthStore((s) => s.login);
    const appleLogin = useAuthStore((s) => s.appleLogin);
    const googleLogin = useAuthStore((s) => s.googleLogin);
    const isLoading = useAuthStore((s) => s.isLoading);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSecure, setIsSecure] = useState(true);
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
    const [generalError, setGeneralError] = useState<string | null>(null);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricType, setBiometricType] = useState<string>('Biometrics');
    const [showBiometric, setShowBiometric] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [resetSending, setResetSending] = useState(false);

    const passwordRef = useRef<TextInput>(null);
    const scrollRef = useRef<ScrollView>(null);
    const biometricTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const buttonScale = useSharedValue(1);
    const animatedButtonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }],
    }));

    // Email field focus animation
    const emailFocused = useSharedValue(0);
    const passFocused = useSharedValue(0);

    const emailBorderStyle = useAnimatedStyle(() => ({
        borderColor: errors.email
            ? c.coral[500]
            : interpolateColor(emailFocused.value, [0, 1], [c.border.subtle, c.gold[500] + '80']),
    }));
    const passBorderStyle = useAnimatedStyle(() => ({
        borderColor: errors.password
            ? c.coral[500]
            : interpolateColor(passFocused.value, [0, 1], [c.border.subtle, c.gold[500] + '80']),
    }));

    // ---- Check biometric availability ----
    useEffect(() => {
        const checkBiometric = async () => {
            try {
                const compatible = await LocalAuthentication.hasHardwareAsync();
                const enrolled = await LocalAuthentication.isEnrolledAsync();
                const biometricEnabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
                const lastEmail = await AsyncStorage.getItem(LAST_EMAIL_KEY);
                if (compatible && enrolled) {
                    setBiometricAvailable(true);
                    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
                    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
                        setBiometricType('Face ID');
                    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
                        setBiometricType('Touch ID');
                    }
                    if (biometricEnabled === 'true' && lastEmail) {
                        setEmail(lastEmail);
                        setShowBiometric(true);
                    }
                }
            } catch {
                // Biometric not available
            }
        };
        checkBiometric();
    }, []);

    // ---- Biometric authentication ----
    const handleBiometricAuth = useCallback(async () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: `Sign in with ${biometricType}`,
                cancelLabel: 'Use Password',
                disableDeviceFallback: true,
            });
            if (result.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                const { initialize } = useAuthStore.getState();
                await initialize();
                const isAuth = useAuthStore.getState().isAuthenticated;
                if (isAuth) {
                    router.replace('/(tabs)');
                } else {
                    setShowBiometric(false);
                    setGeneralError('Your session has expired. Please sign in with your password.');
                }
            }
        } catch {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    }, [biometricType, router]);

    useEffect(() => {
        if (showBiometric) {
            biometricTimerRef.current = setTimeout(handleBiometricAuth, 600);
            return () => {
                if (biometricTimerRef.current) clearTimeout(biometricTimerRef.current);
            };
        }
    }, [showBiometric, handleBiometricAuth]);

    // ---- Apple Sign In ----
    const handleAppleLogin = useCallback(async () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setGeneralError(null);
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });
            if (credential.identityToken) {
                await appleLogin(credential.identityToken, credential.fullName);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.replace('/(tabs)');
            }
        } catch (error: unknown) {
            const err = error as { code?: string };
            if (err.code !== 'ERR_REQUEST_CANCELED') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                setGeneralError('Apple Sign In failed. Please try again.');
            }
        }
    }, [appleLogin, router]);

    // ---- Google Sign In ----
    const handleGoogleLogin = useCallback(async () => {
        try {
            setGoogleLoading(true);
            setGeneralError(null);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
            if (!clientId) {
                setGeneralError('Google Sign In is being set up. Please use email or Apple Sign In for now.');
                setGoogleLoading(false);
                return;
            }
            const redirectUri = AuthSession.makeRedirectUri({ scheme: 'zerog', preferLocalhost: false });
            const discovery = await AuthSession.fetchDiscoveryAsync('https://accounts.google.com');
            const request = new AuthSession.AuthRequest({
                clientId,
                redirectUri,
                scopes: ['openid', 'profile', 'email'],
                responseType: AuthSession.ResponseType.Token,
                usePKCE: false,
                extraParams: { nonce: Math.random().toString(36).substring(2) },
            });
            const result = await request.promptAsync(discovery);
            if (result.type === 'success') {
                const idToken = result.params?.id_token;
                const accessToken = result.authentication?.accessToken || result.params?.access_token;
                if (idToken) {
                    await googleLogin(idToken);
                } else if (accessToken) {
                    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                        headers: { Authorization: `Bearer ${accessToken}` },
                    });
                    const userInfo = await userInfoRes.json();
                    if (userInfo.email) {
                        await googleLogin(accessToken, userInfo);
                    } else {
                        throw new Error('Could not get email from Google');
                    }
                } else {
                    throw new Error('No token received from Google');
                }
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.replace('/(tabs)');
            } else if (result.type === 'error') {
                throw new Error(result.error?.message || 'Google Sign In failed');
            }
        } catch (error: unknown) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const message = error instanceof Error ? error.message : 'Google Sign In failed. Please try again.';
            if (message?.includes('configured') || message?.includes('redirect')) {
                setGeneralError('Google Sign In is being configured. Please use email or Apple Sign In for now.');
            } else {
                setGeneralError(message);
            }
        } finally {
            setGoogleLoading(false);
        }
    }, [googleLogin, router]);

    // ---- Email/Password Login ----
    const handleLogin = useCallback(async () => {
        Keyboard.dismiss();
        setGeneralError(null);

        const newErrors: { email?: string; password?: string } = {};
        if (!email.trim()) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Please enter a valid email';
        if (!password) newErrors.password = 'Password is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        try {
            buttonScale.value = withSequence(
                withSpring(0.96, { damping: 15 }),
                withSpring(1, { damping: 15 }),
            );
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await login(email.trim(), password);
            await AsyncStorage.setItem(LAST_EMAIL_KEY, email.trim());
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            if (biometricAvailable) {
                const biometricEnabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
                if (biometricEnabled !== 'true') {
                    Alert.alert(
                        `Enable ${biometricType}?`,
                        `Sign in faster next time using ${biometricType}.`,
                        [
                            { text: 'Not Now', style: 'cancel', onPress: () => router.replace('/(tabs)') },
                            {
                                text: 'Enable',
                                onPress: async () => {
                                    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                    router.replace('/(tabs)');
                                },
                            },
                        ],
                        { cancelable: true, onDismiss: () => router.replace('/(tabs)') },
                    );
                    return;
                }
            }
            router.replace('/(tabs)');
        } catch (error: unknown) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const err = error as { data?: { error?: string }; message?: string };
            const rawMessage = err?.data?.error || (error instanceof Error ? error.message : 'Invalid email or password');
            setGeneralError(friendlyError(rawMessage));
        }
    }, [email, password, login, router, biometricAvailable, biometricType, buttonScale]);

    // ---- Forgot password ----
    const handleForgotPassword = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const trimmed = (email || '').trim();
        if (!trimmed || !/\S+@\S+\.\S+/.test(trimmed)) {
            Alert.alert('Reset Password', 'Please enter your email address in the field above, then tap "Forgot Password" again.');
            return;
        }
        setResetSending(true);
        try {
            await apiFetch('/api/v1/auth/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email: trimmed }),
            });
        } catch {
            // Don't reveal if account exists
        } finally {
            setResetSending(false);
        }
        Alert.alert('Check Your Email', "If an account exists with that email, you'll receive a reset link.");
    }, [email, resetSending]);

    return (
        <LinearGradient
            colors={[c.background, isDark ? '#0F0F18' : '#F8F9FC', c.background]}
            locations={[0, 0.5, 1]}
            style={styles.container}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView
                    ref={scrollRef}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
                    ]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                    bounces={false}
                >
                    {/* Back button */}
                    <BackButton style={{ alignSelf: 'flex-start', marginBottom: spacing.md }} />

                    {/* 0G Logo */}
                    <Animated.View entering={FadeInDown.delay(30).duration(500).springify()} style={styles.logoArea}>
                        <BrandLogo size="standard" />
                    </Animated.View>

                    {/* Header */}
                    <Animated.View entering={FadeInDown.delay(60).duration(500).springify()} style={styles.header}>
                        <Text style={[styles.title, { color: c.text.primary }]} accessibilityRole="header">
                            Welcome back
                        </Text>
                        <Text style={[styles.subtitle, { color: c.text.secondary }]}>
                            Sign in to continue
                        </Text>
                    </Animated.View>

                    {/* General Error Banner */}
                    {generalError && (
                        <Animated.View entering={FadeInDown.duration(300)} style={[styles.errorBanner, { backgroundColor: c.coral[500] + '12', borderColor: c.coral[500] + '30' }]}>
                            <Ionicons name="alert-circle" size={18} color={c.coral[500]} />
                            <Text style={[styles.errorBannerText, { color: c.coral[500] }]}>{generalError}</Text>
                            <TouchableOpacity
                                onPress={() => setGeneralError(null)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityLabel="Dismiss error"
                                accessibilityRole="button"
                            >
                                <Ionicons name="close" size={16} color={c.coral[500]} />
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    {/* Social Sign In */}
                    <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.socialSection}>
                        {Platform.OS === 'ios' && (
                            <TouchableOpacity
                                style={[styles.socialBtn, { backgroundColor: isDark ? '#FFFFFF' : '#000000', borderColor: isDark ? '#FFFFFF' : '#000000' }]}
                                onPress={handleAppleLogin}
                                activeOpacity={0.7}
                                accessibilityLabel="Sign in with Apple"
                                accessibilityRole="button"
                            >
                                <Ionicons name="logo-apple" size={20} color={isDark ? '#000000' : '#FFFFFF'} />
                                <Text style={[styles.socialBtnText, { color: isDark ? '#000000' : '#FFFFFF' }]}>Continue with Apple</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.socialBtn, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}
                            onPress={handleGoogleLogin}
                            activeOpacity={0.7}
                            disabled={googleLoading}
                            accessibilityLabel="Sign in with Google"
                            accessibilityRole="button"
                        >
                            {googleLoading ? (
                                <ActivityIndicator size="small" color={c.text.primary} />
                            ) : (
                                <Ionicons name="logo-google" size={18} color={c.text.primary} />
                            )}
                            <Text style={[styles.socialBtnText, { color: c.text.primary }]}>Continue with Google</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Biometric Quick Sign In */}
                    {biometricAvailable && showBiometric && (
                        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
                            <TouchableOpacity
                                style={[styles.biometricBtn, { borderColor: c.gold[500] + '30' }]}
                                onPress={handleBiometricAuth}
                                activeOpacity={0.7}
                                accessibilityLabel="Sign in with biometrics"
                                accessibilityRole="button"
                            >
                                <LinearGradient
                                    colors={[c.gold[500] + '12', c.gold[500] + '04']}
                                    style={styles.biometricInner}
                                >
                                    <Ionicons
                                        name={biometricType === 'Face ID' ? 'scan-outline' : 'finger-print-outline'}
                                        size={26}
                                        color={c.gold[500]}
                                    />
                                    <Text style={[styles.biometricText, { color: c.gold[400] }]}>
                                        Sign in with {biometricType}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    {/* Divider */}
                    <Animated.View entering={FadeIn.delay(180).duration(300)} style={styles.divider}>
                        <View style={[styles.dividerLine, { backgroundColor: c.border.subtle }]} />
                        <Text style={[styles.dividerText, { color: c.text.muted }]}>or use email</Text>
                        <View style={[styles.dividerLine, { backgroundColor: c.border.subtle }]} />
                    </Animated.View>

                    {/* Email Field */}
                    <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.fieldGroup}>
                        <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Email</Text>
                        <Animated.View style={[styles.fieldRow, { backgroundColor: c.surface.glass }, emailBorderStyle]}>
                            <Ionicons name="mail-outline" size={18} color={errors.email ? c.coral[500] : c.text.muted} style={styles.fieldIcon} />
                            <TextInput
                                style={[styles.fieldInput, { color: c.text.primary }]}
                                placeholder="you@example.com"
                                placeholderTextColor={c.text.muted}
                                keyboardType="email-address"
                                accessibilityLabel="Email address"
                                autoCapitalize="none"
                                autoComplete="email"
                                autoCorrect={false}
                                returnKeyType="next"
                                onSubmitEditing={() => passwordRef.current?.focus()}
                                value={email}
                                onChangeText={(t) => { setEmail(t); if (errors.email) setErrors(e => ({ ...e, email: undefined })); if (generalError) setGeneralError(null); }}
                                onFocus={() => { emailFocused.value = withTiming(1, { duration: 200 }); }}
                                onBlur={() => { emailFocused.value = withTiming(0, { duration: 200 }); }}
                                selectionColor={c.gold[500]}
                            />
                        </Animated.View>
                        {errors.email && <Text style={[styles.fieldError, { color: c.coral[500] }]}>{errors.email}</Text>}
                    </Animated.View>

                    {/* Password Field */}
                    <Animated.View entering={FadeInDown.delay(240).duration(400)} style={styles.fieldGroup}>
                        <Text style={[styles.fieldLabel, { color: c.text.secondary }]}>Password</Text>
                        <Animated.View style={[styles.fieldRow, { backgroundColor: c.surface.glass }, passBorderStyle]}>
                            <Ionicons name="lock-closed-outline" size={18} color={errors.password ? c.coral[500] : c.text.muted} style={styles.fieldIcon} />
                            <TextInput
                                ref={passwordRef}
                                style={[styles.fieldInput, { color: c.text.primary }]}
                                placeholder="Enter your password"
                                placeholderTextColor={c.text.muted}
                                secureTextEntry={isSecure}
                                accessibilityLabel="Password"
                                autoCapitalize="none"
                                autoComplete="password"
                                autoCorrect={false}
                                returnKeyType="go"
                                onSubmitEditing={handleLogin}
                                value={password}
                                onChangeText={(t) => { setPassword(t); if (errors.password) setErrors(e => ({ ...e, password: undefined })); if (generalError) setGeneralError(null); }}
                                onFocus={() => { passFocused.value = withTiming(1, { duration: 200 }); }}
                                onBlur={() => { passFocused.value = withTiming(0, { duration: 200 }); }}
                                selectionColor={c.gold[500]}
                            />
                            <TouchableOpacity
                                style={styles.eyeBtn}
                                onPress={() => { setIsSecure(!isSecure); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                accessibilityLabel="Toggle password visibility"
                                accessibilityRole="button"
                            >
                                <Ionicons name={isSecure ? 'eye-off-outline' : 'eye-outline'} size={20} color={c.text.muted} />
                            </TouchableOpacity>
                        </Animated.View>
                        {errors.password && <Text style={[styles.fieldError, { color: c.coral[500] }]}>{errors.password}</Text>}
                    </Animated.View>

                    {/* Forgot password */}
                    <Animated.View entering={FadeInDown.delay(280).duration(400)}>
                        <TouchableOpacity
                            style={styles.forgotBtn}
                            onPress={handleForgotPassword}
                            disabled={resetSending}
                            accessibilityLabel="Forgot password"
                            accessibilityRole="link"
                        >
                            <Text style={[styles.forgotText, { color: c.gold[500] }]}>Forgot password?</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Sign In Button */}
                    <Animated.View entering={FadeInDown.delay(320).duration(400)} style={animatedButtonStyle}>
                        <TouchableOpacity
                            onPress={handleLogin}
                            disabled={isLoading}
                            activeOpacity={0.85}
                            style={[styles.submitBtn, isLoading && { opacity: 0.85 }]}
                            accessibilityLabel="Sign in"
                            accessibilityRole="button"
                        >
                            <LinearGradient
                                colors={isLoading ? [c.gold[600], c.gold[700]] : [c.gold[400], c.gold[600]]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.submitGradient}
                            >
                                {isLoading ? (
                                    <View style={styles.loadingRow}>
                                        <ActivityIndicator size="small" color={c.text.inverse} />
                                        <Text style={[styles.submitText, { color: c.text.inverse }]}>Signing in...</Text>
                                    </View>
                                ) : (
                                    <Text style={[styles.submitText, { color: c.text.inverse }]}>Sign In</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Sign Up Link */}
                    <Animated.View entering={FadeInUp.delay(360).duration(400)} style={styles.signupRow}>
                        <Text style={[styles.signupText, { color: c.text.secondary }]}>Don&apos;t have an account? </Text>
                        <TouchableOpacity
                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(auth)/signup'); }}
                            accessibilityLabel="Create an account"
                            accessibilityRole="link"
                        >
                            <Text style={[styles.signupLink, { color: c.gold[500] }]}>Sign up</Text>
                        </TouchableOpacity>
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

    // Logo area
    logoArea: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    header: { marginBottom: spacing.xl },
    title: {
        fontSize: 30,
        fontWeight: '800',
        letterSpacing: -1,
        lineHeight: 36,
        fontFamily: 'Inter-Bold',
    },
    subtitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: '400',
        marginTop: 6,
        letterSpacing: 0.2,
        fontFamily: 'Inter',
        opacity: 0.7,
    },

    // Error banner
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.lg,
        gap: spacing.sm,
    },
    errorBannerText: {
        flex: 1,
        fontSize: typography.fontSize.sm,
        lineHeight: 18,
    },

    // Social buttons
    socialSection: {
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    socialBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderRadius: 14,
        paddingVertical: 14,
        gap: spacing.sm,
    },
    socialBtnText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        fontFamily: 'Inter-SemiBold',
    },

    // Biometric
    biometricBtn: {
        marginBottom: spacing.md,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
    },
    biometricInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
        paddingVertical: spacing.lg,
        borderRadius: 15,
    },
    biometricText: {
        fontSize: typography.fontSize.lg,
        fontWeight: '600',
    },

    // Divider
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.lg,
    },
    dividerLine: { flex: 1, height: 1 },
    dividerText: {
        fontSize: typography.fontSize.sm,
        paddingHorizontal: spacing.md,
    },

    // Form fields
    fieldGroup: {
        marginBottom: spacing.md,
    },
    fieldLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        marginBottom: 6,
        fontFamily: 'Inter-SemiBold',
    },
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: 1.5,
    },
    fieldIcon: {
        paddingLeft: spacing.md,
    },
    fieldInput: {
        flex: 1,
        fontSize: typography.fontSize.base,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        minHeight: 50,
    },
    fieldError: {
        fontSize: typography.fontSize.xs,
        marginTop: 4,
    },
    eyeBtn: {
        paddingRight: spacing.md,
        paddingVertical: spacing.md,
    },

    forgotBtn: {
        alignSelf: 'flex-end',
        marginBottom: spacing.lg,
    },
    forgotText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '500',
    },

    // Submit button
    submitBtn: {
        marginBottom: spacing.sm,
        shadowColor: '#FFB020',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 4,
    },
    submitGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderRadius: 14,
    },
    submitText: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: '#FFFFFF',
        fontFamily: 'Inter-Bold',
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },

    // Sign up link
    signupRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: spacing.xl,
    },
    signupText: {
        fontSize: typography.fontSize.base,
    },
    signupLink: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        fontFamily: 'Inter-SemiBold',
    },
});
