// ==================================================
// 🟢 NASARA LIVEKIT NATIVE VIEWER
// 🟢 ANDROID + IOS
// 🟢 MULTIPLE APPROVED GUEST SPEAKERS
// 🟢 ALL PUBLISHED VIDEO TRACKS
// ==================================================

import { useEffect } from "react";

import {
  ScrollView,
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
  canPublish?: boolean;
}

// ==================================================
// 🎥 MULTI-SPEAKER VIDEO GRID
// ==================================================

function RemoteVideoGrid() {
  const tracks = useTracks([
    Track.Source.Camera,
    Track.Source.ScreenShare,
  ]);

  // Collect every available published video track.
  const publishedTracks = tracks.filter(
    (item) => item.publication
  );

  if (publishedTracks.length === 0) {
    return (
      <View style={styles.waiting}>
        <Text style={styles.waitingText}>
          Waiting for broadcaster video...
        </Text>
      </View>
    );
  }

  const columns = publishedTracks.length === 1 ? 1 : 2;

  const tileWidth =
    publishedTracks.length === 1
      ? "100%"
      : "50%";

  const tileHeight =
    publishedTracks.length <= 2
      ? "100%"
      : 240;

  return (
    <ScrollView
      style={styles.grid}
      contentContainerStyle={styles.gridContent}
      showsVerticalScrollIndicator={false}
    >
      {publishedTracks.map((trackRef) => (
        <View
          key={`${trackRef.participant.identity}-${trackRef.source}`}
          style={[
            styles.speakerTile,
            {
              width: tileWidth,
              height: tileHeight,
            },
          ]}
        >
          <VideoTrack
            trackRef={trackRef}
            style={styles.video}
          />

          {/* SPEAKER NAME */}
          <View style={styles.speakerNameContainer}>
            <Text
              style={styles.speakerName}
              numberOfLines={1}
            >
              {trackRef.participant.identity}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ==================================================
// 📺 VIEWER / APPROVED SPEAKER COMPONENT
// ==================================================

export default function LiveKitViewer({
  serverUrl,
  token,
  canPublish = false,
}: LiveKitViewerProps) {

  useEffect(() => {
    let mounted = true;

    const startAudio = async () => {
      try {
        if (mounted) {
          await AudioSession.startAudioSession();
        }
      } catch (error) {
        console.log(
          "LiveKit audio session error:",
          error
        );
      }
    };

    startAudio();

    return () => {
      mounted = false;

      AudioSession.stopAudioSession().catch((error) => {
        console.log(
          "LiveKit audio stop error:",
          error
        );
      });
    };
  }, []);

  return (
    <View style={styles.container}>
      <LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect={true}
        audio={canPublish}
        video={canPublish}
      >
        <RemoteVideoGrid />
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

  grid: {
    flex: 1,
    backgroundColor: "black",
  },

  gridContent: {
    flexGrow: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignContent: "flex-start",
  },

  speakerTile: {
    position: "relative",
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
    overflow: "hidden",
  },

  video: {
    width: "100%",
    height: "100%",
  },

  speakerNameContainer: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 5,
  },

  speakerName: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
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