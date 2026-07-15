import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, TextInput,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { api } from '../utils/api';
import { T, money } from '../theme';
import TiltCard from '../components/TiltCard';
import GlassCard from '../components/GlassCard';
import AnimatedNumber from '../components/AnimatedNumber';
import DonutChart from '../components/DonutChart';

export default function HomeScreen({ navigation }) {
  const [dashboard, setDashboard] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const loadDashboard = useCallback(async () => {
    try {
      setError(null);
      setDashboard(await api('/transactions/dashboard'));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadDashboard(); }, [loadDashboard]));

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await api('/transactions/sync-now', { method: 'POST' });
      await loadDashboard();
    } catch (e) {
      setError(e.message);
    }
    setRefreshing(false);
  };

  const leftover = dashboard?.leftover || 0;
  const transactions = (dashboard?.transactions || []).filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (t.merchant_name || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.category || '').toLowerCase().includes(q)
    );
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.violet} />
      }
    >
      <View style={styles.topRow}>
        <Text style={styles.screenTitle}>This month</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Accounts')} hitSlop={12}>
          <Ionicons name="person-circle-outline" size={30} color={T.muted} />
        </TouchableOpacity>
      </View>

      {error && (
        <GlassCard style={{ marginBottom: 16, borderColor: T.coral }}>
          <Text style={{ color: T.coral, fontSize: 13 }}>
            Couldn't reach the server — {error}. Pull down to retry.
          </Text>
        </GlassCard>
      )}

      {/* The holographic card — hold and tilt it */}
      <Animated.View entering={FadeInDown.duration(500)}>
        <TiltCard>
          <Text style={styles.cardLabel}>LEFT OVER SO FAR</Text>
          <AnimatedNumber
            value={Math.abs(leftover)}
            prefix={leftover < 0 ? '-$' : '$'}
            style={styles.cardAmount}
          />
          <View style={styles.cardChips}>
            <View style={styles.chip}>
              <Ionicons name="arrow-down-circle" size={15} color={T.mint} />
              <Text style={styles.chipText}>{money(dashboard?.income)} in</Text>
            </View>
            <View style={styles.chip}>
              <Ionicons name="arrow-up-circle" size={15} color={T.coral} />
              <Text style={styles.chipText}>{money(dashboard?.spending)} out</Text>
            </View>
          </View>
        </TiltCard>
        <Text style={styles.tiltHint}>hold the card and tilt it ↑</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(500)}>
        <Text style={styles.sectionTitle}>Where it went</Text>
        <GlassCard>
          <DonutChart spendingByCategory={dashboard?.spendingByCategory} />
        </GlassCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(500)}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Transactions</Text>
        </View>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={T.faint} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search merchant or category…"
            placeholderTextColor={T.faint}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </Animated.View>

      {transactions.slice(0, 25).map((item, index) => (
        <Animated.View
          key={item.id}
          entering={FadeInDown.delay(Math.min(250 + index * 25, 600)).duration(400)}
          style={styles.txRow}
        >
          <View style={styles.txLeft}>
            <Text style={styles.txName} numberOfLines={1}>
              {item.merchant_name || item.description}
            </Text>
            <Text style={styles.txCategory}>
              {item.category} · {item.date}
            </Text>
          </View>
          <Text style={[styles.txAmount, item.is_income && styles.txIncome]}>
            {item.is_income ? '+' : '−'}{money(item.amount)}
          </Text>
        </Animated.View>
      ))}

      {transactions.length === 0 && !error && (
        <GlassCard style={{ alignItems: 'center' }}>
          <Text style={{ color: T.muted, marginBottom: 12 }}>
            {search ? 'No transactions match that search.' : 'Nothing here yet.'}
          </Text>
          {!search && (
            <TouchableOpacity onPress={() => navigation.navigate('ConnectBank')}>
              <Text style={{ color: T.violet, fontWeight: '700' }}>Link a bank account →</Text>
            </TouchableOpacity>
          )}
        </GlassCard>
      )}

      <TouchableOpacity
        style={styles.addBankButton}
        onPress={() => navigation.navigate('ConnectBank')}
      >
        <Text style={styles.addBankText}>+ Link another bank account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.ink, padding: T.pad },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 40, marginBottom: 16,
  },
  screenTitle: { color: T.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  cardLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  cardAmount: { fontSize: 44, marginTop: 6, color: '#FFFFFF' },
  cardChips: { flexDirection: 'row', gap: 10, marginTop: 18 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.28)', borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  chipText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  tiltHint: { color: T.faint, fontSize: 11, textAlign: 'center', marginTop: 8, marginBottom: 4 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: T.text, fontSize: 18, fontWeight: '700', marginTop: 22, marginBottom: 10 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.surface, borderRadius: T.radiusSm, borderWidth: 1, borderColor: T.hairline,
    paddingHorizontal: 12, marginBottom: 12,
  },
  searchInput: { flex: 1, color: T.text, paddingVertical: 11, fontSize: 14 },
  txRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: T.surface, borderRadius: T.radiusSm,
    borderWidth: 1, borderColor: T.hairline, padding: 14, marginBottom: 8,
  },
  txLeft: { flex: 1, marginRight: 10 },
  txName: { color: T.text, fontSize: 15, fontWeight: '600' },
  txCategory: { color: T.muted, fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  txAmount: { color: T.coral, fontWeight: '700', fontVariant: ['tabular-nums'] },
  txIncome: { color: T.mint },
  addBankButton: { padding: 18, alignItems: 'center', marginTop: 8 },
  addBankText: { color: T.violet, fontWeight: '700' },
});
