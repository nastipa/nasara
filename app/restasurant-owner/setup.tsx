import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { supabase } from "../../lib/supabase";

const showMessage = (title: string, message?: string) => {
  if (Platform.OS === "web") {
    window.alert(
      message ? `${title}\n\n${message}` : title
    );
  } else {
    // Keep this compatible with your existing app.
    // Replace with your existing cross-platform message helper if already available.
    console.log(title, message);
  }
};

export default function RestaurantOwnerSetupScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [capturingLocation, setCapturingLocation] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [ownerRecordId, setOwnerRecordId] = useState<string | null>(null);

  const [restaurantName, setRestaurantName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [openingTime, setOpeningTime] = useState("08:00");
  const [closingTime, setClosingTime] = useState("22:00");

  const [momoProvider, setMomoProvider] = useState("");
  const [momoNumber, setMomoNumber] = useState("");
  const [momoAccountName, setMomoAccountName] = useState("");

  const [acceptsMomo, setAcceptsMomo] = useState(true);
  const [acceptsCash, setAcceptsCash] = useState(false);
  const [acceptsCard, setAcceptsCard] = useState(false);

  useEffect(() => {
    loadOwner();
  }, []);

  const loadOwner = async () => {
    try {
      setLoading(true);

      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.log(
          "Session error:",
          sessionError.message
        );

        showMessage(
          "Session Error",
          sessionError.message
        );

        router.replace("/profile");
        return;
      }

      const currentUser =
        sessionData.session?.user;

      if (!currentUser) {
        showMessage(
          "Session Expired",
          "Please log in again."
        );

        router.replace("/(auth)/login");
        return;
      }

      setUserId(currentUser.id);

      const { data: owner, error: ownerError } =
        await (supabase as any)
          .from("restaurant_owners")
          .select(
            "id, user_id, restaurant_id, status"
          )
          .eq("user_id", currentUser.id)
          .eq("status", "active")
          .maybeSingle();

      if (ownerError) {
        console.log(
          "Restaurant owner error:",
          ownerError.message
        );

        showMessage(
          "Error",
          ownerError.message
        );

        return;
      }

      if (!owner) {
        showMessage(
          "Access Denied",
          "This account is not registered as a restaurant owner."
        );

        router.replace("/profile");
        return;
      }

      setOwnerRecordId(owner.id);

      // Restaurant already exists.
      if (owner.restaurant_id) {
        router.replace(
          "/restaurant-owner/dashboard"
        );
        return;
      }

      // Load the owner's existing profile details.
      const { data: profile } =
        await (supabase as any)
          .from("profiles")
          .select(
            "full_name, phone, location"
          )
          .eq("id", currentUser.id)
          .maybeSingle();

      if (profile) {
        setPhone(profile.phone || "");
        setAddress(profile.location || "");
      }

    } catch (error) {
      console.log(
        "Load restaurant owner failed:",
        error
      );

      showMessage(
        "Error",
        "Unable to load restaurant setup."
      );
    } finally {
      setLoading(false);
    }
  };

  const captureLocation = async () => {
    try {
      setCapturingLocation(true);

      const {
        status,
      } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        showMessage(
          "Location Permission",
          "Please allow location access to capture your restaurant location."
        );
        return;
      }

      const location =
        await Location.getCurrentPositionAsync({
          accuracy:
            Location.Accuracy.High,
        });

      const lat =
        location.coords.latitude;

      const lng =
        location.coords.longitude;

      setLatitude(lat);
      setLongitude(lng);

      try {
        const addresses =
          await Location.reverseGeocodeAsync({
            latitude: lat,
            longitude: lng,
          });

        if (
          addresses &&
          addresses.length > 0
        ) {
          const place = addresses[0];

          const parts = [
            place.name,
            place.street,
            place.city,
            place.region,
            place.country,
          ].filter(Boolean);

          if (parts.length > 0) {
            setAddress(
              parts.join(", ")
            );
          }
        }
      } catch (reverseError) {
        console.log(
          "Reverse geocoding failed:",
          reverseError
        );
      }

      showMessage(
        "Location Captured",
        "Your restaurant GPS location has been captured."
      );

    } catch (error: any) {
      console.log(
        "Location capture error:",
        error
      );

      showMessage(
        "Location Error",
        error?.message ||
          "Unable to capture your location."
      );
    } finally {
      setCapturingLocation(false);
    }
  };

  const validateForm = () => {
    if (!restaurantName.trim()) {
      showMessage(
        "Restaurant Name",
        "Please enter your restaurant name."
      );
      return false;
    }

    if (!phone.trim()) {
      showMessage(
        "Phone Number",
        "Please enter your restaurant phone number."
      );
      return false;
    }

    if (!address.trim()) {
      showMessage(
        "Address",
        "Please enter your restaurant address."
      );
      return false;
    }

    if (
      latitude === null ||
      longitude === null
    ) {
      showMessage(
        "GPS Location",
        "Please capture your restaurant GPS location."
      );
      return false;
    }

    if (!openingTime.trim()) {
      showMessage(
        "Opening Time",
        "Please enter the opening time."
      );
      return false;
    }

    if (!closingTime.trim()) {
      showMessage(
        "Closing Time",
        "Please enter the closing time."
      );
      return false;
    }

    if (acceptsMomo) {
      if (
        !momoProvider.trim() ||
        !momoNumber.trim() ||
        !momoAccountName.trim()
      ) {
        showMessage(
          "MoMo Details",
          "Please complete your MoMo details because MoMo payments are enabled."
        );
        return false;
      }
    }

    if (
      !acceptsMomo &&
      !acceptsCash &&
      !acceptsCard
    ) {
      showMessage(
        "Payment Method",
        "Please select at least one payment method."
      );
      return false;
    }

    return true;
  };

  const createRestaurant = async () => {
    if (!userId || !ownerRecordId) {
      showMessage(
        "Error",
        "Restaurant owner information is missing."
      );
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      /*
       * STEP 1
       * Make sure this owner has not already been connected
       * to a restaurant.
       */
      const { data: currentOwner, error: ownerCheckError } =
        await (supabase as any)
          .from("restaurant_owners")
          .select(
            "id, restaurant_id, status"
          )
          .eq("id", ownerRecordId)
          .eq("user_id", userId)
          .eq("status", "active")
          .single();

      if (ownerCheckError) {
        throw new Error(
          ownerCheckError.message
        );
      }

      if (currentOwner.restaurant_id) {
        showMessage(
          "Restaurant Already Exists",
          "Your restaurant has already been created."
        );

        router.replace(
          "/restaurant-owner/dashboard"
        );

        return;
      }

      /*
       * STEP 2
       * Create the restaurant.
       *
       * owner_id points directly to auth.users.id,
       * matching your existing restaurants table.
       */
      const { data: restaurant, error: restaurantError } =
        await (supabase as any)
          .from("restaurants")
          .insert({
            owner_id: userId,
            name: restaurantName.trim(),
            description:
              description.trim() || null,
            phone: phone.trim(),
            address: address.trim(),
            latitude,
            longitude,
            opening_time:
              openingTime.trim(),
            closing_time:
              closingTime.trim(),
            is_open: true,

            /*
             * Keep your existing restaurant approval
             * system intact.
             */
            status: "pending",

            momo_provider:
              momoProvider.trim() || null,
            momo_number:
              momoNumber.trim() || null,
            momo_account_name:
              momoAccountName.trim() || null,

            accepts_momo:
              acceptsMomo,
            accepts_cash:
              acceptsCash,
            accepts_card:
              acceptsCard,
          })
          .select("id")
          .single();

      if (restaurantError) {
        throw new Error(
          restaurantError.message
        );
      }

      if (!restaurant?.id) {
        throw new Error(
          "Restaurant was created but no restaurant ID was returned."
        );
      }

      /*
       * STEP 3
       * Connect restaurant_owners.restaurant_id
       * to the newly created restaurant.
       */
      const {
        error: ownerUpdateError,
      } = await (supabase as any)
        .from("restaurant_owners")
        .update({
          restaurant_id:
            restaurant.id,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", ownerRecordId)
        .eq("user_id", userId);

      /*
       * If connecting the owner fails, attempt to remove
       * the newly-created restaurant so we don't leave
       * an orphan restaurant behind.
       */
      if (ownerUpdateError) {
        console.log(
          "Owner update failed:",
          ownerUpdateError.message
        );

        await (supabase as any)
          .from("restaurants")
          .delete()
          .eq(
            "id",
            restaurant.id
          );

        throw new Error(
          ownerUpdateError.message
        );
      }

      showMessage(
        "Restaurant Created",
        "Your restaurant has been created successfully."
      );

      router.replace(
        "/restaurant-owner/dashboard"
      );

    } catch (error: any) {
      console.log(
        "Create restaurant error:",
        error
      );

      showMessage(
        "Unable to Create Restaurant",
        error?.message ||
          "Something went wrong while creating your restaurant."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
        />

        <Text style={styles.loadingText}>
          Loading restaurant setup...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerIcon}>
            🍽️
          </Text>

          <Text style={styles.title}>
            Set Up Your Restaurant
          </Text>

          <Text style={styles.subtitle}>
            Complete your restaurant profile so
            customers can discover your business
            on Nasara.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Restaurant Information
          </Text>

          <Text style={styles.label}>
            Restaurant Name *
          </Text>

          <TextInput
            value={restaurantName}
            onChangeText={
              setRestaurantName
            }
            placeholder="Enter restaurant name"
            style={styles.input}
            editable={!saving}
          />

          <Text style={styles.label}>
            Description
          </Text>

          <TextInput
            value={description}
            onChangeText={
              setDescription
            }
            placeholder="Tell customers about your restaurant"
            style={[
              styles.input,
              styles.textArea,
            ]}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!saving}
          />

          <Text style={styles.label}>
            Restaurant Phone *
          </Text>

          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter restaurant phone number"
            keyboardType="phone-pad"
            style={styles.input}
            editable={!saving}
          />

          <Text style={styles.label}>
            Address *
          </Text>

          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Enter restaurant address"
            style={[
              styles.input,
              styles.textArea,
            ]}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            editable={!saving}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            📍 Restaurant Location
          </Text>

          <Text style={styles.helperText}>
            Capture your current restaurant
            location so Nasara can calculate
            distance from customers.
          </Text>

          <TouchableOpacity
            style={styles.locationButton}
            onPress={captureLocation}
            disabled={
              capturingLocation ||
              saving
            }
          >
            {capturingLocation ? (
              <ActivityIndicator
                color="#fff"
              />
            ) : (
              <Text
                style={
                  styles.locationButtonText
                }
              >
                📍 Capture Restaurant GPS
              </Text>
            )}
          </TouchableOpacity>

          {latitude !== null &&
            longitude !== null && (
              <View
                style={
                  styles.locationBox
                }
              >
                <Text
                  style={
                    styles.locationSuccess
                  }
                >
                  ✓ GPS Location Captured
                </Text>

                <Text
                  style={
                    styles.coordinates
                  }
                >
                  Latitude:{" "}
                  {latitude.toFixed(6)}
                </Text>

                <Text
                  style={
                    styles.coordinates
                  }
                >
                  Longitude:{" "}
                  {longitude.toFixed(6)}
                </Text>
              </View>
            )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            🕐 Opening Hours
          </Text>

          <Text style={styles.label}>
            Opening Time
          </Text>

          <TextInput
            value={openingTime}
            onChangeText={
              setOpeningTime
            }
            placeholder="08:00"
            style={styles.input}
            editable={!saving}
          />

          <Text style={styles.timeHint}>
            Use 24-hour format, for example
            08:00.
          </Text>

          <Text style={styles.label}>
            Closing Time
          </Text>

          <TextInput
            value={closingTime}
            onChangeText={
              setClosingTime
            }
            placeholder="22:00"
            style={styles.input}
            editable={!saving}
          />

          <Text style={styles.timeHint}>
            Use 24-hour format, for example
            22:00.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            💳 Payment Methods
          </Text>

          <Text style={styles.helperText}>
            Select the payment methods your
            restaurant accepts from customers.
          </Text>

          <TouchableOpacity
            style={styles.optionRow}
            onPress={() =>
              setAcceptsMomo(
                !acceptsMomo
              )
            }
            disabled={saving}
          >
            <View
              style={[
                styles.checkbox,
                acceptsMomo &&
                  styles.checkboxActive,
              ]}
            >
              {acceptsMomo && (
                <Text
                  style={
                    styles.checkmark
                  }
                >
                  ✓
                </Text>
              )}
            </View>

            <Text style={styles.optionText}>
              Mobile Money
            </Text>
          </TouchableOpacity>

          {acceptsMomo && (
            <View
              style={
                styles.paymentDetails
              }
            >
              <Text style={styles.label}>
                MoMo Network *
              </Text>

              <TextInput
                value={momoProvider}
                onChangeText={
                  setMomoProvider
                }
                placeholder="MTN / Telecel"
                style={styles.input}
                editable={!saving}
              />

              <Text style={styles.label}>
                MoMo Number *
              </Text>

              <TextInput
                value={momoNumber}
                onChangeText={
                  setMomoNumber
                }
                placeholder="Enter MoMo number"
                keyboardType="phone-pad"
                style={styles.input}
                editable={!saving}
              />

              <Text style={styles.label}>
                MoMo Account Name *
              </Text>

              <TextInput
                value={momoAccountName}
                onChangeText={
                  setMomoAccountName
                }
                placeholder="Enter account name"
                style={styles.input}
                editable={!saving}
              />
            </View>
          )}

          <TouchableOpacity
            style={styles.optionRow}
            onPress={() =>
              setAcceptsCash(
                !acceptsCash
              )
            }
            disabled={saving}
          >
            <View
              style={[
                styles.checkbox,
                acceptsCash &&
                  styles.checkboxActive,
              ]}
            >
              {acceptsCash && (
                <Text
                  style={
                    styles.checkmark
                  }
                >
                  ✓
                </Text>
              )}
            </View>

            <Text style={styles.optionText}>
              Cash
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionRow}
            onPress={() =>
              setAcceptsCard(
                !acceptsCard
              )
            }
            disabled={saving}
          >
            <View
              style={[
                styles.checkbox,
                acceptsCard &&
                  styles.checkboxActive,
              ]}
            >
              {acceptsCard && (
                <Text
                  style={
                    styles.checkmark
                  }
                >
                  ✓
                </Text>
              )}
            </View>

            <Text style={styles.optionText}>
              Card
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>
            What happens next?
          </Text>

          <Text style={styles.infoText}>
            • Your restaurant profile will be
            created.
          </Text>

          <Text style={styles.infoText}>
            • You can then add your logo and
            cover image.
          </Text>

          <Text style={styles.infoText}>
            • You can create food categories.
          </Text>

          <Text style={styles.infoText}>
            • You can add your menu and food
            pictures.
          </Text>

          <Text style={styles.infoText}>
            • You can set food prices and
            availability.
          </Text>

          <Text style={styles.infoText}>
            • You can manage customer orders
            from your dashboard.
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.saveButton,
            saving &&
              styles.saveButtonDisabled,
          ]}
          onPress={createRestaurant}
          disabled={saving}
        >
          {saving ? (
            <>
              <ActivityIndicator
                color="#fff"
              />

              <Text
                style={[
                  styles.saveButtonText,
                  {
                    marginLeft: 10,
                  },
                ]}
              >
                Creating Restaurant...
              </Text>
            </>
          ) : (
            <Text
              style={
                styles.saveButtonText
              }
            >
              Create My Restaurant
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() =>
            router.back()
          }
          disabled={saving}
        >
          <Text
            style={
              styles.cancelButtonText
            }
          >
            Cancel
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },

  content: {
    padding: 20,
    paddingBottom: 60,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f7fb",
  },

  loadingText: {
    marginTop: 12,
    color: "#6b7280",
    fontSize: 15,
  },

  header: {
    alignItems: "center",
    marginBottom: 22,
  },

  headerIcon: {
    fontSize: 48,
    marginBottom: 8,
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },

  subtitle: {
    marginTop: 8,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 21,
    fontSize: 14,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 7,
  },

  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: "#fff",
    color: "#111827",
    marginBottom: 13,
  },

  textArea: {
    minHeight: 90,
  },

  helperText: {
    color: "#6b7280",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 15,
  },

  locationButton: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  locationButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },

  locationBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },

  locationSuccess: {
    color: "#047857",
    fontWeight: "800",
    marginBottom: 6,
  },

  coordinates: {
    color: "#374151",
    fontSize: 13,
    marginTop: 2,
  },

  timeHint: {
    color: "#9ca3af",
    fontSize: 12,
    marginTop: -8,
    marginBottom: 13,
  },

  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#9ca3af",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  checkboxActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },

  checkmark: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },

  optionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },

  paymentDetails: {
    paddingLeft: 36,
    marginTop: 4,
    marginBottom: 6,
  },

  infoBox: {
    backgroundColor: "#eff6ff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },

  infoTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e40af",
    marginBottom: 8,
  },

  infoText: {
    color: "#374151",
    fontSize: 13,
    lineHeight: 21,
  },

  saveButton: {
    minHeight: 52,
    backgroundColor: "#16a34a",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: 20,
  },

  saveButtonDisabled: {
    backgroundColor: "#9ca3af",
  },

  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },

  cancelButton: {
    marginTop: 12,
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e5e7eb",
  },

  cancelButtonText: {
    color: "#374151",
    fontSize: 15,
    fontWeight: "700",
  },
});