// ==========================================
// 📦 IMPORTS
// ==========================================

import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

// ==========================================
// 🎨 NASARA PREMIUM THEME
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
  green: "#16865A",
  red: "#D94848",
};

const PRICE_PER_DAY = 30;

// ==========================================
// ☁️ CLOUDFLARE UPLOAD SERVER
// ==========================================

const BASE_URL = "https://nasara-upload-server.onrender.com";

// ==========================================
// 🔔 ALERT HELPER
// ==========================================

const showAlert = (title: string, message: string) => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

// ==========================================
// 🎬 VIDEO PRELOAD HELPER
// ==========================================

const preloadVideo = (url: string) => {
  if (Platform.OS !== "web") return;

  try {
    const video = document.createElement("video");
    video.src = url;
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
  } catch (error) {
    console.log("Video preload failed:", error);
  }
};

// ==========================================
// ☁️ UPLOAD IMAGE OR VIDEO
// ==========================================

const uploadMedia = async (
  fileOrUri: any,
  type: "image" | "video"
) => {
  const formData = new FormData();

  // 🌐 WEB UPLOAD
  if (Platform.OS === "web") {
    let file: File;

    if (typeof File !== "undefined" && fileOrUri instanceof File) {
      file = fileOrUri;
    } else if (
      typeof Blob !== "undefined" &&
      fileOrUri instanceof Blob
    ) {
      file = new File(
        [fileOrUri],
        type === "video" ? "video.webm" : "image.jpg",
        { type: fileOrUri.type }
      );
    } else if (fileOrUri?.uri) {
      const response = await fetch(fileOrUri.uri);
      const blob = await response.blob();

      file = new File(
        [blob],
        type === "video" ? "video.mp4" : "image.jpg",
        { type: blob.type }
      );
    } else {
      throw new Error("Invalid media file.");
    }

    formData.append("file", file);
  }

  // 📱 MOBILE UPLOAD
  else {
    let uri = "";

    if (typeof fileOrUri === "string") {
      uri = fileOrUri;
    } else if (fileOrUri?.uri) {
      uri = fileOrUri.uri;
    }

    if (!uri) {
      throw new Error("Invalid media file.");
    }

    formData.append(
      "file",
      {
        uri,
        type: type === "video" ? "video/mp4" : "image/jpeg",
        name:
          type === "video"
            ? `banner_video_${Date.now()}.mp4`
            : `banner_image_${Date.now()}.jpg`,
      } as any
    );
  }

  // 🚀 UPLOAD REQUEST
  const response = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Media upload failed. Please try again.");
  }

  const data = await response.json();

  if (!data.success || !data.url) {
    throw new Error("Upload failed. Please try again.");
  }

  const url = data.url;

  if (type === "video") {
    preloadVideo(url);
  }

  return url;
};

// ==========================================
// 📢 CREATE BANNER SCREEN
// ==========================================

export default function CreateBanner() {
  const router = useRouter();

  // 📝 FORM STATE
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [days, setDays] = useState("3");

  // 🖼️ MEDIA STATE
  const [media, setMedia] = useState<any>(null);
  const [mediaType, setMediaType] = useState<
    "image" | "video" | null
  >(null);

  // ⚙️ LOADING STATE
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // 💳 PAYMENT STATE
  const [payVisible, setPayVisible] = useState(false);
  const [bannerData, setBannerData] = useState<any>(null);

  // 🏦 MOBILE MONEY DETAILS
  const momoName = "NASARA MARKET";
  const momoNumber = "0539703374";
  const momoNetwork = "MTN";

  // 💰 PRICE CALCULATION
  const validDays = /^\d+$/.test(days) ? Number(days) : 0;
  const totalAmount = validDays * PRICE_PER_DAY;

  // ==========================================
  // 🖼️ PICK BANNER MEDIA
  // ==========================================

  const pickMedia = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
      });

      if (result.canceled) return;

      const asset = result.assets[0];

      if (!asset) return;

      const type = asset.type === "video" ? "video" : "image";

      setMediaType(type);

      if (Platform.OS === "web") {
        setMedia(asset.file || asset.uri);
      } else {
        setMedia(asset.uri);
      }
    } catch (error: any) {
      showAlert(
        "Media Selection Error",
        error?.message || "Could not select your banner media."
      );
    }
  };

  // ==========================================
  // 🗑️ REMOVE SELECTED MEDIA
  // ==========================================

  const removeMedia = () => {
    setMedia(null);
    setMediaType(null);
  };

  // ==========================================
  // 📢 SUBMIT BANNER
  // ==========================================

  const submitBanner = async () => {
    if (
      !title.trim() ||
      !link.trim() ||
      !days.trim() ||
      !media ||
      !mediaType
    ) {
      showAlert(
        "Incomplete Information",
        "Please complete all fields and select a banner image or video."
      );
      return;
    }

    if (!Number.isInteger(validDays) || validDays < 1) {
      showAlert(
        "Invalid Duration",
        "Enter a valid number of banner advertising days."
      );
      return;
    }

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      showAlert(
        "Invalid Amount",
        "Please enter a valid advertising duration."
      );
      return;
    }

    setLoading(true);

    try {
      // ☁️ UPLOAD BANNER MEDIA
      const mediaUrl = await uploadMedia(media, mediaType);

      // 👤 GET LOGGED-IN USER
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        showAlert(
          "Login Required",
          "Please login first."
        );

        router.replace("/(auth)/login");
        return;
      }

      // 💾 SAVE BANNER
      const { data, error } = await (supabase as any)
        .from("banner")
        .insert({
          user_id: user.id,
          title: title.trim(),
          link: link.trim(),
          image_url:
            mediaType === "image" ? mediaUrl : null,
          video_url:
            mediaType === "video" ? mediaUrl : null,
          media_type: mediaType,
          days: validDays,
          amount: totalAmount,
          status: "pending",
          is_active: false,
        })
        .select()
        .single();

      if (error) {
        if (error.message?.includes("JWT expired")) {
          await supabase.auth.signOut();
          router.replace("/(auth)/login");
          return;
        }

        throw error;
      }

      setBannerData({
        user,
        bannerId: data.id,
      });

      setPayVisible(true);
    } catch (error: any) {
      showAlert(
        "Banner Error",
        error?.message || "Could not submit your banner."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 💳 GENERATE PAYMENT REQUEST
  // ==========================================

  const sendPayment = async () => {
    if (!bannerData || paymentLoading) return;

    setPaymentLoading(true);

    try {
      const code = "BANNER-" + Date.now();

      const { error } = await (supabase as any)
        .from("payments")
        .insert({
          user_id: bannerData.user.id,
          product_type: "banner",
          amount: totalAmount,
          momo_name: momoName,
          momo_number: momoNumber,
          network: momoNetwork,
          code,
          status: "pending",
        });

      if (error) {
        throw error;
      }

      showAlert(
        "Request Sent",
        `Your banner request has been submitted!\n\nPay GH₵${totalAmount} to:\n${momoName}\n${momoNumber} (${momoNetwork})\n\nPayment Code: ${code}`
      );

      setPayVisible(false);
      router.replace("/banner/my-banner");
    } catch (error: any) {
      showAlert(
        "Payment Error",
        error?.message || "Could not generate your payment request."
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  // ==========================================
  // 🧩 REUSABLE SECTION HEADING
  // ==========================================

  const SectionHeading = ({
    number,
    title: heading,
    subtitle,
  }: {
    number: string;
    title: string;
    subtitle: string;
  }) => (
    <View style={{ flexDirection: "row", marginBottom: 15 }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 11,
          backgroundColor: COLORS.goldLight,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 11,
        }}
      >
        <Text
          style={{
            color: COLORS.navy,
            fontSize: 14,
            fontWeight: "900",
          }}
        >
          {number}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "800",
            color: COLORS.text,
          }}
        >
          {heading}
        </Text>

        <Text
          style={{
            color: COLORS.muted,
            fontSize: 12,
            marginTop: 3,
          }}
        >
          {subtitle}
        </Text>
      </View>
    </View>
  );

  // ==========================================
  // 🖥️ SCREEN UI
  // ==========================================

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.navy}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ================================== */}
        {/* 🟦 PREMIUM HEADER */}
        {/* ================================== */}

        <View
          style={{
            backgroundColor: COLORS.navy,
            paddingTop: 25,
            paddingHorizontal: 20,
            paddingBottom: 28,
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                backgroundColor: "#FFFFFF18",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: COLORS.white, fontSize: 23 }}>
                ‹
              </Text>
            </TouchableOpacity>

            <View
              style={{
                backgroundColor: "#FFFFFF18",
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 20,
              }}
            >
              <Text
                style={{
                  color: COLORS.gold,
                  fontSize: 11,
                  fontWeight: "800",
                }}
              >
                NASARA BANNERS
              </Text>
            </View>
          </View>

          <View style={{ marginTop: 25 }}>
            <Text
              style={{
                fontSize: 27,
                color: COLORS.white,
                fontWeight: "900",
              }}
            >
              Promote With Banners
            </Text>

            <Text
              style={{
                color: "#D5DCE8",
                fontSize: 13,
                lineHeight: 20,
                marginTop: 8,
                maxWidth: 310,
              }}
            >
              Give your business more visibility with attractive banners across Nasara.
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#FFFFFF12",
              borderRadius: 16,
              padding: 15,
              marginTop: 23,
            }}
          >
            <View
              style={{
                width: 43,
                height: 43,
                borderRadius: 13,
                backgroundColor: COLORS.gold,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Text style={{ fontSize: 21 }}>🖼️</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: COLORS.white,
                  fontWeight: "800",
                  fontSize: 14,
                }}
              >
                Make your brand visible
              </Text>

              <Text
                style={{
                  color: "#D5DCE8",
                  fontSize: 11,
                  marginTop: 4,
                }}
              >
                Create your banner in a few simple steps.
              </Text>
            </View>
          </View>
        </View>

        {/* ================================== */}
        {/* 💰 PRICING CARD */}
        {/* ================================== */}

        <View
          style={{
            marginHorizontal: 16,
            marginTop: 18,
            backgroundColor: COLORS.white,
            borderRadius: 19,
            padding: 17,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <Text
            style={{
              color: COLORS.muted,
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            BANNER ADVERTISING RATE
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              marginTop: 7,
            }}
          >
            <Text
              style={{
                color: COLORS.navy,
                fontSize: 30,
                fontWeight: "900",
              }}
            >
              GH₵{PRICE_PER_DAY}
            </Text>

            <Text
              style={{
                color: COLORS.muted,
                fontSize: 13,
                marginBottom: 5,
                marginLeft: 5,
              }}
            >
              / day
            </Text>
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: COLORS.border,
              marginVertical: 13,
            }}
          />

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ color: COLORS.muted, fontSize: 12 }}>
              Selected duration
            </Text>

            <Text
              style={{
                color: COLORS.navy,
                fontWeight: "800",
                fontSize: 12,
              }}
            >
              {validDays || 0} {validDays === 1 ? "day" : "days"}
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 10,
            }}
          >
            <Text style={{ color: COLORS.muted, fontSize: 12 }}>
              Total banner cost
            </Text>

            <Text
              style={{
                color: COLORS.green,
                fontWeight: "900",
                fontSize: 16,
              }}
            >
              GH₵{totalAmount}
            </Text>
          </View>
        </View>

        {/* ================================== */}
        {/* 📝 BANNER DETAILS */}
        {/* ================================== */}

        <View
          style={{
            marginHorizontal: 16,
            marginTop: 18,
            backgroundColor: COLORS.white,
            borderRadius: 20,
            padding: 17,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <SectionHeading
            number="01"
            title="Banner Details"
            subtitle="Enter the information customers will see."
          />

          <Text style={styles.label}>Banner Title</Text>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Discover our latest products"
            placeholderTextColor="#A5ADBA"
            style={styles.input}
          />

          <Text style={[styles.label, { marginTop: 17 }]}>
            Website or Destination Link
          </Text>

          <TextInput
            value={link}
            onChangeText={setLink}
            placeholder="https://yourwebsite.com"
            placeholderTextColor="#A5ADBA"
            autoCapitalize="none"
            keyboardType="url"
            style={styles.input}
          />

          <Text style={[styles.label, { marginTop: 17 }]}>
            Banner Duration
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View style={{ flex: 1 }}>
              <TextInput
                value={days}
                onChangeText={setDays}
                keyboardType="number-pad"
                placeholder="3"
                placeholderTextColor="#A5ADBA"
                style={styles.input}
              />
            </View>

            <View
              style={{
                backgroundColor: COLORS.goldLight,
                paddingHorizontal: 17,
                paddingVertical: 15,
                borderRadius: 12,
                marginLeft: 10,
              }}
            >
              <Text
                style={{
                  color: COLORS.navy,
                  fontWeight: "800",
                  fontSize: 13,
                }}
              >
                DAYS
              </Text>
            </View>
          </View>
        </View>

        {/* ================================== */}
        {/* 🖼️ BANNER MEDIA */}
        {/* ================================== */}

        <View
          style={{
            marginHorizontal: 16,
            marginTop: 16,
            backgroundColor: COLORS.white,
            borderRadius: 20,
            padding: 17,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <SectionHeading
            number="02"
            title="Banner Creative"
            subtitle="Select the image or video for your banner."
          />

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={pickMedia}
            style={{
              borderWidth: 1.5,
              borderStyle: "dashed",
              borderColor: COLORS.gold,
              backgroundColor: "#FCFAF5",
              borderRadius: 17,
              padding: 25,
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 58,
                height: 58,
                borderRadius: 18,
                backgroundColor: COLORS.goldLight,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 27 }}>🖼️</Text>
            </View>

            <Text
              style={{
                color: COLORS.navy,
                fontWeight: "900",
                fontSize: 15,
              }}
            >
              {media ? "Change Banner Media" : "Select Image or Video"}
            </Text>

            <Text
              style={{
                color: COLORS.muted,
                fontSize: 12,
                marginTop: 7,
                textAlign: "center",
              }}
            >
              Choose your banner creative from your device.
            </Text>
          </TouchableOpacity>

          {media && (
            <View
              style={{
                marginTop: 13,
                backgroundColor: "#F0F8F3",
                borderRadius: 13,
                padding: 13,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 23, marginRight: 11 }}>
                {mediaType === "video" ? "🎬" : "🖼️"}
              </Text>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: COLORS.green,
                    fontWeight: "800",
                    fontSize: 13,
                  }}
                >
                  {mediaType === "video" ? "Video selected" : "Image selected"}
                </Text>

                <Text
                  style={{
                    color: COLORS.muted,
                    fontSize: 11,
                    marginTop: 3,
                  }}
                >
                  Ready to upload
                </Text>
              </View>

              <TouchableOpacity onPress={removeMedia}>
                <Text
                  style={{
                    color: COLORS.red,
                    fontWeight: "800",
                    fontSize: 12,
                  }}
                >
                  Remove
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ================================== */}
        {/* 💰 BANNER COST SUMMARY */}
        {/* ================================== */}

        <View
          style={{
            marginHorizontal: 16,
            marginTop: 16,
            backgroundColor: COLORS.navy,
            borderRadius: 20,
            padding: 19,
          }}
        >
          <Text
            style={{
              color: "#D5DCE8",
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            YOUR BANNER SUMMARY
          </Text>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 17,
            }}
          >
            <Text style={{ color: "#D5DCE8", fontSize: 13 }}>
              Price per day
            </Text>

            <Text style={{ color: COLORS.white, fontWeight: "700" }}>
              GH₵{PRICE_PER_DAY}
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 10,
            }}
          >
            <Text style={{ color: "#D5DCE8", fontSize: 13 }}>
              Duration
            </Text>

            <Text style={{ color: COLORS.white, fontWeight: "700" }}>
              {validDays || 0} days
            </Text>
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: "#FFFFFF25",
              marginVertical: 16,
            }}
          />

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: COLORS.white,
                fontSize: 14,
                fontWeight: "800",
              }}
            >
              TOTAL AMOUNT
            </Text>

            <Text
              style={{
                color: COLORS.gold,
                fontSize: 25,
                fontWeight: "900",
              }}
            >
              GH₵{totalAmount}
            </Text>
          </View>
        </View>

        {/* ================================== */}
        {/* 🚀 SUBMIT BANNER BUTTON */}
        {/* ================================== */}

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={submitBanner}
          disabled={loading}
          style={{
            marginHorizontal: 16,
            marginTop: 20,
            backgroundColor: loading ? "#8290A5" : COLORS.gold,
            borderRadius: 15,
            padding: 17,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
          }}
        >
          {loading ? (
            <>
              <ActivityIndicator color={COLORS.navy} />

              <Text
                style={{
                  color: COLORS.navy,
                  fontWeight: "900",
                  marginLeft: 10,
                }}
              >
                Preparing Banner...
              </Text>
            </>
          ) : (
            <Text
              style={{
                color: COLORS.navy,
                fontSize: 15,
                fontWeight: "900",
              }}
            >
              Continue to Payment →
            </Text>
          )}
        </TouchableOpacity>

        <Text
          style={{
            color: COLORS.muted,
            fontSize: 11,
            textAlign: "center",
            marginTop: 13,
            marginHorizontal: 25,
            lineHeight: 17,
          }}
        >
          Your banner will remain pending until the payment request is processed.
        </Text>
      </ScrollView>

      {/* ================================== */}
      {/* 💳 PAYMENT MODAL */}
      {/* ================================== */}

      <Modal
        transparent
        visible={payVisible}
        animationType="slide"
        onRequestClose={() => setPayVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#00000080",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.white,
              borderRadius: 24,
              padding: 22,
            }}
          >
            <View
              style={{
                alignSelf: "center",
                width: 55,
                height: 55,
                borderRadius: 18,
                backgroundColor: COLORS.goldLight,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 27 }}>💳</Text>
            </View>

            <Text
              style={{
                fontSize: 21,
                fontWeight: "900",
                color: COLORS.navy,
                textAlign: "center",
                marginTop: 15,
              }}
            >
              Banner Payment
            </Text>

            <Text
              style={{
                color: COLORS.muted,
                fontSize: 12,
                textAlign: "center",
                marginTop: 6,
              }}
            >
              Use the Mobile Money details below.
            </Text>

            <View
              style={{
                backgroundColor: COLORS.background,
                borderRadius: 16,
                padding: 17,
                marginTop: 20,
              }}
            >
              <Text
                style={{
                  color: COLORS.muted,
                  fontSize: 11,
                  fontWeight: "700",
                }}
              >
                PAYMENT RECIPIENT
              </Text>

              <Text
                style={{
                  color: COLORS.navy,
                  fontSize: 16,
                  fontWeight: "900",
                  marginTop: 6,
                }}
              >
                {momoName}
              </Text>

              <Text
                style={{
                  color: COLORS.text,
                  fontSize: 21,
                  fontWeight: "900",
                  marginTop: 9,
                }}
              >
                {momoNumber}
              </Text>

              <Text
                style={{
                  color: COLORS.muted,
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                {momoNetwork} Mobile Money
              </Text>

              <View
                style={{
                  height: 1,
                  backgroundColor: COLORS.border,
                  marginVertical: 15,
                }}
              />

              <Text
                style={{
                  color: COLORS.muted,
                  fontSize: 11,
                  fontWeight: "700",
                }}
              >
                TOTAL TO PAY
              </Text>

              <Text
                style={{
                  color: COLORS.green,
                  fontSize: 27,
                  fontWeight: "900",
                  marginTop: 5,
                }}
              >
                GH₵{totalAmount}
              </Text>
            </View>

            <TouchableOpacity
              onPress={sendPayment}
              disabled={paymentLoading}
              style={{
                backgroundColor: COLORS.navy,
                padding: 16,
                borderRadius: 14,
                marginTop: 19,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
              }}
            >
              {paymentLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text
                  style={{
                    color: COLORS.white,
                    fontWeight: "900",
                    fontSize: 14,
                  }}
                >
                  Generate Payment Code
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPayVisible(false)}
              disabled={paymentLoading}
              style={{
                padding: 13,
                marginTop: 5,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: COLORS.red,
                  fontWeight: "800",
                  fontSize: 13,
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ==========================================
// 🎨 INPUT STYLES
// ==========================================

const styles = {
  label: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800" as const,
    marginBottom: 8,
  },

  input: {
    backgroundColor: "#FAFBFD",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 14,
  },
};