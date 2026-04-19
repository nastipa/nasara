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

export default function ReelPlayer({
  url,
  active,
}: any) {
  const [loading, setLoading] = useState(true);
  const opacity = useRef(new Animated.Value(0)).current;

  // ✅ IMPORTANT SAFE CHECK (FIX WEB CRASH)
  const safeUrl = useMemo(() => {
    if (!url || typeof url !== "string") return null;
    if (url.includes("undefined")) return null;
    return url;
  }, [url]);

  const player = useVideoPlayer(
    safeUrl ? { uri: safeUrl } : null
  );

  useEffect(() => {
    if (!player) return;

    setLoading(true);

    const t = setTimeout(() => {
      setLoading(false);

      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }, 500);

    return () => clearTimeout(t);
  }, [safeUrl]);

  useEffect(() => {
    if (!player) return;

    try {
      if (active) {
        player.loop = true;
        player.play();
      } else {
        player.pause();
      }
    } catch {}
  }, [active, player]);

  if (!safeUrl) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      {player && (
        <Animated.View style={{ opacity }}>
          <VideoView player={player} style={styles.video} />
        </Animated.View>
      )}

      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator color="white" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    height,
    backgroundColor: "black",
  },
  video: {
    width,
    height,
    position: "absolute",
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
});