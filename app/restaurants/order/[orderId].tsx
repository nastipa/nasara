import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase";

function showMessage(title: string, message?: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
    return;
  }

  const { Alert } = require("react-native");
  Alert.alert(title, message);
}

function money(amount: number) {
  return `GH₵ ${Number(amount || 0).toFixed(2)}`;
}

export default function CustomerOrderScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    orderId?: string | string[];
  }>();

  const orderId = Array.isArray(params.orderId)
    ? params.orderId[0]
    : params.orderId;

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [restaurantName, setRestaurantName] =
    useState("Restaurant");
  const [restaurant, setRestaurant] = useState<any>(null);

  async function loadOrder() {
    if (!orderId) {
      console.log("No orderId received");

      setOrder(null);
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      console.log("Loading customer order:", orderId);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("User error:", userError);
        throw userError;
      }

      if (!user) {
        setOrder(null);
        setItems([]);
        setLoading(false);

        showMessage(
          "Login Required",
          "Please log in to view this order."
        );

        return;
      }

      console.log("Customer ID:", user.id);

      // --------------------------------------------------
      // LOAD ORDER
      // --------------------------------------------------

      const { data: orderData, error: orderError } =
        await (supabase as any)
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
          .eq("id", orderId)
          .eq("customer_id", user.id)
          .maybeSingle();

      if (orderError) {
        console.error("Order query error:", orderError);
        throw orderError;
      }

      console.log("Order result:", orderData);

      if (!orderData) {
        console.log(
          "Order not found for customer:",
          orderId,
          user.id
        );

        setOrder(null);
        setItems([]);
        setLoading(false);

        return;
      }

      setOrder(orderData);

      // --------------------------------------------------
      // LOAD RESTAURANT
      // --------------------------------------------------

      if (orderData.restaurant_id) {
        const {
          data: restaurantData,
          error: restaurantError,
        } = await (supabase as any)
          .from("restaurants")
          .select(
            `
            id,
            name,
            owner_id,
            phone,
            address,
            latitude,
            longitude
            `
          )
          .eq("id", orderData.restaurant_id)
          .maybeSingle();

        if (restaurantError) {
          console.error(
            "Restaurant query error:",
            restaurantError
          );
        }

        setRestaurant(restaurantData || null);

        setRestaurantName(
          restaurantData?.name || "Restaurant"
        );
      } else {
        setRestaurant(null);
        setRestaurantName("Restaurant");
      }

      // --------------------------------------------------
      // LOAD ORDER ITEMS
      // --------------------------------------------------

      const {
        data: itemData,
        error: itemError,
      } = await (supabase as any)
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
        .eq("order_id", orderId)
        .order("created_at", {
          ascending: true,
        });

      if (itemError) {
        console.error(
          "Order items query error:",
          itemError
        );
        throw itemError;
      }

      console.log(
        "Order items:",
        itemData?.length || 0
      );

      setItems(itemData || []);
    } catch (error) {
      console.error(
        "Customer order loading error:",
        error
      );

      setOrder(null);
      setItems([]);

      showMessage(
        "Unable to load order",
        "The order could not be loaded. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // --------------------------------------------------
  // CHAT WITH RESTAURANT
  // --------------------------------------------------

  function openRestaurantChat() {
    if (!restaurant) {
      showMessage(
        "Restaurant Unavailable",
        "Restaurant information is not available right now."
      );
      return;
    }

    router.push({
      pathname: "/chat",
      params: {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        ownerId: restaurant.owner_id,
      },
    });
  }

  // --------------------------------------------------
  // REQUEST DELIVERY
  // --------------------------------------------------

  function requestDelivery() {
    if (!order || !restaurant) {
      showMessage(
        "Delivery Unavailable",
        "Restaurant information is not available for this order."
      );
      return;
    }

    if (order.order_status !== "ready_for_pickup") {
      showMessage(
        "Not Ready Yet",
        "You can request delivery after the restaurant marks your food as ready for pickup."
      );
      return;
    }

    if (
      restaurant.latitude == null ||
      restaurant.longitude == null
    ) {
      showMessage(
        "Restaurant Location Missing",
        "The restaurant has not provided a GPS location yet. Please contact the restaurant."
      );
      return;
    }

    router.push({
      pathname: "/request-delivery",
      params: {
        orderId: order.id,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        pickupAddress: restaurant.address || "",
        pickupLat: String(restaurant.latitude),
        pickupLng: String(restaurant.longitude),
      },
    });
  }

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  // --------------------------------------------------
  // REALTIME ORDER UPDATES
  // --------------------------------------------------

  useEffect(() => {
    if (!orderId) {
      return;
    }

    console.log(
      "Starting realtime subscription for order:",
      orderId
    );

    const channel = supabase
      .channel(`customer-order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "food_orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          console.log(
            "Order realtime update:",
            payload
          );

          loadOrder();
        }
      )
      .subscribe((status) => {
        console.log(
          "Order realtime status:",
          status
        );
      });

    return () => {
      console.log(
        "Removing order realtime subscription:",
        orderId
      );

      supabase.removeChannel(channel);
    };
  }, [orderId]);

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color="#E53935"
          />

          <Text style={styles.loadingText}>
            Loading your order...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // --------------------------------------------------
  // ORDER NOT FOUND
  // --------------------------------------------------

  if (!order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="receipt-outline"
              size={50}
              color="#E53935"
            />
          </View>

          <Text style={styles.emptyTitle}>
            Order not found
          </Text>

          <Text style={styles.emptyText}>
            We could not find this order under your
            account.
          </Text>

          <Pressable
            style={styles.button}
            onPress={() =>
              router.replace("/restaurants/orders")
            }
          >
            <Ionicons
              name="receipt-outline"
              size={18}
              color="#FFFFFF"
            />

            <Text style={styles.buttonText}>
              My Orders
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const status = order.order_status;

  const paymentApproved =
    order.payment_status === "paid";

  const cancelled =
    status === "cancelled";

  const rejected =
    status === "rejected";

  const preparing =
    status === "preparing" ||
    status === "ready_for_pickup" ||
    status === "picked_up" ||
    status === "completed";

  const ready =
    status === "ready_for_pickup" ||
    status === "picked_up" ||
    status === "completed";

  const pickedUp =
    status === "picked_up" ||
    status === "completed";

  const completed =
    status === "completed";

  function statusText() {
    if (cancelled) {
      return "Order Cancelled";
    }

    if (rejected) {
      return "Order Rejected";
    }

    if (!paymentApproved) {
      return "Payment Pending";
    }

    if (status === "paid") {
      return "Payment Approved";
    }

    if (status === "preparing") {
      return "Preparing Your Food";
    }

    if (status === "ready_for_pickup") {
      return "Ready for Pickup";
    }

    if (status === "picked_up") {
      return "Picked Up";
    }

    if (status === "completed") {
      return "Order Completed";
    }

    return "Payment Pending";
  }

  function Step({
    title,
    done,
    active,
    icon,
  }: {
    title: string;
    done: boolean;
    active: boolean;
    icon: any;
  }) {
    return (
      <View style={styles.step}>
        <View
          style={[
            styles.stepIcon,
            done && styles.stepDone,
            active && styles.stepActive,
          ]}
        >
          <Ionicons
            name={done ? "checkmark" : icon}
            size={20}
            color={
              done || active
                ? "#FFFFFF"
                : "#9CA3AF"
            }
          />
        </View>

        <Text
          style={[
            styles.stepText,
            done && styles.stepTextDone,
            active && styles.stepTextActive,
          ]}
        >
          {title}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}

      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color="#111827"
          />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            My Order
          </Text>

          <Text style={styles.headerSubtitle}>
            {restaurantName}
          </Text>
        </View>

        <Pressable
          style={styles.headerOrdersButton}
          onPress={() =>
            router.replace("/restaurants/orders")
          }
        >
          <Ionicons
            name="receipt-outline"
            size={22}
            color="#E53935"
          />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* STATUS */}

        <View style={styles.statusCard}>
          <View style={styles.statusIcon}>
            <Ionicons
              name={
                completed
                  ? "checkmark-circle"
                  : cancelled || rejected
                  ? "close-circle"
                  : "restaurant"
              }
              size={38}
              color={
                cancelled || rejected
                  ? "#DC2626"
                  : "#E53935"
              }
            />
          </View>

          <Text style={styles.statusTitle}>
            {statusText()}
          </Text>

          <Text style={styles.orderNumber}>
            Order #{order.order_number}
          </Text>

          <Text style={styles.restaurantText}>
            {restaurantName}
          </Text>
        </View>

        {/* QUICK ACTIONS */}

        {!cancelled && !rejected && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Need Help?
            </Text>

            <Pressable
              style={styles.chatButton}
              onPress={openRestaurantChat}
            >
              <View style={styles.actionIconPurple}>
                <Ionicons
                  name="chatbubble-ellipses"
                  size={21}
                  color="#7C3AED"
                />
              </View>

              <View style={styles.actionTextContainer}>
                <Text style={styles.chatButtonTitle}>
                  Chat with Restaurant
                </Text>

                <Text style={styles.chatButtonSubtitle}>
                  Contact the restaurant about your order
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color="#9CA3AF"
              />
            </Pressable>

            {status === "ready_for_pickup" && (
              <Pressable
                style={styles.deliveryButton}
                onPress={requestDelivery}
              >
                <View style={styles.actionIconGreen}>
                  <Ionicons
                    name="bicycle"
                    size={22}
                    color="#16A34A"
                  />
                </View>

                <View style={styles.actionTextContainer}>
                  <Text style={styles.deliveryButtonTitle}>
                    Request Delivery
                  </Text>

                  <Text style={styles.deliveryButtonSubtitle}>
                    Have your ready order delivered to you
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color="#9CA3AF"
                />
              </Pressable>
            )}
          </View>
        )}

        {/* ORDER PROGRESS */}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Order Progress
          </Text>

          <Step
            title="Payment Pending"
            done={paymentApproved}
            active={
              !paymentApproved &&
              !cancelled &&
              !rejected
            }
            icon="time-outline"
          />

          <Step
            title="Payment Approved"
            done={paymentApproved}
            active={
              paymentApproved &&
              status === "paid"
            }
            icon="checkmark-circle-outline"
          />

          <Step
            title="Preparing"
            done={preparing}
            active={status === "preparing"}
            icon="restaurant-outline"
          />

          <Step
            title="Ready for Pickup"
            done={ready}
            active={
              status === "ready_for_pickup"
            }
            icon="bag-check-outline"
          />

          <Step
            title="Picked Up"
            done={pickedUp}
            active={status === "picked_up"}
            icon="walk-outline"
          />

          <Step
            title="Completed"
            done={completed}
            active={completed}
            icon="checkmark-done-outline"
          />

          {cancelled && (
            <View style={styles.errorStatus}>
              <Ionicons
                name="close-circle"
                size={22}
                color="#DC2626"
              />

              <Text style={styles.errorStatusText}>
                This order has been cancelled.
              </Text>
            </View>
          )}

          {rejected && (
            <View style={styles.errorStatus}>
              <Ionicons
                name="close-circle"
                size={22}
                color="#DC2626"
              />

              <Text style={styles.errorStatusText}>
                This order was rejected by the
                restaurant.
              </Text>
            </View>
          )}
        </View>

        {/* FOOD */}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Your Food
          </Text>

          {items.length === 0 ? (
            <View style={styles.noItemsBox}>
              <Ionicons
                name="fast-food-outline"
                size={25}
                color="#9CA3AF"
              />

              <Text style={styles.noItems}>
                No food items found for this order.
              </Text>
            </View>
          ) : (
            items.map((item) => (
              <View
                key={item.id}
                style={styles.itemRow}
              >
                <View style={styles.itemIcon}>
                  <Ionicons
                    name="fast-food-outline"
                    size={20}
                    color="#E53935"
                  />
                </View>

                <View style={styles.itemLeft}>
                  <Text style={styles.itemName}>
                    {item.item_name}
                  </Text>

                  <Text style={styles.itemQuantity}>
                    Qty: {item.quantity}
                  </Text>

                  <Text style={styles.unitPrice}>
                    {money(item.unit_price)} each
                  </Text>
                </View>

                <Text style={styles.itemPrice}>
                  {money(item.total_price)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* PAYMENT */}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Payment
          </Text>

          <View style={styles.row}>
            <Text style={styles.label}>
              Payment Status
            </Text>

            <View
              style={[
                styles.badge,
                paymentApproved
                  ? styles.badgePaid
                  : styles.badgePending,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  paymentApproved
                    ? styles.badgePaidText
                    : styles.badgePendingText,
                ]}
              >
                {paymentApproved
                  ? "APPROVED"
                  : "PENDING"}
              </Text>
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>
              Food
            </Text>

            <Text style={styles.value}>
              {money(order.food_subtotal)}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>
              Service Fee
            </Text>

            <Text style={styles.value}>
              {money(order.service_fee)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.totalLabel}>
              Total
            </Text>

            <Text style={styles.totalValue}>
              {money(order.total_amount)}
            </Text>
          </View>
        </View>

        {/* CUSTOMER NOTE */}

        {order.customer_note && (
          <View style={styles.card}>
            <View style={styles.noteHeader}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={20}
                color="#E53935"
              />

              <Text style={styles.sectionTitle}>
                Your Note
              </Text>
            </View>

            <Text style={styles.noteText}>
              {order.customer_note}
            </Text>
          </View>
        )}

        {/* PAYMENT WAITING */}

        {!paymentApproved &&
          !cancelled &&
          !rejected && (
            <View style={styles.waitingCard}>
              <Ionicons
                name="time-outline"
                size={25}
                color="#D97706"
              />

              <View style={styles.waitingContent}>
                <Text style={styles.waitingTitle}>
                  Waiting for payment approval
                </Text>

                <Text style={styles.waitingText}>
                  The restaurant will check its
                  MoMo account and approve your
                  payment. This screen will update
                  automatically.
                </Text>
              </View>
            </View>
          )}

        {/* PAYMENT APPROVED */}

        {paymentApproved &&
          status === "paid" && (
            <View style={styles.approvedCard}>
              <Ionicons
                name="checkmark-circle"
                size={25}
                color="#16A34A"
              />

              <View style={styles.waitingContent}>
                <Text style={styles.approvedTitle}>
                  Payment Approved
                </Text>

                <Text style={styles.approvedText}>
                  Your payment has been approved.
                  The restaurant can now start
                  preparing your food.
                </Text>
              </View>
            </View>
          )}

        {/* READY */}

        {status === "ready_for_pickup" && (
          <View style={styles.readyCard}>
            <Ionicons
              name="bag-check"
              size={28}
              color="#16A34A"
            />

            <View style={styles.waitingContent}>
              <Text style={styles.readyTitle}>
                Your Food Is Ready
              </Text>

              <Text style={styles.readyText}>
                Please pick up your order from the
                restaurant, or use Request Delivery
                above if you want it delivered.
              </Text>
            </View>
          </View>
        )}

        {/* COMPLETED */}

        {completed && (
          <View style={styles.completedCard}>
            <Ionicons
              name="checkmark-done-circle"
              size={28}
              color="#16A34A"
            />

            <View style={styles.waitingContent}>
              <Text style={styles.completedTitle}>
                Order Completed
              </Text>

              <Text style={styles.completedText}>
                Thank you for ordering from{" "}
                {restaurantName}.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  loadingText: {
    marginTop: 12,
    color: "#6B7280",
    fontSize: 14,
  },

  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    marginTop: 10,
  },

  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 7,
    marginBottom: 20,
    textAlign: "center",
  },

  button: {
    minHeight: 48,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: "#E53935",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },

  header: {
    height: 64,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },

  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  headerCenter: {
    flex: 1,
    alignItems: "center",
  },

  headerOrdersButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF1F2",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },

  headerSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  content: {
    padding: 16,
  },

  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 15,
  },

  statusIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  statusTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },

  orderNumber: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 5,
  },

  restaurantText: {
    fontSize: 13,
    color: "#E53935",
    fontWeight: "800",
    marginTop: 5,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 15,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 15,
  },

  // --------------------------------------------------
  // ACTION BUTTONS
  // --------------------------------------------------

  chatButton: {
    minHeight: 70,
    backgroundColor: "#F5F3FF",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },

  actionIconPurple: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },

  actionTextContainer: {
    flex: 1,
    marginLeft: 11,
  },

  chatButtonTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#5B21B6",
  },

  chatButtonSubtitle: {
    fontSize: 11,
    color: "#7C3AED",
    marginTop: 3,
  },

  deliveryButton: {
    minHeight: 70,
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginTop: 10,
  },

  actionIconGreen: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },

  deliveryButtonTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#166534",
  },

  deliveryButtonSubtitle: {
    fontSize: 11,
    color: "#15803D",
    marginTop: 3,
  },

  // --------------------------------------------------
  // PROGRESS
  // --------------------------------------------------

  step: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },

  stepDone: {
    backgroundColor: "#16A34A",
  },

  stepActive: {
    backgroundColor: "#E53935",
  },

  stepText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: "700",
    color: "#9CA3AF",
  },

  stepTextDone: {
    color: "#16A34A",
  },

  stepTextActive: {
    color: "#E53935",
    fontWeight: "900",
  },

  // --------------------------------------------------
  // FOOD
  // --------------------------------------------------

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  itemLeft: {
    flex: 1,
  },

  itemName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  itemQuantity: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 3,
  },

  unitPrice: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },

  itemPrice: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
    marginLeft: 10,
  },

  noItemsBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },

  noItems: {
    color: "#6B7280",
    fontSize: 14,
    marginTop: 8,
  },

  // --------------------------------------------------
  // PAYMENT
  // --------------------------------------------------

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },

  label: {
    fontSize: 14,
    color: "#6B7280",
  },

  value: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 8,
  },

  totalLabel: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
  },

  totalValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#E53935",
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  badgePaid: {
    backgroundColor: "#DCFCE7",
  },

  badgePending: {
    backgroundColor: "#FEF3C7",
  },

  badgeText: {
    fontSize: 10,
    fontWeight: "900",
  },

  badgePaidText: {
    color: "#15803D",
  },

  badgePendingText: {
    color: "#B45309",
  },

  // --------------------------------------------------
  // WAITING / APPROVED / READY / COMPLETED
  // --------------------------------------------------

  waitingCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 18,
    padding: 15,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },

  approvedCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 18,
    padding: 15,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },

  readyCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 18,
    padding: 15,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },

  completedCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 18,
    padding: 15,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },

  waitingContent: {
    flex: 1,
    marginLeft: 10,
  },

  waitingTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#92400E",
  },

  waitingText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#78350F",
    marginTop: 4,
  },

  approvedTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#166534",
  },

  approvedText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#166534",
    marginTop: 4,
  },

  readyTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#166534",
  },

  readyText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#166534",
    marginTop: 4,
  },

  completedTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#166534",
  },

  completedText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#166534",
    marginTop: 4,
  },

  // --------------------------------------------------
  // ERROR
  // --------------------------------------------------

  errorStatus: {
    marginTop: 5,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    flexDirection: "row",
    alignItems: "center",
  },

  errorStatusText: {
    flex: 1,
    marginLeft: 8,
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "700",
  },

  // --------------------------------------------------
  // NOTE
  // --------------------------------------------------

  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  noteText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#374151",
    marginTop: 2,
  },

  bottomSpace: {
    height: 30,
  },
})