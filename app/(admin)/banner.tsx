import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function AdminBannerApproval() {
  const router = useRouter();
  const [banners, setBanners] = useState<any[]>([]);

  const loadBanners = async () => {
    const { data, error } = await supabase
      .from("banner")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    setBanners(data ?? []);
  };

  useEffect(() => {
    loadBanners();
  }, []);

  const approveBanner = async (banner: any) => {
    try {
      /* calculate expiration */
      const days = Number(banner.days) || 1;

      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + days);

      const expires_at = expireDate.toISOString();

      /* fix empty title */
      let title = banner.title;

      if (!title || title.trim() === "") {
        title = "Sponsored Banner";
      }

      const { error } = await (supabase as any)
        .from("banner")
        .update({
          status: "approved",
          is_active: true,
          title: title,
          expires_at: expires_at,
        })
        .eq("id", banner.id);

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      Alert.alert("Approved ✅", "Banner is now live on Browse.");

      loadBanners();
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Approval failed");
    }
  };

  return (
    <ScrollView style={{ padding: 16 }}>
      {/* BACK BUTTON */}
      <TouchableOpacity
        onPress={() => router.push("/(admin)")}
        style={{
          backgroundColor: "black",
          padding: 12,
          borderRadius: 10,
          marginBottom: 12,
        }}
      >
        <Text style={{ color: "white", textAlign: "center" }}>
          ← Back to Admin Dashboard
        </Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 22, fontWeight: "bold" }}>
        🎯 Banner Approvals
      </Text>

      {banners.length === 0 && (
        <Text style={{ marginTop: 20 }}>No pending banners</Text>
      )}

      {banners.map((b) => (
        <View
          key={b.id}
          style={{
            marginTop: 16,
            borderWidth: 1,
            padding: 14,
            borderRadius: 12,
            borderColor: "#ddd",
          }}
        >
          {b.image_url && (
            <Image
              source={{ uri: b.image_url }}
              style={{
                width: "100%",
                height: 200,
                borderRadius: 12,
                resizeMode: "contain",
                backgroundColor: "#f3f4f6",
              }}
            />
          )}

          <Text style={{ fontWeight: "bold", marginTop: 10 }}>
            {b.title || "Sponsored Banner"}
          </Text>

          <Text>Days: {b.days}</Text>
          <Text>Amount: GH₵ {b.amount}</Text>
          <Text>Link: {b.link}</Text>

          <TouchableOpacity
            onPress={() => approveBanner(b)}
            style={{
              backgroundColor: "green",
              padding: 14,
              borderRadius: 10,
              marginTop: 12,
            }}
          >
            <Text style={{ color: "white", textAlign: "center" }}>
              Approve Banner
            </Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}