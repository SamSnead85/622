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
import { Button, Input, colors, typography, spacing } from '@zerog/ui';

export default function LoginScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

    const handleLogin = async () => {
        // Validate
        const newErrors: { email?: string; password?: string } = {};
        if (!email) newErrors.email = 'Email is required';
        if (!password) newErrors.password = 'Password is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);
        try {
            // TODO: Implement actual login API call
            await new Promise((resolve) => setTimeout(resolve, 1500));
            router.replace('/(tabs)');
        } catch (error) {
            setErrors({ email: 'Invalid email or password' });
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
                        <Text style={styles.title}>Welcome back</Text>
                        <Text style={styles.subtitle}>
                            Sign in to continue to your communities
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        <Input
                            label="Email or Phone"
                            placeholder="Enter your email or phone"
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
                            placeholder="Enter your password"
                            secureTextEntry
                            value={password}
                            onChangeText={(text) => {
                                setPassword(text);
                                setErrors({});
                            }}
                            error={errors.password}
                        />

                        <TouchableOpacity style={styles.forgotButton}>
                            <Text style={styles.forgotText}>Forgot password?</Text>
                        </TouchableOpacity>

                        <Button
                            variant="primary"
                            size="lg"
                            fullWidth
                            loading={loading}
                            onPress={handleLogin}
                            style={styles.submitButton}
                        >
                            Sign In
                        </Button>
                    </View>

                    {/* Divider */}
                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or continue with</Text>
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

                    {/* Sign up link */}
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
        marginBottom: spacing.xl,
    },
    forgotButton: {
        alignSelf: 'flex-end',
        marginTop: -spacing.sm,
        marginBottom: spacing.lg,
    },
    forgotText: {
        fontSize: typography.fontSize.sm,
        color: colors.gold[500],
        fontFamily: typography.fontFamily.sans,
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
    signupContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: spacing['2xl'],
    },
    signupText: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        fontFamily: typography.fontFamily.sans,
    },
    signupLink: {
        fontSize: typography.fontSize.base,
        color: colors.gold[500],
        fontWeight: '600',
        fontFamily: typography.fontFamily.sans,
    },
});
