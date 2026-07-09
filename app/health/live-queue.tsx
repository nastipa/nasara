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

type LiveQueue = {
  hospital: string;
  department: string;
  current_serving: number | null;
  next_numbers: number[];
  total_waiting: number;
  your_number: number | null;
  people_ahead: number;
  estimated_wait_minutes: number;
};

export default function LiveQueueScreen() {
  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [queue, setQueue] =
    useState<LiveQueue | null>(null);

  const loadQueue =
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
            `${API_URL}/hospital/live-queue`,
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
              "Unable to load queue."
          );
        }

        setQueue(
          json.queue ?? null
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

  const onRefresh = () => {
    setRefreshing(true);
    loadQueue();
  };

  useEffect(() => {

    loadQueue();

    const interval =
      setInterval(() => {
        loadQueue();
      }, 10000);

    const channel =
      supabase
        .channel(
          "hospital-live-queue"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "hospital_bookings",
          },
          () => {
            loadQueue();
          }
        )
        .subscribe();

    return () => {

      clearInterval(
        interval
      );

      supabase.removeChannel(
        channel
      );

    };

  }, [loadQueue])
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>
          Loading live queue...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      }
    >
      {!queue ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            No Active Queue
          </Text>

          <Text style={styles.emptyText}>
            You are not currently in a hospital queue.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.hospitalName}>
              {queue.hospital}
            </Text>

            <Text style={styles.department}>
              {queue.department}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Currently Serving
            </Text>

            <Text style={styles.currentNumber}>
              {queue.current_serving ?? "--"}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Your Queue Number
            </Text>

            <Text style={styles.yourNumber}>
              {queue.your_number ?? "--"}
            </Text>

            <Text style={styles.infoText}>
              People Ahead: {queue.people_ahead}
            </Text>

            <Text style={styles.waitText}>
              Estimated Wait
            </Text>

            <Text style={styles.waitMinutes}>
              {queue.estimated_wait_minutes} min
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Next Numbers
            </Text>

            <View style={styles.nextContainer}>
              {queue.next_numbers.length > 0 ? (
                queue.next_numbers.map(
                  (num, index) => (
                    <View
                      key={index}
                      style={styles.nextBadge}
                    >
                      <Text
                        style={styles.nextBadgeText}
                      >
                        {num}
                      </Text>
                    </View>
                  )
                )
              ) : (
                <Text style={styles.infoText}>
                  No upcoming queue numbers.
                </Text>
              )}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Queue Statistics
            </Text>

            <Text style={styles.infoText}>
              Total Waiting: {queue.total_waiting}
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: "#F5F7FA",
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

  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    marginTop: 80,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },

  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 3,
  },

  hospitalName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },

  department: {
    marginTop: 4,
    fontSize: 16,
    color: "#6B7280",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 14,
    color: "#111827",
  },

  currentNumber: {
    textAlign: "center",
    fontSize: 42,
    fontWeight: "800",
    color: "#DC2626",
  },

  yourNumber: {
    textAlign: "center",
    fontSize: 40,
    fontWeight: "800",
    color: "#2563EB",
    marginBottom: 16,
  },

  waitText: {
    marginTop: 10,
    textAlign: "center",
    color: "#777",
    fontSize: 15,
  },

  waitMinutes: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: "700",
    color: "#16A34A",
    marginTop: 6,
  },

  infoText: {
    fontSize: 16,
    color: "#444",
    marginTop: 8,
  },

  nextContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },

  nextBadge: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    margin: 6,
  },

  nextBadgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});