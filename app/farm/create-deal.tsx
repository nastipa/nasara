import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function CreateDealScreen() {
  const router = useRouter();

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [originalPrice, setOriginalPrice] =
    useState("");

  const [dealPrice, setDealPrice] =
    useState("");

  const [days, setDays] =
    useState("7");

  const [loading, setLoading] =
    useState(false);

  const createDeal = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("Login required");
        return;
      }

      const { data: farm } =
        await (supabase as any)
          .from("farm_profiles")
          .select("id")
          .eq(
            "user_id",
            user.id
          )
          .single();

      if (!farm) {
        Alert.alert(
          "Create a farm first"
        );
        return;
      }

      const original =
        Number(originalPrice);

      const deal =
        Number(dealPrice);

      const discount =
        original > 0
          ? Math.round(
              ((original - deal) /
                original) *
                100
            )
          : 0;

      const expires =
        new Date();

      expires.setDate(
        expires.getDate() +
          Number(days)
      );

      const { error } =
        await (supabase as any)
          .from("farm_deals")
          .insert({
            farm_id: farm.id,
            title,
            description,
            original_price:
              original,
            deal_price: deal,
            discount_percent:
              discount,
            expires_at:
              expires.toISOString(),
          });

      if (error) throw error;

      Alert.alert(
        "Success",
        "Deal created"
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
        🔥 Create Deal
      </Text>

      <TextInput
        placeholder="Deal title"
        value={title}
        onChangeText={setTitle}
        style={{
          borderWidth: 1,
          padding: 12,
          borderRadius: 10,
          marginBottom: 12,
        }}
      />

      <TextInput
        placeholder="Description"
        value={description}
        onChangeText={
          setDescription
        }
        multiline
        style={{
          borderWidth: 1,
          padding: 12,
          borderRadius: 10,
          minHeight: 100,
          marginBottom: 12,
        }}
      />

      <TextInput
        placeholder="Original Price"
        keyboardType="numeric"
        value={originalPrice}
        onChangeText={
          setOriginalPrice
        }
        style={{
          borderWidth: 1,
          padding: 12,
          borderRadius: 10,
          marginBottom: 12,
        }}
      />

      <TextInput
        placeholder="Deal Price"
        keyboardType="numeric"
        value={dealPrice}
        onChangeText={
          setDealPrice
        }
        style={{
          borderWidth: 1,
          padding: 12,
          borderRadius: 10,
          marginBottom: 12,
        }}
      />

      <TextInput
        placeholder="Days Active"
        keyboardType="numeric"
        value={days}
        onChangeText={setDays}
        style={{
          borderWidth: 1,
          padding: 12,
          borderRadius: 10,
          marginBottom: 20,
        }}
      />

      <TouchableOpacity
        onPress={createDeal}
        disabled={loading}
        style={{
          backgroundColor:
            "#dc2626",
          padding: 16,
          borderRadius: 12,
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
            ? "Creating..."
            : "Create Deal"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}