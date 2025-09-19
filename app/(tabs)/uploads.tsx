import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Button, TextInput, Platform, ScrollView } from 'react-native';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

type Row = {
  item_number: string;
  description?: string;
  qty_expected?: number;
};

// Minimal CSV parser for headers + rows. Handles quoted fields and commas-in-quotes.
function parseCSV(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = splitCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idxItem = header.indexOf('item_number');
  const idxDesc = header.indexOf('description');
  const idxQty = header.indexOf('qty_expected');
  if (idxItem === -1) throw new Error('CSV must include an item_number column');
  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const item_number = (cols[idxItem] ?? '').trim();
    if (!item_number) continue;
    const description = idxDesc >= 0 ? (cols[idxDesc] ?? '').trim() : undefined;
    const qtyRaw = idxQty >= 0 ? (cols[idxQty] ?? '').trim() : '';
    const qty_expected = qtyRaw ? Number(qtyRaw) : undefined;
    rows.push({ item_number, description, qty_expected });
  }
  return rows;
}

function splitCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { // escaped quote
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

export default function UploadsScreen() {
  const [po, setPo] = useState('');
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const preview = useMemo(() => (parsed ?? []).slice(0, 5), [parsed]);

  const doParse = () => {
    try {
      const rows = parseCSV(text);
      setParsed(rows);
      setResult(null);
      toast(`Parsed ${rows.length} rows`);
    } catch (e: any) {
      toast(e?.message ?? 'Failed to parse CSV');
    }
  };

  const doUpload = async () => {
    if (!po.trim()) return toast('Enter a PO number');
    // Auto-parse if user forgot to press Parse
    let rows = parsed;
    if (!rows || rows.length === 0) {
      try {
        rows = parseCSV(text);
        setParsed(rows);
      } catch (e: any) {
        return toast(e?.message ?? 'Failed to parse CSV');
      }
    }
    if (!rows || rows.length === 0) return toast('No rows to upload');
    setBusy(true);
    setResult(null);
    try {
      // For compatibility with DBs that don't have user_id on packing_slips yet,
      // we don't send user_id here. If your DB has RLS requiring user_id, run the
      // provided SQL migration in /sql to add the trigger and policies.
      const payload = rows.map((r) => ({
        po_number: po.trim(),
        item_number: r.item_number,
        description: r.description ?? null,
        qty_expected: r.qty_expected ?? 1,
      }));
      // Batch in chunks to avoid payload limits
      const chunkSize = 500;
      let inserted = 0;
      for (let i = 0; i < payload.length; i += chunkSize) {
        const chunk = payload.slice(i, i + chunkSize);
        const { error, count } = await supabase
          .from('packing_slips')
          .insert(chunk, { count: 'exact' });
        if (error) throw error;
        inserted += count ?? chunk.length;
      }
      setResult(`Uploaded ${inserted} rows for PO ${po.trim()}`);
      toast('Upload complete');
    } catch (e: any) {
      console.warn('Upload failed', e);
      let msg = e?.message ?? 'Upload failed';
      if (typeof msg === 'string' && msg.toLowerCase().includes('row-level security')) {
        msg = 'Row Level Security blocked the insert. Run the packing_slips SQL setup in /sql to add policies and a trigger.';
      }
      toast(msg);
      setResult(`Upload failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Uploads</Text>
      {Platform.OS !== 'web' ? (
        <Text style={styles.note}>For best experience, open this on the web to paste CSV and upload packing slips.</Text>
      ) : null}

      <Text style={styles.label}>PO Number</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., PO12345"
        placeholderTextColor="#777"
        autoCapitalize="characters"
        value={po}
        onChangeText={setPo}
      />

      <View style={{ height: 8 }} />
      <Text style={styles.label}>CSV (headers required: item_number[, description][, qty_expected])</Text>
      {Platform.OS === 'web' && (
        <View style={{ marginBottom: 8 }}>
          {/* Simple file input for convenience on web */}
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label style={{ color: '#bbb', marginBottom: 6, display: 'inline-block' }}>Choose CSV file</label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const txt = await f.text();
              setText(txt);
              setParsed(null);
              setResult(null);
            }}
          />
        </View>
      )}

      <TextInput
        style={[styles.input, styles.textarea]}
        multiline
        placeholder={`item_number,description,qty_expected\n12345,Widget,2\n67890,Gadget,1`}
        placeholderTextColor="#777"
        value={text}
        onChangeText={(t) => { setText(t); setParsed(null); setResult(null); }}
      />

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <Button title="Parse CSV" onPress={doParse} />
        <Button title={busy ? 'Uploading…' : 'Upload'} onPress={doUpload} disabled={busy} />
      </View>

      {parsed && (
        <View style={{ marginTop: 16 }}>
          <Text style={styles.subTitle}>Preview ({parsed.length} rows)</Text>
          {preview.map((r, idx) => (
            <Text key={idx} style={styles.rowText}>
              {r.item_number} | {r.description ?? ''} | {r.qty_expected ?? 1}
            </Text>
          ))}
          {parsed.length > preview.length && (
            <Text style={styles.note}>(+{parsed.length - preview.length} more)</Text>
          )}
        </View>
      )}

      {result && (
        <View style={{ marginTop: 16 }}>
          <Text style={styles.result}>{result}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  title: { color: '#fff', fontSize: 22, marginBottom: 12 },
  subTitle: { color: '#fff', fontSize: 16, marginBottom: 8 },
  label: { color: '#bbb', marginBottom: 6 },
  input: { color: '#fff', borderColor: '#333', borderWidth: 1, borderRadius: 8, padding: 12 },
  textarea: { minHeight: 140, textAlignVertical: 'top', marginTop: 6 },
  note: { color: '#aaa', marginTop: 4 },
  rowText: { color: '#ddd' },
  result: { color: '#61d095' },
});
