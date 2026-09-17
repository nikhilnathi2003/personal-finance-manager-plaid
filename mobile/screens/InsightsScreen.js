import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { api } from '../utils/api';
import { T } from '../theme';
import GlassCard from '../components/GlassCard';
import ScreenHeader from '../components/ScreenHeader';

const ICONS = { save: '🏦', invest: '📈', reduce_spending: '✂️' };

export default function InsightsScreen() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setInsights(await api('/transactions/insights'));
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <ScreenHeader
        title="Insights"
        subtitle="A plain-language read of your month from your own numbers — ideas to consider, not financial advice."
      />

      {!insights && !loading && (
        <TouchableOpacity onPress={generate} activeOpacity={0.85}>
          <LinearGradient
            colors={[T.aurora[1], T.aurora[2]]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.generateButton}
          >
            <Ionicons name="sparkles" size={18} color="#FFF" />
            <Text style={styles.generateText}>Read my month</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={T.violet} />
          <Text style={styles.loadingText}>Thinking through your month…</Text>
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {insights && !loading && (
        <>
          <Animated.View entering={FadeInDown.duration(500)}>
            <GlassCard style={{ marginBottom: 14 }}>
              <Text style={styles.summaryText}>{insights.summary}</Text>
            </GlassCard>
          </Animated.View>

          {insights.flags?.length > 0 && (
            <Animated.View entering={FadeInDown.delay(120).duration(500)} style={{ marginBottom: 14 }}>
              {insights.flags.map((f, i) => (
                <View key={i} style={styles.flagRow}>
                  <Ionicons name="alert-circle" size={16} color={T.gold} />
                  <Text style={styles.flagText}>{f}</Text>
                </View>
              ))}
            </Animated.View>
          )}

          <Text style={styles.sectionTitle}>Suggestions</Text>
          {insights.suggestions?.map((s, i) => (
            <Animated.View key={i} entering={FadeInDown.delay(200 + i * 100).duration(500)}>
              <GlassCard style={styles.suggestionCard}>
                <Text style={styles.icon}>{ICONS[s.type] || '💡'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionText}>{s.description}</Text>
                  {s.amount ? (
                    <Text style={styles.suggestionAmount}>~${s.amount}/month</Text>
                  ) : null}
                </View>
              </GlassCard>
            </Animated.View>
          ))}

          <TouchableOpacity onPress={generate} style={styles.regen}>
            <Ionicons name="refresh" size={15} color={T.violet} />
            <Text style={styles.regenText}>Generate again</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.ink, padding: T.pad },
  screenTitle: { color: T.text, fontSize: 26, fontWeight: '800', marginTop: 40 },
  sub: { color: T.muted, fontSize: 13, marginTop: 6, marginBottom: 20, lineHeight: 19 },
  generateButton: {
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
    borderRadius: T.radiusSm, padding: 18,
  },
  generateText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  center: { alignItems: 'center', paddingVertical: 60 },
  loadingText: { color: T.muted, marginTop: 12 },
  error: { color: T.coral, marginTop: 12, textAlign: 'center' },
  summaryText: { color: T.text, fontSize: 15, lineHeight: 23 },
  flagRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  flagText: { color: T.gold, fontSize: 14, flex: 1, lineHeight: 20 },
  sectionTitle: { color: T.text, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  suggestionCard: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 10 },
  icon: { fontSize: 24 },
  suggestionText: { color: T.text, fontSize: 14, lineHeight: 20 },
  suggestionAmount: { color: T.mint, fontSize: 13, marginTop: 4, fontWeight: '700' },
  regen: {
    flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center',
    padding: 16, marginTop: 6,
  },
  regenText: { color: T.violet, fontWeight: '700', fontSize: 14 },
});
