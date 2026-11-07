// ==================================================
// 🟢 LIVEKIT NATIVE VIEWER
// ==================================================

import { useEffect } from "react";

import {
    StyleSheet,
    Text,
    View,
} from "react-native";

import {
    AudioSession,
    LiveKitRoom,
    VideoTrack,
    registerGlobals,
    useTracks,
} from "@livekit/react-native";

import { Track } from "livekit-client";

// ==================================================
// ⚙️ REGISTER WEBRTC
// ==================================================

registerGlobals();

// ==================================================
// 📦 TYPES
// ==================================================

interface LiveKitViewerProps {
  serverUrl: string;
  token: string;
}

// ==================================================
// 🎥 REMOTE VIDEO
// ==================================================

function RemoteVideo() {
  const tracks = useTracks([
    Track.Source.Camera,
    Track.Source.ScreenShare,
  ]);

  const videoTrack = tracks.find(
    (item: any) => item.publication
  );

  if (!videoTrack) {
    return (
      <View style={styles.waiting}>
        <Text style={styles.waitingText}>
          Waiting for broadcaster video...
        </Text>
      </View>
    );
  }

  return (
    <VideoTrack
      trackRef={videoTrack}
      style={styles.video}
    />
  );
}

// ==================================================
// 📺 VIEWER COMPONENT
// ==================================================

export default function LiveKitViewer({
  serverUrl,
  token,
}: LiveKitViewerProps) {
  useEffect(() => {
    let mounted = true;

    const startAudio = async () => {
      try {
        if (mounted) {
          await AudioSession.startAudioSession();
        }
      } catch (error) {
        console.log("LiveKit audio session error:", error);
      }
    };

    startAudio();

    return () => {
      mounted = false;

      AudioSession.stopAudioSession().catch((error) => {
        console.log("LiveKit audio stop error:", error);
      });
    };
  }, []);

  return (
    <View style={styles.container}>
      <LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect={true}
        audio={false}
        video={false}
      >
        <RemoteVideo />
      </LiveKitRoom>
    </View>
  );
}

// ==================================================
// 🎨 STYLES
// ==================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },

  video: {
    width: "100%",
    height: "100%",
  },

  waiting: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
  },

  waitingText: {
    color: "white",
    fontSize: 14,
  },
});