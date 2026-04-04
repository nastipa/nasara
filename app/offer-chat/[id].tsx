import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function OfferChat() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [messages, setMessages] = useState<any[]>([]);
  const [price, setPrice] = useState("");

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from("offer_messages")
      .select("*")
      .eq("offer_id", id)
      .order("created_at", { ascending: true });

    if (!error) setMessages(data || []);
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const sendMessage = async () => {
    if (!price.trim()) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await (supabase as any).from("offer_messages").insert({
      offer_id: id,
      sender_id: user.id,
      message_price: Number(price),
    });

    if (error) {
      Alert.alert("Failed to send");
      return;
    }

    setPrice("");
    loadMessages();
  };

  return (
    <View style={{ flex: 1, paddingTop: 60, padding: 20 }}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={{ fontSize: 16 }}>⬅ Back</Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 22, fontWeight: "700", marginVertical: 20 }}>
        Offer Negotiation
      </Text>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View
            style={{
              padding: 12,
              marginBottom: 10,
              borderWidth: 1,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontWeight: "600" }}>
              Offer: {item.message_price}
            </Text>
            <Text style={{ fontSize: 12, color: "gray" }}>
              {new Date(item.created_at).toLocaleString()}
            </Text>
          </View>
        )}
      />

      {/* Send New Price */}
      <TextInput
        placeholder="Enter new offer..."
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
        style={{
          borderWidth: 1,
          padding: 12,
          borderRadius: 8,
          marginTop: 10,
        }}
      />

      <TouchableOpacity
        onPress={sendMessage}
        style={{
          backgroundColor: "black",
          padding: 14,
          borderRadius: 8,
          marginTop: 10,
        }}
      >
        <Text style={{ color: "white", textAlign: "center" }}>
          Send Offer Price
        </Text>
      </TouchableOpacity>
    </View>
  );
}