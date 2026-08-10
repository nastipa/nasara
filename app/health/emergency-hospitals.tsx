import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as Location from "expo-location";
import { useCallback, useState } from "react";
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
  phone: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  region: string | null;
  // Hospital's SAVED GPS coordinates
  latitude: number | null;
  longitude: number | null;
  // Calculated from patient's current GPS location
  distance_km: number | null;
};
type PatientLocation = {
  latitude: number;
  longitude: number;
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
    useState(false);
  const [refreshing, setRefreshing] =
    useState(false);
  const [locating, setLocating] =
    useState(false);
  const [hospitals, setHospitals] =
    useState<Hospital[]>([]);
  const [patientLocation, setPatientLocation] =
    useState<PatientLocation | null>(null);
  /*
   * =========================================================
   * GET PATIENT CURRENT LOCATION
   * =========================================================
   *
   * IMPORTANT:
   * This function is ONLY called when the user
   * presses "Get My Current Location".
   *
   * We do NOT call it automatically when the
   * screen opens.
   */
  const getPatientLocation =
    useCallback(async (): Promise<PatientLocation | null> => {
      try {
        setLocating(true);
        /*
         * Request permission only when the user
         * explicitly asks to get their location.
         */
        const permission =
          await Location.requestForegroundPermissionsAsync();
        if (permission.status !== "granted") {
          showMessage(
            "Location Required",
            "Please allow location access so we can calculate the distance from you to nearby emergency hospitals."
          );
          return null;
        }
        /*
         * Get a fresh GPS position.
         */
        const location =
          await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest,
          });
        const latitude =
          location.coords.latitude;
        const longitude =
          location.coords.longitude;
        /*
         * Validate coordinates.
         */
        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {
          showMessage(
            "Location Error",
            "Unable to determine your current GPS location."
          );
          return null;
        }
        const currentLocation: PatientLocation = {
          latitude,
          longitude,
        };
        console.log(
          "PATIENT CURRENT LOCATION:",
          currentLocation
        );
        setPatientLocation(
          currentLocation
        );
        return currentLocation;
      } catch (error: any) {
        console.log(
          "Patient location error:",
          error
        );
        showMessage(
          "Location Error",
          error?.message ||
            "Unable to get your current location."
        );
        return null;
      } finally {
        setLocating(false);
      }
    }, []);
  /*
   * =========================================================
   * LOAD EMERGENCY HOSPITALS USING PATIENT LOCATION
   * =========================================================
   *
   * This function requires a location.
   *
   * The hospital latitude/longitude are already
   * saved in the database.
   *
   * Backend calculates:
   *
   * USER GPS
   *    ↓
   * HOSPITAL SAVED GPS
   *    ↓
   * DISTANCE
   */
  const loadHospitals = useCallback(
    async (
      location: PatientLocation
    ) => {
      try {
        setLoading(true);
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
        console.log(
          "Emergency hospital response:",
          json
        );
        if (!response.ok) {
          throw new Error(
            json.error ||
              "Unable to load emergency hospitals."
          );
        }
        const hospitalList: Hospital[] =
          Array.isArray(json.hospitals)
            ? json.hospitals
            : [];
        /*
         * Sort nearest hospital first.
         */
        hospitalList.sort(
          (
            a: Hospital,
            b: Hospital
          ) => {
            if (
              a.distance_km == null
            ) {
              return 1;
            }
            if (
              b.distance_km == null
            ) {
              return -1;
            }
            return (
              Number(a.distance_km) -
              Number(b.distance_km)
            );
          }
        );
        setHospitals(
          hospitalList
        );
      } catch (error: any) {
        console.log(
          "Emergency hospitals loading error:",
          error
        );
        showMessage(
          "Error",
          error?.message ||
            "Unable to load emergency hospitals."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );
  /*
   * =========================================================
   * USER CLICKS "GET MY CURRENT LOCATION"
   * =========================================================
   */
  const handleGetCurrentLocation =
    async () => {
      if (locating || loading) {
        return;
      }
      /*
       * First capture the user's current GPS.
       */
      const location =
        await getPatientLocation();
      if (!location) {
        return;
      }
      /*
       * Then use that exact location to
       * calculate hospital distances.
       */
      await loadHospitals(
        location
      );
    };
  /*
   * =========================================================
   * REFRESH
   * =========================================================
   *
   * Refresh does NOT silently request GPS.
   *
   * If we already have a location, use the
   * existing location.
   *
   * Otherwise the user must press
   * "Get My Current Location".
   */
  const onRefresh = async () => {
    if (!patientLocation) {
      setRefreshing(false);
      showMessage(
        "Location Required",
        "Please tap 'Get My Current Location' first."
      );
      return;
    }
    setRefreshing(true);
    await loadHospitals(
      patientLocation
    );
  };
  /*
   * =========================================================
   * CALL HOSPITAL
   * =========================================================
   */
  const callHospital = (
    phone?: string | null
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
    ).catch(() => {
      showMessage(
        "Error",
        "Unable to make the call."
      );
    });
  };
  /*
   * =========================================================
   * OPEN DIRECTIONS
   * =========================================================
   *
   * START:
   * User's captured current GPS location
   *
   * DESTINATION:
   * Hospital's saved latitude/longitude
   *
   * No Google Maps API key is required.
   */
  const openDirections = (
    hospital: Hospital
  ) => {
    if (!patientLocation) {
      showMessage(
        "Location Required",
        "Please tap 'Get My Current Location' first."
      );
      return;
    }
    if (
      hospital.latitude == null ||
      hospital.longitude == null
    ) {
      showMessage(
        "Hospital Location Unavailable",
        "This hospital does not have a saved GPS location."
      );
      return;
    }
    const origin =
      `${patientLocation.latitude},${patientLocation.longitude}`;
    const destination =
      `${hospital.latitude},${hospital.longitude}`;
    let url = "";
    /*
     * iOS → Apple Maps
     */
    if (Platform.OS === "ios") {
      url =
        `http://maps.apple.com/?saddr=${encodeURIComponent(
          origin
        )}&daddr=${encodeURIComponent(
          destination
        )}`;
    }
    /*
     * Android / Web → Google Maps
     *
     * This does NOT require a Google Maps API key.
     */
    else {
      url =
        `https://www.google.com/maps/dir/?api=1` +
        `&origin=${encodeURIComponent(
          origin
        )}` +
        `&destination=${encodeURIComponent(
          destination
        )}` +
        `&travelmode=driving`;
    }
    Linking.openURL(url).catch(() => {
      showMessage(
        "Maps Error",
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
    index,
  }: {
    item: Hospital;
    index: number;
  }) => (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.numberCircle}>
          <Text style={styles.numberText}>
            {index + 1}
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            marginLeft: 12,
          }}
        >
          <Text style={styles.name}>
            {item.name}
          </Text>
          <Text style={styles.location}>
            {item.city || ""}
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
        <View
          style={
            styles.distanceContainer
          }
        >
          <Ionicons
            name="navigate"
            size={18}
            color="#2563EB"
          />
          <Text style={styles.distance}>
            {Number(
              item.distance_km
            ).toFixed(2)}{" "}
            km away
          </Text>
        </View>
      )}
      <Text style={styles.address}>
        {item.address ||
          "Hospital address unavailable."}
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
   * SCREEN
   * =========================================================
   */
  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        🚑 Emergency Hospitals
      </Text>
      <Text style={styles.subHeader}>
        Find emergency hospitals near you.
        Tap the button below to use your
        current GPS location and calculate
        the distance to each hospital.
      </Text>
      /*
       * =====================================================
       * GET CURRENT LOCATION BUTTON
       * =====================================================
       */
      <TouchableOpacity
        style={[
          styles.locationButton,
          (locating || loading) &&
            styles.locationButtonDisabled,
        ]}
        onPress={
          handleGetCurrentLocation
        }
        disabled={
          locating || loading
        }
      >
        {locating ? (
          <ActivityIndicator
            size="small"
            color="#fff"
          />
        ) : (
          <Ionicons
            name="location"
            size={21}
            color="#fff"
          />
        )}
        <Text
          style={
            styles.locationButtonText
          }
        >
          {locating
            ? "Getting Your Location..."
            : patientLocation
            ? "Update My Current Location"
            : "Get My Current Location"}
        </Text>
      </TouchableOpacity>
      /*
       * =====================================================
       * LOCATION STATUS
       * =====================================================
       */
      {patientLocation && (
        <View
          style={
            styles.locationStatus
          }
        >
          <Ionicons
            name="checkmark-circle"
            size={19}
            color="#16A34A"
          />
          <View style={{ flex: 1 }}>
            <Text
              style={
                styles.locationStatusText
              }
            >
              Current location captured
            </Text>
            <Text
              style={
                styles.coordinatesText
              }
            >
              {patientLocation.latitude.toFixed(
                6
              )}
              {" , "}
              {patientLocation.longitude.toFixed(
                6
              )}
            </Text>
          </View>
        </View>
      )}
      /*
       * =====================================================
       * LOADING
       * =====================================================
       */
      {loading && (
        <View
          style={
            styles.loadingBox
          }
        >
          <ActivityIndicator
            size="large"
            color="#DC2626"
          />
          <Text
            style={
              styles.loadingText
            }
          >
            Calculating distances to
            emergency hospitals...
          </Text>
        </View>
      )}
      /*
       * =====================================================
       * HOSPITAL LIST
       * =====================================================
       */
      {!loading && (
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
              refreshing={
                refreshing
              }
              onRefresh={
                onRefresh
              }
            />
          }
          contentContainerStyle={{
            paddingBottom: 40,
          }}
          ListEmptyComponent={
            <View
              style={
                styles.emptyCard
              }
            >
              <Ionicons
                name="location"
                size={55}
                color="#DC2626"
              />
              <Text
                style={
                  styles.emptyTitle
                }
              >
                Find Emergency Hospitals
              </Text>
              <Text
                style={
                  styles.emptyText
                }
              >
                Tap "Get My Current Location"
                above. Your current GPS
                location will then be used to
                calculate the distance to each
                hospital.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
/*
 * =========================================================
 * STYLES
 * =========================================================
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    padding: 16,
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
  locationButton: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  locationButtonDisabled: {
    opacity: 0.7,
  },
  locationButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 9,
  },
  locationStatus: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginBottom: 14,
  },
  locationStatusText: {
    marginLeft: 8,
    color: "#166534",
    fontSize: 14,
    fontWeight: "700",
  },
  coordinatesText: {
    marginLeft: 8,
    marginTop: 2,
    color: "#15803D",
    fontSize: 12,
  },
  loadingBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 25,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 15,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#666",
    textAlign: "center",
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
  numberCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  numberText: {
    color: "#B91C1C",
    fontSize: 15,
    fontWeight: "800",
  },
  name: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111827",
  },
  location: {
    marginTop: 5,
    fontSize: 14,
    color: "#6B7280",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DC2626",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 11,
    marginLeft: 4,
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },
  distance: {
    marginLeft: 6,
    fontSize: 16,
    fontWeight: "800",
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
    marginTop: 50,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 21,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  emptyText: {
    marginTop: 10,
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
});