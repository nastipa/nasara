import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { useAdmin } from "../../lib/useAdmin";

type PromoteRequest = {
  id: number;
  amount: number;
  seller_id: string;
  item_id: number;
  created_at: string;
  items_live: {
    id: number;
    title: string;
    image_url: string | null;
    user_id: string;
  };
};

export default function PromotedAdmin() {
  const router = useRouter();
  const isAdmin = useAdmin();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<PromoteRequest[]>([]);
  const [sellerNames, setSellerNames] = useState<Record<string, string>>({});

  /* ================= LOAD REQUESTS ================= */

  const loadRequests = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("promoted")
      .select(`
        id,
        amount,
        seller_id,
        item_id,
        created_at,
        items_live (
          id,
          title,
          image_url,
          user_id
        )
      `)
      .eq("type", "promote")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("PROMOTED ADMIN ERROR:", error.message);
      setRequests([]);
    } else {
      setRequests(data || []);
    }

    setLoading(false);
  };

  /* ================= LOAD SELLER NAME ================= */

  const loadSellerName = async (sellerId: string) => {
    if (sellerNames[sellerId]) return;

    const { data } = await (supabase as any)
      .from("profiles")
      .select("full_name")
      .eq("id", sellerId)
      .single();

    setSellerNames((prev) => ({
      ...prev,
      [sellerId]: data?.full_name || "Unknown Seller",
    }));
  };

  /* ================= APPROVE ================= */

  const approvePromotion = async (req: PromoteRequest) => {
    const start = new Date();

    // ✅ PROMOTION FOR 7 DAYS
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

    /* ✅ UPDATE ITEM (FIXED COLUMNS) */
    await (supabase as any)
      .from("items_live")
      .update({
        is_promoted: true,

        // ✅ THIS IS WHAT BROWSE USES
        promoted_until: end.toISOString(),
      })
      .eq("id", req.item_id);

    /* ✅ UPDATE REQUEST STATUS */
    await (supabase as any)
      .from("promoted")
      .update({
        status: "active", // ✅ MUST BE ACTIVE
        approved_at: new Date().toISOString(),
      })
      .eq("id", req.id);

    /* ✅ NOTIFY SELLER */
    await (supabase as any).from("notifications").insert({
      user_id: req.items_live.user_id,
      message: "Your item has been promoted successfully 🎉",
    });

    /* ✅ REMOVE FROM UI */
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
  };

  /* ================= EFFECTS ================= */

  useEffect(() => {
    if (isAdmin) loadRequests();
  }, [isAdmin]);

  useEffect(() => {
    requests.forEach((r) => loadSellerName(r.seller_id));
  }, [requests]);

  /* ================= GUARDS ================= */

  if (isAdmin === null || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Text>You are not authorized</Text>
      </View>
    );
  }

  /* ================= UI ================= */

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⭐ Promotion Requests</Text>

      <FlatList
        data={requests}
        keyExtractor={(i) => i.id.toString()}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 40 }}>
            No pending promotion requests
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.items_live?.image_url && (
              <Image
                source={{ uri: item.items_live.image_url }}
                style={styles.image}
              />
            )}

            <Text style={styles.itemTitle}>
              {item.items_live?.title}
            </Text>

            <Text>
              Seller: {sellerNames[item.seller_id] || "Loading..."}
            </Text>

            <Text>Amount Paid: GHS {item.amount}</Text>

            <Text style={styles.date}>
              Requested: {new Date(item.created_at).toDateString()}
            </Text>

            <TouchableOpacity
              style={styles.approveBtn}
              onPress={() => approvePromotion(item)}
            >
              <Text style={styles.approveText}>Approve Promotion</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.replace("/(admin)")}
      >
        <Text style={styles.backText}>⬅ Back to Admin Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f9fafb",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  card: {
    backgroundColor: "white",
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#eee",
  },
  image: {
    width: "100%",
    height: 160,
    borderRadius: 8,
    marginBottom: 10,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 6,
  },
  date: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  approveBtn: {
    backgroundColor: "#16a34a",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  approveText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
  },
  backBtn: {
    padding: 14,
  },
  backText: {
    textAlign: "center",
    color: "#2563eb",
    fontWeight: "bold",
  },
});