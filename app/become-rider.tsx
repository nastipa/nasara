import { useState } from "react";

import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";

import { supabase } from "../lib/supabase";

const API_URL = "https://nasara-upload-server.onrender.com";

export default function BecomeRider() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [ghanaCard, setGhanaCard] = useState("");
  const [bikeType, setBikeType] = useState("");
  const [momoNumber, setMomoNumber] = useState("");
  const [momoName, setMomoName] = useState("");
  const [network, setNetwork] = useState("");
  const [loading, setLoading] = useState(false);

  /* ================= APPLY ================= */

  async function apply() {
    if (loading) return;

    if (
      !fullName.trim() ||
      !phone.trim() ||
      !ghanaCard.trim() ||
      !bikeType.trim() ||
      !momoNumber.trim() ||
      !momoName.trim() ||
      !network.trim()
    ) {
      Alert.alert(
        "Missing Fields",
        "Please complete all fields."
      );
      return;
    }

    try {
      setLoading(true);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user || !session.access_token) {
        Alert.alert("Login Required", "Please log in to continue.");
        return;
      }

      const user = session.user;

      /* ================= INSERT APPLICATION ================= */

      const {
        data: application,
        error,
      } = await (supabase as any)
        .from("rider_applications")
        .insert({
          user_id: user.id,
          full_name: fullName.trim(),
          phone: phone.trim(),
          ghana_card: ghanaCard.trim(),
          bike_type: bikeType.trim(),
          momo_name: momoName.trim(),
          momo_number: momoNumber.trim(),
          network: network.trim(),
          status: "pending",
        })
        .select("id")
        .single();

      if (error) {
        console.log("RIDER APPLICATION ERROR:", error);
        throw error;
      }

      /* ================= CENTRAL ADMIN NOTIFICATION ================= */

      let notificationSent = false;

      try {
        const response = await fetch(
          `${API_URL}/notifications/admin-submit`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              type: "rider_application",
              ref_id: application.id,
            }),
          }
        );

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          console.log("RIDER ADMIN NOTIFICATION ERROR:", result);
        } else {
          notificationSent = true;
        }
      } catch (notificationError) {
        console.log(
          "RIDER ADMIN NOTIFICATION ERROR:",
          notificationError
        );
      }

      /* ================= RESULT ================= */

      if (notificationSent) {
        Alert.alert(
          "Application Submitted",
          "Your rider application has been submitted successfully. Nasara administrators have been notified and will review your application."
        );
      } else {
        Alert.alert(
          "Application Saved",
          "Your rider application has been saved and is awaiting review. However, the admin notification could not be sent."
        );
      }

      /* ================= RESET ================= */

      setFullName("");
      setPhone("");
      setGhanaCard("");
      setBikeType("");
      setMomoNumber("");
      setMomoName("");
      setNetwork("");

    } catch (err: any) {
      console.log("RIDER APPLICATION SUBMISSION ERROR:", err);

      Alert.alert(
        "Application Error",
        err?.message || "Could not submit your application."
      );
    } finally {
      setLoading(false);
    }
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
        editable={!loading}
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
        editable={!loading}
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
        editable={!loading}
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
        editable={!loading}
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
        editable={!loading}
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
        editable={!loading}
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
        editable={!loading}
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
          backgroundColor: loading ? "#64748b" : "#2563eb",
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