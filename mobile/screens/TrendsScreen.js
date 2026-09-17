import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { api } from '../utils/api';
import { T, money } from '../theme';
import GlassCard from '../components/GlassCard';
import BarTrend from '../components/BarTrend';
import ScreenHeader from '../components/ScreenHeader';

export default function TrendsScreen() {
  const [months, setMonths] = useState([]);
  const [subs, setSubs] = useState(null);
  const [error, setError] = useState(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          setError(null);
          const [trends, subscriptions] = await Promise.all([
            api('/transactions/trends'),
            api('/transactions/subscriptions'),
          ]);
          setMonths(trends.months);
          setSubs(subscriptions);
        } catch (e) {
          setError(e.message);
        }
      })();
    }, [])
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <ScreenHeader title="Trends" subtitle="How your money moved over recent months." />
      {error && <Text style={styles.error}>{error}</Text>}

      <Animated.View entering={FadeInDown.duration(500)}>
        <Text style={styles.sectionTitle}>Income vs spending</Text>
        <GlassCard>
          <BarTrend months={months} />
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: T.mint }]} />
              <Text style={styles.legendText}>Money in</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: T.coral }]} />
              <Text style={styles.legendText}>Money out</Text>
            </View>
          </View>
        </GlassCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(150).duration(500)}>
        <Text style={styles.sectionTitle}>Subscriptions we spotted</Text>
        <Text style={styles.sectionSub}>
          Same merchant, similar amount, roughly every month — the quiet stuff that adds up.
        </Text>

        {subs?.subscriptions?.length ? (
          <>
            <GlassCard style={styles.totalCard}>
              <Ionicons name="repeat" size={20} color={T.gold} />
              <Text style={styles.totalText}>
                ~{money(subs.monthlyTotal)}/month in recurring charges
              </Text>
            </GlassCard>
            {subs.subscriptions.map((s, i) => (
              <Animated.View
                key={s.name + i}
                entering={FadeInDown.delay(200 + i * 60).duration(400)}
                style={styles.subRow}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.subName} numberOfLines={1}>{s.name}</Text>
                  <Text style={styles.subMeta}>
                    seen {s.occurrences}× · last on {s.lastCharged}
                  </Text>
                </View>
                <Text style={styles.subAmount}>{money(s.amount)}/mo</Text>
              </Animated.View>
            ))}
          </>
        ) : (
          <GlassCard>
            <Text style={{ color: T.muted, textAlign: 'center' }}>
              No recurring charges detected yet — they show up once there's about two months of
              synced history.
            </Text>
          </GlassCard>
        )}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.ink, padding: T.pad },
  screenTitle: { color: T.text, fontSize: 26, fontWeight: '800', marginTop: 40, marginBottom: 8 },
  error: { color: T.coral, marginBottom: 10 },
  sectionTitle: { color: T.text, fontSize: 18, fontWeight: '700', marginTop: 18, marginBottom: 6 },
  sectionSub: { color: T.muted, fontSize: 13, marginBottom: 12, lineHeight: 19 },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: T.muted, fontSize: 12 },
  totalCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  totalText: { color: T.gold, fontWeight: '700', fontSize: 14 },
  subRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.surface, borderRadius: T.radiusSm,
    borderWidth: 1, borderColor: T.hairline, padding: 14, marginBottom: 8,
  },
  subName: { color: T.text, fontSize: 15, fontWeight: '600' },
  subMeta: { color: T.muted, fontSize: 12, marginTop: 2 },
  subAmount: { color: T.text, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
