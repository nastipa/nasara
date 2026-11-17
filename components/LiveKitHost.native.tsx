// 📱 ==================================================
// 📱 NASARA LIVEKIT HOST — ANDROID + IOS
// 📱 HOST + APPROVED SPEAKERS GRID
// 📱 LIVE VIEWER COUNT
// 📱 ==================================================

import { useEffect } from "react";

import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  AudioSession,
  isTrackReference,
  LiveKitRoom,
  registerGlobals,
  useRemoteParticipants,
  useTracks,
  VideoTrack,
} from "@livekit/react-native";

import { Track } from "livekit-client";

// ==================================================
// 📱 REGISTER WEBRTC GLOBALS
// ==================================================

registerGlobals();

// ==================================================
// 📦 TYPES
// ==================================================

type Props = {
  serverUrl: string;
  token: string;
  onConnected: () => void;
  onViewerCountChange?: (count: number) => void;
};

// ==================================================
// 👥 HOST + APPROVED SPEAKERS GRID
// ==================================================

function NativeSpeakerGrid() {
  const tracks = useTracks([
    Track.Source.Camera,
    Track.Source.Microphone,
  ]);

  const participants = new Map<
    string,
    {
      identity: string;
      name: string;
      camera?: any;
      microphone?: any;
    }
  >();

  tracks.forEach((reference: any) => {
    if (!isTrackReference(reference)) return;

    const participant = reference.participant;

    if (!participant) return;

    const identity = participant.identity;

    if (!participants.has(identity)) {
      participants.set(identity, {
        identity,
        name: participant.name || identity,
      });
    }

    const entry = participants.get(identity)!;

    if (reference.source === Track.Source.Camera) {
      entry.camera = reference;
    }

    if (reference.source === Track.Source.Microphone) {
      entry.microphone = reference;
    }
  });

  const visibleParticipants = Array.from(
    participants.values()
  ).filter(
    (participant) =>
      participant.camera || participant.microphone
  );

  if (visibleParticipants.length === 0) {
    return (
      <View style={styles.placeholder}>
        <ActivityIndicator
          size="large"
          color="#E8B84A"
        />

        <Text style={styles.placeholderText}>
          Waiting for the host camera and guest speakers...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.gridScroll}
      contentContainerStyle={styles.grid}
    >
      {visibleParticipants.map((participant) => (
        <View
          key={participant.identity}
          style={styles.tile}
        >
          {participant.camera ? (
            <VideoTrack
              trackRef={participant.camera}
              style={styles.video}
            />
          ) : (
            <View style={styles.audioTile}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {participant.name
                    ?.charAt(0)
                    ?.toUpperCase() || "N"}
                </Text>
              </View>

              <Text style={styles.audioName}>
                {participant.name}
              </Text>

              <Text style={styles.audioLabel}>
                Audio speaker
              </Text>
            </View>
          )}

          <View style={styles.nameTag}>
            <Text style={styles.nameText}>
              {participant.name}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ==================================================
// 👁️ LIVE VIEWER COUNT
// ==================================================

function NativeViewerCount({
  onViewerCountChange,
}: {
  onViewerCountChange?: (count: number) => void;
}) {
  const participants = useRemoteParticipants();

  const viewerCount = participants.length;

  useEffect(() => {
    onViewerCountChange?.(viewerCount);
  }, [viewerCount, onViewerCountChange]);

  return null;
}

// ==================================================
// 📱 LIVEKIT NATIVE HOST
// ==================================================

export default function LiveKitHost({
  serverUrl,
  token,
  onConnected,
  onViewerCountChange,
}: Props) {
  useEffect(() => {
    const startAudio = async () => {
      try {
        await AudioSession.startAudioSession();
      } catch (error) {
        console.warn(
          "Could not start LiveKit audio session:",
          error
        );
      }
    };

    startAudio();

    return () => {
      AudioSession.stopAudioSession().catch((error) => {
        console.warn(
          "Could not stop LiveKit audio session:",
          error
        );
      });
    };
  }, []);

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect={true}
      audio={true}
      video={true}
      options={{
        adaptiveStream: {
          pixelDensity: "screen",
        },
      }}
      onConnected={onConnected}
    >
      <View style={styles.container}>
        <NativeViewerCount
          onViewerCountChange={onViewerCountChange}
        />

        <NativeSpeakerGrid />
      </View>
    </LiveKitRoom>
  );
}

// ==================================================
// 🎨 STYLES
// ==================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },

  gridScroll: {
    flex: 1,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    padding: 5,
    gap: 8,
  },

  tile: {
    width: "48%",
    aspectRatio: 1,
    backgroundColor: "#111827",
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },

  video: {
    width: "100%",
    height: "100%",
  },

  audioTile: {
    flex: 1,
    backgroundColor: "#172033",
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#C99A35",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },

  avatarText: {
    color: "#111827",
    fontSize: 26,
    fontWeight: "bold",
  },

  audioName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
    textAlign: "center",
  },

  audioLabel: {
    color: "#D1D5DB",
    fontSize: 11,
    marginTop: 4,
  },

  nameTag: {
    position: "absolute",
    bottom: 6,
    left: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.65)",
    padding: 5,
    borderRadius: 5,
  },

  nameText: {
    color: "#FFFFFF",
    fontSize: 11,
    textAlign: "center",
  },

  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
    padding: 20,
  },

  placeholderText: {
    color: "#FFFFFF",
    fontSize: 12,
    marginTop: 12,
    textAlign: "center",
  },
});