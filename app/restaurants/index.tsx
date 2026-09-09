import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as Location from "expo-location";
import { router } from "expo-router";
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
  created_at: string;
  updated_at: string;

  // Calculated from customer's GPS
  distance_km: number | null;
};

type CustomerLocation = {
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

/*
 * =========================================================
 * HAVERSINE DISTANCE
 * =========================================================
 *
 * Calculates straight-line distance between:
 *
 * CUSTOMER GPS
 *       ↓
 * RESTAURANT GPS
 *
 * Result is returned in kilometres.
 */
const calculateDistanceKm = (
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number
): number => {
  const earthRadiusKm = 6371;

  const dLatitude =
    ((latitude2 - latitude1) * Math.PI) /
    180;

  const dLongitude =
    ((longitude2 - longitude1) * Math.PI) /
    180;

  const lat1Radians =
    (latitude1 * Math.PI) / 180;

  const lat2Radians =
    (latitude2 * Math.PI) / 180;

  const a =
    Math.sin(dLatitude / 2) *
      Math.sin(dLatitude / 2) +
    Math.cos(lat1Radians) *
      Math.cos(lat2Radians) *
      Math.sin(dLongitude / 2) *
      Math.sin(dLongitude / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadiusKm * c;
};

/*
 * =========================================================
 * RESTAURANT DISCOVERY
 * =========================================================
 */
export default function RestaurantDiscovery() {
  const [restaurants, setRestaurants] =
    useState<Restaurant[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [locating, setLocating] =
    useState(false);

  const [searchText, setSearchText] =
    useState("");

  const [customerLocation, setCustomerLocation] =
    useState<CustomerLocation | null>(
      null
    );

  const [nearbyMode, setNearbyMode] =
    useState(false);

  /*
   * =========================================================
   * LOAD ACTIVE RESTAURANTS
   * =========================================================
   *
   * We do NOT request GPS automatically.
   *
   * This allows customers to browse restaurants
   * without granting location permission.
   */
  const loadRestaurants = useCallback(
    async (
      location?: CustomerLocation | null
    ) => {
      try {
        setLoading(true);

        const { data, error } =
          await supabase
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
              accepts_card,
              created_at,
              updated_at
            `)
            .eq("status", "active")
            .order("name", {
              ascending: true,
            });

        if (error) {
          throw error;
        }

        const restaurantList: Restaurant[] =
          Array.isArray(data)
            ? data.map((restaurant: any) => {
                let distanceKm: number | null =
                  null;

                /*
                 * Calculate distance only when
                 * customer GPS is available.
                 */
                if (
                  location &&
                  restaurant.latitude != null &&
                  restaurant.longitude != null
                ) {
                  const restaurantLatitude =
                    Number(
                      restaurant.latitude
                    );

                  const restaurantLongitude =
                    Number(
                      restaurant.longitude
                    );

                  if (
                    Number.isFinite(
                      restaurantLatitude
                    ) &&
                    Number.isFinite(
                      restaurantLongitude
                    )
                  ) {
                    distanceKm =
                      calculateDistanceKm(
                        location.latitude,
                        location.longitude,
                        restaurantLatitude,
                        restaurantLongitude
                      );
                  }
                }

                return {
                  ...restaurant,
                  distance_km:
                    distanceKm,
                };
              })
            : [];

        /*
         * =====================================================
         * SORTING
         * =====================================================
         *
         * If customer location exists:
         *
         * 0.5 km
         * 1.2 km
         * 2.4 km
         * 5.8 km
         *
         * Restaurants without GPS go last.
         */
        if (location) {
          restaurantList.sort(
            (
              a: Restaurant,
              b: Restaurant
            ) => {
              if (
                a.distance_km == null &&
                b.distance_km == null
              ) {
                return a.name.localeCompare(
                  b.name
                );
              }

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
                a.distance_km -
                b.distance_km
              );
            }
          );
        }

        setRestaurants(
          restaurantList
        );
      } catch (error: any) {
        console.log(
          "Restaurant loading error:",
          error
        );

        showMessage(
          "Error",
          error?.message ||
            "Unable to load restaurants."
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
   * INITIAL LOAD
   * =========================================================
   *
   * Do NOT request GPS automatically.
   */
  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

  /*
   * =========================================================
   * GET CUSTOMER CURRENT GPS
   * =========================================================
   */
  const getCustomerLocation =
    useCallback(async (): Promise<CustomerLocation | null> => {
      try {
        setLocating(true);

        /*
         * Request foreground permission only
         * when customer chooses "Near Me".
         */
        const permission =
          await Location.requestForegroundPermissionsAsync();

        if (
          permission.status !== "granted"
        ) {
          showMessage(
            "Location Required",
            "Please allow location access so Nasara can show restaurants nearest to you."
          );

          return null;
        }

        /*
         * Check whether location services
         * are actually enabled.
         */
        const servicesEnabled =
          await Location.hasServicesEnabledAsync();

        if (!servicesEnabled) {
          showMessage(
            "Location Services Disabled",
            "Please turn on location services on your device and try again."
          );

          return null;
        }

        /*
         * Get a fresh GPS position.
         */
        const location =
          await Location.getCurrentPositionAsync(
            {
              accuracy:
                Location.Accuracy.Highest,
            }
          );

        const latitude =
          location.coords.latitude;

        const longitude =
          location.coords.longitude;

        /*
         * Validate GPS coordinates.
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

        const currentLocation: CustomerLocation =
          {
            latitude,
            longitude,
          };

        console.log(
          "CUSTOMER CURRENT LOCATION:",
          currentLocation
        );

        setCustomerLocation(
          currentLocation
        );

        return currentLocation;
      } catch (error: any) {
        console.log(
          "Customer location error:",
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
   * FIND RESTAURANTS NEAR ME
   * =========================================================
   */
  const handleFindNearby =
    async () => {
      if (locating || loading) {
        return;
      }

      const location =
        await getCustomerLocation();

      if (!location) {
        return;
      }

      setNearbyMode(true);

      /*
       * Recalculate every restaurant's
       * distance using the fresh GPS.
       */
      await loadRestaurants(
        location
      );
    };

  /*
   * =========================================================
   * SHOW ALL RESTAURANTS
   * =========================================================
   */
  const handleShowAll =
    async () => {
      if (loading) {
        return;
      }

      setNearbyMode(false);

      await loadRestaurants(
        customerLocation
      );
    };

  /*
   * =========================================================
   * REFRESH
   * =========================================================
   *
   * If GPS has already been captured,
   * refresh keeps using it.
   *
   * Otherwise it simply reloads restaurants.
   */
  const onRefresh = async () => {
    setRefreshing(true);

    await loadRestaurants(
      customerLocation
    );
  };

  /*
   * =========================================================
   * OPEN RESTAURANT
   * =========================================================
   *
   * Customer can enter the restaurant and
   * browse its food/menu.
   */
  const openRestaurant = (
    restaurantId: string
  ) => {
    router.push({
      pathname:
        "/restaurants/[restaurantId]",
      params: {
        restaurantId,
      },
    });
  };

  /*
   * =========================================================
   * OPEN DIRECTIONS
   * =========================================================
   *
   * START:
   * Customer's captured GPS
   *
   * DESTINATION:
   * Restaurant's saved GPS
   *
   * No Google Maps API key is required.
   */
  const openDirections = (
    restaurant: Restaurant
  ) => {
    if (!customerLocation) {
      showMessage(
        "Location Required",
        "Tap 'Find Restaurants Near Me' first so Nasara knows your current location."
      );

      return;
    }

    if (
      restaurant.latitude == null ||
      restaurant.longitude == null
    ) {
      showMessage(
        "Restaurant Location Unavailable",
        "This restaurant has not saved its GPS location yet."
      );

      return;
    }

    const restaurantLatitude =
      Number(restaurant.latitude);

    const restaurantLongitude =
      Number(restaurant.longitude);

    if (
      !Number.isFinite(
        restaurantLatitude
      ) ||
      !Number.isFinite(
        restaurantLongitude
      )
    ) {
      showMessage(
        "Restaurant Location Error",
        "This restaurant has an invalid GPS location."
      );

      return;
    }

    const origin =
      `${customerLocation.latitude},${customerLocation.longitude}`;

    const destination =
      `${restaurantLatitude},${restaurantLongitude}`;

    let url = "";

    /*
     * =====================================================
     * iOS → APPLE MAPS
     * =====================================================
     */
    if (Platform.OS === "ios") {
      url =
        `http://maps.apple.com/?saddr=${encodeURIComponent(
          origin
        )}` +
        `&daddr=${encodeURIComponent(
          destination
        )}` +
        `&dirflg=d`;
    }

    /*
     * =====================================================
     * ANDROID / WEB → GOOGLE MAPS
     * =====================================================
     *
     * This is simply a Google Maps directions
     * URL and does NOT require a Google Maps API key.
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
        `&travelmode=walking`;
    }

    Linking.openURL(url).catch(
      () => {
        showMessage(
          "Maps Error",
          "Unable to open maps."
        );
      }
    );
  };

  /*
   * =========================================================
   * SEARCH FILTER
   * =========================================================
   */
  const filteredRestaurants =
    restaurants.filter(
      (restaurant) => {
        const search =
          searchText
            .trim()
            .toLowerCase();

        if (!search) {
          return true;
        }

        return (
          restaurant.name
            .toLowerCase()
            .includes(search) ||
          (
            restaurant.description ||
            ""
          )
            .toLowerCase()
            .includes(search) ||
          restaurant.address
            .toLowerCase()
            .includes(search)
        );
      }
    );

  /*
   * =========================================================
   * RESTAURANT CARD
   * =========================================================
   */
  const renderRestaurant = ({
    item,
    index,
  }: {
    item: Restaurant;
    index: number;
  }) => {
    const isOpen =
      item.is_open === true;

    return (
      <View style={styles.card}>
       
        <View
          style={
            styles.restaurantHeader
          }
        >
          <View
            style={
              styles.restaurantIcon
            }
          >
            <Ionicons
              name="restaurant"
              size={25}
              color="#DC2626"
            />
          </View>

          <View
            style={
              styles.restaurantInfo
            }
          >
            <View
              style={
                styles.nameRow
              }
            >
              <Text
                style={styles.name}
                numberOfLines={1}
              >
                {item.name}
              </Text>

              {index === 0 &&
                nearbyMode &&
                item.distance_km !=
                  null && (
                  <View
                    style={
                      styles.nearestBadge
                    }
                  >
                    <Text
                      style={
                        styles.nearestBadgeText
                      }
                    >
                      NEAREST
                    </Text>
                  </View>
                )}
            </View>

            <Text
              style={
                styles.address
              }
              numberOfLines={2}
            >
              {item.address}
            </Text>
          </View>
        </View>

        
        {item.distance_km !=
          null && (
          <View
            style={
              styles.distanceBox
            }
          >
            <Ionicons
              name="navigate"
              size={18}
              color="#2563EB"
            />

            <Text
              style={
                styles.distanceText
              }
            >
              {Number(
                item.distance_km
              ).toFixed(2)}{" "}
              km away
            </Text>
          </View>
        )}

        {!!item.description && (
          <Text
            style={
              styles.description
            }
            numberOfLines={2}
          >
            {item.description}
          </Text>
        )}

        
        <View
          style={
            styles.statusRow
          }
        >
          <View
            style={[
              styles.openStatus,
              isOpen
                ? styles.openStatusOpen
                : styles.openStatusClosed,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                isOpen
                  ? styles.statusDotOpen
                  : styles.statusDotClosed,
              ]}
            />

            <Text
              style={[
                styles.openStatusText,
                isOpen
                  ? styles.openStatusTextOpen
                  : styles.openStatusTextClosed,
              ]}
            >
              {isOpen
                ? "Open"
                : "Closed"}
            </Text>
          </View>

          {item.opening_time &&
            item.closing_time && (
              <Text
                style={
                  styles.hoursText
                }
              >
                {item.opening_time.slice(
                  0,
                  5
                )}
                {" - "}
                {item.closing_time.slice(
                  0,
                  5
                )}
              </Text>
            )}
        </View>

       
        <View
          style={
            styles.buttonRow
          }
        >
         
          <TouchableOpacity
            style={[
              styles.orderButton,
              !isOpen &&
                styles.orderButtonDisabled,
            ]}
            onPress={() =>
              openRestaurant(
                item.id
              )
            }
          >
            <Ionicons
              name="restaurant"
              size={19}
              color="#fff"
            />

            <Text
              style={
                styles.orderButtonText
              }
            >
              {isOpen
                ? "Order Food"
                : "View Restaurant"}
            </Text>
          </TouchableOpacity>

         
          <TouchableOpacity
            style={
              styles.directionButton
            }
            onPress={() =>
              openDirections(
                item
              )
            }
          >
            <Ionicons
              name="navigate"
              size={19}
              color="#2563EB"
            />

            <Text
              style={
                styles.directionButtonText
              }
            >
              Directions
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  /*
   * =========================================================
   * SCREEN
   * =========================================================
   */
  return (
    <View
      style={
        styles.container
      }
    >
     
     <View style={styles.header}>
  <View>
    <Text style={styles.title}>
      Restaurants
    </Text>

    <Text style={styles.subtitle}>
      Find food near you
    </Text>
  </View>

  <View style={styles.headerRight}>
    <TouchableOpacity
      style={styles.ordersIconButton}
      onPress={() => router.push("/restaurants/orders")}
    >
      <Ionicons
        name="receipt-outline"
        size={25}
        color="#DC2626"
      />
    </TouchableOpacity>

    <View style={styles.headerIcon}>
      <Ionicons
        name="restaurant"
        size={25}
        color="#DC2626"
      />
    </View>
  </View>
</View>
      
      <View
        style={
          styles.searchBox
        }
      >
        <Ionicons
          name="search"
          size={20}
          color="#9CA3AF"
        />

        <TextInput
          value={searchText}
          onChangeText={
            setSearchText
          }
          placeholder="Search restaurants..."
          placeholderTextColor="#9CA3AF"
          style={
            styles.searchInput
          }
        />

        {searchText.length >
          0 && (
          <TouchableOpacity
            onPress={() =>
              setSearchText("")
            }
          >
            <Ionicons
              name="close-circle"
              size={20}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        )}
      </View>

      
      <View
        style={
          styles.locationActions
        }
      >
        <TouchableOpacity
          style={[
            styles.nearbyButton,
            (locating ||
              loading) &&
              styles.disabledButton,
          ]}
          onPress={
            handleFindNearby
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
              size={19}
              color="#fff"
            />
          )}

          <Text
            style={
              styles.nearbyButtonText
            }
          >
            {locating
              ? "Finding You..."
              : nearbyMode
              ? "Update Nearby"
              : "Find Near Me"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.allButton,
            !nearbyMode &&
              styles.allButtonActive,
          ]}
          onPress={
            handleShowAll
          }
          disabled={loading}
        >
          <Ionicons
            name="grid"
            size={18}
            color={
              !nearbyMode
                ? "#fff"
                : "#374151"
            }
          />

          <Text
            style={[
              styles.allButtonText,
              !nearbyMode &&
                styles.allButtonTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
      </View>

      {customerLocation &&
        nearbyMode && (
          <View
            style={
              styles.locationStatus
            }
          >
            <Ionicons
              name="checkmark-circle"
              size={18}
              color="#16A34A"
            />

            <Text
              style={
                styles.locationStatusText
              }
            >
              Restaurants sorted by your
              current location
            </Text>
          </View>
        )}

      
      {loading ? (
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
            style={
              styles.loadingText
            }
          >
            {nearbyMode
              ? "Finding restaurants near you..."
              : "Loading restaurants..."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={
            filteredRestaurants
          }
          keyExtractor={(
            item
          ) => item.id}
          renderItem={
            renderRestaurant
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
          contentContainerStyle={
            styles.listContent
          }
          showsVerticalScrollIndicator={
            false
          }
          ListHeaderComponent={
            filteredRestaurants.length >
            0 ? (
              <View
                style={
                  styles.resultsHeader
                }
              >
                <Text
                  style={
                    styles.resultsTitle
                  }
                >
                  {nearbyMode
                    ? "Restaurants Near You"
                    : "Available Restaurants"}
                </Text>

                <Text
                  style={
                    styles.resultsCount
                  }
                >
                  {
                    filteredRestaurants.length
                  }{" "}
                  restaurant
                  {filteredRestaurants.length ===
                  1
                    ? ""
                    : "s"}
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View
              style={
                styles.emptyCard
              }
            >
              <View
                style={
                  styles.emptyIcon
                }
              >
                <Ionicons
                  name="restaurant-outline"
                  size={50}
                  color="#DC2626"
                />
              </View>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                {searchText.trim()
                  ? "No Restaurants Found"
                  : "No Restaurants Available"}
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                {searchText.trim()
                  ? "Try searching for another restaurant or location."
                  : "There are currently no active restaurants available."}
              </Text>

              {!searchText.trim() && (
                <TouchableOpacity
                  style={
                    styles.emptyNearbyButton
                  }
                  onPress={
                    handleFindNearby
                  }
                >
                  <Ionicons
                    name="location"
                    size={18}
                    color="#fff"
                  />

                  <Text
                    style={
                      styles.emptyNearbyText
                    }
                  >
                    Find Restaurants Near Me
                  </Text>
                </TouchableOpacity>
              )}
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
    paddingHorizontal: 16,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 18,
    paddingBottom: 14,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
  },

  subtitle: {
    marginTop: 3,
    fontSize: 14,
    color: "#6B7280",
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },

  searchBox: {
    height: 50,
    backgroundColor: "#fff",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 12,
  },

  searchInput: {
    flex: 1,
    marginLeft: 9,
    fontSize: 15,
    color: "#111827",
  },

  locationActions: {
    flexDirection: "row",
    marginBottom: 10,
  },

  nearbyButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    borderRadius: 13,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },

  nearbyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 7,
  },

  allButton: {
    width: 78,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 13,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },

  allButtonActive: {
    backgroundColor: "#374151",
    borderColor: "#374151",
  },

  allButtonText: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: "800",
    color: "#374151",
  },

  allButtonTextActive: {
    color: "#fff",
  },

  disabledButton: {
    opacity: 0.7,
  },

  locationStatus: {
    backgroundColor: "#DCFCE7",
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  locationStatusText: {
    marginLeft: 7,
    color: "#166534",
    fontSize: 13,
    fontWeight: "700",
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 100,
  },

  loadingText: {
    marginTop: 12,
    color: "#6B7280",
    fontSize: 15,
    textAlign: "center",
  },

  listContent: {
    paddingTop: 5,
    paddingBottom: 40,
  },

  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  resultsTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },

  resultsCount: {
    fontSize: 13,
    color: "#6B7280",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  restaurantHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  restaurantIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },

  restaurantInfo: {
    flex: 1,
    marginLeft: 12,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  name: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },

  nearestBadge: {
    backgroundColor: "#DCFCE7",
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
    marginLeft: 7,
  },

  nearestBadgeText: {
    color: "#15803D",
    fontSize: 9,
    fontWeight: "900",
  },

  address: {
    marginTop: 5,
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 19,
  },

  distanceBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 13,
    alignSelf: "flex-start",
  },

  distanceText: {
    marginLeft: 6,
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "800",
  },

  description: {
    marginTop: 11,
    color: "#4B5563",
    fontSize: 14,
    lineHeight: 20,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 13,
  },

  openStatus: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
  },

  openStatusOpen: {
    backgroundColor: "#DCFCE7",
  },

  openStatusClosed: {
    backgroundColor: "#F3F4F6",
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },

  statusDotOpen: {
    backgroundColor: "#16A34A",
  },

  statusDotClosed: {
    backgroundColor: "#9CA3AF",
  },

  openStatusText: {
    fontSize: 12,
    fontWeight: "800",
  },

  openStatusTextOpen: {
    color: "#15803D",
  },

  openStatusTextClosed: {
    color: "#6B7280",
  },

  hoursText: {
    marginLeft: 10,
    fontSize: 12,
    color: "#6B7280",
  },

  buttonRow: {
    flexDirection: "row",
    marginTop: 15,
  },

  orderButton: {
    flex: 1,
    backgroundColor: "#DC2626",
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 5,
  },

  orderButtonDisabled: {
    backgroundColor: "#6B7280",
  },

  orderButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 6,
  },

  directionButton: {
    flex: 1,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 5,
  },

  directionButtonText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 6,
  },

  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 30,
    alignItems: "center",
    marginTop: 35,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  emptyIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 17,
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },

  emptyText: {
    marginTop: 9,
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 21,
  },

  emptyNearbyButton: {
    marginTop: 18,
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  emptyNearbyText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 7,
  },
  headerRight: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
},

ordersIconButton: {
  width: 48,
  height: 48,
  borderRadius: 24,
  backgroundColor: "#FFFFFF",
  borderWidth: 1,
  borderColor: "#E5E7EB",
  justifyContent: "center",
  alignItems: "center",
},
});