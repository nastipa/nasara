import * as ImagePicker from "expo-image-picker";

import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { useRouter } from "expo-router";

import { usePathname } from "expo-router";
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

import { playSound } from "../../lib/playSound";
import { supabase } from "../../lib/supabase";

type Conversation = {
  room_id: string;
  last_message: string;
  unread_count: number;
  last_time: string;
  full_name: string;
  avatar_url: string;
  verified: boolean;

  /* ADD THIS */
  chat_type?: "private" | "group";
};
type Status = {
  id: number;
  user_id: string;
 type:
  | "text"
  | "image"
  | "video"
  | "audio"
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
    const recorder =
  useAudioRecorder(
    RecordingPresets.HIGH_QUALITY
  );

const [recording, setRecording] =
  useState(false);

const [
  recordingUri,
  setRecordingUri,
] = useState<string | null>(
  null
);

  const [loading, setLoading] =
    useState(true);

  const [
    showTextModal,
    setShowTextModal,
  ] = useState(false);
  const pathname =
  usePathname();

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
  | "image"
  | "video"
  | "audio"
  | null
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
  type: "image" | "video" | "audio",
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

        const fileName =
          type === "image"
            ? "image.jpg"
            : type === "audio"
            ? "audio.mp3"
            : "video.mp4";

        const mimeType =
          type === "image"
            ? "image/jpeg"
            : type === "audio"
            ? "audio/mpeg"
            : "video/mp4";

        formData.append(
          "file",

          new File(
            [blob],
            fileName,
            {
              type:
                blob.type ||
                mimeType,
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

          const fileName =
            type === "image"
              ? "image.jpg"
              : type === "audio"
              ? "audio.m4a"
              : "video.mp4";

          const mimeType =
            type === "image"
              ? "image/jpeg"
              : type === "audio"
              ? "audio/mp4"
              : "video/mp4";

          formData.append(
            "file",
            {
              uri: uri.startsWith(
                "file://"
              )
                ? uri
                : `file://${uri}`,

              name: fileName,

              type: mimeType,
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
        event: "INSERT",
        schema: "public",
        table: "messages",
      },

      async (payload) => {
        const msg =
          payload.new as any;

        /* ================= ONLY ROOM PARTICIPANTS ================= */

        const {
          data: room,
        } = await (
          supabase as any
        )
          .from(
            "chat_rooms"
          )
          .select(
            "buyer_id, seller_id"
          )
          .eq(
            "id",
            msg.room_id
          )
          .single();

        if (!room) return;

        const isParticipant =
          room.buyer_id === uid ||
          room.seller_id === uid;

        if (!isParticipant)
          return;

        /* ================= DON'T PLAY FOR SENDER ================= */

        if (
          msg.sender_id === uid
        )
          return;

        /* ================= DON'T PLAY INSIDE OPEN CHAT ================= */

        const currentPath =
          pathname || "";

        const inChatRoom =
          currentPath.includes(
            `/chat/${msg.room_id}`
          );

        if (!inChatRoom) {
          playSound(
            "message"
          );
        }

        await loadChats(uid);
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
      /* REALTIME GROUPS */

const groupsChannel =
  supabase
    .channel(
      "groups-realtime"
    )

    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "group_members",
      },

      async () => {
        await loadChats(uid);
      }
    )

    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "group_messages",
      },

      async () => {
        await loadChats(uid);
      }
    )

    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "groups",
      },

      async () => {
        await loadChats(uid);
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
             setTimeout(async () => {
  await loadStatuses();
}, 500);
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
        supabase.removeChannel(
  groupsChannel
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

    /* DELETE EXPIRED STATUSES */
const expiryDate = new Date(
  Date.now() - 24 * 60 * 60 * 1000
).toISOString();

await supabase
  .from("statuses")
  .delete()
  .lt("created_at", expiryDate);

/* NOW LOAD ACTIVE STATUSES */
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

const now = new Date().getTime();

for (const status of data) {

  /* SKIP EXPIRED */
  const created = new Date(
    status.created_at
  ).getTime();

  const diff =
    now - created;

  if (
    diff >
    24 * 60 * 60 * 1000
  ) {
    continue;
  }
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

    /* ================= PRIVATE CHATS ================= */

    const {
      data: rooms,
      error,
    } = await (supabase as any)
      .from("chat_rooms")
      .select("*")
      .or(
        `buyer_id.eq.${currentUserId},seller_id.eq.${currentUserId}`
      );

    if (error) {
      console.log(error);
      setConversations([]);
      setLoading(false);
      return;
    }

    const privateChats =
      await Promise.all(
        (rooms || []).map(
          async (
            room: any
          ) => {
            const otherId =
              room.buyer_id ===
              currentUserId
                ? room.seller_id
                : room.buyer_id;

            /* USER PROFILE */

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

            /* UNREAD */

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

              full_name:
                profile?.full_name ||
                "User",

              avatar_url:
                profile?.avatar_url ||
                "",

              verified:
                profile?.verified ||
                false,

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

              chat_type:
                "private",
            };
          }
        )
      );

    /* ================= GROUP CHATS ================= */

const {
  data: groupMembers,
  error: groupError,
} = await (supabase as any)
  .from("group_members")
  .select(`
    group_id,
    groups (
      id,
      name,
      image_url
    )
  `)
  .eq(
    "user_id",
    currentUserId
  );

if (groupError) {
  console.log(groupError);
}

const groupChats =
  await Promise.all(
    (
      groupMembers || []
    ).map(
      async (
        member: any
      ) => {

        const group =
          Array.isArray(
            member.groups
          )
            ? member.groups[0]
            : member.groups;

        if (!group)
          return null;

        /* LAST GROUP MESSAGE */

        const {
          data: messages,
        } =
          await (
            supabase as any
          )
            .from(
              "group_messages"
            )
            .select(`
              text,
              image_url,
              created_at
            `)
            .eq(
              "group_id",
              group.id
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

        /* UNREAD */

const { count } =
  await (supabase as any)
    .from("group_messages")
    .select(
      "*",
      {
        count: "exact",
        head: true,
      }
    )
    .eq(
      "group_id",
      group.id
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
          room_id: String(group.id),

          full_name:
            group.name ||
            "Group",

          avatar_url:
            group.image_url ||
            "https://ui-avatars.com/api/?name=Group",

          verified: false,

          last_message:
            lastMsg?.text ||
            (lastMsg?.image_url
              ? "📷 Image"
              : "Start chatting"),

          unread_count:
            count || 0,

          last_time:
            lastMsg?.created_at ||
            "",

          chat_type:
            "group",
        };
      }
    )
  );
    /* REMOVE NULL GROUPS */

    const cleanGroups =
      groupChats.filter(
        Boolean
      );

    /* ================= MERGE ================= */

    const allChats = [
      ...privateChats,
      ...cleanGroups,
    ];

    /* ================= SORT BY LATEST ================= */

    allChats.sort(
      (
        a: any,
        b: any
      ) =>
        new Date(
          b.last_time || 0
        ).getTime() -
        new Date(
          a.last_time || 0
        ).getTime()
    );

    /* ================= FINAL ================= */

    setConversations(
      allChats
    );

  } catch (e) {
    console.log(e);
  }

  setLoading(false);
};
/* ================= START RECORDING ================= */

const [recordingTime, setRecordingTime] =
  useState(0);

const [recordingInterval, setRecordingInterval] =
  useState<any>(null);

const startRecording = async () => {
  try {

    const permission =
      await AudioModule.requestRecordingPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission denied");
      return;
    }

    /* IMPORTANT FOR IOS */

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });

    await recorder.prepareToRecordAsync();

    await recorder.record();

    setRecording(true);

    /* TIMER */

    setRecordingTime(0);

    const interval = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);

    setRecordingInterval(interval);

  } catch (e) {
    console.log(e);

    Alert.alert(
      "Failed to start recording"
    );
  }
};
  /* ================= STOP RECORDING ================= */

const stopRecording = async () => {
  try {

    await recorder.stop();

    /* RESET IOS AUDIO MODE */

    await setAudioModeAsync({
      allowsRecording: false,
    });

    if (recordingInterval) {
      clearInterval(recordingInterval);
    }

    const uri = recorder.uri;

    if (!uri) return;

    setRecording(false);

    setRecordingUri(uri);

    setShowWebPrivacyModal(true);

    setPendingMediaUri(uri);

    setPendingMediaType("audio");

  } catch (e) {
    console.log(e);

    Alert.alert(
      "Failed to stop recording"
    );
  }
};
  /* ================= UPLOAD STATUS ================= */

  const uploadStatus =
    async (
      type:
  | "text"
  | "image"
  | "video"
  | "audio"
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
  roomId: string,
  type?: "private" | "group"
) => {
  Alert.alert(
    type === "group"
      ? "Delete Group"
      : "Delete Chat",

    type === "group"
      ? "Delete this group permanently?"
      : "Delete this conversation?",

    [
      {
        text: "Cancel",
        style: "cancel",
      },

      {
        text: "Delete",
        style: "destructive",

        onPress: async () => {
          try {

            /* ================= GROUP DELETE ================= */

            if (type === "group") {

              /* DELETE GROUP MESSAGES */

              await (supabase as any)
                .from("group_messages")
                .delete()
                .eq("group_id", roomId);

              /* DELETE GROUP MEMBERS */

              await (supabase as any)
                .from("group_members")
                .delete()
                .eq("group_id", roomId);

              /* DELETE GROUP */

              await (supabase as any)
                .from("groups")
                .delete()
                .eq("id", roomId);

            } else {

              /* ================= PRIVATE CHAT DELETE ================= */

              await (supabase as any)
                .from("messages")
                .delete()
                .eq("room_id", roomId);

              await (supabase as any)
                .from("chat_rooms")
                .delete()
                .eq("id", roomId);
            }

            /* REMOVE FROM UI */

            setConversations((prev) =>
              prev.filter(
                (c) => c.room_id !== roomId
              )
            );

          } catch (e) {
            console.log(e);

            Alert.alert(
              "Failed to delete"
            );
          }
        },
      },
    ]
  );
};
 /* =========================================================
     🟢 NASARA CHAT — PREMIUM NAVY & GOLD UI
     🔵 PRESERVES PRIVATE CHAT, GROUP CHAT AND STATUS FEATURES
     🟡 PRESERVES EXISTING ROUTES AND DATABASE LOGIC
     ========================================================= */

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#F3F5F9",
      }}
    >
      {/* =====================================================
          🔵 PREMIUM HEADER
          ===================================================== */}

      <View
        style={{
          backgroundColor: "#101B35",
          paddingTop: Platform.OS === "ios" ? 12 : 8,
          paddingHorizontal: 20,
          paddingBottom: 20,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View>
            <Text
              style={{
                color: "#D6AD55",
                fontSize: 11,
                fontWeight: "800",
                letterSpacing: 3,
              }}
            >
              NASARA
            </Text>

            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 27,
                fontWeight: "900",
                marginTop: 3,
              }}
            >
              Messages
            </Text>

            <Text
              style={{
                color: "#B8C2D6",
                fontSize: 12,
                marginTop: 3,
              }}
            >
              Stay connected with your community
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/groups/create")}
            activeOpacity={0.8}
            style={{
              backgroundColor: "#D6AD55",
              paddingHorizontal: 15,
              paddingVertical: 12,
              borderRadius: 14,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 17,
                marginRight: 6,
              }}
            >
              👥
            </Text>

            <Text
              style={{
                color: "#101B35",
                fontSize: 12,
                fontWeight: "900",
              }}
            >
              New Group
            </Text>
          </TouchableOpacity>
        </View>

        {/* HEADER SUMMARY */}

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 18,
          }}
        >
          <View
            style={{
              backgroundColor: "rgba(255,255,255,0.10)",
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: "#D6AD55",
                marginRight: 7,
              }}
            />

            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 11,
                fontWeight: "700",
              }}
            >
              {conversations.length} conversations
            </Text>
          </View>
        </View>
      </View>

      {/* =====================================================
          🟡 STATUS SECTION
          ===================================================== */}

      <View
        style={{
          marginTop: 14,
          marginHorizontal: 14,
          backgroundColor: "#FFFFFF",
          borderRadius: 20,
          paddingTop: 15,
          paddingBottom: 10,
          elevation: 2,
          shadowColor: "#101B35",
          shadowOpacity: 0.04,
          shadowRadius: 8,
        }}
      >
        <View
          style={{
            paddingHorizontal: 16,
            marginBottom: 12,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "900",
                color: "#101B35",
              }}
            >
              Status Updates
            </Text>

            <Text
              style={{
                color: "#8992A3",
                fontSize: 11,
                marginTop: 3,
              }}
            >
              Share a moment with your community
            </Text>
          </View>

          <Text
            style={{
              color: "#B58B37",
              fontSize: 11,
              fontWeight: "800",
            }}
          >
            24 HOURS
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 14,
          }}
        >
          {/* WRITE STATUS */}

          <TouchableOpacity
            onPress={() => setShowTextModal(true)}
            activeOpacity={0.8}
            style={{
              width: 75,
              alignItems: "center",
              marginRight: 12,
            }}
          >
            <View
              style={{
                width: 66,
                height: 66,
                borderRadius: 23,
                backgroundColor: "#101B35",
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 2,
                borderColor: "#D6AD55",
              }}
            >
              <Text style={{ fontSize: 27 }}>✏️</Text>
            </View>

            <Text
              style={{
                marginTop: 7,
                fontSize: 11,
                color: "#101B35",
                fontWeight: "800",
              }}
            >
              Write
            </Text>
          </TouchableOpacity>

          {/* IMAGE STATUS */}

          <TouchableOpacity
            onPress={() => handleMediaPick("image")}
            activeOpacity={0.8}
            style={{
              width: 75,
              alignItems: "center",
              marginRight: 12,
            }}
          >
            <View
              style={{
                width: 66,
                height: 66,
                borderRadius: 23,
                backgroundColor: "#E8F0FF",
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#D9E4FA",
              }}
            >
              <Text style={{ fontSize: 27 }}>📷</Text>
            </View>

            <Text
              style={{
                marginTop: 7,
                fontSize: 11,
                color: "#101B35",
                fontWeight: "700",
              }}
            >
              Image
            </Text>
          </TouchableOpacity>

          {/* VIDEO STATUS */}

          <TouchableOpacity
            onPress={() => handleMediaPick("video")}
            activeOpacity={0.8}
            style={{
              width: 75,
              alignItems: "center",
              marginRight: 12,
            }}
          >
            <View
              style={{
                width: 66,
                height: 66,
                borderRadius: 23,
                backgroundColor: "#F0ECFA",
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#E5DDF5",
              }}
            >
              <Text style={{ fontSize: 27 }}>▶️</Text>
            </View>

            <Text
              style={{
                marginTop: 7,
                fontSize: 11,
                color: "#101B35",
                fontWeight: "700",
              }}
            >
              Video
            </Text>
          </TouchableOpacity>

          {/* AUDIO STATUS */}

          <TouchableOpacity
            onPress={() => {
              if (recording) {
                stopRecording();
              } else {
                startRecording();
              }
            }}
            activeOpacity={0.8}
            style={{
              width: 75,
              alignItems: "center",
              marginRight: 12,
            }}
          >
            <View
              style={{
                width: 66,
                height: 66,
                borderRadius: 23,
                backgroundColor: recording
                  ? "#FDECEC"
                  : "#E7F5EF",
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 1,
                borderColor: recording
                  ? "#F5CACA"
                  : "#CDE9DA",
              }}
            >
              <Text style={{ fontSize: 27 }}>
                {recording ? "🔴" : "🎤"}
              </Text>
            </View>

            <Text
              style={{
                marginTop: 7,
                fontSize: 11,
                color: recording ? "#DC2626" : "#101B35",
                fontWeight: "700",
              }}
            >
              {recording
                ? `${Math.floor(recordingTime / 60)}:${String(
                    recordingTime % 60
                  ).padStart(2, "0")}`
                : "Audio"}
            </Text>
          </TouchableOpacity>

          {/* EXISTING USER STATUSES */}

          {statuses.map((status) => (
            <TouchableOpacity
              key={status.id}
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname: "/status-view/[id]",
                  params: {
                    id: String(status.id),
                  },
                })
              }
              style={{
                width: 75,
                alignItems: "center",
                marginRight: 12,
              }}
            >
              <View
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 25,
                  padding: 3,
                  backgroundColor: "#D6AD55",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {status.type === "text" ? (
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 22,
                      backgroundColor:
                        status.background || "#101B35",
                      justifyContent: "center",
                      alignItems: "center",
                      padding: 7,
                    }}
                  >
                    <Text
                      numberOfLines={3}
                      style={{
                        color: "#FFFFFF",
                        fontSize: 9,
                        fontWeight: "800",
                        textAlign: "center",
                      }}
                    >
                      {status.text}
                    </Text>
                  </View>
                ) : status.type === "image" ? (
                  <Image
                    source={{
                      uri: status.media_url || "",
                    }}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 22,
                    }}
                    resizeMode="cover"
                  />
                ) : status.type === "audio" ? (
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 22,
                      backgroundColor: "#16845B",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 27 }}>🎤</Text>
                  </View>
                ) : (
                  <View
                    style={{
                      borderRadius: 22,
                      overflow: "hidden",
                    }}
                  >
                    <StatusVideo uri={status.media_url || ""} />
                  </View>
                )}
              </View>

              <Text
                numberOfLines={1}
                style={{
                  marginTop: 6,
                  width: 75,
                  textAlign: "center",
                  fontSize: 10,
                  color: "#39445A",
                  fontWeight: "700",
                }}
              >
                {status.profiles?.full_name || "User"}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* =====================================================
          🔵 CONVERSATION SECTION HEADING
          ===================================================== */}

      <View
        style={{
          paddingHorizontal: 19,
          paddingTop: 20,
          paddingBottom: 10,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View>
          <Text
            style={{
              fontSize: 19,
              fontWeight: "900",
              color: "#101B35",
            }}
          >
            Recent Conversations
          </Text>

          <Text
            style={{
              color: "#8992A3",
              fontSize: 11,
              marginTop: 3,
            }}
          >
            Your private and group chats
          </Text>
        </View>

        <View
          style={{
            backgroundColor: "#F5EBD5",
            paddingHorizontal: 11,
            paddingVertical: 7,
            borderRadius: 12,
          }}
        >
          <Text
            style={{
              color: "#96712D",
              fontSize: 11,
              fontWeight: "900",
            }}
          >
            {conversations.length}
          </Text>
        </View>
      </View>

      {/* =====================================================
          🟢 CHAT LIST
          ===================================================== */}

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.room_id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 14,
          paddingBottom: 30,
          flexGrow: 1,
        }}
        ListEmptyComponent={
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 45,
              paddingHorizontal: 30,
            }}
          >
            <View
              style={{
                width: 82,
                height: 82,
                borderRadius: 28,
                backgroundColor: "#E9EDF5",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 35 }}>💬</Text>
            </View>

            <Text
              style={{
                fontSize: 17,
                color: "#101B35",
                fontWeight: "900",
                marginTop: 16,
              }}
            >
              No conversations yet
            </Text>

            <Text
              style={{
                fontSize: 12,
                color: "#8992A3",
                textAlign: "center",
                marginTop: 7,
                lineHeight: 19,
              }}
            >
              Your conversations will appear here when you
              start connecting with people on Nasara.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.8}
            onLongPress={() =>
              deleteChat(item.room_id, item.chat_type)
            }
            onPress={() =>
              router.push({
                pathname:
                  item.chat_type === "group"
                    ? "/groups/[id]"
                    : "/chat/[id]",
                params: {
                  id: item.room_id,
                },
              })
            }
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 18,
              padding: 13,
              marginBottom: 9,
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1,
              borderColor: item.unread_count > 0
                ? "#E9D8B3"
                : "#EDF0F5",
              elevation: 1,
              shadowColor: "#101B35",
              shadowOpacity: 0.035,
              shadowRadius: 5,
            }}
          >
            {/* PROFILE IMAGE */}

            <View
              style={{
                width: 57,
                height: 57,
                borderRadius: 20,
                padding: 2,
                backgroundColor: item.unread_count > 0
                  ? "#D6AD55"
                  : "#E8ECF3",
                marginRight: 12,
              }}
            >
              <Image
                source={{
                  uri:
                    item.avatar_url ||
                    "https://ui-avatars.com/api/?name=User",
                }}
                style={{
                  width: 53,
                  height: 53,
                  borderRadius: 18,
                  backgroundColor: "#E8ECF3",
                }}
              />
            </View>

            {/* CHAT DETAILS */}

            <View
              style={{
                flex: 1,
                minWidth: 0,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 14,
                    fontWeight: item.unread_count > 0
                      ? "900"
                      : "800",
                    color: "#101B35",
                    flexShrink: 1,
                  }}
                >
                  {item.full_name}
                </Text>

                {item.chat_type === "group" && (
                  <View
                    style={{
                      backgroundColor: "#EEF1F8",
                      paddingHorizontal: 6,
                      paddingVertical: 3,
                      borderRadius: 6,
                      marginLeft: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 9,
                        color: "#52617D",
                        fontWeight: "800",
                      }}
                    >
                      GROUP
                    </Text>
                  </View>
                )}

                {item.verified && (
                  <Text
                    style={{
                      marginLeft: 5,
                      color: "#2876D2",
                      fontSize: 13,
                    }}
                  >
                    ✔️
                  </Text>
                )}
              </View>

              <Text
                numberOfLines={1}
                style={{
                  color: item.unread_count > 0
                    ? "#34415A"
                    : "#8992A3",
                  fontSize: 12,
                  marginTop: 6,
                  fontWeight: item.unread_count > 0
                    ? "700"
                    : "400",
                }}
              >
                {item.last_message}
              </Text>
            </View>

            {/* TIME AND UNREAD COUNT */}

            <View
              style={{
                alignItems: "flex-end",
                justifyContent: "center",
                marginLeft: 8,
              }}
            >
              {!!item.last_time && (
                <Text
                  style={{
                    fontSize: 10,
                    color: item.unread_count > 0
                      ? "#A47B2E"
                      : "#9AA2B1",
                    fontWeight: item.unread_count > 0
                      ? "800"
                      : "500",
                    marginBottom: 7,
                  }}
                >
                  {new Date(
                    item.last_time
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              )}

              {item.unread_count > 0 && (
                <View
                  style={{
                    minWidth: 22,
                    height: 22,
                    borderRadius: 11,
                    paddingHorizontal: 6,
                    backgroundColor: "#D6AD55",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#101B35",
                      fontSize: 10,
                      fontWeight: "900",
                    }}
                  >
                    {item.unread_count}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
      />

      {/* =====================================================
          🟡 STATUS PRIVACY MODAL
          ===================================================== */}

      <Modal
        visible={showWebPrivacyModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowWebPrivacyModal(false);
          setPendingMediaUri(null);
          setPendingMediaType(null);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(9,17,35,0.72)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 370,
              backgroundColor: "#FFFFFF",
              borderRadius: 24,
              padding: 23,
            }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 17,
                backgroundColor: "#F7EEDB",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 15,
              }}
            >
              <Text style={{ fontSize: 25 }}>🔐</Text>
            </View>

            <Text
              style={{
                fontSize: 21,
                fontWeight: "900",
                color: "#101B35",
              }}
            >
              Status Privacy
            </Text>

            <Text
              style={{
                color: "#8992A3",
                fontSize: 13,
                marginTop: 7,
                marginBottom: 22,
              }}
            >
              Choose who can view your status update.
            </Text>

            {/* PUBLIC */}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={async () => {
                setStatusVisibility("public");
                setShowWebPrivacyModal(false);

                if (!pendingMediaUri || !pendingMediaType) {
                  return;
                }

                try {
                  const {
                    data: { user },
                  } = await supabase.auth.getUser();

                  if (!user) return;

                  const uploadedUrl = await uploadFile(
                    pendingMediaUri,
                    pendingMediaType
                  );

                  const { error } = await (supabase as any)
                    .from("statuses")
                    .insert({
                      user_id: user.id,
                      type: pendingMediaType,
                      media_url: uploadedUrl,
                      visibility: "public",
                    });

                  if (error) {
                    throw error;
                  }

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
                backgroundColor: "#101B35",
                padding: 16,
                borderRadius: 14,
                marginBottom: 11,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 21, marginRight: 12 }}>
                🌍
              </Text>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontWeight: "900",
                    fontSize: 14,
                  }}
                >
                  Public
                </Text>

                <Text
                  style={{
                    color: "#B8C2D6",
                    fontSize: 11,
                    marginTop: 3,
                  }}
                >
                  Everyone can view your status
                </Text>
              </View>

              <Text style={{ color: "#D6AD55", fontSize: 19 }}>
                ›
              </Text>
            </TouchableOpacity>

            {/* FOLLOWERS */}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={async () => {
                setStatusVisibility("followers");
                setShowWebPrivacyModal(false);

                if (!pendingMediaUri || !pendingMediaType) {
                  return;
                }

                try {
                  const {
                    data: { user },
                  } = await supabase.auth.getUser();

                  if (!user) return;

                  const uploadedUrl = await uploadFile(
                    pendingMediaUri,
                    pendingMediaType
                  );

                  const { error } = await (supabase as any)
                    .from("statuses")
                    .insert({
                      user_id: user.id,
                      type: pendingMediaType,
                      media_url: uploadedUrl,
                      visibility: "followers",
                    });

                  if (error) {
                    throw error;
                  }

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
                backgroundColor: "#F3F5F9",
                padding: 16,
                borderRadius: 14,
                marginBottom: 15,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 21, marginRight: 12 }}>
                👥
              </Text>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: "#101B35",
                    fontWeight: "900",
                    fontSize: 14,
                  }}
                >
                  Followers
                </Text>

                <Text
                  style={{
                    color: "#8992A3",
                    fontSize: 11,
                    marginTop: 3,
                  }}
                >
                  Only people who follow you
                </Text>
              </View>

              <Text style={{ color: "#B58B37", fontSize: 19 }}>
                ›
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
                borderRadius: 13,
                borderWidth: 1,
                borderColor: "#E5E8EF",
              }}
            >
              <Text
                style={{
                  textAlign: "center",
                  color: "#687386",
                  fontWeight: "800",
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* =====================================================
          🟢 TEXT STATUS MODAL
          ===================================================== */}

      <Modal
        visible={showTextModal}
        animationType="slide"
        onRequestClose={() => setShowTextModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: selectedColor,
            padding: 22,
            justifyContent: "center",
          }}
        >
          <TouchableOpacity
            onPress={() => setShowTextModal(false)}
            style={{
              position: "absolute",
              top: Platform.OS === "ios" ? 60 : 30,
              right: 22,
              zIndex: 10,
              width: 43,
              height: 43,
              borderRadius: 15,
              backgroundColor: "rgba(255,255,255,0.18)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 23,
                fontWeight: "900",
              }}
            >
              ✕
            </Text>
          </TouchableOpacity>

          <Text
            style={{
              color: "rgba(255,255,255,0.7)",
              textAlign: "center",
              fontSize: 12,
              fontWeight: "800",
              letterSpacing: 2,
              marginBottom: 25,
            }}
          >
            NASARA STATUS
          </Text>

          <TextInput
            value={textStatus}
            onChangeText={setTextStatus}
            placeholder="What's on your mind?"
            placeholderTextColor="rgba(255,255,255,0.65)"
            multiline
            textAlignVertical="center"
            style={{
              color: "#FFFFFF",
              fontSize: 29,
              textAlign: "center",
              fontWeight: "800",
              minHeight: 150,
              paddingHorizontal: 10,
            }}
          />

          {/* BACKGROUND COLOURS */}

          <Text
            style={{
              color: "rgba(255,255,255,0.8)",
              fontSize: 12,
              fontWeight: "800",
              marginTop: 30,
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            CHOOSE BACKGROUND
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              justifyContent: "center",
              flexGrow: 1,
            }}
          >
            {colors.map((color) => (
              <TouchableOpacity
                key={color}
                onPress={() => setSelectedColor(color)}
                style={{
                  width: 43,
                  height: 43,
                  borderRadius: 15,
                  backgroundColor: color,
                  marginRight: 10,
                  borderWidth: selectedColor === color ? 3 : 1,
                  borderColor: "#FFFFFF",
                }}
              />
            ))}
          </ScrollView>

          {/* VISIBILITY */}

          <Text
            style={{
              color: "rgba(255,255,255,0.8)",
              fontSize: 12,
              fontWeight: "800",
              textAlign: "center",
              marginTop: 27,
              marginBottom: 12,
            }}
          >
            WHO CAN VIEW?
          </Text>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
            }}
          >
            <TouchableOpacity
              onPress={() => setStatusVisibility("public")}
              style={{
                backgroundColor: statusVisibility === "public"
                  ? "#FFFFFF"
                  : "rgba(255,255,255,0.18)",
                paddingVertical: 12,
                paddingHorizontal: 20,
                borderRadius: 13,
                marginRight: 9,
              }}
            >
              <Text
                style={{
                  color: statusVisibility === "public"
                    ? "#101B35"
                    : "#FFFFFF",
                  fontWeight: "900",
                }}
              >
                🌍 Public
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setStatusVisibility("followers")}
              style={{
                backgroundColor: statusVisibility === "followers"
                  ? "#FFFFFF"
                  : "rgba(255,255,255,0.18)",
                paddingVertical: 12,
                paddingHorizontal: 20,
                borderRadius: 13,
              }}
            >
              <Text
                style={{
                  color: statusVisibility === "followers"
                    ? "#101B35"
                    : "#FFFFFF",
                  fontWeight: "900",
                }}
              >
                👥 Followers
              </Text>
            </TouchableOpacity>
          </View>

          {/* POST STATUS */}

          <TouchableOpacity
            onPress={() => uploadStatus("text")}
            activeOpacity={0.85}
            style={{
              backgroundColor: "#D6AD55",
              padding: 17,
              borderRadius: 15,
              marginTop: 35,
            }}
          >
            <Text
              style={{
                textAlign: "center",
                color: "#101B35",
                fontWeight: "900",
                fontSize: 15,
              }}
            >
              POST STATUS
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}