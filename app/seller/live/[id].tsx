import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase";

type LiveItem = {
  id: number;
  title: string;
  price: number;
  image_url?: string | null;
};

export default function LiveRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [items, setItems] = useState<LiveItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLiveItems = async () => {
    if (!id) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("live_session_items")
      .select(
        `
        item:items (
          id,
          title,
          price,
          image_url
        )
      `
      )
      .eq("live_session_id", Number(id));

    if (error) {
      console.log("LOAD LIVE ITEMS ERROR", error);
      setLoading(false);
      return;
    }

    const formatted: LiveItem[] =
      data?.map((row: any) => row.item).filter(Boolean) || [];

    setItems(formatted);
    setLoading(false);
  };

  useEffect(() => {
    loadLiveItems();
  }, [id]);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 12 }}>
        Live Items
      </Text>

      {loading ? (
        <ActivityIndicator />
      ) : items.length === 0 ? (
        <Text style={{ color: "#666" }}>No items added yet</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View
              style={{
                padding: 12,
                borderWidth: 1,
                borderColor: "#e5e7eb",
                borderRadius: 8,
                marginBottom: 10,
              }}
            >
              <Text style={{ fontWeight: "600" }}>{item.title}</Text>
              <Text>₵{item.price}</Text>
            </View>
          )}
        />
      )}

      {/* ✅ LEAVE LIVE → BACK TO HOME */}
      <TouchableOpacity
        onPress={() => router.replace("/browse")}
        style={{
          marginTop: 16,
          padding: 12,
          backgroundColor: "#111827",
          borderRadius: 8,
        }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "600" }}>
          Leave Live
        </Text>
      </TouchableOpacity>
    </View>
  );
}