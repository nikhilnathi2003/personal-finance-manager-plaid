import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { api } from '../utils/api';
import { T, type } from '../theme';
import { CATEGORY_META } from '../utils/categories';
import CategoryPicker from '../components/CategoryPicker';

const iso = (d) => d.toISOString().split('T')[0];
const today = iso(new Date());
const yesterday = iso(new Date(Date.now() - 86400000));

export default function AddTransactionScreen({ navigation }) {
  const [amount, setAmount] = useState('');
  const [categoryKey, setCategoryKey] = useState('groceries');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(today);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const meta = CATEGORY_META[categoryKey];
  const isIncome = meta.flow === 'income';
  const valid = Number(amount) > 0;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await api('/transactions/manual', {
        method: 'POST',
        body: { amount: Number(amount), categoryKey, description: note.trim(), date },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="close" size={26} color={T.muted} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add cash entry</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>For money the bank never sees — cash spent or received.</Text>

        {/* Amount */}
        <View style={styles.amountWrap}>
          <Text style={[styles.currency, isIncome && { color: T.mint }]}>$</Text>
          <TextInput
            style={[styles.amountInput, isIncome && { color: T.mint }]}
            value={amount}
            onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
            placeholder="0"
            placeholderTextColor={T.faint}
            keyboardType="decimal-pad"
            autoFocus
          />
        </View>
        <Text style={styles.flowTag}>
          {isIncome ? 'Income' : 'Expense'} · {meta.label}
        </Text>

        {/* Category */}
        <Text style={styles.label}>CATEGORY</Text>
        <TouchableOpacity style={styles.selector} onPress={() => setPickerOpen(true)} activeOpacity={0.8}>
          <View style={[styles.selIcon, { backgroundColor: meta.color + '22', borderColor: meta.color + '3A' }]}>
            <Ionicons name={meta.icon} size={20} color={meta.color} />
          </View>
          <Text style={styles.selText}>{meta.label}</Text>
          <Ionicons name="chevron-forward" size={18} color={T.muted} />
        </TouchableOpacity>

        {/* Note */}
        <Text style={styles.label}>NOTE (OPTIONAL)</Text>
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Lunch with Sam"
          placeholderTextColor={T.faint}
        />

        {/* Date */}
        <Text style={styles.label}>WHEN</Text>
        <View style={styles.dateRow}>
          {[['Today', today], ['Yesterday', yesterday]].map(([lbl, val]) => (
            <TouchableOpacity
              key={val}
              style={[styles.dateChip, date === val && styles.dateChipOn]}
              onPress={() => { Haptics.selectionAsync(); setDate(val); }}
            >
              <Text style={[styles.dateChipText, date === val && { color: T.text }]}>{lbl}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.save, !valid && styles.saveOff]}
          onPress={save}
          disabled={!valid || saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveText}>Add {isIncome ? 'income' : 'expense'}</Text>}
        </TouchableOpacity>
      </ScrollView>

      <CategoryPicker
        visible={pickerOpen}
        current={categoryKey}
        title="Category"
        onSelect={(k) => { setCategoryKey(k); setPickerOpen(false); }}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.ink, paddingHorizontal: T.pad, paddingTop: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 8 },
  headerTitle: { color: T.text, ...type.title },
  hint: { color: T.muted, fontSize: 13, textAlign: 'center', marginBottom: 20 },

  amountWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  currency: { color: T.text, fontSize: 40, fontWeight: '800', marginRight: 2 },
  amountInput: {
    color: T.text, fontSize: 64, fontWeight: '800', minWidth: 120, textAlign: 'center',
    fontVariant: ['tabular-nums'], padding: 0,
  },
  flowTag: { color: T.muted, textAlign: 'center', fontWeight: '600', marginTop: 4, marginBottom: 12 },

  label: { color: T.faint, ...type.meta, letterSpacing: 1.5, marginTop: 20, marginBottom: 10 },
  selector: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderRadius: T.radiusSm, padding: 12,
  },
  selIcon: { width: 40, height: 40, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  selText: { color: T.text, fontSize: 16, fontWeight: '700', flex: 1 },

  noteInput: {
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline, borderRadius: T.radiusSm,
    padding: 14, color: T.text, fontSize: 15,
  },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateChip: {
    paddingHorizontal: 18, paddingVertical: 11, borderRadius: T.pill,
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.hairline,
  },
  dateChipOn: { borderColor: T.violet, backgroundColor: T.violetDim },
  dateChipText: { color: T.muted, fontWeight: '700', fontSize: 13 },

  error: { color: T.coral, marginTop: 16, textAlign: 'center', fontSize: 13 },
  save: {
    backgroundColor: T.violet, borderRadius: T.radius, paddingVertical: 16,
    alignItems: 'center', marginTop: 28,
  },
  saveOff: { backgroundColor: T.surface2 },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
