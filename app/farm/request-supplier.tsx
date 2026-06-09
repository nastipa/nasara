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

export default function RequestSupplierScreen() {
  const router = useRouter();

  const [farmId, setFarmId] =
    useState<number | null>(null);

  const [userId, setUserId] =
    useState("");

  const [businessName, setBusinessName] =
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
          Alert.alert("Farm not found");
          return;
        }

        if (!businessName.trim()) {
          Alert.alert("Enter business name");
          return;
        }

        if (!reference.trim()) {
          Alert.alert("Enter MoMo reference");
          return;
        }

        setLoading(true);

        const { error } =
          await (supabase as any)
            .from("farm_supplier_requests")
            .insert({
              farm_id: farmId,
              user_id: userId,
              business_name: businessName,
              momo_reference: reference,
              status: "pending",
            });

        if (error) throw error;

        Alert.alert(
          "Success",
          "Supplier request submitted"
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
        Become Certified Supplier
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
          }}
        >
          Fee: GH₵ {SUPPLIER_FEE}
        </Text>

        <Text
          style={{
            marginTop: 10,
          }}
        >
          MTN MoMo
        </Text>

        <Text
          style={{
            fontWeight: "bold",
          }}
        >
          0539703374
        </Text>

        <Text>Nasara App</Text>
      </View>

      <TextInput
        placeholder="Business Name"
        value={businessName}
        onChangeText={
          setBusinessName
        }
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
        onChangeText={
          setReference
        }
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
          backgroundColor: "#16a34a",
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
            : "Submit Request"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}