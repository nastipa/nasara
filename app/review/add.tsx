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
      Alert.alert("Rating must be 1–5");
      return;
    }

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
      return;
    }

    Alert.alert("Success", "Review submitted");
    router.back();
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
        style={{
          backgroundColor: "#2563eb",
          padding: 14,
          borderRadius: 8,
          marginTop: 16,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "bold" }}>
          Submit Review
        </Text>
      </TouchableOpacity>
    </View>
  );
}