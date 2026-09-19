import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, TextInput, Modal, Pressable,
} from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { api } from '../utils/api';
import { T, type, money } from '../theme';
import { CATEGORY_META } from '../utils/categories';
import TiltCard from '../components/TiltCard';
import GlassCard from '../components/GlassCard';
import AnimatedNumber from '../components/AnimatedNumber';
import DonutChart from '../components/DonutChart';
import BalanceCard from '../components/BalanceCard';
import CategoryIcon from '../components/CategoryIcon';
import MonthSwitcher from '../components/MonthSwitcher';
import CategoryPicker from '../components/CategoryPicker';
import Fab from '../components/Fab';

const flowOf = (t) => CATEGORY_META[t.category_key]?.flow || (t.is_income ? 'income' : 'expense');

export default function HomeScreen({ navigation }) {
  const [dashboard, setDashboard] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState(null); // null = current month
  const [selectedTx, setSelectedTx] = useState(null); // fix-a-category target
  const [breakdown, setBreakdown] = useState(null); // 'chequing' | 'savings' | null
  const reduceMotion = useReducedMotion();

  // Entrance helper — skips animation entirely under reduced-motion.
  const rise = (delay) => (reduceMotion ? undefined : FadeInDown.delay(delay).duration(460));

  const loadDashboard = useCallback(async (m = month) => {
    try {
      setError(null);
      setDashboard(await api('/transactions/dashboard' + (m ? `?month=${m}` : '')));
    } catch (e) {
      setError(e.message);
    }
  }, [month]);

  useFocusEffect(useCallback(() => { loadDashboard(); }, [loadDashboard]));

  const changeMonth = (m) => { setMonth(m); setDashboard(null); loadDashboard(m); };

  const fixCategory = async (newKey) => {
    const tx = selectedTx;
    setSelectedTx(null);
    if (!tx || newKey === tx.category_key) return;
    try {
      await api(`/transactions/${tx.id}/category`, { method: 'POST', body: { categoryKey: newKey } });
      loadDashboard();
    } catch (e) { setError(e.message); }
  };

  const deleteTx = async () => {
    const tx = selectedTx;
    setSelectedTx(null);
    if (!tx) return;
    try {
      await api(`/transactions/manual/${tx.id}`, { method: 'DELETE' });
      loadDashboard();
    } catch (e) { setError(e.message); }
  };

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

  const balances = dashboard?.balances || { chequing: 0, savings: 0, credit: 0, other: 0 };
  const leftover = dashboard?.leftover || 0;
  const positive = leftover >= 0;
  const monthName = new Date().toLocaleString('en-US', { month: 'long' });
  const bankNames = (dashboard?.bankItems || [])
    .map((b) => b.institution_name)
    .filter(Boolean);

  const allTx = dashboard?.transactions || [];
  const transactions = allTx.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (t.merchant_name || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.category || '').toLowerCase().includes(q)
    );
  });

  // Spending grouped by category, for the tappable drill-down list.
  const topCategories = (() => {
    const by = {};
    allTx.forEach((t) => {
      if (flowOf(t) !== 'expense') return;
      const key = t.category_key || 'other';
      if (!by[key]) by[key] = { key, label: t.category, total: 0, txs: [] };
      by[key].total += Math.abs(t.amount);
      by[key].txs.push(t);
    });
    return Object.values(by).sort((a, b) => b.total - a.total);
  })();

  // Per-bank breakdown for a balance bucket (chequing / savings).
  const bankNameById = (id) =>
    (dashboard?.bankItems || []).find((b) => b.id === id)?.institution_name || 'Bank';
  const bucketAccounts = (bucket) =>
    (dashboard?.accounts || []).filter((a) => {
      const sub = (a.subtype || '').toLowerCase();
      if (a.type === 'credit') return false;
      if (bucket === 'chequing') return sub === 'checking' || sub === 'chequing';
      if (bucket === 'savings') return sub === 'savings';
      return false;
    });

  return (
    <View style={styles.root}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.violet} />
      }
    >
      <View style={styles.topRow}>
        <View>
          <Text style={styles.screenTitle}>Overview</Text>
          <View style={{ marginTop: 8 }}>
            <MonthSwitcher month={month} onChange={changeMonth} />
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Accounts')} hitSlop={12}>
          <Ionicons name="person-circle-outline" size={32} color={T.muted} />
        </TouchableOpacity>
      </View>

      {error && (
        <GlassCard style={{ marginBottom: 16, borderColor: T.coral }}>
          <Text style={{ color: T.coral, fontSize: 13 }}>
            Couldn't reach the server — {error}. Pull down to retry.
          </Text>
        </GlassCard>
      )}

      {/* Two live balances — chequing + savings */}
      <Animated.View entering={rise(60)} style={styles.balanceRow}>
        <BalanceCard
          label="CHEQUING"
          amount={balances.chequing}
          icon="card"
          colors={T.chequingGrad}
          subtitle={bankNames.length > 1 ? 'tap for by-bank' : 'available to spend'}
          onPress={() => setBreakdown('chequing')}
        />
        <BalanceCard
          label="SAVINGS"
          amount={balances.savings}
          icon="lock-closed"
          colors={T.savingsGrad}
          subtitle={bankNames.length > 1 ? 'tap for by-bank' : 'set aside'}
          onPress={() => setBreakdown('savings')}
        />
      </Animated.View>

      {bankNames.length > 0 && (
        <Animated.View entering={rise(90)}>
          <View style={styles.combinedRow}>
            <Ionicons name="git-merge-outline" size={13} color={T.faint} />
            <Text style={styles.combinedText} numberOfLines={1}>
              {bankNames.length > 1 ? 'Combined across ' : ''}{bankNames.join(' · ')}
            </Text>
          </View>
        </Animated.View>
      )}

      {balances.credit > 0 && (
        <Animated.View entering={rise(110)}>
          <View style={styles.creditRow}>
            <Ionicons name="card-outline" size={15} color={T.coral} />
            <Text style={styles.creditText}>
              {money(balances.credit)} owing on credit
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Hero: this month's income / spent / left over — hold and tilt it */}
      <Animated.View entering={rise(150)}>
        <TiltCard style={{ marginTop: 14 }}>
          <Text style={styles.cardLabel}>{monthName.toUpperCase()} · LEFT OVER</Text>
          <AnimatedNumber
            value={Math.abs(leftover)}
            prefix={positive ? '$' : '-$'}
            style={styles.cardAmount}
          />
          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>INCOME</Text>
              <Text style={[styles.statValue, { color: T.mint }]}>{money(dashboard?.income)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statLabel}>SPENT</Text>
              <Text style={[styles.statValue, { color: '#FFD3DC' }]}>{money(dashboard?.spending)}</Text>
            </View>
          </View>
        </TiltCard>
        {!reduceMotion && <Text style={styles.tiltHint}>hold the card and tilt it ↑</Text>}
      </Animated.View>

      {/* Where it went */}
      {topCategories.length > 0 && (
        <Animated.View entering={rise(230)}>
          <Text style={styles.sectionTitle}>Where it went</Text>
          <GlassCard>
            <DonutChart spendingByCategory={dashboard?.spendingByCategory} />
          </GlassCard>

          <View style={{ marginTop: 10 }}>
            {topCategories.map((c) => {
              const m = CATEGORY_META[c.key] || CATEGORY_META.other;
              return (
                <TouchableOpacity
                  key={c.key}
                  style={styles.catRow}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('CategoryDetail', {
                    category: c.label, categoryKey: c.key, transactions: c.txs,
                  })}
                >
                  <CategoryIcon categoryKey={c.key} size={38} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.catName}>{c.label}</Text>
                    <View style={styles.catBarTrack}>
                      <View style={[styles.catBarFill, {
                        width: `${Math.max(6, (c.total / topCategories[0].total) * 100)}%`,
                        backgroundColor: m.color,
                      }]} />
                    </View>
                  </View>
                  <Text style={styles.catAmount}>{money(c.total)}</Text>
                  <Ionicons name="chevron-forward" size={16} color={T.faint} />
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      )}

      {/* Transactions */}
      <Animated.View entering={rise(300)}>
        <Text style={styles.sectionTitle}>Transactions</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={T.faint} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search merchant or category…"
            placeholderTextColor={T.faint}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={10}>
              <Ionicons name="close-circle" size={16} color={T.faint} />
            </TouchableOpacity>
          ) : null}
        </View>
      </Animated.View>

      {transactions.slice(0, 40).map((item, index) => (
        <Animated.View
          key={item.id}
          entering={reduceMotion ? undefined : FadeInDown.delay(Math.min(330 + index * 22, 620)).duration(380)}
        >
          <TouchableOpacity style={styles.txRow} activeOpacity={0.7} onPress={() => setSelectedTx(item)}>
            <CategoryIcon categoryKey={item.category_key || item.category} size={42} />
            <View style={styles.txLeft}>
              <Text style={styles.txName} numberOfLines={1}>
                {item.merchant_name || item.description}
                {item.source === 'manual' && <Text style={styles.cashTag}>  · cash</Text>}
              </Text>
              <Text style={styles.txCategory} numberOfLines={1}>
                {item.category} · {item.date?.slice(5)}
              </Text>
            </View>
            <Text style={[styles.txAmount, item.is_income && styles.txIncome]}>
              {item.is_income ? '+' : '−'}{money(item.amount)}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      ))}

      {transactions.length === 0 && !error && (
        <GlassCard style={{ alignItems: 'center', paddingVertical: 28 }}>
          <Ionicons
            name={search ? 'search-outline' : 'sparkles-outline'}
            size={30}
            color={T.faint}
            style={{ marginBottom: 10 }}
          />
          <Text style={{ color: T.text, fontWeight: '700', marginBottom: 4 }}>
            {search ? 'No matches' : 'Nothing here yet'}
          </Text>
          <Text style={{ color: T.muted, marginBottom: 14, textAlign: 'center' }}>
            {search
              ? 'Try a different merchant or category.'
              : 'Link a bank to pull in your transactions.'}
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

    <Fab onPress={() => navigation.navigate('AddTransaction')} />

    <CategoryPicker
      visible={!!selectedTx}
      current={selectedTx?.category_key}
      title="Change category"
      onSelect={fixCategory}
      onClose={() => setSelectedTx(null)}
      onDelete={selectedTx?.source === 'manual' ? deleteTx : undefined}
    />

    <Modal visible={!!breakdown} transparent animationType="fade" onRequestClose={() => setBreakdown(null)}>
      <Pressable style={styles.bkBackdrop} onPress={() => setBreakdown(null)}>
        <Pressable style={styles.bkSheet} onPress={() => {}}>
          <Text style={styles.bkTitle}>
            {breakdown === 'savings' ? 'Savings' : 'Chequing'} · by bank
          </Text>
          {bucketAccounts(breakdown || 'chequing').map((a) => (
            <View key={a.id} style={styles.bkRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bkBank} numberOfLines={1}>{bankNameById(a.bank_item_id)}</Text>
                {a.name ? <Text style={styles.bkAcct} numberOfLines={1}>{a.name}</Text> : null}
              </View>
              <Text style={styles.bkAmt}>{money(a.current_balance)}</Text>
            </View>
          ))}
          {bucketAccounts(breakdown || 'chequing').length === 0 && (
            <Text style={styles.bkEmpty}>No {breakdown} accounts linked yet.</Text>
          )}
          <View style={styles.bkTotalRow}>
            <Text style={styles.bkTotalLabel}>Total</Text>
            <Text style={styles.bkTotalAmt}>{money(balances[breakdown || 'chequing'])}</Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.ink },
  container: { flex: 1, backgroundColor: T.ink, padding: T.pad },
  catRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 4,
  },
  catName: { color: T.text, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  catBarTrack: { height: 6, borderRadius: 3, backgroundColor: T.surface2, overflow: 'hidden' },
  catBarFill: { height: 6, borderRadius: 3 },
  catAmount: { color: T.text, fontWeight: '700', fontSize: 14, fontVariant: ['tabular-nums'] },
  cashTag: { color: T.gold, fontSize: 12, fontWeight: '700' },
  bkBackdrop: { flex: 1, backgroundColor: 'rgba(2,4,10,0.7)', justifyContent: 'center', padding: 28 },
  bkSheet: {
    backgroundColor: T.elevated, borderRadius: T.radiusLg, borderWidth: 1, borderColor: T.hairline,
    padding: 20,
  },
  bkTitle: { color: T.text, ...type.title, marginBottom: 14 },
  bkRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: T.hairline,
  },
  bkBank: { color: T.text, fontSize: 15, fontWeight: '700' },
  bkAcct: { color: T.muted, fontSize: 12, marginTop: 1 },
  bkAmt: { color: T.text, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  bkEmpty: { color: T.muted, textAlign: 'center', paddingVertical: 12 },
  bkTotalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  bkTotalLabel: { color: T.muted, fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  bkTotalAmt: { color: T.mint, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginTop: 44, marginBottom: 18,
  },
  kicker: { color: T.muted, ...type.meta, letterSpacing: 1.5, textTransform: 'uppercase' },
  screenTitle: { color: T.text, ...type.h1, marginTop: 2 },

  balanceRow: { flexDirection: 'row', gap: 12 },
  combinedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingHorizontal: 2,
  },
  combinedText: { color: T.faint, fontSize: 12, fontWeight: '600', flex: 1 },
  creditRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12,
    alignSelf: 'flex-start', backgroundColor: T.surface, borderWidth: 1,
    borderColor: T.hairline, borderRadius: T.pill, paddingHorizontal: 12, paddingVertical: 7,
  },
  creditText: { color: T.text, fontSize: 12, fontWeight: '600' },

  cardLabel: { ...type.label, color: 'rgba(255,255,255,0.75)' },
  cardAmount: { fontSize: 46, marginTop: 6, color: '#FFFFFF', fontWeight: '800' },
  statRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 18,
    backgroundColor: 'rgba(0,0,0,0.24)', borderRadius: T.radiusSm, paddingVertical: 12,
  },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: {
    color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', letterSpacing: 1.5,
  },
  statValue: {
    fontSize: 18, fontWeight: '800', marginTop: 3, fontVariant: ['tabular-nums'],
  },
  statDivider: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.14)', marginVertical: 2 },
  tiltHint: { color: T.faint, fontSize: 11, textAlign: 'center', marginTop: 8, marginBottom: 4 },

  sectionTitle: { color: T.text, ...type.title, marginTop: 24, marginBottom: 12 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.surface, borderRadius: T.radiusSm, borderWidth: 1, borderColor: T.hairline,
    paddingHorizontal: 12, marginBottom: 12,
  },
  searchInput: { flex: 1, color: T.text, paddingVertical: 12, fontSize: 14 },

  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: T.surface, borderRadius: T.radiusSm,
    borderWidth: 1, borderColor: T.hairline, padding: 12, marginBottom: 8,
  },
  txLeft: { flex: 1 },
  txName: { color: T.text, fontSize: 15, fontWeight: '600' },
  txCategory: { color: T.muted, fontSize: 12, marginTop: 2 },
  txAmount: { color: T.coral, fontWeight: '700', fontSize: 15, fontVariant: ['tabular-nums'] },
  txIncome: { color: T.mint },
  addBankButton: { padding: 18, alignItems: 'center', marginTop: 8 },
  addBankText: { color: T.violet, fontWeight: '700' },
});
