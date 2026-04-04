import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { supabase } from "../lib/supabase";

export default function GoLiveScreen() {
  const router = useRouter();
  const screenWidth = Dimensions.get("window").width;

  const videoRef = useRef<any>(null);

  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const [activeLiveId, setActiveLiveId] = useState<string | null>(null);
  const [activeYoutubeUrl, setActiveYoutubeUrl] = useState<string | null>(null);

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState(0); // ✅ Phase 5 Anti-spam

  /* ================= EXTRACT VIDEO ID ================= */
  const getVideoId = (url: string) => {
    if (!url) return null;
    const match = url.match(/(?:watch\?v=|live\/|youtu\.be\/)([^&?/]+)/);
    return match ? match[1] : null;
  };

  const videoId = activeYoutubeUrl ? getVideoId(activeYoutubeUrl) : null;

  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?playsinline=1&rel=0&modestbranding=1`
    : null;

  /* ================= LOAD ACTIVE LIVE ================= */
  const findActiveLive = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await (supabase as any)
      .from("live_streams")
      .select("id, youtube_url")
      .eq("user_id", user.id)
      .eq("status", "live")
      .maybeSingle();

    if (data) {
      setActiveLiveId(data.id);
      setActiveYoutubeUrl(data.youtube_url);
      loadMessages(data.id);
    }
  };

  /* ================= LOAD OLD MESSAGES (PHASE 2) ================= */
  const loadMessages = async (liveId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", liveId)
      .order("created_at", { ascending: false }) // newest first
      .limit(50); // ✅ only load last 50 messages

    setMessages(data ?? []);
  };

  /* ================= REALTIME ================= */
  useEffect(() => {
    if (!activeLiveId) return;

    const channel = supabase
      .channel("seller-live-" + activeLiveId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${activeLiveId}`,
        },
        (payload: any) => {
          setMessages((prev) => [payload.new, ...prev]); // newest on top
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeLiveId]);

  useEffect(() => {
    findActiveLive();
  }, []);

  /* ================= SEND MESSAGE (PHASE 5 Anti-Spam) ================= */
  const sendMessage = async () => {
    const now = Date.now();

    if (now - lastSent < 1000) return; // 1 message per second
    if (!newMessage.trim() || !activeLiveId || sending) return;

    setLastSent(now);
    setSending(true);

    const textValue = newMessage.trim();

    // Optimistic update (newest on top)
    const tempMessage = {
      id: Date.now().toString(),
      text: textValue,
      room_id: activeLiveId,
    };

    setMessages((prev) => [tempMessage, ...prev]);
    setNewMessage("");

    const { error } = await (supabase as any).from("messages").insert({
      room_id: activeLiveId,
      text: textValue,
    });

    if (error) {
      Alert.alert("Send failed", error.message);
    }

    setSending(false);
  };

  /* ================= START LIVE ================= */
  const startLive = async () => {
    if (!title.trim() || !youtubeUrl.trim()) {
      Alert.alert("Missing fields");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert("Login required");
      setLoading(false);
      return;
    }

    await (supabase as any)
      .from("live_streams")
      .update({ status: "ended" })
      .eq("user_id", user.id)
      .eq("status", "live");

    const { data, error } = await (supabase as any)
      .from("live_streams")
      .insert({
        user_id: user.id,
        title: title.trim(),
        status: "live",
        youtube_url: youtubeUrl.trim(),
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    setActiveLiveId(data.id);
    setActiveYoutubeUrl(data.youtube_url);
    setMessages([]);
  };

  /* ================= END LIVE ================= */
  const endLive = async () => {
    if (!activeLiveId) return;

    await (supabase as any)
      .from("live_streams")
      .update({ status: "ended" })
      .eq("id", activeLiveId);

    setActiveLiveId(null);
    setActiveYoutubeUrl(null);
    setMessages([]);

    router.replace("/browse");
  };

  /* ================= UI ================= */
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: "white", padding: 20 }}
    >
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>
        🔴 Seller Live Dashboard
      </Text>

      {!activeLiveId && (
        <>
          <Text style={{ marginTop: 12 }}>Enter Live Title:</Text>

          <TextInput
            value={title}
            onChangeText={setTitle}
            style={{ borderWidth: 1, padding: 12, borderRadius: 10, marginTop: 8 }}
          />

          <Text style={{ marginTop: 15 }}>Paste YouTube Live Link:</Text>

          <TextInput
            value={youtubeUrl}
            onChangeText={setYoutubeUrl}
            style={{ borderWidth: 1, padding: 12, borderRadius: 10, marginTop: 8 }}
          />

          <TouchableOpacity
            onPress={startLive}
            disabled={loading}
            style={{ backgroundColor: "red", padding: 14, borderRadius: 12, marginTop: 20 }}
          >
            <Text style={{ color: "white", textAlign: "center" }}>
              {loading ? "Starting..." : "Go Live 🔴"}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {activeLiveId && (
        <>
          {/* VIDEO */}
          {embedUrl && (
            <View
              style={{
                height: 200,
                marginTop: 15,
                backgroundColor: "black",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              {Platform.OS === "web" ? (
                <iframe src={embedUrl} width="100%" height="100%" />
              ) : (
                <WebView
                  ref={videoRef}
                  source={{ uri: embedUrl }}
                  style={{ flex: 1 }}
                  javaScriptEnabled
                  domStorageEnabled
                   fullscreenOptions={{ allowsFullscreen: false }}
                />
              )}
            </View>
          )}

          {/* CHAT (PHASE 3 Inverted) */}
          <FlatList
            data={messages}
            inverted
            keyExtractor={(item) => item.id.toString()}
            style={{ marginTop: 10, height: 220 }}
            renderItem={({ item }) => (
              <Text style={{ paddingVertical: 4 }}>{item.text}</Text>
            )}
            ListEmptyComponent={
              <Text style={{ textAlign: "center", marginTop: 20, color: "gray" }}>
                No messages yet...
              </Text>
            }
          />

          {/* INPUT */}
          <View style={{ flexDirection: "row", marginTop: 10 }}>
            <TextInput
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Reply to buyer..."
              style={{
                flex: 1,
                borderWidth: 1,
                borderRadius: 10,
                padding: 10,
              }}
            />

            <TouchableOpacity
              onPress={sendMessage}
              disabled={sending}
              style={{
                backgroundColor: sending ? "gray" : "blue",
                padding: 12,
                borderRadius: 10,
                marginLeft: 8,
              }}
            >
              <Text style={{ color: "white" }}>
                {sending ? "..." : "Send"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={endLive}
            style={{
              backgroundColor: "black",
              padding: 14,
              borderRadius: 12,
              marginTop: 15,
            }}
          >
            <Text style={{ color: "white", textAlign: "center" }}>
              ⛔ End Live
            </Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        onPress={() => router.replace("/browse")}
        style={{
          marginTop: 15,
          padding: 12,
          borderRadius: 10,
          borderWidth: 1,
        }}
      >
        <Text style={{ textAlign: "center" }}>⬅ Back to Home</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}