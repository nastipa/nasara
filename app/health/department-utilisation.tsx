import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { supabase } from "../../lib/supabase";

const API_URL =
  "https://nasara-upload-server.onrender.com";

export default function DepartmentUtilisation() {

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [departments, setDepartments] =
    useState<any[]>([]);

  const [dashboard, setDashboard] =
    useState<any[]>([]);

  useEffect(() => {

    loadDepartments();

  }, []);

  const loadDepartments = async () => {

    try {

      setLoading(true);

      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      const response =
        await fetch(
          `${API_URL}/hospital/department-utilisation`,
          {
            headers: {
              Authorization:
                `Bearer ${session?.access_token}`,
            },
          }
        );

      const json =
        await response.json();

      if (response.ok) {

       const list =
  json.departments || [];

setDepartments(list);

setDashboard(list);

      }

    } catch (err) {

      console.log(err);

    } finally {

      setLoading(false);

    }

  };

  

        

  const refreshDashboard =
    async () => {

      setRefreshing(true);

      await loadDepartments();

      setRefreshing(false);

    };

  const getStatusColor = (
    utilisation: number
  ) => {

    if (utilisation >= 80)
      return "#EF4444";

    if (utilisation >= 50)
      return "#F59E0B";

    return "#10B981";

  };

  const getStatusText = (
    utilisation: number
  ) => {

    if (utilisation >= 80)
      return "Busy";

    if (utilisation >= 50)
      return "Moderate";

    return "Low";

  };

 const totalPatients =
  dashboard.reduce(
    (sum, item) =>
      sum +
      (item.total || 0),
    0
  );

  if (loading) {

    return (

      <View
        style={styles.loader}
      >

        <ActivityIndicator
          size="large"
          color="#0A7CFF"
        />

      </View>

    );

  }

  return (

    <ScrollView

      style={styles.container}

      refreshControl={

        <RefreshControl

          refreshing={
            refreshing
          }

          onRefresh={
            refreshDashboard
          }

        />

      }

    >

      <Text style={styles.title}>
        Department Utilisation
      </Text>

      <Text style={styles.subtitle}>
        Live Department Statistics
      </Text>

      <View style={styles.summaryCard}>

        <View style={styles.summaryBox}>

          <Text style={styles.summaryNumber}>
            {departments.length}
          </Text>

          <Text style={styles.summaryLabel}>
            Departments
          </Text>

        </View>

        <View style={styles.summaryBox}>

          <Text style={styles.summaryNumber}>
            {totalPatients}
          </Text>

          <Text style={styles.summaryLabel}>
            Patients Today
          </Text>

        </View>

      </View>
      {dashboard.map((item, index) => {

        const utilisation =
          item.utilisation || 0;

        const stats =item;

        return (

          <View
            key={
              item.department?.id || index
            }
            style={styles.card}
          >

            <View
              style={styles.cardHeader}
            >

              <Text
                style={styles.departmentName}
              >
                {item.department_name}
              </Text>

              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      getStatusColor(
                        utilisation
                      ),
                  },
                ]}
              >

                <Text
                  style={styles.statusText}
                >
                  {getStatusText(
                    utilisation
                  )}
                </Text>

              </View>

            </View>

            <View
              style={styles.row}
            >

              <View
                style={styles.statBox}
              >

                <Text
                  style={styles.statNumber}
                >
                  {stats.waiting || 0}
                </Text>

                <Text
                  style={styles.statLabel}
                >
                  Waiting
                </Text>

              </View>

              <View
                style={styles.statBox}
              >

                <Text
                  style={styles.statNumber}
                >
                  {stats.called || 0}
                </Text>

                <Text
                  style={styles.statLabel}
                >
                  Called
                </Text>

              </View>

              <View
                style={styles.statBox}
              >

                <Text
                  style={styles.statNumber}
                >
                  {stats.checked_in || 0}
                </Text>

                <Text
                  style={styles.statLabel}
                >
                  Checked In
                </Text>

              </View>

            </View>

            <View
              style={styles.row}
            >

              <View
                style={styles.statBox}
              >

                <Text
                  style={styles.statNumber}
                >
                  {stats.completed || 0}
                </Text>

                <Text
                  style={styles.statLabel}
                >
                  Completed
                </Text>

              </View>

              <View
                style={styles.statBox}
              >

                <Text
                  style={styles.statNumber}
                >
                  {stats.emergency || 0}
                </Text>

                <Text
                  style={styles.statLabel}
                >
                  Emergency
                </Text>

              </View>

              <View
                style={styles.statBox}
              >

                <Text
                  style={styles.statNumber}
                >
                  {stats.urgent || 0}
                </Text>

                <Text
                  style={styles.statLabel}
                >
                  Urgent
                </Text>

              </View>

            </View>

            <View
              style={styles.infoRow}
            >

              <Text
                style={styles.infoText}
              >
                Total Today
              </Text>

              <Text
                style={styles.infoValue}
              >
                {stats.total || 0}
              </Text>

            </View>

            

            <View
              style={styles.progressContainer}
            >

              <View
                style={styles.progressBackground}
              >

                <View
                  style={[
                    styles.progressFill,
                    {
                      width:
                        `${utilisation}%`,
                      backgroundColor:
                        getStatusColor(
                          utilisation
                        ),
                    },
                  ]}
                />

              </View>

            </View>

            <Text
              style={styles.progressText}
            >
              Utilisation:
              {" "}
              {utilisation}%
            </Text>

        
          </View>

        );

      })}

    </ScrollView>

  );

}
const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    padding: 16,
  },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
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
    marginBottom: 20,
  },

  summaryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  summaryBox: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    marginHorizontal: 5,
    alignItems: "center",
    elevation: 2,
  },

  summaryNumber: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0A7CFF",
  },

  summaryLabel: {
    marginTop: 6,
    color: "#6B7280",
    fontSize: 14,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    elevation: 2,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  departmentName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },

  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },

  statusText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  statBox: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingVertical: 14,
    marginHorizontal: 4,
    alignItems: "center",
  },

  statNumber: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },

  statLabel: {
    marginTop: 5,
    fontSize: 12,
    color: "#6B7280",
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 4,
  },

  infoText: {
    fontSize: 15,
    color: "#6B7280",
  },

  infoValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  progressContainer: {
    marginTop: 16,
    marginBottom: 8,
  },

  progressBackground: {
    height: 12,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 8,
  },

  progressText: {
    marginTop: 6,
    fontWeight: "600",
    color: "#374151",
  },

  currentPatientCard: {
    marginTop: 18,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#0A7CFF",
  },

  currentTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    color: "#111827",
  },

});