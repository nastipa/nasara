import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { supabase } from "../lib/supabase";

const CLOUD_NAME = "nasara123";
const UPLOAD_PRESET_IMAGES = "nasara_images";

export default function VerifyIdScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  /* ================= CHECK VERIFICATION STATUS ================= */
  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    setIsVerifying(true);

    try {
      const userRes = await supabase.auth.getUser();
      const user = userRes.data.user;
      if (!user) return;

      const { data: verifyRow } = await (supabase as any)
        .from("id_verifications")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();

      const status = verifyRow?.status;

      if (status === "pending" || status === "approved") {
        router.replace("/browse");
      }
    } catch (error) {
      console.error("Error checking verification status:", error);
    } finally {
      setIsVerifying(false);
    }
  };

  /* ================= PICK IMAGE ================= */
  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
     mediaTypes: ["images", "videos"],
      quality: 0.8,
      base64: true,
    });

    if (!res.canceled) {
      setImageUri(res.assets[0].uri);
      setImageBase64(res.assets[0].base64 || null);
    }
  };

  /* ================= CLOUDINARY IMAGE UPLOAD ================= */
  const uploadIdImage = async () => {
    if (!imageBase64) throw new Error("No image selected");

    const formData = new FormData();

    formData.append("file", `data:image/jpeg;base64,${imageBase64}`);
    formData.append("upload_preset", UPLOAD_PRESET_IMAGES);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await res.json();

    if (!data.secure_url) {
      throw new Error("Image upload failed");
    }

    return data.secure_url;
  };

  /* ================= SUBMIT ================= */
  const submitVerification = async () => {
    if (!fullName.trim() || !idNumber.trim() || !imageUri) {
      Alert.alert("Error", "All fields are required");
      return;
    }

    setLoading(true);

    try {
      const userRes = await supabase.auth.getUser();
      const user = userRes.data.user;
      if (!user) throw new Error("Not logged in");

      /* ================= UPLOAD IMAGE TO CLOUDINARY ================= */
      const imageUrl = await uploadIdImage();

      /* ================= SAVE DB RECORD ================= */
      await (supabase as any).from("id_verifications").insert({
        user_id: user.id,
        full_name: fullName.trim(),
        id_number: idNumber.trim(),
        file_path: imageUrl,
        status: "pending",
      });

      Alert.alert("Submitted ✅", "Verification pending approval");

      router.replace("/browse");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */
  if (isVerifying) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Checking verification status...</Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>
        Verify Your Identity
      </Text>

      <TextInput
        placeholder="Full Name"
        placeholderTextColor="#888"
        value={fullName}
        onChangeText={setFullName}
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          padding: 12,
          marginTop: 12,
          borderRadius: 8,
          backgroundColor: "#fff",
          color: "#000",
        }}
      />

      <TextInput
        placeholder="ID Number"
        placeholderTextColor="#888"
        value={idNumber}
        onChangeText={setIdNumber}
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          padding: 12,
          marginTop: 12,
          borderRadius: 8,
          backgroundColor: "#fff",
          color: "#000",
        }}
      />

      <TouchableOpacity onPress={pickImage} style={{ marginTop: 16 }}>
        <Text style={{ color: "blue" }}>Upload ID Image</Text>
      </TouchableOpacity>

      {imageUri && (
        <Image
          source={{ uri: imageUri }}
          style={{
            height: 180,
            marginTop: 12,
            borderRadius: 10,
            backgroundColor: "#eee",
          }}
        />
      )}

      <TouchableOpacity
        onPress={submitVerification}
        disabled={loading}
        style={{
          backgroundColor: loading ? "#999" : "green",
          padding: 14,
          marginTop: 20,
          borderRadius: 10,
        }}
      >
        <Text style={{ color: "#fff", textAlign: "center" }}>
          {loading ? "Submitting..." : "Submit Verification"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}