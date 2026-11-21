import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

const PRICE_PER_DAY = 30;

export default function FarmBoostScreen() {
  const router = useRouter();

  const [farmId, setFarmId] =
    useState<number | null>(null);

  const [userId, setUserId] =
    useState("");

  const [days, setDays] =
    useState("1");

  const [reference, setReference] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    loadFarm();
  }, []);

  const loadFarm = async () => {
    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) return;

    setUserId(user.id);

    const { data } =
      await (supabase as any)
        .from("farm_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (data) {
      setFarmId(data.id);
    }
  };

  const amount =
    Number(days || 0) *
    PRICE_PER_DAY;

 const submitBoost = async () => {
  try {
    if (!farmId) {
      Alert.alert("Farm Not Found", "Your farm profile could not be found.");
      return;
    }

    const numberOfDays = Number(days);

    if (!Number.isInteger(numberOfDays) || numberOfDays < 1) {
      Alert.alert("Invalid Days", "Please enter at least 1 day.");
      return;
    }

    if (!reference.trim()) {
      Alert.alert("Missing Reference", "Enter your MoMo payment reference.");
      return;
    }

    setLoading(true);

    // ==========================================
    // 1. GET AUTHENTICATED SESSION
    // ==========================================

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user || !session.access_token) {
      Alert.alert("Login Required", "Please sign in again.");
      return;
    }

    const authenticatedUserId = session.user.id;

    // ==========================================
    // 2. VERIFY FARM OWNERSHIP
    // ==========================================

    const { data: farm, error: farmError } = await (
      supabase as any
    )
      .from("farm_profiles")
      .select("id")
      .eq("id", farmId)
      .eq("user_id", authenticatedUserId)
      .single();

    if (farmError || !farm) {
      Alert.alert("Error", "Your farm profile could not be verified.");
      return;
    }

    // ==========================================
    // 3. CALCULATE PAYMENT
    // ==========================================

    const totalAmount = numberOfDays * PRICE_PER_DAY;

    // ==========================================
    // 4. SAVE FARM BOOST REQUEST
    // ==========================================

    const { data: boostRequest, error: boostError } = await (
      supabase as any
    )
      .from("farm_boost_requests")
      .insert({
        farm_id: farmId,
        user_id: authenticatedUserId,
        days: numberOfDays,
        amount: totalAmount,
        momo_reference: reference.trim(),
        status: "pending",
      })
      .select("id")
      .single();

    if (boostError || !boostRequest) {
      console.log("FARM BOOST INSERT ERROR:", boostError);

      throw new Error(
        boostError?.message || "Could not save farm boost request."
      );
    }

    // ==========================================
    // 5. NOTIFY NASARA ADMINS
    // ==========================================

    let notificationSent = false;

    try {
      const response = await fetch(
        "https://nasara-upload-server.onrender.com/notifications/admin-submit",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            type: "farm_boost_request",
            ref_id: boostRequest.id,
          }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        notificationSent = true;

        console.log("FARM BOOST ADMIN NOTIFICATION SENT:", result);
      } else {
        console.log("FARM BOOST NOTIFICATION FAILED:", result);
      }
    } catch (notificationError) {
      console.log(
        "FARM BOOST NOTIFICATION NETWORK ERROR:",
        notificationError
      );
    }

    // ==========================================
    // 6. SUCCESS MESSAGE
    // ==========================================

    Alert.alert(
      "Farm Boost Submitted",
      "Your farm boost request has been saved and is awaiting admin verification.\n\n" +
        "MoMo Reference:\n" +
        reference.trim() +
        "\n\n" +
        "Amount: GH₵ " +
        totalAmount.toFixed(2) +
        "\n\n" +
        (notificationSent
          ? "Nasara admins have been notified."
          : "Your request is saved, but the admin notification could not be sent.")
    );

    router.back();

  } catch (e: any) {
    console.log("FARM BOOST ERROR:", e);

    Alert.alert(
      "Error",
      e?.message || "Failed to submit farm boost request."
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <ScrollView
      contentContainerStyle={{
        padding: 16,
      }}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: "bold",
          marginBottom: 20,
        }}
      >
        Boost Farm
      </Text>

      <View
        style={{
          backgroundColor:
            "#f3f4f6",
          padding: 15,
          borderRadius: 12,
        }}
      >
        <Text
          style={{
            fontWeight: "bold",
            fontSize: 16,
          }}
        >
          Payment Details
        </Text>

        <Text
          style={{
            marginTop: 10,
          }}
        >
          Nasara App
        </Text>

        <Text>
          MTN MoMo
        </Text>

        <Text
          style={{
            fontWeight: "bold",
          }}
        >
          0539703374
        </Text>
      </View>

      <Text
        style={{
          fontWeight: "bold",
          marginTop: 20,
          marginBottom: 8,
        }}
      >
        Number of Days
      </Text>

      <TextInput
        value={days}
        onChangeText={setDays}
        keyboardType="numeric"
        placeholder="1"
        style={{
          borderWidth: 1,
          borderRadius: 10,
          padding: 12,
        }}
      />

      <Text
        style={{
          marginTop: 15,
          fontSize: 18,
          fontWeight: "bold",
          color: "green",
        }}
      >
        Amount: GH₵ {amount}
      </Text>

      <Text
        style={{
          marginTop: 20,
          fontWeight: "bold",
          marginBottom: 8,
        }}
      >
        MoMo Reference
      </Text>

      <TextInput
        value={reference}
        onChangeText={
          setReference
        }
        placeholder="Enter payment reference"
        style={{
          borderWidth: 1,
          borderRadius: 10,
          padding: 12,
        }}
      />

      <TouchableOpacity
        onPress={
          submitBoost
        }
        disabled={loading}
        style={{
          backgroundColor:
            "#16a34a",
          padding: 16,
          borderRadius: 12,
          marginTop: 25,
        }}
      >
        <Text
          style={{
            color: "#fff",
            textAlign:
              "center",
            fontWeight: "bold",
          }}
        >
          {loading
            ? "Submitting..."
            : "Submit Boost Request"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}