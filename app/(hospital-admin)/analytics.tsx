import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
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

type Analytics = {
  total_patients: number;
  patients_served_today: number;
  waiting: number;
  called: number;
  checked_in: number;
  completed: number;
  cancelled: number;
  no_show: number;
  average_wait_minutes: number;
  busiest_department: string | null;
  busiest_department_count: number;
  peak_hour: string | null;
  cancellation_rate: number;
  no_show_rate: number;
};
export default function HospitalAnalytics() {

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [analytics, setAnalytics] =
  useState<Analytics>({
    total_patients: 0,
    patients_served_today: 0,
    waiting: 0,
    called: 0,
    checked_in: 0,
    completed: 0,
    cancelled: 0,
    no_show: 0,
    average_wait_minutes: 0,
    busiest_department: null,
    busiest_department_count: 0,
    peak_hour: null,
    cancellation_rate: 0,
    no_show_rate: 0,
  });

  const loadAnalytics =
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
            `${API_URL}/hospital/analytics`,
            {
              headers: {
                Authorization:
                  `Bearer ${session.access_token}`,
              },
            }
          );

        const json =
          await response.json();

        if (!response.ok) {

          throw new Error(
            json.error ||
              "Unable to load analytics."
          );

        }

        setAnalytics(
          json.analytics
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

    loadAnalytics();

    const interval =
      setInterval(() => {

        loadAnalytics();

      }, 30000);

    return () =>
      clearInterval(interval);

  }, [loadAnalytics]);

  const onRefresh = () => {

    setRefreshing(true);

    loadAnalytics();

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
        styles.card,
        {
          borderLeftColor: color,
        },
      ]}
    >

      <View style={styles.cardHeader}>

        <Ionicons
          name={icon}
          size={28}
          color={color}
        />

        <Text style={styles.cardValue}>
          {value}
        </Text>

      </View>

      <Text style={styles.cardTitle}>
        {title}
      </Text>

    </View>

  );
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color="#2563EB"
        />

        <Text style={styles.loadingText}>
          Loading analytics...
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

      <Text style={styles.header}>
        📊 Hospital Analytics
      </Text>

      <Text style={styles.subtitle}>
        Monitor today's hospital performance,
        patient flow and waiting times.
      </Text>

      <View style={styles.grid}>

        <StatCard
          title="Today's Patients"
          value={analytics.total_patients}
          color="#2563EB"
          icon="people"
        />

        <StatCard
          title="Waiting"
          value={analytics.waiting}
          color="#F59E0B"
          icon="time"
        />

        <StatCard
          title="Completed"
          value={analytics.completed}
          color="#16A34A"
          icon="checkmark-circle"
        />
<StatCard
  title="Patients Served"
  value={analytics.patients_served_today}
  color="#8B5CF6"
  icon="business"
/>

      </View>

      <View style={styles.summaryCard}>

        <Text style={styles.summaryTitle}>
          Performance Summary
        </Text>

        <View style={styles.row}>

          <Ionicons
            name="hourglass"
            size={22}
            color="#F59E0B"
          />

          <Text style={styles.rowText}>
            Average Waiting Time
          </Text>

          <Text style={styles.rowValue}>
            {analytics.average_wait_minutes} min
          </Text>

        </View>

        <View style={styles.row}>

          <Ionicons
            name="medkit"
            size={22}
            color="#16A34A"
          />

          <Text style={styles.rowText}>
            Average Waiting Time
          </Text>
<Text style={styles.rowValue}>
  {analytics.average_wait_minutes} min
</Text>

        </View>

      </View>

      <View style={styles.infoCard}>

        <Ionicons
          name="analytics"
          size={30}
          color="#2563EB"
        />

        <View style={styles.infoContent}>

          <Text style={styles.infoTitle}>
            Analytics Overview
          </Text>

          <Text style={styles.infoText}>
            This dashboard provides a real-time
            overview of hospital operations,
            patient flow, queue efficiency and
            department performance. Statistics
            refresh automatically every 30
            seconds.
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
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },

  header: {
    fontSize: 30,
    fontWeight: "700",
    color: "#111827",
  },

  subtitle: {
    marginTop: 6,
    marginBottom: 24,
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 22,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  card: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  cardValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },

  cardTitle: {
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "600",
  },

  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 22,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 3,
  },

  summaryTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 18,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  rowText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#374151",
  },

  rowValue: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
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
    fontSize: 18,
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