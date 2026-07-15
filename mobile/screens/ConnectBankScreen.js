import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { api } from '../utils/api';
import { T } from '../theme';

// Plaid needs native code that Expo Go doesn't include. Load it
// safely: if it's unavailable, the rest of the app still works and
// this screen explains what's needed instead of crashing.
let plaid = null;
let plaidLoadError = null;
try {
  const mod = require('react-native-plaid-link-sdk');
  // Handle both export styles (direct and default)
  plaid = mod?.create ? mod : mod?.default?.create ? mod.default : null;
  if (!plaid) {
    plaidLoadError =
      'Module loaded but create/open not found. Keys: ' + Object.keys(mod || {}).join(', ');
  }
} catch (e) {
  plaidLoadError = e.message;
}

export default function ConnectBankScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const plaidAvailable = !!(
    plaid &&
    typeof plaid.create === 'function' &&
    typeof plaid.open === 'function'
  );

  useEffect(() => {
    if (!plaidAvailable) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const json = await api('/plaid/create-link-token', { method: 'POST' });
        plaid.create({ token: json.link_token });
      } catch (e) {
        setError(e.message);
      }
      setLoading(false);
    })();
  }, []);

  const handleOpenPlaid = () => {
    plaid.open({
      onSuccess: async (success) => {
        try {
          await api('/plaid/exchange-public-token', {
            method: 'POST',
            body: {
              publicToken: success.publicToken,
              institutionName: success.metadata?.institution?.name,
            },
          });
          Alert.alert('Bank connected 🎉', 'Your transactions are syncing now.');
          navigation.goBack();
        } catch (e) {
          Alert.alert('Could not save the connection', e.message);
        }
      },
      onExit: (exit) => {
        if (exit.error) Alert.alert('Something went wrong', exit.error.errorMessage);
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Link your bank</Text>

      {!plaidAvailable ? (
        <View>
          <View style={styles.noticeBox}>
            <Ionicons name="construct-outline" size={20} color={T.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeText}>
                Bank linking needs a full app build and isn't available inside Expo Go. Everything
                else in the app works — this one feature gets enabled when you create a
                development build later.
              </Text>
              {plaidLoadError && (
                <Text style={[styles.noticeText, { marginTop: 8, fontSize: 11 }]}>
                  Debug: {plaidLoadError}
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Back to the app</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <Text style={styles.subtitle}>
            Connect CIBC, Scotiabank, or any Canadian bank Plaid supports.
          </Text>

          <View style={styles.points}>
            {[
              ['lock-closed', "You log in on your bank's own secure page — this app never sees your password."],
              ['eye', 'Read-only access: balances and transactions. It cannot move money or pay anything.'],
              ['hand-left', "Unlink any time from this app or from your bank's connected-apps settings."],
            ].map(([icon, text]) => (
              <View key={icon} style={styles.pointRow}>
                <Ionicons name={icon} size={17} color={T.mint} />
                <Text style={styles.pointText}>{text}</Text>
              </View>
            ))}
          </View>

          {loading ? (
            <ActivityIndicator color={T.violet} size="large" style={{ marginTop: 20 }} />
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : (
            <TouchableOpacity onPress={handleOpenPlaid} activeOpacity={0.85}>
              <LinearGradient
                colors={[T.aurora[1], T.aurora[2]]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Connect a bank account</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.ink, padding: 24, justifyContent: 'center' },
  title: { color: T.text, fontSize: 26, fontWeight: '800', marginBottom: 14 },
  subtitle: { color: T.muted, fontSize: 14, lineHeight: 20, marginBottom: 26 },
  noticeBox: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: 'rgba(255,198,99,0.08)', borderWidth: 1, borderColor: 'rgba(255,198,99,0.35)',
    borderRadius: 14, padding: 16,
  },
  noticeText: { color: T.gold, fontSize: 13, lineHeight: 20 },
  backButton: {
    borderWidth: 1, borderColor: T.violet, borderRadius: 13,
    padding: 16, alignItems: 'center', marginTop: 18,
  },
  backButtonText: { color: T.violet, fontWeight: '700' },
  points: { gap: 14, marginBottom: 30 },
  pointRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  pointText: { color: T.muted, fontSize: 13, lineHeight: 19, flex: 1 },
  error: { color: T.coral, textAlign: 'center' },
  button: { borderRadius: 13, padding: 18, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
});