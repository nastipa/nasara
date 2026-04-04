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

export default function MakeOfferScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const router = useRouter();

  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const guard = async () => {
      const auth = await supabase.auth.getUser();
      if (!auth.data.user) {
        router.replace("/login");
        return;
      }

      /* Load item */
      const itemRes = await (supabase as any)
        .from("items_live")
        .select("user_id")
        .eq("id", Number(itemId))
        .single();

      if (!itemRes.data) {
        Alert.alert("Item not found");
        router.replace("/");
        return;
      }

      /* 🚫 Seller cannot make offer */
      if (itemRes.data.user_id === auth.data.user.id) {
        Alert.alert("You cannot make an offer on your own item");
        router.replace("/");
        return;
      }

      /* 🚫 Block duplicate active offers */
      const existing = await supabase
        .from("offers")
        .select("id")
        .eq("item_id", Number(itemId))
        .eq("buyer_id", auth.data.user.id)
        .in("status", ["pending", "counter"])
        .maybeSingle();

      if (existing.data) {
        Alert.alert("You already have an active offer for this item");
        router.replace("/");
      }
    };

    guard();
  }, []);

  const submitOffer = async () => {
    if (!price.trim()) {
      Alert.alert("Enter offer price");
      return;
    }

    const auth = await supabase.auth.getUser();
    if (!auth.data.user) {
      Alert.alert("Login required");
      return;
    }

    setLoading(true);

    const itemRes = await (supabase as any)
      .from("items_live")
      .select("user_id")
      .eq("id", Number(itemId))
      .single();

    if (!itemRes.data) {
      Alert.alert("Item not found");
      setLoading(false);
      return;
    }

    const res = await (supabase as any).from("offers").insert({
      item_id: Number(itemId),
      buyer_id: auth.data.user.id,
      seller_id: itemRes.data.user_id,
      price: Number(price),
      status: "pending",
      counter_price: null,
      last_counter_by: null,
    });

    setLoading(false);

    if (res.error) {
      Alert.alert("Failed to send offer", res.error.message);
      return;
    }

    Alert.alert("Offer sent successfully!");
    router.replace("/");
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "600" }}>
        Make an Offer
      </Text>

      <TextInput
        placeholder="Offer price"
        keyboardType="numeric"
        value={price}
        onChangeText={setPrice}
        style={{
          borderWidth: 1,
          padding: 12,
          marginVertical: 16,
          borderRadius: 8,
        }}
      />

      <TouchableOpacity
        onPress={submitOffer}
        disabled={loading}
        style={{
          backgroundColor: "#2563eb",
          padding: 14,
          borderRadius: 8,
        }}
      >
        <Text style={{ color: "#fff", textAlign: "center" }}>
          {loading ? "Sending..." : "Submit Offer"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

