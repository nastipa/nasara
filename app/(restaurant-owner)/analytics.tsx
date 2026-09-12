import { Ionicons } from "@expo/vector-icons";
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    ActivityIndicator,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

type AnalyticsPeriod =
  | "daily"
  | "weekly"
  | "monthly";

type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "cancelled";

type OrderStatus =
  | "pending_payment"
  | "paid"
  | "accepted"
  | "rejected"
  | "preparing"
  | "ready_for_pickup"
  | "picked_up"
  | "completed"
  | "cancelled";

type FoodOrder = {
  id: string;
  order_number: string;
  customer_id: string;
  restaurant_id: string;
  customer_name: string | null;
  customer_phone: string;
  food_subtotal: number;
  service_fee: number;
  total_amount: number;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  order_type: "immediate" | "scheduled";
  scheduled_for: string | null;
  customer_note: string | null;
  restaurant_note: string | null;
  rejection_reason: string | null;
  cancellation_reason: string | null;
  paid_at: string | null;
  accepted_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  picked_up_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

type FoodOrderItem = {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  plate_group: string | null;
  created_at: string;
  menu_type:
    | "fixed_plate"
    | "custom_plate"
    | null;
  menu_name: string | null;
};

type BestSellingFood = {
  name: string;
  quantity: number;
  revenue: number;
};

type HourlyOrder = {
  hour: number;
  label: string;
  orders: number;
};

const getStartDate = (
  period: AnalyticsPeriod
): Date => {
  const now = new Date();

  if (period === "daily") {
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    );
  }

  if (period === "weekly") {
    const day = now.getDay();

    const difference =
      day === 0 ? 6 : day - 1;

    const start = new Date(now);

    start.setDate(
      now.getDate() - difference
    );

    start.setHours(
      0,
      0,
      0,
      0
    );

    return start;
  }

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
    0,
    0,
    0,
    0
  );
};

const getPeriodLabel = (
  period: AnalyticsPeriod
): string => {
  if (period === "daily") {
    return "Today";
  }

  if (period === "weekly") {
    return "This Week";
  }

  return "This Month";
};

const formatMoney = (
  amount: number
): string => {
  return `GH₵${Number(
    amount || 0
  ).toFixed(2)}`;
};

const formatHour = (
  hour: number
): string => {
  const suffix =
    hour >= 12 ? "PM" : "AM";

  const displayHour =
    hour % 12 || 12;

  return `${displayHour}:00 ${suffix}`;
};

export default function RestaurantAnalytics() {
  const [period, setPeriod] =
    useState<AnalyticsPeriod>("daily");

  const [orders, setOrders] =
    useState<FoodOrder[]>([]);

  const [orderItems, setOrderItems] =
    useState<FoodOrderItem[]>([]);

  const [restaurantId, setRestaurantId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const startDate = useMemo(
    () => getStartDate(period),
    [period]
  );

  const loadAnalytics = useCallback(
    async (showLoader: boolean = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        const {
          data: {
            user,
          },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          throw new Error(
            "You are not logged in."
          );
        }

        let foundRestaurantId:
          | string
          | null = null;

        /*
         * Find restaurant directly through
         * restaurants.owner_id first.
         */
        const {
          data: restaurant,
          error:
            restaurantError,
        } = await (supabase as any)
          .from("restaurants")
          .select("id")
          .eq("owner_id", user.id)
          .maybeSingle();

        if (restaurantError) {
          console.log(
            "Restaurant lookup error:",
            restaurantError
          );
        }

        if (restaurant?.id) {
          foundRestaurantId =
            restaurant.id;
        }

        /*
         * Fallback to restaurant_owners.
         */
        if (!foundRestaurantId) {
          const {
            data: ownerRecord,
            error: ownerError,
          } = await (supabase as any)
            .from("restaurant_owners")
            .select("restaurant_id")
            .eq(
              "user_id",
              user.id
            )
            .maybeSingle();

          if (ownerError) {
            console.log(
              "Restaurant owner lookup error:",
              ownerError
            );
          }

          if (
            ownerRecord?.restaurant_id
          ) {
            foundRestaurantId =
              ownerRecord.restaurant_id;
          }
        }

        console.log(
          "Analytics restaurant ID:",
          foundRestaurantId
        );

        if (!foundRestaurantId) {
          setRestaurantId(null);
          setOrders([]);
          setOrderItems([]);

          throw new Error(
            "No restaurant was found for this account."
          );
        }

        setRestaurantId(
          foundRestaurantId
        );

        /*
         * Load food orders.
         */
        const {
          data: orderData,
          error: orderError,
        } = await supabase
          .from("food_orders")
          .select(`
            id,
            order_number,
            customer_id,
            restaurant_id,
            customer_name,
            customer_phone,
            food_subtotal,
            service_fee,
            total_amount,
            payment_status,
            order_status,
            order_type,
            scheduled_for,
            customer_note,
            restaurant_note,
            rejection_reason,
            cancellation_reason,
            paid_at,
            accepted_at,
            preparing_at,
            ready_at,
            picked_up_at,
            completed_at,
            cancelled_at,
            created_at,
            updated_at
          `)
          .eq(
            "restaurant_id",
            foundRestaurantId
          )
          .gte(
            "created_at",
            startDate.toISOString()
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

        if (orderError) {
          console.error(
            "FOOD ORDERS ANALYTICS ERROR:",
            orderError
          );

          throw orderError;
        }

        const loadedOrders =
          (orderData ||
            []) as FoodOrder[];

        console.log(
          "Analytics orders found:",
          loadedOrders.length
        );

        setOrders(
          loadedOrders
        );

        /*
         * No orders means no items to load.
         */
        if (
          loadedOrders.length ===
          0
        ) {
          setOrderItems([]);
          return;
        }

        /*
         * Load order items.
         */
        const orderIds =
          loadedOrders.map(
            (order) => order.id
          );

        const {
          data: itemData,
          error: itemError,
        } = await supabase
          .from(
            "food_order_items"
          )
          .select(`
            id,
            order_id,
            menu_item_id,
            quantity,
            unit_price,
            total_price,
            plate_group,
            created_at
          `)
          .in(
            "order_id",
            orderIds
          );

        if (itemError) {
          console.error(
            "FOOD ORDER ITEMS ANALYTICS ERROR:",
            itemError
          );

          setOrderItems([]);
          return;
        }

        const rawItems =
          (itemData ||
            []) as Array<{
            id: string;
            order_id: string;
            menu_item_id:
              | string
              | null;
            quantity: number;
            unit_price: number;
            total_price: number;
            plate_group:
              | string
              | null;
            created_at: string;
          }>;

        console.log(
          "Analytics order items found:",
          rawItems.length
        );

        /*
         * Get menu item information.
         *
         * menu_type is used as a fallback for
         * identifying Fixed Plate orders.
         */
        const menuItemIds =
          Array.from(
            new Set(
              rawItems
                .map(
                  (item) =>
                    item.menu_item_id
                )
                .filter(
                  (
                    id
                  ): id is string =>
                    !!id
                )
            )
          );

        let menuItems:
          Array<{
            id: string;
            name: string;
            menu_type:
              | "fixed_plate"
              | "custom_plate";
          }> = [];

        if (
          menuItemIds.length >
          0
        ) {
          const {
            data: menuData,
            error: menuError,
          } = await supabase
            .from(
              "restaurant_menu_items"
            )
            .select(
              "id, name, menu_type"
            )
            .in(
              "id",
              menuItemIds
            );

          if (menuError) {
            console.error(
              "MENU ITEMS ANALYTICS ERROR:",
              menuError
            );
          } else {
            menuItems =
              (menuData ||
                []) as Array<{
                id: string;
                name: string;
                menu_type:
                  | "fixed_plate"
                  | "custom_plate";
              }>;
          }
        }

        const menuMap =
          new Map(
            menuItems.map(
              (item) => [
                item.id,
                item,
              ]
            )
          );

        /*
         * Enrich order items with menu information.
         */
        const enrichedItems =
          rawItems.map(
            (item) => {
              const menuItem =
                item.menu_item_id
                  ? menuMap.get(
                      item.menu_item_id
                    )
                  : undefined;

              return {
                ...item,
                menu_type:
                  menuItem
                    ?.menu_type ||
                  null,
                menu_name:
                  menuItem
                    ?.name ||
                  null,
              };
            }
          );

        setOrderItems(
          enrichedItems
        );
      } catch (error) {
        console.error(
          "ANALYTICS LOAD ERROR:",
          error
        );

        setOrders([]);
        setOrderItems([]);

        const message =
          error instanceof Error
            ? error.message
            : "Unable to load restaurant analytics.";

        console.log(
          "Analytics error message:",
          message
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [startDate]
  );

  useEffect(() => {
    loadAnalytics(true);
  }, [loadAnalytics]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalytics(false);
  };

  const analytics = useMemo(() => {
    const totalOrders =
      orders.length;

    const completedOrders =
      orders.filter(
        (order) =>
          order.order_status ===
          "completed"
      ).length;

    const pendingOrders =
      orders.filter(
        (order) =>
          order.order_status ===
            "pending_payment" ||
          order.order_status ===
            "paid" ||
          order.order_status ===
            "accepted" ||
          order.order_status ===
            "preparing" ||
          order.order_status ===
            "ready_for_pickup" ||
          order.order_status ===
            "picked_up"
      ).length;

    const rejectedOrders =
      orders.filter(
        (order) =>
          order.order_status ===
          "rejected"
      ).length;

    const cancelledOrders =
      orders.filter(
        (order) =>
          order.order_status ===
          "cancelled"
      ).length;

    /*
     * Revenue is based on actual paid orders.
     */
    const paidOrders =
      orders.filter(
        (order) =>
          order.payment_status ===
          "paid"
      );

    const revenue =
      paidOrders.reduce(
        (total, order) =>
          total +
          Number(
            order.total_amount || 0
          ),
        0
      );

    const averageOrderValue =
      paidOrders.length > 0
        ? revenue /
          paidOrders.length
        : 0;

    /*
     * =====================================================
     * ORDER TYPE CLASSIFICATION
     * =====================================================
     *
     * Priority:
     *
     * 1. plate_group
     *    -> Prepare My Own Plate
     *
     * 2. menu_type
     *    -> custom_plate
     *    -> Prepare My Own Plate
     *
     * 3. menu_type
     *    -> fixed_plate
     *    -> Fixed Plate
     *
     * This means custom plate data wins if an order
     * contains both types of items.
     */

    const orderTypeMap =
      new Map<
        string,
        "fixed_plate" | "custom_plate"
      >();

    orderItems.forEach(
      (item) => {
        const orderId =
          item.order_id;

        /*
         * Existing custom plate orders have
         * plate_group information.
         *
         * Any non-empty plate_group means
         * Prepare My Own Plate.
         */
        const hasPlateGroup =
          !!item.plate_group &&
          item.plate_group.trim()
            .length > 0;

        if (hasPlateGroup) {
          orderTypeMap.set(
            orderId,
            "custom_plate"
          );

          return;
        }

        /*
         * If menu_type explicitly says custom_plate,
         * classify as Prepare My Own Plate.
         */
        if (
          item.menu_type ===
          "custom_plate"
        ) {
          orderTypeMap.set(
            orderId,
            "custom_plate"
          );

          return;
        }

        /*
         * Fixed Plate is only assigned if the order
         * has not already been identified as custom.
         */
        if (
          item.menu_type ===
          "fixed_plate"
        ) {
          const existingType =
            orderTypeMap.get(
              orderId
            );

          if (
            existingType !==
            "custom_plate"
          ) {
            orderTypeMap.set(
              orderId,
              "fixed_plate"
            );
          }
        }
      }
    );

    /*
     * Create actual order ID sets.
     */
    const fixedOrderIds =
      new Set<string>();

    const customOrderIds =
      new Set<string>();

    orderTypeMap.forEach(
      (type, orderId) => {
        if (
          type ===
          "fixed_plate"
        ) {
          fixedOrderIds.add(
            orderId
          );
        }

        if (
          type ===
          "custom_plate"
        ) {
          customOrderIds.add(
            orderId
          );
        }
      }
    );

    /*
     * Get Fixed Plate orders.
     */
    const fixedPlateOrders =
      orders.filter(
        (order) =>
          fixedOrderIds.has(
            order.id
          )
      );

    /*
     * Get Prepare My Own Plate orders.
     */
    const customPlateOrders =
      orders.filter(
        (order) =>
          customOrderIds.has(
            order.id
          )
      );

    /*
     * Fixed Plate revenue.
     *
     * Always use food_orders.total_amount.
     */
    const fixedPlateRevenue =
      fixedPlateOrders
        .filter(
          (order) =>
            order.payment_status ===
            "paid"
        )
        .reduce(
          (total, order) =>
            total +
            Number(
              order.total_amount ||
                0
            ),
          0
        );

    /*
     * Prepare My Own Plate revenue.
     *
     * Always use food_orders.total_amount.
     */
    const customPlateRevenue =
      customPlateOrders
        .filter(
          (order) =>
            order.payment_status ===
            "paid"
        )
        .reduce(
          (total, order) =>
            total +
            Number(
              order.total_amount ||
                0
            ),
          0
        );

    return {
      totalOrders,
      completedOrders,
      pendingOrders,
      rejectedOrders,
      cancelledOrders,
      rejectedCancelled:
        rejectedOrders +
        cancelledOrders,
      paidOrders:
        paidOrders.length,
      revenue,
      averageOrderValue,

      fixedPlateOrders:
        fixedPlateOrders.length,

      customPlateOrders:
        customPlateOrders.length,

      fixedPlateRevenue,

      customPlateRevenue,
    };
  }, [orders, orderItems]);

  const salesTrend = useMemo(() => {
    const now = new Date();

    if (
      period === "daily"
    ) {
      const hourly: Array<{
        label: string;
        revenue: number;
      }> = [];

      for (
        let hour = 0;
        hour < 24;
        hour++
      ) {
        const revenue =
          orders
            .filter(
              (order) => {
                const date =
                  new Date(
                    order.created_at
                  );

                return (
                  date.getHours() ===
                  hour
                );
              }
            )
            .filter(
              (order) =>
                order.payment_status ===
                "paid"
            )
            .reduce(
              (sum, order) =>
                sum +
                Number(
                  order.total_amount ||
                    0
                ),
              0
            );

        hourly.push({
          label:
            formatHour(hour),
          revenue,
        });
      }

      return hourly;
    }

    if (
      period === "weekly"
    ) {
      const days: Array<{
        label: string;
        revenue: number;
      }> = [];

      const monday =
        getStartDate(
          "weekly"
        );

      for (
        let i = 0;
        i < 7;
        i++
      ) {
        const date =
          new Date(monday);

        date.setDate(
          monday.getDate() + i
        );

        const revenue =
          orders
            .filter(
              (order) => {
                const orderDate =
                  new Date(
                    order.created_at
                  );

                return (
                  orderDate.getFullYear() ===
                    date.getFullYear() &&
                  orderDate.getMonth() ===
                    date.getMonth() &&
                  orderDate.getDate() ===
                    date.getDate()
                );
              }
            )
            .filter(
              (order) =>
                order.payment_status ===
                "paid"
            )
            .reduce(
              (sum, order) =>
                sum +
                Number(
                  order.total_amount ||
                    0
                ),
              0
            );

        days.push({
          label:
            date.toLocaleDateString(
              "en-US",
              {
                weekday:
                  "short",
              }
            ),
          revenue,
        });
      }

      return days;
    }

    const daysInMonth =
      new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
      ).getDate();

    const monthly: Array<{
      label: string;
      revenue: number;
    }> = [];

    for (
      let day = 1;
      day <= daysInMonth;
      day++
    ) {
      const revenue =
        orders
          .filter(
            (order) => {
              const date =
                new Date(
                  order.created_at
                );

              return (
                date.getDate() ===
                  day &&
                date.getMonth() ===
                  now.getMonth() &&
                date.getFullYear() ===
                  now.getFullYear()
              );
            }
          )
          .filter(
            (order) =>
              order.payment_status ===
              "paid"
          )
          .reduce(
            (sum, order) =>
              sum +
              Number(
                order.total_amount ||
                  0
              ),
            0
          );

      monthly.push({
        label: String(day),
        revenue,
      });
    }

    return monthly;
  }, [orders, period]);

  const bestSellingFoods =
    useMemo<BestSellingFood[]>(
      () => {
        const map =
          new Map<
            string,
            BestSellingFood
          >();

        orderItems.forEach(
          (item) => {
            const name =
              item.menu_name ||
              "Unknown food";

            const existing =
              map.get(name);

            if (existing) {
              existing.quantity +=
                Number(
                  item.quantity ||
                    0
                );

              existing.revenue +=
                Number(
                  item.total_price ||
                    0
                );
            } else {
              map.set(name, {
                name,
                quantity:
                  Number(
                    item.quantity ||
                      0
                  ),
                revenue:
                  Number(
                    item.total_price ||
                      0
                  ),
              });
            }
          }
        );

        return Array.from(
          map.values()
        )
          .sort(
            (a, b) =>
              b.quantity -
              a.quantity
          )
          .slice(0, 5);
      },
      [orderItems]
    );

  const busiestHours =
    useMemo<HourlyOrder[]>(
      () => {
        const hours: HourlyOrder[] =
          [];

        for (
          let hour = 0;
          hour < 24;
          hour++
        ) {
          const count =
            orders.filter(
              (order) => {
                const date =
                  new Date(
                    order.created_at
                  );

                return (
                  date.getHours() ===
                  hour
                );
              }
            ).length;

          hours.push({
            hour,
            label:
              formatHour(hour),
            orders: count,
          });
        }

        return hours
          .filter(
            (item) =>
              item.orders > 0
          )
          .sort(
            (a, b) =>
              b.orders -
              a.orders
          )
          .slice(0, 5);
      },
      [orders]
    );

  const maxSalesValue =
    Math.max(
      ...salesTrend.map(
        (item) =>
          item.revenue
      ),
      1
    );

  const maxFoodQuantity =
    Math.max(
      ...bestSellingFoods.map(
        (item) =>
          item.quantity
      ),
      1
    );

  const periodButtons: Array<{
    value: AnalyticsPeriod;
    label: string;
  }> = [
    {
      value: "daily",
      label: "Daily",
    },
    {
      value: "weekly",
      label: "Weekly",
    },
    {
      value: "monthly",
      label: "Monthly",
    },
  ];

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
            onRefresh={
              handleRefresh
            }
          />
        }
      >
        <View
          style={styles.header}
        >
          <View
            style={styles.headerText}
          >
            <Text
              style={styles.title}
            >
              Analytics
            </Text>

            <Text
              style={styles.subtitle}
            >
              {getPeriodLabel(
                period
              )}{" "}
              restaurant performance
            </Text>
          </View>

          <TouchableOpacity
            style={
              styles.refreshButton
            }
            onPress={
              handleRefresh
            }
          >
            <Ionicons
              name="refresh-outline"
              size={21}
              color="#111827"
            />
          </TouchableOpacity>
        </View>

        <View
          style={styles.filterCard}
        >
          <View
            style={
              styles.filterHeader
            }
          >
            <View
              style={styles.filterIcon}
            >
              <Ionicons
                name="calendar-outline"
                size={17}
                color="#E11D48"
              />
            </View>

            <View>
              <Text
                style={
                  styles.filterTitle
                }
              >
                Analytics Period
              </Text>

              <Text
                style={
                  styles.filterSubtitle
                }
              >
                Choose the reporting period
              </Text>
            </View>
          </View>

          <View
            style={styles.periodRow}
          >
            {periodButtons.map(
              (button) => {
                const active =
                  period ===
                  button.value;

                return (
                  <TouchableOpacity
                    key={
                      button.value
                    }
                    style={[
                      styles.periodButton,
                      active &&
                        styles.periodButtonActive,
                    ]}
                    onPress={() =>
                      setPeriod(
                        button.value
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.periodButtonText,
                        active &&
                          styles.periodButtonTextActive,
                      ]}
                    >
                      {button.label}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
          </View>
        </View>

        {loading ? (
          <View
            style={
              styles.loadingContainer
            }
          >
            <ActivityIndicator
              size="large"
              color="#E11D48"
            />

            <Text
              style={
                styles.loadingText
              }
            >
              Loading analytics...
            </Text>
          </View>
        ) : (
          <>
            <View
              style={
                styles.sectionHeader
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Overview
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Key restaurant performance
              </Text>
            </View>

            <View
              style={styles.statsGrid}
            >
              <View
                style={[
                  styles.statCard,
                  styles.revenueCard,
                ]}
              >
                <View
                  style={[
                    styles.statIcon,
                    styles.revenueIcon,
                  ]}
                >
                  <Ionicons
                    name="cash-outline"
                    size={20}
                    color="#16A34A"
                  />
                </View>

                <Text
                  style={
                    styles.statLabel
                  }
                >
                  Revenue
                </Text>

                <Text
                  style={[
                    styles.statValue,
                    styles.revenueValue,
                  ]}
                >
                  {formatMoney(
                    analytics.revenue
                  )}
                </Text>

                <Text
                  style={
                    styles.statHint
                  }
                >
                  Actual paid order revenue
                </Text>
              </View>

              <View
                style={
                  styles.statCard
                }
              >
                <View
                  style={[
                    styles.statIcon,
                    styles.ordersIcon,
                  ]}
                >
                  <Ionicons
                    name="receipt-outline"
                    size={20}
                    color="#2563EB"
                  />
                </View>

                <Text
                  style={
                    styles.statLabel
                  }
                >
                  Total Orders
                </Text>

                <Text
                  style={
                    styles.statValue
                  }
                >
                  {
                    analytics.totalOrders
                  }
                </Text>

                <Text
                  style={
                    styles.statHint
                  }
                >
                  Orders received
                </Text>
              </View>

              <View
                style={
                  styles.statCard
                }
              >
                <View
                  style={[
                    styles.statIcon,
                    styles.completedIcon,
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color="#16A34A"
                  />
                </View>

                <Text
                  style={
                    styles.statLabel
                  }
                >
                  Completed
                </Text>

                <Text
                  style={
                    styles.statValue
                  }
                >
                  {
                    analytics.completedOrders
                  }
                </Text>

                <Text
                  style={
                    styles.statHint
                  }
                >
                  Successfully completed
                </Text>
              </View>

              <View
                style={
                  styles.statCard
                }
              >
                <View
                  style={[
                    styles.statIcon,
                    styles.pendingIcon,
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color="#D97706"
                  />
                </View>

                <Text
                  style={
                    styles.statLabel
                  }
                >
                  Pending
                </Text>

                <Text
                  style={
                    styles.statValue
                  }
                >
                  {
                    analytics.pendingOrders
                  }
                </Text>

                <Text
                  style={
                    styles.statHint
                  }
                >
                  Requires action
                </Text>
              </View>

              <View
                style={
                  styles.statCard
                }
              >
                <View
                  style={[
                    styles.statIcon,
                    styles.rejectedIcon,
                  ]}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={20}
                    color="#DC2626"
                  />
                </View>

                <Text
                  style={
                    styles.statLabel
                  }
                >
                  Rejected / Cancelled
                </Text>

                <Text
                  style={
                    styles.statValue
                  }
                >
                  {
                    analytics.rejectedCancelled
                  }
                </Text>

                <Text
                  style={
                    styles.statHint
                  }
                >
                  Orders not completed
                </Text>
              </View>

              <View
                style={
                  styles.statCard
                }
              >
                <View
                  style={[
                    styles.statIcon,
                    styles.averageIcon,
                  ]}
                >
                  <Ionicons
                    name="trending-up-outline"
                    size={20}
                    color="#7C3AED"
                  />
                </View>

                <Text
                  style={
                    styles.statLabel
                  }
                >
                  Average Order
                </Text>

                <Text
                  style={[
                    styles.statValue,
                    styles.smallStatValue,
                  ]}
                >
                  {formatMoney(
                    analytics.averageOrderValue
                  )}
                </Text>

                <Text
                  style={
                    styles.statHint
                  }
                >
                  Per paid order
                </Text>
              </View>
            </View>

            <View
              style={
                styles.sectionHeader
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Sales Over Time
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Paid revenue during{" "}
                {getPeriodLabel(
                  period
                ).toLowerCase()}
              </Text>
            </View>

            <View
              style={styles.chartCard}
            >
              <View
                style={
                  styles.chartSummary
                }
              >
                <View>
                  <Text
                    style={
                      styles.chartSummaryLabel
                    }
                  >
                    Total Revenue
                  </Text>

                  <Text
                    style={
                      styles.chartSummaryValue
                    }
                  >
                    {formatMoney(
                      analytics.revenue
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.chartSummaryBadge
                  }
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={14}
                    color="#16A34A"
                  />

                  <Text
                    style={
                      styles.chartSummaryBadgeText
                    }
                  >
                    Paid
                  </Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={
                  false
                }
                contentContainerStyle={
                  styles.salesChart
                }
              >
                {salesTrend.map(
                  (
                    item,
                    index
                  ) => {
                    const height =
                      Math.max(
                        5,
                        (item.revenue /
                          maxSalesValue) *
                          120
                      );

                    return (
                      <View
                        key={`${item.label}-${index}`}
                        style={
                          styles.salesBarColumn
                        }
                      >
                        <Text
                          style={
                            styles.salesBarValue
                          }
                        >
                          {item.revenue >
                          0
                            ? formatMoney(
                                item.revenue
                              )
                            : ""}
                        </Text>

                        <View
                          style={
                            styles.salesBarArea
                          }
                        >
                          <View
                            style={[
                              styles.salesBar,
                              {
                                height,
                              },
                            ]}
                          />
                        </View>

                        <Text
                          style={
                            styles.salesBarLabel
                          }
                        >
                          {item.label}
                        </Text>
                      </View>
                    );
                  }
                )}
              </ScrollView>
            </View>

            <View
              style={
                styles.sectionHeader
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Best-Selling Foods
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Top food items by quantity sold
              </Text>
            </View>

            <View
              style={styles.listCard}
            >
              {bestSellingFoods.length ===
              0 ? (
                <View
                  style={
                    styles.emptyAnalytics
                  }
                >
                  <Ionicons
                    name="restaurant-outline"
                    size={30}
                    color="#9CA3AF"
                  />

                  <Text
                    style={
                      styles.emptyTitle
                    }
                  >
                    No food sales yet
                  </Text>

                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    Food performance will appear
                    here after orders are placed.
                  </Text>
                </View>
              ) : (
                bestSellingFoods.map(
                  (
                    food,
                    index
                  ) => {
                    const width =
                      (food.quantity /
                        maxFoodQuantity) *
                      100;

                    return (
                      <View
                        key={food.name}
                        style={
                          styles.foodRow
                        }
                      >
                        <View
                          style={
                            styles.foodRank
                          }
                        >
                          <Text
                            style={
                              styles.foodRankText
                            }
                          >
                            {index + 1}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.foodContent
                          }
                        >
                          <View
                            style={
                              styles.foodTitleRow
                            }
                          >
                            <Text
                              style={
                                styles.foodName
                              }
                              numberOfLines={
                                1
                              }
                            >
                              {food.name}
                            </Text>

                            <Text
                              style={
                                styles.foodQuantity
                              }
                            >
                              {
                                food.quantity
                              }{" "}
                              sold
                            </Text>
                          </View>

                          <View
                            style={
                              styles.foodBarBackground
                            }
                          >
                            <View
                              style={[
                                styles.foodBar,
                                {
                                  width: `${width}%`,
                                },
                              ]}
                            />
                          </View>

                          <Text
                            style={
                              styles.foodRevenue
                            }
                          >
                            {formatMoney(
                              food.revenue
                            )}
                          </Text>
                        </View>
                      </View>
                    );
                  }
                )
              )}
            </View>

            <View
              style={
                styles.sectionHeader
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Busiest Ordering Times
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Hours with the most orders
              </Text>
            </View>

            <View
              style={styles.listCard}
            >
              {busiestHours.length ===
              0 ? (
                <View
                  style={
                    styles.emptyAnalytics
                  }
                >
                  <Ionicons
                    name="time-outline"
                    size={30}
                    color="#9CA3AF"
                  />

                  <Text
                    style={
                      styles.emptyTitle
                    }
                  >
                    No ordering activity
                  </Text>

                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    Busy hours will appear here
                    when customers place orders.
                  </Text>
                </View>
              ) : (
                busiestHours.map(
                  (
                    item,
                    index
                  ) => (
                    <View
                      key={item.hour}
                      style={
                        styles.busyHourRow
                      }
                    >
                      <View
                        style={
                          styles.busyHourRank
                        }
                      >
                        <Text
                          style={
                            styles.busyHourRankText
                          }
                        >
                          {index + 1}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.busyHourIcon
                        }
                      >
                        <Ionicons
                          name="time-outline"
                          size={18}
                          color="#D97706"
                        />
                      </View>

                      <Text
                        style={
                          styles.busyHourLabel
                        }
                      >
                        {item.label}
                      </Text>

                      <View
                        style={
                          styles.busyHourCount
                        }
                      >
                        <Text
                          style={
                            styles.busyHourCountText
                          }
                        >
                          {item.orders}
                        </Text>

                        <Text
                          style={
                            styles.busyHourCountLabel
                          }
                        >
                          orders
                        </Text>
                      </View>
                    </View>
                  )
                )
              )}
            </View>

            <View
              style={
                styles.sectionHeader
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Order Type Performance
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Fixed Plate vs Prepare My Own Plate
              </Text>
            </View>

            <View
              style={styles.typeCard}
            >
              <View
                style={
                  styles.typePerformanceRow
                }
              >
                <View
                  style={
                    styles.typePerformanceItem
                  }
                >
                  <View
                    style={[
                      styles.typeIcon,
                      styles.fixedTypeIcon,
                    ]}
                  >
                    <Ionicons
                      name="restaurant-outline"
                      size={20}
                      color="#2563EB"
                    />
                  </View>

                  <Text
                    style={
                      styles.typeLabel
                    }
                  >
                    Prepare My Own Plate
                  </Text>

                  <Text
                    style={
                      styles.typeOrders
                    }
                  >
                    {
                      analytics.fixedPlateOrders
                    }{" "}
                    orders
                  </Text>

                  <Text
                    style={
                      styles.typeRevenue
                    }
                  >
                    {formatMoney(
                      analytics.fixedPlateRevenue
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.typeDivider
                  }
                />

                <View
                  style={
                    styles.typePerformanceItem
                  }
                >
                  <View
                    style={[
                      styles.typeIcon,
                      styles.customTypeIcon,
                    ]}
                  >
                    <Ionicons
                      name="create-outline"
                      size={20}
                      color="#E11D48"
                    />
                  </View>

                  <Text
                    style={
                      styles.typeLabel
                    }
                  >
                   Fixed Plate
                  </Text>

                  <Text
                    style={
                      styles.typeOrders
                    }
                  >
                    {
                      analytics.customPlateOrders
                    }{" "}
                    orders
                  </Text>

                  <Text
                    style={
                      styles.typeRevenue
                    }
                  >
                    {formatMoney(
                      analytics.customPlateRevenue
                    )}
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={
                styles.sectionHeader
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Order Status
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Current order performance
              </Text>
            </View>

            <View
              style={
                styles.statusCard
              }
            >
              <View
                style={
                  styles.statusRow
                }
              >
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        "#16A34A",
                    },
                  ]}
                />

                <Text
                  style={
                    styles.statusLabel
                  }
                >
                  Completed
                </Text>

                <Text
                  style={
                    styles.statusNumber
                  }
                >
                  {
                    analytics.completedOrders
                  }
                </Text>
              </View>

              <View
                style={
                  styles.statusRow
                }
              >
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        "#D97706",
                    },
                  ]}
                />

                <Text
                  style={
                    styles.statusLabel
                  }
                >
                  Pending
                </Text>

                <Text
                  style={
                    styles.statusNumber
                  }
                >
                  {
                    analytics.pendingOrders
                  }
                </Text>
              </View>

              <View
                style={
                  styles.statusRow
                }
              >
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        "#DC2626",
                    },
                  ]}
                />

                <Text
                  style={
                    styles.statusLabel
                  }
                >
                  Rejected
                </Text>

                <Text
                  style={
                    styles.statusNumber
                  }
                >
                  {
                    analytics.rejectedOrders
                  }
                </Text>
              </View>

              <View
                style={
                  styles.statusRow
                }
              >
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        "#6B7280",
                    },
                  ]}
                />

                <Text
                  style={
                    styles.statusLabel
                  }
                >
                  Cancelled
                </Text>

                <Text
                  style={
                    styles.statusNumber
                  }
                >
                  {
                    analytics.cancelledOrders
                  }
                </Text>
              </View>
            </View>

            <View
              style={
                styles.bottomSummary
              }
            >
              <Ionicons
                name="analytics-outline"
                size={18}
                color="#9CA3AF"
              />

              <Text
                style={
                  styles.bottomSummaryText
                }
              >
                Analytics for{" "}
                {getPeriodLabel(
                  period
                ).toLowerCase()}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
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

  contentContainer: {
    padding: 16,
    paddingBottom: 50,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 27,
    fontWeight: "900",
    color: "#111827",
  },

  subtitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
  },

  refreshButton: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginLeft: 12,
  },

  filterCard: {
    padding: 15,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 22,
  },

  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  filterIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF1F2",
  },

  filterTitle: {
    marginLeft: 9,
    fontSize: 13,
    fontWeight: "900",
    color: "#111827",
  },

  filterSubtitle: {
    marginLeft: 9,
    marginTop: 2,
    fontSize: 11,
    color: "#9CA3AF",
  },

  periodRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 13,
  },

  periodButton: {
    flex: 1,
    minHeight: 43,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  periodButtonActive: {
    backgroundColor: "#E11D48",
    borderColor: "#E11D48",
  },

  periodButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
  },

  periodButtonTextActive: {
    color: "#FFFFFF",
  },

  loadingContainer: {
    minHeight: 350,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },

  sectionHeader: {
    marginBottom: 11,
    marginTop: 3,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },

  sectionSubtitle: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "500",
    color: "#9CA3AF",
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },

  statCard: {
    width: "48%",
    minHeight: 150,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  revenueCard: {
    width: "100%",
    minHeight: 165,
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },

  statIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  revenueIcon: {
    backgroundColor: "#DCFCE7",
  },

  ordersIcon: {
    backgroundColor: "#DBEAFE",
  },

  completedIcon: {
    backgroundColor: "#DCFCE7",
  },

  pendingIcon: {
    backgroundColor: "#FEF3C7",
  },

  rejectedIcon: {
    backgroundColor: "#FEE2E2",
  },

  averageIcon: {
    backgroundColor: "#EDE9FE",
  },

  statLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
  },

  statValue: {
    marginTop: 5,
    fontSize: 25,
    fontWeight: "900",
    color: "#111827",
  },

  revenueValue: {
    fontSize: 30,
    color: "#15803D",
  },

  smallStatValue: {
    fontSize: 19,
  },

  statHint: {
    marginTop: 5,
    fontSize: 10,
    fontWeight: "600",
    color: "#9CA3AF",
  },

  chartCard: {
    padding: 15,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 24,
  },

  chartSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  chartSummaryLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
  },

  chartSummaryValue: {
    marginTop: 3,
    fontSize: 21,
    fontWeight: "900",
    color: "#111827",
  },

  chartSummaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#DCFCE7",
    gap: 4,
  },

  chartSummaryBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803D",
  },

  salesChart: {
    alignItems: "flex-end",
    paddingTop: 5,
    paddingBottom: 3,
    paddingHorizontal: 5,
  },

  salesBarColumn: {
    width: 54,
    alignItems: "center",
    marginRight: 8,
  },

  salesBarValue: {
    height: 25,
    fontSize: 7,
    fontWeight: "700",
    color: "#6B7280",
    textAlign: "center",
  },

  salesBarArea: {
    height: 125,
    width: 30,
    justifyContent: "flex-end",
    alignItems: "center",
  },

  salesBar: {
    width: 22,
    minHeight: 5,
    borderRadius: 8,
    backgroundColor: "#E11D48",
  },

  salesBarLabel: {
    marginTop: 7,
    fontSize: 9,
    fontWeight: "700",
    color: "#6B7280",
    textAlign: "center",
  },

  listCard: {
    padding: 14,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 24,
  },

  foodRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },

  foodRank: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF1F2",
  },

  foodRankText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#E11D48",
  },

  foodContent: {
    flex: 1,
    marginLeft: 10,
  },

  foodTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  foodName: {
    flex: 1,
    marginRight: 8,
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },

  foodQuantity: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6B7280",
  },

  foodBarBackground: {
    height: 7,
    marginTop: 7,
    borderRadius: 7,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },

  foodBar: {
    height: "100%",
    borderRadius: 7,
    backgroundColor: "#E11D48",
  },

  foodRevenue: {
    marginTop: 5,
    fontSize: 10,
    fontWeight: "800",
    color: "#16A34A",
  },

  busyHourRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },

  busyHourRank: {
    width: 27,
    height: 27,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7ED",
  },

  busyHourRankText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#D97706",
  },

  busyHourIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 9,
    backgroundColor: "#FEF3C7",
  },

  busyHourLabel: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },

  busyHourCount: {
    alignItems: "flex-end",
  },

  busyHourCountText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },

  busyHourCountLabel: {
    marginTop: 1,
    fontSize: 9,
    fontWeight: "600",
    color: "#9CA3AF",
  },

  typeCard: {
    padding: 15,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 24,
  },

  typePerformanceRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },

  typePerformanceItem: {
    flex: 1,
    alignItems: "center",
  },

  typeDivider: {
    width: 1,
    marginHorizontal: 12,
    backgroundColor: "#E5E7EB",
  },

  typeIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },

  fixedTypeIcon: {
    backgroundColor: "#DBEAFE",
  },

  customTypeIcon: {
    backgroundColor: "#FFF1F2",
  },

  typeLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#374151",
    textAlign: "center",
  },

  typeOrders: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
  },

  typeRevenue: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
  },

  statusCard: {
    padding: 14,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 24,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },

  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 10,
  },

  statusLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },

  statusNumber: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },

  emptyAnalytics: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 25,
  },

  emptyTitle: {
    marginTop: 9,
    fontSize: 14,
    fontWeight: "900",
    color: "#374151",
  },

  emptyText: {
    marginTop: 4,
    maxWidth: 280,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 17,
    color: "#9CA3AF",
    textAlign: "center",
  },

  bottomSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 7,
  },

  bottomSummaryText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#9CA3AF",
  },
});