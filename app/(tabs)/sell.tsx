import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function Sell() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // 🔥 NEGOTIABLE SWITCH (ONLY ADD FIELD, NOT MODIFY DB)
  const [isNegotiable, setIsNegotiable] = useState(false);

  // ================= IMAGE PICK (ANY IMAGE TYPE) =================
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  // ================= VIDEO PICK =================
  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      quality: 1,
    });

    if (!result.canceled) {
      setVideoUri(result.assets[0].uri);
    }
  };

  // ================= IMAGE UPLOAD (ANY FORMAT SAFE) =================
  const uploadImage = async (uri: string) => {
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();

    // detect extension safely
    const ext = uri.split(".").pop() || "jpg";
    const fileName = "image_" + Date.now() + "." + ext;

    const { error } = await supabase.storage
      .from("items")
      .upload(fileName, arrayBuffer, {
        contentType: "image/*",
        upsert: true,
      });

    if (error) throw error;

    return supabase.storage.from("items").getPublicUrl(fileName).data.publicUrl;
  };

  // ================= VIDEO UPLOAD =================
  const uploadVideo = async (uri: string) => {
    setUploadingVideo(true);

    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();

    const fileName = "video_" + Date.now() + ".mp4";

    const { error } = await supabase.storage
      .from("items")
      .upload(fileName, arrayBuffer, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (error) {
      setUploadingVideo(false);
      throw error;
    }

    const publicUrl = supabase.storage
      .from("items")
      .getPublicUrl(fileName).data.publicUrl;

    setUploadingVideo(false);

    return publicUrl;
  };

  // ================= POST ITEM =================
  const postItem = async () => {
    if (!title || !price || !phone) {
      Alert.alert("Error", "Title, price and phone are required");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert("Error", "Login required");
      setLoading(false);
      return;
    }

    try {
      let imageUrl: string | null = null;
      let videoUrl: string | null = null;

      if (imageUri) imageUrl = await uploadImage(imageUri);
      if (videoUri) videoUrl = await uploadVideo(videoUri);

      // 🔥 INSERT (ONLY ADD FIELDS — NO MODIFICATION)
      const { error } = await (supabase as any).from("items_live").insert({
        title,
        description,
        price: Number(price), // keep numeric, no symbol
        location,
        seller_phone: phone,
        image_url: imageUrl,
        video_url: videoUrl,
        user_id: user.id,
        is_negotiable: isNegotiable, // 🔥 NEW FIELD (ADD ONLY)
      });

      if (error) throw error;

      Alert.alert("Success", "Item posted");

      // reset form
      setTitle("");
      setDescription("");
      setPrice("");
      setLocation("");
      setPhone("");
      setImageUri(null);
      setVideoUri(null);
      setIsNegotiable(false);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }

    setLoading(false);
  };

  // ================= UI =================
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Sell Item</Text>

      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, { height: 120 }]}
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Text style={styles.label}>Price</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={price}
        onChangeText={setPrice}
      />

      <Text style={styles.label}>Location</Text>
      <TextInput style={styles.input} value={location} onChangeText={setLocation} />

      <Text style={styles.label}>WhatsApp Phone</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} />

      {/* 🔥 NEGOTIABLE SWITCH */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <Switch value={isNegotiable} onValueChange={setIsNegotiable} />
        <Text style={{ marginLeft: 10 }}>
          Allow buyers to make offers (Negotiable)
        </Text>
      </View>

      {/* IMAGE */}
      <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
        <Text>Select Image (any format)</Text>
      </TouchableOpacity>

      {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}

      {/* VIDEO */}
      <TouchableOpacity style={styles.videoBtn} onPress={pickVideo}>
        <Text>Select Video (optional)</Text>
      </TouchableOpacity>

      {videoUri && <Text style={{ color: "green", marginBottom: 10 }}>Video selected</Text>}

      {uploadingVideo && <Text>Uploading video...</Text>}

      {/* POST */}
      <TouchableOpacity style={styles.postBtn} onPress={postItem} disabled={loading}>
        <Text style={styles.postText}>{loading ? "Posting..." : "Post Item"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 12 },
  label: { fontWeight: "600", marginBottom: 4, marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  imageBtn: {
    backgroundColor: "#eee",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
    marginBottom: 10,
  },
  videoBtn: {
    backgroundColor: "#ddd",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
    marginBottom: 10,
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  postBtn: {
    backgroundColor: "green",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  postText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});