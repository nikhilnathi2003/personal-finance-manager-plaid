import React from 'react';
import {
  Modal, View, Text, StyleSheet, Pressable, ScrollView, TouchableOpacity,
} from 'react-native';
import Animated, { SlideInDown, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { T, type } from '../theme';
import {
  CATEGORY_META, INCOME_KEYS, EXPENSE_KEYS, INTERAC_KEYS, TRANSFER_KEYS,
} from '../utils/categories';

function Chip({ ck, active, onPress }) {
  const m = CATEGORY_META[ck];
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        { borderColor: active ? m.color : T.hairline, backgroundColor: active ? m.color + '22' : T.surface },
      ]}
      activeOpacity={0.8}
      onPress={() => { Haptics.selectionAsync(); onPress(ck); }}
    >
      <View style={[styles.chipIcon, { backgroundColor: m.color + '22' }]}>
        <Ionicons name={m.icon} size={16} color={m.color} />
      </View>
      <Text style={[styles.chipText, active && { color: T.text }]} numberOfLines={1}>{m.label}</Text>
      {active && <Ionicons name="checkmark-circle" size={16} color={m.color} />}
    </TouchableOpacity>
  );
}

/**
 * Slide-up sheet for choosing a category. Used to correct a
 * transaction's category and to tag a manual entry.
 */
export default function CategoryPicker({
  visible, current, onSelect, onClose, onDelete, title = 'Choose a category',
}) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(180)} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <View style={styles.wrap} pointerEvents="box-none">
        <Animated.View entering={SlideInDown.springify().damping(20).stiffness(220)} style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.head}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={T.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            <Text style={styles.group}>INCOME</Text>
            <View style={styles.grid}>
              {INCOME_KEYS.map((ck) => (
                <Chip key={ck} ck={ck} active={ck === current} onPress={onSelect} />
              ))}
            </View>
            <Text style={styles.group}>SPENDING</Text>
            <View style={styles.grid}>
              {EXPENSE_KEYS.map((ck) => (
                <Chip key={ck} ck={ck} active={ck === current} onPress={onSelect} />
              ))}
            </View>
            <Text style={styles.group}>INTERAC E-TRANSFER</Text>
            <View style={styles.grid}>
              {INTERAC_KEYS.map((ck) => (
                <Chip key={ck} ck={ck} active={ck === current} onPress={onSelect} />
              ))}
            </View>
            <Text style={styles.group}>MOVING MY OWN MONEY (not counted)</Text>
            <View style={styles.grid}>
              {TRANSFER_KEYS.map((ck) => (
                <Chip key={ck} ck={ck} active={ck === current} onPress={onSelect} />
              ))}
            </View>

            {onDelete && (
              <TouchableOpacity style={styles.delete} onPress={onDelete}>
                <Ionicons name="trash-outline" size={17} color={T.coral} />
                <Text style={styles.deleteText}>Delete this entry</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2,4,10,0.7)' },
  wrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: T.elevated, borderTopLeftRadius: T.radiusXl, borderTopRightRadius: T.radiusXl,
    borderWidth: 1, borderColor: T.hairline, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 28,
    maxHeight: '82%',
  },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: T.hairlineStrong, marginBottom: 12 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { color: T.text, ...type.title },
  group: { color: T.faint, ...type.meta, letterSpacing: 1.5, marginTop: 10, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1,
    borderRadius: T.pill, paddingVertical: 8, paddingHorizontal: 10, paddingRight: 12,
  },
  chipIcon: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  chipText: { color: T.muted, fontSize: 13, fontWeight: '600', maxWidth: 130 },
  delete: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 22, paddingVertical: 14, borderRadius: T.radiusSm,
    borderWidth: 1, borderColor: T.coral + '55', backgroundColor: T.coral + '14',
  },
  deleteText: { color: T.coral, fontWeight: '700', fontSize: 14 },
});
