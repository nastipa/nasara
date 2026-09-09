import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";

type Restaurant = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  phone: string;
  whatsapp_phone: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  logo_url: string | null;
  cover_image_url: string | null;
  opening_time: string | null;
  closing_time: string | null;
  is_open: boolean;
  status: "active" | "suspended" | "closed";
  momo_provider: string | null;
  momo_number: string | null;
  momo_account_name: string | null;
  accepts_momo: boolean;
  accepts_cash: boolean;
  accepts_card: boolean;
};

type MomoProvider =
  | "MTN"
  | "Telecel"
  | "AirtelTigo"
  | "";

function showMessage(title: string, message?: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.alert(
        message ? `${title}\n\n${message}` : title
      );
    }
  } else {
    const { Alert } = require("react-native");
    Alert.alert(title, message);
  }
}

export default function RestaurantSettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [capturingLocation, setCapturingLocation] =
    useState(false);

  const [restaurant, setRestaurant] =
    useState<Restaurant | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [openingTime, setOpeningTime] = useState("");
  const [closingTime, setClosingTime] = useState("");

  const [latitude, setLatitude] = useState<number | null>(
    null
  );
  const [longitude, setLongitude] = useState<number | null>(
    null
  );

  const [momoProvider, setMomoProvider] =
    useState<MomoProvider>("");
  const [momoNumber, setMomoNumber] = useState("");
  const [momoAccountName, setMomoAccountName] =
    useState("");

  const [acceptsMomo, setAcceptsMomo] = useState(true);
  const [acceptsCash, setAcceptsCash] = useState(false);
  const [acceptsCard, setAcceptsCard] = useState(false);

  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);

      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      const user = authData.user;

      if (!user) {
        router.replace("/login");
        return;
      }

      const {
        data: ownerData,
        error: ownerError,
      } = await (supabase as any)
        .from("restaurant_owners")
        .select("id, restaurant_id, status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownerError) {
        throw ownerError;
      }

      if (!ownerData) {
        showMessage(
          "Access denied",
          "Restaurant owner access could not be found."
        );

        router.replace("/(restaurant-owner)/dashboard");
        return;
      }

      if (ownerData.status !== "active") {
        showMessage(
          "Access unavailable",
          "Your restaurant owner account is not currently active."
        );

        router.replace("/(restaurant-owner)/dashboard");
        return;
      }

      let restaurantData: Restaurant | null = null;

      if (ownerData.restaurant_id) {
        const {
          data,
          error,
        } = await supabase
          .from("restaurants")
          .select("*")
          .eq("id", ownerData.restaurant_id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        restaurantData = data as Restaurant | null;
      }

      /*
       * If restaurant_id is NULL or the linked restaurant
       * cannot be found, use restaurants.owner_id as the
       * authoritative relationship.
       */
      if (!restaurantData) {
        const {
          data,
          error,
        } = await (supabase as any)
          .from("restaurants")
          .select("*")
          .eq("owner_id", user.id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        restaurantData = data as Restaurant | null;

        /*
         * Repair the convenience link in restaurant_owners.
         */
        if (
          restaurantData &&
          ownerData.restaurant_id !== restaurantData.id
        ) {
          const { error: repairError } =
            await (supabase as any)
              .from("restaurant_owners")
              .update({
                restaurant_id: restaurantData.id,
              })
              .eq("user_id", user.id);

          if (repairError) {
            console.log(
              "Unable to repair restaurant owner link:",
              repairError
            );
          }
        }
      }

      if (!restaurantData) {
        showMessage(
          "Restaurant not found",
          "Create your restaurant before opening settings."
        );

        router.replace(
          "/(restaurant-owner)/create-restaurant"
        );

        return;
      }

      setRestaurant(restaurantData);

      setName(restaurantData.name || "");
      setDescription(
        restaurantData.description || ""
      );
      setPhone(restaurantData.phone || "");
      setAddress(restaurantData.address || "");

      setOpeningTime(
        restaurantData.opening_time
          ? restaurantData.opening_time.slice(0, 5)
          : ""
      );

      setClosingTime(
        restaurantData.closing_time
          ? restaurantData.closing_time.slice(0, 5)
          : ""
      );

      setLatitude(restaurantData.latitude);
      setLongitude(restaurantData.longitude);

      setMomoProvider(
        (restaurantData.momo_provider as MomoProvider) ||
          ""
      );

      setMomoNumber(
        restaurantData.momo_number || ""
      );

      setMomoAccountName(
        restaurantData.momo_account_name || ""
      );

      setAcceptsMomo(
        restaurantData.accepts_momo
      );

      setAcceptsCash(
        restaurantData.accepts_cash
      );

      setAcceptsCard(
        restaurantData.accepts_card
      );

      setIsOpen(restaurantData.is_open);
    } catch (error: any) {
      console.error(
        "Load restaurant settings error:",
        error
      );

      showMessage(
        "Error",
        error?.message ||
          "Unable to load restaurant settings."
      );
    } finally {
      setLoading(false);
    }
  }

  function normalizeTime(value: string) {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    const parts = trimmed.split(":");

    if (parts.length !== 2) {
      return null;
    }

    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);

    if (
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return null;
    }

    return `${String(hours).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}:00`;
  }

  async function captureCurrentLocation() {
    try {
      setCapturingLocation(true);

      const {
        status,
      } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        showMessage(
          "Location permission required",
          "Allow location access so customers can find your restaurant accurately."
        );

        return;
      }

      const location =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

      const lat = location.coords.latitude;
      const lng = location.coords.longitude;

      setLatitude(lat);
      setLongitude(lng);

      /*
       * Try to automatically update the visible address
       * from the captured coordinates.
       */
      try {
        const results =
          await Location.reverseGeocodeAsync({
            latitude: lat,
            longitude: lng,
          });

        if (results.length > 0) {
          const result = results[0];

          const addressParts = [
            result.name,
            result.street,
            result.city,
            result.region,
            result.country,
          ].filter(Boolean);

          if (addressParts.length > 0) {
            setAddress(
              addressParts.join(", ")
            );
          }
        }
      } catch (geocodeError) {
        console.log(
          "Reverse geocoding failed:",
          geocodeError
        );
      }

      showMessage(
        "Location captured",
        "Your restaurant's current GPS location has been captured."
      );
    } catch (error: any) {
      console.error(
        "Capture restaurant location error:",
        error
      );

      showMessage(
        "Location error",
        error?.message ||
          "Unable to capture your current location."
      );
    } finally {
      setCapturingLocation(false);
    }
  }

  function validateSettings() {
    if (!name.trim()) {
      showMessage(
        "Restaurant name required",
        "Enter your restaurant name."
      );

      return false;
    }

    if (!phone.trim()) {
      showMessage(
        "Phone number required",
        "Enter the restaurant phone number."
      );

      return false;
    }

    if (!address.trim()) {
      showMessage(
        "Address required",
        "Enter the restaurant address."
      );

      return false;
    }

    const normalizedOpening =
      normalizeTime(openingTime);

    const normalizedClosing =
      normalizeTime(closingTime);

    if (
      openingTime.trim() &&
      !normalizedOpening
    ) {
      showMessage(
        "Invalid opening time",
        "Use the 24-hour format HH:MM, for example 08:00."
      );

      return false;
    }

    if (
      closingTime.trim() &&
      !normalizedClosing
    ) {
      showMessage(
        "Invalid closing time",
        "Use the 24-hour format HH:MM, for example 22:00."
      );

      return false;
    }

    if (acceptsMomo) {
      if (!momoProvider) {
        showMessage(
          "MoMo network required",
          "Select the MoMo network used by your restaurant."
        );

        return false;
      }

      if (!momoNumber.trim()) {
        showMessage(
          "MoMo number required",
          "Enter the MoMo number customers should use for payment."
        );

        return false;
      }

      if (!momoAccountName.trim()) {
        showMessage(
          "MoMo account name required",
          "Enter the name customers should see when making payment."
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
        "Payment method required",
        "Enable at least one payment method."
      );

      return false;
    }

    return true;
  }

  async function saveSettings() {
    if (!restaurant) {
      return;
    }

    if (!validateSettings()) {
      return;
    }

    try {
      setSaving(true);

      const normalizedOpening =
        normalizeTime(openingTime);

      const normalizedClosing =
        normalizeTime(closingTime);

      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      const user = authData.user;

      if (!user) {
        showMessage(
          "Session expired",
          "Please sign in again."
        );

        return;
      }

      const {
        data: ownerData,
        error: ownerError,
      } = await (supabase as any)
        .from("restaurant_owners")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownerError) {
        throw ownerError;
      }

      if (
        !ownerData ||
        ownerData.status !== "active"
      ) {
        showMessage(
          "Access unavailable",
          "Your restaurant owner access is not active."
        );

        return;
      }

      const updatePayload = {
        name: name.trim(),

        description:
          description.trim() || null,

        phone: phone.trim(),

        address: address.trim(),

        latitude,

        longitude,

        opening_time:
          normalizedOpening,

        closing_time:
          normalizedClosing,

        is_open: isOpen,

        momo_provider:
          acceptsMomo && momoProvider
            ? momoProvider
            : null,

        momo_number:
          acceptsMomo && momoNumber.trim()
            ? momoNumber.trim()
            : null,

        momo_account_name:
          acceptsMomo &&
          momoAccountName.trim()
            ? momoAccountName.trim()
            : null,

        accepts_momo: acceptsMomo,

        accepts_cash: acceptsCash,

        accepts_card: acceptsCard,
      };

      const {
        data: updatedRestaurant,
        error: updateError,
      } = await (supabase as any)
        .from("restaurants")
        .update(updatePayload)
        .eq("id", restaurant.id)
        .eq("owner_id", user.id)
        .select("*")
        .single();

      if (updateError) {
        throw updateError;
      }

      setRestaurant(
        updatedRestaurant as Restaurant
      );

      showMessage(
        "Settings saved",
        "Your restaurant settings have been updated successfully."
      );
    } catch (error: any) {
      console.error(
        "Save restaurant settings error:",
        error
      );

      showMessage(
        "Save failed",
        error?.message ||
          "Unable to save restaurant settings."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color="#D71920"
          />

          <Text style={styles.loadingText}>
            Loading settings...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!restaurant) {
    return null;
  }

  const statusColor =
    restaurant.status === "active"
      ? "#16A34A"
      : restaurant.status === "suspended"
      ? "#DC2626"
      : "#6B7280";

  const statusLabel =
    restaurant.status === "active"
      ? "Active"
      : restaurant.status === "suspended"
      ? "Suspended"
      : "Closed";

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              router.replace(
                "/(restaurant-owner)/dashboard" 
              )
            }
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color="#111827"
            />
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>
              Settings
            </Text>

            <Text style={styles.headerSubtitle}>
              Manage your restaurant
            </Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.restaurantStatusCard,
              {
                borderColor: `${statusColor}35`,
                backgroundColor: `${statusColor}08`,
              },
            ]}
          >
            <View
              style={[
                styles.restaurantStatusIcon,
                {
                  backgroundColor: `${statusColor}18`,
                },
              ]}
            >
              <Ionicons
                name={
                  restaurant.status === "active"
                    ? "checkmark-circle"
                    : restaurant.status ===
                      "suspended"
                    ? "ban"
                    : "lock-closed"
                }
                size={22}
                color={statusColor}
              />
            </View>

            <View
              style={styles.restaurantStatusInfo}
            >
              <Text style={styles.restaurantStatusTitle}>
                Restaurant Status
              </Text>

              <Text
                style={[
                  styles.restaurantStatusValue,
                  {
                    color: statusColor,
                  },
                ]}
              >
                {statusLabel}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons
                  name="restaurant-outline"
                  size={19}
                  color="#D71920"
                />
              </View>

              <View>
                <Text style={styles.sectionTitle}>
                  Restaurant Information
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Information customers will see
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>
                Restaurant Name
              </Text>

              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter restaurant name"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />

              <Text style={styles.label}>
                Description
              </Text>

              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Tell customers about your restaurant"
                placeholderTextColor="#9CA3AF"
                style={[
                  styles.input,
                  styles.multilineInput,
                ]}
                multiline
                textAlignVertical="top"
              />

              <Text style={styles.label}>
                Restaurant Phone
              </Text>

              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="024 000 0000"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>
                Address
              </Text>

              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="Restaurant address"
                placeholderTextColor="#9CA3AF"
                style={[
                  styles.input,
                  styles.multilineInput,
                ]}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons
                  name="location-outline"
                  size={19}
                  color="#D71920"
                />
              </View>

              <View>
                <Text style={styles.sectionTitle}>
                  Restaurant Location
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Help customers find you accurately
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={captureCurrentLocation}
                disabled={capturingLocation}
              >
                {capturingLocation ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                ) : (
                  <Ionicons
                    name="navigate-outline"
                    size={20}
                    color="#FFFFFF"
                  />
                )}

                <Text
                  style={styles.locationButtonText}
                >
                  {capturingLocation
                    ? "Capturing Location..."
                    : "Capture Current Location"}
                </Text>
              </TouchableOpacity>

              <View style={styles.coordinatesCard}>
                <View style={styles.coordinateItem}>
                  <Text style={styles.coordinateLabel}>
                    Latitude
                  </Text>

                  <Text
                    style={styles.coordinateValue}
                  >
                    {latitude !== null
                      ? latitude.toFixed(6)
                      : "Not captured"}
                  </Text>
                </View>

                <View style={styles.coordinateDivider} />

                <View style={styles.coordinateItem}>
                  <Text style={styles.coordinateLabel}>
                    Longitude
                  </Text>

                  <Text
                    style={styles.coordinateValue}
                  >
                    {longitude !== null
                      ? longitude.toFixed(6)
                      : "Not captured"}
                  </Text>
                </View>
              </View>

              <Text style={styles.locationHint}>
                Capturing your current location updates
                the restaurant GPS coordinates. Customers
                will later use these coordinates when
                finding restaurants near them.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons
                  name="time-outline"
                  size={19}
                  color="#D71920"
                />
              </View>

              <View>
                <Text style={styles.sectionTitle}>
                  Opening Hours
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Tell customers when you operate
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.timeRow}>
                <View style={styles.timeInputContainer}>
                  <Text style={styles.label}>
                    Opening Time
                  </Text>

                  <TextInput
                    value={openingTime}
                    onChangeText={setOpeningTime}
                    placeholder="08:00"
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>

                <View style={styles.timeArrow}>
                  <Ionicons
                    name="arrow-forward"
                    size={19}
                    color="#9CA3AF"
                  />
                </View>

                <View style={styles.timeInputContainer}>
                  <Text style={styles.label}>
                    Closing Time
                  </Text>

                  <TextInput
                    value={closingTime}
                    onChangeText={setClosingTime}
                    placeholder="22:00"
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>

              <Text style={styles.timeHint}>
                Use 24-hour format. Example: 08:00 to
                22:00.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons
                  name="wallet-outline"
                  size={19}
                  color="#D71920"
                />
              </View>

              <View>
                <Text style={styles.sectionTitle}>
                  Payment Methods
                </Text>

                <Text style={styles.sectionSubtitle}>
                  How customers can pay your restaurant
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.paymentToggleRow}>
                <View
                  style={styles.paymentToggleLeft}
                >
                  <View style={styles.paymentIcon}>
                    <Ionicons
                      name="phone-portrait-outline"
                      size={20}
                      color="#D71920"
                    />
                  </View>

                  <View
                    style={styles.paymentToggleInfo}
                  >
                    <Text
                      style={styles.paymentToggleTitle}
                    >
                      Mobile Money
                    </Text>

                    <Text
                      style={
                        styles.paymentToggleDescription
                      }
                    >
                      Customers pay directly to your
                      restaurant MoMo account.
                    </Text>
                  </View>
                </View>

                <Switch
                  value={acceptsMomo}
                  onValueChange={setAcceptsMomo}
                  trackColor={{
                    false: "#D1D5DB",
                    true: "#F5A3A6",
                  }}
                  thumbColor={
                    acceptsMomo
                      ? "#D71920"
                      : "#F9FAFB"
                  }
                />
              </View>

              {acceptsMomo ? (
                <View style={styles.paymentFields}>
                  <Text style={styles.label}>
                    MoMo Network
                  </Text>

                  <View style={styles.providerRow}>
                    {(
                      [
                        "MTN",
                        "Telecel",
                        "AirtelTigo",
                      ] as MomoProvider[]
                    ).map((provider) => {
                      const selected =
                        momoProvider === provider;

                      return (
                        <TouchableOpacity
                          key={provider}
                          style={[
                            styles.providerButton,
                            selected &&
                              styles.providerButtonActive,
                          ]}
                          onPress={() =>
                            setMomoProvider(provider)
                          }
                        >
                          <Text
                            style={[
                              styles.providerText,
                              selected &&
                                styles.providerTextActive,
                            ]}
                          >
                            {provider}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.label}>
                    MoMo Number
                  </Text>

                  <TextInput
                    value={momoNumber}
                    onChangeText={setMomoNumber}
                    placeholder="024 000 0000"
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                    keyboardType="phone-pad"
                  />

                  <Text style={styles.label}>
                    MoMo Account Name
                  </Text>

                  <TextInput
                    value={momoAccountName}
                    onChangeText={setMomoAccountName}
                    placeholder="Restaurant account name"
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                  />
                </View>
              ) : null}

              <View
                style={[
                  styles.paymentToggleRow,
                  styles.paymentToggleBorder,
                ]}
              >
                <View
                  style={styles.paymentToggleLeft}
                >
                  <View style={styles.paymentIcon}>
                    <Ionicons
                      name="cash-outline"
                      size={20}
                      color="#D71920"
                    />
                  </View>

                  <View
                    style={styles.paymentToggleInfo}
                  >
                    <Text
                      style={styles.paymentToggleTitle}
                    >
                      Cash
                    </Text>

                    <Text
                      style={
                        styles.paymentToggleDescription
                      }
                    >
                      Allow customers to pay with cash.
                    </Text>
                  </View>
                </View>

                <Switch
                  value={acceptsCash}
                  onValueChange={setAcceptsCash}
                  trackColor={{
                    false: "#D1D5DB",
                    true: "#F5A3A6",
                  }}
                  thumbColor={
                    acceptsCash
                      ? "#D71920"
                      : "#F9FAFB"
                  }
                />
              </View>

              <View
                style={[
                  styles.paymentToggleRow,
                  styles.paymentToggleBorder,
                ]}
              >
                <View
                  style={styles.paymentToggleLeft}
                >
                  <View style={styles.paymentIcon}>
                    <Ionicons
                      name="card-outline"
                      size={20}
                      color="#D71920"
                    />
                  </View>

                  <View
                    style={styles.paymentToggleInfo}
                  >
                    <Text
                      style={styles.paymentToggleTitle}
                    >
                      Card
                    </Text>

                    <Text
                      style={
                        styles.paymentToggleDescription
                      }
                    >
                      Allow customers to pay by card.
                    </Text>
                  </View>
                </View>

                <Switch
                  value={acceptsCard}
                  onValueChange={setAcceptsCard}
                  trackColor={{
                    false: "#D1D5DB",
                    true: "#F5A3A6",
                  }}
                  thumbColor={
                    acceptsCard
                      ? "#D71920"
                      : "#F9FAFB"
                  }
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons
                  name="storefront-outline"
                  size={19}
                  color="#D71920"
                />
              </View>

              <View>
                <Text style={styles.sectionTitle}>
                  Restaurant Availability
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Control whether customers can place
                  orders
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.availabilityRow}>
                <View style={styles.availabilityLeft}>
                  <View
                    style={[
                      styles.availabilityIcon,
                      {
                        backgroundColor: isOpen
                          ? "#DCFCE7"
                          : "#F3F4F6",
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        isOpen
                          ? "checkmark-circle"
                          : "close-circle"
                      }
                      size={22}
                      color={
                        isOpen
                          ? "#16A34A"
                          : "#6B7280"
                      }
                    />
                  </View>

                  <View
                    style={styles.availabilityInfo}
                  >
                    <Text
                      style={
                        styles.availabilityTitle
                      }
                    >
                      {isOpen
                        ? "Restaurant is Open"
                        : "Restaurant is Closed"}
                    </Text>

                    <Text
                      style={
                        styles.availabilityDescription
                      }
                    >
                      {isOpen
                        ? "Customers can currently place orders."
                        : "Customers cannot place new orders while your restaurant is closed."}
                    </Text>
                  </View>
                </View>

                <Switch
                  value={isOpen}
                  onValueChange={setIsOpen}
                  trackColor={{
                    false: "#D1D5DB",
                    true: "#F5A3A6",
                  }}
                  thumbColor={
                    isOpen
                      ? "#D71920"
                      : "#F9FAFB"
                  }
                />
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Ionicons
              name="information-circle-outline"
              size={21}
              color="#2563EB"
            />

            <Text style={styles.infoText}>
              Your restaurant status is controlled by
              administration. The Open/Closed switch
              above only controls whether your restaurant
              is currently accepting customer orders.
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.saveButton,
              saving && styles.saveButtonDisabled,
            ]}
            onPress={saveSettings}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <Ionicons
                name="checkmark-circle-outline"
                size={21}
                color="#FFFFFF"
              />
            )}

            <Text style={styles.saveButtonText}>
              {saving
                ? "Saving..."
                : "Save Settings"}
            </Text>
          </TouchableOpacity>

          <View style={styles.bottomSpace} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  container: {
    flex: 1,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 13,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
  },

  headerSpacer: {
    width: 42,
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 17,
  },

  restaurantStatusCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 17,
    borderWidth: 1,
    marginBottom: 22,
  },

  restaurantStatusIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  restaurantStatusInfo: {
    marginLeft: 11,
  },

  restaurantStatusTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
  },

  restaurantStatusValue: {
    marginTop: 3,
    fontSize: 16,
    fontWeight: "800",
  },

  section: {
    marginBottom: 22,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  sectionSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: "#9CA3AF",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 19,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  label: {
    marginBottom: 7,
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },

  input: {
    minHeight: 47,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 13,
    paddingHorizontal: 13,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#FFFFFF",
    marginBottom: 13,
  },

  multilineInput: {
    minHeight: 90,
    paddingTop: 12,
  },

  locationButton: {
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: "#D71920",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  locationButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  coordinatesCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    padding: 13,
    borderRadius: 13,
    backgroundColor: "#F8FAFC",
  },

  coordinateItem: {
    flex: 1,
  },

  coordinateDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 12,
  },

  coordinateLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
  },

  coordinateValue: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },

  locationHint: {
    marginTop: 10,
    fontSize: 11,
    lineHeight: 17,
    color: "#6B7280",
  },

  timeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },

  timeInputContainer: {
    flex: 1,
  },

  timeArrow: {
    width: 35,
    alignItems: "center",
    paddingBottom: 27,
  },

  timeHint: {
    marginTop: -3,
    fontSize: 11,
    color: "#9CA3AF",
  },

  paymentToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  paymentToggleBorder: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },

  paymentToggleLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10,
  },

  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },

  paymentToggleInfo: {
    flex: 1,
    marginLeft: 10,
  },

  paymentToggleTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  paymentToggleDescription: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 16,
    color: "#6B7280",
  },

  paymentFields: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },

  providerRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 13,
  },

  providerButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  providerButtonActive: {
    backgroundColor: "#D71920",
    borderColor: "#D71920",
  },

  providerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
  },

  providerTextActive: {
    color: "#FFFFFF",
  },

  availabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  availabilityLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10,
  },

  availabilityIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  availabilityInfo: {
    flex: 1,
    marginLeft: 11,
  },

  availabilityTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  availabilityDescription: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
    color: "#6B7280",
  },

  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    gap: 9,
  },

  infoText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: "#1E40AF",
  },

  saveButton: {
    minHeight: 52,
    marginTop: 18,
    borderRadius: 15,
    backgroundColor: "#D71920",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  saveButtonDisabled: {
    opacity: 0.7,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  bottomSpace: {
    height: 35,
  },
});