import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { useAdmin } from "../../lib/useAdmin";

export default function AdminHome() {
  const router = useRouter();
  const isAdmin = useAdmin();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin !== null) {
      setLoading(false);
    }
  }, [isAdmin]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Text style={styles.denied}>Access Denied 🚫</Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => router.replace("/browse")}
        >
          <Text style={styles.btnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Dashboard 👑</Text>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => router.push("/ads")}
      >
        <Text style={styles.btnText}>📢 Manage Advertisements</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => router.push("/promoted")}
      >
        <Text style={styles.btnText}>⭐ Manage Promoted Items</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => router.push("/boost")}
      >
        <Text style={styles.btnText}>🚀 Manage Boost Requests</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => router.push("/users")}
      >
        <Text style={styles.btnText}>👥 View Users</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.btn}
        onPress={() => router.push("/banner")}
      >
        <Text style={styles.btnText}>♥️ Manager Banners</Text>
      </TouchableOpacity>

       <TouchableOpacity
       onPress={() => router.push("/(admin)/analytics")}
        style={styles.btn}
>
      <Text style={styles.btnText}>📊 Analytics Dashboard</Text>
        </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btn, styles.secondary]}
        onPress={() => router.replace("/browse")}
      >
        <Text style={styles.btnText}>⬅ Back to Home</Text>
      </TouchableOpacity>
      

      <TouchableOpacity
        style={[styles.btn, styles.danger]}
        onPress={async () => {
          await supabase.auth.signOut();
          router.replace("/browse");
        }}
      >
        <Text style={styles.btnText}>Logout 🚪</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 24, textAlign: "center" },
  denied: { fontSize: 18, fontWeight: "bold", color: "red", marginBottom: 20 },
  btn: { backgroundColor: "#2563eb", padding: 16, borderRadius: 8, marginBottom: 12 },
  secondary: { backgroundColor: "#6b7280" },
  danger: { backgroundColor: "#ef4444" },
  btnText: { color: "white", fontSize: 16, fontWeight: "bold", textAlign: "center" },
});