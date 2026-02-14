// ============================================
// BottomSheet — Shared bottom sheet primitive
// ============================================
//
// A single, well-architected bottom sheet used across the entire app.
// Features:
//   - PanResponder on drag handle ONLY (content is freely scrollable/tappable)
//   - Proper flex layout: handle + header at top, content in middle (flex: 1), footer at bottom
//   - KeyboardAvoidingView integration for sheets with text inputs
//   - Safe area handling built in
//   - Slide-up animation via Animated
//   - Backdrop tap to dismiss
//
// Usage:
//   <BottomSheet visible={open} onClose={close} title="Comments" footer={<InputBar />}>
//       <FlatList ... />
//   </BottomSheet>

import React, { useRef, useCallback, useEffect, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Pressable,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    Animated as RNAnimated,
    PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

// ── Constants ───────────────────────────────────────

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DEFAULT_HEIGHT_RATIO = 0.72;
const DRAG_DISMISS_THRESHOLD = 100;

// ── Props ───────────────────────────────────────────

export interface BottomSheetProps {
    /** Whether the sheet is visible */
    visible: boolean;
    /** Called when the sheet should close (backdrop tap, swipe down, close button) */
    onClose: () => void;
    /** Title displayed in the header. If omitted, no header is rendered. */
    title?: string;
    /** Height as a ratio of screen height (0-1). Default: 0.72 */
    heightRatio?: number;
    /** Content to render in the scrollable middle area */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    children: any;
    /** Fixed footer content (e.g., input bar). Rendered below the scrollable area. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    footer?: any;
    /** Icon name for the close button. Default: "close" */
    closeIcon?: string;
    /** Whether to wrap in KeyboardAvoidingView. Default: true if footer is provided */
    keyboardAvoiding?: boolean;
    /** Right-side header action (e.g., a send button) */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    headerRight?: any;
    /** Whether to show the drag handle. Default: true */
    showHandle?: boolean;
}

// ── Component ───────────────────────────────────────

function BottomSheetInner({
    visible,
    onClose,
    title,
    heightRatio = DEFAULT_HEIGHT_RATIO,
    children,
    footer,
    closeIcon = 'close',
    keyboardAvoiding,
    headerRight,
    showHandle = true,
}: BottomSheetProps) {
    const { colors: c } = useTheme();
    const insets = useSafeAreaInsets();
    const sheetHeight = SCREEN_HEIGHT * heightRatio;

    // ── Swipe-to-dismiss animation ──────────────────
    const translateY = useRef(new RNAnimated.Value(0)).current;

    // Reset translateY when sheet opens
    useEffect(() => {
        if (visible) {
            translateY.setValue(0);
        }
    }, [visible, translateY]);

    // PanResponder — attached ONLY to the drag handle area
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) =>
                gestureState.dy > 6 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
            onPanResponderMove: (_, gestureState) => {
                // Only allow downward dragging
                if (gestureState.dy > 0) {
                    translateY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > DRAG_DISMISS_THRESHOLD) {
                    // Dismiss
                    RNAnimated.timing(translateY, {
                        toValue: sheetHeight,
                        duration: 200,
                        useNativeDriver: true,
                    }).start(() => onClose());
                } else {
                    // Snap back
                    RNAnimated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: true,
                        damping: 20,
                        stiffness: 200,
                    }).start();
                }
            },
        })
    ).current;

    const handleClose = useCallback(() => {
        RNAnimated.timing(translateY, {
            toValue: sheetHeight,
            duration: 200,
            useNativeDriver: true,
        }).start(() => onClose());
    }, [onClose, translateY, sheetHeight]);

    // Determine if we need keyboard avoidance
    const needsKeyboard = keyboardAvoiding ?? !!footer;

    if (!visible) return null;

    const sheetContent = (
        <RNAnimated.View
            style={[
                styles.sheet,
                {
                    height: sheetHeight,
                    backgroundColor: c.background,
                    transform: [{ translateY }],
                },
            ]}
        >
            {/* ── Drag handle area (PanResponder attached here ONLY) ── */}
            <View {...panResponder.panHandlers}>
                {showHandle && (
                    <View style={styles.handleBar}>
                        <View style={[styles.handle, { backgroundColor: c.text.muted + '50' }]} />
                    </View>
                )}

                {/* Header */}
                {title != null && (
                    <View style={[styles.header, { borderBottomColor: c.border.subtle }]}>
                        <Text style={[styles.headerTitle, { color: c.text.primary }]}>{title}</Text>
                        <TouchableOpacity
                            style={styles.headerCloseBtn}
                            onPress={handleClose}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            accessibilityLabel="Close"
                            accessibilityRole="button"
                        >
                            <Ionicons name={closeIcon as keyof typeof Ionicons.glyphMap} size={22} color={c.text.secondary} />
                        </TouchableOpacity>
                        {headerRight ? <View style={styles.headerRight}>{headerRight}</View> : null}
                    </View>
                )}
            </View>

            {/* ── Scrollable content area (flex: 1) ── */}
            <View style={styles.contentContainer}>{children}</View>

            {/* ── Fixed footer (intrinsic height, pinned to bottom) ── */}
            {footer ? (
                <View style={[styles.footerContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
                    {footer}
                </View>
            ) : null}
        </RNAnimated.View>
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            statusBarTranslucent
            onRequestClose={handleClose}
        >
            {/* Backdrop */}
            <Pressable style={styles.backdrop} onPress={handleClose} />

            {/* Sheet — optionally wrapped in KeyboardAvoidingView */}
            {needsKeyboard ? (
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.keyboardView}
                    keyboardVerticalOffset={0}
                >
                    {sheetContent}
                </KeyboardAvoidingView>
            ) : (
                sheetContent
            )}
        </Modal>
    );
}

// ── Styles ──────────────────────────────────────────

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    keyboardView: {
        // Sits at the bottom, shrinks when keyboard appears
    },
    sheet: {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 16,
    },
    handleBar: {
        alignItems: 'center',
        paddingTop: 10,
        paddingBottom: 2,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        position: 'relative',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
    },
    headerCloseBtn: {
        position: 'absolute',
        right: 16,
        top: 12,
    },
    headerRight: {
        position: 'absolute',
        left: 16,
        top: 12,
    },
    // The content container takes all remaining space
    contentContainer: {
        flex: 1,
    },
    // Footer has intrinsic height — no flex
    footerContainer: {
        // paddingBottom is set dynamically for safe area
    },
});

// ── Export ───────────────────────────────────────────

export const BottomSheet = memo(BottomSheetInner);
export default BottomSheet;
