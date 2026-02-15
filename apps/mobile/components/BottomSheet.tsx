// ============================================
// BottomSheet — Instagram-style dismissible sheet
// ============================================
//
// Swipe down from ANYWHERE on the sheet to dismiss — just like Instagram.
// The key trick: the PanResponder is on the entire sheet, but it only
// captures the gesture when the user is dragging downward AND the inner
// scroll is at the top (offset 0). This means:
//   - If the FlatList has content to scroll up, scrolling works normally
//   - If the FlatList is at the top and user drags down, the sheet slides
//   - Tapping the backdrop also dismisses
//   - The close button also dismisses
//
// Layout: handle → header → content (flex:1) → footer (fixed)

import React, { useRef, useCallback, useEffect, memo, useState, createContext, useContext } from 'react';
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
const DRAG_DISMISS_THRESHOLD = 80;
const VELOCITY_DISMISS_THRESHOLD = 0.5;

// ── Context ─────────────────────────────────────────
// Allows children (FlatList, ScrollView) to report their scroll offset
// so the BottomSheet knows when swipe-to-dismiss should activate.

type ScrollHandler = (event: { nativeEvent: { contentOffset: { y: number } } }) => void;

const BottomSheetScrollContext = createContext<ScrollHandler | null>(null);

/**
 * Hook for children inside a BottomSheet to get the scroll handler.
 * Attach this to your FlatList/ScrollView's `onScroll` prop to enable
 * swipe-to-dismiss from anywhere on the sheet.
 *
 * @example
 * const onScroll = useBottomSheetScroll();
 * <FlatList onScroll={onScroll} scrollEventThrottle={16} bounces={false} />
 */
export function useBottomSheetScroll(): ScrollHandler | null {
    return useContext(BottomSheetScrollContext);
}

// ── Props ───────────────────────────────────────────

export interface BottomSheetProps {
    visible: boolean;
    onClose: () => void;
    title?: string;
    heightRatio?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    children: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    footer?: any;
    closeIcon?: string;
    keyboardAvoiding?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    headerRight?: any;
    showHandle?: boolean;
    /**
     * Called by the BottomSheet to provide a scroll offset reporter.
     * Pass this to your FlatList/ScrollView's onScroll to enable
     * swipe-to-dismiss from anywhere (not just the handle).
     *
     * Usage in children:
     *   <FlatList onScroll={onContentScroll} scrollEventThrottle={16} />
     */
    onContentScroll?: (event: { nativeEvent: { contentOffset: { y: number } } }) => void;
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
    onContentScroll: externalOnContentScroll,
}: BottomSheetProps) {
    const { colors: c } = useTheme();
    const insets = useSafeAreaInsets();
    const sheetHeight = SCREEN_HEIGHT * heightRatio;

    const translateY = useRef(new RNAnimated.Value(0)).current;
    const backdropOpacity = useRef(new RNAnimated.Value(1)).current;

    // Track whether the inner scroll content is at the very top.
    // When it is, a downward drag should dismiss the sheet instead of scrolling.
    const scrollOffsetRef = useRef(0);
    const [isScrollAtTop, setIsScrollAtTop] = useState(true);

    // Expose a way for children (FlatList) to report their scroll offset
    // We'll pass this via context-like callback
    const handleScrollOffset = useCallback((offset: number) => {
        scrollOffsetRef.current = offset;
        setIsScrollAtTop(offset <= 1);
    }, []);

    // Reset when sheet opens
    useEffect(() => {
        if (visible) {
            translateY.setValue(0);
            backdropOpacity.setValue(1);
            scrollOffsetRef.current = 0;
            setIsScrollAtTop(true);
        }
    }, [visible, translateY, backdropOpacity]);

    // ── PanResponder on the ENTIRE sheet ────────────
    // Only captures when dragging down AND scroll is at top
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gs) => {
                // Only capture if:
                // 1. Dragging downward (dy > 8 to avoid accidental captures)
                // 2. More vertical than horizontal
                // 3. Inner scroll is at the top
                const isDraggingDown = gs.dy > 8;
                const isVertical = Math.abs(gs.dy) > Math.abs(gs.dx) * 1.5;
                const atTop = scrollOffsetRef.current <= 1;
                return isDraggingDown && isVertical && atTop;
            },
            onPanResponderGrant: () => {
                // Provide haptic feedback when grab starts
            },
            onPanResponderMove: (_, gs) => {
                if (gs.dy > 0) {
                    translateY.setValue(gs.dy);
                    // Fade backdrop as sheet slides down
                    const progress = Math.min(gs.dy / sheetHeight, 1);
                    backdropOpacity.setValue(1 - progress * 0.6);
                }
            },
            onPanResponderRelease: (_, gs) => {
                const shouldDismiss =
                    gs.dy > DRAG_DISMISS_THRESHOLD ||
                    gs.vy > VELOCITY_DISMISS_THRESHOLD;

                if (shouldDismiss) {
                    // Animate out
                    RNAnimated.parallel([
                        RNAnimated.timing(translateY, {
                            toValue: sheetHeight,
                            duration: 200,
                            useNativeDriver: true,
                        }),
                        RNAnimated.timing(backdropOpacity, {
                            toValue: 0,
                            duration: 200,
                            useNativeDriver: true,
                        }),
                    ]).start(() => onClose());
                } else {
                    // Snap back
                    RNAnimated.parallel([
                        RNAnimated.spring(translateY, {
                            toValue: 0,
                            useNativeDriver: true,
                            damping: 20,
                            stiffness: 200,
                        }),
                        RNAnimated.timing(backdropOpacity, {
                            toValue: 1,
                            duration: 150,
                            useNativeDriver: true,
                        }),
                    ]).start();
                }
            },
        })
    ).current;

    const handleClose = useCallback(() => {
        RNAnimated.parallel([
            RNAnimated.timing(translateY, {
                toValue: sheetHeight,
                duration: 200,
                useNativeDriver: true,
            }),
            RNAnimated.timing(backdropOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => onClose());
    }, [onClose, translateY, backdropOpacity, sheetHeight]);

    const needsKeyboard = keyboardAvoiding ?? !!footer;

    if (!visible) return null;

    // Create the onContentScroll handler that children should attach to their FlatList/ScrollView.
    // This reports scroll offset so the PanResponder knows when to capture swipe-down gestures.
    const onContentScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
        handleScrollOffset(e.nativeEvent.contentOffset.y);
        // Forward to external handler if provided
        if (externalOnContentScroll) {
            externalOnContentScroll(e);
        }
    }, [handleScrollOffset, externalOnContentScroll]);

    // Pass onContentScroll to children via React context or by cloning.
    // We use a simple approach: wrap children in a context provider.
    const sheetContent = (
        <RNAnimated.View
            {...panResponder.panHandlers}
            style={[
                styles.sheet,
                {
                    height: sheetHeight,
                    backgroundColor: c.background,
                    transform: [{ translateY }],
                },
            ]}
        >
            {/* Drag handle — visual indicator */}
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

            {/* Scrollable content (flex: 1) — context provides scroll handler */}
            <BottomSheetScrollContext.Provider value={onContentScroll}>
                <View style={styles.contentContainer}>{children}</View>
            </BottomSheetScrollContext.Provider>

            {/* Fixed footer */}
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
            {/* Backdrop — tap to dismiss */}
            <RNAnimated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
            </RNAnimated.View>

            {/* Sheet */}
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
    contentContainer: {
        flex: 1,
    },
    footerContainer: {
        // paddingBottom set dynamically for safe area
    },
});

export const BottomSheet = memo(BottomSheetInner);
export default BottomSheet;
