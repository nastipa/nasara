import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { LineChart } from "react-native-chart-kit";
import { supabase } from "../../lib/supabase";

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

const screenWidth = Dimensions.get("window").width;

export default function Analytics() {
  const [loading, setLoading] = useState(true);

  const [data, setData] = useState<any>({
    users: 0,
    newUsers: 0,
    activeUsers: 0,
    items: 0,

    revenue: 0,
    arpu: 0,

    growth: [],
    labels: [],

    kFactor: 0,
    retention: 0,

    fraudScore: 0,
    trustScore: 0,

    fundingScore: 0,
    valuation: 0,

    pitch: "",
  });

  /* ================= LOAD ANALYTICS ================= */
  useEffect(() => {
    loadAnalytics();

    const channel = supabase
      .channel("analytics-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "analytics_events" },
        () => loadAnalytics(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAnalytics = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      const today = new Date();
      const last7: string[] = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        last7.push(d.toISOString().split("T")[0]);
      }

      /* ================= CORE DATA ================= */
      const { count: users } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const { count: newUsers } = await supabase
        .from("analytics_events")
        .select("*", { count: "exact", head: true })
        .eq("event", "signup");

      const { count: activeUsers } = await supabase
        .from("analytics_events")
        .select("*", { count: "exact", head: true });

      const { count: items } = await supabase
        .from("items_live")
        .select("*", { count: "exact", head: true });

      /* ================= REVENUE MODEL ================= */
      const revenue = (items || 0) * 300;
      const arpu = users ? revenue / users : 0;

      /* ================= GROWTH ================= */
      let growth: number[] = [];

      for (let d of last7) {
        const start = new Date(d);
        const end = new Date(d);
        end.setHours(23, 59, 59);

        const { count } = await supabase
          .from("analytics_events")
          .select("*", { count: "exact", head: true })
          .eq("event", "signup")
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString());

        growth.push(count || 0);
      }

      /* ================= METRICS ================= */
      const safeUsers = users ?? 0;
const safeNewUsers = newUsers ?? 0;
const safeActiveUsers = activeUsers ?? 0;

const kFactor =
  safeUsers > 0 ? safeNewUsers / safeUsers : 0;

const retention =
  safeUsers > 0 ? safeActiveUsers / safeUsers : 0;

      /* ================= FRAUD DETECTION ================= */
      const fraudScore = Math.max(0, 1 - retention);
      const trustScore = Math.max(0, 1 - fraudScore);

      /* ================= FUNDING SCORE ================= */
      const fundingScore = calculateFundingScore({
        users,
        revenue,
        kFactor,
        retention,
        fraudScore,
      });

      const valuation = Math.round(revenue * 40 + (users || 0) * 3);

      const pitch = generatePitch({ users, revenue, kFactor });

      setData({
        users,
        newUsers,
        activeUsers,
        items,

        revenue,
        arpu,

        growth,
        labels: last7.map((d) => d.slice(5)),

        kFactor,
        retention,

        fraudScore,
        trustScore,

        fundingScore,
        valuation,

        pitch,
      });
    } catch (e) {
      console.log("Analytics error:", e);
    } finally {
      setLoading(false);
    }
  };

  /* ================= PDF GENERATOR ================= */
  const generatePitchPDF = async () => {
    try {
      const html = `
      <html>
      <body style="font-family: Arial; padding: 30px;">

        <h1>🚀 NASARA INVESTOR PITCH DECK</h1>
        <h3>Growth + Funding Report</h3>

        <hr/>

        <h2>📊 Overview</h2>
        <p><b>Users:</b> ${data.users}</p>
        <p><b>New Users:</b> ${data.newUsers}</p>
        <p><b>Active Users:</b> ${data.activeUsers}</p>
        <p><b>Items:</b> ${data.items}</p>

        <h2>💰 Financials</h2>
        <p><b>Revenue:</b> GH₵ ${data.revenue}</p>
        <p><b>ARPU:</b> ${data.arpu}</p>
        <p><b>Valuation:</b> GH₵ ${data.valuation}</p>

        <h2>📈 Growth</h2>
        <p>${data.growth.join(", ")}</p>

        <h2>⚡ Network Effects</h2>
        <p><b>K-Factor:</b> ${data.kFactor}</p>
        <p><b>Retention:</b> ${data.retention}</p>

        <h2>🛡 Risk Analysis</h2>
        <p><b>Fraud Score:</b> ${data.fraudScore}</p>
        <p><b>Trust Score:</b> ${data.trustScore}</p>

        <h2>💰 Funding Readiness</h2>
        <p><b>Funding Score:</b> ${data.fundingScore}/100</p>

        <h2>🧠 AI Pitch</h2>
        <p>${data.pitch}</p>

        <hr/>
        <p style="color: gray;">Generated for Nasara Investor System</p>

      </body>
      </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });

      await Sharing.shareAsync(uri);
    } catch (err) {
      console.log("PDF error:", err);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📊 NASARA INVESTOR DASHBOARD</Text>

      {/* KPI */}
      <View style={styles.grid}>
        <Card title="Users" value={data.users} />
        <Card title="Revenue" value={`GH₵ ${data.revenue}`} />
        <Card title="Funding Score" value={data.fundingScore} />
        <Card title="Valuation" value={`GH₵ ${data.valuation}`} />
      </View>

      {/* CHART */}
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
          color: (o = 1) => `rgba(34,197,94, ${o})`,
        }}
        bezier
      />

      {/* PITCH */}
      <View style={styles.box}>
        <Text style={styles.text}>{data.pitch}</Text>
      </View>

      {/* PDF BUTTON */}
      <TouchableOpacity style={styles.button} onPress={generatePitchPDF}>
        <Text style={styles.buttonText}>📄 Generate Investor Pitch PDF</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ================= SCORING ENGINE ================= */
function calculateFundingScore(d: any) {
  let score = 80;

  if (d.users > 100) score += 10;
  if (d.revenue > 500) score += 15;
  if (d.kFactor > 0.5) score += 15;
  if (d.retention > 0.4) score += 10;
  if (d.fraudScore < 0.2) score += 10;

  return Math.min(100, score);
}

/* ================= AI PITCH ================= */
function generatePitch(d: any) {
  return `Nasara has ${d.users} users, showing strong early marketplace traction with improving network effects and monetization potential.;`
}

/* ================= CARD ================= */
function Card({ title, value }: any) {
  return (
    <View style={styles.card}>
      <Text style={styles.sub}>{title}</Text>
      <Text style={styles.white}>{value}</Text>
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617", padding: 20 },
  title: { color: "#22c55e", fontSize: 20 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  card: {
    backgroundColor: "#0f172a",
    padding: 10,
    borderRadius: 10,
    width: "48%",
  },

  sub: { color: "#9ca3af" },
  white: { color: "#fff" },

  box: {
    backgroundColor: "#0f172a",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },

  text: { color: "#cbd5e1" },

  button: {
    backgroundColor: "#22c55e",
    padding: 12,
    borderRadius: 10,
    marginTop: 15,
    alignItems: "center",
  },

  buttonText: { color: "#000", fontWeight: "bold" },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#020617",
  },
});