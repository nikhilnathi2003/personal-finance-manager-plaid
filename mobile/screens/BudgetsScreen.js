import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert,
} from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { api } from '../utils/api';
import { T, type, money } from '../theme';
import { CATEGORY_META } from '../utils/categories';
import GlassCard from '../components/GlassCard';
import ScreenHeader from '../components/ScreenHeader';
import CategoryIcon from '../components/CategoryIcon';
import CategoryPicker from '../components/CategoryPicker';

export default function BudgetsScreen() {
  const [budgets, setBudgets] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [categoryKey, setCategoryKey] = useState(null);
  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState('');
  const reduceMotion = useReducedMotion();

  const load = useCallback(async () => {
    try {
      const res = await api('/budgets');
      setBudgets(res.budgets);
    } catch (e) {
      Alert.alert('Could not load budgets', e.message);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const save = async () => {
    if (!category || !(Number(limit) > 0)) return;
    try {
      await api('/budgets', { method: 'POST', body: { category, monthly_limit: Number(limit) } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalOpen(false);
      setCategory(''); setCategoryKey(null); setLimit('');
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
      <ScreenHeader
        title="Budgets"
        subtitle="Set a monthly limit per category — the bar fills as you spend."
      />

      {budgets.map((b, i) => {
        const pct = Math.min(b.spent / b.monthly_limit, 1);
        const over = b.spent > b.monthly_limit;
        const near = !over && pct > 0.8;
        const color = over ? T.coral : near ? T.gold : T.mint;
        return (
          <Animated.View key={b.id} entering={reduceMotion ? undefined : FadeInDown.delay(i * 70).duration(400)}>
            <GlassCard style={{ marginBottom: 10 }}>
              <View style={styles.budgetTop}>
                <View style={styles.budgetHead}>
                  <CategoryIcon categoryKey={b.category} size={34} />
                  <Text style={styles.budgetName}>{b.category}</Text>
                </View>
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
                    ? `${money(b.spent - b.monthly_limit)} over`
                    : `${money(b.monthly_limit - b.spent)} left`}
                </Text>
              </View>
            </GlassCard>
          </Animated.View>
        );
      })}

      {budgets.length === 0 && (
        <GlassCard style={{ alignItems: 'center', paddingVertical: 30 }}>
          <Ionicons name="pie-chart-outline" size={28} color={T.faint} style={{ marginBottom: 10 }} />
          <Text style={{ color: T.text, fontWeight: '700', marginBottom: 4 }}>No budgets yet</Text>
          <Text style={{ color: T.muted, textAlign: 'center' }}>
            Add one for your biggest category — food is usually the honest place to start.
          </Text>
        </GlassCard>
      )}

      <TouchableOpacity style={styles.addButton} onPress={() => setModalOpen(true)}>
        <Text style={styles.addButtonText}>+ New budget</Text>
      </TouchableOpacity>

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New budget</Text>

            <Text style={styles.fieldLabel}>CATEGORY</Text>
            <TouchableOpacity style={styles.selector} onPress={() => setPickerOpen(true)} activeOpacity={0.8}>
              {categoryKey ? (
                <>
                  <View style={[styles.selIcon, { backgroundColor: CATEGORY_META[categoryKey].color + '22', borderColor: CATEGORY_META[categoryKey].color + '3A' }]}>
                    <Ionicons name={CATEGORY_META[categoryKey].icon} size={18} color={CATEGORY_META[categoryKey].color} />
                  </View>
                  <Text style={styles.selText}>{category}</Text>
                </>
              ) : (
                <Text style={[styles.selText, { color: T.muted }]}>Choose a category</Text>
              )}
              <Ionicons name="chevron-forward" size={18} color={T.muted} />
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>MONTHLY LIMIT</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 400"
              placeholderTextColor={T.faint}
              keyboardType="decimal-pad"
              value={limit}
              onChangeText={setLimit}
            />

            <TouchableOpacity
              style={[styles.saveButton, !(category && Number(limit) > 0) && { opacity: 0.5 }]}
              onPress={save}
              disabled={!(category && Number(limit) > 0)}
            >
              <Text style={styles.saveButtonText}>Save budget</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalOpen(false)} style={{ padding: 12 }}>
              <Text style={{ color: T.muted, textAlign: 'center' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <CategoryPicker
        visible={pickerOpen}
        current={categoryKey}
        title="Budget category"
        onSelect={(k) => { setCategoryKey(k); setCategory(CATEGORY_META[k].label); setPickerOpen(false); }}
        onClose={() => setPickerOpen(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.ink, padding: T.pad },
  budgetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  budgetHead: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  budgetName: { color: T.text, fontSize: 16, fontWeight: '700' },
  track: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  budgetBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  spentText: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  remainText: { color: T.muted, fontSize: 13, fontVariant: ['tabular-nums'] },
  addButton: {
    borderWidth: 1, borderColor: T.violet, borderRadius: T.radiusSm, borderStyle: 'dashed',
    padding: 16, alignItems: 'center', marginTop: 12,
  },
  addButtonText: { color: T.violet, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: T.elevated, borderTopLeftRadius: T.radiusXl, borderTopRightRadius: T.radiusXl,
    padding: 24, paddingBottom: 44, borderWidth: 1, borderColor: T.hairline,
  },
  modalTitle: { color: T.text, ...type.h2, marginBottom: 18 },
  fieldLabel: { color: T.faint, ...type.meta, letterSpacing: 1.5, marginBottom: 10 },
  selector: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18,
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderRadius: T.radiusSm, padding: 12,
  },
  selIcon: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  selText: { color: T.text, fontSize: 15, fontWeight: '700', flex: 1 },
  input: {
    backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: T.radiusSm, padding: 14,
    color: T.text, fontSize: 15, marginBottom: 18, borderWidth: 1, borderColor: T.hairline,
  },
  saveButton: { backgroundColor: T.violet, borderRadius: T.radiusSm, padding: 16, alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
});
