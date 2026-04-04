import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

type Props = {
  id: string;
  url: string | null;
  localUri?: string | File | null;
  active: boolean;
  thumbnail?: string | null;
};

export default function ReelPlayer({
  id,
  url,
  localUri,
  active,
  thumbnail,
}: Props) {
  const [paused, setPaused] = useState(true);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(true);

  const videoOpacity = useRef(new Animated.Value(0)).current;

  /* ================= 🔥 OPTIMIZE CLOUDINARY URL ================= */
  const getOptimizedUrl = (rawUrl: string) => {
    if (!rawUrl.includes("/upload/")) return rawUrl;

    return rawUrl.replace(
      "/upload/",
      "/upload/q_auto:low,f_auto,w_480/"
    ); // 🔥 HUGE bandwidth saver
  };

  /* ================= SOURCE ================= */
  const source = useMemo(() => {
    if (!active) return null;

    // ✅ Cloudinary optimized URL
    if (typeof url === "string" && url.length > 0) {
      return getOptimizedUrl(url);
    }

    // ✅ Local preview (instant play after upload)
    if (
      Platform.OS !== "web" &&
      typeof localUri === "string" &&
      localUri.startsWith("file")
    ) {
      return localUri;
    }

    return null;
  }, [url, localUri, active]);

  /* ================= PLAYER ================= */
  const player = useVideoPlayer(source || "");

  /* ================= LOAD HANDLER ================= */
  useEffect(() => {
    if (!player || !source) return;

    setLoading(true);
    videoOpacity.setValue(0);

    const sub = player.addListener("statusChange", (status) => {
      if (status.status === "readyToPlay") {
        setLoading(false);

        Animated.timing(videoOpacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      }
    });

    return () => sub.remove();
  }, [player, source]);

  /* ================= PLAY CONTROL ================= */
  useEffect(() => {
    if (!player) return;

    player.loop = true;
    player.muted = muted;

    try {
      if (active && source) {
        player.currentTime = 0;
        player.play();
        setPaused(false);
      } else {
        player.pause();
        setPaused(true);
      }
    } catch {}
  }, [active, source, muted]);

  /* ================= HARD STOP ================= */
  useEffect(() => {
    if (!active && player) {
      try {
        player.pause();
        player.currentTime = 0;
      } catch {}
    }
  }, [active]);

  /* ================= CLEANUP ================= */
  useEffect(() => {
    return () => {
      try {
        player?.pause();
      } catch {}
    };
  }, []);

  /* ================= ACTIONS ================= */
  const togglePlay = () => {
    if (!player || !source) return;

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

  const toggleVolume = () => {
    const newMuted = !muted;
    setMuted(newMuted);

    try {
      player.muted = newMuted;
    } catch {}
  };

  /* ================= UI ================= */
  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={togglePlay}
      style={styles.container}
    >
      {/* ✅ THUMBNAIL (NO BANDWIDTH HEAVY VIDEO) */}
      {(!active || loading) && thumbnail && (
        <Image source={{ uri: thumbnail }} style={styles.video} />
      )}

      {/* ✅ VIDEO ONLY WHEN ACTIVE */}
      {source && active && (
        <Animated.View style={[styles.video, { opacity: videoOpacity }]}>
          <VideoView
            player={player}
            style={styles.video}
            contentFit="cover"
          />
        </Animated.View>
      )}

      {/* LOADER */}
      {active && loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="white" />
        </View>
      )}

      {/* PLAY ICON */}
      {paused && !loading && active && (
        <View style={styles.playButton}>
          <Ionicons name="play" size={80} color="white" />
        </View>
      )}

      {/* VOLUME */}
      {active && (
        <TouchableOpacity
          style={styles.volumeButton}
          onPress={toggleVolume}
        >
          <Ionicons
            name={muted ? "volume-mute" : "volume-high"}
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
  volumeButton: {
    position: "absolute",
    top: 70,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    padding: 10,
    borderRadius: 40,
  },
});