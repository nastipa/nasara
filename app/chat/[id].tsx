import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

type Message = {
  id: number;
  room_id: string;
  sender_id: string;
  text: string;
  created_at: string;
  read: boolean;
};

export default function ChatRoom() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // ALWAYS STRING ROOM ID
  const roomId =
    typeof params.id === "string" ? params.id : "";

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const flatListRef = useRef<FlatList<Message>>(null);

  // ===== LOAD USER =====
  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        Alert.alert("Error", "User not logged in");
        return;
      }
      setUserId(data.user.id);
    };

    loadUser();
  }, []);

  // ===== LOAD MESSAGES =====
  useEffect(() => {
    if (!roomId || !userId) return;

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });

      if (error) {
        setLoading(false);
        return;
      }

      if (data) {
        setMessages(data as Message[]);

        // 🔥 MARK ALL OTHER USER MESSAGES AS READ
        await (supabase as any)
          .from("messages")
          .update({ read: true })
          .eq("room_id", roomId)
          .neq("sender_id", userId);

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }

      setLoading(false);
    };

    loadMessages();

    const interval = setInterval(loadMessages, 2000);
    return () => clearInterval(interval);
  }, [roomId, userId]);

  // ===== SEND MESSAGE =====
  const sendMessage = async () => {
    if (!text.trim() || !userId || !roomId) return;

    const { error } = await (supabase as any).from("messages").insert({
      room_id: roomId,
      sender_id: userId,
      text: text.trim(),
      read: false,
    });

    if (error) {
      Alert.alert("Send failed", error.message);
      return;
    }

    setText("");
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* 🔙 FLOATING BACK BUTTON */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          position: "absolute",
          top: 40,
          left: 20,
          zIndex: 10,
          backgroundColor: "#000",
          padding: 12,
          borderRadius: 30,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 20 }}>←</Text>
      </TouchableOpacity>

      {/* ===== MESSAGES ===== */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 12, paddingTop: 80 }}
        renderItem={({ item }) => {
          const isMe = item.sender_id === userId;

          return (
            <View
              style={{
                flexDirection: isMe ? "row-reverse" : "row",
                marginBottom: 10,
              }}
            >
              <View
                style={{
                  maxWidth: "75%",
                  backgroundColor: isMe ? "#DCF8C6" : "#fff",
                  padding: 10,
                  borderRadius: 10,
                }}
              >
                <Text>{item.text}</Text>
              </View>
            </View>
          );
        }}
      />

      {/* ===== INPUT ===== */}
      <View
        style={{
          flexDirection: "row",
          padding: 10,
          borderTopWidth: 1,
          borderColor: "#ddd",
          backgroundColor: "#fff",
        }}
      >
        <>
  <Stack.Screen options={{ title: "Chat" }} />

  {/* rest of your chat UI */}
</>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type a message"
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 8,
            marginRight: 8,
          }}
        />

        <TouchableOpacity
          onPress={sendMessage}
          style={{
            backgroundColor: "#25D366",
            paddingHorizontal: 20,
            justifyContent: "center",
            borderRadius: 20,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
            Send
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    
  );
}