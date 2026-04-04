import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as Network from "expo-network";
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

/* ===== CLOUDINARY CONFIG ===== */
const CLOUD_NAME = "ajars";
const UPLOAD_PRESET_IMAGES = "ajars_images";
const UPLOAD_PRESET_VIDEOS = "ajars_videos";

/* ===== STORAGE KEY ===== */
const QUEUE_KEY = "UPLOAD_QUEUE";

export default function Sell() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [category, setCategory] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isNegotiable, setIsNegotiable] = useState(false);

  const [uploadProgress, setUploadProgress] = useState(0);
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

  /* ===== AUTO QUEUE (SILENT) ===== */
  useEffect(() => {
    const interval = setInterval(processQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  /* ===== QUEUE HELPERS ===== */
  const getQueue = async () => {
    const data = await AsyncStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  };

  const saveQueue = async (queue: any[]) => {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  };

  const addToQueue = async (item: any) => {
    const queue = await getQueue();
    queue.push({ ...item, retries: 0 });
    await saveQueue(queue);
  };

  /* ===== FILE FIX (WEB + MOBILE) ===== */
  const prepareFile = async (uri: string, type: "image" | "video") => {
    if (Platform.OS === "web") {
      const res = await fetch(uri);
      const blob = await res.blob();
      return blob;
    }

    return {
      uri,
      name: type === "image" ? "upload.jpg" : "upload.mp4",
      type: type === "image" ? "image/jpeg" : "video/mp4",
    } as any;
  };

  /* ===== UPLOAD WITH PROGRESS ===== */
  const uploadWithProgress = async (uri: string, type: "image" | "video") => {
    const file = await prepareFile(uri, type);

    const data = new FormData();
    data.append("file", file as any);
    data.append(
      "upload_preset",
      type === "image" ? UPLOAD_PRESET_IMAGES : UPLOAD_PRESET_VIDEOS
    );

    const endpoint =
      type === "image"
        ? `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`
        : `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;

    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      setUploading(true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        setUploading(false);
        setUploadProgress(0);

        const res = JSON.parse(xhr.response);
        if (res.secure_url) resolve(res.secure_url);
        else reject(res);
      };

      xhr.onerror = () => {
        setUploading(false);
        setUploadProgress(0);
        reject("Upload failed");
      };

      xhr.open("POST", endpoint);
      xhr.send(data);
    });
  };

  /* ===== PROCESS QUEUE (SILENT RETRY) ===== */
  const processQueue = async () => {
    const net = await Network.getNetworkStateAsync();
    if (!net.isConnected) return;

    let queue = await getQueue();
    if (queue.length === 0) return;

    for (let i = 0; i < queue.length; i++) {
      const job = queue[i];

      try {
        let imageUrl = null;
        let videoUrl = null;

        if (job.imageUri) {
          imageUrl = await uploadWithProgress(job.imageUri, "image");
        }

        if (job.videoUri) {
          videoUrl = await uploadWithProgress(job.videoUri, "video");
        }

        await (supabase as any)
          .from("items_live")
          .update({
            image_url: imageUrl,
            video_url: videoUrl,
          })
          .eq("id", job.itemId);

        queue.splice(i, 1);
        await saveQueue(queue);
        i--;

      } catch (err) {
        job.retries = (job.retries || 0) + 1;

        if (job.retries > 3) {
          queue.splice(i, 1);
          i--;
        }

        await saveQueue(queue);
      }
    }
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

  /* ===== POST ITEM ===== */
  const postItem = async () => {
    if (!title || !price || !phone) {
      Alert.alert("Error", "Title, price and phone are required");
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
          price: Number(price),
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

      let imageUrl = null;
      let videoUrl = null;

      if (imageUri) {
        imageUrl = await uploadWithProgress(imageUri, "image");
      }

      if (videoUri) {
        videoUrl = await uploadWithProgress(videoUri, "video");
      }

      await (supabase as any)
        .from("items_live")
        .update({
          image_url: imageUrl,
          video_url: videoUrl,
        })
        .eq("id", newItem.id);

      Alert.alert("Success", "Item posted successfully 🚀");

      router.push("/browse");

      setTitle("");
      setDescription("");
      setPrice("");
      setLocation("");
      setPhone("");
      setCategory("");
      setImageUri(null);
      setVideoUri(null);
      setIsNegotiable(false);

    } catch (err: any) {
      await addToQueue({
        itemId: "temp",
        imageUri,
        videoUri,
      });

      Alert.alert("Offline", "Saved. Will upload later.");
    }

    setLoading(false);
  };

  /* ===== UI ===== */
  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* PROGRESS BAR */}
      {uploading && (
        <View style={{ marginBottom: 10 }}>
          <Text>Uploading: {uploadProgress}%</Text>
          <View style={{ height: 6, backgroundColor: "#ddd" }}>
            <View style={{ width: `${uploadProgress}%`, height: 6, backgroundColor: "green" }} />
          </View>
        </View>
      )}

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

      <TextInput style={styles.input} placeholder="Title" value={title} onChangeText={setTitle} />
      <TextInput style={styles.input} placeholder="Description" value={description} onChangeText={setDescription} multiline />
      <TextInput style={styles.input} placeholder="Price" value={price} onChangeText={setPrice} />
      <TextInput style={styles.input} placeholder="Location" value={location} onChangeText={setLocation} />
      <TextInput style={styles.input} placeholder="Phone" value={phone} onChangeText={setPhone} />

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

      {imageUri && <Image source={{ uri: imageUri }} style={styles.squareImage} />}

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
  container: { padding: 16 },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 10, marginBottom: 10 },
  imageBtn: { backgroundColor: "#eee", padding: 12, marginBottom: 10 },
  squareImage: { width: "100%", aspectRatio: 1, marginBottom: 10 },
  postBtn: { backgroundColor: "green", padding: 14, alignItems: "center" },
  postText: { color: "#fff", fontWeight: "bold" },
  categoryWrap: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
  categoryBtn: { padding: 10, margin: 4, borderRadius: 20 },
  quickBtn: { backgroundColor: "#2563eb", padding: 12, borderRadius: 10, margin: 5 },
  quickText: { color: "#fff" },
    switchRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
});