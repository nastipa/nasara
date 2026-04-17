import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
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

/* ===============================
   ✅ SAFE MEDIA COMPONENT (FIXES HOOK ERROR)
================================ */
function MediaView({ videoUrl, imageUrl }: any) {
  const hasVideo =
    videoUrl &&
    videoUrl.includes("http") &&
    !videoUrl.endsWith(".jpg") &&
    !videoUrl.endsWith(".png");

  const player = hasVideo
    ? useVideoPlayer(videoUrl, (p) => {
        p.loop = true;
        p.play();
      })
    : null;

  if (hasVideo && player) {
    return (
      <VideoView
        player={player}
        style={{
          width: "100%",
          height: 180,
          borderRadius: 10,
        }}
      />
    );
  }

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{
          width: "100%",
          height: 180,
          borderRadius: 10,
        }}
      />
    );
  }

  return <Text>No media available</Text>;
}

/* ===============================
   MAIN COMPONENT
================================ */
export default function AdminBoostApproval() {
  const [boosts, setBoosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  /* ===============================
     LOAD BOOSTS WITH JOIN ✅
  ================================ */
  const loadBoosts = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("boost")
        .select(`
          *,
          items_live (
            image_url,
            video_url
          )
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      setBoosts(data ?? []);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoosts();
  }, []);

  /* ===============================
     APPROVE BOOST
  ================================ */
  const approveBoost = async (boost: any) => {
    try {
      await (supabase as any)
        .from("boost")
        .update({ status: "approved" })
        .eq("id", boost.id);

      await (supabase as any)
        .from("items_live")
        .update({
          is_boosted: true,
          boosted_until: new Date(
            Date.now() + boost.days * 86400000
          ).toISOString(),
        })
        .eq("id", boost.live_item_id);

      Alert.alert("Approved ✅", "Boost activated successfully.");
      loadBoosts();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  return (
    <ScrollView style={{ padding: 16 }}>
      {/* BACK BUTTON */}
      <TouchableOpacity
        onPress={() => router.push("/(admin)")}
        style={{
          backgroundColor: "black",
          padding: 10,
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        <Text style={{ color: "white", textAlign: "center" }}>
          ← Back to Admin Dashboard
        </Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 22, fontWeight: "bold" }}>
        Boost Approvals
      </Text>

      {loading && <Text style={{ marginTop: 10 }}>Loading...</Text>}

      {!loading && boosts.length === 0 && (
        <Text style={{ marginTop: 20 }}>No pending boosts</Text>
      )}

      {boosts.map((b) => {
        const videoUrl = b.items_live?.video_url;
        const imageUrl = b.items_live?.image_url;

        return (
          <View
            key={b.id}
            style={{
              marginTop: 16,
              padding: 14,
              borderWidth: 1,
              borderRadius: 10,
              borderColor: "#ddd",
            }}
          >
            {/* ✅ MEDIA (FIXED) */}
            <MediaView videoUrl={videoUrl} imageUrl={imageUrl} />

            {/* INFO */}
            <Text style={{ fontWeight: "bold", marginTop: 10 }}>
              {b.item_title}
            </Text>

            <Text>Amount: {b.amount} GHS</Text>
            <Text>Network: {b.network}</Text>
            <Text>Payment Code: {b.payment_code}</Text>

            {/* APPROVE BUTTON */}
            <TouchableOpacity
              onPress={() => approveBoost(b)}
              style={{
                backgroundColor: "green",
                padding: 12,
                marginTop: 12,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "white", textAlign: "center" }}>
                Approve Boost
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
  );
}