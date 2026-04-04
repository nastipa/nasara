import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    FlatList,
    Image,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function SellersShopScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [sellers, setSellers] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  /* ================= LOAD SELLERs PROFILE ================= */
  const loadSellers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    setSellers(data);
  };

  /* ================= LOAD SELLER ITEMS ================= */
  const loadSellersItems = async () => {
    const { data } = await supabase
      .from("items_live")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false });

    setItems(data || []);
  };

  useEffect(() => {
    loadSellers();
    loadSellersItems();
  }, []);

  if (!sellers) {
    return (
      <View style={{ padding: 20 }}>
        <Text>Loading Seller...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 15 }}>
      {/* ===== SELLER HEADER ===== */}
      <View
        style={{
          backgroundColor: "#fff",
          padding: 15,
          borderRadius: 12,
          marginBottom: 15,
          borderWidth: 1,
          borderColor: "#eee",
        }}
      >
        <Image
          source={{
            uri:
              sellers.avatar_url ??
              "https://ui-avatars.com/api/?background=ccc&size=200",
          }}
          style={{
            width: 90,
            height: 90,
            borderRadius: 45,
            alignSelf: "center",
          }}
        />

        <Text
          style={{
            fontSize: 20,
            fontWeight: "bold",
            textAlign: "center",
            marginTop: 10,
          }}
        >
          {sellers.full_name}
        </Text>

        {sellers.location && (
          <Text style={{ textAlign: "center", color: "gray" }}>
            📍 {sellers.location}
          </Text>
        )}
      </View>

      {/* ===== SELLERS ITEMS ===== */}
      <Text style={{ fontWeight: "700", marginBottom: 10 }}>
        Seller Items
      </Text>

      <FlatList
        data={items}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={{
          justifyContent: "space-between",
        }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              router.push("/itemdetail/" + item.id)
            }
            style={{
              width: "48%",
              backgroundColor: "#fff",
              marginBottom: 12,
              borderRadius: 10,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: "#eee",
            }}
          >
            <Image
              source={{ uri: item.image_url }}
              style={{
                width: "100%",
                height: 110,
                backgroundColor: "#eee",
              }}
            />

            <View style={{ padding: 6 }}>
              <Text numberOfLines={1} style={{ fontWeight: "bold" }}>
                {item.title}
              </Text>

              <Text style={{ fontWeight: "bold", marginTop: 2 }}>
                GH₵ {item.price}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}