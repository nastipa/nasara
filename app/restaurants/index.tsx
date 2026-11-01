// 🟡 =========================================================
// 🟡 NASARA RESTAURANTS
// 🟡 PREMIUM RESTAURANT DISCOVERY SCREEN
// 🟡 NAVY • GOLD • WHITE
// 🟡 =========================================================

import {
  useCallback,
  useState,
} from "react";

import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  Ionicons,
} from "@expo/vector-icons";

import * as Location from "expo-location";

import {
  useFocusEffect,
  useRouter,
} from "expo-router";

import {
  supabase,
} from "../../lib/supabase";

// 🟡 =========================================================
// 🟡 CONFIGURATION
// 🟡 =========================================================

const RESTAURANT_API =
  "https://nasara-upload-server.onrender.com/restaurant";

const COLORS = {
  navy: "#101B35",
  navyLight: "#1C2B4D",
  gold: "#D9AD55",
  goldLight: "#FFF5DF",
  white: "#FFFFFF",
  background: "#F5F6F9",
  text: "#172033",
  muted: "#7B8495",
  border: "#E9ECF2",
  green: "#159B62",
  red: "#D94B4B",
};

// 🟡 =========================================================
// 🟡 TYPES
// 🟡 =========================================================

type RestaurantStatus =
  | "active"
  | "suspended"
  | "closed";

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
  status: RestaurantStatus;

  momo_provider: string | null;
  momo_number: string | null;
  momo_account_name: string | null;

  accepts_momo: boolean;
  accepts_cash: boolean;
  accepts_card: boolean;

  distance_km: number | null;
};

// 🟡 =========================================================
// 🟡 MESSAGE HELPER
// 🟡 =========================================================

function showMessage(
  title: string,
  message?: string
) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.alert(
        message
          ? `${title}\n\n${message}`
          : title
      );
    }

    return;
  }

  console.log(
    message
      ? `${title}: ${message}`
      : title
  );
}

// 🟡 =========================================================
// 🟡 NORMALIZE RESTAURANT STATUS
// 🟡 =========================================================

function normalizeRestaurantStatus(
  status: any
): RestaurantStatus {
  if (
    status === "active" ||
    status === "suspended" ||
    status === "closed"
  ) {
    return status;
  }

  if (
    status === "approved" ||
    status === "pending" ||
    status === "rejected"
  ) {
    return "active";
  }

  return "active";
}

// 🟡 =========================================================
// 🟡 NORMALIZE RESTAURANT DATA
// 🟡 =========================================================

function normalizeRestaurant(
  restaurant: any
): Restaurant {
  return {
    ...restaurant,

    status:
      normalizeRestaurantStatus(
        restaurant?.status
      ),

    is_open:
      restaurant?.is_open === true,

    latitude:
      restaurant?.latitude !== null &&
      restaurant?.latitude !== undefined
        ? Number(restaurant.latitude)
        : null,

    longitude:
      restaurant?.longitude !== null &&
      restaurant?.longitude !== undefined
        ? Number(restaurant.longitude)
        : null,

    distance_km:
      restaurant?.distance_km !== null &&
      restaurant?.distance_km !== undefined &&
      Number.isFinite(
        Number(restaurant.distance_km)
      )
        ? Number(restaurant.distance_km)
        : null,

    accepts_momo:
      restaurant?.accepts_momo === true,

    accepts_cash:
      restaurant?.accepts_cash === true,

    accepts_card:
      restaurant?.accepts_card === true,
  };
}

// 🟡 =========================================================
// 🟡 MAIN SCREEN
// 🟡 =========================================================

export default function RestaurantsScreen() {
  const router = useRouter();

  const [
    restaurants,
    setRestaurants,
  ] = useState<Restaurant[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    findingNearby,
    setFindingNearby,
  ] = useState(false);

  const [
    showingAll,
    setShowingAll,
  ] = useState(true);

  // 🟡 =======================================================
  // 🟡 LOAD ALL ACTIVE RESTAURANTS
  // 🟡 =======================================================

  const loadAllRestaurants =
    useCallback(async () => {
      const {
        data,
        error,
      } = await supabase
        .from("restaurants")
        .select(`
          id,
          owner_id,
          name,
          description,
          phone,
          whatsapp_phone,
          address,
          latitude,
          longitude,
          logo_url,
          cover_image_url,
          opening_time,
          closing_time,
          is_open,
          status,
          momo_provider,
          momo_number,
          momo_account_name,
          accepts_momo,
          accepts_cash,
          accepts_card
        `)
        .eq("status", "active")
        .order("name", {
          ascending: true,
        });

      if (error) {
        throw error;
      }

      const allRestaurants: Restaurant[] =
        (data || []).map(
          (restaurant: any) =>
            normalizeRestaurant({
              ...restaurant,
              distance_km: null,
            })
        );

      setRestaurants(allRestaurants);
      setShowingAll(true);

      console.log(
        "ACTIVE RESTAURANTS:",
        allRestaurants.length
      );

      return allRestaurants;
    }, []);

  // 🟡 =======================================================
  // 🟡 LOAD NEARBY RESTAURANTS
  // 🟡 =======================================================

  const loadNearbyRestaurants =
    useCallback(
      async (
        location: {
          latitude: number;
          longitude: number;
        }
      ) => {
        const url =
          `${RESTAURANT_API}/nearby-restaurants` +
          `?latitude=${encodeURIComponent(
            location.latitude
          )}` +
          `&longitude=${encodeURIComponent(
            location.longitude
          )}`;

        console.log(
          "NEARBY RESTAURANTS URL:",
          url
        );

        const response =
          await fetch(url);

        if (!response.ok) {
          throw new Error(
            `Restaurant server returned ${response.status}`
          );
        }

        const json =
          await response.json();

        if (!json?.success) {
          throw new Error(
            json?.error ||
              "Unable to find nearby restaurants."
          );
        }

        const nearbyRestaurants =
          Array.isArray(json?.restaurants)
            ? json.restaurants
                .map(
                  (restaurant: any) =>
                    normalizeRestaurant(restaurant)
                )
                .filter(
                  (restaurant: Restaurant) =>
                    restaurant.status === "active"
                )
            : [];

        setRestaurants(nearbyRestaurants);
        setShowingAll(false);

        console.log(
          "NEARBY ACTIVE RESTAURANTS:",
          nearbyRestaurants.length
        );

        return nearbyRestaurants;
      },
      []
    );

  // 🟡 =======================================================
  // 🟡 LOAD RESTAURANTS
  // 🟡 =======================================================

  const loadRestaurants =
    useCallback(
      async (
        location?: {
          latitude: number;
          longitude: number;
        }
      ) => {
        try {
          if (!location) {
            setLoading(true);
          }

          if (location) {
            await loadNearbyRestaurants(location);
            return;
          }

          await loadAllRestaurants();

        } catch (error: any) {
          console.error(
            "LOAD RESTAURANTS ERROR:",
            error
          );

          showMessage(
            "Restaurants",
            error?.message ||
              "Unable to load restaurants."
          );

        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        loadAllRestaurants,
        loadNearbyRestaurants,
      ]
    );

  // 🟡 =======================================================
  // 🟡 GET CUSTOMER LOCATION
  // 🟡 =======================================================

  const getCustomerLocation =
    useCallback(async () => {
      try {
        const {
          status,
        } =
          await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          showMessage(
            "Location Required",
            "Please allow location access to find restaurants near you."
          );

          return null;
        }

        const position =
          await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest,
          });

        const latitude =
          position.coords.latitude;

        const longitude =
          position.coords.longitude;

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {
          throw new Error(
            "Your current location could not be determined."
          );
        }

        return {
          latitude,
          longitude,
        };

      } catch (error: any) {
        console.error(
          "CUSTOMER LOCATION ERROR:",
          error
        );

        showMessage(
          "Location Error",
          error?.message ||
            "Unable to get your current location."
        );

        return null;
      }
    }, []);

  // 🟡 =======================================================
  // 🟡 FIND NEARBY
  // 🟡 =======================================================

  const handleFindNearby =
    useCallback(async () => {
      if (findingNearby) {
        return;
      }

      try {
        setFindingNearby(true);

        const location =
          await getCustomerLocation();

        if (!location) {
          return;
        }

        await loadRestaurants(location);

      } finally {
        setFindingNearby(false);
      }
    }, [
      findingNearby,
      getCustomerLocation,
      loadRestaurants,
    ]);

  // 🟡 =======================================================
  // 🟡 SHOW ALL
  // 🟡 =======================================================

  const handleShowAll =
    useCallback(async () => {
      try {
        setLoading(true);

        await loadAllRestaurants();

      } catch (error: any) {
        console.error(
          "SHOW ALL RESTAURANTS ERROR:",
          error
        );

        showMessage(
          "Restaurants",
          error?.message ||
            "Unable to load restaurants."
        );

      } finally {
        setLoading(false);
      }
    }, [
      loadAllRestaurants,
    ]);

  // 🟡 =======================================================
  // 🟡 INITIAL LOAD / SCREEN FOCUS
  // 🟡 =======================================================

  useFocusEffect(
    useCallback(() => {
      loadAllRestaurants()
        .catch((error: any) => {
          console.error(
            "INITIAL RESTAURANT LOAD ERROR:",
            error
          );

          showMessage(
            "Restaurants",
            error?.message ||
              "Unable to load restaurants."
          );
        })
        .finally(() => {
          setLoading(false);
        });
    }, [
      loadAllRestaurants,
    ])
  );

  // 🟡 =======================================================
  // 🟡 REFRESH
  // 🟡 =======================================================

  const handleRefresh =
    useCallback(async () => {
      if (refreshing) {
        return;
      }

      setRefreshing(true);

      try {
        if (!showingAll) {
          const location =
            await getCustomerLocation();

          if (location) {
            await loadNearbyRestaurants(location);
          }

          return;
        }

        await loadAllRestaurants();

      } catch (error: any) {
        console.error(
          "REFRESH RESTAURANTS ERROR:",
          error
        );

        showMessage(
          "Restaurants",
          error?.message ||
            "Unable to refresh restaurants."
        );

      } finally {
        setRefreshing(false);
      }
    }, [
      refreshing,
      showingAll,
      getCustomerLocation,
      loadNearbyRestaurants,
      loadAllRestaurants,
    ]);

  // 🟡 =======================================================
  // 🟡 OPEN RESTAURANT
  // 🟡 =======================================================

  const openRestaurant =
    useCallback(
      (restaurantId: string) => {
        router.push({
          pathname: "/restaurants/[restaurantId]",
          params: {
            restaurantId,
          },
        });
      },
      [router]
    );

  // 🟡 =======================================================
  // 🟡 OPEN CUSTOMER ORDERS
  // 🟡 =======================================================

  const openOrders =
    useCallback(() => {
      router.push("/restaurants/orders");
    }, [router]);

  // 🟡 =======================================================
  // 🟡 OPEN DIRECTIONS
  // 🟡 =======================================================

  const openDirections =
    useCallback(
      async (restaurant: Restaurant) => {
        if (
          restaurant.latitude === null ||
          restaurant.longitude === null ||
          !Number.isFinite(Number(restaurant.latitude)) ||
          !Number.isFinite(Number(restaurant.longitude))
        ) {
          showMessage(
            "Directions",
            "This restaurant has not added its GPS location yet."
          );

          return;
        }

        const latitude =
          Number(restaurant.latitude);

        const longitude =
          Number(restaurant.longitude);

        const label =
          encodeURIComponent(restaurant.name);

        let url = "";

        if (Platform.OS === "ios") {
          url =
            `http://maps.apple.com/?daddr=` +
            `${latitude},${longitude}` +
            `&dirflg=d`;
        } else {
          url =
            `https://www.google.com/maps/dir/?api=1` +
            `&destination=${latitude},${longitude}` +
            `&travelmode=driving` +
            `&destination_place_id=${label}`;
        }

        try {
          if (Platform.OS === "web") {
            if (typeof window !== "undefined") {
              window.open(url, "_blank");
            }

            return;
          }

          const supported =
            await Linking.canOpenURL(url);

          if (!supported) {
            throw new Error(
              "Maps could not be opened on this device."
            );
          }

          await Linking.openURL(url);

        } catch (error: any) {
          console.error(
            "DIRECTIONS ERROR:",
            error
          );

          showMessage(
            "Directions",
            error?.message ||
              "Unable to open directions."
          );
        }
      },
      []
    );

  // 🟡 =======================================================
  // 🟡 LOADING SCREEN
  // 🟡 =======================================================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingLogo}>
          <Ionicons
            name="restaurant"
            size={34}
            color={COLORS.gold}
          />
        </View>

        <ActivityIndicator
          size="large"
          color={COLORS.gold}
        />

        <Text style={styles.loadingTitle}>
          Discovering Restaurants
        </Text>

        <Text style={styles.loadingText}>
          Preparing your food discovery experience...
        </Text>
      </View>
    );
  }

  // 🟡 =======================================================
  // 🟡 MAIN USER INTERFACE
  // 🟡 =======================================================

  return (
    <View style={styles.container}>

      {/* 🟡 PREMIUM HEADER */}

      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Ionicons
                name="restaurant"
                size={23}
                color={COLORS.gold}
              />
            </View>

            <View>
              <Text style={styles.brandName}>
                NASARA
              </Text>

              <Text style={styles.brandCaption}>
                FOOD & RESTAURANTS
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.ordersButton}
            onPress={openOrders}
            activeOpacity={0.85}
          >
            <Ionicons
              name="receipt-outline"
              size={20}
              color={COLORS.navy}
            />

            <Text style={styles.ordersButtonText}>
              My Orders
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.headerTitle}>
          Discover great food.
        </Text>

        <Text style={styles.headerSubtitle}>
          Explore restaurants, find nearby meals and discover places to eat.
        </Text>

        <View style={styles.headerBottom}>
          <View style={styles.headerFeature}>
            <Ionicons
              name="location"
              size={15}
              color={COLORS.gold}
            />

            <Text style={styles.headerFeatureText}>
              Find restaurants near you
            </Text>
          </View>

          <View style={styles.headerFeature}>
            <Ionicons
              name="restaurant-outline"
              size={15}
              color={COLORS.gold}
            />

            <Text style={styles.headerFeatureText}>
              Explore local food
            </Text>
          </View>
        </View>
      </View>

      {/* 🟡 DISCOVERY CONTROLS */}

      <View style={styles.discoverySection}>
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>
              Explore Restaurants
            </Text>

            <Text style={styles.sectionSubtitle}>
              Choose how you want to discover
            </Text>
          </View>

          <View style={styles.restaurantCount}>
            <Ionicons
              name="restaurant-outline"
              size={15}
              color={COLORS.gold}
            />

            <Text style={styles.restaurantCountText}>
              {restaurants.length}
            </Text>
          </View>
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[
              styles.nearbyButton,
              findingNearby && styles.disabledButton,
            ]}
            onPress={handleFindNearby}
            disabled={findingNearby}
            activeOpacity={0.85}
          >
            {findingNearby ? (
              <ActivityIndicator
                size="small"
                color={COLORS.white}
              />
            ) : (
              <Ionicons
                name="navigate"
                size={19}
                color={COLORS.navy}
              />
            )}

            <Text style={styles.nearbyButtonText}>
              {findingNearby
                ? "Finding..."
                : "Find Nearby"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.allButton,
              showingAll && styles.allButtonActive,
            ]}
            onPress={handleShowAll}
            activeOpacity={0.85}
          >
            <Ionicons
              name="grid-outline"
              size={19}
              color={
                showingAll
                  ? COLORS.gold
                  : COLORS.navy
              }
            />

            <Text
              style={[
                styles.allButtonText,
                showingAll && styles.allButtonTextActive,
              ]}
            >
              All Restaurants
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.resultDescription}>
          <Ionicons
            name={showingAll ? "compass-outline" : "location-outline"}
            size={16}
            color={COLORS.muted}
          />

          <Text style={styles.resultDescriptionText}>
            {showingAll
              ? "Showing all available restaurants"
              : "Showing restaurants near your location"}
          </Text>
        </View>
      </View>

      {/* 🟡 RESTAURANT LIST */}

      <ScrollView
        contentContainerStyle={
          restaurants.length === 0
            ? styles.emptyContent
            : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.gold}
            colors={[COLORS.navy, COLORS.gold]}
          />
        }
        showsVerticalScrollIndicator={false}
      >

        {/* 🟡 EMPTY STATE */}

        {restaurants.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="restaurant-outline"
                size={48}
                color={COLORS.gold}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No Restaurants Found
            </Text>

            <Text style={styles.emptyText}>
              We couldn't find any available restaurants here.
              Try searching nearby or explore all restaurants.
            </Text>

            <TouchableOpacity
              style={styles.emptyButton}
              onPress={handleFindNearby}
              activeOpacity={0.85}
            >
              <Ionicons
                name="location"
                size={19}
                color={COLORS.navy}
              />

              <Text style={styles.emptyButtonText}>
                Find Nearby Restaurants
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.emptySecondaryButton}
              onPress={handleShowAll}
            >
              <Text style={styles.emptySecondaryText}>
                View All Restaurants
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          restaurants.map((restaurant, index) => {
            const isNearest =
              !showingAll &&
              index === 0 &&
              restaurant.distance_km !== null;

            return (
              <TouchableOpacity
                key={restaurant.id}
                style={styles.restaurantCard}
                onPress={() =>
                  openRestaurant(restaurant.id)
                }
                activeOpacity={0.94}
              >

                {/* 🟡 RESTAURANT COVER */}

                <View style={styles.coverContainer}>
                  {restaurant.cover_image_url ? (
                    <Image
                      source={{
                        uri: restaurant.cover_image_url,
                      }}
                      style={styles.coverImage}
                    />
                  ) : (
                    <View style={styles.coverPlaceholder}>
                      <Ionicons
                        name="restaurant"
                        size={45}
                        color="#A8AFBC"
                      />

                      <Text style={styles.coverPlaceholderText}>
                        Restaurant
                      </Text>
                    </View>
                  )}

                  <View style={styles.coverOverlay} />

                  {/* OPEN STATUS */}

                  <View
                    style={[
                      styles.statusBadge,
                      restaurant.is_open
                        ? styles.openBadge
                        : styles.closedBadge,
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        restaurant.is_open
                          ? styles.openDot
                          : styles.closedDot,
                      ]}
                    />

                    <Text
                      style={[
                        styles.statusText,
                        restaurant.is_open
                          ? styles.openText
                          : styles.closedText,
                      ]}
                    >
                      {restaurant.is_open ? "OPEN NOW" : "CLOSED"}
                    </Text>
                  </View>

                  {/* NEAREST BADGE */}

                  {isNearest && (
                    <View style={styles.nearestBadge}>
                      <Ionicons
                        name="location"
                        size={14}
                        color={COLORS.navy}
                      />

                      <Text style={styles.nearestText}>
                        NEAREST
                      </Text>
                    </View>
                  )}

                  {/* COVER NAME */}

                  <View style={styles.coverBottom}>
                    <Text
                      style={styles.coverRestaurantName}
                      numberOfLines={1}
                    >
                      {restaurant.name}
                    </Text>

                    <View style={styles.coverAddress}>
                      <Ionicons
                        name="location-outline"
                        size={14}
                        color={COLORS.white}
                      />

                      <Text
                        style={styles.coverAddressText}
                        numberOfLines={1}
                      >
                        {restaurant.address}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 🟡 RESTAURANT DETAILS */}

                <View style={styles.restaurantContent}>

                  <View style={styles.restaurantTopRow}>
                    {restaurant.logo_url ? (
                      <Image
                        source={{
                          uri: restaurant.logo_url,
                        }}
                        style={styles.logo}
                      />
                    ) : (
                      <View style={styles.logoPlaceholder}>
                        <Ionicons
                          name="restaurant"
                          size={25}
                          color={COLORS.gold}
                        />
                      </View>
                    )}

                    <View style={styles.nameContainer}>
                      <Text
                        style={styles.restaurantName}
                        numberOfLines={1}
                      >
                        {restaurant.name}
                      </Text>

                      <View style={styles.addressRow}>
                        <Ionicons
                          name="location-outline"
                          size={14}
                          color={COLORS.muted}
                        />

                        <Text
                          style={styles.addressText}
                          numberOfLines={1}
                        >
                          {restaurant.address}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.viewArrow}>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={COLORS.navy}
                      />
                    </View>
                  </View>

                  {/* DESCRIPTION */}

                  {restaurant.description ? (
                    <Text
                      style={styles.description}
                      numberOfLines={2}
                    >
                      {restaurant.description}
                    </Text>
                  ) : null}

                  {/* 🟡 RESTAURANT INFORMATION */}

                  <View style={styles.infoRow}>
                    {restaurant.distance_km !== null && (
                      <View style={styles.infoItem}>
                        <View style={styles.infoIcon}>
                          <Ionicons
                            name="navigate-outline"
                            size={15}
                            color={COLORS.gold}
                          />
                        </View>

                        <Text style={styles.distanceText}>
                          {Number(
                            restaurant.distance_km
                          ).toFixed(2)} km away
                        </Text>
                      </View>
                    )}

                    {restaurant.opening_time &&
                      restaurant.closing_time && (
                        <View style={styles.infoItem}>
                          <View style={styles.infoIcon}>
                            <Ionicons
                              name="time-outline"
                              size={15}
                              color={COLORS.gold}
                            />
                          </View>

                          <Text style={styles.timeText}>
                            {restaurant.opening_time}
                            {" - "}
                            {restaurant.closing_time}
                          </Text>
                        </View>
                      )}
                  </View>

                  {/* 🟡 PAYMENT METHODS */}

                  <View style={styles.paymentSection}>
                    <Text style={styles.paymentHeading}>
                      PAYMENT OPTIONS
                    </Text>

                    <View style={styles.paymentRow}>
                      {restaurant.accepts_momo && (
                        <View style={styles.paymentBadge}>
                          <Ionicons
                            name="phone-portrait-outline"
                            size={13}
                            color={COLORS.navy}
                          />

                          <Text style={styles.paymentBadgeText}>
                            MoMo
                          </Text>
                        </View>
                      )}

                      {restaurant.accepts_cash && (
                        <View style={styles.paymentBadge}>
                          <Ionicons
                            name="cash-outline"
                            size={13}
                            color={COLORS.navy}
                          />

                          <Text style={styles.paymentBadgeText}>
                            Cash
                          </Text>
                        </View>
                      )}

                      {restaurant.accepts_card && (
                        <View style={styles.paymentBadge}>
                          <Ionicons
                            name="card-outline"
                            size={13}
                            color={COLORS.navy}
                          />

                          <Text style={styles.paymentBadgeText}>
                            Card
                          </Text>
                        </View>
                      )}

                      {!restaurant.accepts_momo &&
                        !restaurant.accepts_cash &&
                        !restaurant.accepts_card && (
                          <Text style={styles.noPaymentText}>
                            Contact restaurant for payment options
                          </Text>
                        )}
                    </View>
                  </View>

                  {/* 🟡 BOTTOM ACTIONS */}

                  <View style={styles.bottomRow}>
                    <TouchableOpacity
                      style={styles.viewRestaurantButton}
                      onPress={() =>
                        openRestaurant(restaurant.id)
                      }
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name="restaurant-outline"
                        size={17}
                        color={COLORS.gold}
                      />

                      <Text style={styles.viewRestaurantText}>
                        View Restaurant
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.directionButton}
                      onPress={(event) => {
                        event.stopPropagation();
                        openDirections(restaurant);
                      }}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name="navigate"
                        size={17}
                        color={COLORS.navy}
                      />

                      <Text style={styles.directionText}>
                        Directions
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* 🟡 FOOTER */}

        {restaurants.length > 0 && (
          <View style={styles.footer}>
            <Ionicons
              name="shield-checkmark-outline"
              size={17}
              color={COLORS.gold}
            />

            <Text style={styles.footerText}>
              Discover restaurants with Nasara
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// 🟡 =========================================================
// 🟡 PREMIUM NASARA STYLES
// 🟡 =========================================================

const styles = StyleSheet.create({

  // 🔵 GENERAL

  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.navy,
    padding: 25,
  },

  loadingLogo: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: COLORS.navyLight,
    borderWidth: 1,
    borderColor: "rgba(217,173,85,0.4)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 25,
  },

  loadingTitle: {
    marginTop: 18,
    fontSize: 19,
    fontWeight: "900",
    color: COLORS.white,
  },

  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: "#B9C1D0",
    textAlign: "center",
  },

  // 🔵 HEADER

  header: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 18 : 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },

  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  brandIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: COLORS.navyLight,
    borderWidth: 1,
    borderColor: "rgba(217,173,85,0.45)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  brandName: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 2,
  },

  brandCaption: {
    color: COLORS.gold,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.6,
    marginTop: 3,
  },

  ordersButton: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  ordersButtonText: {
    color: COLORS.navy,
    fontSize: 12,
    fontWeight: "900",
  },

  headerTitle: {
    color: COLORS.white,
    fontSize: 27,
    fontWeight: "900",
    marginTop: 25,
    letterSpacing: -0.7,
  },

  headerSubtitle: {
    color: "#C5CCDA",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
    maxWidth: 330,
  },

  headerBottom: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 20,
  },

  headerFeature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  headerFeatureText: {
    color: "#E0E4EC",
    fontSize: 11,
    fontWeight: "600",
  },

  // 🔵 DISCOVERY SECTION

  discoverySection: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 18,
    paddingTop: 19,
    paddingBottom: 15,
    marginBottom: 5,
  },

  sectionHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 17,
    color: COLORS.text,
    fontWeight: "900",
  },

  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 4,
  },

  restaurantCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.goldLight,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 20,
  },

  restaurantCountText: {
    color: COLORS.navy,
    fontWeight: "900",
    fontSize: 13,
  },

  actionContainer: {
    flexDirection: "row",
    gap: 10,
  },

  nearbyButton: {
    flex: 1,
    minHeight: 49,
    backgroundColor: COLORS.gold,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  disabledButton: {
    opacity: 0.7,
  },

  nearbyButtonText: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: "900",
  },

  allButton: {
    flex: 1,
    minHeight: 49,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  allButtonActive: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },

  allButtonText: {
    color: COLORS.navy,
    fontSize: 12,
    fontWeight: "800",
  },

  allButtonTextActive: {
    color: COLORS.white,
  },

  resultDescription: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 13,
  },

  resultDescriptionText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "600",
  },

  // 🔵 LIST

  listContent: {
    padding: 15,
    paddingTop: 12,
    paddingBottom: 35,
  },

  emptyContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 25,
  },

  // 🔵 RESTAURANT CARD

  restaurantCard: {
    backgroundColor: COLORS.white,
    borderRadius: 19,
    marginBottom: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 3,
    shadowColor: "#15213B",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  // 🔵 COVER

  coverContainer: {
    width: "100%",
    height: 205,
    position: "relative",
    backgroundColor: "#E8EBF0",
  },

  coverImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  coverPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E9ECF2",
  },

  coverPlaceholderText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8,
  },

  coverOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 110,
    backgroundColor: "rgba(10,20,40,0.52)",
  },

  statusBadge: {
    position: "absolute",
    top: 13,
    right: 13,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.white,
  },

  openBadge: {
    backgroundColor: "#E8FFF4",
  },

  closedBadge: {
    backgroundColor: "#F1F2F5",
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  openDot: {
    backgroundColor: COLORS.green,
  },

  closedDot: {
    backgroundColor: "#8C929D",
  },

  statusText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  openText: {
    color: COLORS.green,
  },

  closedText: {
    color: "#737B89",
  },

  nearestBadge: {
    position: "absolute",
    bottom: 57,
    left: 13,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  nearestText: {
    color: COLORS.navy,
    fontSize: 10,
    fontWeight: "900",
  },

  coverBottom: {
    position: "absolute",
    left: 15,
    right: 15,
    bottom: 13,
  },

  coverRestaurantName: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "900",
  },

  coverAddress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
  },

  coverAddressText: {
    color: COLORS.white,
    fontSize: 11,
    flex: 1,
    fontWeight: "600",
  },

  // 🔵 RESTAURANT CONTENT

  restaurantContent: {
    padding: 15,
  },

  restaurantTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  logo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#F1F2F5",
  },

  logoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.goldLight,
    alignItems: "center",
    justifyContent: "center",
  },

  nameContainer: {
    flex: 1,
    marginLeft: 11,
    minWidth: 0,
  },

  restaurantName: {
    fontSize: 17,
    fontWeight: "900",
    color: COLORS.text,
  },

  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    gap: 4,
  },

  addressText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.muted,
  },

  viewArrow: {
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: "#F1F3F7",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 7,
  },

  description: {
    marginTop: 13,
    fontSize: 12,
    lineHeight: 19,
    color: "#687184",
  },

  // 🔵 RESTAURANT INFORMATION

  infoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 14,
    gap: 12,
  },

  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  infoIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor: COLORS.goldLight,
    alignItems: "center",
    justifyContent: "center",
  },

  distanceText: {
    color: COLORS.navy,
    fontSize: 11,
    fontWeight: "800",
  },

  timeText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "600",
  },

  // 🔵 PAYMENT OPTIONS

  paymentSection: {
    marginTop: 16,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  paymentHeading: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 9,
  },

  paymentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    alignItems: "center",
  },

  paymentBadge: {
    backgroundColor: "#F2F4F8",
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  paymentBadgeText: {
    fontSize: 10,
    color: COLORS.navy,
    fontWeight: "800",
  },

  noPaymentText: {
    fontSize: 10,
    color: COLORS.muted,
  },

  // 🔵 BOTTOM ACTIONS

  bottomRow: {
    marginTop: 15,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  viewRestaurantButton: {
    flex: 1,
    minHeight: 43,
    backgroundColor: COLORS.navy,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },

  viewRestaurantText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "900",
  },

  directionButton: {
    minHeight: 43,
    paddingHorizontal: 12,
    backgroundColor: COLORS.goldLight,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  directionText: {
    color: COLORS.navy,
    fontSize: 11,
    fontWeight: "900",
  },

  // 🔵 EMPTY STATE

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 32,
    backgroundColor: COLORS.navy,
    borderWidth: 1,
    borderColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  emptyTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: COLORS.text,
    textAlign: "center",
  },

  emptyText: {
    marginTop: 9,
    fontSize: 13,
    lineHeight: 21,
    color: COLORS.muted,
    textAlign: "center",
    maxWidth: 330,
  },

  emptyButton: {
    marginTop: 22,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 19,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  emptyButtonText: {
    color: COLORS.navy,
    fontSize: 12,
    fontWeight: "900",
  },

  emptySecondaryButton: {
    marginTop: 14,
    padding: 10,
  },

  emptySecondaryText: {
    color: COLORS.navy,
    fontSize: 12,
    fontWeight: "800",
  },

  // 🔵 FOOTER

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 18,
  },

  footerText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "700",
  },

});