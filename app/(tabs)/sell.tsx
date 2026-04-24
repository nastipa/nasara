import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function Sell() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(""); // OPTIONAL
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [category, setCategory] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [isNegotiable, setIsNegotiable] = useState(false);

  const categories = [
    "Education",
    "Electronics",
    "Fashion",
    "Vehicles",
    "Real Estate",
    "Food & Grocery",
    "Home & Living",
    "Jobs",
    "Services",
  ];

  /* ================= LOCATION ================= */
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({});
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
    })();
  }, []);

  /* ================= UPLOAD ================= */
 const uploadFile = async (uri: string, type: "image" | "video") => {
  // ✅ IMAGE → keep using fetch (works fine)
  if (type === "image") {
    const formData = new FormData();

    formData.append("file", {
      uri,
      name: "image.jpg",
      type: "image/jpeg",
    } as any);

    const res = await fetch(
      "https://nasara-upload-server.onrender.com/upload",
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await res.json();

    if (!data?.url) throw new Error("Image upload failed");

    return data.url;
  }

  // 🔥 VIDEO → use XHR (FIX)
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    const fileUri = uri.startsWith("file://") ? uri : `file://${uri}`;

    formData.append("file", {
      uri: fileUri,
      name: "video.mp4",
      type: "video/mp4",
    } as any);

    xhr.open("POST", "https://nasara-upload-server.onrender.com/upload");

    xhr.onload = () => {
      try {
        if (xhr.status !== 200) {
          console.log("VIDEO UPLOAD FAIL:", xhr.responseText);
          return reject("Video upload failed");
        }

        const data = JSON.parse(xhr.responseText);

        if (!data?.url) {
          return reject("Invalid video response");
        }

        resolve(data.url);
      } catch (e) {
        reject("Invalid JSON");
      }
    };

    xhr.onerror = () => {
      console.log("XHR VIDEO ERROR");
      reject("Network error");
    };

    xhr.send(formData);
  });
};
  /* ================= PICKERS ================= */
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setVideoUri(null);
    }
  };

  const pickVideo = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    quality: 1,
  });

  if (!result.canceled) {
    const asset = result.assets[0];

    // 🔥 BLOCK LARGE VIDEOS
    if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
      Alert.alert("Video too large", "Max allowed is 50MB");
      return;
    }

    setVideoUri(asset.uri);
    setImageUri(null);
  }
};
  /* ================= POST ================= */
  const postItem = async () => {
  if (!title || !phone) {
    Alert.alert("Error", "Title and phone are required");
    return;
  }

  if (!category) {
    Alert.alert("Error", "Select a category");
    return;
  }

  setLoading(true);
  setUploading(true);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    Alert.alert("Login required");
    setLoading(false);
    setUploading(false);
    return;
  }

  try {
    let imageUrl = null;
    let videoUrl = null;

    /* ===== UPLOAD ===== */
    if (imageUri) {
      const compressed = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      imageUrl = await uploadFile(compressed.uri, "image");
    }

    if (videoUri) {
      videoUrl = await uploadFile(videoUri, "video");
    }

    /* ===== INSERT (FIXED) ===== */
    const { data: newItem, error } = await (supabase as any)
      .from("items_live")
      .insert({
        title,
        description,
        price: price ? Number(price) : null,
        location,
        latitude,
        longitude,
        seller_phone: phone,
        image_url: imageUrl,
        video_url: videoUrl,
        user_id: user.id,
        is_negotiable: isNegotiable,
        category,
        status: "active",
        created_at: new Date().toISOString(),
      })
      .select()
      .single(); // 🔥 IMPORTANT

    if (error) throw error;

    const itemId = newItem.id;

    /* ===== SUCCESS UI FIRST (FAST) ===== */
    Alert.alert("Success", "Posted successfully 🚀");
    router.push("/browse");

    /* ===== NOTIFICATIONS (NON-BLOCKING 🔥) ===== */
    setTimeout(async () => {
      try {
        const { data: users } = await (supabase as any)
          .from("profiles")
          .select("id");

        if (users) {
          const inserts = users.map((u: any) => ({
            user_id: u.id,
            type: "item",
            title: "🛒 New Item",
            body: title || "New item added",
            ref_id: itemId,
            read: false,
          }));

          await (supabase as any)
            .from("notifications")
            .insert(inserts);
        }

        // push (don't await)
        fetch("https://nasara-upload-server.onrender.com/send-push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "item",
            title: "🛒 New Item",
            body: title || "New item added",
            ref_id: itemId,
          }),
        }).catch(() => {});
      } catch (e) {
        console.log("NOTIFY ERROR:", e);
      }
    }, 0);
  } catch (err) {
    console.log("POST ERROR:", err);
    Alert.alert("Error", "Upload failed");
  }

  setLoading(false);
  setUploading(false);
  setProgress(0);
};

  /* ================= UI ================= */
  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* PROGRESS */}
      {uploading && (
        <View style={{ marginBottom: 10 }}>
          <Text style={{ fontWeight: "bold" }}>
            Uploading: {progress}%
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>
      )}

      {/* QUICK ACTIONS */}
      <View style={{ marginBottom: 20 }}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.quickWrap}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => router.push("/create-reel")}>
            <Text style={styles.quickText}>🎬 Create Reel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickBtn} onPress={() => router.push("/create-battle")}>
            <Text style={styles.quickText}>⚔️ Create Battle</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickBtn} onPress={() => router.push("/ads/create")}>
            <Text style={styles.quickText}>💵 Post Ad(Paid)</Text>
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

      {/* LABEL + INPUT */}
      <Text style={styles.label}>Title *</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Description</Text>
      <TextInput style={styles.input} value={description} onChangeText={setDescription} multiline />

      <Text style={styles.label}>Price (optional)</Text>
      <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" />

      <Text style={styles.label}>Location</Text>
      <TextInput style={styles.input} value={location} onChangeText={setLocation} />

      <Text style={styles.label}>Phone *</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

      {/* CATEGORY */}
      <Text style={styles.label}>Category</Text>
      <View style={styles.categoryWrap}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setCategory(cat)}
            style={[
              styles.categoryBtn,
              { backgroundColor: category === cat ? "green" : "#eee" },
            ]}
          >
            <Text style={{ color: category === cat ? "#fff" : "#000" }}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* NEGOTIABLE */}
      <View style={styles.switchRow}>
        <Switch value={isNegotiable} onValueChange={setIsNegotiable} />
        <Text style={{ marginLeft: 10 }}>
          Allow buyers to make offers (negotiable)
        </Text>
      </View>

      {/* MEDIA */}
      <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
        <Text>Select Image</Text>
      </TouchableOpacity>

      {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}

      <TouchableOpacity style={styles.imageBtn} onPress={pickVideo}>
        <Text>Select Video</Text>
      </TouchableOpacity>

      {videoUri && <Text style={{ color: "green" }}>Video selected</Text>}

      {/* POST */}
      <TouchableOpacity style={styles.postBtn} onPress={postItem}>
        <Text style={styles.postText}>
          {loading ? "Posting..." : "Post Item"}
        </Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f9fafb" },

  header: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },

  label: {
    fontWeight: "bold",
    color: "#000",
    marginBottom: 5,
    marginTop: 10,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#fff",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },

  progressBar: {
    height: 6,
    backgroundColor: "#ddd",
  },

  progressFill: {
    height: 6,
    backgroundColor: "green",
  },

  imageBtn: {
    backgroundColor: "#eee",
    padding: 14,
    marginTop: 10,
    borderRadius: 10,
    alignItems: "center",
  },

  image: {
    width: "100%",
    height: 200,
    marginTop: 10,
  },

  postBtn: {
    backgroundColor: "green",
    padding: 16,
    marginTop: 20,
    borderRadius: 12,
    alignItems: "center",
  },

  postText: { color: "#fff", fontWeight: "bold" },

  categoryWrap: { flexDirection: "row", flexWrap: "wrap" },

  categoryBtn: {
    padding: 8,
    margin: 4,
    borderRadius: 20,
  },

  quickWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  quickBtn: {
    width: "48%",
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
  },

  quickText: { color: "#fff", fontWeight: "bold" },

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
});