// 📱 ==================================================
// 📱 NASARA LIVEKIT HOST — ANDROID + IOS
// 📱 LIVE VIEWER COUNT + GUEST SPEAKER AUDIO
// 📱 ==================================================

import { useEffect } from "react";

import {
  ActivityIndicator,
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

// 📱 REGISTER WEBRTC GLOBALS

registerGlobals();

// 📱 TYPES

type Props = {
  serverUrl: string;
  token: string;
  onConnected: () => void;
  onViewerCountChange?: (count: number) => void;
};

// 📱 CAMERA PREVIEW

function NativeCameraPreview() {
  const tracks = useTracks([Track.Source.Camera]);

  const cameraTrack = tracks.find((item) =>
    isTrackReference(item)
  );

  if (!cameraTrack) {
    return (
      <View style={styles.placeholder}>
        <ActivityIndicator
          size="large"
          color="#E8B84A"
        />

        <Text style={styles.placeholderText}>
          Starting camera...
        </Text>
      </View>
    );
  }

  return (
    <VideoTrack
      trackRef={cameraTrack}
      style={styles.video}
    />
  );
}

// 📱 LIVE VIEWER COUNT

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

// 📱 LIVEKIT NATIVE HOST

export default function LiveKitHost({
  serverUrl,
  token,
  onConnected,
  onViewerCountChange,
}: Props) {
  useEffect(() => {
    let mounted = true;

    const startAudio = async () => {
      try {
        if (mounted) {
          await AudioSession.startAudioSession();
        }
      } catch (error) {
        console.warn(
          "Could not start LiveKit audio session:",
          error
        );
      }
    };

    startAudio();

    return () => {
      mounted = false;

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
        <NativeCameraPreview />

        <NativeViewerCount
          onViewerCountChange={onViewerCountChange}
        />
      </View>
    </LiveKitRoom>
  );
}

// 📱 STYLES

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },

  video: {
    width: "100%",
    height: "100%",
  },

  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
  },

  placeholderText: {
    color: "#FFFFFF",
    fontSize: 12,
    marginTop: 12,
  },
});