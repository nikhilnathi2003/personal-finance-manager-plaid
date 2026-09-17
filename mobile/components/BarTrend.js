import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { T, money } from '../theme';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CHART_HEIGHT = 150;

/** Income vs spending, month by month. Tap a month for exact numbers. */
export default function BarTrend({ months }) {
  const [selected, setSelected] = useState(months?.length ? months.length - 1 : null);

  if (!months?.length) {
    return <Text style={styles.emptyText}>Sync a bank account to see your trend</Text>;
  }

  const max = Math.max(...months.map((m) => Math.max(m.income, m.spending)), 1);
  const sel = months[selected];

  return (
    <View>
      {sel && (
        <View style={styles.readout}>
          <Text style={styles.readoutMonth}>
            {MONTH_NAMES[Number(sel.month.slice(5, 7)) - 1]} {sel.month.slice(0, 4)}
          </Text>
          <View style={styles.readoutRow}>
            <Text style={[styles.readoutValue, { color: T.mint }]}>↓ {money(sel.income)} in</Text>
            <Text style={[styles.readoutValue, { color: T.coral }]}>↑ {money(sel.spending)} out</Text>
          </View>
        </View>
      )}

      <View style={styles.chart}>
        {months.map((m, i) => (
          <Pressable
            key={m.month}
            style={styles.monthCol}
            onPress={() => {
              Haptics.selectionAsync();
              setSelected(i);
            }}
          >
            <View style={styles.bars}>
              <Animated.View
                entering={FadeInUp.delay(i * 80).duration(500)}
                style={[
                  styles.bar,
                  {
                    height: Math.max((m.income / max) * CHART_HEIGHT, 3),
                    backgroundColor: T.mint,
                    opacity: selected === i ? 1 : 0.45,
                  },
                ]}
              />
              <Animated.View
                entering={FadeInUp.delay(i * 80 + 40).duration(500)}
                style={[
                  styles.bar,
                  {
                    height: Math.max((m.spending / max) * CHART_HEIGHT, 3),
                    backgroundColor: T.coral,
                    opacity: selected === i ? 1 : 0.45,
                  },
                ]}
              />
            </View>
            <Text style={[styles.monthLabel, selected === i && { color: T.text }]}>
              {MONTH_NAMES[Number(m.month.slice(5, 7)) - 1]}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { alignItems: 'center', marginBottom: 14 },
  readoutMonth: { color: T.text, fontSize: 15, fontWeight: '700' },
  readoutRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  readoutValue: { fontSize: 13, fontWeight: '600' },
  chart: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  monthCol: { alignItems: 'center', flex: 1 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: CHART_HEIGHT },
  bar: { width: 12, borderRadius: 5 },
  monthLabel: { color: T.faint, fontSize: 11, marginTop: 8, fontWeight: '600' },
  emptyText: { color: T.muted, textAlign: 'center', padding: 30 },
});
