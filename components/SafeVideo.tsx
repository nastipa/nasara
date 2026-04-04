import { VideoView, useVideoPlayer } from "expo-video";
import { useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  url: string;
};

export default function SafeVideo({ url }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);

  const player = useVideoPlayer({ uri: url }, (p) => {
    p.loop = false;
    p.muted = Platform.OS === "web";
  });

  const handlePlay = () => {
    player.play();
    setIsPlaying(true);
  };

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls
        allowsFullscreen
      />

      {!isPlaying && (
        <TouchableOpacity style={styles.overlay} onPress={handlePlay}>
          <Text style={styles.playIcon}>▶</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#000",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  playIcon: {
    fontSize: 48,
    color: "#fff",
  },
});