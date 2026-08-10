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
  latitude: number | null;
  longitude: number | null;
  has_emergency: boolean;
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
  const [patientLocation, setPatientLocation] =
    useState<{
      latitude: number;
      longitude: number;
    } | null>(null);
  /*
   * =========================================================
   * GET PATIENT'S CURRENT LOCATION
   * =========================================================
   */
  const getPatientLocation =
    useCallback(async () => {
      /*
       * Web browser
       */
      if (Platform.OS === "web") {
        if (
          !navigator.geolocation
        ) {
          throw new Error(
            "Location services are not available on this device."
          );
        }
        return new Promise<{
          latitude: number;
          longitude: number;
        }>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude:
                  position.coords.latitude,
                longitude:
                  position.coords.longitude,
              });
            },
            (error) => {
              console.log(
                "Web location error:",
                error
              );
              reject(
                new Error(
                  "Unable to get your current location. Please allow location access."
                )
              );
            },
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0,
            }
          );
        });
      }
      /*
       * =====================================================
       * MOBILE LOCATION
       * =====================================================
       */
      const permission =
        await Location.requestForegroundPermissionsAsync();
      if (
        permission.status !==
        "granted"
      ) {
        throw new Error(
          "Location permission is required to find emergency hospitals near you."
        );
      }
      /*
       * Check whether location services
       * are actually enabled.
       */
      const servicesEnabled =
        await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        throw new Error(
          "Please turn on Location Services and try again."
        );
      }
      /*
       * Get the patient's CURRENT position.
       *
       * maximumAge: 0 means we don't intentionally
       * reuse an old cached position.
       */
      const location =
        await Location.getCurrentPositionAsync({
          accuracy:
            Location.Accuracy.High,
        });
      if (
        !location ||
        !location.coords
      ) {
        throw new Error(
          "Unable to determine your current location."
        );
      }
      const latitude =
        location.coords.latitude;
      const longitude =
        location.coords.longitude;
      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        throw new Error(
          "Invalid GPS coordinates were received."
        );
      }
      return {
        latitude,
        longitude,
      };
    }, []);
  /*
   * =========================================================
   * LOAD NEAREST EMERGENCY HOSPITALS
   * =========================================================
   */
  const loadHospitals =
    useCallback(async () => {
      try {
        setLoading(true);
        /*
         * STEP 1
         * Get patient's current location.
         */
        const location =
          await getPatientLocation();
        /*
         * Save patient's location
         * for display/debugging.
         */
        setPatientLocation(
          location
        );
        /*
         * STEP 2
         * Send CURRENT patient location
         * to backend.
         */
        const url =
          `${API_URL}/hospital/emergency-hospitals` +
          `?latitude=${encodeURIComponent(
            location.latitude
          )}` +
          `&longitude=${encodeURIComponent(
            location.longitude
          )}`;
        console.log(
          "Emergency hospital request:",
          url
        );
        const response =
          await fetch(url);
        const json =
          await response.json();
        if (!response.ok) {
          throw new Error(
            json.error ||
            "Unable to load emergency hospitals."
          );
        }
        /*
         * Backend has already sorted
         * hospitals from nearest → farthest.
         */
        setHospitals(
          json.hospitals || []
        );
      } catch (err: any) {
        console.log(
          "Emergency hospitals error:",
          err
        );
        setHospitals([]);
        showMessage(
          "Location Required",
          err.message ||
          "Unable to find your current location."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, [getPatientLocation]);
  /*
   * =========================================================
   * INITIAL LOAD
   * =========================================================
   */
  useEffect(() => {
    loadHospitals();
  }, [loadHospitals]);
  /*
   * =========================================================
   * REFRESH
   * =========================================================
   */
  const onRefresh = () => {
    setRefreshing(true);
    loadHospitals();
  };
  /*
   * =========================================================
   * CALL HOSPITAL
   * =========================================================
   */
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
  /*
   * =========================================================
   * OPEN DIRECTIONS
   *
   * IMPORTANT:
   * destination = hospital GPS
   *
   * The map application uses the patient's
   * current location as the starting point.
   * =========================================================
   */
  const openDirections = (
    hospital: Hospital
  ) => {
    if (
      hospital.latitude == null ||
      hospital.longitude == null
    ) {
      /*
       * Fallback if hospital has no GPS.
       */
      const search =
        encodeURIComponent(
          `${hospital.name}, ${hospital.address}, ${hospital.city}, ${hospital.region}, Ghana`
        );
      const url =
        Platform.OS === "ios"
          ? `http://maps.apple.com/?q=${search}`
          : `https://www.google.com/maps/search/?api=1&query=${search}`;
      Linking.openURL(url)
        .catch(() => {
          showMessage(
            "Error",
            "Unable to open maps."
          );
        });
      return;
    }
    /*
     * Exact hospital GPS destination.
     */
    const destination =
      `${hospital.latitude},${hospital.longitude}`;
    const url =
      Platform.OS === "ios"
        ? `http://maps.apple.com/?daddr=${destination}`
        :` https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    Linking.openURL(url)
      .catch(() => {
        showMessage(
          "Error",
          "Unable to open maps."
        );
      });
  };
  /*
   * =========================================================
   * HOSPITAL CARD
   * =========================================================
   */
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
      {/* Distance calculated from patient's CURRENT location. */}
{item.distance_km != null && (
        <View style={styles.distanceRow}>
          <Ionicons
            name="navigate"
            size={18}
            color="#2563EB"
          />
          <Text style={styles.distance}>
            {item.distance_km} km away
          </Text>
        </View>
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
  /*
   * =========================================================
   * LOADING
   * =========================================================
   */
  if (loading) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
          color="#DC2626"
        />
        <Text
          style={styles.loadingText}
        >
          Finding nearest emergency hospitals...
        </Text>
      </View>
    );
  }
  /*
   * =========================================================
   * MAIN SCREEN
   * =========================================================
   */
  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        🚑 Emergency Hospitals
      </Text>
      <Text style={styles.subHeader}>
        Hospitals are sorted from nearest to
        farthest based on your current GPS location.
      </Text>
      {/* Show the coordinates being used. */}
{patientLocation && (
        <View style={styles.locationCard}>
          <Ionicons
            name="location"
            size={20}
            color="#16A34A"
          />
          <View style={styles.locationContent}>
            <Text style={styles.locationTitle}>
              Your current location
            </Text>
            <Text style={styles.coordinates}>
              {patientLocation.latitude.toFixed(6)}
              {", "}
              {patientLocation.longitude.toFixed(6)}
            </Text>
          </View>
          <View style={styles.locationDot} />
        </View>
      )}
      <FlatList
        data={hospitals}
        keyExtractor={(item) =>
          item.id
        }
        renderItem={
          renderHospital
        }
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
          <View
            style={styles.emptyCard}
          >
            <Ionicons
              name="medkit"
              size={60}
              color="#DC2626"
            />
            <Text
              style={styles.emptyTitle}
            >
              No Emergency Hospitals
            </Text>
            <Text
              style={styles.emptyText}
            >
              No emergency hospitals were
              found from your current location.
            </Text>
          </View>
        }
      />
    </View>
  );
}
const styles =
  StyleSheet.create({
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
      textAlign: "center",
      paddingHorizontal: 30,
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
      marginBottom: 14,
      lineHeight: 22,
    },
    locationCard: {
      backgroundColor: "#ECFDF5",
      borderRadius: 14,
      padding: 12,
      marginBottom: 16,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#BBF7D0",
    },
    locationContent: {
      flex: 1,
      marginLeft: 10,
    },
    locationTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: "#166534",
    },
    coordinates: {
      marginTop: 3,
      fontSize: 12,
      color: "#15803D",
    },
    locationDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: "#16A34A",
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
    distanceRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 14,
    },
    distance: {
      marginLeft: 6,
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