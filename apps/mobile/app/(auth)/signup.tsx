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
import { Button, Input, colors, typography, spacing } from '@zerog/ui';
import { useAuthStore } from '../../stores';

export default function SignupScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const signup = useAuthStore((s) => s.signup);
    const isLoading = useAuthStore((s) => s.isLoading);

    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

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
            router.replace('/(tabs)');
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
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.backText}>← Back</Text>
                    </TouchableOpacity>

                    <View style={styles.header}>
                        <Text style={styles.title}>Create account</Text>
                        <Text style={styles.subtitle}>
                            Join your private community — your world, your rules
                        </Text>
                    </View>

                    <View style={styles.form}>
                        <Input
                            label="Display Name"
                            placeholder="Your name"
                            autoCapitalize="words"
                            value={displayName}
                            onChangeText={(text) => {
                                setDisplayName(text);
                                setErrors({});
                            }}
                            error={errors.displayName}
                        />

                        <Input
                            label="Email"
                            placeholder="Enter your email"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            value={email}
                            onChangeText={(text) => {
                                setEmail(text);
                                setErrors({});
                            }}
                            error={errors.email}
                        />

                        <Input
                            label="Password"
                            placeholder="Create a password"
                            secureTextEntry
                            value={password}
                            onChangeText={(text) => {
                                setPassword(text);
                                setErrors({});
                            }}
                            error={errors.password}
                            hint="At least 8 characters"
                        />

                        <Input
                            label="Confirm Password"
                            placeholder="Confirm your password"
                            secureTextEntry
                            value={confirmPassword}
                            onChangeText={(text) => {
                                setConfirmPassword(text);
                                setErrors({});
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
                        >
                            Create Account
                        </Button>
                    </View>

                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or sign up with</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <View style={styles.socialButtons}>
                        <Button
                            variant="secondary"
                            size="lg"
                            style={styles.socialButton}
                            onPress={() => Alert.alert('Coming Soon', 'Apple Sign-In coming soon')}
                        >
                            Apple
                        </Button>
                        <Button
                            variant="secondary"
                            size="lg"
                            style={styles.socialButton}
                            onPress={() => Alert.alert('Coming Soon', 'Google Sign-In coming soon')}
                        >
                            Google
                        </Button>
                    </View>

                    <View style={styles.loginContainer}>
                        <Text style={styles.loginText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                            <Text style={styles.loginLink}>Log in</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.terms}>
                        By signing up, you agree to our Terms of Service and Privacy Policy
                    </Text>

                    {/* Privacy notice */}
                    <View style={styles.privacyNotice}>
                        <Text style={styles.privacyIcon}>🔒</Text>
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
    backButton: { alignSelf: 'flex-start', marginBottom: spacing.xl },
    backText: { fontSize: typography.fontSize.base, color: colors.text.secondary },
    header: { marginBottom: spacing['2xl'] },
    title: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: '700',
        color: colors.text.primary,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        marginTop: spacing.sm,
    },
    form: { marginBottom: spacing.lg },
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
    socialButton: { flex: 1 },
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
        backgroundColor: 'rgba(212, 175, 55, 0.08)',
        borderRadius: 12,
        padding: spacing.md,
        marginTop: spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.15)',
    },
    privacyIcon: {
        fontSize: 16,
        marginRight: spacing.sm,
        marginTop: 2,
    },
    privacyText: {
        flex: 1,
        fontSize: typography.fontSize.xs,
        color: colors.gold[400],
        lineHeight: 18,
    },
});
