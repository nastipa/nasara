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
  audio_url?: string | null;
  file_url: string | null;
  file_name: string | null;
};

export default function ChatMediaScreen() {
  const { id } = useLocalSearchParams();
  const roomId = typeof id === "string" ? id : "";

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  /* ===== LOAD MEDIA ===== */
  const fetchMedia = async () => {
    const { data } = await supabase
      .from("messages")
      .select("id,image_url,audio_url,file_url,file_name")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false });

    if (!data) return;

    const filtered = data.filter(
      (m: any) =>
        m.image_url || m.audio_url || m.file_url
    );

    setMedia(filtered);
    setLoading(false);
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  /* ===== OPEN FILE ===== */
  const openFile = async (path: string) => {
    const { data } = await supabase.storage
      .from("chat-files")
      .createSignedUrl(path, 60);

    if (data?.signedUrl) {
      Linking.openURL(data.signedUrl);
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
        renderItem={({ item }) => (
          <View style={{ flex: 1, margin: 4 }}>
            
            {/* IMAGE */}
            {item.image_url && (
              <Image
                source={{ uri: item.image_url }}
                style={{ width: "100%", height: 120, borderRadius: 10 }}
              />
            )}

            {/* AUDIO */}
            {item.audio_url && (
              <Text style={{ color: "white" }}>🎤 Voice</Text>
            )}

            {/* FILE */}
            {item.file_url && (
              <TouchableOpacity
                onPress={() => openFile(item.file_url!)}
              >
                <Text style={{ color: "#60a5fa" }}>
                  📎 {item.file_name}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </>
  );
}