import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

type ChatRoom = {
  id: string;
  item_id: number;
  seller_id: string;
  buyer_id: string;
  created_at: string;

  other_user_id: string;
  other_user?: {
    id: string;
    username: string;
    avatar_url?: string | null;
    is_online?: boolean;
  };

  last_message: string | null;
  last_time: string | null;
  unread_count: number;
};

export default function ChatListScreen() {
  const router = useRouter();

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  

  /* ================= LOAD USER ================= */
  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    };
    loadUser();
  }, []);

  /* ================= FETCH CHAT ROOMS ================= */
  const fetchRooms = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("chat_rooms")
      .select("*")
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.log("Room error:", error.message);
      setLoading(false);
      return;
    }

    if (!data) return;

    const formatted = await Promise.all(
      data.map(async (room: any) => {
        const otherId =
          room.seller_id === userId
            ? room.buyer_id
            : room.seller_id;

        // 👤 get other user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, is_online")
          .eq("id", otherId)
          .single();

        // 💬 get last message
        const { data: lastMsg } = await (supabase as any)
          .from("messages")
          .select("text, created_at")
          .eq("room_id", room.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // 🔔 unread count
        const { count } = await (supabase as any)
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("room_id", room.id)
          .eq("seen", false)
          .neq("sender_id", userId);

        return {
          ...room,
          other_user_id: otherId,
          other_user: profile || null,
          last_message: lastMsg?.text || null,
          last_time: lastMsg?.created_at || null,
          unread_count: count || 0,
        };
      })
    );

    setRooms(formatted);
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();
  }, [userId]);
  

  /* ================= REALTIME ================= */
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("chat-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          fetchRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      data={rooms}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{
        padding: 12,
        backgroundColor: "#0f172a",
      }}
      renderItem={({ item }) => {
        return (
          <TouchableOpacity
            onPress={() => router.push("/chat/" + item.id)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 14,
              borderRadius: 14,
              marginBottom: 10,
              backgroundColor: "#1f2937",
            }}
          >
            {/* AVATAR */}
            <View
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: "#374151",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "bold" }}>
                {item.other_user?.username?.[0] || "U"}
              </Text>

              {item.other_user?.is_online && (
                <View
                  style={{
                    position: "absolute",
                    bottom: 2,
                    right: 2,
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: "#22c55e",
                  }}
                />
              )}
            </View>

            {/* INFO */}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ color: "white", fontWeight: "bold" }}>
                {item.other_user?.username || "User"}
              </Text>

              <Text
                numberOfLines={1}
                style={{ color: "#9ca3af", marginTop: 2 }}
              >
                {item.last_message || "No messages yet"}
              </Text>
            </View>

            {/* RIGHT SIDE */}
            <View style={{ alignItems: "flex-end" }}>
              {item.last_time && (
                <Text style={{ color: "#9ca3af", fontSize: 12 }}>
                  {new Date(item.last_time).toLocaleTimeString()}
                </Text>
              )}

              {item.unread_count > 0 && (
                <View
                  style={{
                    marginTop: 6,
                    backgroundColor: "#22c55e",
                    borderRadius: 12,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ color: "black", fontSize: 12 }}>
                    {item.unread_count}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}