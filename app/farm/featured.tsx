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

export default function FeaturedFarmScreen() {
  const router = useRouter();

  const [farmId, setFarmId] =
    useState<number | null>(null);

  const [userId, setUserId] =
    useState("");

  const [days, setDays] =
    useState(1);

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
    } = await supabase.auth.getUser();

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

  const getAmount = () => {
    if (days === 1) return 50;
    if (days === 3) return 150;
    if (days === 7) return 350;

    return days * 50;
  };

 const submitRequest = async () => {
  try {
    if (!farmId) {
      Alert.alert("Farm Not Found", "Your farm profile could not be found.");
      return;
    }

    if (!reference.trim()) {
      Alert.alert("Missing Reference", "Enter your MoMo payment reference.");
      return;
    }

    if (![1, 3, 7].includes(days)) {
      Alert.alert("Invalid Duration", "Select a valid featured duration.");
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
    // 3. CALCULATE AMOUNT
    // ==========================================

    const totalAmount = getAmount();

    // ==========================================
    // 4. SAVE FEATURED FARM REQUEST
    // ==========================================

    const { data: featuredRequest, error: insertError } = await (
      supabase as any
    )
      .from("farm_featured_requests")
      .insert({
        farm_id: farmId,
        user_id: authenticatedUserId,
        days,
        amount: totalAmount,
        momo_reference: reference.trim(),
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError || !featuredRequest) {
      console.log("FEATURED FARM INSERT ERROR:", insertError);

      throw new Error(
        insertError?.message || "Could not save featured farm request."
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
            type: "farm_featured_request",
            ref_id: featuredRequest.id,
          }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        notificationSent = true;
        console.log("FEATURED FARM ADMIN NOTIFICATION SENT:", result);
      } else {
        console.log("FEATURED FARM NOTIFICATION FAILED:", result);
      }
    } catch (notificationError) {
      console.log(
        "FEATURED FARM NOTIFICATION NETWORK ERROR:",
        notificationError
      );
    }

    // ==========================================
    // 6. CONFIRM SUBMISSION
    // ==========================================

    Alert.alert(
      "Featured Farm Submitted",
      "Your featured farm request has been saved and is awaiting admin payment verification.\n\n" +
        "MoMo Reference:\n" +
        reference.trim() +
        "\n\nAmount: GH₵ " +
        totalAmount.toFixed(2) +
        "\n\n" +
        (notificationSent
          ? "Nasara admins have been notified."
          : "Your request is saved, but the admin notification could not be sent.")
    );

    router.back();

  } catch (e: any) {
    console.log("FEATURED FARM ERROR:", e);

    Alert.alert(
      "Error",
      e?.message || "Failed to submit featured farm request."
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
        ⭐ Featured Farm
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
            fontWeight:
              "bold",
            fontSize: 16,
          }}
        >
          Payment Details
        </Text>

        <Text
          style={{
            marginTop: 15,
          }}
        >
          MTN MoMo
        </Text>

        <Text
          style={{
            fontWeight:
              "bold",
          }}
        >
          0539703374
        </Text>

        <Text>
          Nasara App
        </Text>
      </View>

      <Text
        style={{
          marginTop: 20,
          fontWeight:
            "bold",
          marginBottom: 10,
        }}
      >
        Select Duration
      </Text>

      <View
        style={{
          flexDirection: "row",
        }}
      >
        {[1, 3, 7].map(
          (item) => (
            <TouchableOpacity
              key={item}
              onPress={() =>
                setDays(item)
              }
              style={{
                backgroundColor:
                  days === item
                    ? "#eab308"
                    : "#e5e7eb",

                paddingHorizontal: 20,
                paddingVertical: 12,

                borderRadius: 10,

                marginRight: 10,
              }}
            >
              <Text
                style={{
                  fontWeight:
                    "bold",
                }}
              >
                {item} Day
                {item > 1
                  ? "s"
                  : ""}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>

      <View
        style={{
          marginTop: 20,
          backgroundColor:
            "#fef3c7",
          padding: 15,
          borderRadius: 12,
        }}
      >
        <Text
          style={{
            fontWeight:
              "bold",
            fontSize: 18,
          }}
        >
          Amount:
          {" "}
          GH₵
          {getAmount()}
        </Text>
      </View>

      <Text
        style={{
          marginTop: 20,
          fontWeight:
            "bold",
          marginBottom: 10,
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
          submitRequest
        }
        disabled={loading}
        style={{
          backgroundColor:
            "#eab308",
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
            fontWeight:
              "bold",
          }}
        >
          {loading
            ? "Submitting..."
            : "Submit Featured Request"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}