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
    newUsersToday: 0,
    activeUsers: 0,
    items: 0,

    revenue: 0,
    arpu: 0,

    growth: [],
    labels: [],

    fraudScore: 0,
    trustScore: 0,

    fundingScore: 0,
    valuation: 0,

    suspiciousUsers: [],
    latestUsers: [],

    pitch: "",
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      const today = new Date();
      const startToday = new Date();
      startToday.setHours(0, 0, 0, 0);

      const last7: string[] = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        last7.push(d.toISOString().split("T")[0]);
      }

      /* USERS */
      const { data: usersData } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          phone,
          created_at,
          phone_verified
        `)
        .order("created_at", {
          ascending: false,
        });

      const users = usersData?.length || 0;

      /* NEW USERS TODAY */
      const newUsersToday =
        usersData?.filter((u: any) => {
          return (
            new Date(u.created_at) >= startToday
          );
        }).length || 0;

      /* ACTIVE USERS */
      const { count: activeUsers } =
        await supabase
          .from("analytics_events")
          .select("*", {
            count: "exact",
            head: true,
          });

      /* ITEMS */
      const { count: items } =
        await supabase
          .from("items_live")
          .select("*", {
            count: "exact",
            head: true,
          });

      /* GROWTH */
      let growth: number[] = [];

      for (let d of last7) {
        const start = new Date(d);
        const end = new Date(d);
        end.setHours(23, 59, 59);

        const count =
          usersData?.filter((u: any) => {
            const date = new Date(
              u.created_at
            );

            return (
              date >= start &&
              date <= end
            );
          }).length || 0;

        growth.push(count);
      }

      /* FRAUD DETECTOR */
      const suspiciousUsers =
        usersData?.filter((u: any) => {
          return (
            !u.phone_verified ||
            !u.phone ||
            u.phone.length < 8
          );
        }) || [];

      const fraudScore =
        users > 0
          ? suspiciousUsers.length / users
          : 0;

      const trustScore =
        Math.max(0, 1 - fraudScore);

      /* REVENUE */
      const revenue = (items || 0) * 300;

      const arpu =
        users > 0
          ? revenue / users
          : 0;

      /* FUNDING SCORE */
      const fundingScore =
        calculateFundingScore({
          users,
          revenue,
          trustScore,
        });

      /* VALUATION */
      const valuation =
        Math.round(
          revenue * 40 +
            users * 3
        );

      /* AI PITCH */
      const pitch =
        generatePitch({
          users,
          revenue,
          trustScore,
        });

      setData({
        users,
        newUsersToday,
        activeUsers,
        items,

        revenue,
        arpu,

        growth,
        labels: last7.map((d) =>
          d.slice(5)
        ),

        fraudScore,
        trustScore,

        fundingScore,
        valuation,

        suspiciousUsers,
        latestUsers:
          usersData?.slice(0, 20) || [],

        pitch,
      });
    } catch (e) {
      console.log(
        "Analytics error:",
        e
      );
    } finally {
      setLoading(false);
    }
  };

  const generatePitchPDF =
    async () => {
      const html = `
      <html>
      <body>
        <h1>Nasara Investor Report</h1>

        <p>Total Users: ${data.users}</p>
        <p>New Users Today: ${data.newUsersToday}</p>
        <p>Revenue: GH₵ ${data.revenue}</p>
        <p>Trust Score: ${data.trustScore}</p>
        <p>Fraud Score: ${data.fraudScore}</p>
        <p>Valuation: GH₵ ${data.valuation}</p>

        <h2>Latest Users</h2>
        ${data.latestUsers
          .map(
            (u: any) =>
              <p>${u.full_name} - ${u.phone}</p>
          )
          .join("")}

      </body>
      </html>
      `;

      const { uri } =
        await Print.printToFileAsync({
          html,
        });

      await Sharing.shareAsync(uri);
    };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>
        📊 NASARA ANALYTICS
      </Text>

      <View style={styles.grid}>
        <Card
          title="Users"
          value={data.users}
        />

        <Card
          title="New Today"
          value={data.newUsersToday}
        />

        <Card
          title="Revenue"
          value={`GH₵ ${data.revenue}`}
        />

        <Card
          title="Valuation"
          value={`GH₵ ${data.valuation}`}
        />
      </View>

      <LineChart
        data={{
          labels: data.labels,
          datasets: [
            {
              data:
                data.growth,
            },
          ],
        }}
        width={screenWidth - 40}
        height={220}
        chartConfig={{
          backgroundGradientFrom:
            "#020617",
          backgroundGradientTo:
            "#020617",
          color: (o = 1) =>
            `rgba(34,197,94,${o})`,
        }}
        bezier
      />

      <View style={styles.box}>
        <Text style={styles.white}>
          Fraud Score:{" "}
          {(
            data.fraudScore *
            100
          ).toFixed(1)}
          %
        </Text>

        <Text style={styles.white}>
          Trust Score:{" "}
          {(
            data.trustScore *
            100
          ).toFixed(1)}
          %
        </Text>
      </View>

      <View style={styles.box}>
        <Text style={styles.white}>
          Latest Users
        </Text>

        {data.latestUsers.map(
          (u: any) => (
            <View
              key={u.id}
              style={{
                marginTop: 8,
              }}
            >
              <Text
                style={
                  styles.text
                }
              >
                {u.full_name}
              </Text>

              <Text
                style={
                  styles.text
                }
              >
                {u.phone}
              </Text>
            </View>
          )
        )}
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={
          generatePitchPDF
        }
      >
        <Text
          style={
            styles.buttonText
          }
        >
          📄 Export Report
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function calculateFundingScore(
  d: any
) {
  let score = 80;

  if (d.users > 100) score += 10;
  if (d.revenue > 500) score += 10;
  if (d.trustScore > 0.8)
    score += 10;

  return Math.min(100, score);
}

function generatePitch(d: any) {
  return `Nasara has ${d.users} users and growing with strong marketplace activity and monetization potential.;`
}

function Card({
  title,
  value,
}: any) {
  return (
    <View style={styles.card}>
      <Text style={styles.sub}>
        {title}
      </Text>
      <Text style={styles.white}>
        {value}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#020617",
      padding: 20,
    },

    title: {
      color: "#22c55e",
      fontSize: 20,
      marginBottom: 20,
    },

    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },

    card: {
      backgroundColor:
        "#0f172a",
      padding: 10,
      borderRadius: 10,
      width: "48%",
    },

    sub: {
      color: "#9ca3af",
    },

    white: {
      color: "#fff",
    },

    text: {
      color: "#cbd5e1",
    },

    box: {
      backgroundColor:
        "#0f172a",
      padding: 12,
      borderRadius: 10,
      marginTop: 15,
    },

    button: {
      backgroundColor:
        "#22c55e",
      padding: 12,
      borderRadius: 10,
      marginTop: 20,
      alignItems:
        "center",
    },

    buttonText: {
      color: "#000",
      fontWeight: "bold",
    },

    center: {
      flex: 1,
      justifyContent:
        "center",
      alignItems:
        "center",
    },
  });