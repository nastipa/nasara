import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

type Report = {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  reported_item_id: string | null;
  reported_type: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
};

export default function AdminReportsScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);

    const { data, error } = await (supabase as any)
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("Fetch error:", error.message);
    } else if (data) {
      setReports(data);
    }

    setLoading(false);
  };

  // ✅ FIXED FUNCTION
  const markResolved = async (id: string) => {
    console.log("Updating report:", id);

    // 🔥 Optimistic UI update (instant)
    setReports((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: "resolved" } : r
      )
    );

    const { error } = await (supabase as any)
      .from("reports")
      .update({ status: "resolved" })
      .eq("id", id)
      .select(); // ensures update actually executes

    if (error) {
      console.log("Update failed:", error.message);
      Alert.alert("Error", error.message);

      // rollback if failed
      fetchReports();
    }
  };

  const renderItem = ({ item }: { item: Report }) => (
    <View style={styles.card}>
      <Text style={styles.type}>
        🚨 {item.reported_type.toUpperCase()}
      </Text>

      <Text style={styles.label}>
        Reporter: {item.reporter_id}
      </Text>

      {item.reported_user_id && (
        <Text style={styles.label}>
          Reported User: {item.reported_user_id}
        </Text>
      )}

      {item.reported_item_id && (
        <Text style={styles.label}>
          Reported Item: {item.reported_item_id}
        </Text>
      )}

      <Text style={styles.reason}>
        Reason: {item.reason}
      </Text>

      {item.details ? (
        <Text style={styles.details}>
          Details: {item.details}
        </Text>
      ) : null}

      {/* ✅ FIXED STATUS DISPLAY */}
      <Text style={styles.status}>
        Status:{" "}
        {item.status === "resolved"
          ? "✅ Resolved"
          : "⏳ Pending"}
      </Text>

      {/* ✅ BUTTON HIDES AFTER RESOLVED */}
      {item.status !== "resolved" && (
        <TouchableOpacity
          style={styles.resolveBtn}
          onPress={() => markResolved(item.id)}
        >
          <Text style={styles.btnText}>
            Mark as Resolved
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      data={reports}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={{ padding: 16 }}
      refreshing={loading}
      onRefresh={fetchReports}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text>No reports yet</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
  },
  type: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 5,
  },
  label: {
    fontSize: 12,
    color: "#555",
  },
  reason: {
    marginTop: 6,
    fontWeight: "bold",
  },
  details: {
    marginTop: 5,
    color: "#444",
  },
  status: {
    marginTop: 10,
    fontWeight: "bold",
  },
  resolveBtn: {
    marginTop: 10,
    backgroundColor: "#22c55e",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: {
    color: "white",
    fontWeight: "bold",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});