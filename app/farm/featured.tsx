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

        const { error } =
          await (supabase as any)
            .from(
              "farm_featured_requests"
            )
            .insert({
              farm_id: farmId,
              user_id: userId,
              days,
              amount:
                getAmount(),
              momo_reference:
                reference,
              status:
                "pending",
            });

        if (error)
          throw error;

        Alert.alert(
          "Success",
          "Featured farm request submitted."
        );

        router.back();
      } catch (e: any) {
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