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

  const submitBoost =
    async () => {
      try {
        if (!farmId) {
          Alert.alert(
            "Farm not found"
          );
          return;
        }

        if (
          !days ||
          Number(days) < 1
        ) {
          Alert.alert(
            "Enter valid days"
          );
          return;
        }

        if (!reference.trim()) {
          Alert.alert(
            "Enter MoMo reference"
          );
          return;
        }

        setLoading(true);

        const { error } =
          await (supabase as any)
            .from(
              "farm_boost_requests"
            )
            .insert({
              farm_id: farmId,
              user_id: userId,

              days:
                Number(days),

              amount,

              momo_reference:
                reference,

              status:
                "pending",
            });

        if (error)
          throw error;

        Alert.alert(
          "Success",
          "Boost request submitted. Waiting for admin approval."
        );

        router.back();
      } catch (e: any) {
        console.log(e);

        Alert.alert(
          "Error",
          e?.message ||
            "Failed to submit request"
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