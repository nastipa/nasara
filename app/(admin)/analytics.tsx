import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { supabase } from "../../lib/supabase";

export default function Analytics() {
  const [users, setUsers] = useState(0);
  const [items, setItems] = useState(0);

  const loadStats = async () => {
    const { count: userCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const { count: itemCount } = await supabase
      .from("items")
      .select("*", { count: "exact", head: true });

    setUsers(userCount || 0);
    setItems(itemCount || 0);
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>
        Platform Stats
      </Text>

      <Text style={{ marginTop: 20 }}>Users: {users}</Text>
      <Text>Listings: {items}</Text>
    </View>
  );
}