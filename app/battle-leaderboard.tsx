import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Text,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";

export default function BattleLeaderboard() {

  const { id } =
    useLocalSearchParams();

  const [data, setData] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(false);

  /* ================= LOAD ================= */

  async function load() {

    if (!id) return;

    setLoading(true);

    const { data, error } =
      await supabase
        .from("candidates")
        .select("*")
        .eq("battle_id", id)
        .order("votes", {
          ascending: false,
        });

    if (error) {
      console.log(
        "Leaderboard error:",
        error
      );
    }

    setData(data || []);

    setLoading(false);
  }

  /* ================= REALTIME ================= */

  useEffect(() => {

    load();

    const channel =
      supabase
        .channel(
          "leaderboard"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "candidates",
          },
          () => {
            load();
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };

  }, [id]);

  /* ================= TOTAL VOTES ================= */

  const totalVotes =
    data.reduce(
      (
        sum: number,
        c: any
      ) =>
        sum +
        (c.votes || 0),
      0
    );

  /* ================= PERCENT ================= */

  const percent = (
    votes: number
  ) => {

    if (!totalVotes)
      return 0;

    return Math.round(
      (votes / totalVotes) *
        100
    );
  };

  /* ================= BADGES ================= */

  function getBadge(
    index: number
  ) {

    if (index === 0)
      return "👑";

    if (index === 1)
      return "🥈";

    if (index === 2)
      return "🥉";

    return `#${index + 1}`;
  }

  /* ================= LOADING ================= */

  if (loading) {

    return (
      <View
        style={{
          flex: 1,
          justifyContent:
            "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator
          size="large"
        />
      </View>
    );
  }

  /* ================= UI ================= */

  return (
    <View
      style={{
        flex: 1,
        padding: 20,
      }}
    >

      <Text
        style={{
          fontSize: 22,
          fontWeight: "bold",
          marginBottom: 20,
          textAlign: "center",
        }}
      >
        🏆 Battle Leaderboard
      </Text>

      {data.map(
        (
          c,
          index
        ) => (

          <View
            key={c.id}
            style={{
              marginBottom: 15,
              padding: 15,
              borderWidth: 1,
              borderRadius: 12,

              backgroundColor:
                index === 0
                  ? "#fff7cc"
                  : "#fff",

              borderColor:
                index === 0
                  ? "#facc15"
                  : "#ddd",
            }}
          >

            {/* ================= PHOTO ================= */}

            {c.image_url ? (

              <Image
                source={{
                  uri: c.image_url,
                }}
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 45,
                  alignSelf:
                    "center",
                  marginBottom: 12,
                }}
              />

            ) : (

              <View
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 45,
                  backgroundColor:
                    "#e5e7eb",
                  alignSelf:
                    "center",
                  marginBottom: 12,
                  justifyContent:
                    "center",
                  alignItems:
                    "center",
                }}
              >

                <Text
                  style={{
                    fontSize: 28,
                  }}
                >
                  👤
                </Text>

              </View>

            )}

            {/* ================= NAME ================= */}

            <Text
              style={{
                fontSize: 18,
                fontWeight:
                  "bold",
                textAlign:
                  "center",
              }}
            >
              {getBadge(index)}{" "}
              {c.name}
            </Text>

            {/* ================= VOTES ================= */}

            <Text
              style={{
                marginTop: 6,
                textAlign:
                  "center",
                fontSize: 15,
              }}
            >
              {c.votes || 0} votes (
              {percent(
                c.votes || 0
              )}
              %)
            </Text>

            {/* ================= BAR ================= */}

            <View
              style={{
                height: 10,
                backgroundColor:
                  "#eee",
                marginTop: 10,
                borderRadius: 8,
                overflow:
                  "hidden",
              }}
            >

              <View
                style={{
                  width: `${percent(
                    c.votes || 0
                  )}%`,

                  height: 10,

                  backgroundColor:
                    index === 0
                      ? "#facc15"
                      : "#4ade80",
                }}
              />

            </View>

          </View>
        )
      )}

      {!data.length && (

        <Text
          style={{
            textAlign: "center",
            marginTop: 40,
            color: "gray",
          }}
        >
          No candidates yet
        </Text>

      )}

    </View>
  );
}