import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { supabase } from '@/lib/supabase';

type Row = {
  po_number: string;
  item_number: string;
  description: string;
  qty_expected: number;
  qty_scanned: number;
  qty_remaining: number;
};

export default function ReconcileScreen() {
  const [po, setPo] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!po.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('v_my_packing_reconciliation')
        .select('po_number,item_number,description,qty_expected,qty_scanned,qty_remaining')
        .eq('po_number', po.trim())
        .order('item_number', { ascending: true });
      if (error) throw error;
      setRows((data as Row[]) ?? []);
    } catch (e) {
      console.warn('Reconcile load failed', e);
    } finally {
      setLoading(false);
    }
  }, [po]);

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Enter PO number…"
          placeholderTextColor="#888"
          value={po}
          autoCapitalize="characters"
          onChangeText={setPo}
          onSubmitEditing={load}
          returnKeyType="search"
        />
        <Button title="Search" onPress={load} />
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => `${r.item_number}`}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.item}>{item.item_number}</Text>
              {!!item.description && <Text style={styles.desc}>{item.description}</Text>}
            </View>
            <View style={styles.counts}>
              <Text style={styles.count}>Exp {item.qty_expected}</Text>
              <Text style={styles.count}>Scan {item.qty_scanned}</Text>
              <Text style={[styles.count, item.qty_remaining === 0 ? styles.ok : styles.warn]}>Rem {item.qty_remaining}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}><Text style={styles.emptyText}>{po ? 'No items found' : 'Enter a PO to search'}</Text></View>
        ) : null}
        contentContainerStyle={rows.length === 0 ? { flex: 1 } : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  searchBar: { flexDirection: 'row', gap: 8, padding: 12, alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#111', color: '#fff', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 6 },
  row: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, borderBottomColor: '#222', borderBottomWidth: StyleSheet.hairlineWidth },
  item: { color: '#fff', fontWeight: '600' },
  desc: { color: '#aaa', marginTop: 2 },
  counts: { alignItems: 'flex-end', gap: 4 },
  count: { color: '#ddd', fontVariant: ['tabular-nums'] },
  ok: { color: '#61d095' },
  warn: { color: '#ffb020' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#888' },
});

