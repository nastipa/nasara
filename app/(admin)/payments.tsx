import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function AdminPayments() {
  const [list, setList] = useState<any[]>([]);

  /* ===== LOAD PENDING PAYMENTS ===== */
  const load = async () => {
    const { data, error } = await supabase
      .from("payment_requests")
      .select(
        `
        id,
        type,
        amount,
        item_id,
        seller_id,
        created_at,
        status,
        profiles (
          full_name
        ),
        live_items (
          id,
          title,
          image_url
        )
      `
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) console.log(error);
    setList(data || []);
  };

  /* ===== APPROVE PAYMENT ===== */
  const approve = async (p: any) => {
    try {
      const now = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 7); // default 7 days promote

      /* ===== PROMOTE ITEM ===== */
      if (p.type === "promote") {
        await (supabase as any)
          .from("live_items")
          .update({
            is_promoted: true,
            promoted_start_date: now.toISOString(),
            promoted_end_date: end.toISOString(),
            advertiser_name: p.profiles?.full_name ?? "Unknown",
            paid_amount: p.amount,
          })
          .eq("id", p.item_id);
      }

      /* ===== MARK PAYMENT APPROVED ===== */
      await (supabase as any)
        .from("payment_requests")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
        })
        .eq("id", p.id);

      /* ===== NOTIFY SELLER ===== */
      await (supabase as any).from("notifications").insert({
        user_id: p.seller_id,
        message:
          "✅ Your " +
          p.type +
          " payment has been approved. Your item is now live.",
      });

      Alert.alert("Approved", "Payment approved successfully");
      load();
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Failed to approve payment");
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* ===== UI ===== */
  return (
    <FlatList
      data={list}
      keyExtractor={(i) => i.id.toString()}
      renderItem={({ item }) => (
        <View
          style={{
            padding: 12,
            borderBottomWidth: 1,
            borderColor: "#e5e7eb",
          }}
        >
          <Text>Type: {item.type}</Text>
          <Text>Amount: GHS {item.amount}</Text>

          {item.profiles?.full_name && (
            <Text>Seller: {item.profiles.full_name}</Text>
          )}

          {item.live_items?.title && (
            <Text>Item: {item.live_items.title}</Text>
          )}

          <Text>
            Requested:{" "}
            {new Date(item.created_at).toDateString()}
          </Text>

          <TouchableOpacity
            onPress={() => approve(item)}
            style={{
              backgroundColor: "green",
              padding: 10,
              marginTop: 6,
              borderRadius: 6,
            }}
          >
            <Text style={{ color: "white", textAlign: "center" }}>
              Approve
            </Text>
          </TouchableOpacity>
        </View>
      )}
      ListEmptyComponent={
        <Text style={{ textAlign: "center", marginTop: 30 }}>
          No pending payments
        </Text>
      }
    />
  );
}