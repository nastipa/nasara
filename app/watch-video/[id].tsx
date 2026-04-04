import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { supabase } from "../../lib/supabase";

export default function WatchVideoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [live, setLive] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [messages, setMessages] = useState<any[]>([]);
  const [chatText, setChatText] = useState("");
  const [lastSent, setLastSent] = useState(0); // ✅ Anti-spam

  const screenWidth = Dimensions.get("window").width;

  /* ================= LOAD LIVE ================= */
  const loadLive = async () => {
    if (!id) return;

    const { data } = await (supabase as any)
      .from("live_streams")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    setLive(data ?? null);

    if (data?.product_id) {
      loadProduct(data.product_id);
    }

    setLoading(false);
  };

  /* ================= LOAD PRODUCT ================= */
  const loadProduct = async (productId: number) => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .maybeSingle();

    setProduct(data ?? null);
  };

  /* ================= LOAD CHAT (PHASE 2) ================= */
  const loadMessages = async () => {
    if (!id) return;

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", id)
      .order("created_at", { ascending: false }) // newest first
      .limit(50); // ✅ only last 50

    setMessages(data ?? []);
  };

  /* ================= REALTIME ================= */
  useEffect(() => {
    if (!id) return;

    loadLive();
    loadMessages();

    const channel = (supabase as any)
      .channel("live-chat-" + id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${id}`,
        },
        (payload: any) => {
          setMessages((prev) => [payload.new, ...prev]); // newest on top
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  /* ================= SEND MESSAGE (PHASE 5) ================= */
  const sendMessage = async () => {
    const now = Date.now();

    if (now - lastSent < 1000) return; // 1 msg per second
    if (!chatText.trim() || !id) return;

    setLastSent(now);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const textValue = chatText.trim();

    // Optimistic update (instant UI)
    const tempMessage = {
      id: Date.now().toString(),
      text: textValue,
      room_id: id,
    };

    setMessages((prev) => [tempMessage, ...prev]);
    setChatText("");

    await (supabase as any).from("messages").insert({
      room_id: id,
      sender_id: user?.id,
      text: textValue,
    });
  };

  /* ================= YOUTUBE EMBED ================= */
  const getVideoId = (url: string) => {
    if (!url) return null;

    const regExp =
      /(?:youtube\.com\/(?:watch\?v=|live\/|shorts\/)|youtu\.be\/)([^&?/]+)/;

    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  const videoId = getVideoId(live?.youtube_url);

  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?playsinline=1&rel=0&modestbranding=1&autoplay=0&enablejsapi=1`
    : null;

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
        <Text>Loading Live Video...</Text>
      </View>
    );
  }

  if (!live) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>No Live Video Found ❌</Text>
      </View>
    );
  }

  /* ================= MAIN ================= */
  return (
    <View style={{ flex: 1, padding: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 6 }}>
        🔴 {live.title}
      </Text>

      {/* VIDEO PLAYER */}
      <View
        style={{
          height: screenWidth * 0.56,
          borderRadius: 12,
          overflow: "hidden",
          backgroundColor: "black",
        }}
      >
        {embedUrl ? (
          Platform.OS === "web" ? (
            <iframe
              width="100%"
              height="100%"
              src={embedUrl}
              title="Live Stream"
              frameBorder="0"
              allow="fullScreen"
              style={{ border: "none" }}
            />
          ) : (
            <WebView
              source={{ uri: embedUrl }}
              style={{ flex: 1 }}
              javaScriptEnabled
              domStorageEnabled
              allowsFullscreenVideo
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              originWhitelist={["*"]}
              setSupportMultipleWindows={false}
            />
          )
        ) : (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white" }}>Stream not available</Text>
          </View>
        )}

        {product && (
          <TouchableOpacity
            onPress={() => router.push(`/product/${product.id}`)}
            style={{
              position: "absolute",
              bottom: 10,
              right: 10,
              backgroundColor: "#16a34a",
              padding: 10,
              borderRadius: 20,
            }}
          >
            <Text style={{ color: "white", fontWeight: "bold" }}>
              BUY NOW
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* PRODUCT */}
      {product && (
        <View
          style={{
            flexDirection: "row",
            marginTop: 12,
            padding: 10,
            borderWidth: 1,
            borderColor: "#eee",
            borderRadius: 12,
          }}
        >
          <Image
            source={{ uri: product.image }}
            style={{ width: 70, height: 70, borderRadius: 10 }}
          />

          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={{ fontWeight: "bold" }}>{product.title}</Text>
            <Text style={{ color: "green", marginTop: 4 }}>
              GHS {product.price}
            </Text>

            <TouchableOpacity
              onPress={() => router.push(`/product/${product.id}`)}
              style={{
                marginTop: 6,
                backgroundColor: "#2563eb",
                padding: 8,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "white", textAlign: "center" }}>
                View Product
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* CHAT */}
      <Text style={{ marginTop: 14, fontWeight: "bold" }}>💬 Live Chat</Text>

      <FlatList
        data={messages}
        inverted
        keyExtractor={(item) => item.id.toString()}
        style={{ height: 160, marginTop: 6 }}
        renderItem={({ item }) => (
          <Text style={{ paddingVertical: 2 }}>{item.text}</Text>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 20, color: "gray" }}>
            No messages yet...
          </Text>
        }
      />

      <View style={{ flexDirection: "row", marginTop: 6 }}>
        <TextInput
          value={chatText}
          onChangeText={setChatText}
          placeholder="Type message..."
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 8,
            padding: 8,
          }}
        />

        <TouchableOpacity
          onPress={sendMessage}
          style={{
            backgroundColor: "#2563eb",
            paddingHorizontal: 14,
            marginLeft: 6,
            borderRadius: 8,
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "white" }}>Send</Text>
        </TouchableOpacity>
      </View>

      {live.youtube_url && (
        <TouchableOpacity
          onPress={() => Linking.openURL(live.youtube_url)}
          style={{
            marginTop: 10,
            padding: 10,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#ddd",
          }}
        >
          <Text style={{ textAlign: "center" }}>Open in YouTube</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={() => router.replace("/browse")}
        style={{
          marginTop: 20,
          padding: 12,
          backgroundColor: "#000",
          borderRadius: 10,
        }}
      >
        <Text style={{ color: "white", textAlign: "center" }}>
          Back to Home
        </Text>
      </TouchableOpacity>
    </View>
  );
}