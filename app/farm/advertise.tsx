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
const API_URL = "https://nasara-upload-server.onrender.com";

const uploadFile = async (uri: string): Promise<string> => {
  const formData = new FormData();

  formData.append("file", {
    uri,
    name: "farm-ad.jpg",
    type: "image/jpeg",
  } as any);

  const res = await fetch(`${API_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();

  if (!res.ok || !data.url) {
    throw new Error(data.error || "Banner image upload failed.");
  }

  return data.url;
};

export default function FarmAdvertiseScreen() {
  const router = useRouter();

  const [farmId, setFarmId] = useState<number | null>(null);
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [days, setDays] = useState("1");
  const [reference, setReference] = useState("");
  const [bannerUri, setBannerUri] = useState<string | null>(null);
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

  const pickBanner = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled) {
        setBannerUri(result.assets[0].uri);
      }
    } catch (error: any) {
      Alert.alert("Image Error", error.message || "Could not select image.");
    }
  };

  const submit = async () => {
    if (loading) return;

    try {
      if (!farmId || !userId) {
        Alert.alert("Farm Not Found", "Your farm profile could not be found.");
        return;
      }

      if (!title.trim()) {
        Alert.alert("Enter Title", "Enter your advertisement title.");
        return;
      }

      if (!phone.trim()) {
        Alert.alert("Enter Phone Number", "Enter your contact phone number.");
        return;
      }

      if (!reference.trim()) {
        Alert.alert("Payment Reference", "Enter your MoMo reference.");
        return;
      }

      if (!bannerUri) {
        Alert.alert("Select Banner Image", "Please select an advertisement image.");
        return;
      }

      const numberOfDays = Number(days);

      if (!Number.isInteger(numberOfDays) || numberOfDays < 1) {
        Alert.alert("Invalid Duration", "Enter a valid number of days.");
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

      // Upload advertisement banner.
      const bannerUrl = await uploadFile(bannerUri);

      const total = numberOfDays * PRICE_PER_DAY;

      // Save advertisement request.
      const { data: adRequest, error: requestError } =
        await (supabase as any)
          .from("farm_ad_requests")
          .insert({
            farm_id: farmId,
            user_id: userId,
            title: title.trim(),
            phone: phone.trim(),
            days: numberOfDays,
            amount: total,
            momo_reference: reference.trim(),
            banner_url: bannerUrl,
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
              type: "farm_ad_request",
              ref_id: adRequest.id,
            }),
          }
        );

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          console.log("FARM AD NOTIFICATION ERROR:", result);
        } else {
          notificationSent = true;
        }
      } catch (notificationError) {
        console.log("FARM AD NOTIFICATION ERROR:", notificationError);
      }

      if (notificationSent) {
        Alert.alert(
          "Advertisement Submitted",
          "Your farm advertisement has been submitted. Nasara admins have been notified to verify your payment."
        );
      } else {
        Alert.alert(
          "Advertisement Saved",
          "Your advertisement request has been saved and is awaiting payment verification. However, the admin notification could not be sent."
        );
      }

      router.back();
    } catch (error: any) {
      console.log("FARM AD SUBMISSION ERROR:", error);

      Alert.alert(
        "Error",
        error.message || "Could not submit advertisement."
      );
    } finally {
      setLoading(false);
    }
  };

  const total = Number(days || 0) * PRICE_PER_DAY;

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
          backgroundColor: "#f3f4f6",
          padding: 15,
          borderRadius: 12,
          marginBottom: 20,
        }}
      >
        <Text>
          Price: GH₵30 per day
        </Text>

        <Text style={{ marginTop: 10 }}>
          MTN MoMo
        </Text>

        <Text style={{ fontWeight: "bold" }}>
          0539703374
        </Text>

        <Text>
          Nasara App
        </Text>
      </View>

      <TextInput
        placeholder="Advertisement Title"
        value={title}
        onChangeText={setTitle}
        editable={!loading}
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
        onChangeText={setPhone}
        keyboardType="phone-pad"
        editable={!loading}
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
        onChangeText={setDays}
        editable={!loading}
        style={{
          borderWidth: 1,
          borderRadius: 10,
          padding: 12,
          marginBottom: 15,
        }}
      />

      <Text
        style={{
          fontWeight: "bold",
          marginBottom: 15,
        }}
      >
        Total: GH₵ {total}
      </Text>

      <TextInput
        placeholder="MoMo Reference"
        value={reference}
        onChangeText={setReference}
        editable={!loading}
        style={{
          borderWidth: 1,
          borderRadius: 10,
          padding: 12,
          marginBottom: 15,
        }}
      />

      <TouchableOpacity
        onPress={pickBanner}
        disabled={loading}
        style={{
          backgroundColor: "#2563eb",
          padding: 14,
          borderRadius: 10,
        }}
      >
        <Text
          style={{
            color: "#fff",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          Select Banner
        </Text>
      </TouchableOpacity>

      {bannerUri && (
        <Image
          source={{ uri: bannerUri }}
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
          backgroundColor: loading ? "#9ca3af" : "#16a34a",
          padding: 16,
          borderRadius: 12,
          marginTop: 25,
          marginBottom: 40,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text
            style={{
              color: "#fff",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            I've Paid - Submit for Verification
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}