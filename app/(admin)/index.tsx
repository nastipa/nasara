import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAdminGuard } from "../../hooks/useAdminGuard";

const COLORS = {
  navy: "#101B35",
  navyLight: "#192744",
  gold: "#D4AF37",
  goldLight: "#F7EAC0",
  background: "#F4F6FA",
  white: "#FFFFFF",
  text: "#172033",
  muted: "#788398",
  border: "#E8ECF2",
};

type AdminItem = {
  label: string;
  route: string;
  icon: string;
  description?: string;
};

type AdminSection = {
  title: string;
  icon: string;
  items: AdminItem[];
};

const sections: AdminSection[] = [
  {
    title: "Moderation",
    icon: "🛡️",
    items: [
      {
        label: "Approve Ads",
        route: "/(admin)/ads",
        icon: "📢",
      },
      {
        label: "Approve Banner",
        route: "/(admin)/banner",
        icon: "🖼️",
      },
      {
        label: "Approve Promotion",
        route: "/(admin)/promoted",
        icon: "⭐",
      },
      {
        label: "Approve Boost",
        route: "/(admin)/boost",
        icon: "🚀",
      },
      {
        label: "Approve Battle",
        route: "/(admin)/battle",
        icon: "⚔️",
      },
    ],
  },
  {
    title: "Delivery & Logistics",
    icon: "🚚",
    items: [
      {
        label: "Delivery Analytics",
        route: "/(admin)/delivery-analytics",
        icon: "📊",
      },
      {
        label: "Delivery Payments",
        route: "/(admin)/delivery-payments",
        icon: "💳",
      },
      {
        label: "Logistics",
        route: "/(admin)/logistics",
        icon: "📍",
      },
      {
        label: "Rider Earnings",
        route: "/(admin)/rider-earnings",
        icon: "💰",
      },
      {
        label: "Rider Applications",
        route: "/(admin)/rider-applications",
        icon: "📝",
      },
      {
        label: "Rider Withdrawals",
        route: "/(admin)/rider-withdrawals",
        icon: "🏦",
      },
      {
        label: "Request Withdrawals",
        route: "/(admin)/withdrawals",
        icon: "💸",
      },
    ],
  },
  {
    title: "Users & Community",
    icon: "👥",
    items: [
      {
        label: "View Users",
        route: "/(admin)/users",
        icon: "👤",
      },
      {
        label: "Ban / Unban User",
        route: "/(admin)/users",
        icon: "🚫",
      },
      {
        label: "User Reports",
        route: "/(admin)/report",
        icon: "🚩",
      },
      {
        label: "Verify Badges",
        route: "/(admin)/verifications",
        icon: "✅",
      },
      {
        label: "Match Mentor",
        route: "/(admin)/mentor-matches",
        icon: "🤝",
      },
      {
        label: "Approve Mentor",
        route: "/(admin)/approve-mentors",
        icon: "🎓",
      },
    ],
  },
  {
    title: "Agriculture & Farm",
    icon: "🌾",
    items: [
      {
        label: "Farm Boost",
        route: "/(admin)/farm-boost",
        icon: "🚀",
      },
      {
        label: "Farm Verification",
        route: "/(admin)/farm-verification",
        icon: "✅",
      },
      {
        label: "Farm Featured",
        route: "/(admin)/farm-featured",
        icon: "⭐",
      },
      {
        label: "Farm Suppliers",
        route: "/(admin)/farm-suppliers",
        icon: "🚜",
      },
      {
        label: "Farm Ads",
        route: "/(admin)/farm-ads",
        icon: "📢",
      },
    ],
  },
  {
    title: "Administration",
    icon: "🏢",
    items: [
      {
        label: "Add Admin",
        route: "/(admin)/add-admin",
        icon: "➕",
      },
      {
        label: "Remove Admin",
        route: "/(admin)/remove-admin",
        icon: "➖",
      },
      {
        label: "Restaurant Owners",
        route: "/(admin)/add-restaurant-owner",
        icon: "🍽️",
      },
      {
        label: "Subscriptions",
        route: "/(admin)/subscriptions",
        icon: "📅",
      },
    ],
  },
  
  {
    title: "Reels & Music",
    icon: "🎵",
    items: [
      {
        label: "Music Management",
        route: "/(admin)/music",
        icon: "🎧",
      },
    ],
  },
  
  {
    title: "Finance",
    icon: "💰",
    items: [
      
      {
        label: "Revenue",
        route: "/(admin)/revenue",
        icon: "📈",
      },
    ],
  },
  {
    title: "Analytics",
    icon: "📊",
    items: [
      {
        label: "Platform Stats",
        route: "/(admin)/analytics",
        icon: "📉",
      },
    ],
  },
];

export default function AdminDashboard() {
  const router = useRouter();
  const { loading } = useAdminGuard();

  const [search, setSearch] = useState("");

  const filteredSections = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return sections;

    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.label.toLowerCase().includes(query) ||
            section.title.toLowerCase().includes(query)
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [search]);

  if (loading) return null;

  const openScreen = (route: string) => {
    router.push(route as any);
  };

  const renderTile = (item: AdminItem) => (
    <TouchableOpacity
      key={`${item.label}-${item.route}`}
      style={styles.tile}
      activeOpacity={0.75}
      onPress={() => openScreen(item.route)}
    >
      <View style={styles.tileTop}>
        <View style={styles.tileIcon}>
          <Text style={styles.tileEmoji}>{item.icon}</Text>
        </View>

        <Text style={styles.tileArrow}>↗️</Text>
      </View>

      <Text style={styles.tileTitle}>{item.label}</Text>
      <Text style={styles.tileSubtitle}>Manage and review</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.navy}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.brand}>NASARA</Text>
              <Text style={styles.brandSubtitle}>
                ADMINISTRATION
              </Text>
            </View>

            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>
                🛡️ ADMIN
              </Text>
            </View>
          </View>

          <Text style={styles.welcome}>
            Control Centre
          </Text>

          <Text style={styles.headerDescription}>
            Manage your platform, monitor activities and
            keep Nasara running smoothly.
          </Text>

          <View style={styles.headerFooter}>
            <View>
              <Text style={styles.headerFooterLabel}>
                PLATFORM MANAGEMENT
              </Text>
              <Text style={styles.headerFooterValue}>
                Everything in one place
              </Text>
            </View>

            <Text style={styles.headerStar}>✦</Text>
          </View>
        </View>

        {/* NOTIFICATIONS */}

        <TouchableOpacity
          style={styles.notificationCard}
          activeOpacity={0.8}
          onPress={() =>
            openScreen("/(admin)/notifications")
          }
        >
          <View style={styles.notificationIcon}>
            <Text style={{ fontSize: 25 }}>🔔</Text>
          </View>

          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>
              Admin Notifications
            </Text>

            <Text style={styles.notificationDescription}>
              View important platform alerts and pending
              admin actions.
            </Text>
          </View>

          <Text style={styles.notificationArrow}>›</Text>
        </TouchableOpacity>

        {/* SEARCH */}

        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>⌕</Text>

          <TextInput
            style={styles.searchInput}
            placeholder="Search admin tools..."
            placeholderTextColor="#9AA4B5"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            returnKeyType="search"
          />

          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch("")}
            >
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* OVERVIEW */}

        <View style={styles.overviewHeader}>
          <View>
            <Text style={styles.overviewTitle}>
              Management Tools
            </Text>
            <Text style={styles.overviewSubtitle}>
              Select a department to get started
            </Text>
          </View>

          <View style={styles.toolCount}>
            <Text style={styles.toolCountText}>
              {filteredSections.reduce(
                (total, section) =>
                  total + section.items.length,
                0
              )}{" "}
              TOOLS
            </Text>
          </View>
        </View>

        {/* DEPARTMENTS */}

        {filteredSections.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>
              No tools found
            </Text>
            <Text style={styles.emptyDescription}>
              Try searching with another keyword.
            </Text>
          </View>
        ) : (
          filteredSections.map((section) => (
            <View
              key={section.title}
              style={styles.section}
            >
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Text style={styles.sectionEmoji}>
                    {section.icon}
                  </Text>
                </View>

                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionTitle}>
                    {section.title}
                  </Text>

                  <Text style={styles.sectionSubtitle}>
                    {section.items.length} management{" "}
                    {section.items.length === 1
                      ? "tool"
                      : "tools"}
                  </Text>
                </View>
              </View>

              <View style={styles.grid}>
                {section.items.map(renderTile)}
              </View>
            </View>
          ))
        )}

        {/* BACK TO NASARA */}

        <TouchableOpacity
          style={styles.homeButton}
          activeOpacity={0.8}
          onPress={() => router.replace("/browse" as any)}
        >
          <Text style={styles.homeIcon}>⌂</Text>

          <Text style={styles.homeButtonText}>
            Back to Nasara
          </Text>

          <Text style={styles.homeArrow}>→</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          NASARA ADMIN CONTROL CENTRE
        </Text>

        <Text style={styles.footerVersion}>
          Manage • Protect • Grow
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    paddingBottom: 35,
  },

  header: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 25,
    borderBottomLeftRadius: 27,
    borderBottomRightRadius: 27,
  },

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  brand: {
    color: COLORS.gold,
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: 3,
  },

  brandSubtitle: {
    color: "#B9C3D5",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: 3,
  },

  adminBadge: {
    backgroundColor: "#263653",
    borderWidth: 1,
    borderColor: "#52617B",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },

  adminBadgeText: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: "800",
  },

  welcome: {
    color: COLORS.white,
    fontSize: 29,
    fontWeight: "900",
    marginTop: 30,
  },

  headerDescription: {
    color: "#B9C4D6",
    fontSize: 13,
    lineHeight: 21,
    marginTop: 8,
    maxWidth: 310,
  },

  headerFooter: {
    marginTop: 24,
    paddingTop: 17,
    borderTopWidth: 1,
    borderTopColor: "#33415C",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerFooterLabel: {
    color: COLORS.gold,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  headerFooterValue: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 5,
  },

  headerStar: {
    color: COLORS.gold,
    fontSize: 32,
  },

  notificationCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 17,
    marginTop: 18,
    padding: 16,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0E5C4",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  notificationIcon: {
    width: 49,
    height: 49,
    borderRadius: 15,
    backgroundColor: "#FFF7DF",
    alignItems: "center",
    justifyContent: "center",
  },

  notificationContent: {
    flex: 1,
    marginLeft: 13,
  },

  notificationTitle: {
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: "900",
  },

  notificationDescription: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },

  notificationArrow: {
    fontSize: 27,
    color: COLORS.gold,
    marginLeft: 8,
  },

  searchContainer: {
    backgroundColor: COLORS.white,
    marginHorizontal: 17,
    marginTop: 21,
    height: 51,
    borderRadius: 14,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  searchIcon: {
    color: COLORS.muted,
    fontSize: 27,
    marginRight: 10,
  },

  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
  },

  clearSearch: {
    color: COLORS.muted,
    fontSize: 17,
    padding: 5,
  },

  overviewHeader: {
    marginHorizontal: 19,
    marginTop: 27,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  overviewTitle: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: "900",
  },

  overviewSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 4,
  },

  toolCount: {
    backgroundColor: COLORS.goldLight,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
  },

  toolCountText: {
    color: "#846414",
    fontSize: 9,
    fontWeight: "900",
  },

  section: {
    marginTop: 19,
    marginHorizontal: 17,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 11,
  },

  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#E9EDF5",
    alignItems: "center",
    justifyContent: "center",
  },

  sectionEmoji: {
    fontSize: 18,
  },

  sectionHeading: {
    marginLeft: 11,
  },

  sectionTitle: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: "900",
  },

  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 3,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  tile: {
    width: "48.5%",
    minHeight: 111,
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  tileTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  tileIcon: {
    width: 37,
    height: 37,
    borderRadius: 11,
    backgroundColor: "#F2F4F8",
    alignItems: "center",
    justifyContent: "center",
  },

  tileEmoji: {
    fontSize: 19,
  },

  tileArrow: {
    color: "#A5AFBF",
    fontSize: 17,
    fontWeight: "700",
  },

  tileTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 11,
  },

  tileSubtitle: {
    color: COLORS.muted,
    fontSize: 9,
    marginTop: 4,
  },

  emptyState: {
    backgroundColor: COLORS.white,
    marginHorizontal: 17,
    marginTop: 20,
    padding: 30,
    borderRadius: 18,
    alignItems: "center",
  },

  emptyIcon: {
    fontSize: 35,
  },

  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 10,
  },

  emptyDescription: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 6,
  },

  homeButton: {
    marginHorizontal: 17,
    marginTop: 28,
    padding: 17,
    backgroundColor: COLORS.navy,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
  },

  homeIcon: {
    color: COLORS.gold,
    fontSize: 25,
    marginRight: 12,
  },

  homeButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "800",
    flex: 1,
  },

  homeArrow: {
    color: COLORS.gold,
    fontSize: 21,
    fontWeight: "800",
  },

  footer: {
    textAlign: "center",
    color: COLORS.navy,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2,
    marginTop: 26,
  },

  footerVersion: {
    textAlign: "center",
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 6,
  },
});