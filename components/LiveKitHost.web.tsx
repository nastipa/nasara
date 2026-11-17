// 🌐 ==================================================
// 🌐 NASARA LIVEKIT HOST — WEB
// 🌐 LIVE VIEWER COUNT
// 🌐 ==================================================

import { useEffect } from "react";

import {
  LiveKitRoom,
  useRemoteParticipants,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";

import { Track } from "livekit-client";

// 🌐 TYPES

type Props = {
  serverUrl: string;
  token: string;
  onConnected: () => void;
  onViewerCountChange?: (count: number) => void;
};

// 🌐 CAMERA PREVIEW

function WebCameraPreview() {
  const tracks = useTracks([Track.Source.Camera]);

  const cameraTrack = tracks.find(
    (item) =>
      item.publication.source === Track.Source.Camera &&
      item.publication.track
  );

  if (!cameraTrack) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#FFFFFF",
          background: "#000000",
        }}
      >
        Waiting for camera...
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#000000",
      }}
    >
      <VideoTrack
        trackRef={cameraTrack}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </div>
  );
}

// 🌐 LIVE VIEWER COUNT

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

// 🌐 LIVEKIT WEB HOST

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
      onConnected={onConnected}
    >
      <WebCameraPreview />

      <WebViewerCount
        onViewerCountChange={onViewerCountChange}
      />
    </LiveKitRoom>
  );
}