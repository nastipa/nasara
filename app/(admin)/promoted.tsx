import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function AdminPromoted() {
  const [loading, setLoading] = useState(true);
  const [promos, setPromos] = useState<any[]>([]);
  const router = useRouter();

  /* ================= LOAD PROMOTIONS ================= */
  const loadPromotions = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("promoted")
      .select(`
        id,
        item_id,
        seller_id,
        amount,
        payment_code,
        promoted_until,
        status,
        items_live (
          title,
          image_url
        )
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setPromos(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadPromotions();
  }, []);

  /* ================= APPROVE ================= */
  const approvePromo = async (promo: any) => {
    const { error } = await (supabase as any)
      .from("promoted")
      .update({ status: "approved" })
      .eq("id", promo.id);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    // Activate item promoted flag
    await (supabase as any)
      .from("items_live")
      .update({ is_promoted: true })
      .eq("id", promo.item_id);

    Alert.alert("Approved ✅", "Item is now promoted!");
    loadPromotions();
  };

  /* ================= REJECT ================= */
  const rejectPromo = async (promo: any) => {
    await (supabase as any)
      .from("promoted")
      .update({ status: "rejected" })
      .eq("id", promo.id);

    Alert.alert("Rejected ❌");
    loadPromotions();
  };

  /* ================= UI ================= */
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={promos}
      keyExtractor={(x) => String(x.id)}
      contentContainerStyle={{ padding: 16 }}

      /* ✅ BACK TO ADMIN DASHBOARD BUTTON ADDED */
      ListHeaderComponent={
        <TouchableOpacity
          onPress={() => router.push("/(admin)")}
          style={{
            backgroundColor: "black",
            padding: 10,
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          <Text style={{ color: "white", textAlign: "center" }}>
            ← Back to Admin Dashboard
          </Text>
        </TouchableOpacity>
      }

      ListEmptyComponent={
        <Text style={{ textAlign: "center", marginTop: 50 }}>
          No pending promotions
        </Text>
      }

      renderItem={({ item }) => (
        <View
          style={{
            backgroundColor: "white",
            padding: 14,
            borderRadius: 12,
            marginBottom: 14,
            borderWidth: 1,
            borderColor: "#ddd",
          }}
        >
          {/* ITEM IMAGE */}
          {item.items_live?.image_url && (
            <Image
              source={{ uri: item.items_live.image_url }}
              style={{
                width: "100%",
                height: 180,
                borderRadius: 10,
              }}
            />
          )}

          <Text style={{ fontWeight: "bold", marginTop: 10 }}>
            {item.items_live?.title}
          </Text>

          <Text>Amount: GH₵ {item.amount}</Text>
          <Text>Code: {item.payment_code}</Text>

          {/* ACTIONS */}
          <View style={{ flexDirection: "row", marginTop: 12, gap: 10 }}>
            <TouchableOpacity
              onPress={() => approvePromo(item)}
              style={{
                flex: 1,
                backgroundColor: "green",
                padding: 12,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "white", textAlign: "center" }}>
                Approve
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => rejectPromo(item)}
              style={{
                flex: 1,
                backgroundColor: "red",
                padding: 12,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "white", textAlign: "center" }}>
                Reject
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  );
}