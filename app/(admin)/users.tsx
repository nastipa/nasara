import { useRouter } from "expo-router";
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

type Profile = {
  id: string;
  username: string | null;
  phone: string | null;
  location: string | null;
  barn_count: number;
  banned_until: string | null;
};

export default function AdminUsers() {
  const router = useRouter();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  /* 🔥 LOAD USERS + BARN COUNT */
  const loadUsers = async () => {
    setLoading(true);

    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, phone, location, banned_until")
      .order("created_at", { ascending: false });

    if (profileError) {
      console.log(profileError.message);
      setLoading(false);
      return;
    }

    const { data: barnData } = await supabase
      .from("barn")
      .select("user_id");

    const barnCountMap: Record<string, number> = {};

    barnData?.forEach((item: any) => {
      barnCountMap[item.user_id] =
        (barnCountMap[item.user_id] || 0) + 1;
    });

    const merged = profiles.map((user: any) => ({
      ...user,
      barn_count: barnCountMap[user.id] || 0,
    }));

    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  /* 🔥 TEMP BAN FUNCTION */
  const banUser = (userId: string) => {
    Alert.alert("Ban Duration", "Select ban duration", [
      {
        text: "6 Hours",
        onPress: () => applyBan(userId, 6),
      },
      {
        text: "12 Hours",
        onPress: () => applyBan(userId, 12),
      },
      {
        text: "1 Day",
        onPress: () => applyBan(userId, 24),
      },
      {
        text: "3 Days",
        onPress: () => applyBan(userId, 72),
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  };

  const applyBan = async (userId: string, hours: number) => {
    const bannedUntil = new Date(
      Date.now() + hours * 60 * 60 * 1000
    ).toISOString();

    const { error } = await (supabase as any)
      .from("profiles")
      .update({ banned_until: bannedUntil })
      .eq("id", userId);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    Alert.alert("User banned successfully");

    loadUsers();
  };

  /* 🔥 UNBAN */
  const unbanUser = async (userId: string) => {
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ banned_until: null })
      .eq("id", userId);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    loadUsers();
  };

  /* 🔥 CHECK IF BANNED */
  const isBanned = (bannedUntil: string | null) => {
    if (!bannedUntil) return false;
    return new Date(bannedUntil) > new Date();
  };

  /* UI LOADING */
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

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => {
          const banned = isBanned(item.banned_until);

          return (
            <View style={styles.card}>
              {/* USERNAME */}
              <Text style={styles.name}>
                {item.username || "No username"}
              </Text>

              {/* ROLE */}
              <Text style={styles.text}>
                Role: {item.barn_count > 0 ? "Seller 🛒" : "Buyer 🧑‍💻"}
              </Text>

              {/* PHONE */}
              <Text style={styles.text}>
                Phone: {item.phone || "-"}
              </Text>

              {/* LOCATION */}
              <Text style={styles.text}>
                Location: {item.location || "-"}
              </Text>

              {/* BARN COUNT */}
              <Text style={styles.text}>
                Barn Posts: {item.barn_count}
              </Text>

              {/* STATUS */}
              <Text style={styles.text}>
                Status: {banned ? "🚫 BANNED" : "✅ Active"}
              </Text>

              {/* BAN / UNBAN BUTTON */}
              {banned ? (
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: "#16a34a" }]}
                  onPress={() => unbanUser(item.id)}
                >
                  <Text style={styles.buttonText}>Unban</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: "#dc2626" }]}
                  onPress={() => banUser(item.id)}
                >
                  <Text style={styles.buttonText}>Ban User</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
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

  button: {
    marginTop: 10,
    padding: 10,
    borderRadius: 6,
  },

  buttonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
  },
});