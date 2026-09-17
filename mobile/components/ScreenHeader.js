import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { T, type } from '../theme';

/**
 * Consistent screen header used across the tab screens — a large
 * title, optional subtitle, and an optional right-side action.
 */
export default function ScreenHeader({ title, subtitle, onClose, right }) {
  const reduceMotion = useReducedMotion();
  const entering = reduceMotion ? undefined : FadeInDown.duration(420);
  return (
    <Animated.View entering={entering}>
      <View style={styles.row}>
        <Text style={styles.title}>{title}</Text>
        {onClose ? (
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={26} color={T.muted} />
          </TouchableOpacity>
        ) : right || null}
      </View>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 44, marginBottom: 4,
  },
  title: { color: T.text, ...type.h1 },
  sub: { color: T.muted, fontSize: 13, marginTop: 6, marginBottom: 16, lineHeight: 19 },
});
