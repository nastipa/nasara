import { router } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { supabase } from "../lib/supabase";

const { height, width } = Dimensions.get("window");

export default function ReelCard({ post }: any) {

  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState(0);

  const [profile, setProfile] = useState<any>(null);

  /* VIDEO PLAYER */

  const player = useVideoPlayer(post.video_url);

  useEffect(() => {
    player.loop = true;
    player.play();
  }, []);

  useEffect(() => {
    loadLikes();
    loadComments();
    loadUser();
  }, []);

  /* ================= LOAD USER ================= */

  async function loadUser() {

    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", post.user_id)
      .single();

    if (data) setProfile(data);

  }

  /* ================= LOAD LIKES ================= */

  async function loadLikes() {

    const { data } = await supabase
      .from("post_likes")
      .select("*")
      .eq("post_id", post.id);

    setLikes(data?.length || 0);

  }

  /* ================= LOAD COMMENTS ================= */

  async function loadComments() {

    const { count } = await supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("post_id", post.id);

    setComments(count || 0);

  }

  /* ================= LIKE POST ================= */

  async function likePost() {

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    if (liked) {

      await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", user.id);

      setLiked(false);
      setLikes((prev) => prev - 1);

    } else {

      await (supabase as any)
        .from("post_likes")
        .insert({
          post_id: post.id,
          user_id: user.id
        });

      setLiked(true);
      setLikes((prev) => prev + 1);

    }

  }

  return (

    <View style={styles.container}>

      {/* VIDEO */}

      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
      />

      {/* USER INFO */}

      <View style={styles.userInfo}>

        {profile?.avatar_url && (
          <Image
            source={{ uri: profile.avatar_url }}
            style={styles.avatar}
          />
        )}

        <TouchableOpacity
          onPress={() => router.push(`/seller/${post.user_id}`)}
        >
          <Text style={styles.username}>
            {profile?.username || "User"}
          </Text>
        </TouchableOpacity>

      </View>

      {/* RIGHT SIDE ACTIONS */}

      <View style={styles.actions}>

        {/* LIKE */}

        <TouchableOpacity onPress={likePost} style={styles.button}>
          <Text style={styles.icon}>{liked ? "❤️" : "🤍"}</Text>
          <Text style={styles.text}>{likes}</Text>
        </TouchableOpacity>

        {/* COMMENTS */}

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push(`/comments?postId=${post.id}`)}
        >
          <Text style={styles.icon}>💬</Text>
          <Text style={styles.text}>{comments}</Text>
        </TouchableOpacity>

        {/* PROFILE */}

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push(`/seller/${post.user_id}`)}
        >
          <Text style={styles.icon}>👤</Text>
          <Text style={styles.text}>Profile</Text>
        </TouchableOpacity>

        {/* PRODUCT */}

        {post.product_id && (
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push(`/item/${post.product_id}`)}
          >
            <Text style={styles.icon}>🛒</Text>
            <Text style={styles.text}>View</Text>
          </TouchableOpacity>
        )}

      </View>

    </View>

  );

}

const styles = StyleSheet.create({

  container: {
    height,
    width,
    backgroundColor: "black"
  },

  video: {
    height: "100%",
    width: "100%"
  },

  actions: {
    position: "absolute",
    right: 10,
    bottom: 120,
    alignItems: "center"
  },

  button: {
    marginBottom: 20,
    alignItems: "center"
  },

  icon: {
    fontSize: 28,
    color: "white"
  },

  text: {
    color: "white",
    fontSize: 12
  },

  userInfo: {
    position: "absolute",
    bottom: 40,
    left: 10,
    flexDirection: "row",
    alignItems: "center"
  },

  avatar: {
    width: 35,
    height: 35,
    borderRadius: 18,
    marginRight: 8
  },

  username: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14
  }

});