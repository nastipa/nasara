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

const VERIFICATION_FEE = 100;
const API_URL = "https://nasara-upload-server.onrender.com";

export default function RequestVerificationScreen() {
  const router = useRouter();

  const [farmId, setFarmId] = useState<number | null>(null);
  const [userId, setUserId] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFarm();
  }, []);

  const loadFarm = async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        Alert.alert("Login Required", "Please log in to continue.");
        return;
      }

      setUserId(user.id);

      const { data, error } = await (supabase as any)
        .from("farm_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFarmId(data.id);
      }
    } catch (error: any) {
      console.log("LOAD FARM ERROR:", error);
      Alert.alert("Error", error.message || "Could not load your farm.");
    }
  };

  const submitRequest = async () => {
    if (loading) return;

    try {
      if (!farmId || !userId) {
        Alert.alert("Farm Not Found", "Your farm profile could not be found.");
        return;
      }

      if (!reference.trim()) {
        Alert.alert("Payment Reference", "Enter your MoMo payment reference.");
        return;
      }

      setLoading(true);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Your login session has expired. Please log in again.");
      }

      // Check for an existing pending verification request.
      const { data: existing, error: existingError } = await (supabase as any)
        .from("farm_verification_requests")
        .select("id")
        .eq("farm_id", farmId)
        .eq("user_id", userId)
        .eq("status", "pending")
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        Alert.alert(
          "Pending Request",
          "You already have a verification request awaiting review."
        );
        return;
      }

      // Save the verification request.
      const { data: request, error: requestError } = await (supabase as any)
        .from("farm_verification_requests")
        .insert({
          farm_id: farmId,
          user_id: userId,
          momo_reference: reference.trim(),
          status: "pending",
        })
        .select("id")
        .single();

      if (requestError) throw requestError;

      // Update the farm profile.
      const { error: farmUpdateError } = await (supabase as any)
        .from("farm_profiles")
        .update({
          verification_requested: true,
        })
        .eq("id", farmId)
        .eq("user_id", userId);

      if (farmUpdateError) {
        console.log("FARM VERIFICATION FLAG UPDATE ERROR:", farmUpdateError);
      }

      // Notify Nasara admins through the central notification system.
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
              type: "farm_verification_request",
              ref_id: request.id,
            }),
          }
        );

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          console.log("FARM VERIFICATION NOTIFICATION ERROR:", result);
        } else {
          notificationSent = true;
        }
      } catch (notificationError) {
        console.log(
          "FARM VERIFICATION NOTIFICATION ERROR:",
          notificationError
        );
      }

      if (notificationSent) {
        Alert.alert(
          "Request Submitted",
          "Your farm verification request has been submitted. Nasara admins have been notified and will verify your payment."
        );
      } else {
        Alert.alert(
          "Request Saved",
          "Your verification request has been saved and is awaiting payment verification. However, the admin notification could not be sent. Please contact Nasara support if the request is not reviewed."
        );
      }

      router.back();
    } catch (error: any) {
      console.log("SUBMIT VERIFICATION ERROR:", error);

      Alert.alert(
        "Submission Error",
        error.message || "Could not submit your verification request."
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
        Farm Verification
      </Text>

      <View
        style={{
          backgroundColor: "#f3f4f6",
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
          Verification Fee
        </Text>

        <Text style={{ marginTop: 10 }}>
          GH₵ {VERIFICATION_FEE}
        </Text>

        <Text style={{ marginTop: 15 }}>
          MTN MoMo
        </Text>

        <Text style={{ fontWeight: "bold" }}>
          0539703374
        </Text>

        <Text>
          Nasara App
        </Text>
      </View>

      <Text
        style={{
          marginTop: 20,
          fontWeight: "bold",
          marginBottom: 10,
        }}
      >
        Payment Reference
      </Text>

      <TextInput
        value={reference}
        onChangeText={setReference}
        placeholder="Enter MoMo reference"
        editable={!loading}
        style={{
          borderWidth: 1,
          borderRadius: 10,
          padding: 12,
        }}
      />

      <TouchableOpacity
        onPress={submitRequest}
        disabled={loading}
        style={{
          backgroundColor: loading ? "#9ca3af" : "#16a34a",
          padding: 16,
          borderRadius: 12,
          marginTop: 25,
        }}
      >
        <Text
          style={{
            color: "#fff",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          {loading
            ? "Submitting..."
            : "I've Paid - Submit for Verification"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}