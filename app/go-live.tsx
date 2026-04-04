import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

const CLOUD_NAME = "ajars";
const UPLOAD_PRESET_IMAGES = "ajars_images";
const UPLOAD_PRESET_VIDEOS = "ajars_videos";

type LiveSession = {
  id: number;
};

export default function GoLiveScreen() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [itemTitle, setItemTitle] = useState("");
  const [price, setPrice] = useState("");

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  const [videoUri, setVideoUri] = useState<string | null>(null);

  const [live, setLive] = useState<LiveSession | null>(null);
  const [loading, setLoading] = useState(false);

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

  /* ================= PICK VIDEO ================= */
  const pickVideo = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 1,
    });

    if (!res.canceled) {
      setVideoUri(res.assets[0].uri);
    }
  };

  /* ================= CLOUDINARY IMAGE UPLOAD ================= */
  const uploadLiveImage = async () => {
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

  /* ================= CLOUDINARY VIDEO UPLOAD ================= */
  const uploadLiveVideo = async (uri: string) => {
    const formData = new FormData();

    if (Platform.OS === "web") {
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append("file", blob);
    } else {
      formData.append("file", {
        uri: uri,
        type: "video/mp4",
        name: "upload.mp4",
      } as any);
    }

    formData.append("upload_preset", UPLOAD_PRESET_VIDEOS);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
      {
        method: "POST",
        body: formData,
    }
    );

    const data = await res.json();

    if (!data.secure_url) {
      throw new Error("Video upload failed");
    }

    return data.secure_url;
  };

  /* ================= START LIVE ================= */
  const startLive = async () => {
    if (!title.trim()) {
      Alert.alert("Enter live title");
      return;
    }

    setLoading(true);

    const auth = await supabase.auth.getUser();

    if (!auth.data.user) {
      setLoading(false);
      Alert.alert("Login required");
      return;
    }

    const profileRes = await (supabase as any)
      .from("profiles")
      .select("momo_name, momo_number")
      .eq("id", auth.data.user.id)
      .single();

    if (!profileRes.data?.momo_name || !profileRes.data?.momo_number) {
      setLoading(false);
      Alert.alert(
        "MoMo Required",
        "Please add your MoMo account in Profile before going live"
      );
      return;
    }

    const res = await (supabase as any)
      .from("live_sessions")
      .insert({
        seller_id: auth.data.user.id,
        title: title.trim(),
        is_live: true,
        momo_name: profileRes.data.momo_name,
        momo_number: profileRes.data.momo_number,
      })
      .select("id")
      .single();

    setLoading(false);

    if (res.error || !res.data) {
      Alert.alert("Failed to start live");
      return;
    }

    setLive({ id: res.data.id });
  };

  /* ================= ADD ITEM ================= */
  const addItem = async () => {
    if (!live) {
      Alert.alert("Start live first");
      return;
    }

    if (!itemTitle.trim() || !price.trim()) {
      Alert.alert("Enter item and price");
      return;
    }

    setLoading(true);

    try {
      let imageUrl: string | null = null;
      let videoUrl: string | null = null;

      if (imageUri) {
        imageUrl = await uploadLiveImage();
      }

      if (videoUri) {
        videoUrl = await uploadLiveVideo(videoUri);
      }

      const res = await (supabase as any).from("live_items").insert({
        live_session_id: live.id,
        title: itemTitle.trim(),
        price: Number(price),
        image_url: imageUrl,
        video_url: videoUrl,
      });

      if (res.error) throw res.error;

      setItemTitle("");
      setPrice("");
      setImageUri(null);
      setImageBase64(null);
      setVideoUri(null);

      Alert.alert("Item added successfully");
    } catch (e: any) {
      Alert.alert("Failed to add item", e.message);
    }

    setLoading(false);
  };

  /* ================= END LIVE ================= */
  const endLive = async () => {
    if (!live) return;

    await (supabase as any)
      .from("live_sessions")
      .update({ is_live: false })
      .eq("id", live.id);

    setLive(null);
    router.replace("/(tabs)/browse");
  };

  /* ================= UI ================= */
  return (
    <View
      style={{
        flex: 1,
        padding: 20,
        backgroundColor: "#ffffff",
      }}
    >
      <Text style={{ fontSize: 22, fontWeight: "600", color: "#000" }}>
        Go Live
      </Text>

      {!live && (
        <>
          <Text style={{ marginTop: 12, fontWeight: "bold", color: "#000" }}>
            Live Title
          </Text>

          <TextInput
            placeholder="Enter live title"
            placeholderTextColor="#888"
            value={title}
            onChangeText={setTitle}
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              padding: 12,
              marginVertical: 12,
              backgroundColor: "#fff",
              color: "#000",
            }}
          />

          <TouchableOpacity
            onPress={startLive}
            disabled={loading}
            style={{ backgroundColor: "red", padding: 14 }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", textAlign: "center" }}>
                Start Live
              </Text>
            )}
          </TouchableOpacity>
        </>
      )}

      {live && (
        <>
          <Text style={{ marginTop: 20, fontWeight: "bold", color: "#000" }}>
            Item Title
          </Text>

          <TextInput
            placeholder="Enter item title"
            placeholderTextColor="#888"
            value={itemTitle}
            onChangeText={setItemTitle}
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              padding: 12,
              marginVertical: 8,
              backgroundColor: "#fff",
              color: "#000",
            }}
          />

          <Text style={{ marginTop: 10, fontWeight: "bold", color: "#000" }}>
            Price
          </Text>

          <TextInput
            placeholder="Enter price"
            placeholderTextColor="#888"
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              padding: 12,
              backgroundColor: "#fff",
              color: "#000",
            }}
          />

          <Text style={{ marginTop: 14, fontWeight: "bold", color: "#000" }}>
            Item Image
          </Text>

          <TouchableOpacity onPress={pickImage}>
            <Text style={{ color: "blue", marginVertical: 6 }}>
              Pick Image
            </Text>
          </TouchableOpacity>

          {imageUri && (
            <Image source={{ uri: imageUri }} style={{ height: 120 }} />
          )}

          <Text style={{ marginTop: 14, fontWeight: "bold", color: "#000" }}>
            Item Video (Optional)
          </Text>

          <TouchableOpacity onPress={pickVideo}>
            <Text style={{ color: "blue", marginVertical: 6 }}>
              Pick Video
            </Text>
          </TouchableOpacity>

          {videoUri && (
            <Text style={{ marginTop: 4, fontSize: 12, color: "#000" }}>
              Video Selected ✅
            </Text>
          )}

          <TouchableOpacity
            onPress={addItem}
            disabled={loading}
            style={{
              backgroundColor: "#16a34a",
              padding: 14,
              marginTop: 12,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", textAlign: "center" }}>
                Add Item
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={endLive}
            style={{
              backgroundColor: "#111827",
              padding: 14,
              marginTop: 16,
            }}
          >
            <Text style={{ color: "#fff", textAlign: "center" }}>
              End Live
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}