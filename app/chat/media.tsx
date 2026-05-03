import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

/* ================= TYPES ================= */
type MediaItem = {
  id: number;
  image_url: string | null;
  audio_url: string | null;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
};

export default function ChatMediaScreen() {
  const { id } = useLocalSearchParams();
  const roomId = typeof id === "string" ? id : "";

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  /* ================= FETCH MEDIA ================= */
  const fetchMedia = async () => {
    if (!roomId) return;

    setLoading(true);

    const { data, error } = await (supabase as any)
      .from("messages")
      .select("id,image_url,audio_url,file_url,file_name,created_at")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false });

    if (error) {
      console.log("MEDIA ERROR:", error);
      setLoading(false);
      return;
    }

    const filtered =
      (data || []).filter(
        (m:any) => m.image_url || m.audio_url || m.file_url
      );

    setMedia(filtered);
    setLoading(false);
  };

  useEffect(() => {
    fetchMedia();
  }, [roomId]);

  /* ================= REALTIME ================= */
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel("media_" + roomId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const msg = payload.new as MediaItem;

          if (msg.image_url || msg.file_url || msg.audio_url) {
            setMedia((prev) => [msg, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);
  /* ================= OPEN FILE ================= */
  const openFile = async (path: string) => {
    try {
      // IMPORTANT: your upload server gives FULL URL OR PATH
      const url =
        path.startsWith("http")
          ? path
          : `https://nasara-upload-server.onrender.com/${path}`;

      Linking.openURL(url);
    } catch (err) {
      console.log("Open file error:", err);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Media" }} />

      <FlatList
        data={media}
        keyExtractor={(item) => item.id.toString()}
        numColumns={3}
        contentContainerStyle={{ padding: 6 }}
        renderItem={({ item }) => (
          <View style={{ flex: 1, margin: 4 }}>
            {/* IMAGE (FIXED: NO VANISHING) */}
            {item.image_url && (
              <Image
                source={{ uri: item.image_url }}
                style={{
                  width: "100%",
                  height: 120,
                  borderRadius: 10,
                  backgroundColor: "#111",
                }}
              />
            )}

            {/* AUDIO */}
            {item.audio_url && (
              <Text style={{ color: "white" }}>🎤 Voice message</Text>
            )}

            {/* FILE */}
            {item.file_url && (
              <TouchableOpacity
                onPress={() => openFile(item.file_url!)}
              >
                <Text style={{ color: "#60a5fa" }}>
                  📎 {item.file_name || "File"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </>
  );
}