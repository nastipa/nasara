import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { getUserSafe } from "../lib/auth";
import { supabase } from "../lib/supabase";


export default function LikeButton({ postId }: { postId: string }) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  /* ================= LOAD LIKES ================= */
  useEffect(() => {
    loadLikes();
  }, [postId]);

  const loadLikes = async () => {
    try {
      const user = await getUserSafe();
      const userId = user?.id;

      /* COUNT */
      const { count } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);

      setCount(count || 0);

      if (!userId) return;

      /* CHECK IF USER LIKED */
      const { data } = await supabase
        .from("likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .maybeSingle();

      setLiked(!!data);
    } catch (e) {
      console.log("Like load error:", e);
    }
  };

  /* ================= TOGGLE LIKE (OPTIMISTIC UI) ================= */
  const toggleLike = async () => {
    if (loading) return;
    setLoading(true);

    const user = await getUserSafe();
    const userId = user?.id;

    if (!userId) {
      setLoading(false);
      return;
    }

    const newLiked = !liked;

    // 🔥 INSTANT UI UPDATE (NO WAIT)
    setLiked(newLiked);
    setCount((c) => (newLiked ? c + 1 : c - 1));

    try {
      if (newLiked) {
        const { error } = await (supabase as any).from("likes").insert({
          post_id: postId,
          user_id: userId,
        });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId);

        if (error) throw error;
      }
    } catch (e) {
      console.log("Like toggle error:", e);

      // rollback UI if failed
      setLiked(!newLiked);
      setCount((c) => (newLiked ? c - 1 : c + 1));
    }

    setLoading(false);
  };

  return (
    <Pressable onPress={toggleLike}>
      <View style={{ alignItems: "center", opacity: loading ? 0.5 : 1 }}>
        <Ionicons
          name={liked ? "heart" : "heart-outline"}
          size={28}
          color={liked ? "red" : "white"}
        />

        <Text style={{ color: "white", fontSize: 12 }}>
          {count}
        </Text>
      </View>
    </Pressable>
  );
}