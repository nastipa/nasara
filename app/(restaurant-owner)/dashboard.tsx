import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

type RestaurantStatus =
  | "active"
  | "suspended"
  | "closed";

type Restaurant = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  phone: string | null;
  address: string | null;
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
  created_at: string;
  updated_at: string;
};

type RestaurantOwner = {
  id: string;
  user_id: string;
  restaurant_id: string | null;
  status: "active" | "inactive" | "suspended";
};

type OrderSummary = {
  total: number;
  pending: number;
  paid: number;
  preparing: number;
  ready: number;
  pickedUp: number;
};

type MenuSummary = {
  categories: number;
  foods: number;
  availableFoods: number;
  featuredFoods: number;
};

function showMessage(title: string, message?: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.alert(
        message ? `${title}\n\n${message}` : title
      );
    }
    return;
  }

  console.log(title, message ?? "");
}

function normalizeRestaurantStatus(
  value: string | null | undefined
): RestaurantStatus {
  if (value === "suspended") {
    return "suspended";
  }

  if (value === "closed") {
    return "closed";
  }

  // Old values such as pending/approved/rejected
  // are treated as active so they do not disappear.
  return "active";
}

export default function RestaurantOwnerDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [restaurantOwner, setRestaurantOwner] =
    useState<RestaurantOwner | null>(null);

  const [restaurant, setRestaurant] =
    useState<Restaurant | null>(null);

  const [orderSummary, setOrderSummary] =
    useState<OrderSummary>({
      total: 0,
      pending: 0,
      paid: 0,
      preparing: 0,
      ready: 0,
      pickedUp: 0,
    });

  const [menuSummary, setMenuSummary] =
    useState<MenuSummary>({
      categories: 0,
      foods: 0,
      availableFoods: 0,
      featuredFoods: 0,
    });

  const [errorMessage, setErrorMessage] = useState("");

  const resetSummaries = () => {
    setOrderSummary({
      total: 0,
      pending: 0,
      paid: 0,
      preparing: 0,
      ready: 0,
      pickedUp: 0,
    });

    setMenuSummary({
      categories: 0,
      foods: 0,
      availableFoods: 0,
      featuredFoods: 0,
    });
  };

  const loadDashboard = useCallback(async () => {
    try {
      setErrorMessage("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: ownerData, error: ownerError } =
        await (supabase as any)
          .from("restaurant_owners")
          .select(
            "id, user_id, restaurant_id, status"
          )
          .eq("user_id", user.id)
          .maybeSingle();

      if (ownerError) {
        throw ownerError;
      }

      if (!ownerData) {
        setRestaurantOwner(null);
        setRestaurant(null);
        resetSummaries();
        return;
      }

      setRestaurantOwner(
        ownerData as RestaurantOwner
      );

      if (ownerData.status !== "active") {
        setRestaurant(null);
        resetSummaries();
        return;
      }

      /*
       * IMPORTANT:
       * Do NOT filter the restaurant by pending,
       * approved, rejected, etc.
       *
       * The owner already has access.
       * The restaurant is found directly by its ID.
       */
      let restaurantData: any = null;

      if (ownerData.restaurant_id) {
        const {
          data,
          error,
        } = await (supabase as any)
          .from("restaurants")
          .select(
            `
              id,
              owner_id,
              name,
              description,
              phone,
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
            `
          )
          .eq("id", ownerData.restaurant_id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        restaurantData = data;
      }

      /*
       * Fallback:
       * If restaurant_owners.restaurant_id is empty,
       * find the restaurant using owner_id.
       *
       * This also repairs old records where the owner link
       * was not properly saved.
       */
      if (!restaurantData) {
        const {
          data,
          error,
        } = await (supabase as any)
          .from("restaurants")
          .select(
            `
              id,
              owner_id,
              name,
              description,
              phone,
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
            `
          )
          .eq("owner_id", user.id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        restaurantData = data;

        if (restaurantData) {
          await (supabase as any)
            .from("restaurant_owners")
            .update({
              restaurant_id: restaurantData.id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", ownerData.id);

          setRestaurantOwner({
            ...ownerData,
            restaurant_id: restaurantData.id,
          } as RestaurantOwner);
        }
      }

      if (!restaurantData) {
        setRestaurant(null);
        resetSummaries();
        return;
      }

      const normalizedRestaurant: Restaurant = {
        ...restaurantData,
        status: normalizeRestaurantStatus(
          restaurantData.status
        ),
      };

      setRestaurant(normalizedRestaurant);

      const restaurantId =
        normalizedRestaurant.id;

      const [
        {
          data: ordersData,
          error: ordersError,
        },
        {
          data: categoriesData,
          error: categoriesError,
        },
        {
          data: menuData,
          error: menuError,
        },
      ] = await Promise.all([
        (supabase as any)
          .from("food_orders")
          .select(
            "id, payment_status, order_status"
          )
          .eq(
            "restaurant_id",
            restaurantId
          ),

        supabase
          .from("restaurant_categories")
          .select("id")
          .eq(
            "restaurant_id",
            restaurantId
          ),

        supabase
          .from("restaurant_menu_items")
          .select(
            "id, is_available, is_featured"
          )
          .eq(
            "restaurant_id",
            restaurantId
          ),
      ]);

      if (ordersError) {
        console.log(
          "Orders summary error:",
          ordersError
        );
      }

      if (categoriesError) {
        console.log(
          "Categories summary error:",
          categoriesError
        );
      }

      if (menuError) {
        console.log(
          "Menu summary error:",
          menuError
        );
      }

      const orders = ordersData ?? [];
      const categories = categoriesData ?? [];
      const menuItems = menuData ?? [];

      setOrderSummary({
        total: orders.length,

        pending: orders.filter(
          (order: any) =>
            order.order_status ===
              "pending_payment" ||
            order.order_status === "paid"
        ).length,

        paid: orders.filter(
          (order: any) =>
            order.payment_status === "paid"
        ).length,

        preparing: orders.filter(
          (order: any) =>
            order.order_status === "accepted" ||
            order.order_status === "preparing"
        ).length,

        ready: orders.filter(
          (order: any) =>
            order.order_status ===
            "ready_for_pickup"
        ).length,

        pickedUp: orders.filter(
          (order: any) =>
            order.order_status ===
              "picked_up" ||
            order.order_status ===
              "completed"
        ).length,
      });

      setMenuSummary({
        categories: categories.length,
        foods: menuItems.length,

        availableFoods:
          menuItems.filter(
            (item: any) =>
              item.is_available === true
          ).length,

        featuredFoods:
          menuItems.filter(
            (item: any) =>
              item.is_featured === true
          ).length,
      });
    } catch (error: any) {
      console.error(
        "Restaurant dashboard error:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Unable to load your restaurant dashboard."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
  };

  const handleCreateRestaurant = () => {
    router.push(
      "/(restaurant-owner)/create-restaurant"
    );
  };

  const handleRestaurantInfo = () => {
    if (!restaurant) {
      handleCreateRestaurant();
      return;
    }

    router.push(
      "/(restaurant-owner)/create-restaurant"
    );
  };

  const handleMenu = () => {
    if (!restaurant) {
      showMessage(
        "Restaurant Required",
        "Create your restaurant before managing your menu."
      );
      return;
    }

    router.push(
      "/(restaurant-owner)/menu"
    );
  };

  const handleOrders = () => {
    if (!restaurant) {
      showMessage(
        "Restaurant Required",
        "Create your restaurant before viewing orders."
      );
      return;
    }

    router.push(
      "/(restaurant-owner)/orders"
    );
  };

  const handleSettings = () => {
    if (!restaurant) {
      showMessage(
        "Restaurant Required",
        "Create your restaurant before opening restaurant settings."
      );
      return;
    }

    router.push(
      "/(restaurant-owner)/settings"
    );
  };

  const handleChat = () => {
    router.push("/chat");
  };

  const formatTime = (
    time: string | null
  ) => {
    if (!time) {
      return "Not set";
    }

    const parts = time.split(":");

    if (parts.length < 2) {
      return time;
    }

    const hour = Number(parts[0]);
    const minute = parts[1];

    if (Number.isNaN(hour)) {
      return time;
    }

    const suffix =
      hour >= 12 ? "PM" : "AM";

    const displayHour =
      hour % 12 === 0
        ? 12
        : hour % 12;

    return `${displayHour}:${minute} ${suffix}`;
  };

  const getStatusLabel = () => {
    if (!restaurant) {
      return "Not Created";
    }

    switch (restaurant.status) {
      case "active":
        return "Active";

      case "suspended":
        return "Suspended";

      case "closed":
        return "Closed";

      default:
        return "Active";
    }
  };

  const getStatusIcon = () => {
    if (!restaurant) {
      return "restaurant-outline";
    }

    switch (restaurant.status) {
      case "active":
        return "checkmark-circle";

      case "suspended":
        return "ban";

      case "closed":
        return "lock-closed";

      default:
        return "checkmark-circle";
    }
  };

  const getStatusColor = () => {
    if (!restaurant) {
      return "#64748b";
    }

    switch (restaurant.status) {
      case "active":
        return "#16a34a";

      case "suspended":
        return "#d97706";

      case "closed":
        return "#dc2626";

      default:
        return "#16a34a";
    }
  };

  const getStatusBackground = () => {
    if (!restaurant) {
      return "#f1f5f9";
    }

    switch (restaurant.status) {
      case "active":
        return "#dcfce7";

      case "suspended":
        return "#fef3c7";

      case "closed":
        return "#fee2e2";

      default:
        return "#dcfce7";
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <View
          style={styles.loadingContainer}
        >
          <View
            style={styles.loadingIcon}
          >
            <Ionicons
              name="restaurant"
              size={30}
            />
          </View>

          <ActivityIndicator
            size="large"
          />

          <Text
            style={styles.loadingTitle}
          >
            Restaurant Admin
          </Text>

          <Text
            style={styles.loadingText}
          >
            Loading your dashboard...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!restaurantOwner) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <View
          style={styles.accessContainer}
        >
          <View
            style={styles.accessIcon}
          >
            <Ionicons
              name="restaurant-outline"
              size={48}
            />
          </View>

          <Text
            style={styles.accessTitle}
          >
            Restaurant Admin Access
          </Text>

          <Text
            style={styles.accessText}
          >
            Your account does not currently
            have restaurant owner access.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
              router.back()
            }
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (
    restaurantOwner.status !==
    "active"
  ) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <ScrollView
          contentContainerStyle={
            styles.accessContainer
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
        >
          <View
            style={styles.accessIcon}
          >
            <Ionicons
              name="lock-closed-outline"
              size={48}
            />
          </View>

          <Text
            style={styles.accessTitle}
          >
            Restaurant Access Unavailable
          </Text>

          <Text
            style={styles.accessText}
          >
            Your restaurant owner access is
            currently{" "}
            {restaurantOwner.status}.
          </Text>

          <TouchableOpacity
            style={
              styles.secondaryButton
            }
            onPress={handleRefresh}
          >
            <Ionicons
              name="refresh"
              size={20}
            />

            <Text
              style={
                styles.secondaryButtonText
              }
            >
              Refresh
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={
          styles.contentContainer
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View
              style={styles.headerLogo}
            >
              <Ionicons
                name="restaurant"
                size={23}
              />
            </View>

            <View>
              <Text
                style={styles.headerSmall}
              >
                NASARA
              </Text>

              <Text
                style={styles.headerTitle}
              >
                Restaurant Admin
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            activeOpacity={0.8}
          >
            <Ionicons
              name="refresh"
              size={21}
            />
          </TouchableOpacity>
        </View>

        {/* ERROR */}

        {errorMessage ? (
          <View
            style={styles.errorCard}
          >
            <View
              style={styles.errorIcon}
            >
              <Ionicons
                name="warning-outline"
                size={21}
              />
            </View>

            <View
              style={styles.errorContent}
            >
              <Text
                style={styles.errorTitle}
              >
                Something went wrong
              </Text>

              <Text
                style={styles.errorText}
              >
                {errorMessage}
              </Text>
            </View>

            <TouchableOpacity
              onPress={loadDashboard}
            >
              <Text
                style={styles.retryText}
              >
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* NO RESTAURANT */}

        {!restaurant ? (
          <View
            style={styles.setupCard}
          >
            <View
              style={styles.setupTop}
            >
              <View
                style={styles.setupIcon}
              >
                <Ionicons
                  name="restaurant-outline"
                  size={40}
                />
              </View>

              <View
                style={styles.setupBadge}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={15}
                />

                <Text
                  style={styles.setupBadgeText}
                >
                  ADMIN ACCESS READY
                </Text>
              </View>
            </View>

            <Text
              style={styles.setupTitle}
            >
              Create Your Restaurant
            </Text>

            <Text
              style={styles.setupText}
            >
              Your Restaurant Admin account
              is ready. Create your restaurant
              profile to start adding foods,
              receiving orders and managing
              your business.
            </Text>

            <TouchableOpacity
              style={styles.createButton}
              onPress={
                handleCreateRestaurant
              }
              activeOpacity={0.85}
            >
              <Ionicons
                name="add-circle-outline"
                size={21}
              />

              <Text
                style={
                  styles.createButtonText
                }
              >
                Create Restaurant
              </Text>

              <Ionicons
                name="arrow-forward"
                size={19}
              />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* RESTAURANT HERO */}

        {restaurant ? (
          <View
            style={styles.restaurantHero}
          >
            <View
              style={styles.heroTop}
            >
              <View
                style={styles.restaurantAvatar}
              >
                <Ionicons
                  name="restaurant"
                  size={31}
                />
              </View>

              <View
                style={styles.restaurantMainInfo}
              >
                <Text
                  style={
                    styles.restaurantName
                  }
                  numberOfLines={1}
                >
                  {restaurant.name}
                </Text>

                <View
                  style={styles.addressLine}
                >
                  <Ionicons
                    name="location-outline"
                    size={14}
                  />

                  <Text
                    style={
                      styles.restaurantAddress
                    }
                    numberOfLines={2}
                  >
                    {restaurant.address ||
                      "Restaurant address not set"}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      getStatusBackground(),
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusBadgeDot,
                    {
                      backgroundColor:
                        getStatusColor(),
                    },
                  ]}
                />

                <Text
                  style={[
                    styles.statusBadgeText,
                    {
                      color:
                        getStatusColor(),
                    },
                  ]}
                >
                  {getStatusLabel()}
                </Text>
              </View>
            </View>

            <View
              style={styles.heroDivider}
            />

            <View
              style={styles.heroStats}
            >
              <View
                style={styles.heroStat}
              >
                <Ionicons
                  name="restaurant-outline"
                  size={17}
                />

                <Text
                  style={
                    styles.heroStatValue
                  }
                >
                  {menuSummary.foods}
                </Text>

                <Text
                  style={
                    styles.heroStatLabel
                  }
                >
                  Foods
                </Text>
              </View>

              <View
                style={styles.heroStatDivider}
              />

              <View
                style={styles.heroStat}
              >
                <Ionicons
                  name="receipt-outline"
                  size={17}
                />

                <Text
                  style={
                    styles.heroStatValue
                  }
                >
                  {orderSummary.total}
                </Text>

                <Text
                  style={
                    styles.heroStatLabel
                  }
                >
                  Orders
                </Text>
              </View>

              <View
                style={styles.heroStatDivider}
              />

              <View
                style={styles.heroStat}
              >
                <View
                  style={[
                    styles.heroOpenDot,
                    {
                      backgroundColor:
                        restaurant.is_open
                          ? "#16a34a"
                          : "#94a3b8",
                    },
                  ]}
                />

                <Text
                  style={
                    styles.heroStatValue
                  }
                >
                  {restaurant.is_open
                    ? "Open"
                    : "Closed"}
                </Text>

                <Text
                  style={
                    styles.heroStatLabel
                  }
                >
                  Ordering
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={
                styles.restaurantInfoButton
              }
              onPress={
                handleRestaurantInfo
              }
              activeOpacity={0.8}
            >
              <Ionicons
                name="create-outline"
                size={19}
              />

              <Text
                style={
                  styles.restaurantInfoButtonText
                }
              >
                Restaurant Information
              </Text>

              <Ionicons
                name="chevron-forward"
                size={19}
              />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* QUICK ACTIONS */}

        <SectionHeader
          title="Quick Actions"
          subtitle="Manage your restaurant"
        />

        <View style={styles.actionGrid}>
          <ActionCard
            icon="restaurant-outline"
            title={
              restaurant
                ? "Restaurant Info"
                : "Create Restaurant"
            }
            subtitle={
              restaurant
                ? "Manage restaurant details"
                : "Set up your restaurant"
            }
            onPress={
              restaurant
                ? handleRestaurantInfo
                : handleCreateRestaurant
            }
          />

          <ActionCard
            icon="fast-food-outline"
            title="Food & Menu"
            subtitle={
              restaurant
                ? `${menuSummary.foods} foods`
                : "Add your food"
            }
            onPress={handleMenu}
          />

          <ActionCard
            icon="receipt-outline"
            title="Orders"
            subtitle={
              restaurant
                ? `${orderSummary.total} total`
                : "Customer orders"
            }
            onPress={handleOrders}
          />

          <ActionCard
            icon="settings-outline"
            title="Settings"
            subtitle="Restaurant settings"
            onPress={handleSettings}
          />

          <ActionCard
            icon="chatbubbles-outline"
            title="Nasara Chat"
            subtitle="Talk to customers"
            onPress={handleChat}
          />

          <ActionCard
            icon="location-outline"
            title="Location"
            subtitle={
              restaurant?.latitude !==
                null &&
              restaurant?.longitude !==
                null
                ? "GPS captured"
                : "Set location"
            }
            onPress={
              handleRestaurantInfo
            }
          />
        </View>

        {/* ORDER OVERVIEW */}

        <SectionHeader
          title="Order Overview"
          subtitle="Track your food orders"
          action="View All"
          onAction={handleOrders}
        />

        <View style={styles.statsGrid}>
          <StatCard
            icon="receipt-outline"
            label="Total"
            value={orderSummary.total}
          />

          <StatCard
            icon="time-outline"
            label="Pending"
            value={orderSummary.pending}
          />

          <StatCard
            icon="card-outline"
            label="Paid"
            value={orderSummary.paid}
          />

          <StatCard
            icon="flame-outline"
            label="Preparing"
            value={
              orderSummary.preparing
            }
          />

          <StatCard
            icon="checkmark-circle-outline"
            label="Ready"
            value={orderSummary.ready}
          />

          <StatCard
            icon="bag-check-outline"
            label="Picked Up"
            value={
              orderSummary.pickedUp
            }
          />
        </View>

        {/* MENU OVERVIEW */}

        <SectionHeader
          title="Menu Overview"
          subtitle="Your food catalog"
          action="Manage"
          onAction={handleMenu}
        />

        <View
          style={styles.menuOverviewCard}
        >
          <View
            style={styles.menuOverviewRow}
          >
            <MenuMetric
              value={
                menuSummary.categories
              }
              label="Categories"
            />

            <View
              style={styles.menuDivider}
            />

            <MenuMetric
              value={menuSummary.foods}
              label="Foods"
            />

            <View
              style={styles.menuDivider}
            />

            <MenuMetric
              value={
                menuSummary.availableFoods
              }
              label="Available"
            />

            <View
              style={styles.menuDivider}
            />

            <MenuMetric
              value={
                menuSummary.featuredFoods
              }
              label="Featured"
            />
          </View>

          <TouchableOpacity
            style={styles.manageMenuButton}
            onPress={handleMenu}
            activeOpacity={0.8}
          >
            <View>
              <Text
                style={
                  styles.manageMenuTitle
                }
              >
                Manage Food & Menu
              </Text>

              <Text
                style={
                  styles.manageMenuSubtitle
                }
              >
                Add foods, prices, photos and
                availability
              </Text>
            </View>

            <View
              style={styles.arrowCircle}
            >
              <Ionicons
                name="arrow-forward"
                size={18}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* RESTAURANT STATUS */}

        {restaurant ? (
          <>
            <SectionHeader
              title="Restaurant Status"
              subtitle="Current operating information"
            />

            <View
              style={styles.statusCard}
            >
              <View
                style={
                  styles.statusCardHeader
                }
              >
                <View
                  style={[
                    styles.largeStatusIcon,
                    {
                      backgroundColor:
                        getStatusBackground(),
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      getStatusIcon() as any
                    }
                    size={25}
                    color={
                      getStatusColor()
                    }
                  />
                </View>

                <View
                  style={
                    styles.statusCardContent
                  }
                >
                  <Text
                    style={
                      styles.statusCardTitle
                    }
                  >
                    {getStatusLabel()}
                  </Text>

                  <Text
                    style={
                      styles.statusCardText
                    }
                  >
                    {restaurant.status ===
                    "active"
                      ? "Your restaurant is active and available on Nasara."
                      : restaurant.status ===
                        "suspended"
                      ? "Your restaurant is temporarily suspended."
                      : "Your restaurant is currently closed."}
                  </Text>
                </View>
              </View>

              <View
                style={styles.statusDetails}
              >
                <StatusDetail
                  label="Restaurant Status"
                  value={getStatusLabel()}
                  valueColor={
                    getStatusColor()
                  }
                />

                <StatusDetail
                  label="Opening Time"
                  value={formatTime(
                    restaurant.opening_time
                  )}
                />

                <StatusDetail
                  label="Closing Time"
                  value={formatTime(
                    restaurant.closing_time
                  )}
                />

                <StatusDetail
                  label="Customer Ordering"
                  value={
                    restaurant.is_open
                      ? "Open"
                      : "Closed"
                  }
                  valueColor={
                    restaurant.is_open
                      ? "#16a34a"
                      : "#64748b"
                  }
                />
              </View>

              <TouchableOpacity
                style={styles.settingsButton}
                onPress={handleSettings}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="settings-outline"
                  size={18}
                />

                <Text
                  style={
                    styles.settingsButtonText
                  }
                >
                  Manage Restaurant Settings
                </Text>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                />
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        {/* LOCATION */}

        {restaurant ? (
          <>
            <SectionHeader
              title="Restaurant Location"
              subtitle="Where customers can find you"
            />

            <View
              style={styles.infoCard}
            >
              <InfoRow
                icon="location"
                title="Address"
                value={
                  restaurant.address ||
                  "Address not set"
                }
              />

              <InfoRow
                icon="navigate-outline"
                title="GPS Coordinates"
                value={
                  restaurant.latitude !==
                    null &&
                  restaurant.longitude !==
                    null
                    ? `${restaurant.latitude.toFixed(
                        6
                      )}, ${restaurant.longitude.toFixed(
                        6
                      )}`
                    : "GPS location not captured"
                }
              />

              <TouchableOpacity
                style={
                  styles.outlineButton
                }
                onPress={
                  handleRestaurantInfo
                }
                activeOpacity={0.8}
              >
                <Ionicons
                  name="location-outline"
                  size={18}
                />

                <Text
                  style={
                    styles.outlineButtonText
                  }
                >
                  Update Location
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        {/* PAYMENT */}

        {restaurant ? (
          <>
            <SectionHeader
              title="Payment Information"
              subtitle="Customers pay your restaurant directly"
            />

            <View
              style={styles.paymentCard}
            >
              <View
                style={styles.paymentHeader}
              >
                <View
                  style={styles.paymentIcon}
                >
                  <Ionicons
                    name="wallet-outline"
                    size={25}
                  />
                </View>

                <View
                  style={
                    styles.paymentHeaderContent
                  }
                >
                  <Text
                    style={styles.paymentTitle}
                  >
                    Customer Payment
                  </Text>

                  <Text
                    style={
                      styles.paymentSubtitle
                    }
                  >
                    Payments are made directly
                    to your restaurant.
                  </Text>
                </View>
              </View>

              {restaurant.accepts_momo ? (
                <View
                  style={
                    styles.paymentDetail
                  }
                >
                  <Ionicons
                    name="phone-portrait-outline"
                    size={20}
                  />

                  <View
                    style={
                      styles.paymentDetailContent
                    }
                  >
                    <Text
                      style={
                        styles.paymentDetailLabel
                      }
                    >
                      Mobile Money
                    </Text>

                    <Text
                      style={
                        styles.paymentDetailValue
                      }
                    >
                      {restaurant.momo_provider ||
                        "Network not set"}
                      {" • "}
                      {restaurant.momo_number ||
                        "Number not set"}
                    </Text>

                    {restaurant.momo_account_name ? (
                      <Text
                        style={
                          styles.paymentAccountName
                        }
                      >
                        {
                          restaurant.momo_account_name
                        }
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}

              <View
                style={styles.paymentMethods}
              >
                <PaymentMethod
                  icon="phone-portrait-outline"
                  label="MoMo"
                  enabled={
                    restaurant.accepts_momo
                  }
                />

                <PaymentMethod
                  icon="cash-outline"
                  label="Cash"
                  enabled={
                    restaurant.accepts_cash
                  }
                />

                <PaymentMethod
                  icon="card-outline"
                  label="Card"
                  enabled={
                    restaurant.accepts_card
                  }
                />
              </View>

              <TouchableOpacity
                style={
                  styles.outlineButton
                }
                onPress={handleSettings}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="create-outline"
                  size={18}
                />

                <Text
                  style={
                    styles.outlineButtonText
                  }
                >
                  Manage Payment Settings
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        {/* COMMUNICATION */}

        <SectionHeader
          title="Communication"
          subtitle="Stay connected with customers"
        />

        <TouchableOpacity
          style={styles.chatCard}
          onPress={handleChat}
          activeOpacity={0.8}
        >
          <View
            style={styles.chatIcon}
          >
            <Ionicons
              name="chatbubbles"
              size={26}
            />
          </View>

          <View
            style={styles.chatContent}
          >
            <Text
              style={styles.chatTitle}
            >
              Nasara Chat
            </Text>

            <Text
              style={styles.chatText}
            >
              Communicate with customers using
              the existing Nasara Chat system.
            </Text>
          </View>

          <View
            style={styles.arrowCircle}
          >
            <Ionicons
              name="arrow-forward"
              size={18}
            />
          </View>
        </TouchableOpacity>

        {/* MANAGEMENT */}

        <SectionHeader
          title="Restaurant Management"
          subtitle="Everything you need to run your restaurant"
        />

        <View
          style={styles.managementList}
        >
          <ManagementRow
            icon="restaurant-outline"
            title="Restaurant Information"
            subtitle="Name, description, phone and address"
            onPress={
              handleRestaurantInfo
            }
          />

          <ManagementRow
            icon="fast-food-outline"
            title="Food & Menu"
            subtitle="Categories, food, prices and availability"
            onPress={handleMenu}
          />

          <ManagementRow
            icon="receipt-outline"
            title="Orders"
            subtitle="Accept, prepare and complete food orders"
            onPress={handleOrders}
          />

          <ManagementRow
            icon="location-outline"
            title="Location"
            subtitle="Address and GPS coordinates"
            onPress={
              handleRestaurantInfo
            }
          />

          <ManagementRow
            icon="wallet-outline"
            title="Payment Settings"
            subtitle="MoMo, cash and card payment options"
            onPress={handleSettings}
          />

          <ManagementRow
            icon="time-outline"
            title="Opening Hours"
            subtitle="Set when your restaurant is open"
            onPress={handleSettings}
          />

          <ManagementRow
            icon="settings-outline"
            title="Restaurant Settings"
            subtitle="Manage your restaurant configuration"
            onPress={handleSettings}
            last
          />
        </View>

        <View
          style={styles.bottomSpace}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
  onAction,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View
      style={styles.sectionHeader}
    >
      <View
        style={styles.sectionHeaderText}
      >
        <Text
          style={styles.sectionTitle}
        >
          {title}
        </Text>

        {subtitle ? (
          <Text
            style={
              styles.sectionSubtitle
            }
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {action && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.7}
        >
          <Text
            style={styles.sectionAction}
          >
            {action}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function ActionCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: any;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.actionCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View
        style={styles.actionIcon}
      >
        <Ionicons
          name={icon}
          size={24}
        />
      </View>

      <View
        style={styles.actionCardArrow}
      >
        <Ionicons
          name="arrow-up-outline"
          size={15}
        />
      </View>

      <Text
        style={styles.actionTitle}
        numberOfLines={1}
      >
        {title}
      </Text>

      <Text
        style={styles.actionSubtitle}
        numberOfLines={2}
      >
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.statCard}>
      <View
        style={styles.statIcon}
      >
        <Ionicons
          name={icon}
          size={19}
        />
      </View>

      <Text
        style={styles.statValue}
      >
        {value}
      </Text>

      <Text
        style={styles.statLabel}
      >
        {label}
      </Text>
    </View>
  );
}

function MenuMetric({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <View
      style={styles.menuOverviewItem}
    >
      <Text
        style={styles.menuNumber}
      >
        {value}
      </Text>

      <Text
        style={styles.menuLabel}
      >
        {label}
      </Text>
    </View>
  );
}

function StatusDetail({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View
      style={styles.detailRow}
    >
      <Text
        style={styles.detailLabel}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.detailValue,
          valueColor
            ? {
                color: valueColor,
              }
            : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function InfoRow({
  icon,
  title,
  value,
}: {
  icon: any;
  title: string;
  value: string;
}) {
  return (
    <View
      style={styles.infoRow}
    >
      <View
        style={styles.infoIcon}
      >
        <Ionicons
          name={icon}
          size={21}
        />
      </View>

      <View
        style={styles.infoContent}
      >
        <Text
          style={styles.infoTitle}
        >
          {title}
        </Text>

        <Text
          style={styles.infoValue}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function PaymentMethod({
  icon,
  label,
  enabled,
}: {
  icon: any;
  label: string;
  enabled: boolean;
}) {
  return (
    <View
      style={[
        styles.paymentMethod,
        !enabled &&
          styles.paymentMethodDisabled,
      ]}
    >
      <Ionicons
        name={icon}
        size={17}
      />

      <Text
        style={[
          styles.paymentMethodText,
          !enabled &&
            styles.paymentMethodTextDisabled,
        ]}
      >
        {label}
      </Text>

      <Ionicons
        name={
          enabled
            ? "checkmark-circle"
            : "close-circle-outline"
        }
        size={17}
      />
    </View>
  );
}

function ManagementRow({
  icon,
  title,
  subtitle,
  onPress,
  last,
}: {
  icon: any;
  title: string;
  subtitle: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.managementRow,
        last &&
          styles.managementRowLast,
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View
        style={styles.managementIcon}
      >
        <Ionicons
          name={icon}
          size={21}
        />
      </View>

      <View
        style={styles.managementContent}
      >
        <Text
          style={styles.managementTitle}
        >
          {title}
        </Text>

        <Text
          style={
            styles.managementSubtitle
          }
        >
          {subtitle}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f6f8",
  },

  container: {
    flex: 1,
  },

  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 45,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },

  loadingIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  loadingTitle: {
    marginTop: 14,
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
  },

  loadingText: {
    marginTop: 5,
    fontSize: 13,
    color: "#64748b",
  },

  accessContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },

  accessIcon: {
    width: 92,
    height: 92,
    borderRadius: 30,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  accessTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },

  accessText: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 23,
    color: "#64748b",
    textAlign: "center",
    maxWidth: 420,
  },

  primaryButton: {
    marginTop: 25,
    backgroundColor: "#dc2626",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 13,
  },

  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },

  secondaryButton: {
    marginTop: 25,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 13,
    backgroundColor: "#ffffff",
  },

  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  headerLogo: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  headerSmall: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    color: "#dc2626",
  },

  headerTitle: {
    marginTop: 2,
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
  },

  refreshButton: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#edf0f3",
  },

  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff7f7",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },

  errorIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },

  errorContent: {
    flex: 1,
    marginLeft: 10,
  },

  errorTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#991b1b",
  },

  errorText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: "#7f1d1d",
  },

  retryText: {
    marginLeft: 9,
    fontSize: 12,
    fontWeight: "900",
    color: "#dc2626",
  },

  setupCard: {
    backgroundColor: "#ffffff",
    borderRadius: 23,
    padding: 22,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "#edf0f3",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  setupTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  setupIcon: {
    width: 65,
    height: 65,
    borderRadius: 20,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },

  setupBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#dcfce7",
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 10,
  },

  setupBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#166534",
  },

  setupTitle: {
    marginTop: 18,
    fontSize: 23,
    fontWeight: "900",
    color: "#111827",
  },

  setupText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#64748b",
  },

  createButton: {
    marginTop: 20,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#dc2626",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  createButtonText: {
    flex: 1,
    textAlign: "center",
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },

  restaurantHero: {
    backgroundColor: "#ffffff",
    borderRadius: 23,
    padding: 17,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "#edf0f3",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  heroTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  restaurantAvatar: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },

  restaurantMainInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },

  restaurantName: {
    fontSize: 19,
    fontWeight: "900",
    color: "#111827",
  },

  addressLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 4,
    gap: 4,
  },

  restaurantAddress: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: "#64748b",
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 5,
  },

  statusBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  statusBadgeText: {
    fontSize: 10,
    fontWeight: "900",
  },

  heroDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 16,
  },

  heroStats: {
    flexDirection: "row",
    alignItems: "center",
  },

  heroStat: {
    flex: 1,
    alignItems: "center",
  },

  heroStatValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },

  heroStatLabel: {
    marginTop: 2,
    fontSize: 10,
    color: "#64748b",
    fontWeight: "600",
  },

  heroStatDivider: {
    width: 1,
    height: 34,
    backgroundColor: "#e5e7eb",
  },

  heroOpenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 2,
  },

  restaurantInfoButton: {
    marginTop: 15,
    minHeight: 45,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },

  restaurantInfoButtonText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 11,
    marginTop: 3,
  },

  sectionHeaderText: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },

  sectionSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: "#94a3b8",
  },

  sectionAction: {
    fontSize: 12,
    fontWeight: "800",
    color: "#dc2626",
    marginBottom: 2,
  },

  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },

  actionCard: {
    width: "48%",
    minHeight: 135,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#edf0f3",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.035,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  actionIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
  },

  actionCardArrow: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 25,
    height: 25,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },

  actionTitle: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },

  actionSubtitle: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    color: "#64748b",
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginBottom: 21,
  },

  statCard: {
    width: "31.8%",
    minHeight: 107,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#edf0f3",
  },

  statIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },

  statValue: {
    marginTop: 6,
    fontSize: 21,
    fontWeight: "900",
    color: "#111827",
  },

  statLabel: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    textAlign: "center",
  },

  menuOverviewCard: {
    backgroundColor: "#ffffff",
    borderRadius: 19,
    padding: 16,
    marginBottom: 21,
    borderWidth: 1,
    borderColor: "#edf0f3",
  },

  menuOverviewRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  menuOverviewItem: {
    flex: 1,
    alignItems: "center",
  },

  menuNumber: {
    fontSize: 21,
    fontWeight: "900",
    color: "#111827",
  },

  menuLabel: {
    marginTop: 3,
    fontSize: 9,
    color: "#64748b",
    fontWeight: "700",
    textAlign: "center",
  },

  menuDivider: {
    width: 1,
    height: 34,
    backgroundColor: "#e5e7eb",
  },

  manageMenuButton: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  manageMenuTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#dc2626",
  },

  manageMenuSubtitle: {
    marginTop: 3,
    fontSize: 10,
    color: "#94a3b8",
  },

  arrowCircle: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
  },

  statusCard: {
    backgroundColor: "#ffffff",
    borderRadius: 19,
    padding: 17,
    marginBottom: 21,
    borderWidth: 1,
    borderColor: "#edf0f3",
  },

  statusCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  largeStatusIcon: {
    width: 51,
    height: 51,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  statusCardContent: {
    flex: 1,
    marginLeft: 12,
  },

  statusCardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },

  statusCardText: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 17,
    color: "#64748b",
  },

  statusDetails: {
    marginTop: 16,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },

  detailRow: {
    minHeight: 34,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  detailLabel: {
    fontSize: 12,
    color: "#64748b",
  },

  detailValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
  },

  settingsButton: {
    marginTop: 13,
    minHeight: 44,
    borderRadius: 11,
    backgroundColor: "#f8fafc",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  settingsButtonText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
  },

  infoCard: {
    backgroundColor: "#ffffff",
    borderRadius: 19,
    padding: 17,
    marginBottom: 21,
    borderWidth: 1,
    borderColor: "#edf0f3",
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },

  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },

  infoContent: {
    flex: 1,
    marginLeft: 11,
  },

  infoTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
  },

  infoValue: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    color: "#111827",
  },

  outlineButton: {
    minHeight: 44,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  outlineButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
  },

  paymentCard: {
    backgroundColor: "#ffffff",
    borderRadius: 19,
    padding: 17,
    marginBottom: 21,
    borderWidth: 1,
    borderColor: "#edf0f3",
  },

  paymentHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  paymentIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },

  paymentHeaderContent: {
    flex: 1,
    marginLeft: 11,
  },

  paymentTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
  },

  paymentSubtitle: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 17,
    color: "#64748b",
  },

  paymentDetail: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },

  paymentDetailContent: {
    flex: 1,
    marginLeft: 10,
  },

  paymentDetailLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "800",
  },

  paymentDetailValue: {
    marginTop: 3,
    fontSize: 13,
    color: "#111827",
    fontWeight: "900",
  },

  paymentAccountName: {
    marginTop: 2,
    fontSize: 11,
    color: "#64748b",
  },

  paymentMethods: {
    flexDirection: "row",
    gap: 6,
    marginTop: 15,
    marginBottom: 14,
  },

  paymentMethod: {
    flex: 1,
    minHeight: 38,
    borderRadius: 9,
    backgroundColor: "#f0fdf4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },

  paymentMethodDisabled: {
    backgroundColor: "#f8fafc",
  },

  paymentMethodText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#166534",
  },

  paymentMethodTextDisabled: {
    color: "#94a3b8",
  },

  chatCard: {
    backgroundColor: "#ffffff",
    borderRadius: 19,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 21,
    borderWidth: 1,
    borderColor: "#edf0f3",
  },

  chatIcon: {
    width: 51,
    height: 51,
    borderRadius: 15,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },

  chatContent: {
    flex: 1,
    marginLeft: 11,
    marginRight: 8,
  },

  chatTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
  },

  chatText: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 17,
    color: "#64748b",
  },

  managementList: {
    backgroundColor: "#ffffff",
    borderRadius: 19,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#edf0f3",
  },

  managementRow: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },

  managementRowLast: {
    borderBottomWidth: 0,
  },

  managementIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },

  managementContent: {
    flex: 1,
    marginLeft: 11,
    marginRight: 8,
  },

  managementTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#111827",
  },

  managementSubtitle: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 15,
    color: "#64748b",
  },

  bottomSpace: {
    height: 25,
  },
});