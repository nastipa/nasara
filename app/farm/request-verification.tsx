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

export default function RequestVerificationScreen() {
  const router = useRouter();

  const [farmId, setFarmId] =
    useState<number | null>(null);

  const [userId, setUserId] =
    useState("");

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

  const submitRequest =
    async () => {
      try {
        if (!farmId) {
          Alert.alert(
            "Farm not found"
          );
          return;
        }

        if (
          !reference.trim()
        ) {
          Alert.alert(
            "Enter MoMo reference"
          );
          return;
        }

        setLoading(true);
        const { data: existing } =
  await (supabase as any)
    .from("farm_verification_requests")
    .select("id")
    .eq("farm_id", farmId)
    .eq("status", "pending")
    .maybeSingle();

if (existing) {
  Alert.alert(
    "Pending Request",
    "You already have a verification request awaiting review."
  );
  return;
}
        const { error } =
          await (supabase as any)
            .from(
              "farm_verification_requests"
            )
            .insert({
              farm_id: farmId,
              user_id: userId,
              momo_reference:
                reference,
              status:
                "pending",
            });

       if (error) {
  console.log(
    "VERIFICATION ERROR",
    error
  );

  throw error;
}

        await (supabase as any)
          .from(
            "farm_profiles"
          )
          .update({
            verification_requested:
              true,
          })
          .eq(
            "id",
            farmId
          );

        Alert.alert(
          "Success",
          "Verification request submitted."
        );

        router.back();
      } catch (e: any) {
  console.log(
    "SUBMIT VERIFICATION ERROR",
    e
  );
        Alert.alert(
          "Error",
          e.message
        );
      }

      setLoading(false);
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
          Verification Fee
        </Text>

        <Text
          style={{
            marginTop: 10,
          }}
        >
          GH₵ {VERIFICATION_FEE}
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
        Payment Reference
      </Text>

      <TextInput
        value={reference}
        onChangeText={
          setReference
        }
        placeholder="Enter MoMo reference"
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
            fontWeight:
              "bold",
          }}
        >
          {loading
            ? "Submitting..."
            : "Submit Verification Request"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}