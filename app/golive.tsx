// ==========================================
// 📦 IMPORTS
// ==========================================

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { WebView } from "react-native-webview";
import { supabase } from "../lib/supabase";

// ==========================================
// 🎨 NASARA PREMIUM COLOURS
// ==========================================

const COLORS = {
  navy: "#14213D",
  navyLight: "#203354",
  gold: "#D6A84F",
  goldLight: "#F8EFD9",
  background: "#F5F6FA",
  white: "#FFFFFF",
  text: "#172238",
  muted: "#7C8799",
  border: "#E5E9F0",
  green: "#16865B",
  greenLight: "#EAF7F0",
  red: "#D94B4B",
  redLight: "#FFF0F0",
};

// ==========================================
// 🎥 SELLER LIVE DASHBOARD
// ==========================================

export default function GoLiveScreen() {
  const router = useRouter();

  const screenWidth = Dimensions.get("window").width;
  const videoRef = useRef<any>(null);

  // ==========================================
  // 📝 LIVE FORM STATES
  // ==========================================

  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [loading, setLoading] = useState(false);

  // ==========================================
  // 🔴 ACTIVE LIVE STATES
  // ==========================================

  const [activeLiveId, setActiveLiveId] = useState<string | null>(null);
  const [activeYoutubeUrl, setActiveYoutubeUrl] = useState<string | null>(null);

  // ==========================================
  // 💬 CHAT STATES
  // ==========================================

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState(0);

  // ==========================================
  // 🎬 EXTRACT YOUTUBE VIDEO ID
  // ==========================================

  const getVideoId = (url: string) => {
    if (!url) return null;

    const match = url.match(
      /(?:watch\?v=|live\/|youtu\.be\/)([^&?/]+)/
    );

    return match ? match[1] : null;
  };

  const videoId = activeYoutubeUrl
    ? getVideoId(activeYoutubeUrl)
    : null;

  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?playsinline=1&rel=0&modestbranding=1`
    : null;

  // ==========================================
  // 💬 MESSAGE HELPER
  // ==========================================

  const showMessage = (heading: string, message?: string) => {
    Alert.alert(heading, message);
  };

  // ==========================================
  // 🔄 LOAD ACTIVE LIVE SESSION
  // ==========================================

  const findActiveLive = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await (supabase as any)
        .from("live_streams")
        .select("id, youtube_url")
        .eq("user_id", user.id)
        .eq("status", "live")
        .maybeSingle();

      if (error) {
        console.error("Load active live error:", error);
        return;
      }

      if (data) {
        setActiveLiveId(data.id);
        setActiveYoutubeUrl(data.youtube_url);

        await loadMessages(data.id);
      }
    } catch (error) {
      console.error("Find active live error:", error);
    }
  };

  // ==========================================
  // 💬 LOAD OLD CHAT MESSAGES
  // ==========================================

  const loadMessages = async (liveId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", liveId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Load messages error:", error);
        return;
      }

      setMessages(data ?? []);
    } catch (error) {
      console.error("Message history error:", error);
    }
  };

  // ==========================================
  // 🔔 REALTIME CHAT SUBSCRIPTION
  // ==========================================

  useEffect(() => {
    if (!activeLiveId) return;

    const channel = supabase
      .channel("seller-live-" + activeLiveId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${activeLiveId}`,
        },
        (payload: any) => {
          setMessages((prev) => {
            const exists = prev.some(
              (message) =>
                String(message.id) === String(payload.new.id)
            );

            if (exists) return prev;

            return [payload.new, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeLiveId]);

  // ==========================================
  // 🚀 LOAD LIVE SESSION ON SCREEN OPEN
  // ==========================================

  useEffect(() => {
    findActiveLive();
  }, []);

  // ==========================================
  // 💬 SEND CHAT MESSAGE
  // ==========================================

  const sendMessage = async () => {
    const now = Date.now();

    if (now - lastSent < 1000) return;

    if (!newMessage.trim() || !activeLiveId || sending) return;

    setLastSent(now);
    setSending(true);

    const textValue = newMessage.trim();

    const tempId = `temp-${now}`;

    const tempMessage = {
      id: tempId,
      text: textValue,
      room_id: activeLiveId,
      created_at: new Date().toISOString(),
    };

    // ==========================================
    // ⚡ OPTIMISTIC CHAT UPDATE
    // ==========================================

    setMessages((prev) => [tempMessage, ...prev]);
    setNewMessage("");

    try {
      const { data, error } = await (supabase as any)
        .from("messages")
        .insert({
          room_id: activeLiveId,
          text: textValue,
        })
        .select()
        .single();

      if (error) throw error;

      // Replace the temporary message with the saved message.
      if (data) {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === tempId ? data : message
          )
        );
      }
    } catch (error: any) {
      setMessages((prev) =>
        prev.filter((message) => message.id !== tempId)
      );

      showMessage(
        "Send Failed",
        error?.message || "Could not send your message."
      );
    } finally {
      setSending(false);
    }
  };

  // ==========================================
  // 🔴 START LIVE SESSION
  // ==========================================

  const startLive = async () => {
    if (!title.trim() || !youtubeUrl.trim()) {
      showMessage(
        "Missing Information",
        "Please enter your live title and YouTube Live link."
      );
      return;
    }

    const extractedId = getVideoId(youtubeUrl.trim());

    if (!extractedId) {
      showMessage(
        "Invalid YouTube Link",
        "Please enter a valid YouTube video or live-stream link."
      );
      return;
    }

    setLoading(true);

    try {
      // ==========================================
      // 🔐 CHECK USER LOGIN
      // ==========================================

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        showMessage(
          "Login Required",
          "Please login before starting a live session."
        );
        return;
      }

      // ==========================================
      // ⏹️ END PREVIOUS ACTIVE LIVE SESSIONS
      // ==========================================

      const { error: updateError } = await (supabase as any)
        .from("live_streams")
        .update({ status: "ended" })
        .eq("user_id", user.id)
        .eq("status", "live");

      if (updateError) throw updateError;

      // ==========================================
      // 💾 CREATE NEW LIVE SESSION
      // ==========================================

      const { data, error } = await (supabase as any)
        .from("live_streams")
        .insert({
          user_id: user.id,
          title: title.trim(),
          status: "live",
          youtube_url: youtubeUrl.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      if (!data) {
        throw new Error("Could not create your live session.");
      }

      // ==========================================
      // ✅ SET ACTIVE LIVE
      // ==========================================

      setActiveLiveId(data.id);
      setActiveYoutubeUrl(data.youtube_url);
      setMessages([]);

      showMessage(
        "You Are Live!",
        "Your live session has started successfully."
      );
    } catch (error: any) {
      console.error("Start live error:", error);

      showMessage(
        "Unable to Start Live",
        error?.message || "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // ⛔ END LIVE SESSION
  // ==========================================

  const endLive = async () => {
    if (!activeLiveId) return;

    Alert.alert(
      "End Live Session?",
      "Are you sure you want to end your live session?",
      [
        {
          text: "Continue Live",
          style: "cancel",
        },
        {
          text: "End Live",
          style: "destructive",
          onPress: async () => {
            setLoading(true);

            try {
              const { error } = await (supabase as any)
                .from("live_streams")
                .update({ status: "ended" })
                .eq("id", activeLiveId);

              if (error) throw error;

              setActiveLiveId(null);
              setActiveYoutubeUrl(null);
              setMessages([]);

              router.replace("/browse");
            } catch (error: any) {
              showMessage(
                "Could Not End Live",
                error?.message || "Something went wrong."
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // ==========================================
  // 🕒 MESSAGE TIME
  // ==========================================

  const formatMessageTime = (createdAt?: string) => {
    if (!createdAt) return "";

    const date = new Date(createdAt);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ==========================================
  // 🖥️ MAIN UI
  // ==========================================

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      {/* ======================================
          🔵 HEADER
      ====================================== */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/browse")}
        >
          <Ionicons
            name="arrow-back"
            size={21}
            color={COLORS.white}
          />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerEyebrow}>
            NASARA MARKETPLACE
          </Text>

          <Text style={styles.headerTitle}>
            Seller Live
          </Text>

          <Text style={styles.headerSubtitle}>
            Your live-stream control centre.
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Ionicons
            name="radio-outline"
            size={27}
            color={COLORS.gold}
          />
        </View>
      </View>

      {/* ======================================
          🔴 LIVE STATUS
      ====================================== */}

      <View
        style={[
          styles.statusCard,
          activeLiveId && styles.statusCardLive,
        ]}
      >
        <View
          style={[
            styles.statusIcon,
            activeLiveId && styles.statusIconLive,
          ]}
        >
          <Ionicons
            name="videocam"
            size={23}
            color={activeLiveId ? COLORS.green : COLORS.navy}
          />
        </View>

        <View style={styles.statusContent}>
          <Text style={styles.statusTitle}>
            {activeLiveId
              ? "Your broadcast is active"
              : "Ready to broadcast?"}
          </Text>

          <Text style={styles.statusDescription}>
            {activeLiveId
              ? "Your YouTube stream is connected to Nasara."
              : "Connect your YouTube Live stream to reach buyers."}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            activeLiveId && styles.statusBadgeLive,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              activeLiveId && styles.statusDotLive,
            ]}
          />

          <Text
            style={[
              styles.statusBadgeText,
              activeLiveId && styles.statusBadgeTextLive,
            ]}
          >
            {activeLiveId ? "LIVE" : "OFFLINE"}
          </Text>
        </View>
      </View>

      {/* ======================================
          📝 CREATE LIVE FORM
      ====================================== */}

      {!activeLiveId && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.introCard}>
            <View style={styles.introIcon}>
              <Ionicons
                name="flash"
                size={26}
                color={COLORS.gold}
              />
            </View>

            <Text style={styles.introTitle}>
              Take your business live
            </Text>

            <Text style={styles.introDescription}>
              Stream directly from YouTube and engage with your
              buyers through Nasara's live chat.
            </Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionIcon}>
                <Ionicons
                  name="create-outline"
                  size={20}
                  color={COLORS.navy}
                />
              </View>

              <View>
                <Text style={styles.sectionTitle}>
                  Broadcast Details
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Set up your live session.
                </Text>
              </View>
            </View>

            {/* ======================================
                📝 LIVE TITLE
            ====================================== */}

            <Text style={styles.inputLabel}>
              Live Session Title
            </Text>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="text-outline"
                size={19}
                color={COLORS.muted}
              />

              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Example: Live Product Showcase"
                placeholderTextColor="#A5ADBA"
                style={styles.input}
                maxLength={100}
              />
            </View>

            <Text style={styles.characterCount}>
              {title.length}/100 characters
            </Text>

            {/* ======================================
                ▶️ YOUTUBE URL
            ====================================== */}

            <Text style={[styles.inputLabel, styles.urlLabel]}>
              YouTube Live Link
            </Text>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="logo-youtube"
                size={20}
                color={COLORS.red}
              />

              <TextInput
                value={youtubeUrl}
                onChangeText={setYoutubeUrl}
                placeholder="Paste your YouTube Live URL"
                placeholderTextColor="#A5ADBA"
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>

            <View style={styles.urlHint}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={COLORS.muted}
              />

              <Text style={styles.urlHintText}>
                Start your broadcast on YouTube first, then paste
                its live link here.
              </Text>
            </View>
          </View>

          {/* ======================================
              ℹ️ HOW IT WORKS
          ====================================== */}

          <View style={styles.stepsCard}>
            <Text style={styles.stepsTitle}>
              How to go live
            </Text>

            <View style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>

              <View style={styles.stepContent}>
                <Text style={styles.stepHeading}>
                  Start streaming on YouTube
                </Text>

                <Text style={styles.stepDescription}>
                  Open YouTube and start your live broadcast.
                </Text>
              </View>
            </View>

            <View style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>

              <View style={styles.stepContent}>
                <Text style={styles.stepHeading}>
                  Copy your live link
                </Text>

                <Text style={styles.stepDescription}>
                  Copy the URL of your YouTube live broadcast.
                </Text>
              </View>
            </View>

            <View style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>

              <View style={styles.stepContent}>
                <Text style={styles.stepHeading}>
                  Connect to Nasara
                </Text>

                <Text style={styles.stepDescription}>
                  Enter your title and YouTube link above.
                </Text>
              </View>
            </View>
          </View>

          {/* ======================================
              🔴 GO LIVE BUTTON
          ====================================== */}

          <TouchableOpacity
            onPress={startLive}
            disabled={loading}
            style={[
              styles.startButton,
              loading && styles.disabledButton,
            ]}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator
                color={COLORS.white}
                size="small"
              />
            ) : (
              <Ionicons
                name="radio"
                size={21}
                color={COLORS.white}
              />
            )}

            <Text style={styles.startButtonText}>
              {loading ? "Connecting..." : "Go Live on Nasara"}
            </Text>

            {!loading && (
              <Ionicons
                name="arrow-forward"
                size={19}
                color={COLORS.white}
              />
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ======================================
          🔴 ACTIVE LIVE DASHBOARD
      ====================================== */}

      {activeLiveId && (
        <View style={styles.activeDashboard}>
          {/* ======================================
              🎥 STREAM PREVIEW
          ====================================== */}

          <View style={styles.previewSection}>
            <View style={styles.previewHeading}>
              <View>
                <Text style={styles.previewTitle}>
                  Live Broadcast
                </Text>

                <Text style={styles.previewSubtitle}>
                  Your YouTube stream preview
                </Text>
              </View>

              <View style={styles.liveNowBadge}>
                <View style={styles.liveNowDot} />

                <Text style={styles.liveNowText}>
                  LIVE NOW
                </Text>
              </View>
            </View>

            {embedUrl ? (
              <View
                style={[
                  styles.videoContainer,
                  {
                    width: "100%",
                  },
                ]}
              >
                {Platform.OS === "web" ? (
                  <iframe
                    src={embedUrl}
                    width="100%"
                    height="100%"
                    style={{
                      border: 0,
                    }}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <WebView
                    ref={videoRef}
                    source={{ uri: embedUrl }}
                    style={styles.webView}
                    javaScriptEnabled
                    domStorageEnabled
                    allowsFullscreenVideo
                    mediaPlaybackRequiresUserAction={false}
                  />
                )}
              </View>
            ) : (
              <View style={styles.invalidVideo}>
                <Ionicons
                  name="alert-circle-outline"
                  size={35}
                  color={COLORS.gold}
                />

                <Text style={styles.invalidVideoText}>
                  Unable to display this YouTube stream.
                </Text>
              </View>
            )}

            <Text style={styles.broadcastTitle}>
              {title}
            </Text>

            <View style={styles.broadcastDetails}>
              <View style={styles.broadcastDetail}>
                <Ionicons
                  name="radio-outline"
                  size={15}
                  color={COLORS.green}
                />

                <Text style={styles.broadcastDetailText}>
                  Connected to YouTube
                </Text>
              </View>

              <View style={styles.broadcastDetail}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={15}
                  color={COLORS.gold}
                />

                <Text style={styles.broadcastDetailText}>
                  Live chat enabled
                </Text>
              </View>
            </View>
          </View>

          {/* ======================================
              💬 LIVE CHAT
          ====================================== */}

          <View style={styles.chatSection}>
            <View style={styles.chatHeading}>
              <View style={styles.chatHeadingLeft}>
                <View style={styles.chatIcon}>
                  <Ionicons
                    name="chatbubbles"
                    size={19}
                    color={COLORS.navy}
                  />
                </View>

                <View>
                  <Text style={styles.chatTitle}>
                    Buyer Chat
                  </Text>

                  <Text style={styles.chatSubtitle}>
                    Messages from your audience
                  </Text>
                </View>
              </View>

              <View style={styles.messageCountBadge}>
                <Text style={styles.messageCountText}>
                  {messages.length}
                </Text>
              </View>
            </View>

            {/* ======================================
                💬 MESSAGE LIST
            ====================================== */}

            <FlatList
              data={messages}
              inverted
              keyExtractor={(item) => item.id.toString()}
              style={styles.messageList}
              contentContainerStyle={styles.messageListContent}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <View style={styles.messageRow}>
                  <View style={styles.messageAvatar}>
                    <Ionicons
                      name="person"
                      size={15}
                      color={COLORS.navy}
                    />
                  </View>

                  <View style={styles.messageBubble}>
                    <Text style={styles.messageText}>
                      {item.text}
                    </Text>

                    <Text style={styles.messageTime}>
                      {formatMessageTime(item.created_at)}
                    </Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyChat}>
                  <View style={styles.emptyChatIcon}>
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={27}
                      color={COLORS.muted}
                    />
                  </View>

                  <Text style={styles.emptyChatTitle}>
                    No messages yet
                  </Text>

                  <Text style={styles.emptyChatText}>
                    Buyer messages will appear here.
                  </Text>
                </View>
              }
            />

            {/* ======================================
                ✍️ CHAT INPUT
            ====================================== */}

            <View style={styles.chatInputContainer}>
              <TextInput
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Reply to a buyer..."
                placeholderTextColor="#A5ADBA"
                style={styles.chatInput}
                multiline
                maxLength={1000}
                editable={!sending}
                onSubmitEditing={sendMessage}
              />

              <TouchableOpacity
                onPress={sendMessage}
                disabled={sending || !newMessage.trim()}
                style={[
                  styles.sendButton,
                  (sending || !newMessage.trim()) &&
                    styles.sendButtonDisabled,
                ]}
              >
                {sending ? (
                  <ActivityIndicator
                    color={COLORS.white}
                    size="small"
                  />
                ) : (
                  <Ionicons
                    name="send"
                    size={18}
                    color={COLORS.white}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* ======================================
              ⛔ END LIVE
          ====================================== */}

          <TouchableOpacity
            onPress={endLive}
            disabled={loading}
            style={styles.endLiveButton}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator
                color={COLORS.red}
                size="small"
              />
            ) : (
              <Ionicons
                name="stop-circle-outline"
                size={21}
                color={COLORS.red}
              />
            )}

            <Text style={styles.endLiveButtonText}>
              End Live Broadcast
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ======================================
          🏷️ FOOTER
      ====================================== */}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          POWERED BY NASARA
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

// ==========================================
// 🎨 STYLES
// ==========================================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    paddingBottom: 30,
  },

  // ==========================================
  // 🔵 HEADER
  // ==========================================

  header: {
    backgroundColor: COLORS.navy,
    paddingTop: Platform.OS === "ios" ? 57 : 40,
    paddingHorizontal: 18,
    paddingBottom: 26,
    borderBottomLeftRadius: 27,
    borderBottomRightRadius: 27,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  headerContent: {
    flex: 1,
  },

  headerEyebrow: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 5,
  },

  headerTitle: {
    color: COLORS.white,
    fontSize: 26,
    fontWeight: "900",
  },

  headerSubtitle: {
    color: "#C6CDDA",
    fontSize: 11,
    marginTop: 5,
  },

  headerIcon: {
    width: 47,
    height: 47,
    borderRadius: 15,
    backgroundColor: "rgba(214,168,79,0.13)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  // ==========================================
  // 🔴 STATUS
  // ==========================================

  statusCard: {
    marginHorizontal: 17,
    marginTop: 17,
    padding: 13,
    backgroundColor: COLORS.white,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
  },

  statusCardLive: {
    borderColor: "#B9E4CE",
    backgroundColor: "#F7FCF9",
  },

  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: COLORS.goldLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  statusIconLive: {
    backgroundColor: COLORS.greenLight,
  },

  statusContent: {
    flex: 1,
  },

  statusTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.navy,
  },

  statusDescription: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 4,
    lineHeight: 15,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F3F7",
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 20,
    marginLeft: 5,
  },

  statusBadgeLive: {
    backgroundColor: COLORS.greenLight,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: COLORS.muted,
    marginRight: 5,
  },

  statusDotLive: {
    backgroundColor: COLORS.green,
  },

  statusBadgeText: {
    fontSize: 9,
    color: COLORS.muted,
    fontWeight: "900",
  },

  statusBadgeTextLive: {
    color: COLORS.green,
  },

  // ==========================================
  // 🟡 INTRO
  // ==========================================

  introCard: {
    marginHorizontal: 17,
    marginTop: 20,
    padding: 19,
    borderRadius: 19,
    backgroundColor: COLORS.navy,
  },

  introIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "rgba(214,168,79,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  introTitle: {
    color: COLORS.white,
    fontSize: 19,
    fontWeight: "900",
  },

  introDescription: {
    color: "#D0D7E3",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 7,
  },

  // ==========================================
  // 📦 FORM SECTION
  // ==========================================

  section: {
    marginHorizontal: 17,
    marginTop: 18,
    padding: 17,
    backgroundColor: COLORS.white,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: COLORS.goldLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  sectionTitle: {
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: "900",
  },

  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 4,
  },

  // ==========================================
  // 📝 INPUTS
  // ==========================================

  inputLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
  },

  inputWrapper: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    backgroundColor: "#FAFBFD",
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  input: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    marginLeft: 10,
    paddingVertical: 12,
  },

  characterCount: {
    textAlign: "right",
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 7,
  },

  urlLabel: {
    marginTop: 19,
  },

  urlHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 11,
  },

  urlHintText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 16,
    color: COLORS.muted,
    marginLeft: 7,
  },

  // ==========================================
  // 📋 HOW IT WORKS
  // ==========================================

  stepsCard: {
    marginHorizontal: 17,
    marginTop: 17,
    padding: 17,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  stepsTitle: {
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 17,
  },

  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 17,
  },

  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: COLORS.goldLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  stepNumberText: {
    color: COLORS.navy,
    fontSize: 12,
    fontWeight: "900",
  },

  stepContent: {
    flex: 1,
  },

  stepHeading: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "900",
  },

  stepDescription: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 4,
  },

  // ==========================================
  // 🔴 START BUTTON
  // ==========================================

  startButton: {
    marginHorizontal: 17,
    marginTop: 20,
    minHeight: 56,
    backgroundColor: COLORS.navy,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    gap: 10,
  },

  startButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "900",
  },

  disabledButton: {
    opacity: 0.65,
  },

  // ==========================================
  // 🎥 ACTIVE DASHBOARD
  // ==========================================

  activeDashboard: {
    flex: 1,
    paddingBottom: 10,
  },

  previewSection: {
    marginHorizontal: 15,
    marginTop: 17,
    padding: 13,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  previewHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
  },

  previewTitle: {
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: "900",
  },

  previewSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 4,
  },

  liveNowBadge: {
    backgroundColor: COLORS.redLight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
  },

  liveNowDot: {
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: COLORS.red,
    marginRight: 6,
  },

  liveNowText: {
    color: COLORS.red,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  videoContainer: {
    height: 205,
    backgroundColor: "#000000",
    borderRadius: 13,
    overflow: "hidden",
  },

  webView: {
    flex: 1,
    backgroundColor: "#000000",
  },

  invalidVideo: {
    height: 205,
    backgroundColor: COLORS.navy,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  invalidVideoText: {
    color: COLORS.white,
    fontSize: 12,
    marginTop: 10,
    textAlign: "center",
  },

  broadcastTitle: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 14,
  },

  broadcastDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 13,
    marginTop: 12,
  },

  broadcastDetail: {
    flexDirection: "row",
    alignItems: "center",
  },

  broadcastDetailText: {
    color: COLORS.muted,
    fontSize: 10,
    marginLeft: 5,
  },

  // ==========================================
  // 💬 CHAT SECTION
  // ==========================================

  chatSection: {
    flex: 1,
    minHeight: 250,
    marginHorizontal: 15,
    marginTop: 15,
    padding: 14,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  chatHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  chatHeadingLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  chatIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: COLORS.goldLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  chatTitle: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: "900",
  },

  chatSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 3,
  },

  messageCountBadge: {
    minWidth: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: COLORS.goldLight,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
  },

  messageCountText: {
    color: COLORS.navy,
    fontSize: 11,
    fontWeight: "900",
  },

  messageList: {
    flex: 1,
    minHeight: 150,
    maxHeight: 270,
    marginTop: 7,
  },

  messageListContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },

  messageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 6,
  },

  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 11,
    backgroundColor: COLORS.goldLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  messageBubble: {
    flex: 1,
    backgroundColor: "#F5F6FA",
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },

  messageText: {
    color: COLORS.text,
    fontSize: 12,
    lineHeight: 18,
  },

  messageTime: {
    color: COLORS.muted,
    fontSize: 9,
    marginTop: 5,
    textAlign: "right",
  },

  // ==========================================
  // 💬 EMPTY CHAT
  // ==========================================

  emptyChat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 23,
  },

  emptyChatIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: "#F1F3F7",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyChatTitle: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 10,
  },

  emptyChatText: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 5,
  },

  // ==========================================
  // ✍️ CHAT INPUT
  // ==========================================

  chatInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  chatInput: {
    flex: 1,
    minHeight: 45,
    maxHeight: 90,
    backgroundColor: "#F5F6FA",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 12,
  },

  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  sendButtonDisabled: {
    backgroundColor: "#A5ADBA",
  },

  // ==========================================
  // ⛔ END LIVE
  // ==========================================

  endLiveButton: {
    marginHorizontal: 15,
    marginTop: 15,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F0CACA",
    backgroundColor: COLORS.redLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  endLiveButtonText: {
    color: COLORS.red,
    fontSize: 13,
    fontWeight: "900",
  },

  // ==========================================
  // 🏷️ FOOTER
  // ==========================================

  footer: {
    alignItems: "center",
    paddingVertical: 12,
  },

  footerText: {
    color: "#A5ADBA",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2,
  },
});