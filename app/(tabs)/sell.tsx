import { Ionicons } from "@expo/vector-icons";
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
  const [isDeal, setIsDeal] = useState(false);
const [dealPrice, setDealPrice] = useState("");


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
const now = new Date();

const start = new Date(now);
const day = start.getDay();

// Friday = 5
const daysUntilFriday =
  day <= 5 ? 5 - day : 12 - day;

start.setDate(start.getDate() + daysUntilFriday);
start.setHours(0, 0, 0, 0);

const end = new Date(start);
end.setHours(23, 59, 59, 999);
      const { data: newItem, error } = await (supabase as any)
        .from("items_live")
        .insert({
          title,
          description,
          price: price ? Number(price) : null,
          is_deal: isDeal,
deal_price: isDeal
  ? Number(dealPrice)
  : null,

deal_start: isDeal
  ? start.toISOString()
  : null,

deal_end: isDeal
  ? end.toISOString()
  : null,
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
<View
  style={{
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  }}
>
  <QuickCard
    icon="videocam"
    title="Create Reel"
    color="#FF4D6D"
    onPress={() => router.push("/create-reel")}
    style={{ width: "23%", marginBottom: 12 }}
  />

  <QuickCard
    icon="shield"
    title="Election"
    color="#5B5FEF"
    onPress={() => router.push("/create-battle")}
    style={{ width: "23%", marginBottom: 12 }}
  />

  <QuickCard
    icon="cash"
    title="Create Ad"
    color="#16A34A"
    onPress={() => router.push("/ads/create")}
    style={{ width: "23%", marginBottom: 12 }}
  />

  <QuickCard
    icon="images"
    title="Banner"
    color="#F59E0B"
    onPress={() => router.push("/banner/create")}
    style={{ width: "23%", marginBottom: 12 }}
  />

  <QuickCard
    icon="trophy"
    title="Auction"
    color="#7C3AED"
    onPress={() => router.push("/go-auction")}
    style={{ width: "23%", marginBottom: 12 }}
  />

  <QuickCard
    icon="radio"
    title="Go Live"
    color="#EF4444"
    onPress={() => router.push("/golive")}
    style={{ width: "23%", marginBottom: 12 }}
  />

  <QuickCard
    icon="flash"
    title="Utilities"
    color="#25c3eb"
    onPress={() => router.push("/services")}
    style={{ width: "23%", marginBottom: 12 }}
  />

  <QuickCard
    icon="radio-outline"
    title="Normal Live"
    color="#dc4726"
    onPress={() => router.push("/go-live")}
    style={{ width: "23%", marginBottom: 12 }}
  />

  <QuickCard
    icon="school"
    title="Mentor"
    color="#99e90e"
    onPress={() => router.push("/mentor/apply")}
    style={{ width: "23%", marginBottom: 12 }}
  />

  <QuickCard
    icon="people"
    title="Find Mentor"
    color="#5cd5f6"
    onPress={() => router.push("/mentor/request")}
    style={{ width: "23%", marginBottom: 12 }}
  />

  <QuickCard
    icon="bicycle"
    title="Delivery"
    color="#F97316"
    onPress={() => router.push("/delivery")}
    style={{ width: "23%", marginBottom: 12 }}
  />
</View>
      {/* ================= SELL ITEM ================= */}

<View
  style={{
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    marginBottom: 20,
  }}
>
  <Text
    style={{
      fontSize: 28,
      fontWeight: "800",
      color: "#111827",
      marginBottom: 5,
    }}
  >
    Sell Item
  </Text>

  <Text
    style={{
      color: "#6b7280",
      fontSize: 15,
      marginBottom: 20,
    }}
  >
    Fill in your product information below.
  </Text>

  {/* TITLE */}
  <Text style={styles.label}>Title *</Text>

  <TextInput
    placeholder="e.g. iPhone 15 Pro Max"
    placeholderTextColor="#9ca3af"
    style={[
      styles.input,
      {
        borderRadius: 16,
        borderColor: "#e5e7eb",
        paddingVertical: 15,
      },
    ]}
    value={title}
    onChangeText={setTitle}
  />

  {/* DESCRIPTION */}
  <Text style={styles.label}>Description</Text>

  <TextInput
    placeholder="Describe your item..."
    placeholderTextColor="#9ca3af"
    multiline
    textAlignVertical="top"
    style={[
      styles.input,
      {
        height: 120,
        borderRadius: 16,
        borderColor: "#e5e7eb",
        paddingVertical: 15,
      },
    ]}
    value={description}
    onChangeText={setDescription}
  />

  {/* PRICE */}
  <Text style={styles.label}>Price (optional)</Text>

  <TextInput
    placeholder="GH₵ 0.00"
    placeholderTextColor="#9ca3af"
    keyboardType="numeric"
    style={[
      styles.input,
      {
        borderRadius: 16,
        borderColor: "#e5e7eb",
        paddingVertical: 15,
      },
    ]}
    value={price}
    onChangeText={setPrice}
  />

  {/* LOCATION */}
  <Text style={styles.label}>Location</Text>

  <TextInput
    placeholder="Tamale, Accra, Kumasi..."
    placeholderTextColor="#9ca3af"
    style={[
      styles.input,
      {
        borderRadius: 16,
        borderColor: "#e5e7eb",
        paddingVertical: 15,
      },
    ]}
    value={location}
    onChangeText={setLocation}
  />

  {/* CATEGORY */}
  <Text style={styles.label}>Category</Text>

  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    style={{ marginBottom: 15 }}
  >
    {categories.map((cat) => (
      <TouchableOpacity
        key={cat}
        onPress={() => setCategory(cat)}
        style={{
          backgroundColor:
            category === cat ? "#2563EB" : "#F3F4F6",
          paddingHorizontal: 18,
          paddingVertical: 12,
          borderRadius: 25,
          marginRight: 10,
          borderWidth: 1,
          borderColor:
            category === cat
              ? "#2563EB"
              : "#E5E7EB",
        }}
      >
        <Text
          style={{
            color:
              category === cat
                ? "#fff"
                : "#374151",
            fontWeight: "700",
            textTransform: "capitalize",
          }}
        >
          {cat}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>

  {/* NEGOTIABLE */}

  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "#f8fafc",
      padding: 15,
      borderRadius: 16,
      marginBottom: 20,
    }}
  >
    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontWeight: "700",
          fontSize: 16,
        }}
      >
        Negotiable
      </Text>

      <Text
        style={{
          color: "#6b7280",
          marginTop: 3,
        }}
      >
        Allow buyers to make offers
      </Text>
    </View>

    <Switch
      value={isNegotiable}
      onValueChange={setIsNegotiable}
    />
  </View>
   {/* FRIDAY DEAL*/}
  <View
  style={{
    backgroundColor: "#FEF3C7",
    padding: 15,
    borderRadius: 16,
    marginBottom: 20,
  }}
>
  <View
    style={{
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    }}
  >
    <Text
      style={{
        fontWeight: "700",
        fontSize: 16,
      }}
    >
      🔥 Friday Deal
    </Text>

    <Switch
      value={isDeal}
      onValueChange={setIsDeal}
    />
  </View>

  {isDeal && (
    <TextInput
      placeholder="Friday Deal Price"
      keyboardType="numeric"
      value={dealPrice}
      onChangeText={setDealPrice}
      style={[
        styles.input,
        { marginTop: 12 }
      ]}
    />
  )}
</View>

  {/* IMAGES */}

  <TouchableOpacity
    onPress={pickImage}
    style={{
      backgroundColor: "#EEF4FF",
      borderWidth: 2,
      borderStyle: "dashed",
      borderColor: "#2563EB",
      padding: 20,
      borderRadius: 18,
      alignItems: "center",
    }}
  >
    <Ionicons
      name="images"
      size={34}
      color="#2563EB"
    />

    <Text
      style={{
        marginTop: 10,
        fontWeight: "700",
        color: "#2563EB",
      }}
    >
      Select Images
    </Text>
  </TouchableOpacity>

  {imageUris.length > 0 && (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginTop: 15 }}
    >
      {imageUris.map((uri, index) => (
        <Image
          key={index}
          source={{ uri }}
          style={{
            width: 140,
            height: 140,
            borderRadius: 18,
            marginRight: 12,
          }}
        />
      ))}
    </ScrollView>
  )}

  {/* VIDEO */}

  <TouchableOpacity
    onPress={pickVideo}
    style={{
      backgroundColor: "#FEF3C7",
      borderWidth: 2,
      borderStyle: "dashed",
      borderColor: "#F59E0B",
      padding: 20,
      borderRadius: 18,
      alignItems: "center",
      marginTop: 18,
    }}
  >
    <Ionicons
      name="videocam"
      size={34}
      color="#D97706"
    />

    <Text
      style={{
        marginTop: 10,
        fontWeight: "700",
        color: "#D97706",
      }}
    >
      Select Video
    </Text>
  </TouchableOpacity>

  {videoUri && (
    <View
      style={{
        marginTop: 12,
        backgroundColor: "#DCFCE7",
        padding: 14,
        borderRadius: 12,
      }}
    >
      <Text
        style={{
          color: "#15803D",
          fontWeight: "700",
        }}
      >
        ✓ Video selected successfully
      </Text>
    </View>
  )}
</View>
      {/* POST */}
      <TouchableOpacity
  activeOpacity={0.9}
  onPress={postItem}
  disabled={loading}
  style={{
    marginTop: 28,
    borderRadius: 22,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#25ebb0",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    backgroundColor: "#25eb7e",
  }}
>
  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 18,
      paddingHorizontal: 20,
    }}
  >
    <View
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(255,255,255,0.18)",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
      }}
    >
      <Ionicons
        name={loading ? "cloud-upload-outline" : "rocket-outline"}
        size={24}
        color="#fff"
      />
    </View>

    <View>
      <Text
        style={{
          color: "#fff",
          fontSize: 17,
          fontWeight: "800",
        }}
      >
        {loading ? "Posting..." : "Post Item"}
      </Text>

      <Text
        style={{
          color: "rgba(255,255,255,0.85)",
          fontSize: 12,
          marginTop: 2,
        }}
      >
        Publish to the Nasara Marketplace
      </Text>
    </View>
  </View>
</TouchableOpacity>

    </ScrollView>
  );
}
const QuickCard = ({
  icon,
  title,
  color,
  onPress,
}: any) => (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={onPress}
    style={{
      width: 110,
      marginRight: 14,
    }}
  >
    <View
      style={{
        backgroundColor: color,
        borderRadius: 24,
        paddingVertical: 22,
        paddingHorizontal: 12,
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 10,
        shadowOffset: {
          width: 0,
          height: 5,
        },
        elevation: 6,
      }}
    >
      <View
        style={{
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: "rgba(255,255,255,0.22)",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Ionicons
          name={icon}
          size={30}
          color="#fff"
        />
      </View>

      <Text
        style={{
          color: "#fff",
          fontWeight: "700",
          fontSize: 14,
          textAlign: "center",
        }}
        numberOfLines={2}
      >
        {title}
      </Text>
    </View>
  </TouchableOpacity>
);
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