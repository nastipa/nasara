// ================================================
// 💜 NASARA CHAT SETTINGS
// 📁 app/chat/settings/[id].tsx
// ================================================

import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";

import {
    ActivityIndicator,
    Image,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import * as ImagePicker from "expo-image-picker";

import { supabase } from "../../../lib/supabase";

// ================================================
// 🎨 AVAILABLE CHAT COLOURS
// ================================================

const CHAT_COLOURS = [
  "#7563E8",
  "#22C55E",
  "#3B82F6",
  "#EC4899",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#0891B2",
];

// ================================================
// ⚙️ MAIN SETTINGS SCREEN
// ================================================

export default function ChatSettings() {
  const router = useRouter();

  const { id } = useLocalSearchParams();

  const roomId = typeof id === "string" ? id : "";

  // ================================================
  // 📦 STATES
  // ================================================

  const [userId, setUserId] = useState<string | null>(null);

  const [themeColor, setThemeColor] = useState("#7563E8");

  const [wallpaper, setWallpaper] = useState("");

  const [receiverName, setReceiverName] = useState("Nasara User");

  const [receiverAvatar, setReceiverAvatar] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  // ================================================
  // 🔵 LOAD CURRENT USER SETTINGS
  // ================================================

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await (supabase as any).auth.getUser();

        if (authError) throw authError;

        if (!user) {
          router.back();
          return;
        }

        if (cancelled) return;

        setUserId(user.id);

        const { data: profile, error } = await (supabase as any)
          .from("profiles")
          .select("chat_theme, chat_wallpaper")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (cancelled) return;

        if (profile?.chat_theme) {
          setThemeColor(profile.chat_theme);
        }

        if (profile?.chat_wallpaper) {
          setWallpaper(profile.chat_wallpaper);
        }

        // ================================================
        // 👤 LOAD CHAT RECIPIENT
        // ================================================

        if (roomId) {
          const { data: room, error: roomError } = await (supabase as any)
            .from("chat_rooms")
            .select("buyer_id, seller_id")
            .eq("id", roomId)
            .maybeSingle();

          if (roomError) throw roomError;

          if (room) {
            const receiverId =
              room.buyer_id === user.id
                ? room.seller_id
                : room.seller_id === user.id
                ? room.buyer_id
                : null;

            if (receiverId) {
              const { data: receiver } = await (supabase as any)
                .from("profiles")
                .select("full_name, avatar_url")
                .eq("id", receiverId)
                .maybeSingle();

              if (cancelled) return;

              setReceiverName(receiver?.full_name || "Nasara User");

              setReceiverAvatar(receiver?.avatar_url || null);
            }
          }
        }
      } catch (error) {
        console.error("CHAT SETTINGS LOAD ERROR:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // ================================================
  // 🎨 SAVE CHAT THEME
  // ================================================

  const saveTheme = async (colour: string) => {
    if (!userId || saving) return;

    try {
      setSaving(true);

      const { error } = await (supabase as any)
        .from("profiles")
        .update({
          chat_theme: colour,
        })
        .eq("id", userId);

      if (error) throw error;

      setThemeColor(colour);
    } catch (error) {
      console.error("CHAT THEME SAVE ERROR:", error);
    } finally {
      setSaving(false);
    }
  };

  // ================================================
  // 🖼️ UPLOAD WALLPAPER
  // ================================================

  const uploadWallpaper = async () => {
    if (!userId || saving) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) return;

      setSaving(true);

      const asset = result.assets[0];

      const formData = new FormData();

      const fileName = `nasara-chat-wallpaper-${Date.now()}.jpg`;

      if (Platform.OS === "web") {
        const response = await fetch(asset.uri);

        const blob = await response.blob();

        formData.append("file", blob, fileName);
      } else {
        formData.append(
          "file",
          {
            uri: asset.uri,
            name: fileName,
            type: asset.mimeType || "image/jpeg",
          } as any
        );
      }

      const uploadResponse = await fetch(
        "https://nasara-upload-server.onrender.com/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        throw new Error("Wallpaper upload failed.");
      }

      const uploadResult = await uploadResponse.json();

      let imageUrl =
        uploadResult?.url ||
        uploadResult?.file ||
        uploadResult?.path;

      if (!imageUrl) {
        throw new Error("No wallpaper URL was returned.");
      }

      if (!imageUrl.startsWith("http")) {
        imageUrl =
          `https://nasara-upload-server.onrender.com/${imageUrl}`;
      }

      const { error } = await (supabase as any)
        .from("profiles")
        .update({
          chat_wallpaper: imageUrl,
        })
        .eq("id", userId);

      if (error) throw error;

      setWallpaper(imageUrl);
    } catch (error) {
      console.error("WALLPAPER UPLOAD ERROR:", error);
    } finally {
      setSaving(false);
    }
  };

  // ================================================
  // 🗑️ REMOVE WALLPAPER
  // ================================================

  const removeWallpaper = async () => {
    if (!userId || saving) return;

    try {
      setSaving(true);

      const { error } = await (supabase as any)
        .from("profiles")
        .update({
          chat_wallpaper: null,
        })
        .eq("id", userId);

      if (error) throw error;

      setWallpaper("");
    } catch (error) {
      console.error("REMOVE WALLPAPER ERROR:", error);
    } finally {
      setSaving(false);
    }
  };

  // ================================================
  // ⏳ LOADING
  // ================================================

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#F6F4FF",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#7563E8" />

        <Text style={{ marginTop: 12, color: "#7563E8" }}>
          Loading chat settings...
        </Text>
      </SafeAreaView>
    );
  }

  // ================================================
  // 💜 SETTINGS SCREEN
  // ================================================

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#F6F4FF",
        }}
      >
        {/* ========================================== */}
        {/* 💜 HEADER */}
        {/* ========================================== */}

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 18,
            paddingVertical: 15,
            backgroundColor: "#FFFFFF",
            borderBottomWidth: 1,
            borderBottomColor: "#EAE6F5",
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: "#F0ECFF",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 13,
            }}
          >
            <Text style={{ fontSize: 25, color: "#7563E8" }}>
              ‹
            </Text>
          </TouchableOpacity>

          <View>
            <Text
              style={{
                fontSize: 19,
                fontWeight: "800",
                color: "#29243A",
              }}
            >
              Chat Settings
            </Text>

            <Text
              style={{
                fontSize: 11,
                color: "#89839B",
                marginTop: 3,
              }}
            >
              Personalise your Nasara chat
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{
            padding: 18,
            paddingBottom: 40,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* ========================================== */}
          {/* 👤 CHAT CONTACT */}
          {/* ========================================== */}

          <View
            style={{
              backgroundColor: "#FFFFFF",
              padding: 18,
              borderRadius: 20,
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 22,
              borderWidth: 1,
              borderColor: "#EAE6F5",
            }}
          >
            {receiverAvatar ? (
              <Image
                source={{ uri: receiverAvatar }}
                style={{
                  width: 55,
                  height: 55,
                  borderRadius: 28,
                }}
              />
            ) : (
              <View
                style={{
                  width: 55,
                  height: 55,
                  borderRadius: 28,
                  backgroundColor: "#E9E3FF",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "#7563E8",
                    fontSize: 23,
                    fontWeight: "bold",
                  }}
                >
                  {receiverName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <View style={{ marginLeft: 13, flex: 1 }}>
              <Text
                style={{
                  color: "#29243A",
                  fontSize: 16,
                  fontWeight: "800",
                }}
              >
                {receiverName}
              </Text>

              <Text
                style={{
                  color: "#89839B",
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                Conversation on Nasara
              </Text>
            </View>
          </View>

          {/* ========================================== */}
          {/* 🎨 CHAT THEME */}
          {/* ========================================== */}

          <Text
            style={{
              fontSize: 14,
              fontWeight: "800",
              color: "#7563E8",
              marginBottom: 10,
            }}
          >
            🎨 CHAT THEME
          </Text>

          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              padding: 18,
              marginBottom: 22,
              borderWidth: 1,
              borderColor: "#EAE6F5",
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: "#29243A",
              }}
            >
              Choose message colour
            </Text>

            <Text
              style={{
                fontSize: 12,
                color: "#89839B",
                marginTop: 5,
                marginBottom: 16,
              }}
            >
              Select a colour for your sent messages.
            </Text>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
              }}
            >
              {CHAT_COLOURS.map((colour) => (
                <TouchableOpacity
                  key={colour}
                  onPress={() => saveTheme(colour)}
                  style={{
                    width: 43,
                    height: 43,
                    borderRadius: 23,
                    backgroundColor: colour,
                    marginRight: 13,
                    marginBottom: 13,
                    borderWidth: themeColor === colour ? 4 : 0,
                    borderColor: "#DCD4FF",
                  }}
                />
              ))}
            </View>

            <View
              style={{
                backgroundColor: "#F6F4FF",
                padding: 13,
                borderRadius: 13,
                marginTop: 3,
              }}
            >
              <Text
                style={{
                  color: "#7563E8",
                  fontSize: 11,
                  fontWeight: "700",
                  marginBottom: 8,
                }}
              >
                MESSAGE PREVIEW
              </Text>

              <View style={{ alignItems: "flex-end" }}>
                <View
                  style={{
                    backgroundColor: themeColor,
                    paddingHorizontal: 15,
                    paddingVertical: 10,
                    borderRadius: 17,
                    borderTopRightRadius: 5,
                  }}
                >
                  <Text style={{ color: "#FFFFFF", fontSize: 13 }}>
                    Hello! Welcome to Nasara.
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ========================================== */}
          {/* 🖼️ CHAT WALLPAPER */}
          {/* ========================================== */}

          <Text
            style={{
              fontSize: 14,
              fontWeight: "800",
              color: "#7563E8",
              marginBottom: 10,
            }}
          >
            🖼️ CHAT WALLPAPER
          </Text>

          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              padding: 18,
              marginBottom: 22,
              borderWidth: 1,
              borderColor: "#EAE6F5",
            }}
          >
            {wallpaper ? (
              <Image
                source={{ uri: wallpaper }}
                style={{
                  width: "100%",
                  height: 160,
                  borderRadius: 14,
                  marginBottom: 15,
                  backgroundColor: "#EAE6F5",
                }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  height: 120,
                  backgroundColor: "#F6F4FF",
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 15,
                }}
              >
                <Text style={{ fontSize: 35 }}>💜</Text>

                <Text
                  style={{
                    color: "#89839B",
                    marginTop: 6,
                    fontSize: 12,
                  }}
                >
                  Default Nasara wallpaper
                </Text>
              </View>
            )}

            <TouchableOpacity
              disabled={saving}
              onPress={uploadWallpaper}
              style={{
                backgroundColor: "#7563E8",
                padding: 14,
                borderRadius: 13,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontWeight: "800",
                }}
              >
                🖼️ Change Wallpaper
              </Text>
            </TouchableOpacity>

            {wallpaper !== "" && (
              <TouchableOpacity
                disabled={saving}
                onPress={removeWallpaper}
                style={{
                  backgroundColor: "#FFF0F0",
                  padding: 13,
                  borderRadius: 13,
                  alignItems: "center",
                  marginTop: 10,
                }}
              >
                <Text
                  style={{
                    color: "#DC2626",
                    fontWeight: "700",
                  }}
                >
                  Remove Wallpaper
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ========================================== */}
          {/* 🔐 CHAT SECURITY INFORMATION */}
          {/* ========================================== */}

          <Text
            style={{
              fontSize: 14,
              fontWeight: "800",
              color: "#7563E8",
              marginBottom: 10,
            }}
          >
            🔐 CHAT INFORMATION
          </Text>

          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              padding: 17,
              borderWidth: 1,
              borderColor: "#EAE6F5",
            }}
          >
            <Text
              style={{
                fontSize: 13,
                color: "#29243A",
                fontWeight: "700",
              }}
            >
              🔒 Secret Chat
            </Text>

            <Text
              style={{
                fontSize: 12,
                color: "#89839B",
                lineHeight: 19,
                marginTop: 6,
              }}
            >
              You can enable secret chat from the conversation screen
              and choose an expiry time for supported messages.
            </Text>

            <View
              style={{
                height: 1,
                backgroundColor: "#F0ECF8",
                marginVertical: 15,
              }}
            />

            <Text
              style={{
                fontSize: 13,
                color: "#29243A",
                fontWeight: "700",
              }}
            >
              💬 Conversation ID
            </Text>

            <Text
              selectable
              style={{
                fontSize: 11,
                color: "#89839B",
                marginTop: 6,
              }}
            >
              {roomId || "Unavailable"}
            </Text>
          </View>

          {/* ========================================== */}
          {/* ⏳ SAVING INDICATOR */}
          {/* ========================================== */}

          {saving && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                marginTop: 20,
              }}
            >
              <ActivityIndicator color="#7563E8" />

              <Text
                style={{
                  color: "#7563E8",
                  marginLeft: 9,
                  fontSize: 12,
                }}
              >
                Saving your settings...
              </Text>
            </View>
          )}

          {/* ========================================== */}
          {/* 💜 NASARA BRANDING */}
          {/* ========================================== */}

          <Text
            style={{
              textAlign: "center",
              color: "#A49BBE",
              fontSize: 11,
              fontWeight: "800",
              letterSpacing: 4,
              marginTop: 28,
            }}
          >
            NASARA
          </Text>

          <Text
            style={{
              textAlign: "center",
              color: "#A49BBE",
              fontSize: 10,
              marginTop: 5,
            }}
          >
            Connecting people through conversation.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}