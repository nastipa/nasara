import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import { supabase } from "../lib/supabase";
import { uploadVideo } from "../lib/uploadVideo";

const { width } = Dimensions.get("window");

export default function CreateReel() {
  const router = useRouter();

  const [video, setVideo] = useState<any>(null);
  const [caption, setCaption] = useState("");

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  /* ================= VIDEO PLAYER ================= */
  const player = useVideoPlayer(null);

  useEffect(() => {
    if (!player) return;

    if (video?.uri) {
      player.replace(video.uri);

      // 🔥 ANDROID FIX (force render)
      setTimeout(() => {
        player.play();
      }, 300);
    } else {
      player.replace(null);
    }

    player.loop = false;
    player.muted = false;
  }, [video?.uri]);

  /* ================= RECORD VIDEO ================= */
  const recordVideo = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission required");
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 60,
      quality: 1,
    });

    if (!res.canceled) {
      setVideo({ uri: res.assets[0].uri });
    }
  };

  /* ================= PICK VIDEO ================= */
  const pickVideo = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });

    if (!res.canceled) {
      setVideo({ uri: res.assets[0].uri });
    }
  };

  /* ================= THUMBNAIL ================= */
  const generateThumbnail = async () => {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(video.uri, {
        time: 1000,
      });
      return uri;
    } catch {
      return null;
    }
  };

  /* ================= POST REEL ================= */
  const postReel = async () => {
    if (!video) {
      Alert.alert("Select video first");
      return;
    }

    setLoading(true);
    setProgress(0);

    const { data } = await supabase.auth.getUser();
    const userId = data?.user?.id;

    if (!userId) {
      Alert.alert("Login required");
      setLoading(false);
      return;
    }

    try {
      console.log("🎬 Starting upload...");

      const thumbnail = await generateThumbnail();

      /* ================= UPLOAD ================= */
      const result = await uploadVideo(video.uri, (p: number) => {
        setProgress(p); // 🔥 REAL % PROGRESS
      });

      console.log("✅ Upload done:", result);

      /* ================= SAVE POST ================= */
      const { data: newPost, error } = await (supabase as any)
        .from("posts")
        .insert({
          user_id: userId,
          caption,
          media_url: result.video,
          thumbnail_url: result.thumbnail || thumbnail,
          status: "ready",
          views: 0,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      console.log("✅ Post created:", newPost);

      /* ================= NOTIFY FOLLOWERS (LIGHTWEIGHT) ================= */
      const { data: followers } = await (supabase as any)
        .from("follows")
        .select("follower_id")
        .eq("following_id", userId);

      if (followers?.length) {
        const inserts = followers.map((f: any) => ({
          user_id: f.follower_id,
          sender_id: userId,
          type: "reel",
          title: "🎥 New Reel",
          body: caption || "New reel uploaded",
          ref_id: newPost.id,
          read: false,
        }));

        await (supabase as any).from("notifications").insert(inserts);
      }

      /* ================= NAVIGATE ================= */
      router.replace("/reels");

    } catch (err: any) {
      console.log("❌ ERROR:", err);
      Alert.alert("Upload failed", err.message || "Try again");
    }

    setLoading(false);
    setProgress(0);
  };

  /* ================= UI ================= */
  return (
    <View style={styles.container}>

      {/* BACK */}
      <TouchableOpacity
        onPress={() => router.replace("/browse")}
        style={styles.backBtn}
      >
        <Text style={{ color: "white" }}>⬅ Home</Text>
      </TouchableOpacity>

      {/* RECORD */}
      <TouchableOpacity
        onPress={recordVideo}
        style={[styles.btn, { backgroundColor: "#ef4444" }]}
      >
        <Text style={styles.txt}>🎥 Record Video</Text>
      </TouchableOpacity>

      {/* PICK */}
      <TouchableOpacity onPress={pickVideo} style={styles.btn}>
        <Text style={styles.txt}>Pick Video</Text>
      </TouchableOpacity>

      {/* PREVIEW */}
      {video && (
        <>
          <View style={{ backgroundColor: "black" }}>
            <VideoView
              key={video?.uri}
              player={player}
              style={styles.preview}
              contentFit="cover"
              nativeControls // 🔥 important for Android
            />
          </View>

          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Caption"
            placeholderTextColor="#aaa"
            style={styles.input}
          />

          {/* PROGRESS BAR */}
          {loading && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.progressText}>
                Uploading {progress}%
              </Text>

              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progress}%`},
                  ]}
                />
              </View>
            </View>
          )}

          {/* POST */}
          <TouchableOpacity onPress={postReel} style={styles.post}>
            <Text style={styles.txt}>
              {loading ? "Uploading..." : "Post Reel"}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {loading && <ActivityIndicator color="white" />}
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    paddingTop: 40,
  },

  preview: {
    width: "100%",
    height: 300,
    backgroundColor: "black",
  },

  btn: {
    backgroundColor: "#222",
    padding: 15,
    margin: 10,
    alignItems: "center",
    borderRadius: 10,
  },

  txt: {
    color: "white",
    fontWeight: "600",
  },

  input: {
    color: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#444",
    margin: 10,
    paddingBottom: 6,
  },

  post: {
    backgroundColor: "green",
    padding: 15,
    margin: 20,
    alignItems: "center",
    borderRadius: 12,
  },

  progressText: {
    color: "white",
    textAlign: "center",
    marginBottom: 5,
  },

  progressBar: {
    height: 6,
    backgroundColor: "#333",
    borderRadius: 10,
    overflow: "hidden",
    marginHorizontal: 20,
  },

  progressFill: {
    height: 6,
    backgroundColor: "#22c55e",
  },

  backBtn: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 999,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 10,
    borderRadius: 8,
  },
});