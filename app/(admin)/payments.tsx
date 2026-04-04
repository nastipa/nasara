import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function PaymentsApproval() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);

  /* ================= LOAD PAYMENTS ================= */
  const loadPayments = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      Alert.alert("Error", error.message);
    }

    setPayments(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadPayments();
  }, []);

  /* ================= APPROVE PAYMENT ================= */
  const approvePayment = async (pay: any) => {
    Alert.alert(
      "Approve Payment?",
      `Approve ${pay.product_type.toUpperCase()} request for GH₵${pay.amount}?`,
      [
        { text: "Cancel" },
        {
          text: "Approve",
          onPress: async () => {
            /* 1️⃣ Mark payment approved */
            await (supabase as any)
              .from("payments")
              .update({ status: "approved" })
              .eq("id", pay.id);

            /* 2️⃣ Activate promotion/boost automatically */
            if (pay.product_type === "promote" || pay.product_type === "boost") {
              await (supabase as any)
                .from("promoted")
                .update({ status: "approved" })
                .eq("payment_code", pay.code);
            }

            /* 3️⃣ Reload */
            loadPayments();

            Alert.alert("Approved ✅", "Request activated successfully.");
          },
        },
      ]
    );
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
    <View style={{ flex: 1, padding: 20 }}>
      <Text
        style={{
          fontSize: 22,
          fontWeight: "bold",
          marginBottom: 15,
          textAlign: "center",
        }}
      >
        💰 Pending Payments
      </Text>

      <FlatList
        data={payments}
        keyExtractor={(x) => String(x.id)}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 30 }}>
            No pending payments right now.
          </Text>
        }
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: "white",
              padding: 15,
              borderRadius: 12,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: "#eee",
            }}
          >
            <Text style={{ fontWeight: "bold", fontSize: 16 }}>
              {item.product_type.toUpperCase()}
            </Text>

            <Text>Amount: GH₵ {item.amount}</Text>
            <Text>User: {item.user_id}</Text>
            <Text>Code: {item.code}</Text>

            <TouchableOpacity
              onPress={() => approvePayment(item)}
              style={{
                backgroundColor: "green",
                padding: 12,
                borderRadius: 8,
                marginTop: 10,
              }}
            >
              <Text style={{ color: "white", textAlign: "center" }}>
                Approve ✅
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}