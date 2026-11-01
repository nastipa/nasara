// 🔵 ==========================================
// 🔵 NASARA HEALTH
// 🔵 PREMIUM HEALTHCARE HOME SCREEN
// 🔵 ==========================================

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

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
  blue: "#3478D4",
  red: "#D94A4A",
  purple: "#7952B3",
  orange: "#D58B2B",
  teal: "#168F91",
};

// 🟢 ==========================================
// 🟢 HEALTH SERVICE TYPE
// 🟢 ==========================================

type HealthService = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  route: string;
  color: string;
  background: string;
  badge?: string;
};

// 🟣 ==========================================
// 🟣 MAIN HEALTH SCREEN
// 🟣 ==========================================

export default function HealthHome() {
  const router = useRouter();

  const [isStaff, setIsStaff] = useState(false);
  const [checkingStaff, setCheckingStaff] = useState(true);

  // 🔵 ==========================================
  // 🔵 CHECK HOSPITAL STAFF STATUS
  // 🔵 ==========================================

  const checkStaff = async () => {
    try {
      setCheckingStaff(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsStaff(false);
        return;
      }

      const { data, error } = await supabase
        .from("hospital_department_staff")
        .select("id")
        .eq("user_id", user.id)
        .eq("active", true)
        .maybeSingle();

      if (error) {
        console.log(error);
        setIsStaff(false);
        return;
      }

      setIsStaff(!!data);
    } catch (err) {
      console.log(err);
      setIsStaff(false);
    } finally {
      setCheckingStaff(false);
    }
  };

  // 🔄 ==========================================
  // 🔄 CHECK STAFF ON SCREEN LOAD
  // 🔄 ==========================================

  useEffect(() => {
    checkStaff();
  }, []);

  // 🟡 ==========================================
  // 🟡 HEALTH SERVICES
  // 🟡 ==========================================

  const services: HealthService[] = [
    {
      icon: "notifications-outline",
      title: "Notifications",
      subtitle: "Receive important hospital and healthcare updates.",
      route: "/health/notifications",
      color: COLORS.teal,
      background: "#E5F5F4",
    },
    {
      icon: "calendar-outline",
      title: "Smart Hospital Queue",
      subtitle: "Book a hospital queue before leaving home.",
      route: "/health/hospitals",
      color: COLORS.blue,
      background: "#EAF1FC",
    },
    {
      icon: "medkit-outline",
      title: "Emergency Hospitals",
      subtitle: "Find nearby emergency hospitals using GPS.",
      route: "/health/emergency-hospitals",
      color: COLORS.red,
      background: "#FCECEC",
      badge: "EMERGENCY",
    },
    {
      icon: "stats-chart-outline",
      title: "Live Queue Board",
      subtitle: "See current queue progress across hospitals.",
      route: "/health/live-queue",
      color: COLORS.green,
      background: "#E8F5EE",
      badge: "LIVE",
    },
    {
      icon: "time-outline",
      title: "My Hospital Queue",
      subtitle: "View your queue number and QR check-in.",
      route: "/health/my-queue",
      color: COLORS.orange,
      background: "#FBF1E2",
    },
    {
      icon: "document-text-outline",
      title: "Visit History",
      subtitle: "Review your previous hospital visits.",
      route: "/health/visit-history",
      color: COLORS.purple,
      background: "#F1EBFA",
    },
  ];

  // 🟢 ==========================================
  // 🟢 LOADING SCREEN
  // 🟢 ==========================================

  if (checkingStaff) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={COLORS.navy}
        />

        <View style={styles.loadingIcon}>
          <Ionicons
            name="medical"
            size={36}
            color={COLORS.gold}
          />
        </View>

        <ActivityIndicator
          size="large"
          color={COLORS.gold}
          style={{ marginTop: 22 }}
        />

        <Text style={styles.loadingText}>
          Preparing Nasara Health...
        </Text>
      </View>
    );
  }

  // 🔵 ==========================================
  // 🔵 MAIN UI
  // 🔵 ==========================================

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
                  name="medical"
                  size={20}
                  color={COLORS.navy}
                />
              </View>

              <Text style={styles.brandName}>
                NASARA
              </Text>
            </View>

            <View style={styles.headerLabel}>
              <View style={styles.headerDot} />

              <Text style={styles.headerLabelText}>
                HEALTH
              </Text>
            </View>
          </View>

          {/* HERO CONTENT */}

          <View style={styles.heroContent}>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroEyebrow}>
                YOUR HEALTHCARE COMPANION
              </Text>

              <Text style={styles.heroTitle}>
                Nasara Health
              </Text>

              <Text style={styles.heroSubtitle}>
                Access healthcare services, manage hospital queues
                and stay connected to care.
              </Text>
            </View>

            <View style={styles.heroIllustration}>
              <Ionicons
                name="heart"
                size={39}
                color={COLORS.gold}
              />

              <View style={styles.heroMedicalPlus}>
                <Ionicons
                  name="add"
                  size={19}
                  color={COLORS.navy}
                />
              </View>
            </View>
          </View>

          {/* HEADER FOOTER */}

          <View style={styles.headerBottom}>
            <View style={styles.headerBottomLine} />

            <Text style={styles.headerBottomText}>
              Better access. Smarter healthcare.
            </Text>
          </View>
        </View>

        {/* 🟡 WELCOME SECTION */}

        <View style={styles.welcomeSection}>
          <View>
            <Text style={styles.sectionTitle}>
              Healthcare services
            </Text>

            <Text style={styles.sectionSubtitle}>
              What would you like to do today?
            </Text>
          </View>

          <View style={styles.serviceCount}>
            <Text style={styles.serviceCountNumber}>
              {services.length + (isStaff ? 1 : 0)}
            </Text>

            <Text style={styles.serviceCountLabel}>
              SERVICES
            </Text>
          </View>
        </View>

        {/* 🟢 SERVICE CARDS */}

        <View style={styles.servicesContainer}>
          {services.map((service, index) => (
            <TouchableOpacity
              key={index}
              activeOpacity={0.85}
              onPress={() => router.push(service.route as any)}
              style={styles.serviceCard}
            >
              {/* ICON */}

              <View
                style={[
                  styles.serviceIcon,
                  {
                    backgroundColor: service.background,
                  },
                ]}
              >
                <Ionicons
                  name={service.icon}
                  size={27}
                  color={service.color}
                />
              </View>

              {/* DETAILS */}

              <View style={styles.serviceDetails}>
                <View style={styles.serviceTitleRow}>
                  <Text style={styles.serviceTitle}>
                    {service.title}
                  </Text>

                  {service.badge && (
                    <View
                      style={[
                        styles.serviceBadge,
                        service.badge === "EMERGENCY"
                          ? styles.emergencyBadge
                          : styles.liveBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.serviceBadgeText,
                          service.badge === "EMERGENCY"
                            ? styles.emergencyBadgeText
                            : styles.liveBadgeText,
                        ]}
                      >
                        {service.badge}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={styles.serviceSubtitle}>
                  {service.subtitle}
                </Text>
              </View>

              {/* ARROW */}

              <View style={styles.serviceArrow}>
                <Ionicons
                  name="chevron-forward"
                  size={19}
                  color={COLORS.navy}
                />
              </View>
            </TouchableOpacity>
          ))}

          {/* 🟣 STAFF DASHBOARD */}

          {isStaff && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() =>
                router.push(
                  "/health/department-staff-dashboard"
                )
              }
              style={[
                styles.serviceCard,
                styles.staffCard,
              ]}
            >
              <View style={styles.staffIcon}>
                <Ionicons
                  name="people-outline"
                  size={27}
                  color={COLORS.gold}
                />
              </View>

              <View style={styles.serviceDetails}>
                <View style={styles.serviceTitleRow}>
                  <Text style={styles.serviceTitle}>
                    Staff Dashboard
                  </Text>

                  <View style={styles.staffBadge}>
                    <Text style={styles.staffBadgeText}>
                      STAFF
                    </Text>
                  </View>
                </View>

                <Text style={styles.serviceSubtitle}>
                  Manage department queues and patients.
                </Text>
              </View>

              <View style={styles.serviceArrow}>
                <Ionicons
                  name="chevron-forward"
                  size={19}
                  color={COLORS.navy}
                />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* 🔵 HEALTH INFORMATION CARD */}

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="heart-circle-outline"
              size={29}
              color={COLORS.gold}
            />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              Healthcare made more accessible
            </Text>

            <Text style={styles.infoDescription}>
              Use Nasara Health to explore hospital services,
              check queue progress and manage your hospital visits.
            </Text>
          </View>
        </View>

        {/* 🟡 FOOTER */}

        <View style={styles.footer}>
          <View style={styles.footerLine} />

          <Text style={styles.footerText}>
            NASARA HEALTH
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
    color: COLORS.white,
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

  headerDot: {
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

  // 🟡 HERO

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
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.6,
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
    fontSize: 12,
    lineHeight: 19,
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

  heroMedicalPlus: {
    position: "absolute",
    width: 29,
    height: 29,
    borderRadius: 10,
    backgroundColor: COLORS.gold,
    right: -5,
    top: -5,
    justifyContent: "center",
    alignItems: "center",
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

  // 🟢 SECTION HEADING

  welcomeSection: {
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

  // 🟣 SERVICE CARDS

  servicesContainer: {
    paddingHorizontal: 17,
    gap: 12,
  },

  serviceCard: {
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

  serviceIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },

  serviceDetails: {
    flex: 1,
    marginLeft: 14,
    paddingRight: 6,
  },

  serviceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
  },

  serviceTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },

  serviceSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 5,
    lineHeight: 16,
  },

  serviceArrow: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: "#F2F4F8",
    justifyContent: "center",
    alignItems: "center",
  },

  // 🔴 BADGES

  serviceBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
  },

  serviceBadgeText: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  emergencyBadge: {
    backgroundColor: "#FCE8E8",
  },

  emergencyBadgeText: {
    color: COLORS.red,
  },

  liveBadge: {
    backgroundColor: "#E4F5EB",
  },

  liveBadgeText: {
    color: COLORS.green,
  },

  // 🟡 STAFF CARD

  staffCard: {
    borderColor: "rgba(214,168,79,0.45)",
    backgroundColor: "#FFFEFA",
  },

  staffIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: COLORS.navy,
    justifyContent: "center",
    alignItems: "center",
  },

  staffBadge: {
    backgroundColor: COLORS.goldLight,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
  },

  staffBadgeText: {
    color: "#92702F",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.5,
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
    fontSize: 13,
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
    fontWeight: "700",
    letterSpacing: 1,
  },
});