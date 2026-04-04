import { useEffect, useState } from "react";
import { Alert, FlatList, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../../lib/supabase";

type Item = {
  id: number;
  title: string;
  price: number;
};

export default function DeleteListings() {
  const [items, setItems] = useState<Item[]>([]);

  const loadItems = async () => {
    const { data } = await supabase
      .from("items")
      .select("id,title,price")
      .order("id", { ascending: false });

    if (data) setItems(data);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const deleteItem = async (id: number) => {
    Alert.alert("Delete", "Delete this listing?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await supabase.from("items").delete().eq("id", id);
          loadItems();
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 10 }}>
        Delete Marketplace Listings
      </Text>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View
            style={{
              padding: 14,
              borderBottomWidth: 1,
              borderColor: "#ddd",
            }}
          >
            <Text>{item.title}</Text>
            <Text>GHS {item.price}</Text>

            <TouchableOpacity
              onPress={() => deleteItem(item.id)}
              style={{
                marginTop: 6,
                backgroundColor: "#ef4444",
                padding: 8,
                borderRadius: 6,
              }}
            >
              <Text style={{ color: "white" }}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}