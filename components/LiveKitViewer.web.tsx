// ==================================================
// 🟢 LIVEKIT WEB VIEWER
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
        audio={false}
        video={false}
      >
        <RemoteVideo />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}