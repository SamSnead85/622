// ============================================
// Data Import Screen
// Import from WhatsApp, Instagram, TikTok
// ============================================

import { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';

import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import { colors, typography, spacing } from '@zerog/ui';
import { apiFetch, API_URL, getToken } from '../../lib/api';
import { ScreenHeader } from '../../components';

// ============================================
// Types
// ============================================

type Platform = 'whatsapp' | 'instagram' | 'tiktok';
type ImportStatus = 'idle' | 'uploading' | 'processing' | 'complete' | 'failed';

interface ImportResult {
    migrationId: string;
    status: string;
    stats?: {
        postsImported: number;
        postsFailed: number;
        connectionsImported: number;
        connectionsMatched: number;
    };
}

// ============================================
// Platform Config
// ============================================

const PLATFORMS = [
    {
        id: 'whatsapp' as Platform,
        name: 'WhatsApp',
        icon: 'chatbubbles' as const,
        color: '#25D366',
        description: 'Import chat history and media from WhatsApp export files',
        steps: [
            'Open the WhatsApp chat you want to export',
            'Tap the three dots (⋯) → More → Export Chat',
            'Choose "Include Media" for complete import',
            'Save the exported .zip file',
            'Upload it here',
        ],
        fileTypes: ['application/zip', 'application/x-zip-compressed'],
    },
    {
        id: 'instagram' as Platform,
        name: 'Instagram',
        icon: 'camera' as const,
        color: '#E1306C',
        description: 'Import posts, reels, and connections from your Instagram data download',
        steps: [
            'Go to Instagram Settings → Privacy & Security',
            'Select "Download Your Data"',
            'Request data in JSON format',
            'Download when ready (usually 24-48 hours)',
            'Upload the .zip file here',
        ],
        fileTypes: ['application/zip', 'application/x-zip-compressed'],
    },
    {
        id: 'tiktok' as Platform,
        name: 'TikTok',
        icon: 'musical-notes' as const,
        color: '#00F2EA',
        description: 'Import videos and connections from your TikTok data download',
        steps: [
            'Go to TikTok Settings → Privacy',
            'Select "Download your data"',
            'Choose JSON format and request',
            'Download when ready',
            'Upload the .zip file here',
        ],
        fileTypes: ['application/zip', 'application/x-zip-compressed'],
    },
];

export default function ImportScreen() {
    const router = useRouter();
    const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
    const [importStatus, setImportStatus] = useState<ImportStatus>('idle');
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [progress, setProgress] = useState(0);

    // ============================================
    // File Selection & Upload
    // ============================================

    const handleSelectFile = useCallback(async () => {
        if (!selectedPlatform) return;

        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/zip', 'application/x-zip-compressed', '*/*'],
                copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets?.[0]) return;

            const file = result.assets[0];
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setImportStatus('uploading');

            // Upload the file
            const token = await getToken();
            const formData = new FormData();
            formData.append('file', {
                uri: file.uri,
                type: file.mimeType || 'application/zip',
                name: file.name || 'export.zip',
            } as any);
            formData.append('platform', selectedPlatform.toUpperCase());

            const response = await fetch(`${API_URL}/api/v1/migration/upload`, {
                method: 'POST',
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();
            setImportStatus('processing');

            // Poll for migration status
            pollMigrationStatus(data.migrationId || data.id);
        } catch (error) {
            setImportStatus('failed');
            Alert.alert('Import Failed', 'Could not upload the file. Please try again.');
        }
    }, [selectedPlatform]);

    // ============================================
    // Poll Migration Status
    // ============================================

    const pollMigrationStatus = useCallback(async (migrationId: string) => {
        const maxAttempts = 60; // 5 minutes max
        let attempts = 0;

        const poll = async () => {
            try {
                const data = await apiFetch<any>(`/api/v1/migration/${migrationId}/status`);

                if (data.status === 'COMPLETED') {
                    setImportStatus('complete');
                    setImportResult({
                        migrationId,
                        status: data.status,
                        stats: data.stats,
                    });
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    return;
                }

                if (data.status === 'FAILED') {
                    setImportStatus('failed');
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    return;
                }

                // Still processing
                attempts++;
                setProgress(Math.min(95, (attempts / maxAttempts) * 100));

                if (attempts < maxAttempts) {
                    setTimeout(poll, 5000); // Check every 5 seconds
                } else {
                    setImportStatus('failed');
                }
            } catch {
                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(poll, 5000);
                } else {
                    setImportStatus('failed');
                }
            }
        };

        poll();
    }, []);

    // ============================================
    // Render
    // ============================================

    const platform = PLATFORMS.find((p) => p.id === selectedPlatform);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800]]}
                style={StyleSheet.absoluteFill}
            />

            <ScreenHeader
                title="Import Data"
                onBack={() => {
                    if (selectedPlatform && importStatus === 'idle') {
                        setSelectedPlatform(null);
                    } else {
                        router.back();
                    }
                }}
                noBorder
            />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {!selectedPlatform ? (
                    /* Platform Selection */
                    <View>
                        <Text style={styles.subtitle}>
                            Bring your data from other platforms to 0G. Your privacy is preserved throughout the import process.
                        </Text>

                        <View style={styles.platformGrid}>
                            {PLATFORMS.map((p) => (
                                <TouchableOpacity
                                    key={p.id}
                                    style={styles.platformCard}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setSelectedPlatform(p.id);
                                        setImportStatus('idle');
                                        setImportResult(null);
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <View style={[styles.platformIcon, { backgroundColor: p.color + '20' }]}>
                                        <Ionicons name={p.icon} size={28} color={p.color} />
                                    </View>
                                    <Text style={styles.platformName}>{p.name}</Text>
                                    <Text style={styles.platformDesc}>{p.description}</Text>
                                    <View style={styles.platformArrow}>
                                        <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Privacy note */}
                        <View style={styles.privacyNote}>
                            <Ionicons name="shield-checkmark" size={20} color={colors.gold[400]} />
                            <Text style={styles.privacyText}>
                                Your imported data stays private. Only you can see it unless you choose to share.
                            </Text>
                        </View>
                    </View>
                ) : (
                    /* Import Flow */
                    <View>
                        {importStatus === 'idle' && platform && (
                            <View>
                                <View style={[styles.platformHeader, { borderStartColor: platform.color }]}>
                                    <Ionicons name={platform.icon} size={32} color={platform.color} />
                                    <View style={{ flex: 1, marginStart: spacing.md }}>
                                        <Text style={styles.platformHeaderName}>{platform.name}</Text>
                                        <Text style={styles.platformHeaderDesc}>{platform.description}</Text>
                                    </View>
                                </View>

                                <Text style={styles.stepsTitle}>How to export your data:</Text>
                                {platform.steps.map((step, i) => (
                                    <View key={i} style={styles.stepRow}>
                                        <View style={styles.stepNumber}>
                                            <Text style={styles.stepNumberText}>{i + 1}</Text>
                                        </View>
                                        <Text style={styles.stepText}>{step}</Text>
                                    </View>
                                ))}

                                <TouchableOpacity
                                    style={styles.uploadBtn}
                                    onPress={handleSelectFile}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={[colors.gold[400], colors.gold[600]]}
                                        style={styles.uploadBtnGradient}
                                    >
                                        <Ionicons name="cloud-upload-outline" size={22} color={colors.obsidian[900]} />
                                        <Text style={styles.uploadBtnText}>Select Export File</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        )}

                        {(importStatus === 'uploading' || importStatus === 'processing') && (
                            <View style={styles.progressSection}>
                                <ActivityIndicator size="large" color={colors.gold[500]} />
                                <Text style={styles.progressTitle}>
                                    {importStatus === 'uploading' ? 'Uploading...' : 'Processing your data...'}
                                </Text>
                                <Text style={styles.progressSubtitle}>
                                    This may take a few minutes depending on file size
                                </Text>
                                {importStatus === 'processing' && (
                                    <View style={styles.progressBar}>
                                        <View style={[styles.progressFill, { width: `${progress}%` }]} />
                                    </View>
                                )}
                            </View>
                        )}

                        {importStatus === 'complete' && importResult && (
                            <View style={styles.resultSection}>
                                <View style={styles.successIcon}>
                                    <Ionicons name="checkmark-circle" size={64} color="#34D399" />
                                </View>
                                <Text style={styles.resultTitle}>Import Complete!</Text>
                                {importResult.stats && (
                                    <View style={styles.statsGrid}>
                                        <View style={styles.statCard}>
                                            <Text style={styles.statNumber}>{importResult.stats.postsImported}</Text>
                                            <Text style={styles.statLabel}>Posts Imported</Text>
                                        </View>
                                        <View style={styles.statCard}>
                                            <Text style={styles.statNumber}>{importResult.stats.connectionsImported}</Text>
                                            <Text style={styles.statLabel}>Connections Found</Text>
                                        </View>
                                        <View style={styles.statCard}>
                                            <Text style={styles.statNumber}>{importResult.stats.connectionsMatched}</Text>
                                            <Text style={styles.statLabel}>Matched on 0G</Text>
                                        </View>
                                    </View>
                                )}
                                <TouchableOpacity
                                    style={styles.doneBtn}
                                    onPress={() => router.back()}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={[colors.gold[400], colors.gold[600]]}
                                        style={styles.doneBtnGradient}
                                    >
                                        <Text style={styles.doneBtnText}>Done</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        )}

                        {importStatus === 'failed' && (
                            <View style={styles.resultSection}>
                                <View style={styles.failIcon}>
                                    <Ionicons name="close-circle" size={64} color="#EF4444" />
                                </View>
                                <Text style={styles.resultTitle}>Import Failed</Text>
                                <Text style={styles.resultSubtitle}>
                                    Please check your file format and try again.
                                </Text>
                                <TouchableOpacity
                                    style={styles.retryBtn}
                                    onPress={() => {
                                        setImportStatus('idle');
                                        setImportResult(null);
                                        setProgress(0);
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.retryBtnText}>Try Again</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
    subtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        lineHeight: 24,
        marginBottom: spacing.xl,
    },

    // Platform selection
    platformGrid: { gap: spacing.md },
    platformCard: {
        backgroundColor: colors.surface.glass,
        borderRadius: 16,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    platformIcon: {
        width: 52,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    platformName: { fontSize: typography.fontSize.lg, fontWeight: '700', color: colors.text.primary, marginBottom: 4 },
    platformDesc: { fontSize: typography.fontSize.sm, color: colors.text.muted, lineHeight: 20 },
    platformArrow: { position: 'absolute', top: spacing.lg, right: spacing.lg },

    privacyNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        backgroundColor: colors.surface.glass,
        borderRadius: 12,
        padding: spacing.md,
        marginTop: spacing.xl,
    },
    privacyText: { flex: 1, fontSize: typography.fontSize.sm, color: colors.text.secondary, lineHeight: 20 },

    // Import flow
    platformHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        backgroundColor: colors.surface.glass,
        borderRadius: 16,
        borderStartWidth: 4,
        marginBottom: spacing.xl,
    },
    platformHeaderName: { fontSize: typography.fontSize.lg, fontWeight: '700', color: colors.text.primary },
    platformHeaderDesc: { fontSize: typography.fontSize.sm, color: colors.text.muted, marginTop: 2 },
    stepsTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: spacing.md,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    stepNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.gold[500],
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepNumberText: { fontSize: 13, fontWeight: '700', color: colors.obsidian[900] },
    stepText: { flex: 1, fontSize: typography.fontSize.base, color: colors.text.secondary, lineHeight: 22, paddingTop: 3 },

    uploadBtn: { marginTop: spacing.xl },
    uploadBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: 16,
        borderRadius: 14,
    },
    uploadBtnText: { fontSize: typography.fontSize.base, fontWeight: '700', color: colors.obsidian[900] },

    // Progress
    progressSection: { alignItems: 'center', paddingTop: 60 },
    progressTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '600',
        color: colors.text.primary,
        marginTop: spacing.xl,
    },
    progressSubtitle: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        marginTop: spacing.sm,
        textAlign: 'center',
    },
    progressBar: {
        width: '80%',
        height: 4,
        backgroundColor: colors.surface.glassHover,
        borderRadius: 2,
        marginTop: spacing.xl,
        overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: colors.gold[500], borderRadius: 2 },

    // Results
    resultSection: { alignItems: 'center', paddingTop: 40 },
    successIcon: { marginBottom: spacing.lg },
    failIcon: { marginBottom: spacing.lg },
    resultTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    resultSubtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.muted,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.lg,
        marginBottom: spacing.xl,
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.surface.glass,
        borderRadius: 12,
        padding: spacing.md,
        alignItems: 'center',
    },
    statNumber: { fontSize: 24, fontWeight: '700', color: colors.gold[400] },
    statLabel: { fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: 4, textAlign: 'center' },

    doneBtn: { width: '100%', marginTop: spacing.md },
    doneBtnGradient: {
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    doneBtnText: { fontSize: typography.fontSize.base, fontWeight: '700', color: colors.obsidian[900] },
    retryBtn: {
        backgroundColor: colors.surface.glassHover,
        paddingHorizontal: spacing.xl,
        paddingVertical: 14,
        borderRadius: 14,
    },
    retryBtnText: { fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.primary },
});
