import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { api } from '../utils/api';
import { T, money } from '../theme';
import GlassCard from '../components/GlassCard';
import AnimatedNumber from '../components/AnimatedNumber';
import ScreenHeader from '../components/ScreenHeader';

export default function AccountsScreen({ navigation }) {
  const [dashboard, setDashboard] = useState(null);

  const load = useCallback(() => {
    api('/transactions/dashboard').then(setDashboard).catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const removeBank = (bank) => {
    Alert.alert(
      `Remove ${bank.institution_name}?`,
      'This removes its accounts and transactions from the app. Your manual cash entries are kept. You can always link it again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try { await api(`/plaid/items/${bank.id}`, { method: 'DELETE' }); load(); }
            catch (e) { Alert.alert('Could not remove', e.message); }
          },
        },
      ]
    );
  };

  const netWorth = dashboard?.netWorth || 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
      <ScreenHeader title="Accounts" onClose={() => navigation.goBack()} />

      <Animated.View entering={FadeInDown.duration(500)} style={{ marginTop: 12 }}>
        <GlassCard style={{ alignItems: 'center', paddingVertical: 26 }}>
          <Text style={styles.nwLabel}>NET ACROSS ALL ACCOUNTS</Text>
          <AnimatedNumber
            value={Math.abs(netWorth)}
            prefix={netWorth < 0 ? '-$' : '$'}
            style={{ fontSize: 36 }}
          />
          <Text style={styles.nwHint}>balances minus credit card debt</Text>
        </GlassCard>
      </Animated.View>

      {(dashboard?.bankItems || []).map((bank, bi) => (
        <Animated.View key={bank.id} entering={FadeInDown.delay(100 + bi * 80).duration(400)}>
          <View style={styles.bankHeader}>
            <Text style={styles.bankName}>{bank.institution_name}</Text>
            <View style={styles.bankActions}>
              {bank.error_code ? (
                <TouchableOpacity
                  style={styles.reconnectChip}
                  onPress={() => navigation.navigate('ConnectBank', {
                    reconnect: { id: bank.id, name: bank.institution_name },
                  })}
                >
                  <Ionicons name="refresh" size={13} color={T.gold} />
                  <Text style={styles.reconnectChipText}>Reconnect</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={() => removeBank(bank)} hitSlop={10}>
                <Ionicons name="trash-outline" size={16} color={T.faint} />
              </TouchableOpacity>
            </View>
          </View>
          {(dashboard?.accounts || [])
            .filter((a) => a.bank_item_id === bank.id)
            .map((a) => (
              <GlassCard key={a.id} style={styles.accountRow}>
                <View>
                  <Text style={styles.accountName}>{a.name}</Text>
                  <Text style={styles.accountType}>{a.subtype || a.type}</Text>
                </View>
                <Text style={[styles.balance, a.type === 'credit' && { color: T.coral }]}>
                  {a.type === 'credit' ? '−' : ''}{money(a.current_balance)}
                </Text>
              </GlassCard>
            ))}
        </Animated.View>
      ))}

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.navigate('ConnectBank')}
      >
        <Text style={styles.linkButtonText}>+ Link another bank</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.ink, padding: T.pad },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 24, marginBottom: 16,
  },
  screenTitle: { color: T.text, fontSize: 26, fontWeight: '800' },
  nwLabel: { color: T.muted, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 8 },
  nwHint: { color: T.faint, fontSize: 12, marginTop: 6 },
  bankHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 22, marginBottom: 10,
  },
  bankName: { color: T.text, fontSize: 16, fontWeight: '700' },
  bankActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  reconnectChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,198,99,0.12)', borderWidth: 1, borderColor: 'rgba(255,198,99,0.4)',
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
  },
  reconnectChipText: { color: T.gold, fontSize: 12, fontWeight: '800' },
  accountRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  accountName: { color: T.text, fontSize: 15, fontWeight: '600' },
  accountType: { color: T.muted, fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  balance: { color: T.mint, fontWeight: '700', fontSize: 16, fontVariant: ['tabular-nums'] },
  linkButton: {
    borderWidth: 1, borderColor: T.violet, borderRadius: T.radiusSm, borderStyle: 'dashed',
    padding: 16, alignItems: 'center', marginTop: 20,
  },
  linkButtonText: { color: T.violet, fontWeight: '700' },
  signOut: {
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
    padding: 16, marginTop: 16,
  },
  signOutText: { color: T.coral, fontWeight: '700' },
});
