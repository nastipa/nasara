import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";
import { useAdmin } from "../../lib/useAdmin";

export default function AdminAnalytics() {
  const router = useRouter();
  const isAdmin = useAdmin();

  const [loading, setLoading] = useState(true);

  /* ================= ITEMS ================= */
  const [totalItems, setTotalItems] = useState(0);
  const [itemsToday, setItemsToday] = useState(0);

  /* ================= APPROVAL COUNTS ================= */
  const [adsToday, setAdsToday] = useState(0);
  const [bannersToday, setBannersToday] = useState(0);
  const [boostToday, setBoostToday] = useState(0);
  const [promoToday, setPromoToday] = useState(0);

  /* ================= REVENUE ================= */
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [weeklyRevenue, setWeeklyRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);

  /* ================= EXTRA INSIGHTS ================= */
  const [topUser, setTopUser] = useState<string>("None");
  const [topCategory, setTopCategory] = useState<string>("None");

  /* ================= HELPERS ================= */
  const getRevenue = async (table: string, fromDate: string) => {
    const { data } = await supabase
      .from(table)
      .select("amount")
      .gte("approved_at", fromDate);

    return (
      data?.reduce(
        (sum: number, row: any) => sum + Number(row.amount || 0),
        0
      ) || 0
    );
  };

  /* ================= LOAD ANALYTICS ================= */
  const loadAnalytics = async () => {
    setLoading(true);

    try {
      /* ================= DATES ================= */
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - 7);

      const startOfMonth = new Date();
      startOfMonth.setDate(startOfMonth.getDate() - 30);

      const todayISO = startOfToday.toISOString();
      const weekISO = startOfWeek.toISOString();
      const monthISO = startOfMonth.toISOString();

      /* ================= TOTAL ITEMS ================= */
      const { count: totalCount } = await supabase
        .from("items_live")
        .select("*", { count: "exact", head: true });

      setTotalItems(totalCount || 0);

      /* ================= ITEMS TODAY ================= */
      const { count: todayCount } = await supabase
        .from("items_live")
        .select("*", { count: "exact", head: true })
        .gte("created_at", todayISO);

      setItemsToday(todayCount || 0);

      /* ================= APPROVED TODAY ================= */
      const { count: adsCount } = await supabase
        .from("ads")
        .select("*", { count: "exact", head: true })
        .gte("approved_at", todayISO);

      const { count: bannerCount } = await supabase
        .from("banner")
        .select("*", { count: "exact", head: true })
        .gte("approved_at", todayISO);

      const { count: boostCount } = await supabase
        .from("boost_request")
        .select("*", { count: "exact", head: true })
        .gte("approved_at", todayISO);

      const { count: promoCount } = await supabase
        .from("promoted")
        .select("*", { count: "exact", head: true })
        .gte("approved_at", todayISO);

      setAdsToday(adsCount || 0);
      setBannersToday(bannerCount || 0);
      setBoostToday(boostCount || 0);
      setPromoToday(promoCount || 0);

      /* ================= REVENUE ================= */
      const todayTotal =
        (await getRevenue("ads", todayISO)) +
        (await getRevenue("banner", todayISO)) +
        (await getRevenue("boost_request", todayISO)) +
        (await getRevenue("promoted", todayISO));

      const weekTotal =
        (await getRevenue("ads", weekISO)) +
        (await getRevenue("banner", weekISO)) +
        (await getRevenue("boost_request", weekISO)) +
        (await getRevenue("promoted", weekISO));

      const monthTotal =
        (await getRevenue("ads", monthISO)) +
        (await getRevenue("banner", monthISO)) +
        (await getRevenue("boost_request", monthISO)) +
        (await getRevenue("promoted", monthISO));

      setTodayRevenue(todayTotal);
      setWeeklyRevenue(weekTotal);
      setMonthlyRevenue(monthTotal);

      /* ================= TOP PAYING USER ================= */
      const { data: topPay } = await (supabase as any)
        .from("ads")
        .select("user_id, amount")
        .order("amount", { ascending: false })
        .limit(1);

      if (topPay && topPay.length > 0) {
        setTopUser(topPay[0].user_id);
      }

      /* ================= BEST CATEGORY ================= */
      const { data: catData } = await supabase
        .from("items_live")
        .select("category");

      if (catData) {
        const counts: Record<string, number> = {};

        catData.forEach((row: any) => {
          if (!row.category) return;
          counts[row.category] = (counts[row.category] || 0) + 1;
        });

        const best = Object.keys(counts).sort(
          (a, b) => counts[b] - counts[a]
        )[0];

        if (best) setTopCategory(best);
      }
    } catch (err: any) {
      console.log("ANALYTICS ERROR:", err.message);
    }

    setLoading(false);
  };

  /* ================= RUN ================= */
  useEffect(() => {
    if (isAdmin) loadAnalytics();
  }, [isAdmin]);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  /* ================= UI ================= */
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📊 Admin Analytics</Text>

      {/* ITEMS */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📦 Items</Text>
        <Text>Total Items Posted: {totalItems}</Text>
        <Text>Items Posted Today: {itemsToday}</Text>
      </View>

      {/* APPROVED TODAY */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>✅ Approved Today</Text>
        <Text>Ads: {adsToday}</Text>
        <Text>Banners: {bannersToday}</Text>
        <Text>Boost: {boostToday}</Text>
        <Text>Promoted: {promoToday}</Text>
      </View>

      {/* REVENUE */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>💰 Revenue (GHS)</Text>
        <Text>Today: GHS {todayRevenue}</Text>
        <Text>This Week: GHS {weeklyRevenue}</Text>
        <Text>This Month: GHS {monthlyRevenue}</Text>
      </View>

      {/* EXTRA INSIGHTS */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>⭐ Insights</Text>
        <Text>Top Paying User: {topUser}</Text>
        <Text>Best Selling Category: {topCategory}</Text>
      </View>

      {/* BACK */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.replace("/(admin)")}
      >
        <Text style={styles.backText}>⬅ Back to Admin Dashboard</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f9fafb",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  card: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#eee",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  backBtn: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#111827",
    marginTop: 10,
  },
  backText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
  },
});