import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { supabase } from "../lib/supabase";

export default function BusinessDashboard() {
  const [loading, setLoading] =
    useState(true);

  const [analytics, setAnalytics] =
    useState<any>(null);

  const [followers, setFollowers] =
    useState(0);

  const [following, setFollowing] =
    useState(0);

  const [itemsCount, setItemsCount] =
    useState(0);

  const [battleCount, setBattleCount] =
    useState(0);

  const [liveViews, setLiveViews] =
    useState(0);

  const [earnings, setEarnings] =
    useState(0);

  /* ================= LOAD ================= */
  useEffect(() => {
    loadDashboard();
  }, []);

  /* ================= LOAD DASHBOARD ================= */
  async function loadDashboard() {
    try {
      setLoading(true);

      const { data: auth } =
        await supabase.auth.getUser();

      const user =
        auth?.user;

      if (!user) return;

      /* ================= ANALYTICS ================= */
      const {
        data: analyticsData,
      } = await (supabase as any)
        .from(
          "business_analytics"
        )
        .select("*")
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

      setAnalytics(
        analyticsData
      );

      /* ================= FOLLOWERS ================= */
      const {
        count: followersCount,
      } = await supabase
        .from("follows")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq(
          "following_id",
          user.id
        );

      setFollowers(
        followersCount || 0
      );

      /* ================= FOLLOWING ================= */
      const {
        count: followingCount,
      } = await supabase
        .from("follows")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq(
          "follower_id",
          user.id
        );

      setFollowing(
        followingCount || 0
      );

      /* ================= ITEMS ================= */
      const {
        count: itemCount,
      } = await (supabase as any)
        .from("items")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq(
          "user_id",
          user.id
        );

      setItemsCount(
        itemCount || 0
      );

      /* ================= BATTLES ================= */
      const {
        count: battles,
      } = await (supabase as any)
        .from("battles")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq(
          "creator_id",
          user.id
        );

      setBattleCount(
        battles || 0
      );

      /* ================= LIVE VIEWS ================= */
      setLiveViews(
        analyticsData?.live_views ||
          0
      );

      /* ================= EARNINGS ================= */
      const {
        data: payments,
      } = await (supabase as any)
        .from(
          "battle_payments"
        )
        .select("amount")
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "status",
          "approved"
        );

      if (payments) {
        const total =
          payments.reduce(
            (
              sum: number,
              p: any
            ) =>
              sum +
              Number(
                p.amount
              ),
            0
          );

        setEarnings(total);
      }

    } catch (e) {
      console.log(
        "Dashboard error:",
        e
      );
    }

    setLoading(false);
  }

  /* ================= UI ================= */
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent:
            "center",
          alignItems:
            "center",
        }}
      >
        <ActivityIndicator
          size="large"
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
    >
      <Text
        style={styles.title}
      >
        📊 Business Dashboard
      </Text>

      {/* ================= STATS GRID ================= */}

      <View style={styles.grid}>
        <Card
          title="Profile Views"
          value={
            analytics?.profile_views ||
            0
          }
          emoji="👀"
        />

        <Card
          title="Followers"
          value={followers}
          emoji="👥"
        />

        <Card
          title="Following"
          value={following}
          emoji="➡️"
        />

        <Card
          title="Items"
          value={itemsCount}
          emoji="🛒"
        />

        <Card
          title="Battles"
          value={battleCount}
          emoji="⚔️"
        />

        <Card
          title="Live Views"
          value={liveViews}
          emoji="🔴"
        />

        <Card
          title="Earnings"
          value={`GH₵ ${earnings}`}
          emoji="💰"
        />

        <Card
          title="Chat Clicks"
          value={
            analytics?.chat_clicks ||
            0
          }
          emoji="💬"
        />
      </View>
    </ScrollView>
  );
}

/* ================= CARD ================= */
function Card({
  title,
  value,
  emoji,
}: any) {
  return (
    <View style={styles.card}>
      <Text
        style={styles.emoji}
      >
        {emoji}
      </Text>

      <Text
        style={styles.value}
      >
        {value}
      </Text>

      <Text
        style={styles.label}
      >
        {title}
      </Text>
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent:
      "space-between",
  },

  card: {
    width: "48%",
    backgroundColor:
      "#fff",
    padding: 20,
    borderRadius: 16,
    marginBottom: 15,

    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,

    elevation: 3,
  },

  emoji: {
    fontSize: 28,
  },

  value: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 10,
  },

  label: {
    marginTop: 6,
    color: "gray",
    fontSize: 14,
  },
});