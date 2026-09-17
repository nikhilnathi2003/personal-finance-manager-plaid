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
import ProgressRing from '../components/ProgressRing';
import ScreenHeader from '../components/ScreenHeader';

export default function GoalsScreen() {
  const [goals, setGoals] = useState([]);
  const [modal, setModal] = useState(null); // null | 'new' | goal object (add money)
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [amount, setAmount] = useState('');

  const load = useCallback(async () => {
    try {
      setGoals((await api('/goals')).goals);
    } catch (e) {
      Alert.alert('Could not load goals', e.message);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const createGoal = async () => {
    try {
      await api('/goals', {
        method: 'POST',
        body: { name, emoji, target_amount: Number(amount) },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeModal();
      load();
    } catch (e) {
      Alert.alert('Could not create goal', e.message);
    }
  };

  const addMoney = async () => {
    try {
      const updated = await api(`/goals/${modal.id}/add`, {
        method: 'POST',
        body: { amount: Number(amount) },
      });
      if (updated.saved_amount >= updated.target_amount) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('🎉 Goal reached!', `"${updated.name}" is fully funded. Huge.`);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      closeModal();
      load();
    } catch (e) {
      Alert.alert('Could not update', e.message);
    }
  };

  const removeGoal = (g) => {
    Alert.alert('Delete goal?', `Remove "${g.name}"? This can't be undone.`, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => { await api(`/goals/${g.id}`, { method: 'DELETE' }); load(); },
      },
    ]);
  };

  const closeModal = () => {
    setModal(null);
    setName('');
    setEmoji('🎯');
    setAmount('');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <ScreenHeader
        title="Goals"
        subtitle="Track money you've set aside. The app never moves money — you save it, we count it."
      />

      {goals.map((g, i) => {
        const progress = g.saved_amount / g.target_amount;
        const done = progress >= 1;
        return (
          <Animated.View key={g.id} entering={FadeInDown.delay(i * 80).duration(400)}>
            <GlassCard style={styles.goalCard}>
              <ProgressRing
                progress={progress}
                color={done ? T.gold : T.mint}
                label={`${Math.min(Math.round(progress * 100), 100)}%`}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.goalName}>
                  {g.emoji} {g.name} {done ? '· done!' : ''}
                </Text>
                <Text style={styles.goalNumbers}>
                  {money(g.saved_amount)} of {money(g.target_amount)}
                </Text>
                {!done && (
                  <TouchableOpacity onPress={() => setModal(g)}>
                    <Text style={styles.addMoney}>+ Log money saved</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity onPress={() => removeGoal(g)} hitSlop={10}>
                <Ionicons name="trash-outline" size={17} color={T.faint} />
              </TouchableOpacity>
            </GlassCard>
          </Animated.View>
        );
      })}

      {goals.length === 0 && (
        <GlassCard style={{ alignItems: 'center', paddingVertical: 30 }}>
          <Text style={{ color: T.muted, textAlign: 'center' }}>
            No goals yet. An emergency fund is the classic first one.
          </Text>
        </GlassCard>
      )}

      <TouchableOpacity style={styles.addButton} onPress={() => setModal('new')}>
        <Text style={styles.addButtonText}>+ New goal</Text>
      </TouchableOpacity>

      <Modal visible={!!modal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {modal === 'new' ? (
              <>
                <Text style={styles.modalTitle}>New goal</Text>
                <View style={styles.emojiRow}>
                  {['🎯', '🏝️', '🚗', '🏠', '💻', '🛟', '💍', '🎓'].map((e) => (
                    <TouchableOpacity
                      key={e}
                      style={[styles.emojiChip, emoji === e && styles.emojiChipActive]}
                      onPress={() => setEmoji(e)}
                    >
                      <Text style={{ fontSize: 20 }}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.input} placeholder="Name, e.g. Emergency fund"
                  placeholderTextColor={T.faint} value={name} onChangeText={setName}
                />
                <TextInput
                  style={styles.input} placeholder="Target amount, e.g. 1000"
                  placeholderTextColor={T.faint} keyboardType="decimal-pad"
                  value={amount} onChangeText={setAmount}
                />
                <TouchableOpacity style={styles.saveButton} onPress={createGoal}>
                  <Text style={styles.saveButtonText}>Create goal</Text>
                </TouchableOpacity>
              </>
            ) : modal ? (
              <>
                <Text style={styles.modalTitle}>
                  {modal.emoji} {modal.name}
                </Text>
                <Text style={{ color: T.muted, marginBottom: 14 }}>
                  How much did you set aside?
                </Text>
                <TextInput
                  style={styles.input} placeholder="Amount, e.g. 50"
                  placeholderTextColor={T.faint} keyboardType="decimal-pad"
                  value={amount} onChangeText={setAmount} autoFocus
                />
                <TouchableOpacity style={styles.saveButton} onPress={addMoney}>
                  <Text style={styles.saveButtonText}>Log it</Text>
                </TouchableOpacity>
              </>
            ) : null}
            <TouchableOpacity onPress={closeModal} style={{ padding: 12 }}>
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
  goalCard: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 10 },
  goalName: { color: T.text, fontSize: 16, fontWeight: '700' },
  goalNumbers: { color: T.muted, fontSize: 13, marginTop: 3 },
  addMoney: { color: T.violet, fontSize: 13, fontWeight: '700', marginTop: 8 },
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
  modalTitle: { color: T.text, fontSize: 20, fontWeight: '800', marginBottom: 14 },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  emojiChip: {
    width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  emojiChipActive: { backgroundColor: T.violet },
  input: {
    backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: T.radiusSm, padding: 14,
    color: T.text, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: T.hairline,
  },
  saveButton: { backgroundColor: T.violet, borderRadius: T.radiusSm, padding: 16, alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
});
