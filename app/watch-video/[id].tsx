// ==================================================
// 📦 IMPORTS
// ==================================================

import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { WebView } from "react-native-webview";

import LiveKitViewer from "../../components/LiveKitViewer";
import { fetchLiveKitToken } from "../../lib/livekit";
import { supabase } from "../../lib/supabase";

// ==================================================
// ⚙️ LIVEKIT SERVER
// ==================================================

const LIVEKIT_SERVER =
  "https://livekit-server-c0z9.onrender.com";

// ==================================================
// 🎥 WATCH VIDEO SCREEN
// ==================================================

export default function WatchVideoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [live, setLive] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [viewer, setViewer] = useState<any>(null);
  const [viewerError, setViewerError] = useState("");

  // ==================================================
  // 🎤 GUEST SPEAKER STATES
  // ==================================================

  const [speakerStatus, setSpeakerStatus] = useState<
    "none" | "pending" | "approved" | "rejected"
  >("none");

  const [speakerBusy, setSpeakerBusy] = useState(false);
  const [speakerMessage, setSpeakerMessage] = useState("");

  const speakerCheckingRef = useRef(false);

  // Host mute state received from backend.
  const [hostMuted, setHostMuted] = useState(false);

  // Approved speakers start with microphone only.
  const [cameraEnabled, setCameraEnabled] = useState(false);

  // ==================================================
  // 💬 CHAT STATES
  // ==================================================

  const [messages, setMessages] = useState<any[]>([]);
  const [chatText, setChatText] = useState("");
  const [lastSent, setLastSent] = useState(0);

  const screenWidth = Dimensions.get("window").width;
  const [expandedVideo, setExpandedVideo] = useState(false);

  // ==================================================
  // 🟡 LOAD LIVE STREAM
  // ==================================================

  const loadLive = async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await (supabase as any)
        .from("live_streams")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setLive(null);
        return;
      }

      setLive(data);

      if (data.product_id) {
        loadProduct(data.product_id);
      }

      // ==================================================
      // 🎥 CONNECT TO LIVEKIT
      // ==================================================

      if (
        data.status === "live" &&
        data.is_active === true
      ) {
        try {
          setViewerError("");

          const tokenData = await fetchLiveKitToken(
            String(data.id)
          );

          setViewer(tokenData);

          setHostMuted(tokenData.hostMuted === true);

          if (tokenData.role === "speaker") {
            setSpeakerStatus("approved");
          } else if (
            tokenData.canPublish === true &&
            tokenData.role !== "host"
          ) {
            setSpeakerStatus("approved");
          }
        } catch (error: any) {
          console.log("LiveKit viewer error:", error);

          setViewerError(
            error?.message ||
              "Unable to connect to this live stream."
          );
        }
      } else {
        setViewerError("This live stream has ended.");
      }
    } catch (error: any) {
      console.log("Load live error:", error);

      setViewerError(
        error?.message || "Unable to load live stream."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==================================================
  // 🛍️ LOAD PRODUCT
  // ==================================================

  const loadProduct = async (productId: number) => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .maybeSingle();

    if (error) {
      console.log("Product load error:", error.message);
      return;
    }

    setProduct(data ?? null);
  };

  // ==================================================
  // 💬 LOAD LIVE CHAT
  // ==================================================

  const loadMessages = async () => {
    if (!id) return;

    const { data, error } = await (supabase as any)
      .from("live_chat_messages")
      .select("*")
      .eq("stream_id", String(id))
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.log("Live chat load error:", error.message);
      return;
    }

    setMessages(data ?? []);
  };

  // ==================================================
  // 🔄 LIVE CHAT REALTIME + INITIAL LOAD
  // ==================================================

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setViewer(null);
    setCameraEnabled(false);
    setSpeakerStatus("none");
    setSpeakerMessage("");
    setViewerError("");
    setHostMuted(false);
    setExpandedVideo(false);
    speakerCheckingRef.current = false;

    loadLive();
    loadMessages();

    const channel = supabase
      .channel("live-chat-" + String(id))
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_chat_messages",
          filter: `stream_id=eq.${String(id)}`,
        },
        (payload: any) => {
          setMessages((previous) => {
            const incoming = payload.new;

            if (
              previous.some(
                (message) => message.id === incoming.id
              )
            ) {
              return previous;
            }

            return [incoming, ...previous].slice(0, 50);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // ==================================================
  // 💬 SEND LIVE CHAT MESSAGE — VIEWER
  // ==================================================

  const sendMessage = async () => {
    const now = Date.now();

    if (now - lastSent < 1000) return;
    if (!chatText.trim() || !id) return;

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Please log in to send a message.");
      }

      const textValue = chatText.trim();

      const { data: insertedMessage, error } = await (
        supabase as any
      )
        .from("live_chat_messages")
        .insert({
          stream_id: String(id),
          sender_id: user.id,
          text: textValue,
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      setLastSent(now);
      setChatText("");

      setMessages((previous) => {
        if (
          previous.some(
            (message) => message.id === insertedMessage.id
          )
        ) {
          return previous;
        }

        return [insertedMessage, ...previous].slice(0, 50);
      });
    } catch (error: any) {
      console.error("Viewer chat error:", error);

      if (Platform.OS === "web") {
        window.alert(
          error?.message || "Could not send your message."
        );
      } else {
        const { Alert } = require("react-native");

        Alert.alert(
          "Message failed",
          error?.message || "Could not send your message."
        );
      }
    }
  };

  // ==================================================
  // 🎤 REQUEST TO SPEAK
  // ==================================================

  const requestToSpeak = async () => {
    if (!id || speakerBusy) return;

    setSpeakerBusy(true);
    setSpeakerMessage("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Please log in to request to speak.");
      }

      const response = await fetch(
        `${LIVEKIT_SERVER}/speaker/request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            streamId: String(id),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || "Unable to send request."
        );
      }

      const status = result.request?.status;

      if (status === "approved") {
        setSpeakerStatus("approved");

        setSpeakerMessage(
          "You are approved! Preparing your microphone..."
        );

        const newToken = await fetchLiveKitToken(String(id));

        setViewer(newToken);
        setHostMuted(newToken.hostMuted === true);
        setCameraEnabled(false);

        if (newToken.canPublish === true) {
          setSpeakerMessage(
            newToken.hostMuted === true
              ? "You are approved, but the host has temporarily muted your microphone."
              : "You are now approved to speak. Your camera is off."
          );
        } else {
          setSpeakerMessage(
            "Your approval is being processed. Please wait."
          );
        }
      } else {
        setSpeakerStatus("pending");

        setSpeakerMessage(
          "Your request has been sent. Waiting for the host."
        );
      }
    } catch (error: any) {
      setSpeakerMessage(
        error?.message || "Could not request to speak."
      );
    } finally {
      setSpeakerBusy(false);
    }
  };

  // ==================================================
  // 🎤 CHECK SPEAKER APPROVAL + MUTE STATUS
  // ==================================================

  const checkSpeakerStatus = async () => {
    if (!id || speakerCheckingRef.current) return;

    speakerCheckingRef.current = true;

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) return;

      const response = await fetch(
        `${LIVEKIT_SERVER}/speaker/status?streamId=${encodeURIComponent(
          String(id)
        )}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setSpeakerMessage("This live stream has ended.");
        }

        return;
      }

      const request = result.request;
      const status = request?.status;

      // ==================================================
      // 🚫 NO SPEAKER REQUEST
      // ==================================================

      if (!request) {
        setSpeakerStatus((previous) =>
          previous === "pending" ? "none" : previous
        );

        return;
      }

      // ==================================================
      // ⏳ PENDING
      // ==================================================

      if (status === "pending") {
        setSpeakerStatus("pending");
        setHostMuted(false);

        setSpeakerMessage(
          "Waiting for the host to approve your request."
        );

        return;
      }

      // ==================================================
      // ❌ REJECTED / REMOVED
      // ==================================================

      if (status === "rejected") {
        setSpeakerStatus("rejected");
        setHostMuted(false);
        setCameraEnabled(false);

        setSpeakerMessage(
          "Your speaker permission has been revoked. You can still watch the live stream and request to speak again."
        );

        // If this user was previously an approved speaker,
        // replace their publishing token with a viewer token.
        if (viewer?.canPublish === true) {
          const viewerToken = await fetchLiveKitToken(
            String(id)
          );

          if (viewerToken.canPublish === false) {
            setViewer(viewerToken);
            setHostMuted(false);
          } else {
            console.warn(
              "NASARA: Removed speaker still received publishing permission."
            );
          }
        }

        return;
      }

      // ==================================================
      // 🎤 APPROVED
      // ==================================================

      if (status === "approved") {
        setSpeakerStatus("approved");

        const currentHostMuted =
          request.host_muted === true;

        setHostMuted(currentHostMuted);

        if (viewer?.canPublish === true) {
          // Existing approved speaker.
          // Update mute state without reconnecting LiveKit.
          setSpeakerMessage(
            currentHostMuted
              ? "The host has muted your microphone. You can still watch the broadcast."
              : "You are approved to speak. Your microphone is ready."
          );

          return;
        }

        // Newly approved speaker needs a publishing token.
        setSpeakerMessage(
          "The host approved you! Preparing your microphone..."
        );

        const newToken = await fetchLiveKitToken(
          String(id)
        );

        if (newToken.canPublish === true) {
          setViewer(newToken);
          setHostMuted(
            newToken.hostMuted === true || currentHostMuted
          );
          setCameraEnabled(false);

          setSpeakerMessage(
            newToken.hostMuted === true || currentHostMuted
              ? "You are approved, but the host has muted your microphone."
              : "You are now approved to speak. Your camera is off."
          );
        } else {
          setSpeakerMessage(
            "Approval received. Please wait while your speaking access is prepared."
          );
        }
      }
    } catch (error) {
      console.log("Speaker status check error:", error);
    } finally {
      speakerCheckingRef.current = false;
    }
  };

  // ==================================================
  // 🔄 AUTOMATIC SPEAKER STATUS CHECK
  // ==================================================

  useEffect(() => {
    if (
      !id ||
      !live ||
      live.status !== "live" ||
      live.is_active !== true ||
      !viewer ||
      viewer.role === "host"
    ) {
      return;
    }

    // Check immediately.
    void checkSpeakerStatus();

    // Keep checking even after speaker approval.
    const interval = setInterval(() => {
      void checkSpeakerStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [id, live, viewer]);

  // ==================================================
  // 📷 CAMERA CONTROL
  // ==================================================

  const toggleCamera = () => {
    if (viewer?.canPublish !== true) return;

    setCameraEnabled((previous) => !previous);
  };

  // ==================================================
  // 📺 YOUTUBE FALLBACK
  // ==================================================

  const getVideoId = (url: string) => {
    if (!url) return null;

    const regExp =
      /(?:youtube\.com\/(?:watch\?v=|live\/|shorts\/)|youtu\.be\/)([^&?/]+)/;

    const match = url.match(regExp);

    return match ? match[1] : null;
  };

  const videoId = getVideoId(live?.youtube_url);

  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?playsinline=1&rel=0&modestbranding=1&autoplay=0&enablejsapi=1`
    : null;

  // ==================================================
  // ⏳ LOADING SCREEN
  // ==================================================

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" />
        <Text>Connecting to Live Stream...</Text>
      </View>
    );
  }

  // ==================================================
  // ❌ STREAM NOT FOUND
  // ==================================================

  if (!live) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text>No Live Video Found ❌</Text>

        <TouchableOpacity
          onPress={() => router.replace("/browse")}
          style={{
            marginTop: 20,
            padding: 12,
            backgroundColor: "#000",
            borderRadius: 10,
          }}
        >
          <Text style={{ color: "white" }}>
            Back to Home
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ==================================================
  // 🎥 MAIN WATCH SCREEN
  // ==================================================

  return (
    <View
      style={{
        flex: 1,
        padding: 12,
        backgroundColor: "white",
      }}
    >
      {/* 🔴 STREAM TITLE */}

      <Text
        style={{
          fontSize: 20,
          fontWeight: "bold",
          marginBottom: 6,
        }}
      >
        🔴 {live.title}
      </Text>

      {/* ==================================================
          🎥 VIDEO PLAYER
      ================================================== */}

      <View
        style={{
          height: expandedVideo
            ? Dimensions.get("window").height * 0.78
            : screenWidth * 0.56,
          width: "100%",
          borderRadius: 12,
          overflow: "hidden",
          backgroundColor: "black",
          position: "relative",
        }}
      >
        {viewer ? (
          <LiveKitViewer
            key={`${viewer.token}`}
            serverUrl={viewer.url}
            token={viewer.token}
            canPublish={viewer.canPublish === true}
            cameraEnabled={cameraEnabled}
            hostMuted={hostMuted}
          />
        ) : embedUrl ? (
          Platform.OS === "web" ? (
            <iframe
              width="100%"
              height="100%"
              src={embedUrl}
              title="Live Stream"
              frameBorder="0"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              style={{ border: "none" }}
            />
          ) : (
            <WebView
              source={{ uri: embedUrl }}
              style={{ flex: 1 }}
              javaScriptEnabled
              domStorageEnabled
              allowsFullscreenVideo
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              originWhitelist={["*"]}
              setSupportMultipleWindows={false}
            />
          )
        ) : (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              padding: 15,
            }}
          >
            <Text
              style={{
                color: "white",
                textAlign: "center",
                fontSize: 15,
              }}
            >
              {viewerError || "Stream not available"}
            </Text>
          </View>
        )}

        {/* 🛍️ BUY NOW */}

        {product && (
          <TouchableOpacity
            onPress={() =>
              router.push(`/product/${product.id}`)
            }
            style={{
              position: "absolute",
              bottom: 10,
              right: 10,
              backgroundColor: "#16a34a",
              padding: 10,
              borderRadius: 20,
            }}
          >
            <Text
              style={{
                color: "white",
                fontWeight: "bold",
              }}
            >
              BUY NOW
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ==================================================
          🎤 REQUEST TO SPEAK
      ================================================== */}

      {live.status === "live" &&
        live.is_active === true &&
        viewer &&
        viewer.canPublish !== true && (
          <View
            style={{
              marginTop: 12,
              padding: 14,
              backgroundColor: "#07111F",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#E8B84A",
            }}
          >
            <Text
              style={{
                color: "#E8B84A",
                fontWeight: "900",
                fontSize: 15,
                marginBottom: 6,
              }}
            >
              🎤 Join the Conversation
            </Text>

            <Text
              style={{
                color: "white",
                fontSize: 12,
                marginBottom: 12,
              }}
            >
              Request permission from the host to join this
              live session as an audio speaker. You can choose
              whether to turn on your camera after approval.
            </Text>

            <TouchableOpacity
              onPress={requestToSpeak}
              disabled={
                speakerBusy || speakerStatus === "pending"
              }
              style={{
                backgroundColor:
                  speakerStatus === "pending"
                    ? "#64748b"
                    : "#E8B84A",
                padding: 13,
                borderRadius: 10,
                alignItems: "center",
                opacity: speakerBusy ? 0.6 : 1,
              }}
            >
              {speakerBusy ? (
                <ActivityIndicator color="#07111F" />
              ) : (
                <Text
                  style={{
                    color: "#07111F",
                    fontWeight: "900",
                  }}
                >
                  {speakerStatus === "pending"
                    ? "REQUEST PENDING..."
                    : speakerStatus === "rejected"
                      ? "REQUEST TO SPEAK AGAIN"
                      : "REQUEST TO SPEAK"}
                </Text>
              )}
            </TouchableOpacity>

            {speakerMessage ? (
              <Text
                style={{
                  color:
                    speakerStatus === "rejected"
                      ? "#FCA5A5"
                      : "#E8B84A",
                  marginTop: 10,
                  textAlign: "center",
                  fontSize: 12,
                }}
              >
                {speakerMessage}
              </Text>
            ) : null}
          </View>
        )}

      {/* ==================================================
          🎤 APPROVED SPEAKER CONTROLS
      ================================================== */}

      {viewer?.canPublish === true && (
        <View
          style={{
            marginTop: 12,
            padding: 12,
            backgroundColor: "#07111F",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#E8B84A",
          }}
        >
          <Text
            style={{
              color: "#E8B84A",
              fontWeight: "900",
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            🎤 You are approved as a guest speaker!
          </Text>

          <Text
            style={{
              color: hostMuted ? "#FCA5A5" : "white",
              textAlign: "center",
              fontSize: 12,
              marginBottom: 12,
            }}
          >
            {hostMuted
              ? "The host has muted your microphone. You can still watch the broadcast. Your microphone will be restored when the host unmutes you."
              : "Your microphone is enabled. You can speak with your camera off or turn it on below."}
          </Text>

          <TouchableOpacity
            onPress={toggleCamera}
            style={{
              backgroundColor: cameraEnabled
                ? "#DC2626"
                : "#E8B84A",
              padding: 13,
              borderRadius: 10,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: cameraEnabled ? "white" : "#07111F",
                fontWeight: "900",
              }}
            >
              {cameraEnabled
                ? "📷 TURN CAMERA OFF"
                : "📷 TURN CAMERA ON"}
            </Text>
          </TouchableOpacity>

          <Text
            style={{
              color: "#CBD5E1",
              fontSize: 11,
              textAlign: "center",
              marginTop: 8,
            }}
          >
            Camera: {cameraEnabled ? "ON" : "OFF"}
            {" • "}
            Microphone: {hostMuted ? "MUTED BY HOST" : "READY"}
          </Text>
        </View>
      )}

      {/* ==================================================
          ⛶ FULLSCREEN CONTROL
      ================================================== */}

      <TouchableOpacity
        onPress={() =>
          setExpandedVideo((previous) => !previous)
        }
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 20,
          backgroundColor: "rgba(0,0,0,0.75)",
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 10,
        }}
      >
        <Text style={{ color: "white", fontWeight: "900" }}>
          {expandedVideo ? "✕ CLOSE" : "⛶ EXPAND"}
        </Text>
      </TouchableOpacity>

      {/* ==================================================
          💬 COMMENTS OVER VIDEO
      ================================================== */}

      {expandedVideo && (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: 12,
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <Text
            style={{
              color: "#E8B84A",
              fontWeight: "900",
              marginBottom: 8,
            }}
          >
            LIVE COMMENTS
          </Text>

          <FlatList
            data={messages.slice(0, 6).reverse()}
            inverted={false}
            keyExtractor={(item) => item.id.toString()}
            style={{ maxHeight: 125 }}
            renderItem={({ item }) => (
              <Text
                style={{
                  color: "white",
                  fontSize: 13,
                  paddingVertical: 4,
                }}
              >
                {item.text}
              </Text>
            )}
          />

          <View
            style={{
              flexDirection: "row",
              marginTop: 8,
              gap: 8,
            }}
          >
            <TextInput
              value={chatText}
              onChangeText={setChatText}
              placeholder="Write a comment..."
              placeholderTextColor="#BBBBBB"
              returnKeyType="send"
              onSubmitEditing={sendMessage}
              style={{
                flex: 1,
                backgroundColor: "white",
                color: "#111827",
                borderRadius: 10,
                paddingHorizontal: 12,
                minHeight: 42,
              }}
            />

            <TouchableOpacity
              onPress={sendMessage}
              style={{
                backgroundColor: "#E8B84A",
                paddingHorizontal: 14,
                justifyContent: "center",
                borderRadius: 10,
              }}
            >
              <Text
                style={{
                  color: "#07111F",
                  fontWeight: "900",
                }}
              >
                Send
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ==================================================
          🛍️ PRODUCT DETAILS
      ================================================== */}

      {product && (
        <View
          style={{
            flexDirection: "row",
            marginTop: 12,
            padding: 10,
            borderWidth: 1,
            borderColor: "#eee",
            borderRadius: 12,
          }}
        >
          <Image
            source={{ uri: product.image }}
            style={{
              width: 70,
              height: 70,
              borderRadius: 10,
            }}
          />

          <View
            style={{
              marginLeft: 10,
              flex: 1,
            }}
          >
            <Text style={{ fontWeight: "bold" }}>
              {product.title}
            </Text>

            <Text
              style={{
                color: "green",
                marginTop: 4,
              }}
            >
              GHS {product.price}
            </Text>

            <TouchableOpacity
              onPress={() =>
                router.push(`/product/${product.id}`)
              }
              style={{
                marginTop: 6,
                backgroundColor: "#2563eb",
                padding: 8,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  color: "white",
                  textAlign: "center",
                }}
              >
                View Product
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ==================================================
          💬 LIVE CHAT
      ================================================== */}

      {!expandedVideo && (
        <>
          <Text
            style={{
              marginTop: 14,
              fontWeight: "bold",
            }}
          >
            💬 Live Chat
          </Text>

          <FlatList
            data={messages}
            inverted
            keyExtractor={(item) => item.id.toString()}
            style={{
              height: 160,
              marginTop: 6,
            }}
            renderItem={({ item }) => (
              <Text style={{ paddingVertical: 2 }}>
                {item.text}
              </Text>
            )}
            ListEmptyComponent={
              <Text
                style={{
                  textAlign: "center",
                  marginTop: 20,
                  color: "gray",
                }}
              >
                No messages yet...
              </Text>
            }
          />

          {/* ✉️ CHAT INPUT */}

          <View
            style={{
              flexDirection: "row",
              marginTop: 6,
            }}
          >
            <TextInput
              value={chatText}
              onChangeText={setChatText}
              placeholder="Type message..."
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: "#ddd",
                borderRadius: 8,
                padding: 8,
              }}
            />

            <TouchableOpacity
              onPress={sendMessage}
              style={{
                backgroundColor: "#2563eb",
                paddingHorizontal: 14,
                marginLeft: 6,
                borderRadius: 8,
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "white" }}>Send</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ==================================================
          ▶️ OPEN OLD YOUTUBE STREAM
      ================================================== */}

      {live.youtube_url && (
        <TouchableOpacity
          onPress={() =>
            Linking.openURL(live.youtube_url)
          }
          style={{
            marginTop: 10,
            padding: 10,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#ddd",
          }}
        >
          <Text style={{ textAlign: "center" }}>
            Open in YouTube
          </Text>
        </TouchableOpacity>
      )}

      {/* ==================================================
          🏠 BACK TO HOME
      ================================================== */}

      <TouchableOpacity
        onPress={() => router.replace("/browse")}
        style={{
          marginTop: 20,
          padding: 12,
          backgroundColor: "#000",
          borderRadius: 10,
        }}
      >
        <Text
          style={{
            color: "white",
            textAlign: "center",
          }}
        >
          Back to Home
        </Text>
      </TouchableOpacity>
    </View>
  );
}