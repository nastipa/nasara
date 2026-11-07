// ==================================================
 // 📦 IMPORTS
 // ==================================================

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

import LiveKitViewer from "../../components/LiveKitViewer";
import { fetchLiveKitToken } from "../../lib/livekit";
import { supabase } from "../../lib/supabase";

// ==================================================
// 🎥 WATCH VIDEO SCREEN
// ==================================================

export default function WatchVideoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [live, setLive] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [viewer, setViewer] = useState<any>(null);
  const [viewerError, setViewerError] = useState("");

  const [messages, setMessages] = useState<any[]>([]);
  const [chatText, setChatText] = useState("");
  const [lastSent, setLastSent] = useState(0);

  const screenWidth = Dimensions.get("window").width;

  // ==================================================
  // 🟡 LOAD LIVE STREAM
  // ==================================================

  const loadLive = async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await (supabase as any)
        .from("live_streams")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setLive(null);
        return;
      }

      setLive(data);

      if (data.product_id) {
        loadProduct(data.product_id);
      }

      // ==================================================
      // 🎥 CONNECT TO LIVEKIT
      // ==================================================

      if (
        data.status === "live" &&
        data.is_active === true
      ) {
        try {
          setViewerError("");

          const tokenData = await fetchLiveKitToken(
            String(data.id)
          );

          setViewer(tokenData);
        } catch (error: any) {
          console.log("LiveKit viewer error:", error);

          setViewerError(
            error?.message ||
              "Unable to connect to this live stream."
          );
        }
      } else {
        setViewerError("This live stream has ended.");
      }
    } catch (error: any) {
      console.log("Load live error:", error);

      setViewerError(
        error?.message || "Unable to load live stream."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==================================================
  // 🛍️ LOAD PRODUCT
  // ==================================================

  const loadProduct = async (productId: number) => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .maybeSingle();

    if (error) {
      console.log("Product load error:", error.message);
      return;
    }

    setProduct(data ?? null);
  };

  // ==================================================
  // 💬 LOAD CHAT
  // ==================================================

  const loadMessages = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.log("Chat load error:", error.message);
      return;
    }

    setMessages(data ?? []);
  };

  // ==================================================
  // 🔄 REALTIME + INITIAL LOAD
  // ==================================================

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
          setMessages((previous) => [
            payload.new,
            ...previous,
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // ==================================================
  // ✉️ SEND CHAT MESSAGE
  // ==================================================

  const sendMessage = async () => {
    const now = Date.now();

    if (now - lastSent < 1000) return;
    if (!chatText.trim() || !id) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setViewerError("Please log in to send a message.");
      return;
    }

    setLastSent(now);

    const textValue = chatText.trim();

    const tempMessage = {
      id: Date.now().toString(),
      text: textValue,
      room_id: id,
      sender_id: user.id,
    };

    setMessages((previous) => [
      tempMessage,
      ...previous,
    ]);

    setChatText("");

    const { error } = await (supabase as any)
      .from("messages")
      .insert({
        room_id: id,
        sender_id: user.id,
        text: textValue,
      });

    if (error) {
      console.log("Send message error:", error.message);

      setMessages((previous) =>
        previous.filter(
          (item) => item.id !== tempMessage.id
        )
      );
    }
  };

  // ==================================================
  // 📺 YOUTUBE FALLBACK
  // ==================================================

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

  // ==================================================
  // ⏳ LOADING SCREEN
  // ==================================================

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" />
        <Text>Connecting to Live Stream...</Text>
      </View>
    );
  }

  // ==================================================
  // ❌ STREAM NOT FOUND
  // ==================================================

  if (!live) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text>No Live Video Found ❌</Text>

        <TouchableOpacity
          onPress={() => router.replace("/browse")}
          style={{
            marginTop: 20,
            padding: 12,
            backgroundColor: "#000",
            borderRadius: 10,
          }}
        >
          <Text style={{ color: "white" }}>
            Back to Home
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ==================================================
  // 🎥 MAIN WATCH SCREEN
  // ==================================================

  return (
    <View
      style={{
        flex: 1,
        padding: 12,
        backgroundColor: "white",
      }}
    >
      {/* 🔴 STREAM TITLE */}

      <Text
        style={{
          fontSize: 20,
          fontWeight: "bold",
          marginBottom: 6,
        }}
      >
        🔴 {live.title}
      </Text>

      {/* ==================================================
          🎥 VIDEO PLAYER
      ================================================== */}

      <View
        style={{
          height: screenWidth * 0.56,
          borderRadius: 12,
          overflow: "hidden",
          backgroundColor: "black",
        }}
      >
        {viewer ? (
          <LiveKitViewer
            serverUrl={viewer.url}
            token={viewer.token}
          />
        ) : embedUrl ? (
          Platform.OS === "web" ? (
            <iframe
              width="100%"
              height="100%"
              src={embedUrl}
              title="Live Stream"
              frameBorder="0"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
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
              padding: 15,
            }}
          >
            <Text
              style={{
                color: "white",
                textAlign: "center",
                fontSize: 15,
              }}
            >
              {viewerError || "Stream not available"}
            </Text>
          </View>
        )}

        {/* 🛍️ BUY NOW */}

        {product && (
          <TouchableOpacity
            onPress={() =>
              router.push(`/product/${product.id}`)
            }
            style={{
              position: "absolute",
              bottom: 10,
              right: 10,
              backgroundColor: "#16a34a",
              padding: 10,
              borderRadius: 20,
            }}
          >
            <Text
              style={{
                color: "white",
                fontWeight: "bold",
              }}
            >
              BUY NOW
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ==================================================
          🛍️ PRODUCT DETAILS
      ================================================== */}

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
            style={{
              width: 70,
              height: 70,
              borderRadius: 10,
            }}
          />

          <View
            style={{
              marginLeft: 10,
              flex: 1,
            }}
          >
            <Text style={{ fontWeight: "bold" }}>
              {product.title}
            </Text>

            <Text
              style={{
                color: "green",
                marginTop: 4,
              }}
            >
              GHS {product.price}
            </Text>

            <TouchableOpacity
              onPress={() =>
                router.push(`/product/${product.id}`)
              }
              style={{
                marginTop: 6,
                backgroundColor: "#2563eb",
                padding: 8,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  color: "white",
                  textAlign: "center",
                }}
              >
                View Product
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ==================================================
          💬 LIVE CHAT
      ================================================== */}

      <Text
        style={{
          marginTop: 14,
          fontWeight: "bold",
        }}
      >
        💬 Live Chat
      </Text>

      <FlatList
        data={messages}
        inverted
        keyExtractor={(item) => item.id.toString()}
        style={{
          height: 160,
          marginTop: 6,
        }}
        renderItem={({ item }) => (
          <Text style={{ paddingVertical: 2 }}>
            {item.text}
          </Text>
        )}
        ListEmptyComponent={
          <Text
            style={{
              textAlign: "center",
              marginTop: 20,
              color: "gray",
            }}
          >
            No messages yet...
          </Text>
        }
      />

      {/* ✉️ CHAT INPUT */}

      <View
        style={{
          flexDirection: "row",
          marginTop: 6,
        }}
      >
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

      {/* ▶️ OPEN OLD YOUTUBE STREAM */}

      {live.youtube_url && (
        <TouchableOpacity
          onPress={() =>
            Linking.openURL(live.youtube_url)
          }
          style={{
            marginTop: 10,
            padding: 10,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#ddd",
          }}
        >
          <Text style={{ textAlign: "center" }}>
            Open in YouTube
          </Text>
        </TouchableOpacity>
      )}

      {/* 🏠 BACK TO HOME */}

      <TouchableOpacity
        onPress={() => router.replace("/browse")}
        style={{
          marginTop: 20,
          padding: 12,
          backgroundColor: "#000",
          borderRadius: 10,
        }}
      >
        <Text
          style={{
            color: "white",
            textAlign: "center",
          }}
        >
          Back to Home
        </Text>
      </TouchableOpacity>
    </View>
  );
}