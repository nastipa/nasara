import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function HospitalDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [hospital, setHospital] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDepartment, setSelectedDepartment] =
    useState<any>(null);

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

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const { data: hospitalData, error: hospitalError } =
      await supabase
        .from("hospitals")
        .select("*")
        .eq("id", id)
        .single();

    if (hospitalError) {
      setLoading(false);
      showMessage("Error", hospitalError.message);
      return;
    }

    const { data: departmentData, error: deptError } =
      await supabase
        .from("hospital_departments")
        .select("*")
        .eq("hospital_id", id)
        .eq("is_active", true)
        .order("name");

    setLoading(false);

    if (deptError) {
      showMessage("Error", deptError.message);
      return;
    }

    setHospital(hospitalData);
    setDepartments(departmentData || []);
  }

  function continueBooking() {
  if (!selectedDepartment?.id) {
    showMessage(
      "Department Required",
      "Please select a department."
    );
    return;
  }

  console.log(
    "SELECTED DEPARTMENT ID:",
    selectedDepartment.id
  );

  router.push({
    pathname: "/health/join-queue",
    params: {
  hospital_id: String(id),
  department_id: String(selectedDepartment.id),
  department_name: selectedDepartment.name,
},
  });
}

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!hospital) {
    return (
      <View style={styles.loading}>
        <Text>Hospital not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingBottom: 40,
      }}
    >
      <View style={styles.headerCard}>
        <Ionicons
          name="medical"
          size={55}
          color="#2563eb"
        />

        <Text style={styles.name}>
          {hospital.name}
        </Text>

        <Text style={styles.location}>
  {hospital.city || ""}
  {hospital.district
    ? ` • ${hospital.district}`
    : ""}
  {hospital.region
    ? ` • ${hospital.region}`
    : ""}
</Text>

        {hospital.phone ? (
          <Text style={styles.phone}>
            📞 {hospital.phone}
          </Text>
        ) : null}
      </View>

      <Text style={styles.section}>
        Select Department
      </Text>

      {departments.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            This hospital has not added any departments yet.
          </Text>
        </View>
      ) : (
        departments.map((dept) => (
          <TouchableOpacity
            key={dept.id}
            style={[
              styles.departmentCard,
              selectedDepartment?.id === dept.id &&
                styles.selectedCard,
            ]}
            onPress={() =>
              setSelectedDepartment(dept)
            }
          >
            <Ionicons
              name="business"
              size={22}
              color={
                selectedDepartment?.id === dept.id
                  ? "#fff"
                  : "#2563eb"
              }
            />

            <View
              style={{
                flex: 1,
                marginLeft: 12,
              }}
            >
              <Text
                style={[
                  styles.departmentText,
                  selectedDepartment?.id ===
                    dept.id && {
                    color: "#fff",
                  },
                ]}
              >
                {dept.name}
              </Text>

              {!!dept.description && (
                <Text
                  style={[
                    styles.description,
                    selectedDepartment?.id ===
                      dept.id && {
                      color: "#fff",
                    },
                  ]}
                >
                  {dept.description}
                </Text>
              )}

              <Text
                style={[
                  styles.average,
                  selectedDepartment?.id ===
                    dept.id && {
                    color: "#fff",
                  },
                ]}
              >
                Average waiting:{" "}
                {dept.average_minutes || 15} mins
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}

      <TouchableOpacity
        style={styles.button}
        onPress={continueBooking}
      >
        <Text style={styles.buttonText}>
          Continue to Queue
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6fb",
    padding: 16,
  },

  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  headerCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    elevation: 3,
  },

  name: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 10,
    textAlign: "center",
  },

  location: {
    color: "#666",
    marginTop: 5,
    textAlign: "center",
  },

  phone: {
    color: "#16a34a",
    fontWeight: "600",
    marginTop: 8,
  },

  section: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },

  departmentCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },

  selectedCard: {
    backgroundColor: "#2563eb",
  },

  departmentText: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#111",
  },

  description: {
    marginTop: 4,
    color: "#666",
  },

  average: {
    marginTop: 6,
    fontWeight: "600",
    color: "#16a34a",
  },

  emptyCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 14,
    alignItems: "center",
  },

  emptyText: {
    color: "#666",
    textAlign: "center",
  },

  button: {
    backgroundColor: "#16a34a",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 20,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
});