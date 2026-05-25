import { useEffect, useRef, useState } from "react";

import {
    FlatList,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { useLocalSearchParams } from "expo-router";

import { supabase } from "../../lib/supabase";

export default function GroupChatScreen() {

  const { id } =
    useLocalSearchParams();

  const groupId =
    typeof id === "string"
      ? id
      : "";

  const [messages, setMessages] =
    useState<any[]>([]);

  const [text, setText] =
    useState("");

  const [userId, setUserId] =
    useState<string | null>(null);

  const flatRef =
    useRef<FlatList>(null);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {

    const { data } =
      await (supabase as any)
        .auth.getUser();

    if (data.user) {
      setUserId(data.user.id);
    }

    loadMessages();
    subscribe();
  };

  const loadMessages =
    async () => {

      const { data } =
        await (supabase as any)
          .from("messages")
          .select("*")
          .eq("group_id", groupId)
          .order(
            "created_at",
            {
              ascending: true,
            }
          );

      if (data) {
        setMessages(data);
      }
    };

  const subscribe = () => {

    const channel =
      (supabase as any)
        .channel(
          `group_${groupId}`
        )

        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter:
              `group_id=eq.${groupId}`,
          },

          (payload: any) => {

            setMessages(
              (prev) => {

                const exists =
                  prev.some(
                    (m) =>
                      m.id ===
                      payload.new.id
                  );

                if (exists)
                  return prev;

                return [
                  ...prev,
                  payload.new,
                ];
              }
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
  };

  const sendMessage =
    async () => {

      if (
        !text.trim() ||
        !userId
      )
        return;

      const value =
        text.trim();

      setText("");

      await (
        supabase as any
      )
        .from("messages")
        .insert({
          group_id:
            groupId,
          sender_id:
            userId,
          text: value,
        });
    };

  useEffect(() => {
    flatRef.current?.scrollToEnd({
      animated: true,
    });
  }, [messages]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#0f172a",
      }}
    >
      {/* MESSAGES */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(item) =>
          item.id.toString()
        }
        contentContainerStyle={{
          padding: 14,
        }}
        renderItem={({ item }) => {

          const isMe =
            item.sender_id ===
            userId;

          return (
            <View
              style={{
                alignSelf: isMe
                  ? "flex-end"
                  : "flex-start",

                backgroundColor:
                  isMe
                    ? "#22c55e"
                    : "#1f2937",

                padding: 14,
                borderRadius: 16,
                marginBottom: 10,
                maxWidth: "85%",
              }}
            >
              <Text
                style={{
                  color: isMe
                    ? "black"
                    : "white",
                }}
              >
                {item.text}
              </Text>
            </View>
          );
        }}
      />

      {/* INPUT */}
      <View
        style={{
          flexDirection: "row",
          padding: 12,
          backgroundColor: "#111827",
        }}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message group..."
          placeholderTextColor="#9ca3af"
          style={{
            flex: 1,
            backgroundColor: "#1f2937",
            color: "white",
            borderRadius: 30,
            paddingHorizontal: 20,
            paddingVertical: 12,
          }}
        />

        <TouchableOpacity
          onPress={sendMessage}
          style={{
            marginLeft: 10,
            justifyContent: "center",
          }}
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
    </View>
  );
}