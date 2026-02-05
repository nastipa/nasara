import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { supabase } from "../../lib/supabase";

const DAILY_RATE = 5;

/* ===== SAFE ALERT ===== */
const showAlert = (title: string, message: string) => {
  if (typeof window !== "undefined") {
    window.alert(title + "\n\n" + message);
  } else {
    Alert.alert(title, message);
  }
};

export default function CreateBanner() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  /* ===== DAYS + AMOUNT ===== */
  const days = useMemo(() => {
    if (!endsAt) return 0;

    const diff =
      (new Date(endsAt).getTime() - new Date(today).getTime()) /
      (1000 * 60 * 60 * 24);

    return diff > 0 ? Math.ceil(diff) : 0;
  }, [endsAt]);

  const amount = days * DAILY_RATE;

  /* ===== PICK IMAGE ===== */
  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      base64: true,
    });

    if (!res.canceled) {
      setImageUri(res.assets[0].uri);
      setImageBase64(res.assets[0].base64 || null);
    }
  };

  /* ===== SAFE EXPO UPLOAD (BASE64 FIX) ===== */
  const uploadImage = async () => {
    if (!imageBase64) throw new Error("No image selected");

    const fileName = "banner_" + Date.now() + ".jpg";

    // ✅ Convert base64 → bytes
    const bytes = Uint8Array.from(atob(imageBase64), (c) =>
      c.charCodeAt(0)
    );

    const { error } = await supabase.storage
      .from("banner")
      .upload(fileName, bytes, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) throw error;

    const publicUrl = supabase.storage
      .from("banner")
      .getPublicUrl(fileName).data.publicUrl;

    return publicUrl;
  };

  /* ===== SUBMIT BANNER ===== */
  const submitBanner = async () => {
    if (loading) return;

    if (!title || !imageUri || days === 0) {
      showAlert("Error", "Fill all fields correctly");
      return;
    }

    setLoading(true);

    try {
      const auth = await supabase.auth.getUser();
      if (!auth.data.user) throw new Error("Not logged in");

      /* ===== ADMIN MOMO ===== */
      const { data: admins } = await (supabase as any)
        .from("profiles")
        .select("momo_name, momo_number")
        .eq("is_admin", true)
        .limit(1);

      if (!admins || admins.length === 0) {
        throw new Error("Admin MoMo not configured");
      }

      const admin = admins[0];

      /* ===== SHOW PAYMENT INFO FIRST ===== */
      showAlert(
        "Pay for Banner",
        "Send payment to:\n\n" +
          admin.momo_name +
          "\n" +
          admin.momo_number +
          "\n\nAmount: " +
          amount +
          " GHS\n\nAfter payment, wait for admin approval."
      );

      /* ===== UPLOAD IMAGE ===== */
      const imageUrl = await uploadImage();

      /* ===== SAVE BANNER REQUEST ===== */
      const { error } = await (supabase as any).from("banner").insert({
        user_id: auth.data.user.id,
        title,
        link,
        image_url: imageUrl,
        starts_at: today,
        ends_at: endsAt,
        days,
        amount,
        status: "pending",
        is_active: false,
      });

      if (error) throw error;

      showAlert("Submitted", "Banner submitted successfully!");

      /* RESET */
      setTitle("");
      setLink("");
      setEndsAt("");
      setImageUri(null);
      setImageBase64(null);

      router.replace("/(tabs)/browse");
    } catch (e: any) {
      showAlert("Error", e.message);
    }

    setLoading(false);
  };

  /* ===== UI ===== */
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Create Banner</Text>

      {/* TITLE */}
      <Text style={styles.label}>Banner Title</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter banner title"
        value={title}
        onChangeText={setTitle}
      />

      {/* LINK */}
      <Text style={styles.label}>Target Link</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter link (optional)"
        value={link}
        onChangeText={setLink}
      />

      {/* END DATE */}
      <Text style={styles.label}>End Date</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        value={endsAt}
        onChangeText={setEndsAt}
      />

      <Text style={styles.info}>
        Days: {days} | Amount: {amount} GHS
      </Text>

      {/* IMAGE */}
      <Text style={styles.label}>Banner Image</Text>
      <TouchableOpacity style={styles.pickBtn} onPress={pickImage}>
        <Text>Select Image</Text>
      </TouchableOpacity>

      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.image} />
      )}

      {/* SUBMIT */}
      <TouchableOpacity
        style={styles.submitBtn}
        onPress={submitBanner}
        disabled={loading}
      >
        <Text style={styles.submitText}>
          {loading ? "Submitting..." : "Submit Banner"}
        </Text>
      </TouchableOpacity>

      {/* BACK */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.replace("/")}
      >
        <Text style={styles.backText}>Back to Home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ===== STYLES ===== */
const styles = StyleSheet.create({
  container: { padding: 16 },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 12 },
  label: { marginTop: 10, fontWeight: "bold" },
  input: { borderWidth: 1, padding: 10, marginVertical: 6 },
  info: { fontWeight: "bold", marginVertical: 10 },
  pickBtn: { backgroundColor: "#eee", padding: 12, marginTop: 10 },
  image: { height: 180, marginTop: 10 },
  submitBtn: { backgroundColor: "green", padding: 14, marginTop: 20 },
  submitText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
  },
  backBtn: { marginTop: 14, padding: 12, backgroundColor: "#111827" },
  backText: { color: "white", textAlign: "center" },
});