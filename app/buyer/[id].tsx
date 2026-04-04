import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../../lib/supabase";

type Review = {
  rating: number;
  comment: string | null;
  created_at: string;
};

type Order = {
  id: number;
  item_id: string;
  seller_id: string;
  item_title: string;
  status: string;
};

export default function BuyerProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    loadReviews();
    loadOrders();
  }, [id]);

  // ================= LOAD BUYER REVIEWS =================
  const loadReviews = async () => {
    const { data } = await supabase
      .from("seller_reviews")
      .select("rating, comment, created_at")
      .eq("reviewer_id", id)
      .order("created_at", { ascending: false });

    setReviews(data || []);
  };

  // ================= LOAD COMPLETED ORDERS =================
  const loadOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("id, item_id, seller_id, item_title, status")
      .eq("buyer_id", id)
      .eq("status", "completed")
      .order("id", { ascending: false });

    setOrders(data || []);
    setLoading(false);
  };

  // ================= RENDER =================
  if (loading) {
    return <Text style={{ marginTop: 40, textAlign: "center" }}>Loading…</Text>;
  }

  return (
    <FlatList
      data={reviews}
      keyExtractor={(_, i) => i.toString()}
      contentContainerStyle={{ padding: 16 }}
      ListHeaderComponent={
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 22, fontWeight: "bold" }}>Buyer Profile</Text>
          {email && <Text style={{ color: "#555", marginTop: 4 }}>Email: {email}</Text>}

          {/* Show completed orders */}
          {orders.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 6 }}>
                Completed Orders
              </Text>
              {orders.map((order) => (
                <View
                  key={order.id}
                  style={{
                    backgroundColor: "#f9f9f9",
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ fontWeight: "bold" }}>{order.item_title}</Text>
                  <Text>Status: {order.status}</Text>

                  {/* Only allow review if not already reviewed */}
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/review/add",
                        params: {
                          seller_id: order.seller_id,
                          item_id: order.item_id,
                        },
                      })
                    }
                    style={{
                      backgroundColor: "#2563eb",
                      padding: 8,
                      borderRadius: 6,
                      marginTop: 6,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#fff" }}>Write Review</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      }
      renderItem={({ item }) => (
        <View
          style={{
            backgroundColor: "#fff",
            padding: 12,
            borderRadius: 8,
            marginBottom: 10,
          }}
        >
          <Text style={{ fontWeight: "bold" }}>⭐ {item.rating} / 5</Text>
          {item.comment && <Text style={{ marginTop: 4 }}>{item.comment}</Text>}
        </View>
      )}
      ListEmptyComponent={
        <Text style={{ textAlign: "center", marginTop: 40 }}>No reviews yet</Text>
      }
    />
  );
}