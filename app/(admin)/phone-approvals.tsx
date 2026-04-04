import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

const CLOUD_NAME = "nasara123";

export default function PhoneApprovalsScreen() {
  const router = useRouter();

  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  /* ================= LOAD PENDING ================= */
  const loadPendingVerifications = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("phone_verifications")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      Alert.alert("Error", error.message);
      setLoading(false);
      return;
    }

    /* ✅ CLOUDINARY: file_path already contains the image URL */
    const withImages = (data || []).map((item: any) => ({
      ...item,
      imageUrl: item.file_path || null,
    }));

    setPendingUsers(withImages);
    setLoading(false);
  };

  useEffect(() => {
    loadPendingVerifications();
  }, []);

  /* ================= APPROVE ================= */
  const approveUser = async (userId: string, phone: string) => {
    try {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .neq("id", userId)
        .maybeSingle();

      if (existing) {
        Alert.alert("Error", "Phone number already used.");
        return;
      }

      const { error: profileError } = await (supabase as any)
        .from("profiles")
        .update({
          phone: phone,
          phone_verified: true,
        })
        .eq("id", userId)
        .select();

      if (profileError) {
        console.log(profileError);
        throw profileError;
      }

      await (supabase as any)
        .from("phone_verifications")
        .update({ status: "approved" })
        .eq("user_id", userId);

      Alert.alert("Approved", "User approved successfully.");

      loadPendingVerifications();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  /* ================= REJECT ================= */
  const rejectUser = async (userId: string) => {
    try {
      const { error: verifyError } = await (supabase as any)
        .from("phone_verifications")
        .update({ status: "rejected" })
        .eq("user_id", userId);

      if (verifyError) throw verifyError;

      setPendingUsers((prev) => prev.filter((u) => u.user_id !== userId));

      Alert.alert("Rejected ❌", "User rejected.");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pending Phone Verifications</Text>

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.push("/(admin)")}
      >
        <Text style={styles.backText}>⬅ Back to Admin</Text>
      </TouchableOpacity>

      {pendingUsers.length === 0 && (
        <Text style={styles.empty}>No pending phone verifications.</Text>
      )}

      <FlatList
        data={pendingUsers}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={loadPendingVerifications}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>User ID: {item.user_id}</Text>

            <Text style={styles.text}>Phone: {item.phone_number}</Text>

            {item.imageUrl && (
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.image}
                resizeMode="contain"
              />
            )}

            <View style={styles.row}>
              <TouchableOpacity
                style={styles.approveBtn}
                onPress={() =>
                  approveUser(item.user_id, item.phone_number)
                }
              >
                <Text style={styles.btnText}>Approve</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => rejectUser(item.user_id)}
              >
                <Text style={styles.btnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },

  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 14,
  },

  backBtn: {
    backgroundColor: "#111827",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },

  backText: {
    color: "white",
    textAlign: "center",
    fontWeight: "600",
  },

  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "#555",
  },

  card: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
  },

  name: { fontSize: 15, fontWeight: "700" },

  text: {
    marginTop: 4,
    fontSize: 14,
    color: "#111",
  },

  image: {
    width: "100%",
    height: 300,
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
  },

  row: { flexDirection: "row", marginTop: 12 },

  approveBtn: {
    flex: 1,
    backgroundColor: "green",
    padding: 12,
    borderRadius: 8,
    marginRight: 6,
    alignItems: "center",
  },

  rejectBtn: {
    flex: 1,
    backgroundColor: "red",
    padding: 12,
    borderRadius: 8,
    marginLeft: 6,
    alignItems: "center",
  },

  btnText: { color: "white", fontWeight: "700" },
});