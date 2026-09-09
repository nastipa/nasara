import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    Platform,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

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

type FilterType =
  | "all"
  | "new"
  | "preparing"
  | "ready"
  | "completed";

type RestaurantOwner = {
  id: string;
  user_id: string;
  restaurant_id: string | null;
  status: "active" | "inactive" | "suspended";
};

type Restaurant = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  phone: string;
  address: string;
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
  item_name: string;
  item_description: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
};

type FoodPayment = {
  id: string;
  order_id: string;
  customer_id: string;
  restaurant_id: string;
  payment_reference: string;
  amount: number;
  payment_method:
    | "momo"
    | "cash"
    | "card"
    | "bank_transfer";
  momo_provider: string | null;
  momo_number: string | null;
  transaction_reference: string | null;
  status: PaymentStatus;
  payment_note: string | null;
  paid_at: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

type MenuImage = {
  id: string;
  image_url: string | null;
};

function showMessage(title: string, message?: string) {
  if (Platform.OS === "web") {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }

  Alert.alert(title, message);
}

function formatMoney(value: number) {
  return `GH₵${Number(value || 0).toFixed(2)}`;
}

function formatDate(dateString: string) {
  try {
    return new Date(dateString).toLocaleString("en-GH", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return dateString;
  }
}

function getStatusLabel(status: OrderStatus) {
  switch (status) {
    case "pending_payment":
      return "Payment Pending";
    case "paid":
      return "Payment Approved";
    case "accepted":
      return "Accepted";
    case "rejected":
      return "Rejected";
    case "preparing":
      return "Preparing";
    case "ready_for_pickup":
      return "Ready for Pickup";
    case "picked_up":
      return "Picked Up";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

function getStatusIcon(status: OrderStatus) {
  switch (status) {
    case "pending_payment":
      return "time-outline";
    case "paid":
      return "checkmark-circle-outline";
    case "accepted":
      return "checkmark-done-outline";
    case "preparing":
      return "restaurant-outline";
    case "ready_for_pickup":
      return "bag-check-outline";
    case "picked_up":
      return "hand-left-outline";
    case "completed":
      return "checkmark-done-circle-outline";
    case "rejected":
      return "close-circle-outline";
    case "cancelled":
      return "ban-outline";
    default:
      return "ellipse-outline";
  }
}

function getPaymentStatusLabel(status: PaymentStatus) {
  switch (status) {
    case "pending":
      return "Payment Pending";
    case "paid":
      return "Payment Approved";
    case "failed":
      return "Payment Failed";
    case "refunded":
      return "Refunded";
    case "cancelled":
      return "Payment Cancelled";
    default:
      return status;
  }
}

export default function RestaurantOrdersScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  const [owner, setOwner] =
    useState<RestaurantOwner | null>(null);

  const [restaurant, setRestaurant] =
    useState<Restaurant | null>(null);

  const [orders, setOrders] = useState<FoodOrder[]>([]);

  const [orderItems, setOrderItems] = useState<
    Record<string, FoodOrderItem[]>
  >({});

  const [payments, setPayments] = useState<
    Record<string, FoodPayment[]>
  >({});

  const [menuImages, setMenuImages] = useState<
    Record<string, string | null>
  >({});

  const [filter, setFilter] =
    useState<FilterType>("all");

  const [selectedOrder, setSelectedOrder] =
    useState<FoodOrder | null>(null);

  const [showOrderModal, setShowOrderModal] =
    useState(false);

  const [rejectionReason, setRejectionReason] =
    useState("");

  const [restaurantNote, setRestaurantNote] =
    useState("");

  const loadOrders = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          setOwner(null);
          setRestaurant(null);
          setOrders([]);
          return;
        }

        const { data: ownerData, error: ownerError } =
          await supabase
            .from("restaurant_owners")
            .select(
              "id,user_id,restaurant_id,status"
            )
            .eq("user_id", user.id)
            .maybeSingle();

        if (ownerError) {
          throw ownerError;
        }

        if (!ownerData) {
          setOwner(null);
          setRestaurant(null);
          setOrders([]);

          showMessage(
            "Restaurant Account",
            "Your restaurant owner account could not be found."
          );

          return;
        }

        const restaurantOwner =
          ownerData as RestaurantOwner;

        setOwner(restaurantOwner);

        if (restaurantOwner.status !== "active") {
          setRestaurant(null);
          setOrders([]);

          showMessage(
            "Access Restricted",
            "Your restaurant owner account is not currently active."
          );

          return;
        }

        let restaurantData: Restaurant | null =
          null;

        if (restaurantOwner.restaurant_id) {
          const { data, error } = await supabase
            .from("restaurants")
            .select(
              `
              id,
              owner_id,
              name,
              description,
              phone,
              address,
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
              `
            )
            .eq(
              "id",
              restaurantOwner.restaurant_id
            )
            .maybeSingle();

          if (error) {
            throw error;
          }

          restaurantData =
            data as Restaurant | null;
        }

        if (!restaurantData) {
          const { data, error } = await supabase
            .from("restaurants")
            .select(
              `
              id,
              owner_id,
              name,
              description,
              phone,
              address,
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
              `
            )
            .eq("owner_id", user.id)
            .maybeSingle();

          if (error) {
            throw error;
          }

          restaurantData =
            data as Restaurant | null;

          if (
            restaurantData &&
            restaurantOwner.restaurant_id !==
              restaurantData.id
          ) {
            await (supabase as any)
              .from("restaurant_owners")
              .update({
                restaurant_id: restaurantData.id,
              })
              .eq("user_id", user.id);

            setOwner({
              ...restaurantOwner,
              restaurant_id: restaurantData.id,
            });
          }
        }

        setRestaurant(restaurantData);

        if (!restaurantData) {
          setOrders([]);
          setOrderItems({});
          setPayments({});
          setMenuImages({});
          return;
        }

        const {
          data: orderData,
          error: orderError,
        } = await supabase
          .from("food_orders")
          .select(
            `
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
            `
          )
          .eq(
            "restaurant_id",
            restaurantData.id
          )
          .order("created_at", {
            ascending: false,
          });

        if (orderError) {
          throw orderError;
        }

        const loadedOrders =
          (orderData || []) as FoodOrder[];

        setOrders(loadedOrders);

        if (loadedOrders.length === 0) {
          setOrderItems({});
          setPayments({});
          setMenuImages({});
          return;
        }

        const orderIds = loadedOrders.map(
          (order) => order.id
        );

        const {
          data: itemData,
          error: itemError,
        } = await supabase
          .from("food_order_items")
          .select(
            `
            id,
            order_id,
            menu_item_id,
            item_name,
            item_description,
            quantity,
            unit_price,
            total_price,
            created_at
            `
          )
          .in("order_id", orderIds)
          .order("created_at", {
            ascending: true,
          });

        if (itemError) {
          throw itemError;
        }

        const itemsByOrder: Record<
          string,
          FoodOrderItem[]
        > = {};

        const loadedItems =
          (itemData || []) as FoodOrderItem[];

        loadedItems.forEach((item) => {
          if (!itemsByOrder[item.order_id]) {
            itemsByOrder[item.order_id] = [];
          }

          itemsByOrder[item.order_id].push(item);
        });

        setOrderItems(itemsByOrder);

        const {
          data: paymentData,
          error: paymentError,
        } = await supabase
          .from("food_payments")
          .select(
            `
            id,
            order_id,
            customer_id,
            restaurant_id,
            payment_reference,
            amount,
            payment_method,
            momo_provider,
            momo_number,
            transaction_reference,
            status,
            payment_note,
            paid_at,
            confirmed_by,
            confirmed_at,
            created_at,
            updated_at
            `
          )
          .in("order_id", orderIds)
          .order("created_at", {
            ascending: false,
          });

        if (paymentError) {
          throw paymentError;
        }

        const paymentsByOrder: Record<
          string,
          FoodPayment[]
        > = {};

        const loadedPayments =
          (paymentData || []) as FoodPayment[];

        loadedPayments.forEach((payment) => {
          if (!paymentsByOrder[payment.order_id]) {
            paymentsByOrder[payment.order_id] = [];
          }

          paymentsByOrder[payment.order_id].push(
            payment
          );
        });

        setPayments(paymentsByOrder);

        const menuItemIds = Array.from(
          new Set(
            loadedItems
              .map((item) => item.menu_item_id)
              .filter(
                (id): id is string => Boolean(id)
              )
          )
        );

        if (menuItemIds.length > 0) {
          const {
            data: menuData,
            error: menuError,
          } = await supabase
            .from("restaurant_menu_items")
            .select("id,image_url")
            .in("id", menuItemIds);

          if (menuError) {
            throw menuError;
          }

          const imageMap: Record<
            string,
            string | null
          > = {};

          ((menuData || []) as MenuImage[]).forEach(
            (item) => {
              imageMap[item.id] = item.image_url;
            }
          );

          setMenuImages(imageMap);
        } else {
          setMenuImages({});
        }
      } catch (error: any) {
        console.error(
          "Restaurant orders load error:",
          error
        );

        showMessage(
          "Unable to Load Orders",
          error?.message ||
            "Something went wrong while loading restaurant orders."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadOrders(true);
  }, [loadOrders]);

  useEffect(() => {
    if (!restaurant?.id) {
      return;
    }

    const channel = supabase
      .channel(
        `restaurant-food-orders-${restaurant.id}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "food_orders",
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        () => {
          loadOrders(false);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "food_payments",
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        () => {
          loadOrders(false);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "food_order_items",
        },
        () => {
          loadOrders(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurant?.id, loadOrders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders(false);
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    switch (filter) {
      case "new":
        return orders.filter(
          (order) =>
            order.order_status ===
              "pending_payment" ||
            order.order_status === "paid"
        );

      case "preparing":
        return orders.filter(
          (order) =>
            order.order_status === "accepted" ||
            order.order_status === "preparing"
        );

      case "ready":
        return orders.filter(
          (order) =>
            order.order_status ===
            "ready_for_pickup"
        );

      case "completed":
        return orders.filter(
          (order) =>
            order.order_status === "picked_up" ||
            order.order_status === "completed"
        );

      default:
        return orders;
    }
  }, [orders, filter]);

  const counts = useMemo(() => {
    return {
      all: orders.length,

      new: orders.filter(
        (order) =>
          order.order_status ===
            "pending_payment" ||
          order.order_status === "paid"
      ).length,

      preparing: orders.filter(
        (order) =>
          order.order_status === "accepted" ||
          order.order_status === "preparing"
      ).length,

      ready: orders.filter(
        (order) =>
          order.order_status ===
          "ready_for_pickup"
      ).length,

      completed: orders.filter(
        (order) =>
          order.order_status === "picked_up" ||
          order.order_status === "completed"
      ).length,
    };
  }, [orders]);

  const updateOrder = async (
    order: FoodOrder,
    updates: Partial<FoodOrder>,
    successMessage: string
  ) => {
    try {
      setProcessing(order.id);

      const { error } = await (supabase as any)
        .from("food_orders")
        .update(updates)
        .eq("id", order.id)
        .eq(
          "restaurant_id",
          restaurant?.id
        );

      if (error) {
        throw error;
      }

      showMessage(
        "Order Updated",
        successMessage
      );

      await loadOrders(false);

      if (selectedOrder?.id === order.id) {
        setSelectedOrder({
          ...order,
          ...updates,
        });
      }
    } catch (error: any) {
      console.error(
        "Order update error:",
        error
      );

      showMessage(
        "Update Failed",
        error?.message ||
          "Unable to update the order."
      );
    } finally {
      setProcessing(null);
    }
  };

  /*
   * SIMPLE PAYMENT FLOW
   *
   * Customer sends the money to the restaurant's
   * MoMo account.
   *
   * Restaurant checks its own MoMo account.
   *
   * If money has arrived, the restaurant taps:
   *
   * APPROVE PAYMENT
   *
   * This changes:
   *
   * payment_status = paid
   * order_status = paid
   *
   * The customer can then see:
   *
   * Payment Approved
   * Waiting for Pickup/Delivery
   */

  const approvePayment = async (
    order: FoodOrder
  ) => {
    try {
      if (!restaurant?.id || !owner) {
        return;
      }

      setProcessing(order.id);

      const currentPayments =
        payments[order.id] || [];

      const payment =
        currentPayments.find(
          (item) => item.status === "pending"
        ) || currentPayments[0];

      if (!payment) {
        showMessage(
          "Payment Not Found",
          "No payment record was found for this order."
        );

        return;
      }

      const now =
        new Date().toISOString();

      const {
        error: paymentError,
      } = await (supabase as any)
        .from("food_payments")
        .update({
          status: "paid",
          paid_at: now,
          confirmed_by: owner.user_id,
          confirmed_at: now,
        })
        .eq("id", payment.id)
        .eq(
          "restaurant_id",
          restaurant.id
        );

      if (paymentError) {
        throw paymentError;
      }

      const {
        error: orderError,
      } = await (supabase as any)
        .from("food_orders")
        .update({
          payment_status: "paid",
          order_status: "paid",
          paid_at: now,
        })
        .eq("id", order.id)
        .eq(
          "restaurant_id",
          restaurant.id
        );

      if (orderError) {
        throw orderError;
      }

      showMessage(
        "Payment Approved",
        `${formatMoney(
          Number(payment.amount)
        )} has been confirmed. The customer can now see that the payment was approved.`
      );

      await loadOrders(false);

      if (selectedOrder?.id === order.id) {
        setSelectedOrder({
          ...order,
          payment_status: "paid",
          order_status: "paid",
          paid_at: now,
        });
      }
    } catch (error: any) {
      console.error(
        "Approve payment error:",
        error
      );

      showMessage(
        "Payment Approval Failed",
        error?.message ||
          "Unable to approve this payment."
      );
    } finally {
      setProcessing(null);
    }
  };

  const acceptOrder = async (
    order: FoodOrder
  ) => {
    if (order.payment_status !== "paid") {
      showMessage(
        "Payment Required",
        "Approve the customer's payment before accepting the order."
      );

      return;
    }

    await updateOrder(
      order,
      {
        order_status: "accepted",
        accepted_at:
          new Date().toISOString(),
      },
      "The order has been accepted."
    );
  };

  const startPreparing = async (
    order: FoodOrder
  ) => {
    if (order.payment_status !== "paid") {
      showMessage(
        "Payment Required",
        "The payment must be approved before preparation begins."
      );

      return;
    }

    await updateOrder(
      order,
      {
        order_status: "preparing",
        preparing_at:
          new Date().toISOString(),
      },
      "The order is now being prepared."
    );
  };

  const markReady = async (
    order: FoodOrder
  ) => {
    await updateOrder(
      order,
      {
        order_status:
          "ready_for_pickup",
        ready_at:
          new Date().toISOString(),
      },
      "The order is ready. The customer can now pick it up."
    );
  };

  const markPickedUp = async (
    order: FoodOrder
  ) => {
    await updateOrder(
      order,
      {
        order_status: "picked_up",
        picked_up_at:
          new Date().toISOString(),
      },
      "The order has been marked as picked up."
    );
  };

  const markCompleted = async (
    order: FoodOrder
  ) => {
    await updateOrder(
      order,
      {
        order_status: "completed",
        completed_at:
          new Date().toISOString(),
      },
      "The order has been completed."
    );
  };

  const rejectOrder = async (
    order: FoodOrder
  ) => {
    const reason =
      rejectionReason.trim();

    if (!reason) {
      showMessage(
        "Reason Required",
        "Please enter a reason for rejecting this order."
      );

      return;
    }

    await updateOrder(
      order,
      {
        order_status: "rejected",
        rejection_reason: reason,
      },
      "The order has been rejected."
    );

    setRejectionReason("");
  };

  const saveRestaurantNote = async (
    order: FoodOrder
  ) => {
    await updateOrder(
      order,
      {
        restaurant_note:
          restaurantNote.trim() || null,
      },
      "Restaurant note saved."
    );

    setRestaurantNote("");
  };

  const openOrder = (
    order: FoodOrder
  ) => {
    setSelectedOrder(order);

    setRejectionReason(
      order.rejection_reason || ""
    );

    setRestaurantNote(
      order.restaurant_note || ""
    );

    setShowOrderModal(true);
  };

  const closeOrder = () => {
    setShowOrderModal(false);
    setSelectedOrder(null);
    setRejectionReason("");
    setRestaurantNote("");
  };

  const getPrimaryAction = (
    order: FoodOrder
  ) => {
    if (
      order.payment_status ===
        "pending" &&
      order.order_status ===
        "pending_payment"
    ) {
      return {
        label: "Approve Payment",
        icon: "checkmark-circle-outline" as const,
        action: () =>
          approvePayment(order),
      };
    }

    if (
      order.payment_status === "paid" &&
      order.order_status === "paid"
    ) {
      return {
        label: "Accept Order",
        icon: "checkmark-done-outline" as const,
        action: () =>
          acceptOrder(order),
      };
    }

    if (
      order.order_status === "accepted"
    ) {
      return {
        label: "Start Preparing",
        icon: "restaurant-outline" as const,
        action: () =>
          startPreparing(order),
      };
    }

    if (
      order.order_status ===
      "preparing"
    ) {
      return {
        label: "Ready for Pickup",
        icon: "bag-check-outline" as const,
        action: () =>
          markReady(order),
      };
    }

    if (
      order.order_status ===
      "ready_for_pickup"
    ) {
      return {
        label: "Mark Picked Up",
        icon: "hand-left-outline" as const,
        action: () =>
          markPickedUp(order),
      };
    }

    if (
      order.order_status ===
      "picked_up"
    ) {
      return {
        label: "Complete Order",
        icon: "checkmark-done-circle-outline" as const,
        action: () =>
          markCompleted(order),
      };
    }

    return null;
  };

  const renderOrder = ({
    item: order,
  }: {
    item: FoodOrder;
  }) => {
    const items =
      orderItems[order.id] || [];

    const primaryAction =
      getPrimaryAction(order);

    const isProcessing =
      processing === order.id;

    return (
      <TouchableOpacity
        activeOpacity={0.92}
        style={styles.orderCard}
        onPress={() =>
          openOrder(order)
        }
      >
        <View style={styles.orderTopRow}>
          <View
            style={styles.orderNumberWrap}
          >
            <Text
              style={styles.orderNumber}
            >
              #{order.order_number}
            </Text>

            <Text
              style={styles.orderDate}
            >
              {formatDate(
                order.created_at
              )}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              order.order_status ===
                "pending_payment" &&
                styles.pendingBadge,
              order.order_status ===
                "paid" &&
                styles.paidBadge,
              order.order_status ===
                "accepted" &&
                styles.acceptedBadge,
              order.order_status ===
                "preparing" &&
                styles.preparingBadge,
              order.order_status ===
                "ready_for_pickup" &&
                styles.readyBadge,
              order.order_status ===
                "picked_up" &&
                styles.pickedBadge,
              order.order_status ===
                "completed" &&
                styles.completedBadge,
              (order.order_status ===
                "rejected" ||
                order.order_status ===
                  "cancelled") &&
                styles.dangerBadge,
            ]}
          >
            <Ionicons
              name={
                getStatusIcon(
                  order.order_status
                ) as any
              }
              size={14}
              color="#111827"
            />

            <Text
              style={styles.statusText}
            >
              {getStatusLabel(
                order.order_status
              )}
            </Text>
          </View>
        </View>

        <View
          style={styles.customerRow}
        >
          <View
            style={styles.customerIcon}
          >
            <Ionicons
              name="person-outline"
              size={18}
              color="#6B7280"
            />
          </View>

          <View
            style={styles.customerInfo}
          >
            <Text
              style={styles.customerName}
            >
              {order.customer_name ||
                "Customer"}
            </Text>

            <Text
              style={styles.customerPhone}
            >
              {order.customer_phone}
            </Text>
          </View>
        </View>

        <View
          style={styles.itemsPreview}
        >
          {items
            .slice(0, 3)
            .map((food) => {
              const image =
                food.menu_item_id
                  ? menuImages[
                      food.menu_item_id
                    ]
                  : null;

              return (
                <View
                  key={food.id}
                  style={
                    styles.previewItem
                  }
                >
                  {image ? (
                    <Image
                      source={{
                        uri: image,
                      }}
                      style={
                        styles.previewImage
                      }
                    />
                  ) : (
                    <View
                      style={
                        styles.previewImagePlaceholder
                      }
                    >
                      <Ionicons
                        name="restaurant-outline"
                        size={16}
                        color="#9CA3AF"
                      />
                    </View>
                  )}

                  <View
                    style={
                      styles.previewText
                    }
                  >
                    <Text
                      style={
                        styles.previewName
                      }
                      numberOfLines={1}
                    >
                      {food.quantity} ×{" "}
                      {food.item_name}
                    </Text>

                    <Text
                      style={
                        styles.previewPrice
                      }
                    >
                      {formatMoney(
                        Number(
                          food.total_price
                        )
                      )}
                    </Text>
                  </View>
                </View>
              );
            })}

          {items.length > 3 && (
            <Text
              style={styles.moreItems}
            >
              +{items.length - 3} more
              item
              {items.length - 3 === 1
                ? ""
                : "s"}
            </Text>
          )}
        </View>

        <View
          style={styles.totalRow}
        >
          <View>
            <Text
              style={styles.totalLabel}
            >
              Order Total
            </Text>

            <View
              style={styles.paymentMiniRow}
            >
              <Ionicons
                name={
                  order.payment_status ===
                  "paid"
                    ? "checkmark-circle"
                    : "time-outline"
                }
                size={15}
                color={
                  order.payment_status ===
                  "paid"
                    ? "#16A34A"
                    : "#D97706"
                }
              />

              <Text
                style={[
                  styles.paymentMiniText,
                  order.payment_status ===
                    "paid" &&
                    styles.paymentPaidText,
                ]}
              >
                {getPaymentStatusLabel(
                  order.payment_status
                )}
              </Text>
            </View>
          </View>

          <Text
            style={styles.totalAmount}
          >
            {formatMoney(
              Number(order.total_amount)
            )}
          </Text>
        </View>

        {primaryAction && (
          <TouchableOpacity
            style={
              styles.primaryButton
            }
            disabled={isProcessing}
            onPress={(event) => {
              event.stopPropagation();

              primaryAction.action();
            }}
          >
            {isProcessing ? (
              <ActivityIndicator
                color="#FFFFFF"
                size="small"
              />
            ) : (
              <>
                <Ionicons
                  name={
                    primaryAction.icon
                  }
                  size={18}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  {primaryAction.label}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {(order.order_status ===
          "paid" ||
          order.order_status ===
            "accepted") && (
          <TouchableOpacity
            style={
              styles.rejectButton
            }
            disabled={isProcessing}
            onPress={(event) => {
              event.stopPropagation();
              openOrder(order);
            }}
          >
            <Ionicons
              name="close-circle-outline"
              size={18}
              color="#DC2626"
            />

            <Text
              style={
                styles.rejectButtonText
              }
            >
              Reject Order
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <View
          style={styles.loadingContainer}
        >
          <ActivityIndicator
            size="large"
            color="#E11D48"
          />

          <Text
            style={styles.loadingText}
          >
            Loading orders...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!restaurant) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <View
          style={styles.emptyRestaurant}
        >
          <View
            style={styles.emptyIcon}
          >
            <Ionicons
              name="restaurant-outline"
              size={34}
              color="#E11D48"
            />
          </View>

          <Text
            style={styles.emptyTitle}
          >
            No Restaurant Found
          </Text>

          <Text
            style={styles.emptyText}
          >
            Create your restaurant first
            before managing customer
            orders.
          </Text>

          <TouchableOpacity
            style={styles.createButton}
            onPress={() =>
              router.push(
                "/(restaurant-owner)/create-restaurant"
              )
            }
          >
            <Ionicons
              name="add"
              size={20}
              color="#FFFFFF"
            />

            <Text
              style={
                styles.createButtonText
              }
            >
              Create Restaurant
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
    >
      <View style={styles.header}>
        <View>
          <Text
            style={styles.headerTitle}
          >
            Orders
          </Text>

          <Text
            style={styles.headerSubtitle}
          >
            {restaurant.name}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() =>
            loadOrders(true)
          }
        >
          <Ionicons
            name="refresh-outline"
            size={22}
            color="#111827"
          />
        </TouchableOpacity>
      </View>

      <View
        style={styles.simpleFlowCard}
      >
        <View
          style={styles.simpleFlowIcon}
        >
          <Ionicons
            name="card-outline"
            size={24}
            color="#E11D48"
          />
        </View>

        <View
          style={styles.simpleFlowInfo}
        >
          <Text
            style={styles.simpleFlowTitle}
          >
            Check MoMo & Approve
          </Text>

          <Text
            style={styles.simpleFlowText}
          >
            Customer pays your MoMo
            account. Check that the money
            has arrived, then approve the
            payment.
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.filterContainer
        }
      >
        {(
          [
            ["all", "All", counts.all],
            ["new", "New", counts.new],
            [
              "preparing",
              "Preparing",
              counts.preparing,
            ],
            [
              "ready",
              "Ready",
              counts.ready,
            ],
            [
              "completed",
              "Completed",
              counts.completed,
            ],
          ] as [
            FilterType,
            string,
            number
          ][]
        ).map(
          ([key, label, count]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.filterButton,
                filter === key &&
                  styles.filterButtonActive,
              ]}
              onPress={() =>
                setFilter(key)
              }
            >
              <Text
                style={[
                  styles.filterText,
                  filter === key &&
                    styles.filterTextActive,
                ]}
              >
                {label}
              </Text>

              <View
                style={[
                  styles.filterCount,
                  filter === key &&
                    styles.filterCountActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterCountText,
                    filter === key &&
                      styles.filterCountTextActive,
                  ]}
                >
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          )
        )}
      </ScrollView>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) =>
          item.id
        }
        renderItem={renderOrder}
        contentContainerStyle={[
          styles.listContent,
          filteredOrders.length ===
            0 &&
            styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#E11D48"
          />
        }
        ListEmptyComponent={
          <View style={styles.noOrders}>
            <View
              style={styles.noOrdersIcon}
            >
              <Ionicons
                name="receipt-outline"
                size={34}
                color="#9CA3AF"
              />
            </View>

            <Text
              style={styles.noOrdersTitle}
            >
              No Orders
            </Text>

            <Text
              style={styles.noOrdersText}
            >
              There are no orders in this
              category right now.
            </Text>
          </View>
        }
      />

      <Modal
        visible={showOrderModal}
        animationType="slide"
        transparent
        onRequestClose={closeOrder}
      >
        <View
          style={styles.modalOverlay}
        >
          <View
            style={styles.modalContainer}
          >
            <View
              style={styles.modalHeader}
            >
              <View>
                <Text
                  style={styles.modalTitle}
                >
                  Order Details
                </Text>

                {selectedOrder && (
                  <Text
                    style={
                      styles.modalOrderNumber
                    }
                  >
                    #
                    {
                      selectedOrder.order_number
                    }
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeOrder}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color="#111827"
                />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <ScrollView
                showsVerticalScrollIndicator={
                  false
                }
                contentContainerStyle={
                  styles.modalContent
                }
              >
                <View
                  style={
                    styles.modalStatusCard
                  }
                >
                  <View
                    style={
                      styles.modalStatusIcon
                    }
                  >
                    <Ionicons
                      name={
                        getStatusIcon(
                          selectedOrder.order_status
                        ) as any
                      }
                      size={23}
                      color="#E11D48"
                    />
                  </View>

                  <View
                    style={
                      styles.modalStatusInfo
                    }
                  >
                    <Text
                      style={
                        styles.modalStatusTitle
                      }
                    >
                      {getStatusLabel(
                        selectedOrder.order_status
                      )}
                    </Text>

                    <Text
                      style={
                        styles.modalStatusSubtitle
                      }
                    >
                      {formatDate(
                        selectedOrder.created_at
                      )}
                    </Text>
                  </View>
                </View>

                <View
                  style={styles.section}
                >
                  <Text
                    style={styles.sectionTitle}
                  >
                    Customer
                  </Text>

                  <View
                    style={
                      styles.customerDetailCard
                    }
                  >
                    <View
                      style={
                        styles.detailRow
                      }
                    >
                      <Ionicons
                        name="person-outline"
                        size={18}
                        color="#6B7280"
                      />

                      <View
                        style={
                          styles.detailTextWrap
                        }
                      >
                        <Text
                          style={
                            styles.detailLabel
                          }
                        >
                          Name
                        </Text>

                        <Text
                          style={
                            styles.detailValue
                          }
                        >
                          {selectedOrder.customer_name ||
                            "Customer"}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={
                        styles.detailRow
                      }
                    >
                      <Ionicons
                        name="call-outline"
                        size={18}
                        color="#6B7280"
                      />

                      <View
                        style={
                          styles.detailTextWrap
                        }
                      >
                        <Text
                          style={
                            styles.detailLabel
                          }
                        >
                          Phone
                        </Text>

                        <Text
                          style={
                            styles.detailValue
                          }
                        >
                          {
                            selectedOrder.customer_phone
                          }
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View
                  style={styles.section}
                >
                  <Text
                    style={styles.sectionTitle}
                  >
                    Food Ordered
                  </Text>

                  <View
                    style={
                      styles.foodItemsCard
                    }
                  >
                    {(
                      orderItems[
                        selectedOrder.id
                      ] || []
                    ).map((food) => {
                      const image =
                        food.menu_item_id
                          ? menuImages[
                              food.menu_item_id
                            ]
                          : null;

                      return (
                        <View
                          key={food.id}
                          style={
                            styles.foodItemRow
                          }
                        >
                          {image ? (
                            <Image
                              source={{
                                uri: image,
                              }}
                              style={
                                styles.foodImage
                              }
                            />
                          ) : (
                            <View
                              style={
                                styles.foodImagePlaceholder
                              }
                            >
                              <Ionicons
                                name="restaurant-outline"
                                size={22}
                                color="#9CA3AF"
                              />
                            </View>
                          )}

                          <View
                            style={
                              styles.foodInfo
                            }
                          >
                            <Text
                              style={
                                styles.foodName
                              }
                            >
                              {
                                food.item_name
                              }
                            </Text>

                            {food.item_description && (
                              <Text
                                style={
                                  styles.foodDescription
                                }
                                numberOfLines={
                                  2
                                }
                              >
                                {
                                  food.item_description
                                }
                              </Text>
                            )}

                            <Text
                              style={
                                styles.foodQuantity
                              }
                            >
                              Quantity:{" "}
                              {
                                food.quantity
                              }
                            </Text>
                          </View>

                          <Text
                            style={
                              styles.foodTotal
                            }
                          >
                            {formatMoney(
                              Number(
                                food.total_price
                              )
                            )}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                <View
                  style={styles.section}
                >
                  <Text
                    style={styles.sectionTitle}
                  >
                    MoMo Payment
                  </Text>

                  <View
                    style={styles.paymentCard}
                  >
                    <View
                      style={
                        styles.paymentStatusRow
                      }
                    >
                      <View>
                        <Text
                          style={
                            styles.detailLabel
                          }
                        >
                          Payment Status
                        </Text>

                        <Text
                          style={[
                            styles.paymentStatusLarge,
                            selectedOrder.payment_status ===
                              "paid" &&
                              styles.paidLarge,
                          ]}
                        >
                          {getPaymentStatusLabel(
                            selectedOrder.payment_status
                          )}
                        </Text>
                      </View>

                      <Ionicons
                        name={
                          selectedOrder.payment_status ===
                          "paid"
                            ? "checkmark-circle"
                            : "time-outline"
                        }
                        size={30}
                        color={
                          selectedOrder.payment_status ===
                          "paid"
                            ? "#16A34A"
                            : "#D97706"
                        }
                      />
                    </View>

                    {(
                      payments[
                        selectedOrder.id
                      ] || []
                    ).map((payment) => (
                      <View
                        key={payment.id}
                        style={
                          styles.paymentDetails
                        }
                      >
                        <View
                          style={
                            styles.paymentDetailRow
                          }
                        >
                          <Text
                            style={
                              styles.paymentDetailLabel
                            }
                          >
                            Network
                          </Text>

                          <Text
                            style={
                              styles.paymentDetailValue
                            }
                          >
                            {payment.momo_provider ||
                              "MoMo"}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.paymentDetailRow
                          }
                        >
                          <Text
                            style={
                              styles.paymentDetailLabel
                            }
                          >
                            Customer MoMo Name
                          </Text>

                          <Text
                            style={
                              styles.paymentDetailValue
                            }
                          >
                            {payment.payment_note ||
                              selectedOrder.customer_name ||
                              "Customer"}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.paymentDetailRow
                          }
                        >
                          <Text
                            style={
                              styles.paymentDetailLabel
                            }
                          >
                            MoMo Number
                          </Text>

                          <Text
                            style={
                              styles.paymentDetailValue
                            }
                          >
                            {payment.momo_number ||
                              selectedOrder.customer_phone}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.paymentDetailRow
                          }
                        >
                          <Text
                            style={
                              styles.paymentDetailLabel
                            }
                          >
                            Amount
                          </Text>

                          <Text
                            style={[
                              styles.paymentDetailValue,
                              styles.amountHighlight,
                            ]}
                          >
                            {formatMoney(
                              Number(
                                payment.amount
                              )
                            )}
                          </Text>
                        </View>

                        {payment.transaction_reference && (
                          <View
                            style={
                              styles.paymentDetailRow
                            }
                          >
                            <Text
                              style={
                                styles.paymentDetailLabel
                              }
                            >
                              Transaction Reference
                            </Text>

                            <Text
                              style={
                                styles.paymentDetailValue
                              }
                            >
                              {
                                payment.transaction_reference
                              }
                            </Text>
                          </View>
                        )}

                        {payment.payment_reference && (
                          <View
                            style={
                              styles.paymentDetailRow
                            }
                          >
                            <Text
                              style={
                                styles.paymentDetailLabel
                              }
                            >
                              Payment Reference
                            </Text>

                            <Text
                              style={
                                styles.paymentDetailValue
                              }
                            >
                              {
                                payment.payment_reference
                              }
                            </Text>
                          </View>
                        )}
                      </View>
                    ))}

                    {selectedOrder.payment_status ===
                      "pending" && (
                      <View>
                        <View
                          style={
                            styles.checkPaymentNotice
                          }
                        >
                          <Ionicons
                            name="information-circle-outline"
                            size={19}
                            color="#D97706"
                          />

                          <Text
                            style={
                              styles.checkPaymentText
                            }
                          >
                            Check your restaurant
                            MoMo account first.
                            Only approve after
                            you confirm that the
                            money has actually
                            arrived.
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={
                            styles.confirmPaymentButton
                          }
                          disabled={
                            processing ===
                            selectedOrder.id
                          }
                          onPress={() =>
                            approvePayment(
                              selectedOrder
                            )
                          }
                        >
                          {processing ===
                          selectedOrder.id ? (
                            <ActivityIndicator
                              color="#FFFFFF"
                            />
                          ) : (
                            <>
                              <Ionicons
                                name="checkmark-circle-outline"
                                size={21}
                                color="#FFFFFF"
                              />

                              <Text
                                style={
                                  styles.confirmPaymentText
                                }
                              >
                                Approve Payment
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
                <View
                  style={styles.section}
                >
                  <Text
                    style={styles.sectionTitle}
                  >
                    Order Summary
                  </Text>

                  <View
                    style={
                      styles.summaryDetailCard
                    }
                  >
                    <View
                      style={styles.summaryLine}
                    >
                      <Text
                        style={
                          styles.summaryLineLabel
                        }
                      >
                        Food Subtotal
                      </Text>

                      <Text
                        style={
                          styles.summaryLineValue
                        }
                      >
                        {formatMoney(
                          Number(
                            selectedOrder.food_subtotal
                          )
                        )}
                      </Text>
                    </View>

                    <View
                      style={styles.summaryLine}
                    >
                      <Text
                        style={
                          styles.summaryLineLabel
                        }
                      >
                        Service Fee
                      </Text>

                      <Text
                        style={
                          styles.summaryLineValue
                        }
                      >
                        {formatMoney(
                          Number(
                            selectedOrder.service_fee
                          )
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.summaryDivider
                      }
                    />

                    <View
                      style={styles.summaryLine}
                    >
                      <Text
                        style={
                          styles.finalTotalLabel
                        }
                      >
                        Total
                      </Text>

                      <Text
                        style={
                          styles.finalTotalValue
                        }
                      >
                        {formatMoney(
                          Number(
                            selectedOrder.total_amount
                          )
                        )}
                      </Text>
                    </View>
                  </View>
                </View>

                {selectedOrder.customer_note && (
                  <View
                    style={styles.section}
                  >
                    <Text
                      style={styles.sectionTitle}
                    >
                      Customer Note
                    </Text>

                    <View
                      style={styles.noteCard}
                    >
                      <Ionicons
                        name="chatbox-ellipses-outline"
                        size={20}
                        color="#6B7280"
                      />

                      <Text
                        style={styles.noteText}
                      >
                        {
                          selectedOrder.customer_note
                        }
                      </Text>
                    </View>
                  </View>
                )}

                <View
                  style={styles.section}
                >
                  <Text
                    style={styles.sectionTitle}
                  >
                    Restaurant Note
                  </Text>

                  <TextInput
                    value={restaurantNote}
                    onChangeText={
                      setRestaurantNote
                    }
                    placeholder="Add a note about this order..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    style={styles.noteInput}
                  />

                  <TouchableOpacity
                    style={
                      styles.saveNoteButton
                    }
                    disabled={
                      processing ===
                      selectedOrder.id
                    }
                    onPress={() =>
                      saveRestaurantNote(
                        selectedOrder
                      )
                    }
                  >
                    <Text
                      style={
                        styles.saveNoteButtonText
                      }
                    >
                      Save Restaurant Note
                    </Text>
                  </TouchableOpacity>
                </View>

                {(selectedOrder.order_status ===
                  "paid" ||
                  selectedOrder.order_status ===
                    "accepted") && (
                  <View
                    style={styles.section}
                  >
                    <Text
                      style={
                        styles.sectionTitle
                      }
                    >
                      Reject Order
                    </Text>

                    <TextInput
                      value={rejectionReason}
                      onChangeText={
                        setRejectionReason
                      }
                      placeholder="Enter reason for rejection..."
                      placeholderTextColor="#9CA3AF"
                      multiline
                      style={[
                        styles.noteInput,
                        styles.rejectionInput,
                      ]}
                    />

                    <TouchableOpacity
                      style={
                        styles.modalRejectButton
                      }
                      disabled={
                        processing ===
                        selectedOrder.id
                      }
                      onPress={() =>
                        rejectOrder(
                          selectedOrder
                        )
                      }
                    >
                      {processing ===
                      selectedOrder.id ? (
                        <ActivityIndicator
                          color="#DC2626"
                        />
                      ) : (
                        <>
                          <Ionicons
                            name="close-circle-outline"
                            size={20}
                            color="#DC2626"
                          />

                          <Text
                            style={
                              styles.modalRejectText
                            }
                          >
                            Reject Order
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {selectedOrder.order_status ===
                  "paid" && (
                  <TouchableOpacity
                    style={
                      styles.modalPrimaryButton
                    }
                    disabled={
                      processing ===
                      selectedOrder.id
                    }
                    onPress={() =>
                      acceptOrder(
                        selectedOrder
                      )
                    }
                  >
                    <Ionicons
                      name="checkmark-done-outline"
                      size={20}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.modalPrimaryText
                      }
                    >
                      Accept Order
                    </Text>
                  </TouchableOpacity>
                )}

                {selectedOrder.order_status ===
                  "accepted" && (
                  <TouchableOpacity
                    style={
                      styles.modalPrimaryButton
                    }
                    disabled={
                      processing ===
                      selectedOrder.id
                    }
                    onPress={() =>
                      startPreparing(
                        selectedOrder
                      )
                    }
                  >
                    <Ionicons
                      name="restaurant-outline"
                      size={20}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.modalPrimaryText
                      }
                    >
                      Start Preparing
                    </Text>
                  </TouchableOpacity>
                )}

                {selectedOrder.order_status ===
                  "preparing" && (
                  <TouchableOpacity
                    style={
                      styles.modalPrimaryButton
                    }
                    disabled={
                      processing ===
                      selectedOrder.id
                    }
                    onPress={() =>
                      markReady(
                        selectedOrder
                      )
                    }
                  >
                    <Ionicons
                      name="bag-check-outline"
                      size={20}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.modalPrimaryText
                      }
                    >
                      Ready for Pickup
                    </Text>
                  </TouchableOpacity>
                )}

                {selectedOrder.order_status ===
                  "ready_for_pickup" && (
                  <TouchableOpacity
                    style={
                      styles.modalPrimaryButton
                    }
                    disabled={
                      processing ===
                      selectedOrder.id
                    }
                    onPress={() =>
                      markPickedUp(
                        selectedOrder
                      )
                    }
                  >
                    <Ionicons
                      name="hand-left-outline"
                      size={20}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.modalPrimaryText
                      }
                    >
                      Mark Picked Up
                    </Text>
                  </TouchableOpacity>
                )}

                {selectedOrder.order_status ===
                  "picked_up" && (
                  <TouchableOpacity
                    style={
                      styles.modalPrimaryButton
                    }
                    disabled={
                      processing ===
                      selectedOrder.id
                    }
                    onPress={() =>
                      markCompleted(
                        selectedOrder
                      )
                    }
                  >
                    <Ionicons
                      name="checkmark-done-circle-outline"
                      size={20}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.modalPrimaryText
                      }
                    >
                      Complete Order
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#6B7280",
  },

  header: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
  },

  headerSubtitle: {
    marginTop: 3,
    fontSize: 14,
    color: "#6B7280",
  },

  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },

  simpleFlowCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
  },

  simpleFlowIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF1F2",
  },

  simpleFlowInfo: {
    flex: 1,
    marginLeft: 12,
  },

  simpleFlowTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  simpleFlowText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: "#6B7280",
  },

  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },

  filterButton: {
    height: 42,
    paddingHorizontal: 13,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  filterButtonActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },

  filterText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },

  filterTextActive: {
    color: "#FFFFFF",
  },

  filterCount: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },

  filterCountActive: {
    backgroundColor: "#374151",
  },

  filterCountText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
  },

  filterCountTextActive: {
    color: "#FFFFFF",
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },

  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },

  orderCard: {
    marginBottom: 14,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  orderTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  orderNumberWrap: {
    flex: 1,
  },

  orderNumber: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },

  orderDate: {
    marginTop: 4,
    fontSize: 12,
    color: "#9CA3AF",
  },

  statusBadge: {
    maxWidth: 170,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F3F4F6",
  },

  pendingBadge: {
    backgroundColor: "#FEF3C7",
  },

  paidBadge: {
    backgroundColor: "#DCFCE7",
  },

  acceptedBadge: {
    backgroundColor: "#DBEAFE",
  },

  preparingBadge: {
    backgroundColor: "#E0E7FF",
  },

  readyBadge: {
    backgroundColor: "#FCE7F3",
  },

  pickedBadge: {
    backgroundColor: "#CCFBF1",
  },

  completedBadge: {
    backgroundColor: "#DCFCE7",
  },

  dangerBadge: {
    backgroundColor: "#FEE2E2",
  },

  statusText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#111827",
  },

  customerRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  customerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },

  customerInfo: {
    flex: 1,
    marginLeft: 10,
  },

  customerName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },

  customerPhone: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
  },

  itemsPreview: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },

  previewItem: {
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
  },

  previewImage: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: "#F3F4F6",
  },

  previewImagePlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },

  previewText: {
    flex: 1,
    marginLeft: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  previewName: {
    flex: 1,
    marginRight: 10,
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },

  previewPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },

  moreItems: {
    marginTop: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
  },

  totalRow: {
    marginTop: 13,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  totalLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#374151",
  },

  paymentMiniRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  paymentMiniText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#D97706",
  },

  paymentPaidText: {
    color: "#16A34A",
  },

  totalAmount: {
    fontSize: 19,
    fontWeight: "900",
    color: "#111827",
  },

  primaryButton: {
    marginTop: 14,
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#E11D48",
  },

  primaryButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  rejectButton: {
    marginTop: 9,
    minHeight: 43,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  rejectButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#DC2626",
  },

  noOrders: {
    alignItems: "center",
    paddingHorizontal: 30,
  },

  noOrdersIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },

  noOrdersTitle: {
    marginTop: 15,
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
  },

  noOrdersText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: "#6B7280",
  },

  emptyRestaurant: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF1F2",
  },

  emptyTitle: {
    marginTop: 18,
    fontSize: 21,
    fontWeight: "800",
    color: "#111827",
  },

  emptyText: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: "#6B7280",
  },

  createButton: {
    marginTop: 22,
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    backgroundColor: "#E11D48",
  },

  createButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor:
      "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },

  modalContainer: {
    width: "100%",
    maxHeight: "94%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: "#F8FAFC",
    overflow: "hidden",
  },

  modalHeader: {
    paddingHorizontal: 18,
    paddingTop: 17,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: "#111827",
  },

  modalOrderNumber: {
    marginTop: 3,
    fontSize: 13,
    color: "#6B7280",
  },

  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },

  modalContent: {
    padding: 16,
    paddingBottom: 40,
  },

  modalStatusCard: {
    padding: 15,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
  },

  modalStatusIcon: {
    width: 47,
    height: 47,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF1F2",
  },

  modalStatusInfo: {
    marginLeft: 11,
  },

  modalStatusTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  modalStatusSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#6B7280",
  },

  section: {
    marginTop: 20,
  },

  sectionTitle: {
    marginBottom: 9,
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },

  customerDetailCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 15,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  detailTextWrap: {
    flex: 1,
    marginLeft: 10,
  },

  detailLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
  },

  detailValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },

  foodItemsCard: {
    padding: 13,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  foodItemRow: {
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
  },

  foodImage: {
    width: 58,
    height: 58,
    borderRadius: 15,
    backgroundColor: "#F3F4F6",
  },

  foodImagePlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },

  foodInfo: {
    flex: 1,
    marginLeft: 11,
    marginRight: 8,
  },

  foodName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  foodDescription: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
    color: "#6B7280",
  },

  foodQuantity: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
  },

  foodTotal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  paymentCard: {
    padding: 15,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  paymentStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  paymentStatusLarge: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "800",
    color: "#D97706",
  },

  paidLarge: {
    color: "#16A34A",
  },

  paymentDetails: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },

  paymentDetailRow: {
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
  },

  paymentDetailLabel: {
    flex: 1,
    fontSize: 12,
    color: "#6B7280",
  },

  paymentDetailValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },

  amountHighlight: {
    fontSize: 15,
    fontWeight: "900",
    color: "#E11D48",
  },

  checkPaymentNotice: {
    marginTop: 14,
    padding: 12,
    borderRadius: 13,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },

  checkPaymentText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: "#92400E",
  },

  confirmPaymentButton: {
    marginTop: 13,
    minHeight: 48,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#16A34A",
  },

  confirmPaymentText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  summaryDetailCard: {
    padding: 15,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  summaryLine: {
    paddingVertical: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  summaryLineLabel: {
    fontSize: 13,
    color: "#6B7280",
  },

  summaryLineValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },

  summaryDivider: {
    marginVertical: 7,
    height: 1,
    backgroundColor: "#E5E7EB",
  },

  finalTotalLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },

  finalTotalValue: {
    fontSize: 19,
    fontWeight: "900",
    color: "#E11D48",
  },

  noteCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: "#374151",
  },

  noteInput: {
    minHeight: 90,
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    fontSize: 13,
    lineHeight: 19,
    color: "#111827",
    textAlignVertical: "top",
  },

  rejectionInput: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FFF7F7",
  },

  saveNoteButton: {
    marginTop: 9,
    minHeight: 43,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
  },

  saveNoteButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  modalRejectButton: {
    marginTop: 9,
    minHeight: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  modalRejectText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#DC2626",
  },

  modalPrimaryButton: {
    marginTop: 20,
    minHeight: 50,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#E11D48",
  },

  modalPrimaryText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});