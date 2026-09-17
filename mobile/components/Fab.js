import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { T, elevation } from '../theme';
import PressableScale from './PressableScale';

/**
 * Floating action button — the primary action on a screen (add a
 * cash entry). Sits above the tab bar, bottom-right.
 */
export default function Fab({ onPress, icon = 'add', label }) {
  return (
    <PressableScale onPress={onPress} style={styles.wrap} scaleTo={0.9}>
      <LinearGradient
        colors={['#8E6BFF', '#6D3BF5']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.fab, elevation.glow('#6D3BF5'), label ? styles.pill : null]}
      >
        <Ionicons name={icon} size={24} color="#fff" />
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </LinearGradient>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 20, bottom: 26 },
  fab: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  pill: { width: undefined, paddingHorizontal: 20, gap: 8 },
  label: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
