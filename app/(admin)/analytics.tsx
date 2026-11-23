import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { supabase } from "../../lib/supabase";

const screenWidth = Dimensions.get("window").width;

const COLORS = {
  background: "#071426",
  surface: "#10233D",
  surfaceLight: "#162D4B",
  gold: "#D9AD52",
  goldLight: "#F2D28B",
  white: "#FFFFFF",
  muted: "#A8B6C9",
  border: "#263D59",
  green: "#36C98F",
  red: "#F87171",
};

const initialData: any = {
  users: 0,
  newUsersToday: 0,
  dau: 0,
  wau: 0,
  mau: 0,
  stickiness: 0,

  revenue: 0,
  valuation: 0,
  valuationText: "Requires financial assessment",

  reels: 0,
  liveStreams: 0,
  groups: 0,
  messages: 0,
  statuses: 0,

  items: 0,
  verifiedSellers: 0,
  offers: 0,
  auctions: 0,
  ads: 0,
  banners: 0,
  promotions: 0,
  boosts: 0,

  farms: 0,
  verifiedFarms: 0,
  farmProducts: 0,

  deliveries: 0,
  deliveryRevenue: 0,

  hospitals: 0,
  patients: 0,
  hospitalBookings: 0,
  emergencySearches: 0,

  restaurantOwners: 0,

  publicBattles: 0,
  elections: 0,
  candidates: 0,
  votes: 0,

  mentors: 0,
  students: 0,
  sessions: 0,

  reports: 0,
  blockedUsers: 0,
  fraudScore: 0,
  trustScore: 0,

  referrals: 0,

  adsRevenue: 0,
  boostRevenue: 0,
  promotionRevenue: 0,
  auctionRevenue: 0,
};

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(initialData);

  const countTable = async (table: string): Promise<number> => {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });

    if (error) {
      console.log(`Analytics count error (${table}):`, error.message);
      return 0;
    }

    return count || 0;
  };

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);

      // ==========================================
      // USERS
      // ==========================================

      const {
        data: usersData,
        error: usersError,
      } = await supabase
        .from("profiles")
        .select("id, created_at, phone_verified");

      if (usersError) throw usersError;

      const profiles = usersData || [];
      const users = profiles.length;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const newUsersToday = profiles.filter(
        (user: any) =>
          user.created_at &&
          new Date(user.created_at) >= today
      ).length;

      // ==========================================
      // ENGAGEMENT
      // ==========================================

      const {
        data: events,
        error: eventsError,
      } = await supabase
        .from("analytics_events")
        .select("user_id, created_at");

      if (eventsError) {
        console.log("Analytics events:", eventsError.message);
      }

      const eventRows = events || [];

      const sevenDays = new Date();
      sevenDays.setDate(sevenDays.getDate() - 7);

      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() - 30);

      const dau = new Set(
        eventRows
          .filter(
            (event: any) =>
              event.user_id &&
              event.created_at &&
              new Date(event.created_at) >= today
          )
          .map((event: any) => event.user_id)
      ).size;

      const wau = new Set(
        eventRows
          .filter(
            (event: any) =>
              event.user_id &&
              event.created_at &&
              new Date(event.created_at) >= sevenDays
          )
          .map((event: any) => event.user_id)
      ).size;

      const mau = new Set(
        eventRows
          .filter(
            (event: any) =>
              event.user_id &&
              event.created_at &&
              new Date(event.created_at) >= thirtyDays
          )
          .map((event: any) => event.user_id)
      ).size;

      const stickiness = mau
        ? Number(((dau / mau) * 100).toFixed(1))
        : 0;

      // ==========================================
      // SOCIAL PLATFORM
      // ==========================================

      const [
        reels,
        liveStreams,
        groups,
        messages,
        statuses,
      ] = await Promise.all([
        countTable("posts"),
        countTable("live_streams"),
        countTable("groups"),
        countTable("messages"),
        countTable("statuses"),
      ]);

      // ==========================================
      // MARKETPLACE
      // ==========================================

      const [
        items,
        ads,
        banners,
        promotions,
        boosts,
        auctions,
        offers,
      ] = await Promise.all([
        countTable("items_live"),
        countTable("ads"),
        countTable("banner"),
        countTable("promoted"),
        countTable("boosted"),
        countTable("auctions"),
        countTable("offers"),
      ]);

      // ==========================================
      // VERIFIED PHONE PROFILES
      // ==========================================

      const {
        count: sellerCount,
        error: sellerError,
      } = await supabase
        .from("profiles")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("phone_verified", true);

      if (sellerError) {
        console.log(
          "Verified phone profiles:",
          sellerError.message
        );
      }

      const verifiedSellers = sellerCount || 0;

      // ==========================================
      // AGRICULTURE
      // ==========================================

      const [
        farms,
        farmProducts,
      ] = await Promise.all([
        countTable("farm_profiles"),
        countTable("farm_products"),
      ]);

      const {
        count: verifiedFarmCount,
        error: verifiedFarmError,
      } = await supabase
        .from("farm_profiles")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("verified", true);

      if (verifiedFarmError) {
        console.log(
          "Verified farms:",
          verifiedFarmError.message
        );
      }

      const verifiedFarms = verifiedFarmCount || 0;

      // ==========================================
      // DELIVERY
      // ==========================================

      const deliveries = await countTable("deliveries");

      const {
        data: deliveryData,
        error: deliveryError,
      } = await supabase
        .from("deliveries")
        .select("amount, payment_status");

      if (deliveryError) {
        console.log(
          "Delivery revenue:",
          deliveryError.message
        );
      }

      const deliveryRevenue = (deliveryData || [])
        .filter((item: any) => {
          const status = String(
            item.payment_status || ""
          ).toLowerCase();

          return [
            "paid",
            "completed",
            "verified",
            "successful",
          ].includes(status);
        })
        .reduce(
          (sum: number, item: any) =>
            sum + Number(item.amount || 0),
          0
        );

      // ==========================================
      // HEALTH
      // ==========================================

      const [
        hospitals,
        patients,
        hospitalBookings,
        emergencySearches,
      ] = await Promise.all([
        countTable("hospitals"),
        countTable("patients"),
        countTable("hospital_bookings"),
        countTable("emergency_requests"),
      ]);

      // ==========================================
      // RESTAURANT OWNERS
      // ==========================================

      const restaurantOwners = await countTable(
        "restaurant_owners"
      );

      // ==========================================
      // ELECTIONS
      // ==========================================

      const [
        publicBattles,
        elections,
        candidates,
        votes,
      ] = await Promise.all([
        countTable("battles"),
        countTable("elections"),
        countTable("candidates"),
        countTable("votes"),
      ]);

      // ==========================================
      // MENTORSHIP
      // ==========================================

      const [
        mentors,
        students,
        sessions,
      ] = await Promise.all([
        countTable("mentors"),
        countTable("mentorship_students"),
        countTable("mentorship_sessions"),
      ]);

      // ==========================================
      // TRUST & SAFETY
      // ==========================================

      const [
        reports,
        blockedUsers,
        referrals,
      ] = await Promise.all([
        countTable("reports"),
        countTable("blocked_users"),
        countTable("referrals"),
      ]);

      const suspiciousUsers = profiles.filter(
        (user: any) => !user.phone_verified
      ).length;

      const fraudScore = users
        ? Number(
            ((suspiciousUsers / users) * 100).toFixed(1)
          )
        : 0;

      const trustScore = Math.max(0, 100 - fraudScore);

      // ==========================================
      // REVENUE ENGINE
      // ==========================================

      // These are activity-based estimates,
      // not confirmed payment receipts.

      const adsRevenue = ads * 3;
      const boostRevenue = boosts * 20;
      const promotionRevenue = promotions * 50;
      const auctionRevenue = auctions * 10;

      const revenue =
        adsRevenue +
        boostRevenue +
        promotionRevenue +
        auctionRevenue +
        deliveryRevenue;

      // ==========================================
      // INVESTOR VALUATION ROADMAP
      // ==========================================

      // Strategic milestones, not current verified
      // company valuations.

      const valuation = 0;

      const valuationText =
        "National-scale ambition: US$500M+";

      // ==========================================
      // FINAL STATE UPDATE
      // ==========================================

      setData({
        users,
        newUsersToday,

        dau,
        wau,
        mau,
        stickiness,

        revenue,
        valuation,
        valuationText,

        reels,
        liveStreams,
        groups,
        messages,
        statuses,

        items,
        verifiedSellers,
        offers,
        auctions,
        ads,
        banners,
        promotions,
        boosts,

        farms,
        verifiedFarms,
        farmProducts,

        deliveries,
        deliveryRevenue,

        hospitals,
        patients,
        hospitalBookings,
        emergencySearches,

        restaurantOwners,

        publicBattles,
        elections,
        candidates,
        votes,

        mentors,
        students,
        sessions,

        reports,
        blockedUsers,
        fraudScore,
        trustScore,

        referrals,

        adsRevenue,
        boostRevenue,
        promotionRevenue,
        auctionRevenue,
      });
    } catch (error: any) {
      console.log(
        "Analytics error:",
        error?.message || error
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // ==========================================
  // INVESTOR PDF
  // ==========================================

  const generatePitchPDF = async () => {
    const html = `
      <html>
      <body style="
        font-family:Arial;
        padding:30px;
        color:#10233D;
      ">

        <h1 style="color:#10233D;">
          NASARA INVESTOR REPORT
        </h1>

        <p>
          Digital Marketplace and Social Ecosystem
        </p>

        <h2>Executive Overview</h2>

        <p>Registered Users: ${data.users}</p>
        <p>New Users Today: ${data.newUsersToday}</p>
        <p>Daily Active Users: ${data.dau}</p>
        <p>Weekly Active Users: ${data.wau}</p>
        <p>Monthly Active Users: ${data.mau}</p>
        <p>Engagement Stickiness: ${data.stickiness}%</p>

        <h2>Marketplace</h2>

        <p>Products: ${data.items}</p>
        <p>Verified Phone Profiles: ${data.verifiedSellers}</p>
        <p>Advertisements: ${data.ads}</p>
        <p>Banners: ${data.banners}</p>
        <p>Promotions: ${data.promotions}</p>
        <p>Boosts: ${data.boosts}</p>
        <p>Auctions: ${data.auctions}</p>
        <p>Offers: ${data.offers}</p>

        <h2>Business Verticals</h2>

        <p>Restaurant Owners: ${data.restaurantOwners}</p>
        <p>Farms: ${data.farms}</p>
        <p>Verified Farms: ${data.verifiedFarms}</p>
        <p>Farm Products: ${data.farmProducts}</p>
        <p>Hospitals: ${data.hospitals}</p>
        <p>Patients: ${data.patients}</p>
        <p>Hospital Bookings: ${data.hospitalBookings}</p>
        <p>Emergency Requests: ${data.emergencySearches}</p>

        <h2>Delivery</h2>

        <p>Delivery Requests: ${data.deliveries}</p>
        <p>Recorded Paid Delivery Revenue: GH₵ ${data.deliveryRevenue}</p>

        <h2>Social Platform</h2>

        <p>Posts: ${data.reels}</p>
        <p>Live Streams: ${data.liveStreams}</p>
        <p>Groups: ${data.groups}</p>
        <p>Messages: ${data.messages}</p>
        <p>Statuses: ${data.statuses}</p>

        <h2>Other Services</h2>

        <p>Public Battles: ${data.publicBattles}</p>
        <p>Elections: ${data.elections}</p>
        <p>Candidates: ${data.candidates}</p>
        <p>Votes: ${data.votes}</p>
        <p>Mentors: ${data.mentors}</p>
        <p>Students: ${data.students}</p>
        <p>Mentorship Sessions: ${data.sessions}</p>

        <h2>Revenue Overview</h2>

        <p>Estimated Ads Value: GH₵ ${data.adsRevenue}</p>
        <p>Estimated Boost Value: GH₵ ${data.boostRevenue}</p>
        <p>Estimated Promotion Value: GH₵ ${data.promotionRevenue}</p>
        <p>Estimated Auction Value: GH₵ ${data.auctionRevenue}</p>
        <p>Recorded Paid Delivery Revenue: GH₵ ${data.deliveryRevenue}</p>

        <h3>
          Total Indicative Revenue: GH₵ ${data.revenue}
        </h3>

        <p>
          Financial note: Advertising, boosts, promotions
          and auctions are estimated from activity counts,
          not confirmed payments. They should not be
          presented as audited revenue.
        </p>

        <h2>Nasara Investor Valuation Roadmap</h2>

        <h3>Early Stage: US$10M – US$30M</h3>

        <h3>Strong Ghana Traction: US$50M – US$150M</h3>

        <h2 style="color:#B8862B;">
          National-Scale Ambition: US$500M+
        </h2>

        <p>
          Nasara's long-term ambition is to become a
          nationally adopted digital marketplace and
          social ecosystem, connecting commerce,
          agriculture, healthcare, restaurants, delivery,
          mentorship and digital services.
        </p>

        <p>
          These figures represent strategic valuation
          milestones and future ambitions, not independently
          verified current company valuations.
        </p>

        <h2>Trust and Safety</h2>

        <p>Trust Indicator: ${data.trustScore}%</p>
        <p>Unverified Phone Profiles: ${data.fraudScore}%</p>
        <p>Reports: ${data.reports}</p>
        <p>Blocked Users: ${data.blockedUsers}</p>

        <hr />

        <p>
          NASARA — Digital Marketplace and Social Ecosystem
        </p>

      </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({
        html,
      });

      await Sharing.shareAsync(uri);
    } catch (error) {
      console.log("Investor PDF error:", error);
    }
  };

  // ==========================================
  // REUSABLE UI COMPONENTS
  // ==========================================

  function Section({
    title,
    children,
  }: any) {
    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>
          {title}
        </Text>

        {children}
      </View>
    );
  }

  function Card({
    title,
    value,
    accent,
  }: any) {
    return (
      <View style={styles.card}>
        <View
          style={[
            styles.cardAccent,
            accent ? { backgroundColor: accent } : null,
          ]}
        />

        <Text style={styles.cardTitle}>
          {title}
        </Text>

        <Text style={styles.cardValue}>
          {value}
        </Text>
      </View>
    );
  }

  // ==========================================
  // LOADING SCREEN
  // ==========================================

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color={COLORS.gold}
        />

        <Text style={styles.loadingText}>
          Loading Nasara Intelligence...
        </Text>
      </View>
    );
  }

  // ==========================================
  // MAIN DASHBOARD
  // ==========================================

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadAnalytics();
          }}
          tintColor={COLORS.gold}
          colors={[COLORS.gold]}
        />
      }
    >

      {/* HEADER */}

      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>
            NASARA ADMINISTRATION
          </Text>

          <Text style={styles.title}>
            Platform Intelligence
          </Text>

          <Text style={styles.subtitle}>
            Growth, ecosystem performance and investor insights
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>
            N
          </Text>
        </View>
      </View>

      {/* EXECUTIVE HERO */}

      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>
          TOTAL REGISTERED USERS
        </Text>

        <Text style={styles.heroValue}>
          {data.users.toLocaleString()}
        </Text>

        <View style={styles.heroFooter}>
          <Text style={styles.heroFooterText}>
            +{data.newUsersToday} new today
          </Text>

          <Text style={styles.heroFooterText}>
            {data.mau.toLocaleString()} monthly active
          </Text>
        </View>
      </View>

      {/* EXECUTIVE OVERVIEW */}

      <Section title="Executive Overview">
        <View style={styles.grid}>
          <Card
            title="Daily Active Users"
            value={data.dau}
          />

          <Card
            title="Weekly Active Users"
            value={data.wau}
          />

          <Card
            title="Monthly Active Users"
            value={data.mau}
          />

          <Card
            title="Stickiness"
            value={`${data.stickiness}%`}
          />

          <Card
            title="Indicative Revenue"
            value={`GH₵ ${data.revenue.toLocaleString()}`}
            accent={COLORS.green}
          />

          <Card
            title="Trust Indicator"
            value={`${data.trustScore}%`}
          />
        </View>
      </Section>

      {/* MARKETPLACE */}

      <Section title="Marketplace & Commerce">
        <View style={styles.grid}>
          <Card title="Products" value={data.items} />
          <Card title="Verified Phone Profiles" value={data.verifiedSellers} />
          <Card title="Offers" value={data.offers} />
          <Card title="Auctions" value={data.auctions} />
          <Card title="Advertisements" value={data.ads} />
          <Card title="Banners" value={data.banners} />
          <Card title="Promotions" value={data.promotions} />
          <Card title="Boosts" value={data.boosts} />
        </View>
      </Section>

      {/* RESTAURANTS */}

      <Section title="Restaurant Ecosystem">
        <View style={styles.grid}>
          <Card
            title="Restaurant Owners"
            value={data.restaurantOwners}
            accent={COLORS.gold}
          />
        </View>
      </Section>

      {/* SOCIAL */}

      <Section title="Social & Communication">
        <View style={styles.grid}>
          <Card title="Posts / Reels" value={data.reels} />
          <Card title="Live Streams" value={data.liveStreams} />
          <Card title="Groups" value={data.groups} />
          <Card title="Messages" value={data.messages} />
          <Card title="Statuses" value={data.statuses} />
        </View>
      </Section>

      {/* AGRICULTURE */}

      <Section title="Agriculture">
        <View style={styles.grid}>
          <Card title="Farms" value={data.farms} />
          <Card title="Verified Farms" value={data.verifiedFarms} />
          <Card title="Farm Products" value={data.farmProducts} />
        </View>
      </Section>

      {/* DELIVERY */}

      <Section title="Delivery Network">
        <View style={styles.grid}>
          <Card title="Delivery Requests" value={data.deliveries} />

          <Card
            title="Paid Delivery Revenue"
            value={`GH₵ ${data.deliveryRevenue.toLocaleString()}`}
          />
        </View>
      </Section>

      {/* HEALTH */}

      <Section title="Healthcare">
        <View style={styles.grid}>
          <Card title="Hospitals" value={data.hospitals} />
          <Card title="Patients" value={data.patients} />
          <Card title="Hospital Bookings" value={data.hospitalBookings} />
          <Card title="Emergency Requests" value={data.emergencySearches} />
        </View>
      </Section>

      {/* ELECTIONS */}

      <Section title="Elections & Public Engagement">
        <View style={styles.grid}>
          <Card title="Public Battles" value={data.publicBattles} />
          <Card title="Elections" value={data.elections} />
          <Card title="Candidates" value={data.candidates} />
          <Card title="Votes" value={data.votes} />
        </View>
      </Section>

      {/* MENTORSHIP */}

      <Section title="Mentorship">
        <View style={styles.grid}>
          <Card title="Mentors" value={data.mentors} />
          <Card title="Students" value={data.students} />
          <Card title="Sessions" value={data.sessions} />
        </View>
      </Section>

      {/* TRUST */}

      <Section title="Trust & Safety">
        <View style={styles.grid}>
          <Card title="Reports" value={data.reports} />
          <Card title="Blocked Users" value={data.blockedUsers} />
          <Card
            title="Unverified Profiles"
            value={`${data.fraudScore}%`}
          />
        </View>
      </Section>

      {/* REFERRALS */}

      <Section title="Referral Network">
        <View style={styles.grid}>
          <Card title="Referrals" value={data.referrals} />
        </View>
      </Section>

      {/* INVESTOR VALUATION */}

      <Section title="Investor Valuation">

        <View style={styles.valuationBox}>

          <Text style={styles.investorEyebrow}>
            NASARA INVESTMENT POTENTIAL
          </Text>

          <Text style={styles.valuationTitle}>
            National-Scale Ambition
          </Text>

          <Text style={styles.valuation}>
            US$500M+
          </Text>

          <Text style={styles.investorNote}>
            
          </Text>

          <View style={styles.valuationDivider} />

          <Text style={styles.valuationStage}>
            Early Stage
          </Text>

          <Text style={styles.valuationAmount}>
            US$10M – US$80M
          </Text>

          <Text style={styles.valuationStage}>
            Strong Ghana Traction
          </Text>

          <Text style={styles.valuationAmount}>
            US$100M – US$250M
          </Text>

          <Text style={styles.valuationStage}>
            National Scale
          </Text>

          <Text style={styles.valuationAmount}>
            US$500M+
          </Text>

          <View style={styles.valuationDivider} />

          <Text style={styles.investorNote}>
            
          </Text>

        </View>

      </Section>

      {/* EXPORT */}

      <TouchableOpacity
        style={styles.exportButton}
        onPress={generatePitchPDF}
        activeOpacity={0.85}
      >
        <Text style={styles.exportButtonText}>
          Export Investor Report
        </Text>
      </TouchableOpacity>

      <Text style={styles.footer}>
        NASARA • DIGITAL MARKETPLACE & SOCIAL ECOSYSTEM
      </Text>

    </ScrollView>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    padding: 20,
    paddingBottom: 50,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },

  loadingText: {
    color: COLORS.goldLight,
    marginTop: 14,
    fontSize: 14,
    fontWeight: "700",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },

  eyebrow: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 8,
  },

  title: {
    color: COLORS.white,
    fontSize: 25,
    fontWeight: "900",
  },

  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
    maxWidth: screenWidth - 110,
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: COLORS.gold,
    justifyContent: "center",
    alignItems: "center",
  },

  headerIconText: {
    color: COLORS.background,
    fontSize: 25,
    fontWeight: "900",
  },

  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },

  heroLabel: {
    color: COLORS.goldLight,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  heroValue: {
    color: COLORS.white,
    fontSize: 42,
    fontWeight: "900",
    marginTop: 12,
  },

  heroFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    marginTop: 16,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  heroFooterText: {
    color: COLORS.goldLight,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },

  sectionContainer: {
    marginTop: 24,
  },

  sectionTitle: {
    color: COLORS.goldLight,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 14,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  card: {
    width: "48%",
    minHeight: 105,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
  },

  cardAccent: {
    width: 25,
    height: 3,
    borderRadius: 5,
    backgroundColor: COLORS.gold,
    marginBottom: 12,
  },

  cardTitle: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 9,
  },

  cardValue: {
    color: COLORS.white,
    fontSize: 23,
    fontWeight: "900",
  },

  valuationBox: {
    backgroundColor: COLORS.surfaceLight,
    padding: 22,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },

  investorEyebrow: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  valuationTitle: {
    color: COLORS.white,
    fontSize: 19,
    fontWeight: "800",
    marginTop: 15,
  },

  valuation: {
    color: COLORS.goldLight,
    fontSize: 36,
    fontWeight: "900",
    marginVertical: 15,
  },

  investorNote: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 19,
  },

  valuationDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 20,
  },

  valuationStage: {
    color: COLORS.goldLight,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 14,
  },

  valuationAmount: {
    color: COLORS.white,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 5,
  },

  exportButton: {
    backgroundColor: COLORS.gold,
    padding: 18,
    borderRadius: 16,
    marginTop: 30,
    alignItems: "center",
  },

  exportButtonText: {
    color: COLORS.background,
    fontSize: 15,
    fontWeight: "900",
  },

  footer: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 1,
    marginTop: 25,
  },
});