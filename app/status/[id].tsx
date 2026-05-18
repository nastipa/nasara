import {
    useLocalSearchParams,
    useRouter,
} from "expo-router";

import {
    Image,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import {
    useEffect,
    useState,
} from "react";

import {
    VideoView,
    useVideoPlayer,
} from "expo-video";

import { supabase } from "../../lib/supabase";

export default function StatusScreen() {
  const { id } =
    useLocalSearchParams();

  const router =
    useRouter();

  const [status, setStatus] =
    useState<any>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus =
    async () => {
      const { data } =
        await (
          supabase as any
        )
          .from("statuses")
          .select(
            `
          *,
          profiles(
            full_name
          )
        `
          )
          .eq("id", id)
          .single();

      setStatus(data);
    };

  const player =
    useVideoPlayer(
      status?.media_url ||
        "",
      (p) => {
        p.loop = true;
      }
    );

  useEffect(() => {
    if (
      status?.media_type ===
      "video"
    ) {
      player.play();
    }
  }, [status]);

  if (!status)
    return null;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor:
          "black",
      }}
    >
      <TouchableOpacity
        onPress={() =>
          router.back()
        }
        style={{
          position:
            "absolute",
          top: 50,
          left: 20,
          zIndex: 20,
        }}
      >
        <Text
          style={{
            color: "white",
            fontSize: 18,
          }}
        >
          Back
        </Text>
      </TouchableOpacity>

      {status.media_type ===
      "image" ? (
        <Image
          source={{
            uri: status.media_url,
          }}
          style={{
            width: "100%",
            height: "100%",
          }}
          resizeMode="contain"
        />
      ) : (
        <VideoView
          player={player}
          style={{
            width: "100%",
            height: "100%",
          }}
        />
      )}

      {!!status.caption && (
        <View
          style={{
            position:
              "absolute",
            bottom: 80,
            width: "100%",
            padding: 20,
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 18,
              textAlign:
                "center",
            }}
          >
            {status.caption}
          </Text>
        </View>
      )}
    </View>
  );
}