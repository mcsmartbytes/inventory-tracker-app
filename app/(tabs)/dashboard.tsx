import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

type Metrics = {
  today: number;
  last7: number;
  unique7: number;
};

export default function Dashboard() {
  const [m, setM] = useState<Metrics>({ today: 0, last7: 0, unique7: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 3600 * 1000);

      const [{ count: cToday, error: e1 }, { count: c7, error: e2 }] = await Promise.all([
        supabase
          .from('scans')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startToday.toISOString()),
        supabase
          .from('scans')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo.toISOString()),
      ]);
      if (e1) throw e1; if (e2) throw e2;

      // Unique codes last 7 days
      const { data: uniqData, error: e3 } = await supabase
        .from('scans')
        .select('code')
        .gte('created_at', sevenDaysAgo.toISOString());
      if (e3) throw e3;

      const uniqueSet = new Set((uniqData ?? []).map((r: any) => r.code));
      setM({ today: cToday ?? 0, last7: c7 ?? 0, unique7: uniqueSet.size });
    } catch (e: any) {
      toast(e?.message ?? 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <View style={styles.cards}>
        <View style={styles.card}><Text style={styles.kpi}>{m.today}</Text><Text style={styles.kpiLabel}>Scans today</Text></View>
        <View style={styles.card}><Text style={styles.kpi}>{m.last7}</Text><Text style={styles.kpiLabel}>Scans last 7d</Text></View>
        <View style={styles.card}><Text style={styles.kpi}>{m.unique7}</Text><Text style={styles.kpiLabel}>Unique codes 7d</Text></View>
      </View>
      <Button title={loading ? 'Loading…' : 'Refresh'} onPress={load} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 16 },
  title: { color: '#fff', fontSize: 22, marginBottom: 16 },
  cards: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  card: { flex: 1, backgroundColor: '#111', borderRadius: 10, padding: 16, alignItems: 'center' },
  kpi: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  kpiLabel: { color: '#aaa', marginTop: 6 },
});

