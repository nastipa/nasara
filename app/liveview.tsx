import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";

import {
    ChannelProfileType,
    ClientRoleType,
    createAgoraRtcEngine,
    IRtcEngine,
    RtcSurfaceView,
} from "react-native-agora";

const APP_ID = "55cb4a5f264a429ab77741479c10e09d";

/* ✅ Token fix */
const TOKEN = "";

export default function LiveView() {
  const params = useLocalSearchParams();

  const channelName = String(params.channel || "nasara_live");

  const [engine, setEngine] = useState<IRtcEngine | null>(null);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const rtcEngine = createAgoraRtcEngine();
        rtcEngine.initialize({ appId: APP_ID });

        rtcEngine.enableVideo();

        rtcEngine.registerEventHandler({
          onUserJoined: (_connection, uid) => {
            console.log("Remote user joined:", uid);
            setRemoteUid(uid);
          },

          onUserOffline: () => {
            setRemoteUid(null);
          },
        });

        /* ✅ No red underline */
        rtcEngine.joinChannel(
          TOKEN,
          channelName,
          0,
          {
            channelProfile:
              ChannelProfileType.ChannelProfileLiveBroadcasting,
            clientRoleType: ClientRoleType.ClientRoleAudience,
          }
        );

        setEngine(rtcEngine);
      } catch (err: any) {
        Alert.alert("Viewer Error", err.message);
      }
    };

    init();

    return () => {
      engine?.leaveChannel();
      engine?.release();
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Text style={{ textAlign: "center", marginTop: 40 }}>
        Watching Channel: {channelName}
      </Text>

      {remoteUid !== null ? (
        <RtcSurfaceView
          canvas={{ uid: remoteUid }}
          style={{ flex: 1 }}
        />
      ) : (
        <Text style={{ textAlign: "center", marginTop: 50 }}>
          Waiting for seller to go live...
        </Text>
      )}
    </View>
  );
}