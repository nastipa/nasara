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

const SUPPLIER_FEE = 150;
const API_URL = "https://nasara-upload-server.onrender.com";

export default function RequestSupplierScreen() {
  const router = useRouter();

  const [farmId, setFarmId] = useState<number | null>(null);
  const [userId, setUserId] = useState("");
  const [businessName, setBusinessName] = useState("");
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

      if (!businessName.trim()) {
        Alert.alert("Business Name", "Enter your business name.");
        return;
      }

      if (!reference.trim()) {
        Alert.alert("Payment Reference", "Enter your MoMo reference.");
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

      // Save the supplier request.
      const { data: supplierRequest, error: requestError } =
        await (supabase as any)
          .from("farm_supplier_requests")
          .insert({
            farm_id: farmId,
            user_id: userId,
            business_name: businessName.trim(),
            momo_reference: reference.trim(),
            status: "pending",
          })
          .select("id")
          .single();

      if (requestError) throw requestError;

      // Notify Nasara administrators.
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
              type: "farm_supplier_request",
              ref_id: supplierRequest.id,
            }),
          }
        );

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          console.log("SUPPLIER NOTIFICATION ERROR:", result);
        } else {
          notificationSent = true;
        }
      } catch (notificationError) {
        console.log("SUPPLIER NOTIFICATION ERROR:", notificationError);
      }

      if (notificationSent) {
        Alert.alert(
          "Request Submitted",
          "Your certified supplier request has been submitted. Nasara admins have been notified to verify your payment."
        );
      } else {
        Alert.alert(
          "Request Saved",
          "Your supplier request has been saved and is awaiting payment verification. However, the admin notification could not be sent."
        );
      }

      router.back();
    } catch (error: any) {
      console.log("SUPPLIER REQUEST ERROR:", error);

      Alert.alert(
        "Error",
        error.message || "Could not submit your supplier request."
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
        Become Certified Supplier
      </Text>

      <View
        style={{
          backgroundColor: "#f3f4f6",
          padding: 15,
          borderRadius: 12,
        }}
      >
        <Text style={{ fontWeight: "bold" }}>
          Fee: GH₵ {SUPPLIER_FEE}
        </Text>

        <Text style={{ marginTop: 10 }}>
          MTN MoMo
        </Text>

        <Text style={{ fontWeight: "bold" }}>
          0539703374
        </Text>

        <Text>Nasara App</Text>
      </View>

      <TextInput
        placeholder="Business Name"
        value={businessName}
        onChangeText={setBusinessName}
        editable={!loading}
        style={{
          borderWidth: 1,
          borderRadius: 10,
          padding: 12,
          marginTop: 20,
        }}
      />

      <TextInput
        placeholder="MoMo Reference"
        value={reference}
        onChangeText={setReference}
        editable={!loading}
        style={{
          borderWidth: 1,
          borderRadius: 10,
          padding: 12,
          marginTop: 15,
        }}
      />

      <TouchableOpacity
        onPress={submitRequest}
        disabled={loading}
        style={{
          backgroundColor: loading ? "#9ca3af" : "#16a34a",
          padding: 16,
          borderRadius: 12,
          marginTop: 20,
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