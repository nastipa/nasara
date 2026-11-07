// 🔴 ==================================================
// 🔴 NASARA — GO LIVE
// 🔴 WEB + ANDROID + IOS
// 🔴 LIVEKIT VIDEO BROADCASTING
// 🔴 ==================================================

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import LiveKitHost from "../components/LiveKitHost";
import { fetchLiveKitToken } from "../lib/livekit";
import { supabase } from "../lib/supabase";

// 🟡 ==================================================
// 🟡 CONFIGURATION
// 🟡 ==================================================

const UPLOAD_SERVER =
  "https://nasara-upload-server.onrender.com";

const COLORS = {
  background: "#07111F",
  card: "#101E30",
  cardLight: "#16263A",
  gold: "#E8B84A",
  white: "#FFFFFF",
  muted: "#9AA9BB",
  green: "#21C17A",
  red: "#EF4444",
  border: "#26374B",
};

// 🟡 ==================================================
// 🟡 TYPES
// 🟡 ==================================================

type LiveMessage = {
  id: string;
  room_id: string;
  text: string;
  created_at: string;
};

type ActiveStream = {
  id: string;
  title: string;
};

type RoomConfig = {
  streamId: string;
  token: string;
  url: string;
};

// 🟡 ==================================================
// 🟡 MAIN SCREEN
// 🟡 ==================================================

export default function GoLiveScreen() {
  const router = useRouter();

  // ==========================================
  // 📝 FORM AND SCREEN STATES
  // ==========================================

  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // ==========================================
  // 🔴 LIVE STREAM STATES
  // ==========================================

  const [activeLiveId, setActiveLiveId] =
    useState<string | null>(null);

  const [activeTitle, setActiveTitle] = useState("");

  const [roomConfig, setRoomConfig] =
    useState<RoomConfig | null>(null);

  const [connected, setConnected] = useState(false);

  // ==========================================
  // 💬 CHAT STATES
  // ==========================================

  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  // ==========================================
  // 🔒 REFS
  // ==========================================

  const notifiedStreams = useRef<Set<string>>(new Set());
  const notificationInProgress = useRef<Set<string>>(new Set());
  const endingStream = useRef(false);

  // 🟡 ==================================================
  // 🟡 MESSAGE HELPER
  // 🟡 ==================================================

  const showMessage = (
    messageTitle: string,
    message: string
  ) => {
    Alert.alert(messageTitle, message);
  };

  // 🟡 ==================================================
  // 🟡 SEND WEB + MOBILE NOTIFICATIONS
  // 🟡 ==================================================

  const sendLiveNotifications = useCallback(
    async (streamId: string) => {
      if (
        notifiedStreams.current.has(streamId) ||
        notificationInProgress.current.has(streamId)
      ) {
        return;
      }

      notificationInProgress.current.add(streamId);

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.access_token) {
          console.warn(
            "Live notifications skipped: no active session."
          );
          return;
        }

        const response = await fetch(
          `${UPLOAD_SERVER}/live-started-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              stream_id: streamId,
            }),
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          console.warn(
            "Live notification failed:",
            result?.error || response.status
          );
          return;
        }

        notifiedStreams.current.add(streamId);

        console.log(
          "Nasara live notifications processed:",
          result
        );
      } catch (error) {
        console.warn(
          "Live notification error:",
          error
        );
      } finally {
        notificationInProgress.current.delete(streamId);
      }
    },
    []
  );

  // 🟡 ==================================================
  // 🟡 LOAD LIVE CHAT
  // 🟡 ==================================================

  const loadMessages = useCallback(
    async (streamId: string) => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", streamId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) {
        console.warn(
          "Live chat loading error:",
          error.message
        );
        return;
      }

      setMessages((data || []) as LiveMessage[]);
    },
    []
  );

  // 🟡 ==================================================
  // 🟡 LIVE CHAT REALTIME
  // 🟡 ==================================================

  useEffect(() => {
    if (!activeLiveId) {
      return;
    }

    loadMessages(activeLiveId);

    const channel = supabase
      .channel(`nasara-live-chat-${activeLiveId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${activeLiveId}`,
        },
        (payload) => {
          const incoming = payload.new as LiveMessage;

          setMessages((previous) => {
            if (
              previous.some(
                (message) => message.id === incoming.id
              )
            ) {
              return previous;
            }

            return [...previous, incoming].slice(-100);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeLiveId, loadMessages]);

 // 🟡 ==================================================
  // 🟡 SEND LIVE CHAT MESSAGE — BROADCASTER
  // 🟡 ==================================================

  const sendMessage = async () => {
    const messageText = newMessage.trim();

    if (!messageText || !activeLiveId || sending) {
      return;
    }

    setSending(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Please log in to send a message.");
      }

      const { data: insertedMessage, error } = await (
        supabase as any
      )
        .from("messages")
        .insert({
          room_id: activeLiveId,
          sender_id: user.id,
          text: messageText,
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      // Display the confirmed database message immediately.
      setMessages((previous) => {
        if (
          previous.some(
            (message) => message.id === insertedMessage.id
          )
        ) {
          return previous;
        }

        return [...previous, insertedMessage as LiveMessage].slice(-100);
      });

      setNewMessage("");
    } catch (error: any) {
      console.error("Broadcaster chat error:", error);

      showMessage(
        "Message failed",
        error?.message || "Could not send your message."
      );
    } finally {
      setSending(false);
    }
  };

  // 🟡 ==================================================
  // 🟡 CONNECT TO EXISTING LIVE STREAM
  // 🟡 ==================================================

  const connectToStream = useCallback(
    async (stream: ActiveStream) => {
      setActiveLiveId(stream.id);
      setActiveTitle(stream.title || "Nasara Live");
      setConnected(false);

      try {
        const tokenData = await fetchLiveKitToken(stream.id);

        setRoomConfig({
          streamId: stream.id,
          token: tokenData.token,
          url: tokenData.url,
        });
      } catch (error: any) {
        console.error(
          "LiveKit reconnection failed:",
          error
        );

        showMessage(
          "Live connection failed",
          error?.message ||
            "Unable to reconnect to this live stream."
        );

        setActiveLiveId(null);
        setActiveTitle("");
        setRoomConfig(null);
      }
    },
    []
  );

  // 🟡 ==================================================
  // 🟡 CHECK FOR EXISTING LIVE STREAM
  // 🟡 ==================================================

  useEffect(() => {
    let mounted = true;

    const checkActiveStream = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user || !mounted) {
          return;
        }

        const { data, error } = await supabase
          .from("live_streams")
          .select("id, title")
          .eq("user_id", user.id)
          .eq("status", "live")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.warn(
            "Active live lookup failed:",
            error.message
          );
          return;
        }

        if (data && mounted) {
          await connectToStream(data as ActiveStream);
        }
      } catch (error) {
        console.warn(
          "Active live check failed:",
          error
        );
      } finally {
        if (mounted) {
          setChecking(false);
        }
      }
    };

    checkActiveStream();

    return () => {
      mounted = false;
    };
  }, [connectToStream]);

  // 🟡 ==================================================
  // 🟡 START LIVE BROADCAST
  // 🟡 ==================================================

  const startLive = async () => {
    if (!title.trim()) {
      showMessage(
        "Live title required",
        "Enter a title for your live broadcast."
      );
      return;
    }

    if (loading) {
      return;
    }

    setLoading(true);

    let createdStreamId: string | null = null;

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "Please log in before going live."
        );
      }

      // ==========================================
      // 🔴 END PREVIOUS ACTIVE STREAMS
      // ==========================================

      const { error: previousError } = await (supabase as any)
        .from("live_streams")
        .update({
          status: "ended",
          is_active: false,
        })
        .eq("user_id", user.id)
        .eq("status", "live");

      if (previousError) {
        throw previousError;
      }

      // ==========================================
      // 🔴 CREATE NEW LIVE STREAM
      // ==========================================

      const { data: stream, error: insertError } =
        await (supabase as any)
          .from("live_streams")
          .insert({
            user_id: user.id,
            title: title.trim(),
            status: "live",
            is_active: true,
          })
          .select("id, title")
          .single();

      if (insertError || !stream) {
        throw insertError || new Error(
          "Could not create the live stream."
        );
      }

      createdStreamId = stream.id;

      // ==========================================
      // 🔴 REQUEST LIVEKIT HOST TOKEN
      // ==========================================

      const tokenData = await fetchLiveKitToken(stream.id);

      if (!tokenData.canPublish) {
        throw new Error(
          "LiveKit did not authorize host publishing."
        );
      }

      // ==========================================
      // 🔴 PREPARE LIVEKIT CONNECTION
      // ==========================================

      setActiveLiveId(stream.id);
      setActiveTitle(stream.title);
      setConnected(false);

      setRoomConfig({
        streamId: stream.id,
        token: tokenData.token,
        url: tokenData.url,
      });

      setTitle("");
    } catch (error: any) {
      console.error(
        "Start live error:",
        error
      );

      // ==========================================
      // 🔴 CLEAN UP FAILED STREAM CREATION
      // ==========================================

      if (createdStreamId) {
        await (supabase as any)
          .from("live_streams")
          .update({
            status: "ended",
            is_active: false,
          })
          .eq("id", createdStreamId);
      }

      setRoomConfig(null);
      setActiveLiveId(null);
      setActiveTitle("");
      setConnected(false);

      showMessage(
        "Unable to go live",
        error?.message ||
          "Something went wrong while starting your broadcast."
      );
    } finally {
      setLoading(false);
    }
  };

  // 🟡 ==================================================
  // 🟡 LIVEKIT CONNECTION SUCCESS
  // 🟡 ==================================================

  const handleConnected = useCallback(() => {
    if (!roomConfig) {
      return;
    }

    setConnected(true);

    // Notifications are sent once per stream after connection.
    sendLiveNotifications(roomConfig.streamId);
  }, [roomConfig, sendLiveNotifications]);

  // 🟡 ==================================================
  // 🟡 END LIVE BROADCAST
  // 🟡 ==================================================

  const confirmEndLive = async () => {
    if (!activeLiveId || endingStream.current) {
      return;
    }

    endingStream.current = true;
    setLoading(true);

    const streamId = activeLiveId;

    try {
      const { error } = await (supabase as any)
        .from("live_streams")
        .update({
          status: "ended",
          is_active: false,
        })
        .eq("id", streamId);

      if (error) {
        throw error;
      }

      // Removing the room config unmounts LiveKitRoom.
      setRoomConfig(null);
      setActiveLiveId(null);
      setActiveTitle("");
      setConnected(false);
      setMessages([]);
      setNewMessage("");

      router.replace("/browse" as any);
    } catch (error: any) {
      showMessage(
        "Could not end live",
        error?.message || "Please try again."
      );
    } finally {
      endingStream.current = false;
      setLoading(false);
    }
  };

  const endLive = () => {
    if (Platform.OS === "web") {
      const accepted =
        typeof window !== "undefined" &&
        window.confirm(
          "End your live broadcast? Viewers will no longer be able to join."
        );

      if (accepted) {
        confirmEndLive();
      }

      return;
    }

    Alert.alert(
      "End live broadcast?",
      "Your live video will stop and viewers will no longer be able to join.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "End Live",
          style: "destructive",
          onPress: confirmEndLive,
        },
      ]
    );
  };

  // 🟡 ==================================================
  // 🟡 LOADING SCREEN
  // 🟡 ==================================================

  if (checking) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator
          size="large"
          color={COLORS.gold}
        />
        <Text style={styles.loadingText}>
          Checking your live broadcast...
        </Text>
      </View>
    );
  }

  // 🟡 ==================================================
  // 🟡 ACTIVE LIVE DASHBOARD
  // 🟡 ==================================================

  if (activeLiveId) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === "ios" ? "padding" : undefined
        }
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={23}
              color={COLORS.white}
            />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>
              NASARA LIVE
            </Text>
            <Text style={styles.headerSubtitle}>
              Your live broadcast studio
            </Text>
          </View>

          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>
              LIVE
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.dashboardScroll}
          contentContainerStyle={styles.dashboardContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.streamTitle}>
            {activeTitle}
          </Text>

          {/* 🔴 LIVE VIDEO */}

          <View style={styles.videoContainer}>
            {roomConfig ? (
              <LiveKitHost
                serverUrl={roomConfig.url}
                token={roomConfig.token}
                onConnected={handleConnected}
              />
            ) : (
              <View style={styles.videoPlaceholder}>
                <ActivityIndicator
                  size="large"
                  color={COLORS.gold}
                />
                <Text style={styles.videoPlaceholderText}>
                  Connecting to LiveKit...
                </Text>
              </View>
            )}
          </View>

          {/* 🔴 CONNECTION STATUS */}

          <View style={styles.connectionRow}>
            <View
              style={[
                styles.connectionDot,
                {
                  backgroundColor: connected
                    ? COLORS.green
                    : COLORS.gold,
                },
              ]}
            />

            <Text style={styles.connectionText}>
              {connected
                ? "Connected — your broadcast is running"
                : "Connecting your camera and microphone..."}
            </Text>
          </View>

          {/* 💬 LIVE CHAT */}

          <View style={styles.chatCard}>
            <View style={styles.chatHeader}>
              <Ionicons
                name="chatbubbles"
                size={20}
                color={COLORS.gold}
              />

              <Text style={styles.chatTitle}>
                Live Chat
              </Text>

              <Text style={styles.chatCount}>
                {messages.length} messages
              </Text>
            </View>

            <ScrollView
              style={styles.messageList}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {messages.length === 0 ? (
                <Text style={styles.emptyChat}>
                  No messages yet. Your viewers can chat here.
                </Text>
              ) : (
                messages.map((item) => (
                  <View
                    key={item.id}
                    style={styles.messageBubble}
                  >
                    <Text style={styles.messageText}>
                      {item.text}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.chatInputRow}>
              <TextInput
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Send a message..."
                placeholderTextColor={COLORS.muted}
                style={styles.chatInput}
                returnKeyType="send"
                onSubmitEditing={sendMessage}
              />

              <TouchableOpacity
                onPress={sendMessage}
                disabled={
                  sending || !newMessage.trim()
                }
                style={[
                  styles.sendButton,
                  {
                    opacity:
                      sending || !newMessage.trim()
                        ? 0.5
                        : 1,
                  },
                ]}
              >
                {sending ? (
                  <ActivityIndicator
                    color={COLORS.background}
                  />
                ) : (
                  <Ionicons
                    name="send"
                    size={18}
                    color={COLORS.background}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* 🔴 END LIVE */}

          <TouchableOpacity
            style={styles.endButton}
            onPress={endLive}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons
                  name="stop-circle"
                  size={21}
                  color={COLORS.white}
                />

                <Text style={styles.endButtonText}>
                  End Live Broadcast
                </Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.footerText}>
            Keep your audience engaged. Stay safe and follow
            Nasara community guidelines.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // 🟡 ==================================================
  // 🟡 GO LIVE SETUP SCREEN
  // 🟡 ==================================================

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color={COLORS.white}
          />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            NASARA LIVE
          </Text>
          <Text style={styles.headerSubtitle}>
            Connect with your customers
          </Text>
        </View>

        <Ionicons
          name="videocam"
          size={27}
          color={COLORS.gold}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="radio"
              size={42}
              color={COLORS.gold}
            />
          </View>

          <Text style={styles.heroTitle}>
            Go Live on Nasara
          </Text>

          <Text style={styles.heroDescription}>
            Showcase your products, demonstrate your services
            and connect with customers in real time.
          </Text>
        </View>

        <Text style={styles.fieldLabel}>
          LIVE BROADCAST TITLE
        </Text>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="What are you showcasing today?"
          placeholderTextColor={COLORS.muted}
          style={styles.titleInput}
          maxLength={100}
        />

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons
              name="globe-outline"
              size={21}
              color={COLORS.gold}
            />

            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>
                Web and mobile viewers
              </Text>

              <Text style={styles.infoDescription}>
                Broadcast using LiveKit on browsers,
                Android and iOS.
              </Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Ionicons
              name="notifications-outline"
              size={21}
              color={COLORS.gold}
            />

            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>
                Notify your audience
              </Text>

              <Text style={styles.infoDescription}>
                Browser subscribers and app users can receive
                a notification when you go live.
              </Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Ionicons
              name="chatbubbles-outline"
              size={21}
              color={COLORS.gold}
            />

            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>
                Live customer interaction
              </Text>

              <Text style={styles.infoDescription}>
                Keep your Nasara live chat available
                during your broadcast.
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.startButton,
            {
              opacity:
                loading || !title.trim() ? 0.6 : 1,
            },
          ]}
          onPress={startLive}
          disabled={loading || !title.trim()}
        >
          {loading ? (
            <>
              <ActivityIndicator
                color={COLORS.background}
              />

              <Text style={styles.startButtonText}>
                Preparing your broadcast...
              </Text>
            </>
          ) : (
            <>
              <Ionicons
                name="videocam"
                size={22}
                color={COLORS.background}
              />

              <Text style={styles.startButtonText}>
                Start Go Live
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Make sure your camera and microphone permissions
          are enabled before starting.
        </Text>
      </ScrollView>
    </View>
  );
}

// 🟡 ==================================================
// 🟡 STYLES
// 🟡 ==================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    color: COLORS.muted,
    marginTop: 14,
    fontSize: 14,
  },

  header: {
    minHeight: 76,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 13,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
  },

  headerTitle: {
    color: COLORS.gold,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  headerSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 3,
  },

  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3A1820",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: COLORS.red,
  },

  liveBadgeText: {
    color: COLORS.white,
    fontWeight: "900",
    fontSize: 11,
  },

  formContent: {
    padding: 20,
    paddingBottom: 45,
  },

  heroCard: {
    alignItems: "center",
    paddingVertical: 27,
    paddingHorizontal: 20,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 27,
  },

  heroIcon: {
    width: 75,
    height: 75,
    borderRadius: 24,
    backgroundColor: "#263044",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },

  heroTitle: {
    color: COLORS.white,
    fontSize: 23,
    fontWeight: "900",
    textAlign: "center",
  },

  heroDescription: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 9,
  },

  fieldLabel: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 10,
  },

  titleInput: {
    minHeight: 54,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    color: COLORS.white,
    paddingHorizontal: 15,
    fontSize: 14,
    marginBottom: 20,
  },

  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 17,
    padding: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 25,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 13,
  },

  infoTextContainer: {
    flex: 1,
  },

  infoTitle: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "800",
  },

  infoDescription: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 4,
  },

  infoDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 15,
  },

  startButton: {
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: COLORS.gold,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },

  startButtonText: {
    color: COLORS.background,
    fontSize: 15,
    fontWeight: "900",
  },

  dashboardScroll: {
    flex: 1,
  },

  dashboardContent: {
    padding: 16,
    paddingBottom: 35,
  },

  streamTitle: {
    color: COLORS.white,
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 14,
  },

  videoContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#000000",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  videoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  videoPlaceholderText: {
    color: COLORS.muted,
    marginTop: 12,
    fontSize: 12,
  },

  connectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 13,
    marginBottom: 20,
  },

  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 5,
  },

  connectionText: {
    color: COLORS.muted,
    fontSize: 12,
  },

  chatCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 20,
    minHeight: 260,
  },

  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  chatTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "900",
    flex: 1,
  },

  chatCount: {
    color: COLORS.muted,
    fontSize: 11,
  },

  messageList: {
    maxHeight: 220,
    minHeight: 130,
  },

  messageBubble: {
    backgroundColor: COLORS.cardLight,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignSelf: "flex-start",
    maxWidth: "95%",
    marginTop: 8,
  },

  messageText: {
    color: COLORS.white,
    fontSize: 13,
    lineHeight: 19,
  },

  emptyChat: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 35,
  },

  chatInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },

  chatInput: {
    flex: 1,
    minHeight: 43,
    maxHeight: 90,
    borderRadius: 12,
    backgroundColor: COLORS.cardLight,
    color: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },

  sendButton: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },

  endButton: {
    minHeight: 53,
    borderRadius: 13,
    backgroundColor: "#A92732",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  endButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "900",
  },

  footerText: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 17,
  },
});