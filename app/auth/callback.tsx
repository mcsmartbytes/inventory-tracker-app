import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    const go = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        if (data.session) {
          router.replace('/(tabs)');
        } else {
          // If session not yet available, stay here briefly; onAuthStateChange will redirect when ready.
          setChecking(false);
        }
      } catch {
        setChecking(false);
      }
    };
    go();
    return () => { mounted = false; };
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator />
      <Text style={styles.text}>{checking ? 'Signing you in…' : 'No session found. Please return to Sign in.'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', marginTop: 12 },
});

