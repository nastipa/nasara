import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity
} from "react-native";
import { supabase } from "../lib/supabase";

const CLOUD_NAME = "ajars";
const UPLOAD_PRESET_IMAGES = "ajars_images";
const UPLOAD_PRESET_VIDEOS = "ajars_videos";

export default function GoAuctionScreen() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [duration, setDuration] = useState("5");
  const [loading, setLoading] = useState(false);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      quality: 1,
    });

    if (!result.canceled) {
      setVideoUri(result.assets[0].uri);
    }
  };

  /* ================= UPLOAD IMAGE (CLOUDINARY) ================= */
  const uploadImage = async (uri: string) => {
    const formData = new FormData();

    if (Platform.OS === "web") {
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append("file", blob);
    } else {
      formData.append("file", {
        uri,
        type: "image/jpeg",
        name: "auction_image.jpg",
      } as any);
    }

    formData.append("upload_preset", UPLOAD_PRESET_IMAGES);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();

    if (!data.secure_url) {
      throw new Error("Image upload failed");
    }

    return data.secure_url;
  };

  /* ================= UPLOAD VIDEO (CLOUDINARY) ================= */
  const uploadVideo = async (uri: string) => {
    setUploadingVideo(true);

    const formData = new FormData();

    if (Platform.OS === "web") {
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append("file", blob);
    } else {
      formData.append("file", {
        uri,
        type: "video/mp4",
        name: "auction_video.mp4",
      } as any);
    }

    formData.append("upload_preset", UPLOAD_PRESET_VIDEOS);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();

    setUploadingVideo(false);

    if (!data.secure_url) {
      throw new Error("Video upload failed");
    }

    return data.secure_url;
  };

  /* ================= START AUCTION ================= */
  const startAuction = async () => {
    if (!title.trim()) {
      Alert.alert("Missing Title", "Enter auction title.");
      return;
    }

    if (!startingPrice.trim()) {
      Alert.alert("Missing Price", "Enter starting price.");
      return;
    }

    if (!imageUri && !videoUri) {
      Alert.alert("Missing Media", "Upload image or video for buyers to see.");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert("Login Required", "Please login first.");
      setLoading(false);
      return;
    }

    try {
      const imageUrl = imageUri ? await uploadImage(imageUri) : null;
      const videoUrl = videoUri ? await uploadVideo(videoUri) : null;

      const { error } = await (supabase as any).from("auctions").insert({
        seller_id: user.id,
        title: title.trim(),
        starting_price: Number(startingPrice),
        duration_minutes: Number(duration),
        status: "live",

        image_url: imageUrl,
        video_url: videoUrl,
      });

      if (error) throw error;

      Alert.alert("Auction Started ✅", "Buyers can now join and bid!");

      router.replace("/browse");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }

    setLoading(false);
  };

  return (
  <ScrollView
    contentContainerStyle={{
      padding: 20,
      backgroundColor: "white",
      paddingBottom: 60,
    }}
  >
    <Text style={{ fontSize: 22, fontWeight: "bold" }}>
      🔥 Start Live Auction
    </Text>

    <Text style={{ marginTop: 15 }}>Auction Title</Text>
    <TextInput
      value={title}
      onChangeText={setTitle}
      placeholder="Example: iPhone 15 Auction"
      style={{
        borderWidth: 1,
        borderColor: "#ddd",
        padding: 12,
        borderRadius: 10,
        marginTop: 6,
      }}
    />

    <Text style={{ marginTop: 15 }}>Starting Price (GH₵)</Text>
    <TextInput
      value={startingPrice}
      onChangeText={setStartingPrice}
      keyboardType="numeric"
      placeholder="Example: 200"
      style={{
        borderWidth: 1,
        borderColor: "#ddd",
        padding: 12,
        borderRadius: 10,
        marginTop: 6,
      }}
    />

    <Text style={{ marginTop: 15 }}>Duration (Minutes)</Text>
    <TextInput
      value={duration}
      onChangeText={setDuration}
      keyboardType="numeric"
      placeholder="Example: 10"
      style={{
        borderWidth: 1,
        borderColor: "#ddd",
        padding: 12,
        borderRadius: 10,
        marginTop: 6,
      }}
    />

    <TouchableOpacity
      onPress={pickImage}
      style={{
        backgroundColor: "#eee",
        padding: 12,
        borderRadius: 10,
        marginTop: 20,
      }}
    >
      <Text style={{ textAlign: "center" }}>Upload Image</Text>
    </TouchableOpacity>

    {imageUri && (
      <Image
        source={{ uri: imageUri }}
        style={{
          width: "100%",
          height: 220,
          marginTop: 12,
          borderRadius: 12,
        }}
        resizeMode="cover"
      />
    )}

    <TouchableOpacity
      onPress={pickVideo}
      style={{
        backgroundColor: "#ddd",
        padding: 12,
        borderRadius: 10,
        marginTop: 15,
      }}
    >
      <Text style={{ textAlign: "center" }}>Upload Video</Text>
    </TouchableOpacity>

    {videoUri && (
      <Text style={{ color: "green", marginTop: 8 }}>
        Video selected
      </Text>
    )}

    {uploadingVideo && (
      <Text style={{ marginTop: 5 }}>Uploading video...</Text>
    )}

    <TouchableOpacity
      onPress={startAuction}
      disabled={loading}
      style={{
        backgroundColor: "black",
        padding: 14,
        borderRadius: 12,
        marginTop: 25,
      }}
    >
      <Text
        style={{
          color: "white",
          textAlign: "center",
          fontWeight: "bold",
        }}
      >
        {loading ? "Starting..." : "Start Auction 🔥"}
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      onPress={() => router.replace("/profile")}
      style={{
        marginTop: 20,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#ddd",
      }}
    >
      <Text style={{ textAlign: "center" }}>⬅ Back</Text>
    </TouchableOpacity>
  </ScrollView>
);
}