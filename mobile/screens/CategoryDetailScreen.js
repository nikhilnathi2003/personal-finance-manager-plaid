import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../utils/api';
import { T, type, money } from '../theme';
import { categoryMeta } from '../utils/categories';
import CategoryIcon from '../components/CategoryIcon';
import CategoryPicker from '../components/CategoryPicker';

export default function CategoryDetailScreen({ route, navigation }) {
  const { category, categoryKey, transactions: initial } = route.params;
  const [rows, setRows] = useState(initial || []);
  const [selected, setSelected] = useState(null); // transaction being edited
  const reduceMotion = useReducedMotion();

  const meta = categoryMeta(categoryKey);
  const total = rows.reduce((s, t) => s + Math.abs(t.amount), 0);

  const recategorize = async (newKey) => {
    const tx = selected;
    setSelected(null);
    if (!tx || newKey === (tx.category_key || categoryKey)) return;
    setRows((r) => r.filter((x) => x.id !== tx.id)); // leaves this category
    try {
      await api(`/transactions/${tx.id}/category`, { method: 'POST', body: { categoryKey: newKey } });
    } catch (e) {
      setRows((r) => [tx, ...r]); // put it back on failure
    }
  };

  const remove = async () => {
    const tx = selected;
    setSelected(null);
    if (!tx) return;
    setRows((r) => r.filter((x) => x.id !== tx.id));
    try {
      await api(`/transactions/manual/${tx.id}`, { method: 'DELETE' });
    } catch (e) {
      setRows((r) => [tx, ...r]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={T.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{category}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.summary}>
          <View style={[styles.bigIcon, { backgroundColor: meta.color + '22', borderColor: meta.color + '3A' }]}>
            <Ionicons name={meta.icon} size={30} color={meta.color} />
          </View>
          <Text style={styles.total}>{money(total)}</Text>
          <Text style={styles.count}>{rows.length} {rows.length === 1 ? 'transaction' : 'transactions'}</Text>
        </View>

        <Text style={styles.tapHint}>Tap a transaction to change its category.</Text>

        {rows.map((item, index) => (
          <Animated.View
            key={item.id}
            entering={reduceMotion ? undefined : FadeInDown.delay(Math.min(index * 26, 400)).duration(360)}
          >
            <TouchableOpacity style={styles.txRow} activeOpacity={0.7} onPress={() => setSelected(item)}>
              <CategoryIcon categoryKey={item.category_key || item.category} size={42} />
              <View style={styles.txLeft}>
                <Text style={styles.txName} numberOfLines={1}>
                  {item.merchant_name || item.description}
                  {item.source === 'manual' && <Text style={styles.cashTag}>  · cash</Text>}
                </Text>
                <Text style={styles.txDate}>{item.date}</Text>
              </View>
              <Text style={[styles.txAmount, item.is_income && { color: T.mint }]}>
                {item.is_income ? '+' : '−'}{money(item.amount)}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ))}

        {rows.length === 0 && (
          <Text style={styles.empty}>Nothing left in this category.</Text>
        )}
      </ScrollView>

      <CategoryPicker
        visible={!!selected}
        current={selected?.category_key}
        title="Change category"
        onSelect={recategorize}
        onClose={() => setSelected(null)}
        onDelete={selected?.source === 'manual' ? remove : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.ink, paddingHorizontal: T.pad, paddingTop: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 10 },
  headerTitle: { color: T.text, ...type.title },

  summary: { alignItems: 'center', marginTop: 12, marginBottom: 6 },
  bigIcon: { width: 68, height: 68, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  total: { color: T.text, ...type.h1, marginTop: 14, fontVariant: ['tabular-nums'] },
  count: { color: T.muted, fontSize: 13, fontWeight: '600', marginTop: 2 },
  tapHint: { color: T.faint, fontSize: 12, textAlign: 'center', marginTop: 16, marginBottom: 14 },

  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: T.surface, borderRadius: T.radiusSm,
    borderWidth: 1, borderColor: T.hairline, padding: 12, marginBottom: 8,
  },
  txLeft: { flex: 1 },
  txName: { color: T.text, fontSize: 15, fontWeight: '600' },
  cashTag: { color: T.gold, fontSize: 12, fontWeight: '700' },
  txDate: { color: T.muted, fontSize: 12, marginTop: 2 },
  txAmount: { color: T.coral, fontWeight: '700', fontSize: 15, fontVariant: ['tabular-nums'] },
  empty: { color: T.muted, textAlign: 'center', marginTop: 30 },
});
