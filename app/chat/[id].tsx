import {
  AudioModule,
  RecordingPresets,
  useAudioPlayer,
  useAudioRecorder,
} from "expo-audio";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import * as Speech from "expo-speech";

import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { useEffect, useRef, useState } from "react";

import {
  AppState,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


import { trackChatClick } from "../../lib/analytics";
import { supabase } from "../../lib/supabase";

type Message = {
  id: number;
  room_id: string;
  sender_id: string;
  text: string | null;
  image_url: string | null;
  file_url: string | null;
  file_name: string | null;
  reaction: string | null;
  seen: boolean;
  deleted_for_everyone?: boolean;
  created_at: string;
  reply_to?: number | null;
  reply_text?: string | null;
reply_audio_url?: string | null;
reply_image_url?: string | null;
  reply_status_id?: string | null;
  reply_status_type?: string | null;
  reply_status_text?: string | null;
 reply_status_media?: string | null;
  audio_url?: string | null;
audio_duration?: number | null;
expires_at?: string | null;
one_time_view?: boolean;
secret_chat?: boolean;
};

export default function ChatRoom() {
  const {
  id,

  reply_status_id,

  reply_status_type,

  reply_status_text,

  reply_status_media,
} = useLocalSearchParams();
  const roomId = typeof id === "string" ? id : "";
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);
  const [typing, setTyping] = useState(false);
  const [translatedMessages, setTranslatedMessages] =
  useState<{
    [key: number]: string;
  }>({});
  const [translatedLangMessages, setTranslatedLangMessages] =
  useState<any>({});
  const [
  receiverTyping,
  setReceiverTyping,
] = useState(false);
 const recorder =
  useAudioRecorder(
    RecordingPresets.HIGH_QUALITY
  );

const player =
  useAudioPlayer();
  

const [recording,
  setRecording] =
  useState(false);
  const timerRef = useRef<any>(null);
  const [secretMode, setSecretMode] =
  useState(false);
  const [translatedMap, setTranslatedMap] =
  useState<any>({});

const [expireMinutes, setExpireMinutes] =
  useState(5);

const [viewedImages, setViewedImages] =
  useState<number[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [oneTimeView, setOneTimeView] =
  useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editText, setEditText] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [receiverId, setReceiverId] = useState<string | null>(null);
  const [receiverName, setReceiverName] = useState("");
const [receiverVerified, setReceiverVerified] =
  useState(false);
  const [playingId, setPlayingId] =
  useState<number | null>(null);

const [playbackRate, setPlaybackRate] =
  useState(1);

const [recordingTime, setRecordingTime] =
  useState(0);

const [replyTo, setReplyTo] = useState<Message | null>(null);

const [lastSeen, setLastSeen] = useState("");
const [themeColor, setThemeColor] =
  useState("#22c55e");

const [wallpaper, setWallpaper] =
  useState("");

  const [deleteModal, setDeleteModal] = useState<{
    visible: boolean;
    id: number | null;
  }>({
    visible: false,
    id: null,
  });

  const flatRef = useRef<FlatList<Message>>(null);
  const [userVerifiedMap, setUserVerifiedMap] = useState<{
  [key: string]: boolean;
}>({});
const [
  replyingStatus,
  setReplyingStatus,
] = useState<any>(
  reply_status_id
    ? {
        id: reply_status_id,
        type:
          reply_status_type,
        text:
          reply_status_text,
        media:
          reply_status_media,
      }
    : null
);
/* ================= CHAT STATUS ================= */
const [musicStatus, setMusicStatus] =
  useState("");

const [moodStatus, setMoodStatus] =
  useState("");

const [emojiStatus, setEmojiStatus] =
  useState("😊");

const [showStatusModal, setShowStatusModal] =
  useState(false);
/* 🔊 AUTO PLAY */
const playAudio = async (
  url: string,
  messageId: number
) => {
  if (
    playingId ===
    messageId
  ) {
    player.pause();
    setPlayingId(null);
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
/* ================= TRANSLATE ================= */
const translateMessage = async (
  messageId: number,
  text: string,
  target: string
) => {
  try {
    const res = await fetch(
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" +
        target +
        "&dt=t&q=" +
        encodeURIComponent(text)
    );

    const data = await res.json();

    const translated =
      data?.[0]
        ?.map((x: any) => x[0])
        ?.join(" ");

    setTranslatedMap(
      (prev: any) => ({
        ...prev,
        [messageId]:
          translated,
      })
    );

    setTranslatedMap(
  (prev: any) => ({
    ...prev,
    [messageId]:
      translated,
  })
);

setTranslatedLangMessages(
  (prev: any) => ({
    ...prev,
    [messageId]: target,
  })
);
  } catch (e) {
    console.log(e);
  }
};

/* ================= SPEAK TRANSLATION ================= */
const speakTranslated = (
  messageId: number
) => {
  const text =
    translatedMap[messageId];

  const lang =
    translatedLangMessages[
      messageId
    ];

  if (!text) return;

  Speech.speak(text, {
    language: lang,
    pitch: 1,
    rate: 0.9,
  });
};
  /* ================= UPLOAD SERVER ================= */
  const uploadToServer = async (uri: string, fileName?: string) => {
    const formData = new FormData();

    const ext = fileName?.split(".").pop() || "jpg";

    let type = "image/jpeg";

    if (ext === "png")
  type = "image/png";

if (ext === "pdf")
  type =
    "application/pdf";

if (
  ext === "mp3"
) {
  type =
    "audio/mpeg";
}

if (
  ext === "m4a"
) {
  type =
    "audio/mp4";
}

if (
  ext === "webm"
) {
  type =
    "audio/webm";
}
   if (Platform.OS === "web") {
  const response = await fetch(uri);
  const blob = await response.blob();

  formData.append("file", blob, fileName || `chat-${Date.now()}.${ext}`);
} else {
  formData.append("file", {
    uri,
    name: fileName || `chat-${Date.now()}.${ext}`,
    type,
  } as any);
}

    const res = await fetch(
      "https://nasara-upload-server.onrender.com/upload",
      {
        method: "POST",
        body: formData,
      }
    );

    const result = await res.json();

    let url = result?.url || result?.file || result?.path;

    if (!url) throw new Error("Upload failed");

    if (!url.startsWith("http")) {
      url = `https://nasara-upload-server.onrender.com/${url}`;
    }

    return url;
  };

  /* ================= USER ================= */
  useEffect(() => {
  (async () => {
    const { data } =
      await (supabase as any)
        .auth.getUser();

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
  const getReceiver = async () => {
    if (!roomId || !userId) return;

    const { data } = await (supabase as any)
      .from("chat_participants")
      .select("user_id")
      .eq("room_id", roomId);

    if (data) {
      const other = data.find(
        (x: any) => x.user_id !== userId
      );

     if (other) {
  setReceiverId(other.user_id);

  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select(
  "full_name, verified, chat_theme, chat_wallpaper"
)
    .eq("id", other.user_id)
    .single();

 if (profile) {
  setReceiverName(
    profile.full_name || "User"
  );

  setReceiverVerified(
    profile.verified || false
  );

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
}
    }
  };

  getReceiver();
}, [roomId, userId]);

/* ================= CHAT CLICK TRACKING ================= */
useEffect(() => {
  const run = async () => {
    if (!userId || !roomId) return;

    try {
      await trackChatClick(userId);
    } catch (e) {
      console.log("trackChatClick error:", e);
    }
  };

  run();
}, [userId, roomId]);
/* ================= LOAD VERIFIED USERS ================= */
const loadVerifiedUsers = async () => {
  if (!messages.length) return;

  const uniqueIds = [
    ...new Set(messages.map((m) => m.sender_id)),
  ];

  const { data } = await (supabase as any)
    .from("profiles")
    .select("id, verified")
    .in("id", uniqueIds);

  if (data) {
    const map: any = {};

    data.forEach((u: any) => {
      map[u.id] = u.verified === true;
    });

    setUserVerifiedMap(map);
  }
};
  /* ================= FETCH ================= */
  const fetchMessages = async () => {
    if (!roomId || !userId) return;

    const { data } = await (supabase as any)
      .from("messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data);
    
      
  }

    await (supabase as any)
      .from("messages")
      .update({ seen: true })
      .eq("room_id", roomId)
      .neq("sender_id", userId);

    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
  }, [roomId, userId]);
   
// ✅ ADD THIS HERE
useEffect(() => {
  if (messages.length > 0) {
    loadVerifiedUsers();
  }
}, [messages]);
 /* ================= REALTIME + TYPING ================= */
useEffect(() => {
  if (!roomId) return;

  const channel = (supabase as any)
    .channel(`chat_${roomId}`)

    /* ================= NEW MESSAGE ================= */
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `room_id=eq.${roomId}`,
      },

      async (payload: any) => {
        try {
          const msg =
            payload.new as Message;

          /* ================= AVOID DUPLICATE ================= */
          setMessages((prev) => {
  const exists = prev.some(
    (m) => m.id === msg.id
  );

  if (exists) {
    return prev;
  }

  /* ✅ SECRET CHAT DELAY */
  let finalMessage = msg;

  if (
    msg.secret_chat &&
    msg.expires_at
  ) {
    const created =
      new Date(
        msg.created_at
      ).getTime();

    const expire =
      new Date(
        msg.expires_at
      ).getTime();

    const duration =
      expire - created;

    /* recreate proper expire time */
    finalMessage = {
      ...msg,
      expires_at:
        new Date(
          Date.now() +
            duration
        ).toISOString(),
    };
  }

  return [
    ...prev,
    finalMessage,
  ];
});

          /* ================= MARK SEEN ================= */
          if (
            msg.sender_id !==
            userId
          ) {
            await (
              supabase as any
            )
              .from("messages")
              .update({
                seen: true,
              })
              .eq(
                "id",
                msg.id
              );
          }

          /* ================= LOCAL PUSH ================= */
          if (
            msg.sender_id !==
              userId &&
            Platform.OS !==
              "web"
          ) {
            await Notifications.scheduleNotificationAsync(
              {
                content: {
                  title:
                    receiverName ||
                    "New Message",

                  body:
                    msg.text ||
                    "📩 Message",
                },

                trigger: null,
              }
            );
          }
        } catch (err) {
          console.log(
            "Realtime error:",
            err
          );
        }
      }
    )

    /* ================= TYPING ================= */
    .on(
      "broadcast",
      {
        event: "typing",
      },
      (payload: any) => {
        if (
          payload.payload
            .sender_id !==
          userId
        ) {
          setTyping(
            payload.payload
              .typing
          );
        }
      }
    )

    .subscribe();

  return () => {
    (
      supabase as any
    ).removeChannel(channel);
  };
}, [
  roomId,
  userId,
  receiverName,
]);

  /* ================= AUTO SCROLL ================= */
  useEffect(() => {
    flatRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  /* ================= ONLINE ================= */
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      setOnline(state === "active");
    });

    return () => sub.remove();
  }, []);

  /* ================= HANDLE TYPING ================= */
const handleTyping = async (
  value: string
) => {
  setText(value);

  const channel =
    (supabase as any).channel(
      `chat_${roomId}`
    );

  await channel.send({
    type: "broadcast",
    event: "typing",
    payload: {
      sender_id: userId,
      typing:
        value.length > 0,
    },
  });

  setTimeout(async () => {
    await channel.send({
      type: "broadcast",
      event: "typing",
      payload: {
        sender_id: userId,
        typing: false,
      },
    });
  }, 1200);
};
/* ================= SLASH REPLY ================= */
const handleSlashReply = (
  value: string
) => {
  if (
    value.startsWith(
      "/reply "
    )
  ) {
    const messageId =
      Number(
        value.replace(
          "/reply ",
          ""
        )
      );

    const target =
      messages.find(
        (m) =>
          m.id ===
          messageId
      );

    if (target) {
      setReplyTo(target);

      setText("");

      return;
    }
  }

  setText(value);
};
  /* ================= SEND TEXT ================= */
  const sendText = async () => {
    if (!text.trim() || !userId) return;

    const tempId = Date.now();
    const messageText = text.trim();

    const tempMessage: Message = {
      id: tempId,
      room_id: roomId,
      sender_id: userId,
      text: messageText,
      reply_to: replyTo?.id || null,
     reply_text: replyTo?.text || null,
reply_audio_url:
  replyTo?.audio_url || null,
reply_image_url:
  replyTo?.image_url || null,
      image_url: null,
      file_url: null,
      file_name: null,
      reaction: null,
      seen: false,
      created_at: new Date().toISOString(),
    };
setMessages((prev) => [...prev, tempMessage]);


setText("");

    try {
      const { data, error } = await (supabase as any)
        .from("messages")
        .insert({
  room_id: roomId,
  sender_id: userId,
  receiver_id: receiverId,
  text: messageText,

  reply_to: replyTo?.id || null,
  reply_text: replyTo?.text || null,
reply_audio_url:
  replyTo?.audio_url || null,
reply_image_url:
  replyTo?.image_url || null,
  reply_status_id:
    replyingStatus?.id || null,

  reply_status_type:
    replyingStatus?.type || null,

  reply_status_text:
    replyingStatus?.text || null,

  reply_status_media:
    replyingStatus?.media || null,

  expires_at: secretMode
    ? new Date(
        Date.now() +
          expireMinutes *
            60 *
            1000
      ).toISOString()
    : null,

  secret_chat: secretMode,
})
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setReplyingStatus(null);
      
        setMessages((prev) =>
         prev.map((m) =>
  m.id === tempId
    ? { ...data, image_url: data.image_url || m.image_url }
    : m
)
        );
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setReplyTo(null);
    }
  };

  /* ================= SEND IMAGE ================= */
  const sendImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (res.canceled || !userId) return;

    const asset = res.assets[0];
    const tempId = Date.now();

    const tempMessage: Message = {
      id: tempId,
      room_id: roomId,
      sender_id: userId,
      text: null,
      image_url: asset.uri,
      file_url: null,
      file_name: null,
      reaction: null,
      seen: false,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMessage]);
   

    try {
      const uploadedUrl = await uploadToServer(asset.uri);


      const { data, error } = await (supabase as any)
        .from("messages")
        .insert({
          room_id: roomId,
          sender_id: userId,
          receiver_id: receiverId,
          image_url: uploadedUrl,
          reply_to: replyTo?.id || null,
        reply_text: replyTo?.text || null,
reply_audio_url:
  replyTo?.audio_url || null,
reply_image_url:
  replyTo?.image_url || null,
         one_time_view:
  oneTimeView,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? data : m))
        );
      }
      setOneTimeView(false);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setReplyTo(null);
    }
  };

  /* ================= SEND CAMERA ================= */
  const sendCamera = async () => {
    const res = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (res.canceled || !userId) return;

    const asset = res.assets[0];
    const tempId = Date.now();

    const tempMessage: Message = {
      id: tempId,
      room_id: roomId,
      sender_id: userId,
      text: null,
      image_url: asset.uri,
      file_url: null,
      file_name: null,
      reaction: null,
      seen: false,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMessage]);
    

    try {
      const uploadedUrl = await uploadToServer(asset.uri);

      const { data, error } = await (supabase as any)
        .from("messages")
        .insert({
          room_id: roomId,
          sender_id: userId,
          receiver_id: receiverId,
          image_url: uploadedUrl,
          reply_to: replyTo?.id || null,
        reply_text: replyTo?.text || null,
reply_audio_url:
  replyTo?.audio_url || null,
reply_image_url:
  replyTo?.image_url || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? data : m))
        );
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setReplyTo(null);
    }
  };

  /* ================= SEND FILE ================= */
  const sendFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({});

    if (res.canceled || !userId) return;

    const file = res.assets[0];
    const tempId = Date.now();

    const tempMessage: Message = {
      id: tempId,
      room_id: roomId,
      sender_id: userId,
      text: null,
      image_url: null,
      file_url: file.uri,
      file_name: file.name,
      reaction: null,
      seen: false,
      created_at: new Date().toISOString(),
      
    };

    setMessages((prev) => [...prev, tempMessage]);
   

    try {
      const uploadedUrl = await uploadToServer(
        file.uri,
        file.name
      );

      const { data, error } = await (supabase as any)
        .from("messages")
        .insert({
          room_id: roomId,
          sender_id: userId,
          receiver_id: receiverId,
          file_url: uploadedUrl,
          file_name: file.name,
          reply_to: replyTo?.id || null,
        reply_text: replyTo?.text || null,
reply_audio_url:
  replyTo?.audio_url || null,
reply_image_url:
  replyTo?.image_url || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? data : m))
        );
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setReplyTo(null);
      
    }
  };
  
  /* ================= START RECORDING ================= */
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

      /* IMPORTANT FOR IOS + ANDROID */
      await AudioModule.setAudioModeAsync(
        {
          allowsRecording: true,
          playsInSilentMode: true,
        }
      );

      await recorder.prepareToRecordAsync(
        RecordingPresets.HIGH_QUALITY
      );
      setRecordingTime(0);

setRecordingTime(0);

timerRef.current = setInterval(() => {
  setRecordingTime((p) => p + 1);
}, 1000);
      await recorder.record();
      
      setRecording(true);
    } catch (e) {
      console.log(
        "record start error",
        e
      );
    }
  };
  /* ================= STOP RECORDING ================= */
const stopRecording =
  async () => {
    try {
      await recorder.stop();

      setRecording(false);
     clearInterval(timerRef.current);
      const uri =
        recorder.uri;

      if (!uri || !userId)
        return;

      /* RESTORE AUDIO MODE */
      await AudioModule.setAudioModeAsync(
        {
          allowsRecording: false,
        }
      );

      const uploadedUrl =
        await uploadToServer(
          uri,
          Platform.OS === "web"
  ? `voice-${Date.now()}.mp3`
  : `voice-${Date.now()}.m4a`
        );

      const {
        data,
        error,
      } = await (
        supabase as any
      )
        .from("messages")
        .insert({
  room_id: roomId,
  sender_id: userId,
  receiver_id: receiverId,
  audio_url: uploadedUrl,

  reply_to:
    replyTo?.id || null,

  reply_text:
    replyTo?.text || null,

  reply_audio_url:
    replyTo?.audio_url || null,

  reply_image_url:
    replyTo?.image_url || null,
})
        .select()
        .single();

      if (error)
        throw error;

      if (data) {
        setMessages(
          (prev) => [
            ...prev,
            data,
          ]
        );
      }
    } catch (e) {
      console.log(
        "record stop error",
        e
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

    if (res.canceled)
      return;

    const asset =
      res.assets[0];

    const uploadedUrl =
      await uploadToServer(
        asset.uri
      );

    /* SAVE WALLPAPER */
    await (
      supabase as any
    )
      .from("profiles")
      .update({
        chat_wallpaper:
          uploadedUrl,
      })
      .eq("id", userId);

    setWallpaper(
      uploadedUrl
    );
  };
  /* ================= TIME CHECKS ================= */
const canEditMessage = (created_at: string) => {
  const created = new Date(created_at).getTime();
  const now = Date.now();
  return now - created <= 24 * 60 * 60 * 1000;
};

const canDeleteForEveryone = (created_at: string) => {
  const created = new Date(created_at).getTime();
  const now = Date.now();
  return now - created <= 7 * 24 * 60 * 60 * 1000;
};

/* ================= COPY ================= */
const copyMessage = async (text: string) => {
  await Clipboard.setStringAsync(text);
};

useEffect(() => {
  if (!receiverId) return;

  const fetchLastSeen = async () => {
    const { data } = await (supabase as any)
      .from("profiles")
      .select("last_seen")
      .eq("id", receiverId)
      .single();

    if (data?.last_seen) {
      setLastSeen(data.last_seen);
    }
  };

  fetchLastSeen();
}, [receiverId]);

/* ================= SAVE LAST SEEN ================= */
useEffect(() => {
  if (!userId) return;

  const updateSeen = async () => {
    await (supabase as any)
      .from("profiles")
      .update({
        last_seen: new Date().toISOString(),
      })
      .eq("id", userId);
  };

  updateSeen();
}, [messages]);
/* ================= AUTO DELETE EXPIRE ================= */
useEffect(() => {
  const interval = setInterval(() => {
    setMessages((prev) =>
      prev.filter((m) => {
        if (!m.expires_at)
          return true;

        return (
          new Date(
            m.expires_at
          ).getTime() >
          Date.now()
        );
      })
    );
  }, 1000);

  return () =>
    clearInterval(interval);
}, []);
/* ================= REACTION ================= */
const addReaction = async (
  id: number,
  emoji: string
) => {
  await (supabase as any)
    .from("messages")
    .update({
      reaction: emoji,
    })
    .eq("id", id);

  setMessages((prev) =>
    prev.map((m) =>
      m.id === id
        ? {
            ...m,
            reaction: emoji,
          }
        : m
    )
  );
};

/* ================= DELETE ================= */
const deleteForMe = (id: number) => {
  setMessages((prev) =>
    prev.filter((m) => m.id !== id)
  );

  setDeleteModal({
    visible: false,
    id: null,
  });
};

const deleteForEveryone = async (
  id: number
) => {
  await (supabase as any)
    .from("messages")
    .update({
      text: "🚫 This message was deleted",
      image_url: null,
      file_url: null,
      file_name: null,
      deleted_for_everyone: true,
    })
    .eq("id", id);

  fetchMessages();

  setDeleteModal({
    visible: false,
    id: null,
  });
};

/* ================= EDIT ================= */
const openEdit = (item: Message) => {
  setEditId(item.id);
  setEditText(item.text ?? "");
  setEditModalVisible(true);
};

const saveEdit = async () => {
  if (!editId) return;

  await (supabase as any)
    .from("messages")
    .update({
      text: editText,
    })
    .eq("id", editId);

  fetchMessages();

  setEditModalVisible(false);
};
const filtered = showSearch
  ? messages.filter((m) =>
      (m.text ?? "")
        .toLowerCase()
        .includes(
          searchText.toLowerCase()
        )
    )
  : messages;

return (
  <>
    <Stack.Screen options={{ headerShown: false }} />

   <SafeAreaView
  style={{
    flex: 1,
    backgroundColor: "#0f172a",
  }}
>
  {!!wallpaper && (
    <Image
      source={{ uri: wallpaper }}
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
      }}
      blurRadius={2}
    />
  )}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* HEADER */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 15,
            backgroundColor: "#111827",
          }}
        >
          {showSearch && (
  <TextInput
    value={searchText}
    onChangeText={setSearchText}
    placeholder="Search..."
    placeholderTextColor="#9ca3af"
    style={{
      backgroundColor: "#1f2937",
      color: "white",
      margin: 10,
      borderRadius: 12,
      padding: 12,
    }}
  />
)}
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: "#22c55e", fontSize: 24 }}>←</Text>
          </TouchableOpacity>

          <View style={{ marginLeft: 12 }}>
            <View
  style={{
    flexDirection: "row",
    alignItems: "center",
  }}
>
  <Text
    style={{
      color: "white",
      fontSize: 18,
      fontWeight: "600",
    }}
  >
    {receiverName || "Chat"}
  </Text>

  {receiverVerified && (
  <Text
    style={{
      marginLeft: 6,
      color: "#3b82f6",
      fontSize: 16,
      fontWeight: "bold",
    }}
  >
    ✔️
  </Text>
)}
</View>
<View
  style={{
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: "#111827",
  }}
>
  {[
    "#22c55e",
    "#3b82f6",
    "#ec4899",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
  ].map((c) => (
    <TouchableOpacity
      key={c}
      onPress={async () => {
        setThemeColor(c);

        await (
          supabase as any
        )
          .from("profiles")
          .update({
            chat_theme: c,
          })
          .eq("id", userId);
      }}
      style={{
        width: 28,
        height: 28,
        borderRadius: 20,
        backgroundColor: c,
        marginRight: 10,
      }}
    />
  ))}

  <TouchableOpacity
    onPress={pickWallpaper}
    style={{
      marginLeft: 10,
    }}
  >
    <Text
      style={{
        color: "white",
        fontSize: 22,
      }}
    >
      🖼️
    </Text>
  </TouchableOpacity>
</View>
            {/* 🎵 CHAT STATUS */}
<View
  style={{
    marginTop: 4,
  }}
>
  {!!musicStatus && (
    <Text
      style={{
        color: "#22c55e",
        fontSize: 11,
      }}
    >
      🎵 {musicStatus}
    </Text>
  )}

  {!!moodStatus && (
    <Text
      style={{
        color: "#facc15",
        fontSize: 11,
      }}
    >
      💭 {moodStatus}
    </Text>
  )}

  {!!emojiStatus && (
    <Text
      style={{
        fontSize: 16,
      }}
    >
      {emojiStatus}
    </Text>
  )}
</View>
            <Text style={{ color: "#9ca3af", fontSize: 12 }}>
              {online
                ? "Online"
                : typing
                ? "Typing..."
                : lastSeen
                ? `Last seen ${new Date(
                    lastSeen
                  ).toLocaleTimeString()}`
                : "Offline"}
            </Text>
          </View>
        </View>
        {/* SEARCH */}
        <TouchableOpacity
  style={{ marginLeft: "auto" }}
  onPress={() =>
    setShowSearch(!showSearch)
  }
>
  <Text
    style={{
      color: "white",
      fontSize: 20,
    }}
  >
    🔍
  </Text>
</TouchableOpacity>

 {/* CHAT STATUS */}
  <TouchableOpacity
    onPress={() =>
      setShowStatusModal(true)
    }
    style={{
      marginRight: 12,
    }}
  >
    <Text
      style={{
        fontSize: 22,
      }}
    >
      🎵
    </Text>
  </TouchableOpacity>
{/* SECRET CHAT */}
<TouchableOpacity
  onPress={() =>
    setSecretMode(!secretMode)
  }
  style={{
    marginLeft: "auto",
    backgroundColor: secretMode
      ? "red"
      : "#1f2937",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  }}
>
  <Text style={{ color: "white" }}>
    {secretMode
      ? "🔒 Secret"
      : "💬 Normal"}
  </Text>
</TouchableOpacity>

        {/* REPLY BAR */}
        {replyTo && (
          <View
            style={{
              backgroundColor: "#1f2937",
              padding: 10,
            }}
          >
            <Text style={{ color: "#22c55e" }}>
              Replying to: {replyTo.text || "Photo"}
            </Text>

            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Text style={{ color: "red" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* STATUS REPLY BAR */}
{replyingStatus && (
  <View
    style={{
      backgroundColor: "#111827",
      padding: 10,
      borderLeftWidth: 4,
      borderLeftColor: "#22c55e",
      marginBottom: 8,
    }}
  >
    <Text
      style={{
        color: "#22c55e",
        fontWeight: "bold",
      }}
    >
      Replying to Status
    </Text>

    <Text
      style={{
        color: "white",
        marginTop: 4,
      }}
      numberOfLines={2}
    >
      {replyingStatus.text ||
        replyingStatus.type}
    </Text>

    <TouchableOpacity
      onPress={() =>
        setReplyingStatus(null)
      }
    >
      <Text
        style={{
          color: "red",
          marginTop: 5,
        }}
      >
        Cancel
      </Text>
    </TouchableOpacity>
  </View>
)}

        {/* MESSAGES */}
        <FlatList
          ref={flatRef}
          data={filtered}
          keyExtractor={(item, index) => item.id + "_" + index}
          contentContainerStyle={{
            padding: 10,
            paddingBottom: 100,
          }}
          renderItem={({ item }) => {
            const isMe = item.sender_id === userId;

            return (
              <TouchableOpacity
                activeOpacity={0.9}
                onLongPress={() =>
                  setDeleteModal({
                    visible: true,
                    id: item.id,
                  })
                }
                onPress={() => setReplyTo(item)}
              >
                {/* 🔵 VERIFIED BADGE (SENDER) */}
{userVerifiedMap[item.sender_id] && (
  <Text
    style={{
      fontSize: 10,
      color: "#3b82f6",
      marginBottom: 4,
      fontWeight: "bold",
    }}
  >
    ✔️ Verified
  </Text>
)}
                <View
                  style={{
                    alignSelf: isMe
                      ? "flex-end"
                      : "flex-start",
                    backgroundColor: isMe
  ? themeColor
  : "#1f2937",
                    padding: 15,
                    marginVertical: 6,
                    borderRadius: 16,
                    maxWidth: "90%",
                  }}
                >
                 {item.reply_to && (
  <TouchableOpacity
    onPress={() => {
      const index = messages.findIndex(
        (m) => m.id === item.reply_to
      );

      if (index !== -1) {
        flatRef.current?.scrollToIndex({
          index,
          animated: true,
        });
      }
    }}
    style={{
      backgroundColor: "#111827",
      padding: 8,
      borderRadius: 8,
      marginBottom: 6,
      borderLeftWidth: 3,
      borderLeftColor: "#22c55e",
    }}
  >
    <Text style={{ color: "#9ca3af", fontSize: 12 }}>
      Reply
    </Text>

    <Text style={{ color: "white" }}>
  {item.reply_text ||
    (item.reply_audio_url
      ? "🎤 Voice Note"
      : item.reply_image_url
      ? "📷 Photo"
      : "Message")}
</Text>
  </TouchableOpacity>
)} 
{item.reply_status_id && (
  <View
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
        color: "#22c55e",
        fontWeight: "bold",
      }}
    >
      Status Reply
    </Text>

    <Text
      style={{
        color: "white",
      }}
      numberOfLines={2}
    >
      {item.reply_status_text ||
        item.reply_status_type}
    </Text>
  </View>
)}

                 
                
                  {/* TEXT */}
{item.text && (
  <>
    <Text
      style={{
        color: isMe ? "#000" : "#fff",
      }}
    >
      {item.text}
    </Text>

    {/* 🌍 TRANSLATE BUTTONS */}
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        marginTop: 6,
      }}
    >
      {[
        {
          label: "Twi",
          code: "ak",
        },
        {
          label: "Hausa",
          code: "ha",
        },
        {
          label: "French",
          code: "fr",
        },
        {
          label: "Spanish",
          code: "es",
        },
        {
          label: "Arabic",
          code: "ar",
        },
      ].map((lang) => (
        <TouchableOpacity
          key={lang.code}
          onPress={() => {
  

  translateMessage(
    item.id,
    item.text!,
    lang.code
  );
}}
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
              color: "white",
              fontSize: 11,
            }}
          >
            {lang.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>

    {/* 🌍 TRANSLATED RESULT */}
{translatedMap[item.id] && (
  <View
    style={{
      marginTop: 8,
      backgroundColor: "#0f172a",
      padding: 10,
      borderRadius: 10,
    }}
  >
    <Text
      style={{
        color: "#22c55e",
        fontSize: 12,
        marginBottom: 6,
        fontWeight: "bold",
      }}
    >
      🌍 Translation
    </Text>

    <Text
      style={{
        color: "white",
        marginBottom: 10,
      }}
    >
      {translatedMap[item.id]}
    </Text>

    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <TouchableOpacity
        onPress={() =>
          speakTranslated(item.id)
        }
        style={{
          backgroundColor: "#22c55e",
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 10,
          marginRight: 8,
        }}
      >
        <Text
          style={{
            color: "black",
            fontWeight: "bold",
          }}
        >
          🔊 Speak
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          setTranslatedMap(
            (prev: any) => {
              const copy = {
                ...prev,
              };

              delete copy[item.id];

              return copy;
            }
          );
        }}
        style={{
          backgroundColor: "#ef4444",
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 10,
        }}
      >
        <Text
          style={{
            color: "white",
            fontWeight: "bold",
          }}
        >
          ✖️ Close
        </Text>
      </TouchableOpacity>
    </View>
  </View>
)}   
</>         
)}
                  {/* IMAGE */}
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
              (prev) => [
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
              color: "yellow",
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
            color: "gray",
          }}
        >
          📸 Photo disappeared
        </Text>
      </View>
    )}
  </>
)}
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
      color: oneTimeView
        ? "#22c55e"
        : "white",
    }}
  >
    👁️
  </Text>
</TouchableOpacity>
                  {/* FILE */}
                  {item.file_url && (
                    <TouchableOpacity
                      onPress={() =>
                        Linking.openURL(item.file_url!)
                      }
                    >
                      <Text style={{ color: "#60a5fa" }}>
                        📎 {item.file_name}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* COPY */}
                  {item.text && (
                    <TouchableOpacity
                      onPress={() =>
                        copyMessage(item.text!)
                      }
                    >
                      <Text
                        style={{
                          color: "#facc15",
                          marginTop: 6,
                        }}
                      >
                        Copy
                      </Text>
                    </TouchableOpacity>
                  )}
                 {/* AUDIO */}
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
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          color: "white",
          marginRight: 10,
        }}
      >
        {playingId === item.id
          ? "⏸️"
          : "▶️"}
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          height: 30,
        }}
      >
        {[8, 16, 10, 22, 14, 18, 9].map(
          (h, i) => (
            <View
              key={i}
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
            playbackRate === 1
          ) {
            setPlaybackRate(1.5);
          } else if (
            playbackRate === 1.5
          ) {
            setPlaybackRate(2);
          } else {
            setPlaybackRate(1);
          }
        }}
        style={{
          marginLeft: 10,
        }}
      >
        <Text
          style={{
            color: "yellow",
            fontWeight: "bold",
          }}
        >
          {playbackRate}x
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  </View>
)}

                  {/* EDIT */}
                  {isMe &&
                    canEditMessage(item.created_at) &&
                    !item.deleted_for_everyone && (
                      <TouchableOpacity
                        onPress={() => openEdit(item)}
                      >
                        <Text
                          style={{
                            color: "#facc15",
                            marginTop: 6,
                          }}
                        >
                          Edit
                        </Text>
                      </TouchableOpacity>
                    )}

                  {/* DELETE */}
                  {isMe &&
                    canDeleteForEveryone(
                      item.created_at
                    ) && (
                      <TouchableOpacity
                        onPress={() =>
                          setDeleteModal({
                            visible: true,
                            id: item.id,
                          })
                        }
                      >
                        <Text
                          style={{
                            color: "#f87171",
                            marginTop: 6,
                          }}
                        >
                          Delete
                        </Text>
                      </TouchableOpacity>
                    )}
                    {item.expires_at && (
  <Text
    style={{
      color: "yellow",
      fontSize: 10,
      marginTop: 5,
    }}
  >
    ⏳ Disappears soon
  </Text>
)}

                  {/* STATUS */}
                  <Text
                    style={{
                      fontSize: 10,
                      marginTop: 8,
                      color: isMe ? "#000" : "#fff",
                    }}
                  >
                    {new Date(
                      item.created_at
                    ).toLocaleTimeString()}
                  </Text>

                  {isMe && (
                    <Text
                      style={{
                        fontSize: 10,
                        marginTop: 2,
                        color: isMe ? "#000" : "#fff",
                      }}
                    >
                      {item.seen
                        ? "✓✓ Read"
                        : "✓ Delivered"}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />

        {/* INPUT */}
        <View
          style={{
            flexDirection: "row",
            padding: 12,
            backgroundColor: "#111827",
            alignItems: "center",
          }}
        >
          <TouchableOpacity onPress={sendImage}>
            <Text style={{ fontSize: 22 }}>🖼️</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={sendCamera}
            style={{ marginLeft: 10 }}
          >
            <Text style={{ fontSize: 22 }}>📷</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={sendFile}
            style={{ marginLeft: 10 }}
          >
            <Text style={{ fontSize: 22 }}>📎</Text>
          </TouchableOpacity>
           {recording && (
  <View
    style={{
      marginRight: 10,
      backgroundColor: "red",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    }}
  >
    <Text style={{ color: "white" }}>
      🔴 {recordingTime}s
    </Text>
  </View>
)}
          <TextInput
            value={text}
           onChangeText={(value) => {
  handleSlashReply(value);
  handleTyping(value);
}}
            placeholder="Type message..."
            placeholderTextColor="#9ca3af"
            multiline
            style={{
              flex: 1,
              marginLeft: 10,
              backgroundColor: "#1f2937",
              color: "#fff",
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
            onPress={sendText}
            style={{ marginLeft: 10 }}
          >
            <Text
              style={{
                color: "#22c55e",
                fontWeight: "bold",
              }}
            >
              Send
            </Text>
          </TouchableOpacity>
        </View>

        {/* DELETE MODAL */}
        <Modal
          visible={deleteModal.visible}
          transparent
          animationType="fade"
        >
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor:
                "rgba(0,0,0,0.5)",
            }}
          >
            <View
              style={{
                backgroundColor: "#1f2937",
                padding: 20,
                borderRadius: 12,
                width: "80%",
              }}
            >
              <TouchableOpacity
                onPress={() =>
                  deleteForMe(deleteModal.id!)
                }
              >
                <Text
                  style={{
                    color: "white",
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
                <Text style={{ color: "red" }}>
                  Delete for everyone
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  setDeleteModal({
                    visible: false,
                    id: null,
                  })
                }
              >
                <Text
                  style={{
                    color: "#22c55e",
                    marginTop: 12,
                    textAlign: "center",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* EDIT MODAL */}
        <Modal
          visible={editModalVisible}
          transparent
          animationType="slide"
        >
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor:
                "rgba(0,0,0,0.6)",
            }}
          >
            <View
              style={{
                backgroundColor: "#1f2937",
                padding: 20,
                borderRadius: 12,
                width: "90%",
              }}
            >
              <Text
                style={{
                  color: "white",
                  marginBottom: 12,
                }}
              >
                Edit Message
              </Text>

              <TextInput
                value={editText}
                onChangeText={setEditText}
                style={{
                  backgroundColor: "#111827",
                  color: "white",
                  padding: 10,
                  borderRadius: 8,
                }}
              />

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  marginTop: 12,
                }}
              >
                <TouchableOpacity
                  onPress={() =>
                    setEditModalVisible(false)
                  }
                >
                  <Text
                    style={{
                      color: "#f87171",
                      marginRight: 12,
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={saveEdit}
                >
                  <Text
                    style={{
                      color: "#22c55e",
                    }}
                  >
                    Save
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        {/* ================= STATUS MODAL ================= */}
<Modal
  visible={showStatusModal}
  transparent
  animationType="slide"
>
  <View
    style={{
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor:
        "rgba(0,0,0,0.6)",
    }}
  >
    <View
      style={{
        backgroundColor: "#1f2937",
        width: "90%",
        borderRadius: 20,
        padding: 20,
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 18,
          fontWeight: "bold",
          marginBottom: 20,
        }}
      >
        🎵 Chat Status
      </Text>

      {/* MUSIC */}
      <Text
        style={{
          color: "#22c55e",
          marginBottom: 6,
        }}
      >
        Current Song
      </Text>

      <TextInput
        value={musicStatus}
        onChangeText={setMusicStatus}
        placeholder="What are you listening to?"
        placeholderTextColor="#9ca3af"
        style={{
          backgroundColor: "#111827",
          color: "white",
          borderRadius: 12,
          padding: 12,
          marginBottom: 16,
        }}
      />

      {/* MOOD */}
      <Text
        style={{
          color: "#facc15",
          marginBottom: 6,
        }}
      >
        Mood
      </Text>

      <TextInput
        value={moodStatus}
        onChangeText={setMoodStatus}
        placeholder="Your mood..."
        placeholderTextColor="#9ca3af"
        style={{
          backgroundColor: "#111827",
          color: "white",
          borderRadius: 12,
          padding: 12,
          marginBottom: 16,
        }}
      />

      {/* EMOJI */}
      <Text
        style={{
          color: "white",
          marginBottom: 6,
        }}
      >
        Emoji Status
      </Text>

      <TextInput
        value={emojiStatus}
        onChangeText={setEmojiStatus}
        placeholder="😊"
        placeholderTextColor="#9ca3af"
        style={{
          backgroundColor: "#111827",
          color: "white",
          borderRadius: 12,
          padding: 12,
          marginBottom: 20,
          fontSize: 20,
        }}
      />

      <TouchableOpacity
        onPress={() =>
          setShowStatusModal(false)
        }
        style={{
          backgroundColor: "#22c55e",
          padding: 14,
          borderRadius: 14,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: "black",
            fontWeight: "bold",
          }}
        >
          Save Status
        </Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </>
)};