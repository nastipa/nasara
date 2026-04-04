import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function ItemEdit() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const itemId =
    typeof params.id === "string" ? params.id : params.id?.[0] ?? "";

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(true);

  /* ===== LOAD ITEM ===== */
  useEffect(() => {
    if (!itemId) return;

    const loadItem = async () => {
      const { data, error } = await (supabase as any)
        .from("items_live")
        .select("title, price")
        .eq("id", itemId)
        .single();

      if (error) {
        Alert.alert("Error", error.message);
        setLoading(false);
        return;
      }

      if (data) {
        setTitle(data.title);
        setPrice(String(data.price));
      }

      setLoading(false);
    };

    loadItem();
  }, [itemId]);

  /* ===== SAVE CHANGES ===== */
  const saveItem = async () => {
    const { error } = await (supabase as any)
      .from("items_live")
      .update({
        title,
        price: Number(price),
      })
      .eq("id", itemId);

    if (error) {
      Alert.alert("Save failed", error.message);
      return;
    }

    Alert.alert("Success", "Item updated");
    router.back();
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 20 }}>
        Edit Item
      </Text>

      <Text>Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 10,
          marginBottom: 12,
        }}
      />

      <Text>Price</Text>
      <TextInput
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 10,
          marginBottom: 20,
        }}
      />

      <TouchableOpacity
        onPress={saveItem}
        style={{
          backgroundColor: "#2563eb",
          padding: 14,
          borderRadius: 8,
        }}
      >
        <Text style={{ color: "white", textAlign: "center", fontSize: 16 }}>
          💾 Save Changes
        </Text>
      </TouchableOpacity>
    </View>
  );
}