import { useLocalSearchParams } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function StatusView() {
  const { id } = useLocalSearchParams();

  const [statuses, setStatuses] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [viewers, setViewers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const current = statuses[index];

  // always call hook
  const player = useVideoPlayer(
    current?.type === "video" ? current.media_url : null,
    (p) => {
      if (current?.type === "video") {
        p.loop = false;
        p.muted = false;
        p.play();
      }
    }
  );

  useEffect(() => {
    loadStatuses();
  }, [id]);

  async function loadStatuses() {
    setLoading(true);

    const { data: first, error } = await (supabase as any)
      .from("statuses")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !first) {
      console.log(error);
      setLoading(false);
      return;
    }

    // load only this user's statuses
    const { data } = await supabase
      .from("statuses")
      .select("*")
      .eq("user_id", first.user_id)
      .order("created_at", { ascending: true });

    setStatuses(data || []);
    const {
  data: { user },
} = await supabase.auth.getUser();

setUserId(user?.id ?? null);
    setLoading(false);
  }

  useEffect(() => {
    if (!current) return;

    saveViewAndLoad();

    if (current.type !== "video") {
      const t = setTimeout(() => {
        nextStatus();
      }, 5000);

      return () => clearTimeout(t);
    }

    const sub = player?.addListener("playToEnd", () => {
      nextStatus();
    });

    return () => sub?.remove();
  }, [current?.id]);

  async function saveViewAndLoad() {
    if (!current) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { error } = await (supabase as any).from("status_views").upsert(
        {
          status_id: current.id,
          viewer_id: user.id,
        },
        {
          onConflict: "status_id,viewer_id",
        }
      );

      if (error) console.log("save view error", error);
    }

    await loadViewers(current.id);
  }

  async function loadViewers(statusId: string) {
  const { data, error } = await (supabase as any)
    .from("status_views")
    .select("*")
    .eq("status_id", statusId);

  if (error) {
    console.log(error);
    return;
  }

  if (!data?.length) {
    setViewers([]);
    return;
  }

  const ids = data.map((v: any) => v.viewer_id);

  const { data: profiles } = await (supabase as any)
    .from("profiles")
    .select("id, full_name")
    .in("id", ids);

  const merged = data.map((v: any) => ({
    ...v,
    profiles: profiles?.find((p: any) => p.id === v.viewer_id),
  }));

  setViewers(merged);
}
  function nextStatus() {
    if (index < statuses.length - 1) {
      setIndex((v) => v + 1);
    }
  }

  if (loading || !current) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" />
        <Text>Loading status...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      {/* progress */}
      <View
        style={{
          flexDirection: "row",
          paddingTop: 50,
          paddingHorizontal: 8,
        }}
      >
        {statuses.map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 3,
              backgroundColor: i <= index ? "white" : "#555",
              marginHorizontal: 2,
              borderRadius: 2,
            }}
          />
        ))}
      </View>

      {/* status content */}
      {current.type === "text" ? (
        <View
          style={{
            flex: 1,
            backgroundColor: current.background || "#111827",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 28,
              textAlign: "center",
            }}
          >
            {current.text}
          </Text>
        </View>
      ) : current.type === "image" ? (
        <Image
          source={{ uri: current.media_url }}
          style={{ flex: 1 }}
          resizeMode="contain"
        />
      ) : (
        <VideoView
  player={player}
  style={{ width: "100%", height: "100%" }}
  contentFit="contain"
  allowsFullscreen
  allowsPictureInPicture={false}
  nativeControls={true}
/>
      )}

      {/* tap right to next */}
      <TouchableOpacity
        onPress={nextStatus}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "50%",
          height: "100%",
        }}
      />

      {/* viewers */}
      {current.user_id === userId && (
  <View
    style={{
      position: "absolute",
      bottom: 30,
      left: 20,
      right: 20,
      backgroundColor: "rgba(0,0,0,0.5)",
      padding: 10,
      borderRadius: 10,
    }}
  >
    <Text style={{ color: "white", fontWeight: "bold" }}>
      👁️ {viewers.length} views
    </Text>

    {viewers.slice(0, 10).map((v, i) => (
      <Text key={i} style={{ color: "white" }}>
        {v.profiles?.full_name || "User"}
      </Text>
    ))}
  </View>
)}
    </View>
  );
}