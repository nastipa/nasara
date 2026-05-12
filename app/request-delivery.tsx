import { useState } from "react";

import {
  Alert,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";

import { useRouter } from "expo-router";

import { supabase } from "../lib/supabase";

export default function RequestDelivery() {

  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [itemName, setItemName] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [amount, setAmount] = useState("");

  /* ================= CREATE DELIVERY ================= */

  async function createDelivery() {

    if (
      !itemName ||
      !pickupAddress ||
      !dropoffAddress ||
      !receiverPhone ||
      !amount
    ) {

      Alert.alert(
        "Missing Fields",
        "Please complete all fields"
      );

      return;
    }

    try {

      setLoading(true);

      const {
        data: authData,
      } =
        await supabase.auth.getUser();

      const user =
        authData?.user;

      if (!user) {

        Alert.alert(
          "Login Required"
        );

        setLoading(false);

        return;
      }

      /* ================= OTP ================= */

      const otp =
        Math.floor(
          1000 + Math.random() * 9000
        ).toString();

      /* ================= INSERT DELIVERY ================= */

      const {
        error,
      } =
        await (supabase as any)
          .from("deliveries")
          .insert({

            customer_id:
              user.id,

            item_name:
              itemName,

            pickup_address:
              pickupAddress,

            dropoff_address:
              dropoffAddress,

            receiver_phone:
              receiverPhone,

            amount:
              Number(amount),

            otp_code:
              otp,

            payment_status:
              "pending",

            status:
              "awaiting_payment",
          });

      if (error) {

        Alert.alert(
          "Delivery Error",
          error.message
        );

        setLoading(false);

        return;
      }

      /* ================= WEB POPUP ================= */

      if (Platform.OS === "web") {

        window.alert(

          "DELIVERY CREATED SUCCESSFULLY\n\n" +

          "Receiver OTP: " +
          otp +

          "\n\nSave this OTP. Rider will request it before delivery completion.\n\n" +

          "PAYMENT REQUIRED\n\n" +

          "Nasara\n" +
          "MTN MOMO\n" +
          "0539703374\n\n" +

          "After payment admin will verify your delivery."

        );

      } else {

        /* ================= MOBILE POPUP ================= */

        Alert.alert(

          "Delivery Created",

          "Receiver OTP: " +
          otp +

          "\n\nSave this OTP. Rider will request it before delivery completion.\n\n" +

          "Send payment to:\n\n" +

          "Nasara\n" +
          "MTN MOMO\n" +
          "0539703374\n\n" +

          "After payment admin will verify your delivery.",

          [
            {
              text: "OK",
            },
          ]
        );
      }

      /* ================= RESET ================= */

      setItemName("");
      setPickupAddress("");
      setDropoffAddress("");
      setReceiverPhone("");
      setAmount("");

      router.back();

    } catch (err: any) {

      console.log(err);

      Alert.alert(
        "Error",
        err?.message
      );
    }

    setLoading(false);
  }

  /* ================= UI ================= */

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

      {/* ITEM */}

      <Text
        style={{
          marginBottom: 6,
          fontWeight: "600",
        }}
      >
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

      {/* PICKUP */}

      <Text
        style={{
          marginBottom: 6,
          fontWeight: "600",
        }}
      >
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
          marginBottom: 18,
          minHeight: 90,
        }}
      />

      {/* DROPOFF */}

      <Text
        style={{
          marginBottom: 6,
          fontWeight: "600",
        }}
      >
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
          marginBottom: 18,
          minHeight: 90,
        }}
      />

      {/* PHONE */}

      <Text
        style={{
          marginBottom: 6,
          fontWeight: "600",
        }}
      >
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
          marginBottom: 18,
        }}
      />

      {/* AMOUNT */}

      <Text
        style={{
          marginBottom: 6,
          fontWeight: "600",
        }}
      >
        Offer Amount (GH₵)
      </Text>

      <TextInput
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        placeholder="Amount rider will earn from"
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 12,
          padding: 15,
          marginBottom: 30,
        }}
      />

      {/* BUTTON */}

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
            ? "Creating..."
            : "Create Delivery"}
        </Text>

      </TouchableOpacity>

    </ScrollView>
  );
}