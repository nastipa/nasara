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

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { supabase } from "../../lib/supabase";

const screenWidth =
  Dimensions.get("window").width;

export default function Analytics() {
  const [loading, setLoading] =
    useState(true);

  const [data, setData] =
    useState<any>({
      users: 0,
      newUsersToday: 0,

      dau: 0,
      wau: 0,
      mau: 0,

      stickiness: 0,

      activeUsers: 0,

      items: 0,
      liveStreams: 0,
      battles: 0,

      revenue: 0,

      boostRevenue: 0,
      adsRevenue: 0,
      battleRevenue: 0,
      verificationRevenue: 0,

      arpu: 0,

      growth: [],
      labels: [],

      fraudScore: 0,
      trustScore: 0,

      fundingScore: 0,
      valuation: 0,

      suspiciousUsers: [],
      latestUsers: [],

      topUsers: [],

      reports: 0,
      bannedUsers: 0,

      pitch: "",
    });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics =
    async () => {
      try {
        setLoading(true);

        const today = new Date();

        const startToday =
          new Date();

        startToday.setHours(
          0,
          0,
          0,
          0
        );

        const sevenDaysAgo =
          new Date();

        sevenDaysAgo.setDate(
          today.getDate() - 7
        );

        const thirtyDaysAgo =
          new Date();

        thirtyDaysAgo.setDate(
          today.getDate() - 30
        );

        const last7: string[] =
          [];

        for (
          let i = 6;
          i >= 0;
          i--
        ) {
          const d = new Date();

          d.setDate(
            today.getDate() - i
          );

          last7.push(
            d
              .toISOString()
              .split("T")[0]
          );
        }

        /* ================= USERS ================= */

        const {
          data: usersData,
        } = await supabase
          .from("profiles")
          .select(`
            id,
            full_name,
            phone,
            created_at,
            phone_verified,
            coins
          `)
          .order("created_at", {
            ascending: false,
          });

        const users =
          usersData?.length || 0;

        const newUsersToday =
          usersData?.filter(
            (u: any) => {
              return (
                new Date(
                  u.created_at
                ) >= startToday
              );
            }
          ).length || 0;

        /* ================= EVENTS ================= */

        const {
          data: analyticsData,
        } = await supabase
          .from("analytics_events")
          .select(`
            user_id,
            created_at
          `);

        const activeUsers =
          analyticsData?.length ||
          0;

        /* ================= DAU ================= */

        const dauUsers =
          new Set(
            analyticsData
              ?.filter(
                (e: any) =>
                  new Date(
                    e.created_at
                  ) >= startToday
              )
              .map(
                (e: any) =>
                  e.user_id
              )
          );

        const dau =
          dauUsers.size || 0;

        /* ================= WAU ================= */

        const wauUsers =
          new Set(
            analyticsData
              ?.filter(
                (e: any) =>
                  new Date(
                    e.created_at
                  ) >=
                  sevenDaysAgo
              )
              .map(
                (e: any) =>
                  e.user_id
              )
          );

        const wau =
          wauUsers.size || 0;

        /* ================= MAU ================= */

        const mauUsers =
          new Set(
            analyticsData
              ?.filter(
                (e: any) =>
                  new Date(
                    e.created_at
                  ) >=
                  thirtyDaysAgo
              )
              .map(
                (e: any) =>
                  e.user_id
              )
          );

        const mau =
          mauUsers.size || 0;

        const stickiness =
          mau > 0
            ? (
                (dau / mau) *
                100
              ).toFixed(1)
            : 0;

        /* ================= ITEMS ================= */

        const {
          count: items,
        } = await supabase
          .from("items_live")
          .select("*", {
            count: "exact",
            head: true,
          });

        /* ================= LIVE STREAMS ================= */

        const {
          count: liveStreams,
        } = await supabase
          .from("live_streams")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("status", "live");

        /* ================= BATTLES ================= */

        const {
          count: battles,
        } = await supabase
          .from("battles")
          .select("*", {
            count: "exact",
            head: true,
          });

        /* ================= REPORTS ================= */

        const {
          count: reports,
        } = await supabase
          .from("reports")
          .select("*", {
            count: "exact",
            head: true,
          });

        /* ================= BANNED USERS ================= */

        const {
          count: bannedUsers,
        } = await supabase
          .from("profiles")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("banned", true);

        /* ================= GROWTH ================= */

        let growth: number[] =
          [];

        for (let d of last7) {
          const start =
            new Date(d);

          const end =
            new Date(d);

          end.setHours(
            23,
            59,
            59
          );

          const count =
            usersData?.filter(
              (u: any) => {
                const date =
                  new Date(
                    u.created_at
                  );

                return (
                  date >=
                    start &&
                  date <= end
                );
              }
            ).length || 0;

          growth.push(count);
        }

        /* ================= FRAUD ================= */

        const suspiciousUsers =
          usersData?.filter(
            (u: any) => {
              return (
                !u.phone_verified ||
                !u.phone ||
                u.phone.length <
                  8
              );
            }
          ) || [];

        const fraudScore =
          users > 0
            ? suspiciousUsers.length /
              users
            : 0;

        const trustScore =
          Math.max(
            0,
            1 - fraudScore
          );

        /* ================= REVENUE ================= */

        const boostRevenue =
          (items || 0) * 50;

        const adsRevenue =
          users * 3;

        const battleRevenue =
          (battles || 0) * 20;

        const verificationRevenue =
          users * 5;

        const revenue =
          boostRevenue +
          adsRevenue +
          battleRevenue +
          verificationRevenue;

        const arpu =
          users > 0
            ? revenue / users
            : 0;

        /* ================= TOP USERS ================= */

        const topUsers =
          [...(usersData || [])]
            .sort(
              (
                a: any,
                b: any
              ) =>
                (b.coins ||
                  0) -
                (a.coins || 0)
            )
            .slice(0, 5);

        /* ================= FUNDING SCORE ================= */

        const fundingScore =
          calculateFundingScore(
            {
              users,
              revenue,
              trustScore,
              dau,
            }
          );

        /* ================= VALUATION ================= */

// base startup valuation model
let valuationUSD = 2000000; // minimum $2M floor

// user growth value
valuationUSD += users * 1200;

// daily active value
valuationUSD += dau * 3500;

// monthly active value
valuationUSD += mau * 1800;

// marketplace inventory
valuationUSD += (items || 0) * 900;

// live platform bonus
valuationUSD += (liveStreams || 0) * 5000;

// battle engagement bonus
valuationUSD += (battles || 0) * 3000;

// revenue multiplier
valuationUSD += revenue * 18;

// trust score multiplier
valuationUSD += trustScore * 800000;

// cap realistic range
if (valuationUSD > 8500000) {
  valuationUSD = 8500000;
}

const usdToGhs = 15.5;

const valuation = Math.round(
  valuationUSD * usdToGhs
);

const valuationText = `$${Math.round(
  valuationUSD
).toLocaleString()} (~GH₵ ${valuation.toLocaleString()})`;

        /* ================= PITCH ================= */

        const pitch =
          generatePitch({
            users,
            revenue,
            trustScore,
            dau,
          });

        setData({
          users,
          newUsersToday,

          dau,
          wau,
          mau,

          stickiness,

          activeUsers,

          items,
          liveStreams,
          battles,

          revenue,

          boostRevenue,
          adsRevenue,
          battleRevenue,
          verificationRevenue,

          arpu,

          growth,

          labels: last7.map(
            (d) =>
              d.slice(5)
          ),

          fraudScore,
          trustScore,

          fundingScore,
          valuation,
          valuationText,
          suspiciousUsers,
          latestUsers:
            usersData?.slice(
              0,
              20
            ) || [],

          topUsers,

          reports,
          bannedUsers,

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

  /* ================= EXPORT PDF ================= */

  const generatePitchPDF =
    async () => {
      const html = `
      <html>
      <body style="font-family:sans-serif;padding:20px;">
        <h1>Nasara Investor Report</h1>

        <h2>Core Metrics</h2>

        <p>Total Users: ${data.users}</p>
        <p>DAU: ${data.dau}</p>
        <p>WAU: ${data.wau}</p>
        <p>MAU: ${data.mau}</p>

        <p>Revenue: GH₵ ${data.revenue}</p>

        <p>Valuation: GH₵ ${data.valuation}</p>

        <h2>Trust</h2>

        <p>Trust Score: ${(
          data.trustScore *
          100
        ).toFixed(1)}%</p>

        <p>Fraud Score: ${(
          data.fraudScore *
          100
        ).toFixed(1)}%</p>

        <h2>Revenue Breakdown</h2>

        <p>Boost Revenue: GH₵ ${data.boostRevenue}</p>

        <p>Ads Revenue: GH₵ ${data.adsRevenue}</p>

        <p>Battle Revenue: GH₵ ${data.battleRevenue}</p>

        <p>Verification Revenue: GH₵ ${data.verificationRevenue}</p>

        <h2>Top Users</h2>

        ${data.topUsers
          .map(
            (u: any) =>
              <p>${u.full_name}</p>
          )
          .join("")}

      </body>
      </html>
      `;

      const { uri } =
        await Print.printToFileAsync(
          {
            html,
          }
        );

      await Sharing.shareAsync(
        uri
      );
    };

  if (loading) {
    return (
      <View
        style={styles.center}
      >
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
    >
      <Text style={styles.title}>
        📊 NASARA ANALYTICS
      </Text>

      {/* ================= MAIN ================= */}

      <View style={styles.grid}>
        <Card
          title="Users"
          value={data.users}
        />

        <Card
          title="New Today"
          value={
            data.newUsersToday
          }
        />

        <Card
          title="Revenue"
          value={`GH₵ ${data.revenue}`}
        />

       <Card
  title="Valuation"
  value={data.valuationText}
/>
      </View>

      {/* ================= DAU WAU MAU ================= */}

      <Text style={styles.section}>
        Engagement
      </Text>

      <View style={styles.grid}>
        <Card
          title="DAU"
          value={data.dau}
        />

        <Card
          title="WAU"
          value={data.wau}
        />

        <Card
          title="MAU"
          value={data.mau}
        />

        <Card
          title="Stickiness"
          value={`${data.stickiness}%`}
        />
      </View>

      {/* ================= LIVE ================= */}

      <Text style={styles.section}>
        Live Metrics
      </Text>

      <View style={styles.grid}>
        <Card
          title="Live Streams"
          value={
            data.liveStreams
          }
        />

        <Card
          title="Battles"
          value={data.battles}
        />

        <Card
          title="Reports"
          value={data.reports}
        />

        <Card
          title="Banned"
          value={
            data.bannedUsers
          }
        />
      </View>

      {/* ================= CHART ================= */}

      <Text style={styles.section}>
        User Growth
      </Text>

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
        width={
          screenWidth - 40
        }
        height={220}
        chartConfig={{
          backgroundGradientFrom:
            "#020617",

          backgroundGradientTo:
            "#020617",

          color: (
            o = 1
          ) =>
            `rgba(34,197,94,${o})`,
        }}
        bezier
      />

      {/* ================= TRUST ================= */}

      <View style={styles.box}>
        <Text
          style={styles.white}
        >
          Fraud Score:{" "}
          {(
            data.fraudScore *
            100
          ).toFixed(1)}
          %
        </Text>

        <Text
          style={styles.white}
        >
          Trust Score:{" "}
          {(
            data.trustScore *
            100
          ).toFixed(1)}
          %
        </Text>

        <Text
          style={styles.white}
        >
          Funding Score:{" "}
          {
            data.fundingScore
          }
          /100
        </Text>
      </View>

      {/* ================= REVENUE ================= */}

      <Text style={styles.section}>
        Revenue Breakdown
      </Text>

      <View style={styles.grid}>
        <Card
          title="Boost"
          value={`GH₵ ${data.boostRevenue}`}
        />

        <Card
          title="Ads"
          value={`GH₵ ${data.adsRevenue}`}
        />

        <Card
          title="Battles"
          value={`GH₵ ${data.battleRevenue}`}
        />

        <Card
          title="Verify"
          value={`GH₵ ${data.verificationRevenue}`}
        />
      </View>

      {/* ================= TOP USERS ================= */}

      <View style={styles.box}>
        <Text
          style={styles.white}
        >
          🏆 Top Users
        </Text>

        {data.topUsers.map(
          (u: any) => (
            <View
              key={u.id}
              style={{
                marginTop: 10,
              }}
            >
              <Text
                style={
                  styles.text
                }
              >
                {
                  u.full_name
                }
              </Text>
            </View>
          )
        )}
      </View>

      {/* ================= LATEST USERS ================= */}

      <View style={styles.box}>
        <Text
          style={styles.white}
        >
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
                {
                  u.full_name
                }
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

      {/* ================= EXPORT ================= */}

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
  let score = 70;

  if (d.users > 100)
    score += 10;

  if (d.revenue > 500)
    score += 10;

  if (d.trustScore > 0.8)
    score += 10;

  if (d.dau > 20)
    score += 10;

  return Math.min(
    100,
    score
  );
}

function generatePitch(
  d: any
) {
  return `
  Nasara has ${d.users} users,
  ${d.dau} daily active users,
  and growing monetization with
  strong creator economy potential.
  `;
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
      fontWeight: "bold",
      marginBottom: 20,
    },

    section: {
      color: "#fff",
      fontSize: 18,
      marginTop: 20,
      marginBottom: 10,
      fontWeight: "bold",
    },

    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent:
        "space-between",
    },

    card: {
      backgroundColor:
        "#0f172a",

      padding: 14,

      borderRadius: 12,

      width: "48%",

      marginBottom: 12,
    },

    sub: {
      color: "#9ca3af",
      marginBottom: 6,
    },

    white: {
      color: "#fff",
      fontWeight: "bold",
    },

    text: {
      color: "#cbd5e1",
    },

    box: {
      backgroundColor:
        "#0f172a",

      padding: 14,

      borderRadius: 12,

      marginTop: 15,
    },

    button: {
      backgroundColor:
        "#22c55e",

      padding: 14,

      borderRadius: 12,

      marginTop: 20,

      alignItems:
        "center",

      marginBottom: 50,
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

      backgroundColor:
        "#020617",
    },
  });