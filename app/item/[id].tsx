import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Linking,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function ItemPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  /* ================= LOAD ITEM ================= */
  useEffect(() => {
    const loadItem = async () => {
      if (!id) return;

      const { data, error } = await supabase
        .from("items_live")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        router.replace("/(tabs)/browse");
        return;
      }

      setItem(data);
      setLoading(false);
    };

    loadItem();
  }, [id]);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!item) return null;

  /* ================= UI ================= */
  return (
    <View style={{ flex: 1, backgroundColor: "#0f172a", padding: 16 }}>
      {/* IMAGE */}
      {item.image_url && (
        <Image
          source={{ uri: item.image_url }}
          style={{
            width: "100%",
            height: 250,
            borderRadius: 12,
            marginBottom: 12,
          }}
        />
      )}

      {/* TITLE */}
      <Text style={{ color: "white", fontSize: 20, fontWeight: "bold" }}>
        {item.title}
      </Text>

      {/* PRICE */}
      <Text style={{ color: "#22c55e", fontSize: 18, marginTop: 6 }}>
        GH₵ {item.price}
      </Text>

      {/* LOCATION */}
      <Text style={{ color: "#9ca3af", marginTop: 4 }}>
        📍 {item.location}
      </Text>

      {/* WHATSAPP */}
      {item.seller_phone && (
        <TouchableOpacity
          onPress={() =>
            Linking.openURL(`https://wa.me/${item.seller_phone}`)
          }
          style={{
            backgroundColor: "#25D366",
            padding: 14,
            borderRadius: 10,
            marginTop: 20,
          }}
        >
          <Text style={{ color: "white", textAlign: "center" }}>
            💬 Chat on WhatsApp
          </Text>
        </TouchableOpacity>
      )}

      {/* CTA LOGIN */}
      <TouchableOpacity
        onPress={() => router.push("/(auth)/login")}
        style={{
          backgroundColor: "#22c55e",
          padding: 14,
          borderRadius: 10,
          marginTop: 10,
        }}
      >
        <Text style={{ textAlign: "center", fontWeight: "bold" }}>
          🔐 Login to Chat / Buy
        </Text>
      </TouchableOpacity>

      {/* BACK */}
      <TouchableOpacity
        onPress={() => router.replace("/(tabs)/browse")}
        style={{
          marginTop: 20,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#3b82f6" }}>← Back to Browse</Text>
      </TouchableOpacity>
    </View>
  );
}