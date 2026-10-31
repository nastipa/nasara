// ============================================================
// 🔵 NASARA SELL SCREEN
// Premium marketplace design - Navy, Gold and White
// ============================================================

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

// ============================================================
// 🟡 COLOURS
// ============================================================

const COLORS = {
  navy: "#101D36",
  navyLight: "#1B2D4D",
  gold: "#D6AD55",
  goldLight: "#FFF6E3",
  white: "#FFFFFF",
  background: "#F4F6FA",
  text: "#18243A",
  muted: "#7B8799",
  border: "#E4E8EF",
  green: "#16A36A",
  red: "#DC4545",
};

// ============================================================
// 🟢 PRO UPLOAD FUNCTION
// ============================================================

const uploadFile = async (
  uri: string,
  type: "image" | "video",
  onProgress?: (p: number) => void
): Promise<string> => {
  const isWeb = Platform.OS === "web";
  const MAX_RETRIES = 2;

  const uploadOnce = async (): Promise<string> => {
    // --------------------------------------------------------
    // 🌐 WEB UPLOAD
    // --------------------------------------------------------

    if (isWeb) {
      const res = await fetch(uri);

      if (!res.ok) {
        throw new Error("Could not read selected media.");
      }

      const blob = await res.blob();

      const formData = new FormData();

      formData.append(
        "file",
        new File(
          [blob],
          type === "image" ? "image.jpg" : "video.mp4",
          {
            type:
              blob.type ||
              (type === "image" ? "image/jpeg" : "video/mp4"),
          }
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
            onProgress(
              Math.round((e.loaded / e.total) * 100)
            );
          }
        };

        xhr.onload = () => {
          try {
            if (xhr.status < 200 || xhr.status >= 300) {
              return reject(
                new Error("Upload failed. Please try again.")
              );
            }

            const data = JSON.parse(xhr.responseText);

            if (!data?.url) {
              return reject(
                new Error("Invalid upload response.")
              );
            }

            resolve(data.url);
          } catch {
            reject(new Error("Invalid upload response."));
          }
        };

        xhr.onerror = () => {
          reject(new Error("Network error during upload."));
        };

        xhr.ontimeout = () => {
          reject(new Error("Upload timed out."));
        };

        xhr.timeout = 180000;

        xhr.send(formData);
      });
    }

    // --------------------------------------------------------
    // 📱 MOBILE UPLOAD
    // --------------------------------------------------------

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      const formData = new FormData();

      formData.append(
        "file",
        {
          uri: uri.startsWith("file://")
            ? uri
            : `file://${uri}`,
          name: type === "image" ? "image.jpg" : "video.mp4",
          type:
            type === "image"
              ? "image/jpeg"
              : "video/mp4",
        } as any
      );

      xhr.open(
        "POST",
        "https://nasara-upload-server.onrender.com/upload"
      );

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(
            Math.round((e.loaded / e.total) * 100)
          );
        }
      };

      xhr.onload = () => {
        try {
          if (xhr.status < 200 || xhr.status >= 300) {
            return reject(
              new Error("Upload failed. Please try again.")
            );
          }

          const data = JSON.parse(xhr.responseText);

          if (!data?.url) {
            return reject(
              new Error("Invalid upload response.")
            );
          }

          resolve(data.url);
        } catch {
          reject(new Error("Invalid upload response."));
        }
      };

      xhr.onerror = () => {
        reject(new Error("Network error during upload."));
      };

      xhr.ontimeout = () => {
        reject(new Error("Upload timed out."));
      };

      xhr.timeout = 180000;

      xhr.send(formData);
    });
  };

  // ----------------------------------------------------------
  // 🔁 RETRIES
  // ----------------------------------------------------------

  for (let i = 0; i <= MAX_RETRIES; i++) {
    try {
      return await uploadOnce();
    } catch (err) {
      if (i === MAX_RETRIES) {
        throw err;
      }
    }
  }

  throw new Error("Upload failed.");
};

// ============================================================
// 🔵 QUICK ACTION TYPE
// ============================================================

type QuickCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  color: string;
  onPress: () => void;
};

// ============================================================
// 🟡 MAIN SELL COMPONENT
// ============================================================

export default function Sell() {
  const router = useRouter();

  // ----------------------------------------------------------
  // 📝 PRODUCT INFORMATION
  // ----------------------------------------------------------

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");

  const [category, setCategory] = useState("");

  // ----------------------------------------------------------
  // 💰 FRIDAY DEAL
  // ----------------------------------------------------------

  const [isDeal, setIsDeal] = useState(false);
  const [dealPrice, setDealPrice] = useState("");

  // ----------------------------------------------------------
  // 🤝 NEGOTIATION
  // ----------------------------------------------------------

  const [isNegotiable, setIsNegotiable] = useState(false);

  // ----------------------------------------------------------
  // 📍 LOCATION COORDINATES
  // ----------------------------------------------------------

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // ----------------------------------------------------------
  // 🖼️ MEDIA
  // ----------------------------------------------------------

  const [imageUris, setImageUris] = useState<string[]>([]);
  const [videoUri, setVideoUri] = useState<string | null>(null);

  // ----------------------------------------------------------
  // ⏳ LOADING
  // ----------------------------------------------------------

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // ----------------------------------------------------------
  // 🗂️ CATEGORIES
  // ----------------------------------------------------------

  const categories = [
    "electronics",
    "beauty & personal care",
    "health & wellness",
    "fashion",
    "vehicles",
    "real estate",
    "food & grocery",
    "home & living",
    "education",
    "others",
  ];

  // ==========================================================
  // 📍 GET DEVICE LOCATION
  // ==========================================================

  useEffect(() => {
    let mounted = true;

    const getLocation = async () => {
      try {
        const { status } =
          await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") return;

        const loc = await Location.getCurrentPositionAsync({});

        if (!mounted) return;

        setLatitude(loc.coords.latitude);
        setLongitude(loc.coords.longitude);
      } catch (error) {
        console.log("Location unavailable:", error);
      }
    };

    getLocation();

    return () => {
      mounted = false;
    };
  }, []);

  // ==========================================================
  // 🖼️ PICK IMAGES
  // ==========================================================

  const pickImage = async () => {
    try {
      const remaining = 10 - imageUris.length;

      if (remaining <= 0) {
        Alert.alert(
          "Image limit",
          "You can select a maximum of 10 images."
        );
        return;
      }

      const res =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: remaining,
          quality: 0.7,
        });

      if (!res.canceled) {
        const newUris = res.assets.map((a) => a.uri);

        setImageUris((prev) =>
          [...prev, ...newUris].slice(0, 10)
        );

        setVideoUri(null);
      }
    } catch (error) {
      Alert.alert(
        "Image selection failed",
        "Please try again."
      );
    }
  };

  // ==========================================================
  // ❌ REMOVE IMAGE
  // ==========================================================

  const removeImage = (index: number) => {
    setImageUris((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  // ==========================================================
  // 🎥 PICK VIDEO
  // ==========================================================

  const pickVideo = async () => {
    try {
      const res =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        });

      if (!res.canceled && res.assets.length > 0) {
        setVideoUri(res.assets[0].uri);
        setImageUris([]);
      }
    } catch (error) {
      Alert.alert(
        "Video selection failed",
        "Please try again."
      );
    }
  };

  // ==========================================================
  // ❌ REMOVE VIDEO
  // ==========================================================

  const removeVideo = () => {
    setVideoUri(null);
  };

  // ==========================================================
  // 🔔 SEND ITEM NOTIFICATIONS
  // ==========================================================

  const sendItemNotifications = async (
    userId: string,
    itemId: string,
    itemTitle: string,
    dealEnabled: boolean,
    dealAmount: string
  ) => {
    try {
      // ------------------------------------------------------
      // 👤 SELLER NAME
      // ------------------------------------------------------

      const {
        data: sellerProfile,
        error: sellerError,
      } = await (supabase as any)
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .maybeSingle();

      if (sellerError) {
        console.error(
          "Could not retrieve seller name:",
          sellerError.message
        );
      }

      const sellerName =
        sellerProfile?.full_name?.trim() ||
        "A Nasara User";

      // ------------------------------------------------------
      // 👥 RECIPIENTS
      // ------------------------------------------------------

      const {
        data: users,
        error: usersError,
      } = await (supabase as any)
        .from("profiles")
        .select("id")
        .neq("id", userId);

      if (usersError) {
        console.error(
          "Could not retrieve notification recipients:",
          usersError.message
        );
      } else if (users?.length) {
        // ----------------------------------------------------
        // 🔔 NOTIFICATION CONTENT
        // ----------------------------------------------------

        const notificationTitle = dealEnabled
          ? `🔥 Friday Market Deal from ${sellerName}`
          : `🛒 New Item from ${sellerName}`;

        const notificationBody = dealEnabled
          ? `${itemTitle} — Friday Deal Price: GH₵${dealAmount}`
          : itemTitle;

        // ----------------------------------------------------
        // 💾 SAVE NOTIFICATIONS
        // ----------------------------------------------------

        const inserts = users.map((u: any) => ({
          user_id: u.id,
          type: "item",
          title: notificationTitle,
          body: notificationBody,
          ref_id: itemId,
          read: false,
        }));

        const {
          error: notificationError,
        } = await (supabase as any)
          .from("notifications")
          .insert(inserts);

        if (notificationError) {
          console.error(
            "Could not save item notifications:",
            notificationError.message
          );
        }
      }

      // ------------------------------------------------------
      // 📲 AUTHENTICATED PUSH NOTIFICATIONS
      // ------------------------------------------------------

      const {
        data: { session: currentSession },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          "Could not retrieve session:",
          sessionError.message
        );
        return;
      }

      if (!currentSession?.access_token) {
        console.error(
          "No active session. Item notifications were not requested."
        );
        return;
      }

      try {
        const response = await fetch(
          "https://nasara-upload-server.onrender.com/send-push",
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${currentSession.access_token}`,
            },

            body: JSON.stringify({
              type: "item",

              title: dealEnabled
                ? `🔥 Friday Market Deal from ${sellerName}`
                : `🛒 New Item from ${sellerName}`,

              body: dealEnabled
                ? `${itemTitle} — Friday Deal Price: GH₵${dealAmount}`
                : itemTitle,

              ref_id: itemId,
            }),
          }
        );

        if (!response.ok) {
          console.error(
            "Notification request failed:",
            await response.text()
          );
        } else {
          const result = await response.json();

          console.log(
            "Item notification result:",
            result
          );
        }
      } catch (error) {
        console.error(
          "Item push notification error:",
          error
        );
      }
    } catch (error) {
      console.error(
        "Item notification process failed:",
        error
      );
    }
  };

  // ==========================================================
  // 🚀 POST ITEM
  // ==========================================================

  const postItem = async () => {
    if (loading) return;

    // --------------------------------------------------------
    // ✅ VALIDATION
    // --------------------------------------------------------

    if (!title.trim()) {
      Alert.alert(
        "Product title required",
        "Please enter the name of your product."
      );
      return;
    }

    if (!category) {
      Alert.alert(
        "Category required",
        "Please select a product category."
      );
      return;
    }

    if (price.trim() && (
      !Number.isFinite(Number(price)) ||
      Number(price) < 0
    )) {
      Alert.alert(
        "Invalid price",
        "Please enter a valid product price."
      );
      return;
    }

    if (isDeal) {
      if (
        !dealPrice.trim() ||
        !Number.isFinite(Number(dealPrice)) ||
        Number(dealPrice) <= 0
      ) {
        Alert.alert(
          "Friday Deal price required",
          "Enter a valid Friday Deal price."
        );
        return;
      }

      if (
        price.trim() &&
        Number(dealPrice) >= Number(price)
      ) {
        Alert.alert(
          "Invalid Friday Deal price",
          "The Friday Deal price should be lower than the normal price."
        );
        return;
      }
    }

    if (!imageUris.length && !videoUri) {
      // Media is optional, so publishing without media remains allowed.
    }

    setLoading(true);
    setUploading(true);
    setProgress(0);

    try {
      // ------------------------------------------------------
      // 👤 AUTHENTICATION
      // ------------------------------------------------------

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        Alert.alert(
          "Login required",
          "Please log in before publishing an item."
        );
        return;
      }

      // ------------------------------------------------------
      // 📊 MEDIA UPLOAD PROGRESS
      // ------------------------------------------------------

      const totalFiles =
        imageUris.length + (videoUri ? 1 : 0);

      let completedFiles = 0;

      const updateOverallProgress = (fileProgress: number) => {
        if (totalFiles === 0) {
          setProgress(100);
          return;
        }

        const overall =
          ((completedFiles + fileProgress / 100) /
            totalFiles) *
          100;

        setProgress(Math.min(100, Math.round(overall)));
      };

      // ------------------------------------------------------
      // 🖼️ UPLOAD IMAGES
      // ------------------------------------------------------

      const uploadedImages: string[] = [];

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
              format: ImageManipulator.SaveFormat.JPEG,
            }
          );

        const uploaded = await uploadFile(
          compressed.uri,
          "image",
          updateOverallProgress
        );

        uploadedImages.push(uploaded);

        completedFiles++;

        updateOverallProgress(100);
      }

      // ------------------------------------------------------
      // 🎥 UPLOAD VIDEO
      // ------------------------------------------------------

      let videoUrl: string | null = null;

      if (videoUri) {
        videoUrl = await uploadFile(
          videoUri,
          "video",
          updateOverallProgress
        );

        completedFiles++;

        updateOverallProgress(100);
      }

      // ------------------------------------------------------
      // 🔥 FRIDAY DEAL SCHEDULE
      // ------------------------------------------------------

      const now = new Date();

      const start = new Date(now);

      const day = start.getDay();

      // Friday = 5
      const daysUntilFriday =
        day <= 5 ? 5 - day : 12 - day;

      start.setDate(
        start.getDate() + daysUntilFriday
      );

      start.setHours(0, 0, 0, 0);

      const end = new Date(start);

      end.setHours(23, 59, 59, 999);

      // ------------------------------------------------------
      // 💾 SAVE ITEM TO DATABASE
      // ------------------------------------------------------

      const { data: newItem, error } = await (
        supabase as any
      )
        .from("items_live")
        .insert({
          title: title.trim(),

          description: description.trim(),

          price: price.trim()
            ? Number(price)
            : null,

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

          location: location.trim(),

          latitude,
          longitude,

          image_url:
            uploadedImages[0] || null,

          image_urls: uploadedImages,

          video_url: videoUrl,

          user_id: user.id,

          is_negotiable: isNegotiable,

          category,

          status: "active",
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // ------------------------------------------------------
      // 🎉 SUCCESS
      // ------------------------------------------------------

      Alert.alert(
        "Published successfully! 🚀",
        "Your item has been published on Nasara."
      );

      // ------------------------------------------------------
      // 🧹 CLEAR FORM
      // ------------------------------------------------------

      setTitle("");
      setDescription("");
      setPrice("");
      setLocation("");
      setCategory("");
      setIsDeal(false);
      setDealPrice("");
      setIsNegotiable(false);
      setImageUris([]);
      setVideoUri(null);
      setProgress(100);

      // ------------------------------------------------------
      // 🏠 RETURN TO BROWSE
      // ------------------------------------------------------

      router.replace("/browse");

      // ------------------------------------------------------
      // 🔔 SEND NOTIFICATIONS IN BACKGROUND
      // ------------------------------------------------------

      void sendItemNotifications(
        user.id,
        newItem.id,
        title.trim(),
        isDeal,
        dealPrice
      );
    } catch (err) {
      console.error("Sell item error:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong while publishing your item.";

      Alert.alert(
        "Publishing failed",
        message
      );
    } finally {
      setUploading(false);
      setLoading(false);
    }
  };

  // ==========================================================
  // 🔵 QUICK ACTIONS
  // ==========================================================

  const quickActions: QuickCardProps[] = [
    {
      icon: "videocam",
      title: "Create Reel",
      subtitle: "Share videos",
      color: "#D94B70",
      onPress: () => router.push("/create-reel"),
    },
    {
      icon: "shield",
      title: "Election",
      subtitle: "Create battle",
      color: "#5556C9",
      onPress: () => router.push("/create-battle"),
    },
    {
      icon: "cash",
      title: "Create Ad",
      subtitle: "Advertise",
      color: "#159B70",
      onPress: () => router.push("/ads/create"),
    },
    {
      icon: "images",
      title: "Banner",
      subtitle: "Promote brand",
      color: "#C48C32",
      onPress: () => router.push("/banner/create"),
    },
    {
      icon: "trophy",
      title: "Auction",
      subtitle: "Start auction",
      color: "#7952C7",
      onPress: () => router.push("/go-auction"),
    },
    {
      icon: "radio",
      title: "Go Live",
      subtitle: "Start streaming",
      color: "#D64B4B",
      onPress: () => router.push("/golive"),
    },
    {
      icon: "radio-outline",
      title: "Normal Live",
      subtitle: "Live session",
      color: "#C75A37",
      onPress: () => router.push("/go-live"),
    },
    {
      icon: "school",
      title: "Mentor",
      subtitle: "Become a mentor",
      color: "#758F30",
      onPress: () => router.push("/mentor/apply"),
    },
    {
      icon: "people",
      title: "Find Mentor",
      subtitle: "Get guidance",
      color: "#3489A9",
      onPress: () => router.push("/mentor/request"),
    },
    {
      icon: "bicycle",
      title: "Delivery",
      subtitle: "Delivery services",
      color: "#D77932",
      onPress: () => router.push("/delivery"),
    },
    {
      icon: "heart",
      title: "Health",
      subtitle: "Health services",
      color: "#249B70",
      onPress: () => router.push("/health"),
    },
    {
      icon: "restaurant",
      title: "Restaurant",
      subtitle: "Explore restaurants",
      color: "#B94C4C",
      onPress: () => router.push("/restaurants"),
    },
  ];

  // ==========================================================
  // 🟡 SCREEN UI
  // ==========================================================

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ================================================== */}
      {/* 🔵 HEADER */}
      {/* ================================================== */}

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.brand}>NASARA</Text>

            <Text style={styles.headerLabel}>
              SELL & GROW
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons
              name="storefront-outline"
              size={27}
              color={COLORS.gold}
            />
          </View>
        </View>

        <Text style={styles.headerTitle}>
          Turn your products{"\n"}
          into opportunities.
        </Text>

        <Text style={styles.headerDescription}>
          Reach more customers, showcase your products
          and grow your business with Nasara.
        </Text>

        <View style={styles.headerBadge}>
          <Ionicons
            name="sparkles"
            size={15}
            color={COLORS.gold}
          />

          <Text style={styles.headerBadgeText}>
            YOUR MARKETPLACE STARTS HERE
          </Text>
        </View>
      </View>

      {/* ================================================== */}
      {/* 🟡 QUICK ACTIONS */}
      {/* ================================================== */}

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>
              Quick Actions
            </Text>

            <Text style={styles.sectionSubtitle}>
              Explore more ways to grow on Nasara
            </Text>
          </View>

          <Ionicons
            name="grid-outline"
            size={22}
            color={COLORS.gold}
          />
        </View>

        <View style={styles.quickGrid}>
          {quickActions.map((item) => (
            <QuickCard
              key={item.title}
              {...item}
            />
          ))}
        </View>
      </View>

      {/* ================================================== */}
      {/* 🟢 SELL ITEM FORM */}
      {/* ================================================== */}

      <View style={styles.formCard}>
        <View style={styles.formHeader}>
          <View style={styles.formIcon}>
            <Ionicons
              name="pricetag-outline"
              size={25}
              color={COLORS.gold}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.formTitle}>
              Sell an Item
            </Text>

            <Text style={styles.formSubtitle}>
              Create your marketplace listing
            </Text>
          </View>

          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />

            <Text style={styles.activeText}>
              ACTIVE
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ------------------------------------------------ */}
        {/* 📝 PRODUCT TITLE */}
        {/* ------------------------------------------------ */}

        <InputLabel
          title="Product Title"
          required
        />

        <TextInput
          placeholder="e.g. iPhone 15 Pro Max"
          placeholderTextColor={COLORS.muted}
          style={styles.input}
          value={title}
          onChangeText={setTitle}
        />

        {/* ------------------------------------------------ */}
        {/* 📄 DESCRIPTION */}
        {/* ------------------------------------------------ */}

        <InputLabel title="Description" />

        <TextInput
          placeholder="Describe your product, condition and features..."
          placeholderTextColor={COLORS.muted}
          multiline
          textAlignVertical="top"
          style={[
            styles.input,
            styles.descriptionInput,
          ]}
          value={description}
          onChangeText={setDescription}
        />

        {/* ------------------------------------------------ */}
        {/* 💰 PRICE */}
        {/* ------------------------------------------------ */}

        <InputLabel title="Selling Price (GH₵)" />

        <View style={styles.priceInputContainer}>
          <View style={styles.currencyBadge}>
            <Text style={styles.currencyText}>
              GH₵
            </Text>
          </View>

          <TextInput
            placeholder="Enter your price"
            placeholderTextColor={COLORS.muted}
            keyboardType="decimal-pad"
            style={styles.priceInput}
            value={price}
            onChangeText={setPrice}
          />
        </View>

        {/* ------------------------------------------------ */}
        {/* 📍 LOCATION */}
        {/* ------------------------------------------------ */}

        <InputLabel title="Product Location" />

        <View style={styles.locationInputContainer}>
          <Ionicons
            name="location-outline"
            size={21}
            color={COLORS.gold}
          />

          <TextInput
            placeholder="Tamale, Accra, Kumasi..."
            placeholderTextColor={COLORS.muted}
            style={styles.locationInput}
            value={location}
            onChangeText={setLocation}
          />

          {latitude !== null && (
            <Ionicons
              name="checkmark-circle"
              size={19}
              color={COLORS.green}
            />
          )}
        </View>

        {/* ------------------------------------------------ */}
        {/* 🗂️ CATEGORY */}
        {/* ------------------------------------------------ */}

        <InputLabel
          title="Product Category"
          required
        />

        <View style={styles.categoryGrid}>
          {categories.map((cat) => {
            const selected = category === cat;

            return (
              <TouchableOpacity
                key={cat}
                activeOpacity={0.8}
                onPress={() => setCategory(cat)}
                style={[
                  styles.categoryButton,
                  selected && styles.categoryButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selected && styles.categoryTextSelected,
                  ]}
                >
                  {cat}
                </Text>

                {selected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={COLORS.gold}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ------------------------------------------------ */}
        {/* 🤝 NEGOTIABLE */}
        {/* ------------------------------------------------ */}

        <View style={styles.optionCard}>
          <View style={styles.optionIcon}>
            <Ionicons
              name="hand-left-outline"
              size={22}
              color={COLORS.gold}
            />
          </View>

          <View style={styles.optionTextContainer}>
            <Text style={styles.optionTitle}>
              Negotiable Price
            </Text>

            <Text style={styles.optionDescription}>
              Allow buyers to make offers
            </Text>
          </View>

          <Switch
            value={isNegotiable}
            onValueChange={setIsNegotiable}
            trackColor={{
              false: "#D9DEE8",
              true: COLORS.gold,
            }}
            thumbColor={COLORS.white}
          />
        </View>

        {/* ------------------------------------------------ */}
        {/* 🔥 FRIDAY DEAL */}
        {/* ------------------------------------------------ */}

        <View style={styles.dealCard}>
          <View style={styles.dealHeader}>
            <View style={styles.dealIcon}>
              <Ionicons
                name="flame"
                size={23}
                color="#B87916"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.dealTitle}>
                Friday Market Deal
              </Text>

              <Text style={styles.dealSubtitle}>
                Give customers a special price
              </Text>
            </View>

            <Switch
              value={isDeal}
              onValueChange={(value) => {
                setIsDeal(value);

                if (!value) {
                  setDealPrice("");
                }
              }}
              trackColor={{
                false: "#E5D9BC",
                true: COLORS.gold,
              }}
              thumbColor={COLORS.white}
            />
          </View>

          {isDeal && (
            <View style={styles.dealPriceSection}>
              <Text style={styles.dealPriceLabel}>
                Friday Deal Price (GH₵)
              </Text>

              <TextInput
                placeholder="Enter special price"
                placeholderTextColor="#A58C62"
                keyboardType="decimal-pad"
                value={dealPrice}
                onChangeText={setDealPrice}
                style={styles.dealPriceInput}
              />

              <Text style={styles.dealNote}>
                Your product will be marked as a Friday Deal.
              </Text>
            </View>
          )}
        </View>

        {/* ------------------------------------------------ */}
        {/* 🖼️ IMAGES */}
        {/* ------------------------------------------------ */}

        <View style={styles.mediaHeading}>
          <View>
            <Text style={styles.mediaTitle}>
              Product Images
            </Text>

            <Text style={styles.mediaSubtitle}>
              Add up to 10 product images
            </Text>
          </View>

          <View style={styles.mediaCount}>
            <Text style={styles.mediaCountText}>
              {imageUris.length}/10
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={pickImage}
          style={styles.imagePicker}
        >
          <View style={styles.mediaPickerIcon}>
            <Ionicons
              name="images-outline"
              size={30}
              color={COLORS.navy}
            />
          </View>

          <Text style={styles.mediaPickerTitle}>
            Select Product Images
          </Text>

          <Text style={styles.mediaPickerSubtitle}>
            Choose clear photos of your product
          </Text>

          <View style={styles.selectButton}>
            <Ionicons
              name="add"
              size={18}
              color={COLORS.white}
            />

            <Text style={styles.selectButtonText}>
              Choose Images
            </Text>
          </View>
        </TouchableOpacity>

        {/* ------------------------------------------------ */}
        {/* 🖼️ IMAGE PREVIEWS */}
        {/* ------------------------------------------------ */}

        {imageUris.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imagePreviewScroll}
          >
            {imageUris.map((uri, index) => (
              <View
                key={`${uri}-${index}`}
                style={styles.imagePreviewContainer}
              >
                <Image
                  source={{ uri }}
                  style={styles.imagePreview}
                />

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => removeImage(index)}
                  style={styles.removeMediaButton}
                >
                  <Ionicons
                    name="close"
                    size={17}
                    color={COLORS.white}
                  />
                </TouchableOpacity>

                {index === 0 && (
                  <View style={styles.mainImageBadge}>
                    <Text style={styles.mainImageText}>
                      COVER
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        )}

        {/* ------------------------------------------------ */}
        {/* 🎥 VIDEO */}
        {/* ------------------------------------------------ */}

        <View style={styles.videoSection}>
          <Text style={styles.mediaTitle}>
            Product Video
          </Text>

          <Text style={styles.mediaSubtitle}>
            Show customers your product in action
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={pickVideo}
            style={styles.videoPicker}
          >
            <View style={styles.videoIcon}>
              <Ionicons
                name="videocam-outline"
                size={30}
                color="#B77A20"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.videoPickerTitle}>
                Select a Video
              </Text>

              <Text style={styles.videoPickerSubtitle}>
                Choose a video from your device
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={21}
              color={COLORS.muted}
            />
          </TouchableOpacity>

          {videoUri && (
            <View style={styles.videoSelected}>
              <Ionicons
                name="checkmark-circle"
                size={21}
                color={COLORS.green}
              />

              <Text style={styles.videoSelectedText}>
                Video selected successfully
              </Text>

              <TouchableOpacity
                onPress={removeVideo}
                style={styles.videoRemove}
              >
                <Ionicons
                  name="trash-outline"
                  size={19}
                  color={COLORS.red}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* ================================================== */}
      {/* 📊 UPLOAD PROGRESS */}
      {/* ================================================== */}

      {uploading && (
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View style={styles.progressIcon}>
              <Ionicons
                name="cloud-upload-outline"
                size={22}
                color={COLORS.gold}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.progressTitle}>
                Publishing your item
              </Text>

              <Text style={styles.progressSubtitle}>
                Please wait while we upload your media
              </Text>
            </View>

            <Text style={styles.progressPercentage}>
              {progress}%
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress}%`,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* ================================================== */}
      {/* 🚀 PUBLISH BUTTON */}
      {/* ================================================== */}

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={postItem}
        disabled={loading}
        style={[
          styles.publishButton,
          loading && styles.publishButtonDisabled,
        ]}
      >
        <View style={styles.publishIcon}>
          <Ionicons
            name={
              loading
                ? "cloud-upload-outline"
                : "rocket-outline"
            }
            size={25}
            color={COLORS.navy}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.publishTitle}>
            {loading ? "Publishing..." : "Publish Item"}
          </Text>

          <Text style={styles.publishSubtitle}>
            {loading
              ? "Please wait..."
              : "Make your product available on Nasara"}
          </Text>
        </View>

        {!loading && (
          <Ionicons
            name="arrow-forward-circle"
            size={31}
            color={COLORS.navy}
          />
        )}
      </TouchableOpacity>

      {/* ================================================== */}
      {/* 🔒 FOOTER */}
      {/* ================================================== */}

      <View style={styles.footer}>
        <Ionicons
          name="shield-checkmark-outline"
          size={17}
          color={COLORS.muted}
        />

        <Text style={styles.footerText}>
          Your marketplace listing is managed through Nasara.
        </Text>
      </View>
    </ScrollView>
  );
}

// ============================================================
// 🟡 INPUT LABEL COMPONENT
// ============================================================

const InputLabel = ({
  title,
  required = false,
}: {
  title: string;
  required?: boolean;
}) => (
  <Text style={styles.label}>
    {title}

    {required && (
      <Text style={styles.required}>
        {" "}*
      </Text>
    )}
  </Text>
);

// ============================================================
// 🔵 QUICK ACTION CARD
// ============================================================

const QuickCard = ({
  icon,
  title,
  subtitle,
  color,
  onPress,
}: QuickCardProps) => (
  <TouchableOpacity
    activeOpacity={0.82}
    onPress={onPress}
    style={styles.quickCard}
  >
    <View
      style={[
        styles.quickCardIcon,
        { backgroundColor: color },
      ]}
    >
      <Ionicons
        name={icon}
        size={23}
        color={COLORS.white}
      />
    </View>

    <Text
      style={styles.quickCardTitle}
      numberOfLines={2}
    >
      {title}
    </Text>

    <Text
      style={styles.quickCardSubtitle}
      numberOfLines={1}
    >
      {subtitle}
    </Text>

    <View style={styles.quickCardArrow}>
      <Ionicons
        name="arrow-forward"
        size={13}
        color={COLORS.gold}
      />
    </View>
  </TouchableOpacity>
);

// ============================================================
// 🎨 STYLES
// ============================================================

const styles = StyleSheet.create({
  // ----------------------------------------------------------
  // 🔵 GENERAL
  // ----------------------------------------------------------

  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  container: {
    padding: 16,
    paddingBottom: 45,
  },

  // ----------------------------------------------------------
  // 🔵 HEADER
  // ----------------------------------------------------------

  header: {
    backgroundColor: COLORS.navy,
    borderRadius: 25,
    padding: 23,
    marginBottom: 27,
    overflow: "hidden",
  },

  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  brand: {
    color: COLORS.white,
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: 3,
  },

  headerLabel: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 3,
    marginTop: 4,
  },

  headerIcon: {
    width: 53,
    height: 53,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.09)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(214,173,85,0.4)",
  },

  headerTitle: {
    color: COLORS.white,
    fontSize: 29,
    fontWeight: "900",
    lineHeight: 37,
    marginTop: 28,
  },

  headerDescription: {
    color: "#C5CDDA",
    fontSize: 13,
    lineHeight: 21,
    marginTop: 12,
  },

  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(214,173,85,0.13)",
    borderWidth: 1,
    borderColor: "rgba(214,173,85,0.35)",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 30,
    marginTop: 22,
  },

  headerBadgeText: {
    color: COLORS.gold,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    marginLeft: 7,
  },

  // ----------------------------------------------------------
  // 🟡 SECTION HEADINGS
  // ----------------------------------------------------------

  section: {
    marginBottom: 27,
  },

  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 21,
    fontWeight: "900",
  },

  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 5,
  },

  // ----------------------------------------------------------
  // 🔵 QUICK ACTION GRID
  // ----------------------------------------------------------

  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  quickCard: {
    width: "31.5%",
    backgroundColor: COLORS.white,
    borderRadius: 19,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 139,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.035,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  quickCardIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 11,
  },

  quickCardTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "900",
  },

  quickCardSubtitle: {
    color: COLORS.muted,
    fontSize: 9,
    marginTop: 5,
  },

  quickCardArrow: {
    position: "absolute",
    top: 13,
    right: 11,
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: COLORS.goldLight,
    alignItems: "center",
    justifyContent: "center",
  },

  // ----------------------------------------------------------
  // 🟡 FORM CARD
  // ----------------------------------------------------------

  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 25,
    padding: 19,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.045,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  formHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  formIcon: {
    width: 49,
    height: 49,
    borderRadius: 16,
    backgroundColor: COLORS.goldLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  formTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
  },

  formSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 4,
  },

  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAF8F1",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
  },

  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.green,
    marginRight: 5,
  },

  activeText: {
    color: COLORS.green,
    fontSize: 9,
    fontWeight: "900",
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 19,
  },

  // ----------------------------------------------------------
  // 📝 INPUTS
  // ----------------------------------------------------------

  label: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 17,
    marginBottom: 9,
  },

  required: {
    color: COLORS.red,
  },

  input: {
    backgroundColor: "#F8F9FC",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 14,
    color: COLORS.text,
  },

  descriptionInput: {
    height: 110,
    paddingTop: 14,
  },

  // ----------------------------------------------------------
  // 💰 PRICE
  // ----------------------------------------------------------

  priceInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FC",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 12,
  },

  currencyBadge: {
    backgroundColor: COLORS.goldLight,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 9,
    marginRight: 9,
  },

  currencyText: {
    color: "#A97821",
    fontWeight: "900",
    fontSize: 13,
  },

  priceInput: {
    flex: 1,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 14,
  },

  // ----------------------------------------------------------
  // 📍 LOCATION
  // ----------------------------------------------------------

  locationInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FC",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 13,
  },

  locationInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 9,
    color: COLORS.text,
    fontSize: 14,
  },

  // ----------------------------------------------------------
  // 🗂️ CATEGORY
  // ----------------------------------------------------------

  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 2,
  },

  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FC",
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 30,
    marginRight: 7,
    marginBottom: 9,
  },

  categoryButtonSelected: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },

  categoryText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },

  categoryTextSelected: {
    color: COLORS.white,
    marginRight: 6,
  },

  // ----------------------------------------------------------
  // 🤝 NEGOTIABLE
  // ----------------------------------------------------------

  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FC",
    borderRadius: 16,
    padding: 13,
    marginTop: 21,
  },

  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.goldLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  optionTextContainer: {
    flex: 1,
  },

  optionTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "900",
  },

  optionDescription: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 4,
  },

  // ----------------------------------------------------------
  // 🔥 FRIDAY DEAL
  // ----------------------------------------------------------

  dealCard: {
    backgroundColor: "#FFF8E9",
    borderWidth: 1,
    borderColor: "#F1D9A5",
    borderRadius: 17,
    padding: 14,
    marginTop: 18,
  },

  dealHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  dealIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: "#FCEBC7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  dealTitle: {
    color: "#754C13",
    fontSize: 14,
    fontWeight: "900",
  },

  dealSubtitle: {
    color: "#A17C44",
    fontSize: 10,
    marginTop: 4,
  },

  dealPriceSection: {
    borderTopWidth: 1,
    borderTopColor: "#EEDBB9",
    marginTop: 15,
    paddingTop: 14,
  },

  dealPriceLabel: {
    color: "#754C13",
    fontWeight: "800",
    fontSize: 12,
    marginBottom: 9,
  },

  dealPriceInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: "#E8CF9D",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: COLORS.text,
    fontSize: 14,
  },

  dealNote: {
    color: "#A17C44",
    fontSize: 10,
    marginTop: 9,
  },

  // ----------------------------------------------------------
  // 🖼️ MEDIA
  // ----------------------------------------------------------

  mediaHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 25,
    marginBottom: 13,
  },

  mediaTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },

  mediaSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 5,
  },

  mediaCount: {
    backgroundColor: COLORS.goldLight,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
  },

  mediaCountText: {
    color: "#A97821",
    fontSize: 11,
    fontWeight: "900",
  },

  imagePicker: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: COLORS.gold,
    backgroundColor: "#FFFCF5",
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
  },

  mediaPickerIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: COLORS.goldLight,
    alignItems: "center",
    justifyContent: "center",
  },

  mediaPickerTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 12,
  },

  mediaPickerSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 5,
    textAlign: "center",
  },

  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.navy,
    borderRadius: 25,
    paddingHorizontal: 17,
    paddingVertical: 10,
    marginTop: 15,
  },

  selectButtonText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 5,
  },

  imagePreviewScroll: {
    marginTop: 15,
  },

  imagePreviewContainer: {
    position: "relative",
    marginRight: 12,
  },

  imagePreview: {
    width: 125,
    height: 125,
    borderRadius: 15,
    backgroundColor: "#E9EDF3",
  },

  removeMediaButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: COLORS.red,
    alignItems: "center",
    justifyContent: "center",
  },

  mainImageBadge: {
    position: "absolute",
    bottom: 7,
    left: 7,
    backgroundColor: COLORS.navy,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
  },

  mainImageText: {
    color: COLORS.gold,
    fontSize: 8,
    fontWeight: "900",
  },

  // ----------------------------------------------------------
  // 🎥 VIDEO
  // ----------------------------------------------------------

  videoSection: {
    marginTop: 25,
  },

  videoPicker: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFAF0",
    borderWidth: 1,
    borderColor: "#F0DEBC",
    padding: 13,
    borderRadius: 15,
    marginTop: 13,
  },

  videoIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#FCEBC7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  videoPickerTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "900",
  },

  videoPickerSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 4,
  },

  videoSelected: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAF8F1",
    borderRadius: 12,
    padding: 12,
    marginTop: 11,
  },

  videoSelectedText: {
    flex: 1,
    color: COLORS.green,
    fontWeight: "800",
    fontSize: 11,
    marginLeft: 8,
  },

  videoRemove: {
    padding: 6,
  },

  // ----------------------------------------------------------
  // 📊 UPLOAD PROGRESS
  // ----------------------------------------------------------

  progressCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 17,
    marginBottom: 19,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  progressIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: COLORS.goldLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  progressTitle: {
    color: COLORS.text,
    fontWeight: "900",
    fontSize: 13,
  },

  progressSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 4,
  },

  progressPercentage: {
    color: COLORS.gold,
    fontSize: 15,
    fontWeight: "900",
  },

  progressTrack: {
    height: 7,
    backgroundColor: "#E9EDF3",
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 16,
  },

  progressFill: {
    height: 7,
    backgroundColor: COLORS.gold,
    borderRadius: 10,
  },

  // ----------------------------------------------------------
  // 🚀 PUBLISH BUTTON
  // ----------------------------------------------------------

  publishButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.gold,
    borderRadius: 19,
    paddingHorizontal: 17,
    paddingVertical: 16,
    elevation: 5,
    shadowColor: COLORS.gold,
    shadowOpacity: 0.22,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  publishButtonDisabled: {
    opacity: 0.7,
  },

  publishIcon: {
    width: 47,
    height: 47,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  publishTitle: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: "900",
  },

  publishSubtitle: {
    color: "#59451F",
    fontSize: 10,
    marginTop: 4,
  },

  // ----------------------------------------------------------
  // 🔒 FOOTER
  // ----------------------------------------------------------

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },

  footerText: {
    color: COLORS.muted,
    fontSize: 10,
    marginLeft: 7,
    textAlign: "center",
  },
});