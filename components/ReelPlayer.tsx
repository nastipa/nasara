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
  localUri?: string | File | null;
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
  const [muted, setMuted] = useState(false); // ✅ default NOT muted
  const [loading, setLoading] = useState(true);

  const opacity = useRef(new Animated.Value(0)).current;

  /* ================= SOURCE ================= */
  const source = useMemo(() => {
    if (
      typeof localUri === "string" &&
      (localUri.startsWith("file") || localUri.startsWith("blob:"))
    ) {
      return { uri: localUri };
    }

    if (typeof url === "string" && url && !url.includes("undefined")) {
      return { uri: url };
    }

    return { uri: "" };
  }, [url, localUri]);

  const player = useVideoPlayer(source);

  /* ================= LOAD ================= */
  useEffect(() => {
    if (!player) return;

    setLoading(true);
    opacity.setValue(0);

    const sub = player.addListener("statusChange", (s) => {
      if (s.status === "readyToPlay") {
        setLoading(false);

        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      }
    });

    return () => sub.remove();
  }, [player]);

  /* ================= AUTOPLAY + SOUND FIX ================= */
  useEffect(() => {
    if (!player) return;

    player.loop = true;

    try {
      if (active) {
        player.muted = false;       // ✅ ALWAYS unmute when active
        setMuted(false);            // sync UI

        player.play();
        setPaused(false);
      } else {
        player.pause();
        player.currentTime = 0;

        setPaused(true);
      }
    } catch {}
  }, [active, player]);

  /* ================= KEEP MUTE SYNC ================= */
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

  const toggleMute = () => {
    setMuted((prev) => !prev); // ✅ simple + synced
  };

  /* ================= UI ================= */
  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={togglePlay}
      style={styles.container}
    >
      {/* THUMBNAIL */}
      {!player && thumbnail && (
        <Image source={{ uri: thumbnail }} style={styles.video} />
      )}

      {/* VIDEO */}
      {player && (
        <Animated.View style={[styles.video, { opacity }]}>
          <VideoView
            player={player}
            style={styles.video}
            contentFit="cover"
          />
        </Animated.View>
      )}

      {/* LOADER */}
      {player && loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="white" />
        </View>
      )}

      {/* PLAY ICON */}
      {paused && player && !loading && (
        <View style={styles.playButton}>
          <Ionicons name="play" size={80} color="white" />
        </View>
      )}

      {/* VOLUME */}
      {player && (
        <TouchableOpacity style={styles.volume} onPress={toggleMute}>
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
  volume: {
    position: "absolute",
    top: 70,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    padding: 10,
    borderRadius: 40,
  },
});