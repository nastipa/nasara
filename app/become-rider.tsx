import { useState } from "react";

import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";

import { supabase } from "../lib/supabase";

export default function BecomeRider() {

  const [fullName, setFullName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [ghanaCard, setGhanaCard] =
    useState("");

  const [bikeType, setBikeType] =
    useState("");

  const [momoNumber, setMomoNumber] =
    useState("");

  const [momoName, setMomoName] =
    useState("");

  const [network, setNetwork] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  /* ================= APPLY ================= */

  async function apply() {

    if (
      !fullName ||
      !phone ||
      !ghanaCard ||
      !bikeType ||
      !momoNumber ||
      !momoName ||
      !network
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

      /* ================= INSERT APPLICATION ================= */

      const {
        error,
      } =
        await (supabase as any)
          .from("rider_applications")
          .insert({

            user_id:
              user.id,

            full_name:
              fullName,

            phone:
              phone,

            ghana_card:
              ghanaCard,

            bike_type:
              bikeType,

            momo_name:
              momoName,

            momo_number:
              momoNumber,

            network:
              network,

            status:
              "pending",
          });

      if (error) {

        Alert.alert(
          "Application Error",
          error.message
        );

        setLoading(false);

        return;
      }

      Alert.alert(
        "Application Submitted",
        "Your rider application is under review."
      );

      /* ================= RESET ================= */

      setFullName("");
      setPhone("");
      setGhanaCard("");
      setBikeType("");
      setMomoNumber("");
      setMomoName("");
      setNetwork("");

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
      contentContainerStyle={{
        padding: 20,
        backgroundColor: "#0f172a",
        flexGrow: 1,
      }}
    >

      <Text
        style={{
          color: "white",
          fontSize: 28,
          fontWeight: "bold",
          marginBottom: 25,
        }}
      >
        🚚 Become a Rider
      </Text>

      {/* FULL NAME */}

      <TextInput
        value={fullName}
        onChangeText={setFullName}
        placeholder="Full Name"
        placeholderTextColor="#94a3b8"
        style={{
          backgroundColor: "#1e293b",
          color: "white",
          padding: 15,
          borderRadius: 12,
          marginBottom: 15,
        }}
      />

      {/* PHONE */}

      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder="Phone Number"
        placeholderTextColor="#94a3b8"
        keyboardType="phone-pad"
        style={{
          backgroundColor: "#1e293b",
          color: "white",
          padding: 15,
          borderRadius: 12,
          marginBottom: 15,
        }}
      />

      {/* GHANA CARD */}

      <TextInput
        value={ghanaCard}
        onChangeText={setGhanaCard}
        placeholder="Ghana Card Number"
        placeholderTextColor="#94a3b8"
        style={{
          backgroundColor: "#1e293b",
          color: "white",
          padding: 15,
          borderRadius: 12,
          marginBottom: 15,
        }}
      />

      {/* BIKE TYPE */}

      <TextInput
        value={bikeType}
        onChangeText={setBikeType}
        placeholder="Bike Type"
        placeholderTextColor="#94a3b8"
        style={{
          backgroundColor: "#1e293b",
          color: "white",
          padding: 15,
          borderRadius: 12,
          marginBottom: 15,
        }}
      />

      {/* MOMO NAME */}

      <TextInput
        value={momoName}
        onChangeText={setMomoName}
        placeholder="MOMO Account Name"
        placeholderTextColor="#94a3b8"
        style={{
          backgroundColor: "#1e293b",
          color: "white",
          padding: 15,
          borderRadius: 12,
          marginBottom: 15,
        }}
      />

      {/* MOMO NUMBER */}

      <TextInput
        value={momoNumber}
        onChangeText={setMomoNumber}
        placeholder="MOMO Number"
        placeholderTextColor="#94a3b8"
        keyboardType="phone-pad"
        style={{
          backgroundColor: "#1e293b",
          color: "white",
          padding: 15,
          borderRadius: 12,
          marginBottom: 15,
        }}
      />

      {/* NETWORK */}

      <TextInput
        value={network}
        onChangeText={setNetwork}
        placeholder="Network (MTN / Telecel / AirtelTigo)"
        placeholderTextColor="#94a3b8"
        style={{
          backgroundColor: "#1e293b",
          color: "white",
          padding: 15,
          borderRadius: 12,
          marginBottom: 25,
        }}
      />

      {/* BUTTON */}

      <TouchableOpacity
        onPress={apply}
        disabled={loading}
        style={{
          backgroundColor: "#2563eb",
          padding: 18,
          borderRadius: 14,
          alignItems: "center",
        }}
      >

        <Text
          style={{
            color: "white",
            fontWeight: "bold",
            fontSize: 16,
          }}
        >
          {loading
            ? "Submitting..."
            : "Submit Application"}
        </Text>

      </TouchableOpacity>

    </ScrollView>
  );
}