import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function CreateAd() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [days, setDays] = useState("1");

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const pricePerDay = 5;
  const amount = Number(days) * pricePerDay;

  /* ===== PICK IMAGE ===== */
  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      base64: true, // ✅ MUST BE TRUE
    });

    if (!res.canceled) {
      setImageUri(res.assets[0].uri);
      setImageBase64(res.assets[0].base64 || null);
    }
  };

  /* ===== SAFE EXPO UPLOAD (BASE64 FIX) ===== */
  const uploadImage = async () => {
    if (!imageBase64) throw new Error("No image selected");

    const fileName = "ads_" + Date.now() + ".jpg";

    // ✅ Convert base64 → bytes
    const bytes = Uint8Array.from(
      atob(imageBase64),
      (c) => c.charCodeAt(0)
    );

    const { error } = await supabase.storage
      .from("ads")
      .upload(fileName, bytes, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) throw error;

    const publicUrl = supabase.storage
      .from("ads")
      .getPublicUrl(fileName).data.publicUrl;

    return publicUrl;
  };

  /* ===== SUBMIT ===== */
  const submitAd = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      if (!imageUri) throw new Error("Image required");

      const auth = await supabase.auth.getUser();
      if (!auth.data.user) throw new Error("Not logged in");

      // ✅ Upload properly
      const imageUrl = await uploadImage();

      // CREATE AD
      const { error } = await (supabase as any).from("ads").insert({
        user_id: auth.data.user.id,
        title,
        link,
        days: Number(days),
        amount,
        image_url: imageUrl,
        position: "feed",
        status: "pending",
        is_active: false,
      });

      if (error) throw error;

      // Notify admin
      await (supabase as any).from("notifications").insert({
        is_admin: true,
        message: "New advertisement awaiting approval",
      });

      // ✅ MOMO PAYMENT MESSAGE RESTORED
      const { data: admin } = await (supabase as any)
        .from("profiles")
        .select("momo_name, momo_number")
        .eq("is_admin", true)
        .single();

      const message =
        "Send " +
        amount +
        " GHS to:\n\n" +
        admin?.momo_name +
        "\n" +
        admin?.momo_number +
        "\n\nThen wait for admin approval.";

      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Pay for Advertisement", message);
      }

      router.replace("/(tabs)/browse");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to submit ad");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>
        Create Advertisement
      </Text>

      <Text style={{ marginTop: 10 }}>Ad Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        style={{ borderWidth: 1, padding: 12 }}
      />

      <Text style={{ marginTop: 10 }}>Link (optional)</Text>
      <TextInput
        value={link}
        onChangeText={setLink}
        style={{ borderWidth: 1, padding: 12 }}
      />

      <Text style={{ marginTop: 10 }}>Number of Days</Text>
      <TextInput
        keyboardType="number-pad"
        value={days}
        onChangeText={setDays}
        style={{ borderWidth: 1, padding: 12 }}
      />

      <TouchableOpacity onPress={pickImage}>
        <Text style={{ color: "blue", marginTop: 10 }}>
          Pick Image
        </Text>
      </TouchableOpacity>

      {imageUri && (
        <Image
          source={{ uri: imageUri }}
          style={{ height: 120, marginTop: 10 }}
        />
      )}

      <Text style={{ marginTop: 10 }}>
        Total: {amount} GHS
      </Text>

      <TouchableOpacity
        disabled={submitting}
        onPress={submitAd}
        style={{
          backgroundColor: submitting ? "#999" : "green",
          padding: 14,
          marginTop: 20,
        }}
      >
        <Text style={{ color: "white", textAlign: "center" }}>
          {submitting ? "Submitting..." : "Submit & Pay"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}