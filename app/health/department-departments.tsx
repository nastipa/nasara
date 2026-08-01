import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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
        ? `${title}\n\n${message}*`
        : title
    );
  } else {
    Alert.alert(title, message);
  }
};

type Department = {
  id: string;
  name: string;
  average_minutes: number;
  is_active: boolean;
};

export default function HospitalDepartments() {
  const router = useRouter();
  const [departments, setDepartments] =
    useState<Department[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [name, setName] =
    useState("");

  const [averageMinutes, setAverageMinutes] =
    useState("10");

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const loadDepartments =
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
            `${API_URL}/hospital/departments`,
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
              "Unable to load departments."
          );
        }

        setDepartments(
          json.departments || []
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
    loadDepartments();
  }, [loadDepartments]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDepartments();
  };

  const createDefaultDepartments =
    async () => {
      try {
        setSaving(true);

        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (!session?.access_token) {
          return;
        }

        const response =
          await fetch(
            `${API_URL}/hospital/create-default-departments`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                "Content-Type":
                  "application/json",
              },
            }
          );

        const json =
          await response.json();

        if (!response.ok) {
          throw new Error(
            json.error
          );
        }

        showMessage(
          "Success",
          json.message
        );

        loadDepartments();

      } catch (err: any) {
        showMessage(
          "Error",
          err.message
        );
      } finally {
        setSaving(false);
      }
    };
    const saveDepartment =
    async () => {
      if (!name.trim()) {
        showMessage(
          "Validation",
          "Department name is required."
        );
        return;
      }

      try {
        setSaving(true);

        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (!session?.access_token) {
          return;
        }

        const isEditing =
          editingId !== null;

        const endpoint =
          isEditing
            ? `${API_URL}/hospital/update-department`
            : `${API_URL}/hospital/create-department`;

        const method =
          isEditing
            ? "PUT"
            : "POST";

        const body = isEditing
          ? {
              department_id:
                editingId,
              name: name.trim(),
              average_minutes:
                Number(
                  averageMinutes
                ),
            }
          : {
              name: name.trim(),
              average_minutes:
                Number(
                  averageMinutes
                ),
            };

        const response =
          await fetch(
            endpoint,
            {
              method,
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify(
                body
              ),
            }
          );

        const json =
          await response.json();

        if (!response.ok) {
          throw new Error(
            json.error
          );
        }

        showMessage(
          "Success",
          isEditing
            ? "Department updated."
            : "Department created."
        );

        setEditingId(null);
        setName("");
        setAverageMinutes("10");

        loadDepartments();

      } catch (err: any) {
        showMessage(
          "Error",
          err.message
        );
      } finally {
        setSaving(false);
      }
    };

  const editDepartment = (
    department: Department
  ) => {
    setEditingId(
      department.id
    );
    setName(
      department.name
    );
    setAverageMinutes(
      String(
        department.average_minutes
      )
    );
  };

  const deleteDepartment =
    async (
      departmentId: string
    ) => {
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
            `${API_URL}/hospital/delete-department/${departmentId}`,
            {
              method: "DELETE",
              headers: {
                Authorization:`Bearer ${session.access_token}`,
              },
            }
          );

        const json =
          await response.json();

        if (!response.ok) {
          throw new Error(
            json.error
          );
        }

        showMessage(
          "Success",
          "Department deleted."
        );

        loadDepartments();

      } catch (err: any) {
        showMessage(
          "Error",
          err.message
        );
      }
    };

  const resetForm =
    () => {
      setEditingId(null);
      setName("");
      setAverageMinutes("10");
    };
  const openDepartmentDashboard = (
  department: Department
) => {
  router.push({
    pathname:
      "/(hospital-admin)/department-dashboard",
    params: {
      department_id: department.id,
      department_name: department.name,
    },
  });
};


  const renderItem = ({
    item,
  }: {
    item: Department;
  }) => (
    <View style={styles.card}>
      <View
        style={{
          flex: 1,
        }}
      >
        <Text
          style={
            styles.departmentName
          }
        >
          {item.name}
        </Text>

        <Text
          style={
            styles.departmentInfo
          }
        >
          Average Time:{" "}
          {
            item.average_minutes
          }{" "}
          mins
        </Text>

        <Text
          style={
            styles.departmentInfo
          }
        >
          Status:{" "}
          {item.is_active
            ? "Active"
            : "Disabled"}
        </Text>
      </View>

      <View
        style={
          styles.actionButtons
        }
      >
        <TouchableOpacity
  style={styles.dashboardButton}
  onPress={() =>
    openDepartmentDashboard(item)
  }
>
  <Text style={styles.buttonText}>
    Open Dashboard
  </Text>
</TouchableOpacity>
        <TouchableOpacity
          style={
            styles.editButton
          }
          onPress={() =>
            editDepartment(
              item
            )
          }
        >
          <Text
            style={
              styles.buttonText
            }
          >
            Edit
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={
            styles.deleteButton
          }
          onPress={() =>
            deleteDepartment(
              item.id
            )
          }
        >
          <Text
            style={
              styles.buttonText
            }
          >
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>
          Loading departments...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={departments}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        ListHeaderComponent={
          <>
            <Text style={styles.title}>
              Hospital Departments
            </Text>

            <Text style={styles.subtitle}>
              Manage your hospital departments.
            </Text>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Department Name"
              style={styles.input}
            />

            <TextInput
              value={averageMinutes}
              onChangeText={setAverageMinutes}
              placeholder="Average Minutes"
              keyboardType="numeric"
              style={styles.input}
            />

            <TouchableOpacity
              style={styles.saveButton}
              disabled={saving}
              onPress={saveDepartment}
            >
              <Text style={styles.buttonText}>
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Department"
                  : "Create Department"}
              </Text>
            </TouchableOpacity>

            {editingId && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={resetForm}
              >
                <Text style={styles.buttonText}>
                  Cancel Editing
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.defaultButton}
              disabled={saving}
              onPress={
                createDefaultDepartments
              }
            >
              <Text style={styles.buttonText}>
                Create Standard Departments
              </Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>
              Existing Departments
            </Text>
          </>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No departments found.
          </Text>
        }
        contentContainerStyle={{
          paddingBottom: 40,
        }}
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

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },

  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
  },

  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 14,
  },

  saveButton: {
    backgroundColor: "#0A7CFF",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 12,
  },

  cancelButton: {
    backgroundColor: "#EF4444",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 12,
  },

  defaultButton: {
    backgroundColor: "#16A34A",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 14,
    color: "#222",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },

  departmentName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },

  departmentInfo: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },

  actionButtons: {
    marginLeft: 12,
  },
  dashboardButton: {
  backgroundColor: "#2563EB",
  borderRadius: 10,
  paddingHorizontal: 14,
  paddingVertical: 10,
  marginBottom: 8,
},

  editButton: {
    backgroundColor: "#F59E0B",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },

  deleteButton: {
    backgroundColor: "#DC2626",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },

  emptyText: {
    textAlign: "center",
    color: "#777",
    marginTop: 40,
    fontSize: 16,
  },
});
