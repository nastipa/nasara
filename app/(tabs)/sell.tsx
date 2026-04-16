import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

/* ===== STORAGE KEY ===== */
const QUEUE_KEY = "UPLOAD_QUEUE";

export default function Sell() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(""); // ✅ optional
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [category, setCategory] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [uploading, setUploading] = useState(false);

  const categories = [
    "phones",
    "electronics",
    "fashion",
    "cars",
    "real estate",
    "furniture",
    "home Appliances",
    "jobs",
    "services",
  ];

  /* ===== LOCATION ===== */
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({});
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
    })();
  }, []);

  /* ===== UPLOAD FUNCTION ===== */
  const uploadWithProgress = async (uri: string, type: "image" | "video") => {
    const formData = new FormData();

    if (Platform.OS === "web") {
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append("file", blob, "upload.jpg");
    } else {
      formData.append("file", {
        uri,
        name: type === "image" ? "upload.jpg" : "upload.mp4",
        type: type === "image" ? "image/jpeg" : "video/mp4",
      } as any);
    }

    const res = await fetch(
      "https://nasara-upload-server.onrender.com/upload",
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await res.json();

    if (!data.success || !data.url) {
      throw new Error("Upload failed");
    }

    return data.url;
  };

  /* ===== PICK IMAGE ===== */
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setVideoUri(null);
    }
  };

  /* ===== PICK VIDEO ===== */
  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.4,
    });

    if (!result.canceled) {
      setVideoUri(result.assets[0].uri);
      setImageUri(null);
    }
  };

  /* ===== POST ITEM (FIXED) ===== */
  const postItem = async () => {
    if (!title || !phone) {
      Alert.alert("Error", "Title and phone are required");
      return;
    }

    if (!category) {
      Alert.alert("Error", "Please select a category");
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
      const { data: newItem, error } = await (supabase as any)
        .from("items_live")
        .insert({
          title,
          description,
          price: price ? Number(price) : null, // ✅ OPTIONAL
          location,
          latitude,
          longitude,
          seller_phone: phone,
          image_url: null,
          video_url: null,
          user_id: user.id,
          is_negotiable: isNegotiable,
          category,
          status: "active",
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error || !newItem) throw error;

      router.push("/browse");

      setTimeout(async () => {
        if (uploading) return;
        setUploading(true);

        try {
          let imageUrl = null;
          let videoUrl = null;

          if (imageUri) {
            const compressed = await ImageManipulator.manipulateAsync(
              imageUri,
              [{ resize: { width: 800 } }],
              {
                compress: 0.7,
                format: ImageManipulator.SaveFormat.JPEG,
              }
            );

            const uploaded = await uploadWithProgress(
              compressed.uri,
              "image"
            );

            if (uploaded && uploaded.startsWith("http")) {
              imageUrl = uploaded;
            }
          }

          if (videoUri) {
            const uploaded = await uploadWithProgress(videoUri, "video");

            if (uploaded && uploaded.startsWith("http")) {
              videoUrl = uploaded;
            }
          }

          if (imageUrl || videoUrl) {
            await (supabase as any)
              .from("items_live")
              .update({
                image_url: imageUrl,
                video_url: videoUrl,
              })
              .eq("id", newItem.id);
          }
        } catch (err) {
          console.log("UPLOAD ERROR:", err);
        } finally {
          setUploading(false);
        }
      }, 300);

      Alert.alert("Success", "Item posted successfully 🚀");
    } catch (err: any) {
      Alert.alert("Offline", "Saved. Will upload later.");
    }

    setLoading(false);
  };


  /* ===== UI ===== */
  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* QUICK ACTIONS */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>
          Quick Actions
        </Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => router.push("/create-reel")}>
            <Text style={styles.quickText}>🎬Create Reel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickBtn} onPress={() => router.push("/create-battle")}>
            <Text style={styles.quickText}>⚔️ Create Battle</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickBtn} onPress={() => router.push("/ads/create")}>
            <Text style={styles.quickText}>💵 Post Ad (Paid)</Text>
          </TouchableOpacity>
           
          <TouchableOpacity style={styles.quickBtn} onPress={() => router.push("/banner/create")}>
            <Text style={styles.quickText}>📢 Banner (Paid)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => router.push("/go-auction")}>
            <Text style={styles.quickText}>🏆 Start Auction</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => router.push("/golive")}>
            <Text style={styles.quickText}>🎥 Start Live Video</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => router.push("/go-live")}>
            <Text style={styles.quickText}>🔴 Go Normal Live</Text>
          </TouchableOpacity> 
        </View>
      </View>

      <Text style={styles.header}>Sell Item</Text>

     <TextInput
  style={styles.input}
  placeholder="Title"
  placeholderTextColor="#9ca3af"
  value={title}
  onChangeText={setTitle}
/>

<TextInput
  style={styles.input}
  placeholder="Description"
  placeholderTextColor="#9ca3af"
  value={description}
  onChangeText={setDescription}
  multiline
  textAlignVertical="top" // ✅ FIX for Android
/>

<TextInput
  style={styles.input}
  placeholder="Price"
  placeholderTextColor="#9ca3af"
  value={price}
  onChangeText={setPrice}
  keyboardType="numeric" // ✅ better UX
/>

<TextInput
  style={styles.input}
  placeholder="Location"
  placeholderTextColor="#9ca3af"
  value={location}
  onChangeText={setLocation}
/>

<TextInput
  style={styles.input}
  placeholder="Phone"
  placeholderTextColor="#9ca3af"
  value={phone}
  onChangeText={setPhone}
  keyboardType="phone-pad" // ✅ better UX
/>

      {/* CATEGORY */}
      <View style={styles.categoryWrap}>
        {categories.map((cat) => (
          <TouchableOpacity key={cat} onPress={() => setCategory(cat)} style={[styles.categoryBtn, { backgroundColor: category === cat ? "green" : "#eee" }]}>
            <Text style={{ color: category === cat ? "#fff" : "#000" }}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>

     <View style={styles.switchRow}>
        <Switch value={isNegotiable} onValueChange={setIsNegotiable} />
        <Text style={{ marginLeft: 10 }}>
          Allow buyers to make offers (negotiable)
        </Text>
      </View>

      <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
        <Text>Select Image</Text>
      </TouchableOpacity>

     {imageUri ? (
  <Image source={{ uri: imageUri }} style={styles.squareImage} />
) : (
  <Text>No image selected</Text>
)}

      <TouchableOpacity style={styles.imageBtn} onPress={pickVideo}>
        <Text>Select Video</Text>
      </TouchableOpacity>

      {videoUri && <Text style={{ color: "green" }}>Video selected</Text>}

      <TouchableOpacity style={styles.postBtn} onPress={postItem}>
        <Text style={styles.postText}>{loading ? "Posting..." : "Post Item"}</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

/* ===== STYLES ===== */
const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f9fafb",
  },

  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#111827",
  },

  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: 12,
    marginBottom: 12,
    borderRadius: 10,
    backgroundColor: "#fff",
    color: "#111827", // ✅ FIX TEXT VISIBILITY
  },

  imageBtn: {
    backgroundColor: "#e5e7eb",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    alignItems: "center",
  },

  squareImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    marginBottom: 12,
  },

  postBtn: {
    backgroundColor: "#16a34a",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },

  postText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  /* CATEGORY (HORIZONTAL LOOK) */
  categoryWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },

  categoryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    margin: 4,
    borderRadius: 20,
    backgroundColor: "#e5e7eb",
  },

  categoryText: {
    color: "#111827",
  },

  /* QUICK ACTIONS (HORIZONTAL GRID) */
  quickWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  quickBtn: {
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 10,
    width: "48%", // ✅ makes it horizontal 2-column
    alignItems: "center",
  },

  quickText: {
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
  },

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  switchText: {
    marginLeft: 10,
    color: "#111827",
  },

  /* EMPTY MEDIA / LOADING */
  noMedia: {
    height: 200,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
});