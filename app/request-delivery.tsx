import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function RequestDelivery() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [itemName, setItemName] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");

  async function createDelivery() {
    if (
      !itemName ||
      !pickupAddress ||
      !dropoffAddress ||
      !receiverPhone
    ) {
      Alert.alert(
        "Missing Fields",
        "Please complete all fields"
      );
      return;
    }

    try {
      setLoading(true);

      const { data: authData } =
        await supabase.auth.getUser();

      const user = authData?.user;

      if (!user) {
        Alert.alert("Login Required");
        setLoading(false);
        return;
      }

      const otp =
        Math.floor(
          1000 + Math.random() * 9000
        ).toString();

      const { error } =
        await (supabase as any)
          .from("deliveries")
          .insert({
            sender_id: user.id,
            item_name: itemName,
            pickup_address: pickupAddress,
            dropoff_address: dropoffAddress,
            receiver_phone: receiverPhone,
            otp_code: otp,
            payment_status: "pending",
            status: "pending_pricing",
          });

      if (error) {
        Alert.alert(
          "Delivery Error",
          error.message
        );
        setLoading(false);
        return;
      }

      const msg =
        "Delivery request submitted.\n\n" +
        "Admin will review and set price.\n\n" +
        "Receiver OTP: " +
        otp +
        "\n\nSave this OTP.";

      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        Alert.alert("Submitted", msg);
      }

      setItemName("");
      setPickupAddress("");
      setDropoffAddress("");
      setReceiverPhone("");

      router.back();
    } catch (err: any) {
      console.log(err);
      Alert.alert("Error", err?.message);
    }

    setLoading(false);
  }

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: "#fff",
      }}
      contentContainerStyle={{
        padding: 20,
      }}
    >
      <Text
        style={{
          fontSize: 30,
          fontWeight: "bold",
          marginBottom: 25,
        }}
      >
        🚚 Request Delivery
      </Text>

      <Text style={{ marginBottom: 6, fontWeight: "600" }}>
        Item Name
      </Text>

      <TextInput
        value={itemName}
        onChangeText={setItemName}
        placeholder="Package name"
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 12,
          padding: 15,
          marginBottom: 18,
        }}
      />

      <Text style={{ marginBottom: 6, fontWeight: "600" }}>
        Pickup Address
      </Text>

      <TextInput
        value={pickupAddress}
        onChangeText={setPickupAddress}
        placeholder="Pickup location"
        multiline
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 12,
          padding: 15,
          minHeight: 90,
          marginBottom: 18,
        }}
      />

      <Text style={{ marginBottom: 6, fontWeight: "600" }}>
        Dropoff Address
      </Text>

      <TextInput
        value={dropoffAddress}
        onChangeText={setDropoffAddress}
        placeholder="Receiver location"
        multiline
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 12,
          padding: 15,
          minHeight: 90,
          marginBottom: 18,
        }}
      />

      <Text style={{ marginBottom: 6, fontWeight: "600" }}>
        Receiver Phone
      </Text>

      <TextInput
        value={receiverPhone}
        onChangeText={setReceiverPhone}
        keyboardType="phone-pad"
        placeholder="Receiver number"
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 12,
          padding: 15,
          marginBottom: 30,
        }}
      />

      <TouchableOpacity
        disabled={loading}
        onPress={createDelivery}
        style={{
          backgroundColor: "#2563eb",
          padding: 18,
          borderRadius: 14,
        }}
      >
        <Text
          style={{
            color: "#fff",
            textAlign: "center",
            fontWeight: "bold",
            fontSize: 16,
          }}
        >
          {loading
            ? "Submitting..."
            : "Request Delivery"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}