// ==========================================
// 🎬 NASARA REEL PLAYER
// 🔵 RESTORED VIDEO RENDERING
// 🟣 BACKGROUND MUSIC + SAFARI AUDIO SUPPORT
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
  Image,
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
  soundEnabled: boolean;
  onEnableSound: () => void;
};
// ==========================================
// 🎬 MAIN REEL PLAYER
// ==========================================
export default function ReelPlayer({
  id,
  url,
  active,
  thumbnail,
  music_url,
  music_volume,
  original_volume,
  music_start_time,
  music_duration,
  soundEnabled,
  onEnableSound,
}: ReelPlayerProps) {
  // ==========================================
  // 📦 VIDEO STATES
  // ==========================================
  const [loading, setLoading] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [progressBarWidth, setProgressBarWidth] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  // ==========================================
  // 🎵 MUSIC STATES
  // ==========================================
  const [musicPositioned, setMusicPositioned] = useState(false);
  // ==========================================
  // 🧰 REFS
  // ==========================================
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const isResettingMusicSegment = useRef(false);
  const mounted = useRef(true);
  // ==========================================
  // 🔒 SAFE VIDEO URL
  // ==========================================
  const safeUrl = useMemo(() => {
    if (!url || typeof url !== "string") {
      return null;
    }
    const value = url.trim();
    if (
      !value ||
      value.includes("undefined") ||
      value.includes("null")
    ) {
      return null;
    }
    return value;
  }, [url]);
  // ==========================================
  // 🎵 SAFE MUSIC URL
  // ==========================================
  const safeMusicUrl = useMemo(() => {
    if (!music_url || typeof music_url !== "string") {
      return null;
    }
    const value = music_url.trim();
    if (
      !value ||
      value.includes("undefined") ||
      value.includes("null")
    ) {
      return null;
    }
    return value;
  }, [music_url]);
  // ==========================================
  // 🔊 VOLUME SETTINGS
  // ==========================================
  const musicVolume = useMemo(() => {
    const value = Number(music_volume);
    if (!Number.isFinite(value)) {
      return 0.7;
    }
    return Math.max(0, Math.min(1, value));
  }, [music_volume]);
  const originalVolume = useMemo(() => {
    const value = Number(original_volume);
    if (!Number.isFinite(value)) {
      return 1;
    }
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
  // 🧹 COMPONENT MOUNT STATUS
  // ==========================================
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  // ==========================================
  // 🎬 LISTEN TO VIDEO PLAYER STATUS
  // ==========================================
  useEffect(() => {
    const subscription = player.addListener(
      "statusChange",
      (event) => {
        console.log(
          "REEL VIDEO STATUS:",
          id,
          event.status
        );
        if (!mounted.current) {
          return;
        }
        // ==========================================
        // ✅ VIDEO READY
        // ==========================================
        if (event.status === "readyToPlay") {
          setVideoReady(true);
          setLoading(false);
          setVideoError(null);
          Animated.timing(opacity, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }).start();
        }
        // ==========================================
        // ⏳ VIDEO LOADING
        // ==========================================
        if (event.status === "loading") {
          setVideoReady(false);
          setLoading(true);
          opacity.setValue(0);
        }
        // ==========================================
        // ❌ VIDEO ERROR
        // ==========================================
        if (event.status === "error") {
          setVideoReady(false);
          setLoading(false);
          setVideoError(
            event.error?.message ||
            "Unable to load this video."
          );
          console.error(
            "REEL VIDEO ERROR:",
            id,
            event.error
          );
        }
      }
    );
    return () => {
      subscription.remove();
    };
  }, [player, id, opacity]);
  // ==========================================
  // 🎬 LOAD VIDEO SOURCE
  // ==========================================
  useEffect(() => {
    let cancelled = false;
    // 🌐 SAFARI VIDEO READINESS FALLBACK
let safariFallbackTimer: ReturnType<typeof setTimeout> | null = null;
    setLoading(true);
    setVideoReady(false);
    setVideoError(null);
    opacity.setValue(0);
    try {
      // 🎬 CONFIGURE PLAYER BEFORE LOADING
      player.loop = true;

// 🌐 Safari must start muted to allow autoplay.
player.muted = Platform.OS === "web"
  ? true
  : false;

player.volume = originalVolume;
      if (safeUrl) {
        console.log(
          "LOADING REEL VIDEO:",
          id,
          safeUrl
        );
        // 🎬 LOAD VIDEO SOURCE
        // Playback is controlled separately.
        player.replace(safeUrl);
        // 🌐 Prevent Safari from displaying the thumbnail indefinitely.
if (Platform.OS === "web") {
  safariFallbackTimer = setTimeout(() => {
    if (!cancelled && mounted.current) {
      setVideoReady(true);
      setLoading(false);

      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, 5000);
}
      } else {
        player.replace(null);
        setLoading(false);
        setVideoReady(false);
      }
    } catch (error: any) {
      console.error(
        "VIDEO SOURCE ERROR:",
        error
      );
      if (!cancelled) {
        setLoading(false);
        setVideoReady(false);
        setVideoError(
          error?.message ||
          "Video source error."
        );
      }
    }
    return () => {
      cancelled = true;

      if (safariFallbackTimer) {
        clearTimeout(safariFallbackTimer);
      }
    };
  }, [
    safeUrl,
    originalVolume,
    player,
    opacity,
    id,
  ]);
  // ==========================================
  // ▶️ CONTROL ACTIVE REEL PLAYBACK
  // ==========================================
  useEffect(() => {
    if (!safeUrl || !videoReady) {
      return;
    }
    try {
      if (active && !isPaused) {
        // 🎬 PLAY ACTIVE VIDEO
       player.volume = originalVolume;

// 🌐 Keep Safari muted until sound is enabled.
player.volume = originalVolume;
player.muted = false;

player.play();
      } else {
        // ⏸️ PAUSE INACTIVE VIDEO
        player.pause();
        // ⏸️ STOP BACKGROUND MUSIC
        musicPlayer.pause();
      }
    } catch (error) {
      console.error(
        "REEL PLAYBACK ERROR:",
        id,
        error
      );
    }
  }, [
    active,
    safeUrl,
    videoReady,
    isPaused,
    originalVolume,
    player,
    musicPlayer,
    id,
  ]);
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
      console.error(
        "BACKGROUND MUSIC LOADING ERROR:",
        error
      );
    }
    return () => {
      try {
        musicPlayer.pause();
      } catch (error) {
        console.log(
          "MUSIC CLEANUP ERROR:",
          error
        );
      }
    };
  }, [
    safeMusicUrl,
    musicVolume,
    musicPlayer,
  ]);
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
        const segmentDuration = Math.max(
          0,
          Number(music_duration ?? 0)
        );
        const audioDuration = Math.max(
          0,
          Number(musicStatus.duration ?? 0)
        );
        const requestedStart = Math.max(
          0,
          Number(music_start_time ?? 0)
        );
        if (segmentDuration > 0) {
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
          musicPlayer.loop = true;
          if (requestedStart > 0) {
            await musicPlayer.seekTo(requestedStart);
          }
        }
        if (!cancelled && mounted.current) {
          setMusicPositioned(true);
        }
      } catch (error) {
        console.error(
          "MUSIC POSITIONING ERROR:",
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
  // 🔁 LOOP SELECTED MUSIC SEGMENT
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
    if (isResettingMusicSegment.current) {
      return;
    }
    const audioDuration = Number(
      musicStatus.duration ?? 0
    );
    const segmentDuration = Number(
      music_duration
    );
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
    if (
      musicStatus.currentTime >= segmentEnd
    ) {
      isResettingMusicSegment.current = true;
      const resetMusic = async () => {
        try {
          await musicPlayer.seekTo(segmentStart);
          if (
            active &&
            soundEnabled &&
            mounted.current
          ) {
            musicPlayer.play();
          }
        } catch (error) {
          console.error(
            "MUSIC SEGMENT LOOP ERROR:",
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
  // 🎵 CONTROL BACKGROUND MUSIC
  // ==========================================
  useEffect(() => {
    try {
      if (
        active &&
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
    } catch (error) {
      console.error(
        "BACKGROUND MUSIC PLAYBACK ERROR:",
        error
      );
    }
  }, [
    active,
    soundEnabled,
    safeMusicUrl,
    musicStatus.isLoaded,
    musicPositioned,
    musicVolume,
    musicPlayer,
  ]);
  // ==========================================
  // 🔊 ENABLE SOUND FROM USER INTERACTION
  // ==========================================
  const handleEnableSound = () => {
    if (
      !safeMusicUrl ||
      !musicStatus.isLoaded ||
      !musicPositioned
    ) {
      return;
    }
    try {
      musicPlayer.volume = musicVolume;
      musicPlayer.play();
      onEnableSound();
    } catch (error) {
      console.error(
        "SOUND ENABLE ERROR:",
        error
      );
    }
  };
  // ==========================================
  // 🧹 SAFE REEL PLAYER CLEANUP
  // ==========================================
  useEffect(() => {
    return () => {
      try {
        player.pause();
        musicPlayer.pause();
      } catch (error) {
        console.log(
          "REEL CLEANUP ERROR:",
          error
        );
      }
    };
  }, [
    player,
    musicPlayer,
  ]);
  // ==========================================
  // 📊 TRACK VIDEO PLAYBACK PROGRESS
  // ==========================================
  useEffect(() => {
    if (
      !active ||
      !videoReady ||
      isPaused
    ) {
      return;
    }
    const timer = setInterval(() => {
      const duration = Number(
        player.duration || 0
      );
      const currentTime = Number(
        player.currentTime || 0
      );
      if (duration > 0) {
        setVideoDuration(duration);
        setVideoProgress(
          Math.min(
            100,
            Math.max(
              0,
              (currentTime / duration) * 100
            )
          )
        );
      }
    }, 250);
    return () => {
      clearInterval(timer);
    };
  }, [
    active,
    videoReady,
    isPaused,
    player,
  ]);
  // ==========================================
  // ▶️ TAP VIDEO TO PAUSE / RESUME
  // ==========================================
  const toggleVideoPlayback = () => {
    if (!active || !videoReady) {
      return;
    }
    try {
      if (isPaused) {
        player.play();
        setIsPaused(false);
      } else {
        player.pause();
        setIsPaused(true);
      }
    } catch (error) {
      console.error(
        "VIDEO TOGGLE ERROR:",
        error
      );
    }
  };
  // ==========================================
  // 🎬 AUTO-HIDE REEL CONTROLS
  // ==========================================
  useEffect(() => {
    if (controlsTimer.current) {
      clearTimeout(controlsTimer.current);
      controlsTimer.current = null;
    }
    if (!active) {
      setControlsVisible(false);
      return;
    }
    setControlsVisible(true);
    if (!isPaused) {
      controlsTimer.current = setTimeout(() => {
        setControlsVisible(false);
      }, 2500);
    }
    return () => {
      if (controlsTimer.current) {
        clearTimeout(controlsTimer.current);
        controlsTimer.current = null;
      }
    };
  }, [
    active,
    isPaused,
  ]);
  // ==========================================
  // 🎬 SEEK VIDEO TO SELECTED POSITION
  // ==========================================
  const seekVideo = (value: number) => {
    const duration = player.duration;
    if (
      !Number.isFinite(duration) ||
      duration <= 0
    ) {
      return;
    }
    const newTime = Math.max(
      0,
      Math.min(value, duration)
    );
    player.currentTime = newTime;
    setVideoProgress(
      (newTime / duration) * 100
    );
  };
  // ==========================================
  // 🚫 INVALID VIDEO
  // ==========================================
  if (!safeUrl) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          Video unavailable
        </Text>
      </View>
    );
  }
  // ==========================================
  // 🎬 RENDER REEL
  // ==========================================
  return (
    <View style={styles.container}>
      {/* ======================================
          🖼️ VIDEO THUMBNAIL
      ====================================== */}
      {!!thumbnail && !videoReady && (
        <Image
          source={{ uri: thumbnail }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      )}
      {/* ======================================
          🎬 ANDROID VIDEO FIX WRAPPER
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
            nativeControls={false}
            allowsFullscreen={false}
          />
          {/* ======================================
              ▶️ TAP TO PAUSE / RESUME
          ====================================== */}
          <Pressable
            style={styles.videoTapArea}
            onPress={toggleVideoPlayback}
          />
          {/* ======================================
              ⏸️ PAUSE INDICATOR
          ====================================== */}
          {isPaused && active && controlsVisible && (
            <View
              pointerEvents="none"
              style={styles.pauseIndicator}
            >
              <Text style={styles.pauseIcon}>
                ▶️
              </Text>
            </View>
          )}
          {/* ======================================
              📊 VIDEO PROGRESS BAR
          ====================================== */}
          {active && (
            <View
              pointerEvents={
                controlsVisible ? "auto" : "none"
              }
              style={[
                styles.progressContainer,
                {
                  opacity: controlsVisible ? 1 : 0,
                },
              ]}
            >
              <Pressable
                style={styles.progressTrack}
                onLayout={(event) => {
                  setProgressBarWidth(
                    event.nativeEvent.layout.width
                  );
                }}
                onPress={(event) => {
                  if (
                    progressBarWidth <= 0 ||
                    videoDuration <= 0
                  ) {
                    return;
                  }
                  const tapX =
                    event.nativeEvent.locationX;
                  const percentage = Math.max(
                    0,
                    Math.min(
                      tapX / progressBarWidth,
                      1
                    )
                  );
                  seekVideo(
                    percentage * videoDuration
                  );
                }}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${videoProgress}%`,
                    },
                  ]}
                />
              </Pressable>
            </View>
          )}
        </Animated.View>
      </View>
      {/* ======================================
          ⏳ LOADING INDICATOR
      ====================================== */}
      {loading && (
        <View
          pointerEvents="none"
          style={styles.loader}
        >
          <ActivityIndicator
            color="white"
            size="large"
          />
        </View>
      )}
      {/* ======================================
          ❌ VIDEO ERROR
      ====================================== */}
      {!!videoError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Unable to play this Reel
          </Text>
          <Text style={styles.errorDetail}>
            {videoError}
          </Text>
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
    backgroundColor: "#000000",
    overflow: "hidden",
  },
  // ==========================================
  // 🎬 VIDEO WRAPPER
  // ==========================================
  videoWrapper: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000000",
  },
  video: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000000",
  },
  // ==========================================
  // 🖼️ THUMBNAIL
  // ==========================================
  thumbnail: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    zIndex: 1,
  },
  // ==========================================
  // ⏳ LOADER
  // ==========================================
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
    zIndex: 5,
  },
  // ==========================================
  // ❌ VIDEO ERROR
  // ==========================================
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 25,
    backgroundColor: "#000000",
    zIndex: 6,
  },
  errorText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  errorDetail: {
    color: "#BBBBBB",
    fontSize: 11,
    textAlign: "center",
    marginTop: 8,
  },
  // ==========================================
  // 🔊 SOUND BUTTON
  // ==========================================
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
  // ==========================================
  // ▶️ VIDEO TAP AREA
  // ==========================================
  videoTapArea: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  // ==========================================
  // ⏸️ PAUSE INDICATOR
  // ==========================================
  pauseIndicator: {
    position: "absolute",
    top: "45%",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 4,
  },
  pauseIcon: {
    color: "#FFFFFF",
    fontSize: 55,
    fontWeight: "900",
    backgroundColor: "rgba(0,0,0,0.45)",
    overflow: "hidden",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 50,
  },
  // ==========================================
  // 📊 PROGRESS BAR
  // ==========================================
  progressContainer: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 8,
    zIndex: 8,
  },
  progressTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.35)",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#D6A83F",
    borderRadius: 5,
  },
});