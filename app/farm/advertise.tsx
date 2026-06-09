import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { supabase } from "../../lib/supabase";

const PRICE_PER_DAY = 30;

const uploadFile = async (
  uri: string
): Promise<string> => {
  const formData = new FormData();

  formData.append("file", {
    uri,
    name: "farm-ad.jpg",
    type: "image/jpeg",
  } as any);

  const res = await fetch(
    "https://nasara-upload-server.onrender.com/upload",
    {
      method: "POST",
      body: formData,
    }
  );

  const data =
    await res.json();

  return data.url;
};

export default function FarmAdvertiseScreen() {
  const router = useRouter();

  const [farmId, setFarmId] =
    useState<number | null>(null);

  const [userId, setUserId] =
    useState("");

  const [title, setTitle] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [days, setDays] =
    useState("1");

  const [reference, setReference] =
    useState("");

  const [bannerUri, setBannerUri] =
    useState<string | null>(null);

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

  const pickBanner =
    async () => {
      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes:
            ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });

      if (
        !result.canceled
      ) {
        setBannerUri(
          result.assets[0].uri
        );
      }
    };

  const submit =
    async () => {
      try {
        if (!farmId) {
          Alert.alert(
            "Farm not found"
          );
          return;
        }

        if (!title.trim()) {
          Alert.alert(
            "Enter title"
          );
          return;
        }

        if (!phone.trim()) {
          Alert.alert(
            "Enter phone number"
          );
          return;
        }

        if (!reference.trim()) {
          Alert.alert(
            "Enter MoMo reference"
          );
          return;
        }

        if (!bannerUri) {
          Alert.alert(
            "Select banner image"
          );
          return;
        }

        setLoading(true);

        const bannerUrl =
          await uploadFile(
            bannerUri
          );

        const total =
          Number(days) *
          PRICE_PER_DAY;

        const { error } =
          await (supabase as any)
            .from(
              "farm_ad_requests"
            )
            .insert({
              farm_id: farmId,
              user_id: userId,
              title,
              phone,
              days:
                Number(days),
              amount: total,
              momo_reference:
                reference,
              banner_url:
                bannerUrl,
              status:
                "pending",
            });

        if (error)
          throw error;

        Alert.alert(
          "Success",
          "Advertisement submitted"
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

  const total =
    Number(days || 0) *
    PRICE_PER_DAY;

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
        📢 Farm Advertisement
      </Text>

      <View
        style={{
          backgroundColor:
            "#f3f4f6",
          padding: 15,
          borderRadius: 12,
          marginBottom: 20,
        }}
      >
        <Text>
          Price:
          GH₵30 per day
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

      <TextInput
        placeholder="Advertisement Title"
        value={title}
        onChangeText={
          setTitle
        }
        style={{
          borderWidth: 1,
          borderRadius: 10,
          padding: 12,
          marginBottom: 15,
        }}
      />

      <TextInput
        placeholder="Phone Number"
        value={phone}
        onChangeText={
          setPhone
        }
        style={{
          borderWidth: 1,
          borderRadius: 10,
          padding: 12,
          marginBottom: 15,
        }}
      />

      <TextInput
        placeholder="Days"
        keyboardType="numeric"
        value={days}
        onChangeText={
          setDays
        }
        style={{
          borderWidth: 1,
          borderRadius: 10,
          padding: 12,
          marginBottom: 15,
        }}
      />

      <Text
        style={{
          fontWeight:
            "bold",
          marginBottom: 15,
        }}
      >
        Total:
        GH₵ {total}
      </Text>

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
          marginBottom: 15,
        }}
      />

      <TouchableOpacity
        onPress={
          pickBanner
        }
        style={{
          backgroundColor:
            "#2563eb",
          padding: 14,
          borderRadius: 10,
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
          Select Banner
        </Text>
      </TouchableOpacity>

      {bannerUri && (
        <Image
          source={{
            uri: bannerUri,
          }}
          style={{
            width: "100%",
            height: 180,
            borderRadius: 12,
            marginTop: 15,
          }}
          contentFit="cover"
        />
      )}

      <TouchableOpacity
        onPress={submit}
        disabled={loading}
        style={{
          backgroundColor:
            "#16a34a",
          padding: 16,
          borderRadius: 12,
          marginTop: 25,
          marginBottom: 40,
        }}
      >
        {loading ? (
          <ActivityIndicator
            color="#fff"
          />
        ) : (
          <Text
            style={{
              color: "#fff",
              textAlign:
                "center",
              fontWeight:
                "bold",
            }}
          >
            Submit Advertisement
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}