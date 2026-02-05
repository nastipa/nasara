import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { supabase } from "../lib/supabase";

/* ===== TYPES ===== */
type LiveSession = {
  id: number;
};

type LiveItem = {
  id: number;
  title: string;
  price: number;
  image_url: string | null;
  video_url: string | null;
  is_boosted?: boolean;
};

/* ===== SAFE ALERT (APP + WEB) ===== */
const showAlert = (title: string, message: string) => {
  if (typeof window !== "undefined") {
    window.alert(title + "\n\n" + message);
  } else {
    Alert.alert(title, message);
  }
};

/* ===== ITEM CARD (HOOKS ALLOWED HERE) ===== */
function LiveItemCard({
  item,
  onBuy,
}: {
  item: LiveItem;
  onBuy: (item: LiveItem) => void;
}) {
  const player = item.video_url
    ? useVideoPlayer(item.video_url, (p) => {
        p.loop = true;
        p.play();
      })
    : null;

  return (
    <View
      style={{
        borderWidth: 1,
        padding: 12,
        marginVertical: 8,
        borderRadius: 8,
      }}
    >
      <Text style={{ fontWeight: "600" }}>{item.title}</Text>

      {item.is_boosted && (
        <Text style={{ color: "green", fontWeight: "bold" }}>
          BOOSTED
        </Text>
      )}

      <Text>GH₵ {item.price}</Text>

      {item.image_url && (
        <Image
          source={{ uri: item.image_url }}
          style={{ height: 150, marginTop: 8 }}
        />
      )}

      {player && (
        <VideoView
          style={{ height: 200, marginTop: 8 }}
          player={player}
        />
      )}

      <TouchableOpacity
        onPress={() => onBuy(item)}
        style={{
          backgroundColor: "#111827",
          padding: 10,
          marginTop: 10,
        }}
      >
        <Text style={{ color: "#fff", textAlign: "center" }}>
          Buy
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* ===== MAIN SCREEN ===== */
export default function LiveScreen() {
  const router = useRouter();
  const [live, setLive] = useState<LiveSession | null>(null);
  const [items, setItems] = useState<LiveItem[]>([]);

  /* ===== BUY ITEM ===== */
  const buyItem = async (item: LiveItem) => {
    const auth = await supabase.auth.getUser();
    const user = auth.data.user;

    if (!user) {
      Alert.alert("Login required");
      return;
    }

    await (supabase as any).from("item_interest").insert({
      live_item_id: item.id,
      buyer_id: user.id,
    });

    const { data, error } = await (supabase as any)
      .from("live_items")
      .select(
        `
        id,
        live_sessions (
          seller_id,
          momo_name,
          momo_number
        )
      `
      )
      .eq("id", item.id)
      .single();

    if (error || !data?.live_sessions) {
      Alert.alert("Error", "Seller not found");
      return;
    }

    const seller = data.live_sessions;

    if (!seller.momo_name || !seller.momo_number) {
      Alert.alert("Seller Notified", "Seller has no MoMo account");
      return;
    }

    showAlert(
      "Pay via MoMo",
      "Name: " +
        seller.momo_name +
        "\nNumber: " +
        seller.momo_number +
        "\nAmount: GH₵ " +
        item.price
    );

    Clipboard.setStringAsync(seller.momo_number);
  };

  /* ===== LOAD LIVE SESSION ===== */
  const loadLive = async () => {
    const res = await (supabase as any)
      .from("live_sessions")
      .select("id")
      .eq("is_live", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setLive(res.data ? { id: res.data.id } : null);
  };

  /* ===== LOAD LIVE ITEMS ===== */
  const loadItems = async (id: number) => {
    const res = await supabase
      .from("live_items")
      .select("id,title,price,image_url,video_url,is_boosted")
      .eq("live_session_id", id)
      .order("is_boosted", { ascending: false });

    setItems(res.data ?? []);
  };

  useEffect(() => {
    loadLive();
    const t = setInterval(loadLive, 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (live) loadItems(live.id);
  }, [live]);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "600" }}>
        🔴 Live Items
      </Text>

      {!live ? (
        <Text>No seller live</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id.toString()}
          renderItem={({ item }) => (
            <LiveItemCard item={item} onBuy={buyItem} />
          )}
        />
      )}

      <TouchableOpacity
        onPress={() => router.replace("/(tabs)/browse")}
        style={{
          padding: 14,
          backgroundColor: "#e5e7eb",
          marginTop: 10,
          borderRadius: 8,
        }}
      >
        <Text style={{ textAlign: "center", fontWeight: "600" }}>
          Back to Home
        </Text>
      </TouchableOpacity>
    </View>
  );
}
