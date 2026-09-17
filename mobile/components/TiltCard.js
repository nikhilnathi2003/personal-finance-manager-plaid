import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { T } from '../theme';

const MAX_TILT = 9; // degrees

/**
 * A card that tilts in real 3D perspective under your finger, like
 * holding a physical bank card. A light "sheen" sweeps across as it
 * tilts, giving it a holographic feel. Springs back when released.
 */
export default function TiltCard({ children, style }) {
  const rx = useSharedValue(0);
  const ry = useSharedValue(0);
  const size = useSharedValue({ w: 1, h: 1 });

  const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  const pan = Gesture.Pan()
    .onBegin((e) => {
      runOnJS(tap)();
      ry.value = withSpring(((e.x / size.value.w) - 0.5) * 2 * MAX_TILT);
      rx.value = withSpring(-((e.y / size.value.h) - 0.5) * 2 * MAX_TILT);
    })
    .onUpdate((e) => {
      ry.value = ((e.x / size.value.w) - 0.5) * 2 * MAX_TILT;
      rx.value = -((e.y / size.value.h) - 0.5) * 2 * MAX_TILT;
    })
    .onFinalize(() => {
      rx.value = withSpring(0, { damping: 12 });
      ry.value = withSpring(0, { damping: 12 });
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { rotateX: `${rx.value}deg` },
      { rotateY: `${ry.value}deg` },
    ],
  }));

  const sheenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(ry.value) + Math.abs(rx.value), [0, MAX_TILT * 2], [0.25, 0.8]),
    transform: [{ translateX: interpolate(ry.value, [-MAX_TILT, MAX_TILT], [-140, 140]) }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[styles.card, cardStyle, style]}
        onLayout={(e) => {
          size.value = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
        }}
      >
        <LinearGradient
          colors={T.aurora}
          start={{ x: 0, y: 0 }}
          end={{ x: 1.2, y: 1.2 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[styles.sheen, sheenStyle]} pointerEvents="none">
          <LinearGradient
            colors={T.auroraSheen}
            start={{ x: 0, y: 0.2 }}
            end={{ x: 1, y: 0.8 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <View style={styles.content}>{children}</View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  sheen: { ...StyleSheet.absoluteFillObject, width: 180, left: '30%' },
  content: { padding: 24 },
});
