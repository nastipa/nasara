import { useEffect, type CSSProperties } from "react";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";

import { Track } from "livekit-client";

import "@livekit/components-styles";

// ==================================================
// 📦 TYPES
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
          console.error("LiveKit camera update error:", error);
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
      <div style={styles.empty}>
        Waiting for the host and guest speakers...
      </div>
    );
  }

  return (
    <div style={styles.grid}>
      {visibleParticipants.map((participant) => (
        <div
          key={participant.identity}
          style={styles.tile}
        >
          {participant.camera ? (
            <VideoTrack
              trackRef={participant.camera}
              style={styles.video}
            />
          ) : (
            <div style={styles.audioTile}>
              <div style={styles.avatar}>
                {participant.name?.charAt(0)?.toUpperCase() || "N"}
              </div>

              <div style={styles.audioName}>
                {participant.name}
              </div>

              <div style={styles.audioLabel}>
                Audio speaker
              </div>
            </div>
          )}

          {participant.camera && (
            <div style={styles.nameTag}>
              {participant.name}
            </div>
          )}
        </div>
      ))}
    </div>
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
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 8,
  },

  tile: {
    position: "relative",
    width: "100%",
    aspectRatio: "1 / 1",
    background: "#111827",
    borderRadius: 12,
    overflow: "hidden",
  },

  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  audioTile: {
    width: "100%",
    height: "100%",
    background: "#172033",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#FFFFFF",
  },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "#C99A35",
    color: "#111827",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 10,
  },

  audioName: {
    fontSize: 13,
    fontWeight: "bold",
    textAlign: "center",
  },

  audioLabel: {
    fontSize: 11,
    color: "#D1D5DB",
    marginTop: 4,
  },

  nameTag: {
    position: "absolute",
    bottom: 6,
    left: 6,
    right: 6,
    background: "rgba(0,0,0,0.65)",
    color: "#FFFFFF",
    padding: 5,
    borderRadius: 5,
    fontSize: 11,
    textAlign: "center",
  },

  empty: {
    minHeight: 120,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#111827",
    color: "#FFFFFF",
    borderRadius: 12,
  },
};