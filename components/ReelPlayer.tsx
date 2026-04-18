import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

type Props = {
  id: string;
  url: string | null;
  localUri?: string | null;
  active: boolean;
  thumbnail?: string | null;
};

export default function ReelPlayer({
  url,
  localUri,
  active,
  thumbnail,
}: Props) {
  const [paused, setPaused] = useState(true);
  const [loading, setLoading] = useState(true);

  const mutedRef = useRef(false);
  const [, forceUpdate] = useState(0);

  const opacity = useRef(new Animated.Value(0)).current;

  /* ================= SAFE VIDEO URL ================= */
  const videoUrl = useMemo(() => {
    const raw = localUri || url;
    if (!raw || typeof raw !== "string") return null;
    return raw;
  }, [url, localUri]);

  /* ================= PLAYER ================= */
  const player = useVideoPlayer({
    uri: videoUrl || "https://www.w3schools.com/html/mov_bbb.mp4",
  });

  /* ================= RESET WHEN VIDEO CHANGES ================= */
  useEffect(() => {
    if (!player) return;

    try {
      player.pause();
      player.currentTime = 0;
    } catch {}
  }, [videoUrl, player]);

  /* ================= CLEAN UNMOUNT ================= */
  useEffect(() => {
    return () => {
      try {
        player?.pause?.();
        player.currentTime = 0;
      } catch {}
    };
  }, [player]);

  /* ================= LOADING (NO duration dependency) ================= */
  useEffect(() => {
    if (!videoUrl) return;

    setLoading(true);
    opacity.setValue(0);

    // fallback loader (reliable across web + apk)
    const timer = setTimeout(() => {
      setLoading(false);

      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }, 1200);

    return () => clearTimeout(timer);
  }, [videoUrl, active]);

  /* ================= AUTOPLAY ================= */
  useEffect(() => {
    if (!player || !videoUrl) return;

    player.loop = true;

    if (active) {
      try {
        player.muted = mutedRef.current;
        player.play();
        setPaused(false);
      } catch (e) {
        console.log("play error:", e);
      }
    } else {
      try {
        player.pause();
        player.currentTime = 0;
      } catch {}
      setPaused(true);
    }
  }, [active, player, videoUrl]);

  /* ================= CONTROLS ================= */
  const toggleMute = () => {
    mutedRef.current = !mutedRef.current;

    try {
      player.muted = mutedRef.current;
    } catch {}

    forceUpdate((p) => p + 1);
  };

  const togglePlay = () => {
    if (!videoUrl) return;

    try {
      if (paused) {
        player.play();
        setPaused(false);
      } else {
        player.pause();
        setPaused(true);
      }
    } catch {}
  };

  /* ================= UI ================= */
  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={togglePlay}
      style={styles.container}
    >
      {/* Thumbnail fallback */}
      {!videoUrl && thumbnail && (
        <Image source={{ uri: thumbnail }} style={styles.video} />
      )}

      {/* Video */}
      {videoUrl && (
        <Animated.View style={[styles.video, { opacity }]}>
          <VideoView player={player} style={styles.video} />
        </Animated.View>
      )}

      {/* Loader */}
      {videoUrl && loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="white" />
        </View>
      )}

      {/* Play icon */}
      {paused && videoUrl && !loading && (
        <View style={styles.playButton}>
          <Ionicons name="play" size={80} color="white" />
        </View>
      )}

      {/* Mute button */}
      {videoUrl && (
        <TouchableOpacity style={styles.volume} onPress={toggleMute}>
          <Ionicons
            name={mutedRef.current ? "volume-mute" : "volume-high"}
            size={26}
            color="white"
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: {
    width,
    height,
    backgroundColor: "black",
  },
  video: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
  },
  playButton: {
    position: "absolute",
    top: "45%",
    left: "42%",
  },
  volume: {
    position: "absolute",
    top: 70,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    padding: 10,
    borderRadius: 40,
  },
});