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

  current_serving: string | null;

  next_numbers: string[];
  queue_board: {
  queue_number: string;
  status: string;
  is_you: boolean;
}[];

  your_number: string | null;

  people_ahead: number;

  estimated_wait_minutes: number;

  total_waiting: number;

  progress_percent?: number;
};

const getStatusLabel = (
  status: string
) => {

  switch(status) {

    case "waiting":
      return "Waiting";

    case "called":
      return "Consultation";

    case "in_consultation":
      return "Consultation";

    case "admitted":
      return "Admitted";

    case "discharged":
      return "Discharged";

    case "transferred":
      return "Transferred";

    case "referred":
      return "Referral";

    default:
      return status
        .replace(/_/g, " ")
        .replace(/\b\w/g, c =>
          c.toUpperCase()
        );

  }

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

            {queue.current_serving === queue.your_number && (
<Text
style={{
textAlign:"center",
marginTop:10,
fontWeight:"700",
color:"#16A34A",
}}
>
Your consultation turn is ready.
</Text>
)}
            <Text
  style={{
    textAlign: "center",
    marginTop: 10,
    color: "#666",
    fontSize: 16,
  }}
>
 Please wait until your queue number reaches the consultation desk.
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
            <View
  style={{
    height: 12,
    backgroundColor: "#ddd",
    borderRadius: 8,
    marginTop: 18,
  }}
>
  <View
    style={{
      height: 12,
      width: `${queue.progress_percent || 0}%`,
      backgroundColor: "#22c55e",
      borderRadius: 8,
    }}
  />
</View>

<Text
  style={{
    textAlign: "center",
    marginTop: 8,
    fontWeight: "700",
  }}
>
  {queue.progress_percent || 0}% Complete
</Text>
 {queue.people_ahead === 0 &&
queue.current_serving === queue.your_number && (
  <View
    style={{
      backgroundColor: "#16A34A",
      padding: 18,
      borderRadius: 12,
      marginTop: 20,
    }}
  >
    <Text
      style={{
        color: "#fff",
        fontWeight: "700",
        fontSize: 18,
      }}
    >
      🎉 It is now your turn.
    </Text>

    <Text
      style={{
        color: "#fff",
        marginTop: 6,
      }}
    >
      Please proceed to the consultation department.
    </Text>
  </View>
)}
          </View>

          <View style={styles.card}>

  <Text style={styles.sectionTitle}>
    Live Queue Board
  </Text>

  {queue.queue_board?.length ? (

    queue.queue_board.map(
      (item, index) => (

        <View
          key={index}
         style={[
  styles.queueRow,

  item.is_you && {
    backgroundColor: "#DBEAFE",
    borderColor: "#2563EB",
    borderWidth: 2,
  },

  item.status === "called" && {
    backgroundColor: "#DCFCE7",
    borderColor: "#16A34A",
    borderWidth: 2,
  },
]}
        >

          <Text
            style={styles.queueRowNumber}
          >
            {item.queue_number}
          </Text>

          <View
            style={{
              flex: 1,
              alignItems: "flex-end",
            }}
          >

           {item.is_you ? (

<Text
  style={styles.youBadge}
>
  YOU
</Text>

) : item.status === "called" ? (

<Text
  style={styles.servingBadge}
>
  SERVING
</Text>

) : (

<Text
  style={styles.queueStatus}
>
  {getStatusLabel(item.status)}
</Text>
)}
          </View>

        </View>

      )
    )

  ) : (

    <Text style={styles.infoText}>
      Queue board unavailable.
    </Text>

  )}

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
  servingBadge: {
  backgroundColor: "#16A34A",
  color: "#FFFFFF",
  paddingHorizontal: 12,
  paddingVertical: 4,
  borderRadius: 20,
  overflow: "hidden",
  fontWeight: "700",
  fontSize: 13,
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
  queueRow: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#F9FAFB",
  paddingVertical: 14,
  paddingHorizontal: 16,
  borderRadius: 12,
  marginBottom: 10,
},

queueRowNumber: {
  fontSize: 22,
  fontWeight: "700",
  color: "#111827",
},

queueStatus: {
  fontSize: 14,
  fontWeight: "600",
  color: "#6B7280",
},

youBadge: {
  backgroundColor: "#2563EB",
  color: "#FFFFFF",
  paddingHorizontal: 12,
  paddingVertical: 4,
  borderRadius: 20,
  overflow: "hidden",
  fontWeight: "700",
  fontSize: 13,
},
});