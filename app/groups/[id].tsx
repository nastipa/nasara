// 🔵 =====================================================
// 🔵 NASARA GROUP CHAT
// 🔵 Expo SDK 54 • Expo Audio • Supabase Realtime
// 🔵 Text • Images • Camera • Files • Voice Notes
// 🔵 Browser Push Notifications • Replies • Reactions
// 🔵 Translation • Admin • Members • Announcements
// 🔵 Wallpaper • Secret Mode • Message Management
// 🔵 =====================================================

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
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../../lib/supabase";

// 🔵 =====================================================
// 🔵 MESSAGE TYPE
// 🔵 =====================================================

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

// 🔵 =====================================================
// 🔵 COMPONENT
// 🔵 =====================================================

export default function GroupRoom() {
  const { id } = useLocalSearchParams();

  const roomId =
    typeof id === "string" ? id : "";

  const router = useRouter();

  // 🔵 =====================================================
  // 🔵 STATES
  // 🔵 =====================================================

  const [messages, setMessages] = useState<Message[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [updatingImage, setUpdatingImage] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const [membersList, setMembersList] = useState<any[]>([]);
  const [groupWallpaper, setGroupWallpaper] = useState("");
  const [text, setText] = useState("");

  const [userId, setUserId] = useState<string | null>(null);

  const [groupMenuVisible, setGroupMenuVisible] = useState(false);
  const [wallpaperMenuVisible, setWallpaperMenuVisible] = useState(false);

  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);
  const [typing, setTyping] = useState(false);

  const [groupName, setGroupName] = useState("Group");
  const [groupImage, setGroupImage] = useState("");
  const [membersCount, setMembersCount] = useState(0);

  const [memberMap, setMemberMap] = useState<any>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const [announcementMode, setAnnouncementMode] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [pinnedMessage, setPinnedMessage] = useState<any>(null);

  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [mutedUsers, setMutedUsers] = useState<string[]>([]);
  const [bannedUsers, setBannedUsers] = useState<string[]>([]);

  const [showAddMembers, setShowAddMembers] = useState(false);
  const [discoverUsers, setDiscoverUsers] = useState<any[]>([]);

  // 🟢 =====================================================
// 🟢 GROUP ADD MEMBERS - THREE SOURCES
// 🟢 =====================================================

type GroupMemberCandidate = {
  id: string;
  full_name: string | null;
  username?: string | null;
  avatar_url?: string | null;
  verified?: boolean;
};

const [contactUsers, setContactUsers] =
  useState<GroupMemberCandidate[]>([]);

const [followingUsers, setFollowingUsers] =
  useState<GroupMemberCandidate[]>([]);

const [activeMemberSource, setActiveMemberSource] =
  useState<"contacts" | "discover" | "following">("contacts");

const [memberSearch, setMemberSearch] = useState("");

const [loadingMemberSources, setLoadingMemberSources] =
  useState(false);

const [addingMemberIds, setAddingMemberIds] =
  useState<string[]>([]);

  const [translatedMap, setTranslatedMap] = useState<any>({});
  const [translatedLangMessages, setTranslatedLangMessages] = useState<any>({});

  const [replyTo, setReplyTo] = useState<Message | null>(null);

  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState("");

  const [oneTimeView, setOneTimeView] = useState(false);

  const [themeColor, setThemeColor] = useState("#22c55e");
  const [wallpaper, setWallpaper] = useState("");

  const [viewedImages, setViewedImages] = useState<number[]>([]);

  const [playingId, setPlayingId] = useState<number | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);

  const [showMembersModal, setShowMembersModal] = useState(false);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);

  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const [secretMode, setSecretMode] = useState(false);
  const [expireMinutes, setExpireMinutes] = useState(5);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editText, setEditText] = useState("");
  const [editId, setEditId] = useState<number | null>(null);

  const [deleteModal, setDeleteModal] = useState({
    visible: false,
    id: null as number | null,
  });

  const flatRef = useRef<FlatList<Message>>(null);
  const timerRef = useRef<any>(null);
  const pendingWallpaperRef = useRef<string | null>(null);

  const recorder = useAudioRecorder(
    RecordingPresets.HIGH_QUALITY
  );

  const player = useAudioPlayer();

  // 🔵 =====================================================
  // 🔵 USER PROFILE
  // 🔵 =====================================================

  useEffect(() => {
    let active = true;

    const loadCurrentUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || !active) return;

        setUserId(user.id);

        const { data: profile } = await (supabase as any)
          .from("profiles")
          .select("chat_theme, chat_wallpaper")
          .eq("id", user.id)
          .maybeSingle();

        if (!active) return;

        if (profile?.chat_theme) {
          setThemeColor(profile.chat_theme);
        }

        if (profile?.chat_wallpaper) {
          setWallpaper(profile.chat_wallpaper);
        }
      } catch (error) {
        console.log("GROUP USER ERROR:", error);
      }
    };

    loadCurrentUser();

    return () => {
      active = false;
    };
  }, []);

  // 🔵 =====================================================
  // 🔵 MARK GROUP MESSAGES READ
  // 🔵 =====================================================

  const markGroupMessagesRead = async () => {
    if (!roomId || !userId) return;

    try {
      await (supabase as any)
        .from("group_messages")
        .update({ seen: true })
        .eq("group_id", roomId)
        .neq("sender_id", userId)
        .eq("seen", false);
    } catch (error) {
      console.log("GROUP READ ERROR:", error);
    }
  };

  useEffect(() => {
    if (userId && roomId) {
      markGroupMessagesRead();
    }
  }, [roomId, userId]);

  // 🔵 =====================================================
  // 🔵 LOAD GROUP INFORMATION
  // 🔵 =====================================================

  const loadGroup = async () => {
    if (!roomId || !userId) return;

    try {
      const { data: group, error: groupError } = await (supabase as any)
        .from("groups")
        .select("*")
        .eq("id", roomId)
        .maybeSingle();

      if (groupError) {
        console.log("GROUP INFO ERROR:", groupError);
      }

      if (group) {
        setGroupName(group.name || "Group");
        setGroupImage(group.image_url || "");
        setGroupWallpaper(group.wallpaper_url || "");
        setAnnouncementMode(!!group.announcement_mode);
        setInviteLink(group.invite_link || "");

        setIsOwner(
          String(group.owner_id) === String(userId)
        );
      }

      const {
        data: members,
        error,
      } = await (supabase as any)
        .from("group_members")
        .select("*")
        .eq("group_id", roomId);

      console.log("GROUP MEMBERS:", members);
      console.log("GROUP MEMBERS ERROR:", error);

      if (error) {
        console.log("LOAD MEMBERS ERROR:", error);
        return;
      }

      const safeMembers = members || [];

      setMembersCount(safeMembers.length);
      setMembersList(safeMembers);

      const mine = safeMembers.find(
        (member: any) =>
          String(member.user_id) === String(userId)
      );

      setIsAdmin(
        mine?.role === "admin" ||
        mine?.role === "owner"
      );

      const ids = safeMembers.map(
        (member: any) => member.user_id
      );

      let profiles: any[] = [];

      if (ids.length > 0) {
        const { data, error: profilesError } = await (supabase as any)
          .from("profiles")
          .select("id, full_name, avatar_url, verified")
          .in("id", ids);

        if (profilesError) {
          console.log("GROUP PROFILES ERROR:", profilesError);
        }

        profiles = data || [];
      }

      const map: any = {};

      profiles.forEach((profile: any) => {
        map[profile.id] = profile;
      });

      setMemberMap(map);

      const { data: discover, error: discoverError } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, avatar_url")
        .neq("id", userId);

      if (discoverError) {
        console.log("DISCOVER USERS ERROR:", discoverError);
      }

      setDiscoverUsers(discover || []);

      const merged = safeMembers.map((member: any) => ({
        ...member,
        profile: map[member.user_id],
      }));

      setGroupMembers(merged);
    } catch (error) {
      console.log("LOAD GROUP ERROR:", error);
    }
  };

  useEffect(() => {
    if (userId && roomId) {
      loadGroup();
    }
  }, [roomId, userId]);

  // 🟢 =====================================================
// 🟢 LOAD MY CONTACTS
// 🟢 Uses Nasara's existing contacts API
// 🟢 =====================================================

const loadContactUsers = async () => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) return;

    const response = await fetch(
      "https://nasara-upload-server.onrender.com/contacts",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Could not load contacts");
    }

    const result = await response.json();

    const contacts = Array.isArray(result)
      ? result
      : result.contacts || [];

    const existingIds = new Set(
      groupMembers.map((member: any) => member.id)
    );

    setContactUsers(
      contacts.filter(
        (contact: GroupMemberCandidate) =>
          contact.id &&
          contact.id !== userId &&
          !existingIds.has(contact.id)
      )
    );
  } catch (error) {
    console.log("LOAD GROUP CONTACTS ERROR:", error);
  }
};

// 🟢 =====================================================
// 🟢 LOAD DISCOVER USERS
// 🟢 =====================================================

const loadDiscoverUsers = async () => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, verified")
      .neq("id", userId)
      .order("full_name", { ascending: true })
      .limit(200);

    if (error) throw error;

    const existingIds = new Set(
      groupMembers.map((member: any) => member.id)
    );

    setDiscoverUsers(
      (data || []).filter(
        (person: GroupMemberCandidate) =>
          !existingIds.has(person.id)
      )
    );
  } catch (error) {
    console.log("LOAD DISCOVER USERS ERROR:", error);
  }
};

// 🟢 =====================================================
// 🟢 LOAD PEOPLE I FOLLOW
// 🟢 =====================================================

const loadFollowingUsers = async () => {
  try {
    const { data: followsData, error: followsError } =
      await (supabase as any)
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId);

    if (followsError) throw followsError;

    const followingIds = [
      ...new Set(
        (followsData || [])
          .map((item: any) => item.following_id)
          .filter(Boolean)
      ),
    ];

    if (followingIds.length === 0) {
      setFollowingUsers([]);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, verified")
      .in("id", followingIds);

    if (error) throw error;

    const existingIds = new Set(
      groupMembers.map((member: any) => member.id)
    );

    setFollowingUsers(
      (data || []).filter(
        (person: GroupMemberCandidate) =>
          person.id !== userId &&
          !existingIds.has(person.id)
      )
    );
  } catch (error) {
    console.log("LOAD FOLLOWING USERS ERROR:", error);
  }
};

// 🟢 =====================================================
// 🟢 LOAD ALL THREE SOURCES
// 🟢 =====================================================

const loadAllMemberSources = async () => {
  if (!userId) return;

  setLoadingMemberSources(true);

  try {
    await Promise.all([
      loadContactUsers(),
      loadDiscoverUsers(),
      loadFollowingUsers(),
    ]);
  } finally {
    setLoadingMemberSources(false);
  }
};

  // 🔵 =====================================================
  // 🔵 FETCH MESSAGES
  // 🔵 =====================================================

  const fetchMessages = async () => {
    if (!roomId) return;

    try {
      const { data, error } = await (supabase as any)
        .from("group_messages")
        .select("*")
        .eq("group_id", roomId)
        .order("created_at", { ascending: true });

      if (error) {
        console.log("FETCH GROUP MESSAGES ERROR:", error);
        setLoading(false);
        return;
      }

      if (data) {
        const unique = data.filter(
          (item: any, index: number, self: any[]) =>
            index === self.findIndex((message) => message.id === item.id)
        );

        setMessages(unique);
      }

      setLoading(false);
    } catch (error) {
      console.log("FETCH MESSAGES ERROR:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [roomId]);

  // 🔵 =====================================================
  // 🔵 GROUP MESSAGE REALTIME
  // 🔵 =====================================================

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
          const msg = payload.new as Message;

          setMessages((prev) => {
            const exists = prev.some(
              (message) => message.id === msg.id
            );

            if (exists) return prev;

            const cleaned = prev.filter(
              (message) =>
                !(
                  message.id > 1000000000000 &&
                  message.sender_id === msg.sender_id &&
                  message.text === msg.text
                )
            );

            return [...cleaned, msg];
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
          const updated = payload.new as Message;

          setMessages((prev) =>
            prev.map((message) =>
              message.id === updated.id ? updated : message
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
          const deletedId = payload.old.id;

          setMessages((prev) =>
            prev.filter((message) => message.id !== deletedId)
          );
        }
      )
      .subscribe((status: any) => {
        console.log("GROUP REALTIME:", status);
      });

    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, [roomId]);

  // 🔵 =====================================================
  // 🔵 GROUP MEMBERS REALTIME
  // 🔵 =====================================================

  useEffect(() => {
    if (!roomId || !userId) return;

    const channel = (supabase as any)
      .channel(`group-members-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_members",
          filter: `group_id=eq.${roomId}`,
        },
        async () => {
          await loadGroup();
        }
      )
      .subscribe();

    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, [roomId, userId]);

  // 🔵 =====================================================
  // 🔵 GROUP INFORMATION REALTIME
  // 🔵 =====================================================

  useEffect(() => {
    if (!roomId) return;

    const channel = (supabase as any)
      .channel(`groups-sync-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "groups",
          filter: `id=eq.${roomId}`,
        },
        (payload: any) => {
          const group = payload.new;

          if (!group) return;

          setGroupName(group.name || "Group");
          setGroupImage(group.image_url || "");
          setGroupWallpaper(group.wallpaper_url || "");
          setAnnouncementMode(!!group.announcement_mode);
        }
      )
      .subscribe();

    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, [roomId]);

  // 🔵 =====================================================
  // 🔵 MARK INDIVIDUAL MESSAGES AS SEEN
  // 🔵 =====================================================

  useEffect(() => {
    if (!roomId || !userId || messages.length === 0) return;

    const markMessagesSeen = async () => {
      try {
        const unseenMessages = messages.filter(
          (message) =>
            message.sender_id !== userId &&
            !(message.seen_by || []).includes(userId)
        );

        if (unseenMessages.length === 0) return;

        for (const message of unseenMessages) {
          const updatedSeenBy = [
            ...(message.seen_by || []),
            userId,
          ];

          const { data, error } = await (supabase as any)
            .from("group_messages")
            .update({
              seen_by: updatedSeenBy,
            })
            .eq("id", message.id)
            .select();

          console.log(
            "GROUP SEEN UPDATE:",
            message.id,
            updatedSeenBy,
            data,
            error
          );
        }
      } catch (error) {
        console.log("MARK GROUP SEEN ERROR:", error);
      }
    };

    markMessagesSeen();
  }, [messages, roomId, userId]);

  // 🔵 =====================================================
  // 🔵 BROWSER PUSH NOTIFICATION
  // 🔵 =====================================================

  const notifyGroupMembers = async (
    messageId: number | string
  ) => {
    if (Platform.OS !== "web") return;

    if (!messageId) {
      console.log("GROUP PUSH SKIPPED: Missing message ID");
      return;
    }

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.log("GROUP PUSH SESSION ERROR:", sessionError);
        return;
      }

      if (!session?.access_token) {
        console.log("GROUP PUSH SKIPPED: No access token");
        return;
      }

      console.log("GROUP BROWSER PUSH START:", {
        messageId,
        groupId: roomId,
        senderId: userId,
      });

      const response = await fetch(
        "https://nasara-upload-server.onrender.com/group-browser-push",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            message_id: messageId,
          }),
        }
      );

      const responseText = await response.text();

      console.log("GROUP BROWSER PUSH STATUS:", response.status);
      console.log("GROUP BROWSER PUSH RESPONSE:", responseText);

      if (!response.ok) {
        console.log("GROUP BROWSER PUSH FAILED:", responseText);
        return;
      }

      try {
        console.log(
          "GROUP BROWSER PUSH RESULT:",
          JSON.parse(responseText)
        );
      } catch {
        console.log("GROUP BROWSER PUSH RESULT:", responseText);
      }
    } catch (error) {
      console.log("GROUP BROWSER PUSH ERROR:", error);
    }
  };

  // 🔵 =====================================================
  // 🔵 UPLOAD TO RENDER SERVER
  // 🔵 =====================================================

  const uploadToServer = async (
    uri: string,
    fileName?: string
  ) => {
    const formData = new FormData();

    const ext = (
      fileName?.split(".").pop() || "jpg"
    ).toLowerCase();

    let type = "image/jpeg";

    if (ext === "png") type = "image/png";
    if (ext === "pdf") type = "application/pdf";
    if (ext === "mp3") type = "audio/mpeg";
    if (ext === "m4a") type = "audio/mp4";
    if (ext === "webm") type = "audio/webm";

    if (Platform.OS === "web") {
      const response = await fetch(uri);
      const blob = await response.blob();

      formData.append(
        "file",
        blob,
        `fileName || group-${Date.now()}.${ext}`
      );
    } else {
      formData.append(
        "file",
        {
          uri,
          name: `fileName || group-${Date.now()}.${ext}`,
          type,
        } as any
      );
    }

    const response = await fetch(
      "https://nasara-upload-server.onrender.com/upload",
      {
        method: "POST",
        body: formData,
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error || "File upload failed"
      );
    }

    let url =
      result?.url ||
      result?.file ||
      result?.path;

    if (!url) {
      throw new Error("Upload failed: No file URL returned");
    }

    if (!url.startsWith("http")) {
      url = `https://nasara-upload-server.onrender.com/${url}`;
    }

    return url;
  };

  // 🔵 =====================================================
  // 🔵 TRANSLATION
  // 🔵 =====================================================

  const translateMessage = async (
    messageId: number,
    messageText: string,
    target: string
  ) => {
    try {
      const response = await fetch(
        "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" +
          target +
          "&dt=t&q=" +
          encodeURIComponent(messageText)
      );

      const data = await response.json();

      const translated = data?.[0]
        ?.map((item: any) => item[0])
        ?.join(" ");

      if (!translated) return;

      setTranslatedMap((prev: any) => ({
        ...prev,
        [messageId]: translated,
      }));

      setTranslatedLangMessages((prev: any) => ({
        ...prev,
        [messageId]: target,
      }));
    } catch (error) {
      console.log("TRANSLATION ERROR:", error);
    }
  };

  const speakTranslated = (messageId: number) => {
    const translated = translatedMap[messageId];
    const language = translatedLangMessages[messageId];

    if (!translated) return;

    Speech.speak(translated, {
      language,
      pitch: 1,
      rate: 0.9,
    });
  };

  // 🔵 =====================================================
  // 🔵 AUDIO PLAYBACK
  // 🔵 =====================================================

  const playAudio = async (
    url: string,
    messageId: number
  ) => {
    try {
      if (playingId === messageId) {
        player.pause();
        setPlayingId(null);
        return;
      }

      player.replace({ uri: url });
      player.play();

      setPlayingId(messageId);
    } catch (error) {
      console.log("GROUP AUDIO PLAY ERROR:", error);
    }
  };

  // 🔵 =====================================================
  // 🔵 TYPING
  // 🔵 =====================================================

  const handleTyping = (value: string) => {
    setText(value);
  };

  // 🔵 =====================================================
  // 🔵 SEND TEXT MESSAGE
  // 🔵 =====================================================

  const sendText = async () => {
    if (!text.trim() || !userId || !roomId) return;

    if (announcementMode && !isAdmin && !isOwner) {
      Alert.alert("Only admins can send messages");
      return;
    }

    const messageText = text.trim();

    setText("");

    const tempId = Date.now();

    const optimisticMessage: Message = {
      id: tempId,
      group_id: roomId,
      sender_id: userId,
      text: messageText,
      image_url: null,
      file_url: null,
      file_name: null,
      reaction: null,
      seen: false,
      reply_to: replyTo?.id || null,
      reply_text: replyTo?.text || null,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [
      ...prev,
      optimisticMessage,
    ]);

    setTimeout(() => {
      flatRef.current?.scrollToEnd({
        animated: true,
      });
    }, 100);

    try {
      const insertPayload: any = {
        group_id: roomId,
        sender_id: userId,
        text: messageText,
        reply_to: replyTo?.id || null,
        reply_text: replyTo?.text || null,
      };

      if (secretMode) {
        insertPayload.secret_chat = true;
        insertPayload.expires_at = new Date(
          Date.now() + expireMinutes * 60 * 1000
        ).toISOString();
      }

      const { data, error } = await (supabase as any)
        .from("group_messages")
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        console.log("SEND GROUP TEXT ERROR:", error);

        setMessages((prev) =>
          prev.filter((message) => message.id !== tempId)
        );

        Alert.alert(error.message);
        setText(messageText);
        return;
      }

      if (data) {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === tempId ? data : message
          )
        );

        // 🔔 Notify group members after successful insert.
        void notifyGroupMembers(data.id);
      }

      setReplyTo(null);
    } catch (error: any) {
      console.log("SEND GROUP TEXT FAILED:", error);

      setMessages((prev) =>
        prev.filter((message) => message.id !== tempId)
      );

      setText(messageText);
      Alert.alert("Failed to send", error?.message || "");
    }
  };

  // 🔵 =====================================================
  // 🔵 SEND GALLERY IMAGE
  // 🔵 =====================================================

  const sendImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.8,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });

      if (result.canceled || !userId || !roomId) return;

      const asset = result.assets[0];
      const tempId = Date.now();

      const tempMessage: Message = {
        id: tempId,
        group_id: roomId,
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

      const uploadedUrl = await uploadToServer(asset.uri);

      const { data, error } = await (supabase as any)
        .from("group_messages")
        .insert({
          group_id: roomId,
          sender_id: userId,
          image_url: uploadedUrl,
          one_time_view: oneTimeView,
          secret_chat: secretMode,
          expires_at: secretMode
            ? new Date(
                Date.now() + expireMinutes * 60 * 1000
              ).toISOString()
            : null,
          reply_to: replyTo?.id || null,
          reply_text: replyTo?.text || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === tempId ? data : message
          )
        );

        void notifyGroupMembers(data.id);
      }

      setOneTimeView(false);
      setReplyTo(null);
    } catch (error: any) {
      console.log("SEND GROUP IMAGE ERROR:", error);

      Alert.alert(
        "Image not sent",
        error?.message || "Please try again."
      );

      await fetchMessages();
    }
  };

  // 🔵 =====================================================
  // 🔵 SEND CAMERA PHOTO
  // 🔵 =====================================================

  const sendCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });

      if (result.canceled || !userId || !roomId) return;

      const asset = result.assets[0];
      const uploadedUrl = await uploadToServer(asset.uri);

      const { data, error } = await (supabase as any)
        .from("group_messages")
        .insert({
          group_id: roomId,
          sender_id: userId,
          image_url: uploadedUrl,
          one_time_view: oneTimeView,
          secret_chat: secretMode,
          expires_at: secretMode
            ? new Date(
                Date.now() + expireMinutes * 60 * 1000
              ).toISOString()
            : null,
          reply_to: replyTo?.id || null,
          reply_text: replyTo?.text || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setMessages((prev) => [...prev, data]);
        void notifyGroupMembers(data.id);
      }

      setOneTimeView(false);
      setReplyTo(null);
    } catch (error: any) {
      console.log("SEND GROUP CAMERA ERROR:", error);

      Alert.alert(
        "Photo not sent",
        error?.message || "Please try again."
      );
    }
  };

  // 🔵 =====================================================
  // 🔵 SEND FILE
  // 🔵 =====================================================

  const sendFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({});

      if (result.canceled || !userId || !roomId) return;

      const file = result.assets[0];

      const uploadedUrl = await uploadToServer(
        file.uri,
        file.name
      );

      const { data, error } = await (supabase as any)
        .from("group_messages")
        .insert({
          group_id: roomId,
          sender_id: userId,
          file_url: uploadedUrl,
          file_name: file.name,
          secret_chat: secretMode,
          expires_at: secretMode
            ? new Date(
                Date.now() + expireMinutes * 60 * 1000
              ).toISOString()
            : null,
          reply_to: replyTo?.id || null,
          reply_text: replyTo?.text || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setMessages((prev) => [...prev, data]);
        void notifyGroupMembers(data.id);
      }

      setReplyTo(null);
    } catch (error: any) {
      console.log("SEND GROUP FILE ERROR:", error);

      Alert.alert(
        "File not sent",
        error?.message || "Please try again."
      );
    }
  };

  // 🔵 =====================================================
  // 🔵 START VOICE RECORDING
  // 🔵 =====================================================

  const startRecording = async () => {
    try {
      const permission =
        await AudioModule.requestRecordingPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Microphone permission denied");
        return;
      }

      await AudioModule.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync(
        RecordingPresets.HIGH_QUALITY
      );

      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((previous) => previous + 1);
      }, 1000);

      await recorder.record();

      setRecording(true);
    } catch (error) {
      console.log("START RECORDING ERROR:", error);
      Alert.alert("Recording could not start");
    }
  };

  // 🔵 =====================================================
  // 🔵 STOP AND SEND VOICE RECORDING
  // 🔵 =====================================================

  const stopRecording = async () => {
    try {
      await recorder.stop();

      setRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const uri = recorder.uri;

      if (!uri || !userId || !roomId) return;

      await AudioModule.setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      const uploadedUrl = await uploadToServer(
        uri,
        Platform.OS === "web"
          ? `voice-${Date.now()}.mp3`
          : `voice-${Date.now()}.m4a`
      );

      const { data, error } = await (supabase as any)
        .from("group_messages")
        .insert({
          group_id: roomId,
          sender_id: userId,
          audio_url: uploadedUrl,
          secret_chat: secretMode,
          expires_at: secretMode
            ? new Date(
                Date.now() + expireMinutes * 60 * 1000
              ).toISOString()
            : null,
          reply_to: replyTo?.id || null,
          reply_text: replyTo?.text || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setMessages((prev) => [...prev, data]);
        void notifyGroupMembers(data.id);
      }

      setReplyTo(null);
    } catch (error: any) {
      console.log("STOP RECORDING ERROR:", error);

      Alert.alert(
        "Voice message not sent",
        error?.message || "Please try again."
      );
    } finally {
      setRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // 🔵 =====================================================
  // 🔵 CHANGE GROUP IMAGE
  // 🔵 =====================================================

  const changeGroupImage = async () => {
    try {
      if (!isAdmin && !isOwner) {
        Alert.alert("Only admins can change group image");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (result.canceled) return;

      const asset = result.assets[0];

      setUpdatingImage(true);

      const uploadedUrl = await uploadToServer(asset.uri);

      const { error } = await (supabase as any)
        .from("groups")
        .update({
          image_url: uploadedUrl,
        })
        .eq("id", roomId);

      if (error) {
        console.log("GROUP IMAGE UPDATE ERROR:", error);
        Alert.alert(error.message);
        return;
      }

      setGroupImage(uploadedUrl);

      await loadGroup();

      Alert.alert("Group image updated");
    } catch (error: any) {
      console.log("CHANGE GROUP IMAGE ERROR:", error);

      Alert.alert(
        "Failed to update group image",
        error?.message || ""
      );
    } finally {
      setUpdatingImage(false);
    }
  };

  // 🔵 =====================================================
  // 🔵 PICK WALLPAPER
  // 🔵 =====================================================

  const pickWallpaper = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.8,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });

      if (result.canceled || !userId) return;

      const asset = result.assets[0];

      const uploadedUrl = await uploadToServer(asset.uri);

      pendingWallpaperRef.current = uploadedUrl;

      setWallpaperMenuVisible(true);
    } catch (error: any) {
      console.log("PICK WALLPAPER ERROR:", error);

      Alert.alert(
        "Wallpaper upload failed",
        error?.message || ""
      );
    }
  };

  // 🔵 =====================================================
  // 🔵 COPY MESSAGE
  // 🔵 =====================================================

  const copyMessage = async (messageText: string) => {
    try {
      await Clipboard.setStringAsync(messageText);
    } catch (error) {
      console.log("COPY MESSAGE ERROR:", error);
    }
  };

  // 🔵 =====================================================
  // 🔵 ADD REACTION
  // 🔵 =====================================================

  const addReaction = async (
    messageId: number,
    emoji: string
  ) => {
    try {
      const { error } = await (supabase as any)
        .from("group_messages")
        .update({ reaction: emoji })
        .eq("id", messageId);

      if (error) throw error;

      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId
            ? { ...message, reaction: emoji }
            : message
        )
      );
    } catch (error) {
      console.log("REACTION ERROR:", error);
    }
  };

  // 🔵 =====================================================
  // 🔵 PIN MESSAGE
  // 🔵 =====================================================

  const pinMessage = async (messageId: number) => {
    try {
      const { error } = await (supabase as any)
        .from("group_messages")
        .update({ pinned: true })
        .eq("id", messageId);

      if (error) throw error;

      await fetchMessages();
    } catch (error) {
      console.log("PIN MESSAGE ERROR:", error);
    }
  };

  // 🔵 =====================================================
  // 🔵 DELETE MESSAGE FOR ME
  // 🔵 =====================================================

  const deleteForMe = (messageId: number) => {
    setMessages((prev) =>
      prev.filter((message) => message.id !== messageId)
    );

    setDeleteModal({
      visible: false,
      id: null,
    });
  };

  // 🔵 =====================================================
  // 🔵 DELETE MESSAGE FOR EVERYONE
  // 🔵 =====================================================

  const deleteForEveryone = async (messageId: number) => {
    try {
      const { error } = await (supabase as any)
        .from("group_messages")
        .update({
          text: "🚫 This message was deleted",
          image_url: null,
          file_url: null,
          file_name: null,
          audio_url: null,
          deleted_for_everyone: true,
        })
        .eq("id", messageId);

      if (error) throw error;

      await fetchMessages();

      setDeleteModal({
        visible: false,
        id: null,
      });
    } catch (error: any) {
      console.log("DELETE GROUP MESSAGE ERROR:", error);
      Alert.alert(error?.message || "Could not delete message");
    }
  };

  // 🔵 =====================================================
  // 🔵 EDIT MESSAGE
  // 🔵 =====================================================

  const openEdit = (item: Message) => {
    setEditId(item.id);
    setEditText(item.text ?? "");
    setEditModalVisible(true);
  };

  const saveEdit = async () => {
    if (!editId) return;

    try {
      const { error } = await (supabase as any)
        .from("group_messages")
        .update({
          text: editText,
        })
        .eq("id", editId);

      if (error) throw error;

      await fetchMessages();

      setEditModalVisible(false);
      setEditId(null);
    } catch (error: any) {
      console.log("EDIT GROUP MESSAGE ERROR:", error);
      Alert.alert(error?.message || "Could not update message");
    }
  };

  // 🔵 =====================================================
  // 🔵 MESSAGE TIME RULES
  // 🔵 =====================================================

  const canEditMessage = (createdAt: string) => {
    const created = new Date(createdAt).getTime();

    return (
      Date.now() - created <=
      24 * 60 * 60 * 1000
    );
  };

  const canDeleteForEveryone = (createdAt: string) => {
    const created = new Date(createdAt).getTime();

    return (
      Date.now() - created <=
      7 * 24 * 60 * 60 * 1000
    );
  };

  // 🔵 =====================================================
  // 🔵 EXPIRE MESSAGES LOCALLY
  // 🔵 =====================================================

  useEffect(() => {
    const interval = setInterval(() => {
      setMessages((prev) =>
        prev.filter((message) => {
          if (!message.expires_at) return true;

          return (
            new Date(message.expires_at).getTime() >
            Date.now()
          );
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 🔵 =====================================================
  // 🔵 CLEAN UP RECORDING TIMER
  // 🔵 =====================================================

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // 🔵 =====================================================
  // 🔵 SEARCH MESSAGES
  // 🔵 =====================================================

  const filtered = showSearch
    ? messages.filter((message) =>
        (message.text ?? "")
          .toLowerCase()
          .includes(searchText.toLowerCase())
      )
    : messages;

  // 🔵 =====================================================
  // 🔵 ADD MEMBER
  // 🔵 =====================================================

  const addMember = async (targetUserId: string) => {
    try {
      const alreadyMember = membersList.some(
        (member: any) =>
          member.user_id === targetUserId
      );

      if (alreadyMember) {
        Alert.alert("User already in group");
        return;
      }

      const { error } = await (supabase as any)
        .from("group_members")
        .insert({
          group_id: roomId,
          user_id: targetUserId,
          role: "member",
        });

      if (error) throw error;

      await (supabase as any)
        .from("group_messages")
        .insert({
          group_id: roomId,
          sender_id: userId,
          text: "👋 New member added",
        });

      await loadGroup();

      Alert.alert("Member added");
    } catch (error: any) {
      console.log("ADD MEMBER ERROR:", error);
      Alert.alert(error?.message || "Could not add member");
    }
  };

  // 🔵 =====================================================
  // 🔵 MAKE ADMIN
  // 🔵 =====================================================

  const makeAdmin = async (targetUserId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("group_members")
        .update({ role: "admin" })
        .eq("group_id", roomId)
        .eq("user_id", targetUserId);

      if (error) throw error;

      Alert.alert("User is now admin");

      await loadGroup();
    } catch (error: any) {
      console.log("MAKE ADMIN ERROR:", error);
      Alert.alert(error?.message || "Failed to make admin");
    }
  };

  // 🔵 =====================================================
  // 🔵 REMOVE MEMBER
  // 🔵 =====================================================

  const doRemoveMember = async (targetUserId: string) => {
    const { error } = await (supabase as any)
      .from("group_members")
      .delete()
      .eq("group_id", roomId)
      .eq("user_id", targetUserId);

    console.log("REMOVE MEMBER ERROR:", error);

    if (error) {
      Alert.alert(error.message);
      return;
    }

    await loadGroup();

    Alert.alert("Member removed");
  };

  const removeMember = async (targetUserId: string) => {
    if (!isAdmin && !isOwner) return;

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        "Remove this member?"
      );

      if (confirmed) {
        await doRemoveMember(targetUserId);
      }

      return;
    }

    Alert.alert(
      "Remove Member",
      "Remove this member?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await doRemoveMember(targetUserId);
          },
        },
      ]
    );
  };

  // 🔵 =====================================================
  // 🔵 BAN MEMBER
  // 🔵 =====================================================

  const banMember = async (targetUserId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("group_bans")
        .insert({
          group_id: roomId,
          user_id: targetUserId,
        });

      console.log("BAN MEMBER ERROR:", error);

      if (error) throw error;

      await doRemoveMember(targetUserId);

      Alert.alert("Member banned");
    } catch (error: any) {
      console.log("BAN MEMBER FAILED:", error);
      Alert.alert(error?.message || "Could not ban member");
    }
  };

  // 🔵 =====================================================
  // 🔵 SHARE GROUP INVITE
  // 🔵 =====================================================

  const shareGroupLink = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("group_invites")
        .insert({
          group_id: roomId,
          invited_by: userId,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      const link =
        `https://nasara1.vercel.app/join/${data.id}`;

      await Share.share({
        message: `Join my Nasara group:\n${link}`,
      });
    } catch (error: any) {
      console.log("SHARE GROUP LINK ERROR:", error);
      Alert.alert(
        error?.message || "Failed to create invite"
      );
    }
  };

  // 🔵 =====================================================
  // 🔵 JOIN GROUP
  // 🔵 =====================================================

  const joinGroup = async (groupId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: existing } = await (supabase as any)
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
    } catch (error) {
      console.log("JOIN GROUP ERROR:", error);
    }
  };

  // 🔵 =====================================================
  // 🔵 EXIT GROUP
  // 🔵 =====================================================

  const exitGroup = async () => {
    try {
      if (!userId) return;

      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", roomId)
        .eq("user_id", userId);

      if (error) throw error;

      Alert.alert("You left the group");

      router.replace("/(tabs)/chat");
    } catch (error: any) {
      console.log("EXIT GROUP ERROR:", error);
      Alert.alert(error?.message || "Could not leave group");
    }
  };

  // 🔵 =====================================================
  // 🔵 MUTE GROUP
  // 🔵 =====================================================

  const toggleMuteGroup = () => {
    setIsMuted((previous) => !previous);

    Alert.alert(
      isMuted ? "Group unmuted" : "Group muted"
    );
  };

  // 🔵 =====================================================
  // 🔵 TRANSFER OWNERSHIP
  // 🔵 =====================================================

  const transferOwnership = async (
    targetUserId: string
  ) => {
    if (!isOwner) return;

    try {
      const { error: groupError } = await (supabase as any)
        .from("groups")
        .update({
          owner_id: targetUserId,
        })
        .eq("id", roomId);

      if (groupError) throw groupError;

      // Demote the current owner before assigning the new owner.
      const { error: oldOwnerError } = await (supabase as any)
        .from("group_members")
        .update({
          role: "admin",
        })
        .eq("group_id", roomId)
        .eq("user_id", userId);

      if (oldOwnerError) throw oldOwnerError;

      const { error: newOwnerError } = await (supabase as any)
        .from("group_members")
        .update({
          role: "owner",
        })
        .eq("group_id", roomId)
        .eq("user_id", targetUserId);

      if (newOwnerError) throw newOwnerError;

      setIsOwner(false);

      await loadGroup();

      Alert.alert("Ownership transferred");
    } catch (error: any) {
      console.log("TRANSFER OWNERSHIP ERROR:", error);
      Alert.alert(
        error?.message || "Could not transfer ownership"
      );
    }
  };


  // 🟢 =====================================================
// 🟢 FILTER GROUP MEMBER CANDIDATES
// 🟢 =====================================================

const currentMemberSource =
  activeMemberSource === "contacts"
    ? contactUsers
    : activeMemberSource === "discover"
    ? discoverUsers
    : followingUsers;

const filteredMemberCandidates = currentMemberSource.filter(
  (person: GroupMemberCandidate) => {
    const search = memberSearch.toLowerCase().trim();

    if (!search) return true;

    return (
      (person.full_name || "").toLowerCase().includes(search) ||
      (person.username || "").toLowerCase().includes(search)
    );
  }
);

  // 🔵 =====================================================
  // 🔵 RENDER
  // 🔵 =====================================================

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
          backgroundColor: "#0f172a",
        }}
      >
        {!!(groupWallpaper || wallpaper) && (
          <Image
            source={{
              uri: groupWallpaper || wallpaper,
            }}
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
            }}
            blurRadius={2}
          />
        )}

        <KeyboardAvoidingView
          style={{
            flex: 1,
          }}
          behavior={
            Platform.OS === "ios" ? "padding" : "height"
          }
        >
          {/* 🔵 ============================================== */}
          {/* 🔵 HEADER */}
          {/* 🔵 ============================================== */}

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 15,
              backgroundColor: "#111827",
            }}
          >
            <TouchableOpacity
              onPress={() => router.back()}
            >
              <Text
                style={{
                  color: "#22c55e",
                  fontSize: 24,
                }}
              >
                ←
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowMembersModal(true)}
              onLongPress={() => setGroupMenuVisible(true)}
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
                    backgroundColor: "#1f2937",
                    justifyContent: "center",
                    alignItems: "center",
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
              onPress={() => setShowMembersModal(true)}
              onLongPress={() => setGroupMenuVisible(true)}
              style={{
                marginLeft: 12,
                flex: 1,
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  color: "white",
                  fontWeight: "bold",
                  fontSize: 16,
                }}
              >
                {groupName}
              </Text>

              <Text
                style={{
                  color: "#9ca3af",
                  fontSize: 11,
                  marginTop: 3,
                }}
              >
                {membersCount} members
              </Text>
            </TouchableOpacity>

            {(isAdmin || isOwner) && (
              <TouchableOpacity
               onPress={() => {
  setActiveMemberSource("contacts");
  setMemberSearch("");
  setShowAddMembers(true);
  loadAllMemberSources();
}}
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
              onPress={() => setShowSearch(!showSearch)}
            >
              <Text
                style={{
                  fontSize: 22,
                  color: "white",
                }}
              >
                🔍
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setGroupMenuVisible(true)}
              style={{
                marginLeft: 14,
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 23,
                }}
              >
                ⋮
              </Text>
            </TouchableOpacity>
          </View>

          {/* 🔵 ============================================== */}
          {/* 🔵 SEARCH */}
          {/* 🔵 ============================================== */}

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

          {/* 🔵 ============================================== */}
          {/* 🔵 THEME AND WALLPAPER */}
          {/* 🔵 ============================================== */}

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              paddingBottom: 8,
              paddingTop: 6,
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
            ].map((color) => (
              <TouchableOpacity
                key={color}
                onPress={async () => {
                  setThemeColor(color);

                  if (!userId) return;

                  const { error } = await (supabase as any)
                    .from("profiles")
                    .update({
                      chat_theme: color,
                    })
                    .eq("id", userId);

                  if (error) {
                    console.log("SAVE THEME ERROR:", error);
                  }
                }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 20,
                  backgroundColor: color,
                  marginRight: 10,
                }}
              />
            ))}

            <TouchableOpacity
              onPress={pickWallpaper}
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

            <TouchableOpacity
              onPress={() => setSecretMode(!secretMode)}
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
              <Text
                style={{
                  color: "white",
                }}
              >
                {secretMode ? "🔒 Secret" : "💬 Normal"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 🔵 ============================================== */}
          {/* 🔵 ANNOUNCEMENT */}
          {/* 🔵 ============================================== */}

          {announcementMode && (
            <View
              style={{
                backgroundColor: "#f59e0b",
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
                📢 Announcement Mode (Admins Only)
              </Text>
            </View>
          )}

          {/* 🔵 ============================================== */}
          {/* 🔵 REPLY BAR */}
          {/* 🔵 ============================================== */}

          {replyTo && (
            <View
              style={{
                backgroundColor: "#1f2937",
                padding: 10,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={{
                    color: "#22c55e",
                  }}
                >
                  Replying to:{" "}
                  {replyTo.text ||
                    (replyTo.audio_url
                      ? "🎤 Voice message"
                      : replyTo.image_url
                      ? "📷 Photo"
                      : replyTo.file_name
                      ? `📎 ${replyTo.file_name}`
                      : "Message")}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setReplyTo(null)}
              >
                <Text
                  style={{
                    color: "red",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 🔵 ============================================== */}
          {/* 🔵 MESSAGES */}
          {/* 🔵 ============================================== */}

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
            onScrollToIndexFailed={(info) => {
              setTimeout(() => {
                flatRef.current?.scrollToIndex({
                  index: info.index,
                  animated: true,
                });
              }, 500);
            }}
            ListEmptyComponent={
              loading ? (
                <Text
                  style={{
                    color: "#9ca3af",
                    textAlign: "center",
                    marginTop: 30,
                  }}
                >
                  Loading messages...
                </Text>
              ) : (
                <Text
                  style={{
                    color: "#9ca3af",
                    textAlign: "center",
                    marginTop: 30,
                  }}
                >
                  No messages yet. Start the conversation!
                </Text>
              )
            }
            renderItem={({ item }) => {
              const isMe = item.sender_id === userId;

              const sender = memberMap[item.sender_id];

              const senderIsAdmin = membersList.find(
                (member: any) =>
                  member.user_id === item.sender_id &&
                  (
                    member.role === "admin" ||
                    member.role === "owner"
                  )
              );

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
                  {/* 🔵 SENDER NAME */}

                  {!isMe && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
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

                        {senderIsAdmin && (
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
                            color: "#3b82f6",
                          }}
                        >
                          ✔️
                        </Text>
                      )}
                    </View>
                  )}

                  {/* 🔵 MESSAGE BUBBLE */}

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
                      maxWidth: "92%",
                    }}
                  >
                    {/* 🔵 REPLY PREVIEW */}

                    {item.reply_to && (
                      <TouchableOpacity
                        onPress={() => {
                          const index = messages.findIndex(
                            (message) =>
                              message.id === item.reply_to
                          );

                          if (index !== -1) {
                            flatRef.current?.scrollToIndex({
                              index,
                              animated: true,
                              viewPosition: 0.5,
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
                        <Text
                          style={{
                            color: "#9ca3af",
                            fontSize: 12,
                          }}
                        >
                          Reply
                        </Text>

                        <Text
                          style={{
                            color: "white",
                          }}
                        >
                          {item.reply_text || "Message"}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* 🔵 TEXT */}

                    {item.text && (
                      <>
                        <Text
                          style={{
                            color: isMe ? "#000" : "#fff",
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

                        {/* 🔵 TRANSLATION OPTIONS */}

                        <View
                          style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            marginTop: 6,
                          }}
                        >
                          {[
                            { label: "Twi", code: "ak" },
                            { label: "Hausa", code: "ha" },
                            { label: "French", code: "fr" },
                            { label: "Spanish", code: "es" },
                            { label: "Arabic", code: "ar" },
                          ].map((language) => (
                            <TouchableOpacity
                              key={language.code}
                              onPress={() =>
                                translateMessage(
                                  item.id,
                                  item.text!,
                                  language.code
                                )
                              }
                              style={{
                                backgroundColor: "#111827",
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
                                {language.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                          {/* 🔵 TRANSLATED RESULT */}

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
                                <Text>🔊 Speak</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                onPress={() => {
                                  setTranslatedMap((prev: any) => {
                                    const copy = { ...prev };
                                    delete copy[item.id];
                                    return copy;
                                  });
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

                    {/* 🔵 IMAGE */}

                    {item.image_url && (
                      <>
                        {!viewedImages.includes(item.id) ? (
                          <TouchableOpacity
                            onPress={() => {
                              if (item.one_time_view) {
                                setViewedImages((prev) => [
                                  ...prev,
                                  item.id,
                                ]);
                              } else {
                                Linking.openURL(item.image_url!);
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

                    {/* 🔵 FILE */}

                    {item.file_url && (
                      <TouchableOpacity
                        onPress={() =>
                          Linking.openURL(item.file_url!)
                        }
                      >
                        <Text
                          style={{
                            color: "#60a5fa",
                          }}
                        >
                          📎 {item.file_name || "Open file"}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* 🔵 AUDIO */}

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
                              (height, index) => (
                                <View
                                  key={index}
                                  style={{
                                    width: 4,
                                    height,
                                    backgroundColor: "white",
                                    marginRight: 3,
                                    borderRadius: 10,
                                  }}
                                />
                              )
                            )}
                          </View>

                          <TouchableOpacity
                            onPress={() => {
                              if (playbackRate === 1) {
                                setPlaybackRate(1.5);
                              } else if (playbackRate === 1.5) {
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

                    {/* 🔵 COPY */}

                    {item.text && (
                      <TouchableOpacity
                        onPress={() => copyMessage(item.text!)}
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

                    {/* 🔵 PIN */}

                    {isAdmin && (
                      <TouchableOpacity
                        onPress={() => pinMessage(item.id)}
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

                    {/* 🔵 REACTIONS */}

                    <View
                      style={{
                        flexDirection: "row",
                        marginTop: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      {["❤️", "😂", "🔥", "👍", "😮"].map(
                        (emoji) => (
                          <TouchableOpacity
                            key={emoji}
                            onPress={() =>
                              addReaction(item.id, emoji)
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
                              {emoji}
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
                        {item.reaction}
                      </Text>
                    )}

                    {/* 🔵 EDIT */}

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

                    {/* 🔵 DELETE */}

                    {isMe &&
                      canDeleteForEveryone(item.created_at) && (
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

                    {/* 🔵 EXPIRY */}

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

                    {/* 🔵 TIME */}

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
                  </View>
                </TouchableOpacity>
              );
            }}
          />

          {/* 🔵 ============================================== */}
          {/* 🔵 MESSAGE COMPOSER */}
          {/* 🔵 ============================================== */}

          <View
            style={{
              backgroundColor: "#111827",
              paddingHorizontal: 12,
              paddingTop: 10,
              paddingBottom: Platform.OS === "ios" ? 8 : 12,
              borderTopWidth: 1,
              borderTopColor: "#263244",
            }}
          >
            {/* 🔵 REPLY PREVIEW */}

            {replyTo && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#1f2937",
                  borderLeftWidth: 4,
                  borderLeftColor: themeColor,
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 10,
                }}
              >
                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text
                    style={{
                      color: themeColor,
                      fontWeight: "bold",
                      fontSize: 12,
                    }}
                  >
                    Replying to{" "}
                    {replyTo.sender_id === userId
                      ? "yourself"
                      : memberMap[replyTo.sender_id]?.full_name || "member"}
                  </Text>

                  <Text
                    numberOfLines={1}
                    style={{
                      color: "#d1d5db",
                      fontSize: 12,
                      marginTop: 3,
                    }}
                  >
                    {replyTo.text ||
                      (replyTo.audio_url
                        ? "🎤 Voice message"
                        : replyTo.image_url
                        ? "📷 Photo"
                        : replyTo.file_name
                        ? `📎 ${replyTo.file_name}`
                        : "Message")}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setReplyTo(null)}
                  style={{
                    padding: 8,
                  }}
                >
                  <Text
                    style={{
                      color: "#f87171",
                      fontSize: 18,
                    }}
                  >
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 🔵 SECRET CHAT TIMER */}

            {secretMode && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{
                    color: "#fca5a5",
                    fontSize: 12,
                  }}
                >
                  🔒 Secret message expiry:
                </Text>

                {[1, 5, 10, 30].map((minutes) => (
                  <TouchableOpacity
                    key={minutes}
                    onPress={() => setExpireMinutes(minutes)}
                    style={{
                      marginLeft: 7,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 12,
                      backgroundColor:
                        expireMinutes === minutes
                          ? "#991b1b"
                          : "#1f2937",
                    }}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontSize: 11,
                      }}
                    >
                      {minutes}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* 🔵 RECORDING INDICATOR */}

            {recording && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#7f1d1d",
                  padding: 10,
                  borderRadius: 12,
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontWeight: "bold",
                  }}
                >
                  🔴 Recording {recordingTime}s
                </Text>

                <View
                  style={{
                    flex: 1,
                  }}
                />

                <Text
                  style={{
                    color: "#fecaca",
                    fontSize: 12,
                  }}
                >
                  Tap stop to send
                </Text>
              </View>
            )}

            {/* 🔵 INPUT ROW */}

            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-end",
              }}
            >
              <TouchableOpacity
                onPress={sendFile}
                style={{
                  width: 42,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 23,
                    color: "white",
                  }}
                >
                  ＋
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setOneTimeView(!oneTimeView)}
                style={{
                  width: 34,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 19,
                    color: oneTimeView ? themeColor : "#9ca3af",
                  }}
                >
                  👁️
                </Text>
              </TouchableOpacity>

              <View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#1f2937",
                  borderRadius: 25,
                  paddingHorizontal: 14,
                  minHeight: 46,
                  maxHeight: 110,
                  borderWidth: 1,
                  borderColor: "#374151",
                }}
              >
                <TextInput
                  value={text}
                  onChangeText={handleTyping}
                  placeholder="Message..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  style={{
                    flex: 1,
                    color: "white",
                    fontSize: 15,
                    paddingTop: 10,
                    paddingBottom: 10,
                    maxHeight: 90,
                  }}
                />

                <TouchableOpacity
                  onPress={sendCamera}
                  style={{
                    paddingLeft: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 20,
                    }}
                  >
                    📷
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={sendImage}
                  style={{
                    paddingLeft: 10,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 20,
                    }}
                  >
                    🖼️
                  </Text>
                </TouchableOpacity>
              </View>

              {text.trim().length > 0 ? (
                <TouchableOpacity
                  onPress={sendText}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    backgroundColor: themeColor,
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 20,
                      color: "#ffffff",
                    }}
                  >
                    ➤
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={
                    recording
                      ? stopRecording
                      : startRecording
                  }
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    backgroundColor: recording
                      ? "#dc2626"
                      : "#1f2937",
                    borderWidth: 1,
                    borderColor: recording
                      ? "#ef4444"
                      : "#374151",
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 21,
                    }}
                  >
                    {recording ? "⏹️" : "🎤"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {secretMode && (
              <Text
                style={{
                  color: "#fca5a5",
                  fontSize: 10,
                  textAlign: "center",
                  marginTop: 7,
                }}
              >
                🔒 Secret chat mode is enabled
              </Text>
            )}
          </View>

          {/* 🔵 ============================================== */}
          {/* 🔵 DELETE MODAL */}
          {/* 🔵 ============================================== */}

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
                backgroundColor: "rgba(0,0,0,0.5)",
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
                  onPress={() => {
                    if (deleteModal.id !== null) {
                      deleteForMe(deleteModal.id);
                    }
                  }}
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
                  onPress={() => {
                    if (deleteModal.id !== null) {
                      deleteForEveryone(deleteModal.id);
                    }
                  }}
                >
                  <Text
                    style={{
                      color: "red",
                    }}
                  >
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

          {/* 🔵 ============================================== */}
          {/* 🔵 EDIT MODAL */}
          {/* 🔵 ============================================== */}

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
                backgroundColor: "rgba(0,0,0,0.6)",
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
                    onPress={() => setEditModalVisible(false)}
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

                  <TouchableOpacity onPress={saveEdit}>
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
        </KeyboardAvoidingView>

       {/* 🟢 ===================================================== */}
{/* 🟢 GROUP ADD MEMBERS - THREE SOURCE SELECTOR */}
{/* 🟢 ===================================================== */}

<Modal
  visible={showAddMembers}
  animationType="slide"
  transparent
  onRequestClose={() => {
    setShowAddMembers(false);
    setMemberSearch("");
  }}
>
  <View
    style={{
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.75)",
      justifyContent: "flex-end",
    }}
  >
    <View
      style={{
        height: "85%",
        backgroundColor: "#0f172a",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 16,
      }}
    >
      {/* HEADER */}

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
        }}
      >
        <View>
          <Text
            style={{
              color: "white",
              fontSize: 20,
              fontWeight: "bold",
            }}
          >
            Add Group Members
          </Text>

          <Text style={{ color: "#94a3b8", marginTop: 4 }}>
            Choose people from your Nasara network
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            setShowAddMembers(false);
            setMemberSearch("");
          }}
        >
          <Text style={{ color: "#f87171", fontSize: 16 }}>
            ✕ Close
          </Text>
        </TouchableOpacity>
      </View>

      {/* THREE SOURCE TABS */}

      <View
        style={{
          flexDirection: "row",
          backgroundColor: "#1e293b",
          borderRadius: 12,
          padding: 4,
          marginBottom: 15,
        }}
      >
        {[
          { id: "contacts", label: "📱 Contacts" },
          { id: "discover", label: "🌍 Discover" },
          { id: "following", label: "❤️ Following" },
        ].map((tab: any) => {
          const active = activeMemberSource === tab.id;

          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => {
                setActiveMemberSource(tab.id);
                setMemberSearch("");
              }}
              style={{
                flex: 1,
                paddingVertical: 11,
                borderRadius: 9,
                backgroundColor: active ? "#d4a017" : "transparent",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: active ? "#0f172a" : "#cbd5e1",
                  fontSize: 11,
                  fontWeight: "bold",
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* SEARCH */}

      <TextInput
        value={memberSearch}
        onChangeText={setMemberSearch}
        placeholder="Search by name or username..."
        placeholderTextColor="#64748b"
        style={{
          backgroundColor: "#1e293b",
          color: "white",
          padding: 13,
          borderRadius: 12,
          marginBottom: 14,
          fontSize: 14,
        }}
      />

      {/* REFRESH */}

      <TouchableOpacity
        onPress={loadAllMemberSources}
        disabled={loadingMemberSources}
        style={{
          alignSelf: "flex-end",
          marginBottom: 12,
        }}
      >
        <Text style={{ color: "#fbbf24", fontWeight: "bold" }}>
          {loadingMemberSources ? "Refreshing..." : "↻ Refresh"}
        </Text>
      </TouchableOpacity>

      {/* MEMBER LIST */}

      {loadingMemberSources ? (
        <Text
          style={{
            color: "#94a3b8",
            textAlign: "center",
            marginTop: 35,
          }}
        >
          Loading people...
        </Text>
      ) : (
        <FlatList
          data={filteredMemberCandidates}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 45 }}>
              <Text style={{ fontSize: 35 }}>
                {activeMemberSource === "contacts"
                  ? "📱"
                  : activeMemberSource === "discover"
                  ? "🌍"
                  : "❤️"}
              </Text>

              <Text
                style={{
                  color: "white",
                  fontWeight: "bold",
                  marginTop: 12,
                }}
              >
                No users found
              </Text>

              <Text
                style={{
                  color: "#94a3b8",
                  textAlign: "center",
                  marginTop: 6,
                }}
              >
                Try another tab or change your search.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isAdding = addingMemberIds.includes(item.id);

            return (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 11,
                  borderBottomWidth: 1,
                  borderBottomColor: "#1e293b",
                }}
              >
                <Image
                  source={{
                    uri:
                      item.avatar_url ||
                      "https://via.placeholder.com/100",
                  }}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    backgroundColor: "#334155",
                  }}
                />

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    style={{
                      color: "white",
                      fontWeight: "bold",
                      fontSize: 14,
                    }}
                  >
                    {item.full_name || "Nasara User"}
                    {item.verified ? " ☑️" : ""}
                  </Text>

                  {item.username ? (
                    <Text
                      style={{
                        color: "#94a3b8",
                        fontSize: 12,
                        marginTop: 3,
                      }}
                    >
                      @{item.username}
                    </Text>
                  ) : null}
                </View>

                <TouchableOpacity
                  disabled={isAdding}
                  onPress={async () => {
                    setAddingMemberIds((previous) => [
                      ...previous,
                      item.id,
                    ]);

                    try {
                      await addMember(item.id);

                      await loadGroup();
                      await loadAllMemberSources();
                    } catch (error) {
                      console.log("ADD GROUP MEMBER ERROR:", error);
                    } finally {
                      setAddingMemberIds((previous) =>
                        previous.filter((id) => id !== item.id)
                      );
                    }
                  }}
                  style={{
                    backgroundColor: "#d4a017",
                    paddingHorizontal: 16,
                    paddingVertical: 9,
                    borderRadius: 9,
                    opacity: isAdding ? 0.5 : 1,
                  }}
                >
                  <Text
                    style={{
                      color: "#0f172a",
                      fontWeight: "bold",
                      fontSize: 12,
                    }}
                  >
                    {isAdding ? "Adding..." : "Add"}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </View>
  </View>
</Modal>
        {/* 🔵 ============================================== */}
        {/* 🔵 GROUP MEMBERS MODAL */}
        {/* 🔵 ============================================== */}

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
                onPress={() => setShowMembersModal(false)}
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

            {(isAdmin || isOwner) && (
              <TouchableOpacity
                onPress={async () => {
                  const newValue = !announcementMode;

                  const { error } = await (supabase as any)
                    .from("groups")
                    .update({
                      announcement_mode: newValue,
                    })
                    .eq("id", roomId);

                  if (error) {
                    Alert.alert(error.message);
                    return;
                  }

                  setAnnouncementMode(newValue);
                }}
                style={{
                  backgroundColor: "#f59e0b",
                  padding: 12,
                  borderRadius: 10,
                  marginTop: 10,
                  marginBottom: 15,
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
              keyExtractor={(item) => `${item.user_id}`}
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
                      {item.profile?.full_name || "User"}
                    </Text>

                    <Text
                      style={{
                        color:
                          item.role === "admin" ||
                          item.role === "owner"
                            ? "#22c55e"
                            : "#9ca3af",
                        marginTop: 4,
                      }}
                    >
                      {item.role}
                    </Text>
                  </View>

                  {(isAdmin || isOwner) &&
                    item.user_id !== userId && (
                      <View>
                        {item.role !== "admin" &&
                          item.role !== "owner" && (
                            <TouchableOpacity
                              onPress={() =>
                                makeAdmin(item.user_id)
                              }
                              style={{
                                backgroundColor: "#2563eb",
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

                        {isOwner && (
                          <TouchableOpacity
                            onPress={() =>
                              transferOwnership(item.user_id)
                            }
                            style={{
                              backgroundColor: "#22c55e",
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
                            removeMember(item.user_id)
                          }
                          style={{
                            backgroundColor: "#f59e0b",
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
                            banMember(item.user_id)
                          }
                          style={{
                            backgroundColor: "#ef4444",
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

        {/* 🔵 ============================================== */}
        {/* 🔵 GROUP MENU */}
        {/* 🔵 ============================================== */}

        <Modal
          visible={groupMenuVisible}
          transparent
          animationType="fade"
        >
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.6)",
            }}
          >
            <View
              style={{
                width: 280,
                backgroundColor: "#1f2937",
                borderRadius: 16,
                padding: 20,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  setGroupMenuVisible(false);

                  setTimeout(() => {
                    setShowMembersModal(true);
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

              {(isAdmin || isOwner) && (
                <TouchableOpacity
                  onPress={() => {
                    setGroupMenuVisible(false);

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
              )}

              <TouchableOpacity
                onPress={() => {
                  setGroupMenuVisible(false);
                  setTimeout(() => toggleMuteGroup(), 200);
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
                  🔇 {isMuted ? "Unmute Group" : "Mute Group"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setGroupMenuVisible(false);
                  setTimeout(() => shareGroupLink(), 200);
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
                  🔗 Share Group Invite
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setGroupMenuVisible(false);
                  setTimeout(() => exitGroup(), 200);
                }}
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
                  🚪 Exit Group
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setGroupMenuVisible(false)}
                style={{
                  paddingVertical: 14,
                }}
              >
                <Text
                  style={{
                    color: "#9ca3af",
                    fontSize: 16,
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* 🔵 ============================================== */}
        {/* 🔵 WALLPAPER MENU */}
        {/* 🔵 ============================================== */}

        <Modal
          visible={wallpaperMenuVisible}
          transparent
          animationType="fade"
        >
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.6)",
            }}
          >
            <View
              style={{
                width: 300,
                backgroundColor: "#1f2937",
                borderRadius: 16,
                padding: 20,
              }}
            >
              <TouchableOpacity
                onPress={async () => {
                  try {
                    const url = pendingWallpaperRef.current;

                    if (!url || !userId) return;

                    const { error } = await (supabase as any)
                      .from("profiles")
                      .update({
                        chat_wallpaper: url,
                      })
                      .eq("id", userId);

                    if (error) throw error;

                    setWallpaper(url);
                    setWallpaperMenuVisible(false);
                    pendingWallpaperRef.current = null;
                  } catch (error: any) {
                    console.log("PERSONAL WALLPAPER ERROR:", error);
                    Alert.alert(
                      error?.message || "Could not save wallpaper"
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
                  🙋 Only Me
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  try {
                    const url = pendingWallpaperRef.current;

                    if (!url) return;

                    if (!isAdmin && !isOwner) {
                      Alert.alert(
                        "Only admins can change wallpaper"
                      );
                      return;
                    }

                    const { error } = await (supabase as any)
                      .from("groups")
                      .update({
                        wallpaper_url: url,
                      })
                      .eq("id", roomId);

                    if (error) throw error;

                    setGroupWallpaper(url);
                    setWallpaperMenuVisible(false);
                    pendingWallpaperRef.current = null;

                    await loadGroup();

                    Alert.alert(
                      "Wallpaper updated for everyone"
                    );
                  } catch (error: any) {
                    console.log("GROUP WALLPAPER ERROR:", error);

                    Alert.alert(
                      error?.message ||
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
                onPress={() => {
                  setWallpaperMenuVisible(false);
                  pendingWallpaperRef.current = null;
                }}
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