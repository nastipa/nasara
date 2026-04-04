import { useEffect, useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../../lib/supabase";

type Stream = {
  id: string;
  seller_id: string;
  status: string;
};

export default function StopLiveStream() {
  const [streams, setStreams] = useState<Stream[]>([]);

  const loadStreams = async () => {
    const { data } = await supabase
      .from("live_streams")
      .select("*")
      .eq("status", "live");

    if (data) setStreams(data);
  };

  useEffect(() => {
    loadStreams();
  }, []);

  const stopStream = async (id: string) => {
    await (supabase as any)
      .from("live_streams")
      .update({ status: "ended" })
      .eq("id", id);

    loadStreams();
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>
        Live Streams
      </Text>

      <FlatList
        data={streams}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ padding: 12 }}>
            <Text>Seller: {item.seller_id}</Text>

            <TouchableOpacity
              onPress={() => stopStream(item.id)}
              style={{
                marginTop: 6,
                backgroundColor: "#ef4444",
                padding: 8,
                borderRadius: 6,
              }}
            >
              <Text style={{ color: "#fff" }}>Stop Stream</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}