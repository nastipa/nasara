// ==========================================
// 📦 IMPORTS
// ==========================================

import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";

// ==========================================
// 🎨 NASARA PREMIUM COLOURS
// ==========================================

const COLORS = {
  navy: "#14213D",
  navyLight: "#203354",
  gold: "#D6A84F",
  goldLight: "#F8EFD9",
  background: "#F5F6FA",
  white: "#FFFFFF",
  text: "#172238",
  muted: "#7C8799",
  border: "#E5E9F0",
  green: "#16865B",
  greenLight: "#EAF7F0",
  red: "#D94B4B",
  redLight: "#FFF0F0",
};

// ==========================================
// ☁️ NASARA RENDER UPLOAD SERVER
// ==========================================

const UPLOAD_URL =
  "https://nasara-upload-server.onrender.com/upload";

// ==========================================
// 🧩 TYPES
// ==========================================

type LiveSession = {
  id: number;
};

// ==========================================
// 🎥 GO LIVE SCREEN
// ==========================================

export default function GoLiveScreen() {
  const router = useRouter();

  // ==========================================
  // 📝 LIVE SESSION STATES
  // ==========================================

  const [title, setTitle] = useState("");
  const [itemTitle, setItemTitle] = useState("");
  const [price, setPrice] = useState("");

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);

  const [live, setLive] = useState<LiveSession | null>(null);

  const [loading, setLoading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // ==========================================
  // 💬 MESSAGE HELPER
  // ==========================================

  const showMessage = (heading: string, message?: string) => {
    Alert.alert(heading, message);
  };

  // ==========================================
  // 📁 FILE INFORMATION
  // ==========================================

  const getFileInfo = (
    uri: string,
    type: "image" | "video"
  ) => {
    const extension =
      uri.split("?")[0].split(".").pop()?.toLowerCase() || "";

    if (type === "image") {
      const allowedExtensions = [
        "jpg",
        "jpeg",
        "png",
        "webp",
        "gif",
      ];

      const ext = allowedExtensions.includes(extension)
        ? extension
        : "jpg";

      const mimeTypes: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        gif: "image/gif",
      };

      return {
        name: `live_item.${ext}`,
        mimeType: mimeTypes[ext] || "image/jpeg",
      };
    }

    const allowedVideoExtensions = [
      "mp4",
      "mov",
      "m4v",
      "webm",
    ];

    const ext = allowedVideoExtensions.includes(extension)
      ? extension
      : "mp4";

    const videoMimeTypes: Record<string, string> = {
      mp4: "video/mp4",
      mov: "video/quicktime",
      m4v: "video/x-m4v",
      webm: "video/webm",
    };

    return {
      name: `live_item.${ext}`,
      mimeType: videoMimeTypes[ext] || "video/mp4",
    };
  };

  // ==========================================
  // 🖼️ PICK ITEM IMAGE
  // ==========================================

  const pickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        showMessage(
          "Permission Required",
          "Please allow Nasara to access your photo library."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error: any) {
      showMessage(
        "Image Selection Failed",
        error?.message || "Could not select your image."
      );
    }
  };

  // ==========================================
  // 🎬 PICK ITEM VIDEO
  // ==========================================

  const pickVideo = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        showMessage(
          "Permission Required",
          "Please allow Nasara to access your video library."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        quality: 1,
        videoMaxDuration: 120,
      });

      if (!result.canceled && result.assets.length > 0) {
        setVideoUri(result.assets[0].uri);
      }
    } catch (error: any) {
      showMessage(
        "Video Selection Failed",
        error?.message || "Could not select your video."
      );
    }
  };

  // ==========================================
  // ☁️ UPLOAD MEDIA TO NASARA RENDER
  // ==========================================

  const uploadMedia = async (
    uri: string,
    type: "image" | "video"
  ): Promise<string> => {
    const formData = new FormData();

    const fileInfo = getFileInfo(uri, type);

    if (Platform.OS === "web") {
      const fileResponse = await fetch(uri);

      if (!fileResponse.ok) {
        throw new Error("Could not read the selected media.");
      }

      const blob = await fileResponse.blob();

      formData.append(
        "file",
        blob,
        fileInfo.name
      );
    } else {
      formData.append(
        "file",
        {
          uri,
          name: fileInfo.name,
          type: fileInfo.mimeType,
        } as any
      );
    }

    const response = await fetch(UPLOAD_URL, {
      method: "POST",
      body: formData,
    });

    let data: any;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        "The upload server returned an invalid response."
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.error ||
        data?.message ||
        `Upload failed with status ${response.status}.`
      );
    }

    const uploadedUrl =
      data?.url ||
      data?.image_url ||
      data?.video_url ||
      data?.secure_url ||
      data?.file_url ||
      data?.data?.url ||
      data?.data?.image_url ||
      data?.data?.video_url;

    if (!uploadedUrl || typeof uploadedUrl !== "string") {
      throw new Error(
        "The upload server did not return a media URL. Please check its response format."
      );
    }

    return uploadedUrl;
  };

  // ==========================================
  // 🖼️ UPLOAD LIVE ITEM IMAGE
  // ==========================================

  const uploadLiveImage = async () => {
    if (!imageUri) {
      throw new Error("No image selected.");
    }

    return uploadMedia(imageUri, "image");
  };

  // ==========================================
  // 🎥 UPLOAD LIVE ITEM VIDEO
  // ==========================================

  const uploadLiveVideo = async (uri: string) => {
    setUploadingVideo(true);

    try {
      return await uploadMedia(uri, "video");
    } finally {
      setUploadingVideo(false);
    }
  };

  // ==========================================
  // 🔴 START LIVE SESSION
  // ==========================================

  const startLive = async () => {
    if (!title.trim()) {
      showMessage(
        "Enter Live Title",
        "Please enter a title for your live session."
      );
      return;
    }

    setLoading(true);

    try {
      // ==========================================
      // 🔐 CHECK USER LOGIN
      // ==========================================

      const auth = await supabase.auth.getUser();

      if (auth.error) {
        throw auth.error;
      }

      if (!auth.data.user) {
        showMessage(
          "Login Required",
          "Please login before going live."
        );
        return;
      }

      // ==========================================
      // 💳 CHECK SELLER MOMO DETAILS
      // ==========================================

      const profileRes = await (supabase as any)
        .from("profiles")
        .select("momo_name, momo_number")
        .eq("id", auth.data.user.id)
        .single();

      if (profileRes.error) {
        throw profileRes.error;
      }

      if (
        !profileRes.data?.momo_name ||
        !profileRes.data?.momo_number
      ) {
        showMessage(
          "MoMo Required",
          "Please add your MoMo account in Profile before going live."
        );
        return;
      }

      // ==========================================
      // 💾 CREATE LIVE SESSION
      // ==========================================

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

      if (res.error) {
        throw res.error;
      }

      if (!res.data) {
        throw new Error("Could not create your live session.");
      }

      // ==========================================
      // ✅ LIVE SESSION STARTED
      // ==========================================

      setLive({
        id: res.data.id,
      });

      showMessage(
        "You Are Live!",
        "Your live session has started. You can now add products for buyers."
      );
    } catch (error: any) {
      console.error("Start live error:", error);

      showMessage(
        "Failed to Start Live",
        error?.message || "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 🛍️ ADD LIVE ITEM
  // ==========================================

  const addItem = async () => {
    if (!live) {
      showMessage(
        "Start Live First",
        "Please start your live session before adding an item."
      );
      return;
    }

    if (!itemTitle.trim()) {
      showMessage(
        "Missing Item Title",
        "Please enter the product name."
      );
      return;
    }

    if (!price.trim()) {
      showMessage(
        "Missing Price",
        "Please enter the product price."
      );
      return;
    }

    const itemPrice = Number(price);

    if (!Number.isFinite(itemPrice) || itemPrice <= 0) {
      showMessage(
        "Invalid Price",
        "Please enter a valid price greater than zero."
      );
      return;
    }

    if (!imageUri && !videoUri) {
      showMessage(
        "Product Media Required",
        "Please select an image or video for your product."
      );
      return;
    }

    setLoading(true);

    try {
      let imageUrl: string | null = null;
      let videoUrl: string | null = null;

      // ==========================================
      // 🖼️ UPLOAD IMAGE
      // ==========================================

      if (imageUri) {
        imageUrl = await uploadLiveImage();
      }

      // ==========================================
      // 🎥 UPLOAD VIDEO
      // ==========================================

      if (videoUri) {
        videoUrl = await uploadLiveVideo(videoUri);
      }

      // ==========================================
      // 💾 SAVE LIVE ITEM
      // ==========================================

      const res = await (supabase as any)
        .from("live_items")
        .insert({
          live_session_id: live.id,
          title: itemTitle.trim(),
          price: itemPrice,
          image_url: imageUrl,
          video_url: videoUrl,
        });

      if (res.error) {
        throw res.error;
      }

      // ==========================================
      // 🧹 CLEAR ITEM FORM
      // ==========================================

      setItemTitle("");
      setPrice("");
      setImageUri(null);
      setVideoUri(null);

      showMessage(
        "Item Added Successfully",
        "Your product has been added to your live session."
      );
    } catch (error: any) {
      console.error("Add live item error:", error);

      showMessage(
        "Failed to Add Item",
        error?.message || "Something went wrong while adding your product."
      );
    } finally {
      setLoading(false);
      setUploadingVideo(false);
    }
  };

  // ==========================================
  // ⏹️ END LIVE SESSION
  // ==========================================

  const endLive = async () => {
    if (!live) return;

    Alert.alert(
      "End Live Session?",
      "Are you sure you want to end your live session?",
      [
        {
          text: "Continue Live",
          style: "cancel",
        },
        {
          text: "End Live",
          style: "destructive",
          onPress: async () => {
            setLoading(true);

            try {
              const { error } = await (supabase as any)
                .from("live_sessions")
                .update({
                  is_live: false,
                })
                .eq("id", live.id);

              if (error) {
                throw error;
              }

              setLive(null);

              router.replace("/(tabs)/browse");
            } catch (error: any) {
              console.error("End live error:", error);

              showMessage(
                "Could Not End Live",
                error?.message || "Something went wrong."
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // ==========================================
  // 🖥️ SCREEN UI
  // ==========================================

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ======================================
            🔵 HEADER
        ====================================== */}

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Ionicons
              name="arrow-back"
              size={21}
              color={COLORS.white}
            />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.headerEyebrow}>
              NASARA LIVE
            </Text>

            <Text style={styles.headerTitle}>
              Go Live
            </Text>

            <Text style={styles.headerSubtitle}>
              Connect with buyers and showcase your products.
            </Text>
          </View>

          <View style={styles.liveHeaderIcon}>
            <Ionicons
              name="radio-outline"
              size={27}
              color={COLORS.gold}
            />
          </View>
        </View>

        {/* ======================================
            🔴 LIVE STATUS
        ====================================== */}

        <View
          style={[
            styles.statusCard,
            live && styles.statusCardLive,
          ]}
        >
          <View
            style={[
              styles.statusIcon,
              live && styles.statusIconLive,
            ]}
          >
            <Ionicons
              name={live ? "radio" : "videocam-outline"}
              size={23}
              color={live ? COLORS.green : COLORS.navy}
            />
          </View>

          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>
              {live ? "Your session is live" : "Ready to go live?"}
            </Text>

            <Text style={styles.statusDescription}>
              {live
                ? "Your live session is active. Add products for buyers."
                : "Create a live session to start showcasing your products."}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              live && styles.statusBadgeLive,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                live && styles.statusDotLive,
              ]}
            />

            <Text
              style={[
                styles.statusBadgeText,
                live && styles.statusBadgeTextLive,
              ]}
            >
              {live ? "LIVE" : "OFFLINE"}
            </Text>
          </View>
        </View>

        {/* ======================================
            🔴 BEFORE GOING LIVE
        ====================================== */}

        {!live && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <View style={styles.sectionIcon}>
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color={COLORS.navy}
                  />
                </View>

                <View>
                  <Text style={styles.sectionTitle}>
                    Live Session Details
                  </Text>

                  <Text style={styles.sectionSubtitle}>
                    Tell buyers what your live session is about.
                  </Text>
                </View>
              </View>

              <Text style={styles.inputLabel}>
                Live Title
              </Text>

              <View style={styles.inputWrapper}>
                <Ionicons
                  name="videocam-outline"
                  size={19}
                  color={COLORS.muted}
                />

                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Example: Today's Fresh Market"
                  placeholderTextColor="#A5ADBA"
                  style={styles.input}
                  editable={!loading}
                  maxLength={100}
                />
              </View>

              <Text style={styles.characterCount}>
                {title.length}/100 characters
              </Text>
            </View>

            <View style={styles.infoCard}>
              <Ionicons
                name="information-circle-outline"
                size={21}
                color={COLORS.gold}
              />

              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>
                  MoMo Account Required
                </Text>

                <Text style={styles.infoDescription}>
                  Your MoMo account must be saved in your Nasara
                  profile before you can start a live session.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.startLiveButton,
                loading && styles.disabledButton,
              ]}
              onPress={startLive}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator
                  color={COLORS.white}
                  size="small"
                />
              ) : (
                <Ionicons
                  name="radio"
                  size={21}
                  color={COLORS.white}
                />
              )}

              <Text style={styles.startLiveButtonText}>
                {loading ? "Starting Session..." : "Start Live Session"}
              </Text>

              {!loading && (
                <Ionicons
                  name="arrow-forward"
                  size={19}
                  color={COLORS.white}
                />
              )}
            </TouchableOpacity>
          </>
        )}

        {/* ======================================
            🛍️ LIVE SESSION ACTIVE
        ====================================== */}

        {live && (
          <>
            <View style={styles.liveSessionBanner}>
              <View style={styles.liveSessionBannerTop}>
                <View style={styles.liveNowBadge}>
                  <View style={styles.liveNowDot} />

                  <Text style={styles.liveNowText}>
                    LIVE NOW
                  </Text>
                </View>

                <Ionicons
                  name="radio"
                  size={27}
                  color={COLORS.gold}
                />
              </View>

              <Text style={styles.liveSessionTitle}>
                {title}
              </Text>

              <Text style={styles.liveSessionDescription}>
                Your session is active. Add products below to
                showcase them to your buyers.
              </Text>

              <View style={styles.liveSessionId}>
                <Text style={styles.liveSessionIdText}>
                  Session ID: {live.id}
                </Text>
              </View>
            </View>

            {/* ======================================
                📝 ADD PRODUCT SECTION
            ====================================== */}

            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <View style={styles.sectionIcon}>
                  <Ionicons
                    name="pricetag-outline"
                    size={20}
                    color={COLORS.navy}
                  />
                </View>

                <View>
                  <Text style={styles.sectionTitle}>
                    Add Live Product
                  </Text>

                  <Text style={styles.sectionSubtitle}>
                    Add a product for buyers to see.
                  </Text>
                </View>
              </View>

              {/* ======================================
                  🛍️ ITEM TITLE
              ====================================== */}

              <Text style={styles.inputLabel}>
                Product Name
              </Text>

              <View style={styles.inputWrapper}>
                <Ionicons
                  name="cube-outline"
                  size={19}
                  color={COLORS.muted}
                />

                <TextInput
                  value={itemTitle}
                  onChangeText={setItemTitle}
                  placeholder="Example: Samsung Galaxy S24"
                  placeholderTextColor="#A5ADBA"
                  style={styles.input}
                  editable={!loading}
                  maxLength={100}
                />
              </View>

              {/* ======================================
                  💰 PRODUCT PRICE
              ====================================== */}

              <Text style={[styles.inputLabel, styles.priceLabel]}>
                Selling Price (GH₵)
              </Text>

              <View style={styles.inputWrapper}>
                <Ionicons
                  name="cash-outline"
                  size={19}
                  color={COLORS.muted}
                />

                <TextInput
                  value={price}
                  onChangeText={setPrice}
                  placeholder="Enter product price"
                  placeholderTextColor="#A5ADBA"
                  keyboardType="decimal-pad"
                  style={styles.input}
                  editable={!loading}
                />
              </View>

              {/* ======================================
                  🖼️ PRODUCT IMAGE
              ====================================== */}

              <Text style={[styles.inputLabel, styles.mediaLabel]}>
                Product Image
              </Text>

              <TouchableOpacity
                style={[
                  styles.imageUploadBox,
                  imageUri && styles.imageUploadSelected,
                ]}
                onPress={pickImage}
                disabled={loading}
              >
                {imageUri ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.imagePreview}
                      resizeMode="cover"
                    />

                    <View style={styles.imageSelectedBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={17}
                        color={COLORS.green}
                      />

                      <Text style={styles.imageSelectedText}>
                        Image selected
                      </Text>
                    </View>

                    <View style={styles.changeImageButton}>
                      <Ionicons
                        name="camera-outline"
                        size={16}
                        color={COLORS.white}
                      />

                      <Text style={styles.changeImageText}>
                        Change
                      </Text>
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={styles.mediaIcon}>
                      <Ionicons
                        name="image-outline"
                        size={29}
                        color={COLORS.navy}
                      />
                    </View>

                    <Text style={styles.mediaTitle}>
                      Upload Product Image
                    </Text>

                    <Text style={styles.mediaDescription}>
                      Choose a clear picture of your product.
                    </Text>

                    <View style={styles.mediaAction}>
                      <Ionicons
                        name="add"
                        size={17}
                        color={COLORS.white}
                      />

                      <Text style={styles.mediaActionText}>
                        Choose Image
                      </Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>

              {/* ======================================
                  🎥 PRODUCT VIDEO
              ====================================== */}

              <Text style={[styles.inputLabel, styles.mediaLabel]}>
                Product Video (Optional)
              </Text>

              <TouchableOpacity
                style={[
                  styles.videoUploadBox,
                  videoUri && styles.videoUploadSelected,
                ]}
                onPress={pickVideo}
                disabled={loading}
              >
                <View style={styles.videoIcon}>
                  <Ionicons
                    name="videocam-outline"
                    size={24}
                    color={COLORS.navy}
                  />
                </View>

                <View style={styles.videoContent}>
                  <Text style={styles.videoTitle}>
                    {videoUri
                      ? "Video selected"
                      : "Add Product Video"}
                  </Text>

                  <Text style={styles.videoDescription}>
                    {videoUri
                      ? "Tap to choose another video."
                      : "Show buyers your product in action."}
                  </Text>
                </View>

                <Ionicons
                  name={
                    videoUri
                      ? "checkmark-circle"
                      : "add-circle-outline"
                  }
                  size={25}
                  color={videoUri ? COLORS.green : COLORS.gold}
                />
              </TouchableOpacity>

              {videoUri && (
                <View style={styles.videoSelectedNotice}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={COLORS.green}
                  />

                  <Text style={styles.videoSelectedText}>
                    Video ready for upload
                  </Text>

                  <TouchableOpacity
                    onPress={() => setVideoUri(null)}
                    disabled={loading}
                  >
                    <Text style={styles.removeText}>
                      Remove
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {imageUri && (
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setImageUri(null)}
                  disabled={loading}
                >
                  <Ionicons
                    name="trash-outline"
                    size={15}
                    color={COLORS.red}
                  />

                  <Text style={styles.removeImageText}>
                    Remove image
                  </Text>
                </TouchableOpacity>
              )}

              {/* ======================================
                  ☁️ UPLOAD INFORMATION
              ====================================== */}

              <View style={styles.uploadInfo}>
                <Ionicons
                  name="cloud-upload-outline"
                  size={17}
                  color={COLORS.muted}
                />

                <Text style={styles.uploadInfoText}>
                  Product images and videos are uploaded through
                  Nasara's media server.
                </Text>
              </View>

              {/* ======================================
                  🟢 ADD ITEM BUTTON
              ====================================== */}

              <TouchableOpacity
                onPress={addItem}
                disabled={loading}
                style={[
                  styles.addItemButton,
                  loading && styles.disabledButton,
                ]}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator
                    color={COLORS.white}
                    size="small"
                  />
                ) : (
                  <Ionicons
                    name="add-circle-outline"
                    size={21}
                    color={COLORS.white}
                  />
                )}

                <Text style={styles.addItemButtonText}>
                  {loading
                    ? uploadingVideo
                      ? "Uploading Video..."
                      : "Adding Product..."
                    : "Add Product to Live"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* ======================================
                ⏹️ END LIVE BUTTON
            ====================================== */}

            <TouchableOpacity
              onPress={endLive}
              disabled={loading}
              style={styles.endLiveButton}
              activeOpacity={0.85}
            >
              <Ionicons
                name="stop-circle-outline"
                size={21}
                color={COLORS.red}
              />

              <Text style={styles.endLiveButtonText}>
                End Live Session
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ======================================
            🏷️ FOOTER
        ====================================== */}

        <Text style={styles.footer}>
          POWERED BY NASARA
        </Text>
      </ScrollView>
    </View>
  );
}

// ==========================================
// 🎨 STYLES
// ==========================================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    paddingBottom: 45,
  },

  // ==========================================
  // 🔵 HEADER
  // ==========================================

  header: {
    backgroundColor: COLORS.navy,
    paddingTop: Platform.OS === "ios" ? 58 : 42,
    paddingHorizontal: 19,
    paddingBottom: 30,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  headerContent: {
    flex: 1,
  },

  headerEyebrow: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 6,
  },

  headerTitle: {
    color: COLORS.white,
    fontSize: 27,
    fontWeight: "900",
  },

  headerSubtitle: {
    color: "#C6CDDA",
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },

  liveHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(214,168,79,0.13)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  // ==========================================
  // 🔴 STATUS CARD
  // ==========================================

  statusCard: {
    marginHorizontal: 18,
    marginTop: 20,
    padding: 15,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  statusCardLive: {
    borderColor: "#B9E4CE",
    backgroundColor: "#F7FCF9",
  },

  statusIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.goldLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  statusIconLive: {
    backgroundColor: COLORS.greenLight,
  },

  statusContent: {
    flex: 1,
  },

  statusTitle: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: "900",
  },

  statusDescription: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F3F7",
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 20,
    marginLeft: 6,
  },

  statusBadgeLive: {
    backgroundColor: COLORS.greenLight,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: COLORS.muted,
    marginRight: 5,
  },

  statusDotLive: {
    backgroundColor: COLORS.green,
  },

  statusBadgeText: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "900",
  },

  statusBadgeTextLive: {
    color: COLORS.green,
  },

  // ==========================================
  // 📦 FORM SECTION
  // ==========================================

  section: {
    marginHorizontal: 18,
    marginTop: 20,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 21,
  },

  sectionIcon: {
    width: 41,
    height: 41,
    borderRadius: 13,
    backgroundColor: COLORS.goldLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  sectionTitle: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: "900",
  },

  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 4,
  },

  // ==========================================
  // 📝 INPUTS
  // ==========================================

  inputLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
  },

  inputWrapper: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    backgroundColor: "#FAFBFD",
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 10,
    paddingVertical: 12,
  },

  characterCount: {
    textAlign: "right",
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 7,
  },

  priceLabel: {
    marginTop: 18,
  },

  mediaLabel: {
    marginTop: 21,
  },

  // ==========================================
  // ℹ️ INFORMATION CARD
  // ==========================================

  infoCard: {
    marginHorizontal: 18,
    marginTop: 18,
    backgroundColor: COLORS.navy,
    borderRadius: 16,
    padding: 15,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  infoContent: {
    flex: 1,
    marginLeft: 10,
  },

  infoTitle: {
    color: COLORS.gold,
    fontSize: 13,
    fontWeight: "900",
  },

  infoDescription: {
    color: "#E1E6EF",
    fontSize: 11,
    lineHeight: 18,
    marginTop: 5,
  },

  // ==========================================
  // 🔴 START LIVE BUTTON
  // ==========================================

  startLiveButton: {
    marginHorizontal: 18,
    marginTop: 22,
    minHeight: 57,
    borderRadius: 15,
    backgroundColor: COLORS.navy,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    gap: 10,
  },

  startLiveButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "900",
  },

  disabledButton: {
    opacity: 0.65,
  },

  // ==========================================
  // 🔴 LIVE SESSION BANNER
  // ==========================================

  liveSessionBanner: {
    marginHorizontal: 18,
    marginTop: 20,
    backgroundColor: COLORS.navy,
    padding: 18,
    borderRadius: 19,
  },

  liveSessionBannerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  liveNowBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
  },

  liveNowDot: {
    width: 8,
    height: 8,
    borderRadius: 5,
    backgroundColor: "#FF5555",
    marginRight: 7,
  },

  liveNowText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },

  liveSessionTitle: {
    color: COLORS.white,
    fontSize: 21,
    fontWeight: "900",
  },

  liveSessionDescription: {
    color: "#D0D7E3",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 7,
  },

  liveSessionId: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 15,
  },

  liveSessionIdText: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: "800",
  },

  // ==========================================
  // 🖼️ IMAGE UPLOAD
  // ==========================================

  imageUploadBox: {
    minHeight: 185,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#C8CFDA",
    borderRadius: 16,
    backgroundColor: "#FAFBFD",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    overflow: "hidden",
  },

  imageUploadSelected: {
    borderStyle: "solid",
    borderColor: COLORS.gold,
    padding: 0,
  },

  mediaIcon: {
    width: 53,
    height: 53,
    borderRadius: 16,
    backgroundColor: COLORS.goldLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 11,
  },

  mediaTitle: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: "900",
  },

  mediaDescription: {
    color: COLORS.muted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 6,
  },

  mediaAction: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.navy,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 13,
  },

  mediaActionText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 5,
  },

  imagePreviewContainer: {
    width: "100%",
    height: 225,
  },

  imagePreview: {
    width: "100%",
    height: "100%",
  },

  imageSelectedBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
  },

  imageSelectedText: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 5,
  },

  changeImageButton: {
    position: "absolute",
    right: 10,
    bottom: 10,
    backgroundColor: COLORS.navy,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },

  changeImageText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 5,
  },

  // ==========================================
  // 🎥 VIDEO UPLOAD
  // ==========================================

  videoUploadBox: {
    minHeight: 72,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFBFD",
  },

  videoUploadSelected: {
    borderColor: COLORS.green,
    backgroundColor: "#F0FAF5",
  },

  videoIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: COLORS.goldLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  videoContent: {
    flex: 1,
  },

  videoTitle: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: "900",
  },

  videoDescription: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 4,
  },

  videoSelectedNotice: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 11,
    paddingHorizontal: 3,
  },

  videoSelectedText: {
    flex: 1,
    color: COLORS.green,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 6,
  },

  removeText: {
    color: COLORS.red,
    fontSize: 11,
    fontWeight: "800",
  },

  removeImageButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 11,
    paddingVertical: 5,
  },

  removeImageText: {
    color: COLORS.red,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 5,
  },

  uploadInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 16,
  },

  uploadInfoText: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 16,
    marginLeft: 8,
  },

  // ==========================================
  // 🟢 ADD ITEM BUTTON
  // ==========================================

  addItemButton: {
    marginTop: 20,
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: COLORS.green,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    gap: 9,
  },

  addItemButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "900",
  },

  // ==========================================
  // ⏹️ END LIVE BUTTON
  // ==========================================

  endLiveButton: {
    marginHorizontal: 18,
    marginTop: 18,
    minHeight: 53,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F0CACA",
    backgroundColor: COLORS.redLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  endLiveButtonText: {
    color: COLORS.red,
    fontSize: 13,
    fontWeight: "900",
  },

  // ==========================================
  // 🏷️ FOOTER
  // ==========================================

  footer: {
    textAlign: "center",
    color: "#A5ADBA",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2,
    marginTop: 28,
  },
});