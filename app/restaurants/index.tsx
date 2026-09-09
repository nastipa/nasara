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

/* =========================================================
   CONFIG
========================================================= */

const RESTAURANT_API =
  "https://nasara-upload-server.onrender.com/restaurant";

/* =========================================================
   TYPES
========================================================= */

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

/* =========================================================
   MESSAGE HELPER
========================================================= */

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

/* =========================================================
   NORMALIZE RESTAURANT STATUS
========================================================= */

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

  /*
   * Older restaurants may still contain values such as
   * pending, approved, or rejected.
   *
   * They are treated as active here so they don't disappear
   * from the customer restaurant list after the old checker
   * was removed.
   */
  if (
    status === "approved" ||
    status === "pending" ||
    status === "rejected"
  ) {
    return "active";
  }

  return "active";
}

/* =========================================================
   NORMALIZE RESTAURANT DATA
========================================================= */

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

/* =========================================================
   SCREEN
========================================================= */

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

  /* =======================================================
     LOAD ALL ACTIVE RESTAURANTS
  ======================================================= */

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

      setRestaurants(
        allRestaurants
      );

      setShowingAll(true);

      console.log(
        "ACTIVE RESTAURANTS:",
        allRestaurants.length
      );

      return allRestaurants;
    }, []);

  /* =======================================================
     LOAD NEARBY RESTAURANTS
  ======================================================= */

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
          Array.isArray(
            json?.restaurants
          )
            ? json.restaurants
                .map(
                  (restaurant: any) =>
                    normalizeRestaurant(
                      restaurant
                    )
                )
                .filter(
                  (
                    restaurant: Restaurant
                  ) =>
                    restaurant.status ===
                    "active"
                )
            : [];

        setRestaurants(
          nearbyRestaurants
        );

        setShowingAll(false);

        console.log(
          "NEARBY ACTIVE RESTAURANTS:",
          nearbyRestaurants.length
        );

        return nearbyRestaurants;
      },
      []
    );

  /* =======================================================
     LOAD RESTAURANTS
  ======================================================= */

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
            await loadNearbyRestaurants(
              location
            );

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

  /* =======================================================
     GET CUSTOMER LOCATION
  ======================================================= */

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
          await Location.getCurrentPositionAsync(
            {
              accuracy:
                Location.Accuracy.Highest,
            }
          );

        const latitude =
          position.coords.latitude;

        const longitude =
          position.coords.longitude;

        if (
          !Number.isFinite(
            latitude
          ) ||
          !Number.isFinite(
            longitude
          )
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

  /* =======================================================
     FIND NEARBY
  ======================================================= */

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

        await loadRestaurants(
          location
        );

      } finally {
        setFindingNearby(false);
      }
    }, [
      findingNearby,
      getCustomerLocation,
      loadRestaurants,
    ]);

  /* =======================================================
     SHOW ALL
  ======================================================= */

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

  /* =======================================================
     INITIAL LOAD / SCREEN FOCUS
  ======================================================= */

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

  /* =======================================================
     REFRESH
  ======================================================= */

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
            await loadNearbyRestaurants(
              location
            );
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

  /* =======================================================
     OPEN RESTAURANT
  ======================================================= */

  const openRestaurant =
    useCallback(
      (restaurantId: string) => {
        router.push({
          pathname:
            "/restaurants/[restaurantId]",

          params: {
            restaurantId,
          },
        });
      },
      [router]
    );
  /* =======================================================
     OPEN CUSTOMER ORDERS
  ======================================================= */

  const openOrders =
    useCallback(() => {
      router.push(
        "/restaurants/orders"
      );
    }, [router]);

  /* =======================================================
     OPEN DIRECTIONS
  ======================================================= */

  const openDirections =
    useCallback(
      async (
        restaurant: Restaurant
      ) => {
        if (
          restaurant.latitude === null ||
          restaurant.longitude === null ||
          !Number.isFinite(
            Number(restaurant.latitude)
          ) ||
          !Number.isFinite(
            Number(restaurant.longitude)
          )
        ) {
          showMessage(
            "Directions",
            "This restaurant has not added its GPS location yet."
          );

          return;
        }

        const latitude =
          Number(
            restaurant.latitude
          );

        const longitude =
          Number(
            restaurant.longitude
          );

        const label =
          encodeURIComponent(
            restaurant.name
          );

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
            if (
              typeof window !==
              "undefined"
            ) {
              window.open(
                url,
                "_blank"
              );
            }

            return;
          }

          const supported =
            await Linking.canOpenURL(
              url
            );

          if (!supported) {
            throw new Error(
              "Maps could not be opened on this device."
            );
          }

          await Linking.openURL(
            url
          );

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

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
          color="#d71920"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading restaurants...
        </Text>
      </View>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <View
      style={styles.container}
    >

      {/* =================================================
          HEADER
      ================================================= */}

      <View
        style={styles.header}
      >

        <View
          style={styles.headerLeft}
        >
          <Text
            style={
              styles.headerTitle
            }
          >
            Restaurants
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }
          >
            Discover food near you
          </Text>
        </View>

        <TouchableOpacity
          style={
            styles.ordersButton
          }
          onPress={
            openOrders
          }
          activeOpacity={0.8}
        >
          <Ionicons
            name="receipt-outline"
            size={21}
            color="#ffffff"
          />

          <Text
            style={
              styles.ordersButtonText
            }
          >
            My Orders
          </Text>
        </TouchableOpacity>

      </View>

      {/* =================================================
          LOCATION BUTTONS
      ================================================= */}

      <View
        style={
          styles.actionContainer
        }
      >

        <TouchableOpacity
          style={[
            styles.nearbyButton,
            findingNearby &&
              styles.disabledButton,
          ]}
          onPress={
            handleFindNearby
          }
          disabled={
            findingNearby
          }
          activeOpacity={0.85}
        >
          {findingNearby ? (
            <ActivityIndicator
              size="small"
              color="#ffffff"
            />
          ) : (
            <Ionicons
              name="location"
              size={20}
              color="#ffffff"
            />
          )}

          <Text
            style={
              styles.nearbyButtonText
            }
          >
            {findingNearby
              ? "Finding nearby..."
              : "Find Nearby"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.allButton,
            showingAll &&
              styles.allButtonActive,
          ]}
          onPress={
            handleShowAll
          }
          activeOpacity={0.85}
        >
          <Ionicons
            name="grid-outline"
            size={19}
            color={
              showingAll
                ? "#ffffff"
                : "#d71920"
            }
          />

          <Text
            style={[
              styles.allButtonText,
              showingAll &&
                styles.allButtonTextActive,
            ]}
          >
            All Restaurants
          </Text>
        </TouchableOpacity>

      </View>

      {/* =================================================
          LIST
      ================================================= */}

      <ScrollView
        contentContainerStyle={
          restaurants.length === 0
            ? styles.emptyContent
            : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              handleRefresh
            }
          />
        }
        showsVerticalScrollIndicator={
          false
        }
      >

        {/* =================================================
            EMPTY
        ================================================= */}

        {restaurants.length === 0 ? (
          <View
            style={
              styles.emptyContainer
            }
          >

            <View
              style={
                styles.emptyIcon
              }
            >
              <Ionicons
                name="restaurant-outline"
                size={48}
                color="#d71920"
              />
            </View>

            <Text
              style={
                styles.emptyTitle
              }
            >
              No Restaurants Found
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              Try finding restaurants near
              your current location or view
              all available restaurants.
            </Text>

            <TouchableOpacity
              style={
                styles.emptyButton
              }
              onPress={
                handleFindNearby
              }
              activeOpacity={0.85}
            >
              <Ionicons
                name="location"
                size={19}
                color="#ffffff"
              />

              <Text
                style={
                  styles.emptyButtonText
                }
              >
                Find Nearby Restaurants
              </Text>
            </TouchableOpacity>

          </View>
        ) : (

          restaurants.map(
            (
              restaurant,
              index
            ) => {

              const isNearest =
                !showingAll &&
                index === 0 &&
                restaurant.distance_km !==
                  null;

              return (
                <TouchableOpacity
                  key={
                    restaurant.id
                  }
                  style={
                    styles.restaurantCard
                  }
                  onPress={() =>
                    openRestaurant(
                      restaurant.id
                    )
                  }
                  activeOpacity={0.92}
                >

                  {/* =================================================
                      COVER
                  ================================================= */}

                  <View
                    style={
                      styles.coverContainer
                    }
                  >

                    {restaurant.cover_image_url ? (
                      <Image
                        source={{
                          uri:
                            restaurant.cover_image_url,
                        }}
                        style={
                          styles.coverImage
                        }
                      />
                    ) : (
                      <View
                        style={
                          styles.coverPlaceholder
                        }
                      >
                        <Ionicons
                          name="restaurant"
                          size={40}
                          color="#999999"
                        />
                      </View>
                    )}

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
                        {restaurant.is_open
                          ? "Open"
                          : "Closed"}
                      </Text>
                    </View>

                    {/* NEAREST */}

                    {isNearest && (
                      <View
                        style={
                          styles.nearestBadge
                        }
                      >
                        <Ionicons
                          name="location"
                          size={14}
                          color="#ffffff"
                        />

                        <Text
                          style={
                            styles.nearestText
                          }
                        >
                          Nearest
                        </Text>
                      </View>
                    )}

                  </View>

                  {/* =================================================
                      CONTENT
                  ================================================= */}

                  <View
                    style={
                      styles.restaurantContent
                    }
                  >

                    <View
                      style={
                        styles.restaurantTopRow
                      }
                    >

                      {/* LOGO */}

                      {restaurant.logo_url ? (
                        <Image
                          source={{
                            uri:
                              restaurant.logo_url,
                          }}
                          style={
                            styles.logo
                          }
                        />
                      ) : (
                        <View
                          style={
                            styles.logoPlaceholder
                          }
                        >
                          <Ionicons
                            name="restaurant"
                            size={25}
                            color="#d71920"
                          />
                        </View>
                      )}

                      <View
                        style={
                          styles.nameContainer
                        }
                      >

                        <Text
                          style={
                            styles.restaurantName
                          }
                          numberOfLines={1}
                        >
                          {
                            restaurant.name
                          }
                        </Text>

                        <View
                          style={
                            styles.addressRow
                          }
                        >
                          <Ionicons
                            name="location-outline"
                            size={15}
                            color="#777777"
                          />

                          <Text
                            style={
                              styles.addressText
                            }
                            numberOfLines={1}
                          >
                            {
                              restaurant.address
                            }
                          </Text>
                        </View>

                      </View>

                    </View>

                    {/* DESCRIPTION */}

                    {restaurant.description ? (
                      <Text
                        style={
                          styles.description
                        }
                        numberOfLines={2}
                      >
                        {
                          restaurant.description
                        }
                      </Text>
                    ) : null}

                    {/* =================================================
                        DISTANCE
                    ================================================= */}

                    <View
                      style={
                        styles.infoRow
                      }
                    >

                      {restaurant.distance_km !==
                      null ? (
                        <View
                          style={
                            styles.infoItem
                          }
                        >
                          <Ionicons
                            name="navigate-outline"
                            size={17}
                            color="#d71920"
                          />

                          <Text
                            style={
                              styles.distanceText
                            }
                          >
                            {Number(
                              restaurant.distance_km
                            ).toFixed(2)}{" "}
                            km away
                          </Text>
                        </View>
                      ) : null}

                      {restaurant.opening_time &&
                      restaurant.closing_time ? (
                        <View
                          style={
                            styles.infoItem
                          }
                        >
                          <Ionicons
                            name="time-outline"
                            size={17}
                            color="#777777"
                          />

                          <Text
                            style={
                              styles.timeText
                            }
                          >
                            {
                              restaurant.opening_time
                            }{" "}
                            -{" "}
                            {
                              restaurant.closing_time
                            }
                          </Text>
                        </View>
                      ) : null}

                    </View>

                    {/* =================================================
                        BOTTOM ACTIONS
                    ================================================= */}

                    <View
                      style={
                        styles.bottomRow
                      }
                    >

                      <View
                        style={
                          styles.paymentRow
                        }
                      >

                        {restaurant.accepts_momo && (
                          <View
                            style={
                              styles.paymentBadge
                            }
                          >
                            <Text
                              style={
                                styles.paymentBadgeText
                              }
                            >
                              MoMo
                            </Text>
                          </View>
                        )}

                        {restaurant.accepts_cash && (
                          <View
                            style={
                              styles.paymentBadge
                            }
                          >
                            <Text
                              style={
                                styles.paymentBadgeText
                              }
                            >
                              Cash
                            </Text>
                          </View>
                        )}

                        {restaurant.accepts_card && (
                          <View
                            style={
                              styles.paymentBadge
                            }
                          >
                            <Text
                              style={
                                styles.paymentBadgeText
                              }
                            >
                              Card
                            </Text>
                          </View>
                        )}

                      </View>

                      <TouchableOpacity
                        style={
                          styles.directionButton
                        }
                        onPress={(
                          event
                        ) => {
                          event.stopPropagation();

                          openDirections(
                            restaurant
                          );
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name="navigate"
                          size={17}
                          color="#d71920"
                        />

                        <Text
                          style={
                            styles.directionText
                          }
                        >
                          Directions
                        </Text>
                      </TouchableOpacity>

                    </View>

                  </View>

                </TouchableOpacity>
              );
            }
          )
        )}

      </ScrollView>

    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({

    container: {
      flex: 1,
      backgroundColor: "#f7f7f7",
    },

    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#f7f7f7",
    },

    loadingText: {
      marginTop: 12,
      fontSize: 15,
      color: "#666666",
    },

    /* ================= HEADER ================= */

    header: {
      backgroundColor: "#ffffff",
      paddingHorizontal: 18,
      paddingTop: 18,
      paddingBottom: 15,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderBottomColor: "#eeeeee",
    },

    headerLeft: {
      flex: 1,
      paddingRight: 12,
    },

    headerTitle: {
      fontSize: 25,
      fontWeight: "800",
      color: "#151515",
    },

    headerSubtitle: {
      marginTop: 3,
      fontSize: 13,
      color: "#777777",
    },

    ordersButton: {
      backgroundColor: "#d71920",
      paddingHorizontal: 13,
      paddingVertical: 10,
      borderRadius: 11,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    ordersButtonText: {
      color: "#ffffff",
      fontSize: 13,
      fontWeight: "700",
    },

    /* ================= ACTIONS ================= */

    actionContainer: {
      paddingHorizontal: 16,
      paddingVertical: 13,
      backgroundColor: "#ffffff",
      flexDirection: "row",
      gap: 10,
    },

    nearbyButton: {
      flex: 1,
      minHeight: 46,
      backgroundColor: "#d71920",
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },

    disabledButton: {
      opacity: 0.7,
    },

    nearbyButtonText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "800",
    },

    allButton: {
      flex: 1,
      minHeight: 46,
      borderWidth: 1,
      borderColor: "#d71920",
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      backgroundColor: "#ffffff",
    },

    allButtonActive: {
      backgroundColor: "#d71920",
    },

    allButtonText: {
      color: "#d71920",
      fontSize: 14,
      fontWeight: "800",
    },

    allButtonTextActive: {
      color: "#ffffff",
    },

    /* ================= LIST ================= */

    listContent: {
      padding: 15,
      paddingBottom: 35,
    },

    emptyContent: {
      flexGrow: 1,
      justifyContent: "center",
      padding: 25,
    },

    /* ================= CARD ================= */

    restaurantCard: {
      backgroundColor: "#ffffff",
      borderRadius: 16,
      marginBottom: 16,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "#eeeeee",
    },

    coverContainer: {
      width: "100%",
      height: 175,
      position: "relative",
      backgroundColor: "#eeeeee",
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
      backgroundColor: "#eeeeee",
    },

    statusBadge: {
      position: "absolute",
      top: 12,
      right: 12,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    openBadge: {
      backgroundColor: "#ffffff",
    },

    closedBadge: {
      backgroundColor: "#ffffff",
    },

    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },

    openDot: {
      backgroundColor: "#1f9d55",
    },

    closedDot: {
      backgroundColor: "#888888",
    },

    statusText: {
      fontSize: 12,
      fontWeight: "800",
    },

    openText: {
      color: "#1f9d55",
    },

    closedText: {
      color: "#777777",
    },

    nearestBadge: {
      position: "absolute",
      bottom: 12,
      left: 12,
      backgroundColor: "#d71920",
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },

    nearestText: {
      color: "#ffffff",
      fontSize: 12,
      fontWeight: "800",
    },

    /* ================= CONTENT ================= */

    restaurantContent: {
      padding: 14,
    },

    restaurantTopRow: {
      flexDirection: "row",
      alignItems: "center",
    },

    logo: {
      width: 55,
      height: 55,
      borderRadius: 12,
      backgroundColor: "#eeeeee",
    },

    logoPlaceholder: {
      width: 55,
      height: 55,
      borderRadius: 12,
      backgroundColor: "#fff0f0",
      alignItems: "center",
      justifyContent: "center",
    },

    nameContainer: {
      flex: 1,
      marginLeft: 12,
    },

    restaurantName: {
      fontSize: 19,
      fontWeight: "800",
      color: "#151515",
    },

    addressRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 5,
      gap: 4,
    },

    addressText: {
      flex: 1,
      fontSize: 13,
      color: "#777777",
    },

    description: {
      marginTop: 12,
      fontSize: 14,
      lineHeight: 20,
      color: "#555555",
    },

    /* ================= INFO ================= */

    infoRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      marginTop: 13,
      gap: 12,
    },

    infoItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },

    distanceText: {
      color: "#d71920",
      fontSize: 13,
      fontWeight: "800",
    },

    timeText: {
      color: "#666666",
      fontSize: 13,
    },

    /* ================= BOTTOM ================= */

    bottomRow: {
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: "#eeeeee",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },

    paymentRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      flex: 1,
    },

    paymentBadge: {
      backgroundColor: "#f4f4f4",
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 7,
    },

    paymentBadgeText: {
      fontSize: 11,
      color: "#555555",
      fontWeight: "700",
    },

    directionButton: {
      borderWidth: 1,
      borderColor: "#d71920",
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 9,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },

    directionText: {
      color: "#d71920",
      fontSize: 12,
      fontWeight: "800",
    },

    /* ================= EMPTY ================= */

    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
    },

    emptyIcon: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: "#fff0f0",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 18,
    },

    emptyTitle: {
      fontSize: 21,
      fontWeight: "800",
      color: "#222222",
      textAlign: "center",
    },

    emptyText: {
      marginTop: 8,
      fontSize: 14,
      lineHeight: 21,
      color: "#777777",
      textAlign: "center",
      maxWidth: 350,
    },

    emptyButton: {
      marginTop: 20,
      backgroundColor: "#d71920",
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 11,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },

    emptyButtonText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "800",
    },

  });