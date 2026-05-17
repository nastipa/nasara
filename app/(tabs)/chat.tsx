import { useRouter } from "expo-router";

import {
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

type Conversation = {
  room_id: string;
  last_message: string;
  unread_count: number;
  last_time: string;
  full_name: string;
  avatar_url: string;
  verified: boolean;
};

export default function ChatTab() {
  const router = useRouter();

  const [userId, setUserId] =
    useState<string | null>(null);

  const [
    conversations,
    setConversations,
  ] = useState<Conversation[]>(
    []
  );

  const [loading, setLoading] =
    useState(true);

  /* ================= USER SESSION ================= */

  useEffect(() => {
    const getSession =
      async () => {
        const { data } =
          await supabase.auth.getSession();

        const uid =
          data.session?.user.id ??
          null;

        setUserId(uid);

        if (uid) {
          loadChats(uid);
        }
      };

    getSession();

    const { data: listener } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          const uid =
            session?.user.id ??
            null;

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

  /* ================= LOAD CHATS ================= */

  const loadChats = async (
    uid?: string
  ) => {
    const currentUserId =
      uid || userId;

    if (!currentUserId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      /* ================= GET ROOMS ================= */

      const {
        data: rooms,
        error,
      } = await (supabase as any)
        .from("chat_rooms")
        .select("*")
        .or(
          `buyer_id.eq.${currentUserId},seller_id.eq.${currentUserId}`
        )

        /* ✅ SAFE ORDER */
        .order("id", {
          ascending: false,
        });

      if (error) {
        console.log(
          "rooms error",
          error
        );

        setLoading(false);
        return;
      }

      if (!rooms || rooms.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      /* ================= ENRICH ================= */

      const formatted =
        await Promise.all(
          rooms.map(
            async (
              room: any
            ) => {
              try {
                const otherId =
                  room.buyer_id ===
                  currentUserId
                    ? room.seller_id
                    : room.buyer_id;

                if (!otherId)
                  return null;

                /* PROFILE */

                const {
                  data: profile,
                } =
                  await (
                    supabase as any
                  )
                    .from(
                      "profiles"
                    )
                    .select(
                      `
                      full_name,
                      avatar_url,
                      verified
                    `
                    )
                    .eq(
                      "id",
                      otherId
                    )
                    .maybeSingle();

                /* LAST MESSAGE */

                const {
                  data: messages,
                } =
                  await (
                    supabase as any
                  )
                    .from(
                      "messages"
                    )
                    .select(
                      `
                      text,
                      image_url,
                      file_url,
                      created_at
                    `
                    )
                    .eq(
                      "room_id",
                      room.id
                    )
                    .order(
                      "created_at",
                      {
                        ascending:
                          false,
                      }
                    )
                    .limit(1);

                const lastMsg =
                  messages?.[0];

                /* UNREAD COUNT */

                const { count } =
                  await (
                    supabase as any
                  )
                    .from(
                      "messages"
                    )
                    .select(
                      "*",
                      {
                        count:
                          "exact",
                        head: true,
                      }
                    )
                    .eq(
                      "room_id",
                      room.id
                    )
                    .eq(
                      "seen",
                      false
                    )
                    .neq(
                      "sender_id",
                      currentUserId
                    );

                return {
                  room_id:
                    String(
                      room.id
                    ),

                  last_message:
                    lastMsg?.text ||
                    (lastMsg?.image_url
                      ? "📷 Image"
                      : lastMsg?.file_url
                      ? "📎 File"
                      : "Start chatting"),

                  last_time:
                    lastMsg?.created_at ||
                    "",

                  unread_count:
                    count || 0,

                  full_name:
                    profile?.full_name ||
                    "User",

                  avatar_url:
                    profile?.avatar_url ||
                    "",

                  verified:
                    profile?.verified ||
                    false,
                };
              } catch (e) {
                console.log(
                  "map error",
                  e
                );

                return null;
              }
            }
          )
        );

      /* ✅ FILTER */

      const clean =
        formatted
          .filter(
            (
              item
            ): item is Conversation =>
              item !== null
          )

          /* ✅ WHATSAPP STYLE */
          .sort((a, b) => {
            const aTime =
              new Date(
                a.last_time ||
                  0
              ).getTime();

            const bTime =
              new Date(
                b.last_time ||
                  0
              ).getTime();

            return (
              bTime - aTime
            );
          });

      setConversations(clean);

    } catch (e) {
      console.log(
        "loadChats error",
        e
      );
    }

    setLoading(false);
  };

  /* ================= REALTIME ================= */

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(
        "chat-list-realtime"
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },

        async (payload) => {
          const msg =
            payload.new as any;

          if (!msg?.room_id)
            return;

          const { data } =
            await (
              supabase as any
            )
              .from(
                "chat_rooms"
              )
              .select(
                `
                id,
                buyer_id,
                seller_id
              `
              )
              .eq(
                "id",
                msg.room_id
              )
              .maybeSingle();

          if (!data)
            return;

          /* ✅ ONLY USER ROOMS */

          if (
            data.buyer_id !==
              userId &&
            data.seller_id !==
              userId
          ) {
            return;
          }

          /* ✅ MOVE TO TOP */

          setConversations(
            (prev) => {
              const existing =
                prev.find(
                  (c) =>
                    c.room_id ===
                    String(
                      msg.room_id
                    )
                );

              if (!existing) {
                loadChats(
                  userId
                );

                return prev;
              }

              const updated =
                {
                  ...existing,

                  last_message:
                    msg.text ||
                    (msg.image_url
                      ? "📷 Image"
                      : msg.file_url
                      ? "📎 File"
                      : "Message"),

                  last_time:
                    msg.created_at,

                  unread_count:
                    msg.sender_id !==
                    userId
                      ? existing.unread_count +
                        1
                      : existing.unread_count,
                };

              return [
                updated,

                ...prev.filter(
                  (c) =>
                    c.room_id !==
                    String(
                      msg.room_id
                    )
                ),
              ];
            }
          );

          /* ✅ REFRESH */

          loadChats(userId);
        }
      )

      .subscribe(
        (
          status: string
        ) => {
          console.log(
            "Chat realtime:",
            status
          );
        }
      );

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [userId]);

  /* ================= DELETE CHAT ================= */

  const deleteChat = async (
    roomId: string
  ) => {
    Alert.alert(
      "Delete Chat",
      "This conversation will be permanently deleted.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },

        {
          text: "Delete",
          style:
            "destructive",

          onPress:
            async () => {
              try {
                /* DELETE MESSAGES */

                await (
                  supabase as any
                )
                  .from(
                    "messages"
                  )
                  .delete()
                  .eq(
                    "room_id",
                    roomId
                  );

                /* DELETE ROOM */

                await (
                  supabase as any
                )
                  .from(
                    "chat_rooms"
                  )
                  .delete()
                  .eq(
                    "id",
                    roomId
                  );

                /* REMOVE UI */

                setConversations(
                  (
                    prev
                  ) =>
                    prev.filter(
                      (
                        c
                      ) =>
                        c.room_id !==
                        roomId
                    )
                );

              } catch (e) {
                console.log(e);
              }
            },
        },
      ]
    );
  };

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent:
            "center",
          alignItems:
            "center",
        }}
      >
        <ActivityIndicator
          size="large"
        />
      </View>
    );
  }

  /* ================= UI ================= */

  return (
    <FlatList
      data={conversations}

      keyExtractor={(
        item
      ) => item.room_id}

      ListEmptyComponent={
        <Text
          style={{
            textAlign:
              "center",
            marginTop: 40,
          }}
        >
          No conversations yet
        </Text>
      }

      renderItem={({
        item,
      }) => (
        <TouchableOpacity
          onLongPress={() =>
            deleteChat(
              item.room_id
            )
          }

          onPress={() =>
            router.push({
              pathname:
                "/chat/[id]",

              params: {
                id: item.room_id,
              },
            })
          }

          style={{
            padding: 14,
            borderBottomWidth: 1,
            borderColor: "#eee",
            flexDirection:
              "row",
            alignItems:
              "center",
          }}
        >
          {/* PROFILE IMAGE */}

          <Image
            source={{
              uri:
                item.avatar_url ||
                "https://ui-avatars.com/api/?name=User",
            }}
            style={{
              width: 55,
              height: 55,
              borderRadius: 30,
              marginRight: 12,
            }}
          />

          {/* INFO */}

          <View
            style={{
              flex: 1,
            }}
          >
            <View
              style={{
                flexDirection:
                  "row",

                alignItems:
                  "center",
              }}
            >
              <Text
                style={{
                  fontWeight:
                    "bold",

                  fontSize: 16,
                }}
              >
                {
                  item.full_name
                }
              </Text>

              {item.verified && (
                <Text
                  style={{
                    marginLeft: 5,
                    color:
                      "#2563eb",
                  }}
                >
                  ✔️
                </Text>
              )}
            </View>

            <Text
              numberOfLines={1}
              style={{
                color: "#555",
                marginTop: 4,
              }}
            >
              {
                item.last_message
              }
            </Text>
          </View>

          {/* RIGHT SIDE */}

          <View
            style={{
              alignItems:
                "flex-end",
            }}
          >
            {!!item.last_time && (
              <Text
                style={{
                  fontSize: 11,
                  color: "#999",
                  marginBottom: 6,
                }}
              >
                {new Date(
                  item.last_time
                ).toLocaleTimeString()}
              </Text>
            )}

            {item.unread_count >
              0 && (
              <View
                style={{
                  backgroundColor:
                    "red",

                  minWidth: 24,

                  height: 24,

                  borderRadius: 12,

                  justifyContent:
                    "center",

                  alignItems:
                    "center",

                  paddingHorizontal: 6,
                }}
              >
                <Text
                  style={{
                    color:
                      "white",

                    fontWeight:
                      "bold",
                  }}
                >
                  {
                    item.unread_count
                  }
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      )}
    />
  );
}