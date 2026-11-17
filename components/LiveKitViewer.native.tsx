import { useEffect } from "react";

import {
  AudioSession,
  isTrackReference,
  LiveKitRoom,
  registerGlobals,
  useLocalParticipant,
  useTracks,
  VideoTrack,
} from "@livekit/react-native";

import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Track } from "livekit-client";

registerGlobals();

// ==================================================
// 📦 PROPS
// ==================================================

interface LiveKitViewerProps {
  serverUrl: string;
  token: string;
  canPublish?: boolean;
  cameraEnabled?: boolean;
}

// ==================================================
// 📷 LOCAL CAMERA CONTROLLER
// ==================================================

function CameraController({
  canPublish,
  cameraEnabled,
}: {
  canPublish: boolean;
  cameraEnabled: boolean;
}) {
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    let cancelled = false;

    const updateCamera = async () => {
      try {
        await localParticipant.setCameraEnabled(
          canPublish && cameraEnabled
        );
      } catch (error) {
        if (!cancelled) {
          console.log("LiveKit camera control error:", error);
        }
      }
    };

    updateCamera();

    return () => {
      cancelled = true;
    };
  }, [localParticipant, canPublish, cameraEnabled]);

  return null;
}

// ==================================================
// 🎥 PARTICIPANT GRID
// ==================================================

function ParticipantGrid() {
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
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          Waiting for the host and guest speakers...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
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

          {participant.camera && (
            <View style={styles.nameTag}>
              <Text style={styles.nameText}>
                {participant.name}
              </Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

// ==================================================
// 🎥 LIVEKIT VIEWER
// ==================================================

export default function LiveKitViewer({
  serverUrl,
  token,
  canPublish = false,
  cameraEnabled = false,
}: LiveKitViewerProps) {
  // ==================================================
  // 🔊 AUDIO SESSION
  // ==================================================

  useEffect(() => {
    const startAudio = async () => {
      try {
        await AudioSession.startAudioSession();
      } catch (error) {
        console.log(
          "LiveKit audio session error:",
          error
        );
      }
    };

    startAudio();

    return () => {
      AudioSession.stopAudioSession().catch((error) => {
        console.log(
          "LiveKit audio stop error:",
          error
        );
      });
    };
  }, []);

  // ==================================================
  // 🎬 LIVEKIT ROOM
  // ==================================================

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect={true}
      audio={canPublish}
      video={false}
      options={{
        adaptiveStream: true,
        dynacast: true,
      }}
    >
      <CameraController
        canPublish={canPublish}
        cameraEnabled={cameraEnabled}
      />

      <ParticipantGrid />
    </LiveKitRoom>
  );
}

// ==================================================
// 🎨 STYLES
// ==================================================

const styles = StyleSheet.create({
  grid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
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

  empty: {
    minHeight: 120,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 12,
  },

  emptyText: {
    color: "#FFFFFF",
    fontSize: 13,
  },
});