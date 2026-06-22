import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function PaymentConfirm() {
  const { appId, quoteId } = useLocalSearchParams();
  const router = useRouter();

  const [receipt, setReceipt] = useState("");
  const [loading, setLoading] = useState(false);

  const confirmPayment = async () => {
    if (!receipt) {
      Alert.alert("Error", "Receipt URL is required");
      return;
    }

    setLoading(true);

    // 1. Save payment record
    const { error } = await (supabase as any)
      .from("utility_payments")
      .insert({
        application_id: appId,
        quotation_id: quoteId,
        receipt_url: receipt,
        status: "confirmed",
      });

    if (error) {
      Alert.alert("Error", error.message);
      setLoading(false);
      return;
    }

    // 2. Update application status (IMPORTANT FIX)
    await (supabase as any)
      .from("utility_applications")
      .update({
        status: "Payment Confirmed",
      })
      .eq("id", appId);

    Alert.alert("Success", "Payment confirmed");

    router.replace("/(utilities-admin)/applications");
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>
        Confirm Payment
      </Text>

      <TextInput
        placeholder="Receipt URL (Cloudflare)"
        value={receipt}
        onChangeText={setReceipt}
        style={{
          borderWidth: 1,
          padding: 10,
          marginTop: 10,
        }}
      />

      <TouchableOpacity
        onPress={confirmPayment}
        style={{
          backgroundColor: "#16a34a",
          padding: 14,
          marginTop: 20,
        }}
      >
        <Text style={{ color: "#fff", textAlign: "center" }}>
          {loading ? "Processing..." : "Confirm Payment"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}