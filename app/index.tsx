import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleEnterApp = () => {
    if (loading) return;

    setLoading(true);

    // ✅ ALWAYS go to login first
    router.push("/(auth)/login");

    setTimeout(() => setLoading(false), 1000);
  };

  const handleDownload = () => {
    Linking.openURL(
      "https://expo.dev/artifacts/eas/9kr2QqpqQSJ8C5dV4xT8kL.apk"
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#020617" }}>
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
          style={{
            backgroundColor: "#22c55e",
            padding: 15,
            borderRadius: 30,
            marginTop: 20,
            width: 220,
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

        {/* DOWNLOAD */}
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
            Download Android APK 📱
          </Text>
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