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
  red: "#D94B4B",
};

// ==========================================
// ☁️ NASARA RENDER UPLOAD SERVER
// ==========================================

const UPLOAD_URL =
  "https://nasara-upload-server.onrender.com/upload";

// ==========================================
// 🧩 MAIN AUCTION SCREEN
// ==========================================

export default function GoAuctionScreen() {
  const router = useRouter();

  // ==========================================
  // 📝 AUCTION FORM STATES
  // ==========================================

  const [title, setTitle] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [duration, setDuration] = useState("5");

  const [loading, setLoading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // ==========================================
  // 🖼️ MEDIA STATES
  // ==========================================

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);

  // ==========================================
  // 💬 MESSAGE HELPER
  // ==========================================

  const showMessage = (heading: string, message: string) => {
    Alert.alert(heading, message);
  };

  // ==========================================
  // 📁 GET FILE INFORMATION
  // ==========================================

  const getFileInfo = (uri: string, type: "image" | "video") => {
    const extension =
      uri.split("?")[0].split(".").pop()?.toLowerCase() || "";

    const validImageExtensions = ["jpg", "jpeg", "png", "webp", "gif"];
    const validVideoExtensions = ["mp4", "mov", "m4v", "webm"];

    const imageExtension = validImageExtensions.includes(extension)
      ? extension
      : "jpg";

    const videoExtension = validVideoExtensions.includes(extension)
      ? extension
      : "mp4";

    if (type === "image") {
      const mimeTypes: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        gif: "image/gif",
      };

      return {
        name: `auction_image.${imageExtension}`,
        mimeType: mimeTypes[imageExtension] || "image/jpeg",
      };
    }

    const videoMimeTypes: Record<string, string> = {
      mp4: "video/mp4",
      mov: "video/quicktime",
      m4v: "video/x-m4v",
      webm: "video/webm",
    };

    return {
      name: `auction_video.${videoExtension}`,
      mimeType: videoMimeTypes[videoExtension] || "video/mp4",
    };
  };

  // ==========================================
  // 🖼️ PICK AUCTION IMAGE
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
        quality: 1,
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
  // 🎥 PICK AUCTION VIDEO
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
  // ☁️ UPLOAD MEDIA TO NASARA RENDER SERVER
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

    // Supports common response formats from the Nasara upload server.
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
        "Upload completed, but the server did not return a media URL. Check the /upload response format."
      );
    }

    return uploadedUrl;
  };

  // ==========================================
  // 🖼️ UPLOAD AUCTION IMAGE
  // ==========================================

  const uploadImage = async (uri: string) => {
    return uploadMedia(uri, "image");
  };

  // ==========================================
  // 🎥 UPLOAD AUCTION VIDEO
  // ==========================================

  const uploadVideo = async (uri: string) => {
    setUploadingVideo(true);

    try {
      return await uploadMedia(uri, "video");
    } finally {
      setUploadingVideo(false);
    }
  };

  // ==========================================
  // 🔥 START LIVE AUCTION
  // ==========================================

  const startAuction = async () => {
    // ==========================================
    // 🛡️ VALIDATION
    // ==========================================

    if (!title.trim()) {
      showMessage(
        "Missing Title",
        "Please enter an auction title."
      );
      return;
    }

    if (!startingPrice.trim()) {
      showMessage(
        "Missing Price",
        "Please enter your starting price."
      );
      return;
    }

    const price = Number(startingPrice);
    const auctionDuration = Number(duration);

    if (!Number.isFinite(price) || price <= 0) {
      showMessage(
        "Invalid Price",
        "Enter a valid starting price greater than zero."
      );
      return;
    }

    if (
      !Number.isInteger(auctionDuration) ||
      auctionDuration <= 0
    ) {
      showMessage(
        "Invalid Duration",
        "Enter a valid auction duration in minutes."
      );
      return;
    }

    if (!imageUri && !videoUri) {
      showMessage(
        "Missing Media",
        "Please upload an image or video for buyers to see."
      );
      return;
    }

    // ==========================================
    // 🔐 CHECK AUTHENTICATED USER
    // ==========================================

    setLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        showMessage(
          "Login Required",
          "Please login before starting an auction."
        );

        return;
      }

      // ==========================================
      // ☁️ UPLOAD IMAGE TO NASARA SERVER
      // ==========================================

      let imageUrl: string | null = null;
      let videoUrl: string | null = null;

      if (imageUri) {
        imageUrl = await uploadImage(imageUri);
      }

      // ==========================================
      // 🎥 UPLOAD VIDEO TO NASARA SERVER
      // ==========================================

      if (videoUri) {
        videoUrl = await uploadVideo(videoUri);
      }

      // ==========================================
      // 💾 SAVE AUCTION TO SUPABASE
      // ==========================================

      const { error } = await (supabase as any)
        .from("auctions")
        .insert({
          seller_id: user.id,
          title: title.trim(),
          starting_price: price,
          duration_minutes: auctionDuration,
          status: "live",
          image_url: imageUrl,
          video_url: videoUrl,
        });

      if (error) {
        throw error;
      }

      // ==========================================
      // 🎉 SUCCESS
      // ==========================================

      showMessage(
        "Auction Started!",
        "Your auction is now live. Buyers can join and place their bids."
      );

      router.replace("/browse");
    } catch (error: any) {
      console.error("Auction creation error:", error);

      showMessage(
        "Auction Failed",
        error?.message ||
          "Something went wrong while starting your auction."
      );
    } finally {
      setLoading(false);
      setUploadingVideo(false);
    }
  };

  // ==========================================
  // 🧱 REUSABLE FORM FIELD
  // ==========================================

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (value: string) => void,
    placeholder: string,
    icon: keyof typeof Ionicons.glyphMap,
    keyboardType: "default" | "numeric" = "default"
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>

      <View style={styles.inputWrapper}>
        <Ionicons
          name={icon}
          size={19}
          color={COLORS.muted}
        />

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#A5ADBA"
          keyboardType={keyboardType}
          style={styles.input}
          editable={!loading}
        />
      </View>
    </View>
  );

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
            onPress={() => router.replace("/profile")}
            disabled={loading}
          >
            <Ionicons
              name="arrow-back"
              size={21}
              color={COLORS.white}
            />
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerEyebrow}>
              NASARA MARKETPLACE
            </Text>

            <Text style={styles.headerTitle}>
              Start an Auction
            </Text>

            <Text style={styles.headerSubtitle}>
              Turn your product into a live bidding experience.
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons
              name="hammer"
              size={28}
              color={COLORS.gold}
            />
          </View>
        </View>

        {/* ======================================
            🟡 AUCTION INTRO CARD
        ====================================== */}

        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Ionicons
              name="flash"
              size={25}
              color={COLORS.gold}
            />
          </View>

          <View style={styles.introContent}>
            <Text style={styles.introTitle}>
              Let buyers compete for your product
            </Text>

            <Text style={styles.introDescription}>
              Set your starting price, choose a duration,
              upload your product media and go live.
            </Text>
          </View>
        </View>

        {/* ======================================
            📝 AUCTION DETAILS
        ====================================== */}

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="document-text-outline"
                size={19}
                color={COLORS.navy}
              />
            </View>

            <View>
              <Text style={styles.sectionTitle}>
                Auction Details
              </Text>

              <Text style={styles.sectionSubtitle}>
                Provide the basic information.
              </Text>
            </View>
          </View>

          {renderInput(
            "Auction Title",
            title,
            setTitle,
            "Example: iPhone 15 Pro Max",
            "pricetag-outline"
          )}

          {renderInput(
            "Starting Price (GH₵)",
            startingPrice,
            setStartingPrice,
            "Enter starting price",
            "cash-outline",
            "numeric"
          )}

          {/* ======================================
              ⏱️ AUCTION DURATION
          ====================================== */}

          <Text style={styles.inputLabel}>
            Auction Duration
          </Text>

          <View style={styles.durationContainer}>
            {["5", "10", "15", "30", "60"].map((minutes) => {
              const selected = duration === minutes;

              return (
                <TouchableOpacity
                  key={minutes}
                  style={[
                    styles.durationOption,
                    selected && styles.durationOptionSelected,
                  ]}
                  onPress={() => setDuration(minutes)}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.durationText,
                      selected && styles.durationTextSelected,
                    ]}
                  >
                    {minutes}
                  </Text>

                  <Text
                    style={[
                      styles.durationUnit,
                      selected && styles.durationTextSelected,
                    ]}
                  >
                    min
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.durationHint}>
            Select how long buyers can place bids.
          </Text>
        </View>

        {/* ======================================
            🖼️ PRODUCT MEDIA
        ====================================== */}

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="images-outline"
                size={19}
                color={COLORS.navy}
              />
            </View>

            <View>
              <Text style={styles.sectionTitle}>
                Product Media
              </Text>

              <Text style={styles.sectionSubtitle}>
                Add an image or video of your product.
              </Text>
            </View>
          </View>

          {/* ======================================
              🖼️ IMAGE UPLOAD
          ====================================== */}

          <TouchableOpacity
            style={[
              styles.uploadBox,
              imageUri && styles.uploadBoxSelected,
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

                <View style={styles.mediaSuccessBadge}>
                  <Ionicons
                    name="checkmark-circle"
                    size={19}
                    color={COLORS.green}
                  />
                  <Text style={styles.mediaSuccessText}>
                    Image selected
                  </Text>
                </View>

                <View style={styles.changeMediaButton}>
                  <Ionicons
                    name="camera-outline"
                    size={16}
                    color={COLORS.white}
                  />

                  <Text style={styles.changeMediaText}>
                    Change image
                  </Text>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.uploadIcon}>
                  <Ionicons
                    name="image-outline"
                    size={29}
                    color={COLORS.navy}
                  />
                </View>

                <Text style={styles.uploadTitle}>
                  Add Product Image
                </Text>

                <Text style={styles.uploadDescription}>
                  Choose a clear picture of your product.
                </Text>

                <View style={styles.uploadAction}>
                  <Ionicons
                    name="add"
                    size={17}
                    color={COLORS.white}
                  />

                  <Text style={styles.uploadActionText}>
                    Choose Image
                  </Text>
                </View>
              </>
            )}
          </TouchableOpacity>

          {/* ======================================
              🎥 VIDEO UPLOAD
          ====================================== */}

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
                size={25}
                color={COLORS.navy}
              />
            </View>

            <View style={styles.videoContent}>
              <Text style={styles.videoTitle}>
                {videoUri
                  ? "Auction video selected"
                  : "Add Product Video"}
              </Text>

              <Text style={styles.videoDescription}>
                {videoUri
                  ? "Tap to select a different video."
                  : "Show buyers how your product looks."}
              </Text>
            </View>

            <Ionicons
              name={videoUri ? "checkmark-circle" : "add-circle-outline"}
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

          <View style={styles.uploadInfo}>
            <Ionicons
              name="cloud-upload-outline"
              size={17}
              color={COLORS.muted}
            />

            <Text style={styles.uploadInfoText}>
              Your media will be uploaded securely through Nasara's
              upload server.
            </Text>
          </View>
        </View>

        {/* ======================================
            🔔 AUCTION INFORMATION
        ====================================== */}

        <View style={styles.noticeCard}>
          <Ionicons
            name="information-circle-outline"
            size={21}
            color={COLORS.gold}
          />

          <View style={styles.noticeContent}>
            <Text style={styles.noticeTitle}>
              Before you start
            </Text>

            <Text style={styles.noticeText}>
              Check your product details and starting price carefully.
              Once your auction is live, buyers can join and place bids.
            </Text>
          </View>
        </View>

        {/* ======================================
            🔥 START AUCTION BUTTON
        ====================================== */}

        <TouchableOpacity
          style={[
            styles.startButton,
            loading && styles.startButtonDisabled,
          ]}
          onPress={startAuction}
          disabled={loading || uploadingVideo}
          activeOpacity={0.85}
        >
          {loading ? (
            <>
              <ActivityIndicator
                color={COLORS.white}
                size="small"
              />

              <Text style={styles.startButtonText}>
                {uploadingVideo
                  ? "Uploading video..."
                  : "Preparing your auction..."}
              </Text>
            </>
          ) : (
            <>
              <Ionicons
                name="flash"
                size={21}
                color={COLORS.navy}
              />

              <Text style={styles.startButtonText}>
                Start Live Auction
              </Text>

              <Ionicons
                name="arrow-forward"
                size={19}
                color={COLORS.navy}
              />
            </>
          )}
        </TouchableOpacity>

        {/* ======================================
            🔙 BACK TO PROFILE
        ====================================== */}

        <TouchableOpacity
          style={styles.backToProfile}
          onPress={() => router.replace("/profile")}
          disabled={loading}
        >
          <Ionicons
            name="arrow-back"
            size={17}
            color={COLORS.muted}
          />

          <Text style={styles.backToProfileText}>
            Back to Profile
          </Text>
        </TouchableOpacity>

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
    paddingHorizontal: 20,
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

  headerTextContainer: {
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
    fontSize: 25,
    fontWeight: "900",
  },

  headerSubtitle: {
    color: "#C6CDDA",
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(214,168,79,0.13)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  // ==========================================
  // 🟡 INTRO CARD
  // ==========================================

  introCard: {
    marginHorizontal: 18,
    marginTop: 20,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  introIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: COLORS.goldLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  introContent: {
    flex: 1,
  },

  introTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.navy,
  },

  introDescription: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 18,
    marginTop: 5,
  },

  // ==========================================
  // 📦 SECTIONS
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
    marginBottom: 20,
  },

  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: COLORS.goldLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.navy,
  },

  sectionSubtitle: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 4,
  },

  // ==========================================
  // 📝 INPUTS
  // ==========================================

  inputGroup: {
    marginBottom: 17,
  },

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

  // ==========================================
  // ⏱️ DURATION
  // ==========================================

  durationContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },

  durationOption: {
    flex: 1,
    minWidth: 48,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F6F7FA",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  durationOptionSelected: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },

  durationText: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.text,
  },

  durationUnit: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 2,
  },

  durationTextSelected: {
    color: COLORS.white,
  },

  durationHint: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 10,
  },

  // ==========================================
  // 🖼️ IMAGE UPLOAD
  // ==========================================

  uploadBox: {
    minHeight: 190,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#C8CFDA",
    borderRadius: 17,
    backgroundColor: "#FAFBFD",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    overflow: "hidden",
  },

  uploadBoxSelected: {
    borderStyle: "solid",
    borderColor: COLORS.gold,
    padding: 0,
  },

  uploadIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: COLORS.goldLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  uploadTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.navy,
  },

  uploadDescription: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 6,
    textAlign: "center",
  },

  uploadAction: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.navy,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 9,
    marginTop: 14,
  },

  uploadActionText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 5,
  },

  imagePreviewContainer: {
    width: "100%",
    height: 230,
  },

  imagePreview: {
    width: "100%",
    height: "100%",
  },

  mediaSuccessBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: COLORS.white,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },

  mediaSuccessText: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 5,
  },

  changeMediaButton: {
    position: "absolute",
    right: 10,
    bottom: 10,
    backgroundColor: COLORS.navy,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
  },

  changeMediaText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 5,
  },

  // ==========================================
  // 🎥 VIDEO UPLOAD
  // ==========================================

  videoUploadBox: {
    marginTop: 14,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 13,
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
    marginRight: 12,
  },

  videoContent: {
    flex: 1,
  },

  videoTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.navy,
  },

  videoDescription: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 4,
  },

  videoSelectedNotice: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingHorizontal: 4,
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
    justifyContent: "center",
    alignSelf: "flex-start",
    marginTop: 12,
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
    marginTop: 17,
  },

  uploadInfoText: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 17,
    marginLeft: 8,
  },

  // ==========================================
  // ℹ️ INFORMATION CARD
  // ==========================================

  noticeCard: {
    marginHorizontal: 18,
    marginTop: 18,
    padding: 15,
    borderRadius: 15,
    backgroundColor: COLORS.navy,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  noticeContent: {
    flex: 1,
    marginLeft: 10,
  },

  noticeTitle: {
    color: COLORS.gold,
    fontSize: 13,
    fontWeight: "900",
  },

  noticeText: {
    color: "#E1E6EF",
    fontSize: 11,
    lineHeight: 18,
    marginTop: 5,
  },

  // ==========================================
  // 🔥 START BUTTON
  // ==========================================

  startButton: {
    marginHorizontal: 18,
    marginTop: 22,
    backgroundColor: COLORS.gold,
    minHeight: 57,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    gap: 10,
  },

  startButtonDisabled: {
    opacity: 0.65,
  },

  startButtonText: {
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: "900",
  },

  // ==========================================
  // 🔙 BACK BUTTON
  // ==========================================

  backToProfile: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    padding: 12,
  },

  backToProfileText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 7,
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
    marginTop: 15,
  },
});