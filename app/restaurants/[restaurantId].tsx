import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
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

export default function RestaurantDetails() {
  const params =
    useLocalSearchParams<{
      restaurantId?: string;
    }>();

  const restaurantId =
    Array.isArray(params.restaurantId)
      ? params.restaurantId[0]
      : params.restaurantId;

  const [restaurant, setRestaurant] =
    useState<Restaurant | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [locating, setLocating] =
    useState(false);

  const [customerLocation, setCustomerLocation] =
    useState<CustomerLocation | null>(
      null
    );

  const [distanceKm, setDistanceKm] =
    useState<number | null>(null);

 
  const loadRestaurant =
    useCallback(async () => {
      if (!restaurantId) {
        showMessage(
          "Restaurant Error",
          "Restaurant ID is missing."
        );

        setLoading(false);
        return;
      }

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
            .eq("id", restaurantId)
            .eq("status", "active")
            .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          setRestaurant(null);

          showMessage(
            "Restaurant Unavailable",
            "This restaurant is no longer available."
          );

          return;
        }

        const restaurantData =
          data as Restaurant;

        setRestaurant(
          restaurantData
        );

        /*
         * If we already have customer's GPS,
         * calculate distance immediately.
         */
        if (
          customerLocation &&
          restaurantData.latitude != null &&
          restaurantData.longitude != null
        ) {
          const latitude =
            Number(
              restaurantData.latitude
            );

          const longitude =
            Number(
              restaurantData.longitude
            );

          if (
            Number.isFinite(latitude) &&
            Number.isFinite(longitude)
          ) {
            setDistanceKm(
              calculateDistanceKm(
                customerLocation.latitude,
                customerLocation.longitude,
                latitude,
                longitude
              )
            );
          }
        }
      } catch (error: any) {
        console.log(
          "Restaurant details error:",
          error
        );

        showMessage(
          "Error",
          error?.message ||
            "Unable to load this restaurant."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, [
      restaurantId,
      customerLocation,
    ]);

  useEffect(() => {
    loadRestaurant();
  }, [loadRestaurant]);

  /*
   * =========================================================
   * GET CUSTOMER LOCATION
   * =========================================================
   */
  const getCustomerLocation =
    useCallback(async () => {
      try {
        setLocating(true);

        const permission =
          await Location.requestForegroundPermissionsAsync();

        if (
          permission.status !== "granted"
        ) {
          showMessage(
            "Location Required",
            "Please allow location access so Nasara can calculate the distance to this restaurant."
          );

          return null;
        }

        const servicesEnabled =
          await Location.hasServicesEnabledAsync();

        if (!servicesEnabled) {
          showMessage(
            "Location Services Disabled",
            "Please turn on location services and try again."
          );

          return null;
        }

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

        setCustomerLocation(
          currentLocation
        );

        if (
          restaurant &&
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
            const distance =
              calculateDistanceKm(
                latitude,
                longitude,
                restaurantLatitude,
                restaurantLongitude
              );

            setDistanceKm(
              distance
            );
          }
        }

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
    }, [restaurant]);

  /*
   * =========================================================
   * DIRECTIONS
   * =========================================================
   */
  const openDirections =
    async () => {
      if (!restaurant) {
        return;
      }

      let location =
        customerLocation;

      /*
       * If customer has not captured GPS yet,
       * ask for it now.
       */
      if (!location) {
        location =
          await getCustomerLocation();
      }

      if (!location) {
        return;
      }

      if (
        restaurant.latitude == null ||
        restaurant.longitude == null
      ) {
        showMessage(
          "Location Unavailable",
          "This restaurant has not saved its GPS location yet."
        );

        return;
      }

      const restaurantLatitude =
        Number(
          restaurant.latitude
        );

      const restaurantLongitude =
        Number(
          restaurant.longitude
        );

      if (
        !Number.isFinite(
          restaurantLatitude
        ) ||
        !Number.isFinite(
          restaurantLongitude
        )
      ) {
        showMessage(
          "Location Error",
          "This restaurant has an invalid GPS location."
        );

        return;
      }

      const origin =
        `${location.latitude},${location.longitude}`;

      const destination =
        `${restaurantLatitude},${restaurantLongitude}`;

      let url = "";

      /*
       * iPhone → Apple Maps
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

 
  const callRestaurant = () => {
    if (!restaurant?.phone) {
      showMessage(
        "Phone Unavailable",
        "This restaurant has no phone number."
      );

      return;
    }

    Linking.openURL(
      `tel:${restaurant.phone}`
    ).catch(() => {
      showMessage(
        "Call Error",
        "Unable to make the call."
      );
    });
  };
 
  const openRestaurantChat = () => {
  if (!restaurant) {
    return;
  }

 
};
  /*
   * =========================================================
   * ORDER FOOD
   * =========================================================
   *
   * This opens the restaurant menu.
   */
  const startOrder = () => {
  if (!restaurant) {
    return;
  }

  if (!restaurant.is_open) {
    showMessage(
      "Restaurant Closed",
      "This restaurant is currently closed. You can view the restaurant, but ordering is not currently available."
    );

    return;
  }

  router.push({
    pathname:
      "/restaurants/[restaurantId]/order-mode",
    params: {
      restaurantId: restaurant.id,
    },
  });
};

  /*
   * =========================================================
   * GO BACK
   * =========================================================
   */
  const goBack = () => {
    if (
      router.canGoBack()
    ) {
      router.back();
    } else {
      router.replace(
        "/restaurants"
      );
    }
  };

  /*
   * =========================================================
   * REFRESH
   * =========================================================
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadRestaurant();
  };

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */
  if (loading) {
    return (
      <View
        style={
          styles.loadingScreen
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
          Loading restaurant...
        </Text>
      </View>
    );
  }

  /*
   * =========================================================
   * NOT FOUND
   * =========================================================
   */
  if (!restaurant) {
    return (
      <View
        style={
          styles.emptyScreen
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
          Restaurant Not Found
        </Text>

        <Text
          style={
            styles.emptyText
          }
        >
          This restaurant is currently
          unavailable.
        </Text>

        <TouchableOpacity
          style={
            styles.backButton
          }
          onPress={goBack}
        >
          <Ionicons
            name="arrow-back"
            size={19}
            color="#fff"
          />

          <Text
            style={
              styles.backButtonText
            }
          >
            Back to Restaurants
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOpen =
    restaurant.is_open === true;

  return (
    <View
      style={
        styles.container
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
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
      >
       
        <View
          style={
            styles.coverContainer
          }
        >
          {restaurant.cover_image_url ? (
            <Image
              source={{
                uri: restaurant.cover_image_url,
              }}
              style={
                styles.coverImage
              }
              resizeMode="cover"
            />
          ) : (
            <View
              style={
                styles.coverPlaceholder
              }
            >
              <Ionicons
                name="restaurant"
                size={60}
                color="#DC2626"
              />
            </View>
          )}

         
          <TouchableOpacity
            style={
              styles.floatingBack
            }
            onPress={goBack}
          >
            <Ionicons
              name="arrow-back"
              size={23}
              color="#111827"
            />
          </TouchableOpacity>
        </View>

       
        <View
          style={
            styles.content
          }
        >
          <View
            style={
              styles.restaurantTop
            }
          >
            <View
              style={
                styles.logoContainer
              }
            >
              {restaurant.logo_url ? (
                <Image
                  source={{
                    uri: restaurant.logo_url,
                  }}
                  style={
                    styles.logo
                  }
                  resizeMode="cover"
                />
              ) : (
                <Ionicons
                  name="restaurant"
                  size={31}
                  color="#DC2626"
                />
              )}
            </View>

            
            <View
              style={
                styles.restaurantNameContainer
              }
            >
              <Text
                style={
                  styles.restaurantName
                }
                numberOfLines={2}
              >
                {restaurant.name}
              </Text>

              <View
                style={
                  styles.openRow
                }
              >
                <View
                  style={[
                    styles.statusBadge,
                    isOpen
                      ? styles.statusOpen
                      : styles.statusClosed,
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
                      styles.statusText,
                      isOpen
                        ? styles.statusTextOpen
                        : styles.statusTextClosed,
                    ]}
                  >
                    {isOpen
                      ? "Open"
                      : "Closed"}
                  </Text>
                </View>

                {restaurant.opening_time &&
                  restaurant.closing_time && (
                    <Text
                      style={
                        styles.hours
                      }
                    >
                      {restaurant.opening_time.slice(
                        0,
                        5
                      )}
                      {" - "}
                      {restaurant.closing_time.slice(
                        0,
                        5
                      )}
                    </Text>
                  )}
              </View>
            </View>
          </View>

          
          {distanceKm !=
            null && (
            <View
              style={
                styles.distanceCard
              }
            >
              <View
                style={
                  styles.distanceIcon
                }
              >
                <Ionicons
                  name="navigate"
                  size={21}
                  color="#2563EB"
                />
              </View>

              <View
                style={
                  styles.distanceInfo
                }
              >
                <Text
                  style={
                    styles.distanceTitle
                  }
                >
                  {distanceKm.toFixed(
                    2
                  )}{" "}
                  km away
                </Text>

                <Text
                  style={
                    styles.distanceSubtitle
                  }
                >
                  Based on your current GPS
                  location
                </Text>
              </View>

              <TouchableOpacity
                onPress={
                  getCustomerLocation
                }
                disabled={
                  locating
                }
              >
                {locating ? (
                  <ActivityIndicator
                    size="small"
                    color="#2563EB"
                  />
                ) : (
                  <Ionicons
                    name="refresh"
                    size={20}
                    color="#2563EB"
                  />
                )}
              </TouchableOpacity>
            </View>
          )}

          
          {!!restaurant.description && (
            <View
              style={
                styles.section
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                About
              </Text>

              <Text
                style={
                  styles.description
                }
              >
                {restaurant.description}
              </Text>
            </View>
          )}

          
          <View
            style={
              styles.infoCard
            }
          >
            <View
              style={
                styles.infoIcon
              }
            >
              <Ionicons
                name="location"
                size={20}
                color="#DC2626"
              />
            </View>

            <View
              style={
                styles.infoContent
              }
            >
              <Text
                style={
                  styles.infoTitle
                }
              >
                Location
              </Text>

              <Text
                style={
                  styles.infoText
                }
              >
                {restaurant.address}
              </Text>
            </View>
          </View>

         
          <View
            style={
              styles.infoCard
            }
          >
            <View
              style={
                styles.infoIcon
              }
            >
              <Ionicons
                name="call"
                size={20}
                color="#16A34A"
              />
            </View>

            <View
              style={
                styles.infoContent
              }
            >
              <Text
                style={
                  styles.infoTitle
                }
              >
                Phone
              </Text>

              <Text
                style={
                  styles.infoText
                }
              >
                {restaurant.phone}
              </Text>
            </View>
          </View>

          
          <View
            style={
              styles.section
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Payment Methods
            </Text>

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
                  <Ionicons
                    name="phone-portrait"
                    size={17}
                    color="#2563EB"
                  />

                  <Text
                    style={
                      styles.paymentText
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
                  <Ionicons
                    name="cash"
                    size={17}
                    color="#16A34A"
                  />

                  <Text
                    style={
                      styles.paymentText
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
                  <Ionicons
                    name="card"
                    size={17}
                    color="#7C3AED"
                  />

                  <Text
                    style={
                      styles.paymentText
                    }
                  >
                    Card
                  </Text>
                </View>
              )}

              {!restaurant.accepts_momo &&
                !restaurant.accepts_cash &&
                !restaurant.accepts_card && (
                  <Text
                    style={
                      styles.noPaymentText
                    }
                  >
                    Payment information
                    unavailable.
                  </Text>
                )}
            </View>
          </View>

         
          <View
            style={
              styles.actionSection
            }
          >
           
            <TouchableOpacity
              style={[
                styles.orderButton,
                !isOpen &&
                  styles.orderButtonClosed,
              ]}
              onPress={
                startOrder
              }
            >
              <Ionicons
                name="restaurant"
                size={21}
                color="#fff"
              />

              <Text
                style={
                  styles.orderButtonText
                }
              >
                {isOpen
                  ? "Order Food"
                  : "View Menu"}
              </Text>
            </TouchableOpacity>

            
            <TouchableOpacity
              style={
                styles.directionButton
              }
              onPress={
                openDirections
              }
            >
              <Ionicons
                name="navigate"
                size={21}
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

            
            <TouchableOpacity
              style={
                styles.callButton
              }
              onPress={
                callRestaurant
              }
            >
              <Ionicons
                name="call"
                size={21}
                color="#16A34A"
              />

              <Text
                style={
                  styles.callButtonText
                }
              >
                Call Restaurant
              </Text>
            </TouchableOpacity>
            
          </View>

          <View
            style={
              styles.orderInfoCard
            }
          >
            <Ionicons
              name="information-circle"
              size={22}
              color="#2563EB"
            />

            <Text
              style={
                styles.orderInfoText
              }
            >
              Order directly from the
              restaurant. The restaurant
              receives your payment and
              prepares your food for pickup.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#6B7280",
  },

  emptyScreen: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },

  emptyIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },

  emptyTitle: {
    marginTop: 18,
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },

  emptyText: {
    marginTop: 8,
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
  },

  backButton: {
    marginTop: 22,
    backgroundColor: "#DC2626",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  backButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 7,
  },

  coverContainer: {
    height: 230,
    backgroundColor: "#FEE2E2",
    position: "relative",
  },

  coverImage: {
    width: "100%",
    height: "100%",
  },

  coverPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  floatingBack: {
    position: "absolute",
    top: 18,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 3,
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  restaurantTop: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: -42,
  },

  logoContainer: {
    width: 84,
    height: 84,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 4,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 4,
  },

  logo: {
    width: "100%",
    height: "100%",
  },

  restaurantNameContainer: {
    flex: 1,
    marginLeft: 13,
    paddingTop: 35,
  },

  restaurantName: {
    fontSize: 23,
    fontWeight: "900",
    color: "#111827",
  },

  openRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },

  statusOpen: {
    backgroundColor: "#DCFCE7",
  },

  statusClosed: {
    backgroundColor: "#F3F4F6",
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },

  statusDotOpen: {
    backgroundColor: "#16A34A",
  },

  statusDotClosed: {
    backgroundColor: "#9CA3AF",
  },

  statusText: {
    fontSize: 12,
    fontWeight: "800",
  },

  statusTextOpen: {
    color: "#15803D",
  },

  statusTextClosed: {
    color: "#6B7280",
  },

  hours: {
    marginLeft: 9,
    fontSize: 12,
    color: "#6B7280",
  },

  distanceCard: {
    marginTop: 18,
    backgroundColor: "#EFF6FF",
    borderRadius: 15,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },

  distanceIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },

  distanceInfo: {
    flex: 1,
    marginLeft: 10,
  },

  distanceTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1D4ED8",
  },

  distanceSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#64748B",
  },

  section: {
    marginTop: 22,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 8,
  },

  description: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 23,
  },

  infoCard: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
  },

  infoContent: {
    flex: 1,
    marginLeft: 11,
  },

  infoTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
  },

  infoText: {
    marginTop: 3,
    fontSize: 14,
    color: "#111827",
    lineHeight: 20,
  },

  paymentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  paymentBadge: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  paymentText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },

  noPaymentText: {
    fontSize: 14,
    color: "#6B7280",
  },

  actionSection: {
    marginTop: 25,
  },

  orderButton: {
    backgroundColor: "#DC2626",
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  orderButtonClosed: {
    backgroundColor: "#6B7280",
  },

  orderButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    marginLeft: 8,
  },

  directionButton: {
    marginTop: 10,
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },

  directionButtonText: {
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "900",
    marginLeft: 8,
  },

  callButton: {
    marginTop: 10,
    backgroundColor: "#DCFCE7",
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },

  callButtonText: {
    color: "#15803D",
    fontSize: 16,
    fontWeight: "900",
    marginLeft: 8,
  },

  orderInfoCard: {
    marginTop: 18,
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  orderInfoText: {
    flex: 1,
    marginLeft: 9,
    color: "#1E40AF",
    fontSize: 13,
    lineHeight: 20,
  },
  chatButton: {
  marginTop: 10,
  backgroundColor: "#F5F3FF",
  borderRadius: 14,
  paddingVertical: 15,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 1,
  borderColor: "#DDD6FE",
},

chatButtonText: {
  color: "#7C3AED",
  fontSize: 16,
  fontWeight: "900",
  marginLeft: 8,
},
});