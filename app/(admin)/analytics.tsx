import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { supabase } from "../../lib/supabase";

const screenWidth = Dimensions.get("window").width;

export default function Analytics() {
  const [loading, setLoading] = useState(true);

  const [data, setData] = useState<any>({
    users: 0,
    newUsers: 0,
    referrals: 0,
    items: 0,
    messages: 0,
    growth: [],
    trending: [],
    activity: [],
    kFactor: 0,
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const today = new Date();
      const last7: string[] = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        last7.push(d.toISOString().split("T")[0]);
      }

      /* ================= CORE ================= */
      const { count: users } = await supabase
        .from("items_live")
        .select("*", { count: "exact", head: true });

      const { count: newUsers } = await supabase
        .from("items_live")
        .select("*", { count: "exact", head: true })
        .gte("created_at", last7[6]);

      const { count: referrals } = await supabase
        .from("items_live")
        .select("*", { count: "exact", head: true })
        .not("referred_by", "is", null);

      const { count: items } = await supabase
        .from("items_live")
        .select("*", { count: "exact", head: true });

      const { count: messages } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true });

      /* ================= GROWTH ================= */
      let growth: number[] = [];

      for (let d of last7) {
        const { count } = await supabase
          .from("items_live")
          .select("*", { count: "exact", head: true })
          .gte("created_at", d)
          .lt("created_at", d + "T23:59:59");

        growth.push(count || 0);
      }

      /* ================= TRENDING ================= */
      const { data: trending } = await supabase
        .from("items_live")
        .select("*")
        .order("view_count", { ascending: false })
        .limit(5);

      /* ================= ACTIVITY ================= */
      const { data: activity } = await (supabase as any)
        .from("analytics_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      /* ================= K FACTOR ================= */
     const safeUsers = users || 0;
const safeReferrals = referrals || 0;

const kFactor =
  safeUsers > 0 ? (safeReferrals / safeUsers).toFixed(2) : 0;

      setData({
        users,
        newUsers,
        referrals,
        items,
        messages,
        growth,
        trending: trending || [],
        activity: activity || [],
        kFactor,
        labels: last7.map((d) => d.slice(5)),
      });
    } catch (e) {
      console.log("Analytics error:", e);
    } finally {
      setLoading(false);
    }
  };

  /* ================= REALTIME ================= */
  useEffect(() => {
    const channel = supabase
      .channel("analytics-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        loadAnalytics
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "analytics_events" },
        loadAnalytics
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🦄 NASARA ANALYTICS</Text>

      {/* KPI */}
      <View style={styles.grid}>
        <Card title="Users" value={data.users} />
        <Card title="New Today" value={data.newUsers} />
        <Card title="Referrals" value={data.referrals} />
        <Card title="Items" value={data.items} />
        <Card title="Messages" value={data.messages} />
        <Card title="K-Factor 🚀" value={data.kFactor} />
      </View>

      {/* REAL CHART */}
      <Text style={styles.section}>📈 Growth Chart</Text>

      <LineChart
        data={{
          labels: data.labels,
          datasets: [{ data: data.growth }],
        }}
        width={screenWidth - 40}
        height={220}
        chartConfig={{
          backgroundGradientFrom: "#020617",
          backgroundGradientTo: "#020617",
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(34,197,94, ${opacity})`,
          labelColor: () => "#9ca3af",
          propsForDots: {
            r: "4",
            strokeWidth: "2",
            stroke: "#22c55e",
          },
        }}
        bezier
        style={{ borderRadius: 12, marginTop: 10 }}
      />

      {/* TRENDING */}
      <Text style={styles.section}>🔥 Trending</Text>

      {data.trending.map((item: any) => (
        <View key={item.id} style={styles.box}>
          <Text style={styles.white}>{item.title}</Text>
          <Text style={styles.sub}>👀 {item.view_count || 0}</Text>
        </View>
      ))}

      {/* ACTIVITY */}
      <Text style={styles.section}>⚡ Live Activity</Text>

      {data.activity.map((a: any) => (
        <View key={a.id} style={styles.box}>
          <Text style={styles.white}>
            {a.event} • {new Date(a.created_at).toLocaleTimeString()}
          </Text>
        </View>
      ))}

      {/* AI */}
      <Text style={styles.section}>🧠 AI Insight</Text>

      <View style={styles.box}>
        <Text style={styles.white}>{insight(data)}</Text>
      </View>
    </ScrollView>
  );
}

/* ================= COMPONENT ================= */

function Card({ title, value }: any) {
  return (
    <View style={styles.card}>
      <Text style={styles.sub}>{title}</Text>
      <Text style={styles.white}>{value}</Text>
    </View>
  );
}

/* ================= AI ================= */

function insight(d: any) {
  if (d.kFactor > 1) return "🚀 VIRAL LOOP ACTIVE";
  if (d.kFactor > 0.5) return "🔥 Good referrals";
  if (d.newUsers < 5) return "⚠️ Low growth";
  return "✅ Stable growth";
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
    padding: 20,
  },
  title: {
    color: "#22c55e",
    fontSize: 24,
    marginBottom: 20,
  },
  section: {
    color: "#22c55e",
    fontSize: 18,
    marginTop: 25,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  card: {
    backgroundColor: "#0f172a",
    padding: 12,
    borderRadius: 10,
    width: "48%",
  },
  box: {
    backgroundColor: "#0f172a",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  white: {
    color: "#fff",
    fontWeight: "600",
  },
  sub: {
    color: "#9ca3af",
    fontSize: 12,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#020617",
  },
});