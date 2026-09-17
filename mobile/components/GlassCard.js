import React from 'react';
import { StyleSheet, View } from 'react-native';
import { T } from '../theme';

export default function GlassCard({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: T.radius,
    borderWidth: 1,
    borderColor: T.hairline,
    padding: 18,
  },
});
