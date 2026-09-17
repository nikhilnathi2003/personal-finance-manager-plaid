import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { categoryMeta } from '../utils/categories';

/**
 * Rounded icon badge for a category — the icon in its own accent color
 * over a soft tint of that same color. Keeps the whole app's category
 * visuals identical everywhere (feed rows, donut legend, budgets).
 */
export default function CategoryIcon({ categoryKey, size = 42, iconSize }) {
  const m = categoryMeta(categoryKey);
  const r = iconSize || Math.round(size * 0.5);
  return (
    <View
      style={[
        styles.badge,
        {
          width: size, height: size, borderRadius: size * 0.32,
          backgroundColor: m.color + '22',       // ~13% tint
          borderColor: m.color + '3A',
        },
      ]}
    >
      <Ionicons name={m.icon} size={r} color={m.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
