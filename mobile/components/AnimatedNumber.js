import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { T } from '../theme';

Animated.addWhitelistedNativeProps({ text: true });
const AnimatedText = Animated.createAnimatedComponent(Text);

export default function AnimatedNumber({ value, prefix = '$', style }) {
  const animated = useSharedValue(0);

  useEffect(() => {
    animated.value = withTiming(value || 0, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [value]);

  const animatedProps = useAnimatedProps(() => {
    const fixed = animated.value.toFixed(2);
    const withCommas = fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return { text: `${prefix}${withCommas}` };
  });

  return (
    <AnimatedText
      style={[styles.text, style]}
      animatedProps={animatedProps}
      defaultValue={`${prefix}0.00`}
    />
  );
}

const styles = StyleSheet.create({
  text: { color: T.text, fontSize: 40, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
