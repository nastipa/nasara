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
  ActivityIndicator,
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
  hostMuted?: boolean;
}

// ==================================================
// 🎤 MICROPHONE CONTROLLER
// ==================================================

function MicrophoneController({
  canPublish,
  hostMuted,
}: {
  canPublish: boolean;
  hostMuted: boolean;
}) {
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    let cancelled = false;

    const updateMicrophone = async () => {
      try {
        if (!localParticipant) return;

        const shouldEnable =
          canPublish && !hostMuted;

        await localParticipant.setMicrophoneEnabled(
          shouldEnable
        );

        if (cancelled) return;

        console.log(
          "NASARA MICROPHONE STATE:",
          shouldEnable ? "ENABLED" : "DISABLED",
          "Host muted:",
          hostMuted
        );
      } catch (error) {
        if (!cancelled) {
          console.error(
            "NASARA MICROPHONE CONTROL ERROR:",
            error
          );
        }
      }
    };

    void updateMicrophone();

    return () => {
      cancelled = true;
    };
  }, [localParticipant, canPublish, hostMuted]);

  return null;
}

// ==================================================
// 🎥 CAMERA CONTROLLER
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
        if (!localParticipant) return;

        await localParticipant.setCameraEnabled(
          canPublish && cameraEnabled
        );

        if (!cancelled) {
          console.log(
            "NASARA CAMERA STATE:",
            canPublish && cameraEnabled
              ? "ENABLED"
              : "DISABLED"
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            "NASARA CAMERA CONTROL ERROR:",
            error
          );
        }
      }
    };

    void updateCamera();

    return () => {
      cancelled = true;
    };
  }, [localParticipant, canPublish, cameraEnabled]);

  return null;
}

// ==================================================
// 👥 PARTICIPANT GRID
// ==================================================

function ParticipantGrid() {
  const tracks = useTracks(
    [
      Track.Source.Camera,
      Track.Source.Microphone,
    ],
    {
      onlySubscribed: true,
    }
  );

  const participants = new Map<
    string,
    {
      identity: string;
      video?: any;
      audio?: any;
    }
  >();

  tracks.forEach((reference) => {
    const participant = reference.participant;

    if (!participants.has(participant.identity)) {
      participants.set(participant.identity, {
        identity: participant.identity,
      });
    }

    const entry = participants.get(
      participant.identity
    );

    if (!entry) return;

    if (
      reference.source === Track.Source.Camera &&
      isTrackReference(reference)
    ) {
      entry.video = reference;
    }

    if (
      reference.source === Track.Source.Microphone &&
      isTrackReference(reference)
    ) {
      entry.audio = reference;
    }
  });

  const participantList = Array.from(
    participants.values()
  );

  return (
    <View style={styles.grid}>
      {participantList.map((participant) => (
        <View
          key={participant.identity}
          style={styles.participant}
        >
          {participant.video ? (
            <VideoTrack
              trackRef={participant.video}
              style={styles.video}
            />
          ) : (
            <View style={styles.audioOnly}>
              <Text style={styles.participantName}>
                {participant.identity}
              </Text>

              <Text style={styles.audioLabel}>
                Audio participant
              </Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

// ==================================================
// 🎥 LIVEKIT NATIVE VIEWER
// ==================================================

export default function LiveKitViewer({
  serverUrl,
  token,
  canPublish = false,
  cameraEnabled = false,
  hostMuted = false,
}: LiveKitViewerProps) {
  useEffect(() => {
    let mounted = true;

    const startAudio = async () => {
      try {
        await AudioSession.startAudioSession();

        if (mounted) {
          console.log(
            "NASARA LIVEKIT AUDIO SESSION STARTED"
          );
        }
      } catch (error) {
        console.error(
          "NASARA AUDIO SESSION ERROR:",
          error
        );
      }
    };

    void startAudio();

    return () => {
      mounted = false;

      void AudioSession.stopAudioSession();
    };
  }, []);

  if (!serverUrl || !token) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#D4AF37" />

        <Text style={styles.loadingText}>
          Connecting to live broadcast...
        </Text>
      </View>
    );
  }

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
      <MicrophoneController
        canPublish={canPublish}
        hostMuted={hostMuted}
      />

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

  participant: {
    width: "48%",
    minHeight: 160,
    backgroundColor: "#111827",
    borderRadius: 12,
    overflow: "hidden",
  },

  video: {
    width: "100%",
    height: 180,
  },

  audioOnly: {
    flex: 1,
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },

  participantName: {
    color: "#FFFFFF",
    fontWeight: "bold",
    textAlign: "center",
  },

  audioLabel: {
    color: "#D4AF37",
    fontSize: 12,
    marginTop: 6,
  },

  loading: {
    flex: 1,
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
  },

  loadingText: {
    color: "#FFFFFF",
    marginTop: 10,
  },
});