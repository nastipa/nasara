import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const API_URL =
  "https://nasara-upload-server.onrender.com";

type Hospital = {
  id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  region: string;
  latitude: number;
  longitude: number;
  distance_km: number | null;
};

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

export default function EmergencyHospitals() {

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [hospitals, setHospitals] =
    useState<Hospital[]>([]);

  const loadHospitals =
    useCallback(async () => {

      try {

        setLoading(true);

        const permission =
          await Location.requestForegroundPermissionsAsync();

        let latitude: number | undefined;
        let longitude: number | undefined;

        if (
          permission.status === "granted"
        ) {

          const location =
            await Location.getCurrentPositionAsync(
              {}
            );

          latitude =
            location.coords.latitude;

          longitude =
            location.coords.longitude;

        }

        let url =
          `${API_URL}/hospital/emergency-hospitals`;

        if (
          latitude != null &&
          longitude != null
        ) {

          url +=
            `?latitude=${latitude}&longitude=${longitude}`;

        }

        const response =
          await fetch(url);

        const json =
          await response.json();

        if (!response.ok) {

          throw new Error(
            json.error ||
              "Unable to load hospitals."
          );

        }

        setHospitals(
          json.hospitals || []
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

    loadHospitals();

  }, [loadHospitals]);

  const onRefresh = () => {

    setRefreshing(true);

    loadHospitals();

  };
  const callHospital = (
    phone?: string
  ) => {

    if (!phone) {

      showMessage(
        "Unavailable",
        "This hospital has no phone number."
      );

      return;

    }

    Linking.openURL(
      `tel:${phone}`
    );

  };


  const openDirections = (
  hospital: Hospital
) => {

  let url = "";

  // 1. Use exact coordinates if available
  if (
    hospital.latitude != null &&
    hospital.longitude != null
  ) {

    url =
      Platform.OS === "ios"
        ? `http://maps.apple.com/?daddr=${hospital.latitude},${hospital.longitude}`
        : `https://www.google.com/maps/dir/?api=1&destination=${hospital.latitude},${hospital.longitude}`;

  } 
  // 2. Fallback to hospital name + address search
  else {

    const search =
      encodeURIComponent(
        `${hospital.name}, ${hospital.address}, ${hospital.city}, ${hospital.region}, Ghana`
      );

    url =
      Platform.OS === "ios"
        ? `http://maps.apple.com/?q=${search}`
        : `https://www.google.com/maps/search/?api=1&query=${search}`;

  }

  Linking.openURL(url)
    .catch(() => {

      showMessage(
        "Error",
        "Unable to open maps."
      );

    });

};


  const renderHospital = ({
    item,
  }: {
    item: Hospital;
  }) => (

    <View style={styles.card}>

      <View style={styles.headerRow}>

        <View style={{ flex: 1 }}>

          <Text style={styles.name}>
            {item.name}
          </Text>

          <Text style={styles.location}>
            {item.city}
            {item.region
              ? ` • ${item.region}`
              : ""}
          </Text>

        </View>

        <View style={styles.badge}>

          <Ionicons
            name="medkit"
            size={16}
            color="#fff"
          />

          <Text style={styles.badgeText}>
            Emergency
          </Text>

        </View>

      </View>


      {item.distance_km != null && (

        <Text style={styles.distance}>

          📍 {item.distance_km} km away

        </Text>

      )}


      <Text style={styles.address}>

        {item.address}

      </Text>


      <View style={styles.buttonRow}>

        <TouchableOpacity
          style={styles.callButton}
          onPress={() =>
            callHospital(
              item.phone
            )
          }
        >

          <Ionicons
            name="call"
            size={18}
            color="#fff"
          />

          <Text style={styles.buttonText}>
            Call
          </Text>

        </TouchableOpacity>


        <TouchableOpacity
          style={styles.mapButton}
          onPress={() =>
            openDirections(item)
          }
        >

          <Ionicons
            name="navigate"
            size={18}
            color="#fff"
          />

          <Text style={styles.buttonText}>
            Directions
          </Text>

        </TouchableOpacity>

      </View>

    </View>

  );
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC2626" />

        <Text style={styles.loadingText}>
          Finding nearest emergency hospitals...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <Text style={styles.header}>
        🚑 Emergency Hospitals
      </Text>

      <Text style={styles.subHeader}>
        Hospitals are automatically sorted by the
        shortest distance from your current location.
      </Text>

      <FlatList
        data={hospitals}
        keyExtractor={(item) => item.id}
        renderItem={renderHospital}
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

            <Ionicons
              name="medkit"
              size={60}
              color="#DC2626"
            />

            <Text style={styles.emptyTitle}>
              No Emergency Hospitals
            </Text>

            <Text style={styles.emptyText}>
              No emergency hospitals were found
              near your location.
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
    fontSize: 28,
    fontWeight: "700",
    color: "#B91C1C",
    marginBottom: 6,
  },

  subHeader: {
    fontSize: 15,
    color: "#666",
    marginBottom: 20,
    lineHeight: 22,
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

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },

  location: {
    marginTop: 5,
    fontSize: 15,
    color: "#6B7280",
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DC2626",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  badgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    marginLeft: 5,
  },

  distance: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: "700",
    color: "#2563EB",
  },

  address: {
    marginTop: 8,
    fontSize: 15,
    color: "#555",
    lineHeight: 22,
  },

  buttonRow: {
    flexDirection: "row",
    marginTop: 18,
  },

  callButton: {
    flex: 1,
    backgroundColor: "#16A34A",
    borderRadius: 12,
    paddingVertical: 14,
    marginRight: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  mapButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 14,
    marginLeft: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    marginLeft: 6,
  },

  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 30,
    alignItems: "center",
    marginTop: 80,
  },

  emptyTitle: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },

  emptyText: {
    marginTop: 10,
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },

});