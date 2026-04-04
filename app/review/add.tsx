import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function AddReview() {
  const { seller_id, item_id } = useLocalSearchParams<{
    seller_id: string;
    item_id: string;
  }>();

  const router = useRouter();

  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ===== LOAD LOGGED USER =====
  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserId(data.user.id);
        setEmail(data.user.email ?? null);
      }
    };
    loadUser();
  }, []);

  async function submitReview() {
    if (!userId || !seller_id || !item_id) {
      Alert.alert("Error", "Missing information");
      return;
    }

    // ❌ Prevent seller reviewing himself
    if (userId === seller_id) {
      Alert.alert("Error", "You cannot review yourself");
      return;
    }

    const r = Number(rating);

    if (r < 1 || r > 5) {
      Alert.alert("Rating must be between 1 and 5");
      return;
    }

    setLoading(true);

    try {
      // ✅ 1. CHECK COMPLETED ORDER
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("id")
        .eq("buyer_id", userId)
        .eq("item_id", item_id)
        .eq("status", "completed")
        .single();

      if (orderError || !order) {
        Alert.alert(
          "Not Allowed",
          "You can only review after completing this purchase."
        );
        setLoading(false);
        return;
      }

      // ✅ 2. PREVENT DUPLICATE REVIEW
      const { data: existing } = await supabase
        .from("seller_reviews")
        .select("id")
        .eq("reviewer_id", userId)
        .eq("item_id", item_id)
        .single();

      if (existing) {
        Alert.alert("Already Reviewed", "You already reviewed this item.");
        setLoading(false);
        return;
      }

      // ✅ 3. INSERT REVIEW
      const { error } = await (supabase as any).from("seller_reviews").insert({
        seller_id: seller_id,
        item_id: item_id,
        reviewer_id: userId,
        reviewer_email: email,
        rating: r,
        comment: comment,
      });

      if (error) {
        Alert.alert("Error", error.message);
        setLoading(false);
        return;
      }

      Alert.alert("Success", "Review submitted successfully!");
      router.back();
    } catch (err) {
      Alert.alert("Error", "Something went wrong");
    }

    setLoading(false);
  }

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "bold" }}>
        Rate Seller (1–5)
      </Text>

      <TextInput
        value={rating}
        onChangeText={setRating}
        keyboardType="number-pad"
        style={{
          borderWidth: 1,
          borderRadius: 8,
          padding: 10,
          marginVertical: 12,
        }}
      />

      <TextInput
        placeholder="Write a review (optional)"
        value={comment}
        onChangeText={setComment}
        multiline
        style={{
          borderWidth: 1,
          borderRadius: 8,
          padding: 10,
          height: 100,
        }}
      />

      <TouchableOpacity
        onPress={submitReview}
        disabled={loading}
        style={{
          backgroundColor: loading ? "#94a3b8" : "#2563eb",
          padding: 14,
          borderRadius: 8,
          marginTop: 16,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "bold" }}>
          {loading ? "Submitting..." : "Submit Review"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}