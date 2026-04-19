import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { uploadVideo } from "../../lib/uploadVideo";

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

  const [deleteModal, setDeleteModal] = useState<{ visible: boolean; id: number | null }>({
    visible: false,
    id: null,
  });

  const flatRef = useRef<FlatList<Message>>(null);

  /* ================= USER ================= */
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  /* ================= FETCH ================= */
  const fetchMessages = async () => {
    if (!roomId || !userId) return;

    const { data } = await (supabase as any)
      .from("messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (data) setMessages(data);

    // Mark unseen messages as seen
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

        // ✅ FIX: prevent duplicates
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });

        if (msg.sender_id !== userId && Platform.OS !== "web") {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "New Message",
              body: msg.text || "📎 Media",
              sound: "default",
            },
            trigger: null,
          });
        }
      }
    )
    .subscribe();

  return () => (supabase as any).removeChannel(channel);
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
    setTimeout(() => setTyping(false), 1500);
  };

  /* ================= SEND ================= */

const messageIds = useRef<Set<number>>(new Set());

const sendText = async () => {
  if (!text.trim() || !userId) return;

  const tempId = Date.now();

  const tempMessage: Message = {
    id: tempId,
    room_id: roomId,
    sender_id: userId,
    text: text.trim(),
    image_url: null,
    file_url: null,
    file_name: null,
    reaction: null,
    seen: false,
    created_at: new Date().toISOString(),
  };

  // ✅ instant UI (WhatsApp feel)
  setMessages((prev) => [...prev, tempMessage]);
  messageIds.current.add(tempId);

  setText("");

  try {
    const { data, error } = await (supabase as any)
      .from("messages")
      .insert({
        room_id: roomId,
        sender_id: userId,
        text: tempMessage.text,
      })
      .select()
      .single();

    if (error) throw error;

    if (data) {
      // replace temp with real message
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? data : m))
      );

      messageIds.current.add(data.id);
    }
  } catch (err) {
    console.log("Send failed:", err);

    // rollback if failed
    setMessages((prev) => prev.filter((m) => m.id !== tempId));
  }
};

const sendImage = async () => {
  const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
  if (res.canceled || !userId) return;

  const tempId = Date.now();

  const tempMessage: Message = {
    id: tempId,
    room_id: roomId,
    sender_id: userId,
    text: null,
    image_url: res.assets[0].uri,
    file_url: null,
    file_name: null,
    reaction: null,
    seen: false,
    created_at: new Date().toISOString(),
  };

  setMessages((prev) => [...prev, tempMessage]);
  messageIds.current.add(tempId);

  try {
    const url = await uploadVideo(res.assets[0].uri);

    const { data } = await (supabase as any)
      .from("messages")
      .insert({
        room_id: roomId,
        sender_id: userId,
        image_url: url,
      })
      .select()
      .single();

    if (data) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? data : m))
      );
      messageIds.current.add(data.id);
    }
  } catch {
    setMessages((prev) => prev.filter((m) => m.id !== tempId));
  }
};

const sendCamera = async () => {
  const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
  if (res.canceled || !userId) return;

  const tempId = Date.now();

  const tempMessage: Message = {
    id: tempId,
    room_id: roomId,
    sender_id: userId,
    text: null,
    image_url: res.assets[0].uri,
    file_url: null,
    file_name: null,
    reaction: null,
    seen: false,
    created_at: new Date().toISOString(),
  };

  setMessages((prev) => [...prev, tempMessage]);
  messageIds.current.add(tempId);

  try {
    const url = await uploadVideo(res.assets[0].uri);

    const { data } = await (supabase as any)
      .from("messages")
      .insert({
        room_id: roomId,
        sender_id: userId,
        image_url: url,
      })
      .select()
      .single();

    if (data) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? data : m))
      );
      messageIds.current.add(data.id);
    }
  } catch {
    setMessages((prev) => prev.filter((m) => m.id !== tempId));
  }
};

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
  messageIds.current.add(tempId);

  try {
    const blob = await (await fetch(file.uri)).blob();
    const path = `${userId}/${Date.now()}_${file.name}`;

    await (supabase as any).storage.from("chat-files").upload(path, blob);

    const { data } = await (supabase as any)
      .from("messages")
      .insert({
        room_id: roomId,
        sender_id: userId,
        file_url: path,
        file_name: file.name,
      })
      .select()
      .single();

    if (data) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? data : m))
      );
      messageIds.current.add(data.id);
    }
  } catch {
    setMessages((prev) => prev.filter((m) => m.id !== tempId));
  }
};
  /* ================= REACTION ================= */
  const addReaction = async (id: number, emoji: string) => {
    await (supabase as any).from("messages").update({ reaction: emoji }).eq("id", id);

    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, reaction: emoji } : m))
    );
  };

  /* ================= DELETE ================= */
  const deleteForMe = (id: number) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    setDeleteModal({ visible: false, id: null });
  };

  const deleteForEveryone = async (id: number) => {
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
    setDeleteModal({ visible: false, id: null });
  };

  /* ================= EDIT ================= */
  const openEdit = (item: Message) => {
    setEditId(item.id);
    setEditText(item.text ?? "");
    setEditModalVisible(true);
  };

  const saveEdit = async () => {
    if (!editId) return;

    await (supabase as any).from("messages").update({ text: editText }).eq("id", editId);

    fetchMessages();
    setEditModalVisible(false);
  };

  const filtered = showSearch
    ? messages.filter((m) =>
        (m.text ?? "").toLowerCase().includes(searchText.toLowerCase())
      )
    : messages;

  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0f172a" }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
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
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={{ color: "#22c55e", fontSize: 24 }}>←</Text>
            </TouchableOpacity>

            <Text style={{ color: "white", marginLeft: 12, fontSize: 18, fontWeight: "600" }}>
              Chat {online ? "🟢" : "⚪"}
            </Text>

            <TouchableOpacity
              style={{ marginLeft: "auto" }}
              onPress={() => setShowSearch(!showSearch)}
            >
              <Text style={{ color: "white", fontSize: 18 }}>🔍</Text>
            </TouchableOpacity>
          </View>

          {/* SEARCH */}
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

          {/* MESSAGES */}
          <FlatList
            ref={flatRef}
            data={filtered}
            keyExtractor={(item, index) => item.id + "_" + index} // fixed duplicate key
            contentContainerStyle={{ padding: 10, paddingBottom: 80 }}
            renderItem={({ item }) => {
              const isMe = item.sender_id === userId;

              return (
                <TouchableOpacity
                  onLongPress={() => setDeleteModal({ visible: true, id: item.id })}
                  activeOpacity={0.9}
                >
                  <View
                    style={{
                      alignSelf: isMe ? "flex-end" : "flex-start",
                      backgroundColor: isMe ? "#22c55e" : "#1f2937",
                      padding: 18,
                      marginVertical: 6,
                      borderRadius: 16,
                      maxWidth: "90%",
                      minWidth: 120,
                    }}
                  >
                    {/* MESSAGE TEXT */}
                    <Text style={{ color: isMe ? "#000" : "#fff", fontSize: 16 }}>
                      {item.text}
                    </Text>

                    {/* IMAGE */}
                    {item.image_url && (
                      <Image
                        source={{ uri: item.image_url }}
                        style={{
                          width: 250,
                          height: 250,
                          marginTop: 6,
                          borderRadius: 12,
                        }}
                      />
                    )}

                    {/* FILE */}
                    {item.file_url && (
                      <TouchableOpacity
                        onPress={async () => {
                          const { data } = await (supabase as any)
                            .storage.from("chat-files")
                            .createSignedUrl(item.file_url!, 60);

                          if (data?.signedUrl) Linking.openURL(data.signedUrl);
                        }}
                      >
                        <Text style={{ color: "#60a5fa" }}>📎 {item.file_name}</Text>
                      </TouchableOpacity>
                    )}

                    {/* REACTIONS */}
<View style={{ flexDirection: "row", marginTop: 6 }}>
  {["❤️", "😂", "👍", "😮", "😢", "🙏"].map((e) => (
    <TouchableOpacity 
      key={e} 
      onPress={async () => {
        if (!userId) return;
        await (supabase as any).from("messages").insert({
          room_id: roomId,
          sender_id: userId,
          text: e,  // send the emoji as a message
        });
      }}
    >
      <Text style={{ marginRight: 8 }}>{e}</Text>
    </TouchableOpacity>
  ))}
</View>

                    {/* EDIT & DELETE BUTTONS */}
                    {isMe && !item.deleted_for_everyone && (
                      <View style={{ flexDirection: "row", marginTop: 4 }}>
                        <TouchableOpacity onPress={() => openEdit(item)}>
                          <Text style={{ color: "#facc15", marginRight: 12 }}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setDeleteModal({ visible: true, id: item.id })}>
                          <Text style={{ color: "#f87171" }}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    
                    {/* SEEN TICK */}
                    <Text style={{ fontSize: 10, marginTop: 4 }}>
                      {new Date(item.created_at).toLocaleTimeString()} {item.seen ? "✓" : ""}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />

          {/* TYPING */}
          {typing && <Text style={{ color: "#9ca3af", paddingLeft: 20 }}>Typing...</Text>}

          {/* INPUT */}
          <View
            style={{
              flexDirection: "row",
              padding: 12,
              paddingBottom: Platform.OS === "android" ? 20 : 10,
              backgroundColor: "#111827",
              alignItems: "center",
            }}
          >
            <TouchableOpacity onPress={sendImage}>
              <Text style={{ fontSize: 22, marginRight: 10 }}>🖼</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={sendCamera}>
              <Text style={{ fontSize: 22, marginRight: 10 }}>📷</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={sendFile}>
              <Text style={{ fontSize: 22, marginRight: 10 }}>📎</Text>
            </TouchableOpacity>

            <TextInput
              value={text}
              onChangeText={handleTyping}
              placeholder="Type a message..."
              placeholderTextColor="#9ca3af"
              multiline
              style={{
                flex: 1,
                minHeight: 50,
                maxHeight: 120,
                backgroundColor: "#1f2937",
                color: "#fff",
                borderRadius: 30,
                paddingHorizontal: 20,
                paddingVertical: 10,
                fontSize: 16,
              }}
            />

            <TouchableOpacity onPress={sendText} style={{ marginLeft: 10 }}>
              <Text style={{ color: "#22c55e", fontWeight: "bold" }}>Send</Text>
            </TouchableOpacity>
          </View>

          {/* DELETE MODAL */}
          <Modal visible={deleteModal.visible} transparent animationType="fade">
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
                  maxWidth: 300,
                }}
              >
                <TouchableOpacity onPress={() => deleteForMe(deleteModal.id!)}>
                  <Text style={{ color: "white", fontSize: 16, marginBottom: 12 }}>
                    Delete for me
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteForEveryone(deleteModal.id!)}>
                  <Text style={{ color: "red", fontSize: 16 }}>Delete for everyone</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setDeleteModal({ visible: false, id: null })}>
                  <Text style={{ color: "#22c55e", fontSize: 16, marginTop: 12, textAlign: "center" }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* EDIT MODAL */}
          <Modal visible={editModalVisible} transparent animationType="slide">
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "rgba(0,0,0,0.6)",
                padding: 20,
              }}
            >
              <View
                style={{
                  backgroundColor: "#1f2937",
                  padding: 20,
                  borderRadius: 12,
                  width: "100%",
                  maxWidth: 400,
                }}
              >
                <Text style={{ color: "white", fontWeight: "bold", marginBottom: 12 }}>
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
                    marginBottom: 12,
                  }}
                />
                <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
                  <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                    <Text style={{ color: "#f87171", marginRight: 12 }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={saveEdit}>
                    <Text style={{ color: "#22c55e" }}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}