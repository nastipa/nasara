import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View
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

      // analytics safe (no crash)
      try {
        (supabase as any).from("analytics_events").insert({
          event: "visit",
          device: ua,
        });
      } catch {}
    }
  }, []);

  /* ================= ENTER APP ================= */
  const handleEnterApp = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const { data } = await (supabase as any).auth.getSession();

      if (!data.session) {
        // ❌ New user → go to login
        router.replace("/(auth)/login");
      } else {
        // ✅ Logged in → go to app
        router.replace("/(tabs)");
      }
    } catch (error) {
      console.log("Navigation error:", error);
      setLoading(false);
    }
  };

  /* ================= DOWNLOAD APK ================= */
  const handleDownload = async () => {
    try {
      if (Platform.OS === "web") {
        await (supabase as any).from("analytics_events").insert({
          event: "download_apk",
          device: navigator.userAgent,
        });
      }

      // ✅ FORCE DOWNLOAD FIX (works on web)
      window.open(
        "https://expo.dev/artifacts/eas/9kr2QqpqQSJ8C5dV4xT8kL.apk",
        "_blank"
      );
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

        {/* ANDROID DOWNLOAD */}
        {device === "android" && (
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
            key={i.toString()}
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