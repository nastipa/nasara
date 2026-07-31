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
import QRCode from "react-native-qrcode-svg";
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
  estimated_wait_minutes: number;
  status:
 | "waiting"
 | "called"
 | "consultation"
 | "admitted"
 | "discharged"
 | "transferred"
 | "referred"
 | "cancelled"
 | "no_show";
  condition: string;
  priority: string;
priority_level: number;
  created_at: string;
hospitals: {
  id: string;
  name: string;
  city: string;
  district: string;
  region: string;
  phone: string;
  address: string;
};
  hospital_departments: {
    id: string;
    name: string;
  };
};

export default function MyQueueScreen() {
  const router = useRouter();
  
  const [booking, setBooking] =
    useState<Booking | null>(null);
    const [progress, setProgress] =
  useState<any>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const loadQueue = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

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

        const url =
`${API_URL}/hospital/my-queue`;

const response = await fetch(url, {
  headers: {
    Authorization: `Bearer ${session.access_token}`,
  },
});

        const json = await response.json();
        console.log("MY QUEUE RESPONSE:", json);

        if (!response.ok) {
          throw new Error(
            json.error ||
              "Unable to load queue."
          );
        }

        setBooking(json.booking ?? null);
        await loadQueueProgress();
      } catch (err: any) {
        showMessage(
          "Error",
          err.message
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );
  async function loadQueueProgress() {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) return;

    const response = await fetch(
      `${API_URL}/hospital/queue-progress`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    const json = await response.json();
console.log("MY QUEUE RESPONSE:", json);
    if (response.ok) {
      setProgress(json.progress);
    }

  } catch (e) {
    console.log(e);
  }
}

  const onRefresh = () => {
    setRefreshing(true);
    loadQueue(false);
  };

  useEffect(() => {
    loadQueue();

    const interval = setInterval(() => {
      loadQueue(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [loadQueue]);

  if (loading) {
    return (
      <View
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>
          Loading queue...
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
      {!booking ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            No Active Queue
          </Text>

          <Text style={styles.emptyText}>
            You do not have any active hospital
            queue today.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.hospitalName}>
              {booking.hospitals?.name}
            </Text>

            <Text style={styles.department}>
              {booking.hospital_departments?.name}
            </Text>

            <View style={styles.statusContainer}>
              <Text style={styles.statusLabel}>
                Status
              </Text>

              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {booking.status
                    .replace(/_/g, " ")
                    .toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
          <View
  style={{
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor:
  booking.priority === "critical"
    ? "#DC2626"
    : booking.priority === "urgent"
    ? "#F59E0B"
    : "#16A34A",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  }}
>
  <Text
    style={{
      color: "#fff",
      fontWeight: "700",
    }}
  >
    {booking.priority.toUpperCase()}
  </Text>
</View>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Queue Number
            </Text>

            <Text style={styles.queueNumber}>
              {booking.queue_number}
            </Text>

            <Text style={styles.waitText}>
              Estimated Wait
            </Text>

            <Text style={styles.waitMinutes}>
              {booking.estimated_wait_minutes} min
            </Text>
            {progress && (
  <>
    <View
      style={{
        marginTop: 25,
      }}
    >
      <Text
        style={{
          fontWeight: "700",
          fontSize: 17,
        }}
      >
        Live Queue Progress
      </Text>

      <Text
        style={{
          marginTop: 10,
        }}
      >
        Current Serving:
        {" "}
        {progress.current_serving ?? "-"}
      </Text>

      <Text>
        People Ahead:
        {" "}
        {progress.people_ahead}
      </Text>

      <Text>
        Progress:
        {" "}
        {progress.progress_percent}%
      </Text>
      <Text>
Your Queue Number: {progress.your_number}
</Text>

<Text>
Estimated Wait:
{" "}
{progress.estimated_wait_minutes} min
</Text>
      <View
        style={{
          height: 12,
          backgroundColor: "#ddd",
          borderRadius: 8,
          marginTop: 10,
        }}
      >
        <View
          style={{
            height: 12,
            width: `${progress.progress_percent}%`,
            backgroundColor: "#22c55e",
            borderRadius: 8,
          }}
        />
      </View>
    </View>
  </>
)}
             {progress?.status === "called" && (
  <View
    style={{
      backgroundColor:"#16A34A",
      padding:18,
      borderRadius:12,
      marginTop:20,
    }}
  >

    <Text
      style={{
        color:"#fff",
        fontWeight:"800",
        fontSize:18,
      }}
    >
      🎉 Your turn has arrived
    </Text>


    <Text
      style={{
        color:"#fff",
        marginTop:8,
      }}
    >
      Please proceed to the consultation department.
    </Text>

  </View>
)}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Booking Code
            </Text>

            <Text style={styles.bookingCode}>
              {booking.booking_code}
            </Text>

            <View style={styles.qrContainer}>
  {booking.booking_code ? (
    <QRCode
      value={String(booking.booking_code)}
      size={220}
    />
  ) : (
    <Text>
      Booking code not available
    </Text>
  )}
</View>

            <Text style={styles.scanText}>
             Present this QR code when you arrive
             for your consultation.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Hospital Details
            </Text>

            <Text style={styles.info}>
              Town:{" "}
              {booking.hospitals?.city}
            </Text>
            <Text style={styles.info}>
  District:{" "}
  {booking.hospitals?.district}
</Text>

            <Text style={styles.info}>
              Region:{" "}
              {booking.hospitals?.region}
            </Text>

            <Text style={styles.info}>
              Phone:{" "}
              {booking.hospitals?.phone}
            </Text>

            {!!booking.condition && (
              <>
                <Text
                  style={styles.conditionLabel}
                >
                  Reason for Consultation
                </Text>

                <Text
                  style={styles.condition}
                >
                  {booking.condition}
                </Text>
              </>
            )}
          </View>
        </>
        
      )}
      
      <TouchableOpacity
  style={styles.liveButton}
  onPress={() =>
    router.push("/health/live-queue")
  }
>
  <Text style={styles.liveButtonText}>
    📈 Live Consultation Queue 
  </Text>
</TouchableOpacity>
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
    alignItems: "center",
    marginTop: 80,
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#222",
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
    color: "#111",
  },

  department: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
  },

  statusContainer: {
    marginTop: 16,
  },

  statusLabel: {
    fontSize: 14,
    color: "#888",
    marginBottom: 8,
  },

  statusBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#0A7CFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },

  statusText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: "#222",
  },

  queueNumber: {
    fontSize: 40,
    fontWeight: "800",
    textAlign: "center",
    color: "#0A7CFF",
    marginBottom: 20,
  },

  waitText: {
    textAlign: "center",
    fontSize: 15,
    color: "#777",
  },

  waitMinutes: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: "700",
    color: "#16A34A",
    marginTop: 6,
  },

  bookingCode: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 2,
    color: "#111",
    marginBottom: 24,
  },

  qrContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
  },

  scanText: {
    marginTop: 20,
    textAlign: "center",
    color: "#666",
    fontSize: 15,
    lineHeight: 22,
  },

  info: {
    fontSize: 16,
    color: "#444",
    marginBottom: 10,
  },

  conditionLabel: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
  },

  condition: {
    fontSize: 16,
    color: "#555",
    lineHeight: 24,
  },
  liveButton: {
  backgroundColor: "#2563eb",
  padding: 18,
  borderRadius: 14,
  alignItems: "center",
  marginTop: 20,
},

liveButtonText: {
  color: "#fff",
  fontSize: 18,
  fontWeight: "700",
},
});