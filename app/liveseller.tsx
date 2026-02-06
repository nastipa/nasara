import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";

import {
  ChannelProfileType,
  ClientRoleType,
  createAgoraRtcEngine,
  IRtcEngine,
  RtcSurfaceView,
} from "react-native-agora";

const APP_ID = "55cb4a5f264a429ab77741479c10e09d";

/* ✅ Token fix (required string) */
const TOKEN = "";

export default function LiveSeller() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const channelName = String(params.channel || "nasara_live");

  const [engine, setEngine] = useState<IRtcEngine | null>(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const rtcEngine = createAgoraRtcEngine();
        rtcEngine.initialize({ appId: APP_ID });

        rtcEngine.enableVideo();

        rtcEngine.registerEventHandler({
          onJoinChannelSuccess: () => {
            console.log("Seller joined channel");
            setJoined(true);
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
            clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          }
        );

        setEngine(rtcEngine);
      } catch (err: any) {
        Alert.alert("Live Error", err.message);
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
        Seller Live Channel: {channelName}
      </Text>

      {joined && (
        <RtcSurfaceView
          canvas={{ uid: 0 }}
          style={{ flex: 1 }}
        />
      )}

      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          padding: 15,
          backgroundColor: "black",
          margin: 20,
          borderRadius: 10,
        }}
      >
        <Text style={{ color: "white", textAlign: "center" }}>
          End Live
        </Text>
      </TouchableOpacity>
    </View>
  );
}