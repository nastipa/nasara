import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";
export default function EditHospital() {
  const router = useRouter();
  const params =
    useLocalSearchParams<{
      id?: string;
    }>();
  const hospitalId =
    Array.isArray(params.id)
      ? params.id[0]
      : params.id;
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [capturingLocation, setCapturingLocation] =
    useState(false);
  const [hospitalName, setHospitalName] =
    useState("");
  const [hospitalCode, setHospitalCode] =
    useState("");
  const [region, setRegion] =
    useState("");
  const [district, setDistrict] =
    useState("");
  const [city, setCity] =
    useState("");
  const [address, setAddress] =
    useState("");
  const [phone, setPhone] =
    useState("");
  const [email, setEmail] =
    useState("");
  /*
   * IMPORTANT:
   *
   * These are the FIXED coordinates of the
   * HOSPITAL.
   *
   * They are not the patient's coordinates.
   *
   * They are not automatically updated.
   */
  const [latitude, setLatitude] =
    useState("");
  const [longitude, setLongitude] =
    useState("");
  const [hasEmergency, setHasEmergency] =
    useState(true);
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
      Alert.alert(
        title,
        message
      );
    }
  };
  /*
   * =====================================================
   * LOAD HOSPITAL
   * =====================================================
   */
  const loadHospital = async () => {
    try {
      if (!hospitalId) {
        showMessage(
          "Error",
          "Hospital ID is missing."
        );
        router.back();
        return;
      }
      setLoading(true);
      const {
        data,
        error,
      } =
        await (supabase as any)
          .from("hospitals")
          .select("*")
          .eq(
            "id",
            hospitalId
          )
          .single();
      if (error) {
        throw error;
      }
      if (!data) {
        throw new Error(
          "Hospital not found."
        );
      }
      setHospitalName(
        data.name || ""
      );
      setHospitalCode(
        data.code || ""
      );
      setRegion(
        data.region || ""
      );
      setDistrict(
        data.district || ""
      );
      setCity(
        data.city || ""
      );
      setAddress(
        data.address || ""
      );
      setPhone(
        data.phone || ""
      );
      setEmail(
        data.email || ""
      );
      /*
       * Preserve the hospital's existing
       * GPS coordinates.
       */
      setLatitude(
        data.latitude != null
          ? Number(
              data.latitude
            ).toFixed(7)
          : ""
      );
      setLongitude(
        data.longitude != null
          ? Number(
              data.longitude
            ).toFixed(7)
          : ""
      );
      setHasEmergency(
        data.has_emergency !== false
      );
    } catch (error: any) {
      console.log(
        "Load hospital error:",
        error
      );
      showMessage(
        "Error",
        error?.message ||
          "Unable to load hospital."
      );
      router.back();
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadHospital();
  }, [hospitalId]);
  /*
   * =====================================================
   * CAPTURE ACTUAL HOSPITAL GPS
   * =====================================================
   *
   * IMPORTANT:
   *
   * Only use this button when the administrator
   * is physically at the hospital.
   *
   * This GPS becomes the hospital's saved
   * coordinates.
   */
  const captureLocation = async () => {
    try {
      setCapturingLocation(true);
      /*
       * Request permission.
       */
      const permission =
        await Location.requestForegroundPermissionsAsync();
      if (
        permission.status !==
        "granted"
      ) {
        showMessage(
          "Permission Required",
          "Location permission is required to capture the hospital's GPS coordinates."
        );
        return;
      }
      /*
       * Check device location services.
       */
      const servicesEnabled =
        await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        showMessage(
          "Location Services Disabled",
          "Please turn on Location Services and try again."
        );
        return;
      }
      /*
       * Get fresh high-accuracy GPS.
       */
      const location =
        await Location.getCurrentPositionAsync(
          {
            accuracy:
              Location.Accuracy.BestForNavigation,
            mayShowUserSettingsDialog:
              true,
          }
        );
      const lat =
        location.coords.latitude;
      const lng =
        location.coords.longitude;
      const accuracy =
        location.coords.accuracy;
      /*
       * Validate GPS.
       */
      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
      ) {
        showMessage(
          "Location Error",
          "The device returned invalid GPS coordinates."
        );
        return;
      }
      if (
        lat < -90 ||
        lat > 90
      ) {
        showMessage(
          "Location Error",
          "The captured latitude is invalid."
        );
        return;
      }
      if (
        lng < -180 ||
        lng > 180
      ) {
        showMessage(
          "Location Error",
          "The captured longitude is invalid."
        );
        return;
      }
      /*
       * Do not save a very inaccurate location.
       *
       * 100 metres is our warning/rejection
       * threshold for hospital coordinates.
       */
      if (
        accuracy != null &&
        accuracy > 100
      ) {
        showMessage(
          "GPS Accuracy Is Low",
          `The device currently reports approximately ${Math.round(
            accuracy
          )} metres accuracy.\n\nPlease move outside or to an area with a clearer GPS signal and try again.`
        );
        return;
      }
      /*
       * Update the form.
       */
      setLatitude(
        lat.toFixed(7)
      );
      setLongitude(
        lng.toFixed(7)
      );
      showMessage(
        "Hospital Location Captured",
        `Latitude: ${lat.toFixed(
          7
        )}\nLongitude: ${lng.toFixed(
          7
        )}${
          accuracy != null
            ? `\nGPS accuracy: approximately ${Math.round(
                accuracy
              )} metres`
            : ""
        }\n\nReview the coordinates before saving.`
      );
    } catch (error: any) {
      console.log(
        "Hospital location capture error:",
        error
      );
      showMessage(
        "Location Error",
        error?.message ||
          "Unable to capture the hospital's GPS location."
      );
    } finally {
      setCapturingLocation(false);
    }
  };
  /*
   * =====================================================
   * VALIDATE COORDINATES
   * =====================================================
   */
  const validateCoordinates = () => {
    const hospitalLatitude =
      Number(
        latitude.trim()
      );
    const hospitalLongitude =
      Number(
        longitude.trim()
      );
    if (
      latitude.trim() === "" ||
      !Number.isFinite(
        hospitalLatitude
      ) ||
      hospitalLatitude < -90 ||
      hospitalLatitude > 90
    ) {
      showMessage(
        "Invalid Latitude",
        "Enter the exact hospital latitude between -90 and 90."
      );
      return null;
    }
    if (
      longitude.trim() === "" ||
      !Number.isFinite(
        hospitalLongitude
      ) ||
      hospitalLongitude < -180 ||
      hospitalLongitude > 180
    ) {
      showMessage(
        "Invalid Longitude",
        "Enter the exact hospital longitude between -180 and 180."
      );
      return null;
    }
    return {
      latitude:
        hospitalLatitude,
      longitude:
        hospitalLongitude,
    };
  };
  /*
   * =====================================================
   * SAVE CHANGES
   * =====================================================
   */
  const saveChanges = async () => {
    try {
      if (!hospitalId) {
        showMessage(
          "Error",
          "Hospital ID is missing."
        );
        return;
      }
      if (
        !hospitalName.trim()
      ) {
        showMessage(
          "Hospital Name Required",
          "Please enter the hospital name."
        );
        return;
      }
      /*
       * Validate fixed hospital GPS.
       */
      const coordinates =
        validateCoordinates();
      if (!coordinates) {
        return;
      }
      setSaving(true);
      /*
       * Update hospital.
       */
      const {
        error,
      } =
        await (supabase as any)
          .from("hospitals")
          .update({
            name:
              hospitalName.trim(),
            code:
              hospitalCode.trim() ||
              null,
            region:
              region.trim() ||
              null,
            district:
              district.trim() ||
              null,
            city:
              city.trim() ||
              null,
            address:
              address.trim() ||
              null,
            phone:
              phone.trim() ||
              null,
            email:
              email.trim() ||
              null,
            /*
             * FIXED HOSPITAL GPS
             */
            latitude:
              coordinates.latitude,
            longitude:
              coordinates.longitude,
            has_emergency:
              hasEmergency,
            profile_completed:
              true,
          })
          .eq(
            "id",
            hospitalId
          );
      if (error) {
        throw error;
      }
      showMessage(
        "Success",
        `Hospital updated successfully.\n\nHospital GPS:\n${coordinates.latitude.toFixed(
          7
        )}, ${coordinates.longitude.toFixed(
          7
        )}`
      );
      router.back();
    } catch (error: any) {
      console.log(
        "Update hospital error:",
        error
      );
      showMessage(
        "Error",
        error?.message ||
          "Unable to update hospital."
      );
    } finally {
      setSaving(false);
    }
  };
  /*
   * =====================================================
   * LOADING SCREEN
   * =====================================================
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
          color="#2563EB"
        />
        <Text
          style={
            styles.loadingText
          }
        >
          Loading hospital...
        </Text>
      </View>
    );
  }
  /*
   * =====================================================
   * SCREEN
   * =====================================================
   */
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.content
      }
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={styles.headerRow}
      >
        <TouchableOpacity
          onPress={() =>
            router.back()
          }
          style={
            styles.backButton
          }
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color="#111827"
          />
        </TouchableOpacity>
        <View>
          <Text
            style={styles.title}
          >
            Edit Hospital
          </Text>
          <Text
            style={
              styles.subtitle
            }
          >
            Update hospital information
            and exact GPS location.
          </Text>
        </View>
      </View>
      <TextInput
        style={styles.input}
        placeholder="Hospital Name *"
        value={hospitalName}
        onChangeText={
          setHospitalName
        }
      />
      <TextInput
        style={styles.input}
        placeholder="Hospital Code"
        value={hospitalCode}
        onChangeText={
          setHospitalCode
        }
      />
      <TextInput
        style={styles.input}
        placeholder="Region"
        value={region}
        onChangeText={setRegion}
      />
      <TextInput
        style={styles.input}
        placeholder="District"
        value={district}
        onChangeText={
          setDistrict
        }
      />
      <TextInput
        style={styles.input}
        placeholder="Town / City"
        value={city}
        onChangeText={setCity}
      />
      <TextInput
        style={styles.input}
        placeholder="Hospital Address"
        value={address}
        onChangeText={
          setAddress
        }
      />
      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      {/* =================================================
          HOSPITAL GPS
          ================================================= */}
      <View
        style={
          styles.locationCard
        }
      >
        <View
          style={
            styles.locationHeader
          }
        >
          <Ionicons
            name="location"
            size={25}
            color="#DC2626"
          />
          <View
            style={{
              flex: 1,
              marginLeft: 10,
            }}
          >
            <Text
              style={
                styles.locationTitle
              }
            >
              Exact Hospital GPS Location
            </Text>
            <Text
              style={
                styles.locationDescription
              }
            >
              These coordinates represent the
              hospital's permanent physical
              location.
            </Text>
          </View>
        </View>
        <Text
          style={styles.fieldLabel}
        >
          Hospital Latitude
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Example: 5.603717"
          keyboardType="numbers-and-punctuation"
          value={latitude}
          onChangeText={
            setLatitude
          }
        />
        <Text
          style={styles.fieldLabel}
        >
          Hospital Longitude
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Example: -0.186964"
          keyboardType="numbers-and-punctuation"
          value={longitude}
          onChangeText={
            setLongitude
          }
        />
        {/* CURRENT GPS */}
        <TouchableOpacity
          style={[
            styles.locationButton,
            capturingLocation &&
              styles.locationButtonDisabled,
          ]}
          onPress={
            captureLocation
          }
          disabled={
            capturingLocation
          }
        >
          {capturingLocation ? (
            <ActivityIndicator
              color="#fff"
            />
          ) : (
            <Ionicons
              name="navigate"
              size={20}
              color="#fff"
            />
          )}
          <Text
            style={
              styles.locationButtonText
            }
          >
            {capturingLocation
              ? "Getting Accurate GPS..."
              : "Capture Hospital GPS"}
          </Text>
        </TouchableOpacity>
        {/* COORDINATE STATUS */}
        {latitude.trim() !== "" &&
          longitude.trim() !== "" && (
            <View
              style={
                styles.coordinateBox
              }
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color="#16A34A"
              />
              <View
                style={{
                  flex: 1,
                  marginLeft: 8,
                }}
              >
                <Text
                  style={
                    styles.coordinateTitle
                  }
                >
                  Hospital GPS Ready
                </Text>
                <Text
                  style={
                    styles.coordinateText
                  }
                >
                  {latitude},{" "}
                  {longitude}
                </Text>
              </View>
            </View>
          )}
        <View
          style={
            styles.warningBox
          }
        >
          <Ionicons
            name="warning"
            size={19}
            color="#92400E"
          />
          <Text
            style={
              styles.locationWarning
            }
          >
            Only tap "Capture Hospital GPS"
            when you are physically at this
            hospital. If you are somewhere
            else, manually enter the hospital's
            exact coordinates.
          </Text>
        </View>
        <Text
          style={
            styles.distanceExplanation
          }
        >
          Emergency distance is calculated
          from the patient's current GPS
          location to these saved hospital
          coordinates.
        </Text>
      </View>
      {/* =================================================
          EMERGENCY STATUS
          ================================================= */}
      <TouchableOpacity
        style={
          styles.emergencyToggle
        }
        onPress={() =>
          setHasEmergency(
            !hasEmergency
          )
        }
      >
        <Ionicons
          name={
            hasEmergency
              ? "checkbox"
              : "square-outline"
          }
          size={26}
          color={
            hasEmergency
              ? "#DC2626"
              : "#6B7280"
          }
        />
        <View
          style={{
            flex: 1,
            marginLeft: 12,
          }}
        >
          <Text
            style={
              styles.emergencyTitle
            }
          >
            Emergency Hospital
          </Text>
          <Text
            style={
              styles.emergencyDescription
            }
          >
            Include this hospital in
            emergency hospital results.
          </Text>
        </View>
      </TouchableOpacity>
      {/* =================================================
          SAVE
          ================================================= */}
      <TouchableOpacity
        style={
          styles.saveButton
        }
        disabled={
          saving ||
          capturingLocation
        }
        onPress={
          saveChanges
        }
      >
        {saving ? (
          <ActivityIndicator
            color="#fff"
          />
        ) : (
          <>
            <Ionicons
              name="save"
              size={20}
              color="#fff"
            />
            <Text
              style={
                styles.saveButtonText
              }
            >
              Save Changes
            </Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
/*
 * =========================================================
 * STYLES
 * =========================================================
 */
const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#F5F7FA",
    },
    content: {
      padding: 20,
      paddingBottom: 50,
    },
    loadingContainer: {
      flex: 1,
      justifyContent:
        "center",
      alignItems:
        "center",
      backgroundColor:
        "#F5F7FA",
    },
    loadingText: {
      marginTop: 12,
      color: "#6B7280",
      fontSize: 16,
    },
    headerRow: {
      flexDirection:
        "row",
      alignItems:
        "flex-start",
      marginBottom: 24,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor:
        "#FFFFFF",
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 12,
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: "#111827",
    },
    subtitle: {
      marginTop: 4,
      fontSize: 14,
      color: "#6B7280",
    },
    input: {
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        "#E5E7EB",
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: "#111827",
      marginBottom: 14,
    },
    fieldLabel: {
      fontSize: 14,
      fontWeight: "700",
      color: "#374151",
      marginBottom: 7,
    },
    locationCard: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 16,
      padding: 18,
      marginTop: 8,
      borderWidth: 1,
      borderColor:
        "#FECACA",
    },
    locationHeader: {
      flexDirection:
        "row",
      alignItems:
        "flex-start",
      marginBottom: 18,
    },
    locationTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: "#111827",
    },
    locationDescription: {
      marginTop: 4,
      fontSize: 14,
      color: "#6B7280",
      lineHeight: 20,
    },
    locationButton: {
      backgroundColor:
        "#DC2626",
      borderRadius: 12,
      paddingVertical: 14,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
    },
    locationButtonDisabled: {
      opacity: 0.7,
    },
    locationButtonText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "700",
      marginLeft: 8,
    },
    coordinateBox: {
      flexDirection:
        "row",
      alignItems:
        "center",
      backgroundColor:
        "#DCFCE7",
      borderRadius: 10,
      padding: 12,
      marginTop: 12,
    },
    coordinateTitle: {
      color: "#166534",
      fontSize: 14,
      fontWeight: "700",
    },
    coordinateText: {
      color: "#15803D",
      fontSize: 13,
      marginTop: 3,
    },
    warningBox: {
      flexDirection:
        "row",
      alignItems:
        "flex-start",
      backgroundColor:
        "#FEF3C7",
      borderRadius: 10,
      padding: 12,
      marginTop: 12,
    },
    locationWarning: {
      flex: 1,
      marginLeft: 8,
      fontSize: 13,
      color: "#92400E",
      lineHeight: 19,
    },
    distanceExplanation: {
      marginTop: 12,
      fontSize: 13,
      color: "#6B7280",
      lineHeight: 19,
      fontStyle: "italic",
    },
    emergencyToggle: {
      flexDirection:
        "row",
      alignItems:
        "center",
      backgroundColor:
        "#FFFFFF",
      borderRadius: 16,
      padding: 18,
      marginTop: 16,
      borderWidth: 1,
      borderColor:
        "#E5E7EB",
    },
    emergencyTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: "#111827",
    },
    emergencyDescription: {
      marginTop: 4,
      fontSize: 13,
      color: "#6B7280",
      lineHeight: 18,
    },
    saveButton: {
      backgroundColor:
        "#2563EB",
      paddingVertical: 16,
      borderRadius: 12,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginTop: 18,
      minHeight: 54,
      flexDirection:
        "row",
    },
    saveButtonText: {
      color: "#FFFFFF",
      fontSize: 17,
      fontWeight: "700",
      marginLeft: 8,
    },
  });