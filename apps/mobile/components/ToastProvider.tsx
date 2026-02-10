import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, Pressable, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@zerog/ui';
import { useToastStore } from '../stores/toastStore';

type ToastType = 'success' | 'error' | 'info' | 'warning';

const accentColors: Record<ToastType, string> = {
  success: colors.gold[500],
  error: colors.coral[500],
  info: colors.azure[500],
  warning: colors.amber[500],
};

const iconNames: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
  warning: 'warning',
};

function ToastItem({ id, message, type }: { id: string; message: string; type: ToastType }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const hasTriggeredHaptic = useRef(false);

  useEffect(() => {
    if (!hasTriggeredHaptic.current) {
      hasTriggeredHaptic.current = true;
      if (type === 'error' || type === 'warning') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, [type]);

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(15)}
      exiting={FadeOutUp.duration(200)}
      style={[styles.toast, { borderLeftColor: accentColors[type] }]}
    >
      <Pressable style={styles.toastContent} onPress={() => dismiss(id)}>
        <Ionicons
          name={iconNames[type]}
          size={20}
          color={accentColors[type]}
          style={styles.icon}
        />
        <Text style={styles.message} numberOfLines={3}>
          {message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function ToastProvider() {
  const toasts = useToastStore((s) => s.toasts);
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View
      style={[
        styles.container,
        { top: insets.top + 8 },
      ]}
      pointerEvents="box-none"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.glass,
    borderRadius: 14,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  toastContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  icon: {
    marginRight: 10,
  },
  message: {
    flex: 1,
    color: colors.text.primary,
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    lineHeight: 20,
  },
});
