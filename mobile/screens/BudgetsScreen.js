import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { api } from '../utils/api';
import { T, money } from '../theme';
import GlassCard from '../components/GlassCard';

export default function BudgetsScreen() {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api('/budgets');
      setBudgets(res.budgets);
      setCategories(res.categories);
    } catch (e) {
      Alert.alert('Could not load budgets', e.message);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const save = async () => {
    try {
      await api('/budgets', { method: 'POST', body: { category, monthly_limit: Number(limit) } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalOpen(false);
      setCategory('');
      setLimit('');
      load();
    } catch (e) {
      Alert.alert('Could not save', e.message);
    }
  };

  const remove = (b) => {
    Alert.alert('Remove budget?', `Stop tracking a limit for "${b.category}"?`, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => { await api(`/budgets/${b.id}`, { method: 'DELETE' }); load(); },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.screenTitle}>Budgets</Text>
      <Text style={styles.sub}>Set a monthly limit per category — the bar fills as you spend.</Text>

      {budgets.map((b, i) => {
        const pct = Math.min(b.spent / b.monthly_limit, 1);
        const over = b.spent > b.monthly_limit;
        const near = !over && pct > 0.8;
        const color = over ? T.coral : near ? T.gold : T.mint;
        return (
          <Animated.View key={b.id} entering={FadeInDown.delay(i * 70).duration(400)}>
            <GlassCard style={{ marginBottom: 10 }}>
              <View style={styles.budgetTop}>
                <Text style={styles.budgetName}>{b.category}</Text>
                <TouchableOpacity onPress={() => remove(b)} hitSlop={10}>
                  <Ionicons name="trash-outline" size={17} color={T.faint} />
                </TouchableOpacity>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
              </View>
              <View style={styles.budgetBottom}>
                <Text style={[styles.spentText, { color }]}>
                  {money(b.spent)} of {money(b.monthly_limit)}
                </Text>
                <Text style={styles.remainText}>
                  {over
                    ? `${money(b.spent - b.monthly_limit)} over 😬`
                    : `${money(b.monthly_limit - b.spent)} left`}
                </Text>
              </View>
            </GlassCard>
          </Animated.View>
        );
      })}

      {budgets.length === 0 && (
        <GlassCard style={{ alignItems: 'center', paddingVertical: 30 }}>
          <Text style={{ color: T.muted, textAlign: 'center' }}>
            No budgets yet. Add one for your biggest category — food is usually the honest place
            to start.
          </Text>
        </GlassCard>
      )}

      <TouchableOpacity style={styles.addButton} onPress={() => setModalOpen(true)}>
        <Text style={styles.addButtonText}>+ New budget</Text>
      </TouchableOpacity>

      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New budget</Text>

            {categories.length > 0 && (
              <View style={styles.chipsWrap}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.chip, category === c && styles.chipActive]}
                    onPress={() => setCategory(c)}
                  >
                    <Text style={[styles.chipText, category === c && styles.chipTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TextInput
              style={styles.input}
              placeholder="Category (or pick one above)"
              placeholderTextColor={T.faint}
              value={category}
              onChangeText={setCategory}
            />
            <TextInput
              style={styles.input}
              placeholder="Monthly limit, e.g. 400"
              placeholderTextColor={T.faint}
              keyboardType="decimal-pad"
              value={limit}
              onChangeText={setLimit}
            />

            <TouchableOpacity style={styles.saveButton} onPress={save}>
              <Text style={styles.saveButtonText}>Save budget</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalOpen(false)} style={{ padding: 12 }}>
              <Text style={{ color: T.muted, textAlign: 'center' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.ink, padding: T.pad },
  screenTitle: { color: T.text, fontSize: 26, fontWeight: '800', marginTop: 40 },
  sub: { color: T.muted, fontSize: 13, marginTop: 6, marginBottom: 18, lineHeight: 19 },
  budgetTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  budgetName: { color: T.text, fontSize: 16, fontWeight: '700', textTransform: 'capitalize' },
  track: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  budgetBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  spentText: { fontSize: 13, fontWeight: '700' },
  remainText: { color: T.muted, fontSize: 13 },
  addButton: {
    borderWidth: 1, borderColor: T.violet, borderRadius: T.radiusSm, borderStyle: 'dashed',
    padding: 16, alignItems: 'center', marginTop: 12,
  },
  addButtonText: { color: T.violet, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: T.surfaceSolid, borderTopLeftRadius: 26, borderTopRightRadius: 26,
    padding: 24, paddingBottom: 44,
  },
  modalTitle: { color: T.text, fontSize: 20, fontWeight: '800', marginBottom: 16 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  chipActive: { backgroundColor: T.violet },
  chipText: { color: T.muted, fontSize: 13, textTransform: 'capitalize' },
  chipTextActive: { color: '#FFF', fontWeight: '700' },
  input: {
    backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: T.radiusSm, padding: 14,
    color: T.text, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: T.hairline,
  },
  saveButton: { backgroundColor: T.violet, borderRadius: T.radiusSm, padding: 16, alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
});
