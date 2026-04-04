import { useEffect, useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../../lib/supabase";

type Item = {
  id: number;
  title: string;
  reported: boolean;
};

export default function RemoveFakeItems() {
  const [items, setItems] = useState<Item[]>([]);

  const loadItems = async () => {
    const { data } = await supabase
      .from("items")
      .select("id,title,reported")
      .eq("reported", true);

    if (data) setItems(data);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const removeItem = async (id: number) => {
    await supabase.from("items").delete().eq("id", id);
    loadItems();
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>
        Reported / Fake Listings
      </Text>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={{ padding: 12 }}>
            <Text>{item.title}</Text>

            <TouchableOpacity
              onPress={() => removeItem(item.id)}
              style={{
                marginTop: 6,
                backgroundColor: "#ef4444",
                padding: 8,
                borderRadius: 6,
              }}
            >
              <Text style={{ color: "#fff" }}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}