import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
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
  const [typing, setTyping] = useState(false);
  const [online, setOnline] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState("");

  // ===== EDIT MODAL =====
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editText, setEditText] = useState("");
  const [editId, setEditId] = useState<number | null>(null);

  const flatRef = useRef<FlatList<Message>>(null);

  // ===== LOAD USER =====
  useEffect(() => {
    const loadUser = async () => {
      const { data } = await (supabase as any).auth.getUser();
      if (data.user) setUserId(data.user.id);
    };
    loadUser();
  }, []);

  // ===== FETCH MESSAGES =====
  const fetchMessages = async () => {
    if (!roomId || !userId) return;

    const { data } = await (supabase as any)
      .from("messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (data) setMessages(data as Message[]);

    // mark unseen messages as seen
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

  // ===== REALTIME MESSAGES =====
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
        (payload: any) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, [roomId]);

  // ===== AUTO SCROLL =====
  useEffect(() => {
    flatRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // ===== TYPING =====
  const handleTyping = (value: string) => {
    setText(value);
    setTyping(true);
    setTimeout(() => setTyping(false), 1500);
  };

  // ===== SEND TEXT =====
  const sendText = async () => {
    if (!text.trim() || !userId) return;

    await (supabase as any).from("messages").insert({
      room_id: roomId,
      sender_id: userId,
      text,
    });

    setText("");
  };

  // ===== SEND IMAGE =====
  const sendImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return alert("Permission required");

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (result.canceled || !userId) return;

    const file = result.assets[0].uri;
    const uploadedUrl = await uploadVideo(file);

    await (supabase as any).from("messages").insert({ room_id: roomId, sender_id: userId, image_url: uploadedUrl });
  };

  // ===== CAMERA PHOTO =====
  const sendCameraPhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return alert("Camera permission required");

    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled || !userId) return;

    const file = result.assets[0].uri;
    const uploadedUrl = await uploadVideo(file);

    await (supabase as any).from("messages").insert({ room_id: roomId, sender_id: userId, image_url: uploadedUrl });
  };

  // ===== FILE ATTACH =====
  const sendFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({});
    if (result.canceled || !userId) return;

    const response = await fetch(result.assets[0].uri);
    const blob = await response.blob();
    const filePath = `${userId}/${Date.now()}_${result.assets[0].name}`;

    await (supabase as any).storage.from("chat-files").upload(filePath, blob);
    await (supabase as any).from("messages").insert({
      room_id: roomId,
      sender_id: userId,
      file_url: filePath,
      file_name: result.assets[0].name,
    });
  };

  // ===== DELETE MESSAGE =====
  const deleteMessage = async (id: number) => {
    await (supabase as any).from("messages").delete().eq("id", id);
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  };

  // ===== OPEN EDIT MODAL =====
  const openEdit = (item: Message) => {
    setEditId(item.id);
    setEditText(item.text ?? "");
    setEditModalVisible(true);
  };

  const saveEdit = async () => {
    if (!editId) return;
    await (supabase as any).from("messages").update({ text: editText }).eq("id", editId);

    setMessages((prev) => prev.map((msg) => (msg.id === editId ? { ...msg, text: editText } : msg)));
    setEditModalVisible(false);
  };

  // ===== APP STATE ONLINE STATUS =====
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      setOnline(state === "active");
    });

    return () => subscription.remove();
  }, []);

  // ===== REFRESH EVERY 60 SECONDS =====
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMessages();
    }, 60000);

    return () => clearInterval(interval);
  }, [roomId, userId]);

  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );

  // ===== FILTER MESSAGES IF SEARCH IS ACTIVE =====
  const filteredMessages = showSearch
    ? messages.filter((msg) => (msg.text ?? "").toLowerCase().includes(searchText.toLowerCase()))
    : messages;

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
          <View style={{ flexDirection: "row", alignItems: "center", padding: 10, paddingHorizontal: 20, backgroundColor: "#111827" }}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={{ color: "#22c55e", fontSize: 26 }}>←</Text>
            </TouchableOpacity>
            {!showSearch ? (
              <>
                <Text style={{ color: "white", fontSize: 18, fontWeight: "600", marginLeft: 10 }}>
                  Chat {online ? "🟢" : "⚪"}
                </Text>
                <TouchableOpacity style={{ marginLeft: "auto" }} onPress={() => setShowSearch(true)}>
                  <Text style={{ color: "#9ca3af", fontSize: 20 }}>🔍</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search messages..."
                placeholderTextColor="#9ca3af"
                style={{
                  flex: 1,
                  backgroundColor: "#1f2937",
                  color: "white",
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  height: 40,
                  marginLeft: 10,
                }}
              />
            )}
          </View>

          {/* MESSAGES */}
          <FlatList
            ref={flatRef}
            data={filteredMessages}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ padding: 10 }}
            renderItem={({ item }) => {
              const isMe = item.sender_id === userId;
              return (
                <View
                  style={{
                    alignSelf: isMe ? "flex-end" : "flex-start",
                    backgroundColor: isMe ? "#22c55e" : "#1f2937",
                    padding: 12,
                    marginVertical: 4,
                    borderRadius: 16,
                    maxWidth: "80%",
                  }}
                >
                  {item.text && <Text style={{ color: isMe ? "#000" : "#fff", fontSize: 16 }}>{item.text}</Text>}

                  {item.image_url && <Image source={{ uri: item.image_url }} style={{ width: 200, height: 200, borderRadius: 12, marginTop: 6 }} />}

                  {item.file_url && (
                    <TouchableOpacity
                      onPress={async () => {
                        const { data } = await (supabase as any).storage.from("chat-files").createSignedUrl(item.file_url!, 60);
                        if (data?.signedUrl) Linking.openURL(data.signedUrl);
                      }}
                    >
                      <Text style={{ color: "#60a5fa" }}>📎 {item.file_name}</Text>
                    </TouchableOpacity>
                  )}

                  {/* QUICK ACTIONS */}
                  <View style={{ flexDirection: "row", marginTop: 4 }}>
                    {isMe && (
                      <>
                        <TouchableOpacity onPress={() => deleteMessage(item.id)}>
                          <Text style={{ color: "#f87171", marginRight: 6 }}>Delete</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => openEdit(item)}>
                          <Text style={{ color: "#facc15" }}>Edit</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>

                  {/* REACTIONS */}
                  <View style={{ flexDirection: "row", marginTop: 4 }}>
                    {["❤️", "😂", "👍"].map((emoji) => (
                      <TouchableOpacity
                        key={emoji}
                        onPress={async () => {
                          if (!userId) return;
                          await (supabase as any).from("messages").update({ reaction: emoji }).eq("id", item.id);
                          setMessages((prev) => prev.map((msg) => (msg.id === item.id ? { ...msg, reaction: emoji } : msg)));
                        }}
                        style={{ marginRight: 6 }}
                      >
                        <Text style={{ fontSize: 16 }}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {item.reaction && <Text style={{ marginTop: 4 }}>{item.reaction}</Text>}
                  <Text style={{ fontSize: 10, marginTop: 4 }}>
                    {new Date(item.created_at).toLocaleTimeString()} {item.seen ? "✓" : ""}
                  </Text>
                </View>
              );
            }}
          />

          {typing && <Text style={{ color: "#9ca3af", paddingLeft: 20 }}>Typing...</Text>}

          {/* INPUT */}
          <View style={{ flexDirection: "row", alignItems: "flex-end", padding: 12, paddingBottom: Platform.OS === "android" ? 20 : 10, backgroundColor: "#111827" }}>
            <TouchableOpacity onPress={sendImage}>
              <Text style={{ fontSize: 22, marginRight: 10 }}>🖼</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={sendCameraPhoto}>
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

          {/* ===== EDIT MODAL ===== */}
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
              <View style={{ backgroundColor: "#1f2937", padding: 20, borderRadius: 12, width: "100%", maxWidth: 400 }}>
                <Text style={{ color: "white", fontWeight: "bold", marginBottom: 12 }}>Edit Message</Text>
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