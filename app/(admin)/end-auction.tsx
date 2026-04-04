import { useEffect, useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../../lib/supabase";

type Auction = {
  id: number;
  item_name: string;
  status: string;
};

export default function EndAuction() {
  const [auctions, setAuctions] = useState<Auction[]>([]);

  const loadAuctions = async () => {
    const { data } = await supabase
      .from("auctions")
      .select("*")
      .eq("status", "live");

    if (data) setAuctions(data);
  };

  useEffect(() => {
    loadAuctions();
  }, []);

  const endAuction = async (id: number) => {
    await (supabase as any)
      .from("auctions")
      .update({ status: "ended" })
      .eq("id", id);

    loadAuctions();
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>
        Live Auctions
      </Text>

      <FlatList
        data={auctions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={{ padding: 12 }}>
            <Text>{item.item_name}</Text>

            <TouchableOpacity
              onPress={() => endAuction(item.id)}
              style={{
                marginTop: 6,
                backgroundColor: "#ef4444",
                padding: 8,
                borderRadius: 6,
              }}
            >
              <Text style={{ color: "#fff" }}>End Auction</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}