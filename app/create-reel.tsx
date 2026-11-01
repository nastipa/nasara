// 🟡 =====================================================
// 🟡 NASARA - CREATE REEL
// 🟡 PREMIUM VIDEO CREATION STUDIO
// 🟡 =====================================================

import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import * as VideoThumbnails from "expo-video-thumbnails";

import { useEffect, useState } from "react";

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

  // 🔵 PLAYER

  const player = useVideoPlayer(null);

  // 🟡 =====================================================
  // 🟡 VIDEO PLAYER CONFIGURATION
  // 🟡 =====================================================

  useEffect(() => {
    if (video?.uri) {
      player.replace(video.uri);

      const timer = setTimeout(() => {
        player.play();
      }, 300);

      player.loop = false;
      player.muted = false;

      return () => clearTimeout(timer);
    } else {
      player.replace(null);
    }
  }, [video?.uri]);

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
                  02
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

});