import * as ImagePicker from "expo-image-picker";

import { useRouter } from "expo-router";

import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  VideoView,
  useVideoPlayer,
} from "expo-video";

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

type Status = {
  id: number;
  user_id: string;
  type: "text" | "image" | "video";
  visibility?: "public" | "followers";
  text?: string;
  media_url?: string;
  background?: string;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string;
  };
};

/* ================= STATUS VIDEO COMPONENT ================= */
const StatusVideo = ({
  uri,
}: {
  uri: string;
}) => {

  const player =
    useVideoPlayer(
      uri,
      (player) => {
        player.loop = true;
        player.muted = true;
        player.play();
      }
    );

  return (
    <View
      style={{
        width: 72,
        height: 72,
        borderRadius: 36,
        overflow: "hidden",
        backgroundColor: "#000",
      }}
    >
      <VideoView
        player={player}
        style={{
          width: 72,
          height: 72,
        }}
        contentFit="cover"
      />
    </View>
  );
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

  const [statuses, setStatuses] =
    useState<Status[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    showTextModal,
    setShowTextModal,
  ] = useState(false);
  

  const [textStatus, setTextStatus] =
    useState("");

  const [
    selectedColor,
    setSelectedColor,
  ] = useState("#111827");

  const colors = [
    "#111827",
    "#2563eb",
    "#dc2626",
    "#16a34a",
    "#9333ea",
    "#ea580c",
    "#db2777",
  ];
const [
  statusVisibility,
  setStatusVisibility,
] = useState<"public" | "followers">(
  "public"
);
const [
  showWebPrivacyModal,
  setShowWebPrivacyModal,
] = useState(false);

const [
  pendingStatusType,
  setPendingStatusType,
] = useState<
  "image" | "video" | null
>(null);
const [
  pendingMediaUri,
  setPendingMediaUri,
] = useState<string | null>(null);

const [
  pendingMediaType,
  setPendingMediaType,
] = useState<
  "image" | "video" | null
>(null);

const handleMediaPick = async (type: "image" | "video") => {
  try {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        type === "image"
          ? ImagePicker.MediaTypeOptions.Images
          : ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
    });

    if (res.canceled) return;

    const uri = res.assets[0].uri;

    // store pending
    setPendingMediaUri(uri);
    setPendingMediaType(type);

    // NOW open privacy modal (NOT alert)
    setShowWebPrivacyModal(true);
  } catch (e) {
    console.log(e);
    Alert.alert("Failed to pick media");
  }
};
  /* ================= UPLOAD ================= */

  const uploadFile = async (
    uri: string,
    type: "image" | "video",
    onProgress?: (p: number) => void
  ): Promise<string> => {
    const isWeb =
      Platform.OS === "web";

    const MAX_RETRIES = 2;

    const uploadOnce =
      async (): Promise<string> => {

        /* ============ WEB ============ */

        if (isWeb) {
          const res =
            await fetch(uri);

          const blob =
            await res.blob();

          const formData =
            new FormData();

          formData.append(
            "file",

            new File(
              [blob],

              type === "image"
                ? "image.jpg"
                : "video.mp4",

              {
                type:
                  blob.type ||
                  (type === "image"
                    ? "image/jpeg"
                    : "video/mp4"),
              }
            )
          );

          return new Promise(
            (
              resolve,
              reject
            ) => {
              const xhr =
                new XMLHttpRequest();

              xhr.open(
                "POST",
                "https://nasara-upload-server.onrender.com/upload"
              );

              xhr.upload.onprogress =
                (e) => {
                  if (
                    e.lengthComputable &&
                    onProgress
                  ) {
                    onProgress(
                      Math.round(
                        (e.loaded /
                          e.total) *
                          100
                      )
                    );
                  }
                };

              xhr.onload = () => {
                try {
                  if (
                    xhr.status !==
                    200
                  ) {
                    return reject(
                      "Upload failed"
                    );
                  }

                  const data =
                    JSON.parse(
                      xhr.responseText
                    );

                  if (
                    !data?.url
                  ) {
                    return reject(
                      "Invalid response"
                    );
                  }

                  resolve(
                    data.url
                  );

                } catch {
                  reject(
                    "Invalid JSON"
                  );
                }
              };

              xhr.onerror =
                () =>
                  reject(
                    "Network error"
                  );

              xhr.send(
                formData
              );
            }
          );
        }

        /* ============ MOBILE ============ */

        return new Promise(
          (
            resolve,
            reject
          ) => {
            const xhr =
              new XMLHttpRequest();

            const formData =
              new FormData();

            formData.append(
              "file",
              {
                uri: uri.startsWith(
                  "file://"
                )
                  ? uri
                  : `file://${uri}`,

                name:
                  type ===
                  "image"
                    ? "image.jpg"
                    : "video.mp4",

                type:
                  type ===
                  "image"
                    ? "image/jpeg"
                    : "video/mp4",
              } as any
            );

            xhr.open(
              "POST",
              "https://nasara-upload-server.onrender.com/upload"
            );

            xhr.upload.onprogress =
              (e) => {
                if (
                  e.lengthComputable &&
                  onProgress
                ) {
                  onProgress(
                    Math.round(
                      (e.loaded /
                        e.total) *
                        100
                    )
                  );
                }
              };

            xhr.onload = () => {
              try {
                if (
                  xhr.status !==
                  200
                ) {
                  return reject(
                    "Upload failed"
                  );
                }

                const data =
                  JSON.parse(
                    xhr.responseText
                  );

                if (
                  !data?.url
                ) {
                  return reject(
                    "Invalid response"
                  );
                }

                resolve(
                  data.url
                );

              } catch {
                reject(
                  "Invalid JSON"
                );
              }
            };

            xhr.onerror =
              () =>
                reject(
                  "Network error"
                );

            xhr.send(
              formData
            );
          }
        );
      };

    for (
      let i = 0;
      i <= MAX_RETRIES;
      i++
    ) {
      try {
        return await uploadOnce();

      } catch (err) {
        if (
          i === MAX_RETRIES
        ) {
          throw err;
        }
      }
    }

    throw new Error(
      "Upload failed"
    );
  };

  /* ================= USER + REALTIME ================= */

useEffect(() => {
  let mounted = true;

  const init = async () => {
    const { data } =
      await supabase.auth.getSession();

    const uid =
      data.session?.user.id ??
      null;

    if (!mounted) return;

    setUserId(uid);

    if (uid) {
      await loadChats(uid);
      await loadStatuses();

      /* REALTIME MESSAGES */

      const messagesChannel =
        supabase
          .channel(
            "messages-realtime"
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema:
                "public",
              table:
                "messages",
            },
            async () => {
              await loadChats(
                uid
              );
            }
          )
          .subscribe();

      /* REALTIME CHAT ROOMS */

      const roomsChannel =
        supabase
          .channel(
            "rooms-realtime"
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema:
                "public",
              table:
                "chat_rooms",
            },
            async () => {
              await loadChats(
                uid
              );
            }
          )
          .subscribe();

      /* REALTIME STATUS */

      const statusChannel =
        supabase
          .channel(
            "status-realtime"
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema:
                "public",
              table:
                "statuses",
            },
            async () => {
              await loadStatuses();
            }
          )
          .subscribe();

      return () => {
        supabase.removeChannel(
          messagesChannel
        );

        supabase.removeChannel(
          roomsChannel
        );

        supabase.removeChannel(
          statusChannel
        );
      };
    }
  };

  init();

  return () => {
    mounted = false;
  };
}, []);
  /* ================= LOAD STATUSES ================= */

const loadStatuses = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const currentUserId = user.id;

    const { data, error } = await (supabase as any)
      .from("statuses")
      .select(`
        id,
        user_id,
        type,
        text,
        media_url,
        background,
        visibility,
        created_at
      `)
      .order("created_at", {
        ascending: false,
      });

    if (error || !data) {
      setStatuses([]);
      return;
    }

    const visibleStatuses: any[] = [];

    for (const status of data) {
      /* PUBLIC */
      if (
        status.visibility === "public" ||
        !status.visibility
      ) {
        visibleStatuses.push(status);
        continue;
      }

      /* OWN STATUS */
      if (
        status.user_id === currentUserId
      ) {
        visibleStatuses.push(status);
        continue;
      }

      /* FOLLOWERS ONLY */
      if (
        status.visibility ===
        "followers"
      ) {
        const {
          data: follow,
        } = await (supabase as any)
          .from("follows")
          .select("id")
          .eq(
            "follower_id",
            currentUserId
          )
          .eq(
            "following_id",
            status.user_id
          )
          .maybeSingle();

        if (follow) {
          visibleStatuses.push(status);
        }
      }
    }

    const seen = new Set<string>();
    const grouped: any[] = [];

    for (const status of visibleStatuses) {
      if (
        seen.has(status.user_id)
      )
        continue;

      seen.add(status.user_id);

      const {
        data: profile,
      } = await (supabase as any)
        .from("profiles")
        .select(
          "full_name, avatar_url"
        )
        .eq(
          "id",
          status.user_id
        )
        .maybeSingle();

      grouped.push({
        ...status,
        profiles: {
          full_name:
            profile?.full_name ||
            "User",

          avatar_url:
            profile?.avatar_url ||
            "",
        },
      });
    }

    setStatuses(grouped);

  } catch (e) {
    console.log(e);
  }
};
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

    const {
      data: rooms,
      error,
    } = await (supabase as any)
      .from("chat_rooms")
      .select("*")
      .or(
        `buyer_id.eq.${currentUserId},seller_id.eq.${currentUserId}`
      );

    if (
      error ||
      !rooms
    ) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const formatted =
      await Promise.all(
        rooms.map(
          async (
            room: any
          ) => {
            const otherId =
              room.buyer_id ===
              currentUserId
                ? room.seller_id
                : room.buyer_id;

            const {
              data: profile,
            } =
              await (
                supabase as any
              )
                .from(
                  "profiles"
                )
                .select(`
                  full_name,
                  avatar_url,
                  verified
                `)
                .eq(
                  "id",
                  otherId
                )
                .maybeSingle();

            const {
              data: messages,
            } =
              await (
                supabase as any
              )
                .from(
                  "messages"
                )
                .select(`
                  text,
                  image_url,
                  file_url,
                  created_at
                `)
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
          }
        )
      );

    /* MOVE LATEST CHAT TO TOP */

    formatted.sort(
      (a, b) =>
        new Date(
          b.last_time || 0
        ).getTime() -
        new Date(
          a.last_time || 0
        ).getTime()
    );

    setConversations(
      formatted
    );

  } catch (e) {
    console.log(e);
  }

  setLoading(false);
};

  /* ================= UPLOAD STATUS ================= */

  const uploadStatus =
    async (
      type:
        | "text"
        | "image"
        | "video"
    ) => {

      try {

        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        if (!user) {
          Alert.alert(
            "Login required"
          );
          return;
        }

        /* TEXT */

        if (
          type === "text"
        ) {

          if (
            !textStatus.trim()
          ) {
            Alert.alert(
              "Write something"
            );
            return;
          }

          const { error } =
            await (
              supabase as any
            )
              .from(
                "statuses"
              )
              .insert({
  user_id:
    user.id,

  type: "text",

  text:
    textStatus,

  background:
    selectedColor,

  visibility:
    statusVisibility,
});

          if (error) {
            Alert.alert(
              error.message
            );
            return;
          }

          /* NOTIFICATIONS */

          const {
            data: users,
          } =
            await (
              supabase as any
            )
              .from(
                "profiles"
              )
              .select("id");

          if (users) {
            const inserts =
              users.map(
                (
                  u: any
                ) => ({
                  user_id:
                    u.id,

                  type:
                    "status",

                  title:
                    "🟢 New Status",

                  body:
                    "New text status uploaded",

                  read:
                    false,
                })
              );

            await (
              supabase as any
            )
              .from(
                "notifications"
              )
              .insert(
                inserts
              );
          }

          fetch(
            "https://nasara-upload-server.onrender.com/send-push",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify(
                {
                  type:
                    "status",

                  title:
                    "🟢 New Status",

                  body:
                    "New text status uploaded",
                }
              ),
            }
          ).catch(
            () => {}
          );

          Alert.alert(
            "Status uploaded"
          );

          setShowTextModal(
            false
          );

          setTextStatus("");

          loadStatuses();

          return;
        }

        /* IMAGE */

        if (
          type === "image"
        ) {

          const res =
            await ImagePicker.launchImageLibraryAsync(
              {
                mediaTypes:
                  ImagePicker.MediaTypeOptions.Images,

                quality:
                  0.8,
              }
            );

          if (
            res.canceled
          )
            return;

          const localUri =
            res.assets[0].uri;

          const uploadedUrl =
            await uploadFile(
              localUri,
              "image"
            );

          const { error } =
            await (
              supabase as any
            )
              .from(
                "statuses"
              )
              .insert({
  user_id:
    user.id,

  type:
    "image",

  media_url:
    uploadedUrl,

  visibility:
    statusVisibility,
});
          if (error) {
            Alert.alert(
              error.message
            );
            return;
          }

          /* NOTIFICATIONS */

          const {
            data: users,
          } =
            await (
              supabase as any
            )
              .from(
                "profiles"
              )
              .select("id");

          if (users) {
            const inserts =
              users.map(
                (
                  u: any
                ) => ({
                  user_id:
                    u.id,

                  type:
                    "status",

                  title:
                    "📷 New Status",

                  body:
                    "New photo status uploaded",

                  read:
                    false,
                })
              );

            await (
              supabase as any
            )
              .from(
                "notifications"
              )
              .insert(
                inserts
              );
          }

          fetch(
            "https://nasara-upload-server.onrender.com/send-push",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify(
                {
                  type:
                    "status",

                  title:
                    "📷 New Status",

                  body:
                    "New photo status uploaded",
                }
              ),
            }
          ).catch(
            () => {}
          );

          Alert.alert(
            "Image uploaded"
          );

          loadStatuses();

          return;
        }

        /* VIDEO */

        if (
          type === "video"
        ) {

          const res =
            await ImagePicker.launchImageLibraryAsync(
              {
                mediaTypes:
                  ImagePicker.MediaTypeOptions.Videos,
              }
            );

          if (
            res.canceled
          )
            return;

          const localUri =
            res.assets[0].uri;

          const uploadedUrl =
            await uploadFile(
              localUri,
              "video"
            );

          const { error } =
            await (
              supabase as any
            )
              .from(
                "statuses"
              )
              .insert({
  user_id:
    user.id,

  type:
    "video",

  media_url:
    uploadedUrl,

  visibility:
    statusVisibility,
});
          if (error) {
            Alert.alert(
              error.message
            );
            return;
          }

          /* NOTIFICATIONS */

          const {
            data: users,
          } =
            await (
              supabase as any
            )
              .from(
                "profiles"
              )
              .select("id");

          if (users) {
            const inserts =
              users.map(
                (
                  u: any
                ) => ({
                  user_id:
                    u.id,

                  type:
                    "status",

                  title:
                    "🎥 New Status",

                  body:
                    "New video status uploaded",

                  read:
                    false,
                })
              );

            await (
              supabase as any
            )
              .from(
                "notifications"
              )
              .insert(
                inserts
              );
          }

          fetch(
            "https://nasara-upload-server.onrender.com/send-push",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify(
                {
                  type:
                    "status",

                  title:
                    "🎥 New Status",

                  body:
                    "New video status uploaded",
                }
              ),
            }
          ).catch(
            () => {}
          );

          Alert.alert(
            "Video uploaded"
          );

          loadStatuses();
        }

      } catch (e) {

        console.log(e);

        Alert.alert(
          "Upload failed"
        );
      }
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
const deleteChat = async (
  roomId: string
) => {
  Alert.alert(
    "Delete Chat",
    "Delete this conversation?",
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

            setConversations(
              (prev) =>
                prev.filter(
                  (c) =>
                    c.room_id !==
                    roomId
                )
            );
          },
      },
    ]
  );
};
 /* ================= UI ================= */

return (
  <View
    style={{
      flex: 1,
      backgroundColor: "#fff",
    }}
  >

    {/* STATUS BAR */}

    <View style={{ height: 110 }}>
  <ScrollView
    horizontal
      showsHorizontalScrollIndicator={false}
      style={{
        paddingVertical: 10,
        paddingHorizontal: 10,
        backgroundColor: "white",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
      }}
    >

      {/* WRITE STATUS */}

      <TouchableOpacity
        onPress={() =>
          setShowTextModal(true)
        }
        style={{
          marginRight: 14,
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: "#111827",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 30,
            }}
          >
            ✏️
          </Text>
        </View>

        <Text
          style={{
            marginTop: 4,
            fontSize: 12,
          }}
        >
          Write
        </Text>
      </TouchableOpacity>

      {/* IMAGE STATUS */}
<TouchableOpacity
  onPress={() => handleMediaPick("image")}
  style={{ marginRight: 14, alignItems: "center" }}
>
  <View
    style={{
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: "#2563eb",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <Text
      style={{
        color: "white",
        fontSize: 30,
      }}
    >
      📷
    </Text>
  </View>

  <Text
    style={{
      marginTop: 4,
      fontSize: 12,
    }}
  >
    Image
  </Text>
</TouchableOpacity>

     {/* VIDEO STATUS */}

<TouchableOpacity
  onPress={() => handleMediaPick("video")}
  style={{ marginRight: 14, alignItems: "center" }}
>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: "#000",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 28,
            }}
          >
            ▶️
          </Text>
        </View>

        <Text
          style={{
            marginTop: 4,
            fontSize: 12,
          }}
        >
          Video
        </Text>
      </TouchableOpacity>

      {/* USER STATUSES */}

      {statuses.map((status) => (
        <TouchableOpacity
          key={status.id}
          onPress={() =>
            router.push({
              pathname:
                "/status-view/[id]",
              params: {
                id: String(
                  status.id
                ),
              },
            })
          }
          style={{
            marginRight: 14,
            alignItems: "center",
          }}
        >

          {/* TEXT STATUS */}

          {status.type ===
          "text" ? (
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor:
                  status.background ||
                  "#111827",
                justifyContent:
                  "center",
                alignItems:
                  "center",
                padding: 8,
              }}
            >
              <Text
                numberOfLines={3}
                style={{
                  color: "white",
                  fontSize: 10,
                  textAlign:
                    "center",
                  fontWeight:
                    "bold",
                }}
              >
                {status.text}
              </Text>
            </View>
          ) : status.type ===
            "image" ? (
            <Image
              source={{
                uri:
                  status.media_url ||
                  "",
              }}
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
              }}
              resizeMode="cover"
            />
          ) : (
            
            <StatusVideo
  uri={
    status.media_url || ""
  }
/>
          )}

          <Text
            numberOfLines={1}
            style={{
              marginTop: 5,
              width: 72,
              textAlign: "center",
              fontSize: 11,
              color: "#111",
            }}
          >
            {status.profiles
              ?.full_name ||
              "User"}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
    </View>
    {/* WEB PRIVACY MODAL */}

<Modal
  visible={showWebPrivacyModal}
  transparent
  animationType="fade"
>
  <View
    style={{
      flex: 1,
      backgroundColor:
        "rgba(0,0,0,0.5)",
      justifyContent:
        "center",
      alignItems: "center",
      padding: 20,
    }}
  >

    <View
      style={{
        width: "100%",
        maxWidth: 350,
        backgroundColor: "white",
        borderRadius: 18,
        padding: 20,
      }}
    >

      <Text
        style={{
          fontSize: 18,
          fontWeight: "bold",
          marginBottom: 10,
          color: "#111",
        }}
      >
        Status Privacy
      </Text>

      <Text
        style={{
          color: "#666",
          marginBottom: 25,
        }}
      >
        Who can view this status?
      </Text>

      {/* PUBLIC */}

     <TouchableOpacity
  onPress={async () => {
    setStatusVisibility("public");
    setShowWebPrivacyModal(false);

    if (!pendingMediaUri || !pendingMediaType) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const uploadedUrl = await uploadFile(
        pendingMediaUri,
        pendingMediaType
      );

      await (supabase as any)
        .from("statuses")
        .insert({
          user_id: user.id,
          type: pendingMediaType,
          media_url: uploadedUrl,
          visibility: "public",
        });

      Alert.alert("Status uploaded");
      loadStatuses();
    } catch (e) {
      console.log(e);
      Alert.alert("Upload failed");
    } finally {
      setPendingMediaUri(null);
      setPendingMediaType(null);
    }
  }}
  style={{
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  }}
>
  <Text
    style={{
      color: "white",
      textAlign: "center",
      fontWeight: "bold",
    }}
  >
    🌍 Public
  </Text>
</TouchableOpacity>

      {/* FOLLOWERS */}

      <TouchableOpacity
  onPress={async () => {
    setStatusVisibility("followers");
    setShowWebPrivacyModal(false);

    if (!pendingMediaUri || !pendingMediaType) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const uploadedUrl = await uploadFile(
        pendingMediaUri,
        pendingMediaType
      );

      await (supabase as any)
        .from("statuses")
        .insert({
          user_id: user.id,
          type: pendingMediaType,
          media_url: uploadedUrl,
          visibility: "followers",
        });

      Alert.alert("Status uploaded");
      loadStatuses();
    } catch (e) {
      console.log(e);
      Alert.alert("Upload failed");
    } finally {
      setPendingMediaUri(null);
      setPendingMediaType(null);
    }
  }}
  style={{
    backgroundColor: "#111827",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  }}
>
  <Text
    style={{
      color: "white",
      textAlign: "center",
      fontWeight: "bold",
    }}
  >
    👥 Followers
  </Text>
</TouchableOpacity>
      {/* CANCEL */}

      <TouchableOpacity
       onPress={() => {
  setShowWebPrivacyModal(false);
  setPendingMediaUri(null);
  setPendingMediaType(null);
}}
        style={{
          padding: 14,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#ddd",
        }}
      >
        <Text
          style={{
            textAlign: "center",
            fontWeight: "bold",
            color: "#111",
          }}
        >
          ❌ Cancel
        </Text>
      </TouchableOpacity>

    </View>
  </View>
</Modal>
    {/* TEXT STATUS MODAL */}

    <Modal
      visible={showTextModal}
      animationType="slide"
    >
      <View
        style={{
          flex: 1,
          backgroundColor:
            selectedColor,
          padding: 20,
          justifyContent:
            "center",
        }}
      >

        {/* CLOSE */}

        <TouchableOpacity
          onPress={() =>
            setShowTextModal(
              false
            )
          }
          style={{
            position: "absolute",
            top: 60,
            right: 20,
            zIndex: 10,
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 28,
              fontWeight:
                "bold",
            }}
          >
            ✕
          </Text>
        </TouchableOpacity>

        {/* INPUT */}

        <TextInput
          value={textStatus}
          onChangeText={
            setTextStatus
          }
          placeholder="Write your status..."
          placeholderTextColor="rgba(255,255,255,0.7)"
          multiline
          style={{
            color: "white",
            fontSize: 30,
            textAlign: "center",
            fontWeight: "bold",
          }}
        />

        {/* COLORS */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          style={{
            marginTop: 40,
          }}
        >
          {colors.map(
            (color) => (
              <TouchableOpacity
                key={color}
                onPress={() =>
                  setSelectedColor(
                    color
                  )
                }
                style={{
                  width: 50,
                  height: 50,
                  borderRadius:
                    25,
                  backgroundColor:
                    color,
                  marginRight: 12,
                  borderWidth:
                    selectedColor ===
                    color
                      ? 3
                      : 0,
                  borderColor:
                    "white",
                }}
              />
            )
          )}
        </ScrollView>
        {/* VISIBILITY */}

<View
  style={{
    flexDirection: "row",
    marginTop: 25,
    justifyContent: "center",
  }}
>
  <TouchableOpacity
    onPress={() =>
      setStatusVisibility(
        "public"
      )
    }
    style={{
      backgroundColor:
        statusVisibility ===
        "public"
          ? "white"
          : "rgba(255,255,255,0.2)",

      paddingVertical: 12,
      paddingHorizontal: 22,
      borderRadius: 12,
      marginRight: 12,
    }}
  >
    <Text
      style={{
        color:
          statusVisibility ===
          "public"
            ? "#111"
            : "white",

        fontWeight: "bold",
      }}
    >
      🌍 Public
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    onPress={() =>
      setStatusVisibility(
        "followers"
      )
    }
    style={{
      backgroundColor:
        statusVisibility ===
        "followers"
          ? "white"
          : "rgba(255,255,255,0.2)",

      paddingVertical: 12,
      paddingHorizontal: 22,
      borderRadius: 12,
    }}
  >
    <Text
      style={{
        color:
          statusVisibility ===
          "followers"
            ? "#111"
            : "white",

        fontWeight: "bold",
      }}
    >
      👥 Followers
    </Text>
  </TouchableOpacity>
</View>
        {/* POST BUTTON */}

        <TouchableOpacity
          onPress={() =>
            uploadStatus("text")
          }
          style={{
            backgroundColor:
              "white",
            padding: 16,
            borderRadius: 14,
            marginTop: 40,
          }}
        >
          <Text
            style={{
              textAlign: "center",
              fontWeight: "bold",
              fontSize: 16,
            }}
          >
            Post Status
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>

    {/* CHAT LIST */}

    <FlatList
  contentContainerStyle={{ paddingTop: 8 }}
      data={conversations}
      keyExtractor={(item) =>
        item.room_id
      }

      ListEmptyComponent={
        <Text
          style={{
            textAlign: "center",
            marginTop: 40,
            color: "#666",
          }}
        >
          No conversations yet
        </Text>
      }

      renderItem={({ item }) => (
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
            flexDirection: "row",
            alignItems: "center",
            backgroundColor:
              "white",
          }}
        >

          {/* PROFILE */}

          <Image
            source={{
              uri:
                item.avatar_url ||
                "https://ui-avatars.com/api/?name=User",
            }}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              marginRight: 12,
            }}
          />

          {/* CHAT INFO */}

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
                  color: "#111",
                }}
              >
                {item.full_name}
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
                color: "#666",
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
                    "#22c55e",
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
                    fontSize: 12,
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
 </View>
);
}