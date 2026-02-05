import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [item, setItem] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOffer, setShowOffer] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");

  /* ===== LOAD USER ===== */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user ? data.user.id : null);
    });
  }, []);

  /* ===== LOAD ITEM ===== */
  useEffect(() => {
    if (!id) return;

    supabase
      .from("items_live")
      .select("*")
      .eq("id", Number(id))
      .single()
      .then(({ data }) => {
        setItem(data);
        setLoading(false);
      });
  }, [id]);

  /* ===== VIDEO PLAYER (REPLACES expo-av) ===== */
  const player = item?.video_url
    ? useVideoPlayer(item.video_url, (p) => {
        p.loop = true;
        p.play();
      })
    : null;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!item) {
    return (
      <Text style={{ marginTop: 50, textAlign: "center" }}>
        Item not found
      </Text>
    );
  }

  const isSeller = userId === item.user_id;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      {/* BACK */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          position: "absolute",
          top: 45,
          left: 15,
          zIndex: 100,
          backgroundColor: "rgba(0,0,0,0.6)",
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 20,
        }}
      >
        <Text style={{ color: "white" }}>Back</Text>
      </TouchableOpacity>

      <ScrollView>
        {/* MEDIA */}
        {item.video_url && player ? (
          <VideoView
            player={player}
            style={{ width: "100%", height: 280 }}
          />
        ) : item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={{ width: "100%", height: 280 }}
          />
        ) : (
          <View style={{ height: 280, justifyContent: "center", alignItems: "center" }}>
            <Text>No media</Text>
          </View>
        )}

        {/* INFO */}
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: "bold" }}>{item.title}</Text>
          <Text style={{ fontSize: 18, color: "green" }}>
            GHS {item.price}
          </Text>
          {item.description && (
            <Text style={{ marginTop: 12 }}>{item.description}</Text>
          )}
        </View>

        {/* ACTIONS */}
        <View style={{ padding: 16 }}>
          {!isSeller && userId && (
            <>
              <TouchableOpacity
                onPress={() => router.push(`/chat/${item.id}`)}
                style={{ backgroundColor: "#2563eb", padding: 12, borderRadius: 6 }}
              >
                <Text style={{ color: "white", textAlign: "center" }}>
                  Chat Seller
                </Text>
              </TouchableOpacity>
            </>
          )}

          {isSeller && (
            <>
              <TouchableOpacity
                onPress={() => router.push(`/itemdetail/${item.id}`)}
                style={{ backgroundColor: "#2563eb", padding: 12, borderRadius: 6 }}
              >
                <Text style={{ color: "white", textAlign: "center" }}>
                  Edit Item
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push(`/boost/${item.id}`)}
                style={{
                  backgroundColor: "#f59e0b",
                  padding: 12,
                  borderRadius: 6,
                  marginTop: 10,
                }}
              >
                <Text style={{ color: "white", textAlign: "center" }}>
                  Boost Item
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </>
  );
}