import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { T } from '../theme';

// 'YYYY-MM' helpers
const now = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const shift = (key, delta) => {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
const label = (key) => {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  const name = d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  return y === new Date().getFullYear() ? name : `${name} ${y}`;
};

/**
 * ‹ September › month stepper. Can't step past the current month.
 */
export default function MonthSwitcher({ month, onChange }) {
  const current = month || now();
  const atCurrent = current >= now();

  const step = (delta) => {
    if (delta > 0 && atCurrent) return;
    Haptics.selectionAsync();
    onChange(shift(current, delta));
  };

  return (
    <View style={styles.row}>
      <TouchableOpacity onPress={() => step(-1)} hitSlop={10} style={styles.btn}>
        <Ionicons name="chevron-back" size={18} color={T.text} />
      </TouchableOpacity>
      <Text style={styles.label}>{label(current)}</Text>
      <TouchableOpacity onPress={() => step(1)} hitSlop={10} style={[styles.btn, atCurrent && styles.disabled]}>
        <Ionicons name="chevron-forward" size={18} color={atCurrent ? T.faint : T.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
    borderRadius: T.pill, paddingHorizontal: 6, paddingVertical: 5,
  },
  btn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
  label: { color: T.text, fontSize: 14, fontWeight: '700', minWidth: 92, textAlign: 'center' },
});
