import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity
} from "react-native";

export default function Home() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setLoading(false);
      setDownloading(false);
    }, [])
  );

  /* ================= ENTER APP ================= */
  const handleEnterApp = () => {
    if (loading) return;

    setLoading(true);

    // ✅ Always go to login first
    router.replace("/app");
  };

  /* ================= DOWNLOAD ================= */
  const handleDownload = () => {
    if (downloading) return;

    const url =
      "https://expo.dev/artifacts/eas/9kr2QqpqQSJ8C5dV4xT8kL.apk";

    setDownloading(true);

    if (Platform.OS === "web") {
      window.open(url, "_blank"); // ✅ FIXED for web
    } else {
      Linking.openURL(url);
    }

    setTimeout(() => setDownloading(false), 1000);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#020617" }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <LinearGradient
        colors={["#020617", "#0f172a", "#020617"]}
        style={{
          padding: 30,
          alignItems: "center",
          marginTop: 80,
        }}
      >
        <Text style={{ fontSize: 44, fontWeight: "bold", color: "#22c55e" }}>
          NASARA
        </Text>

        <Text style={{ color: "#cbd5f5", textAlign: "center", marginTop: 10 }}>
          Buy, Sell, Chat, Go Viral & Earn Money
        </Text>

        {/* ENTER */}
        <TouchableOpacity
          onPress={handleEnterApp}
          style={{
            backgroundColor: "#22c55e",
            padding: 15,
            borderRadius: 30,
            marginTop: 25,
            width: 220,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={{ textAlign: "center", fontWeight: "bold" }}>
              Enter App
            </Text>
          )}
        </TouchableOpacity>

        {/* DOWNLOAD */}
        <TouchableOpacity
          onPress={handleDownload}
          style={{
            backgroundColor: "#16a34a",
            padding: 15,
            borderRadius: 30,
            marginTop: 12,
            width: 220,
          }}
        >
          {downloading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={{ textAlign: "center", fontWeight: "bold" }}>
              Download Android APK 📱
            </Text>
          )}
        </TouchableOpacity>
      </LinearGradient>
    </ScrollView>
  );
}