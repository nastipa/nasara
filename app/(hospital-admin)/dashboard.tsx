import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

const API_URL =
  "https://nasara-upload-server.onrender.com";

const showMessage = (
  title: string,
  message?: string
) => {
  if (Platform.OS === "web") {
    window.alert(
      message
        ? `${title}\n\n${message}`
        : title
    );
  } else {
    Alert.alert(title, message);
  }
};

type DashboardData = {
  waiting: number;
  called: number;
  checked_in: number;
  completed: number;
  total: number;
};

export default function HospitalDashboard() {
  const router = useRouter();

  const [dashboard, setDashboard] =
    useState<DashboardData>({
      waiting: 0,
      called: 0,
      checked_in: 0,
      completed: 0,
      total: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);
    const [isSuperAdmin, setIsSuperAdmin] =
  useState(false);

  const loadDashboard =
    useCallback(async () => {
      try {
        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (!session?.access_token) {
          showMessage(
            "Login Required",
            "Please login again."
          );
          return;
        }

        const response =
          await fetch(
            `${API_URL}/hospital/dashboard`,
            {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            }
          );

        const json =
          await response.json();

        if (!response.ok) {
          throw new Error(
            json.error ||
              "Unable to load dashboard."
          );
        }

        setDashboard(
          json.dashboard
        );

      } catch (err: any) {
        showMessage(
          "Error",
          err.message
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, []);

 useEffect(() => {
  loadDashboard();
  checkSuperAdmin();

  const interval = setInterval(() => {
    loadDashboard();
  }, 15000);

  return () => clearInterval(interval);
}, [loadDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };
  const checkSuperAdmin = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsSuperAdmin(false);
      return;
    }

    const { data, error } = await supabase
      .from("hospital_admins")
      .select("role, status")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .eq("status", "approved")
      .maybeSingle();

    if (error) {
      console.log("Super Admin Check:", error);
      setIsSuperAdmin(false);
      return;
    }

    setIsSuperAdmin(!!data);

  } catch (e) {
    console.log(e);
    setIsSuperAdmin(false);
  }
};
  const StatCard = ({
    title,
    value,
    color,
    icon,
  }: {
    title: string;
    value: number;
    color: string;
    icon: keyof typeof Ionicons.glyphMap;
  }) => (
    <View
      style={[
        styles.statCard,
        {
          borderLeftColor: color,
        },
      ]}
    >
      <View style={styles.statHeader}>
        <Ionicons
          name={icon}
          size={26}
          color={color}
        />

        <Text style={styles.statValue}>
          {value}
        </Text>
      </View>

      <Text style={styles.statTitle}>
        {title}
      </Text>
    </View>
  );

  const QuickAction = ({
    title,
    icon,
    color,
    onPress,
  }: {
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={styles.actionCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View
        style={[
          styles.actionIcon,
          {
            backgroundColor: color,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={24}
          color="#fff"
        />
      </View>

      <Text style={styles.actionTitle}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const goToQueue = () => {
    router.push(
      "/(hospital-admin)/queue"
    );
  };

  const goToDepartments = () => {
    router.push(
      "/(hospital-admin)/departments"
    );
  };

  const goToCheckIn = () => {
    router.push(
      "/(hospital-admin)/checkin"
    );
  };
  const goToPatientRegistration = () => {
  router.push(
    "/(hospital-admin)/patient-registration"
  );
};

  const goToSettings = () => {
    router.push(
      "/(hospital-admin)/settings"
    );
  };
  const goToAnalytics = () => {
  router.push(
    "/(hospital-admin)/analytics"
  );
};
const goToNotifications = () => {
  router.push("/(hospital-admin)/notifications");
};
  const goToCreateHospitalAdmin = () => {
  router.push(
    "/(hospital-admin)/create-hospital-admin"
  );
};
const goToCreateHospital = () => {
  router.push("/(hospital-admin)/create-hospital");
};

const goToManageHospitals = () => {
  router.push("/(hospital-admin)/manage-hospitals");
};


const goToManageHospitalAdmins = () => {
  router.push(
    "/(hospital-admin)/hospital-admins"
  );
};

const goToHospitalSettings = () => {
  router.push(
    "/(hospital-admin)/hospital-settings"
  );
};
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0A7CFF" />
        <Text style={styles.loadingText}>
          Loading dashboard...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>
          Hospital Dashboard
        </Text>

        <Text style={styles.subtitle}>
          Monitor today's hospital queue and manage your departments.
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          title="Waiting"
          value={dashboard.waiting}
          color="#F59E0B"
          icon="time"
        />

        <StatCard
          title="Called"
          value={dashboard.called}
          color="#3B82F6"
          icon="megaphone"
        />

        <StatCard
          title="Checked In"
          value={dashboard.checked_in}
          color="#10B981"
          icon="checkmark-circle"
        />

        <StatCard
          title="Completed"
          value={dashboard.completed}
          color="#8B5CF6"
          icon="medical"
        />

        <StatCard
          title="Today's Total"
          value={dashboard.total}
          color="#EF4444"
          icon="people"
        />
      </View>

      <Text style={styles.sectionTitle}>
        Quick Actions
      </Text>

      <View style={styles.actionsGrid}>
        <QuickAction
          title="Today's Queue"
          icon="list"
          color="#2563EB"
          onPress={goToQueue}
        />

        <QuickAction
          title="Departments"
          icon="business"
          color="#16A34A"
          onPress={goToDepartments}
        />

        <QuickAction
          title="QR Check In"
          icon="qr-code"
          color="#EA580C"
          onPress={goToCheckIn}
        />
        <QuickAction
  title="Patient Registration"
  icon="person-add"
  color="#0891B2"
  onPress={goToPatientRegistration}
/>
       <QuickAction
  title="Notifications"
  icon="notifications"
  color="#DC2626"
  onPress={goToNotifications}
/>
        
        <QuickAction
  title="Analytics"
  icon="bar-chart"
  color="#7C3AED"
  onPress={goToAnalytics}
/>

      </View>
      {isSuperAdmin && (
  <>
    <Text style={styles.sectionTitle}>
      Hospital Management
    </Text>

    <View style={styles.actionsGrid}>
      <QuickAction
        title="Create Hospital"
        icon="business"
        color="#2563EB"
        onPress={goToCreateHospital}
      />

      <QuickAction
        title="Manage Hospitals"
        icon="list"
        color="#16A34A"
        onPress={goToManageHospitals}
      />
      <QuickAction
        title="Create Hospital Admin"
        icon="person-add"
        color="#eb25e5"
        onPress={goToCreateHospitalAdmin}
      />

      <QuickAction
        title="Manage Admins"
        icon="people"
        color="#16A34A"
        onPress={goToManageHospitalAdmins}
      />

      <QuickAction
        title="Hospital Settings"
        icon="settings"
        color="#F59E0B"
        onPress={goToHospitalSettings}
      />
    </View>
  </>
)}

      <View style={styles.infoCard}>
        <Ionicons
          name="information-circle"
          size={28}
          color="#0A7CFF"
        />

        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>
            Hospital Queue Management
          </Text>

          <Text style={styles.infoText}>
            Use the quick actions above to manage departments, monitor today's
            queue, and check in patients by scanning their QR code or booking
            code.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  content: {
    padding: 18,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },

  loadingText: {
    marginTop: 14,
    fontSize: 16,
    color: "#666",
  },

  header: {
    marginBottom: 22,
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#111827",
  },

  subtitle: {
    marginTop: 6,
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 22,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 26,
  },

  statCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 6,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 3,
  },

  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },

  statTitle: {
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "600",
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },

  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 28,
  },

  actionCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 22,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 3,
  },

  actionIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  actionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 3,
  },

  infoContent: {
    flex: 1,
    marginLeft: 14,
  },

  infoTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },

  infoText: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 22,
  },
});
