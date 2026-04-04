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

export default function AdminAdsApproval() {
  const [ads, setAds] = useState<any[]>([]);
  const router = useRouter();

  const loadAds = async () => {
    const { data, error } = await supabase
      .from("ads")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    setAds(data ?? []);
  };

  useEffect(() => {
    loadAds();
  }, []);

  const approveAd = async (ad: any) => {
    try {
      const days = Number(ad.days) || 1;

      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + days);

      const expires_at = expireDate.toISOString();

      let title = ad.title;

      if (!title || title.trim() === "") {
        title = "Sponsored Ad";
      }

      const { error } = await (supabase as any)
        .from("ads")
        .update({
          status: "approved",
          is_active: true,
          title: title,
          expires_at: expires_at,
        })
        .eq("id", ad.id);

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      Alert.alert("Approved ✅", "Ad is now live on Browse.");

      loadAds();
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Approval failed");
    }
  };

  return (
    <ScrollView style={{ padding: 16 }}>
      <TouchableOpacity
        onPress={() => router.push("/(admin)")}
        style={{
          backgroundColor: "black",
          padding: 10,
          borderRadius: 8,
          marginBottom: 12,
        }}
      >
        <Text style={{ color: "white", textAlign: "center" }}>
          ← Back to Admin Dashboard
        </Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 22, fontWeight: "bold" }}>
        📢 Ads Approvals
      </Text>

      {ads.length === 0 && (
        <Text style={{ marginTop: 20 }}>No pending ads</Text>
      )}

      {ads.map((ad) => (
        <View
          key={ad.id}
          style={{
            marginTop: 16,
            borderWidth: 1,
            padding: 14,
            borderRadius: 12,
            borderColor: "#ddd",
          }}
        >
          {ad.image_url && (
            <Image
              source={{ uri: ad.image_url }}
              style={{
                width: "100%",
                height: 180,
                borderRadius: 10,
              }}
              resizeMode="contain"
            />
          )}

          <Text style={{ fontWeight: "bold", marginTop: 10 }}>
            {ad.title || "Sponsored Ad"}
          </Text>

          <Text>Days: {ad.days}</Text>
          <Text>Amount: GH₵ {ad.amount}</Text>

          <TouchableOpacity
            onPress={() => approveAd(ad)}
            style={{
              backgroundColor: "green",
              padding: 12,
              marginTop: 12,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "white", textAlign: "center" }}>
              Approve Ad
            </Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}