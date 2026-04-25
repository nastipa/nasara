import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  text: string;
  created_at: string;
};

export default function CommentsScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();

  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);

  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");

  // 🔥 floating animation
  const keyboardOffset = useRef(new Animated.Value(0)).current;

  /* ================= KEYBOARD FLOAT ================= */
  useEffect(() => {
    const show = Keyboard.addListener("keyboardWillShow", (e) => {
      Animated.timing(keyboardOffset, {
        toValue: e.endCoordinates.height,
        duration: 250,
        useNativeDriver: false,
      }).start();
    });

    const hide = Keyboard.addListener("keyboardWillHide", () => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  /* ================= LOAD + REALTIME ================= */
  useEffect(() => {
    if (!postId) return;

    loadComments();

    const channel = (supabase as any)
      .channel("comments-live")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${postId}`,
        },
        (payload: any) => {
          const newComment = payload.new as Comment;

          setComments((prev) => {
            if (prev.find((c) => c.id === newComment.id)) return prev;
            return [newComment, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  const loadComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: false });

    setComments(data || []);
  };

  /* ================= SEND ================= */
  const sendComment = async () => {
    if (!text.trim()) return;

    const message = text;
    setText("");

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user || !postId) return;

    // 🔥 optimistic UI
    const temp: Comment = {
      id: "temp-" + Date.now(),
      post_id: postId,
      user_id: userData.user.id,
      text: message,
      created_at: new Date().toISOString(),
    };

    setComments((prev) => [temp, ...prev]);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });

    const { data, error } = await (supabase as any)
      .from("comments")
      .insert({
        post_id: postId,
        user_id: userData.user.id,
        text: message,
      })
      .select()
      .single();

    if (error) {
      console.log("SEND ERROR:", error.message);
      return;
    }

    if (data) {
      setComments((prev) =>
        prev.map((c) => (c.id === temp.id ? data : c))
      );
    }
  };

  /* ================= UI ================= */
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* COMMENTS */}
        <FlatList
          ref={listRef}
          data={comments}
          keyExtractor={(item) => item.id}
          inverted
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: 10 }}
          renderItem={({ item }) => (
            <View style={styles.comment}>
              <Text style={styles.commentText}>{item.text}</Text>
            </View>
          )}
        />

        {/* FLOATING INPUT */}
        <Animated.View
          style={[
            styles.floatingInput,
            {
             bottom: Animated.add(
  keyboardOffset,
  Platform.OS === "android"
    ? Math.max(insets.bottom, 20)
    : insets.bottom + 10
),
            },
          ]}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Add comment..."
              placeholderTextColor="#aaa"
              style={styles.input}
            />

            <TouchableOpacity onPress={sendComment} style={styles.send}>
              <Text style={styles.sendText}>Send</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#000",
  },

  container: {
    flex: 1,
  },

  comment: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },

  commentText: {
    color: "white",
  },

  floatingInput: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 10,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 30,
    padding: 8,
    borderWidth: 1,
    borderColor: "#222",
  },

  input: {
    flex: 1,
    color: "white",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  send: {
    marginLeft: 8,
    backgroundColor: "#0ea5e9",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },

  sendText: {
    color: "white",
    fontWeight: "600",
  },
});