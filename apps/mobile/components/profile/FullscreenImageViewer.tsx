// ============================================
// FullscreenImageViewer — Tap-to-expand image modal
// ============================================
//
// Used for viewing profile photos and cover photos in fullscreen.
// Shared between own profile and other user profiles.

import React, { memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Pressable,
    TouchableOpacity,
    StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// ── Props ───────────────────────────────────────────

export interface FullscreenImageViewerProps {
    /** The image URI to display, or null to hide */
    imageUri: string | null;
    /** Called when the viewer should close */
    onClose: () => void;
    /** Optional name to display below the image */
    displayName?: string;
}

// ── Component ───────────────────────────────────────

function FullscreenImageViewerInner({ imageUri, onClose, displayName }: FullscreenImageViewerProps) {
    const insets = useSafeAreaInsets();

    if (!imageUri) return null;

    return (
        <Modal
            visible={!!imageUri}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <StatusBar barStyle="light-content" />
            <View style={styles.container}>
                {/* Backdrop */}
                <Pressable style={styles.backdrop} onPress={onClose} />

                {/* Close button */}
                <TouchableOpacity
                    style={[styles.closeBtn, { top: insets.top + 12 }]}
                    onPress={onClose}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityLabel="Close"
                    accessibilityRole="button"
                >
                    <Ionicons name="close-circle" size={36} color="rgba(255,255,255,0.85)" />
                </TouchableOpacity>

                {/* Image */}
                <Image
                    source={{ uri: imageUri }}
                    style={styles.image}
                    contentFit="contain"
                    transition={200}
                />

                {/* Display name */}
                {displayName ? (
                    <Text style={[styles.name, { bottom: insets.bottom + 24 }]}>
                        {displayName}
                    </Text>
                ) : null}
            </View>
        </Modal>
    );
}

// ── Styles ──────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.92)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    closeBtn: {
        position: 'absolute',
        right: 16,
        zIndex: 10,
    },
    image: {
        width: '90%',
        height: '70%',
    },
    name: {
        position: 'absolute',
        fontSize: 18,
        fontWeight: '600',
        fontFamily: 'Inter-SemiBold',
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
    },
});

export const FullscreenImageViewer = memo(FullscreenImageViewerInner);
export default FullscreenImageViewer;
