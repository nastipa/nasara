import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function AuctionsScreen() {
  const router = useRouter();
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /* ✅ Load Live Auctions */
  const loadAuctions = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("auctions")
      .select("*")
      .eq("status", "live")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("Auction load error:", error.message);
    }

    if (data) setAuctions(data);

    setLoading(false);
  };

  useEffect(() => {
    loadAuctions();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>
        🔨 Live Auctions
      </Text>

      {auctions.length === 0 ? (
        <Text style={{ marginTop: 20, color: "gray" }}>
          No auctions live right now.
        </Text>
      ) : (
        <FlatList
          data={auctions}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/auctions/${item.id}`)}
              style={{
                padding: 15,
                marginTop: 12,
                borderWidth: 1,
                borderColor: "#ddd",
                borderRadius: 12,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "bold" }}>
                {item.title}
              </Text>

              <Text style={{ marginTop: 5, color: "gray" }}>
                Starting Price: GH₵ {item.start_price}
              </Text>

              <Text style={{ marginTop: 5 }}>Tap to Join ▶️</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}