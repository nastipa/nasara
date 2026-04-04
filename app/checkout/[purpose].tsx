import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

/* ===============================
   NETWORK OPTIONS
================================ */
const networks = [
  { label: "MTN MoMo", value: "mtn" },
  { label: "Telecel Cash", value: "telecel" },
  { label: "AirtelTigo Money", value: "airteltigo" },
];

export default function CheckoutScreen() {
  const router = useRouter();
  const { purpose } = useLocalSearchParams();

  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [network, setNetwork] = useState("mtn");

  const [referenceCode, setReferenceCode] = useState("");
  const [loading, setLoading] = useState(false);

  /* ===============================
     AUTO GENERATE CODE
  ================================ */
  useEffect(() => {
    const code =
      purpose.toString().toUpperCase().slice(0, 3) +
      "-" +
      Math.floor(100000 + Math.random() * 900000);

    setReferenceCode(code);
  }, []);

  /* ===============================
     SUBMIT PAYMENT REQUEST
  ================================ */
  const handlePay = async () => {
    if (!amount.trim() || !phone.trim()) {
      Alert.alert("Missing Fields", "Enter phone and amount");
      return;
    }

    setLoading(true);

    /* ✅ Get logged user */
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert("Login Required", "Please login first");
      setLoading(false);
      return;
    }

    /* ✅ Save payment record */
    const { error } = await (supabase as any).from("payments").insert({
      user_id: user.id,
      purpose: purpose,
      reference_code: referenceCode,
      network: network,
      phone: phone,
      amount: Number(amount),
      status: "pending",
    });

    setLoading(false);

    if (error) {
      Alert.alert("Payment Error", error.message);
      return;
    }

    Alert.alert(
      "Payment Request Sent ✅",
      `Your Code: ${referenceCode}\nProceed to verify payment`
    );

    /* ✅ Go to verify page */
    router.push(`/verify-payment/${referenceCode}`);
  };

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: "white" }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>
        💳 MoMo Payment
      </Text>

      <Text style={{ marginTop: 10, color: "#555" }}>
        Purpose: {purpose}
      </Text>

      {/* ===============================
          NETWORK DROPDOWN
      ================================ */}
      <Text style={{ marginTop: 20, fontWeight: "600" }}>
        Select Network
      </Text>

      {networks.map((n) => (
        <TouchableOpacity
          key={n.value}
          onPress={() => setNetwork(n.value)}
          style={{
            padding: 12,
            borderRadius: 10,
            marginTop: 8,
            borderWidth: 1,
            borderColor: network === n.value ? "green" : "#ddd",
          }}
        >
          <Text style={{ fontWeight: "600" }}>{n.label}</Text>
        </TouchableOpacity>
      ))}

      {/* ===============================
          AMOUNT FIELD
      ================================ */}
      <Text style={{ marginTop: 20, fontWeight: "600" }}>
        Amount (GHS)
      </Text>

      <TextInput
        value={amount}
        onChangeText={setAmount}
        placeholder="Enter Amount"
        keyboardType="numeric"
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          padding: 12,
          borderRadius: 10,
          marginTop: 8,
        }}
      />

      {/* ===============================
          PHONE FIELD
      ================================ */}
      <Text style={{ marginTop: 20, fontWeight: "600" }}>
        MoMo Number
      </Text>

      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder="024xxxxxxx"
        keyboardType="phone-pad"
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          padding: 12,
          borderRadius: 10,
          marginTop: 8,
        }}
      />

      {/* ===============================
          GENERATED CODE
      ================================ */}
      <Text style={{ marginTop: 20, fontWeight: "600" }}>
        Payment Code
      </Text>

      <Text
        style={{
          marginTop: 8,
          padding: 12,
          backgroundColor: "#f3f4f6",
          borderRadius: 10,
          fontWeight: "bold",
        }}
      >
        {referenceCode}
      </Text>

      {/* ===============================
          PAY BUTTON
      ================================ */}
      <TouchableOpacity
        onPress={handlePay}
        disabled={loading}
        style={{
          marginTop: 30,
          backgroundColor: "green",
          padding: 16,
          borderRadius: 12,
        }}
      >
        <Text
          style={{
            textAlign: "center",
            color: "white",
            fontWeight: "bold",
            fontSize: 16,
          }}
        >
          {loading ? "Processing..." : "Pay Now ✅"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}