// ==========================================
// 🎬 REEL PLAYER - SAFARI PWA AUDIO SUPPORT
// ==========================================

import {
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";

import {
  VideoView,
  useVideoPlayer,
} from "expo-video";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

// ==========================================
// 🎵 REEL PLAYER PROPS
// ==========================================

type ReelPlayerProps = {
  id?: string;
  url: string | null;
  localUri?: string | null;
  active: boolean;
  thumbnail?: string | null;

  music_url?: string | null;
  music_volume?: number | null;
  original_volume?: number | null;
  music_start_time?: number | null;
  music_duration?: number | null;

  // 🔊 SAFARI AUDIO UNLOCK
  soundEnabled: boolean;
  onEnableSound: () => void;
};

// ==========================================
// 🎬 MAIN REEL PLAYER
// ==========================================

export default function ReelPlayer({
  url,
  active,
  music_url,
  music_volume,
  original_volume,
  music_start_time,
  music_duration,
  soundEnabled,
  onEnableSound,
}: ReelPlayerProps) {

  // ==========================================
  // 📦 STATES
  // ==========================================

  const [loading, setLoading] = useState(true);
  const [musicPositioned, setMusicPositioned] =
    useState(false);

  const opacity = useRef(new Animated.Value(0)).current;

  const isResettingMusicSegment = useRef(false);

  // ==========================================
  // 🔒 SAFE VIDEO URL
  // ==========================================

  const safeUrl = useMemo(() => {
    if (!url || typeof url !== "string") return null;

    if (url.includes("undefined")) return null;

    return url;
  }, [url]);

  // ==========================================
  // 🎵 SAFE MUSIC URL
  // ==========================================

  const safeMusicUrl = useMemo(() => {
    if (!music_url || typeof music_url !== "string") {
      return null;
    }

    if (
      music_url.includes("undefined") ||
      music_url.trim() === ""
    ) {
      return null;
    }

    return music_url;
  }, [music_url]);

  // ==========================================
  // 🔊 AUDIO VOLUME SETTINGS
  // ==========================================

  const musicVolume = useMemo(() => {
    const value = Number(music_volume);

    if (!Number.isFinite(value)) return 0.7;

    return Math.max(0, Math.min(1, value));
  }, [music_volume]);

  const originalVolume = useMemo(() => {
    const value = Number(original_volume);

    if (!Number.isFinite(value)) return 1;

    return Math.max(0, Math.min(1, value));
  }, [original_volume]);

  // ==========================================
  // 🎬 VIDEO PLAYER
  // ==========================================

  const player = useVideoPlayer(null);

  // ==========================================
  // 🎵 BACKGROUND MUSIC PLAYER
  // ==========================================

  const musicPlayer = useAudioPlayer(null);

  const musicStatus = useAudioPlayerStatus(musicPlayer);

  // ==========================================
  // 🎬 LOAD VIDEO
  // ==========================================

  useEffect(() => {
    if (!player) return;

    let cancelled = false;

    setLoading(true);

    opacity.setValue(0);

    try {
      if (safeUrl) {
        player.replace(safeUrl);
        player.pause();
      } else {
        player.replace(null);
      }

      player.loop = true;

      // 🔊 RESTORE ORIGINAL VIDEO AUDIO
      player.muted = false;
      player.volume = originalVolume;

    } catch (error) {
      console.log("Video loading error:", error);
    }

    const timer = setTimeout(() => {
      if (cancelled) return;

      setLoading(false);

      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();

    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };

  }, [safeUrl, originalVolume, player, opacity]);

  // ==========================================
  // 🎵 LOAD BACKGROUND MUSIC
  // ==========================================

  useEffect(() => {
    setMusicPositioned(false);

    isResettingMusicSegment.current = false;

    try {
      musicPlayer.pause();

      if (safeMusicUrl) {
        musicPlayer.replace(safeMusicUrl);

        musicPlayer.loop = false;

        musicPlayer.volume = musicVolume;
      }

    } catch (error) {
      console.log("Background music loading error:", error);
    }

    return () => {
      try {
        musicPlayer.pause();
      } catch (error) {
        console.log("Music cleanup error:", error);
      }
    };

  }, [safeMusicUrl, musicPlayer]);

  // ==========================================
  // 🎵 POSITION SELECTED MUSIC SEGMENT
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    const positionMusic = async () => {

      if (
        !safeMusicUrl ||
        !musicStatus.isLoaded ||
        musicPositioned
      ) {
        return;
      }

      try {
        const segmentDuration = Number(
          music_duration ?? 0
        );

        const audioDuration = Number(
          musicStatus.duration ?? 0
        );

        const requestedStart = Math.max(
          0,
          Number(music_start_time ?? 0)
        );

        if (segmentDuration > 0) {

          // 🎵 TRIMMED MUSIC

          musicPlayer.loop = false;

          const maximumStart =
            audioDuration > 0
              ? Math.max(
                  0,
                  audioDuration - segmentDuration
                )
              : requestedStart;

          const safeStart = Math.min(
            requestedStart,
            maximumStart
          );

          await musicPlayer.seekTo(safeStart);

        } else {

          // 🎵 LEGACY FULL MUSIC

          musicPlayer.loop = true;

          if (requestedStart > 0) {
            await musicPlayer.seekTo(requestedStart);
          }
        }

        if (!cancelled) {
          setMusicPositioned(true);
        }

      } catch (error) {
        console.error(
          "Music positioning error:",
          error
        );
      }
    };

    positionMusic();

    return () => {
      cancelled = true;
    };

  }, [
    safeMusicUrl,
    musicStatus.isLoaded,
    musicStatus.duration,
    music_duration,
    music_start_time,
    musicPositioned,
    musicPlayer,
  ]);

  // ==========================================
  // 🔁 LOOP ONLY THE SELECTED MUSIC SEGMENT
  // ==========================================

  useEffect(() => {

    if (
      !active ||
      !safeMusicUrl ||
      !musicStatus.isLoaded ||
      !musicPositioned ||
      !music_duration ||
      music_duration <= 0
    ) {
      return;
    }

    if (isResettingMusicSegment.current) return;

    const audioDuration = Number(
      musicStatus.duration ?? 0
    );

    const segmentDuration = Number(music_duration);

    const requestedStart = Math.max(
      0,
      Number(music_start_time ?? 0)
    );

    const maximumStart =
      audioDuration > 0
        ? Math.max(
            0,
            audioDuration - segmentDuration
          )
        : requestedStart;

    const segmentStart = Math.min(
      requestedStart,
      maximumStart
    );

    const segmentEnd =
      audioDuration > 0
        ? Math.min(
            segmentStart + segmentDuration,
            audioDuration
          )
        : segmentStart + segmentDuration;

    if (musicStatus.currentTime >= segmentEnd) {

      isResettingMusicSegment.current = true;

      const resetMusic = async () => {
        try {
          await musicPlayer.seekTo(segmentStart);

          if (active && soundEnabled) {
            musicPlayer.play();
          }

        } catch (error) {
          console.error(
            "Music segment loop failed:",
            error
          );

        } finally {
          isResettingMusicSegment.current = false;
        }
      };

      resetMusic();
    }

  }, [
    active,
    soundEnabled,
    safeMusicUrl,
    music_duration,
    music_start_time,
    musicPositioned,
    musicStatus.isLoaded,
    musicStatus.currentTime,
    musicStatus.duration,
    musicPlayer,
  ]);

  // ==========================================
  // ▶️ VIDEO AND MUSIC PLAYBACK CONTROL
  // ==========================================

  useEffect(() => {

    try {

      if (active && safeUrl) {

        // 🎬 PLAY VIDEO

        player.volume = originalVolume;

        player.muted = false;

        player.play();

        // 🎵 PLAY BACKGROUND MUSIC

        if (
          soundEnabled &&
          safeMusicUrl &&
          musicStatus.isLoaded &&
          musicPositioned
        ) {

          musicPlayer.volume = musicVolume;

          musicPlayer.play();

        } else {

          musicPlayer.pause();

        }

      } else {

        // ⏸️ PAUSE VIDEO

        player.pause();

        // ⏸️ PAUSE BACKGROUND MUSIC

        musicPlayer.pause();
      }

    } catch (error) {
      console.log("Reel playback error:", error);
    }

  }, [
    active,
    safeUrl,
    safeMusicUrl,
    soundEnabled,
    musicVolume,
    originalVolume,
    musicStatus.isLoaded,
    musicPositioned,
    musicPlayer,
    player,
  ]);

  // ==========================================
  // 🔊 ENABLE SOUND FROM USER INTERACTION
  // ==========================================

  const handleEnableSound = () => {

    if (!safeMusicUrl || !musicStatus.isLoaded) {
      return;
    }

    try {

      // 🎵 IMPORTANT:
      // Start playback directly inside the user's tap.
      // This is important for Safari on iPhone.

      musicPlayer.volume = musicVolume;

      musicPlayer.play();

      // 🔓 ENABLE SOUND FOR THE ENTIRE FEED

      onEnableSound();

    } catch (error) {
      console.log("Safari audio unlock error:", error);
    }
  };

  // ==========================================
  // 🧹 CLEANUP WHEN REEL PLAYER UNMOUNTS
  // ==========================================

  useEffect(() => {

    return () => {

      try {
        player.pause();
        musicPlayer.pause();

      } catch (error) {
        console.log("Reel cleanup error:", error);
      }
    };

  }, [player, musicPlayer]);

  // ==========================================
  // 🚫 INVALID VIDEO
  // ==========================================

  if (!safeUrl) {
    return <View style={styles.container} />;
  }

  // ==========================================
  // 🎬 RENDER REEL
  // ==========================================

  return (
    <View style={styles.container}>

      {/* ======================================
          🎬 VIDEO PLAYER
      ====================================== */}

      <View style={styles.videoWrapper}>

        <Animated.View
          style={[
            styles.videoWrapper,
            { opacity },
          ]}
        >

          <VideoView
            key={safeUrl}
            player={player}
            style={styles.video}
            contentFit="cover"
            allowsFullscreen={false}
          />

        </Animated.View>

      </View>

      {/* ======================================
          ⏳ LOADING INDICATOR
      ====================================== */}

      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator color="white" />
        </View>
      )}

      {/* ======================================
          🔊 SAFARI ENABLE SOUND BUTTON
      ====================================== */}

      {Platform.OS === "web" &&
        active &&
        safeMusicUrl &&
        !soundEnabled &&
        musicStatus.isLoaded &&
        musicPositioned && (

        <View style={styles.soundButtonContainer}>

          <Pressable
            onPress={handleEnableSound}
            style={styles.soundButton}
          >

            <Text style={styles.soundButtonIcon}>
              🔊
            </Text>

            <Text style={styles.soundButtonText}>
              Enable Sound
            </Text>

          </Pressable>

        </View>
      )}

    </View>
  );
}

// ==========================================
// 🎨 STYLES
// ==========================================

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

  // 🔊 SAFARI SOUND BUTTON

  soundButtonContainer: {
    position: "absolute",
    top: "45%",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 50,
  },

  soundButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.78)",
    borderWidth: 1,
    borderColor: "#D6A83F",
    borderRadius: 30,
    paddingVertical: 13,
    paddingHorizontal: 24,
    gap: 10,
  },

  soundButtonIcon: {
    fontSize: 20,
  },

  soundButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

});