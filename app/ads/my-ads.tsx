import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function MyAds() {
  const router = useRouter();
  const [ads, setAds] = useState<any[]>([]);

  const loadAds = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("ads")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) Alert.alert("Error", error.message);
    else setAds(data ?? []);
  };

  useEffect(() => {
    loadAds();
  }, []);

  return (
    <ScrollView style={{ padding: 16 }}>
      {/* BACK TO HOME */}
      <TouchableOpacity
        onPress={() => router.push("/")}
        style={{
          backgroundColor: "#16a34a",
          padding: 10,
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        <Text style={{ color: "white", textAlign: "center" }}>
          ← Back to Home
        </Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 22, fontWeight: "bold" }}>📌 My Ads</Text>

      {ads.map((ad) => (
        <View
          key={ad.id}
          style={{
            marginTop: 16,
            borderWidth: 1,
            borderColor: "#ddd",
            padding: 14,
            borderRadius: 12,
            backgroundColor: "white",
          }}
        >
          {ad.image_url ? (
            <View
              style={{
                width: "100%",
                height: 180,
                borderRadius: 12,
                backgroundColor: "#f3f4f6",
                overflow: "hidden",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Image
                source={{ uri: ad.image_url }}
                style={{
                  width: "100%",
                  height: "100%",
                }}
                resizeMode="contain"
              />
            </View>
          ) : (
            <Text style={{ color: "red" }}>
              ⚠ Image not available
            </Text>
          )}

          <Text style={{ fontWeight: "bold", marginTop: 10 }}>
            {ad.title}
          </Text>

          <Text>Status: {ad.status}</Text>
          <Text>
            Amount Paid: GH₵ {ad.amount} ({ad.days} days)
          </Text>

          {ad.is_active && (
            <TouchableOpacity
              onPress={() => Linking.openURL(ad.link)}
              style={{
                backgroundColor: "#2563eb",
                padding: 12,
                borderRadius: 8,
                marginTop: 12,
              }}
            >
              <Text style={{ color: "white", textAlign: "center" }}>
                Visit Website
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </ScrollView>
  );
}