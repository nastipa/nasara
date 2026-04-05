import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Home() {
  const router = useRouter();

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

        <TouchableOpacity
          onPress={() => router.push("/app")}
          style={{
            backgroundColor: "#22c55e",
            padding: 15,
            borderRadius: 30,
            marginTop: 20,
          }}
        >
          <Text style={{ fontWeight: "bold" }}>Enter App</Text>
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

      {/* CTA */}
      <View style={{ alignItems: "center", marginBottom: 40 }}>
        <TouchableOpacity
          onPress={() => router.push("/app")}
          style={{
            backgroundColor: "#22c55e",
            padding: 15,
            borderRadius: 30,
          }}
        >
          <Text style={{ fontWeight: "bold" }}>Start Now</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}