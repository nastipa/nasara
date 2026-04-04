import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function AdminBoostApproval() {
  const [boosts, setBoosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
   const router = useRouter();

  /* LOAD BOOST REQUESTS */
  const loadBoosts = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("boost")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setBoosts(data ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadBoosts();
  }, []);

  /* APPROVE BOOST */
  const approveBoost = async (boost: any) => {
    // Activate boost
    await (supabase as any)
      .from("boost")
      .update({ status: "approved" })
      .eq("id", boost.id);

    // Mark item boosted
    await (supabase as any)
      .from("items_live")
      .update({
        is_boosted: true,
        boosted_until: new Date(
          Date.now() + boost.days * 86400000
        ).toISOString(),
      })
      .eq("id", boost.live_item_id);

    Alert.alert("Approved ✅", "Boost activated successfully.");
    loadBoosts();
  };

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>
        Boost Approvals
      </Text>
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

      {loading && <Text>Loading...</Text>}

      {boosts.map((b) => (
        <View
          key={b.id}
          style={{
            marginTop: 16,
            padding: 14,
            borderWidth: 1,
            borderRadius: 10,
          }}
        >
          
          {/* IMAGE */}
          {b.item_image_url && (
            <Image
              source={{ uri: b.item_image_url }}
              style={{
                width: "100%",
                height: 180,
                borderRadius: 10,
              }}
            />
          )}

          <Text style={{ fontWeight: "bold", marginTop: 10 }}>
            {b.item_title}
          </Text>

          <Text>Amount: {b.amount} GHS</Text>
          <Text>Network: {b.network}</Text>
          <Text>Payment Code: {b.payment_code}</Text>

          <TouchableOpacity
            onPress={() => approveBoost(b)}
            style={{
              backgroundColor: "green",
              padding: 12,
              marginTop: 12,
              borderRadius: 8,
            }}
          >
            
            <Text style={{ color: "white", textAlign: "center" }}>
              Approve Boost
            </Text>
            
          </TouchableOpacity>
          
        </View>
      ))}
      
    </ScrollView>
  );
}