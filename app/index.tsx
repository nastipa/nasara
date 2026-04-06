import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";

export default function Home() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  /* ================= RESET LOADING WHEN SCREEN FOCUSED ================= */
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
    try {
      router.replace("/(tabs)/browse");
    } catch (err) {
      Alert.alert("Error", "Failed to open app");
      setLoading(false);
    }
  };

  /* ================= DOWNLOAD APK ================= */
  const handleDownload = async () => {
    if (downloading) return;
    const url =
      "https://expo.dev/artifacts/eas/9kr2QqpqQSJ8C5dV4xT8kL.apk";

    try {
      setDownloading(true);
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert("Error", "Cannot open download link");
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert("Download Failed", "Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#020617" }}
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* HERO SECTION */}
      <LinearGradient
        colors={["#020617", "#0f172a", "#020617"]}
        style={{
          padding: 30,
          alignItems: "center",
          marginTop: 80,
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
        }}
      >
        <Text style={{ fontSize: 48, fontWeight: "bold", color: "#22c55e" }}>
          NASARA
        </Text>
        <Text
          style={{
            color: "#cbd5f5",
            textAlign: "center",
            marginTop: 10,
            fontSize: 18,
          }}
        >
          Buy, Sell, Chat, Go Viral & Earn Money
        </Text>

        {/* ENTER APP BUTTON */}
        <TouchableOpacity
          onPress={handleEnterApp}
          activeOpacity={0.8}
          style={{
            backgroundColor: "#22c55e",
            padding: 16,
            borderRadius: 30,
            marginTop: 25,
            width: 240,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={{ fontWeight: "bold", textAlign: "center", fontSize: 16 }}>
              Enter App
            </Text>
          )}
        </TouchableOpacity>

        {/* DOWNLOAD APK BUTTON */}
        <TouchableOpacity
          onPress={handleDownload}
          activeOpacity={0.8}
          style={{
            backgroundColor: "#16a34a",
            padding: 16,
            borderRadius: 30,
            marginTop: 12,
            width: 240,
            opacity: downloading ? 0.7 : 1,
          }}
        >
          {downloading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={{ fontWeight: "bold", textAlign: "center", fontSize: 16 }}>
              Download Android APK 📱
            </Text>
          )}
        </TouchableOpacity>
      </LinearGradient>

      {/* FEATURES SECTION */}
      <View style={{ padding: 20 }}>
        <Text
          style={{
            color: "#22c55e",
            fontSize: 24,
            fontWeight: "bold",
            marginBottom: 20,
            textAlign: "center",
          }}
        >
          Why NASARA?
        </Text>

        {[
          { icon: "🛒", text: "Sell Anything Fast" },
          { icon: "📢", text: "Promote Ads" },
          { icon: "🎥", text: "Viral Reels" },
          { icon: "⚔️", text: "Battles & Voting" },
          { icon: "💬", text: "Real-time Chat" },
        ].map((item, i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#0f172a",
              padding: 15,
              borderRadius: 12,
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 22, marginRight: 12 }}>{item.icon}</Text>
            <Text style={{ color: "#fff", fontSize: 16 }}>{item.text}</Text>
          </View>
        ))}
      </View>

      {/* CALL TO ACTION */}
      <View style={{ alignItems: "center", marginBottom: 40 }}>
        <Text style={{ color: "#cbd5f5", marginBottom: 10 }}>
          Start your journey with NASARA today
        </Text>
        <TouchableOpacity
          onPress={handleEnterApp}
          activeOpacity={0.8}
          style={{
            backgroundColor: "#22c55e",
            padding: 16,
            borderRadius: 30,
            width: 240,
            opacity: loading ? 0.7 : 1,
          }}
        >
          <Text style={{ fontWeight: "bold", textAlign: "center", fontSize: 16 }}>
            Start Now 🚀
          </Text>
        </TouchableOpacity>
      </View>

      {/* FOOTER */}
      <View style={{ alignItems: "center", padding: 20 }}>
        <Text style={{ color: "#9ca3af", fontSize: 12 }}>
          © 2026 NASARA. All rights reserved.
        </Text>
      </View>
    </ScrollView>
  );
}