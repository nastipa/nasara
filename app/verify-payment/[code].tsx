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

export default function VerifyPaymentScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams();

  const [enteredCode, setEnteredCode] = useState("");
  const [loading, setLoading] = useState(false);

  const verifyPayment = async () => {
    if (enteredCode.trim() !== code) {
      Alert.alert("Invalid Code", "Code does not match.");
      return;
    }

    setLoading(true);

    /* ✅ Mark payment as paid */
    const { error } = await (supabase as any)
      .from("payments")
      .update({ status: "paid" })
      .eq("reference_code", code);

    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    Alert.alert("Payment Verified ✅", "Approval Complete!");

    /* ✅ Back to profile */
    router.replace("/profile");
  };

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: "white" }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>
        ✅ Verify Payment
      </Text>

      <Text style={{ marginTop: 12, color: "#555" }}>
        Enter the payment code you received:
      </Text>

      <TextInput
        value={enteredCode}
        onChangeText={setEnteredCode}
        placeholder="Enter Code"
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          padding: 12,
          borderRadius: 10,
          marginTop: 15,
        }}
      />

      <TouchableOpacity
        onPress={verifyPayment}
        disabled={loading}
        style={{
          marginTop: 25,
          backgroundColor: "blue",
          padding: 16,
          borderRadius: 12,
        }}
      >
        <Text
          style={{
            textAlign: "center",
            color: "white",
            fontWeight: "bold",
          }}
        >
          {loading ? "Checking..." : "Confirm Payment ✅"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}