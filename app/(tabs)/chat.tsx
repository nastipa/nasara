import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

type Conversation = {
  room_id: string;
  last_message: string;
  unread_count: number;
};

export default function ChatTab() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  /* 🔥 LOAD USER SESSION (FIXES MOBILE BUG) */
  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id ?? null;
      setUserId(uid);

      if (uid) {
        loadChats(uid);
      }
    };

    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const uid = session?.user.id ?? null;
        setUserId(uid);

        if (uid) {
          loadChats(uid);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  /* ===== LOAD CONVERSATIONS ===== */
  const loadChats = async (uid?: string) => {
  const currentUserId = uid || userId;
  if (!currentUserId) return;

  setLoading(true);

  // 1. GET ROOMS FIRST (correct source of truth)
  const { data: rooms, error } = await supabase
    .from("chat_rooms")
    .select("*")
    .or(`buyer_id.eq.${currentUserId},seller_id.eq.${currentUserId}`)
    .order("created_at", { ascending: false });

  if (error || !rooms) {
    setLoading(false);
    return;
  }

  // 2. ENRICH EACH ROOM
  const formatted = await Promise.all(
    rooms.map(async (room: any) => {
      const otherId =
        room.buyer_id === currentUserId
          ? room.seller_id
          : room.buyer_id;

      // last message
      const { data: lastMsg } = await (supabase as any)
        .from("messages")
        .select("text, created_at")
        .eq("room_id", room.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // unread count
      const { count } = await (supabase as any)
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("room_id", room.id)
        .eq("seen", false)
        .neq("sender_id", currentUserId);

      return {
        room_id: room.id,
        last_message: lastMsg?.text || "",
        last_time: lastMsg?.created_at || "",
        unread_count: count || 0,
      };
    })
  );

  setConversations(formatted);
  setLoading(false);
};
  /* 🔁 AUTO REFRESH WHEN SCREEN IS OPENED */
  useFocusEffect(
    useCallback(() => {
      if (userId) loadChats(userId);
    }, [userId])
  );

  /* 🔥 REALTIME LISTENER – FIXES NO REFRESH ON APP */
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("chat-realtime-list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMsg = payload.new as any;

          // Only refresh if this message belongs to this user
          if (newMsg.room_id && newMsg.room_id.indexOf(userId) !== -1) {
            loadChats(userId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  /* 🔁 BACKUP AUTO REFRESH EVERY 10 SECONDS (VERY IMPORTANT FOR MOBILE) */
  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(() => {
      loadChats(userId);
    }, 10000); // every 10 seconds

    return () => clearInterval(interval);
  }, [userId]);

  /* ===== UI ===== */

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={conversations}
      keyExtractor={(item) => item.room_id}
      ListEmptyComponent={
        <Text style={{ textAlign: "center", marginTop: 40 }}>
          No conversations yet
        </Text>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/chat/[id]",
              params: { id: item.room_id },
            })
          }
          style={{
            padding: 14,
            borderBottomWidth: 1,
            borderColor: "#eee",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "bold" }}>Chat</Text>

            <Text numberOfLines={1} style={{ color: "#555", marginTop: 4 }}>
              {item.last_message}
            </Text>
          </View>

          {/* 🔴 UNREAD BADGE */}
          {item.unread_count > 0 && (
            <View
              style={{
                backgroundColor: "red",
                minWidth: 24,
                height: 24,
                borderRadius: 12,
                justifyContent: "center",
                alignItems: "center",
                paddingHorizontal: 6,
              }}
            >
              <Text style={{ color: "white", fontWeight: "bold" }}>
                {item.unread_count}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    />
  );
}