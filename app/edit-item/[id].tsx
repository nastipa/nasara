import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

type Item = {
  id: number;
  title: string;
  description?: string | null;
  price: number;
  image_url?: string | null;
  location?: string | null;
};

export default function EditItemScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [itemId, setItemId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  // ================= LOAD ITEM =================
  useEffect(() => {
    if (!rawId) return;

    const idNumber = Number(rawId);

    if (isNaN(idNumber)) {
      Alert.alert("Error", "Invalid item id");
      setLoading(false);
      return;
    }

    setItemId(idNumber);

    const loadItem = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("items_live")
        .select("*")
        .eq("id", idNumber)
        .single();

      if (error) {
        Alert.alert("Error", error.message);
        setLoading(false);
        return;
      }

      if (data) {
        setTitle(data.title ?? "");
        setPrice(String(data.price ?? ""));
        setDescription(data.description ?? "");
        setLocation(data.location ?? "");
      }

      setLoading(false);
    };

    loadItem();
  }, [rawId]);

  // ================= SAVE =================
  const saveItem = async () => {
    if (!title || !price) {
      Alert.alert("Error", "Title and price are required");
      return;
    }

    if (!itemId) {
      Alert.alert("Error", "Item id missing. Please reopen this item.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("items_live")
      .update({
        title,
        price: Number(price),
        description,
        location,
      })
      .eq("id", itemId);

    setSaving(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    // 🔥 AUTO RETURN TO HOME / BROWSE
    Alert.alert("Success", "Item updated successfully", [
      {
        text: "OK",
        onPress: () => router.replace("/(tabs)/browse"),
      },
    ]);
  };

  // ================= LOADING =================
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // ================= UI =================
  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 20 }}>
        Edit Item
      </Text>

      <Text>Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Item title"
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 12,
          marginBottom: 12,
        }}
      />

      <Text>Price</Text>
      <TextInput
        value={price}
        onChangeText={setPrice}
        placeholder="Price"
        keyboardType="numeric"
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 12,
          marginBottom: 12,
        }}
      />

      <Text>Location</Text>
      <TextInput
        value={location}
        onChangeText={setLocation}
        placeholder="Location"
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 12,
          marginBottom: 12,
        }}
      />

      <Text>Description</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Description"
        multiline
        numberOfLines={4}
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 12,
          height: 100,
          marginBottom: 20,
        }}
      />

      <TouchableOpacity
        onPress={saveItem}
        disabled={saving}
        style={{
          backgroundColor: saving ? "#888" : "#000",
          padding: 14,
          borderRadius: 10,
        }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontSize: 16 }}>
          {saving ? "Saving..." : "Save Changes"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}