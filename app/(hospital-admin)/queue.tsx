import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
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

type Booking = {
  id: string;
  queue_number: string;
  booking_code: string;
  status: string;
  condition: string;
  checked_in: boolean;

  hospital_departments: {
    id: string;
    name: string;
  };
};

export default function HospitalQueue() {
  const [queue, setQueue] =
    useState<Booking[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

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
            `${API_URL}/hospital/queue`,
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
              "Unable to load queue."
          );
        }

        setQueue(
          json.queue || []
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
    loadQueue();

    const interval =
      setInterval(() => {
        loadQueue();
      }, 10000);

    return () =>
      clearInterval(interval);
  }, [loadQueue]);

  const onRefresh = () => {
    setRefreshing(true);
    loadQueue();
  };
const updateStatus = async (
    bookingId: string,
    status:
      | "called"
      | "checked_in"
      | "completed"
      | "cancelled"
      | "no_show"
  ) => {
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
          `${API_URL}/hospital/update-booking-status`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              booking_id: bookingId,
              status,
            }),
          }
        );

      const json =
        await response.json();

      if (!response.ok) {
        throw new Error(
          json.error ||
            "Unable to update booking."
        );
      }

      loadQueue();

    } catch (err: any) {
      showMessage(
        "Error",
        err.message
      );
    }
  };

 const renderItem = ({
  item,
}: {
  item: Booking;
}) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Text style={styles.queueNumber}>
        {item.queue_number}
      </Text>

      <View
        style={[
          styles.statusBadge,
          item.status === "waiting"
            ? styles.waiting
            : item.status === "called"
            ? styles.called
            : item.status === "checked_in"
            ? styles.checkedIn
            : styles.completed,
        ]}
      >
        <Text style={styles.statusText}>
          {item.status
            .replace(/_/g, " ")
            .toUpperCase()}
        </Text>
      </View>
    </View>

    <Text style={styles.department}>
      {item.hospital_departments?.name}
    </Text>

    {!!item.condition && (
      <Text style={styles.condition}>
        {item.condition}
      </Text>
    )}

    <Text style={styles.bookingCode}>
      Booking Code: {item.booking_code}
    </Text>

    <View style={styles.actions}>
      {item.status === "waiting" && (
        <TouchableOpacity
          style={styles.callButton}
          onPress={() =>
            updateStatus(
              item.id,
              "called"
            )
          }
        >
          <Text style={styles.buttonText}>
            Call Patient
          </Text>
        </TouchableOpacity>
      )}

      {item.status === "called" && (
        <TouchableOpacity
          style={styles.checkInButton}
          onPress={() =>
            updateStatus(
              item.id,
              "checked_in"
            )
          }
        >
          <Text style={styles.buttonText}>
            Check In
          </Text>
        </TouchableOpacity>
      )}

      {item.status === "checked_in" && (
        <TouchableOpacity
          style={styles.completeButton}
          onPress={() =>
            updateStatus(
              item.id,
              "completed"
            )
          }
        >
          <Text style={styles.buttonText}>
            Complete Visit
          </Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);


// MAIN SCREEN RENDER
return (
  <View
    style={{
      flex: 1,
      backgroundColor: "#F5F7FA",
    }}
  >
    {loading ? (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Loading queue...
        </Text>
      </View>

    ) : queue.length === 0 ? (

      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>
          No Queue Today
        </Text>

        <Text style={styles.emptyText}>
          No patients have joined today's queue.
        </Text>
      </View>

    ) : (

      <FlatList
        data={queue}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{
          padding: 16,
        }}
      />

    )}
  </View>
);
}
  const styles = StyleSheet.create({
  container: {
    flex: 1,
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

  header: {
    marginBottom: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 22,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 80,
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },

  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
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

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  queueNumber: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0A7CFF",
  },

  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  waiting: {
    backgroundColor: "#F59E0B",
  },

  called: {
    backgroundColor: "#2563EB",
  },

  checkedIn: {
    backgroundColor: "#16A34A",
  },

  completed: {
    backgroundColor: "#6B7280",
  },

  statusText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },

  department: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },

  condition: {
    fontSize: 15,
    color: "#4B5563",
    marginBottom: 10,
    lineHeight: 22,
  },

  bookingCode: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },

  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },

  callButton: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },

  checkInButton: {
    backgroundColor: "#16A34A",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },

  completeButton: {
    backgroundColor: "#7C3AED",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
});