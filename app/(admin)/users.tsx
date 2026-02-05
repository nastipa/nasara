import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

type Profile = {
  id: string;
  full_name: string | null;
  role: string | null;
  phone: string | null;
  location: string | null;
};

export default function AdminUsers() {
  const router = useRouter();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  /* 🔥 LOAD ALL USERS */
  const loadUsers = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role, phone, location")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("Error loading users:", error.message);
    } else {
      setUsers(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  /* ===== UI ===== */

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/(admin)")}>
          <Text style={styles.back}>⬅ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>All Users 👥</Text>
      </View>

      {/* USER LIST */}
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 40 }}>
            No users found
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>
              {item.full_name || "No name"}
            </Text>

            <Text style={styles.text}>Role: {item.role || "user"}</Text>
            <Text style={styles.text}>Phone: {item.phone || "-"}</Text>
            <Text style={styles.text}>Location: {item.location || "-"}</Text>
          </View>
        )}
      />
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
    backgroundColor: "white",
  },

  back: {
    color: "#2563eb",
    fontWeight: "bold",
    marginBottom: 6,
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
  },

  card: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },

  name: {
    fontSize: 16,
    fontWeight: "bold",
  },

  text: {
    marginTop: 4,
    color: "#444",
  },
});