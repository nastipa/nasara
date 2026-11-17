// ==================================================
// 🟢 LIVEKIT WEB VIEWER
// 🟢 SUPPORTS VIEWING + APPROVED GUEST SPEAKERS
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
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          backgroundColor: "black",
        }}
      >
        Waiting for broadcaster video...
      </div>
    );
  }

  return (
    <VideoTrack
      trackRef={videoTrack}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        backgroundColor: "black",
      }}
    />
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
      }}
    >
      <LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect={true}
        audio={canPublish}
        video={canPublish}
      >
        <RemoteVideo />

        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}