// ============================================
// Login Screen — Enhanced with biometric auth,
// Google Sign In, password visibility, haptics,
// auto-advance fields, and polished animations
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
import { colors, typography, spacing } from '@zerog/ui';
import { BackButton } from '../../components';
import { useAuthStore } from '../../stores';

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
        return 'Something went wrong on our end. Please try again in a moment.';
    }
    // Return the original if it's already user-friendly (short, no stack trace)
    if (raw.length < 100 && !raw.includes('Error:') && !raw.includes('at ')) {
        return raw;
    }
    return 'Sign in failed. Please try again.';
}

// ============================================
// Animated Input Field Component
// ============================================

interface AnimatedFieldProps {
    label: string;
    placeholder: string;
    value: string;
    onChangeText: (text: string) => void;
    error?: string;
    secureTextEntry?: boolean;
    keyboardType?: 'default' | 'email-address';
    autoCapitalize?: 'none' | 'sentences' | 'words';
    autoComplete?: 'email' | 'password' | 'off';
    autoCorrect?: boolean;
    returnKeyType?: 'next' | 'done' | 'go';
    onSubmitEditing?: () => void;
    inputRef?: React.RefObject<TextInput>;
    delay?: number;
    icon?: keyof typeof Ionicons.glyphMap;
}

function AnimatedField({
    label, placeholder, value, onChangeText, error, secureTextEntry,
    keyboardType = 'default', autoCapitalize = 'none', autoComplete = 'off',
    autoCorrect = false, returnKeyType = 'next', onSubmitEditing,
    inputRef, delay = 0, icon,
}: AnimatedFieldProps) {
    const [isSecure, setIsSecure] = useState(secureTextEntry ?? false);
    const isFocused = useSharedValue(0);
    const shakeX = useSharedValue(0);

    // Shake animation when error appears
    useEffect(() => {
        if (error) {
            shakeX.value = withSequence(
                withTiming(-8, { duration: 50 }),
                withTiming(8, { duration: 50 }),
                withTiming(-6, { duration: 50 }),
                withTiming(6, { duration: 50 }),
                withTiming(0, { duration: 50 }),
            );
        }
    }, [error, shakeX]);

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

    const animatedShakeStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: shakeX.value }],
    }));

    return (
        <Animated.View
            entering={FadeInDown.delay(delay).duration(400).springify()}
            style={[styles.fieldGroup, animatedShakeStyle]}
        >
            <Text style={styles.fieldLabel}>{label}</Text>
            <Animated.View style={[styles.fieldInput, animatedBorderStyle]}>
                {icon && (
                    <View style={styles.fieldIconContainer}>
                        <Ionicons name={icon} size={18} color={error ? colors.coral[400] : colors.text.muted} />
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
                    accessibilityHint={error ? `Error: ${error}` : undefined}
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
                        accessibilityRole="button"
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
                <Animated.Text
                    entering={FadeIn.duration(200)}
                    style={styles.fieldError}
                    accessibilityLiveRegion="assertive"
                >
                    {error}
                </Animated.Text>
            )}
        </Animated.View>
    );
}

// ============================================
// Social Button Component
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
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onPress();
                }}
                activeOpacity={0.7}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ busy: loading }}
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
// General Error Banner
// ============================================

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
    return (
        <Animated.View entering={FadeInDown.duration(300).springify()} style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={colors.coral[400]} />
            <Text style={styles.errorBannerText}>{message}</Text>
            <TouchableOpacity
                onPress={onDismiss}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Dismiss error"
                accessibilityRole="button"
            >
                <Ionicons name="close" size={16} color={colors.coral[400]} />
            </TouchableOpacity>
        </Animated.View>
    );
}

// ============================================
// Login Screen
// ============================================

export default function LoginScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const login = useAuthStore((s) => s.login);
    const appleLogin = useAuthStore((s) => s.appleLogin);
    const googleLogin = useAuthStore((s) => s.googleLogin);
    const isLoading = useAuthStore((s) => s.isLoading);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
    const [generalError, setGeneralError] = useState<string | null>(null);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricType, setBiometricType] = useState<string>('Biometrics');
    const [showBiometric, setShowBiometric] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const passwordRef = useRef<TextInput>(null);
    const scrollRef = useRef<ScrollView>(null);
    const biometricTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Button scale animation
    const buttonScale = useSharedValue(1);
    const animatedButtonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }],
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

                    // Determine biometric type for display
                    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
                    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
                        setBiometricType('Face ID');
                    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
                        setBiometricType('Touch ID');
                    }

                    // Auto-prompt if biometric was previously enabled
                    if (biometricEnabled === 'true' && lastEmail) {
                        setEmail(lastEmail);
                        setShowBiometric(true);
                    }
                }
            } catch {
                // Biometric not available on this device
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
                // Biometric success — the existing token from SecureStore handles auth
                const { initialize } = useAuthStore.getState();
                await initialize();
                const isAuth = useAuthStore.getState().isAuthenticated;
                if (isAuth) {
                    router.replace('/(tabs)');
                } else {
                    // Token expired, need password
                    setShowBiometric(false);
                    setGeneralError('Your session has expired. Please sign in with your password.');
                }
            }
        } catch {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    }, [biometricType, router]);

    // ---- Auto-prompt biometric on mount ----
    useEffect(() => {
        if (showBiometric) {
            biometricTimerRef.current = setTimeout(handleBiometricAuth, 600);
            return () => {
                if (biometricTimerRef.current) clearTimeout(biometricTimerRef.current);
            };
        }
    }, [showBiometric, handleBiometricAuth]);

    // ---- Email validation ----
    const validateEmail = (text: string) => {
        if (!text.trim()) return 'Email is required';
        if (!/\S+@\S+\.\S+/.test(text)) return 'Please enter a valid email address';
        return undefined;
    };

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
        } catch (error: any) {
            if (error.code !== 'ERR_REQUEST_CANCELED') {
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

            const redirectUri = AuthSession.makeRedirectUri({ preferLocalhost: false });
            const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

            if (!clientId) {
                setGeneralError('Google Sign In is being set up. Please use email or Apple Sign In for now.');
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
                router.replace('/(tabs)');
            }
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            if (error?.message?.includes('configured')) {
                setGeneralError('Google Sign In is being set up. Please use email or Apple Sign In for now.');
            } else {
                setGeneralError('Google Sign In failed. Please try again.');
            }
        } finally {
            setGoogleLoading(false);
        }
    }, [googleLogin, router]);

    // ---- Email/Password Login ----
    const handleLogin = useCallback(async () => {
        Keyboard.dismiss();
        setGeneralError(null);

        const emailError = validateEmail(email);
        const newErrors: { email?: string; password?: string } = {};
        if (emailError) newErrors.email = emailError;
        if (!password) newErrors.password = 'Password is required';
        else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        try {
            // Animate button press
            buttonScale.value = withSequence(
                withSpring(0.96, { damping: 15 }),
                withSpring(1, { damping: 15 }),
            );
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await login(email.trim(), password);

            // Save email for biometric login next time
            await AsyncStorage.setItem(LAST_EMAIL_KEY, email.trim());

            // Offer biometric setup if available
            if (biometricAvailable) {
                const biometricEnabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
                if (biometricEnabled !== 'true') {
                    Alert.alert(
                        `Enable ${biometricType}?`,
                        `Sign in faster next time using ${biometricType}.`,
                        [
                            { text: 'Not Now', style: 'cancel' },
                            {
                                text: 'Enable',
                                onPress: async () => {
                                    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                },
                            },
                        ],
                    );
                }
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace('/(tabs)');
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const rawMessage = error?.data?.error || error?.message || 'Invalid email or password';
            setGeneralError(friendlyError(rawMessage));
        }
    }, [email, password, login, router, biometricAvailable, biometricType, buttonScale]);

    return (
        <LinearGradient
            colors={[colors.obsidian[900], colors.obsidian[800]]}
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
                        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 },
                    ]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                    bounces={false}
                >
                    {/* Back button */}
                    <BackButton style={{ alignSelf: 'flex-start', marginBottom: spacing.lg }} />

                    {/* 0G Branding */}
                    <Animated.View entering={FadeInDown.delay(30).duration(500).springify()} style={styles.brandingContainer}>
                        <Text style={styles.brandingText} accessibilityLabel="Zero G">0G</Text>
                        <Text style={styles.brandingTagline}>Zero Gravity</Text>
                    </Animated.View>

                    {/* Header */}
                    <Animated.View entering={FadeInDown.delay(50).duration(500).springify()}>
                        <View style={styles.header}>
                            <Text style={styles.title} accessibilityRole="header">Welcome back</Text>
                            <Text style={styles.subtitle}>
                                Sign in to your private community
                            </Text>
                        </View>
                    </Animated.View>

                    {/* General Error Banner */}
                    {generalError && (
                        <ErrorBanner
                            message={generalError}
                            onDismiss={() => setGeneralError(null)}
                        />
                    )}

                    {/* Social Sign In — Placed first for frictionless access */}
                    <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                        <View style={styles.socialButtons}>
                            {Platform.OS === 'ios' && (
                                <SocialButton
                                    icon="logo-apple"
                                    label="Continue with Apple"
                                    onPress={handleAppleLogin}
                                    color={colors.text.primary}
                                    bgColor={colors.obsidian[600]}
                                    borderColor={colors.border.default}
                                    delay={120}
                                />
                            )}
                            <SocialButton
                                icon="logo-google"
                                label="Continue with Google"
                                onPress={handleGoogleLogin}
                                color={colors.text.primary}
                                bgColor={colors.surface.glass}
                                borderColor={colors.border.subtle}
                                loading={googleLoading}
                                delay={160}
                            />
                        </View>
                    </Animated.View>

                    {/* Biometric Quick Sign In */}
                    {biometricAvailable && showBiometric && (
                        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                            <TouchableOpacity
                                style={styles.biometricButton}
                                onPress={handleBiometricAuth}
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                accessibilityLabel={`Sign in with ${biometricType}`}
                            >
                                <LinearGradient
                                    colors={[colors.gold[500] + '15', colors.gold[500] + '05']}
                                    style={styles.biometricGradient}
                                >
                                    <Ionicons
                                        name={biometricType === 'Face ID' ? 'scan-outline' : 'finger-print-outline'}
                                        size={28}
                                        color={colors.gold[500]}
                                    />
                                    <Text style={styles.biometricText}>
                                        Sign in with {biometricType}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    {/* Divider */}
                    <Animated.View entering={FadeIn.delay(220).duration(300)} style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or use email</Text>
                        <View style={styles.dividerLine} />
                    </Animated.View>

                    {/* Email & Password Form */}
                    <View style={styles.form}>
                        <AnimatedField
                            label="Email"
                            placeholder="you@example.com"
                            value={email}
                            onChangeText={(text) => {
                                setEmail(text);
                                if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
                                if (generalError) setGeneralError(null);
                            }}
                            error={errors.email}
                            keyboardType="email-address"
                            autoComplete="email"
                            returnKeyType="next"
                            onSubmitEditing={() => passwordRef.current?.focus()}
                            icon="mail-outline"
                            delay={260}
                        />

                        <AnimatedField
                            label="Password"
                            placeholder="Enter your password"
                            value={password}
                            onChangeText={(text) => {
                                setPassword(text);
                                if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
                                if (generalError) setGeneralError(null);
                            }}
                            error={errors.password}
                            secureTextEntry
                            autoComplete="password"
                            returnKeyType="go"
                            onSubmitEditing={handleLogin}
                            inputRef={passwordRef}
                            icon="lock-closed-outline"
                            delay={300}
                        />

                        <Animated.View entering={FadeInDown.delay(340).duration(400)}>
                            <TouchableOpacity
                                style={styles.forgotButton}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    Alert.alert(
                                        'Reset Password',
                                        'Visit 0gravity.ai to reset your password. In-app password reset is coming soon.',
                                        [{ text: 'OK' }]
                                    );
                                }}
                                accessibilityRole="button"
                                accessibilityLabel="Forgot password"
                            >
                                <Text style={styles.forgotText}>Forgot password?</Text>
                            </TouchableOpacity>
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(380).duration(400)} style={animatedButtonStyle}>
                            <TouchableOpacity
                                onPress={handleLogin}
                                disabled={isLoading}
                                activeOpacity={0.85}
                                style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                                accessibilityRole="button"
                                accessibilityLabel={isLoading ? 'Signing in' : 'Sign in'}
                                accessibilityState={{ busy: isLoading, disabled: isLoading }}
                            >
                                <LinearGradient
                                    colors={isLoading
                                        ? [colors.gold[600], colors.gold[700]]
                                        : [colors.gold[400], colors.gold[600]]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.submitGradient}
                                >
                                    {isLoading ? (
                                        <View style={styles.loadingRow}>
                                            <ActivityIndicator size="small" color={colors.obsidian[900]} />
                                            <Text style={styles.submitTextLoading}>Signing in...</Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.submitText}>Sign In</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>

                    {/* Sign Up Link */}
                    <Animated.View entering={FadeInUp.delay(420).duration(400)} style={styles.signupContainer}>
                        <Text style={styles.signupText}>Don't have an account? </Text>
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.push('/(auth)/signup');
                            }}
                            accessibilityRole="link"
                            accessibilityLabel="Create an account"
                        >
                            <Text style={styles.signupLink}>Sign up</Text>
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

    // ---- Error Banner ----
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface.coralSubtle,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.coral[500] + '30',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.lg,
        gap: spacing.sm,
    },
    errorBannerText: {
        flex: 1,
        fontSize: typography.fontSize.sm,
        color: colors.coral[400],
        lineHeight: 18,
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

    // ---- Biometric ----
    biometricButton: {
        marginBottom: spacing.md,
        borderRadius: 16,
        overflow: 'hidden',
    },
    biometricGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
        paddingVertical: spacing.lg,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.gold[500] + '30',
    },
    biometricText: {
        fontSize: typography.fontSize.lg,
        fontWeight: '600',
        color: colors.gold[400],
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
    forgotButton: {
        alignSelf: 'flex-end',
        marginTop: -spacing.xs,
        marginBottom: spacing.md,
    },
    forgotText: { fontSize: typography.fontSize.sm, color: colors.gold[500], fontWeight: '500' },
    submitButton: { marginTop: spacing.xs },
    submitButtonDisabled: { opacity: 0.9 },
    submitGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md + 2,
        borderRadius: 14,
    },
    submitText: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.obsidian[900],
        fontFamily: 'Inter-Bold',
    },
    submitTextLoading: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.obsidian[900],
        fontFamily: 'Inter-SemiBold',
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    brandingContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    brandingText: {
        fontSize: 52,
        fontWeight: '800',
        color: colors.gold[500],
        letterSpacing: -2,
        fontFamily: 'Inter-Bold',
    },
    brandingTagline: {
        fontSize: typography.fontSize.sm,
        color: colors.gold[400],
        marginTop: -4,
        letterSpacing: 4,
        textTransform: 'uppercase',
        fontFamily: 'Inter-Medium',
    },

    // ---- Sign Up Link ----
    signupContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: spacing.xl,
    },
    signupText: { fontSize: typography.fontSize.base, color: colors.text.secondary },
    signupLink: {
        fontSize: typography.fontSize.base,
        color: colors.gold[500],
        fontWeight: '600',
    },
});
