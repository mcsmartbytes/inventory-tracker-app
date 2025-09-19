import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpIssue, setOtpIssue] = useState(false);
  const router = useRouter();

  const diagnostics = async () => {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      toast('Missing EXPO_PUBLIC_SUPABASE_* env');
      return;
    }
    try {
      const authRes = await fetch(`${url}/auth/v1/health`);
      toast(`Auth health: ${authRes.status}`);
    } catch (e: any) {
      toast(`Auth health failed: ${e?.message ?? 'error'}`);
    }
    try {
      const restRes = await fetch(
        `${url}/rest/v1/scans?select=id&limit=1`,
        {
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            Accept: 'application/json',
          },
        }
      );
      toast(`REST: ${restRes.status}`);
    } catch (e: any) {
      toast(`REST failed: ${e?.message ?? 'error'}`);
    }
  };

  const sendOtp = async () => {
    if (!email) return toast('Enter your email');
    setLoading(true);
    try {
      const redirect = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true, emailRedirectTo: redirect },
      });
      if (error) throw error;
      toast('Check your email for the code');
      router.push({ pathname: '/auth/verify', params: { email } });
    } catch (e: any) {
      toast(e?.message ?? 'Failed to send code');
      setOtpIssue(true);
    } finally {
      setLoading(false);
    }
  };

  const signInWithPassword = async () => {
    if (!email) return toast('Enter your email');
    if (!password) return toast('Enter a password');
    setLoading(true);
    try {
      // Try direct sign-in first
      let { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // If user doesn't exist, create then try again.
        const { error: signUpErr } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: undefined } });
        if (signUpErr) throw signUpErr;
        // If email confirmations are enabled, this will still require email confirmation.
        ({ error } = await supabase.auth.signInWithPassword({ email, password }));
        if (error) throw error;
      }
      toast('Signed in');
      router.replace('/(tabs)');
    } catch (e: any) {
      toast(e?.message ?? 'Password sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {otpIssue && (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Having trouble receiving OTP emails?</Text>
          <Text style={styles.bannerText}>
            Use Email + Password below to sign in now. To enable OTP delivery, configure SMTP in Supabase → Auth → Email.
          </Text>
        </View>
      )}
      <Text style={styles.title}>Sign in</Text>
      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@example.com"
        placeholderTextColor="#777"
        value={email}
        onChangeText={setEmail}
      />
      {usePassword && (
        <>
          <View style={{ height: 8 }} />
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#777"
            value={password}
            onChangeText={setPassword}
          />
        </>
      )}
      <Button
        title={loading ? (usePassword ? 'Signing in…' : 'Sending…') : (usePassword ? 'Sign in / Sign up' : 'Send OTP')}
        onPress={usePassword ? signInWithPassword : sendOtp}
        disabled={loading}
      />
      <View style={{ height: 12 }} />
      <Button title="Run network check" onPress={diagnostics} />
      <View style={{ height: 12 }} />
      <Button
        title={usePassword ? 'Use email OTP instead' : 'Use email + password instead'}
        onPress={() => setUsePassword((v) => !v)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 16, justifyContent: 'center' },
  banner: { backgroundColor: '#221a00', borderColor: '#554400', borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 },
  bannerTitle: { color: '#ffd24d', marginBottom: 6, fontWeight: '600' },
  bannerText: { color: '#ffe7a3' },
  title: { color: '#fff', fontSize: 22, marginBottom: 16, textAlign: 'center' },
  label: { color: '#bbb', marginBottom: 6 },
  input: { color: '#fff', borderColor: '#333', borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 },
});
