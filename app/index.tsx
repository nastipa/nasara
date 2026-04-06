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
  View,
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
      // Navigate to main app tab
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
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* HERO */}
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
        <Text
          style={{
            fontSize: 44,
            fontWeight: "bold",
            color: "#22c55e",
          }}
        >
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
          activeOpacity={0.8}
          style={{
            backgroundColor: "#22c55e",
            padding: 15,
            borderRadius: 30,
            marginTop: 25,
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

        {/* DOWNLOAD APK */}
        <TouchableOpacity
          onPress={handleDownload}
          activeOpacity={0.8}
          style={{
            backgroundColor: "#16a34a",
            padding: 15,
            borderRadius: 30,
            marginTop: 12,
            width: 220,
            opacity: downloading ? 0.7 : 1,
          }}
        >
          {downloading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={{ fontWeight: "bold", textAlign: "center" }}>
              Download Android APK 📱
            </Text>
          )}
        </TouchableOpacity>
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
    </ScrollView>
  );
}