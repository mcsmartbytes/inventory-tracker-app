import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const router = useRouter();

  const verify = async () => {
    if (!email) return toast('Missing email');
    if (!token) return toast('Enter the code from your email');
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: String(email),
        token,
        type: 'email',
      });
      if (error) throw error;
      toast('Signed in');
      router.replace('/(tabs)');
    } catch (e: any) {
      toast(e?.message ?? 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!email) return toast('Missing email');
    setResending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: String(email), options: { shouldCreateUser: true } });
      if (error) throw error;
      toast('Code resent');
    } catch (e: any) {
      toast(e?.message ?? 'Failed to resend');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Email</Text>
      <Text style={styles.sub}>We sent a code to:</Text>
      <Text style={styles.email}>{email}</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter 6-digit code"
        placeholderTextColor="#777"
        keyboardType="number-pad"
        value={token}
        onChangeText={setToken}
      />
      <Button title={loading ? 'Verifying…' : 'Verify'} onPress={verify} disabled={loading} />
      <View style={{ height: 8 }} />
      <Button title={resending ? 'Resending…' : 'Resend code'} onPress={resend} disabled={resending || loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 16, justifyContent: 'center' },
  title: { color: '#fff', fontSize: 22, marginBottom: 8, textAlign: 'center' },
  sub: { color: '#bbb', textAlign: 'center' },
  email: { color: '#fff', textAlign: 'center', marginBottom: 16 },
  input: { color: '#fff', borderColor: '#333', borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 },
});
