// ============================================
// BottomSheet — Wrapper around @gorhom/bottom-sheet
// ============================================
//
// Uses the battle-tested @gorhom/bottom-sheet library (1M+ weekly downloads)
// instead of a custom PanResponder implementation.
//
// This gives us Instagram-quality gestures for free:
//   - Swipe down from anywhere to dismiss
//   - Scroll-aware: only dismisses when FlatList is at top
//   - Velocity-based dismiss (fast flick = instant close)
//   - Smooth spring animations via react-native-reanimated
//   - Proper keyboard avoidance
//
// The component API stays the same so all consumers (CommentsSheet, etc.)
// continue to work without changes.

import React, { useRef, useCallback, useEffect, useMemo, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    BackHandler,
} from 'react-native';
import GorhomBottomSheet, {
    BottomSheetBackdrop,
    BottomSheetFlatList,
    BottomSheetScrollView,
    BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

// ── Constants ───────────────────────────────────────

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── Props ───────────────────────────────────────────

export interface BottomSheetProps {
    visible: boolean;
    onClose: () => void;
    title?: string;
    /** Height as a ratio of screen height (0-1). Default: 0.72 */
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
}

// ── Component ───────────────────────────────────────

function BottomSheetInner({
    visible,
    onClose,
    title,
    heightRatio = 0.72,
    children,
    footer,
    closeIcon = 'close',
    keyboardAvoiding,
    headerRight,
    showHandle = true,
}: BottomSheetProps) {
    const { colors: c } = useTheme();
    const insets = useSafeAreaInsets();
    const bottomSheetRef = useRef<GorhomBottomSheet>(null);

    // Snap points: closed (-1) or open at the specified height
    const snapPoints = useMemo(() => {
        const heightPx = Math.round(SCREEN_HEIGHT * heightRatio);
        return [heightPx];
    }, [heightRatio]);

    // Open/close the sheet based on `visible` prop
    useEffect(() => {
        if (visible) {
            bottomSheetRef.current?.snapToIndex(0);
        } else {
            bottomSheetRef.current?.close();
        }
    }, [visible]);

    // Android back button support
    useEffect(() => {
        if (!visible) return;
        const handler = BackHandler.addEventListener('hardwareBackPress', () => {
            onClose();
            return true;
        });
        return () => handler.remove();
    }, [visible, onClose]);

    const handleSheetChange = useCallback((index: number) => {
        if (index === -1) {
            onClose();
        }
    }, [onClose]);

    // Backdrop: tap to dismiss, fades with sheet position
    const renderBackdrop = useCallback(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.45}
                pressBehavior="close"
            />
        ),
        []
    );

    // Handle indicator
    const renderHandle = useCallback(() => {
        if (!showHandle && !title) return null;
        return (
            <View>
                {showHandle && (
                    <View style={styles.handleBar}>
                        <View style={[styles.handle, { backgroundColor: c.text.muted + '50' }]} />
                    </View>
                )}
                {title != null && (
                    <View style={[styles.header, { borderBottomColor: c.border.subtle }]}>
                        {headerRight ? <View style={styles.headerLeft}>{headerRight}</View> : null}
                        <Text style={[styles.headerTitle, { color: c.text.primary }]}>{title}</Text>
                        <TouchableOpacity
                            style={styles.headerCloseBtn}
                            onPress={onClose}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            accessibilityLabel="Close"
                            accessibilityRole="button"
                        >
                            <Ionicons
                                name={closeIcon as keyof typeof Ionicons.glyphMap}
                                size={22}
                                color={c.text.secondary}
                            />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    }, [showHandle, title, c, closeIcon, onClose, headerRight]);

    // Don't render at all when not visible (saves memory)
    if (!visible) return null;

    const needsKeyboard = keyboardAvoiding ?? !!footer;

    const sheetContent = (
        <GorhomBottomSheet
            ref={bottomSheetRef}
            index={0}
            snapPoints={snapPoints}
            onChange={handleSheetChange}
            enablePanDownToClose={true}
            backdropComponent={renderBackdrop}
            handleComponent={renderHandle}
            backgroundStyle={{ backgroundColor: c.background }}
            keyboardBehavior={needsKeyboard ? 'interactive' : 'extend'}
            keyboardBlurBehavior="restore"
            android_keyboardInputMode="adjustResize"
            animateOnMount={true}
            enableDynamicSizing={false}
            style={styles.sheet}
        >
            {/* Content area — flex: 1 */}
            <View style={styles.contentContainer}>
                {children}
            </View>

            {/* Fixed footer */}
            {footer ? (
                <View style={[styles.footerContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
                    {footer}
                </View>
            ) : null}
        </GorhomBottomSheet>
    );

    // Wrap in KeyboardAvoidingView on iOS if needed
    if (needsKeyboard && Platform.OS === 'ios') {
        return (
            <KeyboardAvoidingView
                behavior="padding"
                style={StyleSheet.absoluteFill}
                pointerEvents="box-none"
            >
                {sheetContent}
            </KeyboardAvoidingView>
        );
    }

    return sheetContent;
}

// ── Styles ──────────────────────────────────────────

const styles = StyleSheet.create({
    sheet: {
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
    headerLeft: {
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

// ── Re-exports from @gorhom/bottom-sheet ────────────
// So consumers can use the scrollable components that integrate
// with the sheet's gesture system automatically.

export { BottomSheetFlatList, BottomSheetScrollView, BottomSheetView };

// Legacy hook — no longer needed with @gorhom/bottom-sheet
// (the library handles scroll-aware dismiss automatically)
export function useBottomSheetScroll() {
    return null;
}

export const BottomSheet = memo(BottomSheetInner);
export default BottomSheet;
