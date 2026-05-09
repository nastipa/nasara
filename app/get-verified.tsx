import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";

/* ================= UPLOAD ================= */
const uploadImage = async (uri: string): Promise<string> => {
  const formData = new FormData();

  let fileUri = uri;
  if (!uri.startsWith("file://")) fileUri = "file://" + uri;

  formData.append("file", {
    uri: fileUri,
    name: "verification.jpg",
    type: "image/jpeg",
  } as any);

  const xhr = new XMLHttpRequest();

  return new Promise((resolve, reject) => {
    xhr.open("POST", "https://nasara-upload-server.onrender.com/upload");

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (!data?.url) return reject("Upload failed");
        resolve(data.url);
      } catch {
        reject("Invalid server response");
      }
    };

    xhr.onerror = () => reject("Network error");

    xhr.send(formData);
  });
};

export default function GetVerifiedScreen() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [paymentRef, setPaymentRef] = useState("");

  const [showPayment, setShowPayment] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);
  const [loading, setLoading] = useState(false);

  /* ================= PICK IMAGE ================= */
  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {
      Alert.alert("Permission needed");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async () => {
    if (!businessName.trim()) {
      Alert.alert("Enter business name");
      return;
    }

    if (!imageUri) {
      Alert.alert("Upload ID image");
      return;
    }

    if (!hasPaid) {
      setShowPayment(true);
      return;
    }

    if (!paymentRef.trim()) {
      Alert.alert("Enter payment reference");
      return;
    }

    setLoading(true);

    try {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user) throw new Error("User not found");

      const imageUrl = await uploadImage(imageUri);

      const { error } = await (supabase as any)
        .from("profiles")
        .update({
          business_name: businessName,
          verification_document: imageUrl,
          verification_status: "pending",
          payment_status: "paid",
          payment_reference: paymentRef,
          verification_submitted_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      Alert.alert("Submitted", "Waiting for admin approval");
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  /* ================= PAYMENT ================= */
  const confirmPayment = () => {
    if (!paymentRef.trim()) {
      Alert.alert("Enter payment reference");
      return;
    }

    setHasPaid(true);
    setShowPayment(false);

    Alert.alert("Payment recorded", "Now click submit");
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
      <Text style={{ fontSize: 24, textAlign: "center", marginBottom: 20 }}>
        Get Verified
      </Text>

      <TextInput
        placeholder="Business Name"
        value={businessName}
        onChangeText={setBusinessName}
        style={{ borderWidth: 1, padding: 12, marginBottom: 15 }}
      />

      <TouchableOpacity onPress={pickImage} style={{ backgroundColor: "#2563eb", padding: 12 }}>
        <Text style={{ color: "#fff", textAlign: "center" }}>
          Upload ID Image
        </Text>
      </TouchableOpacity>

      {imageUri && (
        <Image source={{ uri: imageUri }} style={{ height: 150, marginVertical: 10 }} />
      )}

      <TouchableOpacity onPress={handleSubmit} style={{ backgroundColor: "#16a34a", padding: 12 }}>
        <Text style={{ color: "#fff", textAlign: "center" }}>
          Submit Verification
        </Text>
      </TouchableOpacity>

      {/* PAYMENT MODAL */}
      <Modal visible={showPayment} transparent>
        <View style={{ flex: 1, backgroundColor: "#000000aa", justifyContent: "center", padding: 20 }}>
          <View style={{ backgroundColor: "#fff", padding: 20, borderRadius: 10 }}>
            <Text style={{ fontWeight: "bold" }}>Monthly Fee: GHS 100</Text>

            <Text style={{ marginTop: 10 }}>MoMo Name: Nasara</Text>
            <Text>Number: 0539703374</Text>
            <Text>Network: MTN</Text>

            <TextInput
              placeholder="Enter payment reference"
              value={paymentRef}
              onChangeText={setPaymentRef}
              style={{ borderWidth: 1, marginTop: 10, padding: 10 }}
            />

            <TouchableOpacity onPress={confirmPayment} style={{ backgroundColor: "green", padding: 10, marginTop: 10 }}>
              <Text style={{ color: "#fff", textAlign: "center" }}>
                I Have Paid
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}