import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, RefreshControl, StyleSheet, Button, Alert } from "react-native";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

type Scan = {
  id: string;
  code: string;
  created_at: string;
  device: string | null;
};

export default function InventoryList() {
  const [items, setItems] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data, error } = await supabase
        .from("scans")
        .select("id, code, created_at, device")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setItems(data ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load scans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const clearAll = useCallback(() => {
    Alert.alert("Clear all scans?", "This will delete recent scans.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const { data: u } = await supabase.auth.getUser();
            const userId = u.user?.id;
            if (!userId) {
              toast("Sign in required to delete scans");
              return;
            }
            const { error } = await supabase
              .from("scans")
              .delete()
              .gt("created_at", "1970-01-01")
              .eq('user_id', userId);
            if (error) throw error;
            toast("Scans cleared");
            load();
          } catch (e: any) {
            toast("Failed to clear scans");
          }
        },
      },
    ]);
  }, [load]);

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Button title="Refresh" onPress={load} />
        <View style={{ width: 12 }} />
        <Button title="Clear scans" color="#d9534f" onPress={clearAll} />
      </View>
      {error ? <Text style={styles.error}>Error: {error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.code}>{item.code}</Text>
            <Text style={styles.meta}>{new Date(item.created_at).toLocaleString()}</Text>
          </View>
        )}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}><Text style={styles.meta}>No scans yet</Text></View>
        ) : null}
        contentContainerStyle={items.length === 0 ? { flex: 1 } : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingVertical: 8 },
  toolbar: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 12, paddingBottom: 8 },
  row: { paddingHorizontal: 16, paddingVertical: 12, borderBottomColor: "#222", borderBottomWidth: StyleSheet.hairlineWidth },
  code: { color: "#fff", fontSize: 16, marginBottom: 4 },
  meta: { color: "#aaa", fontSize: 12 },
  error: { color: "#ff6b6b", padding: 12 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
});
