import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { useAdmin } from "../../lib/useAdmin";

export default function BoostAdmin() {
  const isAdmin = useAdmin();
  const router = useRouter();

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const load = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("boost_requests")
      .select(`
        id,
        amount,
        created_at,
        items_live (
          id,
          title,
          image_url
        ),
        boost_plans (
          label,
          days
        )
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("BOOST ADMIN LOAD ERROR:", error.message);
      setRequests([]);
    } else {
      setRequests(data || []);
    }

    setLoading(false);
  };

  const approve = async (r: any) => {
    const now = new Date();
    const end = new Date(
      now.getTime() + r.boost_plans.days * 24 * 60 * 60 * 1000
    );

    await (supabase as any)
      .from("items_live")
      .update({
        boosted_until: end.toISOString(),
      })
      .eq("id", r.items_live.id);

    await (supabase as any)
      .from("boost_requests")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
      })
      .eq("id", r.id);

    // remove instantly from UI
    setRequests((prev) => prev.filter((x) => x.id !== r.id));
  };

  if (isAdmin === null || loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAdmin) {
    return <Text>Not authorized</Text>;
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 12 }}>
        Boost Requests
      </Text>

      <FlatList
        data={requests}
        keyExtractor={(i) => String(i.id)}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 40 }}>
            No pending boost requests
          </Text>
        }
        renderItem={({ item }) => (
          <View
            style={{
              borderWidth: 1,
              borderRadius: 10,
              padding: 12,
              marginBottom: 12,
            }}
          >
            {/* IMAGE */}
            {item.items_live.image_url && (
              <Image
                source={{ uri: item.items_live.image_url }}
                style={{
                  width: "100%",
                  height: 160,
                  borderRadius: 8,
                  marginBottom: 8,
                  backgroundColor: "#eee",
                }}
              />
            )}

            <Text style={{ fontWeight: "bold", fontSize: 16 }}>
              {item.items_live.title}
            </Text>

            <Text>Plan: {item.boost_plans.label}</Text>
            <Text>Days: {item.boost_plans.days}</Text>
            <Text>Amount: {item.amount} GHS</Text>

            <TouchableOpacity
              onPress={() => approve(item)}
              style={{
                backgroundColor: "green",
                padding: 10,
                marginTop: 10,
                borderRadius: 6,
              }}
            >
              <Text style={{ color: "white", textAlign: "center" }}>
                Approve Boost
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity onPress={() => router.replace("/(admin)")}>
        <Text style={{ textAlign: "center", color: "#2563eb", marginTop: 12 }}>
          Back to Admin Dashboard
        </Text>
      </TouchableOpacity>
    </View>
  );
}