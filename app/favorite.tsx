import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function Favorites() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const loadFavorites = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("favorites")
      .select(
        `
        items_live (
          id,
          user_id,
          title,
          price,
          description,
          image_url,
          location,
          seller_phone
        )
      `
      )
      .eq("user_id", user.id);

    if (error) {
      console.log(error.message);
      setLoading(false);
      return;
    }

    setItems(
      data?.map((f: any) => f.items_live).filter(Boolean) || []
    );
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [])
  );

  return (
    <View style={{ flex: 1 }}>
      {/* ✅ BACK TO HOME */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={{ padding: 12 }}
      >
        <Text style={{ color: "#2563eb", fontWeight: "600" }}>
          ← Back to Home
        </Text>
      </TouchableOpacity>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadFavorites} />
        }
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 40 }}>
            No favorites yet ❤️
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/itemdetail/${item.id}`)}
            style={{
              backgroundColor: "#fff",
              marginBottom: 12,
              padding: 10,
              borderRadius: 10,
              elevation: 2,
            }}
          >
            {item.image_url ? (
              <Image
                source={{ uri: item.image_url }}
                style={{ height: 160, borderRadius: 8 }}
              />
            ) : (
              <View
                style={{
                  height: 160,
                  backgroundColor: "#eee",
                  borderRadius: 8,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text>No Image</Text>
              </View>
            )}

            <Text style={{ fontWeight: "bold", marginTop: 6 }}>
              {item.title}
            </Text>

            <Text style={{ color: "green" }}>₵ {item.price}</Text>

            {item.location && (
              <Text style={{ color: "#555" }}>
                📍 {item.location}
              </Text>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}