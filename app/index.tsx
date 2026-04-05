import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function Home() {
  const router = useRouter();

  const [device, setDevice] = useState<"android" | "ios" | "desktop">("desktop");
  const [loading, setLoading] = useState(false);

  /* ================= DEVICE DETECTION ================= */
  useEffect(() => {
    if (Platform.OS === "web") {
      const ua = navigator.userAgent || "";

      if (/android/i.test(ua)) {
        setDevice("android");
      } else if (/iPhone|iPad|iPod/i.test(ua)) {
        setDevice("ios");
      } else {
        setDevice("desktop");
      }

      // analytics (non-blocking)
      (supabase as any)
        .from("analytics_events")
        .insert({
          event: "visit",
          device: ua,
        })
        .catch(() => {});
    }
  }, []);

  /* ================= FIXED NAVIGATION ================= */
  const handleEnterApp = async () => {
    if (loading) return;

    setLoading(true);

    try {
      if (Platform.OS === "web") {
        await (supabase as any)
          .from("analytics_events")
          .insert({
            event: "enter_app",
            device: navigator.userAgent,
          })
          .catch(() => {});
      }

      // ✅ FIX: use replace for web (prevents Vercel stuck)
      if (Platform.OS === "web") {
        window.location.href = "/app";
      } else {
        router.replace("/app");
      }
    } catch (error) {
      console.log("Navigation error:", error);
      setLoading(false);
    }
  };

  /* ================= FIXED DOWNLOAD ================= */
  const handleDownload = async () => {
    try {
      if (Platform.OS === "web") {
        await (supabase as any)
          .from("analytics_events")
          .insert({
            event: "download_apk",
            device: navigator.userAgent,
          })
          .catch(() => {});
      }

      const url =
        "https://expo.dev/artifacts/eas/9kr2QqpqQSJ8C5dV4xT8kL.apk";

      // ✅ FIX: force browser download
      if (Platform.OS === "web") {
        window.open(url, "_blank");
      } else {
        Linking.openURL(url);
      }
    } catch (error) {
      console.log("Download error:", error);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#020617" }}>
      
      {/* HERO */}
      <LinearGradient
        colors={["#020617", "#0f172a", "#020617"]}
        style={{ padding: 30, alignItems: "center", marginTop: 80 }}
      >
        <Text style={{ fontSize: 44, fontWeight: "bold", color: "#22c55e" }}>
          NASARA
        </Text>

        <Text
          style={{
            color: "#cbd5f5",
            textAlign: "center",
            marginTop: 10,
          }}
        >
          Buy, Sell, Chat, Go Viral & Earn Money
        </Text>

        {/* ENTER APP */}
        <TouchableOpacity
          onPress={handleEnterApp}
          disabled={loading}
          style={{
            backgroundColor: "#22c55e",
            padding: 15,
            borderRadius: 30,
            marginTop: 20,
            width: 220,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={{ fontWeight: "bold", textAlign: "center" }}>
              Enter App
            </Text>
          )}
        </TouchableOpacity>

        {/* ✅ SHOW DOWNLOAD FOR ANDROID + DESKTOP */}
        {(device === "android" || device === "desktop") && (
          <TouchableOpacity
            onPress={handleDownload}
            style={{
              backgroundColor: "#16a34a",
              padding: 15,
              borderRadius: 30,
              marginTop: 10,
              width: 220,
            }}
          >
            <Text style={{ fontWeight: "bold", textAlign: "center" }}>
              Download for Android 📱
            </Text>
          </TouchableOpacity>
        )}

        {/* IOS */}
        {device === "ios" && (
          <View
            style={{
              marginTop: 10,
              padding: 15,
              borderRadius: 30,
              borderWidth: 1,
              borderColor: "#fff",
              width: 220,
            }}
          >
            <Text style={{ textAlign: "center", color: "#fff" }}>
              iOS App Coming Soon 🍎
            </Text>
          </View>
        )}
      </LinearGradient>

      {/* FEATURES */}
      <View style={{ padding: 20 }}>
        {[
          "🛒 Sell Anything Fast",
          "📢 Promote Ads",
          "🎥 Viral Reels",
          "⚔️ Battles & Voting",
          "💬 Real-time Chat",
        ].map((item, i) => (
          <View
            key={i}
            style={{
              backgroundColor: "#0f172a",
              padding: 15,
              borderRadius: 12,
              marginBottom: 10,
            }}
          >
            <Text style={{ color: "#fff" }}>{item}</Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      <View style={{ alignItems: "center", marginBottom: 40 }}>
        <TouchableOpacity
          onPress={handleEnterApp}
          disabled={loading}
          style={{
            backgroundColor: "#22c55e",
            padding: 15,
            borderRadius: 30,
            width: 220,
            opacity: loading ? 0.7 : 1,
          }}
        >
          <Text style={{ fontWeight: "bold", textAlign: "center" }}>
            Start Now
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}