import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { motion, useReducedMotion } from '@/components/motion/motion';
import { PressableScale } from '@/components/motion/PressableScale';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Floating "create" button that pops in. Render it last inside a
 * screen; hide it for roles that cannot create (RBAC).
 */
export function Fab({
  label,
  onPress,
  icon = 'add',
}: {
  label: string;
  onPress: () => void;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const pop = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) return;
    Animated.spring(pop, {
      toValue: 1,
      delay: 250,
      speed: 12,
      bounciness: 10,
      useNativeDriver: motion.useNativeDriver,
    }).start();
  }, [pop, reduced]);

  return (
    <Animated.View
      style={[
        styles.wrap,
        { bottom: insets.bottom + 18, transform: [{ scale: pop }], opacity: pop },
      ]}
      pointerEvents="box-none"
    >
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[
          styles.button,
          {
            backgroundColor: theme.colors.primary,
            shadowColor: theme.colors.primary,
          },
        ]}
      >
        <Ionicons name={icon} size={22} color={theme.colors.onPrimary} />
        <Text style={[styles.label, { color: theme.colors.onPrimary }]}>{label}</Text>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 18 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    height: 54,
    borderRadius: 27,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  label: { fontSize: 15, fontWeight: '800' },
});
