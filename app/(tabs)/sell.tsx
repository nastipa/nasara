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

/* ================= PRO UPLOAD ================= */
const uploadFile = async (
  uri: string,
  type: "image" | "video",
  onProgress?: (p: number) => void
): Promise<string> => {
  const isWeb = Platform.OS === "web";
  const MAX_RETRIES = 2;

  const uploadOnce = async (): Promise<string> => {
    /* ========= WEB ========= */
    if (isWeb) {
      const res = await fetch(uri);
      const blob = await res.blob();

      const formData = new FormData();
      formData.append(
        "file",
        new File(
          [blob],
          type === "image" ? "image.jpg" : "video.mp4",
          { type: blob.type }
        )
      );

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open(
          "POST",
          "https://nasara-upload-server.onrender.com/upload"
        );

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          try {
            if (xhr.status !== 200) return reject("Upload failed");
            const data = JSON.parse(xhr.responseText);
            if (!data?.url) return reject("Invalid response");
            resolve(data.url);
          } catch {
            reject("Invalid JSON");
          }
        };

        xhr.onerror = () => reject("Network error");
        xhr.send(formData);
      });
    }

    /* ========= MOBILE ========= */
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();

      formData.append("file", {
        uri: uri.startsWith("file://") ? uri : `file://${uri}`,
        name: type === "image" ? "image.jpg" : "video.mp4",
        type: type === "image" ? "image/jpeg" : "video/mp4",
      } as any);

      xhr.open(
        "POST",
        "https://nasara-upload-server.onrender.com/upload"
      );

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        try {
          if (xhr.status !== 200) return reject("Upload failed");
          const data = JSON.parse(xhr.responseText);
          if (!data?.url) return reject("Invalid response");
          resolve(data.url);
        } catch {
          reject("Invalid JSON");
        }
      };

      xhr.onerror = () => reject("Network error");
      xhr.send(formData);
    });
  };

  for (let i = 0; i <= MAX_RETRIES; i++) {
    try {
      return await uploadOnce();
    } catch (err) {
      if (i === MAX_RETRIES) throw err;
    }
  }

  throw new Error("Upload failed");
};

/* ================= COMPONENT ================= */
export default function Sell() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");


  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [category, setCategory] = useState("");
 const [imageUris, setImageUris] = useState<string[]>([]);
  const [videoUri, setVideoUri] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [isNegotiable, setIsNegotiable] = useState(false);

  const categories = [
    "education",
    "electronics",
    "fashion",
    "vehicles",
    "real estate",
    "food & grocery",
    "home & living",
    "jobs",
    "services",
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

  /* ================= PICK ================= */
  const pickImage = async () => {
  const res =
    await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        ImagePicker.MediaTypeOptions.Images,

      allowsMultipleSelection: true,

      quality: 0.7,
    });

  if (!res.canceled) {
    const newUris =
      res.assets.map(
        (a) => a.uri
      );

    setImageUris((prev) => [
      ...prev,
      ...newUris,
    ]);

    setVideoUri(null);
  }
};
const pickVideo = async () => {
  const res =
    await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        ImagePicker.MediaTypeOptions.Videos,
    });

  if (!res.canceled) {
    setVideoUri(
      res.assets[0].uri
    );

    setImageUris([]);
  }
};
  /* ================= POST ================= */
  const postItem = async () => {
    if (loading) return;

    if (  !category) {
      Alert.alert("Fill required fields");
      return;
    }

    setLoading(true);
    setUploading(true);
    setProgress(0);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert("Login required");
      return;
    }

    try {
     let imageUrls: string[] = [];
     

      /* ===== PARALLEL UPLOAD ===== */
     let uploadedImages: string[] =
  [];

for (const uri of imageUris) {
  const compressed =
    await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: 1200,
          },
        },
      ],
      {
        compress: 0.7,
        format:
          ImageManipulator.SaveFormat.JPEG,
      }
    );

  const uploaded =
    await uploadFile(
      compressed.uri,
      "image",
      setProgress
    );

  uploadedImages.push(
    uploaded
  );
}

let videoUrl = null;

if (videoUri) {
  videoUrl =
    await uploadFile(
      videoUri,
      "video",
      setProgress
    );
}
      const { data: newItem, error } = await (supabase as any)
        .from("items_live")
        .insert({
          title,
          description,
          price: price ? Number(price) : null,
          location,
          latitude,
          longitude,
          
         image_url:
  uploadedImages[0] || null,

image_urls:
  uploadedImages,
          video_url: videoUrl,
          user_id: user.id,
          is_negotiable: isNegotiable,
          category,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;

      /* ===== FAST UI ===== */
      Alert.alert("Success 🚀");
      router.replace("/browse");

      /* ===== NOTIFICATIONS ===== */
      setTimeout(async () => {
        const { data: users } = await (supabase as any)
          .from("profiles")
          .select("id");

        if (users) {
          const inserts = users.map((u: any) => ({
            user_id: u.id,
            type: "item",
            title: "🛒 New Item",
            body: title,
            ref_id: newItem.id,
            read: false,
          }));

          await (supabase as any)
            .from("notifications")
            .insert(inserts);
        }

        fetch("https://nasara-upload-server.onrender.com/send-push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "item",
            title: "🛒 New Item",
            body: title,
            ref_id: newItem.id,
          }),
        }).catch(() => {});
      }, 0);
    } catch (err) {
      Alert.alert("Upload failed");
    }

    setUploading(false);
    setLoading(false);
  }

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
            <Text style={styles.quickText}>⚔️ Create Election/Battle</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickBtn} onPress={() => router.push("/ads/create")}>
            <Text style={styles.quickText}>💵 Create Ad (Paid)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickBtn} onPress={() => router.push("/banner/create")}>
            <Text style={styles.quickText}>📢Create Banner (Paid)</Text>
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
          <TouchableOpacity style={styles.quickBtn} onPress={() => router.push("/mentor/apply")}>
            <Text style={styles.quickText}>  🎓 Become a Mentor</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => router.push("/mentor/request")}>
            <Text style={styles.quickText}>  🎓 Find a Mentor</Text>
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

      <View
  style={{
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  }}
>
  {imageUris.length > 0 && (
  <ScrollView horizontal>
    {imageUris.map(
      (uri, index) => (
        <Image
          key={index}
          source={{ uri }}
          style={{
            width: 140,
            height: 140,
            marginRight: 10,
            borderRadius: 10,
          }}
        />
      )
    )}
  </ScrollView>
)}
</View>

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