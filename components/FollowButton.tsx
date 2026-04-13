import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { supabase } from "../lib/supabase";
import { getUserSafe } from "../lib/auth";

export default function FollowButton({ userId }: { userId: string }) {
  const [following, setFollowing] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /* ================= LOAD USER ================= */
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const user = await getUserSafe();
    setMyId(user?.id ?? null);
  };

  /* ================= CHECK FOLLOW ================= */
  useEffect(() => {
    if (myId && userId) {
      checkFollow();
    }
  }, [myId, userId]);

  const checkFollow = async () => {
    if (!myId) return;

    try {
      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", myId)
        .eq("following_id", userId)
        .maybeSingle();

      setFollowing(!!data);
    } catch (e) {
      console.log("Follow check error:", e);
    }
  };

  /* ================= TOGGLE FOLLOW (OPTIMISTIC UI) ================= */
  const toggleFollow = async () => {
    if (loading) return;
    setLoading(true);

    const user = await getUserSafe();
    const userIdSafe = user?.id;

    if (!userIdSafe) {
      setLoading(false);
      return;
    }

    const newState = !following;

    // 🔥 INSTANT UI UPDATE
    setFollowing(newState);

    try {
      if (newState) {
        const { error } = await (supabase as any).from("follows").insert({
          follower_id: userIdSafe,
          following_id: userId,
        });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", userIdSafe)
          .eq("following_id", userId);

        if (error) throw error;
      }
    } catch (e) {
      console.log("Follow toggle error:", e);

      // rollback if failed
      setFollowing(!newState);
    }

    setLoading(false);
  };

  return (
    <TouchableOpacity
      onPress={toggleFollow}
      style={[
        styles.button,
        following && styles.following,
        loading && { opacity: 0.6 },
      ]}
    >
      <Text style={styles.text}>
        {following ? "Following" : "Follow"}
      </Text>
    </TouchableOpacity>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  button: {
    backgroundColor: "#ff2d55",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  following: {
    backgroundColor: "#555",
  },
  text: {
    color: "white",
    fontWeight: "bold",
  },
});