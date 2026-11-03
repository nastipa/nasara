// 🟡 =====================================================
// 🟡 NASARA - CREATE REEL
// 🟡 PREMIUM VIDEO CREATION STUDIO
// 🟡 WITH BACKGROUND MUSIC LIBRARY
// 🟡 =====================================================

import { useAudioPlayer, useAudioPlayerStatus, } from "expo-audio";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import * as VideoThumbnails from "expo-video-thumbnails";

import { useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";
import { uploadVideo } from "../lib/uploadVideo";

// 🟡 =====================================================
// 🟡 SCREEN DIMENSIONS
// 🟡 =====================================================

const { width } = Dimensions.get("window");

// 🟡 =====================================================
// 🟡 NASARA COLOURS
// 🟡 =====================================================

const NAVY = "#101D38";
const NAVY_LIGHT = "#1B2D50";
const GOLD = "#D9A441";
const GOLD_LIGHT = "#F8EACB";
const WHITE = "#FFFFFF";
const TEXT = "#17243A";
const MUTED = "#8490A3";
const BORDER = "#E8ECF2";
const GREEN = "#16A36A";
const RED = "#E5484D";

// 🟡 =====================================================
// 🟡 MUSIC TYPE
// 🟡 =====================================================

type ReelMusic = {
  id: string;
  title: string;
  artist: string | null;
  audio_url: string;
  duration: number | null;
  category: string | null;
  is_active: boolean;
};

// 🟡 =====================================================
// 🟡 MAIN COMPONENT
// 🟡 =====================================================

export default function CreateReel() {
  const router = useRouter();

  // 🔵 VIDEO STATE

  const [video, setVideo] = useState<any>(null);

  // 🔵 CAPTION STATE

  const [caption, setCaption] = useState("");

  // 🔵 UPLOAD STATE

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // 🎵 MUSIC STATE

  const [musicList, setMusicList] = useState<ReelMusic[]>([]);
  const [selectedMusic, setSelectedMusic] =
    useState<ReelMusic | null>(null);

  const [musicLoading, setMusicLoading] = useState(true);
  const [musicSearch, setMusicSearch] = useState("");
  const [musicError, setMusicError] = useState("");

  const [musicVolume, setMusicVolume] = useState(0.7);
  const [originalVolume, setOriginalVolume] = useState(1);

  const [musicPreviewing, setMusicPreviewing] =
    useState(false);

  // 🔵 VIDEO PLAYER

  const player = useVideoPlayer(null);

  // 🎵 BACKGROUND MUSIC PLAYER

  const musicPlayer = useAudioPlayer(null);

  // ==========================================
// 🎵 MUSIC TRIMMING AND PREVIEW
// ==========================================

const musicStatus = useAudioPlayerStatus(musicPlayer);

const [musicStartTime, setMusicStartTime] = useState(0);

const [musicSegmentDuration, setMusicSegmentDuration] =
  useState(15);

const previewPositioned = useRef(false);
const resettingPreview = useRef(false);

const availableMusicDuration = Number(
  musicStatus.duration ||
  selectedMusic?.duration ||
  0
);

const safeMusicSegmentDuration = Math.min(
  musicSegmentDuration,
  availableMusicDuration > 0
    ? availableMusicDuration
    : musicSegmentDuration
);

const maximumMusicStart = Math.max(
  0,
  availableMusicDuration - safeMusicSegmentDuration
);

  // 🟡 =====================================================
  // 🟡 LOAD AVAILABLE REEL MUSIC
  // 🟡 =====================================================

  const loadMusic = async () => {
    setMusicLoading(true);
    setMusicError("");

    try {
      const { data, error } = await (supabase as any)
        .from("reel_music")
        .select(
          "id, title, artist, audio_url, duration, category, is_active"
        )
        .eq("is_active", true)
        .order("title", { ascending: true });

      if (error) {
        throw error;
      }

      setMusicList(data || []);
    } catch (error: any) {
      console.error("Reel music loading error:", error);

      setMusicError(
        error?.message ||
          "Unable to load the music library."
      );
    } finally {
      setMusicLoading(false);
    }
  };

  // 🟡 =====================================================
  // 🟡 LOAD MUSIC WHEN SCREEN OPENS
  // 🟡 =====================================================

  useEffect(() => {
    loadMusic();

    return () => {
      try {
        musicPlayer.pause();
      } catch (error) {
        console.log("Music cleanup error:", error);
      }
    };
  }, []);

  // 🟡 =====================================================
  // 🟡 VIDEO PLAYER CONFIGURATION
  // 🟡 =====================================================

  useEffect(() => {
    if (video?.uri) {
      player.replace(video.uri);

      player.loop = false;
      player.muted = false;
      player.volume = originalVolume;

      const timer = setTimeout(() => {
        player.play();
      }, 300);

      return () => clearTimeout(timer);
    } else {
      player.pause();
      player.replace(null);
    }
  }, [video?.uri]);

  // 🟡 =====================================================
  // 🟡 UPDATE ORIGINAL VIDEO VOLUME
  // 🟡 =====================================================

  useEffect(() => {
    player.volume = originalVolume;
  }, [originalVolume]);

  // 🟡 =====================================================
  // 🟡 UPDATE BACKGROUND MUSIC VOLUME
  // 🟡 =====================================================

  useEffect(() => {
    musicPlayer.volume = musicVolume;
  }, [musicVolume]);

  // ==========================================
// 🎵 SELECT MUSIC
// ==========================================

const selectMusic = (track: ReelMusic) => {
  if (loading) return;

  try {
    musicPlayer.pause();
  } catch (error) {
    console.log("Previous music pause error:", error);
  }

  setMusicPreviewing(false);

  previewPositioned.current = false;

  setMusicStartTime(0);

  setMusicSegmentDuration(15);

  setSelectedMusic(track);

  try {
    musicPlayer.replace(track.audio_url);
    musicPlayer.loop = false;
    musicPlayer.volume = musicVolume;
  } catch (error) {
    console.log("Music selection error:", error);
  }
};
  // ==========================================
// 🎵 PREVIEW SELECTED MUSIC SEGMENT
// ==========================================

const toggleMusicPreview = async () => {
  if (loading) return;

  if (!selectedMusic) {
    Alert.alert(
      "Select music",
      "Please select a music track first."
    );

    return;
  }

  if (musicPreviewing) {
    musicPlayer.pause();
    setMusicPreviewing(false);
    previewPositioned.current = false;
    return;
  }

  try {
    previewPositioned.current = false;

    musicPlayer.pause();

    musicPlayer.loop = false;

    musicPlayer.volume = musicVolume;

    musicPlayer.replace(selectedMusic.audio_url);

    setMusicPreviewing(true);

  } catch (error: any) {
    console.error("Music preview error:", error);

    setMusicPreviewing(false);

    Alert.alert(
      "Music preview",
      error?.message ||
        "Unable to preview this music track."
    );
  }
};

// ==========================================
// 🎵 POSITION MUSIC BEFORE PREVIEW
// ==========================================

useEffect(() => {
  if (
    !musicPreviewing ||
    !selectedMusic ||
    !musicStatus.isLoaded ||
    previewPositioned.current
  ) {
    return;
  }

  const safeStart = Math.min(
    musicStartTime,
    maximumMusicStart
  );

  previewPositioned.current = true;

  musicPlayer
    .seekTo(safeStart)
    .then(() => {
      musicPlayer.play();
    })
    .catch((error) => {
      console.error("Music preview positioning error:", error);
      previewPositioned.current = false;
      setMusicPreviewing(false);
    });

}, [
  musicPreviewing,
  selectedMusic?.id,
  musicStatus.isLoaded,
  musicStartTime,
  maximumMusicStart,
]);

// ==========================================
// 🔁 LOOP SELECTED MUSIC DURING PREVIEW
// ==========================================

useEffect(() => {
  if (
    !musicPreviewing ||
    !selectedMusic ||
    !musicStatus.isLoaded ||
    resettingPreview.current
  ) {
    return;
  }

  const segmentEnd =
    musicStartTime + safeMusicSegmentDuration;

  if (musicStatus.currentTime >= segmentEnd) {
    resettingPreview.current = true;

    musicPlayer
      .seekTo(musicStartTime)
      .then(() => {
        if (musicPreviewing) {
          musicPlayer.play();
        }
      })
      .catch((error) => {
        console.error("Music preview loop error:", error);
      })
      .finally(() => {
        resettingPreview.current = false;
      });
  }

}, [
  musicPreviewing,
  selectedMusic?.id,
  musicStatus.isLoaded,
  musicStatus.currentTime,
  musicStartTime,
  safeMusicSegmentDuration,
]);

  // 🟡 =====================================================
  // 🟡 REMOVE SELECTED MUSIC
  // 🟡 =====================================================

  const removeSelectedMusic = () => {
    if (loading) return;

    try {
      musicPlayer.pause();
    } catch (error) {
      console.log("Music pause error:", error);
    }

    setMusicPreviewing(false);
    setSelectedMusic(null);
  };

  // 🟡 =====================================================
  // 🟡 VOLUME CONTROLS
  // 🟡 =====================================================

  const changeMusicVolume = (amount: number) => {
    setMusicVolume((current) =>
      Math.max(0, Math.min(1, current + amount))
    );
  };

  const changeOriginalVolume = (amount: number) => {
    setOriginalVolume((current) =>
      Math.max(0, Math.min(1, current + amount))
    );
  };

  // 🟡 =====================================================
  // 🟡 FILTER MUSIC
  // 🟡 =====================================================

  const filteredMusic = musicList.filter((track) => {
    const search = musicSearch.trim().toLowerCase();

    if (!search) return true;

    return (
      track.title?.toLowerCase().includes(search) ||
      track.artist?.toLowerCase().includes(search) ||
      track.category?.toLowerCase().includes(search)
    );
  });

  // 🟡 =====================================================
  // 🟡 FORMAT VOLUME
  // 🟡 =====================================================

  const formatVolume = (value: number) =>
    `${Math.round(value * 100)}%`;

  // 🟡 =====================================================
  // 🟡 RECORD VIDEO
  // 🟡 =====================================================

  const recordVideo = async () => {
    if (loading) return;

    try {
      const permission =
        await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Camera permission",
          "Please allow camera access to record a video."
        );

        return;
      }

      const result =
        await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          videoMaxDuration: 60,
          quality: 1,
        });

      if (!result.canceled && result.assets?.length) {
        setVideo({
          uri: result.assets[0].uri,
        });
      }
    } catch (error) {
      console.log("Camera error:", error);

      Alert.alert(
        "Camera error",
        "Unable to open the camera."
      );
    }
  };

  // 🟡 =====================================================
  // 🟡 PICK VIDEO FROM GALLERY
  // 🟡 =====================================================

  const pickVideo = async () => {
    if (loading) return;

    try {
      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          quality: 1,
        });

      if (!result.canceled && result.assets?.length) {
        setVideo({
          uri: result.assets[0].uri,
        });
      }
    } catch (error) {
      console.log("Video selection error:", error);

      Alert.alert(
        "Gallery error",
        "Unable to select a video."
      );
    }
  };

  // 🟡 =====================================================
  // 🟡 REMOVE SELECTED VIDEO
  // 🟡 =====================================================

  const removeVideo = () => {
    if (loading) return;

    player.pause();

    setVideo(null);
  };

  // 🟡 =====================================================
  // 🟡 GENERATE VIDEO THUMBNAIL
  // 🟡 =====================================================

  const generateThumbnail = async () => {
    try {
      if (!video?.uri) return null;

      const { uri } =
        await VideoThumbnails.getThumbnailAsync(
          video.uri,
          {
            time: 1000,
          }
        );

      return uri;
    } catch (error) {
      console.log("Thumbnail error:", error);

      return null;
    }
  };

  // 🟡 =====================================================
  // 🟡 POST REEL
  // 🟡 =====================================================

  const postReel = async () => {
    if (loading) return;

    if (!video?.uri) {
      Alert.alert(
        "Video required",
        "Please record or select a video first."
      );

      return;
    }

    if (caption.trim().length > 500) {
      Alert.alert(
        "Caption too long",
        "Your caption cannot exceed 500 characters."
      );

      return;
    }

    setLoading(true);
    setProgress(0);

    // Stop the music preview before publishing.

    try {
      musicPlayer.pause();
    } catch (error) {
      console.log("Music pause error:", error);
    }

    setMusicPreviewing(false);

    try {
      // 🔵 GET AUTHENTICATED USER

      const { data, error: authError } =
        await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      const userId = data.user?.id;

      if (!userId) {
        Alert.alert(
          "Login required",
          "Please log in before publishing a reel."
        );

        router.push("/(auth)/login");

        return;
      }

      console.log("🎬 Starting Nasara Reel upload...");

      // 🔵 GENERATE THUMBNAIL

      const thumbnail = await generateThumbnail();

      // 🟡 UPLOAD VIDEO TO RENDER

      const result = await uploadVideo(
        video.uri,
        (p: number) => {
          setProgress(p);
        }
      );

      console.log("✅ Video uploaded:", result);

      if (!result?.video) {
        throw new Error(
          "Video upload completed without returning a video URL."
        );
      }

      // 🟡 PREPARE MUSIC INFORMATION

     const musicData = selectedMusic
  ? {
      music_id: selectedMusic.id,
      music_url: selectedMusic.audio_url,
      music_title: selectedMusic.title,
      music_artist: selectedMusic.artist || null,
      music_start_time: musicStartTime,
      music_duration: safeMusicSegmentDuration,
      music_volume: musicVolume,
      original_volume: originalVolume,
    }
  : {
      music_id: null,
      music_url: null,
      music_title: null,
      music_artist: null,
      music_start_time: 0,
      music_duration: null,
      music_volume: 0,
      original_volume: originalVolume,
    };
      // 🟡 SAVE REEL TO SUPABASE

      const { data: newPost, error } =
        await (supabase as any)
          .from("posts")
          .insert({
            user_id: userId,
            caption: caption.trim(),
            media_url: result.video,
            thumbnail_url:
              result.thumbnail || thumbnail,
            status: "ready",
            views: 0,
            created_at: new Date().toISOString(),

            // 🎵 REEL MUSIC INFORMATION

            ...musicData,
          })
          .select()
          .single();

      if (error) throw error;

      console.log("✅ Reel created:", newPost);

      // 🟣 =====================================================
      // 🟣 NASARA WEBSITE BROWSER PUSH NOTIFICATIONS
      // 🟣 =====================================================

      try {
        // 🔵 GET CURRENT SESSION

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error(
            "🔴 REEL BROWSER PUSH SESSION ERROR:",
            sessionError
          );
        } else if (
          session?.access_token &&
          newPost?.id
        ) {
          // 🟢 REQUEST BROWSER PUSH

          const response = await fetch(
            "https://nasara-upload-server.onrender.com/reel-browser-push",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                ref_id: newPost.id,
              }),
            }
          );

          const pushResult = await response.json();

          if (!response.ok) {
            console.error(
              "🔴 REEL BROWSER PUSH FAILED:",
              pushResult
            );
          } else {
            console.log(
              "🟢 REEL BROWSER PUSH RESULT:",
              pushResult
            );
          }
        }
      } catch (browserPushError) {
        console.error(
          "🔴 REEL BROWSER PUSH ERROR:",
          browserPushError
        );
      }

      // 🟡 =====================================================
      // 🟡 NOTIFY FOLLOWERS
      // 🟡 =====================================================

      const { data: followers, error: followerError } =
        await (supabase as any)
          .from("follows")
          .select("follower_id")
          .eq("following_id", userId);

      if (followerError) {
        console.log(
          "Follower lookup error:",
          followerError
        );
      }

      if (followers?.length) {
        const inserts = followers.map((f: any) => ({
          user_id: f.follower_id,
          sender_id: userId,
          type: "reel",
          title: "🎥 New Reel",
          body: caption.trim() || "New reel uploaded",
          ref_id: newPost.id,
          read: false,
        }));

        const { error: notificationError } =
          await (supabase as any)
            .from("notifications")
            .insert(inserts);

        if (notificationError) {
          console.log(
            "Follower notification error:",
            notificationError
          );
        }
      }

      // 🟢 SUCCESS

      Alert.alert(
        "Reel published!",
        "Your video is now available on Nasara."
      );

      router.replace("/reels");

    } catch (err: any) {
      console.log("❌ REEL UPLOAD ERROR:", err);

      Alert.alert(
        "Upload failed",
        err?.message || "Please try again."
      );

    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  // 🟡 =====================================================
  // 🟡 MAIN USER INTERFACE
  // 🟡 =====================================================

  return (
    <View style={styles.container}>

      {/* 🔵 HEADER */}

      <View style={styles.header}>

        <TouchableOpacity
          onPress={() => router.replace("/browse")}
          style={styles.backButton}
          disabled={loading}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            Create Reel
          </Text>

          <Text style={styles.headerSubtitle}>
            Share your moments with Ghana
          </Text>
        </View>

        <View style={styles.headerLogo}>
          <Text style={styles.headerLogoText}>
            N
          </Text>
        </View>

      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >

          {/* 🟡 INTRODUCTION */}

          <View style={styles.introSection}>

            <View style={styles.introBadge}>
              <Text style={styles.introBadgeText}>
                ✦ NASARA CREATOR STUDIO
              </Text>
            </View>

            <Text style={styles.introTitle}>
              Your story.
            </Text>

            <Text style={styles.introTitleGold}>
              Your moment.
            </Text>

            <Text style={styles.introDescription}>
              Create a short video and share your
              products, business, talent and everyday
              moments with the Nasara community.
            </Text>

          </View>

          {/* 🟡 VIDEO SELECTION */}

          {!video && (

            <View style={styles.selectionSection}>

              <View style={styles.sectionHeading}>
                <View>
                  <Text style={styles.sectionTitle}>
                    Choose your video
                  </Text>

                  <Text style={styles.sectionSubtitle}>
                    Record something new or upload a video.
                  </Text>
                </View>

                <Text style={styles.sectionNumber}>
                  01
                </Text>
              </View>

              {/* 🔴 RECORD VIDEO */}

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={recordVideo}
                style={styles.recordCard}
                disabled={loading}
              >

                <View style={styles.recordIconContainer}>
                  <Text style={styles.recordIcon}>
                    ●
                  </Text>
                </View>

                <View style={styles.selectionTextContainer}>
                  <Text style={styles.recordTitle}>
                    Record a video
                  </Text>

                  <Text style={styles.recordDescription}>
                    Open your camera and capture a moment.
                  </Text>
                </View>

                <Text style={styles.selectionArrow}>
                  →
                </Text>

              </TouchableOpacity>

              {/* 🟡 PICK VIDEO */}

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={pickVideo}
                style={styles.galleryCard}
                disabled={loading}
              >

                <View style={styles.galleryIconContainer}>
                  <Text style={styles.galleryIcon}>
                    ▣
                  </Text>
                </View>

                <View style={styles.selectionTextContainer}>
                  <Text style={styles.galleryTitle}>
                    Choose from gallery
                  </Text>

                  <Text style={styles.galleryDescription}>
                    Select a video already on your device.
                  </Text>
                </View>

                <Text style={styles.selectionArrow}>
                  →
                </Text>

              </TouchableOpacity>

              {/* 🔵 VIDEO INFORMATION */}

              <View style={styles.videoInfo}>
                <Text style={styles.videoInfoIcon}>
                  ⓘ
                </Text>

                <Text style={styles.videoInfoText}>
                  Keep your videos clear and engaging.
                  Your selected video will appear in the
                  preview before publishing.
                </Text>
              </View>

            </View>

          )}

          {/* 🟡 VIDEO PREVIEW */}

          {video && (

            <View style={styles.previewSection}>

              <View style={styles.sectionHeading}>
                <View>
                  <Text style={styles.sectionTitle}>
                    Video preview
                  </Text>

                  <Text style={styles.sectionSubtitle}>
                    Review your video before publishing.
                  </Text>
                </View>

                <Text style={styles.sectionNumber}>
                  01
                </Text>
              </View>

              <View style={styles.previewCard}>

                <View style={styles.previewTopBar}>
                  <View style={styles.previewStatus}>
                    <View style={styles.previewStatusDot} />

                    <Text style={styles.previewStatusText}>
                      READY TO SHARE
                    </Text>
                  </View>

                  {!loading && (
                    <TouchableOpacity
                      onPress={removeVideo}
                      style={styles.removeVideoButton}
                    >
                      <Text style={styles.removeVideoText}>
                        ✕ Remove
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <VideoView
                  key={video.uri}
                  player={player}
                  style={styles.preview}
                  contentFit="contain"
                  nativeControls
                />

                <View style={styles.previewBottom}>
                  <Text style={styles.previewBottomText}>
                    🎬 Your Nasara Reel
                  </Text>
                </View>

              </View>

              {/* 🟡 CHANGE VIDEO */}

              {!loading && (
                <TouchableOpacity
                  onPress={pickVideo}
                  style={styles.changeVideoButton}
                >
                  <Text style={styles.changeVideoText}>
                    ▣ Choose another video
                  </Text>
                </TouchableOpacity>
              )}

            </View>

          )}

          {/* 🎵 ================================================= */}
          {/* 🎵 NASARA REEL MUSIC STUDIO */}
          {/* 🎵 ================================================= */}

          {video && (

            <View style={styles.musicSection}>

              <View style={styles.sectionHeading}>
                <View>
                  <Text style={styles.sectionTitle}>
                    Add background music
                  </Text>

                  <Text style={styles.sectionSubtitle}>
                    Choose a track from the Nasara music library.
                  </Text>
                </View>

                <Text style={styles.sectionNumber}>
                  02
                </Text>
              </View>

              {/* 🎵 SELECTED MUSIC */}

              <View style={styles.selectedMusicCard}>

                <View style={styles.musicDisc}>
                  <Text style={styles.musicDiscIcon}>
                    ♫
                  </Text>
                </View>

                <View style={styles.selectedMusicInfo}>

                  {selectedMusic ? (
                    <>
                      <Text style={styles.selectedMusicTitle}>
                        {selectedMusic.title}
                      </Text>

                      <Text style={styles.selectedMusicArtist}>
                        {selectedMusic.artist || "Nasara Music"}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.selectedMusicTitle}>
                        No music selected
                      </Text>

                      <Text style={styles.selectedMusicArtist}>
                        Your Reel will use its original audio.
                      </Text>
                    </>
                  )}

                </View>

                {selectedMusic && (
                  <TouchableOpacity
                    onPress={removeSelectedMusic}
                    disabled={loading}
                    style={styles.removeMusicButton}
                  >
                    <Text style={styles.removeMusicText}>
                      ✕
                    </Text>
                  </TouchableOpacity>
                )}

              </View>

              {/* 🎵 MUSIC SEARCH */}

              <View style={styles.musicSearchContainer}>
                <Text style={styles.musicSearchIcon}>
                  ⌕
                </Text>

                <TextInput
                  value={musicSearch}
                  onChangeText={setMusicSearch}
                  placeholder="Search music, artist or category..."
                  placeholderTextColor="#A2AAB8"
                  style={styles.musicSearchInput}
                  editable={!loading}
                />

                {musicSearch.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setMusicSearch("")}
                    disabled={loading}
                  >
                    <Text style={styles.clearSearchText}>
                      ✕
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* 🎵 MUSIC LIBRARY */}

              <View style={styles.musicLibrary}>

                <View style={styles.musicLibraryHeading}>
                  <Text style={styles.musicLibraryTitle}>
                    NASARA MUSIC LIBRARY
                  </Text>

                  <Text style={styles.musicLibraryCount}>
                    {musicList.length} tracks
                  </Text>
                </View>

                {musicLoading ? (
                  <View style={styles.musicLoading}>
                    <ActivityIndicator
                      color={GOLD}
                      size="large"
                    />

                    <Text style={styles.musicLoadingText}>
                      Loading music library...
                    </Text>
                  </View>
                ) : musicError ? (
                  <View style={styles.musicEmpty}>
                    <Text style={styles.musicEmptyIcon}>
                      ⚠️
                    </Text>

                    <Text style={styles.musicEmptyTitle}>
                      Music unavailable
                    </Text>

                    <Text style={styles.musicEmptyDescription}>
                      {musicError}
                    </Text>

                    <TouchableOpacity
                      onPress={loadMusic}
                      disabled={loading}
                      style={styles.retryMusicButton}
                    >
                      <Text style={styles.retryMusicText}>
                        Try again
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : filteredMusic.length === 0 ? (
                  <View style={styles.musicEmpty}>
                    <Text style={styles.musicEmptyIcon}>
                      ♫
                    </Text>

                    <Text style={styles.musicEmptyTitle}>
                      No tracks found
                    </Text>

                    <Text style={styles.musicEmptyDescription}>
                      {musicList.length === 0
                        ? "The admin has not uploaded any active music yet."
                        : "Try another search."}
                    </Text>
                  </View>
                ) : (
                  filteredMusic.map((track) => {
                    const isSelected =
                      selectedMusic?.id === track.id;

                    return (
                      <TouchableOpacity
                        key={track.id}
                        activeOpacity={0.8}
                        onPress={() => selectMusic(track)}
                        disabled={loading}
                        style={[
                          styles.musicTrack,
                          isSelected &&
                            styles.musicTrackSelected,
                        ]}
                      >

                        <View
                          style={[
                            styles.trackIcon,
                            isSelected &&
                              styles.trackIconSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.trackIconText,
                              isSelected &&
                                styles.trackIconTextSelected,
                            ]}
                          >
                            ♫
                          </Text>
                        </View>

                        <View style={styles.trackInformation}>
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.trackTitle,
                              isSelected &&
                                styles.trackTitleSelected,
                            ]}
                          >
                            {track.title}
                          </Text>

                          <Text
                            numberOfLines={1}
                            style={styles.trackArtist}
                          >
                            {track.artist || "Nasara Music"}
                            {track.category
                              ? ` • ${track.category}`
                              : ""}
                          </Text>
                        </View>

                        {isSelected ? (
                          <View style={styles.selectedBadge}>
                            <Text style={styles.selectedBadgeText}>
                              ✓ Selected
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.trackSelectIcon}>
                            +
                          </Text>
                        )}

                      </TouchableOpacity>
                    );
                  })
                )}

              </View>

              {/* 🎵 MUSIC PREVIEW */}

              {selectedMusic && (

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={toggleMusicPreview}
                  disabled={loading}
                  style={styles.musicPreviewButton}
                >

                  <Text style={styles.musicPreviewIcon}>
                    {musicPreviewing ? "Ⅱ" : "▶️"}
                  </Text>

                  <Text style={styles.musicPreviewText}>
                    {musicPreviewing
                      ? "Stop music preview"
                      : "Preview selected music"}
                  </Text>

                </TouchableOpacity>

              )}

              {/* ======================================
    🎵 MUSIC TRIMMING STUDIO
====================================== */}

{selectedMusic && (

  <View style={styles.trimCard}>

    <Text style={styles.trimTitle}>
      ✂️ Trim your background music
    </Text>

    <Text style={styles.trimDescription}>
      Select the exact section you want to use in your Reel.
    </Text>

    {/* 🎵 SEGMENT LENGTH */}

    <Text style={styles.trimLabel}>
      MUSIC DURATION
    </Text>

    <View style={styles.trimDurationRow}>

      {[15, 20, 30].map((seconds) => {

        const disabled =
          availableMusicDuration > 0 &&
          availableMusicDuration < seconds;

        return (
          <TouchableOpacity
            key={seconds}
            disabled={loading || disabled}
            onPress={() => {
              musicPlayer.pause();
              setMusicPreviewing(false);
              previewPositioned.current = false;

              setMusicSegmentDuration(seconds);

              setMusicStartTime((current) =>
                Math.min(
                  current,
                  Math.max(
                    0,
                    availableMusicDuration - seconds
                  )
                )
              );
            }}
            style={[
              styles.trimDurationButton,
              musicSegmentDuration === seconds &&
                styles.trimDurationButtonActive,
              disabled && styles.trimDurationButtonDisabled,
            ]}
          >

            <Text
              style={[
                styles.trimDurationText,
                musicSegmentDuration === seconds &&
                  styles.trimDurationTextActive,
              ]}
            >
              {seconds}s
            </Text>

          </TouchableOpacity>
        );
      })}

    </View>

    {/* 🎵 START POSITION */}

    <Text style={styles.trimLabel}>
      START POSITION
    </Text>

    <View style={styles.trimPositionRow}>

      <TouchableOpacity
        disabled={loading || musicStartTime <= 0}
        onPress={() => {
          musicPlayer.pause();
          setMusicPreviewing(false);
          previewPositioned.current = false;

          setMusicStartTime((current) =>
            Math.max(0, current - 5)
          );
        }}
        style={styles.trimPositionButton}
      >
        <Text style={styles.trimPositionButtonText}>
          −5 sec
        </Text>
      </TouchableOpacity>

      <View style={styles.trimPositionDisplay}>
        <Text style={styles.trimPositionValue}>
          {Math.floor(musicStartTime)}s
        </Text>

        <Text style={styles.trimPositionCaption}>
          Starting point
        </Text>
      </View>

      <TouchableOpacity
        disabled={
          loading ||
          musicStartTime >= maximumMusicStart
        }
        onPress={() => {
          musicPlayer.pause();
          setMusicPreviewing(false);
          previewPositioned.current = false;

          setMusicStartTime((current) =>
            Math.min(
              maximumMusicStart,
              current + 5
            )
          );
        }}
        style={styles.trimPositionButton}
      >
        <Text style={styles.trimPositionButtonText}>
          +5 sec
        </Text>
      </TouchableOpacity>

    </View>

    {/* 🎵 SELECTED SEGMENT INFORMATION */}

    <View style={styles.trimSummary}>

      <Text style={styles.trimSummaryText}>
        Selected section: {Math.floor(musicStartTime)}s –{" "}
        {Math.floor(musicStartTime + safeMusicSegmentDuration)}s
      </Text>

      <Text style={styles.trimSummaryDuration}>
        {Math.floor(safeMusicSegmentDuration)} seconds selected
      </Text>

    </View>

    <Text style={styles.trimFootnote}>
      Preview the selected section before publishing.
      The original music file will not be changed.
    </Text>

  </View>

)}

              {/* 🎵 VOLUME CONTROLS */}

              <View style={styles.volumeCard}>

                <Text style={styles.volumeHeading}>
                  AUDIO MIXER
                </Text>

                {/* 🎵 BACKGROUND MUSIC VOLUME */}

                <View style={styles.volumeControl}>

                  <View style={styles.volumeLabelRow}>
                    <Text style={styles.volumeLabel}>
                      ♫ Background music
                    </Text>

                    <Text style={styles.volumeValue}>
                      {formatVolume(musicVolume)}
                    </Text>
                  </View>

                  <View style={styles.volumeButtons}>

                    <TouchableOpacity
                      onPress={() => changeMusicVolume(-0.1)}
                      disabled={loading}
                      style={styles.volumeButton}
                    >
                      <Text style={styles.volumeButtonText}>
                        −
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.volumeBar}>
                      <View
                        style={[
                          styles.volumeFill,
                          {
                            width: `${musicVolume * 100}%`,
                          },
                        ]}
                      />
                    </View>

                    <TouchableOpacity
                      onPress={() => changeMusicVolume(0.1)}
                      disabled={loading}
                      style={styles.volumeButton}
                    >
                      <Text style={styles.volumeButtonText}>
                        +
                      </Text>
                    </TouchableOpacity>

                  </View>

                </View>

                {/* 🔊 ORIGINAL VIDEO VOLUME */}

                <View style={styles.volumeControl}>

                  <View style={styles.volumeLabelRow}>
                    <Text style={styles.volumeLabel}>
                      🔊 Original video audio
                    </Text>

                    <Text style={styles.volumeValue}>
                      {formatVolume(originalVolume)}
                    </Text>
                  </View>

                  <View style={styles.volumeButtons}>

                    <TouchableOpacity
                      onPress={() => changeOriginalVolume(-0.1)}
                      disabled={loading}
                      style={styles.volumeButton}
                    >
                      <Text style={styles.volumeButtonText}>
                        −
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.volumeBar}>
                      <View
                        style={[
                          styles.volumeFill,
                          {
                            width: `${originalVolume * 100}%`,
                          },
                        ]}
                      />
                    </View>

                    <TouchableOpacity
                      onPress={() => changeOriginalVolume(0.1)}
                      disabled={loading}
                      style={styles.volumeButton}
                    >
                      <Text style={styles.volumeButtonText}>
                        +
                      </Text>
                    </TouchableOpacity>

                  </View>

                </View>

                <Text style={styles.volumeDescription}>
                  Adjust both audio levels to create your preferred sound mix.
                </Text>

              </View>

              {/* 🎵 MUSIC INFORMATION */}

              <View style={styles.musicInformation}>
                <Text style={styles.musicInformationIcon}>
                  ⓘ
                </Text>

                <Text style={styles.musicInformationText}>
                  Your selected music and volume settings will be saved
                  with your Reel. You can also publish without adding music.
                </Text>
              </View>

            </View>

          )}

          {/* 🟡 CAPTION EDITOR */}

          {video && (

            <View style={styles.captionSection}>

              <View style={styles.sectionHeading}>
                <View>
                  <Text style={styles.sectionTitle}>
                    Tell your story
                  </Text>

                  <Text style={styles.sectionSubtitle}>
                    Add a caption to your reel.
                  </Text>
                </View>

                <Text style={styles.sectionNumber}>
                  03
                </Text>
              </View>

              <View style={styles.captionCard}>

                <Text style={styles.captionLabel}>
                  YOUR CAPTION
                </Text>

                <TextInput
                  value={caption}
                  onChangeText={(value) =>
                    setCaption(value.slice(0, 500))
                  }
                  placeholder="What would you like to share with everyone?"
                  placeholderTextColor="#A2AAB8"
                  style={styles.captionInput}
                  multiline
                  maxLength={500}
                  editable={!loading}
                  textAlignVertical="top"
                />

                <View style={styles.captionFooter}>
                  <Text style={styles.captionHint}>
                    ✦ Make your story interesting.
                  </Text>

                  <Text style={styles.captionCount}>
                    {caption.length}/500
                  </Text>
                </View>

              </View>

            </View>

          )}

          {/* 🟡 UPLOAD PROGRESS */}

          {loading && (

            <View style={styles.uploadCard}>

              <View style={styles.uploadHeading}>
                <View>
                  <Text style={styles.uploadTitle}>
                    Publishing your reel
                  </Text>

                  <Text style={styles.uploadSubtitle}>
                    Please keep the app open.
                  </Text>
                </View>

                <ActivityIndicator
                  color={GOLD}
                  size="large"
                />
              </View>

              <View style={styles.progressInformation}>
                <Text style={styles.progressLabel}>
                  VIDEO UPLOAD
                </Text>

                <Text style={styles.progressPercentage}>
                  {Math.round(progress)}%
                </Text>
              </View>

              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.max(
                        0,
                        Math.min(progress, 100)
                      )}%`,
                    },
                  ]}
                />
              </View>

              <Text style={styles.progressDescription}>
                {progress >= 100
                  ? "Finishing your reel..."
                  : "Uploading your video to Nasara..."}
              </Text>

            </View>

          )}

          {/* 🟡 PUBLISH BUTTON */}

          {video && (

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={postReel}
              disabled={loading}
              style={[
                styles.publishButton,
                loading && styles.publishButtonDisabled,
              ]}
            >

              {loading ? (
                <ActivityIndicator
                  color={NAVY}
                  size="small"
                />
              ) : (
                <Text style={styles.publishIcon}>
                  ▶️
                </Text>
              )}

              <Text style={styles.publishButtonText}>
                {loading
                  ? "Publishing Reel..."
                  : "Publish Reel"}
              </Text>

              {!loading && (
                <Text style={styles.publishArrow}>
                  →
                </Text>
              )}

            </TouchableOpacity>

          )}

          {/* 🔵 FOOTER */}

          <View style={styles.footer}>
            <Text style={styles.footerLogo}>
              NASARA
            </Text>

            <Text style={styles.footerText}>
              Discover. Connect. Grow.
            </Text>
          </View>

        </ScrollView>

      </KeyboardAvoidingView>

    </View>
  );
}

// 🟡 =====================================================
// 🟡 PREMIUM NASARA STYLES
// 🟡 =====================================================

const styles = StyleSheet.create({

  // 🔵 MAIN CONTAINER

  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  keyboardContainer: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 35,
  },

  // 🔵 HEADER

  header: {
    backgroundColor: NAVY,
    paddingTop: Platform.OS === "ios" ? 55 : 42,
    paddingBottom: 17,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: GOLD,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  backIcon: {
    color: WHITE,
    fontSize: 31,
    lineHeight: 34,
    fontWeight: "400",
  },

  headerCenter: {
    flex: 1,
    marginLeft: 13,
  },

  headerTitle: {
    color: WHITE,
    fontSize: 18,
    fontWeight: "900",
  },

  headerSubtitle: {
    color: "#C7D0DE",
    fontSize: 10,
    marginTop: 4,
  },

  headerLogo: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },

  headerLogoText: {
    color: NAVY,
    fontSize: 24,
    fontWeight: "900",
  },

  // 🔵 INTRODUCTION

  introSection: {
    backgroundColor: NAVY,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 29,
    borderBottomLeftRadius: 27,
    borderBottomRightRadius: 27,
  },

  introBadge: {
    backgroundColor: "rgba(217,164,65,0.16)",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(217,164,65,0.35)",
  },

  introBadgeText: {
    color: GOLD,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  introTitle: {
    color: WHITE,
    fontSize: 31,
    fontWeight: "900",
    marginTop: 17,
  },

  introTitleGold: {
    color: GOLD,
    fontSize: 31,
    fontWeight: "900",
    marginTop: -2,
  },

  introDescription: {
    color: "#D3DBE8",
    fontSize: 12,
    lineHeight: 20,
    marginTop: 11,
    maxWidth: 340,
  },

  // 🔵 SELECTION SECTION

  selectionSection: {
    paddingHorizontal: 18,
    paddingTop: 24,
  },

  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  sectionTitle: {
    color: NAVY,
    fontSize: 17,
    fontWeight: "900",
  },

  sectionSubtitle: {
    color: MUTED,
    fontSize: 11,
    marginTop: 5,
  },

  sectionNumber: {
    color: GOLD,
    fontSize: 22,
    fontWeight: "900",
  },

  // 🔴 RECORD CARD

  recordCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: NAVY,
  },

  recordIconContainer: {
    width: 49,
    height: 49,
    borderRadius: 15,
    backgroundColor: "rgba(239,68,68,0.17)",
    justifyContent: "center",
    alignItems: "center",
  },

  recordIcon: {
    color: "#FF6B70",
    fontSize: 28,
    fontWeight: "900",
  },

  selectionTextContainer: {
    flex: 1,
    marginLeft: 13,
  },

  recordTitle: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "900",
  },

  recordDescription: {
    color: "#C8D1DF",
    fontSize: 10,
    marginTop: 5,
    lineHeight: 15,
  },

  selectionArrow: {
    color: GOLD,
    fontSize: 24,
    fontWeight: "900",
    marginLeft: 8,
  },

  // 🟡 GALLERY CARD

  galleryCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },

  galleryIconContainer: {
    width: 49,
    height: 49,
    borderRadius: 15,
    backgroundColor: GOLD_LIGHT,
    justifyContent: "center",
    alignItems: "center",
  },

  galleryIcon: {
    color: GOLD,
    fontSize: 29,
    fontWeight: "900",
  },

  galleryTitle: {
    color: NAVY,
    fontSize: 13,
    fontWeight: "900",
  },

  galleryDescription: {
    color: MUTED,
    fontSize: 10,
    marginTop: 5,
    lineHeight: 15,
  },

  // 🔵 INFORMATION

  videoInfo: {
    backgroundColor: "#EDF2F8",
    borderRadius: 13,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 5,
  },

  videoInfoIcon: {
    color: "#53749F",
    fontSize: 17,
    marginRight: 9,
    fontWeight: "900",
  },

  videoInfoText: {
    color: "#66758B",
    fontSize: 10,
    lineHeight: 16,
    flex: 1,
  },

  // 🔵 PREVIEW SECTION

  previewSection: {
    paddingHorizontal: 18,
    paddingTop: 24,
  },

  previewCard: {
    backgroundColor: NAVY,
    borderRadius: 19,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: NAVY_LIGHT,
  },

  previewTopBar: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  previewStatus: {
    flexDirection: "row",
    alignItems: "center",
  },

  previewStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: GREEN,
    marginRight: 7,
  },

  previewStatusText: {
    color: "#D5DFEC",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  removeVideoButton: {
    backgroundColor: "rgba(229,72,77,0.17)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },

  removeVideoText: {
    color: "#FF8589",
    fontSize: 10,
    fontWeight: "800",
  },

  preview: {
    width: "100%",
    height: Math.min(width * 1.05, 460),
    backgroundColor: "#000000",
  },

  previewBottom: {
    padding: 13,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },

  previewBottomText: {
    color: "#D5DFEC",
    fontSize: 10,
    fontWeight: "800",
  },

  changeVideoButton: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 13,
    alignItems: "center",
    marginTop: 11,
  },

  changeVideoText: {
    color: NAVY,
    fontSize: 11,
    fontWeight: "900",
  },

  // 🎵 MUSIC SECTION

  musicSection: {
    paddingHorizontal: 18,
    paddingTop: 25,
  },

  selectedMusicCard: {
    backgroundColor: NAVY,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: NAVY_LIGHT,
    marginBottom: 13,
  },

  musicDisc: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(217,164,65,0.18)",
    borderWidth: 1,
    borderColor: "rgba(217,164,65,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },

  musicDiscIcon: {
    color: GOLD,
    fontSize: 26,
    fontWeight: "900",
  },

  selectedMusicInfo: {
    flex: 1,
    marginLeft: 12,
  },

  selectedMusicTitle: {
    color: WHITE,
    fontSize: 12,
    fontWeight: "900",
  },

  selectedMusicArtist: {
    color: "#C5D0E0",
    fontSize: 10,
    marginTop: 5,
  },

  removeMusicButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(229,72,77,0.17)",
    alignItems: "center",
    justifyContent: "center",
  },

  removeMusicText: {
    color: "#FF8589",
    fontSize: 15,
    fontWeight: "900",
  },

  musicSearchContainer: {
    backgroundColor: WHITE,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 13,
    minHeight: 47,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13,
  },

  musicSearchIcon: {
    color: GOLD,
    fontSize: 24,
    marginRight: 9,
  },

  musicSearchInput: {
    flex: 1,
    color: TEXT,
    fontSize: 11,
    paddingVertical: 10,
  },

  clearSearchText: {
    color: MUTED,
    fontSize: 16,
    padding: 5,
  },

  musicLibrary: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 13,
  },

  musicLibraryHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  musicLibraryTitle: {
    color: NAVY,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  musicLibraryCount: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "800",
  },

  musicLoading: {
    paddingVertical: 30,
    alignItems: "center",
  },

  musicLoadingText: {
    color: MUTED,
    fontSize: 10,
    marginTop: 10,
  },

  musicEmpty: {
    alignItems: "center",
    paddingVertical: 23,
    paddingHorizontal: 12,
  },

  musicEmptyIcon: {
    color: GOLD,
    fontSize: 28,
    marginBottom: 8,
  },

  musicEmptyTitle: {
    color: NAVY,
    fontSize: 12,
    fontWeight: "900",
  },

  musicEmptyDescription: {
    color: MUTED,
    fontSize: 10,
    textAlign: "center",
    lineHeight: 16,
    marginTop: 6,
  },

  retryMusicButton: {
    backgroundColor: NAVY,
    paddingHorizontal: 17,
    paddingVertical: 9,
    borderRadius: 9,
    marginTop: 13,
  },

  retryMusicText: {
    color: GOLD,
    fontSize: 10,
    fontWeight: "900",
  },

  musicTrack: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
    marginTop: 5,
  },

  musicTrackSelected: {
    backgroundColor: "#FFF9EC",
    borderColor: GOLD,
  },

  trackIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#F0F3F8",
    alignItems: "center",
    justifyContent: "center",
  },

  trackIconSelected: {
    backgroundColor: GOLD_LIGHT,
  },

  trackIconText: {
    color: NAVY,
    fontSize: 20,
    fontWeight: "900",
  },

  trackIconTextSelected: {
    color: "#9B6B17",
  },

  trackInformation: {
    flex: 1,
    marginLeft: 10,
    marginRight: 7,
  },

  trackTitle: {
    color: NAVY,
    fontSize: 11,
    fontWeight: "900",
  },

  trackTitleSelected: {
    color: "#9B6B17",
  },

  trackArtist: {
    color: MUTED,
    fontSize: 9,
    marginTop: 4,
  },

  selectedBadge: {
    backgroundColor: GOLD_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },

  selectedBadgeText: {
    color: "#8A6016",
    fontSize: 8,
    fontWeight: "900",
  },

  trackSelectIcon: {
    color: GOLD,
    fontSize: 24,
    fontWeight: "900",
    paddingHorizontal: 5,
  },

  musicPreviewButton: {
    backgroundColor: NAVY,
    borderRadius: 13,
    minHeight: 47,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: NAVY_LIGHT,
  },

  musicPreviewIcon: {
    color: GOLD,
    fontSize: 17,
    fontWeight: "900",
    marginRight: 9,
  },

  musicPreviewText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: "900",
  },

  // 🎵 VOLUME CONTROLS

  volumeCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 15,
    marginTop: 13,
  },

  volumeHeading: {
    color: GOLD,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 16,
  },

  volumeControl: {
    marginBottom: 17,
  },

  volumeLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 9,
  },

  volumeLabel: {
    color: NAVY,
    fontSize: 10,
    fontWeight: "800",
  },

  volumeValue: {
    color: GOLD,
    fontSize: 11,
    fontWeight: "900",
  },

  volumeButtons: {
    flexDirection: "row",
    alignItems: "center",
  },

  volumeButton: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: NAVY,
    alignItems: "center",
    justifyContent: "center",
  },

  volumeButtonText: {
    color: GOLD,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 24,
  },

  volumeBar: {
    flex: 1,
    height: 7,
    borderRadius: 8,
    backgroundColor: "#E9EDF3",
    overflow: "hidden",
    marginHorizontal: 10,
  },

  volumeFill: {
    height: "100%",
    backgroundColor: GOLD,
    borderRadius: 8,
  },

  volumeDescription: {
    color: MUTED,
    fontSize: 9,
    lineHeight: 15,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 11,
  },

  musicInformation: {
    backgroundColor: GOLD_LIGHT,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 12,
  },

  musicInformationIcon: {
    color: "#9B6B17",
    fontSize: 16,
    fontWeight: "900",
    marginRight: 8,
  },

  musicInformationText: {
    color: "#806020",
    fontSize: 9,
    lineHeight: 15,
    flex: 1,
  },

  // 🔵 CAPTION SECTION

  captionSection: {
    paddingHorizontal: 18,
    paddingTop: 25,
  },

  captionCard: {
    backgroundColor: WHITE,
    borderRadius: 17,
    padding: 15,
    borderWidth: 1,
    borderColor: BORDER,
  },

  captionLabel: {
    color: GOLD,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  captionInput: {
    color: TEXT,
    fontSize: 13,
    lineHeight: 21,
    minHeight: 105,
    paddingTop: 13,
    paddingBottom: 10,
  },

  captionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },

  captionHint: {
    color: MUTED,
    fontSize: 9,
  },

  captionCount: {
    color: GOLD,
    fontSize: 10,
    fontWeight: "900",
  },

  // 🟡 UPLOAD CARD

  uploadCard: {
    backgroundColor: NAVY,
    borderRadius: 17,
    padding: 17,
    marginHorizontal: 18,
    marginTop: 22,
  },

  uploadHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  uploadTitle: {
    color: WHITE,
    fontSize: 14,
    fontWeight: "900",
  },

  uploadSubtitle: {
    color: "#C5D0E0",
    fontSize: 10,
    marginTop: 5,
  },

  progressInformation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 9,
  },

  progressLabel: {
    color: "#C5D0E0",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  progressPercentage: {
    color: GOLD,
    fontSize: 15,
    fontWeight: "900",
  },

  progressBar: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: GOLD,
    borderRadius: 10,
  },

  progressDescription: {
    color: "#C5D0E0",
    fontSize: 10,
    marginTop: 10,
  },

  // 🟡 PUBLISH BUTTON

  publishButton: {
    backgroundColor: GOLD,
    marginHorizontal: 18,
    marginTop: 23,
    minHeight: 56,
    borderRadius: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 17,
    shadowColor: GOLD,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  publishButtonDisabled: {
    opacity: 0.75,
  },

  publishIcon: {
    color: NAVY,
    fontSize: 13,
    marginRight: 10,
  },

  publishButtonText: {
    color: NAVY,
    fontSize: 13,
    fontWeight: "900",
  },

  publishArrow: {
    color: NAVY,
    fontSize: 21,
    fontWeight: "900",
    marginLeft: 10,
  },

  // 🔵 FOOTER

  footer: {
    alignItems: "center",
    paddingTop: 29,
    paddingBottom: 10,
  },

  footerLogo: {
    color: NAVY,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 3,
  },

  footerText: {
    color: MUTED,
    fontSize: 9,
    marginTop: 5,
    letterSpacing: 0.5,
  },
// ==========================================
// 🎵 MUSIC TRIMMING STUDIO
// ==========================================

trimCard: {
  backgroundColor: WHITE,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: GOLD,
  padding: 15,
  marginTop: 13,
},

trimTitle: {
  color: NAVY,
  fontSize: 13,
  fontWeight: "900",
},

trimDescription: {
  color: MUTED,
  fontSize: 10,
  lineHeight: 16,
  marginTop: 6,
  marginBottom: 16,
},

trimLabel: {
  color: GOLD,
  fontSize: 9,
  fontWeight: "900",
  letterSpacing: 1,
  marginBottom: 9,
  marginTop: 5,
},

trimDurationRow: {
  flexDirection: "row",
  gap: 9,
  marginBottom: 17,
},

trimDurationButton: {
  flex: 1,
  backgroundColor: "#F0F3F8",
  borderRadius: 10,
  paddingVertical: 12,
  alignItems: "center",
  borderWidth: 1,
  borderColor: BORDER,
},

trimDurationButtonActive: {
  backgroundColor: NAVY,
  borderColor: GOLD,
},

trimDurationButtonDisabled: {
  opacity: 0.35,
},

trimDurationText: {
  color: NAVY,
  fontSize: 12,
  fontWeight: "900",
},

trimDurationTextActive: {
  color: GOLD,
},

trimPositionRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 16,
},

trimPositionButton: {
  backgroundColor: NAVY,
  paddingHorizontal: 13,
  paddingVertical: 12,
  borderRadius: 10,
},

trimPositionButtonText: {
  color: GOLD,
  fontSize: 10,
  fontWeight: "900",
},

trimPositionDisplay: {
  alignItems: "center",
},

trimPositionValue: {
  color: NAVY,
  fontSize: 20,
  fontWeight: "900",
},

trimPositionCaption: {
  color: MUTED,
  fontSize: 9,
  marginTop: 3,
},

trimSummary: {
  backgroundColor: GOLD_LIGHT,
  borderRadius: 10,
  padding: 12,
},

trimSummaryText: {
  color: NAVY,
  fontSize: 10,
  fontWeight: "900",
},

trimSummaryDuration: {
  color: "#8A6016",
  fontSize: 10,
  fontWeight: "800",
  marginTop: 5,
},

trimFootnote: {
  color: MUTED,
  fontSize: 9,
  lineHeight: 15,
  marginTop: 11,
},
});