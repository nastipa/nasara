import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

const API_URL =
  "https://nasara-upload-server.onrender.com";

type LiveBoard = {
  department_id: string;

  department_name: string;

  current_serving: string | null;

  next_numbers: string[];

  waiting_count: number;

  checked_in_count: number;
};

export default function DepartmentLiveBoard() {
  const [loading, setLoading] =
    useState(true);

  const [boards, setBoards] =
    useState<LiveBoard[]>([]);

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

      } catch (err) {

        console.log(err);

      } finally {

        setLoading(false);

      }

    }, []);

  useEffect(() => {

    loadBoard();

    const interval =
      setInterval(() => {
        loadBoard();
      }, 5000);

    return () =>
      clearInterval(interval);

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

        <Text style={styles.departmentName}>
          {item.department_name}
        </Text>

        <View style={styles.servingCard}>
          <Text style={styles.servingTitle}>
            NOW SERVING
          </Text>

          <Text style={styles.servingNumber}>
            {item.current_serving || "--"}
          </Text>
        </View>

        <View style={styles.statsRow}>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {item.waiting_count}
            </Text>

            <Text style={styles.statLabel}>
              Waiting
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {item.checked_in_count}
            </Text>

            <Text style={styles.statLabel}>
              Checked In
            </Text>
          </View>

        </View>

        <Text style={styles.nextTitle}>
          NEXT NUMBERS
        </Text>

        {item.next_numbers.length > 0 ? (

          <FlatList
            data={item.next_numbers}
            keyExtractor={(num) => num}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item: number }) => (
              <View style={styles.numberCard}>
                <Text style={styles.numberText}>
                  {number}
                </Text>
              </View>
            )}
          />

        ) : (

          <Text
            style={{
              textAlign: "center",
              color: "#6B7280",
              marginBottom: 10,
            }}
          >
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

header: {
  alignItems: "center",
  marginBottom: 20,
},

hospitalName: {
  fontSize: 30,
  fontWeight: "800",
  color: "#111827",
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
  fontSize: 60,
  fontWeight: "900",
  color: "#2563EB",
  marginTop: 10,
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

numberText: {
  fontSize: 24,
  fontWeight: "900",
  color: "#FFFFFF",
},
});