import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";

import {
    ActivityIndicator,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import * as ImagePicker from "expo-image-picker";

import { supabase } from "../../lib/supabase";

export default function DeliveryChat() {

  const { id } =
    useLocalSearchParams();

  const flatListRef =
    useRef<FlatList>(null);

  const [messages, setMessages] =
    useState<any[]>([]);

  const [text, setText] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  /* ================= LOAD ================= */

  async function loadMessages() {

    if (!id) return;

    try {

      const {
        data,
      } =
        await (supabase as any)
          .from("delivery_messages")
          .select("*")
          .eq(
            "delivery_id",
            id
          )
          .order(
            "created_at",
            {
              ascending: true,
            }
          );

      setMessages(data || []);

      setTimeout(() => {

        flatListRef.current?.scrollToEnd({
          animated: true,
        });

      }, 300);

    } catch (err) {

      console.log(err);
    }

    setLoading(false);
  }

  /* ================= INITIAL ================= */

  useEffect(() => {
    loadMessages();
  }, [id]);

  /* ================= REALTIME ================= */

  useEffect(() => {

    if (!id) return;

    const channel =
      (supabase as any)
        .channel(
          `delivery-chat-${id}`
        )

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "delivery_messages",
            filter: `delivery_id=eq.${id}`,
          },
          () => {
            loadMessages();
          }
        )

        .subscribe();

    return () => {
      (supabase as any)
        .removeChannel(channel);
    };

  }, [id]);

  /* ================= SEND TEXT ================= */

  async function sendMessage() {

    if (
      sending ||
      !text.trim()
    )
      return;

    try {

      setSending(true);

      const {
        data: authData,
      } =
        await supabase.auth.getUser();

      const user =
        authData?.user;

      if (!user) {

        setSending(false);

        return;
      }

      await (supabase as any)
        .from(
          "delivery_messages"
        )
        .insert({

          delivery_id: id,

          sender_id:
            user.id,

          message:
            text.trim(),

          type: "text",
        });

      setText("");

    } catch (err) {

      console.log(err);
    }

    setSending(false);
  }

  /* ================= IMAGE ================= */

  async function pickImage() {

    try {

      const perm =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!perm.granted)
        return;

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes:
            ImagePicker.MediaTypeOptions.Images,

          quality: 0.7,
        });

      if (result.canceled)
        return;

      const uri =
        result.assets[0].uri;

      const formData =
        new FormData();

      if (
        Platform.OS === "web"
      ) {

        const response =
          await fetch(uri);

        const blob =
          await response.blob();

        formData.append(
          "file",
          blob,
          "delivery.jpg"
        );

      } else {

        formData.append(
          "file",
          {
            uri,
            name:
              "delivery.jpg",
            type:
              "image/jpeg",
          } as any
        );
      }

      const upload =
        await fetch(
          "https://nasara-upload-server.onrender.com/upload",
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await upload.json();

      if (!data?.url)
        return;

      const {
        data: authData,
      } =
        await supabase.auth.getUser();

      const user =
        authData?.user;

      await (supabase as any)
        .from(
          "delivery_messages"
        )
        .insert({

          delivery_id: id,

          sender_id:
            user?.id,

          message:
            data.url,

          type: "image",
        });

    } catch (err) {

      console.log(err);
    }
  }

  /* ================= LOADING ================= */

  if (loading) {

    return (
      <ActivityIndicator
        style={{
          flex: 1,
        }}
        size="large"
      />
    );
  }

  /* ================= UI ================= */

  return (

    <KeyboardAvoidingView
      style={{
        flex: 1,
      }}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{
          padding: 15,
        }}
        renderItem={({
          item,
        }) => (

          <View
            style={{
              backgroundColor:
                "#fff",
              padding: 12,
              borderRadius: 12,
              marginBottom: 12,
              maxWidth: "80%",
              alignSelf:
                "flex-start",
            }}
          >

            {item.type ===
            "image" ? (

              <Image
                source={{
                  uri:
                    item.message,
                }}
                style={{
                  width: 220,
                  height: 220,
                  borderRadius: 12,
                }}
              />

            ) : (

              <Text>
                {
                  item.message
                }
              </Text>

            )}

          </View>
        )}
      />

      {/* ================= INPUT ================= */}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 10,
          borderTopWidth: 1,
          borderColor: "#eee",
          backgroundColor:
            "#fff",
        }}
      >

        <TouchableOpacity
          onPress={pickImage}
          style={{
            marginRight: 10,
          }}
        >

          <Text
            style={{
              fontSize: 24,
            }}
          >
            📷
          </Text>

        </TouchableOpacity>

        <TextInput
          placeholder="Type message..."
          value={text}
          onChangeText={
            setText
          }
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor:
              "#ddd",
            borderRadius: 30,
            paddingHorizontal: 15,
            paddingVertical: 10,
          }}
        />

        <TouchableOpacity
          disabled={sending}
          onPress={
            sendMessage
          }
          style={{
            marginLeft: 10,
            backgroundColor:
              "#16a34a",
            paddingHorizontal: 18,
            paddingVertical: 10,
            borderRadius: 25,
          }}
        >

          <Text
            style={{
              color: "#fff",
              fontWeight:
                "bold",
            }}
          >
            Send
          </Text>

        </TouchableOpacity>

      </View>

    </KeyboardAvoidingView>
  );
}