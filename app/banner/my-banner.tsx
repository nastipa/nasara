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

export default function MyBanner() {
  const [banners, setBanners] = useState<any[]>([]);
 const router = useRouter();
  const loadBanners = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("banner")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) Alert.alert("Error", error.message);
    else setBanners(data ?? []);
  };

  useEffect(() => {
    loadBanners();
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
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>
        My Banners
      </Text>

      {banners.map((b) => (
        <View
          key={b.id}
          style={{
            marginTop: 16,
            borderWidth: 1,
            borderColor: "#ddd",
            padding: 14,
            borderRadius: 12,
          }}
        >
          {/* ✅ FIXED IMAGE STYLE */}
          {b.image_url && (
            <Image
              source={{ uri: b.image_url }}
              style={{
                width: "100%",
                height: 180,
                borderRadius: 12,
                resizeMode: "contain",
                backgroundColor: "#f3f4f6",
              }}
            />
          )}

          <Text style={{ fontWeight: "bold", marginTop: 10 }}>
            {b.title}
          </Text>

          <Text>Status: {b.status}</Text>
          <Text>Amount: GH₵ {b.amount}</Text>

          {/* Only clickable if approved */}
          {b.is_active && (
            <TouchableOpacity
              onPress={() => Linking.openURL(b.link)}
              style={{
                backgroundColor: "#2563eb",
                padding: 12,
                borderRadius: 10,
                marginTop: 10,
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