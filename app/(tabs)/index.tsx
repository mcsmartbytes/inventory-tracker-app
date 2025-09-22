// app/(tabs)/index.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  FlatList,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { createClient } from "@supabase/supabase-js";

// 🔑 Fill these from Supabase (Settings → API)
const supabaseUrl = "https://YOUR_PROJECT_ID.supabase.co";
const supabaseKey = "YOUR_ANON_PUBLIC_KEY";
const supabase = createClient(supabaseUrl, supabaseKey);

type ReconRow = {
  item_number: string;
  description?: string | null;
  qty_expected: number;
  qty_scanned: number;
  qty_missing: number;
};

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [last, setLast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [po, setPo] = useState<string>("PO12345"); // active PO
  const [recon, setRecon] = useState<ReconRow[] | null>(null);
  const [reconLoading, setReconLoading] = useState(false);

  // UI: color per status
  const statusText = useMemo(
    () => (saving ? "Saving…" : scanned ? "Paused (Scan again to resume)" : "Ready"),
    [saving, scanned]
  );

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.subtle}>Loading camera permission…</Text>
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>We need your permission to use the camera</Text>
        <Button title="Grant permission" onPress={requestPermission} />
      </View>
    );
  }

  const handleBarcode = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setLast(data);
    setError(null);

    try {
      setSaving(true);

      // (Optional) get auth user id if using Supabase Auth
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id ?? null;

      // Insert scan row; your `scans` table should have these columns:
      // po_number text, item_number text, device text, user_id uuid (nullable), qty_scanned int default 1
      const { error: insertErr } = await supabase.from("scans").insert({
        po_number: po,
        item_number: data, // if you prefer `code`, change column name here
        device: "mobile",
        user_id: userId,
        qty_scanned: 1,
      });

      if (insertErr) throw insertErr;
      // Optional visual feedback:
      // Alert.alert("Saved", `PO ${po} • Item ${data}`);
    } catch (e: any) {
      console.warn("Save failed", e?.message || e);
      setError(e?.message ?? "Upload failed — check Supabase env/policies");
      Alert.alert("Save failed", e?.message ?? "Check Supabase env/policies");
    } finally {
      setSaving(false);
    }
  };

  const fetchReconcile = async () => {
    if (!po) {
      Alert.alert("PO required", "Enter a PO number first.");
      return;
    }
    setReconLoading(true);
    setError(null);
    setRecon(null);

    try {
      // 1) Try server-side view first (recommended for performance)
      // CREATE VIEW v_po_reconcile AS
      // SELECT p.po_number, p.item_number, p.description, p.qty_expected,
      //        COALESCE(SUM(s.qty_scanned),0) AS qty_scanned,
      //        (p.qty_expected - COALESCE(SUM(s.qty_scanned),0)) AS qty_missing
      // FROM packing_slips p
      // LEFT JOIN scans s ON s.po_number=p.po_number AND s.item_number=p.item_number
      // GROUP BY p.po_number,p.item_number,p.description,p.qty_expected;
      const { data: serverRows, error: serverErr } = await supabase
        .from("v_po_reconcile")
        .select("*")
        .eq("po_number", po)
        .order("item_number");

      if (!serverErr && serverRows) {
        setRecon(
          serverRows.map((r: any) => ({
            item_number: r.item_number,
            description: r.description,
            qty_expected: Number(r.qty_expected ?? 0),
            qty_scanned: Number(r.qty_scanned ?? 0),
            qty_missing: Number(r.qty_missing ?? 0),
          }))
        );
        return;
      }

      // 2) Fallback (no view): do client-side reconcile
      const [{ data: slipRows, error: slipErr }, { data: scanRows, error: scanErr }] =
        await Promise.all([
          supabase
            .from("packing_slips")
            .select("po_number,item_number,description,qty_expected")
            .eq("po_number", po),
          supabase
            .from("scans")
            .select("po_number,item_number,qty_scanned")
            .eq("po_number", po),
        ]);

      if (slipErr) throw slipErr;
      if (scanErr) throw scanErr;

      const scanMap = new Map<string, number>();
      (scanRows ?? []).forEach((s: any) => {
        const key = String(s.item_number);
        scanMap.set(key, (scanMap.get(key) ?? 0) + Number(s.qty_scanned ?? 1));
      });

      const rows: ReconRow[] = (slipRows ?? []).map((p: any) => {
        const got = scanMap.get(String(p.item_number)) ?? 0;
        const exp = Number(p.qty_expected ?? 0);
        return {
          item_number: String(p.item_number),
          description: p.description,
          qty_expected: exp,
          qty_scanned: got,
          qty_missing: Math.max(exp - got, 0),
        };
      });

      // include any scanned items not in slip (optional)
      scanMap.forEach((got, item) => {
        const exists = rows.find((r) => r.item_number === item);
        if (!exists) {
          rows.push({
            item_number: item,
            description: "(not on slip)",
            qty_expected: 0,
            qty_scanned: got,
            qty_missing: 0,
          });
        }
      });

      rows.sort((a, b) => a.item_number.localeCompare(b.item_number));
      setRecon(rows);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Reconcile failed");
      Alert.alert("Reconcile failed", e?.message ?? "Check Supabase policies/tables");
    } finally {
      setReconLoading(false);
    }
  };

  const renderRow = ({ item }: { item: ReconRow }) => {
    const status =
      item.qty_missing === 0
        ? item.qty_scanned >= item.qty_expected
          ? "ok"
          : "partial"
        : "missing";
    const color = status === "ok" ? "#5bd17a" : status === "partial" ? "#f5d06f" : "#ff6b6b";

    return (
      <View style={[styles.row, { borderLeftColor: color }]}>
        <Text style={styles.rowText}>{item.item_number}</Text>
        <Text style={styles.rowMeta}>
          exp {item.qty_expected} • got {item.qty_scanned} • miss {item.qty_missing}
        </Text>
        {item.description ? <Text style={styles.rowDesc}>{item.description}</Text> : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* CAMERA */}
      <CameraView
        style={styles.camera}
        // You can narrow types if you want fewer false positives:
        // @ts-ignore (SDK type variations)
        // barcodeScannerSettings={{ barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code128"] }}
        onBarcodeScanned={scanned ? undefined : handleBarcode}
      />

      {/* HUD */}
      <View style={styles.overlay}>
        <Text style={styles.hudLine}>PO: {po || "(none)"}</Text>
        <Text style={styles.hudLine}>Status: {statusText}</Text>
        {last && <Text style={styles.hudLine}>Last: {last}</Text>}
        {error && <Text style={styles.hudErr}>Error: {error}</Text>}
      </View>

      {/* RECON RESULTS */}
      {reconLoading ? (
        <View style={styles.panel}>
          <ActivityIndicator />
          <Text style={styles.subtle}>Reconciling PO {po}…</Text>
        </View>
      ) : recon && recon.length > 0 ? (
        <View style={[styles.panel, { maxHeight: 280 }]}>
          <Text style={styles.title}>Reconcile — PO {po}</Text>
          <FlatList data={recon} keyExtractor={(r) => r.item_number} renderItem={renderRow} />
        </View>
      ) : (
        <View style={styles.panel}>
          <Text style={styles.subtle}>No reconciliation yet.</Text>
        </View>
      )}

      {/* CONTROLS */}
      <View style={styles.controls}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>PO Number</Text>
            <TextInput
              value={po}
              onChangeText={setPo}
              placeholder="Enter PO"
              placeholderTextColor="#666"
              style={styles.input}
              autoCapitalize="characters"
            />
          </View>
        </View>

        <View style={{ height: 8 }} />
        <Button title="Scan again" onPress={() => setScanned(false)} />
        <View style={{ height: 8 }} />
        <Button title="Reconcile PO" onPress={fetchReconcile} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  overlay: {
    position: "absolute",
    top: 40,
    left: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
    padding: 8,
    borderRadius: 8,
  },
  hudLine: { color: "#fff", fontSize: 14, marginVertical: 2 },
  hudErr: { color: "#ff6b6b", marginTop: 4 },
  panel: {
    backgroundColor: "#111",
    borderTopWidth: 1,
    borderTopColor: "#222",
    padding: 12,
  },
  title: { color: "#fff", fontSize: 16, fontWeight: "600", marginBottom: 8 },
  subtle: { color: "#aaa" },
  controls: {
    backgroundColor: "#111",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#222",
  },
  label: { color: "#bbb", marginBottom: 6 },
  input: {
    color: "#fff",
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  row: {
    borderLeftWidth: 4,
    paddingLeft: 10,
    paddingVertical: 6,
    borderColor: "#333",
    marginBottom: 8,
  },
  rowText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  rowMeta: { color: "#ddd", marginTop: 2 },
  rowDesc: { color: "#bbb", marginTop: 2, fontStyle: "italic" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" },
  title2: { color: "#fff", fontSize: 18, fontWeight: "600", marginBottom: 6 },
});
