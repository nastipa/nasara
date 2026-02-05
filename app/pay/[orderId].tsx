import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Linking,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function PayScreen() {
  const { orderId } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    loadOrder();
  }, []);

  const loadOrder = async () => {
    const res = await (supabase as any)
      .from("orders")
      .select("*")
      .eq("id", Number(orderId))
      .single();

    if (res.data) setOrder(res.data);
  };

  const payWithMoMo = async (network: string) => {
    if (!order) return;

    setLoading(true);

    const reference = "MM-" + Date.now();

    await (supabase as any)
      .from("orders")
      .update({
        payment_method: network,
        payment_reference: reference,
        status: "processing",
      })
      .eq("id", order.id);

    // 🔴 MOCK PAYMENT REDIRECT (replace later with Paystack/Flutterwave)
    const paymentUrl =
      "https://example.com/pay?ref=" +
      reference +
      "&amount=" +
      order.total;

    Linking.openURL(paymentUrl);

    setLoading(false);
    router.replace("/payment-success");
  };

  if (!order) return <ActivityIndicator />;

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "600" }}>
        Pay ₵{order.total}
      </Text>

      <TouchableOpacity
        onPress={() => payWithMoMo("MTN")}
        style={{ backgroundColor: "#facc15", padding: 14, marginTop: 20 }}
      >
        <Text style={{ textAlign: "center" }}>Pay with MTN MoMo</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => payWithMoMo("VODAFONE")}
        style={{ backgroundColor: "#ef4444", padding: 14, marginTop: 12 }}
      >
        <Text style={{ textAlign: "center", color: "#fff" }}>
          Pay with Vodafone Cash
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => payWithMoMo("AIRTEL")}
        style={{ backgroundColor: "#dc2626", padding: 14, marginTop: 12 }}
      >
        <Text style={{ textAlign: "center", color: "#fff" }}>
          Pay with AirtelTigo
        </Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator style={{ marginTop: 20 }} />}
    </View>
  );
}