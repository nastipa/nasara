import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

/* ================= TYPES ================= */

type Review = {
  id: number;
  seller_id: string;
  item_id: string;
  reviewer_id: string;
  reviewer_email: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
};

export default function Reviews() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  /* ================= LOAD REVIEWS ================= */

  useEffect(() => {
    if (!itemId) {
      setLoading(false);
      return;
    }

    const loadReviews = async () => {
      const { data, error } = await supabase
        .from("seller_reviews")
        .select("*")
        .eq("item_id", itemId)
        .order("created_at", { ascending: false });

      if (error) {
        console.log("Error loading reviews:", error.message);
        setLoading(false);
        return;
      }

      if (data) {
        setReviews(data as Review[]);
      }

      setLoading(false);
    };

    loadReviews();
  }, [itemId]);

  /* ================= CALCULATE AVERAGE ================= */

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;

    const total = reviews.reduce((sum, r) => sum + r.rating, 0);
    return (total / reviews.length).toFixed(1);
  }, [reviews]);

  /* ================= HELPERS ================= */

  const renderStars = (rating: number) => {
    let stars = "";
    for (let i = 1; i <= 5; i++) {
      stars += i <= rating ? "⭐" : "☆";
    }
    return stars;
  };

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <View
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  /* ================= UI ================= */

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* HEADER */}
      <Text style={{ fontSize: 20, fontWeight: "bold" }}>
        Reviews
      </Text>

      {reviews.length > 0 && (
        <View style={{ marginVertical: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: "bold" }}>
            ⭐ {averageRating} / 5
          </Text>
          <Text style={{ color: "#666" }}>
            {reviews.length} review{reviews.length > 1 ? "s" : ""}
          </Text>
        </View>
      )}

      {/* NO REVIEWS */}
      {reviews.length === 0 ? (
        <Text style={{ textAlign: "center", marginTop: 40 }}>
          No reviews yet
        </Text>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: "#fff",
                padding: 12,
                borderRadius: 8,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: "#eee",
              }}
            >
              {/* STARS */}
              <Text style={{ fontSize: 16 }}>
                {renderStars(item.rating)}
              </Text>

              {/* COMMENT */}
              {item.comment && (
                <Text style={{ marginTop: 6 }}>
                  {item.comment}
                </Text>
              )}

              {/* REVIEWER */}
              <Text
                style={{
                  marginTop: 6,
                  color: "#555",
                  fontSize: 12,
                }}
              >
                By {item.reviewer_email || "Anonymous"}
              </Text>

              {/* DATE */}
              <Text
                style={{
                  color: "#999",
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}