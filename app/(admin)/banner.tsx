import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { useAdmin } from "../../lib/useAdmin";

const showAlert = (title: string, message: string) => {
  if (typeof window !== "undefined") {
    window.alert(title + "\n\n" + message);
  } else {
    Alert.alert(title, message);
  }
};

export default function AdminBanner() {
  const router = useRouter();
  const isAdmin = useAdmin();

  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /* ===== LOAD PENDING BANNERS ===== */
  const loadPending = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("banner")
      .select("*")
      .eq("is_active", false) // admin approves inactive
      .order("created_at", { ascending: false });

    if (error) {
      showAlert("Error", error.message);
      setBanners([]);
    } else {
      setBanners(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) loadPending();
  }, [isAdmin]);

  /* ===== APPROVE ===== */
  const approveBanner = async (banner: any) => {
    if (!banner?.id) {
      showAlert("Error", "Banner ID missing");
      return;
    }

    const { error } = await (supabase as any)
      .from("banner")
      .update({
        is_active: true,
        status: "active",
      })
      .eq("id", banner.id);

    if (error) {
      showAlert("Approval Failed", error.message);
      return;
    }

    showAlert("Approved", "Banner is now live");

    // remove immediately from list
    setBanners((prev) => prev.filter((b) => b.id !== banner.id));
  };

  if (!isAdmin) {
    return <Text style={styles.center}>Not authorized</Text>;
  }

  if (loading) {
    return <Text style={styles.center}>Loading...</Text>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Pending Banners</Text>

      {banners.length === 0 && (
        <Text style={styles.center}>No pending banners</Text>
      )}

      {banners.map((b) => (
        <View key={String(b.id)} style={styles.card}>
          {b.image_url ? (
            <Image source={{ uri: b.image_url }} style={styles.image} />
          ) : (
            <Text>No image</Text>
          )}

          <Text style={styles.title}>{b.title}</Text>
          <Text>
            {b.amount} GHS · {b.days} days
          </Text>

          <TouchableOpacity
            style={styles.approveBtn}
            onPress={() => approveBanner(b)}
          >
            <Text style={styles.approveText}>Approve</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.replace("/(admin)")}
      >
        <Text style={styles.backText}>Back to Admin Dashboard</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { textAlign: "center", marginTop: 40 },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 12 },
  card: { backgroundColor: "#fff", padding: 12, marginTop: 12 },
  image: { height: 140, marginBottom: 8 },
  title: { fontWeight: "bold", marginBottom: 4 },
  approveBtn: { backgroundColor: "green", padding: 10, marginTop: 8 },
  approveText: { color: "white", textAlign: "center" },
  backBtn: {
    backgroundColor: "#111827",
    padding: 14,
    marginTop: 24,
    borderRadius: 8,
  },
  backText: { color: "white", textAlign: "center" },
});