import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
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
  onView?: (id: string) => void;
};

export default function ReelPlayer({
  id,
  url,
  localUri,
  active,
  thumbnail,
  onView,
}: Props) {
  const [paused, setPaused] = useState(true);
  const [muted, setMuted] = useState(false); // 🔥 NOT muted by default
  const [loading, setLoading] = useState(true);

  const opacity = useRef(new Animated.Value(0)).current;

  /* ================= SAFE URL ================= */
  const videoUrl = useMemo(() => {
    const raw = localUri || url;

    if (!raw || typeof raw !== "string") return null;
    if (raw.includes("undefined")) return null;

    return raw;
  }, [url, localUri]);

  /* ================= PLAYER ================= */
  const player = useVideoPlayer(
    videoUrl ? { uri: videoUrl } : null
  );

  /* ================= LOAD ================= */
  useEffect(() => {
    if (!videoUrl) return;

    setLoading(true);
    opacity.setValue(0);

    const t = setTimeout(() => {
      setLoading(false);

      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }, 400); // 🔥 prevents black screen stuck

    return () => clearTimeout(t);
  }, [videoUrl]);

  /* ================= AUTOPLAY ================= */
  useEffect(() => {
    if (!player) return;

    player.loop = true;

    try {
      if (active) {
        player.muted = false;
        player.play();
        setPaused(false);

        // 🔥 trigger view once active
        if (onView) onView(id);
      } else {
        player.pause();
        player.currentTime = 0;
        setPaused(true);
      }
    } catch {}
  }, [active, player]);

  /* ================= MUTE ================= */
  useEffect(() => {
    if (!player) return;

    try {
      player.muted = muted;
    } catch {}
  }, [muted, player]);

  /* ================= CLEANUP ================= */
  useEffect(() => {
    return () => {
      try {
        player?.pause();
      } catch {}
    };
  }, [player]);

  /* ================= ACTIONS ================= */
  const togglePlay = () => {
    if (!player) return;

    if (paused) {
      player.play();
      setPaused(false);
    } else {
      player.pause();
      setPaused(true);
    }
  };

  const toggleMute = () => {
    setMuted((prev) => !prev);
  };

  /* ================= UI ================= */
  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={togglePlay}
      style={styles.container}
    >
      {/* Thumbnail fallback */}
      {!player && thumbnail && (
        <Image source={{ uri: thumbnail }} style={styles.video} />
      )}

      {/* Video */}
      {player && videoUrl && (
        <Animated.View style={[styles.video, { opacity }]}>
          <VideoView
            player={player}
            style={styles.video}
            contentFit="cover"
          />
        </Animated.View>
      )}

      {/* Loader */}
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="white" />
        </View>
      )}

      {/* Play icon */}
      {paused && !loading && (
        <View style={styles.playButton}>
          <Ionicons name="play" size={80} color="white" />
        </View>
      )}

      {/* Volume */}
      <TouchableOpacity style={styles.volume} onPress={toggleMute}>
        <Ionicons
          name={muted ? "volume-mute" : "volume-high"}
          size={26}
          color="white"
        />
      </TouchableOpacity>
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