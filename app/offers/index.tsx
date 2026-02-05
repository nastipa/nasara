import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
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
      .from("items")
      .select("seller_id")
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
      seller_id: itemRes.data.seller_id,
      price: Number(price),
      status: "pending",
    });

    setLoading(false);

    if (res.error) {
      Alert.alert("Failed to send offer");
      return;
    }

    Alert.alert("Offer sent");
    router.back();
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
        }}
      />

      <TouchableOpacity
        onPress={submitOffer}
        disabled={loading}
        style={{
          backgroundColor: "#2563eb",
          padding: 14,
        }}
      >
        <Text style={{ color: "#fff", textAlign: "center" }}>
          {loading ? "Sending..." : "Submit Offer"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}