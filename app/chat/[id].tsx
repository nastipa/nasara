import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";

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
};

export default function ChatRoom() {
  const { id } = useLocalSearchParams();
  const roomId = typeof id === "string" ? id : "";
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);
  const [typing, setTyping] = useState(false);

  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState("");

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editText, setEditText] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [receiverId, setReceiverId] = useState<string | null>(null);

const [replyTo, setReplyTo] = useState<Message | null>(null);

const [lastSeen, setLastSeen] = useState("");

  const [deleteModal, setDeleteModal] = useState<{
    visible: boolean;
    id: number | null;
  }>({
    visible: false,
    id: null,
  });

  const flatRef = useRef<FlatList<Message>>(null);

  /* ================= UPLOAD SERVER ================= */
  const uploadToServer = async (uri: string, fileName?: string) => {
    const formData = new FormData();

    const ext = fileName?.split(".").pop() || "jpg";

    let type = "image/jpeg";

    if (ext === "png") type = "image/png";
    if (ext === "pdf") type = "application/pdf";
    if (ext === "mp3") type = "audio/mpeg";

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
      const { data } = await (supabase as any).auth.getUser();
      if (data.user) {
        setUserId(data.user.id);
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
      }
    }
  };

  getReceiver();
}, [roomId, userId]);
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

  /* ================= REALTIME ================= */
  useEffect(() => {
    if (!roomId) return;

    const channel = (supabase as any)
      .channel("chat_" + roomId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: "room_id=eq." + roomId,
        },
        async (payload: any) => {
          const msg = payload.new as Message;

          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) {
              return prev;
            }
            return [...prev, msg];
          });

          if (msg.sender_id !== userId && Platform.OS !== "web") {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: "New Message",
                body: msg.text || "📩 Message",
              },
              trigger: null,
            });
          }
        }
      )
      .subscribe();

    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, [roomId, userId]);

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

  /* ================= TYPING ================= */
  const handleTyping = (value: string) => {
    setText(value);
    setTyping(true);

    setTimeout(() => {
      setTyping(false);
    }, 1500);
  };
const handleSlashReply = (value: string) => {
  if (value.startsWith("/reply ")) {
    const messageId = Number(
      value.replace("/reply ", "")
    );

    const target = messages.find(
      (m) => m.id === messageId
    );

    if (target) {
      setReplyTo(target);
      setText("");
      return;
    }
  }

  handleTyping(value);
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
          text: messageText,
           reply_to: replyTo?.id || null,
          reply_text: replyTo?.text || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
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
          image_url: uploadedUrl,
          reply_to: replyTo?.id || null,
         reply_text: replyTo?.text || null,
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
          image_url: uploadedUrl,
          reply_to: replyTo?.id || null,
         reply_text: replyTo?.text || null,
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
          file_url: uploadedUrl,
          file_name: file.name,
          reply_to: replyTo?.id || null,
         reply_text: replyTo?.text || null,
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

    <SafeAreaView style={{ flex: 1, backgroundColor: "#0f172a" }}>
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
            <Text
              style={{
                color: "white",
                fontSize: 18,
                fontWeight: "600",
              }}
            >
              Chat
            </Text>

            <Text style={{ color: "#9ca3af", fontSize: 12 }}>
              {online
                ? "Online"
                : lastSeen
                ? `Last seen ${new Date(
                    lastSeen
                  ).toLocaleTimeString()}`
                : "Offline"}
            </Text>
          </View>
        </View>
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
                <View
                  style={{
                    alignSelf: isMe
                      ? "flex-end"
                      : "flex-start",
                    backgroundColor: isMe
                      ? "#22c55e"
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
      {item.reply_text || "Message"}
    </Text>
  </TouchableOpacity>
)} 
                 
                 {/* TEXT */}
                  {item.text && (
                    <Text
                      style={{
                        color: isMe ? "#000" : "#fff",
                      }}
                    >
                      {item.text}
                    </Text>
                  )}

                  {/* IMAGE */}
                  {item.image_url && (
                    <Image
  source={{
    uri:
      item.image_url?.startsWith("blob:")
        ? item.image_url
        : `${item.image_url}?v=${item.id}`,
  }}
                      style={{
                        width: 250,
                        height: 250,
                        borderRadius: 12,
                        marginTop: 8,
                      }}
                    />
                  )}

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

          <TextInput
            value={text}
           onChangeText={handleSlashReply}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  </>
)};