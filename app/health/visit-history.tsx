import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    RefreshControl,
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

type Visit = {
  id: string;
  queue_number: number;
  booking_code: string;
  booking_date: string;
  completed_at: string | null;
  status: string;
  condition: string | null;

  hospitals: {
    name: string;
    city: string;
    region: string;
  };

  hospital_departments: {
    name: string;
  };
};

export default function VisitHistory() {
  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [visits, setVisits] =
    useState<Visit[]>([]);
    const loadVisits = useCallback(
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

        const response = await fetch(
          `${API_URL}/hospital/visit-history`,
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
              "Unable to load visit history."
          );
        }

        setVisits(
          json.visits || []
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
    },
    []
  );


  const onRefresh = () => {
    setRefreshing(true);
    loadVisits(false);
  };


  useEffect(() => {
    loadVisits();
  }, [loadVisits]);


  const renderVisit = ({
    item,
  }: {
    item: Visit;
  }) => (
    <View style={styles.card}>

      <Text style={styles.hospital}>
        {item.hospitals?.name}
      </Text>

      <Text style={styles.department}>
        {item.hospital_departments?.name}
      </Text>

      <View style={styles.divider} />


      <Text style={styles.info}>
        Queue Number:{" "}
        {item.queue_number}
      </Text>


      <Text style={styles.info}>
        Date:{" "}
        {item.booking_date}
      </Text>


      {item.completed_at && (
        <Text style={styles.info}>
          Completed:{" "}
          {new Date(
            item.completed_at
          ).toLocaleString()}
        </Text>
      )}


      {item.condition && (
        <Text style={styles.info}>
          Reason:{" "}
          {item.condition}
        </Text>
      )}


      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>
          {item.status
            .replace(/_/g, " ")
            .toUpperCase()}
        </Text>
      </View>

    </View>
  );
if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Loading visit history...
        </Text>
      </View>
    );
  }


  return (
    <View style={styles.container}>

      <Text style={styles.header}>
        📜 Visit History
      </Text>


      <FlatList
        data={visits}
        keyExtractor={(item) => item.id}
        renderItem={renderVisit}
        showsVerticalScrollIndicator={false}

        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }

        contentContainerStyle={{
          paddingBottom: 40,
        }}

        ListEmptyComponent={
          <View style={styles.emptyCard}>

            <Text style={styles.emptyTitle}>
              No Previous Visits
            </Text>

            <Text style={styles.emptyText}>
              Your completed hospital visits
              will appear here.
            </Text>

          </View>
        }
      />

    </View>
  );
}


const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    padding: 16,
  },


  header: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 18,
  },


  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },


  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 16,
  },


  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
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


  hospital: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },


  department: {
    marginTop: 5,
    fontSize: 16,
    color: "#2563EB",
    fontWeight: "600",
  },


  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 14,
  },


  info: {
    fontSize: 15,
    color: "#444",
    marginBottom: 8,
  },


  statusBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#16A34A",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 10,
  },


  statusText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },


  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 25,
    alignItems: "center",
    marginTop: 80,
  },


  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },


  emptyText: {
    marginTop: 10,
    textAlign: "center",
    color: "#666",
    lineHeight: 22,
    fontSize: 15,
  },

});
