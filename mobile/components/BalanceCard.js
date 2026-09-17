import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { T, type, elevation, money, motion } from '../theme';

const MAX_TILT = 6;

/**
 * A compact gradient balance card (chequing / savings) with real
 * perspective tilt under the finger and a soft sheen — the "spatial"
 * feel adapted to a small tile that sits two-up in a row.
 */
export default function BalanceCard({ label, amount, icon, colors, subtitle }) {
  const rx = useSharedValue(0);
  const ry = useSharedValue(0);
  const size = useSharedValue({ w: 1, h: 1 });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      ry.value = ((e.x / size.value.w) - 0.5) * 2 * MAX_TILT;
      rx.value = -((e.y / size.value.h) - 0.5) * 2 * MAX_TILT;
    })
    .onFinalize(() => {
      rx.value = withSpring(0, motion.soft);
      ry.value = withSpring(0, motion.soft);
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 700 },
      { rotateX: `${rx.value}deg` },
      { rotateY: `${ry.value}deg` },
    ],
  }));

  const sheenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(ry.value) + Math.abs(rx.value), [0, MAX_TILT * 2], [0.12, 0.5]),
    transform: [{ translateX: interpolate(ry.value, [-MAX_TILT, MAX_TILT], [-90, 90]) }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[styles.card, elevation.med, cardStyle]}
        onLayout={(e) => { size.value = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height }; }}
      >
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Animated.View style={[styles.sheen, sheenStyle]} pointerEvents="none">
          <LinearGradient
            colors={T.auroraSheen} start={{ x: 0, y: 0.2 }} end={{ x: 1, y: 0.8 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <View style={styles.head}>
          <Ionicons name={icon} size={16} color="rgba(255,255,255,0.9)" />
          <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
          {money(amount)}
        </Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1, borderRadius: T.radiusLg, overflow: 'hidden',
    borderWidth: 1, borderColor: T.hairlineStrong,
    padding: 16, minHeight: 118, justifyContent: 'space-between',
  },
  sheen: { ...StyleSheet.absoluteFillObject, width: 120, left: '25%' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { ...type.label, color: 'rgba(255,255,255,0.85)', fontSize: 10 },
  amount: { ...type.h2, color: '#FFFFFF', marginTop: 10, fontVariant: ['tabular-nums'] },
  sub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2, fontWeight: '600' },
});
