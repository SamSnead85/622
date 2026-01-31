import { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Input, colors, typography, spacing } from '@caravan/ui';

export default function SignupScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!email) {
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

        setLoading(true);
        try {
            // TODO: Implement actual signup API call
            await new Promise((resolve) => setTimeout(resolve, 1500));
            router.push('/(auth)/username');
        } catch (error) {
            setErrors({ email: 'This email is already registered' });
        } finally {
            setLoading(false);
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
                    {/* Header */}
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.backText}>← Back</Text>
                    </TouchableOpacity>

                    {/* Title */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Create account</Text>
                        <Text style={styles.subtitle}>
                            Join millions sharing their stories
                        </Text>
                    </View>

                    {/* Form */}
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
                            loading={loading}
                            onPress={handleSignup}
                            style={styles.submitButton}
                        >
                            Continue
                        </Button>
                    </View>

                    {/* Divider */}
                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or sign up with</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Social Login */}
                    <View style={styles.socialButtons}>
                        <Button
                            variant="secondary"
                            size="lg"
                            style={styles.socialButton}
                            onPress={() => { }}
                        >
                            🍎 Apple
                        </Button>
                        <Button
                            variant="secondary"
                            size="lg"
                            style={styles.socialButton}
                            onPress={() => { }}
                        >
                            🌐 Google
                        </Button>
                    </View>

                    {/* Login link */}
                    <View style={styles.loginContainer}>
                        <Text style={styles.loginText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                            <Text style={styles.loginLink}>Log in</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Terms */}
                    <Text style={styles.terms}>
                        By signing up, you agree to our{' '}
                        <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                        <Text style={styles.termsLink}>Privacy Policy</Text>
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: spacing.xl,
    },
    backButton: {
        alignSelf: 'flex-start',
        marginBottom: spacing.xl,
    },
    backText: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        fontFamily: typography.fontFamily.sans,
    },
    header: {
        marginBottom: spacing['2xl'],
    },
    title: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        fontFamily: typography.fontFamily.sans,
        marginTop: spacing.sm,
    },
    form: {
        marginBottom: spacing.lg,
    },
    submitButton: {
        marginTop: spacing.md,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.xl,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border.subtle,
    },
    dividerText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        fontFamily: typography.fontFamily.sans,
        paddingHorizontal: spacing.md,
    },
    socialButtons: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    socialButton: {
        flex: 1,
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: spacing['2xl'],
    },
    loginText: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        fontFamily: typography.fontFamily.sans,
    },
    loginLink: {
        fontSize: typography.fontSize.base,
        color: colors.gold[500],
        fontWeight: '600',
        fontFamily: typography.fontFamily.sans,
    },
    terms: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        fontFamily: typography.fontFamily.sans,
        textAlign: 'center',
        marginTop: spacing.xl,
        lineHeight: 18,
    },
    termsLink: {
        color: colors.gold[500],
    },
});
