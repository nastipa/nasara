/* =========================================================
   🟢 NASARA FARM CENTER
   🔵 NAVY AND GOLD DASHBOARD
   🟡 TYPESCRIPT / REACT NATIVE
   🟠 FARM MANAGEMENT AND MARKETPLACE
   ========================================================= */

import { useRouter } from "expo-router";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

/* =========================================================
   🟢 TYPESCRIPT TYPES
   ========================================================= */

type FarmAction = {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  background: string;
};

type FarmCategory = {
  name: string;
  icon: string;
};

/* =========================================================
   🔵 FARM CENTER SCREEN
   ========================================================= */

export default function FarmTab() {
  const router = useRouter();

  /* =======================================================
     🟢 FARM MANAGEMENT ACTIONS
     ======================================================= */

  const managementActions: FarmAction[] = [
    {
      title: "Create Farm",
      description: "Register a new farm on Nasara",
      icon: "🌱",
      route: "/farm/create",
      color: "#16834A",
      background: "#E7F6EC",
    },
    {
      title: "My Farm",
      description: "View and manage your farm",
      icon: "🏡",
      route: "/farm/my",
      color: "#2563EB",
      background: "#EAF1FF",
    },
    {
      title: "Add Farm Stock",
      description: "List available agricultural produce",
      icon: "📦",
      route: "/farm/add-stock",
      color: "#7C3AED",
      background: "#F1EAFE",
    },
    {
      title: "Edit Farm",
      description: "Update your farm information",
      icon: "✏️",
      route: "/farm/edit",
      color: "#0891B2",
      background: "#E3F7FA",
    },
  ];

  /* =======================================================
     🔵 MARKETPLACE ACTIONS
     ======================================================= */

  const marketplaceActions: FarmAction[] = [
    {
      title: "Browse Farms",
      description: "Discover farms and available produce",
      icon: "🌍",
      route: "/farm",
      color: "#EA580C",
      background: "#FFF0E5",
    },
    {
      title: "Create Farm Service",
      description: "Offer agricultural services",
      icon: "🛠️",
      route: "/farm/create-service",
      color: "#B7791F",
      background: "#FFF5DC",
    },
    {
      title: "Become Certified Supplier",
      description: "Request certified supplier status",
      icon: "🏅",
      route: "/farm/request-supplier",
      color: "#16834A",
      background: "#E7F6EC",
    },
  ];

  /* =======================================================
     🟠 FARM PROMOTION ACTIONS
     ======================================================= */

  const promotionActions: FarmAction[] = [
    {
      title: "Feature My Farm",
      description: "Give your farm more visibility",
      icon: "⭐",
      route: "/farm/featured",
      color: "#A16207",
      background: "#FFF4D6",
    },
    {
      title: "Advertise Farm",
      description: "Promote your farm to more buyers",
      icon: "📢",
      route: "/farm/advertise",
      color: "#DC2626",
      background: "#FDEAEA",
    },
  ];

  /* =======================================================
     🟡 FARM MARKETPLACE CATEGORIES
     ======================================================= */

  const categories: FarmCategory[] = [
    { name: "Crops", icon: "🌽" },
    { name: "Livestock", icon: "🐄" },
    { name: "Poultry", icon: "🐔" },
    { name: "Eggs", icon: "🥚" },
    { name: "Fish", icon: "🐟" },
    { name: "Seeds", icon: "🌱" },
    { name: "Fertilizer", icon: "🧪" },
    { name: "Pesticides", icon: "🛡️" },
    { name: "Farm Tools", icon: "🔨" },
    { name: "Farm Equipment", icon: "🚜" },
    { name: "Animal Feed", icon: "🌾" },
    { name: "Veterinary Products", icon: "💉" },
    { name: "Farm Services", icon: "👨‍🌾" },
  ];

  /* =======================================================
     🔵 REUSABLE ACTION ROW
     ======================================================= */

  const renderAction = (action: FarmAction) => (
    <TouchableOpacity
      key={action.title}
      activeOpacity={0.75}
      onPress={() => router.push(action.route as any)}
      style={styles.actionRow}
    >
      <View
        style={[
          styles.actionIcon,
          { backgroundColor: action.background },
        ]}
      >
        <Text style={styles.actionEmoji}>{action.icon}</Text>
      </View>

      <View style={styles.actionTextContainer}>
        <Text style={styles.actionTitle}>{action.title}</Text>

        <Text style={styles.actionDescription}>
          {action.description}
        </Text>
      </View>

      <Text style={[styles.actionArrow, { color: action.color }]}>
        ›
      </Text>
    </TouchableOpacity>
  );

  /* =======================================================
     🟢 REUSABLE SECTION
     ======================================================= */

  const renderSection = (
    title: string,
    subtitle: string,
    accent: string,
    actions: FarmAction[]
  ) => (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <View
          style={[
            styles.sectionMarker,
            { backgroundColor: accent },
          ]}
        />

        <View style={styles.sectionHeadingText}>
          <Text style={styles.sectionTitle}>{title}</Text>

          <Text style={styles.sectionSubtitle}>
            {subtitle}
          </Text>
        </View>
      </View>

      <View style={styles.actionList}>
        {actions.map(renderAction)}
      </View>
    </View>
  );

  /* =======================================================
     🟢 MAIN FARM CENTER LAYOUT
     ======================================================= */

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#101D32"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 🔵 NAVY WELCOME BANNER */}

        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroEyebrow}>
                NASARA AGRICULTURE
              </Text>

              <Text style={styles.heroTitle}>
                Farm Center
              </Text>
            </View>

            <View style={styles.heroIcon}>
              <Text style={styles.heroEmoji}>🌾</Text>
            </View>
          </View>

          <Text style={styles.heroDescription}>
            Manage your farm, showcase your produce and connect
            with agricultural opportunities.
          </Text>

          <View style={styles.heroFooter}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>
                GROW • CONNECT • TRADE
              </Text>
            </View>
          </View>

          <View style={styles.goldDecoration} />
        </View>

        {/* 🟢 FARM MANAGEMENT */}

        {renderSection(
          "Farm Management",
          "Manage your farm operations",
          "#16834A",
          managementActions
        )}

        {/* 🔵 MARKETPLACE */}

        {renderSection(
          "Marketplace",
          "Explore farms and agricultural services",
          "#2563EB",
          marketplaceActions
        )}

        {/* 🟠 FARM PROMOTION */}

        {renderSection(
          "Farm Promotion",
          "Grow your business visibility",
          "#D69E24",
          promotionActions
        )}

        {/* 🟡 CATEGORY GRID */}

        <View style={styles.categorySection}>
          <View style={styles.categoryHeader}>
            <View>
              <Text style={styles.categoryHeading}>
                Marketplace Categories
              </Text>

              <Text style={styles.categorySubtitle}>
                Explore agricultural products and services
              </Text>
            </View>

            <Text style={styles.categoryHeaderIcon}>🌿</Text>
          </View>

          <View style={styles.categoryGrid}>
            {categories.map((category, index) => (
              <View
                key={category.name}
                style={styles.categoryCard}
              >
                <View
                  style={[
                    styles.categoryIconBox,
                    {
                      backgroundColor:
                        index % 2 === 0 ? "#EDF5E9" : "#FDF4DF",
                    },
                  ]}
                >
                  <Text style={styles.categoryIcon}>
                    {category.icon}
                  </Text>
                </View>

                <Text style={styles.categoryName}>
                  {category.name}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* 🟢 FOOTER */}

        <View style={styles.footer}>
          <Text style={styles.footerLogo}>
            NASARA <Text style={styles.footerGold}>FARM</Text>
          </Text>

          <Text style={styles.footerDescription}>
            Connecting farmers, suppliers and buyers.
          </Text>

          <Text style={styles.footerCopyright}>
            Agriculture • Opportunity • Growth
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

/* =========================================================
   🎨 STYLESHEET
   ========================================================= */

const styles = StyleSheet.create({
  /* 🟢 MAIN CONTAINER */

  container: {
    flex: 1,
    backgroundColor: "#F5F6F8",
  },

  scrollContent: {
    paddingBottom: 35,
  },

  /* 🔵 WELCOME BANNER */

  hero: {
    backgroundColor: "#101D32",
    paddingHorizontal: 21,
    paddingTop: 28,
    paddingBottom: 25,
    borderBottomLeftRadius: 27,
    borderBottomRightRadius: 27,
    overflow: "hidden",
  },

  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  heroEyebrow: {
    color: "#D9B45B",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2.5,
    marginBottom: 9,
  },

  heroTitle: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.5,
  },

  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: "#24364D",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#B89549",
  },

  heroEmoji: {
    fontSize: 29,
  },

  heroDescription: {
    color: "#C8D2DE",
    fontSize: 13,
    lineHeight: 21,
    marginTop: 19,
    maxWidth: 310,
  },

  heroFooter: {
    marginTop: 20,
    flexDirection: "row",
  },

  heroBadge: {
    backgroundColor: "#24364D",
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 7,
    borderLeftWidth: 3,
    borderLeftColor: "#D9B45B",
  },

  heroBadgeText: {
    color: "#E7CA84",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  goldDecoration: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    borderColor: "rgba(217,180,91,0.15)",
    right: -55,
    bottom: -75,
  },

  /* 🟢 SECTION LAYOUT */

  section: {
    marginTop: 25,
    paddingHorizontal: 17,
  },

  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  sectionMarker: {
    width: 5,
    height: 38,
    borderRadius: 5,
    marginRight: 11,
  },

  sectionHeadingText: {
    flex: 1,
  },

  sectionTitle: {
    color: "#17263A",
    fontSize: 18,
    fontWeight: "900",
  },

  sectionSubtitle: {
    color: "#84909D",
    fontSize: 11,
    marginTop: 4,
  },

  /* 🔵 ACTION ROWS */

  actionList: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: "#E8EBEF",
  },

  actionRow: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F3",
  },

  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  actionEmoji: {
    fontSize: 22,
  },

  actionTextContainer: {
    flex: 1,
    justifyContent: "center",
  },

  actionTitle: {
    color: "#1C2D42",
    fontSize: 13,
    fontWeight: "800",
  },

  actionDescription: {
    color: "#87919D",
    fontSize: 10,
    marginTop: 5,
    lineHeight: 15,
  },

  actionArrow: {
    fontSize: 27,
    fontWeight: "400",
    marginLeft: 8,
    paddingHorizontal: 4,
  },

  /* 🟡 MARKETPLACE CATEGORIES */

  categorySection: {
    marginTop: 28,
    marginHorizontal: 17,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#E8EBEF",
  },

  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 17,
  },

  categoryHeading: {
    color: "#17263A",
    fontSize: 17,
    fontWeight: "900",
  },

  categorySubtitle: {
    color: "#87919D",
    fontSize: 10,
    marginTop: 5,
  },

  categoryHeaderIcon: {
    fontSize: 25,
  },

  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  categoryCard: {
    width: "31.5%",
    minHeight: 100,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 11,
    marginBottom: 9,
    borderRadius: 13,
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#EEF0F2",
  },

  categoryIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  categoryIcon: {
    fontSize: 22,
  },

  categoryName: {
    color: "#354458",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },

  /* 🟢 FOOTER */

  footer: {
    marginTop: 22,
    marginHorizontal: 17,
    paddingVertical: 22,
    paddingHorizontal: 15,
    backgroundColor: "#101D32",
    borderRadius: 16,
    alignItems: "center",
  },

  footerLogo: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 2,
  },

  footerGold: {
    color: "#D9B45B",
  },

  footerDescription: {
    color: "#C4CFDA",
    fontSize: 11,
    marginTop: 8,
  },

  footerCopyright: {
    color: "#D9B45B",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 13,
  },
});