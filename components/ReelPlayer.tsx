import { VideoView, useVideoPlayer } from "expo-video";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  StyleSheet,
  View
} from "react-native";

const { width, height } = Dimensions.get("window");

export default function ReelPlayer({ url, active }: any) {
  const [loading, setLoading] = useState(true);
  const opacity = useRef(new Animated.Value(0)).current;

  /* ================= SAFE URL ================= */
  const safeUrl = useMemo(() => {
    if (!url || typeof url !== "string") return null;
    if (url.includes("undefined")) return null;
    return url;
  }, [url]);

  /* ================= PLAYER ================= */
  const player = useVideoPlayer(null);

  /* ================= LOAD VIDEO ================= */
  useEffect(() => {
    if (!player) return;

    if (safeUrl) {
      player.replace(safeUrl); // 🔥 CRITICAL (fix Android)
      player.pause(); // start paused
    } else {
      player.replace(null);
    }

    player.loop = true;
    player.muted = false;

    setLoading(true);

    const t = setTimeout(() => {
      setLoading(false);

      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }, 400);

    return () => clearTimeout(t);
  }, [safeUrl]);

  /* ================= PLAY / PAUSE ================= */
  useEffect(() => {
    if (!player) return;

    try {
      if (active && safeUrl) {
        player.play();
      } else {
        player.pause();
      }
    } catch (e) {
      console.log("Playback error:", e);
    }
  }, [active, safeUrl]);

  if (!safeUrl) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      {/* 🔥 ANDROID FIX WRAPPER */}
      <View style={styles.videoWrapper}>
        <Animated.View style={[styles.videoWrapper, { opacity }]}>
          <VideoView
            key={safeUrl} // 🔥 FORCE RE-RENDER (VERY IMPORTANT)
            player={player}
            style={styles.video}
            contentFit="cover"
            allowsFullscreen={false}
          />
        </Animated.View>
      </View>

      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator color="white" />
        </View>
      )}
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: {
    width,
    height,
    backgroundColor: "black",
  },

  videoWrapper: {
    width: "100%",
    height: "100%",
    backgroundColor: "black",
  },

  video: {
    width: "100%",
    height: "100%",
    backgroundColor: "black",
  },

  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
});