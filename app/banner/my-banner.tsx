import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function MyBanner() {
  const router = useRouter();

  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ==========================================
  // LOAD MY BANNERS
  // ==========================================

  const loadBanners = useCallback(async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setBanners([]);
        return;
      }

      const { data, error } = await supabase
        .from("banner")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.log("MY BANNERS ERROR:", error);
        Alert.alert("Error", error.message);
        return;
      }

      setBanners(data ?? []);
    } catch (error: any) {
      console.log("LOAD BANNERS ERROR:", error);
      Alert.alert(
        "Error",
        error?.message || "Could not load your banners."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  // ==========================================
  // REFRESH
  // ==========================================

  const onRefresh = () => {
    setRefreshing(true);
    loadBanners();
  };

  // ==========================================
  // OPEN WEBSITE
  // ==========================================

  const visitWebsite = async (url: string) => {
    if (!url) {
      Alert.alert("Unavailable", "No website link is available.");
      return;
    }

    try {
      const finalUrl = /^https?:\/\//i.test(url)
        ? url
        : `https://${url}`;

      await Linking.openURL(finalUrl);
    } catch {
      Alert.alert("Error", "Could not open this website.");
    }
  };

  // ==========================================
  // STATUS COLOR
  // ==========================================

  const getStatusColor = (status: string) => {
    switch ((status || "").toLowerCase()) {
      case "approved":
      case "active":
        return "#16a34a";

      case "pending":
        return "#d97706";

      case "rejected":
      case "expired":
      case "inactive":
        return "#dc2626";

      default:
        return "#64748b";
    }
  };

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f8fafc",
        }}
      >
        <ActivityIndicator size="large" color="#16a34a" />

        <Text style={{ marginTop: 10, color: "#64748b" }}>
          Loading your banners...
        </Text>
      </View>
    );
  }

  // ==========================================
  // MAIN UI
  // ==========================================

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f8fafc" }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      }
    >
      {/* BACK BUTTON */}

      <TouchableOpacity
        onPress={() => router.push("/")}
        style={{
          backgroundColor: "#16a34a",
          padding: 12,
          borderRadius: 10,
          marginBottom: 20,
        }}
      >
        <Text
          style={{
            color: "white",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          ← Back to Home
        </Text>
      </TouchableOpacity>

      {/* HEADER */}

      <Text
        style={{
          fontSize: 24,
          fontWeight: "bold",
          color: "#0f172a",
        }}
      >
        📌 My Banners
      </Text>

      <Text
        style={{
          color: "#64748b",
          marginTop: 5,
          marginBottom: 8,
        }}
      >
        Manage and monitor your banner advertisements.
      </Text>

      {/* EMPTY STATE */}

      {banners.length === 0 && (
        <View
          style={{
            backgroundColor: "white",
            padding: 30,
            borderRadius: 14,
            alignItems: "center",
            marginTop: 25,
            borderWidth: 1,
            borderColor: "#e2e8f0",
          }}
        >
          <Text style={{ fontSize: 38 }}>🖼️</Text>

          <Text
            style={{
              fontSize: 17,
              fontWeight: "bold",
              marginTop: 12,
              color: "#0f172a",
            }}
          >
            No Banners Yet
          </Text>

          <Text
            style={{
              color: "#64748b",
              textAlign: "center",
              marginTop: 6,
            }}
          >
            Your banner advertisements will appear here after you create them.
          </Text>
        </View>
      )}

      {/* BANNER LIST */}

      {banners.map((ad) => (
        <View
          key={ad.id}
          style={{
            marginTop: 16,
            borderWidth: 1,
            borderColor: "#e2e8f0",
            padding: 12,
            borderRadius: 14,
            backgroundColor: "white",
          }}
        >
          {/* MEDIA PREVIEW */}

          <View
            style={{
              width: "100%",
              height: 150,
              borderRadius: 10,
              overflow: "hidden",
              backgroundColor: "#f1f5f9",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {ad.video_url ? (
              Platform.OS === "web" ? (
                <video
                  src={ad.video_url}
                  controls
                  playsInline
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    backgroundColor: "#000",
                  }}
                />
              ) : (
                <Text
                  style={{
                    color: "#475569",
                    textAlign: "center",
                    padding: 12,
                  }}
                >
                  Video banner
                  {"\n"}
                  <Text
                    style={{ color: "#2563eb" }}
                    onPress={() => visitWebsite(ad.video_url)}
                  >
                    Open video
                  </Text>
                </Text>
              )
            ) : ad.image_url ? (
              <Image
                source={{ uri: ad.image_url }}
                style={{
                  width: "100%",
                  height: "100%",
                }}
                contentFit="contain"
                transition={200}
              />
            ) : (
              <Text style={{ color: "#94a3b8" }}>
                Media not available
              </Text>
            )}
          </View>

          {/* BANNER DETAILS */}

          <Text
            style={{
              fontSize: 17,
              fontWeight: "bold",
              color: "#0f172a",
              marginTop: 12,
            }}
          >
            {ad.title || "Untitled Banner"}
          </Text>

          {/* STATUS */}

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 9,
            }}
          >
            <Text style={{ color: "#64748b" }}>
              Status:{" "}
            </Text>

            <Text
              style={{
                color: getStatusColor(ad.status),
                fontWeight: "bold",
                textTransform: "capitalize",
              }}
            >
              {ad.status || "Unknown"}
            </Text>
          </View>

          {/* PAYMENT DETAILS */}

          <Text
            style={{
              color: "#475569",
              marginTop: 7,
            }}
          >
            Amount: GH₵ {Number(ad.amount || 0).toFixed(2)}
          </Text>

          <Text
            style={{
              color: "#475569",
              marginTop: 4,
            }}
          >
            Duration: {ad.days || 0} days
          </Text>

          {/* WEBSITE BUTTON */}

          {ad.is_active && ad.link ? (
            <TouchableOpacity
              onPress={() => visitWebsite(ad.link)}
              style={{
                backgroundColor: "#2563eb",
                padding: 12,
                borderRadius: 9,
                marginTop: 13,
              }}
            >
              <Text
                style={{
                  color: "white",
                  textAlign: "center",
                  fontWeight: "bold",
                }}
              >
                Visit Website
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}