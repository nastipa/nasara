import {
  AudioModule,
  RecordingPresets,
  useAudioPlayer,
  useAudioRecorder,
} from "expo-audio";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Speech from "expo-speech";

import {
  Stack,
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../../lib/supabase";

type Message = {
  id: number;
  group_id: string;
  sender_id: string;
  text: string | null;
  image_url: string | null;
  file_url: string | null;
  file_name: string | null;
  reaction: string | null;
  seen: boolean;
    seen_by?: string[];
  deleted_for_everyone?: boolean;
  created_at: string;
  reply_to?: number | null;
  reply_text?: string | null;
  audio_url?: string | null;
  audio_duration?: number | null;
  expires_at?: string | null;
  one_time_view?: boolean;
  secret_chat?: boolean;
  pinned?: boolean;
};

export default function GroupRoom() {
  const { id } = useLocalSearchParams();

  const roomId =
    typeof id === "string"
      ? id
      : "";

  const router = useRouter();

  const [messages, setMessages] =
    useState<Message[]>([]);
    const [showMembers, setShowMembers] =
  useState(false);
  const [updatingImage, setUpdatingImage] =
  useState(false);
  const [isMuted, setIsMuted] = useState(false);
const [isBlocked, setIsBlocked] = useState(false);

const [membersList, setMembersList] =
  useState<any[]>([]);
const [groupWallpaper, setGroupWallpaper] =
  useState("");
  const [text, setText] =
    useState("");

  const [userId, setUserId] =
    useState<string | null>(
      null
    );
    const [groupMenuVisible, setGroupMenuVisible] =
  useState(false);

const [wallpaperMenuVisible, setWallpaperMenuVisible] =
  useState(false);

  const [loading, setLoading] =
    useState(true);

  const [online, setOnline] =
    useState(false);

  const [typing, setTyping] =
    useState(false);

  const [groupName, setGroupName] =
    useState("Group");

  const [groupImage, setGroupImage] =
    useState("");

  const [membersCount, setMembersCount] =
    useState(0);

  const [memberMap, setMemberMap] =
    useState<any>({});
  const [isAdmin, setIsAdmin] =
  useState(false);
  
  const [isOwner, setIsOwner] =
  useState(false);

const [announcementMode, setAnnouncementMode] =
  useState(false);

const [inviteLink, setInviteLink] =
  useState("");

const [pinnedMessage, setPinnedMessage] =
  useState<any>(null);

const [joinRequests, setJoinRequests] =
  useState<any[]>([]);

const [mutedUsers, setMutedUsers] =
  useState<string[]>([]);

const [bannedUsers, setBannedUsers] =
  useState<string[]>([]);

const [showAddMembers, setShowAddMembers] =
  useState(false);

const [discoverUsers, setDiscoverUsers] =
  useState<any[]>([]);
  const [translatedMap, setTranslatedMap] =
    useState<any>({});

  const [
    translatedLangMessages,
    setTranslatedLangMessages,
  ] = useState<any>({});

  const [replyTo, setReplyTo] =
    useState<Message | null>(
      null
    );

  const [showSearch, setShowSearch] =
    useState(false);

  const [searchText, setSearchText] =
    useState("");

  const [oneTimeView, setOneTimeView] =
    useState(false);

  const [themeColor, setThemeColor] =
    useState("#22c55e");

  const [wallpaper, setWallpaper] =
    useState("");

  const [viewedImages, setViewedImages] =
    useState<number[]>([]);

  const [playingId, setPlayingId] =
    useState<number | null>(
      null
    );

  const [playbackRate, setPlaybackRate] =
  
    useState(1);
    const [showMembersModal, setShowMembersModal] =
  useState(false);

const [groupMembers, setGroupMembers] =
  useState<any[]>([]);

  const [recording, setRecording] =
    useState(false);

  const [recordingTime, setRecordingTime] =
    useState(0);

  const [secretMode, setSecretMode] =
    useState(false);

  const [expireMinutes, setExpireMinutes] =
    useState(5);

  const [
    editModalVisible,
    setEditModalVisible,
  ] = useState(false);

  const [editText, setEditText] =
    useState("");

  const [editId, setEditId] =
    useState<number | null>(
      null
    );

  const [deleteModal, setDeleteModal] =
    useState({
      visible: false,
      id: null as number | null,
    });

  const flatRef =
    useRef<FlatList<Message>>(null);

  const timerRef = useRef<any>(null);

  const recorder =
    useAudioRecorder(
      RecordingPresets.HIGH_QUALITY
    );

  const player =
    useAudioPlayer();

  /* ================= USER ================= */

  useEffect(() => {
    (async () => {
      const { data } =
        await (
          supabase as any
        ).auth.getUser();

      if (data.user) {
        setUserId(
          data.user.id
        );

        const {
          data: profile,
        } = await (
          supabase as any
        )
          .from("profiles")
          .select(
            "chat_theme, chat_wallpaper"
          )
          .eq(
            "id",
            data.user.id
          )
          .single();

        if (
          profile?.chat_theme
        ) {
          setThemeColor(
            profile.chat_theme
          );
        }

        if (
          profile?.chat_wallpaper
        ) {
          setWallpaper(
            profile.chat_wallpaper
          );
        }
      }
    })();
  }, []);

  useEffect(() => {
  markGroupMessagesRead();
}, []);

const markGroupMessagesRead = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await (supabase as any)
    .from("group_messages")
    .update({
      seen: true,
    })
    .eq("group_id", id)
    .neq("sender_id", user.id)
    .eq("seen", false);
};

  /* ================= GROUP INFO ================= */

 useEffect(() => {
  if (userId) {
    loadGroup();
  }
}, [roomId, userId]);
  const loadGroup =
    async () => {
      if (!roomId) return;

      const {
        data: group,
      } = await (
        supabase as any
      )
        .from("groups")
        .select("*")
        .eq("id", roomId)
        .single();
if (group) {
  
  setGroupName(
    group.name || "Group"
  );

  setGroupImage(
    group.image_url || ""
  );

  setGroupWallpaper(
  group?.wallpaper_url || ""
);
setAnnouncementMode(
  group.announcement_mode || false
);

setInviteLink(
  group.invite_link || ""
);

setIsOwner(
  String(group.owner_id) ===
  String(userId)
);
}

      const {
  data: members,
  error,
} = await (
  supabase as any
)
  .from("group_members")
  .select("*")
  .eq("group_id", roomId);

console.log("GROUP MEMBERS", members);
console.log("GROUP ERROR", error);

      if (members) {
       setMembersCount(members.length);

setMembersList(members);
        const mine = members.find(
  (m: any) =>
    String(m.user_id) ===
    String(userId)
);

setIsAdmin(
  mine?.role === "admin" ||
  mine?.role === "owner"
);

        const ids =
          members.map(
            (m: any) =>
              m.user_id
          );

        const {
          data: profiles,
        } = await (
          supabase as any
        )
          .from("profiles")
          .select(
            "id, full_name, avatar_url, verified"
          )
          .in("id", ids);

        const map: any = {};

        profiles?.forEach(
          (p: any) => {
            map[p.id] = p;
          }
        );
        const {
  data: discover,
} = await (supabase as any)
  .from("profiles")
  .select(`
    id,
    full_name,
    avatar_url
  `)
  .neq("id", userId);

setDiscoverUsers(discover || []);
        setMemberMap(map);

const merged =
  members.map((m: any) => ({
    ...m,
    profile: map[m.user_id],
  }));

setGroupMembers(merged);
      }
    };

  /* ================= FETCH MESSAGES ================= */

  const fetchMessages =
    async () => {
      if (!roomId) return;

      const { data } =
        await (
          supabase as any
        )
          .from("group_messages")
          .select("*")
          .eq(
            "group_id",
            roomId
          )
          .order(
            "created_at",
            {
              ascending: true,
            }
          );

      if (data) {
  const unique = data.filter(
    (
      item: any,
      index: number,
      self: any[]
    ) =>
      index ===
      self.findIndex(
        (m) => m.id === item.id
      )
  );

  setMessages(unique);
}

      setLoading(false);
    };

  useEffect(() => {
    fetchMessages();
  }, [roomId]);

 /* ================= REALTIME ================= */

useEffect(() => {
  if (!roomId) return;

  const channel = (supabase as any)
    .channel(`group-room-${roomId}`)

    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "group_messages",
        filter: `group_id=eq.${roomId}`,
      },
      (payload: any) => {
        const msg =
          payload.new as Message;

        setMessages((prev) => {
          const exists =
            prev.some(
              (m) =>
                m.id === msg.id
            );

          if (exists) {
            return prev;
          }

          const cleaned =
            prev.filter(
              (m) =>
                !(
                  m.id > 1000000000000 &&
                  m.sender_id ===
                    msg.sender_id &&
                  m.text ===
                    msg.text
                )
            );

          return [
            ...cleaned,
            msg,
          ];
        });

        setTimeout(() => {
          flatRef.current?.scrollToEnd({
            animated: true,
          });
        }, 100);
      }
    )

    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "group_messages",
        filter: `group_id=eq.${roomId}`,
      },
      (payload: any) => {
        const updated =
          payload.new as Message;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === updated.id
              ? updated
              : m
          )
        );
      }
    )

    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "group_messages",
        filter: `group_id=eq.${roomId}`,
      },
      (payload: any) => {
        const deletedId =
          payload.old.id;

        setMessages((prev) =>
          prev.filter(
            (m) =>
              m.id !== deletedId
          )
        );
      }
    )

    .subscribe((status: any) => {
      console.log(
        "GROUP REALTIME:",
        status
      );
    });

  return () => {
    (supabase as any)
      .removeChannel(channel);
  };
}, [roomId]);

useEffect(() => {
  if (!roomId || !userId)
    return;

  const channel =
    (supabase as any)
      .channel(
        `group-members-${roomId}`
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "group_members",
          filter: `group_id=eq.${roomId}`,
        },
        async () => {
          await loadGroup();
        }
      )

      .subscribe();

  return () => {
    (
      supabase as any
    ).removeChannel(
      channel
    );
  };
}, [roomId, userId]);


useEffect(() => {
  if (!roomId)
    return;

  const channel =
    (supabase as any)
      .channel(
        `groups-sync-${roomId}`
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "groups",
          filter: `id=eq.${roomId}`,
        },
        (
          payload: any
        ) => {
          const group =
            payload.new;

          if (!group)
            return;

          setGroupName(
            group.name ||
              "Group"
          );

          setGroupImage(
            group.image_url ||
              ""
          );

          setGroupWallpaper(
            group.wallpaper_url ||
              ""
          );
        }
      )

      .subscribe();

  return () => {
    (
      supabase as any
    ).removeChannel(
      channel
    );
  };
}, [roomId]);

useEffect(() => {
  if (
    !roomId ||
    !userId ||
    messages.length === 0
  ) {
    return;
  }

  const markMessagesSeen =
    async () => {
      try {
        const unseenMessages =
          messages.filter(
            (msg) =>
              msg.sender_id !==
                userId &&
              !(
                msg.seen_by || []
              ).includes(
                userId
              )
          );

        if (
          unseenMessages.length ===
          0
        ) {
          return;
        }

        for (const msg of unseenMessages) {
          const updatedSeenBy =
            [
              ...(msg.seen_by ||
                []),
              userId,
            ];

          const {
            data,
            error,
          } = await (
            supabase as any
          )
            .from(
              "group_messages"
            )
            .update({
              seen_by:
                updatedSeenBy,
            })
            .eq(
              "id",
              msg.id
            )
            .select();

          console.log(
            "SEEN UPDATE",
            msg.id,
            updatedSeenBy,
            data,
            error
          );
        }
      } catch (err) {
        console.log(
          "MARK SEEN ERROR",
          err
        );
      }
    };

  markMessagesSeen();
}, [
  messages,
  roomId,
  userId,
]);
  /* ================= UPLOAD ================= */

  const uploadToServer =
    async (
      uri: string,
      fileName?: string
    ) => {
      const formData =
        new FormData();

      const ext =
        fileName
          ?.split(".")
          .pop() || "jpg";

      let type =
        "image/jpeg";

      if (ext === "png")
        type =
          "image/png";

      if (ext === "pdf")
        type =
          "application/pdf";

      if (ext === "mp3")
        type =
          "audio/mpeg";

      if (ext === "m4a")
        type =
          "audio/mp4";

      if (Platform.OS === "web") {
        const response =
          await fetch(uri);

        const blob =
          await response.blob();

        formData.append(
          "file",
          blob,
          fileName ||
            `group-${Date.now()}.${ext}`
        );
      } else {
        formData.append(
          "file",
          {
            uri,
            name:
              fileName ||
              `group-${Date.now()}.${ext}`,
            type,
          } as any
        );
      }

      const res =
        await fetch(
          "https://nasara-upload-server.onrender.com/upload",
          {
            method: "POST",
            body: formData,
          }
        );

      const result =
        await res.json();

      let url =
        result?.url ||
        result?.file ||
        result?.path;

      if (!url)
        throw new Error(
          "Upload failed"
        );

      if (
        !url.startsWith(
          "http"
        )
      ) {
        url = `https://nasara-upload-server.onrender.com/${url}`;
      }

      return url;
    };

  /* ================= TRANSLATE ================= */

  const translateMessage =
    async (
      messageId: number,
      text: string,
      target: string
    ) => {
      try {
        const res =
          await fetch(
            "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" +
              target +
              "&dt=t&q=" +
              encodeURIComponent(
                text
              )
          );

        const data =
          await res.json();

        const translated =
          data?.[0]
            ?.map(
              (x: any) =>
                x[0]
            )
            ?.join(" ");

        setTranslatedMap(
          (
            prev: any
          ) => ({
            ...prev,
            [messageId]:
              translated,
          })
        );

        setTranslatedLangMessages(
          (
            prev: any
          ) => ({
            ...prev,
            [messageId]:
              target,
          })
        );
      } catch (e) {
        console.log(e);
      }
    };

  const speakTranslated =
    (
      messageId: number
    ) => {
      const text =
        translatedMap[
          messageId
        ];

      const lang =
        translatedLangMessages[
          messageId
        ];

      if (!text) return;

      Speech.speak(
        text,
        {
          language: lang,
          pitch: 1,
          rate: 0.9,
        }
      );
    };

  /* ================= AUDIO ================= */

  const playAudio =
    async (
      url: string,
      messageId: number
    ) => {
      if (
        playingId ===
        messageId
      ) {
        player.pause();

        setPlayingId(
          null
        );

        return;
      }

      player.replace({
        uri: url,
      });

      player.play();

      setPlayingId(
        messageId
      );
    };

  /* ================= TYPING ================= */

  const handleTyping = (
  value: string
) => {
  setText(value);
};

  /* ================= SEND TEXT ================= */

 const sendText = async () => {
  if (!text.trim() || !userId)
    return;
  if (
  announcementMode &&
  !isAdmin &&
  !isOwner
) {
  Alert.alert(
    "Only admins can send messages"
  );

  return;
}

  const messageText =
    text.trim();

  setText("");

  const tempId =
    Date.now();

  const optimisticMessage: Message =
    {
      id: tempId,
      group_id: roomId,
      sender_id: userId,
      text: messageText,
      image_url: null,
      file_url: null,
      file_name: null,
      reaction: null,
      seen: false,
      created_at:
        new Date().toISOString(),
    };

  setMessages((prev) => [
    ...prev,
    optimisticMessage,
  ]);

  setTimeout(() => {
    flatRef.current?.scrollToEnd(
      {
        animated: true,
      }
    );
  }, 100);

  try {
    const { data, error } =
      await (supabase as any)
        .from(
          "group_messages"
        )
        .insert({
          group_id: roomId,
          sender_id: userId,
          text: messageText,
        })
        .select()
        .single();

    if (error) {
      console.log(error);

      setMessages((prev) =>
        prev.filter(
          (m) =>
            m.id !== tempId
        )
      );

      Alert.alert(
        error.message
      );

      return;
    }

    if (data) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? data
            : m
        )
      );
    }

    setReplyTo(null);

  } catch (e) {
    console.log(e);

    setMessages((prev) =>
      prev.filter(
        (m) =>
          m.id !== tempId
      )
    );

    Alert.alert(
      "Failed to send"
    );
  }
};
  /* ================= SEND IMAGE ================= */

  const sendImage =
    async () => {
      const res =
        await ImagePicker.launchImageLibraryAsync(
          {
            quality: 0.8,
            mediaTypes:
              ImagePicker
                .MediaTypeOptions
                .Images,
          }
        );

      if (
        res.canceled ||
        !userId
      )
        return;

      const asset =
        res.assets[0];

      const tempId =
        Date.now();

      const tempMessage: Message =
        {
          id: tempId,
          group_id:
            roomId,
          sender_id:
            userId,
          text: null,
          image_url:
            asset.uri,
          file_url:
            null,
          file_name:
            null,
          reaction:
            null,
          seen: false,
          created_at:
            new Date().toISOString(),
        };

      setMessages(
        (prev) => [
          ...prev,
          tempMessage,
        ]
      );

      try {
        const uploadedUrl =
          await uploadToServer(
            asset.uri
          );

        const {
          data,
          error,
        } = await (
          supabase as any
        )
          .from(
            "group_messages"
          )
          .insert({
            group_id:
              roomId,
            sender_id:
              userId,
            image_url:
              uploadedUrl,
            one_time_view:
              oneTimeView,
            reply_to:
              replyTo?.id ||
              null,
            reply_text:
              replyTo?.text ||
              null,
          })
          .select()
          .single();

        if (error)
          throw error;

        if (data) {
          setMessages(
            (prev) =>
              prev.map(
                (m) =>
                  m.id ===
                  tempId
                    ? data
                    : m
              )
          );
        }

        setOneTimeView(
          false
        );

        setReplyTo(
          null
        );
      } catch {
        setMessages(
          (prev) =>
            prev.filter(
              (m) =>
                m.id !==
                tempId
            )
        );
      }
    };

  /* ================= CAMERA ================= */

  const sendCamera =
    async () => {
      const res =
        await ImagePicker.launchCameraAsync(
          {
            quality: 0.8,
            mediaTypes:
              ImagePicker
                .MediaTypeOptions
                .Images,
          }
        );

      if (
        res.canceled ||
        !userId
      )
        return;

      const asset =
        res.assets[0];

      const uploadedUrl =
        await uploadToServer(
          asset.uri
        );

      await (
        supabase as any
      )
        .from(
          "group_messages"
        )
        .insert({
          group_id:
            roomId,
          sender_id:
            userId,
          image_url:
            uploadedUrl,
        });
    };

  /* ================= FILE ================= */

  const sendFile =
    async () => {
      const res =
        await DocumentPicker.getDocumentAsync(
          {}
        );

      if (
        res.canceled ||
        !userId
      )
        return;

      const file =
        res.assets[0];

      const uploadedUrl =
        await uploadToServer(
          file.uri,
          file.name
        );

      await (
        supabase as any
      )
        .from(
          "group_messages"
        )
        .insert({
          group_id:
            roomId,
          sender_id:
            userId,
          file_url:
            uploadedUrl,
          file_name:
            file.name,
        });
    };

  /* ================= RECORDING ================= */

  const startRecording =
    async () => {
      try {
        const permission =
          await AudioModule.requestRecordingPermissionsAsync();

        if (
          !permission.granted
        ) {
          alert(
            "Microphone permission denied"
          );

          return;
        }

        await AudioModule.setAudioModeAsync(
          {
            allowsRecording: true,
            playsInSilentMode: true,
          }
        );

        await recorder.prepareToRecordAsync(
          RecordingPresets.HIGH_QUALITY
        );

        setRecordingTime(
          0
        );

        timerRef.current =
          setInterval(
            () => {
              setRecordingTime(
                (
                  p
                ) =>
                  p +
                  1
              );
            },
            1000
          );

        await recorder.record();

        setRecording(
          true
        );
      } catch (e) {
        console.log(e);
      }
    };

  const stopRecording =
    async () => {
      try {
        await recorder.stop();

        setRecording(
          false
        );

        clearInterval(
          timerRef.current
        );

        const uri =
          recorder.uri;

        if (
          !uri ||
          !userId
        )
          return;

        await AudioModule.setAudioModeAsync(
          {
            allowsRecording: false,
          }
        );

        const uploadedUrl =
          await uploadToServer(
            uri,
            Platform.OS ===
              "web"
              ? `voice-${Date.now()}.mp3`
              : `voice-${Date.now()}.m4a`
          );

        await (
          supabase as any
        )
          .from(
            "group_messages"
          )
          .insert({
            group_id:
              roomId,
            sender_id:
              userId,
            audio_url:
              uploadedUrl,
          });
      } catch (e) {
        console.log(e);
      }
    };
    /* ================= GROUP IMAGE ================= */

const changeGroupImage =
  async () => {
    try {
      if (!isAdmin) {
        Alert.alert(
          "Only admins can change group image"
        );

        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync(
          {
            mediaTypes:
              ImagePicker
                .MediaTypeOptions
                .Images,

            quality: 0.8,
          }
        );

      if (
        result.canceled
      ) {
        return;
      }

      const asset =
        result.assets[0];

      const uploadedUrl =
        await uploadToServer(
          asset.uri
        );

      const {
        error,
      } = await (
        supabase as any
      )
        .from("groups")
        .update({
          image_url:
            uploadedUrl,
        })
        .eq(
          "id",
          roomId
        );

      if (error) {
        console.log(
          error
        );

        Alert.alert(
          error.message
        );

        return;
      }

      setGroupImage(
        uploadedUrl
      );

      await loadGroup();

      Alert.alert(
        "Group image updated"
      );

    } catch (e) {
      console.log(e);

      Alert.alert(
        "Failed to update group image"
      );
    }
  };
/* ================= WALLPAPER ================= */

 const pickWallpaper =
  async () => {
    const res =
      await ImagePicker.launchImageLibraryAsync(
        {
          quality: 0.8,
          mediaTypes:
            ImagePicker
              .MediaTypeOptions
              .Images,
        }
      );

    if (
      res.canceled ||
      !userId
    )
      return;

    const asset =
      res.assets[0];

    const uploadedUrl =
      await uploadToServer(
        asset.uri
      );

    setWallpaperMenuVisible(
      true
    );

    (
      global as any
    ).pendingWallpaper =
      uploadedUrl;
  };
  /* ================= COPY ================= */

  const copyMessage =
    async (
      text: string
    ) => {
      await Clipboard.setStringAsync(
        text
      );
    };

  /* ================= REACTIONS ================= */

  const addReaction =
    async (
      id: number,
      emoji: string
    ) => {
      await (
        supabase as any
      )
        .from(
          "group_messages"
        )
        .update({
          reaction:
            emoji,
        })
        .eq("id", id);

      setMessages(
        (prev) =>
          prev.map((m) =>
            m.id === id
              ? {
                  ...m,
                  reaction:
                    emoji,
                }
              : m
          )
      );
    };
   const pinMessage = async (
  id: number
) => {
  await (supabase as any)
    .from("group_messages")
    .update({
      pinned: true,
    })
    .eq("id", id);

  fetchMessages();
};
  /* ================= DELETE ================= */

  const deleteForMe =
    (
      id: number
    ) => {
      setMessages(
        (prev) =>
          prev.filter(
            (m) =>
              m.id !== id
          )
      );

      setDeleteModal({
        visible: false,
        id: null,
      });
    };

  const deleteForEveryone =
    async (
      id: number
    ) => {
      await (
        supabase as any
      )
        .from(
          "group_messages"
        )
        .update({
          text:
            "🚫 This message was deleted",
          image_url:
            null,
          file_url:
            null,
          file_name:
            null,
          deleted_for_everyone:
            true,
        })
        .eq("id", id);

      fetchMessages();

      setDeleteModal({
        visible: false,
        id: null,
      });
    };

    
  /* ================= EDIT ================= */

  const openEdit =
    (
      item: Message
    ) => {
      setEditId(
        item.id
      );

      setEditText(
        item.text ?? ""
      );

      setEditModalVisible(
        true
      );
    };

  const saveEdit =
    async () => {
      if (!editId)
        return;

      await (
        supabase as any
      )
        .from(
          "group_messages"
        )
        .update({
          text: editText,
        })
        .eq(
          "id",
          editId
        );

      fetchMessages();

      setEditModalVisible(
        false
      );
    };

  /* ================= HELPERS ================= */

  const canEditMessage =
    (
      created_at: string
    ) => {
      const created =
        new Date(
          created_at
        ).getTime();

      const now =
        Date.now();

      return (
        now -
          created <=
        24 *
          60 *
          60 *
          1000
      );
    };

  const canDeleteForEveryone =
    (
      created_at: string
    ) => {
      const created =
        new Date(
          created_at
        ).getTime();

      const now =
        Date.now();

      return (
        now -
          created <=
        7 *
          24 *
          60 *
          60 *
          1000
      );
    };

  /* ================= EXPIRE ================= */

  useEffect(() => {
    const interval =
      setInterval(
        () => {
          setMessages(
            (
              prev
            ) =>
              prev.filter(
                (
                  m
                ) => {
                  if (
                    !m.expires_at
                  )
                    return true;

                  return (
                    new Date(
                      m.expires_at
                    ).getTime() >
                    Date.now()
                  );
                }
              )
          );
        },
        1000
      );

    return () =>
      clearInterval(
        interval
      );
  }, []);

  /* ================= SEARCH ================= */

  const filtered =
    showSearch
      ? messages.filter(
          (m) =>
            (
              m.text ??
              ""
            )
              .toLowerCase()
              .includes(
                searchText.toLowerCase()
              )
        )
      : messages;
      /* ================= ADD MEMBER ================= */
  const addMember = async (
  targetUserId: string
) => {
  try {
    const alreadyMember =
      membersList.some(
        (m: any) =>
          m.user_id === targetUserId
      );

    if (alreadyMember) {
      Alert.alert(
        "User already in group"
      );

      return;
    }

    const { error } =
      await (supabase as any)
        .from("group_members")
        .insert({
          group_id: roomId,
          user_id: targetUserId,
          role: "member",
        });

    if (error) {
      console.log(error);

      Alert.alert(error.message);

      return;
    }

    await (supabase as any)
      .from("group_messages")
      .insert({
        group_id: roomId,
        sender_id: userId,
        text: "👋 New member added",
      });

    loadGroup();

    Alert.alert(
      "Member added"
    );

  } catch (e) {
    console.log(e);
  }
};
/* ================= MAKE ADMIN ================= */
const makeAdmin = async (
  targetUserId: string
) => {
  try {
    const { error } =
      await (supabase as any)
        .from("group_members")
        .update({
          role: "admin",
        })
        .eq(
          "group_id",
          roomId
        )
        .eq(
          "user_id",
          targetUserId
        );

    if (error) {
      console.log(error);

      Alert.alert(
        "Failed"
      );

      return;
    }

    Alert.alert(
      "User is now admin"
    );

    loadGroup();

  } catch (e) {
    console.log(e);
  }
};
const doRemoveMember = async (
  targetUserId: string
) => {
  const { error } =
    await (supabase as any)
      .from("group_members")
      .delete()
      .eq("group_id", roomId)
      .eq(
        "user_id",
        targetUserId
      );

  console.log(
    "REMOVE ERROR",
    error
  );

  if (error) {
    Alert.alert(
      error.message
    );

    return;
  }

  await loadGroup();

  Alert.alert(
    "Member removed"
  );
};
/* ================= REMOVE MEMBER ================= */
const removeMember = async (
  targetUserId: string
) => {
  if (!isAdmin && !isOwner)
    return;

  let confirmed = false;

  if (Platform.OS === "web") {
    confirmed =
      window.confirm(
        "Remove this member?"
      );
  } else {
    Alert.alert(
      "Remove Member",
      "Remove this member?",
      [
        {
          text: "Cancel",
        },
        {
          text: "Remove",
          onPress: async () => {
            await doRemoveMember(
              targetUserId
            );
          },
        },
      ]
    );

    return;
  }

  if (confirmed) {
    await doRemoveMember(
      targetUserId
    );
  }
};
/* ================= BAN MEMBER ================= */

const banMember = async (
  targetUserId: string
) => {
  const { error } =
    await (supabase as any)
      .from("group_bans")
      .insert({
        group_id: roomId,
        user_id: targetUserId,
      });

  console.log(
    "BAN ERROR",
    error
  );

  if (error) {
    Alert.alert(
      error.message
    );

    return;
  }

  await doRemoveMember(
    targetUserId
  );

  Alert.alert(
    "Member banned"
  );
};
/* ================= INVITE CODE ================= */

const shareGroupLink = async () => {
  try {
    const { data, error } =
      await (supabase as any)
        .from("group_invites")
        .insert({
          group_id: roomId,
          invited_by: userId,
          status: "pending",
        })
        .select()
        .single();

    if (error) {
      Alert.alert(error.message);
      return;
    }

    const link =
      `https://nasara1.vercel.app/join/${data.id}`;

    await Share.share({
      message:
        `Join my Nasara group:\n${link}`,
    });
  } catch (e) {
    console.log(e);
    Alert.alert(
      "Failed to create invite"
    );
  }
};
/* ================= JOIN REQUESTS ================= */
  const joinGroup = async (
  groupId: string
) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data: existing } =
    await (supabase as any)
      .from("group_members")
      .select("*")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .maybeSingle();

  if (existing) return;

  await (supabase as any)
    .from("group_members")
    .insert({
      group_id: groupId,
      user_id: user.id,
      role: "member",
    });
};

/* ================= EXIT GROUP ================= */
const exitGroup = async () => {
  try {
    if (!userId) return;

    await supabase
      .from("group_members")
      .delete()
      .eq("group_id", roomId)
      .eq("user_id", userId);

    Alert.alert("You left the group");

    router.replace("/(tabs)/chat"); // adjust if needed
  } catch (e) {
    console.log(e);
  }
};
/* ================= MUTE GROUP ================= */
const toggleMuteGroup = () => {
  setIsMuted((prev) => !prev);

  Alert.alert(
    isMuted ? "Group unmuted" : "Group muted"
  );
};


  /* ================= TRANSFER OWNERSHIP ================= */
  const transferOwnership =
  async (
    targetUserId: string
  ) => {
    await (supabase as any)
      .from("groups")
      .update({
        owner_id:
          targetUserId,
      })
      .eq("id", roomId);

    await (supabase as any)
      .from("group_members")
      .update({
        role: "owner",
      })
      .eq(
        "group_id",
        roomId
      )
      .eq(
        "user_id",
        targetUserId
      );

    setIsOwner(false);

    loadGroup();

    Alert.alert(
      "Ownership transferred"
    );
  };
  /* ================= UI ================= */

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor:
            "#0f172a",
        }}
      >
        {!!(
  groupWallpaper ||
  wallpaper
) && (
          <Image
            source={{
              uri:
  groupWallpaper ||
  wallpaper,
            }}
            style={{
              position:
                "absolute",
              width: "100%",
              height: "100%",
            }}
            blurRadius={
              2
            }
          />
        )}

        <KeyboardAvoidingView
          style={{
            flex: 1,
          }}
          behavior={
            Platform.OS ===
            "ios"
              ? "padding"
              : "height"
          }
        >
          
          {/* ================= HEADER ================= */}

          <View
            style={{
              flexDirection:
                "row",
              alignItems:
                "center",
              padding: 15,
              backgroundColor:
                "#111827",
            }}
          >
            <TouchableOpacity
              onPress={() =>
                router.back()
              }
            >
              <Text
                style={{
                  color:
                    "#22c55e",
                  fontSize: 24,
                }}
              >
                ←
              </Text>
            </TouchableOpacity>

            
  <TouchableOpacity
  onPress={() =>
    setShowMembersModal(true)
  }

  onLongPress={() =>
    setGroupMenuVisible(true)
  }

  style={{
    marginLeft: 12,
  }}
>
  {!!groupImage ? (
    <Image
      source={{
        uri: groupImage,
      }}
      style={{
        width: 45,
        height: 45,
        borderRadius: 30,
      }}
    />
  ) : (
    <View
      style={{
        width: 45,
        height: 45,
        borderRadius: 30,
        backgroundColor:
          "#1f2937",
        justifyContent:
          "center",
        alignItems:
          "center",
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 18,
        }}
      >
        👥
      </Text>
    </View>
  )}
</TouchableOpacity>
<TouchableOpacity
  onPress={() => {
    setGroupMenuVisible(false);
    setTimeout(() => toggleMuteGroup(), 200);
  }}
  style={{ paddingVertical: 14 }}
>
  <Text style={{ color: "white", fontSize: 16 }}>
    🔇 {isMuted ? "Unmute Group" : "Mute Group"}
  </Text>
</TouchableOpacity>
<TouchableOpacity
  onPress={() => {
    setGroupMenuVisible(false);
    setTimeout(() => exitGroup(), 200);
  }}
  style={{ paddingVertical: 14 }}
>
  <Text style={{ color: "#ef4444", fontSize: 16 }}>
    🚪 Exit Group
  </Text>
</TouchableOpacity>

           <TouchableOpacity
  onPress={() =>
    setShowMembersModal(true)
  }
  style={{
    marginLeft: 12,
    flex: 1,
  }}
>
            </TouchableOpacity>
           {Boolean(isAdmin) && (
  <TouchableOpacity
    onPress={() =>
      setShowAddMembers(true)
    }
    style={{
      marginRight: 16,
    }}
  >
    <Text
      style={{
        color: "white",
        fontSize: 28,
      }}
    >
      ＋
    </Text>
  </TouchableOpacity>
)}
            <TouchableOpacity
              onPress={() =>
                setShowSearch(
                  !showSearch
                )
              }
            >
              <Text
                style={{
                  fontSize: 22,
                  color:
                    "white",
                }}
              >
                🔍
              </Text>
            </TouchableOpacity>
            
          </View>
           
          {/* ================= SEARCH ================= */}

          {showSearch && (
            <TextInput
              value={
                searchText
              }
              onChangeText={
                setSearchText
              }
              placeholder="Search..."
              placeholderTextColor="#9ca3af"
              style={{
                backgroundColor:
                  "#1f2937",
                color:
                  "white",
                margin: 10,
                borderRadius: 12,
                padding: 12,
              }}
            />
          )}

          {/* ================= THEME ================= */}

          <View
            style={{
              flexDirection:
                "row",
              alignItems:
                "center",
              paddingHorizontal: 12,
              paddingBottom: 8,
              backgroundColor:
                "#111827",
            }}
          >
            {[
              "#22c55e",
              "#3b82f6",
              "#ec4899",
              "#f59e0b",
              "#ef4444",
              "#8b5cf6",
            ].map(
              (c) => (
                <TouchableOpacity
                  key={c}
                  onPress={async () => {
                    setThemeColor(
                      c
                    );

                    await (
                      supabase as any
                    )
                      .from(
                        "profiles"
                      )
                      .update({
                        chat_theme:
                          c,
                      })
                      .eq(
                        "id",
                        userId
                      );
                  }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 20,
                    backgroundColor:
                      c,
                    marginRight: 10,
                  }}
                />
              )
            )}

            <TouchableOpacity
              onPress={
                pickWallpaper
              }
            >
              <Text
                style={{
                  color:
                    "white",
                  fontSize: 22,
                }}
              >
                🖼️
              </Text>
            </TouchableOpacity>
            

            <TouchableOpacity
              onPress={() =>
                setSecretMode(
                  !secretMode
                )
              }
              style={{
                marginLeft:
                  "auto",
                backgroundColor:
                  secretMode
                    ? "red"
                    : "#1f2937",
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 20,
              }}
            >
              <Text
                style={{
                  color:
                    "white",
                }}
              >
                {secretMode
                  ? "🔒 Secret"
                  : "💬 Normal"}
              </Text>
            </TouchableOpacity>
            
            
          </View>
          {/* ================= ANNOUNCEMENT ================= */}
              {announcementMode && (
  <View
    style={{
      backgroundColor:
        "#f59e0b",
      padding: 10,
    }}
  >
    <Text
      style={{
        color: "white",
        fontWeight: "bold",
        textAlign: "center",
      }}
    >
      📢 Announcement Mode
      (Admins Only)
    </Text>
  </View>
)}
 

 {/* ================= REPLY BAR ================= */}

          {replyTo && (
            <View
              style={{
                backgroundColor:
                  "#1f2937",
                padding: 10,
              }}
            >
              <Text
                style={{
                  color:
                    "#22c55e",
                }}
              >
                Replying to:{" "}
                {replyTo.text ||
                  "Photo"}
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setReplyTo(
                    null
                  )
                }
              >
                <Text
                  style={{
                    color:
                      "red",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ================= MESSAGES ================= */}

          <FlatList
            ref={flatRef}
            data={filtered}
            keyExtractor={(item, index) =>
  `${item.id}-${item.created_at}-${index}`
}
            contentContainerStyle={{
              padding: 10,
              paddingBottom: 120,
            }}
            renderItem={({
              item,
            }) => {
              const isMe =
                item.sender_id ===
                userId;

              const sender =
                memberMap[
                  item.sender_id
                ];

              return (
                <TouchableOpacity
                  activeOpacity={
                    0.9
                  }
                  onLongPress={() =>
                    setDeleteModal(
                      {
                        visible: true,
                        id: item.id,
                      }
                    )
                  }
                  onPress={() =>
                    setReplyTo(
                      item
                    )
                  }
                >
                  {/* ================= NAME ================= */}

                  {!isMe && (
                    <View
                      style={{
                        flexDirection:
                          "row",
                        alignItems:
                          "center",
                        marginBottom: 4,
                        marginLeft: 4,
                      }}
                    >
                      {!!sender?.avatar_url && (
                        <Image
                          source={{
                            uri: sender.avatar_url,
                          }}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 20,
                            marginRight: 6,
                          }}
                        />
                      )}

                      <View
  style={{
    flexDirection: "row",
    alignItems: "center",
  }}
>
  <Text
    style={{
      color: "#22c55e",
      fontWeight: "bold",
      fontSize: 12,
    }}
  >
    {sender?.full_name || "User"}
  </Text>

  {membersList.find(
    (m: any) =>
      m.user_id === item.sender_id &&
      (
        m.role === "admin" ||
        m.role === "owner"
      )
  ) && (
    <Text
      style={{
        color: "#facc15",
        marginLeft: 5,
        fontSize: 11,
        fontWeight: "bold",
      }}
    >
      ADMIN
    </Text>
  )}
</View>

                      {sender?.verified && (
                        <Text
                          style={{
                            marginLeft: 4,
                            color:
                              "#3b82f6",
                          }}
                        >
                          ✔️
                        </Text>
                      )}
                    </View>
                  )}

                  {/* ================= MESSAGE BOX ================= */}

                  <View
                    style={{
                      alignSelf:
                        isMe
                          ? "flex-end"
                          : "flex-start",

                      backgroundColor:
                        isMe
                          ? themeColor
                          : "#1f2937",

                      padding: 15,
                      marginVertical: 6,
                      borderRadius: 16,
                      maxWidth:
                        "92%",
                    }}
                  >
                    {/* ================= REPLY ================= */}

                    {item.reply_to && (
                      <TouchableOpacity
                        onPress={() => {
                          const index =
                            messages.findIndex(
                              (
                                m
                              ) =>
                                m.id ===
                                item.reply_to
                            );

                          if (
                            index !==
                            -1
                          ) {
                            flatRef.current?.scrollToIndex({
  index,
  animated: true,
  viewPosition: 0.5,
});

                          }
                        }}
                        style={{
                          backgroundColor:
                            "#111827",
                          padding: 8,
                          borderRadius: 8,
                          marginBottom: 6,
                          borderLeftWidth: 3,
                          borderLeftColor:
                            "#22c55e",
                        }}
                      >
                        <Text
                          style={{
                            color:
                              "#9ca3af",
                            fontSize: 12,
                          }}
                        >
                          Reply
                        </Text>

                        <Text
                          style={{
                            color:
                              "white",
                          }}
                        >
                          {item.reply_text ||
                            "Message"}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* ================= TEXT ================= */}

                    {item.text && (
                      <>
                        <Text
                          style={{
                            color:
                              isMe
                                ? "#000"
                                : "#fff",
                          }}
                        >
                          {item.text}
                        </Text>
                        {item.pinned && (
  <View
    style={{
      marginBottom: 6,
    }}
  >
    <Text
      style={{
        color: "#facc15",
        fontWeight: "bold",
      }}
    >
      📌 Pinned Message
    </Text>
  </View>
)}

                        {/* ================= TRANSLATE ================= */}

                        <View
                          style={{
                            flexDirection:
                              "row",
                            flexWrap:
                              "wrap",
                            marginTop: 6,
                          }}
                        >
                          {[
                            {
                              label:
                                "Twi",
                              code:
                                "ak",
                            },
                            {
                              label:
                                "Hausa",
                              code:
                                "ha",
                            },
                            {
                              label:
                                "French",
                              code:
                                "fr",
                            },
                            {
                              label:
                                "Spanish",
                              code:
                                "es",
                            },
                            {
                              label:
                                "Arabic",
                              code:
                                "ar",
                            },
                          ].map(
                            (
                              lang
                            ) => (
                              <TouchableOpacity
                                key={
                                  lang.code
                                }
                                onPress={() =>
                                  translateMessage(
                                    item.id,
                                    item.text!,
                                    lang.code
                                  )
                                }
                                style={{
                                  backgroundColor:
                                    "#111827",
                                  paddingHorizontal: 8,
                                  paddingVertical: 4,
                                  borderRadius: 10,
                                  marginRight: 6,
                                  marginTop: 4,
                                }}
                              >
                                <Text
                                  style={{
                                    color:
                                      "white",
                                    fontSize: 11,
                                  }}
                                >
                                  {
                                    lang.label
                                  }
                                </Text>
                              </TouchableOpacity>
                            )
                          )}
                        </View>

                        {/* ================= TRANSLATED RESULT ================= */}

                        {translatedMap[
                          item.id
                        ] && (
                          <View
                            style={{
                              marginTop: 8,
                              backgroundColor:
                                "#0f172a",
                              padding: 10,
                              borderRadius: 10,
                            }}
                          >
                            <Text
                              style={{
                                color:
                                  "#22c55e",
                                fontSize: 12,
                                marginBottom: 6,
                                fontWeight:
                                  "bold",
                              }}
                            >
                              🌍 Translation
                            </Text>

                            <Text
                              style={{
                                color:
                                  "white",
                                marginBottom: 10,
                              }}
                            >
                              {
                                translatedMap[
                                  item.id
                                ]
                              }
                            </Text>

                            <View
                              style={{
                                flexDirection:
                                  "row",
                              }}
                            >
                              <TouchableOpacity
                                onPress={() =>
                                  speakTranslated(
                                    item.id
                                  )
                                }
                                style={{
                                  backgroundColor:
                                    "#22c55e",
                                  paddingHorizontal: 10,
                                  paddingVertical: 6,
                                  borderRadius: 10,
                                  marginRight: 8,
                                }}
                              >
                                <Text>
                                  🔊 Speak
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                onPress={() => {
                                  setTranslatedMap(
                                    (
                                      prev: any
                                    ) => {
                                      const copy =
                                        {
                                          ...prev,
                                        };

                                      delete copy[
                                        item.id
                                      ];

                                      return copy;
                                    }
                                  );
                                }}
                                style={{
                                  backgroundColor:
                                    "#ef4444",
                                  paddingHorizontal: 10,
                                  paddingVertical: 6,
                                  borderRadius: 10,
                                }}
                              >
                                <Text
                                  style={{
                                    color:
                                      "white",
                                  }}
                                >
                                  ✖️
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </>
                    )}

                    {/* ================= IMAGE ================= */}

                    {item.image_url && (
                      <>
                        {!viewedImages.includes(
                          item.id
                        ) ? (
                          <TouchableOpacity
                            onPress={() => {
                              if (
                                item.one_time_view
                              ) {
                                setViewedImages(
                                  (
                                    prev
                                  ) => [
                                    ...prev,
                                    item.id,
                                  ]
                                );
                              }
                            }}
                          >
                            <Image
                              source={{
                                uri: item.image_url,
                              }}
                              style={{
                                width: 250,
                                height: 250,
                                borderRadius: 12,
                                marginTop: 8,
                              }}
                            />

                            {item.one_time_view && (
                              <Text
                                style={{
                                  color:
                                    "yellow",
                                  marginTop: 4,
                                }}
                              >
                                👁️ One-time photo
                              </Text>
                            )}
                          </TouchableOpacity>
                        ) : (
                          <View
                            style={{
                              padding: 20,
                            }}
                          >
                            <Text
                              style={{
                                color:
                                  "gray",
                              }}
                            >
                              📸 Photo disappeared
                            </Text>
                          </View>
                        )}
                      </>
                    )}

                    {/* ================= FILE ================= */}

                    {item.file_url && (
                      <TouchableOpacity
                        onPress={() =>
                          Linking.openURL(
                            item.file_url!
                          )
                        }
                      >
                        <Text
                          style={{
                            color:
                              "#60a5fa",
                          }}
                        >
                          📎{" "}
                          {
                            item.file_name
                          }
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* ================= AUDIO ================= */}

                    {item.audio_url && (
                      <View>
                        <TouchableOpacity
                          onPress={() =>
                            playAudio(
                              item.audio_url!,
                              item.id
                            )
                          }
                          style={{
                            flexDirection:
                              "row",
                            alignItems:
                              "center",
                          }}
                        >
                          <Text
                            style={{
                              color:
                                "white",
                              marginRight: 10,
                            }}
                          >
                            {playingId ===
                            item.id
                              ? "⏸️"
                              : "▶️"}
                          </Text>

                          <View
                            style={{
                              flexDirection:
                                "row",
                              alignItems:
                                "flex-end",
                              height: 30,
                            }}
                          >
                            {[
                              8,
                              16,
                              10,
                              22,
                              14,
                              18,
                              9,
                            ].map(
                              (
                                h,
                                i
                              ) => (
                                <View
                                  key={
                                    i
                                  }
                                  style={{
                                    width: 4,
                                    height: h,
                                    backgroundColor:
                                      "white",
                                    marginRight: 3,
                                    borderRadius: 10,
                                  }}
                                />
                              )
                            )}
                          </View>

                          <TouchableOpacity
                            onPress={() => {
                              if (
                                playbackRate ===
                                1
                              ) {
                                setPlaybackRate(
                                  1.5
                                );
                              } else if (
                                playbackRate ===
                                1.5
                              ) {
                                setPlaybackRate(
                                  2
                                );
                              } else {
                                setPlaybackRate(
                                  1
                                );
                              }
                            }}
                            style={{
                              marginLeft: 10,
                            }}
                          >
                            <Text
                              style={{
                                color:
                                  "yellow",
                                fontWeight:
                                  "bold",
                              }}
                            >
                              {
                                playbackRate
                              }
                              x
                            </Text>
                          </TouchableOpacity>
                        </TouchableOpacity>
                      </View>
                    )}
                    {/* ================= COPY ================= */}

                    {item.text && (
                      <TouchableOpacity
                        onPress={() =>
                          copyMessage(
                            item.text!
                          )
                        }
                      >
                        <Text
                          style={{
                            color:
                              "#facc15",
                            marginTop: 6,
                          }}
                        >
                          Copy
                        </Text>
                      </TouchableOpacity>
                    )}
                    {/* ================= PIN ================= */}

{isAdmin && (
  <TouchableOpacity
    onPress={() =>
      pinMessage(item.id)
    }
  >
    <Text
      style={{
        color: "#facc15",
        marginTop: 6,
      }}
    >
      📌 Pin
    </Text>
  </TouchableOpacity>
)}

                    {/* ================= REACTIONS ================= */}

                    <View
                      style={{
                        flexDirection:
                          "row",
                        marginTop: 8,
                        flexWrap:
                          "wrap",
                      }}
                    >
                      {[
                        "❤️",
                        "😂",
                        "🔥",
                        "👍",
                        "😮",
                      ].map(
                        (
                          emoji
                        ) => (
                          <TouchableOpacity
                            key={
                              emoji
                            }
                            onPress={() =>
                              addReaction(
                                item.id,
                                emoji
                              )
                            }
                            style={{
                              marginRight: 10,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 18,
                              }}
                            >
                              {
                                emoji
                              }
                            </Text>
                          </TouchableOpacity>
                        )
                      )}
                    </View>

                    {!!item.reaction && (
                      <Text
                        style={{
                          marginTop: 6,
                          fontSize: 18,
                        }}
                      >
                        {
                          item.reaction
                        }
                      </Text>
                    )}

                    {/* ================= EDIT ================= */}

                    {isMe &&
                      canEditMessage(
                        item.created_at
                      ) &&
                      !item.deleted_for_everyone && (
                        <TouchableOpacity
                          onPress={() =>
                            openEdit(
                              item
                            )
                          }
                        >
                          <Text
                            style={{
                              color:
                                "#facc15",
                              marginTop: 6,
                            }}
                          >
                            Edit
                          </Text>
                        </TouchableOpacity>
                      )}

                    {/* ================= DELETE ================= */}

                    {isMe &&
                      canDeleteForEveryone(
                        item.created_at
                      ) && (
                        <TouchableOpacity
                          onPress={() =>
                            setDeleteModal(
                              {
                                visible: true,
                                id: item.id,
                              }
                            )
                          }
                        >
                          <Text
                            style={{
                              color:
                                "#f87171",
                              marginTop: 6,
                            }}
                          >
                            Delete
                          </Text>
                        </TouchableOpacity>
                      )}

                    {/* ================= EXPIRE ================= */}

                    {item.expires_at && (
                      <Text
                        style={{
                          color:
                            "yellow",
                          fontSize: 10,
                          marginTop: 5,
                        }}
                      >
                        ⏳ Disappears soon
                      </Text>
                    )}

                    {/* ================= TIME ================= */}

                    <Text
                      style={{
                        fontSize: 10,
                        marginTop: 8,
                        color:
                          isMe
                            ? "#000"
                            : "#fff",
                      }}
                    >
                      {new Date(
                        item.created_at
                      ).toLocaleTimeString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />

          {/* ================= INPUT ================= */}

          <View
            style={{
              flexDirection:
                "row",
              padding: 12,
              backgroundColor:
                "#111827",
              alignItems:
                "center",
            }}
          >
            <TouchableOpacity
              onPress={
                sendImage
              }
            >
              <Text
                style={{
                  fontSize: 22,
                }}
              >
                🖼️
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={
                sendCamera
              }
              style={{
                marginLeft: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 22,
                }}
              >
                📷
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={
                sendFile
              }
              style={{
                marginLeft: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 22,
                }}
              >
                📎
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                setOneTimeView(
                  !oneTimeView
                )
              }
              style={{
                marginLeft: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  color:
                    oneTimeView
                      ? "#22c55e"
                      : "white",
                }}
              >
                👁️
              </Text>
            </TouchableOpacity>

            {recording && (
              <View
                style={{
                  marginRight: 10,
                  backgroundColor:
                    "red",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                }}
              >
                <Text
                  style={{
                    color:
                      "white",
                  }}
                >
                  🔴{" "}
                  {
                    recordingTime
                  }
                  s
                </Text>
              </View>
            )}

           <TextInput
  value={text}

  onChangeText={(value) =>
    handleTyping(value)
  }

  onFocus={async () => {
    const channel =
      (supabase as any)
        .channel(
          `group_${roomId}`
        );

    await channel.send({
      type: "broadcast",
      event: "typing",
      payload: {
        sender_id: userId,
        typing: true,
      },
    });
  }}

  onBlur={async () => {
    const channel =
      (supabase as any)
        .channel(
          `group_${roomId}`
        );

    await channel.send({
      type: "broadcast",
      event: "typing",
      payload: {
        sender_id: userId,
        typing: false,
      },
    });
  }}

  placeholder="Type message..."
  placeholderTextColor="#9ca3af"
  multiline
  style={{
    flex: 1,
    marginLeft: 10,
    backgroundColor:
      "#1f2937",
    color:
      "#fff",
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 10,
  }}
/>

            <TouchableOpacity
              onPress={
                recording
                  ? stopRecording
                  : startRecording
              }
              style={{
                marginLeft: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 24,
                }}
              >
                {recording
                  ? "⏹️"
                  : "🎤"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={
                sendText
              }
              style={{
                marginLeft: 10,
              }}
            >
              <Text
                style={{
                  color:
                    "#22c55e",
                  fontWeight:
                    "bold",
                }}
              >
                Send
              </Text>
            </TouchableOpacity>
          </View>

          {/* ================= DELETE MODAL ================= */}

          <Modal
            visible={
              deleteModal.visible
            }
            transparent
            animationType="fade"
          >
            <View
              style={{
                flex: 1,
                justifyContent:
                  "center",
                alignItems:
                  "center",
                backgroundColor:
                  "rgba(0,0,0,0.5)",
              }}
            >
              <View
                style={{
                  backgroundColor:
                    "#1f2937",
                  padding: 20,
                  borderRadius: 12,
                  width: "80%",
                }}
              >
                <TouchableOpacity
                  onPress={() =>
                    deleteForMe(
                      deleteModal.id!
                    )
                  }
                >
                  <Text
                    style={{
                      color:
                        "white",
                      marginBottom: 12,
                    }}
                  >
                    Delete for me
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    deleteForEveryone(
                      deleteModal.id!
                    )
                  }
                >
                  <Text
                    style={{
                      color:
                        "red",
                    }}
                  >
                    Delete for everyone
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    setDeleteModal(
                      {
                        visible: false,
                        id: null,
                      }
                    )
                  }
                >
                  <Text
                    style={{
                      color:
                        "#22c55e",
                      marginTop: 12,
                      textAlign:
                        "center",
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* ================= EDIT MODAL ================= */}

          <Modal
            visible={
              editModalVisible
            }
            transparent
            animationType="slide"
          >
            <View
              style={{
                flex: 1,
                justifyContent:
                  "center",
                alignItems:
                  "center",
                backgroundColor:
                  "rgba(0,0,0,0.6)",
              }}
            >
              <View
                style={{
                  backgroundColor:
                    "#1f2937",
                  padding: 20,
                  borderRadius: 12,
                  width: "90%",
                }}
              >
                <Text
                  style={{
                    color:
                      "white",
                    marginBottom: 12,
                  }}
                >
                  Edit Message
                </Text>

                <TextInput
                  value={
                    editText
                  }
                  onChangeText={
                    setEditText
                  }
                  style={{
                    backgroundColor:
                      "#111827",
                    color:
                      "white",
                    padding: 10,
                    borderRadius: 8,
                  }}
                />

                <View
                  style={{
                    flexDirection:
                      "row",
                    justifyContent:
                      "flex-end",
                    marginTop: 12,
                  }}
                >
                  <TouchableOpacity
                    onPress={() =>
                      setEditModalVisible(
                        false
                      )
                    }
                  >
                    <Text
                      style={{
                        color:
                          "#f87171",
                        marginRight: 12,
                      }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={
                      saveEdit
                    }
                  >
                    <Text
                      style={{
                        color:
                          "#22c55e",
                      }}
                    >
                      Save
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
        <Modal
  visible={showAddMembers}
  animationType="slide"
>
  <SafeAreaView
    style={{
      flex: 1,
      backgroundColor: "#0f172a",
      padding: 20,
    }}
  >
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 22,
          fontWeight: "bold",
        }}
      >
        Add Members
      </Text>

      <TouchableOpacity
        onPress={() =>
          setShowAddMembers(false)
        }
      >
        <Text
          style={{
            color: "#ef4444",
            fontSize: 18,
          }}
        >
          Close
        </Text>
      </TouchableOpacity>
    </View>

    <FlatList
      data={discoverUsers}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#1e293b",
            padding: 12,
            borderRadius: 14,
            marginBottom: 12,
          }}
        >
          <Image
            source={{
              uri:
                item.avatar_url ||
                "https://ui-avatars.com/api/?name=User",
            }}
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              marginRight: 12,
            }}
          />

          <View
            style={{
              flex: 1,
            }}
          >
            <Text
              style={{
                color: "white",
                fontWeight: "bold",
              }}
            >
              {item.full_name}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() =>
              addMember(item.id)
            }
            style={{
              backgroundColor: "#22c55e",
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 10,
              marginRight: 10,
            }}
          >
            <Text
              style={{
                color: "black",
                fontWeight: "bold",
              }}
            >
              Add
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              makeAdmin(item.id)
            }
            style={{
              backgroundColor: "#2563eb",
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 10,
            }}
          >
            <Text
              style={{
                color: "white",
                fontWeight: "bold",
              }}
            >
              Admin
            </Text>
          </TouchableOpacity>
        </View>
      )}
    />
  </SafeAreaView>
</Modal>

<Modal
  visible={showMembersModal}
  animationType="slide"
>
  <SafeAreaView
    style={{
      flex: 1,
      backgroundColor: "#0f172a",
      padding: 20,
    }}
  >
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 22,
          fontWeight: "bold",
        }}
      >
        Group Members
      </Text>

      <TouchableOpacity
        onPress={() =>
          setShowMembersModal(false)
        }
      >
        <Text
          style={{
            color: "#ef4444",
            fontSize: 18,
          }}
        >
          Close
        </Text>
      </TouchableOpacity>
    </View>
    {isAdmin && (
  <TouchableOpacity
    onPress={async () => {
      const newValue =
        !announcementMode;

      const { error } =
        await (supabase as any)
          .from("groups")
          .update({
            announcement_mode:
              newValue,
          })
          .eq("id", roomId);

      if (!error) {
        setAnnouncementMode(
          newValue
        );
      }
    }}
    style={{
      backgroundColor:
        "#f59e0b",
      padding: 12,
      borderRadius: 10,
      marginTop: 10,
    }}
  >
    <Text
      style={{
        color: "white",
        fontWeight: "bold",
      }}
    >
      {announcementMode
        ? "Disable Announcement Mode"
        : "Enable Announcement Mode"}
    </Text>
  </TouchableOpacity>
)}

    <FlatList
      data={groupMembers}
      keyExtractor={(item) =>
  `${item.user_id}`
}
onScrollToIndexFailed={(info) => {
  setTimeout(() => {
    flatRef.current?.scrollToIndex({
      index: info.index,
      animated: true,
    });
  }, 500);
}}
      renderItem={({ item }) => (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#1e293b",
            padding: 12,
            borderRadius: 14,
            marginBottom: 12,
          }}
        >
          <Image
            source={{
              uri:
                item.profile?.avatar_url ||
                "https://ui-avatars.com/api/?name=User",
            }}
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              marginRight: 12,
            }}
          />

          <View
            style={{
              flex: 1,
            }}
          >
            <Text
              style={{
                color: "white",
                fontWeight: "bold",
              }}
            >
              {item.profile?.full_name ||
                "User"}
            </Text>

            <Text
              style={{
                color:
                  item.role === "admin"
                    ? "#22c55e"
                    : "#9ca3af",
                marginTop: 4,
              }}
            >
              {item.role}
            </Text>
          </View>

          {isAdmin &&
  item.user_id !== userId && (
    <View>
      {item.role !== "admin" && (
        <TouchableOpacity
          onPress={() =>
            makeAdmin(
              item.user_id
            )
          }
          style={{
            backgroundColor:
              "#2563eb",
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 10,
            marginBottom: 6,
          }}
        >
          <Text
            style={{
              color: "white",
              fontWeight: "bold",
            }}
          >
            Make Admin
          </Text>
        </TouchableOpacity>
      )}
       {isOwner &&
  item.user_id !== userId && (
    <TouchableOpacity
      onPress={() =>
        transferOwnership(
          item.user_id
        )
      }
      style={{
        backgroundColor:
          "#22c55e",
        padding: 8,
        borderRadius: 10,
        marginBottom: 6,
      }}
    >
      <Text
        style={{
          color: "black",
          fontWeight: "bold",
        }}
      >
        Transfer Ownership
      </Text>
    </TouchableOpacity>
)}


      <TouchableOpacity
        onPress={() =>
          removeMember(
            item.user_id
          )
        }
        style={{
          backgroundColor:
            "#f59e0b",
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 10,
          marginBottom: 6,
        }}
      >
        <Text
          style={{
            color: "white",
            fontWeight: "bold",
          }}
        >
          Remove
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() =>
          banMember(
            item.user_id
          )
        }
        style={{
          backgroundColor:
            "#ef4444",
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 10,
        }}
      >
        <Text
          style={{
            color: "white",
            fontWeight: "bold",
          }}
        >
          Ban
        </Text>
      </TouchableOpacity>
    </View>
)}
        </View>
      )}
    />
  </SafeAreaView>
</Modal>
<Modal
  visible={groupMenuVisible}
  transparent
  animationType="fade"
>
  <View
    style={{
      flex: 1,
      justifyContent:
        "center",
      alignItems:
        "center",
      backgroundColor:
        "rgba(0,0,0,0.6)",
    }}
  >
    <View
      style={{
        width: 280,
        backgroundColor:
          "#1f2937",
        borderRadius: 16,
        padding: 20,
      }}
    >
      <TouchableOpacity
        onPress={() => {
          setGroupMenuVisible(
            false
          );

          setTimeout(() => {
            setShowMembersModal(
              true
            );
          }, 200);
        }}
        style={{
          paddingVertical: 14,
        }}
      >
        <Text
          style={{
            color: "white",
            fontSize: 16,
          }}
        >
          👥 View Members
        </Text>
      </TouchableOpacity>
      

      <TouchableOpacity
        onPress={() => {
          setGroupMenuVisible(
            false
          );

          setTimeout(() => {
            changeGroupImage();
          }, 200);
        }}
        style={{
          paddingVertical: 14,
        }}
      >
        <Text
          style={{
            color: "white",
            fontSize: 16,
          }}
        >
          🖼️ Change Group Image
        </Text>
      </TouchableOpacity>
     

      <TouchableOpacity
        onPress={() =>
          setGroupMenuVisible(
            false
          )
        }
        style={{
          paddingVertical: 14,
        }}
      >
        <Text
          style={{
            color: "#ef4444",
            fontSize: 16,
          }}
        >
          Cancel
        </Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
<Modal
  visible={
    wallpaperMenuVisible
  }
  transparent
  animationType="fade"
>
  <View
    style={{
      flex: 1,
      justifyContent:
        "center",
      alignItems:
        "center",
      backgroundColor:
        "rgba(0,0,0,0.6)",
    }}
  >
    <View
      style={{
        width: 300,
        backgroundColor:
          "#1f2937",
        borderRadius: 16,
        padding: 20,
      }}
    >
      <TouchableOpacity
        onPress={async () => {
          const url =
            (
              global as any
            )
              .pendingWallpaper;

          await (
            supabase as any
          )
            .from(
              "profiles"
            )
            .update({
              chat_wallpaper:
                url,
            })
            .eq(
              "id",
              userId
            );

          setWallpaper(
            url
          );

          setWallpaperMenuVisible(
            false
          );
        }}
        style={{
          paddingVertical: 14,
        }}
      >
        <Text
          style={{
            color: "white",
            fontSize: 16,
          }}
        >
          🙋 Only Me
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
  onPress={async () => {
    try {
      const url =
        (
          global as any
        )
          .pendingWallpaper;

      if (!isAdmin) {
        Alert.alert(
          "Only admins can change wallpaper"
        );

        return;
      }

      setWallpaperMenuVisible(
        false
      );

      const {
        error,
      } = await (
        supabase as any
      )
        .from(
          "groups"
        )
        .update({
          wallpaper_url:
            url,
        })
        .eq(
          "id",
          roomId
        );

      if (error) {
        console.log(
          error
        );

        Alert.alert(
          error.message
        );

        return;
      }

      setGroupWallpaper(
        url
      );

      await loadGroup();

      Alert.alert(
        "Wallpaper updated for everyone"
      );

    } catch (e) {
      console.log(e);

      Alert.alert(
        "Failed to update wallpaper"
      );
    }
  }}
  style={{
    paddingVertical: 14,
  }}
>
  <Text
    style={{
      color: "white",
      fontSize: 16,
    }}
  >
    👥 Everyone
  </Text>
</TouchableOpacity>


      <TouchableOpacity
        onPress={() =>
          setWallpaperMenuVisible(
            false
          )
        }
        style={{
          paddingVertical: 14,
        }}
      >
        <Text
          style={{
            color: "#ef4444",
            fontSize: 16,
          }}
        >
          Cancel
        </Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
      </SafeAreaView>
    </>
  );
}