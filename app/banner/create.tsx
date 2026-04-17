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

const pricePerDay = 30;

/* ================= CLOUD FLARE UPLOAD SERVER (SAME AS ADS/REELS) ================= */
const BASE_URL = "https://nasara-upload-server.onrender.com";

/* ================= ALERT FIX ================= */
const showAlert = (title: string, message: string) => {
  if (typeof window !== "undefined") {
    window.alert(title + "\n\n" + message);
  } else {
    Alert.alert(title, message);
  }
};

/* ================= PRELOAD VIDEO (WEB ONLY) ================= */
const preloadVideo = (url: string) => {
  if (Platform.OS !== "web") return;

  try {
    const video = document.createElement("video");
    video.src = url;
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
  } catch (e) {
    console.log("preload failed:", e);
  }
};

/* ================= UPLOAD IMAGE OR VIDEO ================= */
const uploadMedia = async (fileOrUri: any, type: "image" | "video") => {
  const formData = new FormData();

  /* ================= WEB ================= */
  if (Platform.OS === "web") {
    let file: File;

    if (fileOrUri instanceof File) {
      file = fileOrUri;
    } else if (fileOrUri instanceof Blob) {
      file = new File(
        [fileOrUri],
        type === "video" ? "video.webm" : "image.jpg",
        { type: fileOrUri.type }
      );
    } else if (fileOrUri?.uri) {
      const res = await fetch(fileOrUri.uri);
      const blob = await res.blob();
      file = new File(
        [blob],
        type === "video" ? "video.mp4" : "image.jpg",
        { type: blob.type }
      );
    } else {
      throw new Error("Invalid file");
    }

    formData.append("file", file);
  }

  /* ================= MOBILE ================= */
  else {
    let uri = "";

    if (typeof fileOrUri === "string") {
      uri = fileOrUri;
    } else if (fileOrUri?.uri) {
      uri = fileOrUri.uri;
    }

    if (!uri) throw new Error("Invalid file");

    formData.append("file", {
      uri,
      type: type === "video" ? "video/mp4" : "image/jpeg",
      name:
        type === "video"
          ? `banner_video_${Date.now()}.mp4`
          : `banner_image_${Date.now()}.jpg`
    } as any);
  }

  /* ================= UPLOAD REQUEST ================= */
  const res = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: formData
  });

  const data = await res.json();

  if (!data.success || !data.url) {
    throw new Error("Upload failed");
  }

  const url = data.url;

  if (type === "video") {
    preloadVideo(url);
  }

  return url;
};

export default function CreateBanner() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [days, setDays] = useState("3");

  const [media, setMedia] = useState<any>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);

  const [loading, setLoading] = useState(false);
  const [payVisible, setPayVisible] = useState(false);
  const [bannerData, setBannerData] = useState<any>(null);

  const momoName = "NASARA MARKET";
  const momoNumber = "0539703374";
  const momoNetwork = "MTN";

  const totalAmount = Number(days || 0) * pricePerDay;

  /* ================= PICK MEDIA ================= */
  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8
    });

    if (result.canceled) return;

    const asset = result.assets[0];

    const type = asset.type === "video" ? "video" : "image";

    setMediaType(type);

    if (Platform.OS === "web") {
      setMedia(asset.file);
    } else {
      setMedia(asset.uri);
    }
  };

  /* ================= SUBMIT BANNER ================= */
  const submitBanner = async () => {
    if (!title.trim() || !link.trim() || !days.trim() || !media || !mediaType) {
      showAlert("Error", "Fill all fields and select media");
      return;
    }

    setLoading(true);

    let mediaUrl;

    try {
      mediaUrl = await uploadMedia(media, mediaType);
    } catch (e: any) {
      setLoading(false);
      showAlert("Upload Error", e.message);
      return;
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      showAlert("Login Required", "Please login first");
      return;
    }

    const { data, error } = await (supabase as any)
      .from("banner")
      .insert({
        user_id: user.id,
        title,
        link,
        image_url: mediaType === "image" ? mediaUrl : null,
        video_url: mediaType === "video" ? mediaUrl : null,
        media_type: mediaType,
        days: Number(days),
        amount: totalAmount,
        status: "pending",
        is_active: false
      })
      .select()
      .single();

    if (error) {
      setLoading(false);

      if (error.message?.includes("JWT expired")) {
        await supabase.auth.signOut();
        router.replace("/(auth)/login");
        return;
      }

      showAlert("Error", error.message);
      return;
    }

    setBannerData({ user, bannerId: data.id });
    setPayVisible(true);
    setLoading(false);
  };

  /* ================= PAYMENT ================= */
  const sendPayment = async () => {
    if (!bannerData) return;

    const code = "BANNER-" + Date.now();

    await (supabase as any).from("payments").insert({
      user_id: bannerData.user.id,
      product_type: "banner",
      amount: totalAmount,
      momo_name: momoName,
      momo_number: momoNumber,
      network: momoNetwork,
      code,
      status: "pending"
    });

    showAlert(
      "Request Sent ✅",
      `Banner Request Submitted!\n\nPay GH₵${totalAmount} to:\n${momoName}\n${momoNumber} (${momoNetwork})\n\nCode: ${code}`
    );

    setPayVisible(false);
    router.replace("/banner/my-banner");
  };

  /* ================= UI ================= */
  return (
    <>
      <ScrollView style={{ padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: "bold" }}>
          ♥️ Create Banner
        </Text>

        <Text style={{ marginTop: 12 }}>Banner Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Enter banner title"
          style={{ borderWidth: 1, padding: 12, borderRadius: 10 }}
        />

        <Text style={{ marginTop: 12 }}>Website Link</Text>
        <TextInput
          value={link}
          onChangeText={setLink}
          placeholder="https://yourwebsite.com"
          style={{ borderWidth: 1, padding: 12, borderRadius: 10 }}
        />

        <Text style={{ marginTop: 12 }}>Number of Days</Text>
        <TextInput
          value={days}
          onChangeText={setDays}
          keyboardType="numeric"
          style={{ borderWidth: 1, padding: 12, borderRadius: 10 }}
        />

        <Text style={{ fontWeight: "bold", marginVertical: 10 }}>
          Total Cost: GH₵ {totalAmount}
        </Text>

        <TouchableOpacity
          onPress={pickMedia}
          style={{
            backgroundColor: "#ddd",
            padding: 14,
            borderRadius: 10
          }}
        >
          <Text>Select Image / Video</Text>
        </TouchableOpacity>

        {/* PREVIEW */}
        {media && (
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontWeight: "bold" }}>
              Selected: {mediaType}
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={submitBanner}
          disabled={loading}
          style={{
            backgroundColor: "green",
            padding: 16,
            borderRadius: 12,
            marginTop: 20
          }}
        >
          <Text style={{ color: "white", textAlign: "center" }}>
            {loading ? "Submitting..." : "Submit Banner"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* PAYMENT MODAL */}
      <Modal transparent visible={payVisible}>
        <View style={{ flex: 1, backgroundColor: "#0007", justifyContent: "center", padding: 20 }}>
          <View style={{ backgroundColor: "white", padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold" }}>
              Banner Payment
            </Text>

            <Text style={{ marginTop: 10 }}>Pay To:</Text>
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

            <TouchableOpacity onPress={() => setPayVisible(false)}>
              <Text style={{ textAlign: "center", marginTop: 10, color: "red" }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}