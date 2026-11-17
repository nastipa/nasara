// 🌐 ==================================================
// 🌐 NASARA LIVEKIT HOST — WEB
// 🌐 HOST + APPROVED SPEAKERS GRID
// 🌐 LIVE VIEWER COUNT + REMOTE AUDIO
// 🌐 ==================================================

import { useEffect } from "react";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  useRemoteParticipants,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";

import { Track } from "livekit-client";

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

function WebSpeakerGrid() {
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
      <div style={styles.placeholder}>
        Waiting for the host camera and guest speakers...
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
                {participant.name
                  ?.charAt(0)
                  ?.toUpperCase() || "N"}
              </div>

              <div style={styles.audioName}>
                {participant.name}
              </div>

              <div style={styles.audioLabel}>
                Audio speaker
              </div>
            </div>
          )}

          <div style={styles.nameTag}>
            {participant.name}
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================================================
// 👁️ LIVE VIEWER COUNT
// ==================================================

function WebViewerCount({
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
// 🌐 LIVEKIT WEB HOST
// ==================================================

export default function LiveKitHost({
  serverUrl,
  token,
  onConnected,
  onViewerCountChange,
}: Props) {
  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect={true}
      audio={true}
      video={true}
      options={{
        adaptiveStream: true,
        dynacast: true,
      }}
      onConnected={onConnected}
    >
      <div style={styles.container}>
        <WebViewerCount
          onViewerCountChange={onViewerCountChange}
        />

        <WebSpeakerGrid />

        {/* 🔊 PLAY REMOTE GUEST SPEAKER AUDIO */}
        <RoomAudioRenderer />
      </div>
    </LiveKitRoom>
  );
}

// ==================================================
// 🎨 STYLES
// ==================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: "100%",
    height: "100%",
    minHeight: 200,
    background: "#000000",
  },

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

  placeholder: {
    minHeight: 150,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#111827",
    color: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    textAlign: "center",
  },
};