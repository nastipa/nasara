import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";

type Review = {
  rating: number;
  comment: string | null;
  created_at: string;
};

export default function BuyerProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [email, setEmail] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    loadBuyer();
    loadReviews();
  }, [id]);

  // ================= BUYER EMAIL =================
  const loadBuyer = async () => {
    const { data } = await supabase
      .from("seller_reviews")
      .select("reviewer_email")
      .eq("reviewer_id", id)
      .limit(1)
      .single();

    if (data?.reviewer_email) {
      setEmail(data.reviewer_email);
    }
  };

  // ================= BUYER REVIEWS =================
  const loadReviews = async () => {
    const { data } = await supabase
      .from("seller_reviews")
      .select("rating, comment, created_at")
      .eq("reviewer_id", id)
      .order("created_at", { ascending: false });

    setReviews(data || []);
    setLoading(false);
  };

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
          <Text style={{ fontSize: 22, fontWeight: "bold" }}>
            Buyer Profile
          </Text>

          {email && (
            <Text style={{ color: "#555", marginTop: 4 }}>
              Email: {email}
            </Text>
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
          <Text style={{ fontWeight: "bold" }}>
            ⭐ {item.rating} / 5
          </Text>

          {item.comment ? (
            <Text style={{ marginTop: 4 }}>{item.comment}</Text>
          ) : null}
        </View>
      )}
      ListEmptyComponent={
        <Text style={{ textAlign: "center", marginTop: 40 }}>
          No reviews yet
        </Text>
      }
    />
  );
}
