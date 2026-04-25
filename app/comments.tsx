import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import CommentLikeButton from "../components/CommentLikeButton";
import { supabase } from "../lib/supabase";

import { useSafeAreaInsets } from "react-native-safe-area-context";

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  text: string;
  parent_id: string | null;
  created_at: string;
};

export default function CommentsPage() {
  const router = useRouter();
  const { postId } = useLocalSearchParams();

  const [comments, setComments] = useState<Comment[]>([]);
  const [message, setMessage] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
 const insets = useSafeAreaInsets();
  /* ================= LOAD ================= */
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
          setComments((prev) => [...prev, newComment]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  async function loadComments() {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (data) setComments(data);
  }

  /* ================= SEND ================= */
  async function sendComment() {
    if (!message.trim()) return;

    const text = message;

    setMessage("");
    setReplyTo(null);

    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;

    if (!userId || !postId) return;

    await (supabase as any).from("comments").insert({
      post_id: postId,
      user_id: userId,
      text,
      parent_id: replyTo,
    });
  }

  /* ================= DELETE ================= */
  async function deleteComment(commentId: string) {
    await supabase.from("comments").delete().eq("id", commentId);

    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  /* ================= STRUCTURE ================= */
  const rootComments = comments.filter((c) => !c.parent_id);

  const getReplies = (id: string) =>
    comments.filter((c) => c.parent_id === id);

  /* ================= RENDER ================= */
  const renderComment = (item: Comment) => {
    const replies = getReplies(item.id);

    return (
      <View style={{ marginBottom: 14 }}>
        {/* MAIN COMMENT */}
        <View style={styles.commentRow}>
          <View style={styles.commentContent}>
            <Text style={styles.text}>{item.text}</Text>

            <View style={styles.actions}>
              <TouchableOpacity onPress={() => setReplyTo(item.id)}>
                <Text style={styles.reply}>Reply</Text>
              </TouchableOpacity>

              <CommentLikeButton commentId={item.id} />

              <TouchableOpacity onPress={() => deleteComment(item.id)}>
                <Text style={styles.delete}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* REPLIES */}
        {replies.map((reply) => (
          <View key={reply.id} style={styles.replyRow}>
            <Text style={styles.text}>{reply.text}</Text>
          </View>
        ))}
      </View>
    );
  };

  /* ================= UI ================= */
  return (
    <TouchableWithoutFeedback onPress={() => router.back()}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback>
         <KeyboardAvoidingView
  behavior={Platform.OS === "ios" ? "padding" : "height"}
  keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
  style={styles.sheet}
>
            {/* HEADER */}
            <View style={styles.header}>
              <Text style={styles.title}>Comments</Text>
            </View>

            {/* COMMENTS LIST */}
            <FlatList
              data={rootComments}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => renderComment(item)}
              ListEmptyComponent={
                <Text style={styles.empty}>No comments yet</Text>
              }
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            />

            {/* REPLY LABEL */}
            {replyTo && (
              <Text style={styles.replying}>Replying...</Text>
            )}

            {/* INPUT BAR (FIXED LIKE TIKTOK) */}
            <View style={styles.inputContainer}>
  <View style={styles.inputRow}>
    <TextInput
      placeholder="Add a comment..."
      value={message}
      onChangeText={setMessage}
      style={styles.input}
      placeholderTextColor="#999"
    />

    <TouchableOpacity onPress={sendComment} style={styles.sendButton}>
      <Text style={styles.sendText}>Send</Text>
    </TouchableOpacity>
  </View>
</View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },

  sheet: {
    height: "85%",
    backgroundColor: "#000", // 🔥 TikTok dark mode
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
  },

  header: {
    alignItems: "center",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: "#222",
  },

  title: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },

  commentRow: {
    paddingHorizontal: 14,
    marginTop: 10,
  },

  commentContent: {
    backgroundColor: "#111",
    padding: 10,
    borderRadius: 10,
  },

  replyRow: {
    marginLeft: 30,
    marginTop: 6,
    backgroundColor: "#0d0d0d",
    padding: 8,
    borderRadius: 8,
  },

  text: {
    color: "white",
    fontSize: 14,
  },

  actions: {
    flexDirection: "row",
    gap: 15,
    marginTop: 6,
  },

  reply: {
    color: "#aaa",
    fontSize: 12,
  },

  delete: {
    color: "#ff4d4d",
    fontSize: 12,
  },

  replying: {
    color: "#aaa",
    paddingLeft: 14,
    marginBottom: 6,
  },

  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "#aaa",
  },

  inputContainer: {
  backgroundColor: "#fff",
  paddingHorizontal: 10,
  paddingVertical: 8,
  borderTopWidth: 1,
  borderColor: "#ddd",
},

inputRow: {
  flexDirection: "row",
  alignItems: "center",
},

input: {
  flex: 1,
  height: 40,
  backgroundColor: "#f2f2f2",
  borderRadius: 20,
  paddingHorizontal: 14,
},

sendButton: {
  marginLeft: 8,
},

sendText: {
  color: "#007AFF",
  fontWeight: "600",
},
});