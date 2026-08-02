import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

const API_URL =
  "https://nasara-upload-server.onrender.com";

type LiveBoard = {
  hospital_name: string;

  department_id: string;

  department_name: string;

  current_serving: string | null;

  next_numbers: string[];

  waiting_count: number;

  consultation_count: number;
};
export default function DepartmentLiveBoard() {
  const [loading, setLoading] =
    useState(true);

  const [boards, setBoards] =
    useState<LiveBoard[]>([]);
    const [currentTime, setCurrentTime] =
  useState(new Date());
  const pulse =
  useState(
    new Animated.Value(1)
  )[0];

const [lastServing, setLastServing] =
  useState<string | null>(null);
  const totalWaiting =
  boards.reduce(
    (sum, b) => sum + b.waiting_count,
    0
  );

const totalCheckedIn =
  boards.reduce(
    (sum, b) => sum + b.consultation_count,
    0
  )

  const loadBoard =
    useCallback(async () => {
      try {
        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (!session?.access_token) {
          return;
        }

        const response =
          await fetch(
            `${API_URL}/hospital/department-live-board`,
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
              "Unable to load live board."
          );
        }

        setBoards(
          json.boards || []
        );
      const currentNumber =
  json.boards?.[0]?.current_serving;

if (
  currentNumber &&
  currentNumber !== lastServing
) {

  setLastServing(currentNumber);

  Animated.sequence([

    Animated.timing(
      pulse,
      {
        toValue: 1.12,
        duration: 350,
        useNativeDriver: true,
      }
    ),

    Animated.timing(
      pulse,
      {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }
    ),

    Animated.timing(
      pulse,
      {
        toValue: 1.12,
        duration: 350,
        useNativeDriver: true,
      }
    ),

    Animated.timing(
      pulse,
      {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }
    ),

    Animated.timing(
      pulse,
      {
        toValue: 1.12,
        duration: 350,
        useNativeDriver: true,
      }
    ),

    Animated.timing(
      pulse,
      {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }
    ),

  ]).start();

}
      } catch (err) {

        console.log(err);

      } finally {

        setLoading(false);

      }

    }, []);

  useEffect(() => {

  loadBoard();

  const refreshInterval =
    setInterval(() => {
      loadBoard();
    }, 5000);

  const clockInterval =
    setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

  return () => {
    clearInterval(refreshInterval);
    clearInterval(clockInterval);
  };

}, [loadBoard]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
        />
      </View>
    );
  }

  if (!boards.length) {
    return (
      <View style={styles.loading}>
        <Text>
          No active queues today.
        </Text>
      </View>
    );
  }
  return (
  <FlatList
    data={boards}
    keyExtractor={(item) => item.department_id}
    contentContainerStyle={styles.container}
    renderItem={({ item }) => (
      <View style={styles.departmentCard}>
        <View style={styles.header}>

  <Text style={styles.hospitalName}>
    🏥 {item.hospital_name}
  </Text>

  <Text style={styles.departmentName}>
    {item.department_name}
  </Text>

  <Text style={styles.dateText}>
    {currentTime.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })}
  </Text>

  <Text style={styles.timeText}>
    {currentTime.toLocaleTimeString()}
  </Text>

</View>

        <View style={styles.servingCard}>

  <Text style={styles.servingTitle}>
    🟢 NOW SERVING
  </Text>


  <Animated.View
  style={[
    styles.servingBubble,
    {
      transform: [
        {
          scale: pulse,
        },
      ],
    },
  ]}
>
    <Text style={styles.servingNumber}>
      {item.current_serving || "--"}
    </Text>

  </Animated.View>


  {item.current_serving ? (

    <Text style={styles.servingMessage}>
      Please proceed to your department
    </Text>

  ) : (

    <Text style={styles.servingMessage}>
      Waiting for next patient
    </Text>

  )}

</View>
        <Text style={styles.summaryTitle}>
  📊 TODAY'S QUEUE
</Text>

<View style={styles.statsGrid}>

  <View style={styles.summaryCard}>
    <Text style={styles.summaryEmoji}>
      👥
    </Text>

    <Text style={styles.summaryNumber}>
      {item.waiting_count}
    </Text>

    <Text style={styles.summaryLabel}>
      Waiting
    </Text>
  </View>

  <View style={styles.summaryCard}>
    <Text style={styles.summaryEmoji}>
      🩺
    </Text>

    <Text style={styles.statNumber}>
  {item.consultation_count || 0}
</Text>


    <Text style={styles.summaryLabel}>
      Consultation
    </Text>
  </View>

</View>
        <Text style={styles.nextTitle}>
  🔵 NEXT WAITING
</Text>


{item.next_numbers.length > 0 ? (

  <View style={styles.waitingContainer}>

    {item.next_numbers
      .slice(0, 5)
      .map((number) => (

      <View
        key={number}
        style={styles.waitingBubble}
      >

        <Text style={styles.waitingNumberText}>
  {number.replace("-", "\n")}
</Text>

      </View>

    ))}


    {item.waiting_count > 5 && (

      <View style={styles.moreWaitingBubble}>

        <Text style={styles.moreWaitingText}>
          +{item.waiting_count - 5} More
        </Text>

      </View>

    )}

  </View>

) : (

  <Text style={styles.noWaitingText}>
    No patients waiting.
  </Text>

)}
      </View>
    )}
  />
);
}
const styles = StyleSheet.create({
departmentCard: {
  backgroundColor: "#FFFFFF",
  borderRadius: 22,
  padding: 20,
  marginBottom: 22,
  elevation: 4,
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 6,
  shadowOffset: {
    width: 0,
    height: 3,
  },
},
summaryTitle: {
  fontSize: 20,
  fontWeight: "800",
  color: "#111827",
  textAlign: "center",
  marginBottom: 15,
},

statsGrid: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 20,
},

summaryCard: {
  flex: 1,
  backgroundColor: "#F8FAFC",
  borderRadius: 18,
  paddingVertical: 18,
  marginHorizontal: 6,
  alignItems: "center",
},

summaryEmoji: {
  fontSize: 28,
},

summaryNumber: {
  fontSize: 34,
  fontWeight: "900",
  color: "#2563EB",
  marginTop: 8,
},

summaryLabel: {
  marginTop: 6,
  fontSize: 15,
  color: "#6B7280",
  fontWeight: "600",
},

header: {
  alignItems: "center",
  marginBottom: 20,
},

hospitalName: {
  fontSize: 30,
  fontWeight: "800",
  color: "#111827",
},
waitingContainer: {
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: 12,
  marginBottom: 15,
},


waitingBubble:{
  width:90,
  height:90,
  borderRadius:45,
  backgroundColor:"#2563EB",
  justifyContent:"center",
  alignItems:"center",
  paddingHorizontal:8,
  paddingVertical:8,
  margin:6,
},
waitingNumberText:{
  color:"#FFFFFF",
  fontSize:22,
  fontWeight:"900",
  textAlign:"center",
  lineHeight:24,
  includeFontPadding:false,
},


moreWaitingBubble: {
  height: 70,
  paddingHorizontal: 20,
  borderRadius: 35,
  backgroundColor: "#1D4ED8",
  justifyContent: "center",
  alignItems: "center",
},


moreWaitingText: {
  color: "#FFFFFF",
  fontSize: 18,
  fontWeight: "800",
},


noWaitingText: {
  textAlign: "center",
  color: "#6B7280",
  fontSize: 16,
  marginBottom: 10,
},

departmentName: {
  fontSize: 24,
  fontWeight: "800",
  color: "#111827",
  textAlign: "center",
  marginBottom: 16,
},

servingCard: {
  backgroundColor: "#F8FAFC",
  borderRadius: 18,
  padding: 24,
  alignItems: "center",
  marginBottom: 20,
},
loading: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "#F5F7FA",
},
servingBubble: {
  minWidth: 170,
  height: 170,
  borderRadius: 85,
  paddingHorizontal: 25,
  backgroundColor: "#16A34A",
  justifyContent: "center",
  alignItems: "center",
  marginVertical: 15,
},

container: {
  padding: 20,
  backgroundColor: "#F5F7FA",
},
servingTitle: {
  fontSize: 18,
  fontWeight: "700",
  color: "#6B7280",
},

servingNumber: {
  fontSize: 48,
  fontWeight: "900",
  color: "#FFFFFF",
  textAlign: "center",
},

statsRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 20,
},

statCard: {
  flex: 1,
  backgroundColor: "#F8FAFC",
  borderRadius: 14,
  padding: 16,
  alignItems: "center",
  marginHorizontal: 5,
},

statNumber: {
  fontSize: 28,
  fontWeight: "800",
  color: "#16A34A",
},

statLabel: {
  marginTop: 6,
  fontSize: 14,
  color: "#6B7280",
},

servingMessage: {
  fontSize: 16,
  fontWeight: "600",
  color: "#374151",
  textAlign: "center",
},
nextTitle: {
  fontSize: 18,
  fontWeight: "800",
  color: "#111827",
  marginBottom: 12,
  textAlign: "center",
},

numberCard: {
  backgroundColor: "#2563EB",
  borderRadius: 16,
  paddingVertical: 18,
  paddingHorizontal: 24,
  marginHorizontal: 6,
  marginBottom: 8,
},
dateText: {
  fontSize: 16,
  color: "#6B7280",
  marginTop: 6,
},

timeText: {
  fontSize: 34,
  fontWeight: "800",
  color: "#16A34A",
  marginTop: 8,
},
numberText: {
  fontSize: 24,
  fontWeight: "900",
  color: "#FFFFFF",
},
});