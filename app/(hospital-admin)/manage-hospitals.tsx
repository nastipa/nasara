import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
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

export default function ManageHospitals() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [hospitals, setHospitals] =
    useState<any[]>([]);

  const loadHospitals =
    useCallback(async () => {
      try {
        setLoading(true);

        const { data, error } =
          await supabase
            .from("hospitals")
            .select("*")
            .order("created_at", {
              ascending: false,
            });

        if (error) {
          showMessage(
            "Error",
            error.message
          );
          return;
        }

        setHospitals(data || []);

      } catch (e: any) {
        showMessage(
          "Error",
          e.message
        );

      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, []);

  useFocusEffect(
    useCallback(() => {
      loadHospitals();
    }, [loadHospitals])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadHospitals();
  };
  const filteredHospitals = hospitals.filter(
  (hospital) => {
    const keyword =
      search.toLowerCase();

    return (
      hospital.name
        ?.toLowerCase()
        .includes(keyword) ||
      hospital.region
        ?.toLowerCase()
        .includes(keyword) ||
      hospital.district
        ?.toLowerCase()
        .includes(keyword) ||
      hospital.city
        ?.toLowerCase()
        .includes(keyword)
    );
  }
);

const toggleHospitalStatus = async (
  hospital: any
) => {
  try {
    const newStatus =
      hospital.status === "active"
        ? "inactive"
        : "active";

    const { error } =
      await (supabase as any)
        .from("hospitals")
        .update({
          status: newStatus,
        })
        .eq("id", hospital.id);

    if (error) {
      showMessage(
        "Error",
        error.message
      );
      return;
    }

    showMessage(
      "Success",
      `Hospital ${newStatus}.`
    );

    loadHospitals();

  } catch (e: any) {
    showMessage(
      "Error",
      e.message
    );
  }
};

const deleteHospital = async (
  hospitalId: string
) => {
  try {
    const { error } =
      await supabase
        .from("hospitals")
        .delete()
        .eq("id", hospitalId);

    if (error) {
      showMessage(
        "Error",
        error.message
      );
      return;
    }

    showMessage(
      "Success",
      "Hospital deleted."
    );

    loadHospitals();

  } catch (e: any) {
    showMessage(
      "Error",
      e.message
    );
  }
};

const renderHospital = ({
  item,
}: {
  item: any;
}) => (
  <View style={styles.card}>
    <Text style={styles.name}>
      {item.name}
    </Text>

    <Text style={styles.location}>
      {item.region} • {item.district}
    </Text>

    <Text style={styles.location}>
      {item.city}
    </Text>

    <Text
      style={{
        color:
          item.status === "active"
            ? "#16A34A"
            : "#DC2626",
        fontWeight: "700",
        marginTop: 8,
      }}
    >
      {item.status}
    </Text>

    <View style={styles.buttonRow}>

      <TouchableOpacity
        style={styles.smallButton}
        onPress={() =>
          router.push(
            `/(hospital-admin)/edit-hospital?id=${item.id}`
          )
        }
      >
        <Ionicons
          name="create"
          size={18}
          color="#fff"
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.smallButton}
        onPress={() =>
          toggleHospitalStatus(item)
        }
      >
        <Ionicons
          name="power"
          size={18}
          color="#fff"
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.smallButton,
          {
            backgroundColor:
              "#DC2626",
          },
        ]}
        onPress={() =>
          deleteHospital(item.id)
        }
      >
        <Ionicons
          name="trash"
          size={18}
          color="#fff"
        />
      </TouchableOpacity>

    </View>
  </View>
);
if (loading) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator
        size="large"
        color="#2563EB"
      />

      <Text
        style={{
          marginTop: 12,
          color: "#6B7280",
        }}
      >
        Loading hospitals...
      </Text>
    </View>
  );
}

return (
  <View style={styles.container}>
    <Text style={styles.title}>
      Manage Hospitals
    </Text>

    <Text style={styles.subtitle}>
      View, search and manage all hospitals.
    </Text>

    <TextInput
      style={styles.searchInput}
      placeholder="Search hospital..."
      value={search}
      onChangeText={setSearch}
    />

    <FlatList
      data={filteredHospitals}
      keyExtractor={(item) =>
        item.id.toString()
      }
      renderItem={renderHospital}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      }
      ListEmptyComponent={
        <View
          style={{
            marginTop: 60,
            alignItems: "center",
          }}
        >
          <Ionicons
            name="business"
            size={60}
            color="#9CA3AF"
          />

          <Text
            style={{
              marginTop: 12,
              color: "#6B7280",
              fontSize: 16,
            }}
          >
            No hospitals found.
          </Text>
        </View>
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
    padding: 18,
  },

  loadingContainer: {
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

  searchInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 18,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 3,
  },

  name: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },

  location: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },

  smallButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
});
