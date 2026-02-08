import { useState } from 'react';
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
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, Input, colors, typography, spacing } from '@zerog/ui';
import { useAuthStore } from '../../stores';

export default function LoginScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const login = useAuthStore((s) => s.login);
    const isLoading = useAuthStore((s) => s.isLoading);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

    const handleLogin = async () => {
        const newErrors: { email?: string; password?: string } = {};
        if (!email.trim()) newErrors.email = 'Email is required';
        if (!password) newErrors.password = 'Password is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            await login(email.trim(), password);
            router.replace('/(tabs)');
        } catch (error: any) {
            const message = error?.data?.error || error?.message || 'Invalid email or password';
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
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="chevron-back" size={24} color={colors.text.secondary} />
                    </TouchableOpacity>

                    <Animated.View entering={FadeInDown.duration(400)}>
                        <View style={styles.header}>
                            <Text style={styles.title}>Welcome back</Text>
                            <Text style={styles.subtitle}>
                                Sign in to continue to your private community
                            </Text>
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.duration(400).delay(100)}>
                        <View style={styles.form}>
                            <Input
                                label="Email"
                                placeholder="Enter your email"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoComplete="email"
                                value={email}
                                onChangeText={(text) => {
                                    setEmail(text);
                                    if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
                                }}
                                error={errors.email}
                            />

                            <Input
                                label="Password"
                                placeholder="Enter your password"
                                secureTextEntry
                                value={password}
                                onChangeText={(text) => {
                                    setPassword(text);
                                    if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
                                }}
                                error={errors.password}
                            />

                            <TouchableOpacity
                                style={styles.forgotButton}
                                onPress={() => {
                                    Alert.alert(
                                        'Reset Password',
                                        'Password reset is available at 0gravity.ai. Please visit the web app to reset your password.',
                                        [{ text: 'OK' }]
                                    );
                                }}
                            >
                                <Text style={styles.forgotText}>Forgot password?</Text>
                            </TouchableOpacity>

                            <Button
                                variant="primary"
                                size="lg"
                                fullWidth
                                loading={isLoading}
                                onPress={handleLogin}
                                style={styles.submitButton}
                            >
                                Sign In
                            </Button>
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.duration(400).delay(200)}>
                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>or continue with</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <View style={styles.socialButtons}>
                            <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
                                <Ionicons name="logo-apple" size={20} color={colors.text.muted} />
                                <Text style={styles.socialButtonText}>Apple</Text>
                                <Text style={styles.comingSoonBadge}>Soon</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
                                <Ionicons name="logo-google" size={18} color={colors.text.muted} />
                                <Text style={styles.socialButtonText}>Google</Text>
                                <Text style={styles.comingSoonBadge}>Soon</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    <View style={styles.signupContainer}>
                        <Text style={styles.signupText}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                            <Text style={styles.signupLink}>Sign up</Text>
                        </TouchableOpacity>
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
    form: { marginBottom: spacing.xl },
    forgotButton: {
        alignSelf: 'flex-end',
        marginTop: -spacing.sm,
        marginBottom: spacing.lg,
    },
    forgotText: { fontSize: typography.fontSize.sm, color: colors.gold[500] },
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
    signupContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: spacing['2xl'],
    },
    signupText: { fontSize: typography.fontSize.base, color: colors.text.secondary },
    signupLink: {
        fontSize: typography.fontSize.base,
        color: colors.gold[500],
        fontWeight: '600',
    },
});
