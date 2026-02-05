import { useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { supabase } from "../lib/supabase";

export default function SellerOrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);

  const loadOrders = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return;

    const { data } = await supabase
      .from("orders")
      .select("*, live_session_items(title)")
      .eq("seller_id", auth.user.id)
      .order("created_at", { ascending: false });

    setOrders(data || []);
  };

  useEffect(() => {
    loadOrders();
    const t = setInterval(loadOrders, 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22 }}>📦 Orders</Text>

      <FlatList
        data={orders}
        keyExtractor={(i) => i.id.toString()}
        renderItem={({ item }) => (
          <View style={{ padding: 12, borderBottomWidth: 1 }}>
            <Text>Item: {item.live_session_items.title}</Text>
            <Text>Price: ₵{item.price}</Text>
            <Text>Status: {item.status}</Text>
          </View>
        )}
      />
    </View>
  );
}