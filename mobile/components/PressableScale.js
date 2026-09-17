import React from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { motion } from '../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Wraps any content so it physically compresses on press (cause →
 * effect feedback) and gives a light haptic tick. Respects the same
 * spring config as the rest of the motion system.
 */
export default function PressableScale({
  children, onPress, style, scaleTo = 0.96, haptic = true, disabled, hitSlop,
}) {
  const s = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));

  return (
    <AnimatedPressable
      disabled={disabled}
      hitSlop={hitSlop}
      onPressIn={() => { s.value = withSpring(scaleTo, motion.press); }}
      onPressOut={() => { s.value = withSpring(1, motion.snappy); }}
      onPress={(e) => {
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress && onPress(e);
      }}
      style={[style, animStyle, disabled && { opacity: 0.5 }]}
    >
      {children}
    </AnimatedPressable>
  );
}
