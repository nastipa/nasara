import { useEffect, type CSSProperties } from "react";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";

import { Track } from "livekit-client";

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

        if (!cancelled) {
          console.log(
            "NASARA WEB MICROPHONE:",
            shouldEnable ? "ENABLED" : "DISABLED",
            "Host muted:",
            hostMuted
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            "NASARA WEB MICROPHONE ERROR:",
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
            "NASARA WEB CAMERA:",
            canPublish && cameraEnabled
              ? "ENABLED"
              : "DISABLED"
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            "NASARA WEB CAMERA ERROR:",
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

    if (reference.source === Track.Source.Camera) {
      entry.video = reference;
    }

    if (reference.source === Track.Source.Microphone) {
      entry.audio = reference;
    }
  });

  const participantList = Array.from(
    participants.values()
  );

  return (
    <div style={styles.grid}>
      {participantList.map((participant) => (
        <div
          key={participant.identity}
          style={styles.participant}
        >
          {participant.video ? (
            <VideoTrack
              trackRef={participant.video}
              style={styles.video as CSSProperties}
            />
          ) : (
            <div style={styles.audioOnly}>
              <div style={styles.participantName}>
                {participant.identity}
              </div>

              <div style={styles.audioLabel}>
                Audio participant
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ==================================================
// 🎥 LIVEKIT WEB VIEWER
// ==================================================

export default function LiveKitViewer({
  serverUrl,
  token,
  canPublish = false,
  cameraEnabled = false,
  hostMuted = false,
}: LiveKitViewerProps) {
  if (!serverUrl || !token) {
    return (
      <div style={styles.loading}>
        Connecting to live broadcast...
      </div>
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

      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

// ==================================================
// 🎨 STYLES
// ==================================================

const styles: Record<string, CSSProperties> = {
  grid: {
    width: "100%",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },

  participant: {
    width: "48%",
    minWidth: 140,
    minHeight: 160,
    backgroundColor: "#111827",
    borderRadius: 12,
    overflow: "hidden",
  },

  video: {
    width: "100%",
    height: 180,
    objectFit: "cover",
  },

  audioOnly: {
    width: "100%",
    height: 160,
    display: "flex",
    flexDirection: "column",
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
    width: "100%",
    minHeight: 180,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
    color: "#FFFFFF",
  },
};