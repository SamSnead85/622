// ============================================
// Signup Screen — Simplified, theme-aware
// 3 fields: Name, Email, Password
// Social sign-in at top, clean light/dark support
// ============================================

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Keyboard,
    Pressable,
    Linking,
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
    withSequence,
    withSpring,
    interpolateColor,
} from 'react-native-reanimated';
import { typography, spacing } from '@zerog/ui';
import { BackButton, BrandLogo } from '../../components';
import { useAuthStore } from '../../stores';
import { apiFetch, API } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';

WebBrowser.maybeCompleteAuthSession();

// ============================================
// User-friendly error message mapping
// ============================================

function friendlyError(raw: string): string {
    const lower = raw.toLowerCase();
    if (lower.includes('already') || lower.includes('exists') || lower.includes('duplicate') || lower.includes('in use')) {
        return 'An account with this email already exists. Try logging in instead.';
    }
    if (lower.includes('too many') || lower.includes('rate limit') || lower.includes('throttl')) {
        return 'Too many attempts. Please wait a moment and try again.';
    }
    if (lower.includes('network') || lower.includes('fetch') || lower.includes('timeout')) {
        return 'Connection issue. Please check your internet and try again.';
    }
    if (lower.includes('password') && (lower.includes('weak') || lower.includes('short') || lower.includes('simple'))) {
        return 'Please choose a stronger password with at least 8 characters.';
    }
    if (lower.includes('server') || lower.includes('500') || lower.includes('internal')) {
        return 'A server error occurred. Please try again in a moment.';
    }
    if (raw.length < 100 && !raw.includes('Error:') && !raw.includes('at ')) {
        return raw;
    }
    return 'Sign up failed. Please try again.';
}

// ============================================
// Password Strength
// ============================================

function getPasswordStrength(password: string, c: Record<string, any>): { level: number; label: string; color: string; tips: string[] } {
    let score = 0;
    const tips: string[] = [];

    if (password.length >= 8) { score++; } else { tips.push('At least 8 characters'); }
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) { score++; } else { tips.push('Mix uppercase and lowercase'); }
    if (/\d/.test(password)) { score++; } else { tips.push('Add a number'); }
    if (/[^a-zA-Z0-9]/.test(password)) { score++; } else { tips.push('Add a special character'); }

    if (score <= 1) return { level: 1, label: 'Weak', color: c.coral[500], tips };
    if (score <= 2) return { level: 2, label: 'Fair', color: c.amber[500], tips };
    if (score <= 3) return { level: 3, label: 'Good', color: c.gold[500], tips };
    return { level: 4, label: 'Strong', color: c.emerald[500], tips: [] };
}

// ============================================
// Animated Input Field (theme-aware)
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
    rightElement?: React.ReactNode;
    colors: Record<string, any>;
    isDark: boolean;
}

function AnimatedField({
    label, placeholder, value, onChangeText, error, hint, secureTextEntry,
    keyboardType = 'default', autoCapitalize = 'none', autoComplete = 'off',
    autoCorrect = false, returnKeyType = 'next', onSubmitEditing,
    inputRef, delay = 0, icon, rightElement, colors: c, isDark,
}: AnimatedFieldProps) {
    const [isSecure, setIsSecure] = useState(secureTextEntry ?? false);
    const isFocused = useSharedValue(0);
    const shakeX = useSharedValue(0);

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
            ? c.coral[500]
            : interpolateColor(
                isFocused.value,
                [0, 1],
                [c.border.subtle, c.gold[500] + '80']
            ),
    }));

    const animatedShakeStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: shakeX.value }],
    }));

    return (
        <Animated.View
            entering={FadeInDown.delay(delay).duration(400).springify()}
            style={animatedShakeStyle}
        >
            <View style={{ marginBottom: spacing.md }}>
                <Text style={[fieldStyles.label, { color: c.text.secondary }]}>{label}</Text>
                <Animated.View style={[
                    fieldStyles.input,
                    { backgroundColor: c.surface.glass },
                    animatedBorderStyle,
                ]}>
                    {icon && (
                        <View style={fieldStyles.iconContainer}>
                            <Ionicons name={icon} size={18} color={error ? c.coral[400] : c.text.muted} />
                        </View>
                    )}
                    <TextInput
                        ref={inputRef}
                        style={[
                            fieldStyles.textInput,
                            { color: c.text.primary },
                            icon && fieldStyles.textInputWithIcon,
                        ]}
                        placeholder={placeholder}
                        placeholderTextColor={c.text.muted}
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
                        selectionColor={c.gold[500]}
                        accessibilityLabel={label}
                        accessibilityHint={error ? `Error: ${error}` : hint || undefined}
                    />
                    {secureTextEntry && (
                        <TouchableOpacity
                            style={fieldStyles.visibilityToggle}
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
                                color={c.text.muted}
                            />
                        </TouchableOpacity>
                    )}
                    {rightElement}
                </Animated.View>
                {error && (
                    <Animated.Text entering={FadeIn.duration(200)} style={[fieldStyles.error, { color: c.coral[500] }]}>
                        {error}
                    </Animated.Text>
                )}
                {!error && hint && (
                    <Text style={[fieldStyles.hint, { color: c.text.muted }]}>{hint}</Text>
                )}
            </View>
        </Animated.View>
    );
}

const fieldStyles = StyleSheet.create({
    label: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        marginBottom: spacing.xs,
        fontFamily: 'Inter-SemiBold',
    },
    input: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: 1.5,
    },
    iconContainer: {
        paddingLeft: spacing.md,
    },
    textInput: {
        flex: 1,
        fontSize: typography.fontSize.base,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        minHeight: 50,
        fontFamily: 'Inter',
    },
    textInputWithIcon: {
        paddingLeft: spacing.sm,
    },
    visibilityToggle: {
        paddingRight: spacing.md,
        paddingVertical: spacing.md,
    },
    error: {
        fontSize: typography.fontSize.xs,
        marginTop: spacing.xs,
    },
    hint: {
        fontSize: typography.fontSize.xs,
        marginTop: spacing.xs,
    },
});

// ============================================
// ============================================
// Signup Screen
// ============================================

export default function SignupScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: c, isDark } = useTheme();
    const signup = useAuthStore((s) => s.signup);
    const appleLogin = useAuthStore((s) => s.appleLogin);
    const googleLogin = useAuthStore((s) => s.googleLogin);
    const isLoading = useAuthStore((s) => s.isLoading);

    const [inviteCode, setInviteCode] = useState('');
    const [inviteValid, setInviteValid] = useState<boolean | null>(null);
    const [inviterInfo, setInviterInfo] = useState<{ username: string; displayName: string; avatarUrl?: string } | null>(null);
    const [inviteValidating, setInviteValidating] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [generalError, setGeneralError] = useState<string | null>(null);
    const [googleLoading, setGoogleLoading] = useState(false);

    const nameRef = useRef<TextInput>(null);
    const emailRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);
    const scrollRef = useRef<ScrollView>(null);

    // ---- Validate invite code on blur ----
    const validateInviteCode = useCallback(async (code: string) => {
        if (!code.trim()) {
            setInviteValid(null);
            setInviterInfo(null);
            return;
        }
        setInviteValidating(true);
        try {
            const res = await apiFetch<{ valid: boolean; sender?: { username: string; displayName: string; avatarUrl?: string } }>(
                `/api/v1/invite/validate/${code.trim().toUpperCase()}`,
                { method: 'POST' },
            );
            if (res.valid && res.sender) {
                setInviteValid(true);
                setInviterInfo(res.sender);
                if (errors.inviteCode) setErrors((e) => ({ ...e, inviteCode: '' }));
            } else {
                setInviteValid(false);
                setInviterInfo(null);
            }
        } catch {
            // Also try validating as an access code
            try {
                const res2 = await apiFetch<{ valid: boolean; type?: string }>(
                    `/api/v1/auth/validate-code`,
                    { method: 'POST', body: JSON.stringify({ code: code.trim().toUpperCase() }) },
                );
                if (res2.valid) {
                    setInviteValid(true);
                    setInviterInfo(null); // Access code, no specific inviter
                    if (errors.inviteCode) setErrors((e) => ({ ...e, inviteCode: '' }));
                } else {
                    setInviteValid(false);
                    setInviterInfo(null);
                }
            } catch {
                setInviteValid(false);
                setInviterInfo(null);
            }
        } finally {
            setInviteValidating(false);
        }
    }, [errors.inviteCode]);

    const buttonScale = useSharedValue(1);
    const animatedButtonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }],
    }));

    const passwordStrength = useMemo(() => getPasswordStrength(password, c), [password, c]);

    // ---- Apple Sign Up ----
    const handleAppleSignup = useCallback(async () => {
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
                router.replace('/(auth)/username');
            }
        } catch (error: unknown) {
            const err = error as { code?: string };
            if (err.code !== 'ERR_REQUEST_CANCELED') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                setGeneralError('Apple Sign Up failed. Please try again.');
            }
        }
    }, [appleLogin, router]);

    // ---- Google Sign Up ----
    const handleGoogleSignup = useCallback(async () => {
        try {
            setGoogleLoading(true);
            setGeneralError(null);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
            if (!clientId) {
                setGeneralError('Google Sign Up is being set up. Please use email or Apple for now.');
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
                router.replace('/(auth)/username');
            } else if (result.type === 'error') {
                throw new Error(result.error?.message || 'Google Sign Up failed');
            }
        } catch (error: unknown) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const message = error instanceof Error ? error.message : 'Google Sign Up failed. Please try again.';
            if (__DEV__) console.warn('Google signup error:', message);
            setGeneralError(message);
        } finally {
            setGoogleLoading(false);
        }
    }, [googleLogin, router]);

    // ---- Form Validation (simplified — no username, no confirm password) ----
    const validateForm = useCallback(() => {
        const newErrors: Record<string, string> = {};

        if (!inviteCode.trim()) {
            newErrors.inviteCode = 'Invite code is required';
        } else if (inviteValid === false) {
            newErrors.inviteCode = 'Invalid or expired invite code';
        } else if (inviteValid === null) {
            newErrors.inviteCode = 'Please wait for invite code validation';
        }

        if (!displayName.trim()) newErrors.displayName = 'Name is required';
        else if (displayName.trim().length < 2) newErrors.displayName = 'Name must be at least 2 characters';
        else if (displayName.trim().length > 50) newErrors.displayName = 'Name must be 50 characters or less';

        if (!email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        if (!password) {
            newErrors.password = 'Password is required';
        } else if (password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
        } else if (passwordStrength.level <= 1) {
            newErrors.password = 'Please choose a stronger password';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [inviteCode, inviteValid, displayName, email, password, passwordStrength.level]);

    // ---- Email/Password Signup ----
    const handleSignup = useCallback(async () => {
        Keyboard.dismiss();
        setGeneralError(null);

        if (!validateForm()) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        try {
            buttonScale.value = withSequence(
                withSpring(0.96, { damping: 15 }),
                withSpring(1, { damping: 15 }),
            );
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await signup(email.trim(), password, displayName.trim(), inviteCode.trim());
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            // Navigate to email verification before username
            router.replace('/(auth)/verify-email' as any);
        } catch (error: unknown) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const err = error as { data?: { error?: string }; message?: string };
            const rawMessage = err?.data?.error || (error instanceof Error ? error.message : 'Signup failed');
            setGeneralError(friendlyError(rawMessage));
        }
    }, [validateForm, signup, email, password, displayName, router, buttonScale]);

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView
                    ref={scrollRef}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
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
                    <Animated.View entering={FadeInDown.delay(60).duration(500).springify()}>
                        <View style={styles.header}>
                            <Text style={[styles.title, { color: c.text.primary }]} accessibilityRole="header">
                                Create your account
                            </Text>
                            <Text style={[styles.subtitle, { color: c.text.secondary }]}>
                                Your community is waiting
                            </Text>
                        </View>
                    </Animated.View>

                    {/* Step indicator — shows progress through signup flow */}
                    <Animated.View entering={FadeIn.delay(80).duration(300)} style={styles.stepRow}>
                        {['Account', 'Verify', 'Username'].map((step, i) => (
                            <View key={step} style={styles.stepItem}>
                                <View style={[
                                    styles.stepDot,
                                    {
                                        backgroundColor: i === 0 ? c.gold[500] : c.border.subtle,
                                    },
                                ]}>
                                    {i === 0 && <Ionicons name="person-add" size={10} color={c.text.inverse} />}
                                    {i > 0 && <Text style={[styles.stepNum, { color: i === 0 ? c.text.inverse : c.text.muted }]}>{i + 1}</Text>}
                                </View>
                                <Text style={[styles.stepLabel, { color: i === 0 ? c.text.primary : c.text.muted }]}>{step}</Text>
                                {i < 2 && <View style={[styles.stepLine, { backgroundColor: c.border.subtle }]} />}
                            </View>
                        ))}
                    </Animated.View>

                    {/* General Error Banner */}
                    {generalError && (
                        <Animated.View entering={FadeInDown.duration(300).springify()} style={[styles.errorBanner, { backgroundColor: c.surface.coralSubtle, borderColor: c.coral[500] + '30' }]}>
                            <Ionicons name="alert-circle" size={18} color={c.coral[400]} />
                            <Text style={[styles.errorBannerText, { color: c.coral[400] }]}>{generalError}</Text>
                            <TouchableOpacity
                                onPress={() => setGeneralError(null)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityLabel="Dismiss error"
                                accessibilityRole="button"
                            >
                                <Ionicons name="close" size={16} color={c.coral[400]} />
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    {/* Form — Invite Code, Name, Email, Password */}
                    <View style={styles.form}>
                        <AnimatedField
                            label="Invite Code"
                            placeholder="Enter your invite code"
                            value={inviteCode}
                            onChangeText={(text) => {
                                setInviteCode(text.toUpperCase());
                                if (errors.inviteCode) setErrors((e) => ({ ...e, inviteCode: '' }));
                                if (generalError) setGeneralError(null);
                                setInviteValid(null);
                                setInviterInfo(null);
                            }}
                            error={errors.inviteCode}
                            hint={inviteValidating ? 'Validating...' : undefined}
                            autoCapitalize="characters"
                            autoComplete="off"
                            returnKeyType="next"
                            onSubmitEditing={() => {
                                validateInviteCode(inviteCode);
                                nameRef.current?.focus();
                            }}
                            icon="ticket-outline"
                            delay={80}
                            colors={c}
                            isDark={isDark}
                            rightElement={
                                inviteValid === true ? (
                                    <View style={{ paddingRight: 12 }}>
                                        <Ionicons name="checkmark-circle" size={20} color={c.emerald[500]} />
                                    </View>
                                ) : inviteValid === false ? (
                                    <View style={{ paddingRight: 12 }}>
                                        <Ionicons name="close-circle" size={20} color={c.coral[500]} />
                                    </View>
                                ) : null
                            }
                        />

                        {/* Inviter preview card */}
                        {inviterInfo && inviteValid && (
                            <Animated.View
                                entering={FadeIn.duration(300)}
                                style={[styles.inviterCard, { backgroundColor: c.surface.glass, borderColor: c.gold[500] + '30' }]}
                            >
                                <Ionicons name="shield-checkmark" size={16} color={c.gold[500]} />
                                <Text style={[styles.inviterText, { color: c.text.secondary }]}>
                                    Vouched for by{' '}
                                    <Text style={{ color: c.gold[500], fontWeight: '600' }}>
                                        @{inviterInfo.username}
                                    </Text>
                                </Text>
                            </Animated.View>
                        )}

                        <AnimatedField
                            label="Name"
                            placeholder="Your name"
                            value={displayName}
                            onChangeText={(text) => {
                                setDisplayName(text);
                                if (errors.displayName) setErrors((e) => ({ ...e, displayName: '' }));
                                if (generalError) setGeneralError(null);
                            }}
                            error={errors.displayName}
                            autoCapitalize="words"
                            autoComplete="name"
                            returnKeyType="next"
                            onSubmitEditing={() => emailRef.current?.focus()}
                            inputRef={nameRef}
                            icon="person-outline"
                            delay={100}
                            colors={c}
                            isDark={isDark}
                        />

                        <AnimatedField
                            label="Email"
                            placeholder="Email address"
                            value={email}
                            onChangeText={(text) => {
                                setEmail(text);
                                if (errors.email) setErrors((e) => ({ ...e, email: '' }));
                                if (generalError) setGeneralError(null);
                            }}
                            error={errors.email}
                            keyboardType="email-address"
                            autoComplete="email"
                            returnKeyType="next"
                            onSubmitEditing={() => passwordRef.current?.focus()}
                            inputRef={emailRef}
                            icon="mail-outline"
                            delay={150}
                            colors={c}
                            isDark={isDark}
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
                            secureTextEntry
                            autoComplete="password"
                            returnKeyType="go"
                            onSubmitEditing={handleSignup}
                            inputRef={passwordRef}
                            icon="lock-closed-outline"
                            delay={200}
                            colors={c}
                            isDark={isDark}
                        />

                        {/* Password Strength Indicator */}
                        {password.length > 0 && (
                            <Animated.View entering={FadeIn.duration(300)} style={styles.strengthContainer}>
                                <View style={styles.strengthBarRow}>
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
                                                                : c.border.subtle,
                                                    },
                                                ]}
                                            />
                                        ))}
                                    </View>
                                    <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                                        {passwordStrength.label}
                                    </Text>
                                </View>
                                {passwordStrength.tips.length > 0 && passwordStrength.level <= 2 && (
                                    <Text style={[styles.strengthTip, { color: c.text.muted }]}>
                                        Tip: {passwordStrength.tips[0]}
                                    </Text>
                                )}
                            </Animated.View>
                        )}

                        {/* Submit Button — gold gradient, matches login */}
                        <Animated.View entering={FadeInDown.delay(260).duration(400)} style={animatedButtonStyle}>
                            <TouchableOpacity
                                onPress={handleSignup}
                                disabled={isLoading}
                                activeOpacity={0.85}
                                style={[styles.submitButton, { shadowColor: c.gold[500] }, isLoading && { opacity: 0.85 }]}
                                accessibilityRole="button"
                                accessibilityLabel={isLoading ? 'Creating account' : 'Create account'}
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
                                            <Text style={[styles.submitButtonText, { color: c.text.inverse }]}>Creating account...</Text>
                                        </View>
                                    ) : (
                                        <Text style={[styles.submitButtonText, { color: c.text.inverse }]}>Create Account</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>

                    {/* Divider */}
                    <Animated.View entering={FadeIn.delay(300).duration(300)} style={styles.divider}>
                        <View style={[styles.dividerLine, { backgroundColor: c.border.subtle }]} />
                        <Text style={[styles.dividerText, { color: c.text.muted }]}>or</Text>
                        <View style={[styles.dividerLine, { backgroundColor: c.border.subtle }]} />
                    </Animated.View>

                    {/* Social Sign Up — matches login screen */}
                    <Animated.View entering={FadeInDown.delay(340).duration(400)}>
                        <View style={styles.socialButtons}>
                            {Platform.OS === 'ios' && (
                                <TouchableOpacity
                                    style={[styles.socialButton, {
                                        backgroundColor: isDark ? c.text.primary : c.text.inverse,
                                        borderColor: isDark ? c.text.primary : c.text.inverse,
                                    }]}
                                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleAppleSignup(); }}
                                    activeOpacity={0.7}
                                    accessibilityRole="button"
                                    accessibilityLabel="Continue with Apple"
                                >
                                    <Ionicons name="logo-apple" size={20} color={c.text.inverse} />
                                    <Text style={[styles.socialButtonText, { color: c.text.inverse }]}>
                                        Continue with Apple
                                    </Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={[styles.socialButton, {
                                    backgroundColor: c.surface.glass,
                                    borderColor: c.border.subtle,
                                }]}
                                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleGoogleSignup(); }}
                                activeOpacity={0.7}
                                disabled={googleLoading}
                                accessibilityRole="button"
                                accessibilityLabel="Continue with Google"
                            >
                                {googleLoading ? (
                                    <ActivityIndicator size="small" color={c.text.primary} />
                                ) : (
                                    <Ionicons name="logo-google" size={18} color={c.text.primary} />
                                )}
                                <Text style={[styles.socialButtonText, { color: c.text.primary }]}>
                                    Continue with Google
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    {/* Login Link */}
                    <Animated.View entering={FadeInUp.delay(380).duration(400)} style={styles.loginContainer}>
                        <Text style={[styles.loginText, { color: c.text.secondary }]}>Already have an account? </Text>
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.push('/(auth)/login');
                            }}
                            accessibilityRole="link"
                            accessibilityLabel="Log in to existing account"
                        >
                            <Text style={[styles.loginLink, { color: c.gold[500] }]}>Log in</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Request Access Link */}
                    <Animated.View entering={FadeInUp.delay(400).duration(400)} style={styles.requestAccessContainer}>
                        <Text style={[styles.loginText, { color: c.text.secondary }]}>Don't have an invite? </Text>
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.push('/(auth)/request-access' as any);
                            }}
                            accessibilityRole="link"
                            accessibilityLabel="Request access to 0G"
                        >
                            <Text style={[styles.loginLink, { color: c.gold[500] }]}>Request access</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Terms */}
                    <Animated.View entering={FadeIn.delay(420).duration(300)}>
                        <Text style={[styles.terms, { color: c.text.muted }]}>
                            By signing up, you agree to our{' '}
                            <Text
                                style={{ color: c.gold[500], fontWeight: '600' }}
                                onPress={() => Linking.openURL('https://0g.social/terms')}
                                accessibilityRole="link"
                            >
                                Terms of Service
                            </Text>
                            {' and '}
                            <Text
                                style={{ color: c.gold[500], fontWeight: '600' }}
                                onPress={() => Linking.openURL('https://0g.social/privacy')}
                                accessibilityRole="link"
                            >
                                Privacy Policy
                            </Text>
                        </Text>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
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

    // ---- Step Indicator ----
    stepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xl,
        gap: 4,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    stepDot: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepNum: {
        fontSize: 10,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
    },
    stepLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: '500',
        fontFamily: 'Inter-Medium',
    },
    stepLine: {
        width: 24,
        height: 1.5,
        borderRadius: 1,
    },

    // ---- Error Banner ----
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

    // ---- Form ----
    form: { marginBottom: spacing.sm },

    // ---- Password Strength ----
    strengthContainer: {
        marginTop: -spacing.xs,
        marginBottom: spacing.md,
        paddingHorizontal: 2,
    },
    strengthBarRow: {
        flexDirection: 'row',
        alignItems: 'center',
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
    strengthTip: {
        fontSize: typography.fontSize.xs,
        marginTop: spacing.xs,
    },

    // ---- Submit — gold gradient, matches login ----
    submitButton: {
        marginTop: spacing.md,
        // shadowColor set dynamically via theme — see inline styles if needed
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
    submitButtonText: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },

    // ---- Divider ----
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.lg,
    },
    dividerLine: { flex: 1, height: 1 },
    dividerText: {
        fontSize: typography.fontSize.sm,
        paddingHorizontal: spacing.md,
        fontFamily: 'Inter',
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
        paddingVertical: 14,
        gap: spacing.sm,
    },
    socialButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        fontFamily: 'Inter-SemiBold',
    },

    // ---- Inviter Card ----
    inviterCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: 10,
        paddingHorizontal: spacing.md,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: spacing.md,
        marginTop: -spacing.xs,
    },
    inviterText: {
        fontSize: typography.fontSize.sm,
        fontFamily: 'Inter',
    },

    // ---- Login Link ----
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: spacing.xl,
    },
    requestAccessContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: spacing.sm,
    },
    loginText: { fontSize: typography.fontSize.base },
    loginLink: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        fontFamily: 'Inter-SemiBold',
    },
    terms: {
        fontSize: typography.fontSize.xs,
        textAlign: 'center',
        marginTop: spacing.xl,
        lineHeight: 18,
    },
});
