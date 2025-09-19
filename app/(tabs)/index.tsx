import React, { useState } from "react";
import { View, Text, Button, StyleSheet, ActivityIndicator, Platform, TextInput } from "react-native";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { CameraView, useCameraPermissions } from "expo-camera";

export default function ScannerTest() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [last, setLast] = useState<string | null>(null);

  if (Platform.OS !== 'web' && !permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.text}>Loading camera permission…</Text>
      </View>
    );
  }

  if (Platform.OS !== 'web' && permission && !permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>We need your permission to use the camera</Text>
        <Button title="Grant permission" onPress={requestPermission} />
      </View>
    );
  }

  const handleBarcode = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setLast(data);
    console.log("📷 RAW SCAN:", data);

    try {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id;
      const { error } = await supabase.from("scans").insert({ code: data, device: "android", user_id: userId });
      if (error) throw error;
      toast("Scan saved");
    } catch (e: any) {
      console.warn("Save failed", e?.message || e);
      toast("Upload failed — check Supabase env");
    }
  };

  // Web fallback: manual entry (barcode scanning not supported in Expo Go web)
  if (Platform.OS === 'web') {
    const [manual, setManual] = useState('');
    const saveManual = async () => {
      setLast(manual);
      try {
        const { data: u } = await supabase.auth.getUser();
        const userId = u.user?.id;
        const { error } = await supabase.from("scans").insert({ code: manual, device: "web", user_id: userId });
        if (error) throw error;
        toast("Saved");
        setManual('');
      } catch (e: any) {
        toast("Upload failed — check Supabase env");
      }
    };
    return (
      <View style={styles.container}>
        <View style={styles.panel}>
          <Text style={styles.text}>Scanner not available on web.</Text>
          <Text style={styles.text}>Enter a code to simulate a scan:</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TextInput
              value={manual}
              onChangeText={setManual}
              placeholder="Type or paste code"
              placeholderTextColor="#888"
              style={{ flex: 1, backgroundColor: '#111', color: '#fff', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 6 }}
            />
            <Button title="Save" onPress={saveManual} />
          </View>
          {last && <Text style={[styles.text, { marginTop: 12 }]}>Last: {last}</Text>}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: [
            "qr",
            "code128",
            "code39",
            "code93",
            "ean13",
            "ean8",
            "upc_a",
            "upc_e",
            "itf14",
            "pdf417",
            "codabar",
            "datamatrix"
          ],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcode}
      />

      <View style={styles.panel}>
        <Text style={styles.text}>Status: {scanned ? "Paused" : "Ready"}</Text>
        {last && <Text style={styles.text}>Last: {last}</Text>}
        <Button title="Scan again" onPress={() => setScanned(false)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  panel: { padding: 16, backgroundColor: "#111" },
  text: { color: "#fff", marginBottom: 8 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" },
});
