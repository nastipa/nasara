import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function BattleLeaderboard() {
  const { id } = useLocalSearchParams();

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!id) return;

    setLoading(true);

    const { data } = await supabase
      .from("candidates")
      .select("*")
      .eq("battle_id", id) // ✅ PER BATTLE
      .order("votes", { ascending: false });

    setData(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();

    const channel = supabase
      .channel("leaderboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "candidates" },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const totalVotes = data.reduce(
    (sum: number, c: any) => sum + (c.votes || 0),
    0
  );

  const percent = (votes: number) =>
    totalVotes ? Math.round((votes / totalVotes) * 100) : 0;

  /* ================= BADGES ================= */
  function getBadge(index: number) {
    if (index === 0) return "👑"; // #1 crown
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `#${index + 1}Ä`;
  }

  if (loading) return <ActivityIndicator />;

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 20 }}>
        🏆 Battle Leaderboard
      </Text>

      {data.map((c, index) => (
        <View
          key={c.id}
          style={{
            marginBottom: 15,
            padding: 15,
            borderWidth: 1,
            borderRadius: 12,

            // 👑 HIGHLIGHT #1
            backgroundColor: index === 0 ? "#fff7cc" : "#fff",
            borderColor: index === 0 ? "#facc15" : "#ddd",
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "bold" }}>
            {getBadge(index)} {c.name}
          </Text>

          <Text style={{ marginTop: 5 }}>
            {c.votes || 0} votes ({percent(c.votes || 0)}%)
          </Text>

          {/* 🟢 PROGRESS BAR (MATCH YOUR STYLE) */}
          <View
            style={{
              height: 8,
              backgroundColor: "#eee",
              marginTop: 6,
              borderRadius: 5,
            }}
          >
            <View
              style={{
                width: `${percent(c.votes || 0)}%`,
                height: 8,
                backgroundColor: "#4ade80",
                borderRadius: 5,
              }}
            />
          </View>
        </View>
      ))}

      {!data.length && (
        <Text style={{ textAlign: "center", marginTop: 20 }}>
          No candidates yet
        </Text>
      )}
    </View>
  );
}