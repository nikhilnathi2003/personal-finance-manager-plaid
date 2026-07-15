import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../utils/supabase';
import { T } from '../theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.includes('@')) return Alert.alert('Enter a valid email');
    if (password.length < 6) return Alert.alert('Password must be at least 6 characters');
    setBusy(true);
    const fn = mode === 'signup'
      ? supabase.auth.signUp({ email: email.trim(), password })
      : supabase.auth.signInWithPassword({ email: email.trim(), password });
    const { error } = await fn;
    setBusy(false);
    if (error) Alert.alert(mode === 'signup' ? 'Sign up failed' : 'Login failed', error.message);
    // On success, the app's auth listener signs you in automatically.
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#160B3E', T.ink, T.ink]} style={StyleSheet.absoluteFill} />
      <Animated.View entering={FadeIn.duration(700)} style={styles.orb} />

      <Animated.Text entering={FadeIn.duration(600)} style={styles.title}>
        The Vault
      </Animated.Text>
      <Animated.Text entering={FadeIn.delay(150).duration(600)} style={styles.subtitle}>
        Your money, in one glance. Just you and your crew.
      </Animated.Text>

      <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="you@email.com"
          placeholderTextColor={T.faint}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password (6+ characters)"
          placeholderTextColor={T.faint}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity style={styles.button} onPress={submit} disabled={busy}>
          <LinearGradient
            colors={[T.aurora[1], T.aurora[2]]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.buttonBg}
          >
            <Text style={styles.buttonText}>
              {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Log in'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMode(mode === 'signup' ? 'login' : 'signup')}
          style={{ padding: 12 }}
        >
          <Text style={styles.switchText}>
            {mode === 'signup'
              ? 'Already have an account? Log in'
              : "New here? Create an account"}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      <Text style={styles.footnote}>
        Read-only by design — this app can see balances and transactions you approve, and can
        never move money.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.ink, justifyContent: 'center', padding: 24 },
  orb: {
    position: 'absolute', top: -120, right: -100, width: 320, height: 320,
    borderRadius: 160, backgroundColor: 'rgba(109,59,245,0.25)',
  },
  title: { color: T.text, fontSize: 38, fontWeight: '800', textAlign: 'center', letterSpacing: -1 },
  subtitle: { color: T.muted, fontSize: 15, textAlign: 'center', marginTop: 10, marginBottom: 44 },
  card: {
    backgroundColor: T.surface, borderRadius: T.radius, padding: 20,
    borderWidth: 1, borderColor: T.hairline,
  },
  input: {
    backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: T.radiusSm, padding: 15,
    color: T.text, fontSize: 16, marginBottom: 14, borderWidth: 1, borderColor: T.hairline,
  },
  button: { borderRadius: T.radiusSm, overflow: 'hidden' },
  buttonBg: { padding: 16, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  switchText: { color: T.violet, textAlign: 'center', fontSize: 14, fontWeight: '600' },
  footnote: { color: T.faint, fontSize: 12, textAlign: 'center', marginTop: 28, lineHeight: 18 },
});