import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { T, money } from '../theme';

const SIZE = Math.min(Dimensions.get('window').width - 80, 280);
const CX = SIZE / 2;
const CY = SIZE / 2;

function arcPath(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const toXY = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  const [x1, y1] = toXY(rOuter, startAngle);
  const [x2, y2] = toXY(rOuter, endAngle);
  const [x3, y3] = toXY(rInner, endAngle);
  const [x4, y4] = toXY(rInner, startAngle);
  return `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4} Z`;
}

/**
 * Tap any slice to focus it — it grows outward and the center shows
 * that category's total. Tap again (or tap another) to move focus.
 */
export default function DonutChart({ spendingByCategory }) {
  const [selected, setSelected] = useState(null);

  const slices = useMemo(() => {
    const entries = Object.entries(spendingByCategory || {})
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, v]) => s + v, 0);
    if (!total) return { list: [], total: 0 };

    let angle = -Math.PI / 2;
    const gap = 0.035;
    const list = entries.map(([category, amount], i) => {
      const sweep = (amount / total) * Math.PI * 2 - gap;
      const slice = {
        category,
        amount,
        pct: Math.round((amount / total) * 100),
        color: T.chartColors[i % T.chartColors.length],
        start: angle,
        end: angle + Math.max(sweep, 0.02),
      };
      angle += sweep + gap;
      return slice;
    });
    return { list, total };
  }, [spendingByCategory]);

  if (!slices.list.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No spending yet this month</Text>
      </View>
    );
  }

  const focused = slices.list.find((s) => s.category === selected);

  return (
    <View style={styles.wrap}>
      <Svg width={SIZE} height={SIZE}>
        <G>
          {slices.list.map((s) => {
            const isSel = s.category === selected;
            return (
              <Path
                key={s.category}
                d={arcPath(CX, CY, isSel ? SIZE / 2 : SIZE / 2 - 8, SIZE / 2 - 40, s.start, s.end)}
                fill={s.color}
                opacity={selected && !isSel ? 0.35 : 1}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelected(isSel ? null : s.category);
                }}
              />
            );
          })}
        </G>
      </Svg>

      <View style={styles.center} pointerEvents="none">
        <Text style={styles.centerLabel} numberOfLines={1}>
          {focused ? focused.category : 'Total spent'}
        </Text>
        <Text style={styles.centerValue}>
          {money(focused ? focused.amount : slices.total)}
        </Text>
        {focused && <Text style={styles.centerPct}>{focused.pct}% of spending</Text>}
      </View>

      <View style={styles.legend}>
        {slices.list.slice(0, 6).map((s) => (
          <View key={s.category} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text style={styles.legendText} numberOfLines={1}>
              {s.category}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginVertical: 8 },
  center: { position: 'absolute', top: SIZE / 2 - 34, alignItems: 'center', width: SIZE - 100 },
  centerLabel: { color: T.muted, fontSize: 12, textTransform: 'capitalize' },
  centerValue: { color: T.text, fontSize: 24, fontWeight: '800', marginTop: 2 },
  centerPct: { color: T.violet, fontSize: 12, fontWeight: '600', marginTop: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 14, gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '45%' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: T.muted, fontSize: 12, textTransform: 'capitalize' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: T.muted, fontSize: 14 },
});
