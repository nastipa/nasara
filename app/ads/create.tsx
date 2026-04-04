import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { supabase } from "../../lib/supabase";

const PRICE_PER_DAY = 30;

const CLOUD_NAME = "ajars";
const UPLOAD_PRESET = "ajars_images";

/* ================= ALERT FIX ================= */
const showAlert = (title: string, message: string) => {
  if (typeof window !== "undefined") {
    window.alert(title + "\n\n" + message);
  } else {
    Alert.alert(title, message);
  }
};

export default function CreateAd() {

  const router = useRouter();

  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [days, setDays] = useState("3");

  const [image, setImage] = useState<any>(null);

  const [loading, setLoading] = useState(false);

  const [payVisible, setPayVisible] = useState(false);

  const [adData, setAdData] = useState<any>(null);

  const momoName = "NASARA MARKET";
  const momoNumber = "0539703374";
  const momoNetwork = "MTN";

  const totalAmount = Number(days || 0) * PRICE_PER_DAY;

  /* ================= PICK IMAGE ================= */

  const pickImage = async () => {

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8
    });

    if (result.canceled) return;

    const asset = result.assets[0];

    if (Platform.OS === "web") {
      setImage(asset.file);
    } else {
      setImage(asset.uri);
    }

  };

  /* ================= CLOUDINARY UPLOAD ================= */

  const uploadImage = async () => {

    if (!image) return null;

    const formData = new FormData();

    if (Platform.OS === "web") {

      formData.append("file", image);

    } else {

      formData.append("file", {
        uri: image,
        type: "image/jpeg",
        name: "ad.jpg"
      } as any);

    }

    formData.append("upload_preset", UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData
      }
    );

    const data = await response.json();

    if (!data.secure_url) {
      showAlert("Upload Error", "Image upload failed");
      return null;
    }

    return data.secure_url;

  };

  /* ================= SUBMIT AD ================= */

  const submitAd = async () => {

    if (!title.trim() || !link.trim() || !days.trim() || !image) {
      showAlert("Error", "Fill all fields and select image");
      return;
    }

    setLoading(true);

    const image_url = await uploadImage();

    if (!image_url) {
      setLoading(false);
      return;
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      showAlert("Login Required", "Please login first");
      setLoading(false);
      return;
    }

   const { data, error } = await (supabase as any)
  .from("ads")
  .insert([
    {
      user_id: user.id,
      title: title,
      link: link,
      image_url: image_url,
      days: Number(days),
      amount: totalAmount,
      status: "pending",
      is_active: false
    }
  ])
  .select()
  .single();

    if (error) {
  setLoading(false);

  /* 🔥 HANDLE JWT EXPIRED */
  if (error?.message?.includes("JWT expired")) {
    await supabase.auth.signOut();
    router.replace("/(auth)/login");
    return;
  }

  showAlert("Error", error.message);
  return;
}

setAdData({ user, adId: data.id });

    setPayVisible(true);

    setLoading(false);

  };

  /* ================= SEND PAYMENT ================= */

  const sendPayment = async () => {

    if (!adData) return;

    const code = "AD-" + Date.now();

    await (supabase as any)
      .from("payments")
      .insert({
        user_id: adData.user.id,
        product_type: "ad",
        amount: totalAmount,
        momo_name: momoName,
        momo_number: momoNumber,
        network: momoNetwork,
        code,
        status: "pending"
      });

    showAlert(
      "Request Sent ✅",
      `Ad Request Submitted!\n\nPay GH₵${totalAmount} to:\n${momoName}\n${momoNumber} (${momoNetwork})\n\nCode: ${code}`
    );

    setPayVisible(false);

    router.replace("/ads/my-ads");

  };

  /* ================= UI ================= */

  return (
    <>
      <ScrollView style={{ padding: 16 }}>

        <Text style={{ fontSize: 22, fontWeight: "bold" }}>
          📢 Create Advertisement
        </Text>

        <Text style={{ marginTop: 12 }}>Ad Title</Text>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Enter ad title"
          style={{
            borderWidth: 1,
            padding: 12,
            borderRadius: 10,
            marginBottom: 12
          }}
        />

        <Text>Website Link</Text>

        <TextInput
          value={link}
          onChangeText={setLink}
          placeholder="https://yourwebsite.com"
          style={{
            borderWidth: 1,
            padding: 12,
            borderRadius: 10,
            marginBottom: 12
          }}
        />

        <Text>Number of Days</Text>

        <TextInput
          value={days}
          onChangeText={setDays}
          keyboardType="numeric"
          style={{
            borderWidth: 1,
            padding: 12,
            borderRadius: 10,
            marginBottom: 12
          }}
        />

        <Text style={{ fontWeight: "bold", marginBottom: 10 }}>
          Total Cost: GH₵ {totalAmount}
        </Text>

        <TouchableOpacity
          onPress={pickImage}
          style={{
            backgroundColor: "#ddd",
            padding: 14,
            borderRadius: 10
          }}
        >
          <Text>Select Ad Image</Text>
        </TouchableOpacity>

        {image && (

          <Image
            source={{
              uri: Platform.OS === "web" ? URL.createObjectURL(image) : image
            }}
            style={{
              width: "100%",
              height: 200,
              borderRadius: 14,
              marginTop: 12,
              resizeMode: "contain",
              backgroundColor: "#f3f4f6"
            }}
          />

        )}

        <TouchableOpacity
          onPress={submitAd}
          disabled={loading}
          style={{
            backgroundColor: "green",
            padding: 16,
            borderRadius: 12,
            marginTop: 20
          }}
        >
          <Text style={{ color: "white", textAlign: "center" }}>
            {loading ? "Submitting..." : "Submit Ad"}
          </Text>
        </TouchableOpacity>

      </ScrollView>

      {/* PAYMENT MODAL */}

      <Modal transparent visible={payVisible}>

        <View
          style={{
            flex: 1,
            backgroundColor: "#0007",
            justifyContent: "center",
            padding: 20
          }}
        >

          <View style={{ backgroundColor: "white", padding: 20 }}>

            <Text style={{ fontSize: 18, fontWeight: "bold" }}>
              Advertisement Payment
            </Text>

            <Text style={{ marginTop: 10 }}>
              Pay To:
            </Text>

            <Text style={{ fontWeight: "bold" }}>
              {momoName} - {momoNumber}
            </Text>

            <Text style={{ marginTop: 12, fontWeight: "bold" }}>
              Total Amount: GH₵ {totalAmount}
            </Text>

            <TouchableOpacity
              onPress={sendPayment}
              style={{
                backgroundColor: "#2563eb",
                padding: 14,
                marginTop: 15
              }}
            >
              <Text style={{ color: "white", textAlign: "center" }}>
                Generate Payment Code
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPayVisible(false)}
            >
              <Text
                style={{
                  textAlign: "center",
                  marginTop: 10,
                  color: "red"
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>

          </View>

        </View>

      </Modal>
    </>
  );

}