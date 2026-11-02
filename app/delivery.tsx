// 🔵 ==========================================
// 🔵 NASARA RIDES & DELIVERIES
// 🔵 PREMIUM NAVY, GOLD & WHITE UI
// 🔵 ==========================================

import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";

import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { supabase } from "../lib/supabase";

// 🟡 ==========================================
// 🟡 COLOUR SYSTEM
// 🟡 ==========================================

const COLORS = {
  navy: "#14213D",
  navyLight: "#203354",
  gold: "#D6A84F",
  goldLight: "#F8EFD9",
  background: "#F5F6FA",
  white: "#FFFFFF",
  text: "#172238",
  muted: "#7C8799",
  border: "#E8EBF1",
  green: "#16865B",
  purple: "#7952B3",
  blue: "#3478D4",
  orange: "#D58B2B",
};

// 🟢 ==========================================
// 🟢 MENU ITEM TYPE
// 🟢 ==========================================

type DeliveryMenuItem = {
  title: string;
  subtitle: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  background: string;
};

// 🟣 ==========================================
// 🟣 MAIN RIDES & DELIVERIES SCREEN
// 🟣 ==========================================

export default function DeliveryTab() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRider, setIsRider] = useState(false);

  // 🔵 ==========================================
  // 🔵 LOAD USER ROLE
  // 🔵 ==========================================

  async function loadUser() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsAdmin(false);
        setIsRider(false);
        setLoading(false);
        return;
      }

      // 🛠️ ADMIN CHECK

      const admin = user.user_metadata?.role === "admin";

      setIsAdmin(admin);

      // 🚴 RIDER CHECK

      const { data: riderRow, error } = await (supabase as any)
        .from("riders")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.log("rider check error:", error);
        setIsRider(false);
      } else {
        setIsRider(
          !!(
            riderRow &&
            (
              riderRow.approved === true ||
              riderRow.approved === "true" ||
              riderRow.status === "approved"
            )
          )
        );
      }
    } catch (e) {
      console.log("User loading error:", e);
    } finally {
      setLoading(false);
    }
  }

  // 🔄 ==========================================
  // 🔄 REFRESH USER WHEN TAB OPENS
  // 🔄 ==========================================

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [])
  );

  // 🟡 ==========================================
  // 🟡 ADMIN MENU
  // 🟡 ==========================================

  const adminMenu: DeliveryMenuItem[] = [
    {
      title: "Logistics",
      subtitle: "Manage ride and delivery operations",
      route: "/(admin)/logistics",
      icon: "settings-outline",
      color: COLORS.blue,
      background: "#EAF1FC",
    },
    {
      title: "Delivery Payments",
      subtitle: "Monitor delivery payments",
      route: "/(admin)/delivery-payments",
      icon: "wallet-outline",
      color: COLORS.green,
      background: "#E8F5EE",
    },
    {
      title: "Rider Applications",
      subtitle: "Review driver and rider applications",
      route: "/(admin)/rider-applications",
      icon: "people-outline",
      color: COLORS.purple,
      background: "#F1EBFA",
    },
    {
      title: "Order a Ride",
      subtitle: "Create a passenger ride or delivery request",
      route: "/request-delivery",
      icon: "car-outline",
      color: COLORS.orange,
      background: "#FBF1E2",
    },
  ];

  // 🚴 ==========================================
  // 🚴 RIDER MENU
  // 🚴 ==========================================

  const riderMenu: DeliveryMenuItem[] = [
    {
      title: "Driver & Rider Dashboard",
      subtitle: "Manage your rides and delivery activities",
      route: "/rider-dashboard",
      icon: "speedometer-outline",
      color: COLORS.blue,
      background: "#EAF1FC",
    },
    {
      title: "Earnings Wallet",
      subtitle: "View your earnings",
      route: "/rider-wallet",
      icon: "wallet-outline",
      color: COLORS.green,
      background: "#E8F5EE",
    },
    {
      title: "My Bookings",
      subtitle: "View and manage your assigned requests",
      route: "/my-deliveries",
      icon: "bicycle-outline",
      color: COLORS.purple,
      background: "#F1EBFA",
    },
    {
      title: "Booking History",
      subtitle: "Review previous rides and deliveries",
      route: "/delivery-history",
      icon: "time-outline",
      color: COLORS.orange,
      background: "#FBF1E2",
    },
    {
      title: "Order a Ride",
      subtitle: "Create a passenger ride or delivery request",
      route: "/request-delivery",
      icon: "car-outline",
      color: COLORS.navy,
      background: "#E9EDF5",
    },
  ];

  // 👤 ==========================================
  // 👤 CUSTOMER MENU
  // 👤 ==========================================

  const customerMenu: DeliveryMenuItem[] = [
    {
      title: "Apply as Rider",
      subtitle: "Join the Nasara transport and delivery network",
      route: "/become-rider",
      icon: "bicycle-outline",
      color: COLORS.green,
      background: "#E8F5EE",
    },
    {
      title: "My Bookings",
      subtitle: "Track your rides and deliveries",
      route: "/my-deliveries",
      icon: "receipt-outline",
      color: COLORS.purple,
      background: "#F1EBFA",
    },
    {
      title: "Booking History",
      subtitle: "View your previous rides and deliveries",
      route: "/delivery-history",
      icon: "time-outline",
      color: COLORS.orange,
      background: "#FBF1E2",
    },
    {
      title: "Order a Ride",
      subtitle: "Request passenger transport or item delivery",
      route: "/request-delivery",
      icon: "car-outline",
      color: COLORS.blue,
      background: "#EAF1FC",
    },
  ];

  // 🔵 ==========================================
  // 🔵 SELECT MENU
  // 🔵 ==========================================

  const menu = isAdmin
    ? adminMenu
    : isRider
    ? riderMenu
    : customerMenu;

  // 🟡 ==========================================
  // 🟡 SCREEN CONTENT
  // 🟡 ==========================================

  const screenTitle = isAdmin
    ? "Admin Logistics"
    : isRider
    ? "Driver & Rider Center"
    : "Rides & Deliveries";

  const screenSubtitle = isAdmin
    ? "Oversee and manage Nasara transport and delivery operations."
    : isRider
    ? "Your workspace for rides, deliveries, earnings and activities."
    : "Book a ride or arrange convenient delivery with Nasara.";

  const screenIcon = isAdmin
    ? "settings"
    : isRider
    ? "car"
    : "car";

  // ⏳ ==========================================
  // ⏳ LOADING SCREEN
  // ⏳ ==========================================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={COLORS.navy}
        />

        <View style={styles.loadingIcon}>
          <Ionicons
            name="car"
            size={34}
            color={COLORS.gold}
          />
        </View>

        <ActivityIndicator
          size="large"
          color={COLORS.gold}
          style={{ marginTop: 22 }}
        />

        <Text style={styles.loadingText}>
          Preparing your rides and deliveries...
        </Text>
      </View>
    );
  }

  // 🟢 ==========================================
  // 🟢 MAIN UI
  // 🟢 ==========================================

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.navy}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 🔵 PREMIUM HEADER */}

        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.brandContainer}>
              <View style={styles.brandIcon}>
                <Ionicons
                  name="car"
                  size={19}
                  color={COLORS.navy}
                />
              </View>

              <Text style={styles.brandName}>
                NASARA
              </Text>
            </View>

            <View style={styles.headerLabel}>
              <View style={styles.onlineDot} />

              <Text style={styles.headerLabelText}>
                RIDES & DELIVERIES
              </Text>
            </View>
          </View>

          <View style={styles.heroContent}>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroEyebrow}>
                RIDE & DELIVERY SERVICES
              </Text>

              <Text style={styles.heroTitle}>
                {screenTitle}
              </Text>

              <Text style={styles.heroSubtitle}>
                {screenSubtitle}
              </Text>
            </View>

            <View style={styles.heroIllustration}>
              <Ionicons
                name={screenIcon as any}
                size={55}
                color={COLORS.gold}
              />

              <View style={styles.heroIllustrationDot} />
            </View>
          </View>

          <View style={styles.headerBottom}>
            <View style={styles.headerBottomLine} />

            <Text style={styles.headerBottomText}>
              Moving people. Moving goods. Connecting people.
            </Text>
          </View>
        </View>

        {/* 🟡 SECTION HEADING */}

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>
              Your workspace
            </Text>

            <Text style={styles.sectionSubtitle}>
              Choose a service to continue
            </Text>
          </View>

          <View style={styles.serviceCount}>
            <Text style={styles.serviceCountNumber}>
              {menu.length}
            </Text>

            <Text style={styles.serviceCountLabel}>
              SERVICES
            </Text>
          </View>
        </View>

        {/* 🟢 SERVICE MENU */}

        <View style={styles.menuContainer}>
          {menu.map((item, index) => (
            <TouchableOpacity
              key={index}
              activeOpacity={0.85}
              onPress={() =>
                router.push(item.route as any)
              }
              style={styles.menuCard}
            >
              {/* 🟣 ICON */}

              <View
                style={[
                  styles.menuIconContainer,
                  {
                    backgroundColor: item.background,
                  },
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={26}
                  color={item.color}
                />
              </View>

              {/* 🔵 DETAILS */}

              <View style={styles.menuDetails}>
                <Text style={styles.menuTitle}>
                  {item.title}
                </Text>

                <Text style={styles.menuSubtitle}>
                  {item.subtitle}
                </Text>
              </View>

              {/* 🟡 ARROW */}

              <View style={styles.menuArrow}>
                <Ionicons
                  name="chevron-forward"
                  size={19}
                  color={COLORS.navy}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* 🔵 INFORMATION CARD */}

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="shield-checkmark"
              size={25}
              color={COLORS.gold}
            />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              Move with confidence
            </Text>

            <Text style={styles.infoDescription}>
              Nasara connects customers, businesses, drivers and
              delivery riders to make transporting people and goods easier.
            </Text>
          </View>
        </View>

        {/* 🟡 FOOTER */}

        <View style={styles.footer}>
          <View style={styles.footerLine} />

          <Text style={styles.footerText}>
            Powered by Nasara
          </Text>

          <View style={styles.footerLine} />
        </View>
      </ScrollView>
    </View>
  );
}

// 🎨 ==========================================
// 🎨 STYLES
// 🎨 ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    paddingBottom: 35,
  },

  // ⏳ LOADING

  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.navy,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingIcon: {
    width: 78,
    height: 78,
    borderRadius: 25,
    backgroundColor: COLORS.navyLight,
    borderWidth: 1,
    borderColor: "rgba(214,168,79,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: "#FFFFFF",
    fontSize: 14,
    marginTop: 15,
    fontWeight: "500",
  },

  // 🔵 HEADER

  header: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 23,
    paddingTop: 58,
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  brandIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: COLORS.gold,
    justifyContent: "center",
    alignItems: "center",
  },

  brandName: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 2,
  },

  headerLabel: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.09)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 7,
  },

  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.gold,
  },

  headerLabelText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.3,
  },

  heroContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 34,
  },

  heroTextContainer: {
    flex: 1,
    paddingRight: 10,
  },

  heroEyebrow: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 9,
  },

  heroTitle: {
    color: COLORS.white,
    fontSize: 29,
    fontWeight: "900",
    letterSpacing: -0.8,
  },

  heroSubtitle: {
    color: "#C1CAD9",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 9,
    maxWidth: 245,
  },

  heroIllustration: {
    width: 92,
    height: 92,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(214,168,79,0.35)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },

  heroIllustrationDot: {
    position: "absolute",
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: COLORS.gold,
    right: 11,
    top: 11,
    borderWidth: 3,
    borderColor: COLORS.navy,
  },

  headerBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 30,
  },

  headerBottomLine: {
    width: 27,
    height: 2,
    backgroundColor: COLORS.gold,
    borderRadius: 2,
  },

  headerBottomText: {
    color: "#C1CAD9",
    fontSize: 11,
    fontWeight: "500",
  },

  // 🟡 SECTION HEADING

  sectionHeading: {
    paddingHorizontal: 21,
    marginTop: 28,
    marginBottom: 17,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: -0.4,
  },

  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 5,
  },

  serviceCount: {
    backgroundColor: COLORS.goldLight,
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 8,
    alignItems: "center",
    minWidth: 62,
  },

  serviceCountNumber: {
    color: COLORS.navy,
    fontSize: 17,
    fontWeight: "900",
  },

  serviceCountLabel: {
    color: "#92702F",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 1,
  },

  // 🟢 MENU CARDS

  menuContainer: {
    paddingHorizontal: 17,
    gap: 12,
  },

  menuCard: {
    backgroundColor: COLORS.white,
    borderRadius: 21,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#14213D",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.045,
    shadowRadius: 10,
    elevation: 2,
  },

  menuIconContainer: {
    width: 54,
    height: 54,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },

  menuDetails: {
    flex: 1,
    marginLeft: 14,
    paddingRight: 7,
  },

  menuTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
  },

  menuSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 5,
    lineHeight: 16,
  },

  menuArrow: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: "#F2F4F8",
    justifyContent: "center",
    alignItems: "center",
  },

  // 🔵 INFORMATION CARD

  infoCard: {
    marginHorizontal: 18,
    marginTop: 26,
    backgroundColor: COLORS.navy,
    borderRadius: 22,
    padding: 19,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  infoIcon: {
    width: 47,
    height: 47,
    borderRadius: 15,
    backgroundColor: "rgba(214,168,79,0.14)",
    justifyContent: "center",
    alignItems: "center",
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "800",
  },

  infoDescription: {
    color: "#C1CAD9",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },

  // 🟡 FOOTER

  footer: {
    marginTop: 29,
    paddingHorizontal: 55,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },

  footerText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});