import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

export default function UsersAdmin() {
  const [me, setMe] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setMe(data.user?.email ?? null);
    })();
  }, []);

  const createUser = async () => {
    if (!email) return toast('Enter an email');
    if (!password) return toast('Enter a password');
    setBusy(true);
    try {
      // Client-side signUp creates the user in Supabase Auth.
      // For immediate access, in Supabase set: Auth → Email → disable "Confirm email".
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: undefined } });
      if (error) throw error;
      toast('User created (check email settings if confirmation is required)');
      setEmail('');
      setPassword('');
    } catch (e: any) {
      toast(e?.message ?? 'Failed to create user');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Users (Admin)</Text>
      <Text style={styles.note}>
        Create staff accounts using Email + Password. For instant access, in Supabase set Auth → Email → enable provider and disable email confirmation during setup.
      </Text>

      <View style={{ height: 8 }} />
      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="staff@example.com"
        placeholderTextColor="#777"
        value={email}
        onChangeText={setEmail}
      />
      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        placeholder="Temporary password"
        placeholderTextColor="#777"
        value={password}
        onChangeText={setPassword}
      />
      <Button title={busy ? 'Creating…' : 'Create user'} onPress={createUser} disabled={busy} />

      <View style={{ marginTop: 16 }}>
        <Text style={styles.meta}>Signed in as: {me ?? '—'}</Text>
        {Platform.OS !== 'web' && <Text style={styles.meta}>Tip: Use the web app for easier typing and management.</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 16 },
  title: { color: '#fff', fontSize: 22, marginBottom: 8 },
  note: { color: '#aaa', marginBottom: 12 },
  label: { color: '#bbb', marginTop: 8, marginBottom: 6 },
  input: { color: '#fff', borderColor: '#333', borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 8 },
  meta: { color: '#888', marginTop: 4 },
});

