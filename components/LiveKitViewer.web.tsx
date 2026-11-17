// ==================================================
// 🟢 NASARA LIVEKIT WEB VIEWER
// 🟢 MULTIPLE APPROVED GUEST SPEAKERS
// 🟢 ALL VIEWERS SEE ALL PUBLISHED VIDEO TRACKS
// 🟢 SUPPORTS VIEWING + SPEAKER PUBLISHING
// ==================================================

import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useTracks,
} from "@livekit/components-react";

import { Track } from "livekit-client";

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

  // Get every published video track.
  // Do not stop at the first speaker.
  const publishedTracks = tracks.filter(
    (trackRef) => trackRef.publication
  );

  if (publishedTracks.length === 0) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          minHeight: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          backgroundColor: "black",
          fontSize: 15,
        }}
      >
        Waiting for broadcaster video...
      </div>
    );
  }

  const columns =
    publishedTracks.length === 1
      ? "minmax(0, 1fr)"
      : "repeat(2, minmax(0, 1fr))";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "grid",
        gridTemplateColumns: columns,
        gridAutoRows:
          publishedTracks.length <= 2
            ? "minmax(0, 1fr)"
            : "minmax(180px, 1fr)",
        gap: 3,
        overflowY: "auto",
        backgroundColor: "black",
        alignContent: "start",
      }}
    >
      {publishedTracks.map((trackRef) => (
        <div
          key={`${trackRef.participant.identity}-${trackRef.source}`}
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            minHeight: 180,
            overflow: "hidden",
            backgroundColor: "#111",
            borderRadius: 6,
          }}
        >
          <VideoTrack
            trackRef={trackRef}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              backgroundColor: "black",
            }}
          />

          {/* SPEAKER NAME */}
          <div
            style={{
              position: "absolute",
              left: 8,
              bottom: 8,
              padding: "5px 9px",
              borderRadius: 5,
              backgroundColor: "rgba(0,0,0,0.7)",
              color: "white",
              fontSize: 12,
              fontWeight: 600,
              maxWidth: "85%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {trackRef.participant.identity}
          </div>
        </div>
      ))}
    </div>
  );
}
// ==================================================
// 📺 VIEWER COMPONENT
// ==================================================

export default function LiveKitViewer({
  serverUrl,
  token,
  canPublish = false,
}: LiveKitViewerProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "black",
        overflow: "hidden",
      }}
    >
      <LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect={true}
        audio={canPublish}
        video={canPublish}
      >
        <RemoteVideoGrid />

        {/* PLAY AUDIO FROM ALL SPEAKERS */}
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}